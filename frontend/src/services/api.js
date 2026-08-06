const api = {

  getSettings() {
    return window.api.getSettings();
  },

  saveSettings(factoryName, factoryLogo) {
    return window.api.saveSettings(factoryName, factoryLogo);
  },

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
  
};

export default api;
