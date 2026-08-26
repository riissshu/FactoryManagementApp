import React, { useEffect, useState } from "react";
import api from "../services/api";

const blankRow = () => ({
  item: "",
  qty: "",
  unit: "",
});

const blankEntry = () => ({
  consumption: [blankRow()],
  production: [blankRow()],
});

const getQtyInKgs = (row, stockItems) => {
  const item = stockItems.find(
    (stockItem) => stockItem.id === Number(row.item),
  );

  if (!item || item.stock_group === "Packaging Material") {
    return 0;
  }

  const qty = Number(row.qty) || 0;

  // Primary unit is Kgs
  if (item.unit === "Kgs") {
    return qty;
  }

  // Alternate unit is Kgs
  if (item.alternate_unit === "Kgs") {
    return qty * (Number(item.conversion) || 0);
  }

  return 0;
};

const sumInKgs = (rows, stockItems) =>
  rows.reduce((total, row) => total + getQtyInKgs(row, stockItems), 0);

export default function ManufacturingEntry({
  stockItems,
  entry,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(blankEntry());

  const [showClipboard, setShowClipboard] = useState(false);
const [clipboardItems, setClipboardItems] = useState([]);

  useEffect(() => {
    if (entry) {
      setForm({
        consumption: entry.consumption?.length
          ? entry.consumption.map((row) => ({
              ...row,
            }))
          : [blankRow()],

        production: entry.production?.length
          ? entry.production.map((row) => ({
              ...row,
            }))
          : [blankRow()],
      });
    } else {
      setForm(blankEntry());
    }
  }, [entry]);

  const openClipboard = async () => {
  try {
    const items = await api.getClipboard();
    setClipboardItems(items || []);
    setShowClipboard(true);
  } catch (error) {
    console.error("Unable to load Clipboard:", error);
  }
};

const compatibleClipboardItems = clipboardItems.filter(
  (item) => item.entry_type === "production",
);

const incompatibleClipboardItems = clipboardItems.filter(
  (item) => item.entry_type !== "production",
);

const pasteProductionFromClipboard = (item) => {
  setForm({
    consumption:
      item.data.consumption?.length > 0
        ? item.data.consumption.map((row) => ({
            item: row.item,
            qty: row.qty,
            unit: row.unit,
          }))
        : [blankRow()],

    production:
      item.data.production?.length > 0
        ? item.data.production.map((row) => ({
            item: row.item,
            qty: row.qty,
            unit: row.unit,
          }))
        : [blankRow()],
  });

  setShowClipboard(false);
};

  const updateItem = (side, index, field, value) => {
    setForm((prev) => ({
      ...prev,
      [side]: prev[side].map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "item"
                ? {
                    unit:
                      stockItems.find((item) => item.id === Number(value))
                        ?.unit || "",
                  }
                : {}),
            }
          : row,
      ),
    }));
  };

  const addRow = (side) => {
    setForm((prev) => ({
      ...prev,
      [side]: [...prev[side], blankRow()],
    }));
  };

  const removeRow = (side, index) => {
    setForm((prev) => ({
      ...prev,
      [side]:
        prev[side].length > 1
          ? prev[side].filter((_, i) => i !== index)
          : prev[side],
    }));
  };

  const save = () => {
    const consumption = form.consumption.filter(
      (row) => row.item && Number(row.qty) > 0,
    );

    const production = form.production.filter(
      (row) => row.item && Number(row.qty) > 0,
    );

    if (!consumption.length) {
      return;
    }

    if (!production.length) {
      return;
    }

    onSave({
      consumption,
      production,
    });
  };

  const consumptionTotal = sumInKgs(form.consumption, stockItems);

  const productionTotal = sumInKgs(form.production, stockItems);

  const difference = consumptionTotal - productionTotal;

  return (
    <div
      className="modal fade show d-block"
      style={{
        backgroundColor: "rgba(0,0,0,.5)",
      }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">
              {entry ? "Edit Manufacturing" : "Add Manufacturing"}
            </h5>

            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
  <div>
    <strong>Production Status: </strong>

    {difference === 0 ? (
      <span className="badge text-bg-success">Balanced</span>
    ) : difference > 0 ? (
      <span className="badge text-bg-warning">
        {difference.toFixed(2)} loss to record
      </span>
    ) : (
      <span className="badge text-bg-danger">
        {Math.abs(difference).toFixed(2)} over production
      </span>
    )}
  </div>

  {!entry && (
    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={openClipboard}
    >
      <i className="bi bi-clipboard me-1"></i>
      Paste from Clipboard
    </button>
  )}
</div>

            <div className="row g-4">
              {/* CONSUMPTION */}

              <div className="col-lg-6">
                <div className="border rounded-3 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-0">Consumption</h5>

                      <small className="text-muted">
                        Total: {consumptionTotal.toFixed(2)}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => addRow("consumption")}
                    >
                      + Add Item
                    </button>
                  </div>

                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.consumption.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              className="form-select"
                              value={row.item}
                              onChange={(e) =>
                                updateItem(
                                  "consumption",
                                  index,
                                  "item",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select item</option>

                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td
                            style={{
                              width: 120,
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              value={row.qty}
                              onChange={(e) =>
                                updateItem(
                                  "consumption",
                                  index,
                                  "qty",
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td>{row.unit || "-"}</td>

                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeRow("consumption", index)}
                            >
                              −
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRODUCTION */}

              <div className="col-lg-6">
                <div className="border rounded-3 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="fw-bold mb-0">Production</h5>

                      <small className="text-muted">
                        Total: {productionTotal.toFixed(2)}
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => addRow("production")}
                    >
                      + Add Item
                    </button>
                  </div>

                  <table className="table align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.production.map((row, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              className="form-select"
                              value={row.item}
                              onChange={(e) =>
                                updateItem(
                                  "production",
                                  index,
                                  "item",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select item</option>

                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td
                            style={{
                              width: 120,
                            }}
                          >
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              value={row.qty}
                              onChange={(e) =>
                                updateItem(
                                  "production",
                                  index,
                                  "qty",
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td>{row.unit || "-"}</td>

                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeRow("production", index)}
                            >
                              −
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Cancel
            </button>

            <button type="button" className="btn btn-primary" onClick={save}>
              Save Manufacturing
            </button>
          </div>
        </div>
      </div>

                      {showClipboard && (
  <div
    className="modal fade show d-block"
    tabIndex="-1"
    style={{
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">

        <div className="modal-header">
          <h5 className="modal-title">
            Paste from Clipboard
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => setShowClipboard(false)}
          />
        </div>

        <div className="modal-body">

          {compatibleClipboardItems.length === 0 &&
            incompatibleClipboardItems.length === 0 && (
              <div className="text-center text-muted py-4">
                Clipboard is empty.
              </div>
            )}

          {compatibleClipboardItems.length > 0 && (
            <>
              <div className="fw-semibold mb-2">
                Production Entries
              </div>

              {compatibleClipboardItems.map((item) => (
                <div
                  key={item.id}
                  className="d-flex justify-content-between align-items-center border rounded p-3 mb-2"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.title}
                    </div>

                    <small className="text-muted">
                      Production
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      pasteProductionFromClipboard(item)
                    }
                  >
                    Paste
                  </button>
                </div>
              ))}
            </>
          )}

          {incompatibleClipboardItems.length > 0 && (
            <>
              <hr />

              <div className="text-muted fw-semibold mb-2">
                Other copied entries
              </div>

              {incompatibleClipboardItems.map((item) => (
                <div
                  key={item.id}
                  className="d-flex justify-content-between align-items-center border rounded p-3 mb-2 text-muted bg-light"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.title}
                    </div>

                    <small>
                      {item.entry_type === "purchase"
                        ? "Purchase"
                        : item.entry_type === "dispatch"
                        ? "Dispatch"
                        : item.entry_type}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled
                  >
                    Not compatible
                  </button>
                </div>
              ))}
            </>
          )}

        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowClipboard(false)}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  </div>
)}

    </div>
  );
}
