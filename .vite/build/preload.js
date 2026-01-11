"use strict";
const require$$0 = require("electron");
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var preload$1 = {};
var hasRequiredPreload;
function requirePreload() {
  if (hasRequiredPreload) return preload$1;
  hasRequiredPreload = 1;
  const { contextBridge, ipcRenderer } = require$$0;
  contextBridge.exposeInMainWorld("electronAPI", {
    // Window controls
    toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
    isFullscreen: () => ipcRenderer.invoke("is-fullscreen"),
    quitApp: () => ipcRenderer.invoke("quit-app"),
    // Debug logging - write to file for persistent debugging
    writeLog: (entry) => ipcRenderer.invoke("write-log", entry),
    clearLog: () => ipcRenderer.invoke("clear-log"),
    getLogPath: () => ipcRenderer.invoke("get-log-path")
  });
  return preload$1;
}
var preloadExports = requirePreload();
const preload = /* @__PURE__ */ getDefaultExportFromCjs(preloadExports);
module.exports = preload;
