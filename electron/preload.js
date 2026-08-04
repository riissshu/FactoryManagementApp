const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  getSettings: () => ipcRenderer.invoke("settings:get"),

  saveSettings: (factoryName, factoryLogo) =>
    ipcRenderer.invoke("settings:save", {
      factoryName,
      factoryLogo,
    }),

});