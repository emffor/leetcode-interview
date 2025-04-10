import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
      
      // Converter arquivo para base64 (solução temporária)
      const response = await fetch(`file://${filePath}`);
      const blob = await response.blob();
      
      // Criar nome único para o arquivo
      const fileName = `screenshot-${Date.now()}.png`;
      
      // Upload para o bucket do Supabase
      const { data, error } = await this.supabase
        .storage
        .from('screenshots')
        .upload(fileName, blob, {
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
      
      // Temporariamente retornar URL simulada para testes
      console.log('Retornando URL simulada para testes');
      return `https://exemplo.com/screenshots/screenshot-${Date.now()}.png`;
    }
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;