const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

export const exportTablePdf = async ({ title, company, subtitle, headers, rows, filename }) => {
  const table = `<h1>${escape(company || "Factory Book")}</h1><p>${escape(title)}${subtitle ? ` - ${escape(subtitle)}` : ""}</p><table><thead><tr>${headers.map((header) => `<th>${escape(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td class="${typeof cell === "number" ? "num" : ""}">${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  return window.api.exportPdf({ title, html: table, filename });
};
