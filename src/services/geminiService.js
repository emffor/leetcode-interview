import axios from 'axios';

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';
  }

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

  isInitialized() {
    return this.initialized && this.apiKey !== null;
  }

  async analyzeImage(imageUrl, customPrompt = '') {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('Gemini não inicializado');
      }
    }
    
    try {
      console.log('Analisando imagem:', imageUrl);
      
      // Construir prompt base
      const basePrompt = 
        "Você é um assistente para entrevistas de programação. Analise esta imagem de código ou problema " +
        "e forneça: 1) Identificação do problema, 2) Explicação detalhada, 3) Solução otimizada em código, " +
        "4) Análise de complexidade. Use markdown para formatação.";
      
      // Combinar com prompt personalizado se existir
      const finalPrompt = customPrompt ? 
        `${basePrompt}\n\nInstruções adicionais: ${customPrompt}` : 
        basePrompt;
      
      // Preparar payload para a API Gemini
      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageUrl
                }
              }
            ]
          }
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 2048,
        }
      };
      
      // Chamar API Gemini
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extrair e retornar o texto da resposta
      if (response.data && 
          response.data.candidates && 
          response.data.candidates[0] && 
          response.data.candidates[0].content &&
          response.data.candidates[0].content.parts) {
        return response.data.candidates[0].content.parts[0].text;
      }
      
      throw new Error('Formato de resposta inesperado da API Gemini');
    } catch (error) {
      console.error('Erro ao analisar imagem com Gemini:', error);
      throw error;
    }
  }
}

const geminiService = new GeminiService();
export default geminiService;