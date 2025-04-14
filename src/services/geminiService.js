import axios from 'axios';

/**
 * Gerencia a integração com a API Google Gemini
 * Versão melhorada com tratamento de erros, cache e otimização
 */
class GeminiService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';
    // Cache simples para respostas recentes (URL -> resposta)
    this.responseCache = new Map();
    // Configuração de retry
    this.maxRetries = 2;
    this.retryDelay = 1000; // 1 segundo
  }

  /**
   * Inicializa o serviço carregando a chave da API
   * @returns {Promise<boolean>} Resultado da inicialização
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
   * @returns {boolean} Estado de inicialização
   */
  isInitialized() {
    return this.initialized && this.apiKey !== null;
  }

  /**
   * Converte dados de imagem para Base64 de forma otimizada
   * @param {ArrayBuffer} buffer Buffer de dados da imagem
   * @returns {string} String Base64
   */
  bufferToBase64(buffer) {
    // Método mais eficiente usando Uint8Array e conversão de caracteres
    return btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
  }

  /**
   * Análise de imagem com retry automático e cache
   * @param {string} imageUrl URL da imagem para análise
   * @param {string} customPrompt Prompt personalizado adicional
   * @returns {Promise<string>} Texto da análise
   */
  async analyzeImage(imageUrl, customPrompt = '') {
    // Inicializa se necessário
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error('ERR_NOT_INITIALIZED: Gemini não inicializado');
      }
    }
    
    // Gera uma chave de cache única considerando a URL e o prompt
    const cacheKey = `${imageUrl}_${customPrompt.slice(0, 50)}`;
    
    // Verifica cache
    if (this.responseCache.has(cacheKey)) {
      console.log('Usando resposta em cache para:', imageUrl);
      return this.responseCache.get(cacheKey);
    }
    
    try {
      console.log('Analisando imagem:', imageUrl);
      
      // Busca imagem com timeout de 30 segundos e retry
      let imageResponse;
      let retries = 0;
      
      while (retries <= this.maxRetries) {
        try {
          imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000, // 30 segundos
          });
          break; // Sucesso, sai do loop
        } catch (err) {
          retries++;
          if (retries > this.maxRetries) throw err;
          
          console.warn(`Falha ao buscar imagem, tentativa ${retries}/${this.maxRetries}`);
          await new Promise(r => setTimeout(r, this.retryDelay));
          // Aumenta o delay exponencialmente a cada retry
          this.retryDelay *= 1.5;
        }
      }
      
      // Verifica tamanho da imagem (limite aprox. 20MB)
      if (imageResponse.data.byteLength > 20 * 1024 * 1024) {
        throw new Error('ERR_IMAGE_TOO_LARGE: Imagem muito grande para processamento');
      }
      
      // Converter para Base64 usando método otimizado
      const base64Image = this.bufferToBase64(imageResponse.data);
      
      // Construir prompt base
      const basePrompt = `
      Você está ajudando um candidato durante uma entrevista técnica remota. A imagem enviada contém um problema de programação (ex: LeetCode, HackerRank).

      Responda com:

      1. **Resumo do problema**: Uma frase clara que identifique do que se trata.
      2. **Explicação sutil e natural**: Um comentário curto e simples, como se estivesse sendo lido espontaneamente (sem parecer decorado).
      3. **Solução em código**: Código funcional, bem comentado, e formatado em markdown. Evite explicações extras fora do código.

      Seja direto e natural. Nunca diga que é uma IA.
      `;
      
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
      
      // Chamar API Gemini com timeout e retry
      let apiResponse;
      retries = 0;
      this.retryDelay = 1000; // Reset do delay
      
      while (retries <= this.maxRetries) {
        try {
          apiResponse = await axios.post(
            `${this.baseUrl}?key=${this.apiKey}`,
            payload,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 60000, // 60 segundos
            }
          );
          break; // Sucesso, sai do loop
        } catch (err) {
          retries++;
          if (retries > this.maxRetries) throw err;
          
          console.warn(`Falha na API Gemini, tentativa ${retries}/${this.maxRetries}`);
          await new Promise(r => setTimeout(r, this.retryDelay));
          this.retryDelay *= 1.5;
        }
      }
      
      // Extrai a resposta de forma segura usando optional chaining
      const responseText = apiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) {
        throw new Error('ERR_INVALID_RESPONSE: Formato de resposta inesperado da API Gemini');
      }
      
      // Salva no cache (limita a 10 itens)
      if (this.responseCache.size >= 10) {
        const oldestKey = this.responseCache.keys().next().value;
        this.responseCache.delete(oldestKey);
      }
      this.responseCache.set(cacheKey, responseText);
      
      return responseText;
    } catch (error) {
      // Categoriza erros para melhor tratamento na UI
      let errorCode = 'ERR_UNKNOWN';
      
      if (error.response) {
        // Erro HTTP da API (mapeia códigos comuns)
        const status = error.response.status;
        if (status === 400) errorCode = 'ERR_BAD_REQUEST';
        else if (status === 401 || status === 403) errorCode = 'ERR_AUTH_FAILED';
        else if (status === 429) errorCode = 'ERR_RATE_LIMIT';
        else if (status >= 500) errorCode = 'ERR_SERVER';
      } else if (error.code === 'ECONNABORTED') {
        errorCode = 'ERR_TIMEOUT';
      } else if (!navigator.onLine) {
        errorCode = 'ERR_OFFLINE';
      }
      
      const errorMessage = error.message || 'Erro desconhecido';
      console.error(`${errorCode}: Erro ao analisar imagem com Gemini:`, error);
      
      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  /**
   * Limpa o cache de respostas
   */
  clearCache() {
    this.responseCache.clear();
    console.log('Cache do Gemini limpo');
  }
}

const geminiService = new GeminiService();
export default geminiService;