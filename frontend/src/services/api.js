const api = {
  getSettings() {
    return window.api.getSettings();
  },

  saveSettings(factoryName, factoryLogo, masterPassword, openPdfAfterExport) {
    return window.api.saveSettings(factoryName, factoryLogo, masterPassword, openPdfAfterExport);
  },

  verifyMasterPassword(password) {
    return window.api.verifyMasterPassword(password);
  },


  getBOMStockGroupSettings: () =>
  window.api.getBOMStockGroupSettings(),

setBOMStockGroupAvailability: (stockGroupId, availableForBOM) =>
  window.api.setBOMStockGroupAvailability(
    stockGroupId,
    availableForBOM
  ),


  createBOM: (bomData) =>
  window.api.createBOM(bomData),

getBOMs: () =>
  window.api.getBOMs(),

getBOM: (bomId) =>
  window.api.getBOM(bomId),

updateBOM: (bomData) =>
  window.api.updateBOM(bomData),

deleteBOM: (bomId) =>
  window.api.deleteBOM(bomId),

  // Stock Groups / Units
  getStockGroups() {
    return window.api.getStockGroups();
  },
  addStockGroup(name) {
    return window.api.addStockGroup(name);
  },
  hasStockGroupTransactions(id) {
  return window.api.hasStockGroupTransactions(id);
},
  renameStockGroup(id, name) {
    return window.api.renameStockGroup(id, name);
  },
  deactivateStockGroup(id) {
    return window.api.deactivateStockGroup(id);
  },
  getStockUnits() {
    return window.api.getStockUnits();
  },
  addStockUnit(name) {
    return window.api.addStockUnit(name);
  },
  hasStockUnitTransactions(id) {
  return window.api.hasStockUnitTransactions(id);
},
  renameStockUnit(id, name) {
    return window.api.renameStockUnit(id, name);
  },
  deactivateStockUnit(id) {
    return window.api.deactivateStockUnit(id);
  },

  // Stock Items
  getStockItems() {
    return window.api.getStockItems();
  },

  getStockItemById(id) {
    return window.api.getStockItemById(id);
  },

  hasStockItemTransactions(id) {
    return window.api.hasStockItemTransactions(id);
  },

saveStockItem(item) {
  return window.api.saveStockItem(item).then((result) => {
    if (!result.success) {
      throw new Error(result.error);
    }

    return result.data;
  });
},
  updateStockItem(item) {
    return window.api.updateStockItem(item);
  },
  updateLowQtyAlert(id, value) {
    return window.api.updateLowQtyAlert(id, value);
  },
  inactivateStockItem(id) {
    return window.api.inactivateStockItem(id);
  },
  deleteStockItem(id) {
  return window.api.deleteStockItem(id);
},
  getStockReport() {
    return window.api.getStockReport();
  },

  getStockItemTransactions(stockItemId) {
  return window.api.getStockItemTransactions(stockItemId);
},

    saveStockAdjustment(adjustment) {
    return window.api.saveStockAdjustment(adjustment).then((result) => {
      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    });
  },

  getStockAdjustments: () =>
  window.api.getStockAdjustments(),

  bulkUpdateStockItems(items) {
    return window.api.bulkUpdateStockItems(items);
  },
  bulkCreateStockItems(items) {
    return window.api.bulkCreateStockItems(items);
  },
  downloadStockItemTemplate() {
    return window.api.downloadStockItemTemplate();
  },


    getPurchaseRegister() {
    return window.api.getPurchaseRegister();
  },
  
  getDispatchRegister() {
  return window.api.getDispatchRegister();
},

getProductionRegister() {
  return window.api.getProductionRegister();
},


  // Clipboard
  getClipboard() {
    return window.api.getClipboard();
  },

  addClipboard(item) {
    return window.api.addClipboard(item);
  },

  pinClipboard(item) {
    return window.api.pinClipboard(item);
  },

  unpinClipboard(item) {
    return window.api.unpinClipboard(item);
  },

  deleteClipboard(item) {
    return window.api.deleteClipboard(item);
  },

  clearClipboard() {
    return window.api.clearClipboard();
  },

  

// Weekly Reports
saveWeeklyReport(report) {
  return window.api.saveWeeklyReport(report);
},

getWeeklyReports() {
  return window.api.getWeeklyReports();
},

getWeeklyReportById(id) {
  return window.api.getWeeklyReportById(id);
},


  // Daily Reports
  getDailyReports() {
    return window.api.getDailyReports();
  },
  saveDailyReport(report) {
    return window.api.saveDailyReport(report);
  },
  getDailyReportById(id) {
    return window.api.getDailyReportById(id);
  },
  getDailyReportByDate(date) {
    return window.api.getDailyReportByDate(date);
  },
  updateDailyReport(id, report, masterPassword) {
    return window.api.updateDailyReport(id, report, masterPassword);
  },
  deleteDailyReport(id, masterPassword) {
    return window.api.deleteDailyReport(id, masterPassword);
  },

  markDailyReportExported(id) {
  return window.api.markDailyReportExported(id);
},


  // Application Updates
  checkForUpdates() {
    return window.api.checkForUpdates();
  },

  onUpdateProgress(callback) {
  return window.api.onUpdateProgress(callback);
},

   getAppVersion() {
    return window.api.getAppVersion();
  },


  // Application / Company Gateway
  getStartupState() {
    return window.api.getStartupState();
  },
  getCompanies() {
    return window.api.getCompanies();
  },
  chooseCompanyDirectory() {
    return window.api.chooseCompanyDirectory();
  },
  createCompany(options) {
    return window.api.createCompany(options);
  },
  openCompany(dbPath) {
    return window.api.openCompany(dbPath);
  },
  restoreCompany() {
    return window.api.restoreCompany();
  },
  setStartupCompany(data) {
    return window.api.setStartupCompany(data);
  },
  selectDefaultCompany(dbPath) {
    return window.api.selectDefaultCompany(dbPath);
  },

  // Backup / Restore
  createBackup() {
    return window.api.createBackup();
  },
  restoreBackup() {
    return window.api.restoreBackup();
  },
  restoreFirstInstallBackup() {
    return window.api.restoreFirstInstallBackup();
  },
  exportPdf(data) {
    return window.api.exportPdf(data);
  },

  // Database location / multi-company
  getDbLocation() {
    return window.api.getDbLocation();
  },
  closeCompany() {
  return window.api.closeCompany();
},
  getDbFolders() {
    return window.api.getDbFolders();
  },
  createNewDatabase(options) {
    return window.api.createNewDatabase(options);
  },
  selectExistingDatabase() {
    return window.api.selectExistingDatabase();
  },
  moveDatabase() {
    return window.api.moveDatabase();
  },
  setDefaultBackupDir() {
    return window.api.setDefaultBackupDir();
  },
  setDefaultRestoreDir() {
    return window.api.setDefaultRestoreDir();
  },
};

export default api;