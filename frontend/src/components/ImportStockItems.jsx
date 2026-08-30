import React, { useState } from "react";
import * as XLSX from "xlsx";
import api from "../services/api";

export default function ImportStockItems({ onClose }) {
  const [importedRows, setImportedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [existingItems, setExistingItems] = useState([]);
  const [creating, setCreating] = useState(false);

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

    reader.onload = async (e) => {
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

      const nonEmptyRows = rows.filter((row) =>
  Object.values(row).some(
    (value) => String(value).trim() !== ""
  )
);

      const formattedRows = nonEmptyRows.map((row) => ({
  item_name: row["Item Name"],
  stock_group: row["Group"],
  unit: row["Unit"],
  alternate_unit: row["Alternate Unit"],
  conversion: row["Conversion"],
  opening_qty: row["Opening Stock"],
  low_qty_alert: row["Low Qty Alert"],
}));

const stockItems = await api.getStockItems();
const stockGroups = await api.getStockGroups();
const stockUnits = await api.getStockUnits();

setExistingItems(stockItems);

const errors = validateRows(
  formattedRows,
  stockItems,
  stockGroups,
  stockUnits
);

     const previewRows = formattedRows.map((row, index) => ({
  ...row,
 error: getRowError(
  row,
  index,
  formattedRows,
  stockItems,
  stockGroups,
  stockUnits
),
}));

setValidationErrors(errors);
setImportedRows(previewRows);
    };

    reader.readAsArrayBuffer(file);
  };

  const getRowError = (
  row,
  index,
  rows,
  existingItems,
  stockGroups = [],
  stockUnits = []
) => {
  const rowNumber = index + 2;

  const itemName = String(row.item_name || "")
    .trim()
    .toLowerCase();

  if (!itemName) {
    return "Item Name is required.";
  }

  if (!row.stock_group || !String(row.stock_group).trim()) {
    return "Group is required.";
  }

  if (!row.unit || !String(row.unit).trim()) {
    return "Unit is required.";
  }

  const groupName = String(row.stock_group).trim();
const unitName = String(row.unit).trim();
const alternateUnit = String(row.alternate_unit || "").trim();

const existingGroupNames = stockGroups.map((group) =>
  String(group.name || group.stock_group || "").trim()
);

const existingUnitNames = stockUnits.map((unit) =>
  String(unit.name || unit.unit_name || "").trim()
);

// Group must match exactly - case sensitive
if (!existingGroupNames.includes(groupName)) {
  return `Invalid Group "${row.stock_group}".`;
}

// Primary Unit must match exactly - case sensitive
if (!existingUnitNames.includes(unitName)) {
  return `Invalid Unit "${row.unit}".`;
}

// Alternate Unit, when provided, must match exactly - case sensitive
if (
  alternateUnit &&
  !existingUnitNames.includes(alternateUnit)
) {
  return `Invalid Alternate Unit "${row.alternate_unit}".`;
}

// For all groups except Packaging Material,
// Alternate Unit is compulsory when Primary Unit is not Kgs
if (
  groupName !== "Packaging Material" &&
  unitName !== "Kgs" &&
  !alternateUnit
) {
  return "Alternate Unit is required when Primary Unit is not Kgs.";
}

  if (
    row.opening_qty === "" ||
    row.opening_qty === null ||
    row.opening_qty === undefined
  ) {
    return "Opening Stock is required.";
  }

  if (isNaN(Number(row.opening_qty))) {
    return "Opening Stock must be a number.";
  }

  if (row.alternate_unit && !row.conversion) {
    return "Conversion is required when Alternate Unit is provided.";
  }

  if (!row.alternate_unit && row.conversion) {
    return "Alternate Unit is required when Conversion is provided.";
  }

  if (
    row.conversion !== "" &&
    row.conversion !== null &&
    row.conversion !== undefined
  ) {
    if (isNaN(Number(row.conversion)) || Number(row.conversion) <= 0) {
      return "Conversion must be greater than 0.";
    }
  }

  if (
    row.low_qty_alert !== "" &&
    row.low_qty_alert !== null &&
    row.low_qty_alert !== undefined
  ) {
    if (isNaN(Number(row.low_qty_alert))) {
      return "Low Qty Alert must be a number.";
    }
  }

  const duplicateIndex = rows.findIndex(
    (otherRow, otherIndex) =>
      otherIndex !== index &&
      String(otherRow.item_name || "")
        .trim()
        .toLowerCase() === itemName
  );

  if (duplicateIndex !== -1) {
    return "Duplicate item in Excel.";
  }

  const existingItemNames = new Set(
    existingItems.map((item) =>
      String(item.item_name || "")
        .trim()
        .toLowerCase()
    )
  );

  if (existingItemNames.has(itemName)) {
    return "Item already exists.";
  }

  return null;
};


const validateRows = (
  rows,
  existingItems = [],
  stockGroups = [],
  stockUnits = []
) => {
  const errors = [];
  const itemNames = new Set();

  const existingItemNames = new Set(
  existingItems.map((item) =>
    String(item.item_name || "").trim().toLowerCase()
  )
);

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // Excel row number; row 1 is headers

    const itemName = String(row.item_name || "").trim().toLowerCase();

    const groupName = String(row.stock_group || "").trim();
const unitName = String(row.unit || "").trim();
const alternateUnit = String(row.alternate_unit || "").trim();

const existingGroupNames = stockGroups.map((group) =>
  String(group.name || group.stock_group || "").trim()
);

const existingUnitNames = stockUnits.map((unit) =>
  String(unit.name || unit.unit_name || "").trim()
);

if (
  groupName &&
  !existingGroupNames.includes(groupName)
) {
  errors.push(
    `Row ${rowNumber}: Invalid Group "${row.stock_group}".`
  );
}

if (
  unitName &&
  !existingUnitNames.includes(unitName)
) {
  errors.push(
    `Row ${rowNumber}: Invalid Unit "${row.unit}".`
  );
}

if (
  alternateUnit &&
  !existingUnitNames.includes(alternateUnit)
) {
  errors.push(
    `Row ${rowNumber}: Invalid Alternate Unit "${row.alternate_unit}".`
  );
}

if (
  groupName &&
  groupName !== "Packaging Material" &&
  unitName &&
  unitName !== "Kgs" &&
  !alternateUnit
) {
  errors.push(
    `Row ${rowNumber}: Alternate Unit is required when Primary Unit is not Kgs.`
  );
}

if (itemName) {
  if (itemNames.has(itemName)) {
    errors.push(
      `Row ${rowNumber}: Duplicate stock item "${row.item_name}".`
    );
  } else {
    itemNames.add(itemName);
  }
}

if (itemName && existingItemNames.has(itemName)) {
  errors.push(
    `Row ${rowNumber}: Stock item "${row.item_name}" already exists.`
  );
}


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


const handleCreate = async () => {
  if (importedRows.length === 0) {
    return;
  }

const readyRows = importedRows.filter((row) => !row.error);

if (readyRows.length === 0) {
  alert("There are no valid stock items to create.");
  return;
}

  try {
    setCreating(true);

    const itemsToCreate = readyRows.map((row) => ({
      item_name: String(row.item_name).trim(),
      stock_group: String(row.stock_group).trim(),
      unit: String(row.unit).trim(),
      alternate_unit: row.alternate_unit
        ? String(row.alternate_unit).trim()
        : "",
      conversion:
        row.conversion === "" ||
        row.conversion === null ||
        row.conversion === undefined
          ? null
          : Number(row.conversion),
      opening_qty: Number(row.opening_qty),
      low_qty_alert:
        row.low_qty_alert === "" ||
        row.low_qty_alert === null ||
        row.low_qty_alert === undefined
          ? null
          : Number(row.low_qty_alert),
    }));

    const result = await api.bulkCreateStockItems(itemsToCreate);

    console.log("Bulk create result:", result);

    alert(
      `${itemsToCreate.length} stock item(s) created successfully.`
    );

    setImportedRows([]);
    setValidationErrors([]);
  } catch (error) {
    console.error("Bulk stock item creation failed:", error);

    alert(
      error?.message ||
        "Unable to create stock items."
    );
  } finally {
    setCreating(false);
  }
};


const isValid = importedRows.length > 0 && validationErrors.length === 0;

const readyRows = importedRows.filter((row) => !row.error);

const errorRows = importedRows.filter((row) => row.error);

const readyCount = readyRows.length;
const errorCount = errorRows.length;

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

{importedRows.length > 0 && (
  <div className="d-flex gap-2 flex-wrap mt-3">

    <span className="badge bg-secondary">
      {importedRows.length} Found
    </span>

    <span className="badge bg-success">
      {readyCount} Ready
    </span>

    {errorCount > 0 && (
      <span className="badge bg-danger">
        {errorCount} Error
      </span>
    )}

  </div>
)}

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
            <th>Status</th>
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
              <td>
  {row.error ? (
    <span className="text-danger">
      ❌ {row.error}
    </span>
  ) : (
    <span className="text-success">
      ✅ Ready
    </span>
  )}
</td>
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
               disabled={creating}
            >
              Close
            </button>

              {importedRows.length > 0 && (
    <button
      type="button"
      className="btn btn-success"
      onClick={handleCreate}
      disabled={
        creating ||
          readyCount === 0
      }
    >
      {creating
  ? "Creating..."
  : `Create ${readyCount} Stock Item${readyCount !== 1 ? "s" : ""}`}
    </button>
  )}


          </div>
        </div>
      </div>
    </div>
  );
}
