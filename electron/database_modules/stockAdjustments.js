// Manual stock adjustments (corrections outside the normal purchase/
// dispatch/manufacturing flow).
function createStockAdjustmentsModule(db) {
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

  return {
    saveStockAdjustment,
    getStockAdjustments,
  };
}

module.exports = { createStockAdjustmentsModule };
