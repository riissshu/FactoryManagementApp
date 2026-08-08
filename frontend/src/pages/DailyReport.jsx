import { useEffect, useState } from "react";
import ManufacturingSection from "../components/ManufacturingSection";
import PageHeader from "../components/PageHeader";
import TransactionTable from "../components/TransactionTable";
import api from "../services/api";
import { exportTablePdf } from "../utils/reportExport";
import { exportDailyReportPdf } from "../utils/exportDailyReportPdf";

const row = () => ({ item: "", qty: "", unit: "" });
const fresh = () => ({
  purchases: [{ purchaseNo: "", items: [row()] }],
  gatePasses: [{ gatePassNo: "", items: [row()] }],
  manufactured: [{ consumption: [row()], production: [row()] }],
});
export default function DailyReport({ reportId, mode, onClose, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentMode, setCurrentMode] = useState(mode);
  const [stockItems, setStockItems] = useState([]);
  const [data, setData] = useState(fresh());
  useEffect(() => {
    api.getStockItems().then(setStockItems).catch(console.error);
  }, []);
  useEffect(() => {
    setCurrentMode(mode);
    if (reportId && mode === "view")
      api.getDailyReportById(reportId).then((report) => {
        if (report) {
          setDate(report.date);
          setData({
            purchases: report.purchases,
            gatePasses: report.gatePasses,
            manufactured: report.manufactured,
          });
        }
      });
  }, [reportId, mode]);
  const save = async () => {
    if (!date) return alert("Please select a report date.");
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
    if (mismatch)
      return alert(
        "Consumption and production quantities must match. Add the difference as a Material loss row under Production before saving.",
      );
    await (currentMode === "edit"
      ? api.updateDailyReport(reportId, { report_date: date, ...data })
      : api.saveDailyReport({ report_date: date, ...data }));
    onSaved?.();
  };

  const exportPdf = async () => {
    const settings = await api.getSettings();

    await exportDailyReportPdf({
      company: settings?.factory_name,
      reportDate: date,

      purchases: data.purchases,
      gatePasses: data.gatePasses,
      manufactured: data.manufactured,

      stockItems,

      filename: `${settings?.factory_name || "factory"}-daily-report-${date}.pdf`,
    });
  };

  const disabled = currentMode === "view";
  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Transactions"
        title="Daily report"
        actions={
          <>
            <button className="btn btn-outline-primary" onClick={exportPdf}>
              <i className="bi bi-file-earmark-pdf me-2" />
              Export PDF
            </button>
            <button className="btn btn-outline-secondary" onClick={onClose}>
              Close
            </button>
          </>
        }
      />
      <fieldset disabled={disabled}>
        <div className="date-card">
          <label>
            Report date
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>
        <TransactionTable
          title="Purchases"
          documents={data.purchases}
          setDocuments={(purchases) => setData({ ...data, purchases })}
          field="purchaseNo"
          stockItems={stockItems}
        />
        <TransactionTable
          title="Gate Passes"
          documents={data.gatePasses}
          setDocuments={(gatePasses) => setData({ ...data, gatePasses })}
          field="gatePassNo"
          stockItems={stockItems}
        />
        <ManufacturingSection
          entries={data.manufactured}
          setEntries={(manufactured) => setData({ ...data, manufactured })}
          stockItems={stockItems}
        />
      </fieldset>
      <div className="sticky-actions">
        {!disabled && (
          <button className="btn btn-primary" onClick={save}>
            Save report
          </button>
        )}
        {disabled && (
          <button
            className="btn btn-primary"
            onClick={() => setCurrentMode("edit")}
          >
            Edit report
          </button>
        )}{" "}
        {disabled && (
          <button
            className="btn btn-outline-danger"
            onClick={async () => {
              if (confirm("Delete this daily report?")) {
                await api.deleteDailyReport(reportId);
                onSaved?.();
              }
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
