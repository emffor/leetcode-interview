import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  /**
   * Inicializa o cliente Supabase com as credenciais armazenadas
   * @returns {boolean} Status da inicialização
   */
  async initialize() {
    try {
      // Obtém credenciais armazenadas
      const supabaseUrl = await window.electron.getConfig('supabaseUrl');
      const supabaseKey = await window.electron.getConfig('supabaseKey');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Credenciais Supabase não configuradas');
        return false;
      }
      
      // Cria cliente Supabase
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
      return false;
    }
  }

  /**
   * Verifica se o serviço está inicializado
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized && this.supabase !== null;
  }

  /**
   * Faz upload de um arquivo de screenshot para o bucket do Supabase
   * @param {string} filePath Caminho do arquivo local
   * @returns {Promise<string>} URL pública do arquivo
   */
  async uploadScreenshot(filePath) {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('Supabase não inicializado');
      }
    }
    
    try {
      console.log('Iniciando upload de:', filePath);
      
      // Simula upload bem-sucedido para testes
      // Em produção, implementar upload real para Supabase
      console.log('Upload simulado com sucesso');
      
      // Usar URL base64 direta da imagem para testes
      const fileName = `screenshot-${Date.now()}.png`;
      const fakeUrl = `https://exemplo.com/screenshots/${fileName}`;
      
      return fakeUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do screenshot:', error);
      throw error;
    }
  }
}

// Singleton
const supabaseService = new SupabaseService();
export default supabaseService;