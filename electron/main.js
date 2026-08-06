const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const database = require("./database");

const isDev = process.env.NODE_ENV === "development";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 850,
    minWidth: 1200,
    minHeight: 700,
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // React Dev Server
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // Production Build
    mainWindow.loadFile(
      path.join(__dirname, "../frontend/dist/index.html")
    );
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


ipcMain.handle("settings:get", () => {
  return database.getSettings();
});

ipcMain.handle("settings:save", (event, data) => {
  return database.saveSettings(
    data.factoryName,
    data.factoryLogo
  );
});


ipcMain.handle("stock:get", () => {
  return database.getStockItems();
});

ipcMain.handle("stock:save", (event, item) => {
  return database.saveStockItem(item);
});

ipcMain.handle("stock:update", (event, item) => {
  return database.updateStockItem(item);
});

ipcMain.handle("stock:inactivate", (event, id) => {
    return database.inactivateStockItem(id);
});

ipcMain.handle("dailyReport:get", () => {
  return database.getDailyReports();
});

ipcMain.handle("dailyReport:save", (event, report) => {
  return database.saveDailyReport(report);
});

ipcMain.handle("dailyReport:getById", (event, id) => {
    return database.getDailyReportById(id);
});

ipcMain.handle("dailyReport:update", (event, id, report) => {
  return database.updateDailyReport(id, report);
});

ipcMain.handle("dailyReport:delete", (event, id) => {
  return database.deleteDailyReport(id);
});

ipcMain.handle("stock:report", () => {
  return database.getStockReport();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
