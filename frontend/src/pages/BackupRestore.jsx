import React from "react";
import api from "../services/api";

export default function BackupRestore() {
  const backup = async () => {
    const result = await api.createBackup();

    if (!result?.canceled) {
      alert("Backup saved successfully.");
    }
  };

  const restore = async () => {
    if (
      !window.confirm(
        "Restore a backup? The app will restart and current data will be replaced.",
      )
    )
      return;

    await api.restoreBackup();
  };

  return (
    <div className="container-fluid">
      <h3 className="fw-bold mb-4">Backup & Restore</h3>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>
                <i className="bi bi-database-down me-2" />
                Create Backup
              </h5>

              <p className="text-muted">
                Save a copy of your current database.
              </p>

              <button className="btn btn-primary" onClick={backup}>
                Create Backup
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5>
                <i className="bi bi-database-up me-2" />
                Restore Backup
              </h5>

              <p className="text-muted">
                Restore data from a previous backup file.
              </p>

              <button className="btn btn-danger" onClick={restore}>
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
