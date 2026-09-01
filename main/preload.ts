import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  selectVideoFile: () => Promise<string | null>;
  saveExportVideo: (defaultName: string) => Promise<string | null>;
  createDesktopShortcut: () => Promise<{ success: boolean; message: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  restartApp: () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideoFile: () => ipcRenderer.invoke('dialog:selectVideo'),
  saveExportVideo: (defaultName: string) => ipcRenderer.invoke('dialog:saveExportVideo', defaultName),
  createDesktopShortcut: () => ipcRenderer.invoke('app:createShortcut'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  restartApp: () => ipcRenderer.send('app:restart'),
});
