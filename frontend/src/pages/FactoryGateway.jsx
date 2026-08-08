import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function FactoryGateway({ onSetupComplete }) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef(null);
  useEffect(() => {
    loadSettings();
  }, []);

  const restoreBackup = async () => {

  if(
    !window.confirm(
      "Restore existing factory backup?\n\nCurrent setup will be replaced."
    )
  ){
    return;
  }


  const result = await api.restoreFirstInstallBackup();


  if(result?.restored){
    return;
  }

};

 const handleLogoChange = (e) => {

    const file = e.target.files[0];

    if (!file) return;


    const reader = new FileReader();


    reader.onload = () => {
        setLogo(reader.result);
    };


    reader.readAsDataURL(file);

};

  const loadSettings = async () => {
    try {
      const settings = await api.getSettings();

      if (settings) {
        setFactoryName(settings.factory_name);

        if (settings.factory_logo) {
          setLogo(settings.factory_logo);
        }
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

      console.log("Factory Name :", factoryName);
      console.log("Factory Logo :", logo);
    } catch (error) {
      console.error(error);
      alert("Unable to Create New factory.");
    }
  };

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center"
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
      }}
    >
      <div
        className="card"
      
      >
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
            <div className="col-md-6"><label className="form-label fw-bold">Set password <span className="text-danger">*</span></label><input type="password" className="form-control" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} placeholder="Protect stock masters" /></div>
            <div className="col-md-6"><label className="form-label fw-bold">Confirm password</label><input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">
              Factory Logo
            </label>

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
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
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
    <i className="bi bi-database-up me-2"></i>
    Restore Existing Factory
  </h5>


  <p className="text-muted mb-3">
    Already have a Factory Book backup?
    Restore it and continue with your existing data.
  </p>


  <ul className="small text-muted">

    <li>Factory Name</li>
    <li>Factory Logo</li>
    <li>Stock Masters</li>
    <li>Daily Reports</li>
    <li>All Transactions</li>

  </ul>


  <button
    className="btn btn-outline-danger"
    onClick={restoreBackup}
  >

    <i className="bi bi-upload me-2"></i>

    Restore Backup

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
