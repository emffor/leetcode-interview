import { useEffect, useState } from "react";
import "./App.css";
import AnalysisPanel from "./components/AnalysisPanel";
import Notification from "./components/Notification";
import SettingsPanel from "./components/SettingsPanel";

function App() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [opacity, setOpacity] = useState(1.0);

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const geminiKey = await window.electron.getConfig("geminiApiKey");
        const supabaseUrl = await window.electron.getConfig("supabaseUrl");
        const supabaseKey = await window.electron.getConfig("supabaseKey");

        setIsConfigured(!!geminiKey && !!supabaseUrl && !!supabaseKey);

        if (!geminiKey || !supabaseUrl || !supabaseKey) {
          showNotification(
            "Configuração incompleta. Acesse a aba Configurações.",
            "warning"
          );
          setActiveTab("settings");
        }
      } catch (error) {
        console.error("Erro ao verificar configuração:", error);
        showNotification("Erro ao carregar configurações", "error");
      }
    };

    checkConfiguration();
  }, []);

  useEffect(() => {
    window.electron.onError((message) => {
      showNotification(message, "error");
    });

    window.electron.onOpacityChange((newOpacity) => {
      setOpacity(newOpacity);
      showNotification(`Opacidade ajustada para ${newOpacity * 100}%`, "info");
    });

    return () => {};
  }, []);

  const showNotification = (message, type = "info") => {
    setNotification({ show: true, message, type });

    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  return (
    <div className="app-container" style={{ opacity }}>
      <div className="drag-bar"></div>

      <div className="tab-bar">
        <button
          className={`tab-button ${activeTab === "analysis" ? "active" : ""}`}
          onClick={() => setActiveTab("analysis")}
        >
          Análise
        </button>
        <button
          className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Configurações
        </button>
      </div>

      <div className="content-area">
        {activeTab === "analysis" && (
          <AnalysisPanel
            isConfigured={isConfigured}
            showNotification={showNotification}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPanel
            showNotification={showNotification}
            setIsConfigured={setIsConfigured}
          />
        )}
      </div>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

export default App;
