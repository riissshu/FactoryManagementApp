import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function FactoryGateway({ onSetupComplete }) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dbPath, setDbPath] = useState("");
  const [chosenFolder, setChosenFolder] = useState(""); // display only

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
    api
      .getDbLocation()
      .then((loc) => setDbPath(loc?.dbPath || ""))
      .catch(console.error);
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
    if (result?.restored) return;
  };

  // "Select an existing database from disk" — points the app directly at a
  // .db file anywhere on the machine, then restarts to load it.
  const selectExistingDatabase = async () => {
    if (
      !window.confirm(
        "Switch to an existing factory database?\n\nThe app will restart and load that database.",
      )
    ) {
      return;
    }
    const result = await api.selectExistingDatabase();
    if (result?.error) alert(result.error);
  };

  // "Choose a different folder for a brand new database" — before saving,
  // lets the user override the default (userData) location.
  const chooseNewDatabaseFolder = async () => {
    const result = await api.createNewDatabase({
      folder: chosenFolder || "pick",
      fileName: factoryName || "factory",
    });
    if (result?.canceled) return;
    if (result?.error) {
      alert(result.error);
      return;
    }
    if (result?.path) {
      setChosenFolder(result.path);
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
      if (!masterPassword || masterPassword !== confirmPassword) {
        alert("Enter and confirm a master password. It protects stock master changes.");
        return;
      }
      await api.saveSettings(factoryName, logo, masterPassword);
      onSetupComplete();
    } catch (error) {
      console.error(error);
      alert("Unable to Create New factory.");
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
              Database location
            </h5>
            <p className="text-muted mb-2">
              This new factory's data will be saved here:
            </p>
            <code className="d-block mb-3" style={{ wordBreak: "break-all" }}>
              {dbPath || "Default app data folder"}
            </code>
            <button className="btn btn-outline-secondary" onClick={chooseNewDatabaseFolder}>
              <i className="bi bi-folder2-open me-2"></i>
              Choose a different folder
            </button>
            <div className="form-text mt-2">
              You can change this later from Factory Profile. Leave it as-is
              to use the default location.
            </div>
          </div>

          <div className="border rounded p-4 mb-4 bg-light">
            <h5 className="fw-bold">
              <i className="bi bi-database-up me-2"></i>
              Already have a factory?
            </h5>
            <p className="text-muted mb-3">
              Restore a backup file into the default location, or point the
              app directly at an existing database file elsewhere on this
              computer.
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