import axios from 'axios';

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';
    
    // Prompts base para cada modo
    this.prompts = {
      screenshot: "Analise a imagem do problema e responda com: 1) Problema identificado (uma frase) 2) Explicação rápida (uma frases curta simples e que eu lendo uma pessoa não note que eu esteja lendo a frase) 3) Código comentado que resolve o problema. Use formatação markdown.",
      text: "Como melhorar [aspecto relevante] em [tecnologia]? Dicas práticas: 1. [Técnica específica com benefício imediato] 2. [Ferramenta/método com impacto direto] 3. [Abordagem avançada com diferencial técnico] Por quê funciona: [Explicação técnica concisa conectando as três dicas]. [Exemplo real de implementação]. [Benefício mensurável para performance/manutenção]."
    };
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
      
      // Buscar a imagem da URL
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      // Converter para Base64
      const base64Image = btoa(
        new Uint8Array(imageResponse.data)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      // Combinar com prompt personalizado se existir
      const finalPrompt = customPrompt ? 
        `${this.prompts.screenshot}\n\nInstruções adicionais: ${customPrompt}` : 
        this.prompts.screenshot;
      
      // Preparar payload para a API Gemini
      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image
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

  async analyzeTextOnly(prompt) {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('Gemini não inicializado');
      }
    }
    
    try {
      console.log('Analisando texto:', prompt);
      
      // Combinar prompt base com o prompt do usuário
      const finalPrompt = `${this.prompts.text}\n\nProblema: ${prompt}`;
      
      // Preparar payload para a API Gemini sem imagem
      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt }
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
      console.error('Erro ao analisar texto com Gemini:', error);
      throw error;
    }
  }
}

const geminiService = new GeminiService();
export default geminiService;