const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  setCompactMode: (compact) => ipcRenderer.send("set-compact-mode", compact),
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
});

contextBridge.exposeInMainWorld("ytdlpAPI", {
  getAudioUrl: (videoId) => ipcRenderer.invoke("ytdlp:getAudioUrl", videoId),
  check: () => ipcRenderer.invoke("ytdlp:check"),
});
