const MIN_ROWS = 8;

const css = `
<style>

*{
    box-sizing:border-box;
    margin:0;
    padding:0;
    font-family:Arial, Helvetica, sans-serif;
}

body{
    padding:18px;
    font-size:13px;
    color:#222;
}

/* =========================
   HEADER
========================= */

.header{
    text-align:center;
    margin-bottom:12px;
}

.header h1{
    font-size:28px;
    font-weight:700;
    text-transform:uppercase;
    margin-bottom:2px;
}

.header h2{
    font-size:18px;
    margin-bottom:4px;
}

.header p{
    font-size:13px;
    font-weight:bold;
}

/* =========================
   LAYOUT
========================= */

.row{
    display:flex;
    gap:16px;
    margin-bottom:18px;
}

.card,
.manufacturing{
    border:1px solid #444;
    border-radius:8px;
    overflow:hidden;
}

.card{
    flex:1;
}

/* =========================
   CARD HEADER
========================= */

.card-title{
    color:#fff;
    text-align:center;
    font-size:18px;
    font-weight:700;
    padding:10px 12px;
}

/* =========================
   TABLE
========================= */

table{
    width:100%;
    border-collapse:collapse;
}

th{
    background:#efefef;
    font-weight:bold;
}

th,
td{
    border:1px solid #d6d6d6;
    padding:8px 10px;
    font-size:14px;
    font-weight:600;
    line-height:1.5;
}

thead th{
    background:#efefef;
    font-size:15px;
    font-weight:700;
}

table{
    width:100%;
    border-collapse:collapse;
    page-break-inside:auto;
}

tr{
    page-break-inside:avoid;
    page-break-after:auto;
}

thead{
    display:table-header-group;
}



.card,
.manufacturing{
    page-break-inside:avoid;
    break-inside:avoid;
}



/* Right align quantity columns */

td:last-child,
th:last-child{
    text-align:right;
}

/* Merge party cells */

td[rowspan]{
    vertical-align:middle;
    font-weight:bold;
}

/* Material padding */

td:first-child{
    padding-left:10px;
}




/* Blank separator between groups */

.separator td{
    border:none !important;
    background:#fff;
    height:18px;
    padding:0;
}

/* =========================
   COLUMN WIDTHS
========================= */

/* Received / Dispatch */

.card table th:nth-child(1),
.card table td:nth-child(1){
    width:30%;
}

.card table th:nth-child(2),
.card table td:nth-child(2){
    width:50%;
}

.card table th:nth-child(3),
.card table td:nth-child(3){
    width:20%;
}

/* Manufacturing */

.manufacturing table th:nth-child(1),
.manufacturing table td:nth-child(1),
.manufacturing table th:nth-child(3),
.manufacturing table td:nth-child(3){
    width:40%;
}

.manufacturing table th:nth-child(2),
.manufacturing table td:nth-child(2),
.manufacturing table th:nth-child(4),
.manufacturing table td:nth-child(4){
    width:10%;
}

/* Slightly taller manufacturing rows */

.manufacturing td{
    padding:10px 12px;
    font-size:14px;
}

.received-title{
    background:#198754;
}

.dispatch-title{
    background:#dc3545;
}

.manufacturing-title{
    background:#0d6efd;
}

</style>
`;

const totalQty = (rows) =>
    rows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);

const rowCount = (...lists) =>
    Math.max(
        MIN_ROWS,
        ...lists.map((list) => list.length)
    );

const empty = (value) => value ?? "";

const itemName = (id, stockItems) =>
  stockItems.find((i) => String(i.id) === String(id))?.item_name || "";

const header = (company, reportDate) => `
<div class="header">
    <h1>${empty(company)}</h1>
    <h2>DAILY REPORT</h2>
    <p>Report Date : ${empty(reportDate)}</p>
</div>
`;

const simpleCard = (title, headers, documents, stockItems, field) => {
  let total = 0;

  

  const body = documents
    .map((doc) => {
      const rows = doc.items
        .map((item, index) => {
          total += Number(item.qty) || 0;

          return `
          <tr>
            ${
              index === 0
                ? `<td rowspan="${doc.items.length}">${empty(doc[field])}</td>`
                : ""
            }
            <td>${itemName(item.item, stockItems)}</td>
            <td>${empty(item.qty)}</td>
          </tr>
          `;
        })
        .join("");

      return (
        rows +
        `
        <tr class="separator">
          <td colspan="3"></td>
        </tr>
      `
      );
    })
    .join("");

const titleClass =
  title.includes("RECEIVED")
    ? "received-title"
    : title.includes("DISPATCH")
    ? "dispatch-title"
    : "card-title";

  return `
  <div class="card">
    <div class="card-title  ${titleClass}">${title}</div>

    <table>

      <thead>
        <tr>
          ${headers.map((h) => `<th>${h}</th>`).join("")}
        </tr>
      </thead>

      <tbody>
        ${body}
      </tbody>

     

    </table>
  </div>
  `;
};


const manufacturingCard = (manufactured, stockItems) => {
  let consumptionTotal = 0;
  let productionTotal = 0;

  const body = manufactured
    .map((batch) => {
      const maxRows = Math.max(
        batch.consumption.length,
        batch.production.length,
        1
      );

      const rows = Array.from({ length: maxRows })
        .map((_, i) => {
          const c = batch.consumption[i];
          const p = batch.production[i];

          if (c) consumptionTotal += Number(c.qty) || 0;
          if (p) productionTotal += Number(p.qty) || 0;

          return `
          <tr>
              <td>${c ? itemName(c.item, stockItems) : ""}</td>
              <td>${c ? c.qty : ""}</td>

              <td>${p ? itemName(p.item, stockItems) : ""}</td>
              <td>${p ? p.qty : ""}</td>
          </tr>
          `;
        })
        .join("");

      return (
        rows +
        `
        <tr class="separator">
            <td colspan="4"></td>
        </tr>
      `
      );
    })
    .join("");

  return `
  <div class="manufacturing">

      <div class="card-title  manufacturing-title">
          🏭 MANUFACTURING
      </div>

      <table>

          <thead>

              <tr>
                  <th colspan="2">CONSUMPTION</th>
                  <th colspan="2">PRODUCTION</th>
              </tr>

              <tr>
                  <th>Material</th>
                  <th>Qty</th>

                  <th>Product</th>
                  <th>Qty</th>
              </tr>

          </thead>

          <tbody>

              ${body}

          </tbody>


      </table>

  </div>
  `;
};


export const exportDailyReportPdf = async ({
     company,
    reportDate,
    purchases = [],
    gatePasses = [],
    manufactured = [],
    stockItems = [],
    filename,
}) => {

    const html = `
    <!DOCTYPE html>
    <html>

    <head>
        <meta charset="UTF-8">
        ${css}
    </head>

    <body>

        ${header(company, reportDate)}

        <div class="row">

         ${simpleCard(
    "📥 RECEIVED",
    ["Party", "Material", "Qty"],
    purchases,
    stockItems,
    "purchaseNo"
)}

${simpleCard(
    "🚚 DISPATCH",
    ["Party", "Material", "Qty"],
    gatePasses,
    stockItems,
    "gatePassNo"
)}

        </div>

       ${manufacturingCard(
    manufactured,
    stockItems
)}

    </body>

    </html>
    `;

    return window.api.exportPdf({
        title: "Daily Report",
        html,
        filename,
    });
};