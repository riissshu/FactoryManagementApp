import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

export default function FactoryProfile({
  onClose,
  onCloseCompany,
  onProfileUpdated,
  onMultiAlter,
  onMultiCreate,
  onStockGroupUnits,
}) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [openPdfAfterExport, setOpenPdfAfterExport] = useState(true);

  const [folders, setFolders] = useState(null);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [appVersion, setAppVersion] = useState("");

  const fileInputRef = useRef(null);

  // Bootstrap modal states
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageText, setMessageText] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFolders();
    loadAppVersion();

  }, []);


  const loadAppVersion = async () => {

    try {
      const data = await api.getAppVersion();
      setAppVersion(data.version);
    } catch (error) {
      console.error(error);
    }
  }

  const loadProfile = async () => {
    const settings = await api.getSettings();

    if (settings) {
      setFactoryName(settings.factory_name || "");
      setLogo(settings.factory_logo || null);

      setOpenPdfAfterExport(settings.open_pdf_after_export !== 0);
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

  const showMessage = (title, text) => {
    setMessageTitle(title);
    setMessageText(text);
    setShowMessageModal(true);
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
      showMessage(
        "Password Error",
        "New password and confirm password do not match."
      );
      return;
    }

    if (newPassword) {
      const valid = await api.verifyMasterPassword(oldPassword);

      if (!valid) {
        showMessage(
          "Password Error",
          "Current password is incorrect."
        );
        return;
      }
    }

    await api.saveSettings(
      factoryName,
      logo,
      newPassword,
      openPdfAfterExport || null
    );

    if (onProfileUpdated) onProfileUpdated();

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const setBackupDir = async () => {
    const result = await api.setDefaultBackupDir();

    if (!result?.canceled) {
      loadFolders();
    }
  };


  const handleCheckForUpdates = async () => {
  if (checkingForUpdates) return;

  setCheckingForUpdates(true);

  try {
    const result = await api.checkForUpdates();

    if (!result?.success) {
      showMessage(
        "Update Check",
        result?.error || "Unable to check for updates."
      );
    } else if (!result.updateAvailable) {
      showMessage(
        "Update Check",
        "You are using the latest version of FactoryBook."
      );
    }
  } catch (error) {
    console.error("Update check failed:", error);
    showMessage(
      "Update Check",
      "Unable to check for updates. Please check your internet connection and try again."
    );
  } finally {
    setCheckingForUpdates(false);
  }
};

  const handleCloseCompany = async () => {
    setShowConfirmModal(false);

    try {
      const result = await api.closeCompany();

      if (result?.error) {
        showMessage("Unable to Close Company", result.error);
        return;
      }

      if (onCloseCompany) {
        onCloseCompany();
      }
    } catch (error) {
      console.error(error);
      showMessage(
        "Unable to Close Company",
        "Unable to close the current company."
      );
    }
  };

  return (
    <div className="container-fluid">

      {/* Message Modal */}
      {showMessageModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">

              <div className="modal-header">
                <h5 className="modal-title">{messageTitle}</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMessageModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-0">{messageText}</p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowMessageModal(false)}
                >
                  OK
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">

              <div className="modal-header">
                <h5 className="modal-title">Close Company</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-0">
                  Close the current company?
                </p>

                <p className="text-muted small mt-2 mb-0">
                  You will return to Factory Gateway to choose another
                  company.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleCloseCompany}
                >
                  Close Company
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal backdrop */}
      {(showMessageModal || showConfirmModal) && (
        <div className="modal-backdrop fade show"></div>
      )}

      <div className="d-flex align-items-between justify-content-between">

        <h3 className="fw-bold mb-4">
          <i className="bi bi-building me-2"></i>
          Factory Profile
        </h3>

        <div className="">

        <button
          onClick={() => setShowConfirmModal(true)}
          className="btn btn-outline-danger me-2"
        >
          Close Company
        </button>

        <button
            onClick={onClose}
            className="btn btn-outline-secondary me-2"
          >
            Sign Out
          </button>
        </div>

      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">

          <h5 className="fw-bold mb-4">
            Factory Information
          </h5>

          <div className="mb-4">
            <label className="form-label fw-bold">
              Factory Name
            </label>

            <input
              className="form-control"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">
              Factory Logo
            </label>

            <div
              className="border rounded d-flex justify-content-center align-items-center mb-3"
              style={{
                width: "130px",
                height: "130px",
                overflow: "hidden",
              }}
            >
              {logo ? (
                <img
                  src={logo}
                  alt="Factory Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <span className="text-muted">
                  No Logo
                </span>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="d-none"
              onChange={handleLogoChange}
            />

            <button
              className="btn btn-outline-secondary"
              onClick={() => fileInputRef.current.click()}
            >
              Change Logo
            </button>
          </div>

          <h5 className="fw-bold mb-1">
            <i className="bi bi-file-earmark-pdf me-2"></i>
            PDF Export Settings
          </h5>

          <p className="text-muted mb-3">
            Choose whether exported PDF reports should open
            automatically after export.
          </p>

          <div className="d-flex justify-content-between align-items-center border rounded p-3 mb-4">

            <div>
              <div className="fw-bold">
                Open PDF automatically after export
              </div>

              <div className="text-muted small">
                The exported PDF will open in your computer's
                default PDF viewer.
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

          <h5 className="fw-bold mb-4">
            Change Password
          </h5>

          <div className="row g-3">

            <div className="col-md-4">
              <label className="form-label">
                Current Password
              </label>

              <input
                type="password"
                className="form-control"
                value={oldPassword}
                onChange={(e) =>
                  setOldPassword(e.target.value)
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">
                New Password
              </label>

              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">
                Confirm Password
              </label>

              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
              />
            </div>

          </div>

          <div className="text-end mt-4">
            <button
              className="btn btn-outline-primary px-4"
              onClick={saveProfile}
            >
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
            Manage the current company location, company
            directory, startup company, and backup folder.
          </p>

          <div className="row g-4">

            <div className="col-md-6">

              <label className="form-label fw-bold">
                Current database file location
              </label>

              <code
                className="d-block mb-2"
                style={{ wordBreak: "break-all" }}
              >
                {folders?.dbPath || "Loading..."}
              </code>

            </div>

            <div className="col-md-6">

              <label className="form-label fw-bold">
                Company Directory
              </label>

              <code
                className="d-block mb-2"
                style={{ wordBreak: "break-all" }}
              >
                {folders?.companyDir || "Loading..."}
              </code>

              <p className="text-muted small mb-2">
                This is the folder Factory Gateway scans for
                your company databases.
              </p>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={async () => {
                  const result =
                    await api.chooseCompanyDirectory();

                  if (!result?.canceled) {
                    loadFolders();
                  }
                }}
              >
                Change Company Directory
              </button>

            </div>

            <div className="col-md-6">

              <label className="form-label fw-bold">
                Backup Folder
              </label>

              <code
                className="d-block mb-2"
                style={{ wordBreak: "break-all" }}
              >
                {folders?.backupDir || "Loading..."}
              </code>

              <p className="text-muted small mb-2">
                Create Backup saves directly here. Restore
                opens this folder.
              </p>

              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={setBackupDir}
              >
                Change Backup Folder
              </button>

            </div>

            <div className="col-md-6">

              <label className="form-label fw-bold">
                Default Company
              </label>

              <code
                className="d-block mb-2"
                style={{ wordBreak: "break-all" }}
              >
                {folders?.defaultCompany || "Not selected"}
              </code>

              <div className="form-check form-switch">

                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={Boolean(
                    folders?.autoOpenDefaultCompany
                  )}
                  onChange={async (e) => {

                    const result =
                      await api.setStartupCompany({
                        path: folders?.defaultCompany,
                        enabled: e.target.checked,
                      });

                    if (result?.error) {
                      showMessage(
                        "Startup Company",
                        result.error
                      );
                    } else {
                      loadFolders();
                    }
                  }}
                />

                <label className="form-check-label">
                  Open default company automatically on startup
                </label>

              </div>

            </div>

          </div>

        </div>

      </div>

      <div className="card shadow-sm mt-4">
  <div className="card-body p-4">
    <h5 className="fw-bold mb-1">
      <i className="bi bi-arrow-repeat me-2"></i>
      Application Updates
    </h5>

    <p className="text-muted mb-3">
      Check whether a newer version of FactoryBook is available.
    </p>

    <div className="mb-3">
  <div className="fw-bold">Current Version</div>
  <div className="text-muted">
    Version {appVersion || "Loading..."}
  </div>
</div>

    <button
      type="button"
      className="btn btn-outline-primary"
      onClick={handleCheckForUpdates}
      disabled={checkingForUpdates}
    >
      {checkingForUpdates ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          Checking...
        </>
      ) : (
        <>
          <i className="bi bi-arrow-repeat me-2"></i>
          Check for Updates
        </>
      )}
    </button>
  </div>
</div>

      <div className="card shadow-sm mt-4">

        <div className="card-body p-4">

          <h5 className="fw-bold mb-1">
            <i className="bi bi-hdd-stack me-2"></i>
            Stock Master - Settings
          </h5>

          <p className="text-muted mb-4">
            Manage Stock Items, Multi-Alter-Stock,
            Multi-Create-Stock & Edit Stock Group & Units
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
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onStockGroupUnits}
              >
                Stock Groups & Units
              </button>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}