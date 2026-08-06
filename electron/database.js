console.log("database.js loaded");

const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "factory_stock.db");

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

db.exec(`
CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    report_date TEXT NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

console.log("daily_reports table checked");

db.exec(`
CREATE TABLE IF NOT EXISTS purchase_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    daily_report_id INTEGER NOT NULL,

    purchase_no TEXT NOT NULL,

    FOREIGN KEY (daily_report_id)
    REFERENCES daily_reports(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_entry_id INTEGER NOT NULL,

    stock_item_id INTEGER NOT NULL,

    qty REAL NOT NULL,

    unit TEXT NOT NULL,

    FOREIGN KEY (purchase_entry_id)
    REFERENCES purchase_entries(id),

    FOREIGN KEY (stock_item_id)
    REFERENCES stock_items(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS gatepass_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    daily_report_id INTEGER NOT NULL,

    gatepass_no TEXT NOT NULL,

    FOREIGN KEY (daily_report_id)
    REFERENCES daily_reports(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS gatepass_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    gatepass_entry_id INTEGER NOT NULL,

    stock_item_id INTEGER NOT NULL,

    qty REAL NOT NULL,

    unit TEXT NOT NULL,

    FOREIGN KEY (gatepass_entry_id)
    REFERENCES gatepass_entries(id),

    FOREIGN KEY (stock_item_id)
    REFERENCES stock_items(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS manufacturing_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    daily_report_id INTEGER NOT NULL,

    FOREIGN KEY (daily_report_id)
    REFERENCES daily_reports(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS manufacturing_consumption (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    manufacturing_entry_id INTEGER NOT NULL,

    stock_item_id INTEGER NOT NULL,

    qty REAL NOT NULL,

    unit TEXT NOT NULL,

    FOREIGN KEY (manufacturing_entry_id)
    REFERENCES manufacturing_entries(id),

    FOREIGN KEY (stock_item_id)
    REFERENCES stock_items(id)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS manufacturing_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    manufacturing_entry_id INTEGER NOT NULL,

    stock_item_id INTEGER NOT NULL,

    qty REAL NOT NULL,

    unit TEXT NOT NULL,

    FOREIGN KEY (manufacturing_entry_id)
    REFERENCES manufacturing_entries(id),

    FOREIGN KEY (stock_item_id)
    REFERENCES stock_items(id)
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

function getDailyReports() {
    return db.prepare(`
        SELECT
            dr.id,
            dr.report_date,

            (
                SELECT COUNT(*)
                FROM purchase_entries pe
                WHERE pe.daily_report_id = dr.id
            ) AS purchase_count,

            (
                SELECT COUNT(*)
                FROM gatepass_entries gp
                WHERE gp.daily_report_id = dr.id
            ) AS gatepass_count,

            (
                SELECT COUNT(*)
                FROM manufacturing_entries me
                WHERE me.daily_report_id = dr.id
            ) AS manufacturing_count

        FROM daily_reports dr

        ORDER BY dr.report_date DESC, dr.id DESC
    `).all();
}

function getDailyReportById(id) {
    const report = db.prepare("SELECT id, report_date FROM daily_reports WHERE id = ?").get(id);
    if (!report) return null;

    const purchases = db.prepare(`
    SELECT *
    FROM purchase_entries
    WHERE daily_report_id = ?
`).all(id);

    report.purchases = purchases.map((purchase) => {

        const items = db.prepare(`
        SELECT *
        FROM purchase_items
        WHERE purchase_entry_id = ?
    `).all(purchase.id);

        return {
            purchaseNo: purchase.purchase_no,

            items: items.map((item) => ({
                item: item.stock_item_id,
                qty: item.qty,
                unit: item.unit
            }))
        };

    });

    // Gate Pass

    report.gatePasses = db.prepare(`
        SELECT *
        FROM gatepass_entries
        WHERE daily_report_id = ?
    `).all(id);

    report.gatePasses.forEach((gatePass) => {

        gatePass.items = db.prepare(`
            SELECT
                gi.*,
                si.item_name
            FROM gatepass_items gi
            LEFT JOIN stock_items si
                ON si.id = gi.stock_item_id
            WHERE gatepass_entry_id = ?
        `).all(gatePass.id);

    });

    // Manufacturing

    report.manufactured = db.prepare(`
        SELECT *
        FROM manufacturing_entries
        WHERE daily_report_id = ?
    `).all(id);

    report.manufactured.forEach((manufacturing) => {

        manufacturing.consumption = db.prepare(`
            SELECT
                mc.*,
                si.item_name
            FROM manufacturing_consumption mc
            LEFT JOIN stock_items si
                ON si.id = mc.stock_item_id
            WHERE manufacturing_entry_id = ?
        `).all(manufacturing.id);

        manufacturing.production = db.prepare(`
            SELECT
                mp.*,
                si.item_name
            FROM manufacturing_production mp
            LEFT JOIN stock_items si
                ON si.id = mp.stock_item_id
            WHERE manufacturing_entry_id = ?
        `).all(manufacturing.id);

    });

    const mapItem = (item) => ({ item: String(item.stock_item_id), qty: String(item.qty), unit: item.unit });
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



function saveDailyReport(report) {

    const transaction = db.transaction(() => {

        // 1. Daily Report

        const dailyReport = db.prepare(`
            INSERT INTO daily_reports (report_date)
            VALUES (?)
        `).run(report.report_date);

        const dailyReportId = dailyReport.lastInsertRowid;

        // Purchase Entries

        report.purchases.forEach((purchase) => {

            const purchaseEntry = db.prepare(`
        INSERT INTO purchase_entries
        (
            daily_report_id,
            purchase_no
        )
        VALUES (?, ?)
    `).run(
                dailyReportId,
                purchase.purchaseNo
            );

            const purchaseEntryId = purchaseEntry.lastInsertRowid;

            purchase.items.forEach((item) => {

                if (!item.item || !item.qty) return;

                db.prepare(`
            INSERT INTO purchase_items
            (
                purchase_entry_id,
                stock_item_id,
                qty,
                unit
            )
            VALUES (?, ?, ?, ?)
        `).run(
                    purchaseEntryId,
                    Number(item.item),
                    Number(item.qty),
                    item.unit
                );

            });

        });

        // Gate Pass Entries

        report.gatePasses.forEach((gatePass) => {

            const gatePassEntry = db.prepare(`
        INSERT INTO gatepass_entries
        (
            daily_report_id,
            gatepass_no
        )
        VALUES (?, ?)
    `).run(
                dailyReportId,
                gatePass.gatePassNo
            );

            const gatePassEntryId = gatePassEntry.lastInsertRowid;

            gatePass.items.forEach((item) => {

                if (!item.item || !item.qty) return;

                db.prepare(`
            INSERT INTO gatepass_items
            (
                gatepass_entry_id,
                stock_item_id,
                qty,
                unit
            )
            VALUES (?, ?, ?, ?)
        `).run(
                    gatePassEntryId,
                    Number(item.item),
                    Number(item.qty),
                    item.unit
                );

            });

        });

        // Manufacturing Entries

        report.manufactured.forEach((manufacturing) => {

            const manufacturingEntry = db.prepare(`
        INSERT INTO manufacturing_entries
        (
            daily_report_id
        )
        VALUES (?)
    `).run(
                dailyReportId
            );

            const manufacturingEntryId =
                manufacturingEntry.lastInsertRowid;

            // Consumption

            manufacturing.consumption.forEach((item) => {

                if (!item.item || !item.qty) return;

                db.prepare(`
            INSERT INTO manufacturing_consumption
            (
                manufacturing_entry_id,
                stock_item_id,
                qty,
                unit
            )
            VALUES (?, ?, ?, ?)
        `).run(
                    manufacturingEntryId,
                    Number(item.item),
                    Number(item.qty),
                    item.unit
                );

            });

            // Production

            manufacturing.production.forEach((item) => {

                if (!item.item || !item.qty) return;

                db.prepare(`
            INSERT INTO manufacturing_production
            (
                manufacturing_entry_id,
                stock_item_id,
                qty,
                unit
            )
            VALUES (?, ?, ?, ?)
        `).run(
                    manufacturingEntryId,
                    Number(item.item),
                    Number(item.qty),
                    item.unit
                );

            });

        });

    });

    transaction();

    return true;
}

function deleteDailyReport(id) {
    const remove = db.transaction(() => {
        const purchaseIds = db.prepare("SELECT id FROM purchase_entries WHERE daily_report_id = ?").all(id).map((row) => row.id);
        const gatePassIds = db.prepare("SELECT id FROM gatepass_entries WHERE daily_report_id = ?").all(id).map((row) => row.id);
        const manufacturingIds = db.prepare("SELECT id FROM manufacturing_entries WHERE daily_report_id = ?").all(id).map((row) => row.id);
        const deleteChildren = (table, column, ids) => ids.forEach((entryId) => db.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).run(entryId));
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

function updateDailyReport(id, report) {
    const replace = db.transaction(() => {
        deleteDailyReport(id);
        saveDailyReport(report);
    });
    replace();
    return true;
}

function getStockReport() {
    return db.prepare(`
        SELECT si.id, si.item_name, si.stock_group, si.unit, si.opening_qty,
          COALESCE((SELECT SUM(qty) FROM purchase_items WHERE stock_item_id = si.id), 0) AS purchased_qty,
          COALESCE((SELECT SUM(qty) FROM gatepass_items WHERE stock_item_id = si.id), 0) AS dispatched_qty,
          COALESCE((SELECT SUM(qty) FROM manufacturing_consumption WHERE stock_item_id = si.id), 0) AS consumed_qty,
          COALESCE((SELECT SUM(qty) FROM manufacturing_production WHERE stock_item_id = si.id), 0) AS produced_qty
        FROM stock_items si WHERE si.is_active = 1 ORDER BY si.item_name
    `).all().map((row) => ({ ...row, balance_qty: Number(row.opening_qty) + Number(row.purchased_qty) + Number(row.produced_qty) - Number(row.dispatched_qty) - Number(row.consumed_qty) }));
}

module.exports = {
    getSettings,
    saveSettings,

    getStockItems,
    saveStockItem,
    updateStockItem,
    inactivateStockItem,

    getDailyReports,
    saveDailyReport,
    getDailyReportById,
    updateDailyReport,
    deleteDailyReport,
    getStockReport,
};
