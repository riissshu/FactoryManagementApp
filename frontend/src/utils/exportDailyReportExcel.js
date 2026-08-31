import ExcelJS from "exceljs";

export const exportDailyReportExcel = async ({
  company,
  reportDate,
  purchases = [],
  gatePasses = [],
  manufactured = [],
  stockItems = [],
  filename,
}) => {
  const workbook = new ExcelJS.Workbook();

  const worksheet =
    workbook.addWorksheet("Daily Report");

  const border = {
    top: {
      style: "thin",
      color: { argb: "BFBFBF" },
    },

    bottom: {
      style: "thin",
      color: { argb: "BFBFBF" },
    },

    left: {
      style: "thin",
      color: { argb: "BFBFBF" },
    },

    right: {
      style: "thin",
      color: { argb: "BFBFBF" },
    },
  };

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "F2F2F2",
    },
  };

  const totalFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "F8F8F8",
    },
  };

  const getStockItem = (id) =>
    stockItems.find(
      (item) =>
        String(item.id) === String(id)
    );

  const getName = (id) =>
    getStockItem(id)?.item_name || "";

  const getUnit = (id) =>
    getStockItem(id)?.unit || "";

  const totalQty = (items = []) =>
    items.reduce(
      (sum, item) =>
        sum + (Number(item.qty) || 0),
      0
    );

  const formatUnitQty = (unit, qty) => {
    const number =
      qty === "" ||
      qty === null ||
      qty === undefined
        ? ""
        : Number(qty).toString();

    if (!number) {
      return unit || "";
    }

    if (!unit) {
      return number;
    }

    return `${number} ${unit}`;
  };

  /*
   * Column widths
   */
  worksheet.columns = [
    { width: 25 },
    { width: 25 },
    { width: 32 },
    { width: 20 },
  ];

  /*
   * Report header
   */
  let row = worksheet.addRow([
    company || "Factory",
  ]);

  row.font = {
    bold: true,
    size: 16,
  };

  row.alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells(
    `A${row.number}:D${row.number}`
  );

  row = worksheet.addRow([
    "DAILY REPORT",
  ]);

  row.font = {
    bold: true,
    size: 13,
  };

  row.alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells(
    `A${row.number}:D${row.number}`
  );

  row = worksheet.addRow([
    `Report Date : ${reportDate || "-"}`,
  ]);

  row.alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells(
    `A${row.number}:D${row.number}`
  );

  worksheet.addRow([]);

  /*
   * Transaction sections
   */
  const addTransactionSection = (
    title,
    documents,
    field,
    partyField,
    partyHeader,
    numberHeader
  ) => {
    row = worksheet.addRow([
      title,
      `${documents.length} Entries`,
    ]);

    row.font = {
      bold: true,
    };

    worksheet.mergeCells(
      `B${row.number}:D${row.number}`
    );

    worksheet.addRow([]);

    documents.forEach((document) => {
      row = worksheet.addRow([
        numberHeader,
        partyHeader,
        "Stock Item",
        "Unit / Quantity",
      ]);

      row.font = {
        bold: true,
      };

      row.fill = headerFill;

      row.eachCell((cell) => {
        cell.border = border;
      });

      const items =
        document.items || [];

      items.forEach(
        (item, index) => {
          row = worksheet.addRow([
            index === 0
              ? document[field] || ""
              : "",

            index === 0
              ? document[partyField] || "-"
              : "",

            getName(item.item),

            formatUnitQty(
              getUnit(item.item),
              item.qty
            ),
          ]);

          row.eachCell((cell) => {
            cell.border = border;
          });

          row.getCell(4).alignment = {
            horizontal: "right",
          };
        }
      );

      row = worksheet.addRow([
        "",
        "",
        "Total Qty:",
        totalQty(items),
      ]);

      row.font = {
        bold: true,
      };

      row.fill = totalFill;

      row.eachCell((cell) => {
        cell.border = border;
      });

      row.getCell(3).alignment = {
        horizontal: "right",
      };

      row.getCell(4).alignment = {
        horizontal: "right",
      };

      worksheet.addRow([]);
    });
  };

  /*
   * Purchase Entries
   */
  addTransactionSection(
    "PURCHASE ENTRIES",
    purchases,
    "purchaseNo",
    "supplierName",
    "Supplier Name",
    "Purchase No."
  );

  /*
   * Dispatch Entries
   */
  addTransactionSection(
    "DISPATCH ENTRIES",
    gatePasses,
    "gatePassNo",
    "partyName",
    "Party Name",
    "Gate Pass No."
  );

  /*
   * Manufacturing
   */
  row = worksheet.addRow([
    "MANUFACTURING ENTRIES",
    `${manufactured.length} Batches`,
  ]);

  row.font = {
    bold: true,
  };

  worksheet.mergeCells(
    `B${row.number}:D${row.number}`
  );

  worksheet.addRow([]);

  manufactured.forEach(
    (batch, batchIndex) => {
      row = worksheet.addRow([
        `Batch ${batchIndex + 1}`,
      ]);

      row.font = {
        bold: true,
      };

      worksheet.mergeCells(
        `A${row.number}:D${row.number}`
      );

      row = worksheet.addRow([
        "CONSUMPTION",
        "",
        "PRODUCTION / LOSS",
        "",
      ]);

      row.font = {
        bold: true,
      };

      row.alignment = {
        horizontal: "center",
      };

      row.fill = headerFill;

      worksheet.mergeCells(
        `A${row.number}:B${row.number}`
      );

      worksheet.mergeCells(
        `C${row.number}:D${row.number}`
      );

      row.eachCell((cell) => {
        cell.border = border;
      });

      row = worksheet.addRow([
        "Stock Item",
        "Unit / Quantity",
        "Stock Item",
        "Unit / Quantity",
      ]);

      row.font = {
        bold: true,
      };

      row.fill = headerFill;

      row.eachCell((cell) => {
        cell.border = border;
      });

      const consumption =
        batch.consumption || [];

      const production =
        batch.production || [];

      const maxRows = Math.max(
        consumption.length,
        production.length,
        1
      );

      for (
        let i = 0;
        i < maxRows;
        i++
      ) {
        const c = consumption[i];
        const p = production[i];

        row = worksheet.addRow([
          c
            ? getName(c.item)
            : "",

          c
            ? formatUnitQty(
                getUnit(c.item),
                c.qty
              )
            : "",

          p
            ? getName(p.item)
            : "",

          p
            ? formatUnitQty(
                getUnit(p.item),
                p.qty
              )
            : "",
        ]);

        row.eachCell((cell) => {
          cell.border = border;
        });

        row.getCell(2).alignment = {
          horizontal: "right",
        };

        row.getCell(4).alignment = {
          horizontal: "right",
        };
      }

      row = worksheet.addRow([
        "Total Consumption:",
        totalQty(consumption),

        "Total Production:",
        totalQty(production),
      ]);

      row.font = {
        bold: true,
      };

      row.fill = totalFill;

      row.eachCell((cell) => {
        cell.border = border;
      });

      row.getCell(2).alignment = {
        horizontal: "right",
      };

      row.getCell(4).alignment = {
        horizontal: "right",
      };

      worksheet.addRow([]);
    }
  );

  /*
   * Save Excel file
   */
  const excelData =
    await workbook.xlsx.writeBuffer();

  return window.api.exportExcel({
    filename,
    excelData,
  });
};