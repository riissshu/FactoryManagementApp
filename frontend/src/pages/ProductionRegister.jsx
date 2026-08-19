import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function ProductionRegister({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    loadProduction();
  }, []);

  useEffect(() => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be later than To Date.");
    } else {
      setDateError("");
    }
  }, [fromDate, toDate]);

  const loadProduction = async () => {
    try {
      const data = await api.getProductionRegister();
      setEntries(data);
    } catch (error) {
      console.error("Unable to load production register:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const formatQty = (qty) => {
    return Number(qty).toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });
  };

  const filteredEntries =
    fromDate && toDate && fromDate > toDate
      ? []
      : entries.filter((entry) => {
          if (fromDate && entry.report_date < fromDate) {
            return false;
          }

          if (toDate && entry.report_date > toDate) {
            return false;
          }

          return true;
        });

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Production Register</h4>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Back
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <label className="form-label mb-1">From Date</label>

          <input
            type="date"
            className="form-control"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <label className="form-label mb-1">To Date</label>

          <input
            type="date"
            className="form-control"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {dateError && (
        <div className="alert alert-danger py-2">
          {dateError}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          Loading production entries...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5 text-muted">
            No production entries found for the selected date range.
          </div>
        </div>
      ) : (
        filteredEntries.map((entry, index) => {
          const maxRows = Math.max(
            entry.consumption.length,
            entry.production.length
          );

          const consumptionTotal = entry.consumption.reduce(
            (total, item) => total + Number(item.qty || 0),
            0
          );

          const productionTotal = entry.production.reduce(
            (total, item) => total + Number(item.qty || 0),
            0
          );

          return (
            <div
              className="card shadow-sm mb-4"
              key={entry.manufacturing_id}
            >
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Production Entry {index + 1}</strong>

                <span>
                  Date: {formatDate(entry.report_date)}
                </span>
              </div>

              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th
                          colSpan="2"
                          className="text-center"
                        >
                          Consumption
                        </th>

                        <th
                          colSpan="2"
                          className="text-center"
                        >
                          Production / Loss
                        </th>
                      </tr>

                      <tr>
                        <th>Stock Item</th>
                        
                        <th className="text-end">Quantity</th>

                        <th>Stock Item</th>
                       
                        <th className="text-end">Quantity</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.from({ length: maxRows }).map(
                        (_, rowIndex) => {
                          const consumption =
                            entry.consumption[rowIndex];

                          const production =
                            entry.production[rowIndex];

                          return (
                            <tr key={rowIndex}>
                              <td>
                                {consumption?.item_name || ""}
                              </td>

                             

                              <td className="text-end">
                                {consumption
                                  ? `${formatQty(consumption.qty)} ${consumption?.unit || ""}`
                                  : ""}
                              </td>

                              <td>
                                {production?.item_name || ""}
                              </td>

                              

                              <td className="text-end">
                                {production
                                  ? `${formatQty(production.qty)}  ${production?.unit || ""}` 
                                  : ""}
                              </td>
                            </tr>
                          );
                        }
                      )}

                      <tr className="table-light fw-semibold">
                        <td colSpan="1" className="text-end">
                          Total Consumption
                        </td>

                        <td className="text-end">
                          {formatQty(consumptionTotal)} 
                        </td>

                        <td colSpan="1" className="text-end">
                          Total Production
                        </td>

                        <td className="text-end">
                          {formatQty(productionTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}