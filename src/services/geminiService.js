import axios from "axios";

class GeminiService {
  constructor() {
    this.apiKey = null;
    this.initialized = false;
    this.baseUrl =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent";
    this.responseCache = new Map();
    this.maxRetries = 2;
    this.retryDelay = 1000;
  }

  async initialize() {
    try {
      this.apiKey = await window.electron.getConfig("geminiApiKey");

      if (!this.apiKey) {
        console.error("API Key do Gemini não configurada");
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Erro ao inicializar Gemini:", error);
      return false;
    }
  }

  isInitialized() {
    return this.initialized && this.apiKey !== null;
  }

  bufferToBase64(buffer) {
    return btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );
  }

  async analyzeImage(imageUrl, customPrompt = "") {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error("ERR_NOT_INITIALIZED: Gemini não inicializado");
      }
    }

    const cacheKey = `${imageUrl}_${customPrompt.slice(0, 50)}`;

    if (this.responseCache.has(cacheKey)) {
      console.log("Usando resposta em cache para:", imageUrl);
      return this.responseCache.get(cacheKey);
    }

    try {
      console.log("Analisando imagem:", imageUrl);

      let imageResponse;
      let retries = 0;

      while (retries <= this.maxRetries) {
        try {
          imageResponse = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
          });
          break;
        } catch (err) {
          retries++;
          if (retries > this.maxRetries) throw err;

          console.warn(
            `Falha ao buscar imagem, tentativa ${retries}/${this.maxRetries}`
          );
          await new Promise((r) => setTimeout(r, this.retryDelay));
          this.retryDelay *= 1.5;
        }
      }

      if (imageResponse.data.byteLength > 20 * 1024 * 1024) {
        throw new Error(
          "ERR_IMAGE_TOO_LARGE: Imagem muito grande para processamento"
        );
      }

      const base64Image = this.bufferToBase64(imageResponse.data);

      const basePrompt = `Você está ajudando um candidato durante uma entrevista técnica remota. A imagem enviada contém um problema de programação (ex: LeetCode, HackerRank).
      Responda com:
      1. **Resumo do problema**: Uma frase clara que identifique do que se trata.
      2. **Explicação sutil e natural**: Um comentário curto e simples, como se estivesse sendo lido espontaneamente (sem parecer decorado).
      3. **Solução em código**: Código funcional, bem comentado, e formatado em markdown. Evite explicações extras fora do código.
      Seja direto e natural. Nunca diga que é uma IA.`;

      const finalPrompt = customPrompt
        ? `${basePrompt}\n\nInstruções adicionais: ${customPrompt}`
        : basePrompt;

      const payload = {
        contents: [
          {
            parts: [
              { text: finalPrompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generation_config: {
          temperature: 0.2,
          max_output_tokens: 2048,
        },
      };

      let apiResponse;
      retries = 0;
      this.retryDelay = 1000;

      while (retries <= this.maxRetries) {
        try {
          apiResponse = await axios.post(
            `${this.baseUrl}?key=${this.apiKey}`,
            payload,
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 60000,
            }
          );
          break;
        } catch (err) {
          retries++;
          if (retries > this.maxRetries) throw err;

          console.warn(
            `Falha na API Gemini, tentativa ${retries}/${this.maxRetries}`
          );
          await new Promise((r) => setTimeout(r, this.retryDelay));
          this.retryDelay *= 1.5;
        }
      }

      const responseText =
        apiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error(
          "ERR_INVALID_RESPONSE: Formato de resposta inesperado da API Gemini"
        );
      }

      if (this.responseCache.size >= 10) {
        const oldestKey = this.responseCache.keys().next().value;
        this.responseCache.delete(oldestKey);
      }
      this.responseCache.set(cacheKey, responseText);

      return responseText;
    } catch (error) {
      let errorCode = "ERR_UNKNOWN";

      if (error.response) {
        const status = error.response.status;
        if (status === 400) errorCode = "ERR_BAD_REQUEST";
        else if (status === 401 || status === 403)
          errorCode = "ERR_AUTH_FAILED";
        else if (status === 429) errorCode = "ERR_RATE_LIMIT";
        else if (status >= 500) errorCode = "ERR_SERVER";
      } else if (error.code === "ECONNABORTED") {
        errorCode = "ERR_TIMEOUT";
      } else if (!navigator.onLine) {
        errorCode = "ERR_OFFLINE";
      }

      const errorMessage = error.message || "Erro desconhecido";
      console.error(`${errorCode}: Erro ao analisar imagem com Gemini:`, error);

      throw new Error(`${errorCode}: ${errorMessage}`);
    }
  }

  clearCache() {
    this.responseCache.clear();
    console.log("Cache do Gemini limpo");
  }
}

const geminiService = new GeminiService();
export default geminiService;
