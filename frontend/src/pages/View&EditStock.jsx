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
    isActive: 1,
  };

  const [item, setItem] = useState(emptyItem);

  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits] = useState([]);

  const [loading, setLoading] = useState(true);

  // Used for API calls
  const [processing, setProcessing] = useState(false);

  // Specifically used while checking Edit permission
  const [checkingEdit, setCheckingEdit] = useState(false);

  const [editing, setEditing] = useState(false);

  const [validated, setValidated] = useState(false);

  const [hasTransactions, setHasTransactions] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showInactiveModal, setShowInactiveModal] = useState(false);

  const [alternateEnabled, setAlternateEnabled] =
    useState(false);

  // --------------------------------------------------
  // LOAD ITEM
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
      setEditing(false);
      setHasTransactions(false);

      const [groups, unitList, stockItem] =
        await Promise.all([
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

      // Set current alternate-unit state
      setAlternateEnabled(
        stockItem.alternate_unit === "Kgs"
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load stock item."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // EDIT BUTTON
  // --------------------------------------------------

  const handleEdit = async () => {
    // Prevent multiple clicks
    if (
      processing ||
      checkingEdit ||
      editing ||
      !item.id
    ) {
      return;
    }

    try {
      setCheckingEdit(true);
      setError("");
      setMessage("");

      // Check transaction status NOW
      const transactions =
        await api.hasStockItemTransactions(item.id);

      if (transactions) {
        setHasTransactions(true);
        setEditing(false);

        setMessage(
          "This item cannot be modified because transactions exist."
        );

        return;
      }

      // No transactions
      setHasTransactions(false);
      setEditing(true);

      setMessage("You can edit this item.");
    } catch (err) {
      console.error(
        "Unable to check stock item:",
        err
      );

      setError(
        err?.message ||
          "Unable to check whether this item can be modified."
      );
    } finally {
      setCheckingEdit(false);
    }
  };

  // --------------------------------------------------
  // INPUT CHANGE
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // SAVE ITEM
  // --------------------------------------------------

  const saveItem = async (e) => {
    e.preventDefault();

    // Prevent multiple clicks
    if (
      processing ||
      checkingEdit ||
      !editing ||
      !item.id
    ) {
      return;
    }

    setValidated(true);
    setError("");
    setMessage("");

    if (
      !item.itemName ||
      !item.stockGroup ||
      !item.unit
    ) {
      return;
    }

    try {
      setProcessing(true);

      const alternateUnit =
        getEffectiveAlternateUnit();

      await api.updateStockItem({
        id: item.id,
        item_name: item.itemName.trim(),
        stock_group: item.stockGroup,
        unit: item.unit,
        alternate_unit: alternateUnit,
        conversion:
          Number(item.conversion) || 0,
        opening_qty:
          Number(item.openingQty) || 0,
        low_qty_alert:
          Number(item.lowQtyAlert) || 0,
      });

      // --------------------------------------------
      // IMPORTANT:
      // Get the actual saved data from database
      // --------------------------------------------

      const freshItem =
        await api.getStockItemById(item.id);

      if (freshItem) {
        setItem({
          id: freshItem.id,
          itemName: freshItem.item_name || "",
          stockGroup:
            freshItem.stock_group || "",
          unit: freshItem.unit || "",
          conversion:
            freshItem.conversion ?? "",
          openingQty:
            freshItem.opening_qty ?? "",
          lowQtyAlert:
            freshItem.low_qty_alert ?? "",
          isActive: freshItem.is_active,
        });

        setAlternateEnabled(
          freshItem.alternate_unit === "Kgs"
        );
      }

      setEditing(false);
      setValidated(false);

      setMessage("Saved to database.");
    } catch (err) {
      console.error(
        "Unable to update item:",
        err
      );

      setError(
        err?.message ||
          "Unable to update item."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // CANCEL EDIT
  // --------------------------------------------------

  const handleCancelEdit = async () => {
    if (processing || checkingEdit) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      // Reload original database values
      const freshItem =
        await api.getStockItemById(item.id);

      if (freshItem) {
        setItem({
          id: freshItem.id,
          itemName: freshItem.item_name || "",
          stockGroup:
            freshItem.stock_group || "",
          unit: freshItem.unit || "",
          conversion:
            freshItem.conversion ?? "",
          openingQty:
            freshItem.opening_qty ?? "",
          lowQtyAlert:
            freshItem.low_qty_alert ?? "",
          isActive: freshItem.is_active,
        });

        setAlternateEnabled(
          freshItem.alternate_unit === "Kgs"
        );
      }

      setEditing(false);
      setValidated(false);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to reload stock item."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // INACTIVATE
  // --------------------------------------------------

  const makeInactiveItem = async (
    id = item.id
  ) => {
    if (!id || processing || checkingEdit) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await api.inactivateStockItem(id);

      setItem((prev) => ({
        ...prev,
        isActive: 0,
      }));

      setEditing(false);

      setMessage(
        "Item has been made inactive successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to make item inactive."
      );
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

 const deleteItem = async () => {
  if (
    !item.id ||
    processing ||
    checkingEdit
  ) {
    return;
  }

  try {
    setProcessing(true);
    setError("");
    setMessage("");

    // Check transaction before delete
    const transactions =
      await api.hasStockItemTransactions(item.id);

    // --------------------------------------------
    // TRANSACTION EXISTS
    // --------------------------------------------

    if (transactions) {
      setHasTransactions(true);

      // Do not delete.
      // Show Bootstrap modal asking whether
      // the user wants to make the item inactive.
      setShowInactiveModal(true);

      return;
    }

    // --------------------------------------------
    // NO TRANSACTION
    // --------------------------------------------


    await api.deleteStockItem(item.id);

    setMessage(
      "Item deleted successfully."
    );

    setTimeout(() => {
      handleClose();
    }, 700);

  } catch (err) {
    console.error(
      "Unable to delete item:",
      err
    );

    setError(
      err?.message ||
        "Unable to delete item."
    );
  } finally {
    setProcessing(false);
  }
};

const handleMakeInactive = async () => {
  if (
    !item.id ||
    processing ||
    checkingEdit
  ) {
    return;
  }

  try {
    setProcessing(true);
    setError("");
    setMessage("");

    await api.inactivateStockItem(item.id);

    setItem((prev) => ({
      ...prev,
      isActive: 0,
    }));

    setShowInactiveModal(false);
    setEditing(false);

    setMessage(
      "Item has been made inactive successfully."
    );
  } catch (err) {
    console.error(
      "Unable to make item inactive:",
      err
    );

    setError(
      err?.message ||
        "Unable to make item inactive."
    );
  } finally {
    setProcessing(false);
  }
};

  // --------------------------------------------------
  // LOW QUANTITY ALERT
  // --------------------------------------------------

  const saveLowQtyAlertOnly = async () => {
    if (
      !item.id ||
      processing ||
      checkingEdit
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      await api.updateLowQtyAlert(
        item.id,
        Number(item.lowQtyAlert) || 0
      );

      setMessage(
        "Low stock alert updated successfully."
      );
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
  // ALTERNATE UNIT
  // --------------------------------------------------

  const isPackagingMaterial =
    item.stockGroup === "Packaging Material";

  const autoAlternateOn =
    item.unit !== "" &&
    item.unit !== "Kgs";

  const switchOn = isPackagingMaterial
    ? alternateEnabled
    : autoAlternateOn;

  const switchInteractive =
    isPackagingMaterial;

  const effectiveAltUnit =
    switchOn ? "Kgs" : "";

  const getEffectiveAlternateUnit =
    () => {
      return switchOn ? "Kgs" : "";
    };

  // --------------------------------------------------
  // CLOSE
  // --------------------------------------------------

  const handleClose = () => {
    if (processing || checkingEdit) {
      return;
    }

    if (onClose) {
      onClose();
    } 
  };

  // --------------------------------------------------
  // LOADING
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

            <div>
              Loading stock item...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // READ / EDIT MODE
  // --------------------------------------------------

  const fieldsReadOnly =
    !editing ||
    processing ||
    checkingEdit;

  return (
    <div className="container mt-4">

      {/* HEADER */}

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

      {/* SUCCESS */}

      {message && (
        <div
          className="alert alert-success"
          role="alert"
        >
          {message}
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* TRANSACTION WARNING */}

      {hasTransactions && (
        <div className="alert alert-warning">
          <strong>
            This item cannot be modified.
          </strong>

          <div className="small mt-1">
            This stock item already has
            transactions.
          </div>
        </div>
      )}

      <form
        noValidate
        className={`needs-validation ${
          validated
            ? "was-validated"
            : ""
        }`}
        onSubmit={saveItem}
      >
        <div className="card shadow-sm">

          <div className="card-body">

            <div className="row">

              {/* LEFT */}

              <div className="col-md-6">

                {/* ITEM NAME */}

                <div className="mb-3">
                  <label className="form-label">
                    Item Name
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="itemName"
                    value={
                      item.itemName
                    }
                    onChange={
                      handleChange
                    }
                    readOnly={
                      fieldsReadOnly
                    }
                    required
                  />

                  <div className="invalid-feedback">
                    Please enter Item Name.
                  </div>
                </div>

                {/* STOCK GROUP */}

                <div className="mb-3">
                  <label className="form-label">
                    Stock Group
                  </label>

                  <select
                    className="form-select"
                    name="stockGroup"
                    value={
                      item.stockGroup
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      fieldsReadOnly
                    }
                    required
                  >
                    <option value="">
                      Select Stock Group
                    </option>

                    {stockGroups.map(
                      (g) => (
                        <option
                          key={g.id}
                          value={g.name}
                        >
                          {g.name}
                        </option>
                      )
                    )}
                  </select>

                  <div className="invalid-feedback">
                    Please select Stock Group.
                  </div>
                </div>

                {/* PRIMARY UNIT */}

                <div className="mb-3">
                  <label className="form-label">
                    Primary Unit
                  </label>

                  <select
                    className="form-select"
                    name="unit"
                    value={
                      item.unit
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      fieldsReadOnly
                    }
                    required
                  >
                    <option value="">
                      Select Primary Unit
                    </option>

                    {units.map(
                      (u) => (
                        <option
                          key={u.id}
                          value={u.name}
                        >
                          {u.name}
                        </option>
                      )
                    )}
                  </select>

                  <div className="invalid-feedback">
                    Please select Primary Unit.
                  </div>
                </div>

                {/* ALTERNATE + CONVERSION */}

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
                        checked={
                          switchOn
                        }
                        disabled={
                          fieldsReadOnly ||
                          !switchInteractive
                        }
                        onChange={(e) => {
                          const enabled =
                            e.target.checked;

                          setAlternateEnabled(
                            enabled
                          );

                          if (!enabled) {
                            setItem(
                              (prev) => ({
                                ...prev,
                                conversion:
                                  "",
                              })
                            );
                          }
                        }}
                      />

                      <label
                        className="form-check-label"
                        htmlFor="alternateUnitSwitch"
                      >
                        {switchOn
                          ? "On"
                          : "Off"}
                      </label>

                    </div>

                    <select
                      className="form-select"
                      value={
                        effectiveAltUnit
                      }
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
                        value={
                          item.conversion
                        }
                        onChange={
                          handleChange
                        }
                        min="0.01"
                        step="any"
                        required={
                          switchOn
                        }
                        disabled={
                          fieldsReadOnly ||
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

                {/* OPENING QTY */}

                <div className="mb-3">
                  <label className="form-label">
                    Opening Stock Qty
                  </label>

                  <input
                    type="number"
                    className="form-control"
                    name="openingQty"
                    value={
                      item.openingQty
                    }
                    onChange={
                      handleChange
                    }
                    min="0"
                    step="any"
                    disabled={
                      fieldsReadOnly
                    }
                  />
                </div>

                {/* LOW STOCK ALERT */}

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
                      value={
                        item.lowQtyAlert
                      }
                      onChange={
                        handleChange
                      }
                      min="0"
                      step="any"
                      disabled={
                        processing ||
                        checkingEdit
                      }
                    />

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={
                        saveLowQtyAlertOnly
                      }
                      disabled={
                        processing ||
                        checkingEdit ||
                        !item.id
                      }
                    >
                      {processing
                        ? "Saving..."
                        : "Save alert only"}
                    </button>

                  </div>

                  <div className="form-text">
                    Dashboard flags this
                    item when balance drops
                    below this quantity.
                  </div>

                </div>

              </div>
            </div>

            {/* ACTIONS */}

            <div className="mt-4 pt-3 border-top d-flex gap-2">

              {/* EDIT */}

              {!editing && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    handleEdit
                  }
                  disabled={
                    processing ||
                    checkingEdit ||
                    !item.id ||
                    !item.isActive
                  }
                >
                  {checkingEdit
                    ? "Checking..."
                    : "Edit"}
                </button>
              )}

              {/* SAVE */}

              {editing && (
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={
                    processing ||
                    checkingEdit ||
                    !item.id
                  }
                >
                  {processing
                    ? "Saving..."
                    : "Save"}
                </button>
              )}

              {/* CANCEL */}

              {editing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={
                    handleCancelEdit
                  }
                  disabled={
                    processing ||
                    checkingEdit
                  }
                >
                  Cancel
                </button>
              )}

              {/* DELETE */}

              {!editing && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={
                    deleteItem
                  }
                  disabled={
                    processing ||
                    checkingEdit ||
                    !item.id ||
                    !item.isActive
                  }
                >
                  Delete
                </button>
              )}

              {/* CLOSE */}

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={
                  handleClose
                }
                disabled={
                  processing ||
                  checkingEdit
                }
              >
                Close
              </button>

            </div>

          </div>
        </div>
      </form>

      
        {showInactiveModal && (
  <div
    className="modal fade show d-block"
    tabIndex="-1"
    role="dialog"
    style={{
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    }}
  >
    <div
      className="modal-dialog modal-dialog-centered"
      role="document"
    >
      <div className="modal-content">

        <div className="modal-header">
          <h5 className="modal-title">
            Delete Not Allowed
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              !processing &&
              setShowInactiveModal(false)
            }
            disabled={processing}
          />
        </div>

        <div className="modal-body">

          <p className="mb-2">
            <strong>
              This item cannot be deleted.
            </strong>
          </p>

          <p className="mb-0 text-muted">
            This stock item has existing
            transactions.
          </p>

          <p className="mt-3 mb-0">
            Would you like to make
            <strong> "{item.itemName}" </strong>
            inactive instead?
          </p>

        </div>

        <div className="modal-footer">

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setShowInactiveModal(false)
            }
            disabled={processing}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-warning"
            onClick={handleMakeInactive}
            disabled={processing}
          >
            {processing
              ? "Processing..."
              : "Make Inactive"}
          </button>

        </div>

      </div>
    </div>
  </div>
)}


    </div>
  );
}