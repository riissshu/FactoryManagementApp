import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Navbar({
  factoryName = "Factory Stock Maintenance",
  collapsed,
}) {
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
        </div>
      </div>
    </nav>
  );
}