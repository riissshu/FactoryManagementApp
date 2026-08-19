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
  const [isCreating, setIsCreating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-");
    return `${day}-${month}-${year}`;
  };

  const getDayName = (dateString) => {
    if (!dateString) return "";

    const [year, month, day] = dateString.split("-");
    const dateObj = new Date(year, month - 1, day);

    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-start mb-2">
        {/* Page Header */}
        <div>
          <h4 className="mb-1">Weekly Report</h4>
          <p className="text-muted mb-0">Physical Stock Verification</p>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];

              setDate(today);
              setIsCreating(true);
              setIsSaved(false);
            }}
            disabled={isCreating}
          >
            Create
          </button>

          <button
            type="button"
            className="btn btn-sm btn-success"
            onClick={() => setIsSaved(true)}
            disabled={!isCreating || isSaved}
          >
            Save
          </button>

          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={() => setIsSaved(false)}
            disabled={!isSaved}
          >
            Edit
          </button>

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
      </div>

      {/* Stock Tabs */}
      <div className="card shadow-sm">
        <div className="card-body">
          {/* <ul className="nav nav-tabs mb-4">
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
          </ul> */}

          <div className="d-flex justify-content-between align-items-end mb-4">
            {/* Tabs */}
            <ul className="nav nav-tabs mb-0">
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

            {/* Date */}
            <div>
              <label className="form-label fw-semibold mb-1">Report Date</label>

              {isCreating && !isSaved ? (
                <div className="form-control" style={{ width: "180px" }}>
                  {date ? formatDate(date) : ""} {date ? getDayName(date) : ""}
                </div>
              ) : isSaved ? (
                <div className="form-control" style={{ width: "180px" }}>
                  {date ? formatDate(date) : ""} {date ? getDayName(date) : ""}
                </div>
              ) : (
                <div style={{ width: "180px", height: "38px" }}></div>
              )}
            </div>
          </div>

          {activeTab === "Packaging Material" && (
            <div className="alert alert-success d-flex align-items-center py-2 px-3 mb-3">
              <span className="me-2">📝</span>
              <span className="text-muted fst-italic">
                <strong className="fst-normal">Note:</strong> &nbsp; Please
                enter the physical stock of packing materials as per actual
                stock available. If you not want to count each manually.
              </span>
            </div>
          )}

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

                      <td className="text-end">
                        {row.balance_qty} {row.unit}
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
                        {isCreating && !isSaved ? (
                          <>
                            <div className="input-group">
                              <input
                                type="number"
                                className="form-control"
                                placeholder="Enter physical stock"
                                value={physicalStock[row.id] ?? ""}
                                onChange={(e) =>
                                  handlePhysicalStockChange(
                                    row.id,
                                    e.target.value,
                                  )
                                }
                              />
                              <span className="input-group-text">
                                {row.unit}
                              </span>
                            </div>

                            <div className="d-block text-center">
                              {row.unit &&
                                row.alternate_unit &&
                                row.conversion > 0 &&
                                physicalStock[row.id] > 0 &&
                                row.balance_qty > 0 && (
                                  <small className="text-muted">
                                    ({physicalStock[row.id] * row.conversion}{" "}
                                    {row.alternate_unit})
                                  </small>
                                )}
                            </div>
                          </>
                        ) : isSaved ? (
                          <div className="text-end">
                            {physicalStock[row.id] !== undefined &&
                            physicalStock[row.id] !== "" ? (
                              <>
                                {physicalStock[row.id]} {row.unit}
                                {row.unit &&
                                  row.alternate_unit &&
                                  row.conversion > 0 &&
                                  physicalStock[row.id] > 0 && (
                                    <div>
                                      <small className="text-muted">
                                        (
                                        {physicalStock[row.id] * row.conversion}{" "}
                                        {row.alternate_unit})
                                      </small>
                                    </div>
                                  )}
                              </>
                            ) : (
                              ""
                            )}
                          </div>
                        ) : null}
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
                                  <span className="text-danger">Short</span>
                                );
                              }

                              return (
                                <span className="text-primary">Excess</span>
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
