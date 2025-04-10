// src/components/modes/TextMode.js
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import geminiService from '../../services/geminiService';

const TextMode = ({ showNotification, isConfigured, setActiveTab }) => {
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const analysisRef = useRef(null);
  
  // Configura ouvintes de eventos
  useEffect(() => {
    // Evento para analisar texto (Alt+Enter)
    const handleKeyEvent = () => {
      if (customPrompt) {
        handleTextAnalysis();
      } else {
        showNotification('Digite um problema para análise', 'warning');
      }
    };
    
    window.electron.onAnalyzeScreenshot(handleKeyEvent);
    
    // Evento para resetar o contexto (Alt+G)
    window.electron.onResetContext(() => {
      setAnalysis('');
      setCustomPrompt('');
      showNotification('Contexto reiniciado', 'info');
    });
    
    return () => {
      // Cleanup seria ideal aqui, mas a API do electron não fornece método direto
    };
  }, [customPrompt, showNotification]);

  // Função para analisar texto
  const handleTextAnalysis = async () => {
    if (!customPrompt || customPrompt.trim() === '') {
      showNotification('Digite um problema para análise', 'warning');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Análise direta com Gemini usando apenas texto
      const result = await geminiService.analyzeTextOnly(customPrompt);
      
      // Atualiza a UI
      setAnalysis(result);
      
      // Scroll para o início da análise
      if (analysisRef.current) {
        analysisRef.current.scrollTop = 0;
      }
      
      showNotification('Análise concluída!', 'success');
    } catch (error) {
      console.error('Erro ao processar problema:', error);
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      {/* Área de prompt */}
      <div className="custom-prompt">
        <textarea 
          placeholder="Cole ou digite o problema de programação aqui para análise"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={5}
        />
      </div>
      
      {/* Botão de análise */}
      <div className="analyze-button">
        <button 
          onClick={handleTextAnalysis} 
          disabled={isLoading || !customPrompt}
        >
          {isLoading ? 'Analisando...' : 'Analisar'}
        </button>
      </div>
      
      {/* Área de resultado da análise */}
      <div className="analysis-result" ref={analysisRef}>
        {isLoading ? (
          <div className="loading">Processando análise...</div>
        ) : analysis ? (
          <div className="result-content markdown-content">
            <ReactMarkdown 
              rehypePlugins={[rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="no-analysis">
            Digite um problema e clique em Analisar para ver a solução
          </div>
        )}
      </div>
    </>
  );
};

export default TextMode;