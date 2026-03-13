const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { execFile } = require("child_process");
const YTMusic = require("ytmusic-api");

let mainWindow;
let ytmusic = null;

// Store normal window bounds so we can restore them
let normalBounds = null;

// Cache yt-dlp audio URLs (they expire, so TTL = 30 min)
const audioUrlCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function initYTMusic() {
  ytmusic = new YTMusic();
  await ytmusic.initialize({ GL: "JP", HL: "ja" });
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

// yt-dlp: extract direct audio URL (bypasses embedding restrictions)
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

  return new Promise((resolve) => {
    execFile(
      "yt-dlp",
      [
        "-f",
        "bestaudio[ext=m4a]/bestaudio",
        "--no-warnings",
        "--no-playlist",
        "-g",
        `https://music.youtube.com/watch?v=${videoId}`,
      ],
      { timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`yt-dlp error for ${videoId}:`, error.message);
          resolve({ error: "yt_dlp_failed", message: stderr || error.message });
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
    execFile("yt-dlp", ["--version"], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ installed: false });
      } else {
        resolve({ installed: true, version: stdout.trim() });
      }
    });
  });
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
