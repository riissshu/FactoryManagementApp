// Read-only registers/reports derived from the other tables: purchase,
// dispatch and production registers, per-item ledgers, and the stock report.
function createRegistersModule(db) {
  function getProductionRegister() {
    const entries = db
      .prepare(
        `
      SELECT
        me.id AS manufacturing_id,
        dr.report_date
      FROM manufacturing_entries me
      INNER JOIN daily_reports dr
        ON dr.id = me.daily_report_id
      ORDER BY
        dr.report_date DESC,
        me.id DESC
      `,
      )
      .all();

    const getConsumption = db.prepare(`
    SELECT
      mc.id,
      mc.stock_item_id,
      si.item_name,
      mc.qty,
      mc.unit
    FROM manufacturing_consumption mc
    INNER JOIN stock_items si
      ON si.id = mc.stock_item_id
    WHERE mc.manufacturing_entry_id = ?
    ORDER BY mc.id ASC
  `);

    const getProduction = db.prepare(`
    SELECT
      mp.id,
      mp.stock_item_id,
      si.item_name,
      mp.qty,
      mp.unit
    FROM manufacturing_production mp
    INNER JOIN stock_items si
      ON si.id = mp.stock_item_id
    WHERE mp.manufacturing_entry_id = ?
    ORDER BY mp.id ASC
  `);

    return entries.map((entry) => ({
      manufacturing_id: entry.manufacturing_id,
      report_date: entry.report_date,
      consumption: getConsumption.all(entry.manufacturing_id),
      production: getProduction.all(entry.manufacturing_id),
    }));
  }

  function getDispatchRegister() {
    return db
      .prepare(
        `
      SELECT
        ge.id AS gatepass_id,
        dr.report_date,
        ge.gatepass_no,
        gi.id AS item_id,
        gi.stock_item_id,
        si.item_name,
        gi.qty,
        gi.unit
      FROM gatepass_entries ge
      INNER JOIN daily_reports dr
        ON dr.id = ge.daily_report_id
      INNER JOIN gatepass_items gi
        ON gi.gatepass_entry_id = ge.id
      INNER JOIN stock_items si
        ON si.id = gi.stock_item_id
      ORDER BY
        dr.report_date DESC,
        ge.id DESC,
        gi.id ASC
      `,
      )
      .all();
  }

  function getPurchaseRegister() {
    return db
      .prepare(
        `
        SELECT
          pe.id AS purchase_id,
          dr.report_date,
          pe.purchase_no,
          pi.id AS item_id,
          pi.stock_item_id,
          si.item_name,
          pi.qty,
          pi.unit
        FROM purchase_entries pe
        INNER JOIN daily_reports dr
          ON dr.id = pe.daily_report_id
        INNER JOIN purchase_items pi
          ON pi.purchase_entry_id = pe.id
        INNER JOIN stock_items si
          ON si.id = pi.stock_item_id
        ORDER BY
          dr.report_date DESC,
          pe.id DESC,
          pi.id ASC
        `,
      )
      .all();
  }
  function getStockItemTransactions(stockItemId) {
    return db
      .prepare(
        `
      WITH transactions AS (

        -- PURCHASE
        SELECT
          dr.report_date AS transaction_date,
          1 AS sort_order,
          pe.id AS transaction_id,
          'Purchase' AS transaction_type,
          pe.purchase_no AS reference_no,
          pi.qty AS inward_qty,
          0 AS outward_qty,
          pi.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM purchase_items pi
        INNER JOIN purchase_entries pe
          ON pe.id = pi.purchase_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = pe.daily_report_id
        WHERE pi.stock_item_id = ?

        UNION ALL

        -- MANUFACTURING PRODUCTION
        SELECT
          dr.report_date AS transaction_date,
          2 AS sort_order,
          mp.id AS transaction_id,
          'Production' AS transaction_type,
          NULL AS reference_no,
          mp.qty AS inward_qty,
          0 AS outward_qty,
          mp.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM manufacturing_production mp
        INNER JOIN manufacturing_entries me
          ON me.id = mp.manufacturing_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = me.daily_report_id
        WHERE mp.stock_item_id = ?

        UNION ALL

        -- MANUFACTURING CONSUMPTION
        SELECT
          dr.report_date AS transaction_date,
          3 AS sort_order,
          mc.id AS transaction_id,
          'Consumption' AS transaction_type,
          NULL AS reference_no,
          0 AS inward_qty,
          mc.qty AS outward_qty,
          mc.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM manufacturing_consumption mc
        INNER JOIN manufacturing_entries me
          ON me.id = mc.manufacturing_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = me.daily_report_id
        WHERE mc.stock_item_id = ?

        UNION ALL

        -- DISPATCH / GATE PASS
        SELECT
          dr.report_date AS transaction_date,
          4 AS sort_order,
          gi.id AS transaction_id,
          'Dispatch' AS transaction_type,
          ge.gatepass_no AS reference_no,
          0 AS inward_qty,
          gi.qty AS outward_qty,
          gi.unit AS unit,
          NULL AS reason,
          NULL AS remarks
        FROM gatepass_items gi
        INNER JOIN gatepass_entries ge
          ON ge.id = gi.gatepass_entry_id
        INNER JOIN daily_reports dr
          ON dr.id = ge.daily_report_id
        WHERE gi.stock_item_id = ?

        UNION ALL

        -- STOCK ADJUSTMENT
        SELECT
          sa.adjustment_date AS transaction_date,
          5 AS sort_order,
          sai.id AS transaction_id,

          CASE
            WHEN sai.adjustment_type = 'add'
              THEN 'Adjustment - Add'
            ELSE 'Adjustment - Subtract'
          END AS transaction_type,

          NULL AS reference_no,

          CASE
            WHEN sai.adjustment_type = 'add'
              THEN sai.qty
            ELSE 0
          END AS inward_qty,

          CASE
            WHEN sai.adjustment_type = 'subtract'
              THEN sai.qty
            ELSE 0
          END AS outward_qty,

          sai.unit AS unit,
          sai.reason AS reason,
          sa.remarks AS remarks

        FROM stock_adjustment_items sai
        INNER JOIN stock_adjustments sa
          ON sa.id = sai.stock_adjustment_id
        WHERE sai.stock_item_id = ?
      ),

      ordered_transactions AS (
        SELECT
          transaction_date,
          sort_order,
          transaction_id,
          transaction_type,
          reference_no,
          inward_qty,
          outward_qty,
          unit,
          reason,
          remarks
        FROM transactions

        ORDER BY
          transaction_date ASC,
          sort_order ASC,
          transaction_id ASC
      )

      SELECT
        transaction_date,
        transaction_type,
        reference_no,
        inward_qty,
        outward_qty,
        unit,
        reason,
        remarks,

        (
          SELECT opening_qty
          FROM stock_items
          WHERE id = ?
        )
        +
        SUM(inward_qty - outward_qty) OVER (
          ORDER BY
            transaction_date ASC,
            sort_order ASC,
            transaction_id ASC
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS balance_qty

      FROM ordered_transactions

      ORDER BY
        transaction_date ASC,
        sort_order ASC,
        transaction_id ASC
      `,
      )
      .all(
        stockItemId,
        stockItemId,
        stockItemId,
        stockItemId,
        stockItemId,
        stockItemId,
      );
  }
  function getStockReport() {
    return db
      .prepare(
        `
            SELECT
              si.id,
              si.item_name,
              si.stock_group,
              si.unit,
              si.alternate_unit,
              si.conversion,
              si.opening_qty,
              si.low_qty_alert,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM purchase_items
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS purchased_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM gatepass_items
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS dispatched_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_consumption
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS consumed_qty,

              COALESCE(
                (
                  SELECT SUM(qty)
                  FROM manufacturing_production
                  WHERE stock_item_id = si.id
                ),
                0
              ) AS produced_qty,

              COALESCE(
  (
    SELECT SUM(sai.qty)
    FROM stock_adjustment_items sai
    WHERE sai.stock_item_id = si.id
      AND sai.adjustment_type = 'add'
  ),
  0
) AS adjustment_add_qty,

              COALESCE(
  (
    SELECT SUM(sai.qty)
    FROM stock_adjustment_items sai
    WHERE sai.stock_item_id = si.id
      AND sai.adjustment_type = 'subtract'
  ),
  0
) AS adjustment_subtract_qty

            FROM stock_items si

            WHERE si.is_active = 1

            ORDER BY si.stock_group, si.item_name
        `,
      )
      .all()
      .map((row) => ({
        ...row,

        balance_qty:
          Number(row.opening_qty) +
          Number(row.purchased_qty) +
          Number(row.produced_qty) +
          Number(row.adjustment_add_qty) -
          Number(row.dispatched_qty) -
          Number(row.consumed_qty) -
          Number(row.adjustment_subtract_qty),
      }));
  }

  return {
    getPurchaseRegister,
    getDispatchRegister,
    getProductionRegister,
    getStockReport,
    getStockItemTransactions,
  };
}

module.exports = { createRegistersModule };
