/* ================================================================
    CANANTYPER - MOTOR BACKEND (ELECTRON MAIN PROCESS)
    ================================================================
    Controla la ventana de Windows, Discord RPC y Auto-Updater.
*/

const { app, BrowserWindow, ipcMain } = require('electron');
const RPC = require('discord-rpc');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let discordClient = null;
const clientId = '1481408993262960761';

try {
    discordClient = new RPC.Client({ transport: 'ipc' });
    discordClient.on('ready', () => {
        console.log('\n✅ DISCORD RPC: ¡Conexión exitosa con el perfil del Capitán!');
        setDiscordActivity("En el menú principal", "Esperando órdenes...", false);
    });
    console.log('⏳ Intentando conectar con Discord... (ID: ' + clientId + ')');
    discordClient.login({ clientId }).catch((err) => { console.error("\n❌ Error de Login en Discord:", err.message); });
} catch (e) {
    console.error("❌ Error fatal cargando la librería RPC:", e.message);
}

function setDiscordActivity(details, state, showTimer) {
    if (!discordClient) return;
    const activity = {
        details: details,
        state: state,
        largeImageKey: 'logo_principal', 
        largeImageText: 'CananTyper v1.1.9 - Oficial', 
        instance: false,
    };
    if (showTimer) activity.startTimestamp = Date.now();
    discordClient.setActivity(activity).catch(() => {});
}

ipcMain.on('update-discord', (event, args) => {
    setDiscordActivity(args.details, args.state, args.showTimer);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    setTimeout(() => {
        try { autoUpdater.checkForUpdatesAndNotify(); } catch (e) { console.error("Error al buscar actualizaciones:", e); }
    }, 3000);
});

autoUpdater.on('update-available', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'downloading'); });
autoUpdater.on('update-downloaded', () => { if (mainWindow) mainWindow.webContents.send('update-status', 'ready'); });
ipcMain.on('apply-update', () => { autoUpdater.quitAndInstall(); });

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
