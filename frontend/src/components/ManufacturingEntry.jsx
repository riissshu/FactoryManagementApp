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
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [boms, setBoms] = useState([]);
  const [loadingBOMs, setLoadingBOMs] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState(null);
  const [bomOutputQty, setBomOutputQty] = useState(null);
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [pendingProductionQty, setPendingProductionQty] = useState("");

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

  const openBOMModal = async () => {
    try {
      setLoadingBOMs(true);
      setShowBOMModal(true);

      const data = await api.getBOMs();

      setBoms(data || []);
    } catch (error) {
      console.error("Failed to load BOMs:", error);
    } finally {
      setLoadingBOMs(false);
    }
  };

  const selectBOM = async (bomId) => {
    try {
      const data = await api.getBOM(bomId);

      setSelectedBOM(data);
      setBomOutputQty(Number(data.output_qty));

      setForm({
        consumption:
          data.consumption?.length > 0
            ? data.consumption.map((row) => ({
                item: String(row.stock_item_id),
                qty: row.quantity,
                unit: row.unit || "",
              }))
            : [blankRow()],

        production: [
          {
            item: String(data.finished_product_id),
            qty: data.output_qty,
            unit: data.unit || "",
          },
        ],
      });

      setShowBOMModal(false);
    } catch (error) {
      console.error("Failed to load selected BOM:", error);
    }
  };

  const updateProductionQty = (value) => {
    setForm((current) => ({
      ...current,
      production: [
        {
          ...current.production[0],
          qty: value,
        },
      ],
    }));
  };

  const checkProductionQtyChange = () => {
    if (!selectedBOM || !bomOutputQty || Number(bomOutputQty) <= 0) {
      return;
    }

    const currentQty = Number(form.production[0]?.qty);

    if (!currentQty || currentQty <= 0) {
      return;
    }

    setPendingProductionQty(form.production[0]?.qty ?? "");
    setShowRecalculateModal(true);
  };

  const confirmRecalculate = () => {
    const value = pendingProductionQty;

    setForm((current) => {
      const factor = Number(value) / Number(bomOutputQty);

      const updatedConsumption = current.consumption.map((row, index) => {
        const bomRow = selectedBOM?.consumption?.[index];

        if (!bomRow) {
          return row;
        }

        return {
          ...row,
          qty: value === "" ? "" : Number(bomRow.quantity) * factor,
        };
      });

      return {
        ...current,
        production: [
          {
            ...current.production[0],
            qty: value,
          },
        ],
        consumption: updatedConsumption,
      };
    });

    setShowRecalculateModal(false);
    setPendingProductionQty("");
  };

  const keepExistingConsumption = () => {
    setForm((current) => ({
      ...current,
      production: [
        {
          ...current.production[0],
          qty: pendingProductionQty,
        },
      ],
    }));

    setShowRecalculateModal(false);
    setPendingProductionQty("");
  };

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

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={openBOMModal}
              >
                Paste from BOM
              </button>
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
                              onBlur={checkProductionQtyChange}
                              onChange={(e) => {
                                if (selectedBOM) {
                                  updateProductionQty(e.target.value);
                                } else {
                                  updateItem(
                                    "production",
                                    index,
                                    "qty",
                                    e.target.value,
                                  );
                                }
                              }}
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
                  {/* INLINE CONFIRMATION BLOCK  */}

                  {/* {showRecalculateModal && (
                    <div className=" d-flex justify-content-between align-items-center mt-3 mb-3">
                      <div>
                        <strong>Production quantity changed.</strong>
                        <div>
                          Do you want to recalculate consumption quantities
                          based on the BOM?
                        </div>
                      </div>

                      <div className="d-flex gap-2 ms-3">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={keepExistingConsumption}
                        >
                          No
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={confirmRecalculate}
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  )} */}


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
                <h5 className="modal-title">Paste from Clipboard</h5>

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
                    <div className="fw-semibold mb-2">Production Entries</div>

                    {compatibleClipboardItems.map((item) => (
                      <div
                        key={item.id}
                        className="d-flex justify-content-between align-items-center border rounded p-3 mb-2"
                      >
                        <div>
                          <div className="fw-semibold">{item.title}</div>

                          <small className="text-muted">Production</small>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => pasteProductionFromClipboard(item)}
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
                          <div className="fw-semibold">{item.title}</div>

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

      {showBOMModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Select BOM</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowBOMModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {loadingBOMs ? (
                  <div className="text-center py-4">Loading BOMs...</div>
                ) : boms.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    No BOMs available.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Finished Product</th>
                          <th>BOM Name</th>
                          <th className="text-end">Output Qty</th>
                          <th>Unit</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {boms.map((bom) => (
                          <tr key={bom.id}>
                            <td>{bom.finished_product}</td>
                            <td>{bom.bom_name}</td>
                            <td className="text-end">{bom.output_qty}</td>
                            <td>{bom.unit}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => selectBOM(bom.id)}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBOMModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecalculateModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Recalculate Consumption</h5>
              </div>

              <div className="modal-body">
                <p className="mb-0">
                  Production quantity has changed.
                  <br />
                  Do you want to recalculate consumption quantities based on the
                  BOM?
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={keepExistingConsumption}
                >
                  No
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmRecalculate}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
