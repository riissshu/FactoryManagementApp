import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportStockSummaryPDF = (rows) => {
  const doc = new jsPDF();

   const today = new Date().toLocaleDateString("en-GB");

  doc.setFontSize(16);
  doc.text("Stock Summary", 14, 15);

   doc.setFontSize(10);
  doc.text(`Date: ${today}`, 14, 22);

  doc.setFontSize(10);
  doc.text("Current Stock Balances", 14, 29);

  // Group rows by stock group
  const groupedRows = rows.reduce((groups, row) => {
    const group = row.stock_group || "Ungrouped";

    if (!groups[group]) {
      groups[group] = [];
    }

    groups[group].push(row);
    return groups;
  }, {});

  let currentY = 38;

  Object.entries(groupedRows).forEach(([groupName, groupRows]) => {
    // Group heading
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(groupName, 14, currentY);

    currentY += 4;

    const body = groupRows.map((row) => {
      let availableBalance = `${row.balance_qty || 0} ${
        row.unit || ""
      }`;

      return [
        row.item_name || "",
        availableBalance,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["Item", "Available Balance"]],
      body,
      theme: "grid",
      styles: {
        fontSize: 9,
      },
      headStyles: {
        fontStyle: "bold",
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    // Get position after the table
    currentY = doc.lastAutoTable.finalY + 10;

    // Create new page if needed
    if (currentY > 270) {
      doc.addPage();
      currentY = 20;
    }
  });

  doc.save("Stock_Summary.pdf");
};

export const exportStockSummaryExcel = (rows) => {
  const data = rows.map((row) => ({
    Group: row.stock_group || "Ungrouped",
    Item: row.item_name || "",
    "Available Balance": row.balance_qty || 0,
    Unit: row.unit || "",
    "Alternate Quantity":
      row.unit &&
      row.alternate_unit &&
      row.conversion > 0 &&
      row.opening_qty > 0
        ? row.opening_qty * row.conversion
        : "",
    "Alternate Unit": row.alternate_unit || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Stock Summary"
  );

  XLSX.writeFile(workbook, "Stock_Summary.xlsx");
};