import { createClient } from "@supabase/supabase-js";

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
    this.recentUploads = [];
    this.maxRecentUploads = 5;
    this.bucketName = "screenshots";
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.metrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalUploadTime: 0,
    };
  }

  async initialize() {
    try {
      const supabaseUrl = await window.electron.getConfig("supabaseUrl");
      const supabaseKey = await window.electron.getConfig("supabaseKey");

      if (!supabaseUrl || !supabaseKey) {
        console.error("Credenciais Supabase não configuradas");
        return false;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        realtime: { enabled: false },
      });

      const { data, error } = await this.supabase.storage.getBucket(
        this.bucketName
      );

      if (error && error.message.includes("does not exist")) {
        console.warn(
          `Bucket "${this.bucketName}" não encontrado. Verifique sua configuração do Supabase.`
        );
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Erro ao inicializar Supabase:", error);
      return false;
    }
  }

  isInitialized() {
    return this.initialized && this.supabase !== null;
  }

  validateFile(fileData) {
    const isPNG =
      fileData.length > 8 &&
      fileData[0] === 0x89 &&
      fileData[1] === 0x50 &&
      fileData[2] === 0x4e &&
      fileData[3] === 0x47;

    if (!isPNG) {
      return {
        valid: false,
        error: "Formato de arquivo inválido. Esperado PNG.",
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (fileData.length > maxSize) {
      return { valid: false, error: "Arquivo muito grande (máximo 10MB)." };
    }

    return { valid: true, error: null };
  }

  async uploadScreenshot(filePath) {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error("SUPABASE_NOT_INITIALIZED: Serviço não inicializado");
      }
    }

    const startTime = performance.now();
    this.metrics.totalUploads++;

    try {
      console.log("Iniciando upload de:", filePath);

      let fileData;
      try {
        fileData = await window.electron.readFile(filePath);
      } catch (readError) {
        throw new Error(
          `FILE_READ_ERROR: Não foi possível ler o arquivo: ${readError.message}`
        );
      }

      const validation = this.validateFile(fileData);
      if (!validation.valid) {
        throw new Error(`INVALID_FILE: ${validation.error}`);
      }

      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const fileName = `screenshot-${timestamp}-${randomSuffix}.png`;

      let uploadError = null;
      let uploadData = null;
      let retries = 0;

      while (retries <= this.maxRetries) {
        try {
          const result = await this.supabase.storage
            .from(this.bucketName)
            .upload(fileName, fileData, {
              contentType: "image/png",
              upsert: false,
              cacheControl: "3600",
            });

          if (result.error) throw result.error;
          uploadData = result.data;
          break;
        } catch (err) {
          uploadError = err;
          retries++;

          if (retries <= this.maxRetries) {
            console.warn(
              `Falha no upload, tentativa ${retries}/${this.maxRetries}: ${err.message}`
            );
            await new Promise((r) => setTimeout(r, this.retryDelay * retries));
          }
        }
      }

      if (!uploadData) {
        this.metrics.failedUploads++;
        throw (
          uploadError ||
          new Error("UPLOAD_FAILED: Falha no upload após tentativas")
        );
      }

      const { data: urlData, error: urlError } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fileName, 3600);

      if (urlError) throw urlError;

      const signedUrl = urlData.signedUrl;
      console.log("Upload realizado com sucesso:", signedUrl);

      this.metrics.successfulUploads++;
      this.metrics.totalUploadTime += performance.now() - startTime;

      this.addToRecentUploads(signedUrl, fileName);

      return signedUrl;
    } catch (error) {
      this.metrics.failedUploads++;

      let errorCode = "UNKNOWN_ERROR";

      if (error.message.includes("storage/object-already-exists")) {
        errorCode = "FILE_EXISTS";
      } else if (error.statusCode === 401 || error.statusCode === 403) {
        errorCode = "AUTH_ERROR";
      } else if (error.statusCode === 413) {
        errorCode = "FILE_TOO_LARGE";
      } else if (error.message.includes("NETWORK_ERROR")) {
        errorCode = "NETWORK_ERROR";
      }

      console.error(`${errorCode}: Erro ao fazer upload do screenshot:`, error);
      throw new Error(`${errorCode}: ${error.message || "Erro no upload"}`);
    }
  }

  addToRecentUploads(url, fileName) {
    if (this.recentUploads.length >= this.maxRecentUploads) {
      this.recentUploads.shift();
    }

    this.recentUploads.push({
      url,
      fileName,
      timestamp: Date.now(),
    });
  }

  getRecentUploads() {
    return [...this.recentUploads];
  }

  getMetrics() {
    const avgUploadTime =
      this.metrics.successfulUploads > 0
        ? this.metrics.totalUploadTime / this.metrics.successfulUploads
        : 0;

    return {
      ...this.metrics,
      avgUploadTime,
    };
  }

  async cleanupOldFiles(olderThanDays = 7) {
    if (!this.isInitialized()) {
      await this.initialize();
      if (!this.isInitialized()) {
        throw new Error("Serviço não inicializado");
      }
    }

    try {
      const { data: files, error } = await this.supabase.storage
        .from(this.bucketName)
        .list();

      if (error) throw error;

      const now = Date.now();
      const cutoffTime = now - olderThanDays * 24 * 60 * 60 * 1000;

      const oldFiles = files.filter((file) => {
        const match = file.name.match(/screenshot-(\d+)-\d+\.png/);
        if (!match) return false;

        const timestamp = parseInt(match[1], 10);
        return timestamp < cutoffTime;
      });

      if (oldFiles.length === 0) {
        return 0;
      }

      const { error: deleteError } = await this.supabase.storage
        .from(this.bucketName)
        .remove(oldFiles.map((file) => file.name));

      if (deleteError) throw deleteError;

      console.log(`Removidos ${oldFiles.length} arquivos antigos`);
      return oldFiles.length;
    } catch (error) {
      console.error("Erro ao limpar arquivos antigos:", error);
      return 0;
    }
  }

  resetMetrics() {
    this.metrics = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalUploadTime: 0,
    };
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;
