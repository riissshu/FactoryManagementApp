import { useEffect, useState } from "react";
import ManufacturingSection from "../components/ManufacturingSection";
import TransactionTable from "../components/TransactionTable";
import api from "../services/api";
import { exportDailyReportPdf } from "../utils/exportDailyReportPdf";

const row = () => ({ item: "", qty: "", unit: "" });
const fresh = () => ({
  purchases: [{ purchaseNo: "", items: [row()] }],
  gatePasses: [{ gatePassNo: "", items: [row()] }],
  manufactured: [{ consumption: [row()], production: [row()] }],
});
export default function DailyReport({ onClose, }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [stockItems, setStockItems] = useState([]);
  const [data, setData] = useState(fresh());
  useEffect(() => {
    api.getStockItems().then(setStockItems).catch(console.error);
  }, []);
 
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
    await api.saveDailyReport({ report_date: date, ...data });
      onClose ();
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


  return (
    <div className="page-shell">
     
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
     
          <button className="btn btn-primary" onClick={save}>
            Save report
          </button>
      
     
      </div>
    </div>
  );
}
