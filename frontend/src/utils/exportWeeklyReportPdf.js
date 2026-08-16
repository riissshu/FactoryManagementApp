import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportWeeklyReportPdf = ({
  date,
  rows,
  physicalStock,
}) => {
  const doc = new jsPDF("p", "mm", "a4");

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-GB")
    : "";

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Weekly Report", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Physical Stock Verification", 14, 25);

  doc.text(`Report Date: ${formattedDate}`, 196, 18, {
    align: "right",
  });

  // Separate rows by stock group
  const groups = [
    "Raw Material",
    "Packaging Material",
    "Finished Goods",
  ];

  let currentY = 33;

  groups.forEach((group) => {
    const groupRows = rows.filter(
      (row) => row.stock_group === group
    );

    if (groupRows.length === 0) return;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(group, 14, currentY);

    currentY += 4;

    const tableData = groupRows.map((row, index) => {
      const physical =
        physicalStock[row.id] !== undefined &&
        physicalStock[row.id] !== ""
          ? Number(physicalStock[row.id])
          : "";

      let difference = "";

      if (physical !== "") {
        difference = physical - Number(row.balance_qty);

        if (difference === 0) {
          difference = "Matched";
        } else if (difference < 0) {
          difference = `Short ${Math.abs(difference)}`;
        } else {
          difference = `Excess ${difference}`;
        }
      }

      return [
        index + 1,
        row.item_name,
        row.unit,
        row.balance_qty,
        physical,
        difference,
      ];
    });

    autoTable(doc, {
      startY: currentY + 2,
      head: [
        [
          "#",
          "Stock Item",
          "Unit",
          "Available Balance",
          "Physical Stock",
          "Difference",
        ],
      ],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        valign: "middle",
      },
      headStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 55 },
        2: { cellWidth: 20 },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 32, halign: "right" },
        5: { cellWidth: 35, halign: "center" },
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Start a new page if necessary
    if (currentY > 270 && group !== "Finished Goods") {
      doc.addPage();
      currentY = 20;
    }
  });

  doc.save(
    `Weekly_Report_${date || "Report"}.pdf`
  );
};