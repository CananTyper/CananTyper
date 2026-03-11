// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDlDLS1X6u3zodYVadV4T-hw5Uq7eHHuFk",
    authDomain: "canantyper.firebaseapp.com",
    projectId: "canantyper",
    storageBucket: "canantyper.firebasestorage.app",
    messagingSenderId: "55384940628",
    appId: "1:55384940628:web:6211a5e6c8bc36694e8dc1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. CORE DE DATOS
const CT = {
    data: { u: [], s: [], p: [], c: [], a: [], ui: null, maint: null }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5,
    editIdx: null, profPage: 0, activeProfHandle: null,
    
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    dbLocal: (k) => CT.data[k] || [], 
    
    init: function() {
        let storedUnit = localStorage.getItem('ct_unit_pref');
        if (storedUnit !== 'cpm' && storedUnit !== 'wpm' && storedUnit !== 'zen') { storedUnit = 'cpm'; localStorage.setItem('ct_unit_pref', 'cpm'); }
        this.currentUnit = storedUnit;
        document.documentElement.setAttribute('data-theme', this.currentUnit);

        const cU = localStorage.getItem('ct_cache_u');
        const cS = localStorage.getItem('ct_cache_s');
        const cP = localStorage.getItem('ct_cache_p');
        const cC = localStorage.getItem('ct_cache_c');
        if(cU) this.data.u = JSON.parse(cU);
        if(cS) this.data.s = JSON.parse(cS);
        if(cP) this.data.p = JSON.parse(cP);
        if(cC) this.data.c = JSON.parse(cC);

        UI.updateUnitVisuals(this.currentUnit);
        
        db.collection('config').doc('maintenance').onSnapshot(snap => {
            if(snap.exists) this.data.maint = snap.data();
            UI.checkMaintenance();
        });

        if(this.ses()) { UI.initLobby(); } else { UI.show('auth-screen'); }

        db.collection('users').onSnapshot(snap => { this.data.u = snap.docs.map(d => d.data()); UI.refreshActiveViews(); });
        db.collection('scores').onSnapshot(snap => { this.data.s = snap.docs.map(d => d.data()); UI.refreshActiveViews(); });
        db.collection('phrases').onSnapshot(snap => { this.data.p = snap.docs.map(d => d.data()); UI.refreshActiveViews(); });
        db.collection('categories').onSnapshot(snap => { this.data.c = snap.docs.map(d => d.data()); UI.updateCategorySelects(); UI.refreshActiveViews(); });

        db.collection('config').doc('ui_texts').onSnapshot(snap => {
            if(snap.exists) this.data.ui = snap.data();
            UI.applyUITexts();
        });
    },
    ses: () => { 
        const s = JSON.parse(localStorage.getItem('ct_ses')); 
        return s ? (CT.data.u || []).find(x => x.h === s.h) : null; 
    }
};

const UI = {
    // ... (Mantener todas tus funciones de renderizado de tablas y perfiles aquí)
    show: (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    toggleAuth: (login) => { document.getElementById('login-form').classList.toggle('hidden', !login); document.getElementById('register-form').classList.toggle('hidden', login); },
    initLobby() {
        const u = CT.ses(); if(!u) return this.show('auth-screen');
        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || CT.defAvatar;
        document.getElementById('t_nav_admin').classList.toggle('hidden', u.r !== 'admin');
        UI.updateUnitVisuals(CT.currentUnit);
        this.renderGlobal(); this.show('home-screen');
    },
    showAdmin() { this.switchTab('announcements'); this.show('admin-screen'); },
    showStats() { this.switchStatsTab('personal'); this.show('stats-screen'); },
    toggleSettings: () => {
        document.getElementById('settings-dropdown').classList.toggle('hidden');
        const dot = document.getElementById('update-dot');
        if (dot.classList.contains('dot-yellow')) dot.classList.add('hidden');
    }
    // (Asegurarse de incluir el resto de tus funciones UI aquí)
};

// INTEGRACIÓN RADAR v1.0.3
if (typeof require !== 'undefined') {
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('update-status', (event, status) => {
        const dot = document.getElementById('update-dot');
        const btn = document.getElementById('btn-update-status');
        if (status === 'downloading') {
            dot.className = 'update-dot dot-yellow';
            dot.classList.remove('hidden');
            btn.innerText = "⏳ ACTUALIZANDO...";
            btn.classList.remove('hidden');
        } else if (status === 'ready') {
            dot.className = 'update-dot dot-theme';
            dot.classList.remove('hidden');
            btn.innerText = "🚀 APLICAR ACTUALIZACIÓN";
            btn.classList.remove('hidden');
        }
    });
}

const App = {
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },
    toggleFullscreen: () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
        UI.toggleSettings();
    },
    handleUpdateClick: () => {
        const btn = document.getElementById('btn-update-status');
        if (btn.innerText.includes("APLICAR")) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('apply-update');
        }
    }
    // (Asegurarse de incluir tus funciones App.login, App.register, etc. aquí)
};

document.addEventListener('DOMContentLoaded', () => { CT.init(); });
