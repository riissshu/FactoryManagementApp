import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function PurchaseRegister({ onClose }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be later than To Date.");
    } else {
      setDateError("");
    }
  }, [fromDate, toDate]);

  const loadPurchases = async () => {
    try {
      const data = await api.getPurchaseRegister();
      setPurchases(data);
    } catch (error) {
      console.error("Unable to load purchase register:", error);
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

  const copyPurchase = async (purchase) => {
  try {
    await api.addClipboard({
      entry_type: "purchase",
      title: `Purchase - ${purchase.purchase_no}`,
      source_id: purchase.purchase_id,
      data: {
        purchaseNo: purchase.purchase_no,
          sourceReference: purchase.purchase_no,
  sourceDate: purchase.report_date,
        items: purchase.items.map((item) => ({
          item: String(item.stock_item_id),
          qty: String(item.qty),
          unit: item.unit,
        })),
      },
    });
  } catch (error) {
    console.error("Unable to copy purchase:", error);
  }
};

  const filteredPurchases =
    fromDate && toDate && fromDate > toDate
      ? []
      : purchases.filter((purchase) => {
          if (fromDate && purchase.report_date < fromDate) {
            return false;
          }

          if (toDate && purchase.report_date > toDate) {
            return false;
          }

          return true;
        });

  const groupedPurchases = [];

  filteredPurchases.forEach((purchase) => {
    const existing = groupedPurchases.find(
      (item) => item.purchase_id === purchase.purchase_id
    );

    if (existing) {
      existing.items.push(purchase);
    } else {
      groupedPurchases.push({
        purchase_id: purchase.purchase_id,
        report_date: purchase.report_date,
        purchase_no: purchase.purchase_no,
        items: [purchase],
      });
    }
  });

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Purchase Register</h4>

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
              Loading purchases...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No purchases found for the selected date range.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "140px" }}>Date</th>

                    <th style={{ width: "160px" }}>
                      Purchase No.
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
                  {groupedPurchases.map((purchase) =>
                    purchase.items.map((item, itemIndex) => (
                      <tr key={item.item_id}>
                        {itemIndex === 0 && (
                          <>
                            <td rowSpan={purchase.items.length}>
                              {formatDate(purchase.report_date)}
                            </td>

                            <td
                              rowSpan={purchase.items.length}
                              className="fw-semibold"
                            >
                              {purchase.purchase_no}
                            </td>
                          </>
                        )}

                        <td>{item.item_name}</td>

                        <td className="text-end">
                          {formatQty(item.qty)}{" "}{item.unit}
                        </td>

                        {itemIndex === 0 && (
  <td rowSpan={purchase.items.length}>
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={() => copyPurchase(purchase)}
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