// src/utils/exportUtils.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export async function exportTablePdf({
  title,
  company,
  subtitle,
  filename,
  headers,
  rows,
  numericCols = [], // e.g. indices of columns to right-align, like [2,3,4,5,6,7,8]
  accentColor = [33, 79, 62], // RGB — change to match your brand
}) {
  const doc = new jsPDF({ orientation: rows.length && headers.length > 6 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header band ---
  doc.setFillColor(...accentColor);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(company || "Stock Report", 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(title, 14, 19);

  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth - 14, 13, { align: "right" });
  }

  doc.setTextColor(0, 0, 0);

  // --- Table ---
  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: "striped",
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: accentColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 246],
    },
    columnStyles: numericCols.reduce((acc, colIndex) => {
      acc[colIndex] = { halign: "right" };
      return acc;
    }, {}),
    margin: { top: 28 },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Generated on ${new Date().toLocaleString("en-IN")}`,
        14,
        pageHeight - 8
      );
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: "right" }
      );
    },
  });

  doc.save(filename || "export.pdf");
  return { canceled: false };
}

export function exportTableExcel({ filename, sheetName = "Sheet1", headers, rows }) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename || "export.xlsx");
}