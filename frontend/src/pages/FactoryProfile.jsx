import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

export default function FactoryProfile({ onClose, onProfileUpdated, onMultiAlter, onMultiCreate, onStockGroupUnits}) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [openPdfAfterExport, setOpenPdfAfterExport] = useState(true);

  const [folders, setFolders] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadFolders();
  }, []);

  const loadProfile = async () => {
    const settings = await api.getSettings();
    if (settings) {
      setFactoryName(settings.factory_name || "");
      setLogo(settings.factory_logo || null);

       setOpenPdfAfterExport(
      settings.open_pdf_after_export !== 0
    );
    }
  };

  const loadFolders = async () => {
    try {
      const data = await api.getDbFolders();
      setFolders(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert("New password and confirm password do not match");
      return;
    }

    if (newPassword) {
      const valid = await api.verifyMasterPassword(oldPassword);
      if (!valid) {
        alert("Current password is incorrect");
        return;
      }
    }

    await api.saveSettings(factoryName, logo, newPassword, openPdfAfterExport || null);

    if (onProfileUpdated) onProfileUpdated();

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const switchDatabase = async () => {
    if (
      !window.confirm(
        "Switch to a different factory database?\n\nThe app will restart and load the database you select.",
      )
    )
      return;
    const result = await api.selectExistingDatabase();
    if (result?.error) alert(result.error);
  };

  const moveDatabase = async () => {
    if (
      !window.confirm(
        "Move the current database to a new folder?\n\nThe app will restart afterwards.",
      )
    )
      return;
    const result = await api.moveDatabase();
    if (result?.error) alert(result.error);
  };

  const createNewCompany = async () => {
    const name = window.prompt(
      "Name for the new factory database file (you'll pick the folder next):",
      "factory",
    );
    if (!name) return;
    const result = await api.createNewDatabase({ folder: "pick", fileName: name });
    if (result?.canceled) return;
    if (result?.error) {
      alert(result.error);
      return;
    }
    alert(
      `New database created at:\n${result.path}\n\nThe app now points at it. Fill in factory details from the setup screen if this is a brand-new company.`,
    );
    loadFolders();
  };

  const setBackupDir = async () => {
    const result = await api.setDefaultBackupDir();
    if (!result?.canceled) loadFolders();
  };

  const setRestoreDir = async () => {
    const result = await api.setDefaultRestoreDir();
    if (!result?.canceled) loadFolders();
  };

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-between justify-content-between">
      <h3 className="fw-bold mb-4">
        <i className="bi bi-building me-2"></i>
        Factory Profile
      </h3>
    <div className="me-5">
      <button onClick={onClose} className="btn btn-secondary">Sign Out</button>
    </div>
</div>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-4">Factory Information</h5>

          <div className="mb-4">
            <label className="form-label fw-bold">Factory Name</label>
            <input
              className="form-control"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Factory Logo</label>
            <div
              className="border rounded d-flex justify-content-center align-items-center mb-3"
              style={{ width: "130px", height: "130px", overflow: "hidden" }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Factory Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span className="text-muted">No Logo</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="d-none"
              onChange={handleLogoChange}
            />
            <button className="btn btn-outline-secondary" onClick={() => fileInputRef.current.click()}>
              Change Logo
            </button>
          </div>

          <h5 className="fw-bold mb-1">
  <i className="bi bi-file-earmark-pdf me-2"></i>
  PDF Export Settings
</h5>

<p className="text-muted mb-3">
  Choose whether exported PDF reports should open automatically after export.
</p>

<div className="d-flex justify-content-between align-items-center border rounded p-3 mb-4">
  <div>
    <div className="fw-bold">
      Open PDF automatically after export
    </div>

    <div className="text-muted small">
      The exported PDF will open in your computer's default PDF viewer.
    </div>
  </div>

  <div className="form-check form-switch fs-4 mb-0">
    <input
      className="form-check-input"
      type="checkbox"
      role="switch"
      id="openPdfAfterExport"
      checked={openPdfAfterExport}
      onChange={(e) =>
        setOpenPdfAfterExport(e.target.checked)
      }
    />
  </div>
</div>

          <hr />

          <h5 className="fw-bold mb-4">Change Password</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="text-end mt-4">
            <button className="btn btn-primary px-4" onClick={saveProfile}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-1">
            <i className="bi bi-hdd-stack me-2"></i>
            Database &amp; Storage
          </h5>
          <p className="text-muted mb-4">
            Manage where this factory's data lives, switch between company
            databases, and set default folders for backup and restore.
          </p>

          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label fw-bold">Current database file</label>
              <code className="d-block mb-2" style={{ wordBreak: "break-all" }}>
                {folders?.dbPath || "Loading..."}
              </code>
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-sm btn-outline-secondary" onClick={moveDatabase}>
                  <i className="bi bi-folder-symlink me-1"></i>
                  Move to another folder
                </button>
                <button className="btn btn-sm btn-outline-primary" onClick={switchDatabase}>
                  <i className="bi bi-arrow-left-right me-1"></i>
                  Switch to another company
                </button>
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">New company</label>
              <p className="text-muted small mb-2">
                Create a fresh, empty factory database and switch to it.
              </p>
              <button className="btn btn-sm btn-outline-success" onClick={createNewCompany}>
                <i className="bi bi-plus-circle me-1"></i>
                Create new company database
              </button>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Default backup folder</label>
              <code className="d-block mb-2" style={{ wordBreak: "break-all" }}>
                {folders?.backupDir || "Loading..."}
              </code>
              <button className="btn btn-sm btn-outline-secondary" onClick={setBackupDir}>
                Change
              </button>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">Default restore folder</label>
              <code className="d-block mb-2" style={{ wordBreak: "break-all" }}>
                {folders?.restoreDir || "Loading..."}
              </code>
              <button className="btn btn-sm btn-outline-secondary" onClick={setRestoreDir}>
                Change
              </button>
            </div>
          </div>
        </div>
     </div>

               <div className="card shadow-sm mt-4">
                <div className="card-body p-4">
      <h5 className="fw-bold mb-1">
            <i className="bi bi-hdd-stack me-2"></i>
            Stock Master - Settings
          </h5>
          <p className="text-muted mb-4">
            Manage Stock Items, Multi-Alter-Stock, Multi-Create-Stock & Edit Stock Group & Units
          </p>

          <div className="d-flex gap-2">
          {onMultiAlter && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onMultiAlter}
            >
              Multi Alter Stock
            </button>
          )}

          {onMultiCreate && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onMultiCreate}
            >
              Multi Create Stock
            </button>
          )}

            {onStockGroupUnits && (
            <button type="button" className="btn btn-primary" onClick={onStockGroupUnits}>
              Stock Groups & Units
            </button>
          )}


        </div>

        </div>

    </div>
    </div>
  );
}