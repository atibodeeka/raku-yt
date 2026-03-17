const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  setCompactMode: (compact) => ipcRenderer.send("set-compact-mode", compact),
});

contextBridge.exposeInMainWorld("youtubeAuth", {
  openLogin: () => ipcRenderer.invoke("youtube:openLogin"),
  logout: () => ipcRenderer.invoke("youtube:logout"),
  checkLogin: () => ipcRenderer.invoke("youtube:checkLogin"),
  isPremium: () => ipcRenderer.invoke("youtube:isPremium"),
});

contextBridge.exposeInMainWorld("ytmusicAPI", {
  searchSongs: (query) => ipcRenderer.invoke("ytmusic:searchSongs", query),
  searchVideos: (query) => ipcRenderer.invoke("ytmusic:searchVideos", query),
  getHomeSections: () => ipcRenderer.invoke("ytmusic:getHomeSections"),
  getArtist: (artistId) => ipcRenderer.invoke("ytmusic:getArtist", artistId),
  getArtistSongs: (artistId) =>
    ipcRenderer.invoke("ytmusic:getArtistSongs", artistId),
  getPlaylistVideos: (playlistId) =>
    ipcRenderer.invoke("ytmusic:getPlaylistVideos", playlistId),
  getSong: (videoId) => ipcRenderer.invoke("ytmusic:getSong", videoId),
  getLyrics: (videoId) => ipcRenderer.invoke("ytmusic:getLyrics", videoId),
  getSearchSuggestions: (query) =>
    ipcRenderer.invoke("ytmusic:getSearchSuggestions", query),
  getLikedSongs: () => ipcRenderer.invoke("ytmusic:getLikedSongs"),
  getHistory: () => ipcRenderer.invoke("ytmusic:getHistory"),
});

contextBridge.exposeInMainWorld("ytdlpAPI", {
  getAudioUrl: (videoId) => ipcRenderer.invoke("ytdlp:getAudioUrl", videoId),
  check: () => ipcRenderer.invoke("ytdlp:check"),
  hasCookies: () => ipcRenderer.invoke("ytdlp:hasCookies"),
});
