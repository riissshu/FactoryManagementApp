import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Sidebar({ activeMenu, setActiveMenu, collapsed,   setCollapsed }) {
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
    { title: "Multi Alter Stock", icon: "bi-pencil-square", key: "multialterstock", type: "menu" },

    { title: "Multi Create Stock", icon: "bi-pencil-square", key: "multicreatestock", type: "menu" },

    {
  title: "Stock Groups & Units",
  icon: "bi-diagram-3",
  key: "stockgroupsunits",
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
      title: "Reports",
      type: "heading",
    },

    {
      title: "Stock Report Register",
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
     <div
    className="d-flex align-items-center justify-content-between p-3 border-bottom border-light border-opacity-10"
>
    {!collapsed && (
        <h5 className="mb-0 fw-bold"></h5>
    )}

    <button
        className="btn btn-outline-light btn-sm"
        onClick={() => setCollapsed(!collapsed)}
    >
        <i className="bi bi-list fs-5"></i>
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
