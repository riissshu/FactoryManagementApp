 import React, { useEffect, useState } from "react";
 import api from "../services/api";

const blankRow = () => ({
  item: "",
  qty: "",
  unit: "",
});

const blankEntry = () => ({
  purchaseNo: "",
    supplierName: "",
  items: [blankRow()],
});

export default function PurchaseEntry({
  stockItems,
  entry,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(
    blankEntry(),
  );

  const [showClipboard, setShowClipboard] = useState(false);
const [clipboardItems, setClipboardItems] = useState([]);

  useEffect(() => {
    if (entry) {
      setForm({
        purchaseNo: entry.purchaseNo || "",
          supplierName: entry.supplierName || "",
        items:
          entry.items?.length
            ? entry.items.map((row) => ({
                ...row,
              }))
            : [blankRow()],
      });
    } else {
      setForm(blankEntry());
    }
  }, [entry]);

  const openClipboard = async () => {
  try {
    const items = await api.getClipboard();
    setClipboardItems(items || []);
    setShowClipboard(true);
  } catch (error) {
    console.error(
      "Unable to load Clipboard:",
      error,
    );
  }
};

const compatibleClipboardItems = clipboardItems.filter(
  (item) => item.entry_type === "purchase"
);

const incompatibleClipboardItems = clipboardItems.filter(
  (item) => item.entry_type !== "purchase"
);

const pastePurchaseFromClipboard = (item) => {
  setForm({
    purchaseNo: item.data.purchaseNo || "",
       supplierName: item.data.supplierName || "",
    items:
      item.data.items?.length > 0
        ? item.data.items.map((row) => ({
            item: row.item,
            qty: row.qty,
            unit: row.unit,
          }))
        : [blankRow()],
  });

  setShowClipboard(false);
};

  const updateItem = (
    index,
    field,
    value,
  ) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map(
        (row, i) =>
          i === index
            ? {
                ...row,
                [field]: value,
                ...(field === "item"
                  ? {
                      unit:
                        stockItems.find(
                          (item) =>
                            item.id ===
                            Number(value),
                        )?.unit || "",
                    }
                  : {}),
              }
            : row,
      ),
    }));
  };

  const addRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        blankRow(),
      ],
    }));
  };

  const removeRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter(
              (_, i) => i !== index,
            )
          : prev.items,
    }));
  };

  const save = () => {
    const items = form.items.filter(
      (row) =>
        row.item &&
        Number(row.qty) > 0,
    );

    if (!form.purchaseNo.trim()) {
  
      return;
    }

    if (!form.supplierName.trim()) {
  return;
}

    if (!items.length) {
     
      return;
    }

    onSave({
      purchaseNo:
        form.purchaseNo.trim(),
          supplierName: form.supplierName.trim(),
      items,
    });
  };

  return (
    <div
      className="modal fade show d-block"
      style={{
        backgroundColor:
          "rgba(0,0,0,.5)",
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold">
              {entry
                ? "Edit Purchase"
                : "Add Purchase"}
            </h5>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body">
            <div className="mb-4">
              <label className="form-label fw-semibold">
                Purchase No.
              </label>

              <input
                className="form-control"
                value={form.purchaseNo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    purchaseNo:
                      e.target.value,
                  }))
                }
                autoFocus
              />
            </div>

            <div className="mb-4">
  <label className="form-label fw-semibold">
    Supplier Name
  </label>

  <input
    className="form-control"
    value={form.supplierName}
    onChange={(e) =>
      setForm((prev) => ({
        ...prev,
        supplierName: e.target.value,
      }))
    }
  />
</div>

            <div className="d-flex justify-content-between align-items-center mb-2">
  <h6 className="fw-bold mb-0">
    Items
  </h6>

  <div className="d-flex gap-2">
    {!entry && (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={openClipboard}
      >
        <i className="bi bi-clipboard me-1"></i>
        Paste from Clipboard
      </button>
    )}

    <button
      type="button"
      className="btn btn-sm btn-outline-primary"
      onClick={addRow}
    >
      + Add Item
    </button>
  </div>
</div>

            <table className="table align-middle">
              <thead className="table-light">
                <tr>
                  <th>Stock Item</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {form.items.map(
                  (row, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          className="form-select"
                          value={row.item}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "item",
                              e.target
                                .value,
                            )
                          }
                        >
                          <option value="">
                            Select item
                          </option>

                          {stockItems.map(
                            (item) => (
                              <option
                                key={item.id}
                                value={
                                  item.id
                                }
                              >
                                {
                                  item.item_name
                                }
                              </option>
                            ),
                          )}
                        </select>
                      </td>

                      <td style={{ width: 150 }}>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          value={row.qty}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "qty",
                              e.target
                                .value,
                            )
                          }
                        />
                      </td>

                      <td style={{ width: 100 }}>
                        {row.unit || "-"}
                      </td>

                      <td style={{ width: 50 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removeRow(
                              index,
                            )
                          }
                        >
                          −
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
            >
              Save Purchase
            </button>
          </div>
        </div>
      </div>

                {showClipboard && (
  <div
    className="modal fade show d-block"
    tabIndex="-1"
    style={{
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    }}
  >
    <div className="modal-dialog modal-lg modal-dialog-centered">
      <div className="modal-content">

        <div className="modal-header">
          <h5 className="modal-title">
            Paste from Clipboard
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => setShowClipboard(false)}
          />
        </div>

        <div className="modal-body">

          {compatibleClipboardItems.length === 0 &&
            incompatibleClipboardItems.length === 0 && (
              <div className="text-center text-muted py-4">
                Clipboard is empty.
              </div>
            )}

          {compatibleClipboardItems.length > 0 && (
            <>
              <div className="fw-semibold mb-2">
                Purchase Entries
              </div>

              {compatibleClipboardItems.map((item) => (
                <div
                  key={item.id}
                  className="d-flex justify-content-between align-items-center border rounded p-3 mb-2"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.title}
                    </div>

                    <small className="text-muted">
                      Purchase
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() =>
                      pastePurchaseFromClipboard(item)
                    }
                  >
                    Paste
                  </button>
                </div>
              ))}
            </>
          )}

          {incompatibleClipboardItems.length > 0 && (
            <>
              <hr />

              <div className="text-muted fw-semibold mb-2">
                Other copied entries
              </div>

              {incompatibleClipboardItems.map((item) => (
                <div
                  key={item.id}
                  className="d-flex justify-content-between align-items-center border rounded p-3 mb-2 text-muted bg-light"
                >
                  <div>
                    <div className="fw-semibold">
                      {item.title}
                    </div>

                    <small>
                      {item.entry_type === "dispatch"
                        ? "Dispatch"
                        : item.entry_type === "production"
                        ? "Production"
                        : item.entry_type}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled
                  >
                    Not compatible
                  </button>
                </div>
              ))}
            </>
          )}

        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowClipboard(false)}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  </div>
)}

    </div>
  );
}