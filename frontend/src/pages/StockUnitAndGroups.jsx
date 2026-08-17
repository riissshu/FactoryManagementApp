import {
  useEffect,
  useRef,
  useState,
} from "react";
import api from "../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faTrash,
  faFloppyDisk,
  faXmark,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

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
  const [errorMessage, setErrorMessage] = useState("");

  const [modal, setModal] = useState({
    show: false,
    type: "",
    row: null,
  });

  // Prevent rapid multiple clicks
  const actionLock = useRef(false);

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
  // START ACTION
  // -----------------------------------------

  const startAction = () => {
    if (actionLock.current) {
      return false;
    }

    actionLock.current = true;
    setProcessing(true);

    return true;
  };

  // -----------------------------------------
  // END ACTION
  // -----------------------------------------

  const endAction = () => {
    actionLock.current = false;
    setProcessing(false);
  };

  // -----------------------------------------
  // ADD
  // -----------------------------------------

  const handleAdd = async () => {
    // Immediate multiple-click protection
    if (!startAction()) return;

    const name = newName.trim();

    // Do not process empty input
    if (!name) {
      endAction();
      return;
    }

    setErrorMessage("");

    try {
      await add(name);

      setNewName("");

      await refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        `Unable to add "${name}". It may already exist.`
      );
    } finally {
      endAction();
    }
  };

  // -----------------------------------------
  // RENAME
  // -----------------------------------------

  const startEdit = async (row) => {
    if (!startAction()) return;

    setErrorMessage("");

    try {
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

      setErrorMessage(
        error?.message ||
          "Unable to check this item."
      );
    } finally {
      endAction();
    }
  };

  // -----------------------------------------
  // SAVE RENAME
  // -----------------------------------------

  const saveEdit = async () => {
    if (!startAction()) return;

    const name = editingName.trim();

    if (!name) {
      endAction();
      return;
    }

    setErrorMessage("");

    try {
      await rename(editingId, name);

      setEditingId(null);
      setEditingName("");

      await refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Unable to rename."
      );
    } finally {
      endAction();
    }
  };

  // -----------------------------------------
  // REMOVE
  // -----------------------------------------

  const handleDeactivate = async (row) => {
    if (!startAction()) return;

    setErrorMessage("");

    try {
      const used = await hasTransactions(row.id);

      if (used) {
        setModal({
          show: true,
          type: "remove",
          row,
        });

        return;
      }

      setModal({
        show: true,
        type: "confirmRemove",
        row,
      });
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Unable to check this item."
      );
    } finally {
      endAction();
    }
  };

  // -----------------------------------------
  // CONFIRM REMOVE
  // -----------------------------------------

  const confirmRemove = async () => {
    if (!startAction()) return;

    const row = modal.row;

    if (!row) {
      endAction();
      return;
    }

    setErrorMessage("");

    try {
      await deactivate(row.id);

      setModal({
        show: false,
        type: "",
        row: null,
      });

      await refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Unable to remove."
      );
    } finally {
      endAction();
    }
  };

  // -----------------------------------------
  // MAKE INACTIVE
  // -----------------------------------------

  const makeInactive = async () => {
    if (!startAction()) return;

    const row = modal.row;

    if (!row) {
      endAction();
      return;
    }

    setErrorMessage("");

    try {
      await deactivate(row.id);

      setModal({
        show: false,
        type: "",
        row: null,
      });

      await refresh();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error?.message ||
          "Unable to make item inactive."
      );
    } finally {
      endAction();
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

  // -----------------------------------------
  // MODAL TITLE
  // -----------------------------------------

  const getModalTitle = () => {
    switch (modal.type) {
      case "confirmRemove":
        return "Confirm Removal";

      case "rename":
        return "Cannot Modify";

      case "remove":
        return "Cannot Remove";

      default:
        return "";
    }
  };

  return (
    <>
      <div className="container-fluid px-0">

        {/* SECTION HEADER */}

        <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-3">

          <div>
            <h5 className="mb-1 fw-semibold">
              {title}
            </h5>

            <div className="text-muted small">
              Manage {title.toLowerCase()}.
            </div>
          </div>

          <span className="badge bg-secondary">
            {rows.length}{" "}
            {rows.length === 1
              ? "item"
              : "items"}
          </span>

        </div>

        <div className="p-3">

          {/* ERROR */}

          {errorMessage && (
            <div
              className="alert alert-danger alert-dismissible fade show mb-3"
              role="alert"
            >
              {errorMessage}

              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() =>
                  setErrorMessage("")
                }
              />
            </div>
          )}

          {/* ADD */}

          <div className="card border-0 bg-light mb-3">
            <div className="card-body">

              <div className="row align-items-end g-2">

                <div className="col-12 col-md-8 col-lg-6">

                  <label className="form-label fw-semibold mb-1">
                    Add New
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Enter ${title
                      .toLowerCase()
                      .replace(/s$/, "")} name`}
                    value={newName}
                    disabled={processing}
                    onChange={(e) =>
                      setNewName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        newName.trim() &&
                        !processing
                      ) {
                        handleAdd();
                      }
                    }}
                  />

                </div>

                <div className="col-auto">

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAdd}
                    disabled={
                      processing ||
                      !newName.trim()
                    }
                  >
                    {processing
                      ? "Processing..."
                      : "Add"}
                  </button>

                </div>

              </div>

            </div>
          </div>

          {/* TABLE */}

          <div className="card border">

            <div className="table-responsive">

              <table className="table table-hover table-bordered align-middle mb-0">

                <thead className="table-light">
                  <tr>

                    <th className="fw-semibold">
                      Name
                    </th>

                    <th
                      className="text-end fw-semibold"
                      style={{ width: "190px" }}
                    >
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {rows.map((row) => (
                    <tr key={row.id}>

                      <td>

                        {editingId === row.id ? (
                          <input
                            type="text"
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
                                editingName.trim() &&
                                !processing
                              ) {
                                saveEdit();
                              }

                              if (
                                e.key === "Escape" &&
                                !processing
                              ) {
                                setEditingId(null);
                                setEditingName("");
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="fw-medium">
                            {row.name}
                          </span>
                        )}

                      </td>

                      <td className="text-end">

                        {editingId === row.id ? (
                          <div className="d-flex justify-content-end gap-2">

                            <button
                              type="button"
                              className="btn btn-success"
                              onClick={saveEdit}
                              disabled={
                                processing ||
                                !editingName.trim()
                              }
                            >
                              {processing
                                ? "Saving..."
                                : "Save"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-secondary"
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

                          </div>
                        ) : (
                          <div className="d-flex justify-content-end gap-2">

                            <button
                              type="button"
                              className="btn btn-outline-secondary  d-inline-flex align-items-center gap-2"
                              onClick={() =>
                                startEdit(row)
                              }
                              disabled={processing}
                            > 
  <FontAwesomeIcon icon={faPenToSquare} />
                              {processing
                                ? "Checking..."
                                : "Rename"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
                              onClick={() =>
                                handleDeactivate(row)
                              }
                              disabled={processing}
                            >   <FontAwesomeIcon icon={faTrash} />
                              {processing
                                ? "Processing..."
                                : "Remove"}
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>
                  ))}

                  {!rows.length && (
                    <tr>
                      <td
                        colSpan="2"
                        className="text-center text-muted py-4"
                      >
                        No {title.toLowerCase()} available.
                      </td>
                    </tr>
                  )}

                </tbody>

              </table>

            </div>
          </div>

        </div>
      </div>

      {/* BOOTSTRAP MODAL */}

      {modal.show && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
            >
              <div className="modal-content">

                <div className="modal-header">

                  <div>
                    <h5 className="modal-title mb-1">
                      {getModalTitle()}
                    </h5>

                    <div className="text-muted small">
                      {title === "Units"
                        ? "Stock Unit"
                        : "Stock Group"}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={processing}
                    aria-label="Close"
                  />

                </div>

                <div className="modal-body">

                  {modal.type === "confirmRemove" && (
                    <>
                      <p className="mb-2">
                        Are you sure you want to remove
                        <strong>
                          {" "}
                          "{modal.row?.name}"
                        </strong>
                        ?
                      </p>

                      <p className="text-muted mb-0">
                        This item is not currently being
                        used in any transaction.
                      </p>
                    </>
                  )}

                  {modal.type === "rename" && (
                    <>
                      <p className="mb-2">
                        This{" "}
                        {title === "Units"
                          ? "stock unit"
                          : "stock group"}{" "}
                        cannot be modified.
                      </p>

                      <p className="text-muted mb-0">
                        It is already being used in an
                        existing transaction.
                      </p>
                    </>
                  )}

                  {modal.type === "remove" && (
                    <>
                      <p className="mb-2">
                        This{" "}
                        {title === "Units"
                          ? "stock unit"
                          : "stock group"}{" "}
                        cannot be removed.
                      </p>

                      <p className="text-muted mb-3">
                        It is already being used in an
                        existing transaction.
                      </p>

                      <div className="alert alert-warning mb-0">
                        You can make{" "}
                        <strong>
                          "{modal.row?.name}"
                        </strong>{" "}
                        inactive instead.
                      </div>
                    </>
                  )}

                </div>

                <div className="modal-footer">

                  {modal.type === "confirmRemove" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={closeModal}
                        disabled={processing}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={confirmRemove}
                        disabled={processing}
                      >
                        {processing
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </>
                  )}

                  {modal.type === "rename" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                      disabled={processing}
                    >
                      Close
                    </button>
                  )}

                  {modal.type === "remove" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={closeModal}
                        disabled={processing}
                      >
                        Close
                      </button>

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
                    </>
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

      {/* PAGE HEADER */}

      <div className="d-flex align-items-center justify-content-between mb-4">

        <div>
          <h4 className="mb-1 fw-semibold">
            Stock Groups & Units
          </h4>

          <p className="text-muted mb-0">
            Manage stock groups and measurement units.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
        >
          Close
        </button>

      </div>

      {/* CONTENT */}

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

        <div className="border-top my-4" />

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