import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function StockReport() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getStockReport()
      .then(setItems)
      .catch((error) => {
        console.error(error);
        alert("Unable to load the stock report.");
      });
  }, []);

  const rows = useMemo(
    () =>
      items.filter((item) =>
        item.item_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [items, search],
  );
  const groups = [...new Set(rows.map((item) => item.stock_group))];

  return (
    <div className="container-fluid mt-4">

          <h4 className="mb-0">Stock Summary</h4>

        <div className="card-body">
          <div className="col-md-5 mb-4">
            <label className="form-label">Search Item</label>
            <input
              className="form-control"
              placeholder="Search item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {groups.map((group) => (
            <div className="card shadow-sm mb-4" key={group}>
              <div className="card-header bg-secondary text-white">
                <strong>{group}</strong>
              </div>
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Item</th>
                      <th>Unit</th>
                      <th className="text-end">Opening</th>
                      <th className="text-end">Received</th>
                      <th className="text-end">Produced</th>
                      <th className="text-end">Dispatched</th>
                      <th className="text-end">Consumed</th>
                      <th className="text-end">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows
                      .filter((item) => item.stock_group === group)
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{item.item_name}</td>
                          <td>{item.unit}</td>
                          <td className="text-end">{item.opening_qty}</td>
                          <td className="text-end">{item.purchased_qty}</td>
                          <td className="text-end">{item.produced_qty}</td>
                          <td className="text-end">{item.dispatched_qty}</td>
                          <td className="text-end">{item.consumed_qty}</td>
                          <td className="text-end fw-bold">
                            {item.balance_qty}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!groups.length && (
            <p className="text-muted text-center">No stock items found.</p>
          )}
        </div>
      
    </div>
  );
}
