const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  getSettings: () => ipcRenderer.invoke("settings:get"),

  saveSettings: (factoryName, factoryLogo) =>
    ipcRenderer.invoke("settings:save", {
      factoryName,
      factoryLogo,
    }),

  getStockItems: () => ipcRenderer.invoke("stock:get"),

  saveStockItem: (item) =>
    ipcRenderer.invoke("stock:save", item),

  updateStockItem: (item) =>
    ipcRenderer.invoke("stock:update", item),

  inactivateStockItem: (id) =>
    ipcRenderer.invoke("stock:inactivate", id),

  getDailyReports: () =>
    ipcRenderer.invoke("dailyReport:get"),

  saveDailyReport: (report) =>
    ipcRenderer.invoke("dailyReport:save", report),

  getDailyReportById: (id) =>
    ipcRenderer.invoke("dailyReport:getById", id),

  updateDailyReport: (id, report) =>
    ipcRenderer.invoke("dailyReport:update", id, report),

  deleteDailyReport: (id) =>
    ipcRenderer.invoke("dailyReport:delete", id),

  getStockReport: () =>
    ipcRenderer.invoke("stock:report"),

});
