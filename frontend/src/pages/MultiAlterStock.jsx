import { useEffect, useState } from "react";
import api from "../services/api";


export default function MultiAlterStock() {
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
        return {
          ...item,
          unit: value,
          alternate_unit: value === "Kgs" ? "" : "Kgs",
          conversion: value === "Kgs" ? 0 : item.conversion,
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

    await api.bulkUpdateStockItems(items);

    alert("Stock items updated.");
    setValidated(false);
  } catch (error) {
    console.error("Unable to update stock items:", error);
    alert(error?.message || "Unable to update stock items.");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="page-shell">
    
    
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
          <table className="table app-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Group</th>
                <th>Unit</th>
                <th>Conversion to Kg</th>
                <th>Opening qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="form-control"
                      value={item.item_name}
                      onChange={(event) => update(index, "item_name", event.target.value)}
                      required
                      disabled={saving}
                    />
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={item.stock_group}
                      onChange={(event) => update(index, "stock_group", event.target.value)}
                       required
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={item.unit}
                      onChange={(event) => update(index, "unit", event.target.value)}
                      required

                   >
                      {units.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      disabled={item.unit === "Kgs"}
                      required={item.unit !== "Kgs"}
                      value={item.conversion || ""}
                      onChange={(event) => update(index, "conversion", event.target.value)}
                      
                   />
                  </td>
                  <td>
                    <input
  type="number"
  className="form-control"
  value={item.opening_qty}
  onChange={(event) =>
    update(index, "opening_qty", event.target.value)
  }
  required
  min="0"
  disabled={saving}
/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </form>
    </div>
  );
}