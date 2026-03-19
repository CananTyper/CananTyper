/* ================================================================
   CANANTYPER - CORE SCRIPT (FASE 1: Módulo Base)
   ================================================================ */

const isDesktopEnv = (typeof process !== 'undefined' && process.versions && !!process.versions.electron);
let currentApiKey = "AIzaSyDWtm9wGj5mOYT1CIz2jugteKrJoMDUhiw"; 
let ipcRenderer = null;

if (isDesktopEnv) {
    try {
        ipcRenderer = require('electron').ipcRenderer;
        require('dotenv').config();
        currentApiKey = process.env.FIREBASE_API_KEY_DESKTOP || currentApiKey;
    } catch(e) { console.warn("Aviso: Ejecutando en entorno sin variables nativas completas."); }
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
    data: { u: [], p: [], c: [], a: [], ui: null, maint: null, info: null, shortcuts: null, s_top: null, s_recent: null, userScores: {} }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5, editIdx: null, profPage: 0, activeProfHandle: null, fastMode: false,
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    dbLocal: (k) => CT.data[k] || [], 
    
    init: function() {
        let storedUnit = localStorage.getItem('ct_unit_pref');
        if (storedUnit !== 'cpm' && storedUnit !== 'wpm' && storedUnit !== 'zen') { storedUnit = 'cpm'; localStorage.setItem('ct_unit_pref', 'cpm'); }
        this.currentUnit = storedUnit;
        document.documentElement.setAttribute('data-theme', this.currentUnit);

        this.fastMode = localStorage.getItem('ct_fast_mode') === 'true';
        UI.listLayout = localStorage.getItem('ct_layout') || 'layout-list';

        const cU = localStorage.getItem('ct_cache_u'); 
        const cP = localStorage.getItem('ct_cache_p'); const cC = localStorage.getItem('ct_cache_c');
        const cUi = localStorage.getItem('ct_cache_ui'); 
        
        if(cU) this.data.u = JSON.parse(cU); 
        if(cP) this.data.p = JSON.parse(cP); if(cC) this.data.c = JSON.parse(cC);
        if(cUi) { this.data.ui = JSON.parse(cUi); UI.applyUITexts(); }

        UI.updateUnitVisuals(this.currentUnit);
        UI.updateFastModeVisuals();
        UI.applySavedTheme();
        
        setTimeout(() => { if(UI.setLayout) UI.setLayout(UI.listLayout); }, 100);
        
        if (!isDesktopEnv) {
            const dlBtn = document.getElementById('btn-direct-download');
            if (dlBtn) dlBtn.classList.remove('hidden');
        }

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (!App.activeEngine) return;
            const sc = CT.data.shortcuts || { restart: 'Tab', next: 'Enter', quit: 'Escape' };
            if (e.key === sc.restart) { e.preventDefault(); App.retryRace(); }
            else if (e.key === sc.next) { e.preventDefault(); App.nextRace(); }
            else if (e.key === sc.quit) { e.preventDefault(); App.quitRace(); }
        });
        
        // PUENTE CANANSTUDIO MANTENIDO (Solo lectura)
        db.collection('config').doc('maintenance').onSnapshot(snap => {
            if(snap.exists) { this.data.maint = snap.data(); } else {
                this.data.maint = { active: false, icon: '🛠️', title: 'Mantenimiento', msg: 'Actualizando.', info: true, theme: true };
            }
            UI.checkMaintenance();
        });

        db.collection('config').doc('info_page').onSnapshot(snap => {
            if(snap.exists) { this.data.info = snap.data(); } else { this.data.info = { title: "Información", content: "Bienvenido a CananTyper." }; }
            UI.renderInfoPage();
        });

        db.collection('config').doc('shortcuts').onSnapshot(snap => {
            if(snap.exists) { this.data.shortcuts = snap.data(); } else { this.data.shortcuts = { restart: 'Tab', next: 'Enter', quit: 'Escape' }; }
        });

        if(this.ses()) { UI.initLobby(); } 
        else { UI.show('auth-screen'); updateDiscordStatus("En la pantalla de acceso", "Esperando credenciales...", false); }

        db.collection('users').onSnapshot(snap => { this.data.u = snap.docs.map(d => d.data()); localStorage.setItem('ct_cache_u', JSON.stringify(this.data.u)); UI.refreshActiveViews(); });
        
        App.loadDashboardData();

        db.collection('phrases').onSnapshot(snap => { 
            this.data.p = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p)); UI.refreshActiveViews(); 
        });
        db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_c', JSON.stringify(this.data.c)); UI.updateCategorySelects(); UI.renderTrainDropdown(); UI.refreshActiveViews(); 
        });
        db.collection('announcements').orderBy('id', 'desc').onSnapshot(snap => { this.data.a = snap.docs.map(d => d.data()); UI.checkAnnouncements(); UI.refreshActiveViews(); });

        db.collection('config').doc('ui_texts').onSnapshot(snap => {
            const defaults = {
                't_auth_title': { l: 'Título', v: 'CananTyper' }, 't_auth_sub': { l: 'Subtítulo', v: 'Mecanografía' },
                't_btn_login': { l: 'Login', v: 'Iniciar sesión' }, 't_btn_register': { l: 'Registro', v: 'CREAR CUENTA' },
                't_txt_new': { l: 'Nuevo', v: '¿Nuevo? Registrarse' }, 't_txt_haveacc': { l: 'Ya tengo', v: '¿Tenés cuenta? Inicia sesión' },
                't_btn_random': { l: 'Aleatorio', v: 'MODO ALEATORIO' }, 't_btn_custom': { l: 'Personalizado', v: 'PERSONALIZADO' },
                't_hd_rank_races': { l: 'R. Carreras', v: 'Ranking | Carreras' }, 't_hd_rank_avg': { l: 'R. Promedios', v: 'Ranking | Promedios' },
                't_hd_stats': { l: 'Estadísticas', v: 'Estadísticas' }, 't_hd_stats_sub': { l: 'Sub Est', v: 'Análisis de rendimiento' },
                't_hd_track': { l: 'Pista', v: 'Modo Personalizado' }, 't_hd_track_sub': { l: 'Sub Pista', v: 'Selecciona una categoría o texto' },
                't_st_box_top10': { l: 'Top 10', v: 'Mejores Carreras (TOP 10)' }, 't_btn_back': { l: 'J. Volver', v: 'Volver' }, 
                't_btn_retry': { l: 'J. Repetir', v: 'Repetir' }, 't_btn_new': { l: 'J. Nueva', v: 'Nueva' },
                't_btn_cont': { l: 'J. Cont', v: 'Continuar' }, 't_btn_retry2': { l: 'R. Repetir', v: 'Repetir' }, 't_btn_back2': { l: 'R. Volver', v: 'Volver' },
                't_prof_races': { l: 'P. Carreras', v: 'CARRERAS' }, 't_st_tab_pe': { l: 'Tab. Personales', v: 'Personales' }, 
                't_st_tab_ge': { l: 'Tab. Servidor', v: 'Servidor' }, 't_st_tab_el': { l: 'Tab. Élite', v: 'Élite' }, 't_lbl_st_avg': { l: 'Lbl Prom.', v: 'PROM.' }, 
                't_lbl_st_last': { l: 'Lbl Ult 10', v: 'ÚLT. 10' }, 't_lbl_st_best': { l: 'Lbl Récord', v: 'RÉCORD' }, 't_st_g_users': { l: 'Est. Usu. Regis.', v: 'USUARIOS REGISTRADOS' }, 
                't_st_g_races': { l: 'Est. Carr. Global', v: 'CARRERAS GLOBALES' }, 't_st_e_most': { l: 'Est. Más Carr.', v: 'MÁS CARRERAS' }, 
                't_st_e_top1': { l: 'Est. Más Top 1', v: 'MÁS VECES TOP 1' }, 
                't_game_time': { l: 'Juego. Tiempo', v: 'TIEMPO' }, 't_game_pb': { l: 'Juego. Record', v: '👑 ¡NUEVO RÉCORD PERSONAL!' }, 
                't_crop_title': { l: 'Recorte. Título', v: 'Ajusta tu foto' }, 't_crop_sub': { l: 'Recorte. Sub', v: 'Arrastra y usa el zoom.' }, 
                't_crop_btn_s': { l: 'Recorte. Guardar', v: 'Guardar' }, 't_crop_btn_c': { l: 'Recorte. Cancelar', v: 'Cancelar' }, 
                't_st_p_heat': { l: 'Est P. Teclado', v: 'MAPA DE CALOR: TECLAS CRÍTICAS' }, 't_st_p_worst_txt': { l: 'Est P. Peor Txt', v: 'Textos a Mejorar (Bottom 5)' }, 
                't_st_p_worst_wrd': { l: 'Est P. Peor Pal', v: 'Palabras Críticas (Top 30)' }, 'th_st_p_avg': { l: 'Est P. TH Prom', v: 'PROM.' }, 
                'th_st_p_err': { l: 'Est P. TH Err', v: 'ERRORES' }, 't_sett_full': { l: 'Aj. Pantalla', v: '⛶ Pantalla Completa' }, 
                't_sett_down': { l: 'Aj. Descarga', v: '⬇️ Descargar App (PC)' }, 't_sett_clear': { l: 'Aj. Cache', v: '🧹 Limpiar Caché Local' }, 
                't_prof_edit_n': { l: 'Prof. Edit Nom', v: 'Nombre' }, 't_prof_edit_i': { l: 'Prof. Edit Img', v: 'Imagen' }, 
                't_trk_search': { l: 'Pista Buscar', v: 'Buscar texto por ID o palabras...' }, 't_trk_back': { l: 'Pista Volver', v: '← Categorías' }, 
                't_lbl_st_p_best_avg': { l: 'Est P. Prom G.', v: 'PROM. GENERAL' }, 't_lbl_st_p_last10_avg': { l: 'Est P. Prom 10', v: 'PROM. ÚLT. 10' }, 
                't_lbl_st_p_best_cat': { l: 'Est P. Mejor Cat', v: 'MEJOR CATEGORÍA' }, 't_lbl_st_p_tot': { l: 'Est P. Totales', v: 'CARRERAS TOTALES' },
                't_btn_hardcore': { l: 'Btn Hardcore', v: 'HARDCORE 💀' }, 't_btn_train_menu': { l: 'Btn Entrenar', v: 'ENTRENAR 🏋️' },
                't_btn_tr_purge': { l: 'Btn Purgar', v: '🔥 Purgar Errores' }, 't_st_tab_hc': { l: 'Tab. Hardcore', v: 'Hardcore 💀' }, 
                't_lbl_hc_rec': { l: 'HC. Récord', v: 'RÉCORD HARDCORE' }, 't_lbl_hc_surv': { l: 'HC. Supervivencia', v: 'CARRERAS SUPERVIVIDAS' }, 
                't_lbl_hc_death': { l: 'HC. Muertes', v: 'MUERTES SÚBITAS' }, 't_lbl_hc_rate': { l: 'HC. Tasa', v: 'TASA DE MORTALIDAD' }, 
                't_hc_title_1': { l: 'HC. Tit Tabla 1', v: 'Mejores Sobrevividas (Top 10)' }, 't_hc_title_2': { l: 'HC. Tit Tabla 2', v: 'Pistas más Mortales (Top 10)' }, 
                't_trk_fav_filter': { l: 'Pista Favoritos', v: '⭐ Ver Favoritos' }, 't_game_dead_title': { l: 'Juego. Muerte', v: 'HAS MUERTO' }, 
                't_game_dead_sub': { l: 'Juego. Muerte Sub', v: 'Un error es letal en Hardcore.' }, 't_sett_fast': { l: 'Aj. Modo Rápido', v: '⚡ Modo Rápido:' },
                't_sett_fast_on': { l: 'Aj. Modo Ráp. SI', v: 'SI' }, 't_sett_fast_off': { l: 'Aj. Modo Ráp. NO', v: 'NO' },
                't_btn_pin_on': { l: 'Pista Fijado', v: '⭐' },
                't_btn_pin_off': { l: 'Pista Fijar', v: '☆' }, 't_theme_btn': { l: 'Aj. Tema Btn', v: '🎨 Personalizar' },
                't_theme_title': { l: 'Tema Título', v: 'Elegir Plantilla' }, 't_theme_save': { l: 'Tema Guardar', v: 'Aplicar' },
                't_lbl_st_top10_txt': { l: 'Est. TH Texto', v: 'Texto' },
                't_lbl_st_top10_num': { l: 'Est. TH Nro', v: 'N°' }, 
                't_lbl_st_p_heat_sub': { l: 'Mapa Calor Sub', v: 'Visualización de debilidades' }, 't_hd_rank_races_sub': { l: 'Rank Carreras Sub', v: 'Los más veloces del día' },
                't_hd_rank_avg_sub': { l: 'Rank Promedios Sub', v: 'Constancia y disciplina' }, 
                't_lbl_empty_hist': { l: 'Historial Vacío', v: 'Historial vacío' },
                't_lbl_ghost_run': { l: 'Estado Fantasma', v: 'Compitiendo contra Fantasma 👻' }, 't_lbl_game_over': { l: 'Estado Terminado', v: 'Carrera Terminada' },
                't_lbl_acc_del': { l: 'Cuenta Eliminar', v: 'Eliminar Cuenta' }, 't_lbl_cat_all': { l: 'Categoría Todas', v: 'Todas las Categorías' },
                't_st_box_w_trk': { l: 'Est Box Peor Txt', v: 'Textos a Mejorar (Bottom 5)' }, 't_st_box_w_wrd': { l: 'Est Box Peor Pal', v: 'Palabras Críticas (Top 30)' },
                't_hc_box_surv': { l: 'HC Box Sobrev', v: 'Mejores Sobrevividas (Top 10)' }, 't_hc_box_dead': { l: 'HC Box Muertes', v: 'Pistas más Mortales (Top 10)' },
                't_lbl_exit': { l: 'Btn Salir', v: 'SALIR' }, 
                't_lbl_theme_classic_g': { l: 'Tema Clasico Verde', v: 'Clásico (Verde)' },
                't_lbl_theme_classic_o': { l: 'Tema Clasico Naranja', v: 'Clásico (Naranja)' }, 't_lbl_theme_galactic': { l: 'Tema Galactico', v: 'Galáctico (Snoopy)' },
                't_lbl_theme_hacker': { l: 'Tema Hacker', v: 'Hacker Terminal' },
                't_game_lbl_time': { l: 'Game Lbl Tiempo', v: 'TIEMPO' },
                't_game_lbl_speed': { l: 'Game Lbl Velocidad', v: 'VELOCIDAD' }, 't_crop_lbl_zoom': { l: 'Crop Lbl Zoom', v: 'Zoom' },
                't_nav_logout_tt': { l: 'Nav Logout Tooltip', v: 'Cerrar Sesión' }, 't_nav_settings_tt': { l: 'Nav Settings Tooltip', v: 'Ajustes' }
            };
            
            if (!snap.exists && CT.data.ui && Object.keys(CT.data.ui).length > 0) return;

            CT.data.ui = CT.data.ui || {};
            const snapData = snap.exists ? snap.data() : {};
            
            Object.keys(defaults).forEach(k => {
                if (snapData[k] && typeof snapData[k] === 'object' && snapData[k].v !== undefined) {
                    CT.data.ui[k] = { l: snapData[k].l || defaults[k].l, v: snapData[k].v };
                } else if (typeof snapData[k] === 'string') {
                    CT.data.ui[k] = { l: defaults[k].l, v: snapData[k] };
                } else {
                    CT.data.ui[k] = { l: defaults[k].l, v: defaults[k].v };
                }
            });
            localStorage.setItem('ct_cache_ui', JSON.stringify(CT.data.ui));
            UI.applyUITexts(); UI.refreshActiveViews();
        });
    },
    ses: () => { const s = JSON.parse(localStorage.getItem('ct_ses')); return s ? (CT.data.u || []).find(x => x.h === s.h) : null; }
};

const App = {
    currentTrack: null, activeEngine: null,
    
    handleDragReorder: async (type, domOldIdx, domNewIdx, pageContext) => {
        if (type === 'favs') {
            const u = CT.ses(); if(!u) return;
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let favs = [...(userDoc.favs || [])];

            let actualOldIdx = (pageContext * 20) + domOldIdx;
            let actualNewIdx = (pageContext * 20) + domNewIdx;

            if(actualOldIdx < 0 || actualOldIdx >= favs.length || actualNewIdx < 0 || actualNewIdx >= favs.length) return;

            const [movedItem] = favs.splice(actualOldIdx, 1);
            favs.splice(actualNewIdx, 0, movedItem);

            userDoc.favs = favs;
            db.collection('users').doc(u.h).update({ favs: favs });
        }
    },

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
        
        UI.refreshActiveViews();
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

    editDisplayName: () => { const u = CT.ses(); if(!u) return; const newName = prompt("Nuevo nombre:", u.n); if(newName && newName.trim() !== '') { if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); db.collection('users').doc(u.h).update({ n: newName }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { n: newName }); }); batch.commit(); }); } },
    
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        
        if(!hInp || !p) return alert("Por favor, ingresa usuario y contraseña.");

        const btn = document.getElementById('t_btn_login');
        const originalText = btn.innerText;
        btn.innerText = "CONECTANDO...";
        btn.disabled = true;

        const cachedUser = CT.data.u.find(u => u.h === handle);
        if (cachedUser && cachedUser.p === p) {
            localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            UI.initLobby();
            btn.innerText = originalText;
            btn.disabled = false;
            return; 
        }

        const attemptLogin = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try { 
                    const docRef = await db.collection('users').doc(handle).get(); 
                    if(docRef.exists && docRef.data().p === p) { 
                        localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                        if(!CT.data.u.find(u => u.h === handle)) CT.data.u.push(docRef.data()); 
                        UI.initLobby(); 
                        return true;
                    } else { 
                        alert("Usuario o contraseña incorrectos"); 
                        return true; 
                    } 
                } catch(e) { 
                    if (i === retries - 1) throw e; 
                    await new Promise(r => setTimeout(r, 1000)); 
                }
            }
            return false;
        };

        try {
            const success = await attemptLogin();
            if(!success) throw new Error("Timeout");
        } catch(e) {
            console.error("Error en DB:", e); 
            btn.innerText = "REINTENTAR";
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
            return;
        }

        btn.innerText = originalText;
        btn.disabled = false;
    },

    register: async () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; if(!n || !hRaw || !p) return alert("Completa todos los campos"); if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); try { const docRef = await db.collection('users').doc(handle).get(); if(docRef.exists) return alert("Ese usuario ya está en uso"); const role = 'usuario'; const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [] }; await db.collection('users').doc(handle).set(newUser); UI.toggleAuth(true); alert("Cuenta creada con éxito."); } catch(e) { alert("Error al conectar con la Nube"); } },
    
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * UI.cropScale); const sH = (imgH * 220) / (viewerImgH * UI.cropScale); const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale)); const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ a: compressedBase64 }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } UI.closeCropModal(); },

    toggleFav: (idStr) => {
        const u = CT.ses(); if(!u) return;
        let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];
        if (favs.includes(idStr.toString())) { favs = favs.filter(f => f !== idStr.toString()); } 
        else { favs.push(idStr.toString()); }
        userDoc.favs = favs; 
        db.collection('users').doc(u.h).update({ favs: favs });
        UI.renderTrackList(); 
    },

    saveTheme: (themeName) => {
        let themeObj;
        if (themeName === 'galactic') { themeObj = { p: '#b388ff', bg: '#090a0f', surface: '#161824' }; }
        else if (themeName === 'hacker') { themeObj = { p: '#00ff00', bg: '#050505', surface: '#0a0a0a' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: themeObj }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },

    handleUpdateClick: () => { const btn = document.getElementById('btn-update-status'); if (btn.innerText.includes("APLICAR")) { if(ipcRenderer) ipcRenderer.send('apply-update'); } },
    toggleFullscreen: () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => console.warn(err)); } else { if (document.exitFullscreen) document.exitFullscreen(); } UI.toggleSettings(); },
    
    downloadSetup: () => {
        const directUrl = 'https://github.com/CananTyper/CananTyper/releases/latest/download/CananTyper_Setup.exe';
        const link = document.createElement('a'); link.href = directUrl; link.download = 'CananTyper_Setup.exe';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); UI.toggleSettings();
    },

    clearCache: () => {
        if(confirm("¿Seguro que deseas limpiar la caché local? Se volverán a descargar los textos y usuarios de la nube.")) {
            localStorage.removeItem('ct_cache_u'); localStorage.removeItem('ct_cache_s');
            localStorage.removeItem('ct_cache_p'); localStorage.removeItem('ct_cache_c');
            localStorage.removeItem('ct_cache_ui');
            location.reload();
        }
    }
};
