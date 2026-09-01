import React, { useState, useEffect } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

export default function CreateBOM({ onClose }) {
  const [bomName, setBomName] = useState("");
  const [finishedProduct, setFinishedProduct] = useState("");
  const [finishedProductText, setFinishedProductText] = useState("");
  const [finishedProductTouched, setFinishedProductTouched] = useState(false);
  const [outputQty, setOutputQty] = useState("");
  const [unit, setUnit] = useState("");
  const [stockItems, setStockItems] = useState([]);
const [bomStockGroups, setBomStockGroups] = useState([]);
const [loadingItems, setLoadingItems] = useState(true);
const [feedback, setFeedback] = useState("");
const [feedbackType, setFeedbackType] = useState("");


useEffect(() => {
  const loadBOMItems = async () => {
    try {
      setLoadingItems(true);

      const [items, groups] = await Promise.all([
        api.getStockItems(),
        api.getBOMStockGroupSettings(),
      ]);

      setStockItems(items || []);
      setBomStockGroups(groups || []);
    } catch (error) {
      console.error("Failed to load BOM stock items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  loadBOMItems();
}, []);


const allowedBOMGroupNames = new Set(
  bomStockGroups
    .filter((group) => Boolean(group.available_for_bom))
    .map((group) => group.name)
);

const finishedProducts = stockItems.filter((item) =>
  allowedBOMGroupNames.has(item.stock_group)
);

const consumptionItems = stockItems.filter(
  (item) => item.stock_group !== "Finished Goods"
);


  const [rawMaterials, setRawMaterials] = useState([
    {
      stockItemId: "",
      itemText: "",
      quantity: "",
      unit: "",
    },
  ]);

  const [packagingMaterials, setPackagingMaterials] = useState([
    {
      stockItemId: "",
      itemText: "",
      quantity: "",
      unit: "",
    },
  ]);

  const addRawMaterial = () => {
    setRawMaterials((current) => [
      ...current,
      {
        stockItemId: "",
        itemText: "",
        quantity: "",
        unit: "",
      },
    ]);
  };

  const removeRawMaterial = (index) => {
    setRawMaterials((current) =>
      current.filter((_, i) => i !== index)
    );
  };

  const addPackagingMaterial = () => {
    setPackagingMaterials((current) => [
      ...current,
      {
        stockItemId: "",
        itemText: "",
        quantity: "",
        unit: "",
      },
    ]);
  };

  const removePackagingMaterial = (index) => {
    setPackagingMaterials((current) =>
      current.filter((_, i) => i !== index)
    );
  };


  const getItemUnit = (itemId) => {
  const item = stockItems.find(
    (stockItem) => String(stockItem.id) === String(itemId)
  );

  return item?.unit || "";
};




 const handleSubmit = async (e) => {
  e.preventDefault();

  setFeedback("");

  try {
    if (!bomName.trim()) {
      setFeedback("Please enter BOM name.");
      setFeedbackType("danger");
      return;
    }

    if (!finishedProduct) {
      setFeedback("Please select Finished Product.");
      setFeedbackType("danger");
      return;
    }

    if (!outputQty || Number(outputQty) <= 0) {
      setFeedback("Please enter a valid Output Quantity.");
      setFeedbackType("danger");
      return;
    }

    const validConsumption = rawMaterials.filter(
      (item) =>
        item.stockItemId &&
        Number(item.quantity) > 0
    );

    const validPackaging = packagingMaterials.filter(
      (item) =>
        item.stockItemId &&
        Number(item.quantity) > 0
    );

    const consumption = [
      ...validConsumption,
      ...validPackaging,
    ];

    if (consumption.length === 0) {
      setFeedback("Please add at least one consumption item.");
      setFeedbackType("danger");
      return;
    }

    await api.createBOM({
      bomName: bomName.trim(),
      finishedProductId: Number(finishedProduct),
      outputQty: Number(outputQty),
      unit,
      consumption: consumption.map((item) => ({
        stockItemId: Number(item.stockItemId),
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
    });

    setFeedback("BOM saved successfully.");
    setFeedbackType("success");


    setBomName("");
setFinishedProduct("");
setFinishedProductText("");
setFinishedProductTouched(false);
setOutputQty("");
setUnit("");

setRawMaterials([
  {
    stockItemId: "",
    itemText: "",
    quantity: "",
    unit: "",
  },
]);

setPackagingMaterials([
  {
    stockItemId: "",
    itemText: "",
    quantity: "",
    unit: "",
  },
]);

   
  } catch (error) {
    console.error("Failed to save BOM:", error);

    setFeedback("Failed to save BOM.");
    setFeedbackType("danger");
  }
};




  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Create BOM</h4>

        {feedback && (
  <div className={`alert alert-${feedbackType}`} role="alert">
    {feedback}
  </div>
)}

        {onClose && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* BOM Details */}
        <div className="card mb-3">
          <div className="card-header">
            <strong>BOM Details</strong>
          </div>

          <div className="card-body">
            <div className="row mb-3">
              <label className="col-md-3 col-form-label">
                BOM Name
              </label>

              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                />
              </div>
            </div>

            <div className="row mb-3">
              <label className="col-md-3 col-form-label">
                Finished Product
              </label>

              <div className="col-md-6">
                <input
                  type="text"
                  className={`form-control ${
                    finishedProductText &&
                    !finishedProduct &&
                    finishedProductTouched
                      ? "is-invalid"
                      : ""
                  }`}
                  list="finished-product-list"
                  value={finishedProductText}
                  onChange={(e) => {
                    const value = e.target.value;
                    const match = finishedProducts.find(
                      (item) =>
                        item.item_name.toLowerCase() === value.toLowerCase(),
                    );

                    setFinishedProductText(value);
                    setFinishedProductTouched(false);
                    setFinishedProduct(match ? String(match.id) : "");
                    setUnit(match ? getItemUnit(match.id) : "");
                  }}
                  onBlur={() => setFinishedProductTouched(true)}
                  placeholder="Type to search item"
                  autoComplete="off"
                />

                <datalist id="finished-product-list">
                  {finishedProducts.map((item) => (
                    <option key={item.id} value={item.item_name} />
                  ))}
                </datalist>

                {finishedProductText &&
                  !finishedProduct &&
                  finishedProductTouched && (
                    <div className="invalid-feedback">
                      Pick an item from the list.
                    </div>
                  )}
              </div>
            </div>

            <div className="row mb-3">
              <label className="col-md-3 col-form-label">
                Output Quantity
              </label>

              <div className="col-md-3">
                <input
                  type="number"
                  min="0"
                  className="form-control"
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                />
              </div>
            </div>

            <div className="row">
              <label className="col-md-3 col-form-label">
                Unit
              </label>

              <div className="col-md-3">
            <input
  type="text"
  className="form-control"
  value={unit}
  readOnly
/>
              </div>
            </div>
          </div>
        </div>

        {/* Raw Materials */}
        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Raw Materials</strong>

            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addRawMaterial}
            >
              + Add Raw Material
            </button>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Raw Material</th>
                    <th style={{ width: "180px" }}>Quantity</th>
                    <th style={{ width: "180px" }}>Unit</th>
                    <th style={{ width: "100px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {rawMaterials.map((material, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className={`form-control ${
                            material.itemText &&
                            !material.stockItemId &&
                            material.touched
                              ? "is-invalid"
                              : ""
                          }`}
                          list={`raw-material-list-${index}`}
                          value={material.itemText}
                          onChange={(e) => {
                            const value = e.target.value;
                            const match = consumptionItems.find(
                              (item) =>
                                item.item_name.toLowerCase() ===
                                value.toLowerCase(),
                            );

                            setRawMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      itemText: value,
                                      stockItemId: match
                                        ? String(match.id)
                                        : "",
                                      unit: match
                                        ? getItemUnit(match.id)
                                        : "",
                                      touched: false,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          onBlur={() =>
                            setRawMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, touched: true }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Type to search item"
                          autoComplete="off"
                        />

                        <datalist id={`raw-material-list-${index}`}>
                          {consumptionItems.map((item) => (
                            <option key={item.id} value={item.item_name} />
                          ))}
                        </datalist>

                        {material.itemText &&
                          !material.stockItemId &&
                          material.touched && (
                            <div className="invalid-feedback">
                              Pick an item from the list.
                            </div>
                          )}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={material.quantity}
                          onChange={(e) => {
                            const value = e.target.value;

                            setRawMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      quantity: value,
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      </td>

                      <td>
                        <input
  type="text"
  className="form-control"
  value={material.unit}
  readOnly
/>
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removeRawMaterial(index)
                          }
                          disabled={rawMaterials.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Packaging Materials */}
        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Packaging Materials</strong>

            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addPackagingMaterial}
            >
              + Add Packaging Material
            </button>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Packaging Material</th>
                    <th style={{ width: "180px" }}>Quantity</th>
                    <th style={{ width: "180px" }}>Unit</th>
                    <th style={{ width: "100px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {packagingMaterials.map((material, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className={`form-control ${
                            material.itemText &&
                            !material.stockItemId &&
                            material.touched
                              ? "is-invalid"
                              : ""
                          }`}
                          list={`packaging-material-list-${index}`}
                          value={material.itemText}
                          onChange={(e) => {
                            const value = e.target.value;
                            const match = consumptionItems.find(
                              (item) =>
                                item.item_name.toLowerCase() ===
                                value.toLowerCase(),
                            );

                            setPackagingMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      itemText: value,
                                      stockItemId: match
                                        ? String(match.id)
                                        : "",
                                      unit: match
                                        ? getItemUnit(match.id)
                                        : "",
                                      touched: false,
                                    }
                                  : item,
                              ),
                            );
                          }}
                          onBlur={() =>
                            setPackagingMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? { ...item, touched: true }
                                  : item,
                              ),
                            )
                          }
                          placeholder="Type to search item"
                          autoComplete="off"
                        />

                        <datalist id={`packaging-material-list-${index}`}>
                          {consumptionItems.map((item) => (
                            <option key={item.id} value={item.item_name} />
                          ))}
                        </datalist>

                        {material.itemText &&
                          !material.stockItemId &&
                          material.touched && (
                            <div className="invalid-feedback">
                              Pick an item from the list.
                            </div>
                          )}
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={material.quantity}
                          onChange={(e) => {
                            const value = e.target.value;

                            setPackagingMaterials((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      quantity: value,
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      </td>

                      <td>
                        <input
  type="text"
  className="form-control"
  value={material.unit}
  readOnly
/>
                      </td>

                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removePackagingMaterial(index)
                          }
                          disabled={
                            packagingMaterials.length === 1
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="btn btn-primary">
            Save BOM
          </button>
        </div>
      </form>
    </div>
  );
}