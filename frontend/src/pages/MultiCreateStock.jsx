import { useEffect, useState } from "react";
import api from "../services/api";

const createEmptyRow = (groups = [], units = []) => {
  const defaultUnit = units[0]?.name || "";

  return {
    item_name: "",
    stock_group: groups[0]?.name || "",
    unit: defaultUnit,
    alternate_unit: defaultUnit === "Kgs" ? "" : "Kgs",
    conversion: 0,
    opening_qty: 0,
  };
};

export default function MultiCreateStock({ onClose }) {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [groupList, unitList] = await Promise.all([
          api.getStockGroups(),
          api.getStockUnits(),
        ]);

        const loadedGroups = groupList || [];
        const loadedUnits = unitList || [];

        setGroups(loadedGroups);
        setUnits(loadedUnits);

        // Start with 2 empty rows
        setItems([
          createEmptyRow(loadedGroups, loadedUnits),
          createEmptyRow(loadedGroups, loadedUnits),
        ]);
      } catch (error) {
        console.error("Unable to load stock groups and units:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, rowIndex) => {
        if (rowIndex !== index) {
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

  const addRow = () => {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyRow(groups, units),
    ]);
  };

  const removeRow = (index) => {
    setItems((currentItems) => {
      if (currentItems.length <= 1) {
        return currentItems;
      }

      return currentItems.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const resetRows = () => {
    setItems([createEmptyRow(groups, units), createEmptyRow(groups, units)]);
  };

  const save = async (event) => {
    event.preventDefault();

    // Prevent multiple rapid clicks
    if (saving) return;

    const form = event.currentTarget;

    // Bootstrap validation
    if (!form.checkValidity()) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    // Ignore completely empty rows
    const filledItems = items.filter((item) => item.item_name.trim() !== "");

    if (filledItems.length === 0) {
      setValidated(true);
      return;
    }

    // Check duplicate names within this entry
    const names = filledItems.map((item) =>
      item.item_name.trim().toLowerCase(),
    );

    const duplicateNames = names.filter(
      (name, index) => names.indexOf(name) !== index,
    );

    if (duplicateNames.length > 0) {
      setValidated(true);
      return;
    }

    const stockItems = filledItems.map((item) => ({
      item_name: item.item_name.trim(),
      stock_group: item.stock_group,
      unit: item.unit,
      alternate_unit: item.alternate_unit || "",
      conversion: Number(item.conversion) || 0,
      opening_qty: Number(item.opening_qty) || 0,
    }));

    try {
      setSaving(true);

      await api.bulkCreateStockItems(stockItems);

      resetRows();
      setValidated(false);
    } catch (error) {
      console.error("Unable to create stock items:", error);
    } finally {
      setSaving(false);
    }

  };

  if (loading) {
    return (
      <div className="page-shell">
        <form
          noValidate
          className={`needs-validation ${validated ? "was-validated" : ""}`}
          onSubmit={save}
        >
          <div className="content-card">
            <p className="text-muted mb-0">Loading stock groups and units...</p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <h2 className="pt-2 pb-2 fw-bold">Create Multiple Stock Items</h2>

      <form
        noValidate
        className={`needs-validation ${validated ? "was-validated" : ""}`}
        onSubmit={save}
      >
        <div className="content-card">
          <p className="text-muted">
            Create multiple stock items at once. Leave unused rows blank.
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
                  <th style={{ width: "60px" }}></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Stock item name"
                        value={item.item_name}
                        onChange={(event) =>
                          updateItem(index, "item_name", event.target.value)
                        }
                        required
                        disabled={saving}
                      />
                      <div className="invalid-feedback">
                        Please enter stock item name.
                      </div>
                    </td>

                    <td>
                      <select
                        className="form-select"
                        value={item.stock_group}
                        onChange={(event) =>
                          updateItem(index, "stock_group", event.target.value)
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">Select group</option>

                        {groups.map((group) => (
                          <option key={group.id} value={group.name}>
                            {group.name}
                          </option>
                        ))}
                      </select>

                      <div className="invalid-feedback">
                        Please select a stock group.
                      </div>
                    </td>

                    <td>
                      <select
                        className="form-select"
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, "unit", event.target.value)
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">Select unit</option>

                        {units.map((unit) => (
                          <option key={unit.id} value={unit.name}>
                            {unit.name}
                          </option>
                        ))}
                      </select>

                      <div className="invalid-feedback">
                        Please select a unit.
                      </div>
                    </td>

                    <td>
                      <select
                        className="form-select"
                        value={item.alternate_unit}
                        onChange={(event) =>
                          updateItem(
                            index,
                            "alternate_unit",
                            event.target.value,
                          )
                        }
                        disabled={!item.unit || saving}
                        required={item.unit === "Kgs"}
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

                      {item.unit === "Kgs" && (
                        <div className="invalid-feedback">
                          Please select alternate unit.
                        </div>
                      )}
                    </td>

                    <td>
                      <div className="input-group">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="form-control"
                          disabled={
                            !item.unit || !item.alternate_unit || saving
                          }
                          value={item.conversion || ""}
                          onChange={(event) =>
                            updateItem(index, "conversion", event.target.value)
                          }
                          required={!!item.unit && !!item.alternate_unit}
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

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        value={item.opening_qty}
                        onChange={(event) =>
                          updateItem(index, "opening_qty", event.target.value)
                        }
                        disabled={saving}
                      />
                    </td>

                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        title="Remove row"
                        disabled={saving || items.length <= 1}
                        onClick={() => removeRow(index)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={saving}
              onClick={addRow}
            >
              <i className="bi bi-plus-lg me-1"></i>
              Add Row
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary mt-3"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>


      <button onClick={onClose} >Close</button>
    </div>
  );
}
