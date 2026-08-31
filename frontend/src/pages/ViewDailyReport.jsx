import { useEffect, useState } from "react";
import ViewDailyReportTables from "../components/ViewDailyReportTables";
import api from "../services/api";
import { exportDailyReportPdf } from "../utils/exportDailyReportPdf";
import { exportDailyReportExcel } from "../utils/exportDailyReportExcel";

export default function ViewDailyReport({
  reportId,
  mode = "view",
  onClose,
  onEdit,
}) {
  const [date, setDate] = useState("");
  const [stockItems, setStockItems] = useState([]);

  const [isExported, setIsExported] = useState(false);

  const [passwordModal, setPasswordModal] = useState({
    show: false,
    action: null,
  });

  const [masterPassword, setMasterPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [editMasterPassword, setEditMasterPassword] = useState("");

  const [data, setData] = useState({
    purchases: [],
    gatePasses: [],
    manufactured: [],
  });

  const [currentMode, setCurrentMode] = useState(mode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [report, items] = await Promise.all([
          api.getDailyReportById(reportId),
          api.getStockItems(),
        ]);

        if (!report) {
          console.error("Daily report not found.");
          return;
        }

        setDate(report.date || report.report_date || "");
        setIsExported(Boolean(report.is_exported));

        setData({
          purchases: report.purchases || [],
          gatePasses: report.gatePasses || [],
          manufactured: report.manufactured || [],
        });

        setStockItems(items || []);
      } catch (error) {
        console.error("Unable to load daily report:", error);
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      loadData();
    }
  }, [reportId]);

  const openPasswordModal = (action) => {
    setPasswordModal({
      show: true,
      action,
    });

    setMasterPassword("");
    setPasswordError("");
  };

  const closePasswordModal = () => {
    if (unlocking) return;

    setPasswordModal({
      show: false,
      action: null,
    });

    setMasterPassword("");
    setPasswordError("");
  };

  const unlockWithMasterPassword = async () => {
    if (unlocking) return;

    if (!masterPassword) {
      setPasswordError("Please enter Master Password.");
      return;
    }

    try {
      setUnlocking(true);
      setPasswordError("");

      const valid = await api.verifyMasterPassword(masterPassword);

      if (!valid) {
        setPasswordError("Incorrect Master Password.");
        return;
      }

      const action = passwordModal.action;

      closePasswordModal();

      if (action === "edit") {
        // Keep the password temporarily so the backend can
        // authorize the actual save operation.
          onEdit?.(reportId, masterPassword);
      }

      if (action === "delete") {
        await api.deleteDailyReport(reportId, masterPassword);

        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error("Unable to unlock daily report:", error);

      setPasswordError(error?.message || "Unable to unlock daily report.");
    } finally {
      setUnlocking(false);
    }
  };

  const save = async () => {
    if (saving) return;

    if (!date) {
      alert("Please select a report date.");
      return;
    }

    const mismatch = data.manufactured.find(
      (entry) =>
        Math.abs(
          entry.consumption.reduce(
            (sum, item) => sum + (Number(item.qty) || 0),
            0,
          ) -
            entry.production.reduce(
              (sum, item) => sum + (Number(item.qty) || 0),
              0,
            ),
        ) > 0.0001,
    );

    if (mismatch) {
      alert(
        "Consumption and production quantities must match. Add the difference as a Material loss row under Production before saving.",
      );
      return;
    }

    try {
      setSaving(true);

      await api.updateDailyReport(
        reportId,
        {
          report_date: date,
          ...data,
        },
        editMasterPassword,
      );
      setEditMasterPassword("");
      setCurrentMode("view");
    } catch (error) {
      console.error("Unable to update daily report:", error);

      alert(error?.message || "Unable to update daily report.");
    } finally {
      setSaving(false);
    }
  };

  const deleteReport = async () => {
    if (isExported) {
      openPasswordModal("delete");
      return;
    }

    try {
      await api.deleteDailyReport(reportId);

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Unable to delete daily report:", error);

      alert(error?.message || "Unable to delete daily report.");
    }
  };

  const exportPdf = async () => {
    try {
      const settings = await api.getSettings();

      await exportDailyReportPdf({
        company: settings?.factory_name,
        reportDate: date,
        purchases: data.purchases,
        gatePasses: data.gatePasses,
        manufactured: data.manufactured,
        stockItems,
        filename: `${
          settings?.factory_name || "factory"
        }-daily-report-${date}.pdf`,
      });

      // PDF was successfully exported.
      // Now permanently lock the report.
      if (!isExported) {
        await api.markDailyReportExported(reportId);
        setIsExported(true);
      }
    } catch (error) {
      console.error("Unable to export daily report:", error);

      alert(error?.message || "Unable to export daily report.");
    }
  };

  const exportExcel = async () => {
  try {
    const settings = await api.getSettings();

    exportDailyReportExcel({
      company: settings?.factory_name,
      reportDate: date,
      purchases: data.purchases,
      gatePasses: data.gatePasses,
      manufactured: data.manufactured,
      stockItems,
      filename: `${
        settings?.factory_name || "factory"
      }-daily-report-${date}.xlsx`,
    });
  } catch (error) {
    console.error(
      "Unable to export daily report:",
      error
    );

    alert(
      error?.message ||
        "Unable to export daily report."
    );
  }
};

  if (loading) {
    return (
      <div className="page-shell">
        <div className="content-card">
          <p className="text-muted mb-0">Loading daily report...</p>
        </div>
      </div>
    );
  }

  const isView = currentMode === "view";

  return (
    <div className="page-shell" >

<div className="d-flex justify-content-end gap-2 mb-4">
  <button
    type="button"
    className="btn btn-primary"
    onClick={() => {
  if (isExported) {
    openPasswordModal("edit");
    return;
  }

  onEdit?.(reportId);
}}
  >
    Edit Report
  </button>

  <button
  type="button"
  className="btn btn-outline-success ms-2"
  onClick={exportExcel}
>
  Export Excel
</button>

  <button
    type="button"
    className="btn btn-outline-primary"
    onClick={exportPdf}
  >
    Export PDF
  </button>

  <button
    type="button"
    className="btn btn-outline-danger"
    onClick={deleteReport}
  >
    Delete
  </button>

  <button
    type="button"
    className="btn btn-secondary"
    onClick={onClose}
  >
    Close
  </button>
</div>

      <div className="d-flex align-items-center justify-content-between mb-3">
        {/* LEFT */}
        <div>
          <h2 className="fw-bold mb-0">Daily Report</h2>
        </div>

        {/* CENTER */}
        <div className="text-center">
          <span className="small text-muted me-2">Report Date:</span>

          <span className="fw-semibold">{date || "-"}</span>
        </div>

        {/* RIGHT */}
        <div>
          {isExported && (
            <span className="badge bg-secondary px-3 py-2">
              🔒 Exported & Locked
            </span>
          )}
        </div>
      </div>

      <>
        {/* READ-ONLY TABLES */}

        <ViewDailyReportTables
          purchases={data.purchases}
          gatePasses={data.gatePasses}
          manufactured={data.manufactured}
          stockItems={stockItems}
        />
      </>

  

      {passwordModal.show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🔒 Daily Report Locked</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={closePasswordModal}
                  disabled={unlocking}
                />
              </div>

              <div className="modal-body">
                <div className="alert alert-warning">
                  Unable to{" "}
                  {passwordModal.action === "edit" ? "edit" : "delete"} after
                  daily report exported.
                </div>

                <p className="mb-3">
                  You can {passwordModal.action === "edit" ? "edit" : "delete"}{" "}
                  this report with Master Password.
                </p>

                <label className="form-label fw-semibold">
                  Master Password
                </label>

                <input
                  type="password"
                  className={`form-control ${
                    passwordError ? "is-invalid" : ""
                  }`}
                  value={masterPassword}
                  onChange={(event) => setMasterPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      unlockWithMasterPassword();
                    }
                  }}
                  autoFocus
                  disabled={unlocking}
                />

                {passwordError && (
                  <div className="invalid-feedback">{passwordError}</div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closePasswordModal}
                  disabled={unlocking}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={unlockWithMasterPassword}
                  disabled={unlocking}
                >
                  {unlocking
                    ? "Verifying..."
                    : passwordModal.action === "edit"
                      ? "Unlock & Edit"
                      : "Unlock & Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
