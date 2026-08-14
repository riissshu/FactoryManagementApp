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
    (item) =>
      String(item.id) === String(itemId)
  );
};

const getItemName = (
  stockItems,
  itemId
) => {
  return (
    getStockItem(
      stockItems,
      itemId
    )?.item_name || ""
  );
};

const getItemUnit = (
  stockItems,
  itemId
) => {
  return (
    getStockItem(
      stockItems,
      itemId
    )?.unit || ""
  );
};

const totalQty = (
  items = []
) => {
  return items.reduce(
    (sum, item) =>
      sum +
      (Number(item.qty) || 0),
    0
  );
};

const formatQty = (
  value
) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return Number(value).toString();
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

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setTextColor(
    ...COLORS.text
  );

  /*
   * Factory name
   */
  doc.setFontSize(16);

  doc.text(
    company || "Factory",
    pageWidth / 2,
    13,
    {
      align: "center",
    }
  );

  /*
   * Daily Report
   */
  doc.setFontSize(12);

  doc.text(
    "DAILY REPORT",
    pageWidth / 2,
    20,
    {
      align: "center",
    }
  );

  /*
   * Date
   */
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

const addSectionHeader = (
  doc,
  title,
  y
) => {
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10.5);

  doc.setTextColor(
    ...COLORS.text
  );

  doc.text(
    title,
    14,
    y
  );

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
  numberHeader,
  startY,
  sectionColor,
}) => {
  let y = addSectionHeader(
    doc,
    title,
    startY
  );

  /*
   * No entries
   */
  if (
    documents.length === 0
  ) {
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
        font:
          "helvetica",

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

      tableWidth: 216,

      margin: {
        left: 14,
        right: 14,
      },
    });

   
  }

  /*
   * Each document gets
   * its own table.
   */
  documents.forEach(
    (document) => {
      const items =
        document.items || [];

      const body = [];

      /*
       * Item rows
       */
      items.forEach(
        (item, index) => {
          body.push([
            index === 0
              ? document[field] ||
                ""
              : "",

            getItemName(
              stockItems,
              item.item
            ),

            getItemUnit(
              stockItems,
              item.item
            ),

            {
              content:
                formatQty(
                  item.qty
                ),

              styles: {
                halign:
                  "right",
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
            halign:
              "right",

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
            halign:
              "right",

            fontStyle:
              "bold",
          },
        },
      ]);

      autoTable(doc, {
        startY: y,

        head: [[
          numberHeader,
          "Stock Item",
          "Unit",
          "Quantity",
        ]],

        body,

        theme: "grid",

        styles: {
          font:
            "helvetica",

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

          fontSize: 8.2,

          halign:
            "left",
        },

        tableWidth: 216,

        columnStyles: {
          0: {
            cellWidth: 72,
          },

          1: {
            cellWidth: 40,
          },

          2: {
            cellWidth: 34,
          },

          3: {
            cellWidth: 70,

            halign:
              "right",
          },
        },

        didParseCell: (
          data
        ) => {
          /*
           * Total row
           */
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
  let y = addSectionHeader(
    doc,
    "MANUFACTURING ENTRIES",
    startY
  );

  /*
   * No manufacturing
   */
  if (
    manufactured.length === 0
  ) {
    autoTable(doc, {
      startY: y,

      head: [
        ["Message"],
      ],

      body: [[
        "No manufacturing entries.",
      ]],

      theme: "grid",

      styles: {
        font:
          "helvetica",

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

  
  }

  /*
   * Each manufacturing
   * entry is a batch.
   */
  manufactured.forEach(
    (batch, batchIndex) => {
      

      const consumption =
        batch.consumption ||
        [];

      const production =
        batch.production ||
        [];

      const maxRows =
        Math.max(
          consumption.length,
          production.length,
          1
        );

      const body = [];

      /*
       * Item rows
       */
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

          c
            ? getItemUnit(
                stockItems,
                c.item
              )
            : "",

          {
            content: c
              ? formatQty(
                  c.qty
                )
              : "",

            styles: {
              halign:
                "right",
            },
          },

          p
            ? getItemName(
                stockItems,
                p.item
              )
            : "",

          p
            ? getItemUnit(
                stockItems,
                p.item
              )
            : "",

          {
            content: p
              ? formatQty(
                  p.qty
                )
              : "",

            styles: {
              halign:
                "right",
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

        "",

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

        "",

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
      content: `Batch ${
        batchIndex + 1
      }`,

      colSpan: 6,

      styles: {
        halign: "left",
        fontStyle: "bold",
        fontSize: 9,
          fillColor: "bff5b3",
      },
    },
  ],

  [
    {
      content:
        "CONSUMPTION",

      colSpan: 3,

      styles: {
        halign: "center",
      },
    },

    {
      content:
        "PRODUCTION / LOSS",

      colSpan: 3,

      styles: {
        halign: "center",
      },
    },
  ],

  [
    "Stock Item",
    "Unit",
    "Quantity",
    "Stock Item",
    "Unit",
    "Quantity",
  ],
],

        body,

        theme: "grid",

        styles: {
          font:
            "helvetica",

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
            cellWidth: 70,
          },

          1: {
            cellWidth: 30,
          },

          2: {
            cellWidth: 34,

            halign:
              "right",
          },

          3: {
            cellWidth: 70,
          },

          4: {
            cellWidth: 30,
          },

          5: {
            cellWidth: 35,

            halign:
              "right",
          },
        },

        didParseCell: (
          data
        ) => {
          /*
           * Total row
           */
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
    /*
     * A4 LANDSCAPE
     */
    const doc = new jsPDF({
      orientation:
        "landscape",

      unit: "mm",

      format: "a4",
    });

    /*
     * Report header
     */
    addReportHeader(
      doc,
      company,
      reportDate
    );

    /*
     * Starting position
     */
    let y = 37;

    /*
     * ==========================
     * PURCHASE
     * ==========================
     */

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

        numberHeader:
          "Purchase No.",

        startY:
          y,

        sectionColor:
          COLORS.purchase,
      });

    /*
     * ==========================
     * DISPATCH
     * ==========================
     */

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

        numberHeader:
          "Gate Pass No.",

        startY:
          y,

        sectionColor:
          COLORS.dispatch,
      });

    /*
     * ==========================
     * MANUFACTURING
     * ==========================
     */

    addManufacturingSection({
      doc,

      manufactured,

      stockItems,

      startY:
        y,

      sectionColor:
        COLORS.manufacturing,
    });

    /*
     * ==========================
     * PDF DATA
     * ==========================
     */

    const pdfData =
      doc.output(
        "arraybuffer"
      );

    /*
     * Existing Electron
     * export mechanism.
     */
    return window.api.exportPdf({
      title:
        "Daily Report",

      filename,

      pdfData,
    });
  };