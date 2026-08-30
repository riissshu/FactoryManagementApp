import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatQty = (item) => {
  const qty = Number(item.qty) || 0;

  return item.adjustment_type === "subtract" ? `−${qty}` : `+${qty}`;
};

export const exportExcel = (filteredAdjustments) => {
  if (filteredAdjustments.length === 0) {

    return;
  }

  const rows = [];

  filteredAdjustments.forEach((entry) => {
    entry.items.forEach((item) => {
      rows.push({
        "Adjustment Entry": entry.adjustment_id,
        Date: entry.adjustment_date,
        "Adjustment Type":
          item.adjustment_type === "subtract" ? "Subtract" : "Add",
        "Stock Item": item.item_name,
        Qty: Number(item.qty) || 0,
        Unit: item.unit || "",
        Reason: item.reason || "",
        Remarks: entry.remarks || "",
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Stock Adjustments"
  );

  XLSX.writeFile(workbook, "Stock_Adjustment_Register.xlsx");
};

export const exportPDF = (filteredAdjustments, fromDate, toDate) => {
  if (filteredAdjustments.length === 0) {
    
    return;
  }

  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Stock Adjustment Register", 14, 15);

  doc.setFontSize(10);

  let dateText = "All Dates";

  if (fromDate && toDate) {
    dateText = `${fromDate} to ${toDate}`;
  } else if (fromDate) {
    dateText = `From ${fromDate}`;
  } else if (toDate) {
    dateText = `Up to ${toDate}`;
  }

  doc.text(`Date Range: ${dateText}`, 14, 22);

  const rows = [];

  filteredAdjustments.forEach((entry) => {
    entry.items.forEach((item) => {
      rows.push([
        entry.adjustment_id,
        entry.adjustment_date,
        item.adjustment_type === "subtract" ? "Subtract" : "Add",
        item.item_name,
        `${formatQty(item)} ${item.unit || ""}`,
        item.reason || "—",
      ]);
    });
  });

  autoTable(doc, {
    startY: 28,
    head: [["Entry #", "Date", "Type", "Stock Item", "Qty", "Reason"]],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fontStyle: "bold",
    },
  });

  doc.save("Stock_Adjustment_Register.pdf");
};
