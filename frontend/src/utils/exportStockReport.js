import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportPdf = (rows) => {
  const doc = new jsPDF();

  const today = new Date().toLocaleDateString("en-GB");

  doc.setFontSize(16);
  doc.text("Stock Report", 14, 15);

  doc.setFontSize(10);
  doc.text(`Date: ${today}`, 14, 22);

  const groups = [...new Set(rows.map((item) => item.stock_group))];

  let currentY = 28;

  groups.forEach((group) => {
    const groupRows = rows.filter(
      (item) => item.stock_group === group
    );

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(group, 14, currentY);

    currentY += 4;

    const tableData = groupRows.map((item) => [
      item.item_name,
      item.unit,
      item.opening_qty ?? 0,
      item.purchased_qty ?? 0,
      item.produced_qty ?? 0,
      item.dispatched_qty ?? 0,
      item.consumed_qty ?? 0,
      Number(item.adjustment_add_qty ?? 0) -
        Number(item.adjustment_subtract_qty ?? 0),
      `${item.balance_qty ?? 0} ${item.unit ?? ""}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          "Item",
          "Unit",
          "Opening",
          "Received",
          "Produced",
          "Dispatched",
          "Consumed",
          "Adjustment",
          "Balance",
        ],
      ],
      body: tableData,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fontSize: 8,
        fontStyle: "bold",
      },

      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 15 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    currentY = doc.lastAutoTable.finalY + 10;
  });

  doc.save(`Stock_Report_${today.replaceAll("/", "-")}.pdf`);
};

export const exportExcel = (rows) => {
  const excelData = rows.map((item) => ({
    Group: item.stock_group,
    Item: item.item_name,
    Unit: item.unit,
    Opening: item.opening_qty ?? 0,
    Received: item.purchased_qty ?? 0,
    Produced: item.produced_qty ?? 0,
    Dispatched: item.dispatched_qty ?? 0,
    Consumed: item.consumed_qty ?? 0,
    Adjustment:
      Number(item.adjustment_add_qty ?? 0) -
      Number(item.adjustment_subtract_qty ?? 0),
    Balance: item.balance_qty ?? 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Stock Report"
  );

  XLSX.writeFile(workbook, "Stock_Report.xlsx");
};