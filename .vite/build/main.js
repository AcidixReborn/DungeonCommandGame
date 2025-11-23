"use strict";
const electron = require("electron");
const path = require("node:path");
const node_url = require("node:url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __filename$1 = node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
let mainWindow;
function createWindow() {
  const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY = process.env.MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY || path.join(__dirname$1, "preload.cjs");
  mainWindow = new electron.BrowserWindow({
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    },
    title: "Dungeon Command - Digital Edition"
  });
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5178");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  mainWindow.setMenuBarVisibility(false);
}
electron.ipcMain.handle("toggle-fullscreen", () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});
electron.ipcMain.handle("is-fullscreen", () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});
electron.ipcMain.handle("quit-app", () => {
  electron.app.quit();
});
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", function() {
  if (process.platform !== "darwin") electron.app.quit();
});
