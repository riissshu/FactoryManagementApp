import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function StockAdjustmentRegister({ onClose }) {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    loadAdjustments();
  }, []);

  const loadAdjustments = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await api.getStockAdjustments();

      setAdjustments(result || []);
    } catch (err) {
      setError(
        err?.message || "Unable to load stock adjustments."
      );
    } finally {
      setLoading(false);
    }
  };

  // Group item rows belonging to the same adjustment entry
  const groupedAdjustments = useMemo(() => {
    const groups = {};

    adjustments.forEach((item) => {
      const id = item.adjustment_id;

      if (!groups[id]) {
        groups[id] = {
          adjustment_id: id,
          adjustment_date: item.adjustment_date,
          remarks: item.remarks,
          items: [],
        };
      }

      groups[id].items.push(item);
    });

    return Object.values(groups).sort(
      (a, b) => b.adjustment_id - a.adjustment_id
    );
  }, [adjustments]);

  // Filter by date
  const filteredAdjustments = useMemo(() => {
    return groupedAdjustments.filter((entry) => {
      const entryDate = entry.adjustment_date;

      if (fromDate && entryDate < fromDate) {
        return false;
      }

      if (toDate && entryDate > toDate) {
        return false;
      }

      return true;
    });
  }, [groupedAdjustments, fromDate, toDate]);

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
  };

  const formatQty = (item) => {
    const qty = Number(item.qty) || 0;

    return item.adjustment_type === "subtract"
      ? `−${qty}`
      : `+${qty}`;
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">
            Stock Adjustment Register
          </h4>

          <small className="text-muted">
            View all stock adjustment entries
          </small>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={loadAdjustments}
            disabled={loading}
          >
            Refresh
          </button>

          {onClose && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Date Filter */}
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label fw-semibold">
                From Date
              </label>

              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />
            </div>

            <div className="col-md-3">
              <label className="form-label fw-semibold">
                To Date
              </label>

              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />
            </div>

            <div className="col-md-auto">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={clearDateFilter}
                disabled={!fromDate && !toDate}
              >
                Clear
              </button>
            </div>

            <div className="col-md-auto ms-md-auto">
              <span className="text-muted">
                Showing{" "}
                <strong>
                  {filteredAdjustments.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {groupedAdjustments.length}
                </strong>{" "}
                entries
              </span>
            </div>
          </div>

          {fromDate && toDate && fromDate > toDate && (
            <div className="text-danger mt-2">
              From Date cannot be later than To Date.
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger py-2">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-4">
            Loading adjustments...
          </div>
        </div>
      ) : fromDate &&
        toDate &&
        fromDate > toDate ? (
        <div className="card shadow-sm">
          <div className="card-body text-center text-muted py-4">
            Please select a valid date range.
          </div>
        </div>
      ) : filteredAdjustments.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center text-muted py-4">
            No stock adjustment entries found
            {fromDate || toDate
              ? " for the selected date range."
              : "."}
          </div>
        </div>
      ) : (
        /* Adjustment Entries */
        <div>
          {filteredAdjustments.map((entry) => (
            <div
              key={entry.adjustment_id}
              className="card shadow-sm mb-3"
            >
              {/* Entry Header */}
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>
                      Adjustment Entry #
                      {entry.adjustment_id}
                    </strong>
                  </div>

                  <div>
                    <strong>Date:</strong>{" "}
                    {entry.adjustment_date}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "15%" }}>
                          Adjustment Type
                        </th>

                        <th style={{ width: "30%" }}>
                          Stock Item
                        </th>

                        <th
                          style={{ width: "15%" }}
                          className="text-end"
                        >
                          Qty
                        </th>

                    

                        <th style={{ width: "28%" }}>
                          Reason
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {entry.items.map((item) => (
                        <tr key={item.item_id}>
                          <td>
                            {item.adjustment_type ===
                            "subtract" ? (
                              <span className="text-danger fw-semibold">
                                Subtract
                              </span>
                            ) : (
                              <span className="text-success fw-semibold">
                                Add
                              </span>
                            )}
                          </td>

                          <td>{item.item_name}</td>

                          <td className="text-end fw-semibold">
                            {formatQty(item)}{" "}{item.unit}
                          </td>

                      

                          <td>
                            {item.reason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Overall Remarks */}
              {entry.remarks && (
                <div className="card-footer">
                  <strong>Remarks:</strong>{" "}
                  {entry.remarks}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}