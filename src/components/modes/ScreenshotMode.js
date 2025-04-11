// src/components/modes/ScreenshotMode.js
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import supabaseService from '../../services/supabaseService';
import geminiService from '../../services/geminiService';

const ScreenshotMode = ({ showNotification, isConfigured, setActiveTab }) => {
  const [screenshotPath, setScreenshotPath] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const analysisRef = useRef(null);
  
  // Configura ouvintes de eventos
  useEffect(() => {
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
      setScreenshotPath(null);
      setAnalysis('');
      setCustomPrompt('');
    });
  }, [screenshotPath]);

  // Função para analisar o screenshot
  const handleAnalyzeScreenshot = async () => {
    if (!screenshotPath) {
      showNotification('Capture um screenshot primeiro (Alt+S)', 'warning');
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
  
  return (
    <>
      {/* Status do screenshot */}
      <div className="screenshot-status">
        {screenshotPath ? (
          <p className="success">Screenshot capturado e pronto para análise</p>
        ) : (
          <p className="title">Pressione Alt+S para capturar um screenshot</p>
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
          {isLoading ? 'Analisando...' : 'Analisar'}
        </button>
      </div>
      
      {/* Área de resultado da análise */}
      <div className="analysis-result" ref={analysisRef}>
        {isLoading ? (
          <div className="loading">Processando análise...</div>
        ) : analysis ? (
          <div className="result-content">
            <ReactMarkdown 
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
    </>
  );
};

export default ScreenshotMode;