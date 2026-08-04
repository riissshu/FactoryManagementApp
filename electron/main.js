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
      path.join(__dirname, "../Frontend/dist/index.html")
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


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});