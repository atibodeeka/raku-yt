const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const crypto = require("crypto");
const YTMusic = require("ytmusic-api");

let mainWindow;
let loginWindow = null;
let ytmusic = null;

// Store normal window bounds so we can restore them
let normalBounds = null;

// Cache audio URLs (they expire, so TTL = 30 min)
const audioUrlCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

// Get the persistent login session
function getLoginSession() {
  return session.fromPartition("persist:youtube-login");
}

// Build SAPISIDHASH authorization header from SAPISID cookie
function generateSAPISIDHash(sapisid, origin = "https://music.youtube.com") {
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = crypto
    .createHash("sha1")
    .update(`${timestamp} ${sapisid} ${origin}`)
    .digest("hex");
  return `SAPISIDHASH ${timestamp}_${hash}`;
}

// Get SAPISID from the login session cookies
async function getSAPISID() {
  const loginSession = getLoginSession();
  // Get all cookies — don't filter by domain since SAPISID could be on various domains
  const allCookies = await loginSession.cookies.get({});
  for (const c of allCookies) {
    if (c.name === "SAPISID" && c.domain.includes("youtube")) return c.value;
  }
  // Fallback: try __Secure-3PAPISID
  for (const c of allCookies) {
    if (c.name === "__Secure-3PAPISID") return c.value;
  }
  return null;
}

// Make an authenticated innertube API request using session.fetch()
// session.fetch() automatically includes all cookies from the session
async function ytMusicFetch(url, body) {
  const loginSession = getLoginSession();
  const sapisid = await getSAPISID();
  if (!sapisid) throw new Error("Not logged in (no SAPISID)");

  const authorization = generateSAPISIDHash(sapisid);

  const resp = await loginSession.fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://music.youtube.com/",
      Origin: "https://music.youtube.com",
      Authorization: authorization,
      "X-Goog-AuthUser": "0",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(`Innertube API error ${resp.status}: ${text.slice(0, 500)}`);
    throw new Error(`Innertube API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

async function ytMusicBrowse(browseId, additionalBody = {}) {
  const body = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20260311.03.00",
        hl: "ja",
        gl: "JP",
      },
    },
    browseId,
    ...additionalBody,
  };
  return ytMusicFetch(
    "https://music.youtube.com/youtubei/v1/browse?alt=json",
    body,
  );
}

// Parse musicResponsiveListItemRenderer into a simple track object
function parseTrackRenderer(renderer) {
  if (!renderer) return null;
  try {
    const flexColumns = renderer.flexColumns || [];
    // First column: title + videoId
    const col0 = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer;
    const titleRuns = col0?.text?.runs || [];
    const title = titleRuns[0]?.text || "";
    const videoId =
      titleRuns[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
        ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint
        ?.videoId ||
      "";
    if (!videoId) return null;

    // Second column: artist · album
    const col1 = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer;
    const subRuns = col1?.text?.runs || [];
    let artistName = "";
    let artistId = "";
    let albumName = "";
    let albumId = "";
    for (const run of subRuns) {
      const ep = run.navigationEndpoint;
      if (
        ep?.browseEndpoint?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType ===
        "MUSIC_PAGE_TYPE_ARTIST"
      ) {
        artistName = run.text;
        artistId = ep.browseEndpoint.browseId || "";
      } else if (
        ep?.browseEndpoint?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType ===
        "MUSIC_PAGE_TYPE_ALBUM"
      ) {
        albumName = run.text;
        albumId = ep.browseEndpoint.browseId || "";
      }
    }
    if (!artistName && subRuns.length > 0) {
      artistName = subRuns[0]?.text || "";
    }

    // Thumbnail
    const thumbs =
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumb = thumbs[thumbs.length - 1]?.url || "";

    // Duration from fixed columns
    const fixedCol =
      renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer;
    const durationStr = fixedCol?.text?.runs?.[0]?.text || "";
    let durationMs = 0;
    if (durationStr) {
      const parts = durationStr.split(":").map(Number);
      if (parts.length === 3)
        durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      else if (parts.length === 2)
        durationMs = (parts[0] * 60 + parts[1]) * 1000;
    }

    return {
      videoId,
      title,
      artistName,
      artistId,
      albumName,
      albumId,
      thumbnail: thumb,
      durationMs,
    };
  } catch {
    return null;
  }
}

// Check if user has YouTube Premium by testing audio quality via innertube player API
async function checkPremiumStatus() {
  try {
    const sapisid = await getSAPISID();
    if (!sapisid) return false;

    // Use a well-known, always-available music video to test
    // "Never Gonna Give You Up" — Rick Astley (reliably available worldwide)
    const testVideoId = "dQw4w9WgXcQ";

    const data = await ytMusicFetch(
      "https://music.youtube.com/youtubei/v1/player?alt=json",
      {
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20260311.03.00",
            hl: "ja",
            gl: "JP",
          },
        },
        videoId: testVideoId,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: 20073,
          },
        },
      },
    );

    const status = data?.playabilityStatus?.status;
    if (status !== "OK") {
      console.log("Premium check: video not playable, status =", status);
      return false;
    }

    // Premium users get high-bitrate audio (251kbps+ opus or 256kbps AAC)
    // Free users are limited to 128kbps
    const formats = data?.streamingData?.adaptiveFormats || [];
    const audioFormats = formats.filter(
      (f) => f.mimeType && f.mimeType.startsWith("audio/"),
    );

    const maxBitrate = Math.max(...audioFormats.map((f) => f.bitrate || 0), 0);
    console.log(
      `Premium check: found ${audioFormats.length} audio formats, max bitrate = ${maxBitrate}bps`,
    );

    // 256kbps (256000) or higher indicates Premium
    if (maxBitrate >= 200000) {
      console.log("Premium detected: high-bitrate audio available");
      return true;
    }

    console.log("Free tier: only low-bitrate audio available");
    return false;
  } catch (e) {
    console.warn("Premium check failed:", e.message);
    return false;
  }
}

async function initYTMusic() {
  ytmusic = new YTMusic();
  await ytmusic.initialize({ GL: "JP", HL: "ja" });
}

// Fetch the logged-in user's name and avatar via innertube account_menu endpoint
// Recursively search a JSON object for a key, returns first match
function deepFind(obj, targetKey, maxDepth = 10) {
  if (!obj || typeof obj !== "object" || maxDepth <= 0) return undefined;
  if (obj[targetKey] !== undefined) return obj[targetKey];
  for (const val of Object.values(obj)) {
    if (val && typeof val === "object") {
      const found = deepFind(val, targetKey, maxDepth - 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

async function fetchAccountInfo() {
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20260311.03.00",
          hl: "ja",
          gl: "JP",
        },
      },
    };

    const data = await ytMusicFetch(
      "https://music.youtube.com/youtubei/v1/account/account_menu?alt=json",
      body,
    );

    console.log(
      "Account menu response keys:",
      JSON.stringify(Object.keys(data || {})),
    );

    // Try multiple known paths for the account header
    let header =
      data?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer?.header
        ?.activeAccountHeaderRenderer;

    // Alternative paths
    if (!header) {
      const sections =
        data?.actions?.[0]?.openPopupAction?.popup?.multiPageMenuRenderer
          ?.sections;
      if (sections) {
        for (const s of sections) {
          const items = s.multiPageMenuSectionRenderer?.items || [];
          for (const item of items) {
            if (item.compactLinkRenderer?.icon?.iconType === "ACCOUNT_BOX") {
              // This item has account info nearby
            }
          }
        }
      }
    }

    // Also try the header at the top level
    if (!header) {
      header =
        data?.header?.googleAccountHeaderRenderer ||
        data?.header?.activeAccountHeaderRenderer;
    }

    let name =
      header?.accountName?.simpleText ||
      header?.name?.simpleText ||
      header?.accountName?.runs?.[0]?.text ||
      "";
    let avatar =
      header?.accountPhoto?.thumbnails?.slice(-1)?.[0]?.url ||
      header?.avatar?.thumbnails?.slice(-1)?.[0]?.url ||
      "";

    console.log("Parsed account info:", {
      name,
      avatar: avatar ? "(has url)" : "(empty)",
    });

    // If header parsing didn't work, deep-search the response for account name
    if (!name) {
      const raw = JSON.stringify(data);
      // Look for accountName pattern via regex
      const nameMatch = raw.match(/"accountName":\{"simpleText":"([^"]+)"\}/);
      const avatarMatch = raw.match(
        /"accountPhoto":\{"thumbnails":\[.*?"url":"([^"]+)"/,
      );
      if (nameMatch) name = nameMatch[1];
      if (avatarMatch && !avatar) avatar = avatarMatch[1];
    }

    // Deep recursive search as another fallback
    if (!name) {
      const accountName = deepFind(data, "accountName");
      if (accountName) {
        name = accountName.simpleText || accountName.runs?.[0]?.text || "";
      }
    }
    if (!name) {
      const channelName = deepFind(data, "channelName");
      if (channelName) {
        name = channelName.simpleText || channelName.runs?.[0]?.text || "";
      }
    }
    if (!avatar) {
      const accountPhoto = deepFind(data, "accountPhoto");
      if (accountPhoto) {
        avatar = accountPhoto.thumbnails?.slice(-1)?.[0]?.url || "";
      }
    }

    if (name) {
      console.log("Found account name:", name);
      return { name, avatar };
    }

    console.log("Account menu did not return a name, trying guide endpoint...");
    return { name, avatar };
  } catch (e) {
    console.warn("Failed to fetch account info:", e.message);
    return { name: "", avatar: "" };
  }
}

// Fallback: extract username from YouTube Music page HTML
async function fetchUserNameFromPage() {
  try {
    const loginSession = getLoginSession();
    const resp = await loginSession.fetch("https://music.youtube.com/", {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!resp.ok) return { name: "", avatar: "" };
    const html = await resp.text();

    // YouTube Music embeds user data in the initial page as ytcfg or LOGGED_IN_USER
    let name = "";
    let avatar = "";

    // Look for account name in ytInitialData or ytcfg
    const namePatterns = [
      /"DELEGATED_SESSION_ID".*?"([^"]{2,})"/,
      /"accountName":\{"simpleText":"([^"]+)"\}/,
      /"channelName":"([^"]+)"/,
      /"author":"([^"]+)"/,
    ];
    for (const pat of namePatterns) {
      const m = html.match(pat);
      if (m && m[1] && m[1].length < 100) {
        // Skip session IDs and other non-name values
        if (
          pat.source.includes("accountName") ||
          pat.source.includes("channelName") ||
          pat.source.includes("author")
        ) {
          name = m[1];
          break;
        }
      }
    }

    // Look for avatar URL
    const avatarMatch = html.match(
      /"accountPhoto":\{"thumbnails":\[.*?"url":"([^"]+)"/,
    );
    if (avatarMatch) avatar = avatarMatch[1];

    console.log("Page scrape result:", {
      name,
      avatar: avatar ? "(has url)" : "(empty)",
    });
    return { name, avatar };
  } catch (e) {
    console.warn("Failed to fetch username from page:", e.message);
    return { name: "", avatar: "" };
  }
}

// Fallback: extract display name from Google account page
async function fetchGoogleAccountName() {
  try {
    const loginSession = getLoginSession();
    const resp = await loginSession.fetch(
      "https://myaccount.google.com/personal-info?hl=en",
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
      },
    );
    if (!resp.ok) return "";
    const html = await resp.text();

    // Google account page contains the user's name in the page data
    // Look for the name in various patterns
    const patterns = [
      /data-profile-name="([^"]+)"/,
      /"displayName"\s*:\s*"([^"]+)"/,
      /"fullName"\s*:\s*"([^"]+)"/,
      /"name"\s*:\s*"([^"]{2,50})"/,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m && m[1]) {
        console.log("Found name from Google account page:", m[1]);
        return m[1];
      }
    }
    return "";
  } catch (e) {
    console.warn("Failed to fetch Google account name:", e.message);
    return "";
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#1A1A2E",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, "..", "public", "icon.png"),
  });

  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "out", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initYTMusic();
  createWindow();
});

// YTMusic IPC handlers
ipcMain.handle("ytmusic:searchSongs", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.searchSongs(query);
});

ipcMain.handle("ytmusic:searchVideos", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.searchVideos(query);
});

ipcMain.handle("ytmusic:getHomeSections", async () => {
  if (!ytmusic) return [];
  return ytmusic.getHomeSections();
});

ipcMain.handle("ytmusic:getArtist", async (_event, artistId) => {
  if (!ytmusic) return null;
  return ytmusic.getArtist(artistId);
});

ipcMain.handle("ytmusic:getArtistSongs", async (_event, artistId) => {
  if (!ytmusic) return [];
  return ytmusic.getArtistSongs(artistId);
});

ipcMain.handle("ytmusic:getPlaylistVideos", async (_event, playlistId) => {
  if (!ytmusic) return [];
  return ytmusic.getPlaylistVideos(playlistId);
});

ipcMain.handle("ytmusic:getSong", async (_event, videoId) => {
  if (!ytmusic) return null;
  return ytmusic.getSong(videoId);
});

ipcMain.handle("ytmusic:getLyrics", async (_event, videoId) => {
  if (!ytmusic) return null;
  return ytmusic.getLyrics(videoId);
});

ipcMain.handle("ytmusic:getSearchSuggestions", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.getSearchSuggestions(query);
});

// Get audio stream URL directly via innertube player API using session cookies
async function getAudioUrlFromInnertube(videoId) {
  const body = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20260311.03.00",
        hl: "ja",
        gl: "JP",
      },
    },
    videoId,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: 20073,
      },
    },
  };

  const data = await ytMusicFetch(
    "https://music.youtube.com/youtubei/v1/player?alt=json",
    body,
  );

  const status = data?.playabilityStatus?.status;
  if (status !== "OK") {
    const reason = data?.playabilityStatus?.reason || status || "unknown";
    console.warn(`Innertube player status for ${videoId}: ${reason}`);
    return { error: "not_playable", message: reason };
  }

  // Find the best audio stream from adaptiveFormats
  const formats = data?.streamingData?.adaptiveFormats || [];
  const audioFormats = formats
    .filter((f) => f.mimeType && f.mimeType.startsWith("audio/"))
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

  if (audioFormats.length === 0) {
    console.warn(`No audio formats found for ${videoId}`);
    return { error: "no_audio_formats" };
  }

  const best = audioFormats[0];
  const url = best.url;

  if (!url) {
    // Might need signature deciphering — fall back to yt-dlp
    console.warn(
      `Audio format for ${videoId} has no direct URL (needs signature)`,
    );
    return { error: "needs_signature" };
  }

  console.log(
    `Innertube audio for ${videoId}: ${best.mimeType}, ${best.bitrate}bps`,
  );
  return { url };
}

// yt-dlp: extract direct audio URL (fallback when innertube can't provide a direct URL)
ipcMain.handle("ytdlp:getAudioUrl", async (_event, videoId) => {
  // Validate videoId to prevent command injection
  if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    return { error: "invalid_id" };
  }

  // Check cache
  const cached = audioUrlCache.get(videoId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return { url: cached.url };
  }

  // Try innertube player API first (uses session cookies directly)
  try {
    const sapisid = await getSAPISID();
    if (sapisid) {
      const result = await getAudioUrlFromInnertube(videoId);
      if (result.url) {
        audioUrlCache.set(videoId, { url: result.url, time: Date.now() });
        return { url: result.url };
      }
      // If innertube returned a non-recoverable error, return it
      if (result.error === "not_playable") {
        return result;
      }
    }
  } catch (e) {
    console.warn(`Innertube player failed for ${videoId}:`, e.message);
  }

  // Fallback to yt-dlp (without cookies — for public/non-premium content)
  return new Promise((resolve) => {
    const args = [
      "-f",
      "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best",
      "--no-warnings",
      "--no-playlist",
      "-g",
      `https://music.youtube.com/watch?v=${videoId}`,
    ];
    execFile("yt-dlp", args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr || error.message || "";
        console.error(`yt-dlp error for ${videoId}:`, msg);
        // Detect Music Premium restriction
        if (msg.includes("Music Premium") || msg.includes("premium members")) {
          resolve({ error: "premium_only", message: msg });
          return;
        }
        // Detect cookie database lock error
        if (msg.includes("Could not copy") && msg.includes("cookie database")) {
          resolve({ error: "cookie_lock", message: msg });
          return;
        }
        resolve({ error: "yt_dlp_failed", message: msg });
        return;
      }
      const url = stdout.trim();
      if (url) {
        audioUrlCache.set(videoId, { url, time: Date.now() });
        resolve({ url });
      } else {
        resolve({ error: "no_url" });
      }
    });
  });
});

// yt-dlp: check if installed
ipcMain.handle("ytdlp:check", async () => {
  return new Promise((resolve) => {
    execFile("yt-dlp", ["--version"], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ installed: false });
      } else {
        resolve({ installed: true, version: stdout.trim() });
      }
    });
  });
});

// Check if cookies are available (logged in via session)
ipcMain.handle("ytdlp:hasCookies", async () => {
  const sapisid = await getSAPISID().catch(() => null);
  return !!sapisid;
});

// --- YouTube Browser Login Flow ---

ipcMain.handle("youtube:openLogin", async () => {
  if (loginWindow) {
    loginWindow.focus();
    return { success: false, error: "already_open" };
  }

  return new Promise((resolve) => {
    const loginSession = getLoginSession();

    loginWindow = new BrowserWindow({
      width: 460,
      height: 700,
      parent: mainWindow,
      modal: true,
      autoHideMenuBar: true,
      webPreferences: {
        session: loginSession,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    loginWindow.loadURL(
      "https://accounts.google.com/ServiceLogin?continue=https://music.youtube.com/",
    );

    let resolved = false;

    const checkLogin = async () => {
      if (resolved) return;
      try {
        const ytCookies = await loginSession.cookies.get({
          domain: ".youtube.com",
        });
        const hasSAPISID = ytCookies.some(
          (c) => c.name === "SAPISID" || c.name === "__Secure-3PAPISID",
        );

        if (hasSAPISID) {
          resolved = true;

          // Clear audio cache
          audioUrlCache.clear();

          // Fetch user info from YouTube Music API (with fallbacks)
          let userName = "";
          let userAvatar = "";
          try {
            const accountInfo = await fetchAccountInfo();
            userName = accountInfo.name;
            userAvatar = accountInfo.avatar;
          } catch {
            // ignore
          }

          // Fallback: scrape YouTube Music page for user info
          if (!userName) {
            try {
              const pageInfo = await fetchUserNameFromPage();
              if (pageInfo.name) userName = pageInfo.name;
              if (pageInfo.avatar && !userAvatar) userAvatar = pageInfo.avatar;
            } catch {
              // ignore
            }
          }

          // Fallback: get name from Google account page
          if (!userName) {
            try {
              const googleName = await fetchGoogleAccountName();
              if (googleName) userName = googleName;
            } catch {
              // ignore
            }
          }

          // Check premium status
          let isPremium = false;
          try {
            isPremium = await checkPremiumStatus();
          } catch {
            // ignore
          }

          loginWindow.close();
          loginWindow = null;

          resolve({
            success: true,
            user: {
              name: userName || "YouTube User",
              avatar: userAvatar,
            },
            isPremium,
          });
        }
      } catch {
        // ignore cookie check errors
      }
    };

    const interval = setInterval(checkLogin, 1500);

    loginWindow.on("closed", () => {
      clearInterval(interval);
      loginWindow = null;
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: "closed" });
      }
    });
  });
});

ipcMain.handle("youtube:logout", async () => {
  try {
    const loginSession = getLoginSession();
    await loginSession.clearStorageData();
    audioUrlCache.clear();
    // Re-init ytmusic without cookies (for search/public features)
    ytmusic = new YTMusic();
    await ytmusic.initialize({ GL: "JP", HL: "ja" });
  } catch (e) {
    console.error("Logout error:", e);
  }
});

ipcMain.handle("youtube:checkLogin", async () => {
  try {
    const sapisid = await getSAPISID();
    return !!sapisid;
  } catch {
    return false;
  }
});

// --- Authenticated YouTube Music data (via innertube + session cookies) ---

// Generic: traverse innertube browse response to extract tracks
function extractTracksFromBrowse(data, label) {
  const tracks = [];

  // Log top-level structure for debugging
  console.log(
    `[${label}] Response top-level keys:`,
    JSON.stringify(Object.keys(data || {})),
  );

  // Path 1: singleColumnBrowseResultsRenderer (most common)
  const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
  for (const tab of tabs) {
    const sections =
      tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      const items =
        section.musicShelfRenderer?.contents ||
        section.musicPlaylistShelfRenderer?.contents ||
        section.gridRenderer?.items ||
        [];
      for (const item of items) {
        const track = parseTrackRenderer(item.musicResponsiveListItemRenderer);
        if (track) tracks.push(track);
      }
    }
  }

  // Path 2: twoColumnBrowseResultsRenderer
  if (tracks.length === 0) {
    const secondaryContents =
      data?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents
        ?.sectionListRenderer?.contents || [];
    for (const section of secondaryContents) {
      const items =
        section.musicShelfRenderer?.contents ||
        section.musicPlaylistShelfRenderer?.contents ||
        [];
      for (const item of items) {
        const track = parseTrackRenderer(item.musicResponsiveListItemRenderer);
        if (track) tracks.push(track);
      }
    }
  }

  // Path 3: direct sectionListRenderer at contents level
  if (tracks.length === 0) {
    const directSections = data?.contents?.sectionListRenderer?.contents || [];
    for (const section of directSections) {
      const items =
        section.musicShelfRenderer?.contents ||
        section.musicPlaylistShelfRenderer?.contents ||
        [];
      for (const item of items) {
        const track = parseTrackRenderer(item.musicResponsiveListItemRenderer);
        if (track) tracks.push(track);
      }
    }
  }

  console.log(`[${label}] Extracted ${tracks.length} tracks`);

  // If still no tracks, dump the structure for debugging
  if (tracks.length === 0 && data?.contents) {
    const contentsKeys = Object.keys(data.contents);
    console.log(`[${label}] contents keys:`, JSON.stringify(contentsKeys));
    for (const key of contentsKeys) {
      const inner = data.contents[key];
      if (inner && typeof inner === "object") {
        console.log(
          `[${label}] contents.${key} keys:`,
          JSON.stringify(Object.keys(inner)).slice(0, 300),
        );
      }
    }
  }

  return tracks;
}

// Liked songs: browse FEmusic_liked_videos
ipcMain.handle("ytmusic:getLikedSongs", async () => {
  try {
    const data = await ytMusicBrowse("FEmusic_liked_videos");
    return extractTracksFromBrowse(data, "LikedSongs");
  } catch (e) {
    console.warn("Failed to get liked songs:", e.message);
    return [];
  }
});

// History: browse FEmusic_history
ipcMain.handle("ytmusic:getHistory", async () => {
  try {
    const data = await ytMusicBrowse("FEmusic_history");
    return extractTracksFromBrowse(data, "History");
  } catch (e) {
    console.warn("Failed to get history:", e.message);
    return [];
  }
});

// Check premium status
ipcMain.handle("youtube:isPremium", async () => {
  try {
    return await checkPremiumStatus();
  } catch {
    return false;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Window control IPC handlers
ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window-close", () => {
  mainWindow?.close();
});

ipcMain.on("set-compact-mode", (_event, compact) => {
  if (!mainWindow) return;
  if (compact) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setMinimumSize(340, 500);
    mainWindow.setMaximumSize(340, 99999);
    mainWindow.setBounds({
      width: 340,
      height: 640,
      x: normalBounds.x,
      y: normalBounds.y,
    });
    mainWindow.setResizable(false);
  } else {
    mainWindow.setMinimumSize(900, 600);
    mainWindow.setMaximumSize(0, 0);
    if (normalBounds) {
      mainWindow.setBounds(normalBounds);
    } else {
      mainWindow.setBounds({ width: 1200, height: 800 });
    }
    mainWindow.setResizable(true);
  }
});
