import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";




// -----------------------------------------
// EXPORT PDF
// -----------------------------------------

export const exportDetailedStockPDF = ({
  item,
  rows,
  filename,
}) => {
  const doc = new jsPDF("landscape");

  const today = new Date().toLocaleDateString("en-IN");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Stock Report", 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  doc.text(
    `Stock Item: ${item?.item_name || ""}`,
    14,
    23
  );

  doc.text(
    `Generated: ${today}`,
    14,
    30
  );

  const tableRows = rows.map((row) => [
    row.transaction_date || "Opening",
    row.transaction_type || "-",
    row.reference_no || "-",
    row.inward_qty || "",
    row.outward_qty || "",
    row.balance_qty ?? "",
    row.unit || item?.unit || "",
    row.reason || row.remarks || "-",
  ]);

  autoTable(doc, {
    startY: 36,

    head: [[
      "Date",
      "Particulars",
      "Reference",
      "Inward",
      "Outward",
      "Balance",
      "Unit",
      "Reason / Remarks",
    ]],

    body: tableRows,

    theme: "grid",

    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: "middle",
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 38 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 18 },
      7: { cellWidth: 70 },
    },

    margin: {
      left: 10,
      right: 10,
    },
  });

  doc.save(
    filename || "Detailed-stock-report.pdf"
  );
};


// -----------------------------------------
// EXPORT EXCEL
// -----------------------------------------

export const exportDetailedStockExcel = ({
  item,
  rows,
  filename,
}) => {
  const workbook = XLSX.utils.book_new();

  const data = [];

  data.push(["Detailed Stock Report"]);

  data.push([
    "Stock Item",
    item?.item_name || "",
  ]);

  data.push([
    "Group",
    item?.stock_group || "",
  ]);

  data.push([
    "Unit",
    item?.unit || "",
  ]);

  data.push([]);

  data.push([
    "Date",
    "Particulars",
    "Reference",
    "Inward",
    "Outward",
    "Balance",
    "Unit",
    "Reason / Remarks",
  ]);

  rows.forEach((row) => {
    data.push([
      row.transaction_date || "Opening",
      row.transaction_type || "-",
      row.reference_no || "-",
      row.inward_qty || "",
      row.outward_qty || "",
      row.balance_qty ?? "",
      row.unit || item?.unit || "",
      row.reason || row.remarks || "-",
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 35 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Detailed Stock Report"
  );

  XLSX.writeFile(
    workbook,
    filename || "Detailed-stock-report.xlsx"
  );
};