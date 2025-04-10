import React, { useState, useEffect } from 'react';
import './App.css';
import AnalysisPanel from './components/AnalysisPanel';
import SettingsPanel from './components/SettingsPanel';
import Notification from './components/Notification';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Verifica se as configurações necessárias existem
  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const geminiKey = await window.electron.getConfig('geminiApiKey');
        const supabaseUrl = await window.electron.getConfig('supabaseUrl');
        const supabaseKey = await window.electron.getConfig('supabaseKey');
        
        setIsConfigured(!!geminiKey && !!supabaseUrl && !!supabaseKey);
        
        if (!geminiKey || !supabaseUrl || !supabaseKey) {
          showNotification('Configuração incompleta. Acesse a aba Configurações.', 'warning');
          setActiveTab('settings');
        }
      } catch (error) {
        console.error('Erro ao verificar configuração:', error);
        showNotification('Erro ao carregar configurações', 'error');
      }
    };
    
    checkConfiguration();
  }, []);
  
  // Configura ouvintes de eventos do Electron
  useEffect(() => {
    // Ouvinte para erros
    window.electron.onError((message) => {
      showNotification(message, 'error');
    });
    
    // Limpa ouvintes ao desmontar
    return () => {
      // Electron não fornece método para remover listeners diretamente
      // A limpeza acontece no processo principal
    };
  }, []);
  
  // Função para exibir notificações
  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    
    // Auto-oculta após 5 segundos
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };
  
  return (
    <div className="app-container">
      {/* Barra de arrasto */}
      <div className="drag-bar"></div>
      
      {/* Barra superior com abas */}
      <div className="tab-bar">
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          Análise
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Configurações
        </button>
      </div>
      
      {/* Conteúdo principal */}
      <div className="content-area">
        {activeTab === 'analysis' && (
          <AnalysisPanel 
            isConfigured={isConfigured}
            showNotification={showNotification}
            setActiveTab={setActiveTab}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsPanel 
            showNotification={showNotification}
            setIsConfigured={setIsConfigured}
          />
        )}
      </div>
      
      {/* Componente de notificação */}
      <Notification 
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}

export default App;