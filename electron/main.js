const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
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
    data.factoryLogo,
    data.masterPassword
  );
});

ipcMain.handle(
    "settings:updateProfile",
    (event, data) => {

        return database.updateFactoryProfile(
            data.factoryName,
            data.factoryLogo,
            data.password
        );

    }
);

ipcMain.handle("settings:verifyPassword", (event, password) => database.verifyMasterPassword(password));


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

ipcMain.handle("stock:bulkUpdate", (event, items) => database.bulkUpdateStockItems(items));

const safeName = (value) => (value || "factory").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "factory";
ipcMain.handle("backup:create", async () => {
  const settings = database.getSettings();
  const suggested = `${safeName(settings?.factory_name)}-backup-${new Date().toISOString().slice(0, 10)}.db`;
  const result = await dialog.showSaveDialog(mainWindow, { title: "Save factory backup", defaultPath: suggested, filters: [{ name: "Factory Backup", extensions: ["db"] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  database.backupTo(result.filePath);
  return { path: result.filePath };
});

ipcMain.handle("backup:restore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { title: "Restore factory backup", properties: ["openFile"], filters: [{ name: "Factory Backup", extensions: ["db"] }] });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  database.restoreFrom(result.filePaths[0]);
  app.relaunch();
  app.quit();
  return { restored: true };
});

ipcMain.handle("backup:firstInstallRestore", async () => {

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Factory Backup",
    properties: ["openFile"],
    filters: [
      {
        name: "Factory Backup",
        extensions: ["db"]
      }
    ]
  });


  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }


  database.restoreFrom(result.filePaths[0]);


  app.relaunch();
  app.quit();


  return {
    restored: true
  };

});

ipcMain.handle("report:exportPdf", async (event, { title, html, filename }) => {
  const result = await dialog.showSaveDialog(mainWindow, { title: "Export PDF", defaultPath: filename || `${safeName(title)}.pdf`, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  const printWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#1f2937;padding:28px}h1{color:#0f766e;font-size:22px;margin:0 0 4px}p{color:#64748b;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#0f766e;color:#fff}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}td.num,th.num{text-align:right}@page{margin:16mm}</style></head><body>${html}</body></html>`)}`);
  const pdf = await printWindow.webContents.printToPDF({ printBackground: true, pageSize: "A4", landscape: true });
  fs.writeFileSync(result.filePath, pdf);
  printWindow.destroy();
  return { path: result.filePath };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
