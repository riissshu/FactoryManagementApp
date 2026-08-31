import React, { useCallback, useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

import PurchaseEntry from "../components/PurchaseEntry";
import DispatchEntry from "../components/DispatchEntry";
import ManufacturingEntry from "../components/ManufacturingEntry";
import DailyReportTables from "../components/DailyReportTables";
import PreviewDailyReport from "./PreviewDailyReport";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyReport = () => ({
  id: null,
  date: todayISO(),
  purchases: [],
  gatePasses: [],
  manufactured: [],
});

const isFilledRow = (row) =>
  Boolean(row.item) && Number(row.qty) > 0;

const isTouchedRow = (row) =>
  Boolean(row.item) || row.qty !== "";

function cleanDocuments(documents, field, label) {
  const cleaned = [];

  for (const document of documents) {
    const hasNumber =
      (document[field] || "").trim() !== "";

    const filledItems =
      document.items.filter(isFilledRow);

    const touchedAnyRow =
      document.items.some(isTouchedRow);

    if (!hasNumber && !touchedAnyRow) continue;

    if (!hasNumber || filledItems.length === 0) {
      return {
        cleaned: null,
        error: `Every ${label} entry needs a ${label} number and at least one item with a quantity.`,
      };
    }

    cleaned.push({
      ...document,
      items: filledItems,
    });
  }

  return {
    cleaned,
    error: null,
  };
}

function cleanManufacturing(entries) {
  const cleaned = [];

  for (const entry of entries) {
    const filledConsumption =
      entry.consumption.filter(isFilledRow);

    const filledProduction =
      entry.production.filter(isFilledRow);

    const touchedAny =
      entry.consumption.some(isTouchedRow) ||
      entry.production.some(isTouchedRow);

    if (!touchedAny) continue;

    if (
      filledConsumption.length === 0 ||
      filledProduction.length === 0
    ) {
      return {
        cleaned: null,
        error:
          "Every manufacturing batch needs at least one consumption item and one production item, each with a quantity.",
      };
    }

    cleaned.push({
      ...entry,
      consumption: filledConsumption,
      production: filledProduction,
    });
  }

  return {
    cleaned,
    error: null,
  };
}

export default function DailyReportForm({
  reportId,
  onSaved,
}) {
  const [report, setReport] = useState(emptyReport);
  const [stockItems, setStockItems] = useState([]);

  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const openPreview = () => {
  if (saving || checkingDate) return;

  const form = dateInputRef.current?.form;

  if (form && !form.checkValidity()) {
    setValidated(true);
    return;
  }

  const purchasesResult = cleanDocuments(
    report.purchases,
    "purchaseNo",
    "Purchase",
  );

  const gatePassesResult = cleanDocuments(
    report.gatePasses,
    "gatePassNo",
    "Gate pass",
  );

  const manufacturedResult =
    cleanManufacturing(
      report.manufactured,
    );

  if (
    purchasesResult.error ||
    gatePassesResult.error ||
    manufacturedResult.error
  ) {
    setValidated(true);

    setSectionErrors({
      purchases: purchasesResult.error,
      gatePasses: gatePassesResult.error,
      manufactured:
        manufacturedResult.error,
    });

    return;
  }

  setSectionErrors({
    purchases: null,
    gatePasses: null,
    manufactured: null,
  });

  setShowPreview(true);
};

  const [sectionErrors, setSectionErrors] = useState({
    purchases: null,
    gatePasses: null,
    manufactured: null,
  });

  const [dateConflict, setDateConflict] =
    useState(null);

  const [checkingDate, setCheckingDate] =
    useState(false);

  const dateInputRef = useRef(null);
  const saveMessageRef = useRef(null);

  const [modal, setModal] = useState(null);

  const [editingPurchase, setEditingPurchase] =
    useState(null);

  const [editingDispatch, setEditingDispatch] =
    useState(null);

  const [editingManufacturing, setEditingManufacturing] =
    useState(null);


  useEffect(() => {
  if (saveMessage && saveMessageRef.current) {
    saveMessageRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}, [saveMessage]);


  // Load stock items
  useEffect(() => {
    api
      .getStockItems()
      .then(setStockItems)
      .catch(console.error);
  }, []);

  // Load existing report
  useEffect(() => {
    if (!reportId) return;

    api
      .getDailyReportById(reportId)
      .then((existing) => {
        if (!existing) return;

        setReport({
          id: existing.id,
          date: existing.date,
          purchases: existing.purchases || [],
          gatePasses: existing.gatePasses || [],
          manufactured: existing.manufactured || [],
        });
      })
      .catch(console.error);
  }, [reportId]);

  // Date conflict check
  const checkDate = useCallback(
    (date) => {
      if (!date) {
        setDateConflict(null);
        return;
      }

      setCheckingDate(true);

      api
        .getDailyReportByDate(date)
        .then((existing) => {
          const conflict =
            existing &&
            existing.id !== report.id
              ? existing
              : null;

          setDateConflict(conflict);
        })
        .catch(console.error)
        .finally(() => setCheckingDate(false));
    },
    [report.id],
  );

  useEffect(() => {
    checkDate(report.date);
  }, [report.date, checkDate]);

  useEffect(() => {
    if (!dateInputRef.current) return;

    dateInputRef.current.setCustomValidity(
      dateConflict
        ? `A daily report for ${report.date} already exists.`
        : "",
    );
  }, [dateConflict, report.date]);

  // -----------------------------
  // Purchase
  // -----------------------------

  const openPurchase = (entry = null) => {
    setEditingPurchase(entry);
    setModal("purchase");
  };

  const savePurchase = (entry) => {
    setReport((prev) => {
      const purchases = [...prev.purchases];

      if (editingPurchase) {
        const index = prev.purchases.indexOf(
          editingPurchase,
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

  // -----------------------------
  // Dispatch
  // -----------------------------

  const openDispatch = (entry = null) => {
    setEditingDispatch(entry);
    setModal("dispatch");
  };

  const saveDispatch = (entry) => {
    setReport((prev) => {
      const gatePasses = [...prev.gatePasses];

      if (editingDispatch) {
        const index = prev.gatePasses.indexOf(
          editingDispatch,
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

  // -----------------------------
  // Manufacturing
  // -----------------------------

  const openManufacturing = (entry = null) => {
    setEditingManufacturing(entry);
    setModal("manufacturing");
  };

  const saveManufacturing = (entry) => {
    setReport((prev) => {
      const manufactured = [
        ...prev.manufactured,
      ];

      if (editingManufacturing) {
        const index =
          prev.manufactured.indexOf(
            editingManufacturing,
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

  // -----------------------------
  // Delete
  // -----------------------------

  const deletePurchase = (index) => {
    if (
      !window.confirm(
        "Delete this purchase entry?",
      )
    ) {
      return;
    }

    setReport((prev) => ({
      ...prev,
      purchases: prev.purchases.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const deleteDispatch = (index) => {
    if (
      !window.confirm(
        "Delete this dispatch entry?",
      )
    ) {
      return;
    }

    setReport((prev) => ({
      ...prev,
      gatePasses: prev.gatePasses.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const deleteManufacturing = (index) => {
    if (
      !window.confirm(
        "Delete this manufacturing entry?",
      )
    ) {
      return;
    }

    setReport((prev) => ({
      ...prev,
      manufactured:
        prev.manufactured.filter(
          (_, i) => i !== index,
        ),
    }));
  };

  // -----------------------------
  // Final save
  // -----------------------------

  const save = async (e) => {
    e?.preventDefault();

    if (saving || checkingDate) return;

    const form = e.currentTarget;

    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    const purchasesResult = cleanDocuments(
      report.purchases,
      "purchaseNo",
      "Purchase",
    );

    const gatePassesResult = cleanDocuments(
      report.gatePasses,
      "gatePassNo",
      "Gate pass",
    );

    const manufacturedResult =
      cleanManufacturing(
        report.manufactured,
      );

    if (
      purchasesResult.error ||
      gatePassesResult.error ||
      manufacturedResult.error
    ) {
      setValidated(true);

      setSectionErrors({
        purchases: purchasesResult.error,
        gatePasses: gatePassesResult.error,
        manufactured:
          manufacturedResult.error,
      });

      return;
    }

    setSectionErrors({
      purchases: null,
      gatePasses: null,
      manufactured: null,
    });

    const payload = {
      report_date: report.date,
      purchases: purchasesResult.cleaned,
      gatePasses: gatePassesResult.cleaned,
      manufactured:
        manufacturedResult.cleaned,
    };

    try {
      setValidated(true);
      setSaving(true);

      if (report.id) {
        await api.updateDailyReport(
          report.id,
          payload,
        );
      } else {
        await api.saveDailyReport(payload);
      }
      setSaveMessage(
  report.id
    ? "Daily report updated successfully."
    : "Daily report saved successfully."
);
setShowPreview(false);

      onSaved?.();



      setReport(emptyReport());
      setValidated(false);
    } catch (error) {
      console.error("Save Error:", error);
   
      checkDate(report.date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid px-4 py-4">
      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            {report.id
              ? "Edit Daily Report"
              : "Daily Report"}
          </h2>

          <div className="text-muted">
            Record today's factory stock movements
          </div>
        </div>

        {saveMessage && (
  <div
    ref={saveMessageRef}
    className="alert alert-success"
  >
    {saveMessage}
  </div>
)}

        <div style={{ width: 190 }}>
          <label className="form-label fw-semibold">
            Report Date
          </label>

          <input
            ref={dateInputRef}
            type="date"
            className="form-control"
            value={report.date}
            onChange={(e) =>
              setReport((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
            required
          />

          <div className="invalid-feedback">
            {dateConflict
              ? `A daily report for ${report.date} already exists.`
              : "Please select a Report Date."}
          </div>

          {checkingDate && (
            <div className="small text-muted mt-1">
              Checking date...
            </div>
          )}

        </div>
      </div>

      {/* TOP CARDS */}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <button
            type="button"
            className="w-100 text-start border rounded-3 bg-white p-4 shadow-sm"
            style={{
              cursor: "pointer",
              minHeight: 150,
            }}
            onClick={() => openPurchase()}
          >
            <div className="fs-1 mb-2">📥</div>

            <h5 className="fw-bold mb-1">
              Purchase
            </h5>

            <div className="text-muted small mb-3">
              Add material received
            </div>

            <span className="btn btn-primary btn-sm">
              + Add Purchase
            </span>
          </button>
        </div>

        <div className="col-md-4">
          <button
            type="button"
            className="w-100 text-start border rounded-3 bg-white p-4 shadow-sm"
            style={{
              cursor: "pointer",
              minHeight: 150,
            }}
            onClick={() => openDispatch()}
          >
            <div className="fs-1 mb-2">🚚</div>

            <h5 className="fw-bold mb-1">
              Dispatch
            </h5>

            <div className="text-muted small mb-3">
              Add material dispatched
            </div>

            <span className="btn btn-primary btn-sm">
              + Add Dispatch
            </span>
          </button>
        </div>

        <div className="col-md-4">
          <button
            type="button"
            className="w-100 text-start border rounded-3 bg-white p-4 shadow-sm"
            style={{
              cursor: "pointer",
              minHeight: 150,
            }}
            onClick={() =>
              openManufacturing()
            }
          >
            <div className="fs-1 mb-2">🏭</div>

            <h5 className="fw-bold mb-1">
              Manufacturing
            </h5>

            <div className="text-muted small mb-3">
              Add production activity
            </div>

            <span className="btn btn-primary btn-sm">
              + Add Manufacturing
            </span>
          </button>
        </div>
      </div>

      <form
        noValidate
        className={
          validated
            ? "was-validated"
            : ""
        }
        onSubmit={save}
      >
        <DailyReportTables
          purchases={report.purchases}
          gatePasses={report.gatePasses}
          manufactured={report.manufactured}
            stockItems={stockItems}
          errors={sectionErrors}
          onEditPurchase={openPurchase}
          onDeletePurchase={
            deletePurchase
          }
          onEditDispatch={openDispatch}
          onDeleteDispatch={
            deleteDispatch
          }
          onEditManufacturing={
            openManufacturing
          }
          onDeleteManufacturing={
            deleteManufacturing
          }
        />

        <div className="d-flex justify-content-end pb-4">
          <button
  type="button"
  className="btn btn-primary px-4"
  onClick={openPreview}
  disabled={saving || checkingDate}
>
  Preview
</button>
        </div>
      </form>

      {/* MODALS */}

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

      {showPreview && (
  <PreviewDailyReport
    report={report}
    stockItems={stockItems}
    onBack={() => setShowPreview(false)}
    onSave={save}
    saving={saving}
  />
)}
    </div>
  );
}