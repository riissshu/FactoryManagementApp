import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function ViewEditStock({ itemId, onClose }) {
  const emptyItem = {
    id: null,
    itemName: "",
    stockGroup: "",
    unit: "",
    conversion: "",
    openingQty: "",
    lowQtyAlert: "",
  };

  const [item, setItem] = useState(emptyItem);

  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [validated, setValidated] = useState(false);

  const [hasTransactions, setHasTransactions] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [alternateEnabled, setAlternateEnabled] = useState(false);

  // --------------------------------------------------
  // Load item
  // --------------------------------------------------

  useEffect(() => {
    if (!itemId) {
      setError("Stock item ID is missing.");
      setLoading(false);
      return;
    }

    loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const [groups, unitList, stockItem] = await Promise.all([
        api.getStockGroups(),
        api.getStockUnits(),
        api.getStockItemById(itemId),
      ]);

      setStockGroups(groups || []);
      setUnits(unitList || []);

      if (!stockItem) {
        setError("Stock item not found.");
        return;
      }

      setItem({
        id: stockItem.id,
        itemName: stockItem.item_name || "",
        stockGroup: stockItem.stock_group || "",
        unit: stockItem.unit || "",
        conversion: stockItem.conversion ?? "",
        openingQty: stockItem.opening_qty ?? "",
        lowQtyAlert: stockItem.low_qty_alert ?? "",
        isActive: stockItem.is_active,
      });

      // ----------------------------------------------
      // Automatic transaction check
      // ----------------------------------------------

      const transactions =
        await api.hasStockItemTransactions(stockItem.id);

      setHasTransactions(Boolean(transactions));

      // We DO NOT automatically inactivate.
      // The user will be asked below if needed.

      if (transactions && stockItem.is_active) {
        const makeInactive = window.confirm(
          `This stock item has existing transactions.\n\n` +
          `Do you want to make "${stockItem.item_name}" inactive?`
        );

        if (makeInactive) {
          await makeInactiveItem(stockItem.id);
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        err?.message || "Unable to load stock item."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Inactivate
  // --------------------------------------------------

  const makeInactiveItem = async (id = item.id) => {
    if (!id || processing) return;

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await api.inactivateStockItem(id);

      setItem((prev) => ({
        ...prev,
        isActive: 0,
      }));

      setMessage("Item has been made inactive successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to make item inactive."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // Input change
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // Save / Edit
  // --------------------------------------------------

  const saveItem = async (e) => {
    e.preventDefault();

    if (processing) return;

    setValidated(true);
    setError("");
    setMessage("");

    if (!item.itemName || !item.stockGroup || !item.unit) {
      return;
    }

    try {
      setProcessing(true);

      // Check again before modifying.
      // This protects us if a transaction was created
      // after the page initially loaded.
      const transactions =
        await api.hasStockItemTransactions(item.id);

      if (transactions) {
        setHasTransactions(true);

        const makeInactive = window.confirm(
          `This stock item now has existing transactions.\n\n` +
          `Do you want to make "${item.itemName}" inactive?`
        );

        if (makeInactive) {
          await api.inactivateStockItem(item.id);

          setItem((prev) => ({
            ...prev,
            isActive: 0,
          }));

          setMessage(
            "Item has been made inactive successfully."
          );
        }

        return;
      }

      const alternateUnit =
        getEffectiveAlternateUnit();

      await api.updateStockItem({
        id: item.id,
        item_name: item.itemName.trim(),
        stock_group: item.stockGroup,
        unit: item.unit,
        alternate_unit: alternateUnit,
        conversion: Number(item.conversion) || 0,
        opening_qty: Number(item.openingQty) || 0,
        low_qty_alert: Number(item.lowQtyAlert) || 0,
      });

      setMessage("Item updated successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to update item."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // Delete
  // --------------------------------------------------

  const deleteItem = async () => {
    if (!item.id || processing) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.itemName}"?\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      // Check before delete.
      const transactions =
        await api.hasStockItemTransactions(item.id);

      if (transactions) {
        setHasTransactions(true);

        const makeInactive = window.confirm(
          `This item has existing transactions and cannot be deleted.\n\n` +
          `Do you want to make "${item.itemName}" inactive instead?`
        );

        if (makeInactive) {
          await api.inactivateStockItem(item.id);

          setItem((prev) => ({
            ...prev,
            isActive: 0,
          }));

          setMessage(
            "Item has been made inactive successfully."
          );
        }

        return;
      }

      await api.deleteStockItem(item.id);

      setMessage("Item deleted successfully.");

      // Give the user a moment to see the success message,
      // then return to the previous page.
      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to delete item."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // Low quantity alert
  // --------------------------------------------------

  const saveLowQtyAlertOnly = async () => {
    if (!item.id || processing) return;

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await api.updateLowQtyAlert(
        item.id,
        Number(item.lowQtyAlert) || 0
      );

      setMessage("Low stock alert updated successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to update low stock alert."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // Alternate unit
  // --------------------------------------------------

  const isPackagingMaterial =
    item.stockGroup === "Packaging Material";

  const autoAlternateOn =
    item.unit !== "" && item.unit !== "Kgs";

  const switchOn = isPackagingMaterial
    ? alternateEnabled
    : autoAlternateOn;

  const switchInteractive = isPackagingMaterial;

  const effectiveAltUnit = switchOn ? "Kgs" : "";

  const getEffectiveAlternateUnit = () => {
    return switchOn ? "Kgs" : "";
  };

  // --------------------------------------------------
  // Close
  // --------------------------------------------------

  const handleClose = () => {
    if (processing) return;

    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <div
              className="spinner-border text-primary mb-3"
              role="status"
            />

            <div>Loading stock item...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">

      {/* Header */}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="mb-1">
            Stock Item Master
          </h2>

          {item.id && (
            <small className="text-muted">
              Item ID: {item.id}
            </small>
          )}
        </div>

      </div>

      {/* Success */}

      {message && (
        <div
          className="alert alert-success"
          role="alert"
        >
          {message}
        </div>
      )}

      {/* Error */}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Transaction status */}

      {hasTransactions && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <div>
            <strong>Transaction found.</strong>
            <div className="small">
              This item has already been used in a transaction.
            </div>
          </div>

          {item.isActive === 1 && (
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => makeInactiveItem()}
              disabled={processing}
            >
              {processing
                ? "Processing..."
                : "Make Inactive"}
            </button>
          )}
        </div>
      )}

      <form
        noValidate
        className={`needs-validation ${
          validated ? "was-validated" : ""
        }`}
        onSubmit={saveItem}
      >
        <div className="card shadow-sm">
          <div className="card-body">

            <div className="row">

              {/* LEFT */}

              <div className="col-md-6">

                <div className="mb-3">
                  <label className="form-label">
                    Item Name
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="itemName"
                    value={item.itemName}
                    onChange={handleChange}
                    required
                    disabled={processing}
                  />

                  <div className="invalid-feedback">
                    Please enter Item Name.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Stock Group
                  </label>

                  <select
                    className="form-select"
                    name="stockGroup"
                    value={item.stockGroup}
                    onChange={handleChange}
                    required
                    disabled={processing}
                  >
                    <option value="">
                      Select Stock Group
                    </option>

                    {stockGroups.map((g) => (
                      <option
                        key={g.id}
                        value={g.name}
                      >
                        {g.name}
                      </option>
                    ))}
                  </select>

                  <div className="invalid-feedback">
                    Please select Stock Group.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Primary Unit
                  </label>

                  <select
                    className="form-select"
                    name="unit"
                    value={item.unit}
                    onChange={handleChange}
                    required
                    disabled={processing}
                  >
                    <option value="">
                      Select Primary Unit
                    </option>

                    {units.map((u) => (
                      <option
                        key={u.id}
                        value={u.name}
                      >
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <div className="invalid-feedback">
                    Please select Primary Unit.
                  </div>
                </div>

                <div className="row">

                  <div className="col-md-6">
                    <label className="form-label">
                      Alternate Unit
                    </label>

                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="alternateUnitSwitch"
                        checked={switchOn}
                        disabled={
                          processing ||
                          !switchInteractive
                        }
                        onChange={(e) => {
                          const enabled =
                            e.target.checked;

                          setAlternateEnabled(enabled);

                          if (!enabled) {
                            setItem((prev) => ({
                              ...prev,
                              conversion: "",
                            }));
                          }
                        }}
                      />

                      <label
                        className="form-check-label"
                        htmlFor="alternateUnitSwitch"
                      >
                        {switchOn ? "On" : "Off"}
                      </label>
                    </div>

                    <select
                      className="form-select"
                      name="altUnitDisplay"
                      value={effectiveAltUnit}
                      disabled
                    >
                      {!switchOn && (
                        <option value="">
                          -
                        </option>
                      )}

                      <option value="Kgs">
                        Kgs
                      </option>
                    </select>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Conversion
                    </label>

                    <div className="input-group has-validation">

                      <span className="input-group-text fw-bold">
                        1 {item.unit}
                      </span>

                      <span className="input-group-text">
                        =
                      </span>

                      <input
                        type="number"
                        className="form-control"
                        name="conversion"
                        value={item.conversion}
                        onChange={handleChange}
                        min="0.01"
                        step="any"
                        required={switchOn}
                        disabled={
                          processing ||
                          !switchOn
                        }
                      />

                      <span className="input-group-text fw-bold">
                        Kgs
                      </span>

                      <div className="invalid-feedback">
                        Please enter conversion value.
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT */}

              <div className="col-md-6">

                <div className="mb-3">
                  <label className="form-label">
                    Opening Stock Qty
                  </label>

                  <input
                    type="number"
                    className="form-control"
                    name="openingQty"
                    value={item.openingQty}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    disabled={processing}
                  />
                </div>

                <div className="mb-3">

                  <label className="form-label">
                    Low stock alert qty{" "}
                    <span className="text-muted">
                      (optional)
                    </span>
                  </label>

                  <div className="input-group">

                    <input
                      type="number"
                      className="form-control"
                      name="lowQtyAlert"
                      placeholder="e.g. 50"
                      value={item.lowQtyAlert}
                      onChange={handleChange}
                      min="0"
                      step="any"
                      disabled={processing}
                    />

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      title="Save just the alert quantity"
                      onClick={saveLowQtyAlertOnly}
                      disabled={
                        processing || !item.id
                      }
                    >
                      Save alert only
                    </button>

                  </div>

                  <div className="form-text">
                    Dashboard flags this item when balance
                    drops below this quantity.
                  </div>

                </div>

              </div>
            </div>

            {/* ACTIONS */}

            <div className="mt-4 pt-3 border-top d-flex gap-2">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  processing ||
                  !item.id ||
                  !item.isActive
                }
              >
                {processing
                  ? "Processing..."
                  : "Edit / Save"}
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteItem}
                disabled={
                  processing ||
                  !item.id ||
                  !item.isActive
                }
              >
                {processing
                  ? "Processing..."
                  : "Delete"}
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleClose}
                disabled={processing}
              >
                Close
              </button>

            </div>

          </div>
        </div>
      </form>
    </div>
  );
}