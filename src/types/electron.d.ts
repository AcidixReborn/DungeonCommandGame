// Ambient type for the API exposed by electron/preload.cjs via contextBridge.
// Only present when running inside the Electron shell — undefined in the browser build,
// so every usage must guard with `window.electronAPI?.foo`.
export {}

declare global {
  interface Window {
    electronAPI?: {
      toggleFullscreen: () => Promise<void>
      isFullscreen: () => Promise<boolean>
      quitApp: () => Promise<void>
      writeLog: (entry: string) => Promise<void>
      clearLog: () => Promise<void>
      getLogPath: () => Promise<string>
    }
  }
}
