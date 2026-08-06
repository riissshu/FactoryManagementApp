import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Navbar({
  factoryName = "Factory Stock Maintenance",
  factoryLogo = null,
  collapsed,
  setCollapsed,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <nav
      className="navbar navbar-light bg-white shadow-sm px-3"
      style={{
        transition: "all 0.3s",
        height: "65px",
        position: "fixed",
        top: 0,
        right: 0,
        left: collapsed ? "70px" : "240px",
        zIndex: 1000,
      }}
    >
      {" "}
      <div className="container-fluid">
        <div className="d-flex align-items-center w-100">
          {/* Left Side */}

          <div className="d-flex align-items-center flex-grow-1">
            <button
              className="btn btn-outline-primary me-3"
              onClick={() => setCollapsed(!collapsed)}
            >
              <i className="bi bi-list fs-5"></i>
            </button>

            <h4 className="mb-0 fw-bold text-primary">{factoryName}</h4>
          </div>

          {/* Right Side */}

          <div className="d-flex align-items-center ms-auto">
            {factoryLogo && (
              <img
                src={factoryLogo}
                alt="Factory Logo"
                className="rounded me-3 border"
                style={{
                  width: "45px",
                  height: "45px",
                  objectFit: "contain",
                  backgroundColor: "#fff",
                }}
              />
            )}

            <div className="text-end">
              <div className="fw-bold">{formattedDate}</div>

              <small className="text-muted">{formattedTime}</small>
            </div>
          </div>
        </div>
      </div>{" "}
    </nav>
  );
}
