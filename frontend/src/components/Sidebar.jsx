import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar({ activeMenu, setActiveMenu, collapsed, setCollapsed, factoryLogo,}) {
  const menuItems = [
    {
      title: "Dashboard",
      icon: "bi-columns-gap",
      key: "dashboard",
      type: "menu",
    },

    {
      title: "Masters",
      type: "heading",
    },

    { title: "Stock Item", icon: "bi-box-seam", key: "stockitemmaster", type: "menu" },
    {
  title: "Stock Adjustment",
  icon: "bi-sliders",
  key: "stockadjustment",
  type: "menu",
},

    {
      title: "Transactions",
      type: "heading",
    },

    {
      title: "Create Daily Report",
      icon: "bi-journal-text",
      key: "dailyreport",
      type: "menu",
    },

    {
  title: "Create Weekly Report",
  icon: "bi-clipboard-check",
  key: "createweeklyreport",
  type: "menu",
},

    {
      title: "Reports",
      type: "heading",
    },

    {
      title: "Stock Report Register",
      icon: "bi-book",
      key: "stocksummary",
      type: "menu",
    },

    {
      title: "Daily Report Register",
      icon: "bi-table",
      key: "dailyreportregister",
      type: "menu",
    },

    {
  title: "System",
  type: "heading",
},
{
  title: "Backup & Restore",
  icon: "bi-database",
  key: "backuprestore",
  type: "menu",
},

  ];



  return (
    <aside
      className="text-white shadow"
      style={{
        width: collapsed ? "70px" : "240px",
        height: "100vh",
        background: "linear-gradient(180deg, #588cfd 0%, #607be4 100%)",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "all 0.3s",
        overflowY: "auto",
      }}
    >
 <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-light border-opacity-10">
  {!collapsed && (
  <button
    type="button"
    className="btn border-0 p-0"
    onClick={() => setActiveMenu("factoryprofile")}
    title="Factory Profile"
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
      <div
        className="rounded-circle border d-flex align-items-center justify-content-center"
        style={{
          width: "42px",
          height: "42px",
          backgroundColor: "rgba(255,255,255,0.15)",
        }}
      >
        <i className="bi bi-gear"></i>
      </div>
    )}
  </button>
)}

  <button
    className="btn btn-outline-light btn-sm"
    onClick={() => setCollapsed(!collapsed)}
    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
  >
    <i
      className={`bi ${
        collapsed ? "bi-list" : "bi-chevron-left"
      } fs-5`}
    ></i>
  </button>
</div>
      <div className="pt-2">
        {menuItems.map((item, index) => {
          if (item.type === "heading") {
            return (
              !collapsed && (
                <div
                  key={index}
                  className="px-3 pt-4 pb-2 text-uppercase text-white-50 fw-bold"
                  style={{ fontSize: "10px", letterSpacing: ".1em" }}
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
              className={`btn border-0 w-100 d-flex align-items-center text-white ${activeMenu === item.key ? "btn-primary" : ""}`}
              style={{
                height: "48px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: collapsed ? "0" : "0 24px 24px 0",
                backgroundColor: activeMenu === item.key ? "#222222" : "transparent",
              }}
            >
              <i className={`bi ${item.icon}`} style={{ fontSize: "18px" }}></i>

              {!collapsed && <span className="ms-3">{item.title}</span>}
            </button>
          );
        })}
      </div>
      
    </aside>
  );
}