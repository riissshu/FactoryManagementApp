// Daily reports: purchase, gatepass (dispatch) and manufacturing entries
// recorded against a single calendar date.
//
// `verifyMasterPassword` is injected from the settings module, since
// deleting/editing a report can require confirming the master password.
function createDailyReportsModule(db, { verifyMasterPassword }) {
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

  return {
    getDailyReports,
    getDailyReportByDate,
    getDailyReportById,
    saveDailyReport,
    markDailyReportExported,
    deleteDailyReport,
    updateDailyReport,
  };
}

module.exports = { createDailyReportsModule };
