import { useEffect, useState } from "react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";

export default function MultiAlterStock() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getStockItems().then(setItems).catch(console.error);
    api.getStockGroups().then(setGroups).catch(console.error);
    api.getStockUnits().then(setUnits).catch(console.error);
  }, []);

  const update = (index, field, value) =>
    setItems(
      items.map((item, row) =>
        row === index
          ? {
              ...item,
              [field]: value,
              ...(field === "unit"
                ? {
                    alternate_unit: value === "Kg" ? "" : "Kg",
                    conversion: value === "Kg" ? 0 : item.conversion,
                  }
                : {}),
            }
          : item,
      ),
    );

  const save = async () => {
    setSaving(true);
    try {
      await api.bulkUpdateStockItems(items);
      alert("Stock items updated.");
    } catch {
      alert("Unable to update stock items.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Masters"
        title="Multi alter stock items"
        actions={
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save all changes"}
          </button>
        }
      />
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
                    />
                  </td>
                  <td>
                    <select
                      className="form-select"
                      value={item.stock_group}
                      onChange={(event) => update(index, "stock_group", event.target.value)}
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
                      disabled={item.unit === "Kg"}
                      value={item.conversion || ""}
                      onChange={(event) => update(index, "conversion", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={item.opening_qty}
                      onChange={(event) => update(index, "opening_qty", event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}