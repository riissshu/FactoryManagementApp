// src/utils/exportUtils.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// =====================================================
// PDF DESIGN
// =====================================================

const PDF = {
  text: [35, 39, 42],
  muted: [107, 114, 128],
  accent: [31, 78, 121],
  header: [245, 247, 249],
  border: [225, 229, 234],
  white: [255, 255, 255],
};

// =====================================================
// EXPORT TABLE TO PDF
// =====================================================

export async function exportTablePdf({
  title,
  company,
  subtitle,
  filename,
  headers,
  rows,
  numericCols = [],
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "A4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const marginLeft = 40;
  const marginRight = 40;

  // ===================================================
  // HEADER
  // ===================================================

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF.text);

  doc.text(
    company || "Factory",
    marginLeft,
    42
  );

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF.accent);

  doc.text(
    (title || "").toUpperCase(),
    pageWidth - marginRight,
    40,
    { align: "right" }
  );

  // Date / subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF.muted);

  doc.text(
    subtitle || "",
    pageWidth - marginRight,
    53,
    { align: "right" }
  );

  // Header separator
  doc.setDrawColor(...PDF.border);
  doc.setLineWidth(0.8);

  doc.line(
    marginLeft,
    66,
    pageWidth - marginRight,
    66
  );

  // ===================================================
  // SMALL REPORT DESCRIPTION
  // ===================================================

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF.muted);

  doc.text(
    title || "Report",
    marginLeft,
    88
  );

  // ===================================================
  // TABLE
  // ===================================================

  autoTable(doc, {
    startY: 102,

    margin: {
      left: marginLeft,
      right: marginRight,
      bottom: 45,
    },

    head: [headers],

    body: rows,

    theme: "plain",

    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: PDF.text,

      cellPadding: {
        top: 7,
        bottom: 7,
        left: 5,
        right: 5,
      },

      valign: "middle",

      lineColor: PDF.border,
      lineWidth: 0.3,
    },

    headStyles: {
      fillColor: PDF.header,
      textColor: PDF.muted,

      fontStyle: "bold",
      fontSize: 7.5,

      cellPadding: {
        top: 7,
        bottom: 7,
        left: 5,
        right: 5,
      },

      lineWidth: 0,
    },

    bodyStyles: {
      fillColor: PDF.white,
    },

    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },

    // -----------------------------------------------
    // Alignment
    // -----------------------------------------------

    columnStyles: headers.reduce(
      (styles, _, index) => {
        if (numericCols.includes(index)) {
          styles[index] = {
            halign: "right",
          };
        } else if (index === 0) {
          styles[index] = {
            halign: "left",
          };
        } else {
          styles[index] = {
            halign: "left",
          };
        }

        return styles;
      },
      {}
    ),

    // -----------------------------------------------
    // Emphasize Balance column
    // -----------------------------------------------

    didParseCell(data) {
      if (
        data.section === "body" &&
        data.column.index === headers.length - 1
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = PDF.accent;
      }
    },
  });

  // ===================================================
  // FOOTER
  // ===================================================

  const generatedAt = new Date().toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Footer line
    doc.setDrawColor(...PDF.border);
    doc.setLineWidth(0.6);

    doc.line(
      marginLeft,
      pageHeight - 35,
      pageWidth - marginRight,
      pageHeight - 35
    );

    // Generated time
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF.muted);

    doc.text(
      `Generated ${generatedAt}`,
      marginLeft,
      pageHeight - 20
    );

    // Page number
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - marginRight,
      pageHeight - 20,
      {
        align: "right",
      }
    );
  }

  // ===================================================
  // SAVE
  // ===================================================

  // doc.save(filename || "report.pdf");


  const settings = await window.api.getSettings();

const openPdfAfterExport =
  Number(settings?.open_pdf_after_export) === 1;

const pdfData = doc.output("arraybuffer");

return await window.api.exportPdf({
  title,
  filename: filename || "report.pdf",
  pdfData,
  openPdfAfterExport,
});
}

export function exportTableExcel({ filename, sheetName = "Sheet1", headers, rows }) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename || "export.xlsx");
}