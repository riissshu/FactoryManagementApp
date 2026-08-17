import { useEffect, useState } from "react";
import api from "../services/api";

export default function MultiAlterStock({ onClose }) {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);

  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ----------------------------------------
  // LOAD
  // ----------------------------------------

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stockItems, stockGroups, stockUnits] = await Promise.all([
        api.getStockItems(),
        api.getStockGroups(),
        api.getStockUnits(),
      ]);

      setItems(stockItems);
      setGroups(stockGroups);
      setUnits(stockUnits);
    } catch (err) {
      console.error(err);
      setError("Unable to load stock items.");
    }
  };

  // ----------------------------------------
  // EDIT
  // ----------------------------------------

  const handleEdit = async () => {
    if (checking || saving || editing) {
      return;
    }

    try {
      setChecking(true);
      setMessage("");
      setError("");

      const checkedItems = await Promise.all(
        items.map(async (item) => {
          const hasTransactions = await api.hasStockItemTransactions(item.id);

          return {
            ...item,
            transaction_locked: hasTransactions,
          };
        }),
      );

      setItems(checkedItems);
      setEditing(true);
    } catch (err) {
      console.error("Unable to check stock transactions:", err);

      setError(err?.message || "Unable to check stock transactions.");
    } finally {
      setChecking(false);
    }
  };

  // ----------------------------------------
  // UPDATE FIELD
  // ----------------------------------------

  const update = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, rowIndex) => {
        if (rowIndex !== index) {
          return item;
        }

        // Transaction item cannot be changed
        if (item.transaction_locked) {
          return item;
        }

        if (field === "unit") {
          const isKgs = value === "Kgs";

          return {
            ...item,
            unit: value,
            alternate_unit: isKgs ? "" : "Kgs",
            conversion: 0,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  };

  // ----------------------------------------
  // SAVE
  // ----------------------------------------

  const handleSave = async () => {
    if (saving || checking || !editing) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      // Only send rows that were allowed to be edited
      const editableItems = items
        .filter((item) => !item.transaction_locked)
        .map((item) => ({
          ...item,
          conversion: Number(item.conversion) || 0,
          opening_qty: Number(item.opening_qty) || 0,
        }));

      if (editableItems.length === 0) {
        setMessage("No stock items were available for modification.");
        return;
      }

      const names = editableItems.map((item) =>
        String(item.item_name || "")
          .trim()
          .toLowerCase(),
      );

      const duplicateNames = names.filter(
        (name, index) => names.indexOf(name) !== index,
      );

      if (duplicateNames.length > 0) {
        setError(
          "Duplicate stock item names found. Each stock item name must be unique.",
        );
        return;
      }

      await api.bulkUpdateStockItems(editableItems);

      // Get fresh data from database
      const freshItems = await api.getStockItems();

      setItems(freshItems);
      setEditing(false);

      setMessage("Saved to database.");
    } catch (err) {
      console.error("Unable to save stock items:", err);

      setError(err?.message || "Unable to save stock items.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------
  // CANCEL
  // ----------------------------------------

  const handleCancel = async () => {
    if (saving || checking) {
      return;
    }

    setEditing(false);
    setMessage("");
    setError("");

    await loadData();
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------

  return (
    <div className="page-shell">
      <h2 className="pt-2 pb-2 fw-bold">Multi Alter Stock Item</h2>

      {/* SUCCESS */}
      {message && <div className="alert alert-success">{message}</div>}

      {/* ERROR */}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="content-card">
        <p className="text-muted">
          Click Edit to modify stock items. Items having transactions cannot be
          modified.
        </p>

        <div className="table-responsive">
          <table className="table app-table align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Group</th>
                <th>Unit</th>
                <th>Alternate Unit</th>
                <th>Conversion</th>
                <th>Opening Qty</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => {
                const locked = item.transaction_locked === true;

                const readOnly = !editing || locked;

                return (
                  <tr key={item.id} className={locked ? "table-secondary" : ""}>
                    {/* ITEM */}
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={item.item_name || ""}
                        readOnly={readOnly}
                        onChange={(e) =>
                          update(index, "item_name", e.target.value)
                        }
                      />

                      {locked && (
                        <small className="text-danger fw-semibold d-block mt-1">
                          🔒 This item cannot be modified because transactions
                          exist.
                        </small>
                      )}
                    </td>

                    {/* GROUP */}
                    <td>
                      <select
                        className="form-select"
                        value={item.stock_group || ""}
                        disabled={readOnly}
                        onChange={(e) =>
                          update(index, "stock_group", e.target.value)
                        }
                      >
                        <option value="">Select group</option>

                        {groups.map((group) => (
                          <option key={group.id} value={group.name}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* UNIT */}
                    <td>
                      <select
                        className="form-select"
                        value={item.unit || ""}
                        disabled={readOnly}
                        onChange={(e) => update(index, "unit", e.target.value)}
                      >
                        <option value="">Select unit</option>

                        {units.map((unit) => (
                          <option key={unit.id} value={unit.name}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* ALTERNATE UNIT */}
                    <td>
                      <select
                        className="form-select"
                        value={item.alternate_unit || ""}
                        disabled={readOnly || !item.unit}
                        onChange={(e) =>
                          update(index, "alternate_unit", e.target.value)
                        }
                      >
                        {item.unit !== "Kgs" ? (
                          <option value="Kgs">Kgs</option>
                        ) : (
                          <>
                            <option value="">Select alternate unit</option>

                            {units
                              .filter((unit) => unit.name !== "Kgs")
                              .map((unit) => (
                                <option key={unit.id} value={unit.name}>
                                  {unit.name}
                                </option>
                              ))}
                          </>
                        )}
                      </select>
                    </td>

                    {/* CONVERSION */}
                    <td>
                      <div className="input-group">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          value={item.conversion || ""}
                          disabled={
                            readOnly || !item.unit || !item.alternate_unit
                          }
                          onChange={(e) =>
                            update(index, "conversion", e.target.value)
                          }
                        />

                        <span className="input-group-text">
                          {item.alternate_unit || "Unit"}
                        </span>
                      </div>

                      {item.unit && item.alternate_unit && (
                        <small className="text-muted">
                          1 {item.unit} = {item.conversion || "?"}{" "}
                          {item.alternate_unit}
                        </small>
                      )}
                    </td>

                    {/* OPENING QTY */}
                    <td>
                      <div className="input-group">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          value={item.opening_qty || ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            update(index, "opening_qty", e.target.value)
                          }
                        />
                        <span className="input-group-text">
                          {item.unit || "Unit"}
                        </span>

                      </div>

                      {item.unit && item.alternate_unit && item.conversion &&(
                        <small className="text-muted d-flex justify-content-center">
                          
                          {item.conversion
                            ? item.opening_qty * item.conversion
                            : "?"}{" "}
                          {item.alternate_unit}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTION BUTTONS */}

      <div className="mt-3 d-flex gap-2">
        {!editing ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={checking || saving || items.length === 0}
            onClick={handleEdit}
          >
            {checking ? "Checking..." : "Edit"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-success"
              disabled={saving || checking}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || checking}
              onClick={handleCancel}
            >
              Cancel
            </button>
          </>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          disabled={saving || checking}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
