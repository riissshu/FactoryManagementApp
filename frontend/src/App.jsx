import { useEffect, useState } from "react";
import FactoryGateway from "./pages/FactoryGateway";
import Layout from "./components/Layout";
import api from "./services/api";

function App() {
  const [loading, setLoading] = useState(true);
  const [factorySetupDone, setFactorySetupDone] = useState(false);
  const [showGateway, setShowGateway] = useState(false);

  useEffect(() => {
    checkStartup();
  }, []);

  const checkStartup = async () => {
    try {
      const state = await api.getStartupState();
      setFactorySetupDone(Boolean(state?.active && state?.setupComplete));
    } catch (error) {
      console.error(error);
      setFactorySetupDone(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <h4>...</h4>
      </div>
    );
  }

  if (showGateway) {
  return (
    <FactoryGateway
      onSetupComplete={async () => {
        setShowGateway(false);
        await checkStartup();
      }}
    />
  );
}

return factorySetupDone ? (
  <Layout
    onCloseCompany={() => {
      setShowGateway(true);
      setFactorySetupDone(false);
    }}
  />
) : (
  <FactoryGateway onSetupComplete={checkStartup} />
);
}

export default App;
