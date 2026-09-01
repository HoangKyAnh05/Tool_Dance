// Universal Entry Point: Works both on Desktop (Electron) and Cloud Web (Render.com)
try {
  const electron = require('electron');
  if (electron && electron.app) {
    // Desktop App Mode
    require('./electron-main.js');
  } else {
    // Web Cloud Hosting Mode (Render.com / Heroku)
    require('../server.js');
  }
} catch (e) {
  // Web Cloud Hosting Mode Fallback
  require('../server.js');
}
