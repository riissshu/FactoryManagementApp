import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function FactorySetup({ onSetupComplete }) {
  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);

  const fileInputRef = useRef(null);
  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setLogo(URL.createObjectURL(file));
    }
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
      await api.saveSettings(factoryName, logo);

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

          <div className="mb-4">
            <label className="form-label fw-bold">
              Factory Logo (Optional)
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

          <div className="text-center">
            <button
              className="btn btn-primary px-5"
              disabled={factoryName.trim() === ""}
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
