import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import supabaseService from '../services/supabaseService';
import geminiService from '../services/geminiService';
import './AnalysisPanel.css';

const AnalysisPanel = ({ isConfigured, showNotification, setActiveTab }) => {
  const [screenshotPath, setScreenshotPath] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const analysisRef = useRef(null);
  
  // Configura ouvintes de eventos
  useEffect(() => {
    if (!isConfigured) return;
    
    // Evento quando um screenshot é capturado
    window.electron.onScreenshotCaptured((path) => {
      setScreenshotPath(path);
      showNotification('Screenshot capturado com sucesso!', 'success');
    });
    
    // Evento para analisar o screenshot (Alt+Enter)
    window.electron.onAnalyzeScreenshot(() => {
      if (screenshotPath) {
        handleAnalyzeScreenshot();
      } else {
        showNotification('Capture um screenshot primeiro (Alt+S)', 'warning');
      }
    });
    
    // Evento para resetar o contexto (Alt+G)
    window.electron.onResetContext(() => {
      // Limpa todos os estados
      setScreenshotPath(null);
      setAnalysis('');
      setCustomPrompt('');
      
      showNotification('Contexto reiniciado com sucesso! Pronto para novo problema.', 'success');
    });
  }, [isConfigured, screenshotPath]);

  // Função para analisar o screenshot
  const handleAnalyzeScreenshot = async () => {
    if (!screenshotPath) {
      showNotification('Capture um screenshot primeiro (Alt+S)', 'warning');
      return;
    }
    
    if (!isConfigured) {
      showNotification('Configure as APIs primeiro', 'error');
      setActiveTab('settings');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload para o Supabase
      const imageUrl = await supabaseService.uploadScreenshot(screenshotPath);
      
      // Análise com Gemini
      const result = await geminiService.analyzeImage(imageUrl, customPrompt);
      
      // Atualiza a UI
      setAnalysis(result);
      
      // Scroll para o início da análise
      if (analysisRef.current) {
        analysisRef.current.scrollTop = 0;
      }
      
      showNotification('Análise concluída!', 'success');
    } catch (error) {
      console.error('Erro ao processar screenshot:', error);
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Renderiza os atalhos de teclado
  const renderShortcuts = () => (
    <div className="shortcuts">
      <p>Atalhos:</p>
      <ul>
        <li className="text"><span className="key">Alt+123</span> - Opa. 30/60/100%</li>
        <li className="text"><span className="key">Alt+S</span> - Screenshot</li>
        <li className="text"><span className="key">Alt+Enter</span> - Anal. screenshot</li>
        <li className="text"><span className="key">Alt+B</span> - Ocultar/Exibir</li>
        <li className="text"><span className="key">Alt+G</span> - Reiniciar contexto</li>
        <li className="text"><span className="key">Alt+↑</span> - Mover cima</li>
        <li className="text"><span className="key">Alt+↓</span> - Mover baixo</li>
        <li className="text"><span className="key">Alt+←</span> - Mover esquerda</li>
        <li className="text"><span className="key">Alt+→</span> - Mover direita</li>
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
          {/* Status do screenshot */}
          <div className="screenshot-status">
            {screenshotPath ? (
              <p className="success">Screenshot capturado e pronto para análise</p>
            ) : (
              <p className='title'>Pressione Alt+S para capturar um screenshot</p>
            )}
          </div>
          
          {/* Campo de prompt personalizado */}
          <div className="custom-prompt">
            <textarea 
              placeholder="Prompt personalizado para a IA (opcional)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>
          
          {/* Botão de análise */}
          <div className="analyze-button">
            <button 
              onClick={handleAnalyzeScreenshot} 
              disabled={isLoading || !screenshotPath}
            >
              {isLoading ? 'Analisando...' : 'Analisar Screenshot'}
            </button>
          </div>
          
          {/* Área de resultado da análise */}
          <div className="analysis-result" ref={analysisRef}>
            {isLoading ? (
              <div className="loading">Processando análise...</div>
            ) : analysis ? (
              <div className="result-content">
                <ReactMarkdown 
                  components={{
                    div: ({node, ...props}) => <div className="markdown-content" {...props} />
                  }}
                  rehypePlugins={[rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="no-analysis">
                Capture um screenshot e clique em Analisar para ver os resultados
              </div>
            )}
          </div>
          
          {/* Atalhos de teclado */}
          {renderShortcuts()}
        </>
      )}
    </div>
  );
};

export default AnalysisPanel;