const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

// Configuración del Radar Profesional
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false; // Bloquea la instalación al cerrar para evitar el cartel de Windows

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1050,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: false // Cambiar a true si necesitas ver la consola de errores
    }
  });

  win.loadFile('index.html');

  // Receptor de la orden de reinicio desde el juego
  ipcMain.on('apply-update', () => {
    autoUpdater.quitAndInstall();
  });

  win.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });

  // Notificar al juego sobre el estado de la descarga
  autoUpdater.on('update-available', () => {
    win.webContents.send('update-status', 'downloading');
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update-status', 'ready');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
