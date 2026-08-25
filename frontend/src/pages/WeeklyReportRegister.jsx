import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import { exportWeeklyReportPdf } from "../utils/exportWeeklyReportPdf";
import * as XLSX from "xlsx";

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

    const workbook = XLSX.utils.book_new();

    const reportDate = new Date(
      `${savedReport.report_date}T00:00:00`
    );

    const formattedDate = reportDate.toLocaleDateString("en-GB");

    const day = reportDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const groups = [
      "Raw Material",
      "Packaging Material",
      "Finished Goods",
    ];

    const sheetData = [];

    // Title
    sheetData.push(["Weekly Report"]);
    sheetData.push(["Physical Stock Verification"]);
    sheetData.push([]);

    // Date and Day
    sheetData.push(["Report Date:", formattedDate]);
    sheetData.push(["Day:", day]);
    sheetData.push([]);

    groups.forEach((group) => {
      const groupItems = savedReport.items.filter(
        (item) => item.stock_group === group
      );

      if (groupItems.length === 0) return;

      // Stock group heading
      sheetData.push([group]);

      // Column headers
      sheetData.push([
        "Stock Item",
        "Unit",
        "Available Balance",
        "Physical Stock",
        "Difference",
      ]);

      groupItems.forEach((item) => {
        const physical =
          item.physical_stock !== null &&
          item.physical_stock !== undefined
            ? Number(item.physical_stock)
            : "";

        let difference = "";

        if (physical !== "") {
          const diff =
            physical - Number(item.available_balance);

          if (diff === 0) {
            difference = "Matched";
          } else if (diff < 0) {
            difference = `Short ${Math.abs(diff)}`;
          } else {
            difference = `Excess ${diff}`;
          }
        }

        sheetData.push([
          item.item_name,
          item.unit,
          item.available_balance,
          physical,
          difference,
        ]);
      });

      // Space between stock groups
      sheetData.push([]);
      sheetData.push([]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
    ];

    // Merge title
    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: 4 },
      },
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 4 },
      },
    ];

    // Basic styling
    if (worksheet["A1"]) {
      worksheet["A1"].s = {
        font: {
          bold: true,
          sz: 16,
        },
        alignment: {
          horizontal: "center",
        },
      };
    }

    if (worksheet["A2"]) {
      worksheet["A2"].s = {
        font: {
          bold: true,
          sz: 11,
        },
        alignment: {
          horizontal: "center",
        },
      };
    }

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Weekly Report"
    );

    XLSX.writeFile(
      workbook,
      `Weekly_Report_${savedReport.report_date}.xlsx`
    );
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
              <th className="text-center">PDF</th>
              <th className="text-center">Excel</th>
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
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handlePdf(report)}
                    >
                      PDF
                    </button>
                  </td>

                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleExcel(report)}
                    >
                      Excel
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