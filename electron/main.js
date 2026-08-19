const { app, BrowserWindow, ipcMain, dialog, shell, } = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const config = require("./config");
const { createDatabase } = require("./database");

const isDev = process.env.NODE_ENV === "development";

// =======================
// Encrypted Backup
// =======================

// Keep this key unchanged after releasing the app.
// It is used to encrypt/decrypt all .005 backup files.
const BACKUP_KEY = crypto
  .createHash("sha256")
  .update("FactoryBook-Backup-Key-2026-Portable-AES-256", "utf8")
  .digest();

const BACKUP_MAGIC = Buffer.from("FACTORYBOOK005", "utf8");
const BACKUP_VERSION = 1;

function encryptBackup(dbBuffer) {
  const compressed = zlib.deflateRawSync(dbBuffer, { level: 9 });
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", BACKUP_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(compressed),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    BACKUP_MAGIC,
    Buffer.from([BACKUP_VERSION]),
    iv,
    authTag,
    encrypted,
  ]);
}

function decryptBackup(backupBuffer) {
  const magicLength = BACKUP_MAGIC.length;

  if (
    backupBuffer.length <
    magicLength + 1 + 12 + 16
  ) {
    throw new Error("Invalid or corrupted backup file.");
  }

  const magic = backupBuffer.subarray(0, magicLength);
  if (!magic.equals(BACKUP_MAGIC)) {
    throw new Error("Invalid Factory Book backup file.");
  }

  const version = backupBuffer.readUInt8(magicLength);
  if (version !== BACKUP_VERSION) {
    throw new Error("Unsupported Factory Book backup version.");
  }

  const ivStart = magicLength + 1;
  const iv = backupBuffer.subarray(ivStart, ivStart + 12);

  const tagStart = ivStart + 12;
  const authTag = backupBuffer.subarray(tagStart, tagStart + 16);

  const encryptedStart = tagStart + 16;
  const encrypted = backupBuffer.subarray(encryptedStart);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    BACKUP_KEY,
    iv,
  );
  decipher.setAuthTag(authTag);

  const compressed = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return zlib.inflateRawSync(compressed);
}

function createEncryptedBackup(db, backupPath) {
  const tempDbPath = `${backupPath}.tmp.db`;

  try {
    db.backupTo(tempDbPath);

    const dbBuffer = fs.readFileSync(tempDbPath);
    const encryptedBackup = encryptBackup(dbBuffer);

    fs.writeFileSync(backupPath, encryptedBackup);
  } finally {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (_) {}
    }
  }
}


let mainWindow;
let database = null; // bound functions for the currently open db file

function openDatabaseAt(dbPath) {
  if (!dbPath) throw new Error("Company database path is required.");
  if (database) database.close();
  database = createDatabase(dbPath);
  config.setDbPath(dbPath);
  return database;
}

function requireDatabase() {
  if (!database) {
    throw new Error("No company is currently open.");
  }
  return database;
}

function hasFactoryTables(dbPath) {
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
    const names = probe
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    return requiredTables.every((table) => names.includes(table));
  } catch (_) {
    return false;
  } finally {
    if (probe) probe.close();
  }
}

function validateFactoryDatabase(dbPath) {
  if (!hasFactoryTables(dbPath)) return false;
  let probe;
  try {
    const Database = require("better-sqlite3");
    probe = new Database(dbPath, { readonly: true, fileMustExist: true });
    const row = probe
      .prepare("SELECT database_type FROM app_metadata WHERE id = 1")
      .get();
    return row?.database_type === "factory_book";
  } catch (_) {
    return false;
  } finally {
    if (probe) probe.close();
  }
}

function ensureFactoryMetadata(dbPath) {
  if (!hasFactoryTables(dbPath)) return false;
  if (validateFactoryDatabase(dbPath)) return true;
  return migrateConfiguredLegacyDatabase(dbPath);
}

// Existing versions of the app did not have app_metadata. If the currently
// configured database has the known Factory Book schema, add the identity
// marker once so existing user data remains usable. Arbitrary .db files are
// never auto-migrated; they must be explicitly opened/imported first.
function migrateConfiguredLegacyDatabase(dbPath) {
  if (!hasFactoryTables(dbPath) || validateFactoryDatabase(dbPath)) return false;

  let probe;
  try {
    const Database = require("better-sqlite3");
    probe = new Database(dbPath);
    probe.exec(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        database_type TEXT NOT NULL,
        database_version INTEGER NOT NULL DEFAULT 1,
        database_id TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const existing = probe
      .prepare("SELECT database_type FROM app_metadata WHERE id = 1")
      .get();

    if (existing && existing.database_type !== "factory_book") {
      return false;
    }

    probe.prepare(`
      INSERT OR IGNORE INTO app_metadata
        (id, database_type, database_version, database_id)
      VALUES (1, 'factory_book', 1, ?)
    `).run(require("crypto").randomUUID());
    return true;
  } catch (error) {
    console.error("Legacy database migration failed:", error);
    return false;
  } finally {
    if (probe) probe.close();
  }
}

function getCompanyInfo(dbPath, requireMetadata = true) {
  if (!hasFactoryTables(dbPath)) return null;
  let probe;
  try {
    const Database = require("better-sqlite3");
    probe = new Database(dbPath, { readonly: true, fileMustExist: true });
    const settings = probe.prepare("SELECT * FROM settings LIMIT 1").get();
    let metadata = null;
    try {
      metadata = probe
        .prepare("SELECT database_id, database_version, database_type FROM app_metadata WHERE id = 1")
        .get();
    } catch (_) {}

    if (requireMetadata && metadata?.database_type !== "factory_book") return null;

    return {
      path: dbPath,
      name: settings?.factory_name || path.basename(dbPath, path.extname(dbPath)),
      logo: settings?.factory_logo || null,
      setupComplete: Boolean(settings?.master_password_hash),
      databaseId: metadata?.database_id || null,
      databaseVersion: metadata?.database_version || 1,
    };
  } catch (_) {
    return null;
  } finally {
    if (probe) probe.close();
  }
}

function scanCompanies() {
  const dir = config.getCompanyDir();
  if (!fs.existsSync(dir)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".db")
    .map((entry) => getCompanyInfo(path.join(dir, entry.name)))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function resolveStartupCompany() {
  const configured = config.getDefaultCompany();
  if (!configured || !fs.existsSync(configured)) return null;
  if (!validateFactoryDatabase(configured)) return null;
  return configured;
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
  const legacy = config.getDbPath();
  if (legacy && fs.existsSync(legacy) && hasFactoryTables(legacy)) {
    migrateConfiguredLegacyDatabase(legacy);
    if (!config.getDefaultCompany()) {
      config.setDefaultCompany(legacy);
    }
    if (config.getCompanyDir() === config.defaultCompanyDir()) {
      config.setCompanyDir(path.dirname(legacy));
    }
  }

  const startupCompany = config.getAutoOpenDefaultCompany()
    ? resolveStartupCompany()
    : null;

  if (startupCompany) {
    openDatabaseAt(startupCompany);
  } else {
    // Do not create/open a hidden default database. Factory Gateway is the
    // company-selection screen when no company is opened automatically.
    database = null;
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

ipcMain.handle(
  "purchaseRegister:get",
  () => database.getPurchaseRegister()
);

ipcMain.handle(
  "dispatchRegister:get",
  () => database.getDispatchRegister()
);

ipcMain.handle(
  "productionRegister:get",
  () => database.getProductionRegister()
);


// =======================
// Weekly Reports
// =======================

ipcMain.handle(
  "weeklyReport:save",
  (event, report) => database.saveWeeklyReport(report)
);


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
// Company / Backup / Restore
// =======================

const safeName = (value) =>
  (value || "factory")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "") || "factory";

ipcMain.handle("app:startupState", () => {
  const currentPath = config.getDbPath();
  const active = Boolean(database && currentPath && fs.existsSync(currentPath));
  const defaultPath = config.getDefaultCompany();
  const defaultAvailable = Boolean(defaultPath && validateFactoryDatabase(defaultPath));

  return {
    active,
    setupComplete: active ? Boolean(database.getSettings()?.master_password_hash) : false,
    currentPath: active ? currentPath : null,
    defaultCompanyPath: defaultPath,
    defaultAvailable,
    autoOpenDefaultCompany: config.getAutoOpenDefaultCompany(),
    companyDir: config.getCompanyDir(),
  };
});

ipcMain.handle("company:list", () => ({
  directory: config.getCompanyDir(),
  companies: scanCompanies(),
  defaultCompanyPath: config.getDefaultCompany(),
  autoOpenDefaultCompany: config.getAutoOpenDefaultCompany(),
}));

ipcMain.handle("company:chooseDirectory", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose Company Directory",
    defaultPath: config.getCompanyDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const dir = result.filePaths[0];
  config.setCompanyDir(dir);
  return {
    directory: dir,
    companies: scanCompanies(),
  };
});

ipcMain.handle("company:create", async (event, { folder, fileName } = {}) => {
  const targetDir = folder || config.getCompanyDir();
  fs.mkdirSync(targetDir, { recursive: true });

  const cleanName = safeName(fileName);
  const newPath = path.join(targetDir, `${cleanName}.db`);

  if (fs.existsSync(newPath)) {
    return { error: `A company database already exists at ${newPath}.` };
  }

  openDatabaseAt(newPath);
  config.setCompanyDir(targetDir);
  config.setDefaultCompany(newPath);

  return { created: true, path: newPath };
});

ipcMain.handle("company:open", async (event, dbPath) => {
  if (!ensureFactoryMetadata(dbPath)) {
    return { error: "The selected file is not a valid Factory Book company database." };
  }

  openDatabaseAt(dbPath);
  
  return { opened: true, path: dbPath };
});

ipcMain.handle("company:setStartup", (event, { path: dbPath, enabled }) => {
  if (enabled) {
    if (!dbPath || !validateFactoryDatabase(dbPath)) {
      return { error: "The selected default company is not available." };
    }
    config.setDefaultCompany(dbPath);
  }
  config.setAutoOpenDefaultCompany(Boolean(enabled));
  return {
    enabled: Boolean(enabled),
    path: enabled ? dbPath : config.getDefaultCompany(),
  };
});

ipcMain.handle("company:selectDefault", (event, dbPath) => {
  if (!dbPath || !validateFactoryDatabase(dbPath)) {
    return { error: "The selected company is not available." };
  }
  config.setDefaultCompany(dbPath);
  return { path: dbPath };
});

ipcMain.handle("company:restore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Factory Book Backup",
    defaultPath: config.getBackupDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Book Backup", extensions: ["db"] }],
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const backupPath = result.filePaths[0];
  if (!hasFactoryTables(backupPath)) {
    return { error: "The selected file is not a valid Factory Book backup." };
  }

  let info = getCompanyInfo(backupPath, false);
  if (!info) return { error: "Unable to read the company information from this backup." };

  const companyDir = config.getCompanyDir();
  fs.mkdirSync(companyDir, { recursive: true });
  let target = path.join(companyDir, `${safeName(info.name)}.db`);

  if (fs.existsSync(target)) {
    const overwrite = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Replace Company", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      title: "Company Already Exists",
      message: `${info.name} already exists in the Company Directory.`,
      detail: "Do you want to replace the existing company with this backup?",
    });
    if (overwrite.response !== 0) return { canceled: true };
  }

  if (database) {
     database.close();
       database = null;
  }
  fs.copyFileSync(backupPath, target);
  config.setDbPath(target);
  config.setDefaultCompany(target);

  
  return { restored: true, path: target, name: info.name };
});

ipcMain.handle("backup:create", async () => {
  const db = requireDatabase();
  const settings = db.getSettings();
  const backupDir = config.getBackupDir();
  fs.mkdirSync(backupDir, { recursive: true });


  const fileName = `${safeName(settings?.factory_name)}.005`;
  const backupPath = path.join(backupDir, fileName);

   // Ask before replacing an existing backup
  if (fs.existsSync(backupPath)) {
    const overwrite = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Replace Backup", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      title: "Backup Already Exists",
      message: `${fileName} already exists.`,
      detail: "Do you want to replace the existing backup?",
    });

    if (overwrite.response !== 0) {
      return { canceled: true };
    }
  }

  createEncryptedBackup(db, backupPath);

  return { path: backupPath };
});

ipcMain.handle("backup:restore", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Restore Factory Book Backup",
    defaultPath: config.getBackupDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Book Backup", extensions: ["005"] }],
  });

  if (result.canceled || !result.filePaths[0]) return { canceled: true };

  const backupPath = result.filePaths[0];
  const tempDbPath = `${backupPath}.restore.tmp.db`;

  try {
    const backupBuffer = fs.readFileSync(backupPath);
    const dbBuffer = decryptBackup(backupBuffer);
    fs.writeFileSync(tempDbPath, dbBuffer);

    if (!hasFactoryTables(tempDbPath)) {
      return { error: "The selected file is not a valid Factory Book backup." };
    }

    const info = getCompanyInfo(tempDbPath, false);
    if (!info) {
      return {
        error: "Unable to read the company information from this backup.",
      };
    }

    const companyDir = config.getCompanyDir();
    fs.mkdirSync(companyDir, { recursive: true });

    const target = path.join(
      companyDir,
      `${safeName(info.name)}.db`,
    );

    if (fs.existsSync(target)) {
      const overwrite = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["Replace Company", "Cancel"],
        defaultId: 1,
        cancelId: 1,
        title: "Company Already Exists",
        message: `${info.name} already exists in the Company Directory.`,
        detail: "Do you want to replace the existing company with this backup?",
      });

      if (overwrite.response !== 0) return { canceled: true };
    }

    if (database) {
      database.close();
      database = null;
    }

    fs.copyFileSync(tempDbPath, target);
    config.setDbPath(target);
    config.setDefaultCompany(target);

    return { restored: true, path: target, name: info.name };
  } catch (error) {
    console.error("Backup restore failed:", error);
    return {
      error: error?.message || "Unable to restore the selected backup.",
    };
  } finally {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch (_) {}
    }
  }
});

ipcMain.handle("dbLocation:get", () => {
  const dbPath = config.getDbPath();
  return {
    dbPath: dbPath && fs.existsSync(dbPath) ? dbPath : null,
    defaultDir: config.getCompanyDir(),
    databaseMissing: Boolean(dbPath && !fs.existsSync(dbPath)),
  };
});

// Legacy APIs retained for existing Factory Profile UI.
ipcMain.handle("dbLocation:createNew", async (event, { folder, fileName } = {}) => {
  let targetDir = folder;
  if (targetDir === "pick") {
    const picked = await dialog.showOpenDialog(mainWindow, {
      title: "Choose a folder for the new company",
      defaultPath: config.getCompanyDir(),
      properties: ["openDirectory", "createDirectory"],
    });
    if (picked.canceled || !picked.filePaths[0]) return { canceled: true };
    targetDir = picked.filePaths[0];
  }
  targetDir = targetDir || config.getCompanyDir();
  const cleanName = safeName(fileName);
  const newPath = path.join(targetDir, `${cleanName}.db`);
  if (fs.existsSync(newPath)) return { error: `A company database already exists at ${newPath}.` };
  openDatabaseAt(newPath);
  config.setCompanyDir(targetDir);
  config.setDefaultCompany(newPath);
  return { path: newPath };
});

ipcMain.handle("dbLocation:selectExisting", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select an existing Factory Book company",
    defaultPath: config.getCompanyDir(),
    properties: ["openFile"],
    filters: [{ name: "Factory Book Company", extensions: ["db"] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const selectedPath = result.filePaths[0];
  if (!ensureFactoryMetadata(selectedPath)) {
    return { error: "The selected file is not a valid Factory Book company database." };
  }
  config.setCompanyDir(path.dirname(selectedPath));
  config.setDbPath(selectedPath);
  relaunch();
  return { switched: true, path: selectedPath };
});
ipcMain.handle("company:close", () => {
  if (database) {
    database.close();
    database = null;
  }

  return { closed: true };
});
ipcMain.handle("dbLocation:move", async () => {
  const current = config.getDbPath();
  if (!current || !fs.existsSync(current) || !validateFactoryDatabase(current)) {
    return { error: "The current company database could not be found." };
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose a new Company Directory",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const targetDir = result.filePaths[0];
  const newPath = path.join(targetDir, path.basename(current));
  if (fs.existsSync(newPath)) return { error: `A database already exists at ${newPath}.` };
  if (database) database.close();
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(current, newPath);
  fs.unlinkSync(current);
  config.setCompanyDir(targetDir);
  config.setDbPath(newPath);
  if (config.getDefaultCompany() === current) config.setDefaultCompany(newPath);
  relaunch();
  return { moved: true, path: newPath };
});

ipcMain.handle("dbLocation:setDefaultBackupDir", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose Backup Folder",
    defaultPath: config.getBackupDir(),
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  config.setBackupDir(result.filePaths[0]);
  return { path: result.filePaths[0] };
});

ipcMain.handle("dbLocation:setDefaultRestoreDir", async () => {
  // Kept as a compatibility alias. Restore now uses the Backup Folder.
  return { path: config.getBackupDir(), compatibilityAlias: true };
});

ipcMain.handle("dbLocation:getFolders", () => {
  const dbPath = config.getDbPath();
  return {
    dbPath: dbPath && fs.existsSync(dbPath) ? dbPath : null,
    dbDir: dbPath && fs.existsSync(dbPath) ? path.dirname(dbPath) : null,
    companyDir: config.getCompanyDir(),
    defaultCompany: config.getDefaultCompany(),
    autoOpenDefaultCompany: config.getAutoOpenDefaultCompany(),
    backupDir: config.getBackupDir(),
    restoreDir: config.getBackupDir(),
  };
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