import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import {
  exportDetailedStockPDF,
  exportDetailedStockExcel
} from "../utils/exportDetailedStockReport";


export default function DetailedStockReport({
  stockItemId,
  onClose,
} = {}) {
  const [item, setItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!stockItemId) {
      setError("Stock item not selected.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    Promise.all([
      api.getStockItemById(stockItemId),
      api.getStockItemTransactions(stockItemId),
    ])
      .then(([stockItem, stockTransactions]) => {
        setItem(stockItem);
        setTransactions(stockTransactions || []);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load detailed stock report.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stockItemId]);

  const displayRows = useMemo(() => {
    if (!item) return [];

    const openingQty = Number(item.opening_qty) || 0;

    const getTransactionDate = (transaction) => {
      if (!transaction.transaction_date) return null;

      const date = new Date(transaction.transaction_date);

      if (Number.isNaN(date.getTime())) {
        return null;
      }

      return date;
    };

    // -----------------------------------------
    // Calculate opening balance
    // -----------------------------------------

    let openingBalance = openingQty;

    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`);

      transactions.forEach((transaction) => {
        const transactionDate = getTransactionDate(transaction);

        if (transactionDate && transactionDate < from) {
          openingBalance +=
            (Number(transaction.inward_qty) || 0) -
            (Number(transaction.outward_qty) || 0);
        }
      });
    }

    // -----------------------------------------
    // Filter transactions
    // -----------------------------------------

    const filteredTransactions = transactions.filter((transaction) => {
      const transactionDate = getTransactionDate(transaction);

      if (!transactionDate) {
        return false;
      }

      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`);

        if (transactionDate < from) {
          return false;
        }
      }

      if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999`);

        if (transactionDate > to) {
          return false;
        }
      }

      return true;
    });

    // -----------------------------------------
    // Recalculate running balance
    // -----------------------------------------

    let runningBalance = openingBalance;

    const filteredRows = filteredTransactions.map((transaction) => {
      runningBalance +=
        (Number(transaction.inward_qty) || 0) -
        (Number(transaction.outward_qty) || 0);

      return {
        ...transaction,
        balance_qty: runningBalance,
      };
    });

    // -----------------------------------------
    // Opening row
    // -----------------------------------------

    const openingRow = {
      transaction_date: null,
      transaction_type: fromDate
        ? "Opening Balance"
        : "Opening Stock",
      reference_no: null,
      inward_qty: openingBalance,
      outward_qty: 0,
      unit: item.unit,
      reason: null,
      remarks: null,
      balance_qty: openingBalance,
    };

    return [openingRow, ...filteredRows];
  }, [item, transactions, fromDate, toDate]);

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN");
  };

  const formatQty = (value) => {
    const number = Number(value) || 0;

    return number.toLocaleString("en-IN", {
      maximumFractionDigits: 3,
    });
  };


 const exportPdf = () => {
  exportDetailedStockPDF({
    item,
    rows: displayRows,
    filename: `${
      item?.item_name || "stock-item"
    }-detailed-stock-report.pdf`,
  });
};

const exportExcel = () => {
  exportDetailedStockExcel({
    item,
    rows: displayRows,
    filename: `${
      item?.item_name || "stock-item"
    }-detailed-stock-report.xlsx`,
  });
};

  // -----------------------------------------
  // LOADING
  // -----------------------------------------

  if (loading) {
    return (
      <div className="page-shell">
        <div className="content-card">
          <div className="text-center py-5">
            Loading detailed stock report...
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // ERROR
  // -----------------------------------------

  if (error) {
    return (
      <div className="page-shell">
        <h2>Detailed Stock Report</h2>

        <div className="alert alert-danger">
          {error}
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }

  // -----------------------------------------
  // MAIN PAGE
  // -----------------------------------------

  return (
    <div className="page-shell">

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">
            Detailed Stock Report
          </h2>

          {item && (
            <div className="text-muted">
              Stock Item:{" "}
              <strong>{item.item_name}</strong>
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>

          <button
            type="button"
            className="btn btn-outline-primary ms-2"
            onClick={exportPdf}
          >
            Export PDF
          </button>

          <button
            type="button"
            className="btn btn-outline-success ms-2"
            onClick={exportExcel}
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* DATE FILTER */}

      <div className="card shadow-sm mb-4">
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
                onChange={(event) =>
                  setFromDate(event.target.value)
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
                onChange={(event) =>
                  setToDate(event.target.value)
                }
              />
            </div>

            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
              >
                Clear
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* STOCK ITEM INFORMATION */}

      {item && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">

              <div className="col-md-3">
                <div className="text-muted small">
                  Stock Item
                </div>

                <div className="fw-semibold">
                  {item.item_name}
                </div>
              </div>

              <div className="col-md-3">
                <div className="text-muted small">
                  Group
                </div>

                <div className="fw-semibold">
                  {item.stock_group}
                </div>
              </div>

              <div className="col-md-3">
                <div className="text-muted small">
                  Unit
                </div>

                <div className="fw-semibold">
                  {item.unit}
                </div>
              </div>

              <div className="col-md-3">
                <div className="text-muted small">
                  Opening Stock
                </div>

                <div className="fw-semibold">
                  {formatQty(item.opening_qty)}{" "}
                  {item.unit}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* STOCK MOVEMENT */}

      <div className="card shadow-sm">

        <div className="card-header bg-secondary text-white">
          <strong>
            Stock Movement - Entry Wise
          </strong>
        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-hover mb-0 align-middle">

            <thead className="table-light">

              <tr>

                <th style={{ width: "110px" }}>
                  Date
                </th>

                <th>
                  Particulars
                </th>

                <th style={{ width: "140px" }}>
                  Reference
                </th>

                <th
                  className="text-end"
                  style={{ width: "130px" }}
                >
                  Inward
                </th>

                <th
                  className="text-end"
                  style={{ width: "130px" }}
                >
                  Outward
                </th>

                <th
                  className="text-end"
                  style={{ width: "140px" }}
                >
                  Balance
                </th>

                

                <th>
                  Reason / Remarks
                </th>

              </tr>

            </thead>

            <tbody>

              {displayRows.length === 0 ? (

                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-4"
                  >
                    No stock entries found.
                  </td>
                </tr>

              ) : (

                displayRows.map((row, index) => (

                  <tr
                    key={`${row.transaction_type}-${row.transaction_date}-${index}`}
                  >

                    <td>
                      {row.transaction_date
                        ? formatDate(row.transaction_date)
                        : "-"}
                    </td>

                    <td>
                      <strong>
                        {row.transaction_type}
                      </strong>
                    </td>

                    <td>
                      {row.reference_no || "-"}
                    </td>

                    <td className="text-end">

                      {Number(row.inward_qty) > 0
                        ? `${formatQty(row.inward_qty)} ${row.unit}`
                        : "-"}

                    </td>

                    <td className="text-end">

                      {Number(row.outward_qty) > 0
                          ? `${formatQty(row.outward_qty)} ${row.unit}`
                        : "-"}

                    </td>

                    <td className="text-end fw-semibold">
                       {Number(row.balance_qty)
    ? `${formatQty(row.balance_qty)} ${row.unit}`
    : "-"}
                      
                    </td>

                    

                    <td>
                      {row.reason ||
                        row.remarks ||
                        "-"}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}