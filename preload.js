const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getConfig: (key) => {
    if (typeof key !== "string")
      return Promise.reject(new Error("Invalid key type"));
    return ipcRenderer.invoke("get-config", key);
  },

  setConfig: (key, value) => {
    if (typeof key !== "string")
      return Promise.reject(new Error("Invalid key type"));
    return ipcRenderer.invoke("set-config", key, value);
  },

  readFile: (path) => {
    if (typeof path !== "string")
      return Promise.reject(new Error("Invalid path type"));
    return ipcRenderer.invoke("read-file", path);
  },

  setOpacity: (opacity) => {
    if (typeof opacity !== "number" || opacity < 0 || opacity > 1)
      return Promise.reject(new Error("Invalid opacity value"));
    return ipcRenderer.invoke("toggle-visibility", opacity);
  },

  onScreenshotCaptured: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("screenshot-captured", (_, path) => callback(path));
  },

  onAnalyzeScreenshot: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("analyze-screenshot", () => callback());
  },

  onOpacityChange: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("opacity-changed", (_, opacity) => callback(opacity));
  },

  onPositionChange: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("position-changed", (_, position) => callback(position));
  },

  onError: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("error", (_, message) => callback(message));
  },

  onResetContext: (callback) => {
    if (typeof callback !== "function") return;
    ipcRenderer.on("reset-context", () => callback());
  },
});
