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
      console.log('Analisando imagem:', imageUrl);
      
      // Modo teste - retornar resposta simulada
      const respostaSimulada = `# Solução Simulada (Modo Teste)

**Problema**: Soma de dois números

## Explicação:
Este problema pede para encontrar dois números em um array que somados resultem em um valor específico.

## Solução:
\`\`\`javascript
function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return null;
}
\`\`\`

## Complexidade:
- Tempo: O(n)
- Espaço: O(n)`;
      
      return respostaSimulada;
    } catch (error) {
      console.error('Erro ao analisar imagem com Gemini:', error);
      throw error;
    }
  }
}

// Singleton
const geminiService = new GeminiService();
export default geminiService;