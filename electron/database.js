const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_GROUPS = ["Raw Material", "Finished Goods", "Packaging Material"];
const DEFAULT_UNITS = [
  "Kgs", "Tin", "Pcs", "Bag", "Ctn", "Ltr",
];

// createDatabase opens (or creates) a sqlite file at dbPath and returns a
// bound set of functions for that connection. This lets the app switch
// between different factory/company databases at runtime instead of being
// wired to a single hardcoded file.
function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  console.log("Database Path:", dbPath);

  db.pragma("journal_mode = WAL");

  // =======================
  // Create Tables
  // =======================

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        factory_name TEXT NOT NULL,
        factory_logo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);
  try {
    db.exec("ALTER TABLE settings ADD COLUMN master_password_hash TEXT");
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        item_name TEXT NOT NULL,
        stock_group TEXT NOT NULL,

        unit TEXT NOT NULL,
        alternate_unit TEXT,
        conversion REAL DEFAULT 0,

        opening_qty REAL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);
  try {
    db.exec("ALTER TABLE stock_items ADD COLUMN low_qty_alert REAL DEFAULT 0");
  } catch (_) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

  // One report per calendar date, enforced at the DB layer so concurrent
  // requests can't both slip past the application-level check below.
  // Created as a unique index (not a table constraint) so it can be added
  // to databases that already have the daily_reports table. If existing
  // data already has duplicate report_date rows, this will throw at
  // startup -- see note below.
  try {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date)",
    );
  } catch (err) {
    console.error(
      "Could not enforce one-report-per-date: duplicate report_date rows already exist. " +
        "Resolve duplicates in daily_reports before this constraint can be applied.",
      err.message,
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        daily_report_id INTEGER NOT NULL,
        purchase_no TEXT NOT NULL,
        FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_entry_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (purchase_entry_id) REFERENCES purchase_entries(id),
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS gatepass_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        daily_report_id INTEGER NOT NULL,
        gatepass_no TEXT NOT NULL,
        FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS gatepass_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gatepass_entry_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (gatepass_entry_id) REFERENCES gatepass_entries(id),
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        daily_report_id INTEGER NOT NULL,
        FOREIGN KEY (daily_report_id) REFERENCES daily_reports(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_consumption (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturing_entry_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (manufacturing_entry_id) REFERENCES manufacturing_entries(id),
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
    );
    `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS manufacturing_production (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manufacturing_entry_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (manufacturing_entry_id) REFERENCES manufacturing_entries(id),
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
    );
    `);

  // Seed default groups/units once, on first run of a fresh database.
  const seedLookup = (table, values) => {
    const count = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
    if (count > 0) return;
    const insert = db.prepare(`INSERT INTO ${table} (name) VALUES (?)`);
    const tx = db.transaction(() => values.forEach((v) => insert.run(v)));
    tx();
  };
  seedLookup("stock_groups", DEFAULT_GROUPS);
  seedLookup("stock_units", DEFAULT_UNITS);

  // =======================
  // Settings Functions
  // =======================

  function getSettings() {
    return db.prepare("SELECT * FROM settings LIMIT 1").get();
  }

  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
  }

  function verifyMasterPassword(password) {
    const settings = getSettings();
    if (!settings?.master_password_hash) return false;
    const [salt, key] = settings.master_password_hash.split(":");
    const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(key, "hex"),
      Buffer.from(candidate, "hex"),
    );
  }

  function saveSettings(factoryName, factoryLogo, masterPassword) {
    const existing = getSettings();

    if (existing) {
      db.prepare(
        `
                UPDATE settings
                SET factory_name = ?, factory_logo = ?, master_password_hash = COALESCE(?, master_password_hash)
                WHERE id = ?
            `,
      ).run(
        factoryName,
        factoryLogo,
        masterPassword ? hashPassword(masterPassword) : null,
        existing.id,
      );
    } else {
      db.prepare(
        `
                INSERT INTO settings
                (factory_name, factory_logo, master_password_hash)
                VALUES (?, ?, ?)
            `,
      ).run(factoryName, factoryLogo, hashPassword(masterPassword));
    }

    return true;
  }

  function updateFactoryProfile(factoryName, factoryLogo, password) {
    const existing = getSettings();

    if (!existing) {
      throw new Error("Factory settings not found.");
    }

    db.prepare(
      `
            UPDATE settings
            SET
                factory_name = ?,
                factory_logo = ?,
                master_password_hash =
                    CASE
                        WHEN ? IS NOT NULL
                        THEN ?
                        ELSE master_password_hash
                    END
            WHERE id = ?
        `,
    ).run(
      factoryName,
      factoryLogo,
      password,
      password ? hashPassword(password) : null,
      existing.id,
    );

    return true;
  }

  // =======================
  // Stock Groups / Units (lookup lists)
  // =======================

  function getStockGroups() {
    return db
      .prepare("SELECT * FROM stock_groups WHERE is_active = 1 ORDER BY name")
      .all();
  }

  function addStockGroup(name) {
    db.prepare("INSERT INTO stock_groups (name) VALUES (?)").run(name.trim());
    return true;
  }

  function renameStockGroup(id, name) {
    db.prepare("UPDATE stock_groups SET name = ? WHERE id = ?").run(
      name.trim(),
      id,
    );
    return true;
  }

  function deactivateStockGroup(id) {
    db.prepare("UPDATE stock_groups SET is_active = 0 WHERE id = ?").run(id);
    return true;
  }

  function getStockUnits() {
    return db
      .prepare("SELECT * FROM stock_units WHERE is_active = 1 ORDER BY name")
      .all();
  }

  function addStockUnit(name) {
    db.prepare("INSERT INTO stock_units (name) VALUES (?)").run(name.trim());
    return true;
  }

  function renameStockUnit(id, name) {
    db.prepare("UPDATE stock_units SET name = ? WHERE id = ?").run(
      name.trim(),
      id,
    );
    return true;
  }

  function deactivateStockUnit(id) {
    db.prepare("UPDATE stock_units SET is_active = 0 WHERE id = ?").run(id);
    return true;
  }

  // =======================
  // Stock Items
  // =======================

  function bulkUpdateStockItems(items) {
    const update = db.prepare(
      "UPDATE stock_items SET item_name = ?, stock_group = ?, unit = ?, alternate_unit = ?, conversion = ?, opening_qty = ? WHERE id = ?",
    );
    const transaction = db.transaction(() =>
      items.forEach((item) =>
        update.run(
          item.item_name,
          item.stock_group,
          item.unit,
          item.alternate_unit,
          Number(item.conversion) || 0,
          Number(item.opening_qty) || 0,
          item.id,
        ),
      ),
    );
    transaction();
    return true;
  }

  function bulkCreateStockItems(items) {
    const insert = db.prepare(
      `INSERT INTO stock_items
        (item_name, stock_group, unit, alternate_unit, conversion, opening_qty, low_qty_alert, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    const transaction = db.transaction(() =>
      items
        .filter((item) => (item.item_name || "").trim() !== "")
        .forEach((item) =>
          insert.run(
            item.item_name,
            item.stock_group,
            item.unit,
            item.alternate_unit,
            Number(item.conversion) || 0,
            Number(item.opening_qty) || 0,
            Number(item.low_qty_alert) || 0,
          ),
        ),
    );
    transaction();
    return true;
  }

  function backupTo(destination) {
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(dbPath, destination);
    return true;
  }

  function close() {
    db.close();
  }

  function getStockItems() {
    return db
      .prepare(
        `
            SELECT *
            FROM stock_items
            WHERE is_active = 1
            ORDER BY item_name
        `,
      )
      .all();
  }

  function saveStockItem(item) {
    db.prepare(
      `
            INSERT INTO stock_items
            (
                item_name,
                stock_group,
                unit,
                alternate_unit,
                conversion,
                opening_qty,
                low_qty_alert,
                is_active
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
    ).run(
      item.item_name,
      item.stock_group,
      item.unit,
      item.alternate_unit,
      item.conversion,
      item.opening_qty,
      Number(item.low_qty_alert) || 0,
      1,
    );

    return true;
  }

  function updateStockItem(item) {
    db.prepare(
      `
            UPDATE stock_items
            SET
                item_name = ?,
                stock_group = ?,
                unit = ?,
                alternate_unit = ?,
                conversion = ?,
                opening_qty = ?,
                low_qty_alert = ?
            WHERE id = ?
        `,
    ).run(
      item.item_name,
      item.stock_group,
      item.unit,
      item.alternate_unit,
      item.conversion,
      item.opening_qty,
      Number(item.low_qty_alert) || 0,
      item.id,
    );

    return true;
  }

  // Low stock alert qty is intentionally editable on its own, without the
  // master password, since it's an operational threshold rather than a
  // master-data change.
  function updateLowQtyAlert(id, lowQtyAlert) {
    db.prepare("UPDATE stock_items SET low_qty_alert = ? WHERE id = ?").run(
      Number(lowQtyAlert) || 0,
      id,
    );
    return true;
  }

  function inactivateStockItem(id) {
    db.prepare(
      `
            UPDATE stock_items
            SET is_active = 0
            WHERE id = ?
        `,
    ).run(id);

    return true;
  }

  function getDailyReports() {
    return db
      .prepare(
        `
            SELECT
                dr.id,
                dr.report_date,
                (SELECT COUNT(*) FROM purchase_entries pe WHERE pe.daily_report_id = dr.id) AS purchase_count,
                (SELECT COUNT(*) FROM gatepass_entries gp WHERE gp.daily_report_id = dr.id) AS gatepass_count,
                (SELECT COUNT(*) FROM manufacturing_entries me WHERE me.daily_report_id = dr.id) AS manufacturing_count
            FROM daily_reports dr
            ORDER BY dr.report_date DESC, dr.id DESC
        `,
      )
      .all();
  }

  // Used by the frontend to check-before-submit (e.g. disable/redirect
  // instead of waiting for a save to fail) and by saveDailyReport's guard
  // below.
  function getDailyReportByDate(date) {
    return db
      .prepare("SELECT id, report_date FROM daily_reports WHERE report_date = ?")
      .get(date);
  }

  function getDailyReportById(id) {
    const report = db
      .prepare("SELECT id, report_date FROM daily_reports WHERE id = ?")
      .get(id);
    if (!report) return null;

    const purchases = db
      .prepare("SELECT * FROM purchase_entries WHERE daily_report_id = ?")
      .all(id);

    report.purchases = purchases.map((purchase) => {
      const items = db
        .prepare("SELECT * FROM purchase_items WHERE purchase_entry_id = ?")
        .all(purchase.id);

      return {
        purchaseNo: purchase.purchase_no,
        items: items.map((item) => ({
          item: item.stock_item_id,
          qty: item.qty,
          unit: item.unit,
        })),
      };
    });

    report.gatePasses = db
      .prepare("SELECT * FROM gatepass_entries WHERE daily_report_id = ?")
      .all(id);

    report.gatePasses.forEach((gatePass) => {
      gatePass.items = db
        .prepare(
          `
                SELECT gi.*, si.item_name
                FROM gatepass_items gi
                LEFT JOIN stock_items si ON si.id = gi.stock_item_id
                WHERE gatepass_entry_id = ?
            `,
        )
        .all(gatePass.id);
    });

    report.manufactured = db
      .prepare("SELECT * FROM manufacturing_entries WHERE daily_report_id = ?")
      .all(id);

    report.manufactured.forEach((manufacturing) => {
      manufacturing.consumption = db
        .prepare(
          `
                SELECT mc.*, si.item_name
                FROM manufacturing_consumption mc
                LEFT JOIN stock_items si ON si.id = mc.stock_item_id
                WHERE manufacturing_entry_id = ?
            `,
        )
        .all(manufacturing.id);

      manufacturing.production = db
        .prepare(
          `
                SELECT mp.*, si.item_name
                FROM manufacturing_production mp
                LEFT JOIN stock_items si ON si.id = mp.stock_item_id
                WHERE manufacturing_entry_id = ?
            `,
        )
        .all(manufacturing.id);
    });

    const mapItem = (item) => ({
      item: String(item.stock_item_id),
      qty: String(item.qty),
      unit: item.unit,
    });

    return {
      id: report.id,
      date: report.report_date,
      purchases: report.purchases,
      gatePasses: report.gatePasses.map((entry) => ({
        gatePassNo: entry.gatepass_no,
        items: entry.items.map(mapItem),
      })),
      manufactured: report.manufactured.map((entry) => ({
        consumption: entry.consumption.map(mapItem),
        production: entry.production.map(mapItem),
      })),
    };
  }

  // Inserts a new daily report. Throws if a report already exists for
  // report.report_date -- one report per calendar date, no exceptions.
  // The UNIQUE index on daily_reports(report_date) is the real backstop
  // against races; this check exists to give the caller a clean,
  // human-readable error instead of a raw SQLITE_CONSTRAINT failure.
  function saveDailyReport(report) {
    const existing = getDailyReportByDate(report.report_date);
    if (existing) {
      throw new Error(
        `A daily report for ${report.report_date} already exists.`,
      );
    }

    const transaction = db.transaction(() => {
      const dailyReport = db
        .prepare("INSERT INTO daily_reports (report_date) VALUES (?)")
        .run(report.report_date);

      const dailyReportId = dailyReport.lastInsertRowid;

      report.purchases.forEach((purchase) => {
        const purchaseEntry = db
          .prepare(
            "INSERT INTO purchase_entries (daily_report_id, purchase_no) VALUES (?, ?)",
          )
          .run(dailyReportId, purchase.purchaseNo);

        const purchaseEntryId = purchaseEntry.lastInsertRowid;

        purchase.items.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO purchase_items (purchase_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(purchaseEntryId, Number(item.item), Number(item.qty), item.unit);
        });
      });

      report.gatePasses.forEach((gatePass) => {
        const gatePassEntry = db
          .prepare(
            "INSERT INTO gatepass_entries (daily_report_id, gatepass_no) VALUES (?, ?)",
          )
          .run(dailyReportId, gatePass.gatePassNo);

        const gatePassEntryId = gatePassEntry.lastInsertRowid;

        gatePass.items.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO gatepass_items (gatepass_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(gatePassEntryId, Number(item.item), Number(item.qty), item.unit);
        });
      });

      report.manufactured.forEach((manufacturing) => {
        const manufacturingEntry = db
          .prepare("INSERT INTO manufacturing_entries (daily_report_id) VALUES (?)")
          .run(dailyReportId);

        const manufacturingEntryId = manufacturingEntry.lastInsertRowid;

        manufacturing.consumption.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO manufacturing_consumption (manufacturing_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(manufacturingEntryId, Number(item.item), Number(item.qty), item.unit);
        });

        manufacturing.production.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO manufacturing_production (manufacturing_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(manufacturingEntryId, Number(item.item), Number(item.qty), item.unit);
        });
      });
    });

    transaction();
    return true;
  }

  function deleteDailyReport(id) {
    const remove = db.transaction(() => {
      const purchaseIds = db
        .prepare("SELECT id FROM purchase_entries WHERE daily_report_id = ?")
        .all(id)
        .map((row) => row.id);
      const gatePassIds = db
        .prepare("SELECT id FROM gatepass_entries WHERE daily_report_id = ?")
        .all(id)
        .map((row) => row.id);
      const manufacturingIds = db
        .prepare("SELECT id FROM manufacturing_entries WHERE daily_report_id = ?")
        .all(id)
        .map((row) => row.id);
      const deleteChildren = (table, column, ids) =>
        ids.forEach((entryId) =>
          db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(entryId),
        );
      deleteChildren("purchase_items", "purchase_entry_id", purchaseIds);
      deleteChildren("gatepass_items", "gatepass_entry_id", gatePassIds);
      deleteChildren("manufacturing_consumption", "manufacturing_entry_id", manufacturingIds);
      deleteChildren("manufacturing_production", "manufacturing_entry_id", manufacturingIds);
      db.prepare("DELETE FROM purchase_entries WHERE daily_report_id = ?").run(id);
      db.prepare("DELETE FROM gatepass_entries WHERE daily_report_id = ?").run(id);
      db.prepare("DELETE FROM manufacturing_entries WHERE daily_report_id = ?").run(id);
      db.prepare("DELETE FROM daily_reports WHERE id = ?").run(id);
    });
    remove();
    return true;
  }

  // Replaces an existing daily report's contents (and possibly its date)
  // in a single transaction. If report.report_date has been changed to a
  // date that belongs to a *different* existing report, this rolls back
  // and throws instead of silently creating a duplicate.
  function updateDailyReport(id, report) {
    const replace = db.transaction(() => {
      const collision = getDailyReportByDate(report.report_date);
      if (collision && collision.id !== id) {
        throw new Error(
          `A daily report for ${report.report_date} already exists.`,
        );
      }

      deleteDailyReport(id);
      saveDailyReport(report);
    });
    replace();
    return true;
  }

  function getStockReport() {
    return db
      .prepare(
        `
            SELECT si.id, si.item_name, si.stock_group, si.unit, si.alternate_unit, si.conversion,
              si.opening_qty, si.low_qty_alert,
              COALESCE((SELECT SUM(qty) FROM purchase_items WHERE stock_item_id = si.id), 0) AS purchased_qty,
              COALESCE((SELECT SUM(qty) FROM gatepass_items WHERE stock_item_id = si.id), 0) AS dispatched_qty,
              COALESCE((SELECT SUM(qty) FROM manufacturing_consumption WHERE stock_item_id = si.id), 0) AS consumed_qty,
              COALESCE((SELECT SUM(qty) FROM manufacturing_production WHERE stock_item_id = si.id), 0) AS produced_qty
            FROM stock_items si WHERE si.is_active = 1 ORDER BY si.stock_group, si.item_name
        `,
      )
      .all()
      .map((row) => ({
        ...row,
        balance_qty:
          Number(row.opening_qty) +
          Number(row.purchased_qty) +
          Number(row.produced_qty) -
          Number(row.dispatched_qty) -
          Number(row.consumed_qty),
      }));
  }

  return {
    getSettings,
    saveSettings,
    verifyMasterPassword,
    updateFactoryProfile,

    getStockGroups,
    addStockGroup,
    renameStockGroup,
    deactivateStockGroup,
    getStockUnits,
    addStockUnit,
    renameStockUnit,
    deactivateStockUnit,

    getStockItems,
    saveStockItem,
    updateStockItem,
    updateLowQtyAlert,
    inactivateStockItem,

    getDailyReports,
    saveDailyReport,
    getDailyReportById,
    getDailyReportByDate,
    updateDailyReport,
    deleteDailyReport,
    getStockReport,
    bulkUpdateStockItems,
    bulkCreateStockItems,
    backupTo,
    close,
  };
}

module.exports = { createDatabase };