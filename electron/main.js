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

  // A configured database is the only database we automatically open.
  // If it is missing, do NOT silently switch to another database.
  if (configured && fs.existsSync(configured)) return configured;

  return null;
}

function requireDatabase() {
  if (!database) {
    throw new Error("No company database is currently configured.");
  }
  return database;
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
  const startupDbPath = resolveDbPathOnStartup();
  if (startupDbPath) {
    openDatabaseAt(startupDbPath);
  }
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

ipcMain.handle("settings:get", () => database ? database.getSettings() : null);

ipcMain.handle("settings:save", (event, data) => {
  return requireDatabase().saveSettings(
    data.factoryName,
    data.factoryLogo,
    data.masterPassword,
    data.openPdfAfterExport,
  );
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
ipcMain.handle(
  "stock:itemTransactions",
  (event, stockItemId) => database.getStockItemTransactions(stockItemId)
);
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

ipcMain.handle("get-stock-adjustments", () => {
  return database.getStockAdjustments();
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

function validateFactoryDatabase(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return false;

  let probe;
  try {
    const Database = require("better-sqlite3");
    probe = new Database(dbPath, { readonly: true, fileMustExist: true });
    const requiredTables = [
      "settings",
      "stock_groups",
      "stock_units",
      "stock_items",
      "daily_reports",
    ];
    const rows = probe
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    return requiredTables.every((table) => rows.includes(table));
  } catch (_) {
    return false;
  } finally {
    if (probe) probe.close();
  }
}

ipcMain.handle("backup:create", async () => {
  const db = requireDatabase();
  const settings = db.getSettings();
  const backupDir = config.getBackupDir();

  fs.mkdirSync(backupDir, { recursive: true });

  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("-");

  const fileName = `${safeName(settings?.factory_name)}-backup-${stamp}.db`;
  const backupPath = path.join(backupDir, fileName);

  db.backupTo(backupPath);
  return { path: backupPath };
});

ipcMain.handle("backup:restore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select factory backup to restore",
    defaultPath: config.getRestoreDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Backup", extensions: ["db"] }],
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const backupPath = result.filePaths[0];
  if (!validateFactoryDatabase(backupPath)) {
    return {
      error: "The selected file is not a valid Factory database backup.",
    };
  }

  const active = config.getDbPath();
  if (!active || !fs.existsSync(active)) {
    return {
      error: "The current company database could not be found. Use Factory Gateway to create, locate, or restore a company database.",
    };
  }

  const target = active;

  if (database) database.close();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(backupPath, target);
  config.setDbPath(target);

  relaunch();
  return { restored: true, path: target };
});

// =======================
// Database location: create-new / select-existing / move (item #4)
// =======================

ipcMain.handle("dbLocation:get", () => {
  const dbPath = config.getDbPath();
  return {
    dbPath: dbPath && fs.existsSync(dbPath) ? dbPath : null,
    defaultDir: config.defaultDbDir(),
    databaseMissing: Boolean(dbPath && !fs.existsSync(dbPath)),
  };
});

// Used from Factory Gateway (first-run) and Factory Profile: create a brand
// new database file, in a user-chosen folder or the app default, then
// switch the app to point at it.
ipcMain.handle("dbLocation:createNew", async (event, { folder, fileName } = {}) => {
  let targetDir = folder;

  // Passing folder:"pick" means the caller wants the user to choose the
  // database folder. The database is still created only after that choice.
  if (folder === "pick") {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a folder for the new factory database",
      defaultPath: config.defaultDbDir(),
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
    targetDir = picked.filePaths[0];
  } else if (!targetDir) {
    targetDir = config.defaultDbDir();
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
    defaultPath: config.getDbPath() || config.defaultDbDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Database", extensions: ["db"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const selectedPath = result.filePaths[0];
  if (!validateFactoryDatabase(selectedPath)) {
    return {
      error: "The selected file is not a valid Factory database.",
    };
  }

  config.setDbPath(selectedPath);
  relaunch();
  return { switched: true, path: selectedPath };
});

// Move the current database file to a new folder, then switch to it there.
ipcMain.handle("dbLocation:move", async () => {
  const current = config.getDbPath();
  if (!current || !fs.existsSync(current)) {
    return { error: "The current company database could not be found." };
  }

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
  // Backwards-compatible alias: Restore uses the Backup Folder.
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose backup folder",
    defaultPath: config.getBackupDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  config.setBackupDir(result.filePaths[0]);
  return { path: result.filePaths[0] };
});

ipcMain.handle("dbLocation:getFolders", () => {
  const dbPath = config.getDbPath();
  return {
    dbPath: dbPath && fs.existsSync(dbPath) ? dbPath : null,
    dbDir: dbPath ? path.dirname(dbPath) : null,
    defaultDbDir: config.defaultDbDir(),
    backupDir: config.getBackupDir(),
    restoreDir: config.getRestoreDir(),
  };
});

// =======================
// First-run restore: restore a valid Factory Book backup into the app's
// default database location, then remember that database as the active one.
// =======================

ipcMain.handle("backup:firstInstallRestore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Factory Backup",
    defaultPath: config.getBackupDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Backup", extensions: ["db"] }],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  const backupPath = result.filePaths[0];
  if (!validateFactoryDatabase(backupPath)) {
    return {
      error: "The selected file is not a valid Factory database backup.",
    };
  }

  const target = config.defaultDbPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(backupPath, target);
  config.setDbPath(target);

  relaunch();
  return { restored: true, path: target };
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