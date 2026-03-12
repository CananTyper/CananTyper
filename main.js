/* ================================================================
    CANANTYPER - CORE FRONTEND (HÍBRIDO WEB/ESCRITORIO)
    ================================================================
    Capitán del Código: Ángel | Versión 1.1.5 (Blindaje y UX)
*/

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
    data: { u: [], s: [], p: [], c: [], a: [], ui: null, maint: null, info: null, shortcuts: null }, 
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

        const cU = localStorage.getItem('ct_cache_u'); const cS = localStorage.getItem('ct_cache_s');
        const cP = localStorage.getItem('ct_cache_p'); const cC = localStorage.getItem('ct_cache_c');
        if(cU) this.data.u = JSON.parse(cU); if(cS) this.data.s = JSON.parse(cS);
        if(cP) this.data.p = JSON.parse(cP); if(cC) this.data.c = JSON.parse(cC);

        UI.updateUnitVisuals(this.currentUnit);
        UI.updateFastModeVisuals();
        UI.applySavedTheme();
        
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
            UI.renderAdminShortcuts();
        });

        if(this.ses()) { UI.initLobby(); } 
        else { UI.show('auth-screen'); updateDiscordStatus("En la pantalla de acceso", "Esperando credenciales...", false); }

        db.collection('users').onSnapshot(snap => { this.data.u = snap.docs.map(d => d.data()); localStorage.setItem('ct_cache_u', JSON.stringify(this.data.u)); UI.refreshActiveViews(); });
        db.collection('scores').onSnapshot(snap => { this.data.s = snap.docs.map(d => d.data()); localStorage.setItem('ct_cache_s', JSON.stringify(this.data.s)); UI.refreshActiveViews(); });
        db.collection('phrases').onSnapshot(snap => { 
            this.data.p = snap.docs.map(d => d.data()); 
            if(this.data.p.length === 0) { db.collection('phrases').doc("1").set({ id: 1, title: "1", c: "General", text: "La programación es un arte.", order: 0 }); }
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p)); UI.refreshActiveViews(); 
        });
        db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            if(this.data.c.length === 0) { db.collection('categories').doc("General").set({name: "General", order: 0}); }
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
                't_prof_races': { l: 'P. Carreras', v: 'CARRERAS' }, 't_tab_ann': { l: 'A. Anu', v: 'Anuncios' }, 't_tab_lex': { l: 'A. Lex', v: 'Léxico' },
                't_tab_srv': { l: 'A. Srv', v: 'Servidor' }, 't_tab_usr': { l: 'A. Usr', v: 'Usuarios' }, 't_tab_rac': { l: 'A. Rac', v: 'Carreras' },
                't_tab_txt': { l: 'A. Txt', v: 'Textos' }, 't_tab_cre': { l: 'A. Cre', v: 'Crear' }, 't_admin_title': { l: 'Admin. Título', v: 'CananTyper' }, 
                't_admin_sub': { l: 'Admin. Subtítulo', v: 'Panel de administración' }, 't_st_tab_pe': { l: 'Tab. Personales', v: 'Personales' }, 
                't_st_tab_ge': { l: 'Tab. Servidor', v: 'Servidor' }, 't_st_tab_el': { l: 'Tab. Élite', v: 'Élite' }, 't_lbl_st_avg': { l: 'Lbl Prom.', v: 'PROM.' }, 
                't_lbl_st_last': { l: 'Lbl Ult 10', v: 'ÚLT. 10' }, 't_lbl_st_best': { l: 'Lbl Récord', v: 'RÉCORD' }, 't_st_g_users': { l: 'Est. Usu. Regis.', v: 'USUARIOS REGISTRADOS' }, 
                't_st_g_races': { l: 'Est. Carr. Global', v: 'CARRERAS GLOBALES' }, 't_st_e_most': { l: 'Est. Más Carr.', v: 'MÁS CARRERAS' }, 
                't_st_e_top1': { l: 'Est. Más Top 1', v: 'MÁS VECES TOP 1' }, 't_adm_ann_send': { l: 'Anun. Título', v: 'Enviar Anuncio' }, 
                't_adm_ann_sub': { l: 'Anun. Sub', v: 'Pop-Up de vista única' }, 't_adm_ann_btn': { l: 'Anun. Botón', v: 'PUBLICAR ANUNCIO' }, 
                't_adm_ann_list': { l: 'Anun. Lista Tit.', v: 'Anuncios Enviados' }, 't_adm_srv_title': { l: 'Srv. Título', v: 'Estado del Servidor' }, 
                't_adm_srv_sub': { l: 'Srv. Subtítulo', v: 'Bloqueo maestro y Funciones Globales' }, 't_adm_srv_cfg': { l: 'Srv. Configurar', v: 'Configurar Cartel' }, 
                't_adm_srv_btn': { l: 'Srv. Guardar', v: 'GUARDAR CARTEL' }, 't_adm_cre_btn_t': { l: 'Crear. Btn Texto', v: 'TEXTO' }, 
                't_adm_cre_btn_c': { l: 'Crear. Btn Cat', v: 'CATEGORÍA' }, 't_adm_cre_btn_s': { l: 'Crear. Btn Guardar', v: 'GUARDAR TEXTO' }, 
                't_adm_cre_cat_t1': { l: 'Crear. Cat Titulo', v: 'Crear Categoría' }, 't_adm_cre_cat_b1': { l: 'Crear. Cat Btn', v: 'CREAR CATEGORÍA' }, 
                't_adm_cre_cat_t2': { l: 'Crear. Elim Titulo', v: 'Eliminar Categoría' }, 't_adm_cre_cat_b2': { l: 'Crear. Elim Btn', v: 'ELIMINAR' }, 
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
                't_tab_trn': { l: 'A. Entrenar', v: 'Entrenar' }, 't_btn_pin_on': { l: 'Pista Fijado', v: '⭐' },
                't_btn_pin_off': { l: 'Pista Fijar', v: '☆' }, 't_theme_btn': { l: 'Aj. Tema Btn', v: '🎨 Personalizar' },
                't_theme_title': { l: 'Tema Título', v: 'Elegir Plantilla' }, 't_theme_save': { l: 'Tema Guardar', v: 'Aplicar' },
                't_theme_reset': { l: 'Tema Reset', v: 'Por Defecto' }, 't_trn_tab_cre': { l: 'Trn Tab Crear', v: 'CREAR' },
                't_trn_tab_ed': { l: 'Trn Tab Edit', v: 'EDITAR' }, 't_trn_tab_cat': { l: 'Trn Tab Mods', v: 'MODALIDADES' },
                't_trn_cre_btn': { l: 'Trn Crear Btn', v: 'GUARDAR PISTA' }, 't_trn_mod_cre': { l: 'Trn Mod Crear', v: 'CREAR MODALIDAD' },
                't_trn_mod_del': { l: 'Trn Mod Elim', v: 'ELIMINAR' }, 't_trn_mod_t1': { l: 'Trn Titulo C1', v: 'Nueva Modalidad' },
                't_trn_mod_t2': { l: 'Trn Titulo C2', v: 'Eliminar Modalidad' }, 't_lbl_st_top10_txt': { l: 'Est. TH Texto', v: 'Texto' },
                't_lbl_st_top10_num': { l: 'Est. TH Nro', v: 'N°' }, 't_tab_info': { l: 'A. Info Tab', v: 'Información' }, 
                't_tab_sc': { l: 'A. Atajos Tab', v: 'Atajos' }, 't_adm_sc_title': { l: 'Admin Atajos Titulo', v: 'Configuración de Atajos' }, 
                't_adm_sc_sub': { l: 'Admin Atajos Sub', v: 'Define las teclas globales de acción' }, 't_adm_sc_btn': { l: 'Admin Atajos Btn', v: 'GUARDAR ATAJOS' }, 
                't_adm_info_title': { l: 'Admin Info Titulo', v: 'Página de Información' }, 't_adm_info_sub': { l: 'Admin Info Sub', v: 'Redacta la historia y notas del parche' }, 
                't_adm_info_btn': { l: 'Admin Info Btn', v: 'PUBLICAR INFORMACIÓN' }, 't_sc_lbl_res': { l: 'Atajo Reiniciar', v: 'Reiniciar Carrera' }, 
                't_sc_lbl_nxt': { l: 'Atajo Siguiente', v: 'Siguiente Pista' }, 't_sc_lbl_qt': { l: 'Atajo Salir', v: 'Abandonar Carrera' },
                't_lbl_st_p_heat_sub': { l: 'Mapa Calor Sub', v: 'Visualización de debilidades' }, 't_hd_rank_races_sub': { l: 'Rank Carreras Sub', v: 'Los más veloces del día' },
                't_hd_rank_avg_sub': { l: 'Rank Promedios Sub', v: 'Constancia y disciplina' }, 't_admin_users_title': { l: 'Admin Usu Título', v: 'Gestión de Usuarios' },
                't_admin_races_title': { l: 'Admin Carr Título', v: 'Auditoría de Carreras' }, 't_admin_text_title': { l: 'Admin Txt Título', v: 'Laboratorio de Textos' },
                't_admin_ann_title': { l: 'Admin Anu Título', v: 'Centro de Comunicaciones' }, 't_sett_menu': { l: 'Ajustes Titulo', v: 'MENÚ DE AJUSTES' },
                't_nav_lobby': { l: 'Nav Lobby', v: 'Lobby' }, 't_nav_stats': { l: 'Nav Estadísticas', v: 'Estadísticas' },
                't_nav_info': { l: 'Nav Info', v: 'Info' }, 't_nav_admin': { l: 'Nav Admin', v: 'Admin' },
                't_nav_settings': { l: 'Nav Ajustes', v: 'Ajustes' }, 't_lbl_empty_hist': { l: 'Historial Vacío', v: 'Historial vacío' },
                't_lbl_ghost_run': { l: 'Estado Fantasma', v: 'Compitiendo contra Fantasma 👻' }, 't_lbl_game_over': { l: 'Estado Terminado', v: 'Carrera Terminada' },
                't_lbl_acc_del': { l: 'Cuenta Eliminar', v: 'Eliminar Cuenta' }, 't_lbl_cat_all': { l: 'Categoría Todas', v: 'Todas las Categorías' },
                't_adm_srv_feat_info': { l: 'Srv Feat Info', v: 'ℹ️ INFO' }, 't_adm_srv_feat_theme': { l: 'Srv Feat Theme', v: '🎨 TEMAS' },
                't_adm_btn_maint_on': { l: 'Srv Maint ON', v: '⛔ MANTENIMIENTO: ACTIVADO' }, 't_adm_btn_maint_off': { l: 'Srv Maint OFF', v: '✅ MANTENIMIENTO: DESACTIVADO' },
                't_st_box_w_trk': { l: 'Est Box Peor Txt', v: 'Textos a Mejorar (Bottom 5)' }, 't_st_box_w_wrd': { l: 'Est Box Peor Pal', v: 'Palabras Críticas (Top 30)' },
                't_hc_box_surv': { l: 'HC Box Sobrev', v: 'Mejores Sobrevividas (Top 10)' }, 't_hc_box_dead': { l: 'HC Box Muertes', v: 'Pistas más Mortales (Top 10)' },
                't_lbl_exit': { l: 'Btn Salir', v: 'SALIR' },
                // --- NUEVA TANDA LÉXICO (FASE 1.1.5) ---
                't_phr_search': { l: 'Phrases Buscar', v: 'Buscar texto...' },
                't_phr_btn_update': { l: 'Phrases Btn Update', v: 'ACTUALIZAR' },
                't_phr_btn_cancel': { l: 'Phrases Btn Cancel', v: 'CANCELAR' },
                't_phr_btn_edit': { l: 'Phrases Btn Edit', v: 'EDITAR' },
                't_phr_btn_delete': { l: 'Phrases Btn Delete', v: 'BORRAR' },
                't_usr_btn_img': { l: 'Users Btn Img', v: 'IMAGEN' },
                't_lbl_theme_classic_g': { l: 'Tema Clasico Verde', v: 'Clásico (Verde)' },
                't_lbl_theme_classic_o': { l: 'Tema Clasico Naranja', v: 'Clásico (Naranja)' },
                't_lbl_theme_galactic': { l: 'Tema Galactico', v: 'Galáctico (Snoopy)' },
                't_lbl_theme_hacker': { l: 'Tema Hacker', v: 'Hacker Terminal' }
            };
            
            CT.data.ui = {};
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
            UI.applyUITexts(); UI.refreshActiveViews();
        });
    },
    ses: () => { const s = JSON.parse(localStorage.getItem('ct_ses')); return s ? (CT.data.u || []).find(x => x.h === s.h) : null; }
};

const UI = {
    trackPage: 0, adminRacePage: 0, adminPhrasePage: 0, activeAdminCat: null, activeTrackCat: null, lexiconPage: 0, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null, 
    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

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
        
        const toggleBtn = document.getElementById('btn-maint-toggle');
        if(toggleBtn) {
            const txtOn = CT.data.ui && CT.data.ui['t_adm_btn_maint_on'] ? CT.data.ui['t_adm_btn_maint_on'].v : "⛔ MANTENIMIENTO: ACTIVADO";
            const txtOff = CT.data.ui && CT.data.ui['t_adm_btn_maint_off'] ? CT.data.ui['t_adm_btn_maint_off'].v : "✅ MANTENIMIENTO: DESACTIVADO";
            if(m.active) { toggleBtn.innerText = txtOn; toggleBtn.style.borderColor = "var(--error)"; toggleBtn.style.color = "var(--error)"; } 
            else { toggleBtn.innerText = txtOff; toggleBtn.style.borderColor = "var(--success)"; toggleBtn.style.color = "var(--success)"; }
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

        const fInfoBtn = document.getElementById('btn-feat-info');
        if(fInfoBtn) {
            const lblInfo = CT.data.ui && CT.data.ui['t_adm_srv_feat_info'] ? CT.data.ui['t_adm_srv_feat_info'].v : "ℹ️ INFO";
            fInfoBtn.innerText = `${lblInfo}: ${infoEnabled ? 'ON' : 'OFF'}`;
            fInfoBtn.style.borderColor = infoEnabled ? 'var(--success)' : 'var(--error)';
            fInfoBtn.style.color = infoEnabled ? 'var(--success)' : 'var(--error)';
        }
        const fThemeBtn = document.getElementById('btn-feat-theme');
        if(fThemeBtn) {
            const lblTheme = CT.data.ui && CT.data.ui['t_adm_srv_feat_theme'] ? CT.data.ui['t_adm_srv_feat_theme'].v : "🎨 TEMAS";
            fThemeBtn.innerText = `${lblTheme}: ${themeEnabled ? 'ON' : 'OFF'}`;
            fThemeBtn.style.borderColor = themeEnabled ? 'var(--success)' : 'var(--error)';
            fThemeBtn.style.color = themeEnabled ? 'var(--success)' : 'var(--error)';
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
        
        const adminBtn = document.getElementById('btn-nav-admin'); 
        if(adminBtn) adminBtn.classList.toggle('hidden', u.r !== 'admin');
        
        UI.updateUnitVisuals(CT.currentUnit); 
        this.renderGlobal(); 
        UI.renderTrainDropdown();
        this.show('home-screen');
        this.checkAnnouncements();
    },

    showLobby() { this.initLobby(); },
    showAdmin() { this.switchTab('announcements'); UI.updateUnitVisuals(CT.currentUnit); this.show('admin-screen'); },
    showStats() { this.switchStatsTab('personal'); UI.updateUnitVisuals(CT.currentUnit); this.show('stats-screen'); },
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
                else if(['t_sett_fast', 't_sett_fast_on', 't_sett_fast_off', 't_btn_pin_on', 't_btn_pin_off', 't_adm_btn_maint_on', 't_adm_btn_maint_off', 't_adm_srv_feat_info', 't_adm_srv_feat_theme'].includes(k)) { /* js dynamic */ }
                else if(el.tagName === 'INPUT' && el.type === 'text') { el.placeholder = CT.data.ui[k].v; }
                else { el.innerText = CT.data.ui[k].v; }
            }
        });
    },

    renderPersonalStats() {
        const u = CT.ses(); if(!u) return;
        const userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const userScores = CT.dbLocal('s').filter(s => s.h === u.h && !s.hc); 
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
                el.style.background = `color-mix(in srgb, var(--error) ${pct}%, var(--surface-light))`;
                el.style.borderColor = 'var(--error)';
                el.style.color = '#fff';
                el.title = `${errs} errores históricos`;
            } else {
                el.style.background = ''; el.style.borderColor = ''; el.style.color = ''; el.title = '0 errores';
            }
        });

        const top10 = [...userScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-p-top10-races').innerHTML = top10.map((s, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');

        let trackAvgs = {};
        userScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
        let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
        let bottom5 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg).slice(0, 5);
        if(bottom5.length === 0) bottom5 = trackList.sort((a,b) => a.avg - b.avg).slice(0, 5);
        document.getElementById('st-p-worst-tracks').innerHTML = bottom5.map((tr, i) => `<tr><td><b style="color:var(--error)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.t}</div></td><td><b style="color:var(--error)" class="val-blurrable">${UI.formatValue(Math.round(tr.avg))}</b></td></tr>`).join('');

        const bw = userDoc.bad_words || {};
        let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 30);
        document.getElementById('st-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<tr><td><b style="color:var(--error)">#${i+1}</b></td><td>${bwItem.w}</td><td><b style="color:var(--error)">${bwItem.errs}</b></td></tr>`).join('');
    },

    renderHardcoreStats() {
        const u = CT.ses(); if(!u) return;
        const userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const hcScores = CT.dbLocal('s').filter(s => s.h === u.h && s.hc === true);
        
        const survCount = hcScores.length;
        const deaths = userDoc.hc_deaths || 0;
        const totalAttempts = survCount + deaths;
        const survRate = totalAttempts > 0 ? Math.round((deaths / totalAttempts) * 100) : 0;
        
        document.getElementById('st-hc-record').innerText = UI.formatValue(userDoc.hi_hc && userDoc.hi_hc.length > 0 ? Math.max(...userDoc.hi_hc) : 0);
        document.getElementById('st-hc-surv').innerText = survCount;
        document.getElementById('st-hc-deaths').innerText = deaths;
        document.getElementById('st-hc-rate').innerText = survRate + '%';

        const top10 = [...hcScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-hc-top10').innerHTML = top10.map((s, i) => `<tr><td><b style="color:var(--error)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--error)" class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');
        
        let trackDeaths = userDoc.hc_track_deaths || {};
        let deathList = Object.keys(trackDeaths).map(k => ({ t: k, d: trackDeaths[k] })).sort((a,b) => b.d - a.d).slice(0, 10);
        document.getElementById('st-hc-worst').innerHTML = deathList.map((td, i) => `<tr><td><b style="color:var(--error)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${td.t}</div></td><td><b style="color:var(--error)">${td.d}</b></td></tr>`).join('');
    },

    renderGlobalStats() {
        const scores = CT.dbLocal('s').filter(s => !s.hc); 
        const users = CT.dbLocal('u'); const phrases = CT.dbLocal('p');
        document.getElementById('st-g-users-val').innerText = users.length; document.getElementById('st-g-races-val').innerText = scores.length;
        const avgGlobal = scores.length ? Math.round(scores.reduce((a,b)=>a+b.c, 0) / scores.length) : 0;
        document.getElementById('st-g-avg').innerText = UI.formatValue(avgGlobal);
        let bestRace = { c: 0, n: "Nadie", track: "Ninguno" }; if(scores.length > 0) bestRace = scores.reduce((prev, current) => (current.c > prev.c) ? current : prev);
        document.getElementById('st-g-record').innerText = UI.formatValue(bestRace.c);
        let textCounts = {}; scores.forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
        const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-texts').innerHTML = topTexts.map((tr, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tr.t}</td><td>${tr.count}</td></tr>`).join('');
        let catCounts = {}; scores.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-cats').innerHTML = topCats.map((tc, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tc.c}</td><td>${tc.count}</td></tr>`).join('');
    },

    renderEliteStats() {
        const scores = CT.dbLocal('s').filter(s => !s.hc); const phrases = CT.dbLocal('p'); if (scores.length === 0) return;
        let userRaces = {}; scores.forEach(s => { userRaces[s.h] = (userRaces[s.h] || 0) + 1; });
        let topRacerH = Object.keys(userRaces).reduce((a, b) => userRaces[a] > userRaces[b] ? a : b); let topRacerName = scores.find(s => s.h === topRacerH).n;
        document.getElementById('st-e-most-races-val').innerText = userRaces[topRacerH]; document.getElementById('st-e-most-races-user').innerText = topRacerName;
        let bestRace = scores.reduce((p, c) => (c.c > p.c) ? c : p);
        document.getElementById('st-e-record-val').innerText = UI.formatValue(bestRace.c); document.getElementById('st-e-record-user').innerText = bestRace.n;
        let trackMaxes = {}; scores.forEach(s => { if (!trackMaxes[s.track] || s.c > trackMaxes[s.track].c) { trackMaxes[s.track] = { c: s.c, h: s.h, n: s.n }; } });
        let top1Counts = {}; Object.values(trackMaxes).forEach(tm => { top1Counts[tm.h] = (top1Counts[tm.h] || 0) + 1; });
        let mostTop1H = Object.keys(top1Counts).length ? Object.keys(top1Counts).reduce((a, b) => top1Counts[a] > top1Counts[b] ? a : b) : "";
        let mostTop1Name = mostTop1H ? scores.find(s => s.h === mostTop1H).n : "-";
        document.getElementById('st-e-top1-val').innerText = mostTop1H ? top1Counts[mostTop1H] : 0; document.getElementById('st-e-top1-user').innerText = mostTop1Name;
        let userSums = {}; scores.forEach(s => { if(!userSums[s.h]) userSums[s.h] = { sum: 0, count: 0, n: s.n }; userSums[s.h].sum += s.c; userSums[s.h].count++; });
        let bestAvgH = ""; let bestAvgVal = -1;
        Object.keys(userSums).forEach(h => { if (userSums[h].count >= 5) { let avg = userSums[h].sum / userSums[h].count; if (avg > bestAvgVal) { bestAvgVal = avg; bestAvgH = h; } } });
        if (bestAvgVal === -1) { Object.keys(userSums).forEach(h => { let avg = userSums[h].sum / userSums[h].count; if (avg > bestAvgVal) { bestAvgVal = avg; bestAvgH = h; } }); }
        document.getElementById('st-e-bestavg-val').innerText = UI.formatValue(Math.round(bestAvgVal)); document.getElementById('st-e-bestavg-user').innerText = bestAvgH ? userSums[bestAvgH].n : "-";
        let tCounts = {}; scores.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; }); let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-texts').innerHTML = top10T.map((tr, i) => { let trMax = scores.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p); return `<tr><td><b>#${i+1}</b></td><td>${tr}</td><td>${trMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(trMax.c)}</b></td></tr>`; }).join('');
        let scoresWithCat = scores.map(s => { let tObj = phrases.find(p => p.title.toString() === s.track.toString()); return { ...s, cat: tObj ? (tObj.c || 'General') : 'General' }; });
        let cCounts = {}; scoresWithCat.forEach(s => { cCounts[s.cat] = (cCounts[s.cat] || 0) + 1; }); let top10C = Object.keys(cCounts).sort((a,b) => cCounts[b] - cCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-cats').innerHTML = top10C.map((cat, i) => { let catMax = scoresWithCat.filter(s => s.cat === cat).reduce((p, c) => (c.c > p.c) ? c : p); return `<tr><td><b>#${i+1}</b></td><td>${cat}</td><td>${catMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(catMax.c)}</b></td></tr>`; }).join('');
    },

    renderInfoPage() {
        if(!CT.data.info) return;
        document.getElementById('info-display-title').innerText = CT.data.info.title || "Información";
        document.getElementById('info-display-content').innerHTML = CT.data.info.content || "";
        document.getElementById('info-title-input').value = CT.data.info.title || "";
        document.getElementById('info-msg-input').innerHTML = CT.data.info.content || "";
    },

    renderAdminShortcuts() {
        if(!CT.data.shortcuts) return;
        document.getElementById('sc-restart').value = CT.data.shortcuts.restart || 'Tab';
        document.getElementById('sc-next').value = CT.data.shortcuts.next || 'Enter';
        document.getElementById('sc-quit').value = CT.data.shortcuts.quit || 'Escape';
    },

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; 
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
        if(!document.getElementById('admin-screen').classList.contains('hidden')) { UI.renderAdminAnn(); UI.renderAdminLexicon(); UI.renderAdminP(); UI.renderAdminR(); UI.renderAdminU(); UI.renderAdminServerConfig(); UI.renderAdminTrn(); }
        if(!document.getElementById('track-screen').classList.contains('hidden')) { if(UI.activeTrackCat || UI.filterFavs) UI.renderTrackList(); else UI.showTrackCategorySelect(); }
        if(!document.getElementById('stats-screen').classList.contains('hidden')) { if(!document.getElementById('pane-stats-personal').classList.contains('hidden')) UI.renderPersonalStats(); else if(!document.getElementById('pane-stats-general').classList.contains('hidden')) UI.renderGlobalStats(); else if(!document.getElementById('pane-stats-elite').classList.contains('hidden')) UI.renderEliteStats(); else UI.renderHardcoreStats(); }
    },

    setUnit: (unit) => {
        if(CT.currentUnit === unit) return;
        
        // RUTA B: Forzado Autoritario. Destruir tema personalizado al cambiar métrica.
        localStorage.removeItem('ct_custom_theme');
        const u = CT.ses(); 
        if(u && u.theme) { db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
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
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-unit-admin', 'th-st-p-vel', 'th-st-p-t-max', 'th-st-e-t-vel', 'th-st-e-c-vel', 'th_st_p_top10_vel'];
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

    updateCategorySelects() {
        const cats = CT.dbLocal('c'); const options = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        
        const createSel = document.getElementById('new-phrase-category'); const editSel = document.getElementById('phrase-category'); const deleteSel = document.getElementById('delete-cat-select');
        if(createSel) createSel.innerHTML = options;
        if(editSel) { const currentVal = editSel.value; editSel.innerHTML = options; editSel.value = currentVal || (cats[0] ? cats[0].name : ''); }
        if(deleteSel) { deleteSel.innerHTML = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).map(c => `<option value="${c.name}">${c.name}</option>`).join(''); }

        const trnCats = cats.filter(c => c.name.startsWith('[TRN]'));
        const trnOptions = trnCats.map(c => `<option value="${c.name}">${c.name.replace('[TRN] ', '')}</option>`).join('');
        const trnNewCatSel = document.getElementById('trn-new-cat'); if(trnNewCatSel) trnNewCatSel.innerHTML = trnOptions;
        const trnDelCatSel = document.getElementById('trn-delete-cat-select'); if(trnDelCatSel) trnDelCatSel.innerHTML = trnOptions;
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
        const scores = CT.dbLocal('s').filter(s => !s.hc); 
        const users = CT.dbLocal('u'); const todayAR = CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        let filteredScores = typeEl.value === 'today' ? scores.filter(s => s.d === todayAR) : scores;
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

    showProfile(who) {
        try {
            const currentSes = CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            const u = CT.dbLocal('u').find(x => x.h === targetHandle); if(!u) return;
            CT.activeProfHandle = u.h;
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
        const scores = CT.dbLocal('s'); const userScores = scores.filter(s => s.h === CT.activeProfHandle && !s.hc).sort((a,b) => b.id - a.id);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="App.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { const userScores = CT.dbLocal('s').filter(s => s.h === CT.activeProfHandle && !s.hc); const nextStart = (CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { CT.profPage += delta; this.renderProfileHistory(); } },

    switchTab(tab) {
        document.querySelectorAll('.pane').forEach(p => p.classList.add('hidden')); document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(`pane-${tab}`).classList.remove('hidden');
        let btnId = 't-' + tab.substring(0,2); if (tab === 'create') btnId = 't-cr'; if (tab === 'announcements') btnId = 't_tab_ann'; if (tab === 'lexicon') btnId = 't_tab_lex'; if (tab === 'server') btnId = 't_tab_srv'; if (tab === 'users') btnId = 't_tab_usr'; if (tab === 'races') btnId = 't_tab_rac'; if (tab === 'phrases') btnId = 't_tab_txt'; if (tab === 'create') btnId = 't_tab_cre'; if (tab === 'training') btnId = 't_tab_trn'; if (tab === 'shortcuts') btnId = 't_tab_sc'; if (tab === 'info') btnId = 't_tab_info';
        const activeTabBtn = document.getElementById(btnId); if(activeTabBtn) activeTabBtn.classList.add('active');
        if(tab === 'announcements') { UI.renderAdminAnn(); } if(tab === 'lexicon') { UI.lexiconPage = 0; UI.renderAdminLexicon(); } if(tab === 'server') { UI.renderAdminServerConfig(); } if(tab === 'phrases') { UI.showAdminPhraseCategories(); } if(tab === 'races') { UI.adminRacePage = 0; this.renderAdminR(); } if(tab === 'users') { this.renderAdminU(); } if(tab === 'create') { this.toggleCreateForm('text'); } if(tab === 'training') { UI.switchTrnTab('crear'); } if(tab === 'info') { UI.renderInfoPage(); }
    },

    switchTrnTab(tab) {
        document.getElementById('pane-trn-crear').classList.add('hidden'); document.getElementById('pane-trn-editar').classList.add('hidden'); document.getElementById('pane-trn-cat').classList.add('hidden');
        document.querySelectorAll('#pane-training .tab-btn').forEach(b => b.classList.remove('active'));
        if(tab==='crear') { document.getElementById('pane-trn-crear').classList.remove('hidden'); document.getElementById('t_trn_tab_cre').classList.add('active'); }
        if(tab==='editar') { document.getElementById('pane-trn-editar').classList.remove('hidden'); document.getElementById('t_trn_tab_ed').classList.add('active'); UI.renderAdminTrn(); }
        if(tab==='categorias') { document.getElementById('pane-trn-cat').classList.remove('hidden'); document.getElementById('t_trn_tab_cat').classList.add('active'); }
    },

    renderAdminAnn() {
        const list = CT.dbLocal('a');
        document.getElementById('admin-ann-list').innerHTML = list.map(a => `<tr><td style="font-size: 1.5rem; text-align: center;">${a.icon}</td><td><span style="color: ${a.active ? 'var(--p)' : 'var(--text-muted)'}; font-weight: bold; font-size: 0.8rem;">${a.active ? 'VIGENTE' : 'FINALIZADO'}</span></td><td style="white-space: nowrap; font-size: 0.75rem; color: var(--text-muted); text-align: center;">${a.date}</td><td><div style="display: flex; gap: 5px; justify-content: center;">${a.active ? `<button onclick="App.cancelAnnouncement('${a.id}')" class="btn-outline" style="padding: 4px 8px; border-color: var(--error); color: var(--error);" title="Anular">❌</button>` : `<span style="display: inline-block; width: 30px;"></span>`}<button onclick="App.deleteAnnouncement('${a.id}')" class="btn-outline" style="padding: 4px 8px;" title="Eliminar del Historial">🗑️</button></div></td></tr>`).join('');
    },
    
    renderAdminLexicon() {
        if(!CT.data.ui) return; const query = (document.getElementById('lexicon-search').value || "").toLowerCase(); const listEl = document.getElementById('admin-lexicon-list');
        let filtered = Object.keys(CT.data.ui).filter(k => { const item = CT.data.ui[k]; return item.l.toLowerCase().includes(query) || item.v.toLowerCase().includes(query); });
        const start = UI.lexiconPage * 20; const pageData = filtered.slice(start, start + 20);
        let html = ''; pageData.forEach(k => { const item = CT.data.ui[k]; html += `<li class="admin-list-item" style="border-left: 4px solid var(--p); border-radius: 4px;"><div style="display: flex; flex-direction: column; gap: 4px; text-align: left;"><small style="color:var(--text-muted); font-size:0.7rem; font-weight:bold; text-transform: uppercase;">${item.l}</small><span><b style="color:var(--text-main); font-size:1rem;">${item.v}</b></span></div><button onclick="App.editUIText('${k}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button></li>`; });
        listEl.innerHTML = html; document.getElementById('admin-le-prev').disabled = UI.lexiconPage === 0; document.getElementById('admin-le-next').disabled = (start + 20) >= filtered.length; document.getElementById('admin-le-page-num').innerText = `Página ${UI.lexiconPage + 1}`;
    },
    changeAdminLexiconPage(delta) { const query = (document.getElementById('lexicon-search').value || "").toLowerCase(); let filtered = Object.keys(CT.data.ui).filter(k => { const item = CT.data.ui[k]; return item.l.toLowerCase().includes(query) || item.v.toLowerCase().includes(query); }); const nextStart = (UI.lexiconPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.lexiconPage += delta; this.renderAdminLexicon(); } },

    renderAdminServerConfig() { if(!CT.data.maint) return; document.getElementById('maint-icon-input').value = CT.data.maint.icon || '🛠️'; document.getElementById('maint-title-input').value = CT.data.maint.title || 'Mantenimiento'; document.getElementById('maint-msg-input').value = CT.data.maint.msg || ''; },

    toggleCreateForm(type) {
        document.getElementById('create-text-form').classList.add('hidden'); document.getElementById('create-cat-form').classList.add('hidden');
        const btnText = document.getElementById('btn-create-text'); const btnCat = document.getElementById('btn-create-cat');
        if(type === 'text') { UI.updateCategorySelects(); document.getElementById('create-text-form').classList.remove('hidden'); btnText.className = 'btn-primary btn-admin-mode active'; btnCat.className = 'btn-primary btn-alt btn-admin-mode'; } 
        else { UI.updateCategorySelects(); document.getElementById('create-cat-form').classList.remove('hidden'); btnCat.className = 'btn-primary btn-alt btn-admin-mode active'; btnText.className = 'btn-primary btn-alt btn-admin-mode'; }
    },

    showAdminPhraseCategories() { UI.activeAdminCat = null; document.getElementById('admin-phrase-form').classList.add('hidden'); document.getElementById('admin-phrase-list-view').classList.add('hidden'); document.getElementById('admin-phrase-categories').classList.remove('hidden'); document.getElementById('admin-phrase-search').value = ''; UI.renderAdminP(); },
    selectAdminPhraseCategory(cat) { UI.activeAdminCat = cat; UI.adminPhrasePage = 0; document.getElementById('admin-phrase-categories').classList.add('hidden'); document.getElementById('admin-phrase-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-admin').classList.remove('hidden'); UI.renderAdminP(); },
    
    renderAdminP() {
        const query = (document.getElementById('admin-phrase-search').value || "").toLowerCase(); let tracks = CT.dbLocal('p');
        if (query) {
            document.getElementById('admin-phrase-categories').classList.add('hidden'); document.getElementById('admin-phrase-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-admin').classList.add('hidden');
            let filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
            filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0));
            const start = UI.adminPhrasePage * 20; const pageData = filtered.slice(start, start + 20);
            document.getElementById('admin-phrases-list').innerHTML = pageData.map((t, i) => `<li class="admin-list-item"><div style="display:flex; flex-direction:column; gap:4px; max-width:65%;"><span><b style="color:var(--p)">#${t.title}</b> <small style="color:var(--text-muted); margin-left:10px;">[${t.c || 'General'}]</small></span><span style="font-size:0.8rem; color:var(--text-main); opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.text}</span></div><div style="display:flex; gap:10px; align-items:center;"><div style="display:flex; flex-direction:column; gap:2px; margin-right:10px;"><button onclick="App.moveTrack('${t.id}', -1)" class="btn-outline reorder-btn" title="Subir">▲</button><button onclick="App.moveTrack('${t.id}', 1)" class="btn-outline reorder-btn" title="Bajar">▼</button></div><button onclick="UI.prepEdit('${t.id}')" class="btn-outline">EDITAR</button><button onclick="UI.delP('${t.id}')" class="btn-error">BORRAR</button></div></li>`).join('');
            document.getElementById('admin-ph-prev').disabled = UI.adminPhrasePage === 0; document.getElementById('admin-ph-next').disabled = (start + 20) >= filtered.length; document.getElementById('admin-ph-page-num').innerText = `Página ${UI.adminPhrasePage + 1}`;
        } else if (!UI.activeAdminCat) {
            document.getElementById('admin-phrase-categories').classList.remove('hidden'); document.getElementById('admin-phrase-list-view').classList.add('hidden');
            let cats = CT.dbLocal('c').filter(c => !c.name.startsWith('[TRN]')); let catCounts = {}; tracks.forEach(t => { const c = t.c || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
            cats.sort((a,b) => (a.order || 0) - (b.order || 0));
            document.getElementById('admin-phrase-categories').innerHTML = cats.map(cat => `<div class="cat-card" onclick="UI.selectAdminPhraseCategory('${cat.name}')"><div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span></span><div style="display:flex; gap:5px;"><button onclick="event.stopPropagation(); App.moveCategory('${cat.name}', -1)" class="ghost-btn reorder-btn" style="color:var(--p);">▲</button><button onclick="event.stopPropagation(); App.moveCategory('${cat.name}', 1)" class="ghost-btn reorder-btn" style="color:var(--p);">▼</button></div></div><h3 style="margin-top:0;">${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span></div>`).join('');
        } else {
            document.getElementById('admin-phrase-categories').classList.add('hidden'); document.getElementById('admin-phrase-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-admin').classList.remove('hidden');
            let filtered = tracks.filter(t => (t.c || 'General') === UI.activeAdminCat);
            filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0));
            const start = UI.adminPhrasePage * 20; const pageData = filtered.slice(start, start + 20);
            document.getElementById('admin-phrases-list').innerHTML = pageData.map((t, i) => `<li class="admin-list-item"><div style="display:flex; flex-direction:column; gap:4px; max-width:65%;"><span><b style="color:var(--p)">#${t.title}</b></span><span style="font-size:0.8rem; color:var(--text-main); opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.text}</span></div><div style="display:flex; gap:10px; align-items:center;"><div style="display:flex; flex-direction:column; gap:2px; margin-right:10px;"><button onclick="App.moveTrack('${t.id}', -1)" class="btn-outline reorder-btn" title="Subir">▲</button><button onclick="App.moveTrack('${t.id}', 1)" class="btn-outline reorder-btn" title="Bajar">▼</button></div><button onclick="UI.prepEdit('${t.id}')" class="btn-outline">EDITAR</button><button onclick="UI.delP('${t.id}')" class="btn-error">BORRAR</button></div></li>`).join('');
            document.getElementById('admin-ph-prev').disabled = UI.adminPhrasePage === 0; document.getElementById('admin-ph-next').disabled = (start + 20) >= filtered.length; document.getElementById('admin-ph-page-num').innerText = `Página ${UI.adminPhrasePage + 1}`;
        }
    },
    changeAdminPhrasePage(delta) { const query = (document.getElementById('admin-phrase-search').value || "").toLowerCase(); let filtered = CT.dbLocal('p'); if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else { filtered = filtered.filter(t => (t.c || 'General') === UI.activeAdminCat); } const nextStart = (UI.adminPhrasePage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.adminPhrasePage += delta; this.renderAdminP(); } },
    prepEdit(idStr) { const pList = CT.dbLocal('p'); const idx = pList.findIndex(t => t.id.toString() === idStr.toString()); if(idx === -1) return; UI.updateCategorySelects(); document.getElementById('phrase-title').value = pList[idx].title; document.getElementById('phrase-category').value = pList[idx].c || 'General'; document.getElementById('phrase-input').value = pList[idx].text; CT.editIdx = idx; document.getElementById('admin-phrase-form').classList.remove('hidden'); },
    cancelEditP() { CT.editIdx = null; document.getElementById('admin-phrase-form').classList.add('hidden'); document.getElementById('phrase-title').value = ''; document.getElementById('phrase-input').value = ''; },
    delP: (idStr) => { if(confirm("¿Eliminar texto?")) { db.collection('phrases').doc(idStr.toString()).delete(); }},

    renderAdminTrn() {
        let tracks = CT.dbLocal('p').filter(t => t.c && t.c.startsWith('[TRN]'));
        tracks = tracks.sort((a,b) => (a.order || 0) - (b.order || 0));
        document.getElementById('admin-trn-list').innerHTML = tracks.map((t) => `<li class="admin-list-item"><div style="display:flex; flex-direction:column; gap:4px; max-width:65%;"><span><b style="color:var(--p)">#${t.title}</b> <small style="color:var(--text-muted); margin-left:10px;">${t.c.replace('[TRN] ','')}</small></span><span style="font-size:0.8rem; color:var(--text-main); opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.text}</span></div><div style="display:flex; gap:10px; align-items:center;"><div style="display:flex; flex-direction:column; gap:2px; margin-right:10px;"><button onclick="App.moveTrack('${t.id}', -1)" class="btn-outline reorder-btn" title="Subir">▲</button><button onclick="App.moveTrack('${t.id}', 1)" class="btn-outline reorder-btn" title="Bajar">▼</button></div><button onclick="UI.delP('${t.id}')" class="btn-error">BORRAR</button></div></li>`).join('');
    },

    renderAdminR() {
        const scores = CT.dbLocal('s'); const query = (document.getElementById('race-search').value || "").toLowerCase(); let filtered = scores.filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query)); filtered.sort((a,b) => b.id - a.id);
        const start = UI.adminRacePage * 20; const pageData = filtered.slice(start, start + 20);
        document.getElementById('admin-races-list').innerHTML = pageData.map((s) => `<tr><td><b>${s.n}</b></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td><td><div class="action-buttons"><button onclick="UI.editRace('${s.id}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button><button onclick="UI.delRace('${s.id}')" class="btn-error">ELIMINAR</button></div></td></tr>`).join('');
        document.getElementById('admin-ra-prev').disabled = UI.adminRacePage === 0; document.getElementById('admin-ra-next').disabled = (start + 20) >= filtered.length; document.getElementById('admin-ra-page-num').innerText = `Página ${UI.adminRacePage + 1}`;
    },
    changeAdminRacePage(delta) { const query = (document.getElementById('race-search').value || "").toLowerCase(); let filtered = CT.dbLocal('s').filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query)); const nextStart = (UI.adminRacePage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.adminRacePage += delta; this.renderAdminR(); } },
    editRace: (raceId) => { let scores = CT.dbLocal('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return; const oldCPM = Number(scores[idx].c); const newCPM = prompt("Nuevo CPM (Base exacta local):", oldCPM); if(!newCPM || isNaN(newCPM)) return; const targetCPM = parseInt(newCPM); db.collection('scores').doc(raceId).update({ c: targetCPM }); const u = CT.dbLocal('u').find(u => u.h === scores[idx].h); if(u) { let hi = u.hi; const hIdx = hi.indexOf(oldCPM); if(hIdx !== -1) { hi[hIdx] = targetCPM; db.collection('users').doc(u.h).update({ hi: hi }); } } },
    delRace: (raceId) => { if(!confirm("¿Eliminar?")) return; let scores = CT.dbLocal('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return; const raceData = scores[idx]; db.collection('scores').doc(raceId).delete(); const u = CT.dbLocal('u').find(u => u.h === raceData.h); if(u) { let hi = u.hi; const hIdx = hi.indexOf(Number(raceData.c)); if(hIdx !== -1) { hi.splice(hIdx, 1); db.collection('users').doc(u.h).update({ hi: hi }); } } },

    renderAdminU() {
        const query = (document.getElementById('user-search').value || "").toLowerCase(); let filtered = CT.dbLocal('u').filter(u => u.n.toLowerCase().includes(query) || u.h.toLowerCase().includes(query));
        document.getElementById('admin-users-list').innerHTML = filtered.map((u, i) => `<tr><td><div style="display:flex; align-items:center; gap:8px; justify-content:center;"><div class="avatar-xs"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div></td><td>${u.h}</td><td><span class="role-badge">${u.r}</span></td><td><div class="action-buttons"><button onclick="UI.adminEditUserName('${u.h}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button><button onclick="UI.adminResetUserPic('${u.h}')" class="btn-outline">IMAGEN</button><button onclick="UI.delU('${u.h}')" class="btn-error">ELIMINAR</button></div></td></tr>`).join('');
    },
    adminEditUserName: async (handle) => { const u = CT.dbLocal('u').find(x => x.h === handle); if(!u) return; const newName = prompt(`Nuevo nombre visible para ${handle}:`, u.n); if(newName && newName.trim() !== '' && newName.trim() !== u.n) { if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); await db.collection('users').doc(handle).update({ n: newName.trim() }); const q = await db.collection('scores').where('h', '==', handle).get(); const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { n: newName.trim() }); }); await batch.commit(); } },
    adminResetUserPic: async (handle) => { if(confirm(`¿Eliminar la foto de perfil de ${handle}?`)) { await db.collection('users').doc(handle).update({ a: '' }); const q = await db.collection('scores').where('h', '==', handle).get(); const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: '' }); }); await batch.commit(); } },
    delU: (handle) => { if(confirm(`¿Eliminar al usuario ${handle} por completo?`)) { db.collection('users').doc(handle).delete(); }},

    showTrackSelect() { document.getElementById('track-search').value = ''; UI.activeTrackCat = null; UI.filterFavs = false; UI.showTrackCategorySelect(); this.show('track-screen'); },
    showTrackCategorySelect() {
        document.getElementById('track-list-view').classList.add('hidden'); document.getElementById('track-category-view').classList.remove('hidden');
        const tracks = CT.dbLocal('p'); let cats = CT.dbLocal('c'); let catCounts = {}; 
        tracks.forEach(t => { const c = t.c || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
        cats = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).sort((a,b) => (a.order || 0) - (b.order || 0));

        let t_fav = CT.data.ui && CT.data.ui['t_trk_fav_filter'] ? CT.data.ui['t_trk_fav_filter'].v : '⭐ Ver Favoritos';
        let html = `<div class="cat-card" onclick="UI.toggleFavFilter()" style="border-color: #ffd700;"><h3 style="color:#ffd700"><span>${t_fav}</span></h3><span style="color:var(--text-main)">Pistas Guardadas</span></div>`;
        html += cats.map(cat => `<div class="cat-card" onclick="UI.selectTrackCategory('${cat.name}')"><h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span></div>`).join('');
        document.getElementById('track-category-view').innerHTML = html;
    },
    toggleFavFilter() { UI.filterFavs = true; UI.activeTrackCat = null; UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); UI.renderTrackList(); },
    selectTrackCategory(cat) { UI.activeTrackCat = cat; UI.filterFavs = false; UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); UI.renderTrackList(); },
    
    renderTrackList() {
        const query = (document.getElementById('track-search').value || "").toLowerCase(); let tracks = CT.dbLocal('p');
        const u = CT.ses(); let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];

        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
        } else if (UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString()));
        } else if (!UI.activeTrackCat) {
            UI.showTrackCategorySelect(); return;
        } else {
            filtered = tracks.filter(t => (t.c || 'General') === UI.activeTrackCat); 
        }
        
        filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0));

        let textPinOn = CT.data.ui && CT.data.ui['t_btn_pin_on'] ? CT.data.ui['t_btn_pin_on'].v : '⭐';
        let textPinOff = CT.data.ui && CT.data.ui['t_btn_pin_off'] ? CT.data.ui['t_btn_pin_off'].v : '☆';

        const start = UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
        document.getElementById('track-list-full').innerHTML = pageData.map(t => {
            let isFav = favs.includes(t.id.toString());
            return `<div class="track-card" onclick="App.startRaceWithTrack('${t.id}')">
                <div class="track-card-id" style="display:flex; flex-direction:column; gap:10px;">
                    #${t.title}
                    <button onclick="event.stopPropagation(); App.toggleFav('${t.id}')" class="btn-outline" style="align-self:center; font-size:1.4rem; padding:0; border:none; background:transparent; color:var(--text-main);">${isFav ? textPinOn : textPinOff}</button>
                </div>
                <div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${t.c || 'General'}]</span></div>
            </div>`;
        }).join('');
        document.getElementById('track-prev').disabled = UI.trackPage === 0; document.getElementById('track-next').disabled = (start + 20) >= filtered.length; document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
    },
    changeTrackPage(delta) { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = CT.dbLocal('p'); const u = CT.ses(); let favs = (CT.dbLocal('u').find(x => x.h === u.h) || u).favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General') === UI.activeTrackCat); } const nextStart = (UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.trackPage += delta; this.renderTrackList(); } },

    showAnnouncement(data) { if(!data.id) return; UI.currentAnnId = data.id.toString(); document.getElementById('motd-icon').innerText = data.icon || "🚀"; document.getElementById('motd-title').innerText = data.title || "Anuncio"; document.getElementById('motd-msg').innerHTML = data.msg || ""; document.getElementById('announcement-modal').classList.remove('hidden'); },
    closeAnnouncement() { if(UI.currentAnnId) { localStorage.setItem('ct_last_announcement', UI.currentAnnId); } document.getElementById('announcement-modal').classList.add('hidden'); },

    openCropModal(src) { const img = document.getElementById('crop-image'); img.src = src; img.onload = () => { UI.cropScale = 1; UI.cropX = 0; UI.cropY = 0; document.getElementById('crop-zoom').value = 1; const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight; if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); UI.setupCropEvents(); }; },
    closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform() { const img = document.getElementById('crop-image'); img.style.transform = `translate(-50%, -50%) translate(${UI.cropX}px, ${UI.cropY}px) scale(${UI.cropScale})`; img.style.left = '50%'; img.style.top = '50%'; },
    setupCropEvents() { const area = document.getElementById('crop-area'); const startDrag = (e) => { UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.startX = cx - UI.cropX; UI.startY = cy - UI.cropY; }; const moveDrag = (e) => { if(!UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.cropX = cx - UI.startX; UI.cropY = cy - UI.startY; UI.updateCropTransform(); }; const endDrag = () => { UI.isDragging = false; }; area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; document.getElementById('crop-zoom').oninput = (e) => { UI.cropScale = e.target.value; UI.updateCropTransform(); }; }
};

if (typeof require !== 'undefined') {
    try {
        const { ipcRenderer: electronIpc } = require('electron');
        electronIpc.on('update-status', (event, status) => {
            const dot = document.getElementById('update-dot'); const btn = document.getElementById('btn-update-status');
            if (status === 'downloading') { dot.className = 'update-dot dot-yellow'; dot.classList.remove('hidden'); btn.innerText = "⏳ DESCARGANDO PARCHE..."; btn.classList.remove('hidden'); } 
            else if (status === 'ready') { dot.className = 'update-dot dot-theme'; dot.classList.remove('hidden'); btn.innerText = "🚀 APLICAR ACTUALIZACIÓN"; btn.classList.remove('hidden'); }
        });
    } catch(e) {}
}

const App = {
    currentTrack: null, activeEngine: null,
    
    startRandomRace: () => { 
        let tracks = CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(App.activeEngine) App.activeEngine.stop(); 
        App.activeEngine = new Engine(App.currentTrack, 'normal'); 
    },
    
    startHardcoreRace: () => { 
        let tracks = CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(App.activeEngine) App.activeEngine.stop(); 
        App.activeEngine = new Engine(App.currentTrack, 'hardcore'); 
    },
    
    startGhostRace: (trackTitle, cpm) => {
        let track = CT.dbLocal('p').find(t => t.title.toString() === trackTitle.toString());
        if(!track) return alert("Pista no encontrada o eliminada.");
        App.currentTrack = track;
        if(App.activeEngine) App.activeEngine.stop();
        App.activeEngine = new Engine(track, 'normal', cpm);
    },

    startPurge: () => {
        const u = CT.ses(); let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const bw = userDoc.bad_words || {}; let words = Object.keys(bw);
        if(words.length < 5) return alert("No tienes suficientes errores registrados aún. ¡Juega más partidas normales!");
        let genText = []; for(let i=0; i<20; i++) { genText.push(words[Math.floor(Math.random()*words.length)]); }
        const track = { id: 'purge', title: 'Purgatorio', c: 'Entrenamiento', text: genText.join(' ') };
        App.currentTrack = track;
        if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track, 'training');
        UI.toggleTrainMenu();
    },

    startTrnCategory: (catName) => {
        let extTracks = CT.dbLocal('p').filter(t => t.c === catName);
        if(extTracks.length === 0) return alert("No hay textos en esta modalidad.");
        App.currentTrack = extTracks[Math.floor(Math.random() * extTracks.length)];
        if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(App.currentTrack, 'training');
        UI.toggleTrainMenu();
    },

    startRaceWithTrack: (id) => { const track = CT.dbLocal('p').find(t => t.id.toString() === id.toString()); if(track) { App.currentTrack = track; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track, 'normal'); } },
    
    // FIX v1.1.5: App.activeEngine no se borra aquí. Se borra solo en quitRace().
    retryRace: () => { if(App.activeEngine) { const m = App.activeEngine.mode; const g = App.activeEngine.ghostCPM; App.activeEngine.stop(); if(App.currentTrack) App.activeEngine = new Engine(App.currentTrack, m, g); } },
    nextRace: () => { if(App.activeEngine) { const m = App.activeEngine.mode; App.activeEngine.stop(); if(m === 'hardcore') App.startHardcoreRace(); else if (m === 'training') App.startPurge(); else App.startRandomRace(); } },
    quitRace: () => { if(App.activeEngine) { App.activeEngine.stop(); App.activeEngine = null; } UI.showLobby(); },
    
    toggleFav: (idStr) => {
        const u = CT.ses(); if(!u) return;
        let favs = u.favs || [];
        if (favs.includes(idStr.toString())) { favs = favs.filter(f => f !== idStr.toString()); } 
        else { favs.push(idStr.toString()); }
        db.collection('users').doc(u.h).update({ favs: favs });
        UI.renderTrackList(); 
    },

    moveTrack: async (idStr, direction) => {
        let tracks = CT.dbLocal('p');
        let track = tracks.find(t => t.id.toString() === idStr.toString());
        if(!track) return;
        let filtered = tracks.filter(t => t.c === track.c).sort((a,b) => (a.order || 0) - (b.order || 0));
        let idx = filtered.findIndex(t => t.id === track.id);
        let swapIdx = idx + direction;
        if(swapIdx >= 0 && swapIdx < filtered.length) {
            let track2 = filtered[swapIdx];
            let order1 = track.order !== undefined ? track.order : idx;
            let order2 = track2.order !== undefined ? track2.order : swapIdx;
            if(order1 === order2) { order1 = idx; order2 = swapIdx; }
            const batch = db.batch();
            batch.update(db.collection('phrases').doc(track.id.toString()), {order: order2});
            batch.update(db.collection('phrases').doc(track2.id.toString()), {order: order1});
            await batch.commit();
        }
    },

    moveCategory: async (catName, direction) => {
        let cats = CT.dbLocal('c');
        let filtered = cats.filter(c => !c.name.startsWith('[TRN]') && c.name !== 'General').sort((a,b) => (a.order || 0) - (b.order || 0));
        let idx = filtered.findIndex(c => c.name === catName);
        if(idx === -1) return;
        let swapIdx = idx + direction;
        if(swapIdx >= 0 && swapIdx < filtered.length) {
            let cat2 = filtered[swapIdx];
            let order1 = filtered[idx].order !== undefined ? filtered[idx].order : idx;
            let order2 = cat2.order !== undefined ? cat2.order : swapIdx;
            if(order1 === order2) { order1 = idx; order2 = swapIdx; }
            const batch = db.batch();
            batch.update(db.collection('categories').doc(catName), {order: order2});
            batch.update(db.collection('categories').doc(cat2.name), {order: order1});
            await batch.commit();
        }
    },

    toggleFeature: (feat) => {
        const current = CT.data.maint ? CT.data.maint[feat] !== false : true;
        db.collection('config').doc('maintenance').set({ [feat]: !current }, {merge: true});
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

    resetTheme: () => {
        localStorage.removeItem('ct_custom_theme');
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },

    saveInfoPage: () => {
        const title = document.getElementById('info-title-input').value.trim();
        const content = document.getElementById('info-msg-input').innerHTML.trim();
        if(!title || !content) return alert("Rellena todos los campos.");
        db.collection('config').doc('info_page').set({ title, content }).then(() => alert("Información guardada."));
    },

    saveShortcuts: () => {
        const restart = document.getElementById('sc-restart').value;
        const next = document.getElementById('sc-next').value;
        const quit = document.getElementById('sc-quit').value;
        db.collection('config').doc('shortcuts').set({ restart, next, quit }).then(() => alert("Atajos guardados."));
    },
    
    listenShortcutInput: (e, id) => { e.preventDefault(); document.getElementById(id).value = e.key; },

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
            location.reload();
        }
    },

    toggleMaintenance: () => { const current = CT.data.maint ? CT.data.maint.active : false; const next = !current; const confirmMsg = next ? "⚠️ ¿Seguro que deseas ACTIVAR el mantenimiento? Todos los usuarios no administradores serán expulsados." : "✅ ¿Seguro que deseas DESACTIVAR el mantenimiento? La web volverá a ser pública."; if(confirm(confirmMsg)) { db.collection('config').doc('maintenance').update({ active: next }).catch(e => alert("Error al cambiar estado.")); } },
    saveMaintenanceInfo: () => { const icon = document.getElementById('maint-icon-input').value; const title = document.getElementById('maint-title-input').value.trim(); const msg = document.getElementById('maint-msg-input').value.trim(); if(!title || !msg) return alert("Completa los datos del cartel de mantenimiento."); db.collection('config').doc('maintenance').update({ icon, title, msg }).then(() => alert("Cartel de mantenimiento actualizado con éxito.")).catch(() => alert("Error al guardar el cartel.")); },

    publishAnnouncement: async () => { const title = document.getElementById('ann-title').value.trim(); const msg = document.getElementById('ann-msg').innerHTML.trim(); const icon = document.getElementById('ann-icon').value; if(!title || !msg || msg === '<br>') return alert("Rellena el título y el mensaje del anuncio."); if(confirm("¿Seguro que deseas lanzar este Pop-Up a todos los jugadores?")) { const annId = Date.now().toString(); const timeStr = new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Argentina/Buenos_Aires'}); const dateStr = CT.getARDate() + " - " + timeStr; try { const activeDocs = await db.collection('announcements').where('active', '==', true).get(); const batch = db.batch(); activeDocs.forEach(d => { batch.update(d.ref, { active: false }); }); const newAnn = { id: annId, title: title, msg: msg, icon: icon, date: dateStr, active: true }; batch.set(db.collection('announcements').doc(annId), newAnn); await batch.commit(); alert("Anuncio publicado con éxito."); document.getElementById('ann-title').value = ''; document.getElementById('ann-msg').innerHTML = ''; } catch(e) { alert("Error al publicar el anuncio."); console.error(e); } } },
    cancelAnnouncement: async (idStr) => { if(confirm("¿Seguro que deseas anular este anuncio? Dejará de aparecerle a los nuevos usuarios.")) { try { await db.collection('announcements').doc(idStr.toString()).update({ active: false }); } catch(e) { alert("Error al anular anuncio."); } } },
    deleteAnnouncement: async (idStr) => { if(confirm("¿Seguro que deseas eliminar permanentemente este anuncio del historial?")) { try { await db.collection('announcements').doc(idStr.toString()).delete(); } catch(e) { alert("Error al eliminar anuncio."); } } },
    
    // FIX v1.1.5: REESCRITURA QUIRÚRGICA DEL LÉXICO
    editUIText: async (key) => { 
        if(!CT.data.ui || !CT.data.ui[key]) return; 
        const currentVal = CT.data.ui[key].v; 
        const newVal = prompt(`Editar [${CT.data.ui[key].l}]:`, currentVal); 
        if(newVal && newVal.trim() !== currentVal) { 
            try {
                const docRef = db.collection('config').doc('ui_texts');
                const doc = await docRef.get();
                if(doc.exists) {
                    const dbData = doc.data();
                    if (typeof dbData[key] === 'string') {
                        await docRef.update({ [key]: { l: CT.data.ui[key].l, v: newVal.trim() } });
                    } else {
                        await docRef.update({ [`${key}.v`]: newVal.trim() });
                    }
                } else {
                    await docRef.set({ [key]: { l: CT.data.ui[key].l, v: newVal.trim() } });
                }
                alert("Léxico actualizado con éxito.");
            } catch(e) {
                alert("Error al conectar con la base de datos: " + e.message);
            }
        } 
    },

    createNewCategory: () => { const nameInp = document.getElementById('new-cat-name'); const catName = nameInp.value.trim(); if(!catName) return alert("Falta el nombre de la categoría."); db.collection('categories').doc(catName).set({ name: catName, order: Date.now() }); nameInp.value = ''; alert("Categoría Creada."); UI.toggleCreateForm('text'); },
    deleteCategory: () => { const sel = document.getElementById('delete-cat-select'); const catName = sel.value; if(!catName) return; if(catName === 'General') return alert("No puedes eliminar la categoría predeterminada 'General'."); if(confirm(`¿Seguro que deseas eliminar la categoría "${catName}"? Los textos dentro de ella pasarán a "General".`)) { db.collection('categories').doc(catName).delete(); let pList = CT.dbLocal('p'); let updated = false; pList.forEach(p => { if (p.c === catName) { p.c = 'General'; updated = true; db.collection('phrases').doc(p.id.toString()).update({c: 'General'}); } }); if (updated) CT.save('p', pList); alert("Categoría eliminada con éxito."); } },
    createNewPhrase: () => { const titleInp = document.getElementById('new-phrase-title'); const catInp = document.getElementById('new-phrase-category'); const textInp = document.getElementById('new-phrase-input'); if(!titleInp.value || !textInp.value) return alert("Faltan datos del texto."); const idStr = titleInp.value.toString(); const catValue = catInp.value.trim() || 'General'; db.collection('phrases').doc(idStr).set({ id: Number(idStr) || Date.now(), title: titleInp.value, c: catValue, text: textInp.value, order: Date.now() }); titleInp.value = ''; textInp.value = ''; alert("Texto guardado con éxito."); },

    createTrnCategory: () => { const nameInp = document.getElementById('trn-new-cat-name'); const baseName = nameInp.value.trim(); if(!baseName) return alert("Falta el nombre."); const catName = `[TRN] ${baseName}`; db.collection('categories').doc(catName).set({ name: catName, order: Date.now() }); nameInp.value = ''; alert("Modalidad Creada."); },
    deleteTrnCategory: () => { const sel = document.getElementById('trn-delete-cat-select'); const catName = sel.value; if(!catName) return; if(confirm(`¿Eliminar modalidad "${catName}"?`)) { db.collection('categories').doc(catName).delete(); alert("Eliminada con éxito."); } },
    createTrnPhrase: () => { const titleInp = document.getElementById('trn-new-title'); const catInp = document.getElementById('trn-new-cat'); const textInp = document.getElementById('trn-new-input'); if(!titleInp.value || !textInp.value) return alert("Faltan datos."); const idStr = titleInp.value.toString(); const catValue = catInp.value || '[TRN] Pistas Extremas'; db.collection('phrases').doc(idStr).set({ id: Number(idStr) || Date.now(), title: titleInp.value, c: catValue, text: textInp.value, order: Date.now() }); titleInp.value = ''; textInp.value = ''; alert("Texto de Entrenamiento Guardado."); },

    editDisplayName: () => { const u = CT.ses(); if(!u) return; const newName = prompt("Nuevo nombre:", u.n); if(newName && newName.trim() !== '') { if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); db.collection('users').doc(u.h).update({ n: newName }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { n: newName }); }); batch.commit(); }); } },
    
    // FIX v1.1.5: LOGIN TOLERANTE
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        let valid = false;
        let userData = null;

        try { 
            const docRef = await db.collection('users').doc(handle).get(); 
            if(docRef.exists && docRef.data().p === p) { 
                valid = true;
                userData = docRef.data();
            } 
        } catch(e) { 
            console.error("Error en DB:", e); 
            return alert("Fallo de conexión. Por favor, verifica tu internet o intenta nuevamente."); 
        } 

        if (valid) {
            localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            if(!CT.data.u.find(u => u.h === handle)) CT.data.u.push(userData); 
            UI.initLobby(); 
        } else {
            alert("Usuario o contraseña incorrectos"); 
        }
    },

    register: async () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; if(!n || !hRaw || !p) return alert("Completa todos los campos"); if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); try { const docRef = await db.collection('users').doc(handle).get(); if(docRef.exists) return alert("Ese usuario ya está en uso"); const role = (handle === '@angel') ? 'admin' : 'usuario'; const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [] }; await db.collection('users').doc(handle).set(newUser); UI.toggleAuth(true); alert("Cuenta creada con éxito."); } catch(e) { alert("Error al conectar con la Nube"); } },
    savePhrase: () => { const catInp = document.getElementById('phrase-category'); const textInp = document.getElementById('phrase-input'); if(!textInp.value) return alert("Faltan datos"); if(CT.editIdx !== null) { const pList = CT.dbLocal('p'); const idxStr = pList[CT.editIdx].id.toString(); const catValue = catInp.value.trim() || 'General'; db.collection('phrases').doc(idxStr).update({ c: catValue, text: textInp.value }); UI.cancelEditP(); } },
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * UI.cropScale); const sH = (imgH * 220) / (viewerImgH * UI.cropScale); const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale)); const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ a: compressedBase64 }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } UI.closeCropModal(); }
};

class Engine {
    constructor(trackObj, mode = 'normal', ghostCPM = 0) { 
        this.track = trackObj; this.t = trackObj.text; this.w = this.t.split(' '); 
        this.i = 0; this.c = 0; this.s = null; this.timer = null; 
        this.mode = mode; 
        this.ghostCPM = ghostCPM;
        this.errKeys = {}; this.errWords = {}; this.lastV = '';
        App.activeEngine = this;
        this.init(); 
    }
    
    stop() { 
        if(this.timer) clearInterval(this.timer); 
        this.timer = null; 
        document.body.classList.remove('zen-focus'); 
        document.body.style.backgroundColor = ''; 
        // FIX v1.1.5: NO BORRAMOS App.activeEngine AQUÍ para permitir reiniciar.
    }
    
    init() { 
        UI.show('game-screen'); 
        let statusText = this.mode === 'hardcore' ? "Jugando: Muerte Súbita 💀" : (this.mode === 'training' ? "Modo Entrenamiento 🏋️" : `Corriendo: #${this.track.title}`);
        updateDiscordStatus(statusText, "En plena carrera 🏎️");

        document.getElementById('game-result-modal').classList.add('hidden');
        document.getElementById('game-input').classList.remove('hidden');
        document.getElementById('in-game-controls').classList.remove('hidden');
        document.getElementById('target-text').innerHTML = this.w.map((w,idx) => `<span class="word ${idx===0?'active':''}">${w}</span>`).join(' '); 
        document.getElementById('game-timer').innerText = '0s';
        document.getElementById('game-speed-display').innerText = '0';
        
        document.getElementById('final-speed-display').classList.remove('val-blurrable');
        
        document.getElementById('race-progress').style.width = '0%';
        document.getElementById('ghost-progress').style.width = '0%';
        document.getElementById('ghost-progress').classList.toggle('hidden', this.ghostCPM === 0);
        
        document.getElementById('pb-alert').classList.add('hidden');
        document.body.classList.remove('zen-focus');
        
        const inp = document.getElementById('game-input'); 
        inp.value = ''; inp.disabled = false; inp.focus(); 
        inp.onpaste = (e) => { e.preventDefault(); return false; };
        inp.oncopy = (e) => { e.preventDefault(); return false; };
        inp.oncontextmenu = (e) => { e.preventDefault(); return false; };
        inp.oninput = (e) => this.check(e.target.value, e.target); 
        inp.onblur = () => { if(!inp.disabled) inp.focus(); };

        const display = document.getElementById('target-text');
        display.style.fontSize = '1.6rem';
        setTimeout(() => { let size = 1.6; while (display.scrollHeight > display.clientHeight && size > 0.8) { size -= 0.05; display.style.fontSize = size + 'rem'; } }, 10);
    }

    check(v, el) { 
        if(!this.s) { 
            this.s = new Date(); 
            if(CT.currentUnit === 'zen' && !document.body.classList.contains('zen-focus')) { document.body.classList.add('zen-focus'); }
            
            this.timer = setInterval(() => { 
                const sec = (new Date()-this.s)/1000; 
                if(document.getElementById('game-timer')) document.getElementById('game-timer').innerText = Math.floor(sec)+'s'; 
                if(document.getElementById('game-speed-display')) {
                    const currentCPM = Math.round(this.c/(sec/60));
                    document.getElementById('game-speed-display').innerText = UI.formatValue(currentCPM);
                }
                if (this.ghostCPM > 0) {
                    const totalChars = this.t.length;
                    const ghostCharsExpected = (this.ghostCPM / 60) * sec;
                    let gProg = (ghostCharsExpected / totalChars) * 100;
                    if(gProg > 100) gProg = 100;
                    document.getElementById('ghost-progress').style.width = gProg + '%';
                }
            }, 100); 
        } 
        
        const cur = this.w[this.i]; const spans = document.querySelectorAll('.word'); const activeSpan = spans[this.i]; const last = this.i === this.w.length - 1; 
        if (v.length > cur.length + 5) { v = v.slice(0, cur.length + 5); el.value = v; }
        
        let typed = v; let isSubmitting = false;
        if (!last && typed.endsWith(' ')) { isSubmitting = true; typed = typed.slice(0, -1); }

        let isPrefixValid = cur.startsWith(typed);
        let addedChar = v.length > this.lastV.length;
        
        if (!isPrefixValid && addedChar) {
            if (CT.fastMode && this.mode !== 'hardcore') { App.nextRace(); return; }
            if (this.mode === 'hardcore') { this.die(); return; }

            let matchLen = 0; 
            while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let expectedChar = cur[matchLen] ? cur[matchLen].toLowerCase() : null;
            if (expectedChar && /[a-z0-9ñáéíóú]/.test(expectedChar)) {
                 let key = expectedChar.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                 this.errKeys[key] = (this.errKeys[key] || 0) + 1;
            }
            let cleanWord = cur.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/g, '').toLowerCase();
            if(cleanWord) this.errWords[cleanWord] = (this.errWords[cleanWord] || 0) + 1;
        }
        this.lastV = v;

        if (isPrefixValid) {
            el.classList.remove('input-error'); activeSpan.innerHTML = `<span class="char-ok">${typed}</span>${cur.slice(typed.length)}`;
        } else {
            el.classList.add('input-error'); let matchLen = 0; while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let correctPart = cur.slice(0, matchLen); let errLen = typed.length - matchLen;
            let wordWrongPart = cur.slice(matchLen, matchLen + errLen); let remPart = cur.slice(matchLen + wordWrongPart.length);
            activeSpan.innerHTML = `<span class="char-ok">${correctPart}</span><span class="char-err">${wordWrongPart}</span>${remPart}`;
        }

        if (isSubmitting || (last && v === cur)) {
            if (typed === cur && isPrefixValid) {
                this.c += cur.length + (last ? 0 : 1);
                activeSpan.className = 'word correct'; activeSpan.innerHTML = cur; 
                this.i++; el.value = ''; el.classList.remove('input-error'); this.lastV = '';
                
                const progress = (this.i / this.w.length) * 100;
                document.getElementById('race-progress').style.width = progress + '%';

                if(this.i < this.w.length) spans[this.i].classList.add('active'); else this.end(); 
            } else { el.value = v; el.classList.add('input-error'); }
        }
    }

    die() {
        this.stop(); document.body.style.backgroundColor = '#4a0000'; updateDiscordStatus("Muerto en Hardcore 💀", "F", false);
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        const uiTextDeath = CT.data.ui && CT.data.ui['t_game_dead_title'] ? CT.data.ui['t_game_dead_title'].v : "HAS MUERTO";
        document.getElementById('final-speed-display').innerText = `💀 ${uiTextDeath}`;
        
        const u = CT.ses();
        if(u) {
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let hc_deaths = (userDoc.hc_deaths || 0) + 1;
            let track_deaths = userDoc.hc_track_deaths || {};
            track_deaths[this.track.title] = (track_deaths[this.track.title] || 0) + 1;
            db.collection('users').doc(u.h).update({ hc_deaths: hc_deaths, hc_track_deaths: track_deaths });
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 1500); 
    }

    end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000; const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        
        const finalUnitLabel = CT.currentUnit === 'zen' ? 'ZEN' : CT.currentUnit.toUpperCase();
        const finalSpeedValue = CT.currentUnit === 'wpm' ? Math.round(finalCPM/5) : finalCPM;
        
        updateDiscordStatus("Carrera terminada", `Resultado: ${finalSpeedValue} ${finalUnitLabel}`, false);
        const speedDisplayEl = document.getElementById('final-speed-display');
        speedDisplayEl.innerText = finalSpeedValue + " " + finalUnitLabel;

        document.getElementById('game-speed-display').innerText = finalSpeedValue;
        document.getElementById('game-timer').innerText = sec.toFixed(1) + 's';
        
        if (CT.currentUnit === 'zen') { speedDisplayEl.classList.add('val-blurrable'); }
        if (this.mode === 'training') { document.getElementById('game-result-modal').classList.remove('hidden'); return; }

        const u = CT.ses(); 
        if(u) {
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let arrRef = this.mode === 'hardcore' ? (userDoc.hi_hc || []) : (userDoc.hi || []);
            const previousBest = arrRef.length > 0 ? Math.max(...arrRef) : 0;
            if(finalCPM > previousBest && arrRef.length > 0) { document.getElementById('pb-alert').classList.remove('hidden'); }

            let bk = userDoc.bad_keys || {}; let bw = userDoc.bad_words || {};
            for(let k in this.errKeys) bk[k] = (bk[k] || 0) + this.errKeys[k];
            for(let w in this.errWords) bw[w] = (bw[w] || 0) + this.errWords[w];
            
            let sortedWords = Object.keys(bw).sort((a,b) => bw[b] - bw[a]); let prunedBw = {};
            sortedWords.slice(0, 30).forEach(w => prunedBw[w] = bw[w]);

            const dateStr = CT.getARDate(); const scoreId = Date.now().toString();
            let sList = CT.dbLocal('s'); const isHC = this.mode === 'hardcore';
            const newScore = { id: scoreId, n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title, hc: isHC };
            sList.unshift(newScore); CT.data.s = sList;

            let updatePayload = { bad_keys: bk, bad_words: prunedBw };
            if (isHC) { updatePayload.hi_hc = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi_hc) userDoc.hi_hc = []; userDoc.hi_hc.push(finalCPM); } 
            else { updatePayload.hi = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi) userDoc.hi = []; userDoc.hi.push(finalCPM); }
            
            userDoc.bad_keys = bk; userDoc.bad_words = prunedBw;
            db.collection('users').doc(u.h).update(updatePayload); 
            db.collection('scores').doc(scoreId).set(newScore); 
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => { CT.init(); });
