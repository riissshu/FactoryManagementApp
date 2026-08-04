import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  collapsed,
}) {
  const menuItems = [
    {
      title: "Dashboard",
      icon: "bi-speedometer2",
      key: "dashboard",
      type: "menu",
    },

    {
      title: "Masters",
      type: "heading",
    },

    {
      title: "Stock Item",
      icon: "bi-box-seam",
      key: "stockitem",
      type: "menu",
    },

    {
      title: "Transactions",
      type: "heading",
    },

    {
      title: "Daily Report",
      icon: "bi-journal-text",
      key: "dailyreport",
      type: "menu",
    },

    {
      title: "Reports",
      type: "heading",
    },

    {
      title: "Stock Report",
      icon: "bi-bar-chart",
      key: "stockreport",
      type: "menu",
    },

    {
      title: "Daily Report Register",
      icon: "bi-table",
      key: "dailyreportregister",
      type: "menu",
    },
  ];

  return (
    <div
      className="text-white"
      style={{
        width: collapsed ? "70px" : "240px",
        height: "100vh",
        backgroundColor: "#1f2937",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "all 0.3s",
        overflowY: "auto",
      }}
    >

      <div className="border-bottom text-center py-3">

        {!collapsed ? (
          <h5 className="mb-0 fw-bold">
            Factory Stock
          </h5>
        ) : (
          <i className="bi bi-box-seam fs-4"></i>
        )}

      </div>

      <div className="pt-2">
                {menuItems.map((item, index) => {

          if (item.type === "heading") {
            return (
              !collapsed && (
                <div
                  key={index}
                  className="px-3 pt-3 pb-2 text-uppercase text-secondary fw-bold"
                  style={{ fontSize: "12px" }}
                >
                  {item.title}
                </div>
              )
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => setActiveMenu(item.key)}
              className={`btn border-0 rounded-0 w-100 d-flex align-items-center ${
                activeMenu === item.key
                  ? "btn-primary"
                  : "btn-dark"
              }`}
              style={{
                height: "48px",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <i
                className={`bi ${item.icon}`}
                style={{ fontSize: "18px" }}
              ></i>

              {!collapsed && (
                <span className="ms-3">
                  {item.title}
                </span>
              )}
            </button>
          );

        })}

              </div>

    </div>
  );
}