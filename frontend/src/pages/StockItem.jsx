import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function StockItem() {
  const emptyItem = {
    id: null,
    itemName: "",
    stockGroup: "",
    unit: "",
    altUnit: "",
    conversion: "",
    openingQty: "",
    lowQtyAlert: "",
  };

  const [item, setItem] = useState(emptyItem);
  const [items, setItems] = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    loadItems();
    api.getStockGroups().then(setStockGroups).catch(console.error);
    api.getStockUnits().then(setUnits).catch(console.error);
  }, []);

  useEffect(() => {
    // Default the group/unit selects once lookup lists arrive, for a fresh form.
    if (!item.id && !item.stockGroup && stockGroups.length) {
      setItem((prev) => ({ ...prev, stockGroup: stockGroups[0].name }));
    }
    if (!item.id && !item.unit && units.length) {
      setItem((prev) => ({ ...prev, unit: units[0].name }));
    }
  }, [stockGroups, units]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "unit") {
      setItem({
        ...item,
        unit: value,
        altUnit: value === "Kgs" ? "" : "Kgs",
        conversion: value === "Kgs" ? "" : item.conversion,
      });
    } else {
      setItem({
        ...item,
        [name]: value,
      });
    }
  };

  const resetForm = () => {
    setItem({
      ...emptyItem,
      stockGroup: stockGroups[0]?.name || "",
      unit: units[0]?.name || "",
    });
  };

  const loadItems = async () => {
    try {
      const data = await api.getStockItems();
      setItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  const editItem = (row) => {
    setItem({
      id: row.id,
      itemName: row.item_name,
      stockGroup: row.stock_group,
      unit: row.unit,
      altUnit: row.alternate_unit,
      conversion: row.conversion,
      openingQty: row.opening_qty,
      lowQtyAlert: row.low_qty_alert ?? "",
    });
  };

  const saveItem = async () => {
    try {
      if (item.itemName.trim() === "") {
        alert("Please enter Item Name.");
        return;
      }

      const stockData = {
        id: item.id,
        item_name: item.itemName,
        stock_group: item.stockGroup,
        unit: item.unit,
        alternate_unit: item.altUnit,
        conversion: Number(item.conversion) || 0,
        opening_qty: Number(item.openingQty) || 0,
        low_qty_alert: Number(item.lowQtyAlert) || 0,
      };

      if (item.id) {
        await api.updateStockItem(stockData);
      } else {
        await api.saveStockItem(stockData);
      }

      resetForm();
      await loadItems();
    } catch (error) {
      console.error("Save Error:", error);
      alert(error.message);
    }
  };

  // Low stock alert qty can be changed on its own, without touching the
  // rest of the item's master data, and without a password.
  const saveLowQtyAlertOnly = async () => {
    if (!item.id) return;
    try {
      await api.updateLowQtyAlert(item.id, Number(item.lowQtyAlert) || 0);
      alert("Low stock alert quantity updated.");
      await loadItems();
    } catch (error) {
      console.error(error);
      alert("Unable to update the alert quantity.");
    }
  };

  const inactivateItem = async () => {
    if (!item.id) {
      alert("Please select a stock item.");
      return;
    }

    const confirmAction = window.confirm(
      "Are you sure you want to inactivate this stock item?",
    );

    if (!confirmAction) return;

    try {
      await api.inactivateStockItem(item.id);
      alert("Stock Item Inactivated Successfully.");
      resetForm();
      await loadItems();
    } catch (error) {
      console.error(error);
      alert("Unable to inactivate stock item.");
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-0">Stock Item Master</h2>

      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
          <div className="">
            <label className="form-label">Item Name</label>
            <input
              className="form-control"
              name="itemName"
              value={item.itemName}
              onChange={handleChange}
            />
          </div>

          <div className="">
            <label className="form-label">Stock Group</label>
            <select
              className="form-select"
              name="stockGroup"
              value={item.stockGroup}
              onChange={handleChange}
            >
              {stockGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
         
          <div className="">
            <label className="form-label">Primary Unit</label>
            <select
              className="form-select"
              name="unit"
              value={item.unit}
              onChange={handleChange}
            >
              {units.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="row">
          <div className="col-md-6">
            <label className="form-label">Alternate Unit</label>
            <input className="form-control" value={item.altUnit} readOnly />
          </div>


          {item.altUnit === "Kgs" && (
            <div className="col-md-6 mb-3">
              <label className="form-label">Conversion</label>
              <div className="input-group">
                <span className="input-group-text fw-bold">1 {item.unit}</span>
                <span className="input-group-text">=</span>
                <input
                  type="number"
                  className="form-control"
                  name="conversion"
                  value={item.conversion}
                  onChange={handleChange}
                />
                <span className="input-group-text fw-bold">Kgs</span>
              </div>
            </div>
          )}

          </div>
          </div>

          <div className="col-md-6">
          <div className="">
            <label className="form-label">Opening Stock Qty</label>
            <input
              type="number"
              className="form-control"
              name="openingQty"
              value={item.openingQty}
              onChange={handleChange}
            />
          </div>

          <div className="">
            <label className="form-label">
              Low stock alert qty <span className="text-muted">(optional)</span>
            </label>
            <div className="input-group">
              <input
                type="number"
                className="form-control"
                name="lowQtyAlert"
                placeholder="e.g. 50"
                value={item.lowQtyAlert}
                onChange={handleChange}
              />
              {item.id && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  title="Save just the alert quantity, no password needed"
                  onClick={saveLowQtyAlertOnly}
                >
                  Save alert only
                </button>
              )}
            </div>
            <div className="form-text">
              Dashboard flags this item when balance drops below this quantity.
            </div>
          </div>
          </div>
          
        </div>

        <div className="mt-3">
          <button className="btn btn-primary me-2" onClick={saveItem}>
            Save
          </button>

          <button className="btn btn-secondary me-2" onClick={resetForm}>
            Reset
          </button>

          <button className="btn btn-danger" onClick={inactivateItem}>
            Inactivate
          </button>
        </div>
      </div>

      <div className="card-header">Existing Items</div>

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
            {items.map((row) => (
              <tr key={row.id} style={{ cursor: "pointer" }} onClick={() => editItem(row)}>
                <td>{row.item_name}</td>
                <td>{row.stock_group}</td>
                <td>{row.unit}</td>
                <td>{row.alternate_unit || "-"}</td>
                <td>
                  {row.alternate_unit ? `1 ${row.unit} = ${row.conversion} Kgs` : "-"}
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