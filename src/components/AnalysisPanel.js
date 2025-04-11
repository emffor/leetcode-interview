// src/components/AnalysisPanel.js
import React, { useState, useEffect, useRef } from 'react';
import './AnalysisPanel.css';
import ScreenshotMode from './modes/ScreenshotMode';
import TextMode from './modes/TextMode';

const AnalysisPanel = ({ isConfigured, showNotification, setActiveTab }) => {
  const [activeMode, setActiveMode] = useState('screenshot');
  
  // Configurar ouvintes de eventos globais
  useEffect(() => {
    if (!isConfigured) return;
    
    // Evento para resetar o contexto (Alt+G)
    window.electron.onResetContext(() => {
      showNotification('Contexto reiniciado com sucesso! Pronto para novo problema.', 'success');
    });
  }, [isConfigured]);
  
  // Renderiza os atalhos de teclado
  const renderShortcuts = () => (
    <div className="shortcuts">
      <p>Atalhos:</p>
      <ul>
        <li className="text"><span className="key">Alt+1</span> - Opa. 30%</li>
        <li className="text"><span className="key">Alt+2</span> - Opa. 60%</li>
        <li className="text"><span className="key">Alt+3</span> - Opa. 100%</li>
        <li className="text"><span className="key">Alt+S</span> - Screenshot</li>
        <li className="text"><span className="key">Alt+Enter</span> - Analisar</li>
        <li className="text"><span className="key">Alt+B</span> - Ocultar/Exibir</li>
        <li className="text"><span className="key">Alt+G</span> - Reiniciar</li>
        <li className="text"><span className="key">Alt+↑↓←→</span> - Mover</li>
      </ul>
    </div>
  );
  
  return (
    <div className="analysis-panel">
      <div className="drag-handle" />
      
      {!isConfigured ? (
        <div className="config-reminder">
          <p>Configure as APIs primeiro para usar o aplicativo.</p>
          <button onClick={() => setActiveTab('settings')}>
            Ir para Configurações
          </button>
        </div>
      ) : (
        <>
          {/* Seletor de modo */}
          <div className="mode-selector">
            <button 
              className={`mode-button ${activeMode === 'screenshot' ? 'active' : ''}`}
              onClick={() => setActiveMode('screenshot')}
            >
              Modo Screenshot
            </button>
            <button 
              className={`mode-button ${activeMode === 'text' ? 'active' : ''}`}
              onClick={() => setActiveMode('text')}
            >
              Modo Texto
            </button>
          </div>
          
          {/* Renderiza o componente de modo ativo */}
          {activeMode === 'screenshot' && (
            <ScreenshotMode 
              showNotification={showNotification}
              isConfigured={isConfigured}
              setActiveTab={setActiveTab}
            />
          )}
          
          {activeMode === 'text' && (
            <TextMode 
              showNotification={showNotification}
              isConfigured={isConfigured}
              setActiveTab={setActiveTab}
            />
          )}
          
          {/* Atalhos de teclado */}
          {renderShortcuts()}
        </>
      )}
    </div>
  );
};

export default AnalysisPanel;