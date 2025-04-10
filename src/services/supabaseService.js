import { createClient } from '@supabase/supabase-js';

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      const supabaseUrl = await window.electron.getConfig('supabaseUrl');
      const supabaseKey = await window.electron.getConfig('supabaseKey');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Credenciais Supabase não configuradas');
        return false;
      }
      
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Supabase:', error);
      return false;
    }
  }

  isInitialized() {
    return this.initialized && this.supabase !== null;
  }

  async uploadScreenshot(filePath) {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('Supabase não inicializado');
      }
    }
    
    try {
      console.log('Iniciando upload de:', filePath);
      
      // Ler o arquivo como buffer usando a API do Electron
      const fileData = await window.electron.readFile(filePath);
      
      // Criar nome único para o arquivo
      const fileName = `screenshot-${Date.now()}.png`;
      
      // Upload para o bucket do Supabase
      const { data, error } = await this.supabase
        .storage
        .from('screenshots')
        .upload(fileName, fileData, {
          contentType: 'image/png',
          upsert: false
        });
      
      if (error) throw error;
      
      // Obter URL pública
      const { data: urlData } = this.supabase
        .storage
        .from('screenshots')
        .getPublicUrl(fileName);
      
      console.log('Upload realizado com sucesso:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do screenshot:', error);
      throw error;
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;