import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icons/app-icon.png');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'AI Dance Chibi Studio - Motion Tracker & 3D Audition',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    frame: false, // Custom frameless titlebar with neon aesthetic
    backgroundColor: '#0a0a14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows local video playback smoothly
    },
  });

  // Check if we are running in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Check if dist-renderer exists or fallback
    const indexPath = path.join(__dirname, '../dist-renderer/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Setup IPC Handlers
  ipcMain.handle('dialog:selectVideo', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn video nhảy (MP4 / WebM / MOV)',
      properties: ['openFile'],
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'webm', 'mov', 'mkv', 'avi'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('dialog:saveExportVideo', async (_, defaultName: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Lưu video nhảy Chibi đã render',
      defaultPath: defaultName || 'dance_chibi_ai_export.webm',
      filters: [
        { name: 'WebM Video (*.webm)', extensions: ['webm'] },
        { name: 'MP4 Video (*.mp4)', extensions: ['mp4'] },
      ],
    });
    if (!result.canceled && result.filePath) {
      return result.filePath;
    }
    return null;
  });

  ipcMain.handle('app:createShortcut', async () => {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '../scripts/create_desktop_shortcut.js');
      exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, message: stderr || error.message });
        } else {
          resolve({ success: true, message: stdout });
        }
      });
    });
  });

  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.on('app:restart', () => {
    app.relaunch();
    app.exit(0);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
