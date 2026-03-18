const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lyricsAPI", {
  close: () => ipcRenderer.send("close-lyrics-window"),
  onUpdate: (callback) => {
    ipcRenderer.on("update-lyrics", (_event, data) => callback(data));
  },
});
