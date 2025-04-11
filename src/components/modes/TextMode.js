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
    window.electron.onAnalyzeScreenshot(() => {
      if (customPrompt) {
        handleTextAnalysis();
      } else {
        showNotification('Digite um prompt para análise', 'warning');
      }
    });
    
    // Evento para resetar o contexto (Alt+G)
    window.electron.onResetContext(() => {
      setAnalysis('');
      setCustomPrompt('');
    });
  }, [customPrompt]);

  // Função para analisar texto
  const handleTextAnalysis = async () => {
    if (!customPrompt || customPrompt.trim() === '') {
      showNotification('Digite um prompt para análise', 'warning');
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
      console.error('Erro ao processar prompt de texto:', error);
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
          placeholder="Digite seu problema ou questão aqui para análise direta"
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
            Digite um prompt e clique em Analisar para ver os resultados
          </div>
        )}
      </div>
    </>
  );
};

export default TextMode;