/* ================================================================
   CANANTYPER - CORE MÓDULO
   Maneja Autenticación, Firebase, y Estado del Jugador.
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
    currentUnit: 'cpm', charPerWord: 5, profPage: 0, activeProfHandle: null, fastMode: false,
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
                't_st_tab_el': { l: 'Tab. Élite', v: 'Élite' }, 't_lbl_st_avg': { l: 'Lbl Prom.', v: 'PROM.' }, 
                't_lbl_st_last': { l: 'Lbl Ult 10', v: 'ÚLT. 10' }, 't_lbl_st_best': { l: 'Lbl Récord', v: 'RÉCORD' }, 
                't_st_e_most': { l: 'Est. Más Carr.', v: 'MÁS CARRERAS' }, 't_st_e_top1': { l: 'Est. Más Top 1', v: 'MÁS VECES TOP 1' }, 
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
                't_btn_pin_on': { l: 'Pista Fijado', v: '⭐' }, 't_btn_pin_off': { l: 'Pista Fijar', v: '☆' }, 't_theme_btn': { l: 'Aj. Tema Btn', v: '🎨 Personalizar' },
                't_theme_title': { l: 'Tema Título', v: 'Elegir Plantilla' }, 't_theme_save': { l: 'Tema Guardar', v: 'Aplicar' },
                't_lbl_st_top10_txt': { l: 'Est. TH Texto', v: 'Texto' }, 't_lbl_st_top10_num': { l: 'Est. TH Nro', v: 'N°' }, 
                't_lbl_st_p_heat_sub': { l: 'Mapa Calor Sub', v: 'Visualización de debilidades' }, 't_hd_rank_races_sub': { l: 'Rank Carreras Sub', v: 'Los más veloces del día' },
                't_hd_rank_avg_sub': { l: 'Rank Promedios Sub', v: 'Constancia y disciplina' }, 't_lbl_empty_hist': { l: 'Historial Vacío', v: 'Historial vacío' },
                't_lbl_ghost_run': { l: 'Estado Fantasma', v: 'Compitiendo contra Fantasma 👻' }, 't_lbl_game_over': { l: 'Estado Terminado', v: 'Carrera Terminada' },
                't_st_box_w_trk': { l: 'Est Box Peor Txt', v: 'Textos a Mejorar (Bottom 5)' }, 't_st_box_w_wrd': { l: 'Est Box Peor Pal', v: 'Palabras Críticas (Top 30)' },
                't_hc_box_surv': { l: 'HC Box Sobrev', v: 'Mejores Sobrevividas (Top 10)' }, 't_hc_box_dead': { l: 'HC Box Muertes', v: 'Pistas más Mortales (Top 10)' },
                't_lbl_exit': { l: 'Btn Salir', v: 'SALIR' }, 't_lbl_theme_classic_g': { l: 'Tema Clasico Verde', v: 'Clásico (Verde)' },
                't_lbl_theme_classic_o': { l: 'Tema Clasico Naranja', v: 'Clásico (Naranja)' }, 't_lbl_theme_galactic': { l: 'Tema Galactico', v: 'Galáctico (Snoopy)' },
                't_lbl_theme_hacker': { l: 'Tema Hacker', v: 'Hacker Terminal' }, 't_game_lbl_time': { l: 'Game Lbl Tiempo', v: 'TIEMPO' },
                't_game_lbl_speed': { l: 'Game Lbl Velocidad', v: 'VELOCIDAD' }, 't_crop_lbl_zoom': { l: 'Crop Lbl Zoom', v: 'Zoom' }
            };
            
            if (!snap.exists && CT.data.ui && Object.keys(CT.data.ui).length > 0) return;
            CT.data.ui = CT.data.ui || {}; const snapData = snap.exists ? snap.data() : {};
            
            Object.keys(defaults).forEach(k => {
                if (snapData[k] && typeof snapData[k] === 'object' && snapData[k].v !== undefined) { CT.data.ui[k] = { l: snapData[k].l || defaults[k].l, v: snapData[k].v }; } 
                else if (typeof snapData[k] === 'string') { CT.data.ui[k] = { l: defaults[k].l, v: snapData[k] }; } 
                else { CT.data.ui[k] = { l: defaults[k].l, v: defaults[k].v }; }
            });
            localStorage.setItem('ct_cache_ui', JSON.stringify(CT.data.ui));
            UI.applyUITexts(); UI.refreshActiveViews();
        });
    },
    ses: () => { const s = JSON.parse(localStorage.getItem('ct_ses')); return s ? (CT.data.u || []).find(x => x.h === s.h) : null; }
};

document.addEventListener('DOMContentLoaded', () => { CT.init(); });
