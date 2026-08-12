import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// -----------------------------------------------------
// PDF DESIGN SYSTEM
// -----------------------------------------------------

export const PDF_COLORS = {
  text: [35, 39, 42],
  muted: [107, 114, 128],
  accent: [31, 78, 121],
  border: [225, 229, 234],
  headerBg: [245, 247, 249],
  white: [255, 255, 255],
};

// -----------------------------------------------------
// PAGE SETTINGS
// -----------------------------------------------------

export const PDF_LAYOUT = {
  marginLeft: 40,
  marginRight: 40,
  top: 40,
  bottom: 35,
};

// -----------------------------------------------------
// CREATE DOCUMENT
// -----------------------------------------------------

export function createPDF() {
  return new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "A4",
  });
}

// -----------------------------------------------------
// HEADER
// -----------------------------------------------------

export function drawPDFHeader(doc, {
  companyName,
  reportTitle,
  reportDate,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  const left = PDF_LAYOUT.marginLeft;
  const right = pageWidth - PDF_LAYOUT.marginRight;

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.text);

  doc.text(companyName || "", left, 42);

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.accent);

  doc.text(
    (reportTitle || "").toUpperCase(),
    right,
    40,
    { align: "right" }
  );

  // Date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.muted);

  doc.text(
    reportDate || "",
    right,
    53,
    { align: "right" }
  );

  // Separator
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.8);

  doc.line(
    left,
    66,
    right,
    66
  );

  return 66;
}

// -----------------------------------------------------
// REPORT SUBTITLE
// -----------------------------------------------------

export function drawReportSubtitle(doc, subtitle, y = 86) {
  const left = PDF_LAYOUT.marginLeft;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.muted);

  doc.text(subtitle || "", left, y);

  return y + 18;
}

// -----------------------------------------------------
// METADATA
// -----------------------------------------------------

export function drawReportMeta(doc, meta = [], y = 90) {
  const left = PDF_LAYOUT.marginLeft;

  let x = left;

  meta.forEach((item, index) => {
    if (!item) return;

    const label = item.label || "";
    const value = item.value || "";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);

    doc.text(label.toUpperCase(), x, y);

    const labelWidth = doc.getTextWidth(
      label.toUpperCase()
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.text);

    doc.text(
      value,
      x + labelWidth + 6,
      y
    );

    x += labelWidth + doc.getTextWidth(value) + 45;
  });

  return y + 18;
}

// -----------------------------------------------------
// TABLE
// -----------------------------------------------------

export function drawPDFTable(doc, {
  columns,
  rows,
  startY,
  columnStyles = {},
  highlightColumn = null,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  autoTable(doc, {
    startY,

    margin: {
      left: PDF_LAYOUT.marginLeft,
      right: PDF_LAYOUT.marginRight,
    },

    head: [columns],
    body: rows,

    theme: "plain",

    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: PDF_COLORS.text,
      cellPadding: {
        top: 7,
        bottom: 7,
        left: 5,
        right: 5,
      },
      lineColor: PDF_COLORS.border,
      lineWidth: 0.4,
      valign: "middle",
    },

    headStyles: {
      fillColor: PDF_COLORS.headerBg,
      textColor: PDF_COLORS.muted,
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
      fillColor: PDF_COLORS.white,
    },

    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },

    columnStyles,

    didParseCell(data) {
      // Make selected column slightly stronger
      if (
        highlightColumn !== null &&
        data.section === "body" &&
        data.column.index === highlightColumn
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = PDF_COLORS.accent;
      }
    },

    didDrawCell(data) {
      // Very subtle bottom separator
      if (data.section === "body") {
        doc.setDrawColor(...PDF_COLORS.border);
        doc.setLineWidth(0.3);

        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  });

  return doc.lastAutoTable.finalY;
}

// -----------------------------------------------------
// FOOTER
// -----------------------------------------------------

export function drawPDFFooter(doc, {
  generatedAt,
}) {
  const pageCount = doc.internal.getNumberOfPages();

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const left = PDF_LAYOUT.marginLeft;
    const right = pageWidth - PDF_LAYOUT.marginRight;

    // Footer separator
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.6);

    doc.line(
      left,
      pageHeight - 35,
      right,
      pageHeight - 35
    );

    // Generated time
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_COLORS.muted);

    doc.text(
      `Generated ${generatedAt}`,
      left,
      pageHeight - 20
    );

    // Page number
    doc.text(
      `Page ${page} of ${pageCount}`,
      right,
      pageHeight - 20,
      { align: "right" }
    );
  }
}