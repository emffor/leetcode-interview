import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import geminiService from "../services/geminiService";
import supabaseService from "../services/supabaseService";
import "./AnalysisPanel.css";

/**
 * Componente principal de análise
 * Versão otimizada com controle de estado, feedback refinado e histórico
 */
const AnalysisPanel = ({ isConfigured, showNotification, setActiveTab }) => {
  // Estados principais
  const [screenshotPath, setScreenshotPath] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  // Estados de UI melhorados
  const [loadingState, setLoadingState] = useState("idle"); // idle, uploading, analyzing, error
  const [progress, setProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState(null);

  // Histórico de análises
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Estado para controlar exibição dos atalhos
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Refs
  const analysisRef = useRef(null);
  const promptRef = useRef(null);

  // Tempos de inicio e progresso
  const operationStartTime = useRef(0);
  const progressInterval = useRef(null);

  /**
   * Gerencia o progresso simulado durante carregamento
   * @param {string} stage Estágio atual (upload/análise)
   */
  const startProgressSimulation = useCallback((stage) => {
    // Limpa timer anterior
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    // Define ponto inicial baseado no estágio
    let startValue = stage === "upload" ? 0 : 50;
    let endValue = stage === "upload" ? 45 : 95;
    setProgress(startValue);

    // Simula progresso gradual
    progressInterval.current = setInterval(() => {
      setProgress((current) => {
        // Desacelera conforme se aproxima do final
        const increment = Math.max(0.5, (endValue - current) * 0.05);
        const next = Math.min(endValue, current + increment);
        return next;
      });
    }, 300);

    // Armazena tempo inicial para métricas
    operationStartTime.current = performance.now();
  }, []);

  /**
   * Finaliza a simulação de progresso
   * @param {boolean} success Se a operação foi bem-sucedida
   */
  const stopProgressSimulation = useCallback((success) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // Finaliza a 100% se sucesso ou mantém onde parou se erro
    if (success) {
      setProgress(100);
      // Reinicia após breve exibição do 100%
      setTimeout(() => {
        setProgress(0);
        setLoadingState("idle");
      }, 800);
    }
  }, []);

  // Configura ouvintes de eventos
  useEffect(() => {
    if (!isConfigured) return;

    // Evento quando um screenshot é capturado
    const handleScreenshot = (path) => {
      setScreenshotPath(path);
      setErrorDetails(null);
      showNotification("Screenshot capturado com sucesso!", "success");
    };

    // Evento para analisar o screenshot
    const handleAnalyzeCommand = () => {
      if (screenshotPath) {
        handleAnalyzeScreenshot();
      } else {
        showNotification("Capture um screenshot primeiro (Alt+S)", "warning");
      }
    };

    // Evento para resetar o contexto
    const handleResetContext = () => {
      // Limpa todos os estados
      setScreenshotPath(null);
      setAnalysis("");
      setErrorDetails(null);

      // Mantém o prompt personalizado por conveniência
      // Para limpar completo, descomente a linha abaixo
      // setCustomPrompt('');

      setLoadingState("idle");
      setProgress(0);
      stopProgressSimulation(false);

      showNotification(
        "Contexto reiniciado com sucesso! Pronto para novo problema.",
        "success"
      );
    };

    // Registra ouvintes
    window.electron.onScreenshotCaptured(handleScreenshot);
    window.electron.onAnalyzeScreenshot(handleAnalyzeCommand);
    window.electron.onResetContext(handleResetContext);

    // Limpa ouvintes ao desmontar
    return () => {
      // Electron não fornece método para remover event listeners,
      // mas os listeners são limpos quando o componente é desmontado
      // devido à natureza do IPC em Electron e ao design do preload.js

      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isConfigured, screenshotPath, stopProgressSimulation, showNotification]);

  // Atualiza título da janela para refletir estado
  useEffect(() => {
    const titles = {
      idle: "Interview Helper",
      uploading: "Enviando Screenshot...",
      analyzing: "Analisando Problema...",
      error: "Erro - Interview Helper",
    };

    document.title = titles[loadingState] || titles.idle;
  }, [loadingState]);

  /**
   * Salva uma análise no histórico
   * @param {string} content Conteúdo da análise
   */
  const saveToHistory = useCallback(
    (content) => {
      setAnalysisHistory((prev) => {
        // Limita o histórico a 5 itens
        const newHistory = [
          {
            id: Date.now(),
            content,
            timestamp: new Date().toLocaleTimeString(),
            prompt: customPrompt || "Padrão",
          },
          ...prev,
        ].slice(0, 5);

        return newHistory;
      });
    },
    [customPrompt]
  );

  /**
   * Carrega uma análise do histórico
   * @param {Object} historyItem Item do histórico
   */
  const loadFromHistory = useCallback((historyItem) => {
    setAnalysis(historyItem.content);

    // Scroll para o início da análise
    if (analysisRef.current) {
      analysisRef.current.scrollTop = 0;
    }

    setShowHistory(false);
  }, []);

  /**
   * Copia o texto da análise para a área de transferência
   */
  const copyToClipboard = useCallback(() => {
    if (!analysis) return;

    navigator.clipboard
      .writeText(analysis)
      .then(() => {
        showNotification(
          "Análise copiada para a área de transferência!",
          "success"
        );
      })
      .catch((error) => {
        showNotification("Erro ao copiar análise", "error");
        console.error("Erro ao copiar:", error);
      });
  }, [analysis, showNotification]);

  /**
   * Função principal para analisar o screenshot
   */
  const handleAnalyzeScreenshot = async () => {
    if (!screenshotPath) {
      showNotification("Capture um screenshot primeiro (Alt+S)", "warning");
      return;
    }

    if (!isConfigured) {
      showNotification("Configure as APIs primeiro", "error");
      setActiveTab("settings");
      return;
    }

    // Limpa estados anteriores
    setErrorDetails(null);
    setLoadingState("uploading");
    startProgressSimulation("upload");

    try {
      // Upload para o Supabase
      const imageUrl = await supabaseService.uploadScreenshot(screenshotPath);

      // Atualiza estado para análise
      setLoadingState("analyzing");
      startProgressSimulation("analyze");

      // Análise com Gemini
      const result = await geminiService.analyzeImage(imageUrl, customPrompt);

      // Finaliza progresso
      stopProgressSimulation(true);

      // Atualiza a UI
      setAnalysis(result);

      // Salva no histórico
      saveToHistory(result);

      // Scroll para o início da análise
      if (analysisRef.current) {
        analysisRef.current.scrollTop = 0;
      }

      // Calcula e mostra tempo total
      const totalTime = (
        (performance.now() - operationStartTime.current) /
        1000
      ).toFixed(1);
      showNotification(`Análise concluída em ${totalTime}s!`, "success");
    } catch (error) {
      setLoadingState("error");
      stopProgressSimulation(false);

      // Extrai código de erro se disponível
      const errorMessage = error.message || "Erro desconhecido";
      const errorCode = errorMessage.split(":")[0] || "ERRO";
      const errorDescription =
        errorMessage.split(":").slice(1).join(":").trim() || errorMessage;

      setErrorDetails({
        code: errorCode,
        message: errorDescription,
      });

      console.error("Erro ao processar screenshot:", error);
      showNotification(`Erro: ${errorDescription}`, "error");
    }
  };

  /**
   * Renderiza a barra de progresso
   */
  const renderProgressBar = () => {
    if (loadingState === "idle" || progress === 0) return null;

    const stageText = {
      uploading: "Enviando screenshot...",
      analyzing: "Analisando problema...",
      error: "Erro no processamento",
    };

    return (
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className={`progress-fill ${
              loadingState === "error" ? "error" : ""
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="progress-text">
          {stageText[loadingState]} ({Math.round(progress)}%)
        </div>
      </div>
    );
  };

  /**
   * Renderiza a área de histórico
   */
  const renderHistory = () => {
    if (!showHistory || analysisHistory.length === 0) return null;

    return (
      <div className="history-overlay">
        <div className="history-panel">
          <div className="history-header">
            <h3>Histórico de Análises</h3>
            <button
              className="close-button"
              onClick={() => setShowHistory(false)}
            >
              ×
            </button>
          </div>
          <div className="history-items">
            {analysisHistory.map((item) => (
              <div
                key={item.id}
                className="history-item"
                onClick={() => loadFromHistory(item)}
              >
                <div className="history-time">{item.timestamp}</div>
                <div className="history-preview">
                  {item.content.slice(0, 80)}...
                </div>
                <div className="history-prompt">
                  <span className="prompt-label">Prompt:</span>{" "}
                  {item.prompt.slice(0, 30)}
                  {item.prompt.length > 30 ? "..." : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renderiza os atalhos de teclado
   */
  const renderShortcuts = () => (
    <div className="shortcuts">
      <p>Atalhos:</p>
      <ul>
        <li className="text">
          <span className="key">Alt+1</span> - Opa. 30%
        </li>
        <li className="text">
          <span className="key">Alt+2</span> - Opa. 60%
        </li>
        <li className="text">
          <span className="key">Alt+3</span> - Opa. 100%
        </li>
        <li className="text">
          <span className="key">Alt+S</span> - Screenshot
        </li>
        <li className="text">
          <span className="key">Alt+Enter</span> - Analisar
        </li>
        <li className="text">
          <span className="key">Alt+Q</span> - Ocultar/Exibir
        </li>
        <li className="text">
          <span className="key">Alt+G</span> - Reiniciar
        </li>
        <li className="text">
          <span className="key">Alt+↑↓←→</span> - Mover
        </li>
      </ul>
    </div>
  );

  return (
    <div className="analysis-panel">
      <div className="drag-handle" />

      {!isConfigured ? (
        <div className="config-reminder">
          <p>Configure as APIs primeiro para usar o aplicativo.</p>
          <button onClick={() => setActiveTab("settings")}>
            Ir para Configurações
          </button>
        </div>
      ) : (
        <>
          {/* Status do screenshot */}
          <div className="screenshot-status">
            {screenshotPath ? (
              <p className="success">
                Screenshot capturado e pronto para análise
              </p>
            ) : (
              <p className="title">
                Pressione Alt+S para capturar um screenshot
              </p>
            )}
            {renderProgressBar()}
          </div>

          {/* Campo de prompt personalizado */}
          <div className="custom-prompt">
            <textarea
              ref={promptRef}
              placeholder="Prompt personalizado para a IA (opcional)"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={loadingState !== "idle"}
              rows={3}
            />
          </div>

          {/* Botões de ação */}
          <div className="action-buttons">
            <button
              className="analyze-button"
              onClick={handleAnalyzeScreenshot}
              disabled={loadingState !== "idle" || !screenshotPath}
            >
              {loadingState === "idle" ? "Analisar" : "Processando..."}
            </button>

            <div className="secondary-buttons">
              {analysisHistory.length > 0 && (
                <button
                  className="history-button"
                  onClick={() => setShowHistory(true)}
                  disabled={loadingState !== "idle"}
                >
                  Histórico
                </button>
              )}

              {analysis && (
                <button
                  className="copy-button"
                  onClick={copyToClipboard}
                  disabled={loadingState !== "idle"}
                >
                  Copiar
                </button>
              )}

              <button
                className="history-button"
                onClick={() => setShowShortcuts(!showShortcuts)}
                disabled={loadingState !== "idle"}
                title={showShortcuts ? "Ocultar atalhos" : "Mostrar atalhos"}
              >
                {showShortcuts ? "Ocultar" : "Atalhos"}
              </button>
            </div>
          </div>

          {/* Área de resultado da análise */}
          <div className="analysis-result" ref={analysisRef}>
            {loadingState === "uploading" || loadingState === "analyzing" ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">
                  {loadingState === "uploading"
                    ? "Enviando screenshot..."
                    : "Analisando problema..."}
                </div>
              </div>
            ) : errorDetails ? (
              <div className="error-message">
                <div className="error-code">{errorDetails.code}</div>
                <div className="error-description">{errorDetails.message}</div>
                <button
                  className="retry-button"
                  onClick={handleAnalyzeScreenshot}
                >
                  Tentar Novamente
                </button>
              </div>
            ) : analysis ? (
              <div className="result-content">
                <ReactMarkdown
                  components={{
                    div: ({ node, ...props }) => (
                      <div className="markdown-content" {...props} />
                    ),
                  }}
                  rehypePlugins={[rehypeHighlight]}
                  remarkPlugins={[remarkGfm]}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="no-analysis">
                Capture um screenshot e clique em Analisar para ver os
                resultados
              </div>
            )}
          </div>

          {/* Atalhos de teclado - Agora condicionais */}
          {showShortcuts && renderShortcuts()}

          {/* Overlay de histórico */}
          {renderHistory()}
        </>
      )}
    </div>
  );
};

export default AnalysisPanel;
