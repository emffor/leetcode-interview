const { desktopCapturer, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Captura um screenshot da tela principal.
 * @returns {Promise<string>} Caminho do arquivo do screenshot
 */
async function captureScreenshot() {
  try {
    // Obter todas as fontes de tela disponíveis
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize 
    });
    
    // Utiliza a primeira fonte (tela principal)
    const mainSource = sources[0];
    
    if (!mainSource) {
      throw new Error('Nenhuma fonte de captura encontrada');
    }
    
    // Cria diretório temporário para o screenshot se não existir
    const screenshotDir = path.join(os.tmpdir(), 'interview-helper');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Gera nome de arquivo único
    const timestamp = new Date().getTime();
    const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`);
    
    // Salva a miniatura como arquivo PNG
    const thumbnail = mainSource.thumbnail.toPNG();
    fs.writeFileSync(filePath, thumbnail);
    
    return filePath;
  } catch (error) {
    console.error('Erro ao capturar screenshot:', error);
    throw error;
  }
}

module.exports = {
  captureScreenshot
};