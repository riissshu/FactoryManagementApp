const api = {

  getSettings() {
    return window.api.getSettings();
  },

  saveSettings(factoryName, factoryLogo) {
    return window.api.saveSettings(factoryName, factoryLogo);
  },

};

export default api;