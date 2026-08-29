// Stock items: the master item list, and CRUD/bulk operations on it.
function createStockItemsModule(db) {
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

  return {
    getStockItems,
    saveStockItem,
    getStockItemById,
    hasStockItemTransactions,
    updateStockItem,
    updateLowQtyAlert,
    inactivateStockItem,
    deleteStockItem,
    bulkUpdateStockItems,
    bulkCreateStockItems,
  };
}

module.exports = { createStockItemsModule };
