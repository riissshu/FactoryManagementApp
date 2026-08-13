import React, { useEffect, useState } from "react";

const blankRow = () => ({
  item: "",
  qty: "",
  unit: "",
});

const blankEntry = () => ({
  gatePassNo: "",
  items: [blankRow()],
});

export default function DispatchEntry({
  stockItems,
  entry,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(
    blankEntry(),
  );

  useEffect(() => {
    if (entry) {
      setForm({
        gatePassNo:
          entry.gatePassNo || "",
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

    if (!form.gatePassNo.trim()) {
      alert("Please enter Gate Pass No.");
      return;
    }

    if (!items.length) {
      alert(
        "Please add at least one item with quantity.",
      );
      return;
    }

    onSave({
      gatePassNo:
        form.gatePassNo.trim(),
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
                ? "Edit Dispatch"
                : "Add Dispatch"}
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
                Gate Pass No.
              </label>

              <input
                className="form-control"
                value={form.gatePassNo}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    gatePassNo:
                      e.target.value,
                  }))
                }
                autoFocus
              />
            </div>

            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold mb-0">
                Items
              </h6>

              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addRow}
              >
                + Add Item
              </button>
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
              Save Dispatch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}