import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function StockItemList({ onAddNew, onMultiAlter, onMultiCreate, onStockGroupUnits } = {}) {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState("All");
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

  useEffect(() => {
    api.getStockGroups().then(setGroups).catch(console.error);
  }, []);

  // Sections to render: one per stock group (in the same order as the
  // Stock Groups master list), each carrying only the items that belong
  // to it. Filtering to a single group via the buttons below just narrows
  // this down to that one section. Items whose stock_group no longer
  // matches any active group (e.g. the group was renamed/deactivated)
  // still show up under "Other", so nothing silently disappears.
  const sections = useMemo(() => {
    const groupNames = groups.map((g) => g.name);
    const visibleGroups =
      activeGroup === "All" ? groupNames : [activeGroup];

    const byGroup = visibleGroups
      .map((name) => ({
        name,
        rows: items.filter((item) => item.stock_group === name),
      }))
      .filter((section) => section.rows.length > 0);

    if (activeGroup === "All") {
      const otherRows = items.filter(
        (item) => !groupNames.includes(item.stock_group),
      );
      if (otherRows.length > 0) {
        byGroup.push({ name: "Other", rows: otherRows });
      }
    }

    return byGroup;
  }, [items, groups, activeGroup]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center pt-2 pb-2">
        <h2 className="mb-0">Stock Item List</h2>

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

          {onMultiCreate && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onMultiCreate}
            >
              Multi Create Stock
            </button>
          )}

          

            {onAddNew && (
            <button type="button" className="btn btn-primary" onClick={onAddNew}>
              + Add New Item
            </button>
          )}

            {onStockGroupUnits && (
            <button type="button" className="btn btn-primary" onClick={onStockGroupUnits}>
              Stock Groups & Units
            </button>
          )}


        </div>
      </div>

      <div className="btn-group mb-3" role="group" aria-label="Filter by stock group">
        <button
          type="button"
          className={`btn btn-sm ${activeGroup === "All" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setActiveGroup("All")}
        >
          All
        </button>

        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`btn btn-sm ${activeGroup === group.name ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setActiveGroup(group.name)}
          >
            {group.name}
          </button>
        ))}
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

            {!loading && sections.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  No stock items yet.
                </td>
              </tr>
            )}

            {!loading &&
              sections.map((section) => (
                <React.Fragment key={section.name}>
                  <tr className="table-secondary">
                    <td colSpan={7}>
                      <strong>{section.name}</strong>{" "}
                      <span className="text-muted">
                        ({section.rows.length})
                      </span>
                    </td>
                  </tr>

                  {section.rows.map((row) => (
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
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}