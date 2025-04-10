import axios from 'axios';

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';
  }

  /**
   * Inicializa o serviço com a chave API
   * @returns {boolean} Status da inicialização
   */
  async initialize() {
    try {
      this.apiKey = await window.electron.getConfig('geminiApiKey');
      
      if (!this.apiKey) {
        console.error('API Key do Gemini não configurada');
        return false;
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar Gemini:', error);
      return false;
    }
  }

  /**
   * Verifica se o serviço está inicializado
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized && this.apiKey !== null;
  }

  /**
   * Analisa uma imagem e gera uma resposta para resolver o problema
   * @param {string} imageUrl URL da imagem no Supabase
   * @param {string} customPrompt Prompt personalizado opcional
   * @returns {Promise<string>} Resposta da IA
   */
  async analyzeImage(imageUrl, customPrompt = '') {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('Gemini não inicializado');
      }
    }
    
    try {
      // Constrói o prompt para a IA
      const defaultPrompt = 
        'Analise esta imagem de um problema de programação. ' +
        'Identifique o tipo de problema (algoritmo, estrutura de dados, etc), ' +
        'explique o desafio e forneça uma solução otimizada com código. ' +
        'Detalhe a complexidade de tempo e espaço.';
      
      const prompt = customPrompt || defaultPrompt;
      
      // Prepara payload para a API
      const payload = {
        contents: [
          {
            parts: [
              {
                text: prompt
              },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: imageUrl
                }
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 4096
        }
      };
      
      // Faz requisição para a API
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extrai e retorna o texto da resposta
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Erro ao analisar imagem com Gemini:', error);
      throw error;
    }
  }
}

// Singleton
const geminiService = new GeminiService();
export default geminiService;