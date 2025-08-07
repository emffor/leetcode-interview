const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
} = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const Store = require("electron-store");
const { captureScreenshot } = require("./utils/screenshot");
const http = require("http");
const fs = require("fs").promises;

const store = new Store();
let lastOpacity = 0.6;
let isVisible = true;
let invisibilityTimer = null;
let mainWindow;

function isReactServerRunning() {
  return new Promise((resolve) => {
    const req = http
      .get("http://localhost:9999", () => {
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
    req.end();
  });
}

async function waitForReactServer(retries = 20, interval = 1000) {
  let attempts = 0;
  while (attempts < retries) {
    const isRunning = await isReactServerRunning();
    if (isRunning) return true;
    console.log(`Aguardando servidor React... (${attempts + 1}/${retries})`);
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }
  return false;
}

function moveWindow(direction, pixels = 50) {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();

  switch (direction) {
    case "up":
      mainWindow.setPosition(x, y - pixels);
      break;
    case "down":
      mainWindow.setPosition(x, y + pixels);
      break;
    case "left":
      mainWindow.setPosition(x - pixels, y);
      break;
    case "right":
      mainWindow.setPosition(x + pixels, y);
      break;
  }

  mainWindow.webContents.send("position-changed", { x, y });
}

async function createWindow() {
  if (isDev) {
    const serverRunning = await waitForReactServer();
    if (!serverRunning) {
      console.error("Servidor React não iniciou. Encerrando aplicação.");
      app.exit(1);
      return;
    }
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.4),
    height: Math.floor(height * 0.9),
    x: Math.floor(width * 0.85),
    y: Math.floor(height * 0.05),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const loadURL = isDev
    ? "http://localhost:9999"
    : `file://${path.join(__dirname, "./build/index.html")}`;

  console.log(`Carregando URL: ${loadURL}`);
  mainWindow.loadURL(loadURL);
  mainWindow.setOpacity(0.6);

  if (!isDev) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerShortcuts() {
  globalShortcut.register("Alt+1", () => {
    if (mainWindow) {
      lastOpacity = 0.3;
      isVisible = true;
      mainWindow.setOpacity(0.3);
      mainWindow.webContents.send("opacity-changed", 0.3);
    }
  });

  globalShortcut.register("Alt+2", () => {
    if (mainWindow) {
      lastOpacity = 0.6;
      isVisible = true;
      mainWindow.setOpacity(0.6);
      mainWindow.webContents.send("opacity-changed", 0.6);
    }
  });

  globalShortcut.register("Alt+3", () => {
    if (mainWindow) {
      lastOpacity = 1.0;
      isVisible = true;
      mainWindow.setOpacity(1.0);
      mainWindow.webContents.send("opacity-changed", 1.0);
    }
  });

  globalShortcut.register("Alt+Q", () => {
    if (!mainWindow) return;
    isVisible = !isVisible;

    if (isVisible) {
      mainWindow.show();
      mainWindow.setOpacity(lastOpacity);
      clearTimeout(invisibilityTimer);
      invisibilityTimer = null;
    } else {
      mainWindow.hide();
      invisibilityTimer = setTimeout(() => {
        isVisible = true;
        mainWindow.show();
        mainWindow.setOpacity(lastOpacity);
      }, 600000);
    }
  });

  globalShortcut.register("Alt+S", async () => {
    if (!mainWindow) return;
    try {
      const wasVisible = isVisible;
      const previousOpacity = mainWindow.getOpacity();
      mainWindow.hide();

      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        const screenshotPath = await captureScreenshot();
        mainWindow.webContents.send("screenshot-captured", screenshotPath);
        console.log("Screenshot capturado:", screenshotPath);
      } catch (error) {
        console.error("Erro ao capturar screenshot:", error);
        mainWindow.webContents.send("error", "Falha ao capturar screenshot");
      } finally {
        mainWindow.show();

        if (wasVisible) {
          mainWindow.setOpacity(previousOpacity);
        } else {
          mainWindow.setOpacity(0);
        }
      }
    } catch (error) {
      console.error("Erro geral no processo:", error);
      mainWindow.show();
      mainWindow.setOpacity(lastOpacity);
    }
  });

  globalShortcut.register("Alt+Enter", () => {
    if (mainWindow) {
      mainWindow.webContents.send("analyze-screenshot");
    }
  });

  globalShortcut.register("Alt+Up", () => moveWindow("up"));
  globalShortcut.register("Alt+Down", () => moveWindow("down"));
  globalShortcut.register("Alt+Left", () => moveWindow("left"));
  globalShortcut.register("Alt+Right", () => moveWindow("right"));

  globalShortcut.register("Alt+G", () => {
    if (mainWindow) {
      mainWindow.webContents.send("reset-context");
    }
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.disableHardwareAcceleration();

ipcMain.handle("get-config", async (event, key) => {
  return store.get(key);
});

ipcMain.handle("set-config", async (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle("read-file", async (event, filePath) => {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    console.error("Erro ao ler arquivo:", error);
    throw error;
  }
});

ipcMain.handle("toggle-visibility", async (event, opacity) => {
  if (mainWindow) {
    lastOpacity = opacity;
    mainWindow.setOpacity(opacity);
    return true;
  }
  return false;
});
