const { DEFAULT_GROUPS, DEFAULT_UNITS } = require("./constants");

// Stock groups and units: the lookup lists stock items are categorized by.
function createStockGroupsUnitsModule(db) {
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

  return {
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
  };
}

module.exports = { createStockGroupsUnitsModule };
