// Preload script for Electron
// This script runs before the renderer process loads
// Use this to expose safe APIs to the renderer if needed

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { contextBridge } = require('electron')

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any custom APIs you want to expose to the renderer here
  // For example:
  // sendMessage: (message) => ipcRenderer.send('message', message)
})
