const Database = require("better-sqlite3");
const path = require("path");

// Database file will be created automatically if it doesn't exist
const dbPath = path.join(__dirname, "..", "factory_stock.db");

const db = new Database(dbPath);

// Improve performance and reliability
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

module.exports = db;