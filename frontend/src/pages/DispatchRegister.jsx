import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function DispatchRegister({ onClose }) {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    loadDispatches();
  }, []);

  useEffect(() => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be later than To Date.");
    } else {
      setDateError("");
    }
  }, [fromDate, toDate]);

  const loadDispatches = async () => {
    try {
      const data = await api.getDispatchRegister();
      setDispatches(data);
    } catch (error) {
      console.error("Unable to load dispatch register:", error);
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

const copyDispatch = async (dispatch) => {
  try {
    await api.addClipboard({
      entry_type: "dispatch",
      title: `Dispatch - ${dispatch.gatepass_no}`,
      source_id: dispatch.gatepass_id,
      data: {
        gatePassNo: dispatch.gatepass_no,
          partyName: dispatch.party_name,
        sourceReference: dispatch.gatepass_no,
  sourceDate: dispatch.report_date,
        items: dispatch.items.map((row) => ({
          item: String(row.stock_item_id),
          qty: String(row.qty),
          unit: row.unit,
        })),
      },
    });
  } catch (error) {
    console.error("Unable to copy dispatch:", error);
  }
};

  const filteredDispatches =
    fromDate && toDate && fromDate > toDate
      ? []
      : dispatches.filter((dispatch) => {
          if (fromDate && dispatch.report_date < fromDate) {
            return false;
          }

          if (toDate && dispatch.report_date > toDate) {
            return false;
          }

          return true;
        });

  const groupedDispatches = [];

  filteredDispatches.forEach((dispatch) => {
    const existing = groupedDispatches.find(
      (item) => item.gatepass_id === dispatch.gatepass_id
    );

    if (existing) {
      existing.items.push(dispatch);
    } else {
      groupedDispatches.push({
        gatepass_id: dispatch.gatepass_id,
        report_date: dispatch.report_date,
        gatepass_no: dispatch.gatepass_no,
          party_name: dispatch.party_name,
        items: [dispatch],
      });
    }
  });

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Dispatch / Sales Register</h4>

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

      <div className="card shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              Loading dispatches...
            </div>
          ) : filteredDispatches.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No dispatches found for the selected date range.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "140px" }}>Date</th>

                    <th style={{ width: "160px" }}>
                      Gatepass No.
                    </th>

                    <th style={{ width: "180px" }}>
  Party Name
</th>

                    <th>Item</th>

                    <th
                      className="text-end"
                      style={{ width: "120px" }}
                    >
                      Qty
                    </th>

               <th style={{ width: "90px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {groupedDispatches.map((dispatch) =>
                    dispatch.items.map((item, itemIndex) => (
                      <tr key={item.item_id}>
                        {itemIndex === 0 && (
                          <>
                            <td rowSpan={dispatch.items.length}>
                              {formatDate(dispatch.report_date)}
                            </td>

                            <td
                              rowSpan={dispatch.items.length}
                              className="fw-semibold"
                            >
                              {dispatch.gatepass_no}
                            </td>
                            <td rowSpan={dispatch.items.length}>
  {dispatch.party_name}
</td>
                          </>
                        )}

                        <td>{item.item_name}</td>

                        <td className="text-end">
                          {formatQty(item.qty)}{" "}{item.unit}
                        </td>

                        {itemIndex === 0 && (
  <td rowSpan={dispatch.items.length}>
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={() => copyDispatch(dispatch)}
      title="Copy to Clipboard"
    >
      <i className="bi bi-clipboard me-1"></i>
      Copy
    </button>
  </td>
)}


                      </tr>
                    ))
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