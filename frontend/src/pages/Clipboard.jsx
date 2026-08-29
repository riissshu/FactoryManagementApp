import React, { useEffect, useState } from "react";
import api from "../services/api";

const TYPE_LABELS = {
  purchase: "Purchase",
  dispatch: "Dispatch",
  production: "Production",
};

const TYPE_ICONS = {
  purchase: "bi-cart-check",
  dispatch: "bi-truck",
  production: "bi-gear",
};

const formatDate = (date) => {
  if (!date) return "";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export default function Clipboard({ navigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadClipboard = async () => {
    try {
      const data = await api.getClipboard();
      setItems(data || []);
    } catch (error) {
      console.error("Unable to load Clipboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClipboard();
  }, []);

  const handlePin = async (item) => {
    await api.pinClipboard(item);
    await loadClipboard();
  };

  const handleUnpin = async (item) => {
    await api.unpinClipboard(item);
    await loadClipboard();
  };

  const handleDelete = async (item) => {
    await api.deleteClipboard(item);
    await loadClipboard();
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "purchase":
        return "Purchase";
      case "dispatch":
        return "Dispatch";
      case "production":
        return "Production";
      default:
        return type;
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Clipboard</h4>
          <span className="text-muted small">
            Copied Purchase, Dispatch and Production entries.
          </span>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={async () => {
              await api.clearClipboard();
              await loadClipboard();
            }}
          >
            <i className="bi bi-trash me-1"></i>
            Clear All
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("dashboard")}
          >
            Back
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">Loading Clipboard...</div>
      ) : items.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle bg-light mx-auto mb-3"
              style={{
                width: "64px",
                height: "64px",
              }}
            >
              <i className="bi bi-clipboard fs-3 text-muted"></i>
            </div>

            <h6 className="fw-semibold mb-1">Clipboard is empty</h6>

            <div className="text-muted small">
              Copy a Purchase, Dispatch, or Production entry to keep it here for
              later use.
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="list-group list-group-flush">
            {items.map((item) => (
              <div
                key={item.id}
                className="border rounded-3 p-3 mb-3 bg-white shadow-sm"
              >
                <div className="d-flex justify-content-between align-items-start">
                  {/* Entry information */}
                  <div className="d-flex align-items-start gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3 bg-light"
                      style={{
                        width: "44px",
                        height: "44px",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className={`bi ${
                          TYPE_ICONS[item.entry_type] || "bi-clipboard"
                        } fs-5 text-primary`}
                      ></i>
                    </div>

                    <div>
                      <div className="fw-semibold fs-6">{item.title}</div>

                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className="small text-muted">
                          {TYPE_LABELS[item.entry_type] || item.entry_type}
                        </span>

                        {item.data?.sourceReference && (
                          <span className="small text-muted">
                            · {item.data.sourceReference}
                          </span>
                        )}

                        {item.data?.sourceDate && (
                          <span className="small text-muted">
                            · {formatDate(item.data.sourceDate)}
                          </span>
                        )}

                        {item.pinned && (
                          <span className="badge text-bg-primary">
                            <i className="bi bi-pin-fill me-1"></i>
                            Pinned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    {item.pinned ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleUnpin(item)}
                      >
                        <i className="bi bi-pin-angle me-1"></i>
                        
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handlePin(item)}
                      >
                        <i className="bi bi-pin me-1"></i>
                        
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(item)}
                    >
                      <i className="bi bi-trash me-1"></i>
                      
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
