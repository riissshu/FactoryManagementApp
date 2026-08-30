import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Dashboard from "../pages/Dashboard";
import BoMDashboard from "../pages/BoMDashboard";
import CreateBOM from "../pages/CreateBoM";
import ViewBoM from "../pages/ViewBoM";
import CreateStockItem from "../pages/CreateStockItem";
import StockItemList from "../pages/StockItemList";
import CreateDailyReport from "../pages/CreateDailyReport";
import StockReport from "../pages/StockReport";
import DetailedStockReport from "../pages/DetailedStockReport";
import ViewEditStock from "../pages/View&EditStock";
import StockSummary from "../pages/StockSummary";
import DailyReportRegister from "../pages/DailyReportRegister";
import PurchaseRegister from "../pages/PurchaseRegister";
import DispatchRegister from "../pages/DispatchRegister";
import ProductionRegister from "../pages/ProductionRegister";
import WeeklyReportRegister from "../pages/WeeklyReportRegister";
import Clipboard from "../pages/Clipboard";
import StockAdjustment from "../pages/StockAdjustments";
import StockAdjustmentRegister from "../pages/StockAdjustmentRegister";
import MultiAlterStock from "../pages/MultiAlterStock";
import MultiCreateStock from "../pages/MultiCreateStock";
import FactoryProfile from "../pages/FactoryProfile";
import BackupRestore from "../pages/BackupRestore";
import StockGroupsUnits from "../pages/StockUnitAndGroups";
import ViewDailyreport from "../pages/ViewDailyReport";
import MasterLock from "../components/MasterLock";
import EditDailyReport from "../pages/EditDailyReport";
import CreateWeeklyReport from "../pages/CreateWeeklyReport";
import StockItemMaster from "../pages/StockItemMaster";
import api from "../services/api";

export default function Layout({ onCloseCompany }) {
  const [collapsed, setCollapsed] = useState(false);

  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [selectedStockItemId, setSelectedStockItemId] = useState(null);
  const [selectedBomId, setSelectedBomId] = useState(null);

  const [selectedDailyReportId, setSelectedDailyReportId] = useState(null);
  const [dailyReportMode, setDailyReportMode] = useState("new");
  const [selectedEditDailyReportId, setSelectedEditDailyReportId] =
    useState(null);

  const [editDailyReportMasterPassword, setEditDailyReportMasterPassword] =
    useState("");
  const [factoryProfilePage, setFactoryProfilePage] = useState("profile");
  const [showMasterLock, setShowMasterLock] = useState(false);

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

      case "bom":
        return (
          <BoMDashboard
            onClose={() => setActiveMenu("dashboard")}
            onCreate={() => setActiveMenu("createBom")}
            onViewBom={(id) => {
              setSelectedBomId(id);
              setActiveMenu("viewBom");
            }}
          />
        );

      case "createBom":
        return <CreateBOM onClose={() => setActiveMenu("bom")} />;

      case "viewBom":
        return (
          <ViewBoM
            bomId={selectedBomId}
            onClose={() => {
              setSelectedBomId(null);
              setActiveMenu("bom");
            }}
          />
        );

      case "clipboard":
        return <Clipboard navigate={selectMenu} />;

      case "purchaseregister":
        return <PurchaseRegister onClose={() => setActiveMenu("dashboard")} />;

      case "productionregister":
        return (
          <ProductionRegister onClose={() => setActiveMenu("dashboard")} />
        );

      case "dispatchregister":
        return <DispatchRegister onClose={() => setActiveMenu("dashboard")} />;

      case "viewdailyreport":
        return (
          <ViewDailyreport
            reportId={selectedDailyReportId}
            mode={dailyReportMode}
            onEdit={(id, masterPassword = "") => {
              setSelectedEditDailyReportId(id);
              setEditDailyReportMasterPassword(masterPassword);
              setActiveMenu("editdailyreport");
            }}
            onClose={() => setActiveMenu("dailyreportregister")}
          />
        );

      case "editdailyreport":
        return (
          <EditDailyReport
            reportId={selectedEditDailyReportId}
            masterPassword={editDailyReportMasterPassword}
            onClose={() => {
              setSelectedEditDailyReportId(null);
              setEditDailyReportMasterPassword("");
              setActiveMenu("viewdailyreport");
            }}
            onSaved={() => {
              setSelectedEditDailyReportId(null);
              setEditDailyReportMasterPassword("");
              setActiveMenu("viewdailyreport");
            }}
          />
        );

      case "stockadjustment":
        return (
          <StockAdjustment
            onClose={() => setActiveMenu("dashboard")}
            onViewAdjustments={() => setActiveMenu("stockadjustmentregister")}
          />
        );

      case "stockadjustmentregister":
        return (
          <StockAdjustmentRegister
            onClose={() => setActiveMenu("stockadjustment")}
          />
        );

      case "createstockitem":
        return (
          <CreateStockItem onClose={() => setActiveMenu("stockitemmaster")} />
        );

      case "stockitemlist":
        return (
          <StockItemList
            onClose={() => setActiveMenu("stockitemmaster")}
            onEditItem={(id) => {
              setSelectedStockItemId(id);
              setActiveMenu("vieweditstock");
            }}
          />
        );

      case "vieweditstock":
        return (
          <ViewEditStock
            itemId={selectedStockItemId}
            onClose={() => {
              setSelectedStockItemId(null);
              setActiveMenu("stockitemlist");
            }}
          />
        );

      case "factoryprofile":
        return (
          <FactoryProfile
            onProfileUpdated={reloadSettings}
            onMultiAlter={() => setActiveMenu("multialterstock")}
            onMultiCreate={() => setActiveMenu("multicreatestock")}
            onStockGroupUnits={() => setActiveMenu("stockgroupsunits")}
            onClose={() => setActiveMenu("dashboard")}
            onCloseCompany={onCloseCompany}
          />
        );

      case "multialterstock":
        return (
          <MultiAlterStock onClose={() => setActiveMenu("factoryprofile")} />
        );

      case "multicreatestock":
        return (
          <MultiCreateStock onClose={() => setActiveMenu("factoryprofile")} />
        );

      case "stockgroupsunits":
        return (
          <StockGroupsUnits onClose={() => setActiveMenu("factoryprofile")} />
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
          <StockReport
            onClose={() => setActiveMenu("stocksummary")}
            onStockItemClick={(id) => {
              setSelectedStockItemId(id);
              setActiveMenu("detailedstockreport");
            }}
          />
        );

      case "detailedstockreport":
        return (
          <DetailedStockReport
            stockItemId={selectedStockItemId}
            onClose={() => {
              setSelectedStockItemId(null);
              setActiveMenu("stockreport");
            }}
          />
        );

      case "stocksummary":
        return (
          <StockSummary onStockReport={() => setActiveMenu("stockreport")} />
        );

      case "createweeklyreport":
        return <CreateWeeklyReport />;

      case "weeklyreportregister":
        return (
          <WeeklyReportRegister onClose={() => setActiveMenu("dashboard")} />
        );

      case "stockitemmaster":
        return (
          <StockItemMaster
            onAddNew={() => setActiveMenu("createstockitem")}
            onViewStock={() => setActiveMenu("stockitemlist")}
          />
        );

      case "backuprestore":
        return <BackupRestore />;

      case "dailyreportregister":
        return (
          <DailyReportRegister
            openDailyReport={(id) => {
              setSelectedDailyReportId(id);
              setDailyReportMode("view");
              setActiveMenu("viewdailyreport");
            }}
          />
        );

      default:
        return <Dashboard />;
    }
  };

  const selectMenu = (key) => {
    if (key === "factoryprofile") {
      setShowMasterLock(true);
      return;
    }

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
        factoryLogo={settings.factory_logo}
      />
      <div
        style={{
          marginLeft: collapsed ? "70px" : "240px",
          transition: "all 0.3s",
          minHeight: "100vh",
          backgroundColor: "#f8f9fa",
        }}
      >
        <Navbar factoryName={settings.factory_name} collapsed={collapsed} />

        <main
          className="p-4"
          style={{
            marginTop: "65px",
          }}
        >
          {renderPage()}
        </main>

        {showMasterLock && (
          <MasterLock
            onClose={() => {
              setShowMasterLock(false);
            }}
            onUnlock={() => {
              setShowMasterLock(false);
              setActiveMenu("factoryprofile");
            }}
          />
        )}
      </div>
    </>
  );
}
