const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  getSettings: () => ipcRenderer.invoke("settings:get"),

  saveSettings: (factoryName, factoryLogo, masterPassword) =>
    ipcRenderer.invoke("settings:save", {
      factoryName,
      factoryLogo,
      masterPassword,
    }),

    updateFactoryProfile: (data) =>
    ipcRenderer.invoke(
        "settings:updateProfile",
        data
    ),
    
  verifyMasterPassword: (password) => ipcRenderer.invoke("settings:verifyPassword", password),

  

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
  bulkUpdateStockItems: (items) => ipcRenderer.invoke("stock:bulkUpdate", items),
  createBackup: () => ipcRenderer.invoke("backup:create"),
  restoreBackup: () => ipcRenderer.invoke("backup:restore"),
  restoreFirstInstallBackup: () =>
    ipcRenderer.invoke("backup:firstInstallRestore"),
  exportPdf: (data) => ipcRenderer.invoke("report:exportPdf", data),

});
