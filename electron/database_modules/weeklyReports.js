// Weekly stock reports.
function createWeeklyReportsModule(db) {
  // =======================
  // Weekly Reports
  // =======================

  db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL UNIQUE,
      is_exported INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

  db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_report_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_report_id INTEGER NOT NULL,
      stock_item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      stock_group TEXT NOT NULL,
      available_balance REAL NOT NULL DEFAULT 0,
      physical_stock REAL,
      unit TEXT NOT NULL,
      alternate_unit TEXT,
      conversion REAL DEFAULT 0,
      FOREIGN KEY (weekly_report_id) REFERENCES weekly_reports(id),
      FOREIGN KEY (stock_item_id) REFERENCES stock_items(id)
  );
`);
  function saveWeeklyReport(report) {
    const existing = db
      .prepare("SELECT id FROM weekly_reports WHERE report_date = ?")
      .get(report.report_date);

    if (existing) {
      throw new Error(
        `A weekly report for ${report.report_date} already exists.`,
      );
    }

    const transaction = db.transaction(() => {
      const weeklyReport = db
        .prepare(
          `
        INSERT INTO weekly_reports (report_date)
        VALUES (?)
        `,
        )
        .run(report.report_date);

      const weeklyReportId = weeklyReport.lastInsertRowid;

      const insertItem = db.prepare(
        `
      INSERT INTO weekly_report_items
      (
        weekly_report_id,
        stock_item_id,
        item_name,
        stock_group,
        available_balance,
        physical_stock,
        unit,
        alternate_unit,
        conversion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      );

      (report.items || []).forEach((item) => {
        insertItem.run(
          weeklyReportId,
          Number(item.stock_item_id),
          item.item_name,
          item.stock_group,
          Number(item.available_balance) || 0,
          item.physical_stock === "" || item.physical_stock == null
            ? null
            : Number(item.physical_stock),
          item.unit,
          item.alternate_unit || null,
          Number(item.conversion) || 0,
        );
      });
    });

    transaction();

    return true;
  }

  function getWeeklyReports() {
    return db
      .prepare(
        `
      SELECT
        id,
        report_date
      FROM weekly_reports
      ORDER BY report_date DESC, id DESC
      `,
      )
      .all();
  }

  function getWeeklyReportById(id) {
    const report = db
      .prepare(
        `
      SELECT
        id,
        report_date
      FROM weekly_reports
      WHERE id = ?
      `,
      )
      .get(id);

    if (!report) return null;

    report.items = db
      .prepare(
        `
      SELECT
        stock_item_id,
        item_name,
        stock_group,
        available_balance,
        physical_stock,
        unit,
        alternate_unit,
        conversion
      FROM weekly_report_items
      WHERE weekly_report_id = ?
      ORDER BY stock_group, item_name
      `,
      )
      .all(id);

    return report;
  }

  // Inserts a new daily report. Throws if a report already exists for
  // report.report_date -- one report per calendar date, no exceptions.
  // The UNIQUE index on daily_reports(report_date) is the real backstop
  // against races; this check exists to give the caller a clean,
  // human-readable error instead of a raw SQLITE_CONSTRAINT failure.

  return {
    saveWeeklyReport,
    getWeeklyReports,
    getWeeklyReportById,
  };
}

module.exports = { createWeeklyReportsModule };
