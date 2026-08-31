import { useEffect, useState } from "react";
import DailyReportTables from "../components/DailyReportTables";
import PurchaseEntry from "../components/PurchaseEntry";
import DispatchEntry from "../components/DispatchEntry";
import ManufacturingEntry from "../components/ManufacturingEntry";
import api from "../services/api";

export default function EditDailyReport({
  reportId,
  masterPassword = "",
  onSaved,
  onClose,
}) {
  const [date, setDate] = useState("");
  const [stockItems, setStockItems] = useState([]);

  const [data, setData] = useState({
    purchases: [],
    gatePasses: [],
    manufactured: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(null);

  const [editingPurchase, setEditingPurchase] =
    useState(null);

  const [editingDispatch, setEditingDispatch] =
    useState(null);

  const [editingManufacturing, setEditingManufacturing] =
    useState(null);

  // --------------------------------------------------
  // LOAD REPORT
  // --------------------------------------------------

  useEffect(() => {
    const loadData = async () => {
      try {
        const [report, items] = await Promise.all([
          api.getDailyReportById(reportId),
          api.getStockItems(),
        ]);

        if (!report) {
          console.error("Daily report not found.");
          return;
        }

        setDate(
          report.date ||
            report.report_date ||
            ""
        );

        setData({
          purchases: report.purchases || [],
          gatePasses: report.gatePasses || [],
          manufactured:
            report.manufactured || [],
        });

        setStockItems(items || []);
      } catch (error) {
        console.error(
          "Unable to load daily report:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      loadData();
    }
  }, [reportId]);

  // --------------------------------------------------
  // PURCHASE
  // --------------------------------------------------

  const openPurchase = (entry = null) => {
    setEditingPurchase(entry);
    setModal("purchase");
  };

  const savePurchase = (entry) => {
    setData((prev) => {
      const purchases = [...prev.purchases];

      if (editingPurchase) {
        const index =
          prev.purchases.indexOf(
            editingPurchase
          );

        if (index !== -1) {
          purchases[index] = entry;
        }
      } else {
        purchases.push(entry);
      }

      return {
        ...prev,
        purchases,
      };
    });

    setEditingPurchase(null);
    setModal(null);
  };

  // --------------------------------------------------
  // DISPATCH
  // --------------------------------------------------

  const openDispatch = (entry = null) => {
    setEditingDispatch(entry);
    setModal("dispatch");
  };

  const saveDispatch = (entry) => {
    setData((prev) => {
      const gatePasses = [...prev.gatePasses];

      if (editingDispatch) {
        const index =
          prev.gatePasses.indexOf(
            editingDispatch
          );

        if (index !== -1) {
          gatePasses[index] = entry;
        }
      } else {
        gatePasses.push(entry);
      }

      return {
        ...prev,
        gatePasses,
      };
    });

    setEditingDispatch(null);
    setModal(null);
  };

  // --------------------------------------------------
  // MANUFACTURING
  // --------------------------------------------------

  const openManufacturing = (
    entry = null
  ) => {
    setEditingManufacturing(entry);
    setModal("manufacturing");
  };

  const saveManufacturing = (entry) => {
    setData((prev) => {
      const manufactured = [
        ...prev.manufactured,
      ];

      if (editingManufacturing) {
        const index =
          prev.manufactured.indexOf(
            editingManufacturing
          );

        if (index !== -1) {
          manufactured[index] = entry;
        }
      } else {
        manufactured.push(entry);
      }

      return {
        ...prev,
        manufactured,
      };
    });

    setEditingManufacturing(null);
    setModal(null);
  };

  // --------------------------------------------------
  // DELETE PURCHASE
  // --------------------------------------------------

  const deletePurchase = (index) => {
    if (
      !window.confirm(
        "Delete this purchase entry?"
      )
    ) {
      return;
    }

    setData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // --------------------------------------------------
  // DELETE DISPATCH
  // --------------------------------------------------

  const deleteDispatch = (index) => {
    if (
      !window.confirm(
        "Delete this dispatch entry?"
      )
    ) {
      return;
    }

    setData((prev) => ({
      ...prev,
      gatePasses: prev.gatePasses.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // --------------------------------------------------
  // DELETE MANUFACTURING
  // --------------------------------------------------

  const deleteManufacturing = (index) => {
    if (
      !window.confirm(
        "Delete this manufacturing entry?"
      )
    ) {
      return;
    }

    setData((prev) => ({
      ...prev,
      manufactured:
        prev.manufactured.filter(
          (_, i) => i !== index
        ),
    }));
  };

  // --------------------------------------------------
  // SAVE / UPDATE
  // --------------------------------------------------

  const save = async () => {
    if (saving) return;

    if (!date) {
      alert(
        "Please select a report date."
      );
      return;
    }

    try {
      setSaving(true);

      await api.updateDailyReport(
        reportId,
        {
          report_date: date,
          ...data,
        },
        masterPassword
      );

      onSaved?.();
    } catch (error) {
      console.error(
        "Unable to update daily report:",
        error
      );

      alert(
        error?.message ||
          "Unable to update daily report."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="page-shell">
        <div className="content-card">
          <p className="text-muted mb-0">
            Loading daily report...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="page-shell">

      {/* HEADER */}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body px-4 py-3">

          <div className="d-flex justify-content-between align-items-center">

            <div>
              <div className="text-muted small mb-1">
                DAILY REPORT
              </div>

              <h2 className="fw-bold mb-1">
                Edit Daily Report
              </h2>

              <div className="text-muted small">
                Modify the existing stock movement
                entries for this report.
              </div>
            </div>

            <div className="d-flex align-items-center gap-4">

              <div>
                <div className="text-muted small">
                  Report ID
                </div>

                <div className="fw-semibold">
                  #{reportId}
                </div>
              </div>

              <div>
                <div className="text-muted small">
                  Report Date
                </div>

                <div className="fw-semibold">
                  {date || "-"}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ADD ENTRY BUTTONS */}

      <div className="d-flex justify-content-end gap-2 mb-3">

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => openPurchase()}
          disabled={saving}
        >
          + Add Purchase
        </button>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => openDispatch()}
          disabled={saving}
        >
          + Add Dispatch
        </button>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() =>
            openManufacturing()
          }
          disabled={saving}
        >
          + Add Manufacturing
        </button>

      </div>

      {/* EXISTING DAILY REPORT TABLES */}

      <DailyReportTables
        purchases={data.purchases}
        gatePasses={data.gatePasses}
        manufactured={data.manufactured}
        stockItems={stockItems}
        errors={{
          purchases: null,
          gatePasses: null,
          manufactured: null,
        }}
        onEditPurchase={openPurchase}
        onDeletePurchase={deletePurchase}
        onEditDispatch={openDispatch}
        onDeleteDispatch={deleteDispatch}
        onEditManufacturing={
          openManufacturing
        }
        onDeleteManufacturing={
          deleteManufacturing
        }
      />

      {/* BOTTOM ACTION BAR */}

      <div className="border-top mt-4 pt-3 pb-4">

        <div className="d-flex justify-content-between align-items-center">

          <div>
            <div className="fw-semibold">
              Edit Daily Report #{reportId}
            </div>

            <div className="text-muted small">
              Review your changes before updating
              the report.
            </div>
          </div>

          <div className="d-flex gap-2">

            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? "Updating..."
                : "Update Daily Report"}
            </button>

          </div>

        </div>

      </div>

      {/* PURCHASE MODAL */}

      {modal === "purchase" && (
        <PurchaseEntry
          stockItems={stockItems}
          entry={editingPurchase}
          onSave={savePurchase}
          onClose={() => {
            setModal(null);
            setEditingPurchase(null);
          }}
        />
      )}

      {/* DISPATCH MODAL */}

      {modal === "dispatch" && (
        <DispatchEntry
          stockItems={stockItems}
          entry={editingDispatch}
          onSave={saveDispatch}
          onClose={() => {
            setModal(null);
            setEditingDispatch(null);
          }}
        />
      )}

      {/* MANUFACTURING MODAL */}

      {modal === "manufacturing" && (
        <ManufacturingEntry
          stockItems={stockItems}
          entry={editingManufacturing}
          onSave={saveManufacturing}
          onClose={() => {
            setModal(null);
            setEditingManufacturing(null);
          }}
        />
      )}

    </div>
  );
}