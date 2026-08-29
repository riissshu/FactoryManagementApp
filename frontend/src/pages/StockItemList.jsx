import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { exportTablePdf, exportTableExcel } from "../utils/exportUtils";

export default function StockItemList({ onClose, onEditItem }) {
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
    const visibleGroups = activeGroup === "All" ? groupNames : [activeGroup];

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

  const buildExportRows = () =>
    sections.flatMap((section) =>
      section.rows.map((row) => [
        row.item_name,
        row.stock_group,
        row.unit,
        row.alternate_unit || "-",
        row.alternate_unit ? `1 ${row.unit} = ${row.conversion} Kgs` : "-",
        row.opening_qty,
        row.low_qty_alert || "-",
      ]),
    );

  const exportPdf = () =>
    exportTablePdf({
      title: "Stock Item List",
      subtitle: new Date().toLocaleDateString("en-IN"),
      filename: "stock-item-list.pdf",
      headers: [
        "Item",
        "Group",
        "Unit",
        "Alt Unit",
        "Conversion",
        "Opening Qty",
        "Low Qty Alert",
      ],
      rows: buildExportRows(),
      numericCols: [2],
    });

  const exportExcel = () =>
    exportTableExcel({
      filename: "stock-item-list.xlsx",
      sheetName: "Stock Items",
      headers: [
        "Item",
        "Group",
        "Unit",
        "Alt Unit",
        "Conversion",
        "Opening Qty",
        "Low Qty Alert",
      ],
      rows: buildExportRows(),
    });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center pt-2 pb-2">
        <h2 className="mb-0">Stock Item List</h2>
        <div>
        <button onClick={onClose} className="btn btn-outline-secondary me-2">
          Close
        </button>

        <button onClick={exportPdf} className="btn btn-outline-primary me-2">
          Export PDF
        </button>
        <button onClick={exportExcel} className="btn btn-outline-success me-2">
          Export Excel
        </button>
        </div>
      </div>

      <div
        className="btn-group mb-3"
        role="group"
        aria-label="Filter by stock group"
      >
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
                    <tr
                      key={row.id}
                      onClick={() => onEditItem(row.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{row.item_name}</td>
                      <td>{row.stock_group}</td>
                      <td>{row.unit}</td>
                      <td>{row.alternate_unit || "-"}</td>
                      <td>
                        {row.alternate_unit
                          ? `1 ${row.unit} = ${row.conversion} Kgs`
                          : "-"}
                      </td>
                      <td>
                        {row.opening_qty} {row.unit}
                        <div>
                          {row.unit &&
                            row.alternate_unit &&
                            row.conversion > 0 &&
                            row.opening_qty > 0 && (
                              <small className="text-muted">
                                {" "}
                                ({row.opening_qty * row.conversion}{" "}
                                {row.alternate_unit})
                              </small>
                            )}
                        </div>
                      </td>
                      <td>
                        {row.low_qty_alert || "-"} {row.unit}
                      </td>
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
