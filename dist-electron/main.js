import require$$0 from "electron";
import require$$1 from "path";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main$1 = {};
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main$1;
  hasRequiredMain = 1;
  const { app, BrowserWindow } = require$$0;
  const path = require$$1;
  function createWindow() {
    const mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.cjs")
      },
      icon: path.join(__dirname, "../public/icon.png"),
      title: "Dungeon Command - Digital Edition"
    });
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    mainWindow.setMenuBarVisibility(false);
  }
  app.whenReady().then(() => {
    createWindow();
    app.on("activate", function() {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on("window-all-closed", function() {
    if (process.platform !== "darwin") app.quit();
  });
  return main$1;
}
var mainExports = requireMain();
const main = /* @__PURE__ */ getDefaultExportFromCjs(mainExports);
export {
  main as default
};
