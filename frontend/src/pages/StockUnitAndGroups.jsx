import { useEffect, useState } from "react";
import api from "../services/api";


function LookupPanel({ title, load, add, rename, deactivate }) {
  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const refresh = () => load().then(setRows).catch(console.error);

  useEffect(() => {
    refresh();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await add(name);
      setNewName("");
      refresh();
    } catch (error) {
      console.error(error);
      alert(`Unable to add "${name}". It may already exist.`);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditingName(row.name);
  };

  const saveEdit = async () => {
    if (!editingName.trim()) return;
    await rename(editingId, editingName.trim());
    setEditingId(null);
    refresh();
  };

  const handleDeactivate = async (row) => {
    if (!confirm(`Remove "${row.name}" from the list? Existing items keep using it.`)) return;
    await deactivate(row.id);
    refresh();
  };

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header">
        <strong>{title}</strong>
      </div>
      <div className="card-body">
        <div className="input-group mb-3" style={{ maxWidth: 400 }}>
          <input
            className="form-control"
            placeholder={`New ${title.toLowerCase()} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
        <table className="table table-bordered mb-0">
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {editingId === row.id ? (
                    <input
                      className="form-control"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      autoFocus
                    />
                  ) : (
                    row.name
                  )}
                </td>
                <td style={{ width: 160 }} className="text-end">
                  {editingId === row.id ? (
                    <>
                      <button className="btn btn-sm btn-success me-2" onClick={saveEdit}>
                        Save
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-sm btn-outline-secondary me-2"
                        onClick={() => startEdit(row)}
                      >
                        Rename
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeactivate(row)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td className="text-muted text-center">None yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StockGroupsUnits() {
  return (
    <div className="page-shell">
     
      <div className="content-card">
        <LookupPanel
          title="Stock Groups"
          load={api.getStockGroups}
          add={api.addStockGroup}
          rename={api.renameStockGroup}
          deactivate={api.deactivateStockGroup}
        />
        <LookupPanel
          title="Units"
          load={api.getStockUnits}
          add={api.addStockUnit}
          rename={api.renameStockUnit}
          deactivate={api.deactivateStockUnit}
        />
      </div>
    </div>
  );
}