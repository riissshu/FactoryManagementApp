import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function BackupRestore() {
  const [folders, setFolders] = useState(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const data = await api.getDbFolders();
      setFolders(data);
    } catch (error) {
      console.error(error);
    }
  };

  const backup = async () => {
    try {
      const result = await api.createBackup();

      if (result?.canceled) return;

      if (result?.error) {
        alert(result.error);
        return;
      }

      if (result?.path) {
        alert(`Backup created successfully.\n\n${result.path}`);
        loadFolders();
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || "Unable to create backup.");
    }
  };

  const restore = async () => {
    if (
      !window.confirm(
        "Restore a backup?\n\nThe selected backup will replace the current company data and the app will restart.",
      )
    ) {
      return;
    }

    try {
      const result = await api.restoreBackup();

      if (result?.canceled) return;

      if (result?.error) {
        alert(result.error);
        return;
      }

      if (!result?.restored) {
        alert("Unable to restore the backup.");
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || "Unable to restore backup.");
    }
  };

  return (
    <div className="container-fluid">
      <h3 className="fw-bold mb-4">Backup & Restore</h3>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-2">
            <i className="bi bi-folder2-open me-2" />
            Backup Folder
          </h5>
          <p className="text-muted mb-2">
            Backups are created automatically in this folder.
          </p>
          <code className="d-block" style={{ wordBreak: "break-all" }}>
            {folders?.backupDir || "Loading..."}
          </code>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5>
                <i className="bi bi-database-down me-2" />
                Create Backup
              </h5>

              <p className="text-muted">
                Create a complete copy of the current company database.
                The backup is saved automatically in the Backup Folder above.
              </p>

              <button className="btn btn-primary" onClick={backup}>
                Create Backup
              </button>
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

              <p className="text-muted">
                Select a previous Factory Book backup file. The app will
                validate it, replace the current company database, and restart.
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
