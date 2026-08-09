import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Dashboard from "../pages/Dashboard";
import StockItem from "../pages/CreateStockItem";
import StockItemList from "../pages/StockItemList";
import CreateDailyReport from "../pages/CreateDailyReport";
import StockReport from "../pages/StockReport";
import StockSummary from "../pages/StockSummary";
import DailyReportRegister from "../pages/DailyReportRegister";
import MultiAlterStock from "../pages/MultiAlterStock";
import MultiCreateStock from "../pages/MultiCreateStock";
import FactoryProfile from "../pages/FactoryProfile";
import BackupRestore from "../pages/BackupRestore";
import StockGroupsUnits from "../pages/StockUnitAndGroups";
import ViewEditDailyreport from "../pages/ViewEditDailyReport"
import api from "../services/api";


export default function Layout() {
  const [collapsed, setCollapsed] = useState(true);

  const [activeMenu, setActiveMenu] = useState("dashboard");

  const [selectedDailyReportId, setSelectedDailyReportId] = useState(null);
  const [dailyReportMode, setDailyReportMode] = useState("new");

  const [settings, setSettings] = useState({
    factory_name: "Factory Book",
    factory_logo: null,
  });
  useEffect(() => {
    api.getSettings().then((value) => value && setSettings(value));
  }, []);

  const reloadSettings = async () => {
    const value = await api.getSettings();
    if (value) {
      setSettings(value);
    }
  };

  const renderPage = () => {
    switch (activeMenu) {
      case "dashboard":
        return <Dashboard navigate={selectMenu} />;

        case "vieweditdailyreport":
          return <ViewEditDailyreport      reportId={selectedDailyReportId}
            mode={dailyReportMode}
            onClose={() => setActiveMenu("dailyreportregister")} />

      case "stockitem":
        return (
          <StockItem
            
            onMultiCreate={() => setActiveMenu("multicreatestock")}
          />
        );

      case "stockitemlist":
        return (
          <StockItemList
            onAddNew={() => setActiveMenu("stockitem")}
            onMultiAlter={() => setActiveMenu("multialterstock")}
          />
        );
      case "multialterstock":
        return (
        
            <MultiAlterStock  onClose={() => setActiveMenu("stockitemlist")}/>
         
        );

        case "multicreatestock":
  return (
   
      <MultiCreateStock onClose={() => setActiveMenu("stockitemlist")} />
   
  );

  case "stockgroupsunits":
  return (
   
      <StockGroupsUnits />
    
  );

      case "dailyreport":
        return (
          <CreateDailyReport
            reportId={selectedDailyReportId}
            mode={dailyReportMode}
            onClose={() => setActiveMenu("dashboard")}
            
          />
        );

      case "stockreport":
        return (
          <StockReport onViewSummary={() => setActiveMenu("stocksummary")} />
        );

      case "stocksummary":
        return (
          <StockSummary onBack={() => setActiveMenu("stockreport")} />
        );

      case "factoryprofile":
        return <FactoryProfile onProfileUpdated={reloadSettings} />;

      case "backuprestore":
        return <BackupRestore />;

      case "dailyreportregister":
        return (
          <DailyReportRegister
            openDailyReport={(id) => {
              setSelectedDailyReportId(id);
              setDailyReportMode("view");
              setActiveMenu("vieweditdailyreport");
            }}
          />
        );

      default:
        return <Dashboard />;
    }
  };

  const selectMenu = (key) => {
    if (key === "dailyreport") {
      setSelectedDailyReportId(null);
      setDailyReportMode("new");
    }
    setActiveMenu(key);
  };

  return (
    <>
      {" "}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={selectMenu}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
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
          factoryName={settings.factory_name}
          factoryLogo={settings.factory_logo}
          collapsed={collapsed}
          setActiveMenu={setActiveMenu}
        />

        <main
          className="p-4"
          style={{
            marginTop: "65px",
          }}
        >
          {renderPage()}
        </main>
      </div>
    </>
  );
}