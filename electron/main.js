const { app, BrowserWindow, ipcMain, dialog, shell, } = require("electron");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const { createDatabase } = require("./database");

const isDev = process.env.NODE_ENV === "development";

let mainWindow;
let database = null; // bound functions for the currently open db file

function resolveDbPathOnStartup() {
  const configured = config.getDbPath();
  if (configured && fs.existsSync(configured)) return configured;
  // First run, or the configured file went missing: fall back to the
  // default location. FactoryGateway will treat "no settings row yet" as
  // needing setup, same as before.
  return config.defaultDbPath();
}

function openDatabaseAt(dbPath) {
  if (database) database.close();
  database = createDatabase(dbPath);
  config.setDbPath(dbPath);
  return database;
}

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
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
  }
}

app.whenReady().then(() => {
  openDatabaseAt(resolveDbPathOnStartup());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

const relaunch = () => {
  app.relaunch();
  app.quit();
};

// =======================
// Settings
// =======================

ipcMain.handle("settings:get", () => database.getSettings());

ipcMain.handle("settings:save", (event, data) => {
  return database.saveSettings(data.factoryName, data.factoryLogo, data.masterPassword,  data.openPdfAfterExport);
});

ipcMain.handle("settings:updateProfile", (event, data) => {
  return database.updateFactoryProfile(data.factoryName, data.factoryLogo, data.password);
});

ipcMain.handle("settings:verifyPassword", (event, password) =>
  database.verifyMasterPassword(password),
);

// =======================
// Stock Groups / Units
// =======================

ipcMain.handle("stockGroups:get", () => database.getStockGroups());
ipcMain.handle("stockGroups:add", (event, name) => database.addStockGroup(name));
ipcMain.handle("stockGroups:rename", (event, id, name) => database.renameStockGroup(id, name));
ipcMain.handle("stockGroups:deactivate", (event, id) => database.deactivateStockGroup(id));

ipcMain.handle(
  "stockGroups:hasTransactions",
  (event, id) =>
    database.hasStockGroupTransactions(id)
);

ipcMain.handle(
  "stockUnits:hasTransactions",
  (event, id) =>
    database.hasStockUnitTransactions(id)
);


ipcMain.handle("stockUnits:get", () => database.getStockUnits());
ipcMain.handle("stockUnits:add", (event, name) => database.addStockUnit(name));
ipcMain.handle("stockUnits:rename", (event, id, name) => database.renameStockUnit(id, name));
ipcMain.handle("stockUnits:deactivate", (event, id) => database.deactivateStockUnit(id));

// =======================
// Stock Items
// =======================

ipcMain.handle("stock:get", () => database.getStockItems());

ipcMain.handle("stock:getById", (event, id) =>
  database.getStockItemById(id)
);

ipcMain.handle("stock:hasTransactions", (event, id) =>
  database.hasStockItemTransactions(id)
);


ipcMain.handle("stock:save", (event, item) => {
  try {
    return {
      success: true,
      data: database.saveStockItem(item),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Unable to save stock item.",
    };
  }
});
ipcMain.handle("stock:update", (event, item) => database.updateStockItem(item));
ipcMain.handle("stock:updateLowQtyAlert", (event, id, value) =>
  database.updateLowQtyAlert(id, value),
);
ipcMain.handle("stock:inactivate", (event, id) => database.inactivateStockItem(id));

ipcMain.handle("stock:delete", (event, id) =>
  database.deleteStockItem(id)
);

ipcMain.handle("stock:report", () => database.getStockReport());
ipcMain.handle("stockAdjustment:save", (event, adjustment) => {
  try {
    return {
      success: true,
      data: database.saveStockAdjustment(adjustment),
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Unable to save stock adjustment.",
    };
  }
});
ipcMain.handle("stock:bulkUpdate", (event, items) => database.bulkUpdateStockItems(items));
ipcMain.handle("stock:bulkCreate", (event, items) => database.bulkCreateStockItems(items));

// =======================
// Daily Reports
// =======================

ipcMain.handle("dailyReport:get", () => database.getDailyReports());
ipcMain.handle("dailyReport:save", (event, report) => database.saveDailyReport(report));
ipcMain.handle("dailyReport:getById", (event, id) => database.getDailyReportById(id));
ipcMain.handle("dailyReport:getByDate", (event, date) => database.getDailyReportByDate(date));
ipcMain.handle("dailyReport:update", (event, id, report, masterPassword) =>
  database.updateDailyReport(id, report, masterPassword),
);
ipcMain.handle("dailyReport:delete", (event, id, masterPassword) => database.deleteDailyReport(id,  masterPassword));
ipcMain.handle(
  "dailyReport:markExported",
  (event, id) =>
    database.markDailyReportExported(id)
);

// =======================
// Backup / Restore (copies files, current db stays active)
// =======================

const safeName = (value) =>
  (value || "factory").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "factory";

ipcMain.handle("backup:create", async () => {
  const settings = database.getSettings();
  const suggested = path.join(
    config.getBackupDir(),
    `${safeName(settings?.factory_name)}-backup-${new Date().toISOString().slice(0, 10)}.db`,
  );
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save factory backup",
    defaultPath: suggested,
    filters: [{ name: "Factory Backup", extensions: ["db"] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  config.setBackupDir(path.dirname(result.filePath));
  database.backupTo(result.filePath);
  return { path: result.filePath };
});

ipcMain.handle("backup:restore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore factory backup",
    defaultPath: config.getRestoreDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Backup", extensions: ["db"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  config.setRestoreDir(path.dirname(result.filePaths[0]));

  // Restore overwrites the currently active database file in place.
  const active = config.getDbPath() || resolveDbPathOnStartup();
  database.close();
  fs.copyFileSync(result.filePaths[0], active);
  relaunch();
  return { restored: true };
});

// =======================
// Database location: create-new / select-existing / move (item #4)
// =======================

ipcMain.handle("dbLocation:get", () => ({
  dbPath: config.getDbPath() || resolveDbPathOnStartup(),
  defaultDir: config.defaultDbDir(),
}));

// Used from Factory Gateway (first-run) and Factory Profile: create a brand
// new database file, in a user-chosen folder or the app default, then
// switch the app to point at it.
ipcMain.handle("dbLocation:createNew", async (event, { folder, fileName } = {}) => {
  let targetDir = folder;

  if (!targetDir) {
    targetDir = config.defaultDbDir();
  } else {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a folder for the new factory database",
      defaultPath: targetDir,
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
    targetDir = picked.filePaths[0];
  }

  const name = safeName(fileName) + ".db";
  const newPath = path.join(targetDir, name);

  if (fs.existsSync(newPath)) {
    return { error: `A database already exists at ${newPath}. Choose a different folder or name.` };
  }

  openDatabaseAt(newPath); // creates the file (tables are created on open)
  return { path: newPath };
});

// Pick an existing .db file anywhere on disk and switch the app to use it.
ipcMain.handle("dbLocation:selectExisting", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select an existing factory database",
    properties: ["openFile"],
    filters: [{ name: "Factory Database", extensions: ["db"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  config.setDbPath(result.filePaths[0]);
  relaunch();
  return { switched: true };
});

// Move the current database file to a new folder, then switch to it there.
ipcMain.handle("dbLocation:move", async () => {
  const current = config.getDbPath() || resolveDbPathOnStartup();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a new folder for this factory database",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const newPath = path.join(result.filePaths[0], path.basename(current));
  if (fs.existsSync(newPath)) {
    return { error: `A database already exists at ${newPath}.` };
  }

  database.close();
  fs.mkdirSync(path.dirname(newPath), { recursive: true });
  fs.copyFileSync(current, newPath);
  fs.unlinkSync(current);
  config.setDbPath(newPath);
  relaunch();
  return { moved: true, path: newPath };
});

ipcMain.handle("dbLocation:setDefaultBackupDir", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose default backup folder",
    defaultPath: config.getBackupDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  config.setBackupDir(result.filePaths[0]);
  return { path: result.filePaths[0] };
});

ipcMain.handle("dbLocation:setDefaultRestoreDir", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose default restore folder",
    defaultPath: config.getRestoreDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  config.setRestoreDir(result.filePaths[0]);
  return { path: result.filePaths[0] };
});

ipcMain.handle("dbLocation:getFolders", () => ({
  dbPath: config.getDbPath() || resolveDbPathOnStartup(),
  dbDir: path.dirname(config.getDbPath() || resolveDbPathOnStartup()),
  backupDir: config.getBackupDir(),
  restoreDir: config.getRestoreDir(),
}));

// =======================
// First-install restore (kept for backwards compatibility with existing UI):
// restores a backup file directly into the default db location on first run.
// =======================

ipcMain.handle("backup:firstInstallRestore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Factory Backup",
    properties: ["openFile"],
    filters: [{ name: "Factory Backup", extensions: ["db"] }],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const target = config.defaultDbPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(result.filePaths[0], target);
  config.setDbPath(target);

  relaunch();
  return { restored: true };
});

ipcMain.handle(
  "report:exportPdf",
  async (
    event,
    {
      title,
      filename,
      pdfData,
      openPdfAfterExport = false,
    },
  ) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export PDF",
      defaultPath: filename || `${safeName(title)}.pdf`,
      filters: [
        {
          name: "PDF",
          extensions: ["pdf"],
        },
      ],
    });

    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
      };
    }

    try {
      // Convert ArrayBuffer received from renderer
      // into a Node.js Buffer.
      const pdfBuffer = Buffer.from(pdfData);

      // Write the exact jsPDF-generated PDF.
      fs.writeFileSync(
        result.filePath,
        pdfBuffer
      );

      // Automatically open if enabled
      if (  Number(openPdfAfterExport) === 1 ||
  openPdfAfterExport === true ) {
        const openError = await shell.openPath(
          result.filePath
        );

        if (openError) {
          console.error(
            "Unable to open exported PDF:",
            openError
          );
        }
      }

      return {
        path: result.filePath,
        opened: openPdfAfterExport,
      };
    } catch (error) {
      console.error(
        "PDF export failed:",
        error
      );

      throw error;
    }
  }
);

ipcMain.handle(
  "report:exportExcel",
  async (
    event,
    {
      filename,
      excelData,
    },
  ) => {
    const result = await dialog.showSaveDialog(
      mainWindow,
      {
        title: "Export Excel",
        defaultPath:
          filename || "Daily Report.xlsx",
        filters: [
          {
            name: "Excel Workbook",
            extensions: ["xlsx"],
          },
        ],
      }
    );

    if (
      result.canceled ||
      !result.filePath
    ) {
      return {
        canceled: true,
      };
    }

    try {
      const excelBuffer =
        Buffer.from(excelData);

      fs.writeFileSync(
        result.filePath,
        excelBuffer
      );

      return {
        path: result.filePath,
      };
    } catch (error) {
      console.error(
        "Excel export failed:",
        error
      );

      throw error;
    }
  }
);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});