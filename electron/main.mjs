import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Debug log file path - in project root for easy access
const getLogPath = () => {
  // In development, use the project root; in production, use app path
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '..', 'debug.log')
  }
  return path.join(app.getPath('userData'), 'debug.log')
}

let mainWindow

function createWindow() {
  const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY =
    process.env.MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY || path.join(__dirname, 'preload.cjs')

  mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    title: 'Dungeon Command - Digital Edition',
  })

  // In development, load from Vite dev server
  // In production, load the built files
  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Remove default menu bar for a cleaner look
  mainWindow.setMenuBarVisibility(false)
}

// IPC handlers for fullscreen toggle
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen()
    mainWindow.setFullScreen(!isFullScreen)
    return !isFullScreen
  }
  return false
})

ipcMain.handle('is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false
})

// IPC handler for quitting the app
ipcMain.handle('quit-app', () => {
  app.quit()
})

// IPC handlers for debug logging
ipcMain.handle('clear-log', () => {
  try {
    const logPath = getLogPath()
    const header = `=== Debug Log Started: ${new Date().toISOString()} ===\n`
    fs.writeFileSync(logPath, header, 'utf8')
    return { success: true, path: logPath }
  } catch (error) {
    console.error('Failed to clear log:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('write-log', (event, entry) => {
  try {
    const logPath = getLogPath()
    fs.appendFileSync(logPath, entry + '\n', 'utf8')
    return { success: true }
  } catch (error) {
    console.error('Failed to write log:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('get-log-path', () => {
  return getLogPath()
})

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow()

  // Register keyboard shortcuts for DevTools (since F12 may not work on all systems)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
    }
  })
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools()
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
