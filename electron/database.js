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

module.exports = {
    getSettings,
    saveSettings
};