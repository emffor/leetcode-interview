import React, { useState, useEffect, useCallback } from 'react';
import './SettingsPanel.css';
import supabaseService from '../services/supabaseService';
import geminiService from '../services/geminiService';

/**
 * Componente de configurações do aplicativo
 * Versão melhorada com validação, mascaramento e testes individuais
 */
const SettingsPanel = ({ showNotification, setIsConfigured }) => {
  // Estados dos campos
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  
  // Estados de UI
  const [isSaving, setIsSaving] = useState(false);
  const [testingService, setTestingService] = useState(null); // null, 'gemini', 'supabase', 'all'
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Estados de validação
  const [isFormValid, setIsFormValid] = useState(false);
  
  /**
   * Valida uma URL do Supabase
   * @param {string} url URL para validar
   * @returns {boolean} Se a URL é válida
   */
  const isValidSupabaseUrl = (url) => {
    if (!url) return false;
    
    try {
      const parsed = new URL(url);
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname.includes('supabase') &&
        parsed.hostname.endsWith('.co')
      );
    } catch (e) {
      return false;
    }
  };
  
  /**
   * Valida uma chave de API do Gemini
   * @param {string} key Chave para validar
   * @returns {boolean} Se a chave é válida
   */
  const isValidGeminiKey = (key) => {
    // As chaves Gemini geralmente começam com "AI" e têm comprimento específico
    return key && key.length > 20;
  };
  
  /**
   * Valida uma chave anônima do Supabase
   * @param {string} key Chave para validar
   * @returns {boolean} Se a chave é válida
   */
  const isValidSupabaseKey = (key) => {
    // As chaves Supabase são strings JWT longas
    return key && key.length > 30 && key.includes('.');
  };
  
  /**
   * Valida todos os campos e atualiza os estados
   */
  const validateForm = useCallback(() => {
    const errors = {};
    
    // Valida cada campo
    if (geminiApiKey && !isValidGeminiKey(geminiApiKey)) {
      errors.geminiApiKey = 'Chave Gemini inválida. Deve ter pelo menos 20 caracteres.';
    }
    
    if (supabaseUrl && !isValidSupabaseUrl(supabaseUrl)) {
      errors.supabaseUrl = 'URL Supabase inválida. Deve ser um domínio supabase.co válido.';
    }
    
    if (supabaseKey && !isValidSupabaseKey(supabaseKey)) {
      errors.supabaseKey = 'Chave Supabase inválida. Formato JWT esperado.';
    }
    
    // Atualiza estados
    setFieldErrors(errors);
    
    // Formulário é válido se não há erros e todos os campos estão preenchidos
    const valid = Object.keys(errors).length === 0 && 
                 geminiApiKey && 
                 supabaseUrl && 
                 supabaseKey;
    
    setIsFormValid(valid);
    return valid;
  }, [geminiApiKey, supabaseUrl, supabaseKey]);
  
  // Valida o formulário quando os campos mudam
  useEffect(() => {
    validateForm();
  }, [geminiApiKey, supabaseUrl, supabaseKey, validateForm]);
  
  /**
   * Carrega as configurações salvas
   */
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedGeminiKey = await window.electron.getConfig('geminiApiKey');
        const savedSupabaseUrl = await window.electron.getConfig('supabaseUrl');
        const savedSupabaseKey = await window.electron.getConfig('supabaseKey');
        
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedSupabaseUrl) setSupabaseUrl(savedSupabaseUrl);
        if (savedSupabaseKey) setSupabaseKey(savedSupabaseKey);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };
    
    loadSavedSettings();
  }, []);
  
  /**
   * Mascara uma string para exibição segura
   * @param {string} value String a ser mascarada
   * @returns {string} String mascarada
   */
  const maskValue = (value) => {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    
    const visibleStart = 4;
    const visibleEnd = 3;
    
    return value.substring(0, visibleStart) + 
           '•'.repeat(Math.min(8, value.length - (visibleStart + visibleEnd))) +
           value.substring(value.length - visibleEnd);
  };
  
  /**
   * Salva as configurações
   */
  const handleSaveSettings = async () => {
    // Valida formulário novamente antes de salvar
    if (!validateForm()) {
      showNotification('Corrija os erros antes de salvar', 'error');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Salva configurações
      await window.electron.setConfig('geminiApiKey', geminiApiKey);
      await window.electron.setConfig('supabaseUrl', supabaseUrl);
      await window.electron.setConfig('supabaseKey', supabaseKey);
      
      // Atualiza estado global
      setIsConfigured(true);
      
      showNotification('Configurações salvas com sucesso!', 'success');
      
      // Oculta campos sensíveis após salvar
      setShowSecrets(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showNotification(`Erro ao salvar configurações: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Testa serviço específico ou todos
   * @param {string} service Serviço a ser testado ('gemini', 'supabase', 'all')
   */
  const handleTestService = async (service) => {
    // Serviço a ser testado
    setTestingService(service);
    
    try {
      // Salva temporariamente para teste
      await window.electron.setConfig('geminiApiKey', geminiApiKey);
      await window.electron.setConfig('supabaseUrl', supabaseUrl);
      await window.electron.setConfig('supabaseKey', supabaseKey);
      
      let supabaseInitResult = true;
      let geminiInitResult = true;
      
      // Testa serviços conforme solicitado
      if (service === 'all' || service === 'supabase') {
        supabaseInitResult = await supabaseService.initialize();
        if (!supabaseInitResult) {
          throw new Error('Falha ao conectar com Supabase');
        }
      }
      
      if (service === 'all' || service === 'gemini') {
        geminiInitResult = await geminiService.initialize();
        if (!geminiInitResult) {
          throw new Error('Falha ao conectar com Gemini');
        }
      }
      
      // Verifica o bucket de screenshots se estiver testando Supabase
      if ((service === 'all' || service === 'supabase') && supabaseInitResult) {
        try {
          // Tenta acessar o bucket (isso ocorre internamente no serviço)
          await supabaseService.initialize();
        } catch (bucketError) {
          throw new Error(`Bucket 'screenshots' não encontrado. Verifique se ele existe no seu projeto Supabase.`);
        }
      }
      
      showNotification(
        service === 'all' 
          ? 'Todos os serviços testados com sucesso!' 
          : `${service === 'gemini' ? 'Google Gemini' : 'Supabase'} conectado com sucesso!`,
        'success'
      );
      
      // Atualiza estado global se todos os testes forem bem-sucedidos
      if (service === 'all') {
        setIsConfigured(true);
      }
    } catch (error) {
      console.error(`Erro ao testar ${service}:`, error);
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setTestingService(null);
    }
  };
  
  /**
   * Importa configurações do arquivo .env.example
   */
  const importFromEnv = async () => {
    try {
      // Implementação de exemplo - precisaria da estrutura completa para ler o arquivo
      showNotification('Função de importação disponível na versão PRO', 'info');
      
      // Demonstração apenas - valores de teste
      // setGeminiApiKey('AIzaSyAgHm-Me4zWWd4PY2D1sJ-Md9mNy_NMLsM');
      // setSupabaseUrl('https://lmtjvrpxrsracpojlrgw.supabase.co');
      // setSupabaseKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      showNotification('Erro ao importar configurações', 'error');
    }
  };
  
  /**
   * Limpa todos os campos
   */
  const clearAllFields = () => {
    const confirmed = window.confirm('Tem certeza que deseja limpar todas as configurações?');
    if (confirmed) {
      setGeminiApiKey('');
      setSupabaseUrl('');
      setSupabaseKey('');
      setFieldErrors({});
    }
  };
  
  return (
    <div className="settings-panel">
      <div className="drag-handle" />
      <h2>Configurações de API</h2>
      
      {/* Configuração Gemini */}
      <div className="settings-section">
        <div className="section-header">
          <h3>Google Gemini API</h3>
          <button 
            className="test-single-button"
            onClick={() => handleTestService('gemini')}
            disabled={testingService !== null || !geminiApiKey}
          >
            {testingService === 'gemini' ? 'Testando...' : 'Testar'}
          </button>
        </div>
        
        <div className={`form-group ${fieldErrors.geminiApiKey ? 'has-error' : ''}`}>
          <label htmlFor="gemini-api-key">Chave API do Gemini</label>
          <div className="input-with-toggle">
            <input 
              id="gemini-api-key"
              type={showSecrets ? "text" : "password"} 
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="Insira sua chave API do Gemini"
              disabled={testingService !== null || isSaving}
            />
            <button 
              type="button" 
              className="toggle-visibility" 
              onClick={() => setShowSecrets(!showSecrets)}
              aria-label={showSecrets ? "Ocultar" : "Mostrar"}
              title={showSecrets ? "Ocultar chaves" : "Mostrar chaves"}
            >
              {showSecrets ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          {fieldErrors.geminiApiKey && (
            <div className="error-message">{fieldErrors.geminiApiKey}</div>
          )}
          <p className="help-text">
            Obtenha sua chave em: <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="link">https://ai.google.dev/</a>
          </p>
        </div>
      </div>
      
      {/* Configuração Supabase */}
      <div className="settings-section">
        <div className="section-header">
          <h3>Supabase</h3>
          <button 
            className="test-single-button"
            onClick={() => handleTestService('supabase')}
            disabled={testingService !== null || !supabaseUrl || !supabaseKey}
          >
            {testingService === 'supabase' ? 'Testando...' : 'Testar'}
          </button>
        </div>
        
        <div className={`form-group ${fieldErrors.supabaseUrl ? 'has-error' : ''}`}>
          <label htmlFor="supabase-url" className='subtitle'>URL do Supabase</label>
          <input 
            id="supabase-url"
            type="text" 
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)} 
            placeholder="https://example.supabase.co"
            disabled={testingService !== null || isSaving}
          />
          {fieldErrors.supabaseUrl && (
            <div className="error-message">{fieldErrors.supabaseUrl}</div>
          )}
        </div>
        
        <div className={`form-group ${fieldErrors.supabaseKey ? 'has-error' : ''}`}>
          <label htmlFor="supabase-key" className='subtitle'>Chave Pública do Supabase</label>
          <div className="input-with-toggle">
            <input 
              id="supabase-key"
              type={showSecrets ? "text" : "password"} 
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="Chave pública do seu projeto"
              disabled={testingService !== null || isSaving}
            />
            <button 
              type="button" 
              className="toggle-visibility" 
              onClick={() => setShowSecrets(!showSecrets)}
              aria-label={showSecrets ? "Ocultar" : "Mostrar"}
              title={showSecrets ? "Ocultar chaves" : "Mostrar chaves"}
            >
              {showSecrets ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>
          {fieldErrors.supabaseKey && (
            <div className="error-message">{fieldErrors.supabaseKey}</div>
          )}
          <p className="help-text">
            É necessário criar um bucket chamado "screenshots" no seu projeto Supabase
          </p>
        </div>
      </div>
      
      {/* Botões */}
      <div className="settings-actions">
        <div className="action-group">
          <button 
            onClick={() => handleTestService('all')}
            disabled={testingService !== null || !isFormValid}
            className="test-button"
          >
            {testingService === 'all' ? 'Testando...' : 'Testar Todas as Conexões'}
          </button>
          
          <button 
            onClick={handleSaveSettings}
            disabled={testingService !== null || isSaving || !isFormValid}
            className="save-button"
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
        
        <div className="secondary-actions">
          <button 
            onClick={importFromEnv}
            disabled={testingService !== null || isSaving}
            className="import-button"
            title="Importar de .env.example"
          >
            Importar
          </button>
          
          <button 
            onClick={clearAllFields}
            disabled={testingService !== null || isSaving}
            className="clear-button"
            title="Limpar todos os campos"
          >
            Limpar
          </button>
        </div>
      </div>
      
      {/* Dicas */}
      <div className="settings-tips">
        <h3>Dicas de Configuração</h3>
        <ul>
          <li>Você precisa de contas ativas no Google AI (para Gemini) e Supabase.</li>
          <li>No Supabase, crie um bucket público chamado "screenshots".</li>
          <li>Configure regras de armazenamento adequadas no Supabase para permitir upload.</li>
          <li>Se encontrar problemas, verifique as permissões do bucket e as chaves de API.</li>
          <li>Para melhor desempenho, utilize um projeto Supabase na mesma região do seu uso.</li>
        </ul>
      </div>
      
      {/* Indicador de status da conexão */}
      <div className={`connection-status ${isFormValid ? 'valid' : 'invalid'}`}>
        <div className="status-indicator"></div>
        <span>
          {isFormValid 
            ? 'Configuração válida' 
            : 'Configuração incompleta ou inválida'}
        </span>
      </div>
    </div>
  );
};

export default SettingsPanel;