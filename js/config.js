/* ================================================================
    CANANTYPER - CONFIGURACIÓN Y ENTORNO
   ================================================================ */

window.isDesktopEnv = (typeof process !== 'undefined' && process.versions && !!process.versions.electron);
window.currentApiKey = "AIzaSyDWtm9wGj5mOYT1CIz2jugteKrJoMDUhiw"; 
window.ipcRenderer = null;

if (window.isDesktopEnv) {
    try {
        window.ipcRenderer = require('electron').ipcRenderer;
        require('dotenv').config();
        window.currentApiKey = process.env.FIREBASE_API_KEY_DESKTOP || window.currentApiKey;
    } catch(e) { console.warn("Aviso: Ejecutando en entorno sin variables nativas completas."); }
}

window.updateDiscordStatus = function(details, state, showTimer = true) {
    if (window.ipcRenderer) window.ipcRenderer.send('update-discord', { details, state, showTimer });
}

const firebaseConfig = {
    apiKey: window.currentApiKey, authDomain: "canantyper.firebaseapp.com",
    projectId: "canantyper", storageBucket: "canantyper.firebasestorage.app",
    messagingSenderId: "55384940628", appId: "1:55384940628:web:6211a5e6c8bc36694e8dc1"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.firestore();
window.db.settings({
    localCache: firebase.firestore.persistentLocalCache()
});
