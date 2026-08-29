const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { createSettingsModule } = require("./database_modules/settings");
const { createStockGroupsUnitsModule } = require("./database_modules/stockGroupsUnits");
const { createStockItemsModule } = require("./database_modules/stockItems");
const { createWeeklyReportsModule } = require("./database_modules/weeklyReports");
const { createDailyReportsModule } = require("./database_modules/dailyReports");
const { createClipboardModule } = require("./database_modules/clipboard");
const { createStockAdjustmentsModule } = require("./database_modules/stockAdjustments");
const { createBomModule } = require("./database_modules/bom");
const { createRegistersModule } = require("./database_modules/registers");

// createDatabase opens (or creates) a sqlite file at dbPath and returns a
// bound set of functions for that connection. This lets the app switch
// between different factory/company databases at runtime instead of being
// wired to a single hardcoded file.
//
// Schema creation and query functions live in the per-domain modules under
// ./db (settings, stock items, BOMs, reports, ...); this file just opens the
// connection, initializes each module against it, and merges their public
// functions into the single object the rest of the app calls.
function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  console.log("Database Path:", dbPath);

  db.pragma("journal_mode = WAL");

  // =======================
  // Factory Book database identity
  // =======================

  // This table identifies databases created/managed by this application.
  // It lets Factory Gateway ignore arbitrary .db files in the company folder.
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        database_type TEXT NOT NULL,
        database_version INTEGER NOT NULL DEFAULT 1,
        database_id TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(
    `
    INSERT OR IGNORE INTO app_metadata
      (id, database_type, database_version, database_id)
    VALUES (1, 'factory_book', 1, ?)
  `,
  ).run(crypto.randomUUID());

  function backupTo(destination) {
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, destination);
    return true;
  }

  function close() {
    db.close();
  }

  const settings = createSettingsModule(db);
  const stockGroupsUnits = createStockGroupsUnitsModule(db);
  const stockItems = createStockItemsModule(db);
  const weeklyReports = createWeeklyReportsModule(db);
  const dailyReports = createDailyReportsModule(db, {
    verifyMasterPassword: settings.verifyMasterPassword,
  });
  const clipboard = createClipboardModule(db);
  const stockAdjustments = createStockAdjustmentsModule(db);
  const bom = createBomModule(db);
  const registers = createRegistersModule(db);

  return {
    ...settings,
    ...stockGroupsUnits,
    ...stockItems,
    ...weeklyReports,
    ...dailyReports,
    ...clipboard,
    ...stockAdjustments,
    ...bom,
    ...registers,
    backupTo,
    close,
  };
}

module.exports = { createDatabase };
