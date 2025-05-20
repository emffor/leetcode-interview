const { desktopCapturer, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

async function captureScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
    });

    const mainSource = sources[0];

    if (!mainSource) {
      throw new Error("Nenhuma fonte de captura encontrada");
    }

    const screenshotDir = path.join(os.tmpdir(), "interview-helper");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const timestamp = new Date().getTime();
    const filePath = path.join(screenshotDir, `screenshot-${timestamp}.png`);

    const thumbnail = mainSource.thumbnail.toPNG();
    fs.writeFileSync(filePath, thumbnail);

    return filePath;
  } catch (error) {
    console.error("Erro ao capturar screenshot:", error);
    throw error;
  }
}

module.exports = {
  captureScreenshot,
};
