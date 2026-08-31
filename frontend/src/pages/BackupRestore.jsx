import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function BackupRestore() {
  const [backupDir, setBackupDir] = useState("");
  const [message, setMessage] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => {
    loadFolder();
  }, []);

  const loadFolder = async () => {
    try {
      const folders = await api.getDbFolders();
      setBackupDir(folders?.backupDir || "");
    } catch (error) {
      console.error(error);
    }
  };

  const changeBackupDir = async () => {
    const result = await api.setDefaultBackupDir();
    if (result?.error) {
      alert(result.error);
      return;
    }
    if (!result?.canceled) {
      setBackupDir(result.path || "");
      setMessage("Backup folder updated.");
    }
  };

  const backup = async () => {
    try {
      const result = await api.createBackup();
      if (result?.error) {
        alert(result.error);
        return;
      }
      if (!result?.canceled) {
        setMessage(`Backup created:\n${result.path}`);
      }
    } catch (error) {
      alert(error?.message || "Unable to create backup.");
    }
  };

  const confirmRestore = () => {
  setShowRestoreModal(false);
  restore();
};

  const restore = async () => {
    

    try {
      const result = await api.restoreBackup();
      if (result?.error) alert(result.error);
    } catch (error) {
      alert(error?.message || "Unable to restore backup.");
    }
  };

  return (
    <div className="container-fluid">
      <h3 className="fw-bold mb-4">Backup & Restore</h3>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="fw-bold">Backup Folder</h5>
          <p className="text-muted mb-2">Backups are created automatically in this folder. Restore also opens this folder by default.</p>
          <code className="d-block mb-3" style={{ wordBreak: "break-all" }}>{backupDir || "Loading..."}</code>
          <button className="btn btn-outline-secondary" onClick={changeBackupDir}>
            Change Backup Folder
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success" style={{ whiteSpace: "pre-line" }}>
          {message}
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5>
                <i className="bi bi-database-down me-2" />
                Create Backup
              </h5>
              <p className="text-muted">Create a complete copy of the currently open company.</p>
              <button className="btn btn-primary" onClick={backup}>Create Backup</button>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5>
                <i className="bi bi-database-up me-2" />
                Restore Backup
              </h5>
              <p className="text-muted">Select a Factory Book backup. The restored company is placed in the Company Directory.</p>
              <button className="btn btn-danger"   onClick={() => setShowRestoreModal(true)}>Restore Backup</button>
            </div>
          </div>
        </div>
      </div>
      {showRestoreModal && (
  <div
    className="modal fade show"
    style={{ display: "block" }}
    tabIndex="-1"
    role="dialog"
  >
    <div className="modal-dialog modal-dialog-centered" role="document">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">Restore Backup</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => setShowRestoreModal(false)}
          />
        </div>

        <div className="modal-body">
          Restore a backup? The selected company will replace the company
          with the same name in the Company Directory, if it exists.
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRestoreModal(false)}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={confirmRestore}
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  </div>
)}    {showRestoreModal && (
  <div className="modal-backdrop fade show"></div>
)}
    </div>
  );
}
