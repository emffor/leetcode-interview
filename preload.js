const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o frontend
contextBridge.exposeInMainWorld('electron', {
  // Configurações
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // Leitura de arquivo
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  
  // Controle de visibilidade
  setOpacity: (opacity) => ipcRenderer.invoke('toggle-visibility', opacity),
  
  // Listeners para eventos do processo principal
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (_, path) => callback(path));
  },
  
  onAnalyzeScreenshot: (callback) => {
    ipcRenderer.on('analyze-screenshot', () => callback());
  },
  
  onOpacityChange: (callback) => {
    ipcRenderer.on('opacity-changed', (_, opacity) => callback(opacity));
  },
  
  onPositionChange: (callback) => {
    ipcRenderer.on('position-changed', (_, position) => callback(position));
  },
  
  onError: (callback) => {
    ipcRenderer.on('error', (_, message) => callback(message));
  },

  onResetContext: (callback) => {
    ipcRenderer.on('reset-context', () => callback());
  },

  // Buffer já está disponível globalmente em Electron
});