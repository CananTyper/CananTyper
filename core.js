/* ================================================================
   CANANTYPER - CORE SCRIPT (V2.0)
   Maneja Autenticación, Firebase, Discord RPC y Estado del Jugador.
   (Libre de código administrativo - Cliente Puro)
   ================================================================ */

const isDesktopEnv = (typeof process !== 'undefined' && process.versions && !!process.versions.electron);
let currentApiKey = "AIzaSyDWtm9wGj5mOYT1CIz2jugteKrJoMDUhiw"; 
let ipcRenderer = null;

if (isDesktopEnv) {
    try {
        ipcRenderer = require('electron').ipcRenderer;
        require('dotenv').config();
        currentApiKey = process.env.FIREBASE_API_KEY_DESKTOP || currentApiKey;
    } catch(e) { console.warn("Aviso: Ejecutando en entorno sin variables nativas."); }
}

function updateDiscordStatus(details, state, showTimer = true) {
    if (ipcRenderer) ipcRenderer.send('update-discord', { details, state, showTimer });
}

const firebaseConfig = {
    apiKey: currentApiKey, authDomain: "canantyper.firebaseapp.com",
    projectId: "canantyper", storageBucket: "canantyper.firebasestorage.app",
    messagingSenderId: "55384940628", appId: "1:55384940628:web:6211a5e6c8bc36694e8dc1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch((err) => { console.error("Persistencia falló:", err); });

const CT = {
    data: { u: null, p: [], c: [], a: [], ui: null, maint: null, info: null, shortcuts: null, s_top: [], s_recent: [], userScores: {} }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5, activeProfHandle: null, fastMode: false,
    
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    ses: () => { return CT.data.u; }, // Ahora ses() devuelve directamente el usuario en memoria
    
    init: function() {
        let storedUnit = localStorage.getItem('ct_unit_pref');
        if (storedUnit !== 'cpm' && storedUnit !== 'wpm' && storedUnit !== 'zen') { storedUnit = 'cpm'; localStorage.setItem('ct_unit_pref', 'cpm'); }
        this.currentUnit = storedUnit;
        document.documentElement.setAttribute('data-theme', this.currentUnit);
        this.fastMode = localStorage.getItem('ct_fast_mode') === 'true';

        const cP = localStorage.getItem('ct_cache_p'); const cC = localStorage.getItem('ct_cache_c');
        const cUi = localStorage.getItem('ct_cache_ui'); const cU = localStorage.getItem('ct_cache_me');
        
        if(cU) this.data.u = JSON.parse(cU); 
        if(cP) this.data.p = JSON.parse(cP); if(cC) this.data.c = JSON.parse(cC);
        if(cUi) { this.data.ui = JSON.parse(cUi); }

        if (!isDesktopEnv) {
            const dlBtn = document.getElementById('btn-direct-download');
            if (dlBtn) dlBtn.classList.remove('hidden');
        }
        
        // Listeners Globales (Órdenes de CananStudio)
        db.collection('config').doc('maintenance').onSnapshot(snap => {
            this.data.maint = snap.exists ? snap.data() : { active: false, info: true, theme: true };
            if(typeof UI !== 'undefined') UI.checkMaintenance();
        });

        db.collection('config').doc('info_page').onSnapshot(snap => {
            this.data.info = snap.exists ? snap.data() : { title: "Información", content: "Bienvenido a CananTyper." };
            if(typeof UI !== 'undefined') UI.renderInfoPage();
        });

        db.collection('config').doc('shortcuts').onSnapshot(snap => {
            this.data.shortcuts = snap.exists ? snap.data() : { restart: 'Tab', next: 'Enter', quit: 'Escape' };
        });

        db.collection('phrases').onSnapshot(snap => { 
            this.data.p = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p)); 
            if(typeof UI !== 'undefined') UI.refreshActiveViews(); 
        });

        db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_c', JSON.stringify(this.data.c)); 
            if(typeof UI !== 'undefined') { UI.renderTrainDropdown(); UI.refreshActiveViews(); }
        });

        db.collection('announcements').orderBy('id', 'desc').onSnapshot(snap => { 
            this.data.a = snap.docs.map(d => d.data()); 
            if(typeof UI !== 'undefined') UI.checkAnnouncements(); 
        });

        db.collection('config').doc('ui_texts').onSnapshot(snap => {
            if(snap.exists) {
                CT.data.ui = snap.data();
                localStorage.setItem('ct_cache_ui', JSON.stringify(CT.data.ui));
                if(typeof UI !== 'undefined') { UI.applyUITexts(); UI.refreshActiveViews(); }
            }
        });

        // Verificación de Sesión
        const session = JSON.parse(localStorage.getItem('ct_ses'));
        if(session && session.h) {
            // SOLO DESCARGAMOS EL DOCUMENTO DEL JUGADOR ACTUAL (Ahorro Masivo de Cuota)
            db.collection('users').doc(session.h).onSnapshot(doc => {
                if(doc.exists) {
                    CT.data.u = doc.data();
                    localStorage.setItem('ct_cache_me', JSON.stringify(CT.data.u));
                    if(typeof UI !== 'undefined') {
                        if(document.getElementById('auth-screen') && !document.getElementById('auth-screen').classList.contains('hidden')) {
                            UI.initLobby();
                        }
                        UI.refreshActiveViews();
                    }
                } else {
                    Auth.logout(); // Si el documento no existe (fue borrado por admin)
                }
            });
            App.loadDashboardData();
        } else {
            if(typeof UI !== 'undefined') {
                UI.show('auth-screen'); 
                updateDiscordStatus("En la pantalla de acceso", "Esperando credenciales...", false);
            }
        }
    }
};

const Auth = {
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        
        if(!hInp || !p) return alert("Por favor, ingresa usuario y contraseña.");

        const btn = document.getElementById('t_btn_login');
        const originalText = btn.innerText;
        btn.innerText = "CONECTANDO..."; btn.disabled = true;

        try { 
            const docRef = await db.collection('users').doc(handle).get(); 
            if(docRef.exists && docRef.data().p === p) { 
                localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                CT.data.u = docRef.data();
                location.reload(); // Recargar para enganchar el onSnapshot del Core
            } else { 
                alert("Usuario o contraseña incorrectos"); 
                btn.innerText = originalText; btn.disabled = false;
            } 
        } catch(e) { 
            console.error("Error en DB:", e); 
            btn.innerText = "REINTENTAR";
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
        }
    },

    register: async () => { 
        const n = document.getElementById('reg-display').value; 
        const hRaw = document.getElementById('reg-user').value.toLowerCase(); 
        const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; 
        const p = document.getElementById('reg-pass').value; 
        
        if(!n || !hRaw || !p) return alert("Completa todos los campos"); 
        if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); 
        
        try { 
            const docRef = await db.collection('users').doc(handle).get(); 
            if(docRef.exists) return alert("Ese usuario ya está en uso"); 
            const role = 'usuario'; 
            const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [], sb: false }; 
            await db.collection('users').doc(handle).set(newUser); 
            UI.toggleAuth(true); 
            alert("Cuenta creada con éxito."); 
        } catch(e) { alert("Error al conectar con la Nube"); } 
    },
    
    logout: () => { 
        localStorage.removeItem('ct_ses'); 
        localStorage.removeItem('ct_cache_me');
        location.reload(); 
    },

    clearCache: () => {
        if(confirm("¿Seguro que deseas limpiar la caché local?")) {
            localStorage.removeItem('ct_cache_p'); localStorage.removeItem('ct_cache_c');
            localStorage.removeItem('ct_cache_ui'); localStorage.removeItem('ct_cache_me');
            location.reload();
        }
    }
};

const App = {
    loadDashboardData: async () => {
        try {
            const topReq = await db.collection('scores').where('hc', '==', false).orderBy('c', 'desc').limit(50).get();
            CT.data.s_top = topReq.docs.map(d => d.data());
        } catch(e) {
            try {
                const topReqFb = await db.collection('scores').orderBy('c', 'desc').limit(50).get();
                CT.data.s_top = topReqFb.docs.map(d => d.data()).filter(x => !x.hc);
            } catch(err) { CT.data.s_top = []; }
        }
        
        try {
            const recReq = await db.collection('scores').orderBy('id', 'desc').limit(100).get();
            CT.data.s_recent = recReq.docs.map(d => d.data());
        } catch(e) { CT.data.s_recent = []; }
        
        if(typeof UI !== 'undefined') UI.refreshActiveViews();
    },

    getUserScores: async (handle) => {
        if(!CT.data.userScores) CT.data.userScores = {};
        if(CT.data.userScores[handle]) return CT.data.userScores[handle];
        try {
            const req = await db.collection('scores').where('h', '==', handle).limit(100).get();
            let scores = req.docs.map(d => d.data());
            scores.sort((a,b) => b.id - a.id);
            CT.data.userScores[handle] = scores;
            return scores;
        } catch(e) { return []; }
    },

    editDisplayName: () => { 
        const u = CT.ses(); if(!u) return; 
        const newName = prompt("Nuevo nombre:", u.n); 
        if(newName && newName.trim() !== '') { 
            if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); 
            db.collection('users').doc(u.h).update({ n: newName }); 
            
            // Actualizar nombre en carreras en segundo plano
            db.collection('scores').where('h', '==', u.h).get().then(q => { 
                const batch = db.batch(); 
                q.forEach(doc => { batch.update(doc.ref, { n: newName }); }); 
                batch.commit(); 
            }); 
        } 
    },

    toggleFav: (idStr) => {
        const u = CT.ses(); if(!u) return;
        let favs = [...(u.favs || [])];
        if (favs.includes(idStr.toString())) { favs = favs.filter(f => f !== idStr.toString()); } 
        else { favs.push(idStr.toString()); }
        db.collection('users').doc(u.h).update({ favs: favs });
        setTimeout(() => { if(typeof UI !== 'undefined') UI.renderTrackList(); }, 200); 
    },

    toggleFullscreen: () => { 
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => console.warn(err)); } 
        else { if (document.exitFullscreen) document.exitFullscreen(); } 
        if(typeof UI !== 'undefined') UI.toggleSettings(); 
    },
    
    downloadSetup: () => {
        const directUrl = 'https://github.com/CananTyper/CananTyper/releases/latest/download/CananTyper_Setup.exe';
        const link = document.createElement('a'); link.href = directUrl; link.download = 'CananTyper_Setup.exe';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); 
        if(typeof UI !== 'undefined') UI.toggleSettings();
    },

    handleUpdateClick: () => { 
        const btn = document.getElementById('btn-update-status'); 
        if (btn && btn.innerText.includes("APLICAR")) { if(ipcRenderer) ipcRenderer.send('apply-update'); } 
    }
};

document.addEventListener('DOMContentLoaded', () => { CT.init(); });
