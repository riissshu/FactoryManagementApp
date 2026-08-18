const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DEFAULT_GROUPS = ["Raw Material", "Finished Goods", "Packaging Material"];
const DEFAULT_UNITS = ["Kgs", "Tin", "Pcs", "Bag", "Ctn", "Ltr", "Bkt", "Box"];

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

  db.prepare(`
    INSERT OR IGNORE INTO app_metadata
      (id, database_type, database_version, database_id)
    VALUES (1, 'factory_book', 1, ?)
  `).run(crypto.randomUUID());


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

  try {
    db.exec(
      "ALTER TABLE settings ADD COLUMN open_pdf_after_export INTEGER NOT NULL DEFAULT 1",
    );
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

  // Stock item names must be unique, ignoring case and surrounding spaces.
  // Example: "Cement", "cement", and " Cement " are considered duplicates.
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_unique_name
      ON stock_items (LOWER(TRIM(item_name)))
    `);
  } catch (err) {
    console.error(
      "Could not enforce unique stock item names. " +
        "Existing duplicate stock item names must be resolved first.",
      err.message,
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_date TEXT NOT NULL,
        is_exported INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    `);

  try {
    db.exec(
      "ALTER TABLE daily_reports ADD COLUMN is_exported INTEGER NOT NULL DEFAULT 0",
    );
  } catch (_) {}

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        adjustment_date TEXT NOT NULL,
        adjustment_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustment_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stock_adjustment_id INTEGER NOT NULL,
        stock_item_id INTEGER NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        remarks TEXT,
        FOREIGN KEY (stock_adjustment_id) REFERENCES stock_adjustments(id),
        FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
    );
  `);

  // Add item-level adjustment type and reason to existing databases.
  try {
    db.exec(`
      ALTER TABLE stock_adjustment_items
      ADD COLUMN adjustment_type TEXT
    `);
  } catch (error) {
    // Column already exists.
  }

  try {
    db.exec(`
      ALTER TABLE stock_adjustment_items
      ADD COLUMN reason TEXT
    `);
  } catch (error) {
    // Column already exists.
  }

  // Preserve adjustment data created with the previous structure.
  db.exec(`
    UPDATE stock_adjustment_items
    SET
      adjustment_type = (
        SELECT adjustment_type
        FROM stock_adjustments
        WHERE stock_adjustments.id = stock_adjustment_items.stock_adjustment_id
      ),
      reason = (
        SELECT reason
        FROM stock_adjustments
        WHERE stock_adjustments.id = stock_adjustment_items.stock_adjustment_id
      )
    WHERE adjustment_type IS NULL
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

  function saveSettings(
    factoryName,
    factoryLogo,
    masterPassword,
    openPdfAfterExport = true,
  ) {
    const existing = getSettings();

    if (existing) {
      db.prepare(
        `
                UPDATE settings
                SET factory_name = ?, factory_logo = ?,  open_pdf_after_export = ?, master_password_hash = COALESCE(?, master_password_hash)
                WHERE id = ?
            `,
      ).run(
        factoryName,
        factoryLogo,
        openPdfAfterExport ? 1 : 0,
        masterPassword ? hashPassword(masterPassword) : null,
        existing.id,
      );
    } else {
      db.prepare(
        `
                INSERT INTO settings
                (factory_name, factory_logo, master_password_hash,  open_pdf_after_export)
                VALUES (?, ?, ?, ?)
            `,
      ).run(
        factoryName,
        factoryLogo,
        hashPassword(masterPassword),
        openPdfAfterExport ? 1 : 0,
      );
    }

    return true;
  }

  function updateFactoryProfile(
    factoryName,
    factoryLogo,
    password,
    openPdfAfterExport,
  ) {
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
                   open_pdf_after_export = ?,
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
      openPdfAfterExport ? 1 : 0,
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
    if (hasStockGroupTransactions(id)) {
      throw new Error(
        "This stock group is used in a transaction and cannot be modified.",
      );
    }

    db.prepare("UPDATE stock_groups SET name = ? WHERE id = ?").run(
      name.trim(),
      id,
    );
    return true;
  }

  function hasStockGroupTransactions(id) {
    const group = db
      .prepare(
        `
        SELECT name
        FROM stock_groups
        WHERE id = ?
      `,
      )
      .get(id);

    if (!group) {
      return false;
    }

    const result = db
      .prepare(
        `
        SELECT 1
        FROM stock_items si
        WHERE si.stock_group = ?
        AND (
          EXISTS (
            SELECT 1
            FROM purchase_items pi
            WHERE pi.stock_item_id = si.id
          )

          OR EXISTS (
            SELECT 1
            FROM gatepass_items gi
            WHERE gi.stock_item_id = si.id
          )

          OR EXISTS (
            SELECT 1
            FROM manufacturing_consumption mc
            WHERE mc.stock_item_id = si.id
          )

          OR EXISTS (
            SELECT 1
            FROM manufacturing_production mp
            WHERE mp.stock_item_id = si.id
          )
        )
        LIMIT 1
      `,
      )
      .get(group.name);

    return Boolean(result);
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

  function hasStockUnitTransactions(id) {
    const unit = db
      .prepare(
        `
        SELECT name
        FROM stock_units
        WHERE id = ?
      `,
      )
      .get(id);

    if (!unit) {
      return false;
    }

    const result = db
      .prepare(
        `
        SELECT 1
        FROM stock_items si
        WHERE
          (si.unit = ? OR si.alternate_unit = ?)
          AND (
            EXISTS (
              SELECT 1
              FROM purchase_items pi
              WHERE pi.stock_item_id = si.id
            )

            OR EXISTS (
              SELECT 1
              FROM gatepass_items gi
              WHERE gi.stock_item_id = si.id
            )

            OR EXISTS (
              SELECT 1
              FROM manufacturing_consumption mc
              WHERE mc.stock_item_id = si.id
            )

            OR EXISTS (
              SELECT 1
              FROM manufacturing_production mp
              WHERE mp.stock_item_id = si.id
            )
          )
        LIMIT 1
      `,
      )
      .get(unit.name, unit.name);

    return Boolean(result);
  }

  function renameStockUnit(id, name) {
    if (hasStockUnitTransactions(id)) {
      throw new Error(
        "This stock unit is used in a transaction and cannot be modified.",
      );
    }

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

  function checkDuplicateStockItemName(itemName, excludeId = null) {
    const name = String(itemName || "").trim();

    if (!name) {
      throw new Error("Stock item name is required.");
    }

    const existing = excludeId
      ? db
          .prepare(
            `
            SELECT id, item_name
            FROM stock_items
            WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(?))
              AND id != ?
            LIMIT 1
          `,
          )
          .get(name, excludeId)
      : db
          .prepare(
            `
            SELECT id, item_name
            FROM stock_items
            WHERE LOWER(TRIM(item_name)) = LOWER(TRIM(?))
            LIMIT 1
          `,
          )
          .get(name);

    if (existing) {
      throw new Error(
        `Stock item "${existing.item_name}" already exists. Please use a different name.`,
      );
    }

    return false;
  }

  function bulkUpdateStockItems(items) {
    const update = db.prepare(
      `
      UPDATE stock_items
      SET
        item_name = ?,
        stock_group = ?,
        unit = ?,
        alternate_unit = ?,
        conversion = ?,
        opening_qty = ?
      WHERE id = ?
    `,
    );

    const transaction = db.transaction(() => {
      const namesInUpdate = new Map();

      items.forEach((item) => {
        const itemName = String(item.item_name || "").trim();

        if (!itemName) {
          throw new Error("Stock item name cannot be empty.");
        }

        // Existing transaction protection
        if (hasStockItemTransactions(item.id)) {
          throw new Error(
            `Stock item "${item.item_name}" has transactions and cannot be modified.`,
          );
        }

        const normalizedName = itemName.toLowerCase();

        // Detect duplicate names among rows being updated
        if (
          namesInUpdate.has(normalizedName) &&
          namesInUpdate.get(normalizedName) !== item.id
        ) {
          throw new Error(
            `Duplicate stock item "${itemName}" found. Please use a different name.`,
          );
        }

        namesInUpdate.set(normalizedName, item.id);

        // Detect duplicate against existing database items.
        // Excludes the current item's own ID.
        checkDuplicateStockItemName(itemName, item.id);

        update.run(
          itemName,
          item.stock_group,
          item.unit,
          item.alternate_unit,
          Number(item.conversion) || 0,
          Number(item.opening_qty) || 0,
          item.id,
        );
      });
    });

    transaction();

    return true;
  }

  function bulkCreateStockItems(items) {
    const insert = db.prepare(
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
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `,
    );

    const transaction = db.transaction(() => {
      const namesInCreate = new Set();

      items
        .filter((item) => (item.item_name || "").trim() !== "")
        .forEach((item) => {
          const itemName = String(item.item_name).trim();
          const normalizedName = itemName.toLowerCase();

          // Duplicate inside the current MultiCreate operation
          if (namesInCreate.has(normalizedName)) {
            throw new Error(
              `Duplicate stock item "${itemName}" found. Please use a different name.`,
            );
          }

          namesInCreate.add(normalizedName);

          // Duplicate against existing stock items
          checkDuplicateStockItemName(itemName);

          insert.run(
            itemName,
            item.stock_group,
            item.unit,
            item.alternate_unit,
            Number(item.conversion) || 0,
            Number(item.opening_qty) || 0,
            Number(item.low_qty_alert) || 0,
          );
        });
    });

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
    const itemName = String(item.item_name || "").trim();

    checkDuplicateStockItemName(itemName);

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

  function getStockItemById(id) {
    return db
      .prepare(
        `
      SELECT *
      FROM stock_items
      WHERE id = ?
    `,
      )
      .get(id);
  }

  function hasStockItemTransactions(id) {
    const purchase = db
      .prepare(
        `
      SELECT 1
      FROM purchase_items
      WHERE stock_item_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (purchase) return true;

    const gatepass = db
      .prepare(
        `
      SELECT 1
      FROM gatepass_items
      WHERE stock_item_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (gatepass) return true;

    const consumption = db
      .prepare(
        `
      SELECT 1
      FROM manufacturing_consumption
      WHERE stock_item_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (consumption) return true;

    const production = db
      .prepare(
        `
      SELECT 1
      FROM manufacturing_production
      WHERE stock_item_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (production) return true;

    const adjustment = db
      .prepare(
        `
      SELECT 1
      FROM stock_adjustment_items
      WHERE stock_item_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (adjustment) return true;

    return false;
  }

  function updateStockItem(item) {
    const itemName = String(item.item_name || "").trim();

    checkDuplicateStockItemName(itemName, item.id);

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

  function deleteStockItem(id) {
    // Never physically delete an item that has been used
    // in any transaction.
    if (hasStockItemTransactions(id)) {
      throw new Error(
        "This stock item has transactions and cannot be deleted.",
      );
    }

    db.prepare(
      `
    DELETE FROM stock_items
    WHERE id = ?
  `,
    ).run(id);

    return true;
  }

  function saveStockAdjustment(adjustment) {
    if (!adjustment?.adjustment_date) {
      throw new Error("Adjustment date is required.");
    }

    const items = Array.isArray(adjustment.items) ? adjustment.items : [];

    const validItems = items.filter(
      (item) => item.stock_item_id && Number(item.qty) > 0,
    );

    if (validItems.length === 0) {
      throw new Error("At least one stock item is required.");
    }

    const seenItems = new Set();

    validItems.forEach((item) => {
      const itemId = Number(item.stock_item_id);

      if (!["add", "subtract"].includes(item.adjustment_type)) {
        throw new Error("Each stock item must have a valid adjustment type.");
      }

      if (seenItems.has(itemId)) {
        throw new Error("The same stock item cannot be added more than once.");
      }

      seenItems.add(itemId);
    });

    const transaction = db.transaction(() => {
      const getCurrentBalance = db.prepare(`
        SELECT
          si.id,
          si.item_name,
          si.unit,

          (
            CAST(si.opening_qty AS REAL)

            + COALESCE(
                (
                  SELECT SUM(qty)
                  FROM purchase_items
                  WHERE stock_item_id = si.id
                ),
                0
              )

            + COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_production
                  WHERE stock_item_id = si.id
                ),
                0
              )

            - COALESCE(
                (
                  SELECT SUM(qty)
                  FROM gatepass_items
                  WHERE stock_item_id = si.id
                ),
                0
              )

            - COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_consumption
                  WHERE stock_item_id = si.id
                ),
                0
              )

            + COALESCE(
                (
                  SELECT SUM(
                    CASE
                      WHEN sai.adjustment_type = 'add'
                        THEN sai.qty
                      ELSE -sai.qty
                    END
                  )
                  FROM stock_adjustment_items sai
                  WHERE sai.stock_item_id = si.id
                ),
                0
              )
          ) AS balance_qty

        FROM stock_items si

        WHERE si.id = ?
          AND si.is_active = 1
      `);

      const insertAdjustment = db.prepare(`
        INSERT INTO stock_adjustments
        (
          adjustment_date,
             adjustment_type,
    reason,
          remarks
        )
        VALUES (?, ?, ?, ?)
      `);

      const adjustmentResult = insertAdjustment.run(
        adjustment.adjustment_date,
        "mixed",
        "",
        adjustment.remarks || null,
      );

      const adjustmentId = adjustmentResult.lastInsertRowid;

      const insertItem = db.prepare(`
        INSERT INTO stock_adjustment_items
        (
          stock_adjustment_id,
          stock_item_id,
          adjustment_type,
          reason,
          qty,
          unit
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      validItems.forEach((item) => {
        const stockItemId = Number(item.stock_item_id);
        const qty = Number(item.qty);

        const stockItem = getCurrentBalance.get(stockItemId);

        if (!stockItem) {
          throw new Error("Stock item not found.");
        }

        if (
          item.adjustment_type === "subtract" &&
          qty > Number(stockItem.balance_qty)
        ) {
          throw new Error(
            `Cannot subtract ${qty} ${stockItem.unit} from ${stockItem.item_name}. ` +
              `Available balance is ${Number(stockItem.balance_qty)} ${stockItem.unit}.`,
          );
        }

        insertItem.run(
          adjustmentId,
          stockItemId,
          item.adjustment_type,
          item.reason?.trim() || null,
          qty,
          item.unit || stockItem.unit,
        );
      });
    });

    transaction();

    return true;
  }

  function getStockAdjustments() {
  return db
    .prepare(
      `
      SELECT
        sa.id AS adjustment_id,
        sa.adjustment_date,
        sa.remarks,

        sai.id AS item_id,
        sai.stock_item_id,
        si.item_name,
        sai.adjustment_type,
        sai.reason,
        sai.qty,
        sai.unit

      FROM stock_adjustments sa

      INNER JOIN stock_adjustment_items sai
        ON sai.stock_adjustment_id = sa.id

      INNER JOIN stock_items si
        ON si.id = sai.stock_item_id

      ORDER BY
        sa.adjustment_date DESC,
        sa.id DESC,
        sai.id ASC
      `,
    )
    .all();
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
      .prepare(
        "SELECT id, report_date FROM daily_reports WHERE report_date = ?",
      )
      .get(date);
  }

  function getDailyReportById(id) {
    const report = db
      .prepare(
        "SELECT id, report_date, is_exported FROM daily_reports WHERE id = ?",
      )
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
      is_exported: Boolean(report.is_exported),
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
          ).run(
            purchaseEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
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
          ).run(
            gatePassEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });
      });

      report.manufactured.forEach((manufacturing) => {
        const manufacturingEntry = db
          .prepare(
            "INSERT INTO manufacturing_entries (daily_report_id) VALUES (?)",
          )
          .run(dailyReportId);

        const manufacturingEntryId = manufacturingEntry.lastInsertRowid;

        manufacturing.consumption.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO manufacturing_consumption (manufacturing_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(
            manufacturingEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });

        manufacturing.production.forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            "INSERT INTO manufacturing_production (manufacturing_entry_id, stock_item_id, qty, unit) VALUES (?, ?, ?, ?)",
          ).run(
            manufacturingEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });
      });
    });

    transaction();
    return true;
  }

  function markDailyReportExported(id) {
    const result = db
      .prepare(
        `
        UPDATE daily_reports
        SET is_exported = 1
        WHERE id = ?
      `,
      )
      .run(id);

    if (result.changes === 0) {
      throw new Error("Daily report not found.");
    }

    return true;
  }

  function deleteDailyReport(id, masterPassword = null) {
    const report = db
      .prepare(
        `
        SELECT is_exported
        FROM daily_reports
        WHERE id = ?
      `,
      )
      .get(id);

    if (!report) {
      throw new Error("Daily report not found.");
    }

    // Exported reports require master password
    if (report.is_exported) {
      if (!masterPassword || !verifyMasterPassword(masterPassword)) {
        throw new Error(
          "Unable to delete after daily report exported. You can delete it with Master Password.",
        );
      }
    }

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
        .prepare(
          "SELECT id FROM manufacturing_entries WHERE daily_report_id = ?",
        )
        .all(id)
        .map((row) => row.id);

      const deleteChildren = (table, column, ids) =>
        ids.forEach((entryId) =>
          db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(entryId),
        );

      deleteChildren("purchase_items", "purchase_entry_id", purchaseIds);

      deleteChildren("gatepass_items", "gatepass_entry_id", gatePassIds);

      deleteChildren(
        "manufacturing_consumption",
        "manufacturing_entry_id",
        manufacturingIds,
      );

      deleteChildren(
        "manufacturing_production",
        "manufacturing_entry_id",
        manufacturingIds,
      );

      db.prepare("DELETE FROM purchase_entries WHERE daily_report_id = ?").run(
        id,
      );

      db.prepare("DELETE FROM gatepass_entries WHERE daily_report_id = ?").run(
        id,
      );

      db.prepare(
        "DELETE FROM manufacturing_entries WHERE daily_report_id = ?",
      ).run(id);

      db.prepare("DELETE FROM daily_reports WHERE id = ?").run(id);
    });

    remove();

    return true;
  }

  // Replaces an existing daily report's contents (and possibly its date)
  // in a single transaction. If report.report_date has been changed to a
  // date that belongs to a *different* existing report, this rolls back
  // and throws instead of silently creating a duplicate.
  function updateDailyReport(id, report, masterPassword = null) {
    const existing = db
      .prepare(
        `
        SELECT
          id,
          is_exported
        FROM daily_reports
        WHERE id = ?
      `,
      )
      .get(id);

    if (!existing) {
      throw new Error("Daily report not found.");
    }

    // Exported reports require master password
    if (existing.is_exported) {
      if (!masterPassword || !verifyMasterPassword(masterPassword)) {
        throw new Error(
          "Unable to edit after daily report exported. You can edit it with Master Password.",
        );
      }
    }

    const collision = getDailyReportByDate(report.report_date);

    if (collision && collision.id !== id) {
      throw new Error(
        `A daily report for ${report.report_date} already exists.`,
      );
    }

    const replace = db.transaction(() => {
      // Update date only.
      // Keep is_exported unchanged.
      db.prepare(
        `
        UPDATE daily_reports
        SET report_date = ?
        WHERE id = ?
      `,
      ).run(report.report_date, id);

      // --------------------------------
      // Purchase entries
      // --------------------------------

      const purchaseIds = db
        .prepare(
          `
          SELECT id
          FROM purchase_entries
          WHERE daily_report_id = ?
        `,
        )
        .all(id)
        .map((row) => row.id);

      purchaseIds.forEach((purchaseId) => {
        db.prepare(
          `
          DELETE FROM purchase_items
          WHERE purchase_entry_id = ?
        `,
        ).run(purchaseId);
      });

      db.prepare(
        `
        DELETE FROM purchase_entries
        WHERE daily_report_id = ?
      `,
      ).run(id);

      // --------------------------------
      // Gate pass entries
      // --------------------------------

      const gatePassIds = db
        .prepare(
          `
          SELECT id
          FROM gatepass_entries
          WHERE daily_report_id = ?
        `,
        )
        .all(id)
        .map((row) => row.id);

      gatePassIds.forEach((gatePassId) => {
        db.prepare(
          `
          DELETE FROM gatepass_items
          WHERE gatepass_entry_id = ?
        `,
        ).run(gatePassId);
      });

      db.prepare(
        `
        DELETE FROM gatepass_entries
        WHERE daily_report_id = ?
      `,
      ).run(id);

      // --------------------------------
      // Manufacturing entries
      // --------------------------------

      const manufacturingIds = db
        .prepare(
          `
          SELECT id
          FROM manufacturing_entries
          WHERE daily_report_id = ?
        `,
        )
        .all(id)
        .map((row) => row.id);

      manufacturingIds.forEach((manufacturingId) => {
        db.prepare(
          `
          DELETE FROM manufacturing_consumption
          WHERE manufacturing_entry_id = ?
        `,
        ).run(manufacturingId);

        db.prepare(
          `
          DELETE FROM manufacturing_production
          WHERE manufacturing_entry_id = ?
        `,
        ).run(manufacturingId);
      });

      db.prepare(
        `
        DELETE FROM manufacturing_entries
        WHERE daily_report_id = ?
      `,
      ).run(id);

      // --------------------------------
      // Re-insert purchases
      // --------------------------------

      (report.purchases || []).forEach((purchase) => {
        const purchaseEntry = db
          .prepare(
            `
            INSERT INTO purchase_entries
            (
              daily_report_id,
              purchase_no
            )
            VALUES (?, ?)
          `,
          )
          .run(id, purchase.purchaseNo);

        const purchaseEntryId = purchaseEntry.lastInsertRowid;

        (purchase.items || []).forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            `
            INSERT INTO purchase_items
            (
              purchase_entry_id,
              stock_item_id,
              qty,
              unit
            )
            VALUES (?, ?, ?, ?)
          `,
          ).run(
            purchaseEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });
      });

      // --------------------------------
      // Re-insert gate passes
      // --------------------------------

      (report.gatePasses || []).forEach((gatePass) => {
        const gatePassEntry = db
          .prepare(
            `
            INSERT INTO gatepass_entries
            (
              daily_report_id,
              gatepass_no
            )
            VALUES (?, ?)
          `,
          )
          .run(id, gatePass.gatePassNo);

        const gatePassEntryId = gatePassEntry.lastInsertRowid;

        (gatePass.items || []).forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            `
            INSERT INTO gatepass_items
            (
              gatepass_entry_id,
              stock_item_id,
              qty,
              unit
            )
            VALUES (?, ?, ?, ?)
          `,
          ).run(
            gatePassEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });
      });

      // --------------------------------
      // Re-insert manufacturing
      // --------------------------------

      (report.manufactured || []).forEach((manufacturing) => {
        const manufacturingEntry = db
          .prepare(
            `
            INSERT INTO manufacturing_entries
            (
              daily_report_id
            )
            VALUES (?)
          `,
          )
          .run(id);

        const manufacturingEntryId = manufacturingEntry.lastInsertRowid;

        (manufacturing.consumption || []).forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            `
            INSERT INTO manufacturing_consumption
            (
              manufacturing_entry_id,
              stock_item_id,
              qty,
              unit
            )
            VALUES (?, ?, ?, ?)
          `,
          ).run(
            manufacturingEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });

        (manufacturing.production || []).forEach((item) => {
          if (!item.item || !item.qty) return;

          db.prepare(
            `
            INSERT INTO manufacturing_production
            (
              manufacturing_entry_id,
              stock_item_id,
              qty,
              unit
            )
            VALUES (?, ?, ?, ?)
          `,
          ).run(
            manufacturingEntryId,
            Number(item.item),
            Number(item.qty),
            item.unit,
          );
        });
      });
    });

    replace();

    return true;
  }


  function getStockItemTransactions(stockItemId) {
  return db
    .prepare(
      `
      WITH transactions AS (

        -- PURCHASE
        SELECT
          dr.report_date AS transaction_date,
          1 AS sort_order,
          pe.id AS transaction_id,
          'Purchase' AS transaction_type,
          pe.purchase_no AS reference_no,
          pi.qty AS inward_qty,
          0 AS outward_qty,
          pi.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM purchase_items pi
        INNER JOIN purchase_entries pe
          ON pe.id = pi.purchase_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = pe.daily_report_id
        WHERE pi.stock_item_id = ?

        UNION ALL

        -- MANUFACTURING PRODUCTION
        SELECT
          dr.report_date AS transaction_date,
          2 AS sort_order,
          mp.id AS transaction_id,
          'Production' AS transaction_type,
          NULL AS reference_no,
          mp.qty AS inward_qty,
          0 AS outward_qty,
          mp.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM manufacturing_production mp
        INNER JOIN manufacturing_entries me
          ON me.id = mp.manufacturing_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = me.daily_report_id
        WHERE mp.stock_item_id = ?

        UNION ALL

        -- MANUFACTURING CONSUMPTION
        SELECT
          dr.report_date AS transaction_date,
          3 AS sort_order,
          mc.id AS transaction_id,
          'Consumption' AS transaction_type,
          NULL AS reference_no,
          0 AS inward_qty,
          mc.qty AS outward_qty,
          mc.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM manufacturing_consumption mc
        INNER JOIN manufacturing_entries me
          ON me.id = mc.manufacturing_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = me.daily_report_id
        WHERE mc.stock_item_id = ?

        UNION ALL

        -- DISPATCH / GATE PASS
        SELECT
          dr.report_date AS transaction_date,
          4 AS sort_order,
          gi.id AS transaction_id,
          'Dispatch' AS transaction_type,
          ge.gatepass_no AS reference_no,
          0 AS inward_qty,
          gi.qty AS outward_qty,
          gi.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM gatepass_items gi
        INNER JOIN gatepass_entries ge
          ON ge.id = gi.gatepass_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = ge.daily_report_id
        WHERE gi.stock_item_id = ?

        UNION ALL

        -- STOCK ADJUSTMENT
        SELECT
          sa.adjustment_date AS transaction_date,
          5 AS sort_order,
          sai.id AS transaction_id,

          CASE
            WHEN sai.adjustment_type = 'add'
              THEN 'Adjustment - Add'
            ELSE 'Adjustment - Subtract'
          END AS transaction_type,

          NULL AS reference_no,

          CASE
            WHEN sai.adjustment_type = 'add'
              THEN sai.qty
            ELSE 0
          END AS inward_qty,

          CASE
            WHEN sai.adjustment_type = 'subtract'
              THEN sai.qty
            ELSE 0
          END AS outward_qty,

          sai.unit AS unit,
          sai.reason AS reason,
          sa.remarks AS remarks

        FROM stock_adjustment_items sai
        INNER JOIN stock_adjustments sa
          ON sa.id = sai.stock_adjustment_id
        WHERE sai.stock_item_id = ?
      ),

      ordered_transactions AS (
        SELECT
          transaction_date,
          sort_order,
          transaction_id,
          transaction_type,
          reference_no,
          inward_qty,
          outward_qty,
          unit,
          reason,
          remarks
        FROM transactions

        ORDER BY
          transaction_date ASC,
          sort_order ASC,
          transaction_id ASC
      )

      SELECT
        transaction_date,
        transaction_type,
        reference_no,
        inward_qty,
        outward_qty,
        unit,
        reason,
        remarks,

        (
          SELECT opening_qty
          FROM stock_items
          WHERE id = ?
        )
        +
        SUM(inward_qty - outward_qty) OVER (
          ORDER BY
            transaction_date ASC,
            sort_order ASC,
            transaction_id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS balance_qty

      FROM ordered_transactions

      ORDER BY
        transaction_date ASC,
        sort_order ASC,
        transaction_id ASC
      `,
    )
    .all(
      stockItemId,
      stockItemId,
      stockItemId,
      stockItemId,
      stockItemId,
      stockItemId,
    );
}




  function getStockReport() {
    return db
      .prepare(
        `
            SELECT
              si.id,
              si.item_name,
              si.stock_group,
              si.unit,
              si.alternate_unit,
              si.conversion,
              si.opening_qty,
              si.low_qty_alert,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM purchase_items
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS purchased_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM gatepass_items
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS dispatched_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_consumption
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS consumed_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_production
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS produced_qty,

              COALESCE(
  (
    SELECT SUM(sai.qty)
    FROM stock_adjustment_items sai
    WHERE sai.stock_item_id = si.id
      AND sai.adjustment_type = 'add'
  ),
  0
) AS adjustment_add_qty,

              COALESCE(
  (
    SELECT SUM(sai.qty)
    FROM stock_adjustment_items sai
    WHERE sai.stock_item_id = si.id
      AND sai.adjustment_type = 'subtract'
  ),
  0
) AS adjustment_subtract_qty

            FROM stock_items si

            WHERE si.is_active = 1

            ORDER BY si.stock_group, si.item_name
        `,
      )
      .all()
      .map((row) => ({
        ...row,

        balance_qty:
          Number(row.opening_qty) +
          Number(row.purchased_qty) +
          Number(row.produced_qty) +
          Number(row.adjustment_add_qty) -
          Number(row.dispatched_qty) -
          Number(row.consumed_qty) -
          Number(row.adjustment_subtract_qty),
      }));
  }

  return {
    getSettings,
    saveSettings,
    verifyMasterPassword,
    updateFactoryProfile,

    getStockGroups,
    addStockGroup,
    hasStockGroupTransactions,
    renameStockGroup,
    deactivateStockGroup,
    getStockUnits,
    addStockUnit,
    hasStockUnitTransactions,
    renameStockUnit,
    deactivateStockUnit,
    getStockItemById,
    hasStockItemTransactions,
    deleteStockItem,

    getStockItems,
    saveStockItem,
    updateStockItem,
    updateLowQtyAlert,
    inactivateStockItem,

    getDailyReports,
    saveDailyReport,
    markDailyReportExported,
    getDailyReportById,
    getDailyReportByDate,
    updateDailyReport,
    deleteDailyReport,
    getStockReport,
    getStockItemTransactions,
    saveStockAdjustment,
    getStockAdjustments,
    bulkUpdateStockItems,
    bulkCreateStockItems,
    backupTo,
    close,
  };
}

module.exports = { createDatabase };
