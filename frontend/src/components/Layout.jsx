import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

import Dashboard from "../pages/Dashboard";
import StockItem from "../pages/StockItem";
import DailyReport from "../pages/DailyReport";
import StockReport from "../pages/StockReport";
import DailyReportRegister from "../pages/DailyReportRegister";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(true);

  const [activeMenu, setActiveMenu] = useState("dashboard");

  // Temporary values
  // Later these will come from SQLite
  const factoryName = "ABC Bricks Industries";
  const factoryLogo = null;

  const renderPage = () => {
    switch (activeMenu) {
      case "dashboard":
        return <Dashboard />;

      case "stockitem":
        return <StockItem />;

      case "dailyreport":
        return <DailyReport />;

      case "stockreport":
        return <StockReport />;

      case "dailyreportregister":
        return <DailyReportRegister />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <>       <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        collapsed={collapsed}
      />

      <div
        style={{
          marginLeft: collapsed ? "70px" : "240px",
          transition: "all 0.3s",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Navbar
          factoryName={factoryName}
          factoryLogo={factoryLogo}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        <main className="p-4" style={{
    marginTop: "65px",
  }}>
          {renderPage()}
        </main>
      </div>
          </>
  );
}