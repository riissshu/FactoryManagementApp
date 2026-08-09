import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

export default function StockSummary({ onBack } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getStockReport();
      setRows(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.item_name.toLowerCase().includes(term));
  }, [rows, search]);

  // Group the flat list into { "Raw Material": [...], "Finished Goods": [...] }
  // preserving the order groups first appear in (already stock_group, then
  // item_name from the backend query).
  const groupedRows = useMemo(() => {
    const groups = new Map();
    filteredRows.forEach((row) => {
      const key = row.stock_group || "Ungrouped";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return groups;
  }, [filteredRows]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Stock Summary</h4>

        {onBack && (
          <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
            <i className="bi bi-arrow-left me-2" />Back to Stock Report
          </button>
        )}
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="text-muted">Loading...</p>}

      {!loading && groupedRows.size === 0 && (
        <p className="text-muted">No stock items found.</p>
      )}

      {!loading &&
        Array.from(groupedRows.entries()).map(([groupName, items]) => (
          <div className="card mb-4" key={groupName}>
            <div className="card-header bg-light fw-bold">{groupName}</div>

            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th className="text-end">Available Balance</th>
                    <th>Unit</th>
                    <th>Alternate Unit</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.item_name}</td>
                      <td className="text-end">{row.balance_qty}</td>
                      <td>{row.unit}</td>
                      <td>{row.alternate_unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}