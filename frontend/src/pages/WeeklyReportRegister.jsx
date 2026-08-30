import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import { exportWeeklyReportPdf } from "../utils/exportWeeklyReportPdf";
import { exportWeeklyReportExcel } from "../utils/exportWeeklyReportExcel";

export default function WeeklyReportRegister({onClose}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.getWeeklyReports();
      setReports(data || []);
    } catch (error) {
      console.error("Unable to load weekly reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDay = (date) => {
    if (!date) return "";

    const d = new Date(`${date}T00:00:00`);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
    });
  };

  const formatDate = (date) => {
    if (!date) return "";

    const d = new Date(`${date}T00:00:00`);

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handlePdf = async (report) => {
  try {
    const savedReport = await api.getWeeklyReportById(report.id);

    if (!savedReport) {
   
      return;
    }

    const physicalStock = {};

    savedReport.items.forEach((item) => {
      physicalStock[item.stock_item_id] = item.physical_stock ?? "";
    });

    const rows = savedReport.items.map((item) => ({
      id: item.stock_item_id,
      item_name: item.item_name,
      stock_group: item.stock_group,
      balance_qty: item.available_balance,
      unit: item.unit,
      alternate_unit: item.alternate_unit,
      conversion: item.conversion,
    }));

    exportWeeklyReportPdf({
      date: savedReport.report_date,
      rows,
      physicalStock,
    });
  } catch (error) {
    console.error("Unable to export weekly report:", error);
    
  }
};

 const handleExcel = async (report) => {
  try {
    const savedReport = await api.getWeeklyReportById(report.id);

    if (!savedReport) {
     
      return;
    }

    exportWeeklyReportExcel(savedReport);
   
  } catch (error) {
    console.error("Unable to export weekly report:", error);
    
  }
};

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 fw-semibold">Weekly Report Register</h5>
        <button
  type="button"
  className="btn btn-sm btn-outline-secondary"
  onClick={onClose}
>
  Back
</button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th className="text-center">Download / Export</th>
            
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-3">
                  Loading...
                </td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-3 text-muted">
                  No weekly reports found.
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDate(report.report_date)}</td>

                  <td>{getDay(report.report_date)}</td>

                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger me-2"
                      onClick={() => handlePdf(report)}
                    >
                     <i class="bi bi-filetype-pdf"></i> PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleExcel(report)}
                    >
                     <i class="bi bi-file-earmark-spreadsheet"></i> Excel
                    </button>
                  </td>

                 
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}