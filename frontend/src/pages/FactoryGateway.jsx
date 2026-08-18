import React, { useEffect, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function FactoryGateway({ onSetupComplete }) {
  const [companies, setCompanies] = useState([]);
  const [companyDir, setCompanyDir] = useState("");
  const [defaultCompany, setDefaultCompany] = useState("");
  const [autoOpenDefault, setAutoOpenDefault] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [factoryName, setFactoryName] = useState("");
  const [logo, setLogo] = useState(null);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadGateway();
  }, []);

  const loadGateway = async () => {
    try {
      const [data, state] = await Promise.all([
        api.getCompanies(),
        api.getStartupState(),
      ]);

      setCompanies(data?.companies || []);
      setCompanyDir(data?.directory || "");
      setDefaultCompany(data?.defaultCompanyPath || state?.defaultCompanyPath || "");
      setAutoOpenDefault(Boolean(data?.autoOpenDefaultCompany ?? state?.autoOpenDefaultCompany));

      if (state?.active && !state?.setupComplete) {
        const settings = await api.getSettings();
        if (settings) {
          setFactoryName(settings.factory_name || "");
          setLogo(settings.factory_logo || null);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const chooseCompanyDirectory = async () => {
    const result = await api.chooseCompanyDirectory();
    if (result?.canceled) return;
    if (result?.error) {
      alert(result.error);
      return;
    }

    setCompanyDir(result.directory || "");
    setCompanies(result.companies || []);

    if (defaultCompany && !result.companies?.some((company) => company.path === defaultCompany)) {
      setDefaultCompany("");
    }
  };

  const openCompany = async (company) => {
  if (!company?.path) return;

  const result = await api.openCompany(company.path);

  if (result?.error) {
    alert(result.error);
    return;
  }

  await onSetupComplete?.();
};

  const selectExistingDatabase = async () => {
    const result = await api.selectExistingDatabase();
    if (result?.error) alert(result.error);
  };

  const restoreBackup = async () => {
    const result = await api.restoreCompany();
    if (result?.error) alert(result.error);
  };

  const chooseLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const createCompany = async () => {
    if (!factoryName.trim()) {
      alert("Enter Company Name.");
      return;
    }

    if (!masterPassword || masterPassword !== confirmPassword) {
      alert("Enter and confirm a master password.");
      return;
    }

    setSaving(true);
    try {
      const result = await api.createCompany({
        folder: companyDir,
        fileName: factoryName.trim(),
      });

      if (result?.canceled) return;
      if (result?.error) {
        alert(result.error);
        return;
      }

      await api.saveSettings(factoryName.trim(), logo, masterPassword);
      setShowCreate(false);
      await onSetupComplete?.();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Unable to create the company.");
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (companyPath) => {
    const result = await api.selectDefaultCompany(companyPath);
    if (result?.error) {
      alert(result.error);
      return;
    }
    setDefaultCompany(companyPath);
  };

  const toggleAutoOpen = async (enabled) => {
    if (enabled && !defaultCompany) {
      alert("Select a default company first.");
      return;
    }

    const result = await api.setStartupCompany({
      path: defaultCompany,
      enabled,
    });

    if (result?.error) {
      alert(result.error);
      return;
    }

    setAutoOpenDefault(enabled);
  };

  if (showCreate) {
    return (
      <div
        className="container-fluid d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh", background: "#f8f9fa" }}
      >
        <div className="card shadow-sm" style={{ width: "760px", maxWidth: "95vw" }}>
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">Create New Company</h4>
          </div>

          <div className="card-body p-4">
            <div className="mb-3">
              <label className="form-label fw-bold">Company Name *</label>
              <input
                className="form-control"
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                placeholder="Enter Company Name"
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-bold">Set Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Protect stock masters"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold">Confirm Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-bold">Company Logo</label>
              <div className="d-flex align-items-center gap-3">
                <div
                  className="border rounded d-flex justify-content-center align-items-center"
                  style={{ width: 90, height: 90, overflow: "hidden" }}
                >
                  {logo ? (
                    <img src={logo} alt="Company Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <span className="text-muted">No Logo</span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="d-none"
                    onChange={chooseLogo}
                  />
                  <button className="btn btn-outline-secondary" onClick={() => fileInputRef.current?.click()}>
                    Choose Logo
                  </button>
                </div>
              </div>
            </div>

            <div className="border rounded p-3 bg-light mb-4">
              <div className="fw-bold mb-1">Company Data Directory</div>
              <div className="small text-muted mb-2">The new company database will be created in:</div>
              <code className="d-block mb-3" style={{ wordBreak: "break-all" }}>{companyDir}</code>
              <button className="btn btn-outline-secondary" onClick={chooseCompanyDirectory}>
                <i className="bi bi-folder2-open me-2" />
                Change Company Directory
              </button>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary px-4" onClick={createCompany} disabled={saving}>
                {saving ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ minHeight: "100vh", background: "#76a1fc82" }}>
      <div className="container" style={{ maxWidth: "1050px" }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-1">Factory Gateway</h2>
          <div className="text-muted">Select the company you want to open</div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h5 className="fw-bold mb-1">Company Directory</h5>
                <div className="small text-muted">Only valid Factory Book company databases in this folder are shown below.</div>
                <code className="d-block mt-2" style={{ wordBreak: "break-all" }}>{companyDir}</code>
              </div>
              <button className="btn btn-outline-secondary" onClick={chooseCompanyDirectory}>
                <i className="bi bi-folder2-open me-2" />
                Change Directory
              </button>
            </div>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white">
            <h5 className="fw-bold mb-0">Available Companies</h5>
          </div>
          <div className="card-body p-0">
            {companies.length === 0 ? (
              <div className="p-4 text-center text-muted">
                <div className="fs-1 mb-2">🏭</div>
                <div className="fw-semibold">No companies found in this directory.</div>
                <div className="small">Create a new company or restore a backup.</div>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {companies.map((company) => (
                  <div key={company.path} className="list-group-item p-3">
                    <div className="d-flex align-items-center justify-content-between gap-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="border rounded d-flex align-items-center justify-content-center"
                          style={{ width: 52, height: 52, overflow: "hidden" }}
                        >
                          {company.logo ? (
                            <img src={company.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          ) : (
                            <span style={{ fontSize: 25 }}>🏭</span>
                          )}
                        </div>
                        <div>
                          <div className="fw-bold">{company.name}</div>
                          <div className="small text-muted" style={{ wordBreak: "break-all" }}>{company.path}</div>
                          {defaultCompany === company.path && (
                            <span className="badge text-bg-success mt-1">Default Company</span>
                          )}
                        </div>
                      </div>

                      <div className="d-flex gap-2 flex-wrap justify-content-end">
                        {defaultCompany !== company.path && (
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => setDefault(company.path)}>
                            Set Default
                          </button>
                        )}
                        <button className="btn btn-primary" onClick={() => openCompany(company)}>
                          Open Company
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <button className="btn btn-primary w-100 py-3" onClick={() => setShowCreate(true)}>
              <i className="bi bi-plus-circle me-2" />
              Create New Company
            </button>
          </div>
          <div className="col-md-4">
            <button className="btn btn-outline-danger w-100 py-3" onClick={restoreBackup}>
              <i className="bi bi-database-up me-2" />
              Restore Backup
            </button>
          </div>
          
        </div>

        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">Startup Settings</h5>
            <div className="row align-items-center g-3">
              <div className="col-md-8">
                <div className="fw-semibold">Open default company automatically on startup</div>
                <div className="small text-muted">
                  When enabled, Factory Gateway is skipped when the default company is available.
                </div>
              </div>
              <div className="col-md-4 text-md-end">
                <div className="form-check form-switch d-inline-flex align-items-center gap-2 fs-5">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={autoOpenDefault}
                    onChange={(e) => toggleAutoOpen(e.target.checked)}
                  />
                  <label className="form-check-label fs-6">Enable</label>
                </div>
              </div>
            </div>
            <hr />
            <div className="small">
              <span className="fw-semibold">Default Company: </span>
              {defaultCompany
                ? companies.find((company) => company.path === defaultCompany)?.name || defaultCompany
                : "Not selected"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
