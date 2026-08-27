import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function BoMDashboard({ onClose, onCreate, onViewBom }) {
  const [activeTab, setActiveTab] = useState("list");
  const [stockGroupSettings, setStockGroupSettings] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [boms, setBoms] = useState([]);

  useEffect(() => {
    if (activeTab !== "settings") return;

    const loadBOMStockGroupSettings = async () => {
      try {
        setLoadingSettings(true);

        const data = await api.getBOMStockGroupSettings();

        setStockGroupSettings(data || []);
      } catch (error) {
        console.error("Failed to load BOM stock group settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadBOMStockGroupSettings();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "list") return;

    const loadBOMs = async () => {
      try {
        const data = await api.getBOMs();

        setBoms(data || []);
      } catch (error) {
        console.error("Failed to load BOMs:", error);
      }
    };

    loadBOMs();
  }, [activeTab]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">BOM</h4>

        {onClose && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>

      {/* BOM Navigation */}
      <div className="mb-3">
        <button
          type="button"
          className={`btn me-2 ${
            activeTab === "list" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setActiveTab("list")}
        >
          BOM List
        </button>

        <button
          type="button"
          className={`btn ${
            activeTab === "settings" ? "btn-primary" : "btn-outline-primary"
          }`}
          onClick={() => setActiveTab("settings")}
        >
          BOM Settings
        </button>
      </div>

      {/* BOM List */}
      {activeTab === "list" && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>BOM List</strong>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onCreate}
            >
              Create New BOM
            </button>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Finished Product</th>
                    <th>BOM Name</th>
                    <th className="text-end">Output Qty</th>
                    <th>Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {boms.length > 0 ? (
                    boms.map((bom) => (
                      <tr
                        key={bom.id}
                        onClick={() => onViewBom(bom.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{bom.finished_product}</td>
                        <td>{bom.bom_name}</td>
                        <td className="text-end">{bom.output_qty}</td>
                        <td>{bom.unit}</td>
                        <td>{bom.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-4">
                        No BOMs available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BOM Settings - placeholder for now */}
      {activeTab === "settings" && (
        <div className="card">
          <div className="card-header">
            <strong>BOM Settings</strong>
          </div>

          <div className="card-body p-0">
            {loadingSettings ? (
              <div className="text-center py-4">Loading stock groups...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Stock Group</th>
                      <th className="text-center">Available for BOM</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stockGroupSettings.length > 0 ? (
                      stockGroupSettings.map((group) => (
                        <tr key={group.id}>
                          <td>{group.name}</td>

                          <td className="text-center">
                            <div className="form-check form-switch d-inline-block">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={Boolean(group.available_for_bom)}
                                onChange={async (e) => {
                                  const available = e.target.checked;

                                  try {
                                    await api.setBOMStockGroupAvailability(
                                      group.id,
                                      available,
                                    );

                                    setStockGroupSettings((current) =>
                                      current.map((item) =>
                                        item.id === group.id
                                          ? {
                                              ...item,
                                              available_for_bom: available
                                                ? 1
                                                : 0,
                                            }
                                          : item,
                                      ),
                                    );
                                  } catch (error) {
                                    console.error(
                                      "Failed to update BOM stock group setting:",
                                      error,
                                    );
                                  }
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="text-center text-muted py-4">
                          No stock groups available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
