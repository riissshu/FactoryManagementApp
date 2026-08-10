import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Navbar({
  factoryName = "Factory Stock Maintenance",
  factoryLogo = null,
  collapsed,
  setActiveMenu,
}) {
  const [openProfile, setOpenProfile] = useState(false);

  return (
    <nav
      className="navbar navbar-light bg-white shadow-sm px-3"
      style={{
        height: "65px",
        position: "fixed",
        top: 0,
        right: 0,
        left: collapsed ? "70px" : "240px",
        zIndex: 1000,
        transition: "all .3s",
      }}
    >
      <div className="container-fluid">
        <div className="d-flex align-items-center w-100">
          <div className="flex-grow-1">
            <h4 className="mb-0 fw-bold text-primary">{factoryName}</h4>
          </div>

          <div className="position-relative">
            <button
              className="btn border-0 d-flex align-items-center"
              onClick={() => setOpenProfile(!openProfile)}
            >
              {factoryLogo ? (
                <img
                  src={factoryLogo}
                  alt="Factory Logo"
                  className="rounded-circle border"
                  style={{
                    width: "42px",
                    height: "42px",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <i className="bi bi-building fs-3"></i>
              )}

              <i className="bi bi-chevron-down ms-2"></i>
            </button>

            {openProfile && (
              <div
                className="dropdown-menu show shadow"
                style={{
                  right: 0,
                  left: "auto",
                  minWidth: "220px",
                }}
              >
                <div className="px-3 py-2">
                  <strong>{factoryName}</strong>
                </div>

                <div className="dropdown-divider"></div>

                <button
                  className="dropdown-item fw-bold"
                  onClick={() => {
                    setActiveMenu("factoryprofile");

                    setOpenProfile(false);
                  }}
                >
                  <i className="bi bi-building me-2"></i>
                   Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
