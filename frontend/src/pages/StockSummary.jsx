import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  exportStockSummaryPDF,
  exportStockSummaryExcel,
} from "../utils/exportStockSummary";



export default function StockSummary({ onStockReport }) {
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
        <div>
        <h4 className="">Stock Summary :-  </h4>
          <p className="text-muted fw-bold"><small>Current Stock Balances</small></p>
         
        </div>
        <div>
        {onStockReport && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onStockReport}
          >
            View Detailed Stock Report
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline-primary ms-2"
         onClick={() => exportStockSummaryPDF(filteredRows)}
        >
          Export PDF
        </button>
        <button
          type="button"
          className="btn btn-outline-success ms-2"
          onClick={() => exportStockSummaryExcel(filteredRows)}
        >
          Export Excel
        </button>
        </div>
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
                  </tr>
                </thead>

                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.item_name}</td>
                      <td className="text-end">{row.balance_qty}{" "}{row.unit}
                        <div>
                          {row.unit &&
                            row.alternate_unit &&
                            row.conversion > 0 &&
                            row.opening_qty > 0 && (
                              <small className="text-muted badge">
                                {" "}
                                ({row.opening_qty * row.conversion}{" "}
                                {row.alternate_unit})
                              </small>
                            )}
                        </div>
                      </td>
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
