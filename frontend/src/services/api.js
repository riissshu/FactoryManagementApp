const api = {
  getSettings() {
    return window.api.getSettings();
  },

  saveSettings(factoryName, factoryLogo, masterPassword) {
    return window.api.saveSettings(factoryName, factoryLogo, masterPassword);
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
  updateDailyReport(id, report) {
    return window.api.updateDailyReport(id, report);
  },
  deleteDailyReport(id) {
    return window.api.deleteDailyReport(id);
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