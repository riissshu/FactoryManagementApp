const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "factory_stock.db");

const db = new Database(dbPath);

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


// =======================
// Settings Functions
// =======================

function getSettings() {
    return db.prepare("SELECT * FROM settings LIMIT 1").get();
}

function saveSettings(factoryName, factoryLogo) {

    const existing = getSettings();

    if (existing) {

        db.prepare(`
            UPDATE settings
            SET factory_name = ?, factory_logo = ?
            WHERE id = ?
        `).run(factoryName, factoryLogo, existing.id);

    } else {

        db.prepare(`
            INSERT INTO settings
            (factory_name, factory_logo)
            VALUES (?, ?)
        `).run(factoryName, factoryLogo);

    }

    return true;
}

function getStockItems() {
    return db.prepare(`
        SELECT *
        FROM stock_items
        WHERE is_active = 1
        ORDER BY item_name
    `).all();
}

function saveStockItem(item) {
    db.prepare(`
        INSERT INTO stock_items
        (
            item_name,
            stock_group,
            unit,
            alternate_unit,
            conversion,
            opening_qty,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        item.item_name,
        item.stock_group,
        item.unit,
        item.alternate_unit,
        item.conversion,
        item.opening_qty,
        1
    );

    return true;
}

function updateStockItem(item) {
    db.prepare(`
        UPDATE stock_items
        SET
            item_name = ?,
            stock_group = ?,
            unit = ?,
            alternate_unit = ?,
            conversion = ?,
            opening_qty = ?
        WHERE id = ?
    `).run(
        item.item_name,
        item.stock_group,
        item.unit,
        item.alternate_unit,
        item.conversion,
        item.opening_qty,
        item.id
    );

    return true;
}

function inactivateStockItem(id) {
    db.prepare(`
        UPDATE stock_items
        SET is_active = 0
        WHERE id = ?
    `).run(id);

    return true;
}

module.exports = {
    getSettings,
    saveSettings,

    getStockItems,
    saveStockItem,
    updateStockItem,
    inactivateStockItem,
};