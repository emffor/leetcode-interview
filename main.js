const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const { captureScreenshot } = require('./utils/screenshot');
const http = require('http');
const fs = require('fs').promises;

// Configuração para armazenar dados persistentes
const store = new Store();

// Armazena última opacidade usada
let lastOpacity = 0.6;
let isVisible = true;
let invisibilityTimer = null;

let mainWindow;

// Verifica se o servidor React está disponível
function isReactServerRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', () => {
      resolve(true);
    }).on('error', () => {
      resolve(false);
    });
    req.end();
  });
}

// Espera o servidor React iniciar
async function waitForReactServer(retries = 20, interval = 1000) {
  let attempts = 0;

  while (attempts < retries) {
    const isRunning = await isReactServerRunning();
    if (isRunning) return true;

    console.log(`Aguardando servidor React... (${attempts + 1}/${retries})`);
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }

  return false;
}

// Função para mover a janela
function moveWindow(direction, pixels = 50) {
  if (!mainWindow) return;
  
  const [x, y] = mainWindow.getPosition();
  
  switch(direction) {
    case 'up':
      mainWindow.setPosition(x, y - pixels);
      break;
    case 'down':
      mainWindow.setPosition(x, y + pixels);
      break;
    case 'left':
      mainWindow.setPosition(x - pixels, y);
      break;
    case 'right':
      mainWindow.setPosition(x + pixels, y);
      break;
  }
  
  // Notifica o frontend da mudança de posição
  mainWindow.webContents.send('position-changed', { x, y });
}

async function createWindow() {
  // Aguarda o servidor React iniciar no modo de desenvolvimento
  if (isDev) {
    const serverRunning = await waitForReactServer();
    if (!serverRunning) {
      console.error('Servidor React não iniciou. Encerrando aplicação.');
      app.exit(1);
      return;
    }
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Criar janela principal configurada para ser invisível
  mainWindow = new BrowserWindow({
    width: width * 0.4,
    height: height * 1.0,
    x: Math.floor(width * 0.85),  // Posiciona à direita da tela
    y: Math.floor(height * 0.7), // Posiciona no topo
    frame: false,                // Remove a moldura da janela
    transparent: true,           // Torna a janela transparente
    alwaysOnTop: true,           // Mantém a janela sempre visível
    skipTaskbar: true,           // Não exibe na barra de tarefas
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Carrega o app React
  const loadURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, './build/index.html')}`;

  console.log(`Carregando URL: ${loadURL}`);
  mainWindow.loadURL(loadURL);

  // Define opacidade inicial
  mainWindow.setOpacity(0.6); // Começa com opacidade de 60% para ser visível no dev

  // Desabilita inspeção em produção
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Limpa o objeto quando a janela é fechada
  mainWindow.on('closed', () => (mainWindow = null));
}

// Inicialização do app
app.whenReady().then(() => {
  createWindow();

  // Registra atalhos globais
  registerShortcuts();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Fecha o app quando todas as janelas forem fechadas (exceto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Função para registrar todos os atalhos de teclado
function registerShortcuts() {
  // Atalho para opacidade 30%
  globalShortcut.register('Alt+1', () => {
    if (mainWindow) {
      lastOpacity = 0.3;
      isVisible = true;
      mainWindow.setOpacity(0.3);
      mainWindow.webContents.send('opacity-changed', 0.3);
    }
  });

  // Atalho para opacidade 60%
  globalShortcut.register('Alt+2', () => {
    if (mainWindow) {
      lastOpacity = 0.6;
      isVisible = true;
      mainWindow.setOpacity(0.6);
      mainWindow.webContents.send('opacity-changed', 0.6);
    }
  });

  // Atalho para opacidade 100%
  globalShortcut.register('Alt+3', () => {
    if (mainWindow) {
      lastOpacity = 1.0;
      isVisible = true;
      mainWindow.setOpacity(1.0);
      mainWindow.webContents.send('opacity-changed', 1.0);
    }
  });

  // Atalho para alternar visibilidade (Alt+B)
  globalShortcut.register('Alt+B', () => {
    if (!mainWindow) return;
    
    isVisible = !isVisible;
    
    if (isVisible) {
      mainWindow.show();
      mainWindow.setOpacity(lastOpacity);
      clearTimeout(invisibilityTimer);
      invisibilityTimer = null;
    } else {
      mainWindow.hide();
      
      // Restaura automaticamente após 10 minutos para evitar perder acesso
      invisibilityTimer = setTimeout(() => {
        isVisible = true;
        mainWindow.show();
        mainWindow.setOpacity(lastOpacity);
      }, 600000); // 10 minutos
    }
  });

  // Atalho para capturar screenshot (Alt+S)
  globalShortcut.register('Alt+S', async () => {
    if (!mainWindow) return; 
    try {
      // Salva o estado atual
      const wasVisible = isVisible;
      const previousOpacity = mainWindow.getOpacity();
      
      // Oculta completamente a aplicação
      mainWindow.hide();
      
      // Aguarda para garantir que a janela desapareceu
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        // Captura a tela sem a janela visível
        const screenshotPath = await captureScreenshot();
        
        // Notifica o frontend
        mainWindow.webContents.send('screenshot-captured', screenshotPath);
        console.log('Screenshot capturado:', screenshotPath);
      } catch (error) {
        console.error('Erro ao capturar screenshot:', error);
        mainWindow.webContents.send('error', 'Falha ao capturar screenshot');
      } finally {
        // Restaura a janela com o estado anterior
        mainWindow.show();
        
        // Se estava visível antes, restaura a opacidade anterior
        if (wasVisible) {
          mainWindow.setOpacity(previousOpacity);
        } else {
          // Se estava invisível, mantém invisível (opacidade 0)
          mainWindow.setOpacity(0);
        }
      }
    } catch (error) {
      console.error('Erro geral no processo:', error);
      
      // Garante que a janela seja restaurada em caso de erro
      mainWindow.show();
      mainWindow.setOpacity(lastOpacity); 
    }
  });

  // Atalho para enviar screenshot para análise (Alt+Enter)
  globalShortcut.register('Alt+Enter', () => {
    if (mainWindow) {
        mainWindow.webContents.send('analyze-screenshot');
    }
  });
  
  // Atalhos para mover a janela
  globalShortcut.register('Alt+Up', () => {
    moveWindow('up');
  });
  
  globalShortcut.register('Alt+Down', () => {
    moveWindow('down');
  });
  
  globalShortcut.register('Alt+Left', () => {
    moveWindow('left');
  });
  
  globalShortcut.register('Alt+Right', () => {
    moveWindow('right');
  });

  // Atalho para reiniciar contexto (Alt+G)
  globalShortcut.register('Alt+G', () => {
    if (mainWindow) {
      mainWindow.webContents.send('reset-context');
    }
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Desabilita a aceleração de hardware para evitar problemas de renderização
app.disableHardwareAcceleration();

// Handlers IPC
ipcMain.handle('get-config', async (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-config', async (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('Erro ao ler arquivo:', error);
    throw error;
  }
});

ipcMain.handle('toggle-visibility', async (event, opacity) => {
  if (mainWindow) {
    lastOpacity = opacity;
    mainWindow.setOpacity(opacity);
    return true;
  }
  return false;
});