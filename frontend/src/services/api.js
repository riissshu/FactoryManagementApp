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
    return window.api.saveStockItem(item);
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
  bulkUpdateStockItems(items) {
    return window.api.bulkUpdateStockItems(items);
  },
  bulkCreateStockItems(items) {
    return window.api.bulkCreateStockItems(items);
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
