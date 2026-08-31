import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  purchase: {
    header: [220, 235, 250],
    total: [239, 246, 253],
  },

  dispatch: {
    header: [252, 235, 215],
    total: [253, 244, 232],
  },

  manufacturing: {
    header: [221, 240, 225],
    total: [238, 248, 240],
  },

  border: [185, 185, 185],

  text: [35, 35, 35],
};

/* =========================================================
   HELPERS
========================================================= */

const getStockItem = (stockItems, itemId) => {
  return stockItems.find(
    (item) => String(item.id) === String(itemId)
  );
};

const getItemName = (stockItems, itemId) => {
  return (
    getStockItem(stockItems, itemId)?.item_name || ""
  );
};

const getItemUnit = (stockItems, itemId) => {
  return (
    getStockItem(stockItems, itemId)?.unit || ""
  );
};

const totalQty = (items = []) => {
  return items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0
  );
};

const formatQty = (value) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return Number(value).toString();
};

const formatUnitQty = (unit, qty) => {
  const formattedQty = formatQty(qty);

  if (!formattedQty) {
    return unit || "";
  }

  if (!unit) {
    return formattedQty;
  }

  return `${formattedQty} ${unit}`;
};

/* =========================================================
   PAGE POSITION HELPER
========================================================= */

const ensureSpace = (doc, y, requiredHeight = 25) => {
  const pageHeight =
    doc.internal.pageSize.getHeight();

  const bottomMargin = 15;

  if (
    y + requiredHeight >
    pageHeight - bottomMargin
  ) {
    doc.addPage();

    return 20;
  }

  return y;
};

/* =========================================================
   REPORT HEADER
========================================================= */

const addReportHeader = (
  doc,
  company,
  reportDate
) => {
  const pageWidth =
    doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");

  doc.setTextColor(...COLORS.text);

  doc.setFontSize(16);

  doc.text(
    company || "Factory",
    pageWidth / 2,
    13,
    {
      align: "center",
    }
  );

  doc.setFontSize(12);

  doc.text(
    "DAILY REPORT",
    pageWidth / 2,
    20,
    {
      align: "center",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.text(
    `Report Date : ${
      reportDate || "-"
    }`,
    pageWidth / 2,
    27,
    {
      align: "center",
    }
  );
};

/* =========================================================
   SECTION HEADER
========================================================= */

const addSectionHeader = (doc, title, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.text);

  doc.text(title, 14, y);

  return y + 5;
};

/* =========================================================
   PURCHASE / DISPATCH
========================================================= */

const addTransactionSection = ({
  doc,
  title,
  documents,
  stockItems,
  field,
  partyField,
  partyHeader,
  numberHeader,
  startY,
  sectionColor,
}) => {
  
  let y = startY;

/* -------------------------------------------------------
   KEEP SECTION HEADER WITH FIRST TABLE
------------------------------------------------------- */

let requiredHeight = 25;

if (documents.length > 0) {
  const firstItems =
    documents[0]?.items || [];

  requiredHeight =
    25 +
    firstItems.length * 8 +
    20;
}

y = ensureSpace(
  doc,
  y,
  requiredHeight
);

y = addSectionHeader(
  doc,
  title,
  y
);

  /* -------------------------------------------------------
     NO ENTRIES
  ------------------------------------------------------- */

  if (documents.length === 0) {
    y = ensureSpace(
      doc,
      y,
      20
    );

    autoTable(doc, {
      startY: y,

      head: [
        ["Message"],
      ],

      body: [
        ["No entries."],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.2,
        lineColor:
          COLORS.border,
        lineWidth: 0.3,
        textColor:
          COLORS.text,
      },

      headStyles: {
        fillColor:
          sectionColor.header,
        textColor:
          COLORS.text,
        fontStyle:
          "bold",
      },

      tableWidth: 269,

      margin: {
        left: 14,
        right: 14,
      },
    });

    return (
      doc.lastAutoTable.finalY +
      10
    );
  }

  /* -------------------------------------------------------
     DOCUMENTS
  ------------------------------------------------------- */

  documents.forEach(
    (document) => {
      const items =
        document.items || [];

      /*
       * Make sure the table has
       * enough space on the page.
       */
      y = ensureSpace(
        doc,
        y,
        35
      );

      const body = [];

      items.forEach(
        (item, index) => {
          body.push([
            index === 0
              ? document[field] || ""
              : "",

            index === 0
              ? document[partyField] ||
                "-"
              : "",

            getItemName(
              stockItems,
              item.item
            ),

            {
              content:
                formatUnitQty(
                  getItemUnit(
                    stockItems,
                    item.item
                  ),
                  item.qty
                ),

              styles: {
                halign: "right",
              },
            },
          ]);
        }
      );

      /*
       * Total row
       */
      body.push([
        "",
        "",

        {
          content:
            "Total Qty:",

          styles: {
            halign: "right",
            fontStyle:
              "bold",
          },
        },

        {
          content:
            String(
              totalQty(items)
            ),

          styles: {
            halign: "right",
            fontStyle:
              "bold",
          },
        },
      ]);

      autoTable(doc, {
        startY: y,

        head: [
          [
            numberHeader,
            partyHeader,
            "Stock Item",
            "Unit / Quantity",
          ],
        ],

        body,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.2,
          lineColor:
            COLORS.border,
          lineWidth: 0.3,
          textColor:
            COLORS.text,
          valign: "middle",
        },

        headStyles: {
          fillColor:
            sectionColor.header,
          textColor:
            COLORS.text,
          fontStyle:
            "bold",
          fontSize: 8.2,
          halign: "left",
        },

        tableWidth: 269,

        columnStyles: {
          0: {
            cellWidth: 55,
          },

          1: {
            cellWidth: 65,
          },

          2: {
            cellWidth: 75,
          },

          3: {
            cellWidth: 74,
            halign: "right",
          },
        },

        didParseCell: (
          data
        ) => {
          if (
            data.row.index ===
            body.length - 1
          ) {
            data.cell.styles.fillColor =
              sectionColor.total;
          }
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        doc.lastAutoTable.finalY +
        8;
    }
  );

  return y;
};

/* =========================================================
   MANUFACTURING
========================================================= */

const addManufacturingSection = ({
  doc,
  manufactured,
  stockItems,
  startY,
  sectionColor,
}) => {
 let y = startY;

/* -------------------------------------------------------
   KEEP MANUFACTURING HEADER WITH FIRST BATCH
------------------------------------------------------- */

let requiredHeight = 25;

if (manufactured.length > 0) {
  const firstBatch =
    manufactured[0];

  const firstConsumption =
    firstBatch?.consumption || [];

  const firstProduction =
    firstBatch?.production || [];

  const firstBatchRows =
    Math.max(
      firstConsumption.length,
      firstProduction.length,
      1
    );

  requiredHeight =
    35 +
    firstBatchRows * 8 +
    20;
}

y = ensureSpace(
  doc,
  y,
  requiredHeight
);

y = addSectionHeader(
  doc,
  "MANUFACTURING ENTRIES",
  y
);

  /* -------------------------------------------------------
     NO ENTRIES
  ------------------------------------------------------- */

  if (manufactured.length === 0) {
    y = ensureSpace(
      doc,
      y,
      20
    );

    autoTable(doc, {
      startY: y,

      head: [
        ["Message"],
      ],

      body: [
        [
          "No manufacturing entries.",
        ],
      ],

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.2,
        lineColor:
          COLORS.border,
        lineWidth: 0.3,
        textColor:
          COLORS.text,
      },

      headStyles: {
        fillColor:
          sectionColor.header,
        textColor:
          COLORS.text,
        fontStyle:
          "bold",
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    return (
      doc.lastAutoTable.finalY +
      10
    );
  }

  /* -------------------------------------------------------
     MANUFACTURING BATCHES
  ------------------------------------------------------- */

  manufactured.forEach(
    (batch, batchIndex) => {
      const consumption =
        batch.consumption || [];

      const production =
        batch.production || [];

      const maxRows =
        Math.max(
          consumption.length,
          production.length,
          1
        );

      /*
       * Estimate enough space for
       * batch heading + table.
       */
      const estimatedHeight =
        25 +
        maxRows * 8 +
        15;

      y = ensureSpace(
        doc,
        y,
        estimatedHeight
      );

      const body = [];

      for (
        let index = 0;
        index < maxRows;
        index++
      ) {
        const c =
          consumption[index];

        const p =
          production[index];

        body.push([
          c
            ? getItemName(
                stockItems,
                c.item
              )
            : "",

          {
            content: c
              ? formatUnitQty(
                  getItemUnit(
                    stockItems,
                    c.item
                  ),
                  c.qty
                )
              : "",

            styles: {
              halign: "right",
            },
          },

          p
            ? getItemName(
                stockItems,
                p.item
              )
            : "",

          {
            content: p
              ? formatUnitQty(
                  getItemUnit(
                    stockItems,
                    p.item
                  ),
                  p.qty
                )
              : "",

            styles: {
              halign: "right",
            },
          },
        ]);
      }

      /*
       * Totals
       */
      body.push([
        {
          content:
            "Total Consumption:",

          styles: {
            fontStyle:
              "bold",
            halign:
              "left",
          },
        },

        {
          content:
            String(
              totalQty(
                consumption
              )
            ),

          styles: {
            fontStyle:
              "bold",
            halign:
              "right",
          },
        },

        {
          content:
            "Total Production:",

          styles: {
            fontStyle:
              "bold",
            halign:
              "left",
          },
        },

        {
          content:
            String(
              totalQty(
                production
              )
            ),

          styles: {
            fontStyle:
              "bold",
            halign:
              "right",
          },
        },
      ]);

      autoTable(doc, {
        startY: y,

        head: [
          [
            {
              content:
                `Batch ${
                  batchIndex + 1
                }`,

              colSpan: 4,

              styles: {
                halign:
                  "left",
                fontStyle:
                  "bold",
                fontSize: 9,
                fillColor:
                  "bff5b3",
              },
            },
          ],

          [
            {
              content:
                "CONSUMPTION",

              colSpan: 2,

              styles: {
                halign:
                  "center",
              },
            },

            {
              content:
                "PRODUCTION / LOSS",

              colSpan: 2,

              styles: {
                halign:
                  "center",
              },
            },
          ],

          [
            "Stock Item",
            "Unit / Quantity",
            "Stock Item",
            "Unit / Quantity",
          ],
        ],

        body,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.2,
          lineColor:
            COLORS.border,
          lineWidth: 0.3,
          textColor:
            COLORS.text,
          valign:
            "middle",
        },

        headStyles: {
          fillColor:
            sectionColor.header,
          textColor:
            COLORS.text,
          fontStyle:
            "bold",
          fontSize: 8,
          halign:
            "left",
        },

        tableWidth: 269,

        columnStyles: {
          0: {
            cellWidth: 75,
          },

          1: {
            cellWidth: 60,
            halign: "right",
          },

          2: {
            cellWidth: 75,
          },

          3: {
            cellWidth: 59,
            halign: "right",
          },
        },

        didParseCell: (
          data
        ) => {
          if (
            data.row.index ===
            body.length - 1
          ) {
            data.cell.styles.fillColor =
              sectionColor.total;
          }
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        doc.lastAutoTable.finalY +
        8;
    }
  );

  return y;
};

/* =========================================================
   MAIN EXPORT
========================================================= */

export const exportDailyReportPdf =
  async ({
    company,
    reportDate,
    purchases = [],
    gatePasses = [],
    manufactured = [],
    stockItems = [],
    filename,
  }) => {
    const doc = new jsPDF({
      orientation:
        "landscape",

      unit: "mm",

      format: "a4",
    });

    /* -----------------------------------------------------
       REPORT HEADER
    ----------------------------------------------------- */

    addReportHeader(
      doc,
      company,
      reportDate
    );

    /*
     * Start below the report header.
     */
    let y = 37;

    /* -----------------------------------------------------
       PURCHASE
    ----------------------------------------------------- */

    y =
      addTransactionSection({
        doc,

        title:
          "PURCHASE ENTRIES",

        documents:
          purchases,

        stockItems,

        field:
          "purchaseNo",

        partyField:
          "supplierName",

        partyHeader:
          "Supplier Name",

        numberHeader:
          "Purchase No.",

        startY:
          y,

        sectionColor:
          COLORS.purchase,
      });

    /* -----------------------------------------------------
       DISPATCH
    ----------------------------------------------------- */

    y =
      addTransactionSection({
        doc,

        title:
          "DISPATCH ENTRIES",

        documents:
          gatePasses,

        stockItems,

        field:
          "gatePassNo",

        partyField:
          "partyName",

        partyHeader:
          "Party Name",

        numberHeader:
          "Gate Pass No.",

        startY:
          y,

        sectionColor:
          COLORS.dispatch,
      });

    /* -----------------------------------------------------
       MANUFACTURING
    ----------------------------------------------------- */

    addManufacturingSection({
      doc,

      manufactured,

      stockItems,

      startY:
        y,

      sectionColor:
        COLORS.manufacturing,
    });

    /* -----------------------------------------------------
       EXPORT PDF
    ----------------------------------------------------- */

    const pdfData =
      doc.output(
        "arraybuffer"
      );

    return window.api.exportPdf({
      title:
        "Daily Report",

      filename,

      pdfData,
    });
  };