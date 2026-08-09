import { useEffect, useState } from "react";
import ManufacturingSection from "../components/ManufacturingSection";
import TransactionTable from "../components/TransactionTable";
import api from "../services/api";
import { exportDailyReportPdf } from "../utils/exportDailyReportPdf";

export default function ViewEditDailyReport({
  reportId,
  mode = "view",
  onClose,
}) {
  const [date, setDate] = useState("");
  const [stockItems, setStockItems] = useState([]);

  const [data, setData] = useState({
    purchases: [],
    gatePasses: [],
    manufactured: [],
  });

  const [currentMode, setCurrentMode] = useState(mode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        setDate(report.date || report.report_date || "");

        setData({
          purchases: report.purchases || [],
          gatePasses: report.gatePasses || [],
          manufactured: report.manufactured || [],
        });

        setStockItems(items || []);
      } catch (error) {
        console.error("Unable to load daily report:", error);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      loadData();
    }
  }, [reportId]);

  const save = async () => {
    if (saving) return;

    if (!date) {
      alert("Please select a report date.");
      return;
    }

    const mismatch = data.manufactured.find(
      (entry) =>
        Math.abs(
          entry.consumption.reduce(
            (sum, item) => sum + (Number(item.qty) || 0),
            0,
          ) -
            entry.production.reduce(
              (sum, item) => sum + (Number(item.qty) || 0),
              0,
            ),
        ) > 0.0001,
    );

    if (mismatch) {
      alert(
        "Consumption and production quantities must match. Add the difference as a Material loss row under Production before saving.",
      );
      return;
    }

    try {
      setSaving(true);

      await api.updateDailyReport(reportId, {
        report_date: date,
        ...data,
      });

      setCurrentMode("view");
    } catch (error) {
      console.error("Unable to update daily report:", error);

      alert(
        error?.message || "Unable to update daily report.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async () => {
    if (!window.confirm("Delete this daily report?")) {
      return;
    }

    try {
      await api.deleteDailyReport(reportId);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Unable to delete daily report:", error);

      alert(
        error?.message || "Unable to delete daily report.",
      );
    }
  };

  const exportPdf = async () => {
    try {
      const settings = await api.getSettings();

      await exportDailyReportPdf({
        company: settings?.factory_name,
        reportDate: date,
        purchases: data.purchases,
        gatePasses: data.gatePasses,
        manufactured: data.manufactured,
        stockItems,
        filename: `${
          settings?.factory_name || "factory"
        }-daily-report-${date}.pdf`,
      });
    } catch (error) {
      console.error("Unable to export daily report:", error);
    }
  };

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

  const isView = currentMode === "view";

  return (
    <div className="page-shell">
      <h2 className="pt-2 pb-2 fw-bold">
        {isView ? "Daily Report" : "Edit Daily Report"}
      </h2>

      <fieldset disabled={isView || saving}>
        {/* Date */}
        <div className="date-card">
          <label>
            Report date
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
            />
          </label>
        </div>

        {/* Purchases */}
        <TransactionTable
          title="Purchases"
          documents={data.purchases}
          setDocuments={(purchases) =>
            setData((current) => ({
              ...current,
              purchases,
            }))
          }
          field="purchaseNo"
          stockItems={stockItems}
        />

        {/* Gate Passes */}
        <TransactionTable
          title="Gate Passes"
          documents={data.gatePasses}
          setDocuments={(gatePasses) =>
            setData((current) => ({
              ...current,
              gatePasses,
            }))
          }
          field="gatePassNo"
          stockItems={stockItems}
        />

        {/* Manufacturing */}
        <ManufacturingSection
          entries={data.manufactured}
          setEntries={(manufactured) =>
            setData((current) => ({
              ...current,
              manufactured,
            }))
          }
          stockItems={stockItems}
        />
      </fieldset>

      {/* Actions */}
      <div className="sticky-actions">
        {isView ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentMode("edit")}
            >
              Edit Report
            </button>

            <button
              type="button"
              className="btn btn-outline-primary ms-2"
              onClick={exportPdf}
            >
              Export PDF
            </button>

            <button
              type="button"
              className="btn btn-outline-danger ms-2"
              onClick={deleteReport}
            >
              Delete
            </button>

            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={onClose}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={() => setCurrentMode("view")}
              disabled={saving}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}