const api = {

  getSettings() {
    return window.api.getSettings();
  },

  saveSettings(factoryName, factoryLogo, masterPassword) {
    return window.api.saveSettings(factoryName, factoryLogo, masterPassword);
  },



  verifyMasterPassword(password) { return window.api.verifyMasterPassword(password); },

  getStockItems() {
    return window.api.getStockItems();
  },

  saveStockItem(item) {
    return window.api.saveStockItem(item);
  },

  updateStockItem(item) {
    return window.api.updateStockItem(item);
  },

  inactivateStockItem(id) {
    return window.api.inactivateStockItem(id);
  },

  getDailyReports() {
    return window.api.getDailyReports();
  },

  saveDailyReport(report) {
    return window.api.saveDailyReport(report);
  },

  getDailyReportById(id) {
    return window.api.getDailyReportById(id);
  },

  updateDailyReport(id, report) {
    return window.api.updateDailyReport(id, report);
  },

  deleteDailyReport(id) {
    return window.api.deleteDailyReport(id);
  },

  getStockReport() {
    return window.api.getStockReport();
  },
  bulkUpdateStockItems(items) { return window.api.bulkUpdateStockItems(items); },
  createBackup() { return window.api.createBackup(); },
  restoreBackup() { return window.api.restoreBackup(); },
  restoreFirstInstallBackup() {
    return window.api.restoreFirstInstallBackup();
},
  exportPdf(data) { return window.api.exportPdf(data); },

};

export default api;
