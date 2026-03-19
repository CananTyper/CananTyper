/* ================================================================
   CANANTYPER - CORE FRONTEND (HÍBRIDO WEB/ESCRITORIO)
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
    data: { u: [], p: [], c: [], a: [], ui: null, maint: null, info: null, shortcuts: null, s_top: null, s_recent: null, userScores: {}, adminScores: [] }, 
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
        
        db.collection('config').doc('maintenance').onSnapshot(snap => {
            if(snap.exists) { this.data.maint = snap.data(); } else {
                this.data.maint = { active: false, icon: '🛠️', title: 'Mantenimiento', msg: 'Actualizando.', info: true, theme: true };
                if(this.ses() && this.ses().r === 'admin') db.collection('config').doc('maintenance').set(this.data.maint);
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
            if(this.data.p.length === 0) { db.collection('phrases').doc("1").set({ id: 1, title: "1", c: "General", text: "La programación es un arte.", order: Date.now() }); }
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p)); UI.refreshActiveViews(); 
        });
        db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            if(this.data.c.length === 0) { db.collection('categories').doc("General").set({name: "General", order: Date.now()}); }
            localStorage.setItem('ct_cache_c', JSON.stringify(this.data.c)); UI.renderTrainDropdown(); UI.refreshActiveViews(); 
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
                't_game_lbl_speed': { l: 'Game Lbl Velocidad', v: 'VELOCIDAD' }, 't_crop_lbl_zoom': { l: 'Crop Lbl Zoom', v: 'Zoom' }
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

const UI = {
    listLayout: 'layout-list',
    trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null,
    
    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

    initSortable: (containerId, type, pageContext = 0) => {
        if (typeof Sortable === 'undefined') return;
        const container = document.getElementById(containerId);
        if (!container) return;
        if (container._sortable) { container._sortable.destroy(); container._sortable = null; }

        if (type === 'track' && !UI.filterFavs) return;

        container._sortable = Sortable.create(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex === evt.newIndex) return;
                App.handleDragReorder(type === 'track' ? 'favs' : type, evt.oldIndex, evt.newIndex, pageContext);
            }
        });
    },

    setLayout: (mode) => {
        UI.listLayout = mode;
        localStorage.setItem('ct_layout', mode);
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.style.borderColor = 'var(--p)';
                btn.style.color = 'var(--p)';
                btn.style.boxShadow = '0 0 10px color-mix(in srgb, var(--p) 20%, transparent)';
            } else {
                btn.style.borderColor = 'var(--border)';
                btn.style.color = 'var(--text-muted)';
                btn.style.boxShadow = 'none';
            }
        });
        UI.refreshActiveViews();
    },

    checkMaintenance: () => {
        const m = CT.data.maint || { active: false, info: true, theme: true };
        const u = CT.ses(); const isAdmin = u && u.r === 'admin';
        
        if(m.active && !isAdmin) {
            document.getElementById('maint-icon-display').innerText = m.icon || '🛠️';
            document.getElementById('maint-title-display').innerText = m.title || 'Mantenimiento';
            document.getElementById('maint-msg-display').innerText = m.msg || 'Volvemos pronto.';
            UI.show('maintenance-screen');
        } else {
            if(!document.getElementById('maintenance-screen').classList.contains('hidden')) { if(u) UI.showLobby(); else UI.show('auth-screen'); }
        }
        
        const infoEnabled = m.info !== false;
        const themeEnabled = m.theme !== false;

        const navInfoBtn = document.getElementById('btn-nav-info');
        if(navInfoBtn) {
            if(!infoEnabled && !isAdmin) navInfoBtn.classList.add('hidden');
            else navInfoBtn.classList.remove('hidden');
        }

        const themeBtn = document.getElementById('t_theme_btn');
        if(themeBtn) {
            if(!themeEnabled && !isAdmin) themeBtn.classList.add('hidden');
            else themeBtn.classList.remove('hidden');
        }
    },
    
    show: (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    toggleAuth: (login) => { document.getElementById('login-form').classList.toggle('hidden', !login); document.getElementById('register-form').classList.toggle('hidden', login); },
    
    initLobby() {
        if(CT.data.maint && CT.data.maint.active) { const u = CT.ses(); if(!u || u.r !== 'admin') { UI.checkMaintenance(); return; } }
        const u = CT.ses(); if(!u) return this.show('auth-screen');

        updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);

        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || CT.defAvatar;
        
        UI.updateUnitVisuals(CT.currentUnit); 
        this.renderGlobal(); 
        UI.renderTrainDropdown();
        this.show('home-screen');
        UI.checkAnnouncements(); 
    },

    showLobby() { this.initLobby(); },
    
    async showStats() { 
        const u = CT.ses();
        if(u) await App.getUserScores(u.h); 
        this.switchStatsTab('personal'); 
        UI.updateUnitVisuals(CT.currentUnit); 
        this.show('stats-screen'); 
    },
    
    showInfo() { this.renderInfoPage(); this.show('info-screen'); },

    switchStatsTab(tab) {
        document.querySelectorAll('.pane').forEach(p => { if(p.id.startsWith('pane-stats')) p.classList.add('hidden') });
        document.querySelectorAll('.tab-btn').forEach(b => { if(b.id.startsWith('t-st-')) b.classList.remove('active') });
        document.getElementById(`pane-stats-${tab}`).classList.remove('hidden');
        const activeBtn = document.getElementById(`t-st-${tab.substring(0,2)}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        if (tab === 'personal') this.renderPersonalStats(); 
        else if (tab === 'general') this.renderGlobalStats(); 
        else if (tab === 'elite') this.renderEliteStats();
        else if (tab === 'hc') this.renderHardcoreStats();
    },
    
    applyUITexts: () => {
        if(!CT.data.ui) return;
        Object.keys(CT.data.ui).forEach(k => {
            const el = document.getElementById(k);
            if(el) {
                if(k === 't_txt_new') { el.innerHTML = CT.data.ui[k].v.replace('Registrarse', '<span onclick="UI.toggleAuth(false)">Registrarse</span>'); }
                else if(k === 't_txt_haveacc') { el.innerHTML = CT.data.ui[k].v.replace('Inicia sesión', '<span onclick="UI.toggleAuth(true)">Inicia sesión</span>'); }
                else if(['t_sett_fast', 't_sett_fast_on', 't_sett_fast_off', 't_btn_pin_on', 't_btn_pin_off'].includes(k)) { }
                else if(el.tagName === 'INPUT' && el.type === 'text') { el.placeholder = CT.data.ui[k].v; }
                else { el.innerText = CT.data.ui[k].v; }
            }
        });
    },

    renderPersonalStats() {
        const u = CT.ses(); if(!u) return;
        const userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const userScores = (CT.data.userScores[u.h] || []).filter(s => !s.hc); 
        
        document.querySelectorAll('.st-p-owner').forEach(el => el.innerText = userDoc.n);
        document.getElementById('st-p-total-races').innerText = userScores.length;
        
        const avgGen = userScores.length ? Math.round(userScores.reduce((a,b)=>a+b.c, 0) / userScores.length) : 0;
        document.getElementById('st-p-best-avg').innerText = UI.formatValue(avgGen);
        const last10Arr = [...userScores].sort((a,b)=>b.id - a.id).slice(0, 10);
        const avgLast10 = last10Arr.length ? Math.round(last10Arr.reduce((a,b)=>a+b.c, 0) / last10Arr.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = UI.formatValue(avgLast10);
        
        const phrases = CT.dbLocal('p'); let catAvgs = {};
        userScores.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 }; catAvgs[cat].sum += s.c; catAvgs[cat].count++; });
        let bestCat = "-"; let maxCatAvg = -1;
        for (let c in catAvgs) { let avg = catAvgs[c].sum / catAvgs[c].count; if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; } }
        document.getElementById('st-p-best-cat').innerText = bestCat;

        const bk = userDoc.bad_keys || {};
        const maxErr = Math.max(...Object.values(bk), 1); 
        document.querySelectorAll('kbd[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            const errs = bk[key] || 0;
            if(errs > 0) {
                const pct = (errs / maxErr) * 100;
                const bgPct = Math.max(10, Math.min(pct, 60)); 
                el.style.setProperty('background', `color-mix(in srgb, var(--error) ${bgPct}%, var(--surface-light))`, 'important');
                el.style.setProperty('border-color', 'var(--error)', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.style.setProperty('text-shadow', '0px 0px 4px rgba(0,0,0,0.8)', 'important');
                el.title = `${errs} errores históricos`;
            } else {
                el.style.removeProperty('background');
                el.style.removeProperty('border-color');
                el.style.removeProperty('color');
                el.style.removeProperty('text-shadow');
                el.title = '0 errores';
            }
        });

        const top10 = [...userScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-p-top10-races').innerHTML = top10.map((s, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');

        let trackAvgs = {};
        userScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
        let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
        let bottom5 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg).slice(0, 5);
        if(bottom5.length === 0) bottom5 = trackList.sort((a,b) => a.avg - b.avg).slice(0, 5);
        document.getElementById('st-p-worst-tracks').innerHTML = bottom5.map((tr, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.t}</div></td><td><b class="val-blurrable">${UI.formatValue(Math.round(tr.avg))}</b></td></tr>`).join('');

        const bw = userDoc.bad_words || {};
        let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 30);
        document.getElementById('st-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<tr><td><b>#${i+1}</b></td><td>${bwItem.w}</td><td><b>${bwItem.errs}</b></td></tr>`).join('');
    },

    renderHardcoreStats() {
        const u = CT.ses(); if(!u) return;
        const userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const hcScores = (CT.data.userScores[u.h] || []).filter(s => s.hc === true);
        
        const survCount = hcScores.length;
        const deaths = userDoc.hc_deaths || 0;
        const totalAttempts = survCount + deaths;
        const survRate = totalAttempts > 0 ? Math.round((deaths / totalAttempts) * 100) : 0;
        
        document.getElementById('st-hc-record').innerText = UI.formatValue(userDoc.hi_hc && userDoc.hi_hc.length > 0 ? Math.max(...userDoc.hi_hc) : 0);
        document.getElementById('st-hc-surv').innerText = survCount;
        document.getElementById('st-hc-deaths').innerText = deaths;
        document.getElementById('st-hc-rate').innerText = survRate + '%';

        const top10 = [...hcScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-hc-top10').innerHTML = top10.map((s, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');
        
        let trackDeaths = userDoc.hc_track_deaths || {};
        let deathList = Object.keys(trackDeaths).map(k => ({ t: k, d: trackDeaths[k] })).sort((a,b) => b.d - a.d).slice(0, 10);
        document.getElementById('st-hc-worst').innerHTML = deathList.map((td, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${td.t}</div></td><td><b>${td.d}</b></td></tr>`).join('');
    },

    renderGlobalStats() {
        const users = CT.dbLocal('u');
        document.getElementById('st-g-users-val').innerText = users.length; 
        
        let totalRaces = 0; let totalSum = 0; let globalMax = 0;
        users.forEach(u => {
            totalRaces += (u.hi || []).length;
            totalSum += (u.hi || []).reduce((a,b)=>a+b, 0);
            let uMax = Math.max(...(u.hi || [0]), 0);
            if(uMax > globalMax) globalMax = uMax;
        });
        
        document.getElementById('st-g-races-val').innerText = totalRaces;
        document.getElementById('st-g-avg').innerText = UI.formatValue(totalRaces ? Math.round(totalSum/totalRaces) : 0);
        document.getElementById('st-g-record').innerText = UI.formatValue(globalMax);
        
        let textCounts = {}; (CT.data.s_recent || []).forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
        const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-texts').innerHTML = topTexts.map((tr, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tr.t}</td><td>${tr.count}</td></tr>`).join('');
        
        const phrases = CT.dbLocal('p'); let catCounts = {}; 
        (CT.data.s_recent || []).forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-cats').innerHTML = topCats.map((tc, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tc.c}</td><td>${tc.count}</td></tr>`).join('');
    },

    renderEliteStats() {
        const users = CT.dbLocal('u'); if (users.length === 0) return;
        
        let mostRacesUser = users.reduce((p, c) => ((c.hi||[]).length > (p.hi||[]).length) ? c : p, users[0]);
        document.getElementById('st-e-most-races-val').innerText = (mostRacesUser.hi||[]).length;
        document.getElementById('st-e-most-races-user').innerText = mostRacesUser.n || "-";

        let recordUser = users.reduce((p, c) => {
            let maxC = Math.max(...(c.hi||[0]), 0);
            let maxP = Math.max(...(p.hi||[0]), 0);
            return maxC > maxP ? c : p;
        }, users[0]);
        document.getElementById('st-e-record-val').innerText = UI.formatValue(Math.max(...(recordUser.hi||[0]), 0));
        document.getElementById('st-e-record-user').innerText = recordUser.n || "-";

        let avgUser = users.reduce((p, c) => {
            let avgC = (c.hi||[]).length >= 5 ? (c.hi.reduce((a,b)=>a+b,0)/(c.hi.length)) : 0;
            let avgP = (p.hi||[]).length >= 5 ? (p.hi.reduce((a,b)=>a+b,0)/(p.hi.length)) : 0;
            return avgC > avgP ? c : p;
        }, users[0]);
        let bestAvg = (avgUser.hi||[]).length ? (avgUser.hi.reduce((a,b)=>a+b,0)/(avgUser.hi.length)) : 0;
        document.getElementById('st-e-bestavg-val').innerText = UI.formatValue(Math.round(bestAvg));
        document.getElementById('st-e-bestavg-user').innerText = avgUser.n || "-";

        const topS = CT.data.s_top || [];
        let tm = {}; topS.forEach(s => { if(!tm[s.track] || s.c > tm[s.track].c) tm[s.track] = s; });
        let top1c = {}; Object.values(tm).forEach(s => { top1c[s.h] = (top1c[s.h]||0)+1; });
        let mTop1h = Object.keys(top1c).reduce((a,b) => top1c[a] > top1c[b] ? a : b, "");
        let mTop1Name = mTop1h ? (users.find(u=>u.h===mTop1h)||{n:"-"}).n : "-";
        document.getElementById('st-e-top1-val').innerText = mTop1h ? top1c[mTop1h] : 0;
        document.getElementById('st-e-top1-user').innerText = mTop1Name;
        
        let tCounts = {}; topS.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; }); let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-texts').innerHTML = top10T.map((tr, i) => { let trMax = topS.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0}); return `<tr><td><b>#${i+1}</b></td><td>${tr}</td><td>${trMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(trMax.c)}</b></td></tr>`; }).join('');
        
        const phrases = CT.dbLocal('p');
        let scoresWithCat = topS.map(s => { let tObj = phrases.find(p => p.title.toString() === s.track.toString()); return { ...s, cat: tObj ? (tObj.c || 'General') : 'General' }; });
        let cCounts = {}; scoresWithCat.forEach(s => { cCounts[s.cat] = (cCounts[s.cat] || 0) + 1; }); let top10C = Object.keys(cCounts).sort((a,b) => cCounts[b] - cCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-cats').innerHTML = top10C.map((cat, i) => { let catMax = scoresWithCat.filter(s => s.cat === cat).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0}); return `<tr><td><b>#${i+1}</b></td><td>${cat}</td><td>${catMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(catMax.c)}</b></td></tr>`; }).join('');
    },

    renderInfoPage() {
        if(!CT.data.info) return;
        document.getElementById('info-display-title').innerText = CT.data.info.title || "Información";
        document.getElementById('info-display-content').innerHTML = CT.data.info.content || "";
    },

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; 
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
        if(!document.getElementById('track-screen').classList.contains('hidden')) { if(UI.activeTrackCat || UI.filterFavs) UI.renderTrackList(); else UI.showTrackCategorySelect(); }
        if(!document.getElementById('stats-screen').classList.contains('hidden')) { if(!document.getElementById('pane-stats-personal').classList.contains('hidden')) UI.renderPersonalStats(); else if(!document.getElementById('pane-stats-general').classList.contains('hidden')) UI.renderGlobalStats(); else if(!document.getElementById('pane-stats-elite').classList.contains('hidden')) UI.renderEliteStats(); else UI.renderHardcoreStats(); }
    },

    setUnit: (unit) => {
        if(CT.currentUnit === unit) return;
        localStorage.removeItem('ct_custom_theme');
        try { const u = CT.ses(); if(u && u.theme) { db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); } } catch(e){}
        document.documentElement.removeAttribute('data-custom-theme');

        CT.currentUnit = unit; localStorage.setItem('ct_unit_pref', unit); 
        UI.updateUnitVisuals(unit); 
        UI.refreshActiveViews();
    },

    updateUnitVisuals: (unit) => {
        document.documentElement.setAttribute('data-theme', unit);
        document.querySelectorAll('.unit-switcher .sw-btn').forEach(s => s.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${unit}`); if(activeBtn) activeBtn.classList.add('active');
        
        const label = unit === 'zen' ? 'ZEN' : unit.toUpperCase();
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-st-p-vel', 'th-st-p-t-max', 'th-st-e-t-vel', 'th-st-e-c-vel', 'th_st_p_top10_vel'];
        thIds.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).innerText = 'VEL. (' + label + ')'; document.getElementById(id).classList.add('active-unit'); } });
        
        if(document.getElementById('th-unit-rank')) document.getElementById('th-unit-rank').innerText = 'PROMEDIO ' + label;
        if(document.getElementById('lbl-st-avg')) document.getElementById('lbl-st-avg').innerText = 'PROM. ' + label;
        if(document.getElementById('lbl-st-last')) document.getElementById('lbl-st-last').innerText = 'ÚLT. 10 ' + label;
        if(document.getElementById('lbl-st-best')) document.getElementById('lbl-st-best').innerText = 'RÉCORD ' + label;
        if(document.getElementById('t_lbl_st_p_best_avg')) document.getElementById('t_lbl_st_p_best_avg').innerText = 'PROM. GENERAL ' + label;
        if(document.getElementById('t_lbl_st_p_last10_avg')) document.getElementById('t_lbl_st_p_last10_avg').innerText = 'PROM. ÚLT. 10 ' + label;
        if(document.getElementById('lbl-st-g-avg')) document.getElementById('lbl-st-g-avg').innerText = 'PROMEDIO SERVIDOR ' + label;
        if(document.getElementById('lbl-st-g-record')) document.getElementById('lbl-st-g-record').innerText = 'RÉCORD ABSOLUTO ' + label;
        if(document.getElementById('game-unit-label')) document.getElementById('game-unit-label').innerText = label;
    },

    updateFastModeVisuals: () => {
        const textLabel = CT.data.ui && CT.data.ui['t_sett_fast'] ? CT.data.ui['t_sett_fast'].v : '⚡ Modo Rápido:';
        const onVal = CT.data.ui && CT.data.ui['t_sett_fast_on'] ? CT.data.ui['t_sett_fast_on'].v : 'SI';
        const offVal = CT.data.ui && CT.data.ui['t_sett_fast_off'] ? CT.data.ui['t_sett_fast_off'].v : 'NO';
        const btn = document.getElementById('btn-fast-mode');
        if(btn) btn.innerText = `${textLabel} ${CT.fastMode ? onVal : offVal}`;
    },

    toggleFastMode: () => {
        CT.fastMode = !CT.fastMode;
        localStorage.setItem('ct_fast_mode', CT.fastMode);
        UI.updateFastModeVisuals();
    },

    renderTrainDropdown() {
        const tPurge = CT.data.ui && CT.data.ui['t_btn_tr_purge'] ? CT.data.ui['t_btn_tr_purge'].v : '🔥 Purgar Errores';
        let html = `<button onclick="App.startPurge()">${tPurge}</button>`;
        const trnCats = CT.dbLocal('c').filter(c => c.name.startsWith('[TRN]'));
        trnCats.sort((a,b) => (a.order||0) - (b.order||0)).forEach(c => {
            const cleanName = c.name.replace('[TRN] ', '');
            html += `<button onclick="App.startTrnCategory('${c.name}')">⚡ ${cleanName}</button>`;
        });
        const drp = document.getElementById('train-dropdown');
        if(drp) drp.innerHTML = html;
    },

    renderGlobal() {
        const todayAR = CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        // Restaurado filtro original
        let filteredScores = typeEl.value === 'today' ? (CT.data.s_recent || []).filter(s => !s.hc && s.d === todayAR) : (CT.data.s_top || []).filter(s => !s.hc);
        let limitTimes = typeEl.value === 'today' ? 10 : 20; 
        filteredScores.sort((a,b) => b.c - a.c);
        
        document.getElementById('global-rank-times').innerHTML = filteredScores.slice(0, limitTimes).map((s, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td>
                <td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width:100px;">${s.track}</span>
                    <button class="ghost-btn" onclick="App.startGhostRace('${s.track}', ${s.c})" title="Competir contra el Fantasma">👻</button>
                </div></td>
            </tr>`;
        }).join('');

        const rankingMode = rankTypeEl.value;
        const users = CT.dbLocal('u');
        let playerStats = users.map(u => {
            const history = u.hi || []; 
            let averageCPM = (rankingMode === 'last10') ? (history.slice(-10).length ? Math.round(history.slice(-10).reduce((a,b)=>a+b)/history.slice(-10).length) : 0) : (history.length ? Math.round(history.reduce((a,b)=>a+b)/history.length) : 0);
            return { n: u.n, a: u.a, h: u.h, avgCPM: averageCPM, total: history.length };
        }).filter(u => u.total > 0).sort((a,b) => b.avgCPM - a.avgCPM);

        document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td>
            </tr>`;
        }).join('');
    },

    async showProfile(who) {
        try {
            const currentSes = CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            const u = CT.dbLocal('u').find(x => x.h === targetHandle); if(!u) return;
            CT.activeProfHandle = u.h;
            
            await App.getUserScores(u.h);
            
            document.getElementById('prof-name').innerText = u.n; document.getElementById('prof-img').src = u.a || CT.defAvatar; document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            const hi = u.hi || []; const total = hi.length; document.getElementById('st-total').innerText = total;
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10); const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;
            document.getElementById('st-avg').innerText = UI.formatValue(avgCPM); document.getElementById('st-last-10').innerText = UI.formatValue(avg10CPM); document.getElementById('st-best').innerText = UI.formatValue(bestCPM);
            CT.profPage = 0; this.renderProfileHistory();
            const isMe = (currentSes && u.h === currentSes.h);
            document.getElementById('btn-open-edit').classList.toggle('hidden', !isMe); document.getElementById('edit-dropdown').classList.add('hidden');
            this.show('profile-screen');
        } catch (error) { console.error(error); }
    },
    
    toggleEditMenu: () => { document.getElementById('edit-dropdown').classList.toggle('hidden'); },
    toggleSettings: () => { document.getElementById('settings-dropdown').classList.toggle('hidden'); const dot = document.getElementById('update-dot'); if (dot && dot.classList.contains('dot-yellow')) dot.classList.add('hidden'); },
    toggleTrainMenu: () => { document.getElementById('train-dropdown').classList.toggle('hidden'); },
    
    openThemeBuilder: () => { document.getElementById('theme-modal').classList.remove('hidden'); UI.toggleSettings(); },
    closeThemeModal: () => { document.getElementById('theme-modal').classList.add('hidden'); },

    applySavedTheme: () => {
        const customTheme = localStorage.getItem('ct_custom_theme');
        if (customTheme) {
            const t = JSON.parse(customTheme);
            document.documentElement.setAttribute('data-custom-theme', 'true');
            document.documentElement.style.setProperty('--theme-custom', t.p);
            document.documentElement.style.setProperty('--bg-custom', t.bg);
            document.documentElement.style.setProperty('--surface-custom', t.surface);
        } else {
            document.documentElement.removeAttribute('data-custom-theme');
        }
    },

    renderProfileHistory() {
        const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="App.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc); const nextStart = (CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { CT.profPage += delta; this.renderProfileHistory(); } },

    checkAnnouncements: () => {
        const anns = CT.dbLocal('a').filter(x => x.active);
        if (anns.length > 0) {
            const latest = anns[0];
            const lastSeen = localStorage.getItem('ct_last_announcement');
            if (latest.id.toString() !== lastSeen) {
                UI.showAnnouncement(latest);
            }
        }
    },

    showAnnouncement(data) { if(!data.id) return; UI.currentAnnId = data.id.toString(); document.getElementById('motd-icon').innerText = data.icon || "🚀"; document.getElementById('motd-title').innerText = data.title || "Anuncio"; document.getElementById('motd-msg').innerHTML = data.msg || ""; document.getElementById('announcement-modal').classList.remove('hidden'); },
    closeAnnouncement() { if(UI.currentAnnId) { localStorage.setItem('ct_last_announcement', UI.currentAnnId); } document.getElementById('announcement-modal').classList.add('hidden'); },

    showTrackSelect() { document.getElementById('track-search').value = ''; UI.activeTrackCat = null; UI.filterFavs = false; UI.showTrackCategorySelect(); this.show('track-screen'); },
    showTrackCategorySelect() {
        document.getElementById('track-list-view').classList.add('hidden'); document.getElementById('track-category-view').classList.remove('hidden');
        const tracks = CT.dbLocal('p'); let cats = CT.dbLocal('c'); let catCounts = {}; 
        tracks.forEach(t => { const c = (t.c || 'General').trim(); catCounts[c] = (catCounts[c] || 0) + 1; });
        cats = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).sort((a,b) => (a.order || 0) - (b.order || 0));

        let t_fav = CT.data.ui && CT.data.ui['t_trk_fav_filter'] ? CT.data.ui['t_trk_fav_filter'].v : '⭐ Ver Favoritos';
        let html = `<div class="cat-card cat-fav-card" onclick="UI.toggleFavFilter()"><h3><span>${t_fav}</span></h3><span style="color:var(--text-main)">Textos favoritos</span></div>`;
        html += cats.map(cat => `<div class="cat-card" onclick="UI.selectTrackCategory('${cat.name}')"><h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span></div>`).join('');
        document.getElementById('track-category-view').innerHTML = html;
    },
    toggleFavFilter() { UI.filterFavs = true; UI.activeTrackCat = null; UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); UI.renderTrackList(); },
    selectTrackCategory(cat) { UI.activeTrackCat = cat; UI.filterFavs = false; UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); UI.renderTrackList(); },
    
    renderTrackList() {
        const query = (document.getElementById('track-search').value || "").toLowerCase(); let tracks = CT.dbLocal('p');
        const u = CT.ses(); let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];

        const listContainer = document.getElementById('track-list-full');
        listContainer.className = 'custom-scroll track-list ' + UI.listLayout;
        
        if (UI.filterFavs) listContainer.classList.add('fav-scroll');
        else listContainer.classList.remove('fav-scroll');

        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
        } else if (UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString()));
            filtered.sort((a,b) => favs.indexOf(a.id.toString()) - favs.indexOf(b.id.toString()));
        } else if (!UI.activeTrackCat) {
            UI.showTrackCategorySelect(); return;
        } else {
            filtered = tracks.filter(t => (t.c || 'General').trim() === UI.activeTrackCat.trim()); 
            filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0));
        }

        let textPinOn = CT.data.ui && CT.data.ui['t_btn_pin_on'] ? CT.data.ui['t_btn_pin_on'].v : '⭐';
        let textPinOff = CT.data.ui && CT.data.ui['t_btn_pin_off'] ? CT.data.ui['t_btn_pin_off'].v : '☆';

        const start = UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
        listContainer.innerHTML = pageData.map(t => {
            let isFav = favs.includes(t.id.toString());
            let starClass = isFav ? 'fav-active' : 'fav-inactive';
            
            let reorderFavHtml = (UI.filterFavs && !query) ? `<span class="drag-handle" style="cursor:grab; font-size:1.5rem; color:#ffd700; margin-top:5px; display:inline-block;" title="Arrastrar para ordenar" onclick="event.stopPropagation()">⠿</span>` : '';
            let cardStyle = isFav ? `border-color: color-mix(in srgb, #ffd700 50%, transparent); box-shadow: 0 5px 15px color-mix(in srgb, #ffd700 10%, transparent);` : ``;
            let idColorStyle = isFav ? `color: #ffd700; text-shadow: 0 0 10px color-mix(in srgb, #ffd700 30%, transparent);` : `color: var(--p);`;

            return `<div class="track-card" onclick="App.startRaceWithTrack('${t.id}')" style="${cardStyle}">
                <div class="track-card-id" style="display:flex; flex-direction:column; gap:10px; ${idColorStyle}">
                    #${t.title}
                    <button onclick="event.stopPropagation(); App.toggleFav('${t.id}')" class="fav-star-btn ${starClass}">${isFav ? textPinOn : textPinOff}</button>
                    ${reorderFavHtml}
                </div>
                <div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${(t.c || 'General').trim()}]</span></div>
            </div>`;
        }).join('');
        document.getElementById('track-prev').disabled = UI.trackPage === 0; document.getElementById('track-next').disabled = (start + 20) >= filtered.length; document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
        
        setTimeout(() => {
            if (UI.filterFavs && !query) UI.initSortable('track-list-full', 'track', UI.trackPage);
            else { const c = document.getElementById('track-list-full'); if (c && c._sortable) { c._sortable.destroy(); c._sortable = null; } }
        }, 50);
    },
    changeTrackPage(delta) { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = CT.dbLocal('p'); const u = CT.ses(); let favs = (CT.dbLocal('u').find(x => x.h === u.h) || u).favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General').trim() === UI.activeTrackCat.trim()); } const nextStart = (UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.trackPage += delta; this.renderTrackList(); } },

    openCropModal(src) { const img = document.getElementById('crop-image'); img.src = src; img.onload = () => { UI.cropScale = 1; UI.cropX = 0; UI.cropY = 0; document.getElementById('crop-zoom').value = 1; const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight; if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); UI.setupCropEvents(); }; },
    closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform() { const img = document.getElementById('crop-image'); img.style.transform = `translate(-50%, -50%) translate(${UI.cropX}px, ${UI.cropY}px) scale(${UI.cropScale})`; img.style.left = '50%'; img.style.top = '50%'; },
    setupCropEvents() { const area = document.getElementById('crop-area'); const startDrag = (e) => { UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.startX = cx - UI.cropX; UI.startY = cy - UI.cropY; }; const moveDrag = (e) => { if(!UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.cropX = cx - UI.startX; UI.cropY = cy - UI.startY; UI.updateCropTransform(); }; const endDrag = () => { UI.isDragging = false; }; area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; document.getElementById('crop-zoom').oninput = (e) => { UI.cropScale = e.target.value; UI.updateCropTransform(); }; }
};
