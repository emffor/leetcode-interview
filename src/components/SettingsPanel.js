import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';
import supabaseService from '../services/supabaseService';
import geminiService from '../services/geminiService';

const SettingsPanel = ({ showNotification, setIsConfigured }) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Carrega as configurações salvas
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
  
  // Salva as configurações
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Valida entradas
      if (!geminiApiKey || !supabaseUrl || !supabaseKey) {
        showNotification('Todos os campos são obrigatórios', 'error');
        return;
      }
      
      // Salva configurações
      await window.electron.setConfig('geminiApiKey', geminiApiKey);
      await window.electron.setConfig('supabaseUrl', supabaseUrl);
      await window.electron.setConfig('supabaseKey', supabaseKey);
      
      // Atualiza estado global
      setIsConfigured(true);
      
      showNotification('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      showNotification('Erro ao salvar configurações', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Testa as conexões com as APIs
  const handleTestConnections = async () => {
    setIsTesting(true);
    
    try {
      // Salva temporariamente para teste
      await window.electron.setConfig('geminiApiKey', geminiApiKey);
      await window.electron.setConfig('supabaseUrl', supabaseUrl);
      await window.electron.setConfig('supabaseKey', supabaseKey);
      
      // Testa inicialização do Supabase
      const supabaseInitResult = await supabaseService.initialize();
      if (!supabaseInitResult) {
        throw new Error('Falha ao conectar com Supabase');
      }
      
      // Testa inicialização do Gemini
      const geminiInitResult = await geminiService.initialize();
      if (!geminiInitResult) {
        throw new Error('Falha ao conectar com Gemini');
      }
      
      showNotification('Conexões testadas com sucesso!', 'success');
      
      // Atualiza estado global
      setIsConfigured(true);
    } catch (error) {
      console.error('Erro ao testar conexões:', error);
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="settings-panel">
      <div className="drag-handle" />
      <h2>Configurações de API</h2>
      
      {/* Configuração Gemini */}
      <div className="settings-section">
        <h3>Google Gemini API</h3>
        <div className="form-group">
          <label htmlFor="gemini-api-key">Chave API do Gemini</label>
          <input 
            id="gemini-api-key"
            type="password" 
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Insira sua chave API do Gemini"
          />
          <p className="help-text">
            Obtenha sua chave em: <span className="link">https://ai.google.dev/</span>
          </p>
        </div>
      </div>
      
      {/* Configuração Supabase */}
      <div className="settings-section">
        <h3>Supabase</h3>
        <div className="form-group">
          <label htmlFor="supabase-url">URL do Supabase</label>
          <input 
            id="supabase-url"
            type="text" 
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://example.supabase.co"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="supabase-key">Chave Pública do Supabase</label>
          <input 
            id="supabase-key"
            type="password" 
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="Chave pública do seu projeto"
          />
          <p className="help-text">
            É necessário criar um bucket chamado "screenshots" no seu projeto Supabase
          </p>
        </div>
      </div>
      
      {/* Botões */}
      <div className="settings-actions">
        <button 
          onClick={handleTestConnections}
          disabled={isTesting || isSaving}
          className="test-button"
        >
          {isTesting ? 'Testando...' : 'Testar Conexões'}
        </button>
        
        <button 
          onClick={handleSaveSettings}
          disabled={isSaving || isTesting}
          className="save-button"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
      
      {/* Dicas */}
      <div className="settings-tips">
        <h3>Dicas de Configuração</h3>
        <ul>
          <li>Você precisa de contas ativas no Google AI (para Gemini) e Supabase.</li>
          <li>No Supabase, crie um bucket público chamado "screenshots".</li>
          <li>Configure regras de armazenamento adequadas no Supabase para permitir upload.</li>
          <li>Se encontrar problemas, verifique as permissões do bucket e as chaves de API.</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;