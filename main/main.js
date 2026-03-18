const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const crypto = require("crypto");
const YTMusic = require("ytmusic-api");

// Raise default max listeners to prevent warnings from concurrent HTTPS requests
require("events").EventEmitter.defaultMaxListeners = 20;

// Resolve bundled yt-dlp binary path (works in both dev and packaged app)
function getYtDlpPath() {
  if (app.isPackaged) {
    // In packaged app, yt-dlp.exe is in the resources/bin/ directory
    return path.join(process.resourcesPath, "bin", "yt-dlp.exe");
  }
  // In dev, try local bin/ first, then fall back to system PATH
  const localBin = path.join(__dirname, "..", "bin", "yt-dlp.exe");
  if (fs.existsSync(localBin)) return localBin;
  return "yt-dlp";
}

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
        hl: "th",
        gl: "TH",
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
            hl: "en",
            gl: "US",
          },
        },
        videoId: testVideoId,
        contentCheckOk: true,
        racyCheckOk: true,
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
  await ytmusic.initialize({ GL: "TH", HL: "th" });
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
          hl: "th",
          gl: "TH",
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

  if (!app.isPackaged) {
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

ipcMain.handle("ytmusic:search", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.search(query);
});

ipcMain.handle("ytmusic:searchArtists", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.searchArtists(query);
});

ipcMain.handle("ytmusic:searchAlbums", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.searchAlbums(query);
});

ipcMain.handle("ytmusic:searchPlaylists", async (_event, query) => {
  if (!ytmusic) return [];
  return ytmusic.searchPlaylists(query);
});

ipcMain.handle("ytmusic:getHomeSections", async () => {
  if (!ytmusic) return [];
  const sections = await ytmusic.getHomeSections();
  // Filter out null entries from contents (some regions return nulls for unrecognized page types)
  return sections
    .map((s) => ({
      ...s,
      contents: (s.contents || []).filter((item) => item != null),
    }))
    .filter((s) => s.contents.length > 0);
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
  // Normalize: strip VL prefix if present (browseEndpoint IDs use VLPLxxx format,
  // but ytmusic-api adds VL itself when it sees PL prefix)
  let id = playlistId;
  if (id.startsWith("VL")) id = id.slice(2);
  try {
    return await ytmusic.getPlaylistVideos(id);
  } catch (e) {
    console.warn(
      `getPlaylistVideos (ytmusic-api) failed for "${id}":`,
      e.message,
    );
    // Fallback: use authenticated innertube browse API for private/personal playlists
    try {
      const browseId = id.startsWith("PL")
        ? "VL" + id
        : id.startsWith("VL")
          ? id
          : "VL" + id;
      console.log(`Trying authenticated browse with browseId: ${browseId}`);
      const data = await ytMusicBrowse(browseId);
      const tracks = extractTracksFromBrowse(data, "Playlist");
      // Convert innertube track format to ytmusic-api VideoDetailed shape
      return tracks.map((t) => ({
        type: "VIDEO",
        videoId: t.videoId,
        name: t.title,
        artist: { artistId: t.artistId || null, name: t.artistName || "" },
        duration: t.durationMs ? Math.round(t.durationMs / 1000) : null,
        thumbnails: t.thumbnail
          ? [{ url: t.thumbnail, width: 480, height: 480 }]
          : [],
      }));
    } catch (e2) {
      console.warn(
        `getPlaylistVideos (innertube fallback) also failed:`,
        e2.message,
      );
      return [];
    }
  }
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

// YouTube-wide search (all content types, not just music)
ipcMain.handle("youtube:searchAll", async (_event, query) => {
  try {
    const loginSession = getLoginSession();
    const sapisid = await getSAPISID();
    if (!sapisid) return [];

    const authorization = generateSAPISIDHash(
      sapisid,
      "https://www.youtube.com",
    );

    const body = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20260311.00.00",
          hl: "en",
          gl: "TH",
        },
      },
      query,
    };

    const resp = await loginSession.fetch(
      "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Origin: "https://www.youtube.com",
          Referer: "https://www.youtube.com/",
          Authorization: authorization,
          "X-Goog-AuthUser": "0",
        },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) return [];
    const data = await resp.json();

    // Parse videoRenderer items from search results
    const results = [];
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (!vr) continue;

        const videoId = vr.videoId;
        if (!videoId) continue;

        const title = vr.title?.runs?.map((r) => r.text).join("") || "";
        const channelName = vr.ownerText?.runs?.[0]?.text || "";
        const channelId =
          vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint
            ?.browseId || "";

        // Parse duration text like "3:45" or "1:02:30"
        const durationText = vr.lengthText?.simpleText || "";
        let durationMs = 0;
        if (durationText) {
          const parts = durationText.split(":").map(Number);
          if (parts.length === 3) {
            durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
          } else if (parts.length === 2) {
            durationMs = (parts[0] * 60 + parts[1]) * 1000;
          }
        }

        const thumbnail = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";

        results.push({
          videoId,
          title,
          channelName,
          channelId,
          durationMs,
          thumbnail,
        });
      }
    }

    return results;
  } catch (e) {
    console.warn("YouTube general search failed:", e.message);
    return [];
  }
});

// Get audio stream URL directly via innertube player API using session cookies
async function getAudioUrlFromInnertube(videoId) {
  const loginSession = getLoginSession();
  const sapisid = await getSAPISID();
  if (!sapisid) throw new Error("Not logged in (no SAPISID)");

  const authorization = generateSAPISIDHash(sapisid, "https://www.youtube.com");

  // Use ANDROID client on youtube.com — more permissive than WEB_REMIX / ANDROID_MUSIC
  const body = {
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.29.37",
        androidSdkVersion: 30,
        userAgent:
          "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip",
        hl: "en",
        gl: "US",
      },
    },
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const resp = await loginSession.fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip",
        Origin: "https://www.youtube.com",
        "X-Youtube-Client-Name": "3",
        "X-Youtube-Client-Version": "19.29.37",
        Authorization: authorization,
        "X-Goog-AuthUser": "0",
      },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error(`Innertube API error ${resp.status}: ${text.slice(0, 500)}`);
    throw new Error(`Innertube API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();

  const status = data?.playabilityStatus?.status;
  if (status !== "OK") {
    const reason = data?.playabilityStatus?.reason || status || "unknown";
    const sub = data?.playabilityStatus?.messages || [];
    console.warn(
      `Innertube player status for ${videoId}: ${status} — ${reason}`,
      sub.length ? sub : "",
    );
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
      // Log innertube failure but always fall through to yt-dlp
      console.log(
        `Innertube failed for ${videoId} (${result.error}), trying yt-dlp...`,
      );
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
    execFile(
      getYtDlpPath(),
      args,
      { timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr || error.message || "";
          console.error(`yt-dlp error for ${videoId}:`, msg);
          // Detect Music Premium restriction
          if (
            msg.includes("Music Premium") ||
            msg.includes("premium members")
          ) {
            resolve({ error: "premium_only", message: msg });
            return;
          }
          // Detect cookie database lock error
          if (
            msg.includes("Could not copy") &&
            msg.includes("cookie database")
          ) {
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
      },
    );
  });
});

// yt-dlp: check if installed
ipcMain.handle("ytdlp:check", async () => {
  return new Promise((resolve) => {
    execFile(
      getYtDlpPath(),
      ["--version"],
      { timeout: 5000 },
      (error, stdout) => {
        if (error) {
          resolve({ installed: false });
        } else {
          resolve({ installed: true, version: stdout.trim() });
        }
      },
    );
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
    await ytmusic.initialize({ GL: "TH", HL: "th" });
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

// --- YouTube Data API equivalents via innertube + session cookies ---

// playlists.list equivalent: get user's library playlists
ipcMain.handle("ytmusic:getLibraryPlaylists", async () => {
  const playlists = [];
  const seenIds = new Set();

  // Helper: extract a playlist item from musicTwoRowItemRenderer
  function parseTwoRowItem(r) {
    const titleRuns = r.title?.runs || [];
    const name = titleRuns[0]?.text || "";
    const playlistId =
      r.navigationEndpoint?.browseEndpoint?.browseId ||
      titleRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      "";
    const subtitleRuns = r.subtitle?.runs || [];
    const subtitle = subtitleRuns.map((sr) => sr.text).join("");
    const thumbs =
      r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumb = thumbs[thumbs.length - 1]?.url || "";
    if (playlistId && name && !seenIds.has(playlistId)) {
      seenIds.add(playlistId);
      playlists.push({ playlistId, name, subtitle, thumbnail: thumb });
    }
  }

  // Helper: extract a playlist item from musicResponsiveListItemRenderer
  function parseResponsiveItem(r) {
    const titleRuns =
      r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || [];
    const name = titleRuns[0]?.text || "";
    const playlistId =
      r.navigationEndpoint?.browseEndpoint?.browseId ||
      titleRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content
        ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchPlaylistEndpoint
        ?.playlistId ||
      "";
    const subtitleRuns =
      r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || [];
    const subtitle = subtitleRuns.map((sr) => sr.text).join("");
    const thumbs =
      r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumb = thumbs[thumbs.length - 1]?.url || "";
    if (playlistId && name && !seenIds.has(playlistId)) {
      seenIds.add(playlistId);
      playlists.push({ playlistId, name, subtitle, thumbnail: thumb });
    }
  }

  // Deep recursive search for playlist renderers
  function deepSearch(obj, depth) {
    if (!obj || typeof obj !== "object" || depth > 15) return;
    if (obj.musicTwoRowItemRenderer) {
      parseTwoRowItem(obj.musicTwoRowItemRenderer);
    }
    if (obj.musicResponsiveListItemRenderer) {
      parseResponsiveItem(obj.musicResponsiveListItemRenderer);
    }
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object") {
        deepSearch(val, depth + 1);
      }
    }
  }

  // Try multiple browse IDs — different accounts/regions use different ones
  const browseIds = [
    "FEmusic_liked_playlists",
    "FEmusic_library_privately_owned_playlists",
  ];

  for (const browseId of browseIds) {
    if (playlists.length > 0) break;
    try {
      const data = await ytMusicBrowse(browseId);
      deepSearch(data, 0);
    } catch (e) {
      console.warn(`[LibraryPlaylists] ${browseId} failed:`, e.message);
    }
  }

  // If browse endpoints didn't work, try scraping the library page directly
  if (playlists.length === 0) {
    try {
      console.log(
        `[LibraryPlaylists] Browse endpoints failed, trying library page scrape...`,
      );
      const loginSession = getLoginSession();
      const sapisid = await getSAPISID();
      if (sapisid) {
        const authorization = generateSAPISIDHash(sapisid);
        const resp = await loginSession.fetch(
          "https://music.youtube.com/library/playlists",
          {
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html",
              Referer: "https://music.youtube.com/",
            },
          },
        );
        if (resp.ok) {
          const html = await resp.text();
          // Extract ytInitialData from the page
          const dataMatch = html.match(
            /var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s,
          );
          if (dataMatch) {
            try {
              const pageData = JSON.parse(dataMatch[1]);
              console.log(
                `[LibraryPlaylists] Page scrape: parsed ytInitialData`,
              );
              deepSearch(pageData, 0);
              if (playlists.length > 0) {
                console.log(
                  `[LibraryPlaylists] Page scrape found ${playlists.length} playlists`,
                );
              }
            } catch {
              console.warn("[LibraryPlaylists] Failed to parse ytInitialData");
            }
          }

          // Also try regex extraction from raw HTML
          if (playlists.length === 0) {
            const playlistMatches = [
              ...html.matchAll(
                /\"playlistId\"\s*:\s*\"((?:PL|OL|RDCL)[A-Za-z0-9_-]+)\"/g,
              ),
            ];
            const titleContext = html;
            for (const m of playlistMatches) {
              const pid = m[1];
              const vlId = `VL${pid}`;
              if (!seenIds.has(pid) && !seenIds.has(vlId)) {
                seenIds.add(pid);
                seenIds.add(vlId);
                // Try to find nearby title
                const pos = titleContext.indexOf(pid);
                const nearby = titleContext.slice(Math.max(0, pos - 1000), pos);
                const nameMatch = nearby.match(/"text"\s*:\s*"([^"]{1,100})"/g);
                const name = nameMatch
                  ? nameMatch[nameMatch.length - 1].match(
                      /"text"\s*:\s*"([^"]+)"/,
                    )?.[1] || `Playlist`
                  : `Playlist`;
                playlists.push({
                  playlistId: `VL${pid}`,
                  name,
                  subtitle: "",
                  thumbnail: "",
                });
              }
            }
            if (playlists.length > 0) {
              console.log(
                `[LibraryPlaylists] HTML regex found ${playlists.length} playlists`,
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("[LibraryPlaylists] Page scrape failed:", e.message);
    }
  }

  console.log(`[LibraryPlaylists] Final result: ${playlists.length} playlists`);
  return playlists;
});

// subscriptions.list equivalent: get user's subscribed artist channels
ipcMain.handle("ytmusic:getSubscriptions", async () => {
  try {
    const data = await ytMusicBrowse("FEmusic_library_corpus_artists");
    const artists = [];

    const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
    for (const tab of tabs) {
      const sections =
        tab.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        const items =
          section.musicShelfRenderer?.contents ||
          section.gridRenderer?.items ||
          [];
        for (const item of items) {
          // musicResponsiveListItemRenderer (list layout)
          if (item.musicResponsiveListItemRenderer) {
            const r = item.musicResponsiveListItemRenderer;
            const titleRuns =
              r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs || [];
            const name = titleRuns[0]?.text || "";
            const browseId =
              r.navigationEndpoint?.browseEndpoint?.browseId ||
              titleRuns[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
              "";
            const thumbs =
              r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const thumb = thumbs[thumbs.length - 1]?.url || "";
            const subtitleRuns =
              r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer
                ?.text?.runs || [];
            const subtitle = subtitleRuns.map((sr) => sr.text).join("");
            if (browseId && name) {
              artists.push({
                channelId: browseId,
                name,
                subtitle,
                thumbnail: thumb,
              });
            }
          }
          // musicTwoRowItemRenderer (grid layout)
          if (item.musicTwoRowItemRenderer) {
            const r = item.musicTwoRowItemRenderer;
            const titleRuns = r.title?.runs || [];
            const name = titleRuns[0]?.text || "";
            const browseId =
              r.navigationEndpoint?.browseEndpoint?.browseId || "";
            const subtitleRuns = r.subtitle?.runs || [];
            const subtitle = subtitleRuns.map((sr) => sr.text).join("");
            const thumbs =
              r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail
                ?.thumbnails || [];
            const thumb = thumbs[thumbs.length - 1]?.url || "";
            if (browseId && name) {
              artists.push({
                channelId: browseId,
                name,
                subtitle,
                thumbnail: thumb,
              });
            }
          }
        }
      }
    }

    console.log(`[Subscriptions] Found ${artists.length} subscribed artists`);
    return artists;
  } catch (e) {
    console.warn("Failed to get subscriptions:", e.message);
    return [];
  }
});

// --- Write operations via innertube ---

// Report playback to YouTube (so it appears in history)
// Uses the tracking URLs from the /player response, which is how the real YouTube Music web client works
ipcMain.handle("ytmusic:reportPlayback", async (_event, videoId) => {
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20260311.03.00",
          hl: "th",
          gl: "TH",
        },
      },
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: 20073,
        },
      },
    };
    // Call /player to get the video info and tracking URLs
    const data = await ytMusicFetch(
      "https://music.youtube.com/youtubei/v1/player?alt=json",
      body,
    );

    // Extract tracking URLs from the player response
    const playbackUrl = data?.playbackTracking?.videostatsPlaybackUrl?.baseUrl;
    const watchtimeUrl =
      data?.playbackTracking?.videostatsWatchtimeUrl?.baseUrl;

    const loginSession = getLoginSession();
    const cpn = generateCPN();

    // Call the playback tracking URL (registers the view/play start)
    if (playbackUrl) {
      try {
        const pbUrl = new URL(playbackUrl);
        pbUrl.searchParams.set("cpn", cpn);
        pbUrl.searchParams.set("ver", "2");
        pbUrl.searchParams.set("c", "WEB_REMIX");
        pbUrl.searchParams.set("cver", "1.20260311.03.00");
        await loginSession.fetch(pbUrl.toString(), {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://music.youtube.com/",
          },
        });
      } catch (e) {
        console.warn("Playback tracking URL failed:", e.message);
      }
    }

    // Call the watchtime tracking URL with a small amount of watch time
    // This is what actually registers the video in YouTube history
    if (watchtimeUrl) {
      try {
        const wtUrl = new URL(watchtimeUrl);
        wtUrl.searchParams.set("cpn", cpn);
        wtUrl.searchParams.set("ver", "2");
        wtUrl.searchParams.set("c", "WEB_REMIX");
        wtUrl.searchParams.set("cver", "1.20260311.03.00");
        wtUrl.searchParams.set("st", "0");
        wtUrl.searchParams.set("et", "30");
        wtUrl.searchParams.set("cmt", "30");
        wtUrl.searchParams.set("lact", "1000");
        wtUrl.searchParams.set("fmt", "251");
        await loginSession.fetch(wtUrl.toString(), {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: "https://music.youtube.com/",
          },
        });
      } catch (e) {
        console.warn("Watchtime tracking URL failed:", e.message);
      }
    }

    console.log(`[Playback] Reported playback for ${videoId}`);
    return { success: true };
  } catch (e) {
    console.warn("Failed to report playback:", e.message);
    return { success: false, error: e.message };
  }
});

// Like/unlike a song (rate endpoint)
ipcMain.handle("ytmusic:rateSong", async (_event, videoId, rating) => {
  // rating: "LIKE", "DISLIKE", or "INDIFFERENT" (remove rating)
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20260311.03.00",
          hl: "th",
          gl: "TH",
        },
      },
      target: { videoId },
    };
    const endpoint =
      rating === "LIKE"
        ? "like"
        : rating === "DISLIKE"
          ? "dislike"
          : "removelike";
    await ytMusicFetch(
      `https://music.youtube.com/youtubei/v1/like/${endpoint}?alt=json`,
      body,
    );
    console.log(`[Rate] ${rating} for ${videoId}`);
    return { success: true };
  } catch (e) {
    console.warn("Failed to rate song:", e.message);
    return { success: false, error: e.message };
  }
});

// Create a new playlist
ipcMain.handle("ytmusic:createPlaylist", async (_event, title, videoIds) => {
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20260311.03.00",
          hl: "th",
          gl: "TH",
        },
      },
      title,
      privacyStatus: "PRIVATE",
      videoIds: videoIds || [],
    };
    const data = await ytMusicFetch(
      "https://music.youtube.com/youtubei/v1/playlist/create?alt=json",
      body,
    );
    const playlistId = data?.playlistId;
    console.log(`[Playlist] Created playlist: ${title} (${playlistId})`);
    return { success: true, playlistId };
  } catch (e) {
    console.warn("Failed to create playlist:", e.message);
    return { success: false, error: e.message };
  }
});

// Add songs to an existing playlist
ipcMain.handle(
  "ytmusic:addToPlaylist",
  async (_event, playlistId, videoIds) => {
    try {
      const actions = videoIds.map((id) => ({
        action: "ACTION_ADD_VIDEO",
        addedVideoId: id,
      }));
      const body = {
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20260311.03.00",
            hl: "th",
            gl: "TH",
          },
        },
        playlistId: playlistId.startsWith("VL")
          ? playlistId.slice(2)
          : playlistId,
        actions,
      };
      await ytMusicFetch(
        "https://music.youtube.com/youtubei/v1/browse/edit_playlist?alt=json",
        body,
      );
      console.log(`[Playlist] Added ${videoIds.length} songs to ${playlistId}`);
      return { success: true };
    } catch (e) {
      console.warn("Failed to add to playlist:", e.message);
      return { success: false, error: e.message };
    }
  },
);

// Remove songs from a playlist
ipcMain.handle(
  "ytmusic:removeFromPlaylist",
  async (_event, playlistId, videoIds, setVideoIds) => {
    try {
      const actions = videoIds.map((id, i) => ({
        action: "ACTION_REMOVE_VIDEO",
        removedVideoId: id,
        setVideoId: setVideoIds?.[i] || undefined,
      }));
      const body = {
        context: {
          client: {
            clientName: "WEB_REMIX",
            clientVersion: "1.20260311.03.00",
            hl: "th",
            gl: "TH",
          },
        },
        playlistId: playlistId.startsWith("VL")
          ? playlistId.slice(2)
          : playlistId,
        actions,
      };
      await ytMusicFetch(
        "https://music.youtube.com/youtubei/v1/browse/edit_playlist?alt=json",
        body,
      );
      console.log(
        `[Playlist] Removed ${videoIds.length} songs from ${playlistId}`,
      );
      return { success: true };
    } catch (e) {
      console.warn("Failed to remove from playlist:", e.message);
      return { success: false, error: e.message };
    }
  },
);

// Delete a playlist
ipcMain.handle("ytmusic:deletePlaylist", async (_event, playlistId) => {
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20260311.03.00",
          hl: "th",
          gl: "TH",
        },
      },
      playlistId: playlistId.startsWith("VL")
        ? playlistId.slice(2)
        : playlistId,
    };
    await ytMusicFetch(
      "https://music.youtube.com/youtubei/v1/playlist/delete?alt=json",
      body,
    );
    console.log(`[Playlist] Deleted playlist ${playlistId}`);
    return { success: true };
  } catch (e) {
    console.warn("Failed to delete playlist:", e.message);
    return { success: false, error: e.message };
  }
});

// Generate a CPN (client playback nonce) for playback reporting
function generateCPN() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let cpn = "";
  for (let i = 0; i < 16; i++) {
    cpn += chars[Math.floor(Math.random() * chars.length)];
  }
  return cpn;
}

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
    // Close lyrics window when exiting compact mode
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.close();
      lyricsWindow = null;
    }
    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(900, 600);
    mainWindow.setMaximumSize(0, 0);
    if (normalBounds) {
      mainWindow.setBounds(normalBounds);
    } else {
      mainWindow.setBounds({ width: 1200, height: 800 });
    }
  }
});

// Lyrics popup window for compact mode
let lyricsWindow = null;

ipcMain.on(
  "open-lyrics-window",
  (_event, { position, lyrics, trackName, artistName }) => {
    if (!mainWindow) return;

    // If already open, just update content and reposition
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("update-lyrics", {
        lyrics,
        trackName,
        artistName,
      });
      return;
    }

    const mainBounds = mainWindow.getBounds();
    const winWidth = 280;
    const winHeight = mainBounds.height;
    let x, y;

    if (position === "left") {
      x = mainBounds.x - winWidth - 4;
      y = mainBounds.y;
    } else {
      x = mainBounds.x + mainBounds.width + 4;
      y = mainBounds.y;
    }

    lyricsWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x,
      y,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: "#ffffff",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "lyrics-preload.js"),
      },
    });

    lyricsWindow.loadFile(path.join(__dirname, "lyrics.html"));

    lyricsWindow.webContents.on("did-finish-load", () => {
      lyricsWindow.webContents.send("update-lyrics", {
        lyrics,
        trackName,
        artistName,
      });
    });

    // Follow main window movement
    const onMove = () => {
      if (!lyricsWindow || lyricsWindow.isDestroyed() || !mainWindow) return;
      const mb = mainWindow.getBounds();
      const lx =
        position === "left" ? mb.x - winWidth - 4 : mb.x + mb.width + 4;
      lyricsWindow.setBounds({
        x: lx,
        y: mb.y,
        width: winWidth,
        height: mb.height,
      });
    };
    mainWindow.on("move", onMove);
    mainWindow.on("resize", onMove);

    lyricsWindow.on("closed", () => {
      lyricsWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeListener("move", onMove);
        mainWindow.removeListener("resize", onMove);
        mainWindow.webContents.send("lyrics-window-closed");
      }
    });
  },
);

ipcMain.on("close-lyrics-window", () => {
  if (lyricsWindow && !lyricsWindow.isDestroyed()) {
    lyricsWindow.close();
    lyricsWindow = null;
  }
});

ipcMain.on(
  "update-lyrics-content",
  (_event, { lyrics, trackName, artistName }) => {
    if (lyricsWindow && !lyricsWindow.isDestroyed()) {
      lyricsWindow.webContents.send("update-lyrics", {
        lyrics,
        trackName,
        artistName,
      });
    }
  },
);
