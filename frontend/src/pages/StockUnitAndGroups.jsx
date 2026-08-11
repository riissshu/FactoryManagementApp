import { useEffect, useState } from "react";
import api from "../services/api";

function LookupPanel({
  title,
  load,
  add,
  rename,
  deactivate,
  hasTransactions,
}) {
  const [rows, setRows] = useState([]);
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [processing, setProcessing] = useState(false);

  const [modal, setModal] = useState({
    show: false,
    type: "",
    row: null,
  });

  const refresh = async () => {
    try {
      const data = await load();
      setRows(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // -----------------------------------------
  // ADD
  // -----------------------------------------

  const handleAdd = async () => {
    if (processing) return;

    const name = newName.trim();

    if (!name) return;

    try {
      setProcessing(true);

      await add(name);

      setNewName("");

      await refresh();
    } catch (error) {
      console.error(error);

      alert(
        `Unable to add "${name}". It may already exist.`
      );
    } finally {
      setProcessing(false);
    }
  };

  // -----------------------------------------
  // RENAME
  // -----------------------------------------

  const startEdit = async (row) => {
    if (processing) return;

    try {
      setProcessing(true);

      const used = await hasTransactions(row.id);

      if (used) {
        setModal({
          show: true,
          type: "rename",
          row,
        });

        return;
      }

      setEditingId(row.id);
      setEditingName(row.name);
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to check transaction usage."
      );
    } finally {
      setProcessing(false);
    }
  };

  // -----------------------------------------
  // SAVE RENAME
  // -----------------------------------------

  const saveEdit = async () => {
    if (processing) return;

    const name = editingName.trim();

    if (!name) return;

    try {
      setProcessing(true);

      await rename(editingId, name);

      setEditingId(null);
      setEditingName("");

      await refresh();
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to rename."
      );
    } finally {
      setProcessing(false);
    }
  };

  // -----------------------------------------
  // REMOVE
  // -----------------------------------------

  const handleDeactivate = async (row) => {
    if (processing) return;

    try {
      setProcessing(true);

      const used =
        await hasTransactions(row.id);

      // ---------------------------------------
      // TRANSACTION EXISTS
      // ---------------------------------------

      if (used) {
        setModal({
          show: true,
          type: "remove",
          row,
        });

        return;
      }

      // ---------------------------------------
      // NO TRANSACTION
      // ---------------------------------------

      const confirmed = window.confirm(
        `Remove "${row.name}" from the list?`
      );

      if (!confirmed) {
        return;
      }

      await deactivate(row.id);

      await refresh();
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to remove."
      );
    } finally {
      setProcessing(false);
    }
  };

  // -----------------------------------------
  // MAKE INACTIVE FROM MODAL
  // -----------------------------------------

  const makeInactive = async () => {
    const row = modal.row;

    if (!row || processing) return;

    try {
      setProcessing(true);

      await deactivate(row.id);

      setModal({
        show: false,
        type: "",
        row: null,
      });

      await refresh();
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to make item inactive."
      );
    } finally {
      setProcessing(false);
    }
  };

  // -----------------------------------------
  // CLOSE MODAL
  // -----------------------------------------

  const closeModal = () => {
    if (processing) return;

    setModal({
      show: false,
      type: "",
      row: null,
    });
  };

  return (
    <>
      <div className="card shadow-sm mb-4">

        <div className="card-header">
          <strong>{title}</strong>
        </div>

        <div className="card-body">

          {/* ADD */}

          <div
            className="input-group mb-3"
            style={{ maxWidth: 400 }}
          >
            <input
              className="form-control"
              placeholder={`New ${title.toLowerCase()} name`}
              value={newName}
              disabled={processing}
              onChange={(e) =>
                setNewName(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !processing
                ) {
                  handleAdd();
                }
              }}
            />

            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={processing}
            >
              {processing ? "Processing..." : "Add"}
            </button>
          </div>

          {/* TABLE */}

          <table className="table table-bordered mb-0">

            <tbody>

              {rows.map((row) => (
                <tr key={row.id}>

                  <td>

                    {editingId === row.id ? (
                      <input
                        className="form-control"
                        value={editingName}
                        disabled={processing}
                        onChange={(e) =>
                          setEditingName(
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !processing
                          ) {
                            saveEdit();
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      row.name
                    )}

                  </td>

                  <td
                    style={{ width: 160 }}
                    className="text-end"
                  >

                    {editingId === row.id ? (
                      <>
                        <button
                          className="btn btn-sm btn-success me-2"
                          onClick={saveEdit}
                          disabled={processing}
                        >
                          {processing
                            ? "Saving..."
                            : "Save"}
                        </button>

                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            if (!processing) {
                              setEditingId(null);
                              setEditingName("");
                            }
                          }}
                          disabled={processing}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-outline-secondary me-2"
                          onClick={() =>
                            startEdit(row)
                          }
                          disabled={processing}
                        >
                          {processing
                            ? "Checking..."
                            : "Rename"}
                        </button>

                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            handleDeactivate(row)
                          }
                          disabled={processing}
                        >
                          {processing
                            ? "Processing..."
                            : "Remove"}
                        </button>
                      </>
                    )}

                  </td>

                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td className="text-muted text-center">
                    None yet.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>
      </div>

      {/* BOOTSTRAP MODAL */}

      {modal.show && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            style={{
              backgroundColor:
                "rgba(0, 0, 0, 0.5)",
            }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
            >
              <div className="modal-content">

                <div className="modal-header">

                  <h5 className="modal-title">
                    {modal.type === "rename"
                      ? "Cannot Modify"
                      : "Cannot Remove"}
                  </h5>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={processing}
                  />

                </div>

                <div className="modal-body">

                  {modal.type === "rename" ? (
                    <>
                      <p className="mb-2">
                        This {title === "Units"
                          ? "stock unit"
                          : "stock group"}{" "}
                        cannot be modified.
                      </p>

                      <p className="text-muted mb-0">
                        It is already being used
                        in an existing transaction.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2">
                        This {title === "Units"
                          ? "stock unit"
                          : "stock group"}{" "}
                        cannot be removed.
                      </p>

                      <p className="text-muted">
                        It is already being used
                        in an existing transaction.
                      </p>

                      <p className="mb-0">
                        Would you like to make
                        <strong>
                          {" "}
                          "{modal.row?.name}"
                        </strong>{" "}
                        inactive instead?
                      </p>
                    </>
                  )}

                </div>

                <div className="modal-footer">

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    disabled={processing}
                  >
                    Close
                  </button>

                  {modal.type === "remove" && (
                    <button
                      type="button"
                      className="btn btn-warning"
                      onClick={makeInactive}
                      disabled={processing}
                    >
                      {processing
                        ? "Processing..."
                        : "Make Inactive"}
                    </button>
                  )}

                </div>

              </div>
            </div>
          </div>

          <div className="modal-backdrop fade show" />
        </>
      )}
    </>
  );
}

export default function StockGroupsUnits({
  onClose,
}) {
  return (
    <div className="page-shell">

      <button
        className="btn btn-secondary"
        onClick={onClose}
      >
        Close
      </button>

      <div className="content-card">

        <LookupPanel
          title="Stock Groups"
          load={api.getStockGroups}
          add={api.addStockGroup}
          rename={api.renameStockGroup}
          deactivate={
            api.deactivateStockGroup
          }
          hasTransactions={
            api.hasStockGroupTransactions
          }
        />

        <LookupPanel
          title="Units"
          load={api.getStockUnits}
          add={api.addStockUnit}
          rename={api.renameStockUnit}
          deactivate={
            api.deactivateStockUnit
          }
          hasTransactions={
            api.hasStockUnitTransactions
          }
        />

      </div>
    </div>
  );
}