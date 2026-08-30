import * as XLSX from "xlsx";



export const exportWeeklyReportExcel = (savedReport) => {
 const workbook = XLSX.utils.book_new();

    const reportDate = new Date(
      `${savedReport.report_date}T00:00:00`
    );

    const formattedDate = reportDate.toLocaleDateString("en-GB");

    const day = reportDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const groups = [
  ...new Set(savedReport.items.map((item) => item.stock_group)),
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

    };