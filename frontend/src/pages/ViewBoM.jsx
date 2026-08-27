import React, { useEffect, useState } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

export default function ViewBoM({ bomId, onClose }) {
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("");

  const [bomName, setBomName] = useState("");
  const [finishedProductId, setFinishedProductId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [unit, setUnit] = useState("");

  const [consumption, setConsumption] = useState([]);

  const [stockItems, setStockItems] = useState([]);
  const [bomStockGroups, setBomStockGroups] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const loadBOM = async () => {
      try {
        setLoading(true);

        const [bomData, items, groups] = await Promise.all([
          api.getBOM(bomId),
          api.getStockItems(),
          api.getBOMStockGroupSettings(),
        ]);

        setBom(bomData);
        setStockItems(items || []);
        setBomStockGroups(groups || []);
      } catch (error) {
        console.error("Failed to load BOM:", error);
      } finally {
        setLoading(false);
      }
    };

    if (bomId) {
      loadBOM();
    }
  }, [bomId]);

  const allowedBOMGroupNames = new Set(
    bomStockGroups
      .filter((group) => Boolean(group.available_for_bom))
      .map((group) => group.name)
  );

  const finishedProducts = stockItems.filter((item) =>
    allowedBOMGroupNames.has(item.stock_group)
  );

  const consumptionItems = stockItems.filter(
    (item) => item.stock_group !== "Finished Goods"
  );

  const getItemUnit = (itemId) => {
    const item = stockItems.find(
      (stockItem) => String(stockItem.id) === String(itemId)
    );

    return item?.unit || "";
  };

  const startEditing = () => {
    setBomName(bom.bom_name || "");
    setFinishedProductId(String(bom.finished_product_id || ""));
    setOutputQty(bom.output_qty ?? "");
    setUnit(bom.unit || "");

    setConsumption(
      (bom.consumption || []).map((item) => ({
        stockItemId: String(item.stock_item_id || ""),
        quantity: item.quantity ?? "",
        unit: item.unit || "",
      }))
    );

    setFeedback("");
    setFeedbackType("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFeedback("");
    setFeedbackType("");
  };

  const addConsumption = () => {
    setConsumption((current) => [
      ...current,
      {
        stockItemId: "",
        quantity: "",
        unit: "",
      },
    ]);
  };

  const removeConsumption = (index) => {
    setConsumption((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const updateConsumptionItem = (index, field, value) => {
    setConsumption((current) =>
      current.map((item, i) => {
        if (i !== index) {
          return item;
        }

        if (field === "stockItemId") {
          return {
            ...item,
            stockItemId: value,
            unit: getItemUnit(value),
          };
        }

        return {
          ...item,
          [field]: value,
        };
      })
    );
  };

  const handleUpdate = async () => {
    setFeedback("");

    if (!bomName.trim()) {
      setFeedback("Please enter BOM name.");
      setFeedbackType("danger");
      return;
    }

    if (!finishedProductId) {
      setFeedback("Please select Finished Product.");
      setFeedbackType("danger");
      return;
    }

    if (!outputQty || Number(outputQty) <= 0) {
      setFeedback("Please enter a valid Output Quantity.");
      setFeedbackType("danger");
      return;
    }

    const validConsumption = consumption.filter(
      (item) =>
        item.stockItemId &&
        Number(item.quantity) > 0
    );

    if (validConsumption.length === 0) {
      setFeedback("Please add at least one consumption item.");
      setFeedbackType("danger");
      return;
    }

    try {
      setSaving(true);

      await api.updateBOM({
        bomId: Number(bomId),
        bomName: bomName.trim(),
        finishedProductId: Number(finishedProductId),
        outputQty: Number(outputQty),
        unit,
        consumption: validConsumption.map((item) => ({
          stockItemId: Number(item.stockItemId),
          quantity: Number(item.quantity),
          unit: item.unit,
        })),
      });

      const updatedBom = await api.getBOM(bomId);

      setBom(updatedBom);

      setFeedback("BOM updated successfully.");
      setFeedbackType("success");

      setEditing(false);
    } catch (error) {
      console.error("Failed to update BOM:", error);

      setFeedback("Failed to update BOM.");
      setFeedbackType("danger");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
  try {
    setFeedback("");
    setShowDeleteModal(false);

    await api.deleteBOM(bomId);

    setFeedback("BOM deleted successfully.");
    setFeedbackType("success");

    
      onClose();
    
  } catch (error) {
    console.error("Failed to delete BOM:", error);

    setFeedback("Failed to delete BOM.");
    setFeedbackType("danger");
  }
};

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="text-center py-4">
          Loading BOM...
        </div>
      </div>
    );
  }

  if (!bom) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">
          BOM not found.
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          {editing ? "Edit BOM" : "View BOM"}
        </h4>

        <div className="d-flex gap-2">
          {!editing ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={startEditing}
            >
              Edit
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpdate}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Back
          </button>
          <button
  type="button"
  className="btn btn-danger"
  onClick={() => setShowDeleteModal(true)}
>
  Delete
</button>
        </div>
      </div>

      {feedback && (
        <div
          className={`alert alert-${feedbackType}`}
          role="alert"
        >
          {feedback}
        </div>
      )}

      {/* BOM Details */}
      <div className="card mb-3">
        <div className="card-header">
          <strong>BOM Details</strong>
        </div>

        <div className="card-body">
          {/* BOM Name */}
          <div className="row mb-3">
            <label className="col-md-3 col-form-label">
              BOM Name
            </label>

            <div className="col-md-6">
              {editing ? (
                <input
                  type="text"
                  className="form-control"
                  value={bomName}
                  onChange={(e) =>
                    setBomName(e.target.value)
                  }
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  value={bom.bom_name || ""}
                  readOnly
                />
              )}
            </div>
          </div>

          {/* Finished Product */}
          <div className="row mb-3">
            <label className="col-md-3 col-form-label">
              Finished Product
            </label>

            <div className="col-md-6">
              {editing ? (
                <select
                  className="form-select"
                  value={finishedProductId}
                  onChange={(e) => {
                    const value = e.target.value;

                    setFinishedProductId(value);
                    setUnit(getItemUnit(value));
                  }}
                >
                  <option value="">
                    Select Finished Product
                  </option>

                  {finishedProducts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  value={bom.finished_product || ""}
                  readOnly
                />
              )}
            </div>
          </div>

          {/* Output Quantity */}
          <div className="row mb-3">
            <label className="col-md-3 col-form-label">
              Output Quantity
            </label>

            <div className="col-md-3">
              {editing ? (
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={outputQty}
                  onChange={(e) =>
                    setOutputQty(e.target.value)
                  }
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  value={bom.output_qty ?? ""}
                  readOnly
                />
              )}
            </div>
          </div>

          {/* Unit */}
          <div className="row">
            <label className="col-md-3 col-form-label">
              Unit
            </label>

            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                value={editing ? unit : bom.unit || ""}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {/* Consumption */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Consumption</strong>

          {editing && (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addConsumption}
            >
              + Add Consumption
            </button>
          )}
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Stock Item</th>
                  <th className="text-end">
                    Quantity
                  </th>
                  <th>Unit</th>

                  {editing && (
                    <th
                      className="text-center"
                      style={{ width: "100px" }}
                    >
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {!editing ? (
                  bom.consumption?.length > 0 ? (
                    bom.consumption.map((item) => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>

                        <td className="text-end">
                          {item.quantity}
                        </td>

                        <td>{item.unit}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="text-center text-muted py-4"
                      >
                        No consumption items.
                      </td>
                    </tr>
                  )
                ) : consumption.length > 0 ? (
                  consumption.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-select"
                          value={item.stockItemId}
                          onChange={(e) =>
                            updateConsumptionItem(
                              index,
                              "stockItemId",
                              e.target.value
                            )
                          }
                        >
                          <option value="">
                            Select Stock Item
                          </option>

                          {consumptionItems.map(
                            (stockItem) => (
                              <option
                                key={stockItem.id}
                                value={stockItem.id}
                              >
                                {stockItem.item_name}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control text-end"
                          value={item.quantity}
                          onChange={(e) =>
                            updateConsumptionItem(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.unit}
                          readOnly
                        />
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removeConsumption(index)
                          }
                          disabled={
                            consumption.length === 1
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="text-center text-muted py-4"
                    >
                      No consumption items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showDeleteModal && (
  <div
    className="modal d-block"
    tabIndex="-1"
    role="dialog"
    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
  >
    <div className="modal-dialog modal-dialog-centered" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Delete BOM</h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => setShowDeleteModal(false)}
          ></button>
        </div>

        <div className="modal-body">
          <p className="mb-0">
            Are you sure you want to delete this BOM?
          </p>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-danger"
             onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );}