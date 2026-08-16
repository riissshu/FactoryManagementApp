import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function StockAdjustment({ onClose }) {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [stockItems, setStockItems] = useState([]);
  const [stockReport, setStockReport] = useState([]);

  const [items, setItems] = useState([
    {
      stock_item_id: "",
      adjustment_type: "add",
      qty: "",
      unit: "",
      balance_qty: 0,
      reason: "",
    },
  ]);

  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reasonSuggestions = [
    "Excess Found",
    "Received Excess",
    "Damaged",
    "Wasted",
    "Lost",
    "Shortage Found",
    "Physical Stock Correction",
  ];

  useEffect(() => {
    loadStockItems();
  }, []);

  const loadStockItems = async () => {
    try {
      setLoading(true);
      setError("");

      const [itemsResult, reportResult] = await Promise.all([
        api.getStockItems(),
        api.getStockReport(),
      ]);

      setStockItems(
        (itemsResult || []).filter(
          (item) => Number(item.is_active) === 1
        )
      );

      setStockReport(reportResult || []);
    } catch (err) {
      setError(
        err?.message || "Unable to load stock items."
      );
    } finally {
      setLoading(false);
    }
  };

  const getStockItem = (stockItemId) => {
    return stockItems.find(
      (item) => Number(item.id) === Number(stockItemId)
    );
  };

  const getBalance = (stockItemId) => {
    const reportItem = stockReport.find(
      (item) => Number(item.id) === Number(stockItemId)
    );

    return reportItem
      ? Number(reportItem.balance_qty)
      : 0;
  };

  const handleItemChange = (
    index,
    field,
    value
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (field === "stock_item_id") {
          const stockItem = getStockItem(value);

          return {
            ...item,
            stock_item_id: value,
            unit: stockItem?.unit || "",
            balance_qty: getBalance(value),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      {
        stock_item_id: "",
        adjustment_type: "add",
        qty: "",
        unit: "",
        balance_qty: 0,
        reason: "",
      },
    ]);
  };

  const removeRow = (index) => {
    if (items.length === 1) return;

    setItems((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const getFinalBalance = (item) => {
    if (!item.stock_item_id || !item.qty) {
      return "";
    }

    const balance = Number(item.balance_qty) || 0;
    const qty = Number(item.qty) || 0;

    if (item.adjustment_type === "subtract") {
      return balance - qty;
    }

    return balance + qty;
  };

  const validate = () => {
    if (!date) {
      return "Please select adjustment date.";
    }

    if (!items.length) {
      return "Please add at least one stock item.";
    }

    const selectedIds = new Set();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (!item.adjustment_type) {
        return `Please select adjustment type in row ${i + 1}.`;
      }

      if (!item.stock_item_id) {
        return `Please select stock item in row ${i + 1}.`;
      }

      if (
        selectedIds.has(
          Number(item.stock_item_id)
        )
      ) {
        return "The same stock item cannot be added more than once.";
      }

      selectedIds.add(
        Number(item.stock_item_id)
      );

      if (!item.qty || Number(item.qty) <= 0) {
        return `Please enter a valid quantity in row ${i + 1}.`;
      }

      if (
        item.adjustment_type === "subtract" &&
        Number(item.qty) >
          Number(item.balance_qty)
      ) {
        const stockItem = getStockItem(
          item.stock_item_id
        );

        return `Cannot subtract ${item.qty} ${
          item.unit
        } from ${
          stockItem?.item_name || "stock item"
        }. Available balance is ${
          item.balance_qty
        } ${item.unit}.`;
      }
    }

    return "";
  };

  const handleSave = async () => {
    setMessage("");
    setError("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      await api.saveStockAdjustment({
        adjustment_date: date,
        remarks: remarks.trim(),

        items: items.map((item) => ({
          stock_item_id: Number(
            item.stock_item_id
          ),
          adjustment_type:
            item.adjustment_type,
          reason: item.reason.trim(),
          qty: Number(item.qty),
          unit: item.unit,
        })),
      });

      setMessage(
        "Stock adjustment saved successfully."
      );

      setItems([
        {
          stock_item_id: "",
          adjustment_type: "add",
          qty: "",
          unit: "",
          balance_qty: 0,
          reason: "",
        },
      ]);

      setRemarks("");

      await loadStockItems();
    } catch (err) {
      setError(
        err?.message ||
          "Unable to save stock adjustment."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">
            Stock Adjustment
          </h4>

          <small className="text-muted">
            Adjust stock for excess, damage,
            wastage, loss, etc.
          </small>
        </div>

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

      {/* Messages */}
      {message && (
        <div className="alert alert-success py-2">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2">
          {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          {/* Date */}
          <div className="row mb-4">
            <div className="col-md-3">
              <label className="form-label fw-semibold">
                Date
              </label>

              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />
            </div>
          </div>

          {/* Adjustment Table */}
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "12%" }}>
                    Adjustment Type
                  </th>

                  <th style={{ width: "25%" }}>
                    Stock Item
                  </th>

                  <th style={{ width: "15%" }}>
                    Current Balance
                  </th>

                  <th style={{ width: "13%" }}>
                    Qty
                  </th>

                  <th style={{ width: "8%" }}>
                    Unit
                  </th>

                  <th style={{ width: "15%" }}>
                    Final Balance
                  </th>

                  <th style={{ width: "18%" }}>
                    Reason
                  </th>

                  <th style={{ width: "5%" }}></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => {
                  const finalBalance =
                    getFinalBalance(item);

                  return (
                    <tr key={index}>
                      {/* Adjustment Type */}
                      <td>
                        <select
                          className="form-select"
                          value={
                            item.adjustment_type
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "adjustment_type",
                              e.target.value
                            )
                          }
                        >
                          <option value="add">
                            Add
                          </option>

                          <option value="subtract">
                            Subtract
                          </option>
                        </select>
                      </td>

                      {/* Stock Item */}
                      <td>
                        <select
                          className="form-select"
                          value={
                            item.stock_item_id
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "stock_item_id",
                              e.target.value
                            )
                          }
                          disabled={loading}
                        >
                          <option value="">
                            Select Stock Item
                          </option>

                          {stockItems.map(
                            (stockItem) => (
                              <option
                                key={
                                  stockItem.id
                                }
                                value={
                                  stockItem.id
                                }
                              >
                                {
                                  stockItem.item_name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      {/* Current Balance */}
                      <td>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control bg-light"
                            value={
                              item.stock_item_id
                                ? item.balance_qty
                                : ""
                            }
                            readOnly
                          />

                          <span className="input-group-text">
                            {item.unit || ""}
                          </span>
                        </div>
                      </td>

                      {/* Qty */}
                      <td>
                        <div className="input-group">
                          <span className="input-group-text fw-bold">
                            {item.adjustment_type ===
                            "subtract"
                              ? "−"
                              : "+"}
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-control"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "qty",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </td>

                      {/* Unit */}
                      <td>
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={item.unit}
                          readOnly
                        />
                      </td>

                      {/* Final Balance */}
                      <td>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control bg-light fw-semibold"
                            value={finalBalance}
                            readOnly
                          />

                          <span className="input-group-text">
                            {item.unit || ""}
                          </span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          list={`reason-list-${index}`}
                          value={item.reason}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "reason",
                              e.target.value
                            )
                          }
                          placeholder="Optional"
                        />

                        <datalist
                          id={`reason-list-${index}`}
                        >
                          {reasonSuggestions.map(
                            (reason) => (
                              <option
                                key={reason}
                                value={reason}
                              />
                            )
                          )}
                        </datalist>
                      </td>

                      {/* Remove */}
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() =>
                            removeRow(index)
                          }
                          disabled={
                            items.length === 1
                          }
                          title="Remove"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Item */}
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={addRow}
            >
              + Add Item
            </button>
          </div>

          {/* Overall Remarks */}
          <div className="mt-4">
            <label className="form-label fw-semibold">
              Remarks
              <span className="text-muted fw-normal">
                {" "}
                (Optional)
              </span>
            </label>

            <textarea
              className="form-control"
              rows="3"
              value={remarks}
              onChange={(e) =>
                setRemarks(e.target.value)
              }
              placeholder="Optional remarks"
            />
          </div>

          {/* Footer */}
          <div className="d-flex justify-content-end gap-2 mt-4">
            {onClose && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving
                ? "Saving..."
                : "Save Adjustment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}