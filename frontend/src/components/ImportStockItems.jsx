import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function ImportStockItems({ onClose }) {
  const [importedRows, setImportedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);

  const downloadStockItemTemplate = () => {
    const headers = [
      "Item Name",
      "Group",
      "Unit",
      "Alternate Unit",
      "Conversion",
      "Opening Stock",
      "Low Qty Alert",
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers]);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Items");

    XLSX.writeFile(workbook, "stock_items_template.xlsx");
  };

  const handleExcelFile = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);

      const workbook = XLSX.read(data, {
        type: "array",
      });

      const worksheet = workbook.Sheets["Stock Items"];

      if (!worksheet) {
        alert("Invalid template. Stock Items sheet not found.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      const formattedRows = rows.map((row) => ({
  item_name: row["Item Name"],
  stock_group: row["Group"],
  unit: row["Unit"],
  alternate_unit: row["Alternate Unit"],
  conversion: row["Conversion"],
  opening_qty: row["Opening Stock"],
  low_qty_alert: row["Low Qty Alert"],
}));

      const errors = validateRows(formattedRows);

setValidationErrors(errors);
setImportedRows(formattedRows);
    };

    reader.readAsArrayBuffer(file);
  };

  const validateRows = (rows) => {
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Excel row number; row 1 is headers

    if (!row.item_name || !String(row.item_name).trim()) {
      errors.push(`Row ${rowNumber}: Item Name is required.`);
    }

    if (!row.stock_group || !String(row.stock_group).trim()) {
      errors.push(`Row ${rowNumber}: Group is required.`);
    }

    if (!row.unit || !String(row.unit).trim()) {
      errors.push(`Row ${rowNumber}: Unit is required.`);
    }

    if (
      row.opening_qty === "" ||
      row.opening_qty === null ||
      row.opening_qty === undefined
    ) {
      errors.push(`Row ${rowNumber}: Opening Stock is required.`);
    } else if (isNaN(Number(row.opening_qty))) {
      errors.push(`Row ${rowNumber}: Opening Stock must be a number.`);
    }

    if (row.alternate_unit && !row.conversion) {
      errors.push(
        `Row ${rowNumber}: Conversion is required when Alternate Unit is provided.`
      );
    }

    if (!row.alternate_unit && row.conversion) {
      errors.push(
        `Row ${rowNumber}: Alternate Unit is required when Conversion is provided.`
      );
    }

    if (
  row.conversion !== "" &&
  row.conversion !== null &&
  row.conversion !== undefined
) {
  if (isNaN(Number(row.conversion)) || Number(row.conversion) <= 0) {
    errors.push(
      `Row ${rowNumber}: Conversion must be a number greater than 0.`
    );
  }
}

    if (row.low_qty_alert !== "" && isNaN(Number(row.low_qty_alert))) {
      errors.push(`Row ${rowNumber}: Low Qty Alert must be a number.`);
    }
  });

  return errors;
};

  return (
    <div className="modal d-block" tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Import Stock Items</h5>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            <div className="text-center">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={downloadStockItemTemplate}
              >
                Download Template
              </button>

              <div className="mt-4">
                <label className="form-label">
                  Select completed Excel file
                </label>

                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFile}
                />

                {importedRows.length > 0 && (
  <div className="mt-4">
    <h6>Preview</h6>

{validationErrors.length > 0 && (
  <div className="alert alert-danger mt-3">
    <strong>Please fix the following errors:</strong>

    <ul className="mb-0 mt-2">
      {validationErrors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  </div>
)}


    <div className="table-responsive">
      <table className="table table-bordered table-sm">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Item Name</th>
            <th>Group</th>
            <th>Unit</th>
            <th>Alternate Unit</th>
            <th>Conversion</th>
            <th>Opening Stock</th>
            <th>Low Qty Alert</th>
          </tr>
        </thead>

        <tbody>
          {importedRows.map((row, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{row.item_name}</td>
              <td>{row.stock_group}</td>
              <td>{row.unit}</td>
              <td>{row.alternate_unit}</td>
              <td>{row.conversion}</td>
              <td>{row.opening_qty}</td>
              <td>{row.low_qty_alert}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mt-2 text-muted">
      {importedRows.length} stock item(s) found.
    </div>
  </div>
)}
               

              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
