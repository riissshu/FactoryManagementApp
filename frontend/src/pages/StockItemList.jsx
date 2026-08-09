import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function StockItemList({ onAddNew, onMultiAlter } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await api.getStockItems();
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fixed: loadItems was defined but never called, so the table always
  // rendered empty. This runs it once on mount.
  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center pt-2 pb-2">
        <h2 className="mb-0">Existing Items</h2>

        <div className="d-flex gap-2">
          {onMultiAlter && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onMultiAlter}
            >
              Multi Alter Stock
            </button>
          )}

          {onAddNew && (
            <button type="button" className="btn btn-primary" onClick={onAddNew}>
              + Add New Item
            </button>
          )}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-hover mb-0">
          <thead className="table-light">
            <tr>
              <th>Item</th>
              <th>Group</th>
              <th>Unit</th>
              <th>Alt Unit</th>
              <th>Conversion</th>
              <th>Opening Qty</th>
              <th>Low Qty Alert</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  No stock items yet.
                </td>
              </tr>
            )}

            {!loading &&
              items.map((row) => (
                <tr key={row.id}>
                  {/*
                    Fixed: onClick={() => editItem(row)} referenced a
                    function that didn't exist anywhere in this component —
                    it would throw as soon as a row was clicked. Since the
                    edit page/flow isn't built yet, the click handler and
                    the pointer cursor are removed for now rather than
                    calling something undefined. Wire this back up (e.g.
                    onClick={() => onEditItem(row)} via a prop, or
                    navigation to an edit route) once that page exists.
                  */}
                  <td>{row.item_name}</td>
                  <td>{row.stock_group}</td>
                  <td>{row.unit}</td>
                  <td>{row.alternate_unit || "-"}</td>
                  <td>
                    {row.alternate_unit
                      ? `1 ${row.unit} = ${row.conversion} Kgs`
                      : "-"}
                  </td>
                  <td>{row.opening_qty}</td>
                  <td>{row.low_qty_alert || "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}