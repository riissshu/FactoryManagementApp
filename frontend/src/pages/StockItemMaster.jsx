import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function StockItemMaster({ onAddNew, onViewStock }) {
   
    const [items, setItems] = useState([]);
  
      useEffect(() => {
    loadItems();
  }, []);

    const loadItems = async () => {
    try {
      const data = await api.getStockItems();
      setItems(data || []);
    } catch (error) {
      console.error("Failed to load stock items:", error);
    }
  };
  
  
  
  
    return (

<div className="container-fluid mt-4">

      {/* Action Buttons */}
        <div className="row g-4 mb-4">

  {/* Add New Item */}
  <div className="col-md-6">
    <div
      className="card border-0 shadow-sm h-100"
      style={{
        minHeight: "180px",
        borderLeft: "5px solid #0d6efd",
        background: "linear-gradient(135deg, #ffffff 0%, #f0f6ff 100%)",
      }}
    >
      <div className="card-body d-flex flex-column justify-content-center p-4">

        <h5 className="fw-semibold mb-2">
          Add New Stock Item
        </h5>

        <p className="text-muted mb-3">
          Create and add a new item to your stock master.
        </p>

        {onAddNew && (
          <button
            type="button"
            className="btn btn-primary px-4"
            onClick={onAddNew}
          >
            + Add New Item
          </button>
        )}

      </div>
    </div>
  </div>


  {/* View & Edit */}
  <div className="col-md-6">
    <div
      className="card border-0 shadow-sm h-100"
      style={{
        minHeight: "180px",
        borderLeft: "5px solid #198754",
        background: "linear-gradient(135deg, #ffffff 0%, #effaf4 100%)",
      }}
    >
      <div className="card-body d-flex flex-column justify-content-center p-4">

        <h5 className="fw-semibold mb-2">
          Stock Item Management
        </h5>

        <p className="text-muted mb-3">
          View, edit, and manage your existing stock items.
        </p>

        {onViewStock && (
          <button
            type="button"
            className="btn btn-success px-4"
            onClick={onViewStock}
          >
            View & Edit Stock Items
          </button>
        )}

      </div>
    </div>
  </div>

</div>


      {/* Recently Added */}
      <div className="card shadow-sm">
        <div className="card-body">

          <h2 className="h5 mb-3">
            Recently Added Stock Items
          </h2>

          {items.length === 0 ? (
            <p className="text-muted mb-0">
              No stock items added yet.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item Name</th>
                    <th>Group</th>
                    <th>Unit</th>
                    <th>Alternate Unit</th>
                    <th>Opening Stock</th>
                  </tr>
                </thead>

                <tbody>
                  {items.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td>{item.item_name}</td>
                      <td>{item.stock_group}</td>
                      <td>{item.unit}</td>
                      <td>{item.alternate_unit || "-"}</td>
                      <td>{item.opening_qty ?? 0} {item.unit} 
                        <span className="ms-2">
                          <small className="text-muted badge">({item.conversion * item.opening_qty}{" "}
                            {item.alternate_unit})
                          </small>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>

    </div>

  );
}
