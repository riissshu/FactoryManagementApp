import React, { useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const sampleStock = [
  {
  itemName: "Cement",
  group: "Raw Material",
  unit: "Bag",
  altUnit: "Kg",
  altQty: 6000,
  closing: 120,
},
  {
  itemName: "Sand",
  group: "Raw Material",
  unit: "Ton",
  altUnit: "Kg",
  altQty: 42000,
  closing: 42,
},
  {
    itemName: "Steel Rod",
    group: "Raw Material",
    unit: "Kg",
    closing: 1325,
  },
  {
    itemName: "Plastic Bag",
    group: "Packaging Material",
    unit: "Nos",
    closing: 4650,
  },
  {
    itemName: "Wrapper Roll",
    group: "Packaging Material",
    unit: "Roll",
    closing: 35,
  },
 {
  itemName: "Concrete Block",
  group: "Finished Goods",
  unit: "Nos",
  altUnit: "",
  altQty: "",
  closing: 2200,
},
  {
    itemName: "Paver Block",
    group: "Finished Goods",
    unit: "Nos",
    closing: 1500,
  },
];

export default function StockReport() {
  const today = new Date().toISOString().split("T")[0];

  const [asOnDate, setAsOnDate] = useState(today);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    return sampleStock.filter((item) =>
      item.itemName.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const renderStockTable = (title, group) => {
    const data = filteredData.filter(
      (item) => item.group === group
    );

    return (
      <div className="card shadow-sm mb-4">

        <div className="card-header bg-secondary text-white">
          <strong>{title}</strong>
        </div>

        <div className="table-responsive">

          <table className="table table-bordered table-hover mb-0">

            <thead className="table-light">
              <tr>
                <th width="5%">#</th>
                <th>Item Name</th>
                <th width="15%">Unit</th>
                <th width="15%" className="text-end">
  Stock Qty
</th>

<th width="20%" className="text-end">
  Alt. Qty
</th>
              </tr>
            </thead>

            <tbody>

              {data.length > 0 ? (
                data.map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{row.itemName}</td>
                    <td>{row.unit}</td>
                    <td className="text-end fw-bold">
  {row.closing}
</td>

<td className="text-end">
  {row.altUnit
    ? `${row.altQty} ${row.altUnit}`
    : "-"}
</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center text-muted"
                  >
                    No records found.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>
    );
  };

    return (
    <div className="container-fluid mt-4">

      <div className="card shadow">

        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Stock Report</h4>
        </div>

        <div className="card-body">

          <div className="row mb-4">

            <div className="col-md-3">
              <label className="form-label">As On Date</label>
              <input
                type="date"
                className="form-control"
                value={asOnDate}
                onChange={(e) => setAsOnDate(e.target.value)}
              />
            </div>

            <div className="col-md-5">
              <label className="form-label">Search Item</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

          </div>

          {renderStockTable(
            "Raw Material",
            "Raw Material"
          )}

          {renderStockTable(
            "Packaging Material",
            "Packaging Material"
          )}

          {renderStockTable(
            "Finished Goods",
            "Finished Goods"
          )}

        </div>

      </div>

          </div>
  );
}