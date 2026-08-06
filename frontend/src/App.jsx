import { useEffect, useState } from "react";
import FactorySetup from "./pages/FactorySetup";
import Layout from "./components/Layout";
import api from "./services/api";

function App() {
  const [loading, setLoading] = useState(true);
  const [factorySetupDone, setFactorySetupDone] = useState(false);

  const [selectedDailyReportId, setSelectedDailyReportId] = useState(null);
const [dailyReportMode, setDailyReportMode] = useState("new");

  useEffect(() => {
    checkFactorySetup();
  }, []);

  const checkFactorySetup = async () => {
    try {
      const settings = await api.getSettings();

      if (settings) {
        setFactorySetupDone(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h4>Loading...</h4>
      </div>
    );
  }

  return factorySetupDone ? (
  <Layout />
) : (
  <FactorySetup
    onSetupComplete={() => setFactorySetupDone(true)}
  />
);
}

export default App;
