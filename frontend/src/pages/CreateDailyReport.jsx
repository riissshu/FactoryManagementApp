import React, { useEffect, useRef, useState, useCallback } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import TransactionTable from "../components/TransactionTable";
import ManufacturingSection from "../components/ManufacturingSection";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyReport = () => ({
  id: null,
  date: todayISO(),
  purchases: [],
  gatePasses: [],
  manufactured: [],
});

// A row counts as "filled" once the user has picked an item AND entered a
// quantity greater than zero. Anything less (blank row, item picked but no
// qty, qty typed but no item) does not count as a usable line item.
const isFilledRow = (row) => Boolean(row.item) && Number(row.qty) > 0;
const isTouchedRow = (row) => Boolean(row.item) || row.qty !== "";

// Cleans a purchases/gatePasses array ahead of submit:
//  - entries where NOTHING was entered (no doc number, no touched rows)
//    are dropped silently -- these are just unused rows left over from
//    "+ Add entry".
//  - entries with SOME input but not enough to be valid (missing doc
//    number, or no row with both an item and a qty) block the submit with
//    a message, instead of saving a half-empty entry or silently losing
//    what the user typed.
function cleanDocuments(documents, field, label) {
  const cleaned = [];

  for (const document of documents) {
    const hasNumber = (document[field] || "").trim() !== "";
    const filledItems = document.items.filter(isFilledRow);
    const touchedAnyRow = document.items.some(isTouchedRow);

    if (!hasNumber && !touchedAnyRow) continue; // fully blank -> drop

    if (!hasNumber || filledItems.length === 0) {
      return {
        cleaned: null,
        error: `Every ${label} entry needs a ${label} number and at least one item with a quantity. Remove the incomplete entry or finish filling it in.`,
      };
    }

    cleaned.push({ ...document, items: filledItems });
  }

  return { cleaned, error: null };
}

function cleanManufacturing(entries) {
  const cleaned = [];

  for (const entry of entries) {
    const filledConsumption = entry.consumption.filter(isFilledRow);
    const filledProduction = entry.production.filter(isFilledRow);
    const touchedAny =
      entry.consumption.some(isTouchedRow) ||
      entry.production.some(isTouchedRow);

    if (!touchedAny) continue; // fully blank batch -> drop

    if (filledConsumption.length === 0 || filledProduction.length === 0) {
      return {
        cleaned: null,
        error:
          "Every manufacturing batch needs at least one consumption item and one production item, each with a quantity. Remove the incomplete batch or finish filling it in.",
      };
    }

    cleaned.push({ consumption: filledConsumption, production: filledProduction });
  }

  return { cleaned, error: null };
}

// reportId: pass an existing report's id to edit it. Leave undefined/null
// to create a new one.
export default function DailyReportForm({ reportId, onSaved }) {
  const [report, setReport] = useState(emptyReport);
  const [stockItems, setStockItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);

  const [sectionErrors, setSectionErrors] = useState({
    purchases: null,
    gatePasses: null,
    manufactured: null,
  });

  const dateInputRef = useRef(null);

  // Holds the *other* report occupying the currently-picked date, if any.
  // Null means the date is free (or belongs to this same report, when
  // editing).
  const [dateConflict, setDateConflict] = useState(null);
  const [checkingDate, setCheckingDate] = useState(false);

  useEffect(() => {
    api.getStockItems().then(setStockItems).catch(console.error);
  }, []);

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

  // Check-before-submit: whenever the date changes, ask the DB whether a
  // report already exists for it. This is a courtesy check for the user —
  // saveDailyReport / updateDailyReport enforce the real rule server-side,
  // so a race between two tabs still gets caught there.
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
          const conflict = existing && existing.id !== report.id ? existing : null;
          setDateConflict(conflict);
        })
        .catch(console.error)
        .finally(() => setCheckingDate(false));
    },
    [report.id],
  );

  useEffect(() => {
    checkDate(report.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.date]);

  // Feed the conflict into the native validation API so the date field
  // participates in the same needs-validation / was-validated flow as
  // every other required field on this form -- checkValidity() will
  // return false while a conflict exists, without a separate gate.
  useEffect(() => {
    if (!dateInputRef.current) return;
    dateInputRef.current.setCustomValidity(
      dateConflict
        ? `A daily report for ${report.date} already exists.`
        : "",
    );
  }, [dateConflict, report.date]);

  const save = async (e) => {
    e.preventDefault();

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
    const manufacturedResult = cleanManufacturing(report.manufactured);

    if (
      purchasesResult.error ||
      gatePassesResult.error ||
      manufacturedResult.error
    ) {
      setValidated(true);
      setSectionErrors({
        purchases: purchasesResult.error,
        gatePasses: gatePassesResult.error,
        manufactured: manufacturedResult.error,
      });
      return;
    }

    setSectionErrors({ purchases: null, gatePasses: null, manufactured: null });

    const payload = {
      report_date: report.date,
      purchases: purchasesResult.cleaned,
      gatePasses: gatePassesResult.cleaned,
      manufactured: manufacturedResult.cleaned,
    };

    try {
      setValidated(true);
      setSaving(true);

      if (report.id) {
        await api.updateDailyReport(report.id, payload);
      } else {
        await api.saveDailyReport(payload);
      }

      onSaved?.();
      setReport(emptyReport());
      setValidated(false);
    } catch (error) {
      console.error("Save Error:", error);
      alert(error.message);
      // The date may have collided (e.g. a concurrent save from another
      // tab beat us to it) -- re-check so the UI reflects reality.
      checkDate(report.date);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">
          {report.id ? "Edit Daily Report" : "New Daily Report"}
        </h2>
      </div>

      <form
        noValidate
        className={`needs-validation ${validated ? "was-validated" : ""}`}
        onSubmit={save}
      >
        <div className="mb-3" style={{ maxWidth: 260 }}>
          <label className="form-label">Report Date</label>
          <input
            ref={dateInputRef}
            type="date"
            className="form-control"
            name="date"
            value={report.date}
            onChange={(e) =>
              setReport((prev) => ({ ...prev, date: e.target.value }))
            }
            required
          />
          <div className="invalid-feedback">
            {dateConflict
              ? `A daily report for ${report.date} already exists. Only one report is allowed per date.`
              : "Please select a Report Date."}
          </div>
          {checkingDate && (
            <div className="form-text">Checking date&hellip;</div>
          )}
        </div>

        <TransactionTable
          title="Purchases"
          field="purchaseNo"
          documents={report.purchases}
          setDocuments={(purchases) =>
            setReport((prev) => ({ ...prev, purchases }))
          }
          stockItems={stockItems}
          error={sectionErrors.purchases}
        />

        <TransactionTable
          title="Gate Passes"
          field="gatePassNo"
          documents={report.gatePasses}
          setDocuments={(gatePasses) =>
            setReport((prev) => ({ ...prev, gatePasses }))
          }
          stockItems={stockItems}
          error={sectionErrors.gatePasses}
        />

        <ManufacturingSection
          entries={report.manufactured}
          setEntries={(manufactured) =>
            setReport((prev) => ({ ...prev, manufactured }))
          }
          stockItems={stockItems}
          error={sectionErrors.manufactured}
        />

        <div className="mt-3">
          <button
            type="submit"
            className="btn btn-primary me-2"
            disabled={saving || checkingDate}
          >
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </form>
    </div>
  );
}