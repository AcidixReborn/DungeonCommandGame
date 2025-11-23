import require$$0 from "electron";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var preload$1 = {};
var hasRequiredPreload;
function requirePreload() {
  if (hasRequiredPreload) return preload$1;
  hasRequiredPreload = 1;
  const { contextBridge } = require$$0;
  contextBridge.exposeInMainWorld("electronAPI", {
    // Add any custom APIs you want to expose to the renderer here
    // For example:
    // sendMessage: (message) => ipcRenderer.send('message', message)
  });
  return preload$1;
}
var preloadExports = requirePreload();
const preload = /* @__PURE__ */ getDefaultExportFromCjs(preloadExports);
export {
  preload as default
};
