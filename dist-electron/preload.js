"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    selectVideoFile: () => electron_1.ipcRenderer.invoke('dialog:selectVideo'),
    saveExportVideo: (defaultName) => electron_1.ipcRenderer.invoke('dialog:saveExportVideo', defaultName),
    createDesktopShortcut: () => electron_1.ipcRenderer.invoke('app:createShortcut'),
    minimizeWindow: () => electron_1.ipcRenderer.send('window:minimize'),
    maximizeWindow: () => electron_1.ipcRenderer.send('window:maximize'),
    closeWindow: () => electron_1.ipcRenderer.send('window:close'),
    restartApp: () => electron_1.ipcRenderer.send('app:restart'),
});
