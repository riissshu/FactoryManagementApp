import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function FactoryGateway({ onSetupComplete }) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dbPath, setDbPath] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
    api
      .getDbLocation()
      .then((loc) => setDbPath(loc?.dbPath || ""))
      .catch(() => setDbPath(""));
  }, []);

  const restoreBackup = async () => {
    if (
      !window.confirm(
        "Restore existing factory backup?\n\nCurrent setup will be replaced.",
      )
    ) {
      return;
    }
    const result = await api.restoreFirstInstallBackup();
    if (result?.error) {
      alert(result.error);
      return;
    }
    if (result?.restored) return;
  };

  // "Select an existing database from disk" — points the app directly at a
  // .db file anywhere on the machine, then restarts to load it.
  const selectExistingDatabase = async () => {
    if (
      !window.confirm(
        "Open an existing Factory Book database?\n\nThe app will restart and load the database you select.",
      )
    ) {
      return;
    }
    const result = await api.selectExistingDatabase();
    if (result?.error) alert(result.error);
  };

  // Create the new company database in the selected folder.
  // If no folder is selected, the app's default location is used at Save.
  const chooseNewDatabaseFolder = async () => {
    const result = await api.createNewDatabase({
      folder: "pick",
      fileName: factoryName || "factory",
    });

    if (result?.canceled) return;

    if (result?.error) {
      alert(result.error);
      return;
    }

    if (result?.path) {
      setDbPath(result.path);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();
      if (settings) {
        setFactoryName(settings.factory_name);
        if (settings.factory_logo) setLogo(settings.factory_logo);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    try {
      if (!factoryName.trim()) {
        alert("Enter Factory Name.");
        return;
      }

      if (!masterPassword || masterPassword !== confirmPassword) {
        alert("Enter and confirm a master password. It protects stock master changes.");
        return;
      }

      // On first launch there may be no database yet. Create it only when
      // the user actually completes setup.
      if (!dbPath) {
        const result = await api.createNewDatabase({
          fileName: factoryName,
        });

        if (result?.canceled) return;

        if (result?.error) {
          alert(result.error);
          return;
        }

        if (!result?.path) {
          alert("Unable to create the company database.");
          return;
        }

        setDbPath(result.path);
      }

      await api.saveSettings(factoryName.trim(), logo, masterPassword);
      onSetupComplete();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Unable to create the new factory.");
    }
  };

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", background: "#f8f9fa" }}
    >
      <div className="card">
        <div className="card-header bg-primary text-white text-center">
          <h4 className="mb-0">Welcome to Factory Book !</h4>
        </div>

        <div className="card-body">
          <div className="mb-4">
            <label className="form-label fw-bold">
              Factory Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter Factory Name"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">
                Set password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                className="form-control"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Protect stock masters"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">Confirm password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Factory Logo</label>
            <div
              className="border rounded d-flex justify-content-center align-items-center mb-3"
              style={{
                width: "120px",
                height: "120px",
                margin: "0 auto",
                overflow: "hidden",
                backgroundColor: "#f8f9fa",
              }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Factory Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <div className="text-center text-secondary">
                  <div style={{ fontSize: "38px" }}>🏭</div>
                  <small>No Logo</small>
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="d-none"
              onChange={handleLogoChange}
            />

            <div className="text-center">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => fileInputRef.current.click()}
              >
                Choose Logo
              </button>
            </div>
          </div>

          <div className="border rounded p-4 mb-4 bg-light">
            <h5 className="fw-bold">
              <i className="bi bi-hdd-stack me-2"></i>
              Company Data Location
            </h5>
            <p className="text-muted mb-2">
              Your company's live database will be stored here:
            </p>
            <code className="d-block mb-3" style={{ wordBreak: "break-all" }}>
              {dbPath || "App default database location"}
            </code>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={chooseNewDatabaseFolder}
              disabled={!factoryName.trim()}
            >
              <i className="bi bi-folder2-open me-2"></i>
              Choose a different folder
            </button>
            <div className="form-text mt-2">
              If you do not choose a different folder, the company database
              will be created in the app's default database location when you
              click Save &amp; Continue.
            </div>
          </div>

          <div className="border rounded p-4 mb-4 bg-light">
            <h5 className="fw-bold">
              <i className="bi bi-database-up me-2"></i>
              Already have a factory?
            </h5>
            <p className="text-muted mb-3">
              Restore a previous Factory Book backup, or open an existing
              Factory Book database from elsewhere on this computer.
            </p>
            <ul className="small text-muted">
              <li>Factory Name</li>
              <li>Factory Logo</li>
              <li>Stock Masters</li>
              <li>Daily Reports</li>
              <li>All Transactions</li>
            </ul>
            <button className="btn btn-outline-danger me-2" onClick={restoreBackup}>
              <i className="bi bi-upload me-2"></i>
              Restore from backup file
            </button>
            <button className="btn btn-outline-primary" onClick={selectExistingDatabase}>
              <i className="bi bi-folder-symlink me-2"></i>
              Select existing database
            </button>
          </div>

          <div className="text-center">
            <button
              className="btn btn-primary px-5"
              disabled={factoryName.trim() === "" || !masterPassword}
              onClick={handleSave}
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}