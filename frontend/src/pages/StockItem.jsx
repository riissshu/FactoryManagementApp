import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

const stockGroups = ["Raw Material", "Finished Goods", "Packaging Material"];

const units = [
  "Kg",
  "Tin",
  "Nos",
  "Pcs",
  "Bag",
  "Box",
  "Roll",
  "Bundle",
  "Drum",
  "Ctn",
  "Ltr",
];

export default function StockItem() {
  const emptyItem = {
    id: null,
    itemName: "",
    stockGroup: "Raw Material",
    unit: "Kg",
    altUnit: "",
    conversion: "",
    openingQty: "",
    openingQtyKg: "",
  };

  const [item, setItem] = useState(emptyItem);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "unit") {
      setItem({
        ...item,
        unit: value,
        altUnit: value === "Kg" ? "" : "Kg",
        conversion: value === "Kg" ? "" : item.conversion,
      });
    } else {
      setItem({
        ...item,
        [name]: value,
      });
    }
  };

  const resetForm = () => {
    setItem(emptyItem);
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
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Stock Item Master</h4>
        </div>

        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Item Name</label>
              <input
                className="form-control"
                name="itemName"
                value={item.itemName}
                onChange={handleChange}
              />
            </div>

            <div className="col-md-6 mb-3">
              <label className="form-label">Stock Group</label>
              <select
                className="form-select"
                name="stockGroup"
                value={item.stockGroup}
                onChange={handleChange}
              >
                {stockGroups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Primary Unit</label>
              <select
                className="form-select"
                name="unit"
                value={item.unit}
                onChange={handleChange}
              >
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="col-md-4 mb-3">
              <label className="form-label">Alternate Unit</label>
              <input className="form-control" value={item.altUnit} readOnly />
            </div>

            {item.altUnit === "Kg" && (
              <div className="col-md-4 mb-3">
                <label className="form-label">1 {item.unit} =</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    name="conversion"
                    value={item.conversion}
                    onChange={handleChange}
                  />
                  <span className="input-group-text">Kg</span>
                </div>
              </div>
            )}

            <div className="col-md-4 mb-3">
              <label className="form-label">Opening Stock Qty</label>
              <input
                type="number"
                className="form-control"
                name="openingQty"
                value={item.openingQty}
                onChange={handleChange}
              />
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
      </div>

      <div className="card shadow mt-4">
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
              </tr>
            </thead>

            <tbody>
              {items.map((row, index) => (
                <tr
                  key={row.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => editItem(row)}
                >
                  <td>{row.item_name}</td>
                  <td>{row.stock_group}</td>
                  <td>{row.unit}</td>
                  <td>{row.alternate_unit || "-"}</td>
                  <td>
                    {row.alternate_unit
                      ? `1 ${row.unit} = ${row.conversion} Kg`
                      : "-"}
                  </td>
                  <td>{row.opening_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
