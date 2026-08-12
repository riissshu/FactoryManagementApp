const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("settings:get"),

  saveSettings: (factoryName, factoryLogo, masterPassword, openPdfAfterExport) =>
    ipcRenderer.invoke("settings:save", {
      factoryName,
      factoryLogo,
      masterPassword,
       openPdfAfterExport,
    }),

  updateFactoryProfile: (data) =>
    ipcRenderer.invoke("settings:updateProfile", data),

  verifyMasterPassword: (password) =>
    ipcRenderer.invoke("settings:verifyPassword", password),

  // Stock Groups / Units
  getStockGroups: () => ipcRenderer.invoke("stockGroups:get"),
  addStockGroup: (name) => ipcRenderer.invoke("stockGroups:add", name),
  renameStockGroup: (id, name) =>
    ipcRenderer.invoke("stockGroups:rename", id, name),
  deactivateStockGroup: (id) =>
    ipcRenderer.invoke("stockGroups:deactivate", id),
  hasStockGroupTransactions: (id) =>
    ipcRenderer.invoke("stockGroups:hasTransactions", id),

  hasStockUnitTransactions: (id) =>
    ipcRenderer.invoke("stockUnits:hasTransactions", id),
  getStockUnits: () => ipcRenderer.invoke("stockUnits:get"),
  addStockUnit: (name) => ipcRenderer.invoke("stockUnits:add", name),
  renameStockUnit: (id, name) =>
    ipcRenderer.invoke("stockUnits:rename", id, name),
  deactivateStockUnit: (id) => ipcRenderer.invoke("stockUnits:deactivate", id),

  // Stock Items
  getStockItems: () => ipcRenderer.invoke("stock:get"),
  getStockItemById: (id) => ipcRenderer.invoke("stock:getById", id),

  hasStockItemTransactions: (id) =>
    ipcRenderer.invoke("stock:hasTransactions", id),
  saveStockItem: (item) => ipcRenderer.invoke("stock:save", item),
  updateStockItem: (item) => ipcRenderer.invoke("stock:update", item),
  updateLowQtyAlert: (id, value) =>
    ipcRenderer.invoke("stock:updateLowQtyAlert", id, value),
  inactivateStockItem: (id) => ipcRenderer.invoke("stock:inactivate", id),
  deleteStockItem: (id) => ipcRenderer.invoke("stock:delete", id),
  getStockReport: () => ipcRenderer.invoke("stock:report"),
  bulkUpdateStockItems: (items) =>
    ipcRenderer.invoke("stock:bulkUpdate", items),
  bulkCreateStockItems: (items) =>
    ipcRenderer.invoke("stock:bulkCreate", items),

  // Daily Reports
  getDailyReports: () => ipcRenderer.invoke("dailyReport:get"),
  saveDailyReport: (report) => ipcRenderer.invoke("dailyReport:save", report),
  getDailyReportById: (id) => ipcRenderer.invoke("dailyReport:getById", id),
  getDailyReportByDate: (date) =>
    ipcRenderer.invoke("dailyReport:getByDate", date),
  updateDailyReport: (id, report, masterPassword) =>
    ipcRenderer.invoke("dailyReport:update", id, report, masterPassword),
  deleteDailyReport: (id, masterPassword) => ipcRenderer.invoke("dailyReport:delete", id, masterPassword),
  markDailyReportExported: (id) =>
  ipcRenderer.invoke(
    "dailyReport:markExported",
    id
),

  // Backup / Restore
  createBackup: () => ipcRenderer.invoke("backup:create"),
  restoreBackup: () => ipcRenderer.invoke("backup:restore"),
  restoreFirstInstallBackup: () =>
    ipcRenderer.invoke("backup:firstInstallRestore"),
  exportPdf: (data) => ipcRenderer.invoke("report:exportPdf", data),

  // Database location / multi-company
  getDbLocation: () => ipcRenderer.invoke("dbLocation:get"),
  getDbFolders: () => ipcRenderer.invoke("dbLocation:getFolders"),
  createNewDatabase: (options) =>
    ipcRenderer.invoke("dbLocation:createNew", options),
  selectExistingDatabase: () => ipcRenderer.invoke("dbLocation:selectExisting"),
  moveDatabase: () => ipcRenderer.invoke("dbLocation:move"),
  setDefaultBackupDir: () =>
    ipcRenderer.invoke("dbLocation:setDefaultBackupDir"),
  setDefaultRestoreDir: () =>
    ipcRenderer.invoke("dbLocation:setDefaultRestoreDir"),
});
