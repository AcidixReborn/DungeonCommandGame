const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Debug logging - write to file for persistent debugging
  writeLog: (entry) => ipcRenderer.invoke('write-log', entry),
  clearLog: () => ipcRenderer.invoke('clear-log'),
  getLogPath: () => ipcRenderer.invoke('get-log-path')
})
