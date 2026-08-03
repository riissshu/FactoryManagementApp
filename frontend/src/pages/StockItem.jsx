import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const stockGroups = [
  "Raw Material",
  "Finished Goods",
  "Packaging Material",
];

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
  "Carton",
  "Ltr",
];

export default function StockItem() {
  const emptyItem = {
    itemName: "",
    stockGroup: "Raw Material",
    unit: "Kg",
    altUnit: "",
    conversion: "",
    openingQty: "",
    openingQtyKg: "",
  };

  const [item, setItem] = useState(emptyItem);

  const [items] = useState([
    {
      itemName: "Cement",
      stockGroup: "Raw Material",
      unit: "Bag",
      altUnit: "Kg",
      conversion: 50,
      openingQty: 100,
    },
    {
      itemName: "Plastic Bag",
      stockGroup: "Packaging Material",
      unit: "Nos",
      altUnit: "Kg",
      conversion: 0.02,
      openingQty: 5000,
    },
    {
      itemName: "Concrete Block",
      stockGroup: "Finished Goods",
      unit: "Nos",
      altUnit: "Kg",
      conversion: 12,
      openingQty: 800,
    },
  ]);

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

  const saveItem = () => {
    alert("Save functionality will be connected to SQLite later.");
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
              <input
                className="form-control"
                value={item.altUnit}
                readOnly
              />
            </div>

            {item.altUnit === "Kg" && (
              <div className="col-md-4 mb-3">
                <label className="form-label">
                  1 {item.unit} =
                </label>
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
            <button
              className="btn btn-primary me-2"
              onClick={saveItem}
            >
              Save
            </button>

            <button
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Reset
            </button>
          </div>

        </div>
      </div>

      <div className="card shadow mt-4">

        <div className="card-header">
          Existing Items
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
              </tr>
            </thead>

            <tbody>

              {items.map((row, index) => (
                <tr key={index}>
                  <td>{row.itemName}</td>
                  <td>{row.stockGroup}</td>
                  <td>{row.unit}</td>
                  <td>{row.altUnit || "-"}</td>
                  <td>
                    {row.altUnit
                      ? `1 ${row.unit} = ${row.conversion} Kg`
                      : "-"}
                  </td>
                  <td>{row.openingQty}</td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}