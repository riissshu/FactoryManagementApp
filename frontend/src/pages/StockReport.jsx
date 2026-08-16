import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import { exportTablePdf, exportTableExcel } from "../utils/exportUtils";

export default function StockReport({ onClose } = {}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getStockReport()
      .then(setItems)
      .catch((error) => {
        console.error(error);
        alert("Unable to load the stock report.");
      });
  }, []);

  const rows = useMemo(
    () =>
      items.filter((item) =>
        item.item_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );
  const groups = [...new Set(rows.map((item) => item.stock_group))];

  const exportPdf = async () => {
    const settings = await api.getSettings();
    await exportTablePdf({
      title: "Stock Report",
      company: settings?.factory_name,
      subtitle: new Date().toLocaleDateString("en-IN"),
      filename: `${settings?.factory_name || "factory"}-stock-summary.pdf`,
      headers: [
        "Item",
        "Group",
        "Unit",
        "Opening",
        "Received",
        "Produced",
        "Dispatched",
        "Consumed",
        "Adjustment",
        "Balance",
      ],
      rows: rows.map((item) => [
        item.item_name,
        item.stock_group,
        item.unit,
        item.opening_qty,
        item.purchased_qty,
        item.produced_qty,
        item.dispatched_qty,
        item.consumed_qty,
        Number(item.adjustment_add_qty) -
  Number(item.adjustment_subtract_qty),
        item.balance_qty,
      ]),
      numericCols: [3, 4, 5, 6, 7, 8, 9],
    });
  
  };

  const exportExcel = () => {
    
    exportTableExcel({
      filename: "stock-report.xlsx",
      sheetName: "Stock Report",
      headers: [
        "Item",
        "Group",
        "Unit",
        "Opening",
        "Received",
        "Produced",
        "Dispatched",
        "Consumed",
        "Adjustment",
        "Balance",
      ],
      rows: rows.map((item) => [
        item.item_name,
        item.stock_group,
        item.unit,
        item.opening_qty,
        item.purchased_qty,
        item.produced_qty,
        item.dispatched_qty,
        item.consumed_qty,
        Number(item.adjustment_add_qty) -
  Number(item.adjustment_subtract_qty),
        item.balance_qty,
      ]),
    });
  };

  return (
    <div className="page-shell">
      <h2>Detailed Stock Report</h2>

      <button onClick={onClose} className="btn btn-secondary">
        Close
      </button>

      <button onClick={exportPdf} className="btn btn-outline-primary ms-2">
        Export PDF
      </button>
      <button onClick={exportExcel} className="btn btn-outline-success ms-2">
        Export Excel
      </button>

      <div className="content-card">
        <div className="col-md-5 mb-4">
          <label className="form-label">Search Item</label>
          <input
            className="form-control"
            placeholder="Search item..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {groups.map((group) => (
          <div className="card shadow-sm mb-4" key={group}>
            <div className="card-header bg-secondary text-white">
              <strong>{group}</strong>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Unit</th>
                    <th className="text-end">Opening</th>
                    <th className="text-end">Received</th>
                    <th className="text-end">Produced</th>
                    <th className="text-end">Dispatched</th>
                    <th className="text-end">Consumed</th>
                    <th className="text-end">Adjustment</th>
                    <th className="text-end">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((item) => item.stock_group === group)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.unit}</td>
                        <td className="text-end">{item.opening_qty}</td>
                        <td className="text-end">{item.purchased_qty}</td>
                        <td className="text-end">{item.produced_qty}</td>
                        <td className="text-end">{item.dispatched_qty}</td>
                        <td className="text-end">{item.consumed_qty}</td>
                        <td className="text-end">
  {Number(item.adjustment_add_qty) -
    Number(item.adjustment_subtract_qty)}
</td>
                        <td className="text-end fw-bold">{item.balance_qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {!groups.length && (
          <p className="text-muted text-center">No stock items found.</p>
        )}
      </div>
    </div>
  );
}
