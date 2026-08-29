// Bills of Material (BOMs) and which stock groups are eligible for them.
function createBomModule(db) {
  // =======================
  // BOM Stock Group Settings
  // =======================

  db.exec(`
  CREATE TABLE IF NOT EXISTS bom_stock_group_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stock_group_id INTEGER NOT NULL UNIQUE,
      available_for_bom INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (stock_group_id) REFERENCES stock_groups(id)
  );
`);

  function getBOMStockGroupSettings() {
    return db
      .prepare(
        `
      SELECT
        sg.id,
        sg.name,
        COALESCE(bsgs.available_for_bom, 0) AS available_for_bom
      FROM stock_groups sg
      LEFT JOIN bom_stock_group_settings bsgs
        ON bsgs.stock_group_id = sg.id
      WHERE sg.is_active = 1
      ORDER BY sg.name
    `,
      )
      .all();
  }

  function setBOMStockGroupAvailability(stockGroupId, availableForBOM) {
    db.prepare(
      `
    INSERT INTO bom_stock_group_settings
      (stock_group_id, available_for_bom)
    VALUES (?, ?)
    ON CONFLICT(stock_group_id)
    DO UPDATE SET available_for_bom = excluded.available_for_bom
  `,
    ).run(stockGroupId, availableForBOM ? 1 : 0);

    return true;
  }

  // =======================
  // BOM
  // =======================

  db.exec(`
  CREATE TABLE IF NOT EXISTS boms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bom_name TEXT NOT NULL,
    finished_product_id INTEGER NOT NULL,
    output_qty REAL NOT NULL,
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (finished_product_id) REFERENCES stock_items(id)
  )
`);

  db.exec(`
  CREATE TABLE IF NOT EXISTS bom_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bom_id INTEGER NOT NULL,
    stock_item_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
  )
`);

  function createBOM({
    bomName,
    finishedProductId,
    outputQty,
    unit,
    consumption,
  }) {
    const insertBOM = db.prepare(`
    INSERT INTO boms (
      bom_name,
      finished_product_id,
      output_qty,
      unit
    )
    VALUES (?, ?, ?, ?)
  `);

    const insertItem = db.prepare(`
    INSERT INTO bom_items (
      bom_id,
      stock_item_id,
      quantity,
      unit
    )
    VALUES (?, ?, ?, ?)
  `);

    const saveBOM = db.transaction(() => {
      const result = insertBOM.run(bomName, finishedProductId, outputQty, unit);

      const bomId = result.lastInsertRowid;

      for (const item of consumption) {
        insertItem.run(bomId, item.stockItemId, item.quantity, item.unit);
      }

      return bomId;
    });

    return saveBOM();
  }

  function getBOMs() {
    return db
      .prepare(
        `
      SELECT
        b.id,
        b.bom_name,
        b.finished_product_id,
        si.item_name AS finished_product,
        b.output_qty,
        b.unit,
        b.status,
        b.created_at
      FROM boms b
      JOIN stock_items si
        ON si.id = b.finished_product_id
      ORDER BY b.id DESC
    `,
      )
      .all();
  }

  function getBOM(bomId) {
    const bom = db
      .prepare(
        `
      SELECT
        b.id,
        b.bom_name,
        b.finished_product_id,
        si.item_name AS finished_product,
        b.output_qty,
        b.unit,
        b.status,
        b.created_at
      FROM boms b
      JOIN stock_items si
        ON si.id = b.finished_product_id
      WHERE b.id = ?
    `,
      )
      .get(bomId);

    if (!bom) {
      return null;
    }

    const consumption = db
      .prepare(
        `
      SELECT
        bi.id,
        bi.stock_item_id,
        si.item_name,
        bi.quantity,
        bi.unit
      FROM bom_items bi
      JOIN stock_items si
        ON si.id = bi.stock_item_id
      WHERE bi.bom_id = ?
      ORDER BY bi.id
    `,
      )
      .all(bomId);

    return {
      ...bom,
      consumption,
    };
  }

  function updateBOM({
    bomId,
    bomName,
    finishedProductId,
    outputQty,
    unit,
    consumption,
  }) {
    const updateBOM = db.prepare(`
    UPDATE boms
    SET
      bom_name = ?,
      finished_product_id = ?,
      output_qty = ?,
      unit = ?
    WHERE id = ?
  `);

    const deleteItems = db.prepare(`
    DELETE FROM bom_items
    WHERE bom_id = ?
  `);

    const insertItem = db.prepare(`
    INSERT INTO bom_items (
      bom_id,
      stock_item_id,
      quantity,
      unit
    )
    VALUES (?, ?, ?, ?)
  `);

    const saveBOM = db.transaction(() => {
      updateBOM.run(bomName, finishedProductId, outputQty, unit, bomId);

      deleteItems.run(bomId);

      for (const item of consumption) {
        insertItem.run(bomId, item.stockItemId, item.quantity, item.unit);
      }
    });

    return saveBOM();
  }


  function deleteBOM(bomId) {
  const deleteItems = db.prepare(`
    DELETE FROM bom_items
    WHERE bom_id = ?
  `);

  const deleteBOM = db.prepare(`
    DELETE FROM boms
    WHERE id = ?
  `);

  const removeBOM = db.transaction(() => {
    deleteItems.run(bomId);
    const result = deleteBOM.run(bomId);

    return result.changes > 0;
  });

  return removeBOM();
}

  return {
    getBOMStockGroupSettings,
    setBOMStockGroupAvailability,
    createBOM,
    getBOMs,
    getBOM,
    updateBOM,
    deleteBOM,
  };
}

module.exports = { createBomModule };
