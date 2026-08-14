import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import DailyReportTables from "../components/DailyReportTables";

export default function PreviewDailyReport({
  report,
  stockItems,
  onSave,
  onBack,
  saving,
}) {
  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.65)",
      }}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        style={{
          maxWidth: "1400px",
        }}
      >
        <div className="modal-content">
          {/* HEADER */}

          <div className="modal-header border-bottom row">
            <div className="col-md-6">
              <div className="text-muted small mb-1">DAILY REPORT PREVIEW</div>

              <h4 className="fw-bold mb-1">Preview Daily Report</h4>

              <div className="text-muted small">
                Review the report before saving it to the database.
              </div>
            </div>

            <div className="col-md-4">
              <div className="text-muted small">Report Date</div>

              <div className="fw-bold fs-5">{report.date || "-"}</div>
            </div>

            <div className="col-auto text-md-end">
              <span className="badge bg-primary px-3 py-2">PREVIEW</span>
            </div>

            <button
              type="button"
              className="btn-close me-4"
              onClick={onBack}
              disabled={saving}
            />
          </div>

          {/* REPORT TABLES */}

          <div className="modal-body px-4">
            <div
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              <DailyReportTables
                purchases={report.purchases}
                gatePasses={report.gatePasses}
                manufactured={report.manufactured}
                stockItems={stockItems}
                errors={{
                  purchases: null,
                  gatePasses: null,
                  manufactured: null,
                }}
              />
            </div>
          </div>

          {/* FOOTER */}

          <div className="modal-footer border-top">
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onBack}
              disabled={saving}
            >
              Back to Edit
            </button>

            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Daily Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
