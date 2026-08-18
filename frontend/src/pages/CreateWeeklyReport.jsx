import React, { useEffect, useState } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";
import { exportWeeklyReportPdf } from "../utils/exportWeeklyReportPdf";

export default function WeeklyReport() {
  const [date, setDate] = useState("");
  const [activeTab, setActiveTab] = useState("Raw Material");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [physicalStock, setPhysicalStock] = useState({});

  useEffect(() => {
    loadStockSummary();
  }, []);

  const loadStockSummary = async () => {
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

  const handlePhysicalStockChange = (itemId, value) => {
    setPhysicalStock((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleMatchAll = () => {
    const updated = {};

    filteredRows.forEach((row) => {
      updated[row.id] = row.balance_qty;
    });

    setPhysicalStock((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const handleClearAll = () => {
    const updated = {};

    filteredRows.forEach((row) => {
      updated[row.id] = "";
    });

    setPhysicalStock((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const tabs = ["Raw Material", "Packaging Material", "Finished Goods"];

  const filteredRows = rows.filter((row) => row.stock_group === activeTab);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-start mb-2">
        {/* Page Header */}
        <div>
          <h4 className="mb-1">Weekly Report</h4>
          <p className="text-muted mb-0">Physical Stock Verification</p>
        </div>

        {/* Date */}
        <div className="me-5">
          <label className="form-label fw-semibold">Report Date</label>

          <input
            type="date"
            className="form-control"
            style={{ width: "180px" }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

         <button
    type="button"
    className="btn btn-sm btn-outline-secondary"
    onClick={() =>
      exportWeeklyReportPdf({
        date,
        rows,
        physicalStock,
      })
    }
  >
    Export PDF
  </button>

      </div>

      {/* Stock Tabs */}
      <div className="card shadow-sm">
        <div className="card-body">
          <ul className="nav nav-tabs mb-4">
            {tabs.map((tab) => (
              <li className="nav-item" key={tab}>
                <button
                  type="button"
                  className={`nav-link ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              </li>
            ))}
          </ul>

          {/* Loading */}
          {loading && <p className="text-muted mb-0">Loading stock items...</p>}

          {/* Table */}
          {!loading && (
            <div className="table-responsive">
              <div className="d-flex justify-content-end mb-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleMatchAll}
                >
                  Match All
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              </div>
              <table className="table table-bordered table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Stock Item</th>
                 
                    <th style={{ width: "220px" }} className="text-end">
                      Available Balance
                    </th>
                    <th style={{ width: "220px" }}>Physical Stock</th>
                    <th style={{ width: "150px" }} className="text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>

                      <td>{row.item_name}</td>


                      <td className="text-end">{row.balance_qty}{" "}{row.unit}

                        <div>
                          {row.unit &&
                            row.alternate_unit &&
                            row.conversion > 0 &&
                            row.balance_qty > 0 && (
                              <small className="text-muted">
                                {" "}
                                ({row.balance_qty * row.conversion}{" "}
                                {row.alternate_unit})
                              </small>
                            )}
                        </div>

                      </td>

                      <td>
                        <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Enter physical stock"
                          value={physicalStock[row.id] ?? ""}
                          onChange={(e) =>
                            handlePhysicalStockChange(row.id, e.target.value)
                          }
                        />
                        <span className="input-group-text">{row.unit}</span>
                        
                        </div>
                        <div className="d-block text-center">
                           {row.unit &&
                            row.alternate_unit &&
                            row.conversion > 0 &&
                            physicalStock[row.id] > 0 &&
                            row.balance_qty > 0 && (
                              <small className="text-muted">
                                {" "}
                                ({physicalStock[row.id] * row.conversion}{" "}
                                {row.alternate_unit})
                              </small>
                            )}
                        </div>
                      </td>
                      <td className="text-center">
                        {physicalStock[row.id] !== undefined &&
                        physicalStock[row.id] !== ""
                          ? (() => {
                              const difference =
                                Number(physicalStock[row.id]) -
                                Number(row.balance_qty);

                              if (difference === 0) {
                                return (
                                  <span className="text-success">Matched</span>
                                );
                              }

                              if (difference < 0) {
                                return (
                                  <span className="text-danger">
                                    Short 
                                  </span>
                                );
                              }

                              return (
                                <span className="text-primary">
                                  Excess 
                                </span>
                              );
                            })()
                          : ""}
                      </td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No stock items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
