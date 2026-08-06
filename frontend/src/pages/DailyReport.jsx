import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

const createRow = () => ({
  item: "",
  qty: "",
  unit: "",
});

export default function DailyReport({
    reportId,
    mode,
    onClose,
    onSaved,
}) {
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [currentMode, setCurrentMode] = useState(mode);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode, reportId]);


  const createPurchase = () => ({
    purchaseNo: "",
    items: [createRow(), createRow()],
  });

  const [purchases, setPurchases] = useState([createPurchase()]);
  const createGatePass = () => ({
    gatePassNo: "",
    items: [createRow(), createRow()],
  });

  const [stockItems, setStockItems] = useState([]);

  const [gatePasses, setGatePasses] = useState([createGatePass()]);

  const [manufactured, setManufactured] = useState([
    {
      consumption: [createRow(), createRow()],
      production: [createRow()],
    },
  ]);

  useEffect(() => {

    if (
        currentMode === "view" &&
        reportId
    ) {
        loadReport(reportId);
    }

}, [reportId, currentMode]);

  useEffect(() => {
    loadStockItems();
  }, []);

  const loadStockItems = async () => {
    try {
      const data = await api.getStockItems();
      setStockItems(data);
    } catch (error) {
      console.error(error);
    }
  };

  
 const loadReport = async (id) => {
    try {

        const report = await api.getDailyReportById(id);

        if (!report) throw new Error("Daily report not found.");
        setDate(report.date);

        setPurchases(report.purchases);

        setGatePasses(report.gatePasses);

        setManufactured(report.manufactured);

    } catch (error) {
        console.error(error);
    }
};

const handleSave = async () => {
  try {
    const payload = {
      report_date: date,
      purchases,
      gatePasses,
      manufactured,
    };

    if (!date) throw new Error("Please select a report date.");
    if (currentMode === "edit" && reportId) {
      await api.updateDailyReport(reportId, payload);
    } else {
      await api.saveDailyReport(payload);
    }

    alert("Daily Report Saved Successfully.");
    onSaved?.();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};

  const renderTable = (
    title,
    documents,
    setDocuments,
    docType, // "purchaseNo" or "gatePassNo"
  ) => (
    <>
      {documents.map((doc, docIndex) => (
        <div className="card shadow-sm mb-4" key={docIndex}>
          <div className="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
            <strong>{title}</strong>

            <button
              className="btn btn-sm btn-danger"
              onClick={() =>
                setDocuments(documents.filter((_, i) => i !== docIndex))
              }
            >
              Remove
            </button>
          </div>

          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <label className="form-label">
                  {docType === "purchaseNo" ? "Purchase No." : "Gate Pass No."}
                </label>

                <input
                  className="form-control"
                  value={doc[docType]}
                  onChange={(e) => {
                    const temp = [...documents];
                    temp[docIndex][docType] = e.target.value;
                    setDocuments(temp);
                  }}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "55%" }}>Item</th>
                    <th style={{ width: "20%" }}>Qty</th>
                    <th style={{ width: "15%" }}>Unit</th>
                    <th style={{ width: "10%" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {doc.items.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td>
                        <select
                          className="form-select"
                          value={row.item}
                          onChange={(e) => {
                            const selected = stockItems.find(
                              (i) => i.id === Number(e.target.value),
                            );

                            const temp = [...documents];

                            temp[docIndex].items[rowIndex].item =
                              e.target.value;

                            temp[docIndex].items[rowIndex].unit = selected
                              ? selected.unit
                              : "";

                            setDocuments(temp);
                          }}
                        >
                          <option value="">Select Item</option>

                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.item_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={row.qty}
                          onChange={(e) => {
                            const temp = [...documents];
                            temp[docIndex].items[rowIndex].qty = e.target.value;
                            setDocuments(temp);
                          }}
                        />
                      </td>

                      <td>
                        <input
                          className="form-control"
                          value={row.unit}
                          readOnly
                        />
                      </td>

                      <td>
                        <button
                          className="btn btn-success btn-sm me-1"
                          onClick={() => {
                            const temp = [...documents];
                            temp[docIndex].items.push(createRow());
                            setDocuments(temp);
                          }}
                        >
                          +
                        </button>

                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            const temp = [...documents];

                            if (temp[docIndex].items.length > 1) {
                              temp[docIndex].items.splice(rowIndex, 1);
                              setDocuments(temp);
                            }
                          }}
                        >
                          -
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      <button
        className="btn btn-primary"
        onClick={() =>
          setDocuments([
            ...documents,
            {
              [docType]: "",
              items: [createRow(), createRow()],
            },
          ])
        }
      >
        + Add {docType === "purchaseNo" ? "Purchase" : "Gate Pass"}
      </button>
    </>
  );

  

  const renderManufacturingTable = (documents, setDocuments) => {
    const updateRow = (docIndex, rowIndex, table, field, value) => {
      const temp = [...documents];

      if (field === "item") {
        const selected = stockItems.find((i) => i.id === Number(value));

        temp[docIndex][table][rowIndex].item = value;
        temp[docIndex][table][rowIndex].unit = selected ? selected.unit : "";
      } else {
        temp[docIndex][table][rowIndex][field] = value;
      }

      setDocuments(temp);
    };

    const addRow = (docIndex, table) => {
      const temp = [...documents];
      temp[docIndex][table].push(createRow());
      setDocuments(temp);
    };

    const removeRow = (docIndex, rowIndex, table) => {
      const temp = [...documents];

      if (temp[docIndex][table].length > 1) {
        temp[docIndex][table].splice(rowIndex, 1);
        setDocuments(temp);
      }
    };



    return (
      <>
        {documents.map((doc, docIndex) => (
          <div className="card shadow-sm mb-4" key={docIndex}>
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <strong>Manufacturing - {docIndex + 1}</strong>

              <button
                className="btn btn-sm btn-danger"
                onClick={() =>
                  setDocuments(documents.filter((_, i) => i !== docIndex))
                }
              >
                Remove
              </button>
            </div>

            <div className="card-body">
              <div className="row">
                {/* Consumption */}

                <div className="col-md-6">
                  <h6 className="mb-3">Consumption</h6>

                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th width="90">Qty</th>
                        <th width="90">Unit</th>
                        <th width="80">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {doc.consumption.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <select
                              className="form-select"
                              value={row.item}
                              onChange={(e) =>
                                updateRow(
                                  docIndex,
                                  rowIndex,
                                  "consumption",
                                  "item",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select Item</option>

                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.qty}
                              onChange={(e) =>
                                updateRow(
                                  docIndex,
                                  rowIndex,
                                  "consumption",
                                  "qty",
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="form-control"
                              value={row.unit}
                              readOnly
                            />
                          </td>

                          <td>
                            <button
                              className="btn btn-success btn-sm me-1"
                              onClick={() => addRow(docIndex, "consumption")}
                            >
                              +
                            </button>

                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                removeRow(docIndex, rowIndex, "consumption")
                              }
                            >
                              -
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Production */}

                <div className="col-md-6">
                  <h6 className="mb-3">Production</h6>

                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th width="90">Qty</th>
                        <th width="90">Unit</th>
                        <th width="80">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {doc.production.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <select
                              className="form-select"
                              value={row.item}
                              onChange={(e) =>
                                updateRow(
                                  docIndex,
                                  rowIndex,
                                  "production",
                                  "item",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="">Select Item</option>

                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              className="form-control"
                              value={row.qty}
                              onChange={(e) =>
                                updateRow(
                                  docIndex,
                                  rowIndex,
                                  "production",
                                  "qty",
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              className="form-control"
                              value={row.unit}
                              readOnly
                            />
                          </td>

                          <td>
                            <button
                              className="btn btn-success btn-sm me-1"
                              onClick={() => addRow(docIndex, "production")}
                            >
                              +
                            </button>

                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() =>
                                removeRow(docIndex, rowIndex, "production")
                              }
                            >
                              -
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          className="btn btn-success"
          onClick={() =>
            setDocuments([
              ...documents,
              {
                consumption: [createRow(), createRow()],
                production: [createRow()],
              },
            ])
          }
        >
          + Add Manufacturing
        </button>
      </>
    );
  };

  const handleDelete = async () => {
    if (!reportId || !window.confirm("Delete this Daily Report and all related entries?")) return;
    try {
      await api.deleteDailyReport(reportId);
      alert("Daily Report deleted.");
      onSaved?.();
    } catch (error) {
      console.error(error);
      alert("Unable to delete the Daily Report.");
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="card shadow mb-4">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Daily Report</h4>
        </div>

        <div className="card-body">
          <fieldset disabled={currentMode === "view"}>
          <div className="row mb-3">
            <div className="col-md-3">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {renderTable(
            "Material Received",
            purchases,
            setPurchases,
            "purchaseNo",
          )}

          {renderTable(
            "Material Dispatched",
            gatePasses,
            setGatePasses,
            "gatePassNo",
          )}

          {renderManufacturingTable(manufactured, setManufactured)}

          </fieldset>
          {currentMode !== "view" && <button
            className="btn btn-primary me-2"
            onClick={handleSave}
          >
            Save
          </button>}
          {currentMode === "view" && <>
            <button className="btn btn-primary me-2" onClick={() => setCurrentMode("edit")}>Edit</button>
            <button className="btn btn-danger me-2" onClick={handleDelete}>Delete</button>
          </>}
          {currentMode === "edit" && <button className="btn btn-secondary me-2" onClick={() => { setCurrentMode("view"); loadReport(reportId); }}>Cancel</button>}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
