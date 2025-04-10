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
      // Lê o arquivo usando a API do Electron
      const fileBuffer = await fetch(`file://${filePath}`)
        .then(res => res.arrayBuffer())
        .then(buffer => new Uint8Array(buffer));
      
      // Gera nome único para o arquivo
      const fileName = `screenshot-${Date.now()}.png`;
      
      // Faz upload para o bucket 'screenshots'
      const { data, error } = await this.supabase
        .storage
        .from('screenshots')
        .upload(fileName, fileBuffer, {
          contentType: 'image/png',
          upsert: false
        });
        
      if (error) {
        throw error;
      }
      
      // Obtém URL pública
      const { data: urlData } = this.supabase
        .storage
        .from('screenshots')
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do screenshot:', error);
      throw error;
    }
  }
}

// Singleton
const supabaseService = new SupabaseService();
export default supabaseService;