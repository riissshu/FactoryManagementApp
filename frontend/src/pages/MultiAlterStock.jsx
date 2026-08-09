import { useEffect, useState } from "react";

import api from "../services/api";

export default function MultiAlterStock({ onClose }) {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);

 

  useEffect(() => {
    api.getStockItems().then(setItems).catch(console.error);
    api.getStockGroups().then(setGroups).catch(console.error);
    api.getStockUnits().then(setUnits).catch(console.error);
  }, []);

  const update = (index, field, value) => {
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

  const save = async (event) => {
    event.preventDefault();

    if (saving) return;

    const form = event.currentTarget;

    if (!form.checkValidity()) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setSaving(true);

      const updatedItems = items.map((item) => ({
        ...item,
        conversion: Number(item.conversion) || 0,
        opening_qty: Number(item.opening_qty) || 0,
      }));

      await api.bulkUpdateStockItems(updatedItems);

      setValidated(false);
   
      // Go to Dashboard after successful save
    
    } catch (error) {
      console.error("Unable to update stock items:", error);

      // Keep error alert for now
      alert(error?.message || "Unable to update stock items.");
    } finally {
      setSaving(false);
    }

      onClose();
  };

  return (
    <div className="page-shell">
      <h2 className="pt-2 pb-2 fw-bold">Multi Alter Stock Item</h2>

      <form
        id="multi-alter-stock-form"
        noValidate
        className={`needs-validation ${
          validated ? "was-validated" : ""
        }`}
        onSubmit={save}
      >
        <div className="content-card">
          <p className="text-muted">
            Update several stock items at once. Changes are protected by the
            master password.
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
                {items.map((item, index) => (
                  <tr key={item.id}>
                    {/* Item */}
                    <td>
                      <input
                        type="text"
                        className="form-control"
                        value={item.item_name}
                        onChange={(event) =>
                          update(
                            index,
                            "item_name",
                            event.target.value,
                          )
                        }
                        required
                        disabled={saving}
                      />

                      <div className="invalid-feedback">
                        Please enter stock item name.
                      </div>
                    </td>

                    {/* Group */}
                    <td>
                      <select
                        className="form-select"
                        value={item.stock_group}
                        onChange={(event) =>
                          update(
                            index,
                            "stock_group",
                            event.target.value,
                          )
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">Select group</option>

                        {groups.map((group) => (
                          <option
                            key={group.id}
                            value={group.name}
                          >
                            {group.name}
                          </option>
                        ))}
                      </select>

                      <div className="invalid-feedback">
                        Please select a stock group.
                      </div>
                    </td>

                    {/* Primary Unit */}
                    <td>
                      <select
                        className="form-select"
                        value={item.unit}
                        onChange={(event) =>
                          update(
                            index,
                            "unit",
                            event.target.value,
                          )
                        }
                        required
                        disabled={saving}
                      >
                        <option value="">Select unit</option>

                        {units.map((unit) => (
                          <option
                            key={unit.id}
                            value={unit.name}
                          >
                            {unit.name}
                          </option>
                        ))}
                      </select>

                      <div className="invalid-feedback">
                        Please select a unit.
                      </div>
                    </td>

                    {/* Alternate Unit */}
                    <td>
                      <select
                        className="form-select"
                        value={item.alternate_unit || ""}
                        onChange={(event) =>
                          update(
                            index,
                            "alternate_unit",
                            event.target.value,
                          )
                        }
                        disabled={!item.unit || saving}
                        
                      >
                        {item.unit !== "Kgs" ? (
                          <option value="Kgs">Kgs</option>
                        ) : (
                          <>
                            <option value="">
                              Select alternate unit
                            </option>

                            {units
                              .filter(
                                (unit) =>
                                  unit.name !== "Kgs",
                              )
                              .map((unit) => (
                                <option
                                  key={unit.id}
                                  value={unit.name}
                                >
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

                    {/* Conversion */}
                    <td>
  <div className="input-group">
    <input
      type="number"
      min="0"
      step="any"
      className="form-control"
      disabled={
        !item.unit ||
        !item.alternate_unit ||
        saving
      }
      required={!!item.alternate_unit}
      value={item.conversion || ""}
      onChange={(event) =>
        update(
          index,
          "conversion",
          event.target.value,
        )
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

  {item.alternate_unit && (
    <div className="invalid-feedback">
      Please enter conversion.
    </div>
  )}
</td>

                    {/* Opening Qty */}
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-control"
                        value={item.opening_qty}
                        onChange={(event) =>
                          update(
                            index,
                            "opening_qty",
                            event.target.value,
                          )
                        }
                        required
                        disabled={saving}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    </div>
  );
}