/* ================================================================
    CANANTYPER - GESTIÓN DE ESTADO (STATE)
   ================================================================ */

window.CT = {
    data: { u: [], p: [], c: [], a: [], ui: null, maint: null, info: null, shortcuts: null, s_top: null, s_recent: null, userScores: {}, statsLayout: null }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5, editIdx: null, profPage: 0, activeProfHandle: null, fastMode: false,
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    dbLocal: (k) => window.CT.data[k] || [], 
    
    init: function() {
        let storedUnit = localStorage.getItem('ct_unit_pref');
        if (storedUnit !== 'cpm' && storedUnit !== 'wpm' && storedUnit !== 'zen') { storedUnit = 'cpm'; localStorage.setItem('ct_unit_pref', 'cpm'); }
        this.currentUnit = storedUnit;
        document.documentElement.setAttribute('data-theme', this.currentUnit);

        this.fastMode = localStorage.getItem('ct_fast_mode') === 'true';
        window.UI.listLayout = localStorage.getItem('ct_layout') || 'layout-list';

        const cU = localStorage.getItem('ct_cache_u'); 
        const cP = localStorage.getItem('ct_cache_p'); const cC = localStorage.getItem('ct_cache_c');
        const cUi = localStorage.getItem('ct_cache_ui'); 
        
        if(cU) this.data.u = JSON.parse(cU); 
        if(cP) this.data.p = JSON.parse(cP); if(cC) this.data.c = JSON.parse(cC);
        if(cUi) { this.data.ui = JSON.parse(cUi); window.UI.applyUITexts(); }

        window.UI.updateUnitVisuals(this.currentUnit);
        window.UI.updateFastModeVisuals();
        window.UI.applySavedTheme();
        
        setTimeout(() => { if(window.UI.setLayout) window.UI.setLayout(window.UI.listLayout); }, 100);
        
        if (!window.isDesktopEnv) {
            const dlBtn = document.getElementById('btn-direct-download');
            if (dlBtn) dlBtn.classList.remove('hidden');
        }

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            if (!window.App.activeEngine) return;
            const sc = window.CT.data.shortcuts || { restart: 'Tab', next: 'Enter', quit: 'Escape' };
            if (e.key === sc.restart) { e.preventDefault(); window.App.retryRace(); }
            else if (e.key === sc.next) { e.preventDefault(); window.App.nextRace(); }
            else if (e.key === sc.quit) { e.preventDefault(); window.App.quitRace(); }
        });
        
        window.db.collection('config').doc('maintenance').onSnapshot(snap => {
            if(snap.exists) { this.data.maint = snap.data(); } else {
                this.data.maint = { active: false, icon: '🛠️', title: 'Mantenimiento', msg: 'Actualizando.', info: true, theme: true };
                if(this.ses() && this.ses().r === 'admin') window.db.collection('config').doc('maintenance').set(this.data.maint);
            }
            window.UI.checkMaintenance();
        });

        window.db.collection('config').doc('stats_layout').onSnapshot(snap => {
            const defLayout = {
                personal: [{id:'w-p-summary', v:true, s:3}, {id:'w-p-recent', v:true, s:3}, {id:'w-p-record', v:true, s:3}, {id:'w-p-specialty', v:true, s:3}, {id:'w-p-graph', v:true, s:8}, {id:'w-p-donut', v:true, s:4}, {id:'w-p-dist', v:true, s:4}, {id:'w-p-heat', v:true, s:8}, {id:'w-p-top', v:true, s:6}, {id:'w-p-worst', v:true, s:6}],
                elite: [{id:'w-e-vol', v:true, s:3}, {id:'w-e-dom', v:true, s:3}, {id:'w-e-eff', v:true, s:3}, {id:'w-e-rec', v:true, s:3}, {id:'w-e-graph', v:true, s:8}, {id:'w-e-donut', v:true, s:4}, {id:'w-e-texts', v:true, s:4}, {id:'w-e-cats', v:true, s:4}, {id:'w-e-players', v:true, s:4}],
                hc: [{id:'w-h-rec', v:true, s:3}, {id:'w-h-surv', v:true, s:3}, {id:'w-h-death', v:true, s:3}, {id:'w-h-rate', v:true, s:3}, {id:'w-h-top', v:true, s:4}, {id:'w-h-worst', v:true, s:4}, {id:'w-h-victims', v:true, s:4}]
            };

            let data = snap.exists ? snap.data() : {};
            
            ['personal', 'elite', 'hc'].forEach(t => {
                if(!data[t]) data[t] = defLayout[t];
                else {
                    defLayout[t].forEach(defW => {
                        if(!data[t].find(w => w.id === defW.id)) data[t].push(defW);
                    });
                }
            });

            this.data.statsLayout = data;
            
            if(!snap.exists && this.ses() && this.ses().r === 'admin') {
                window.db.collection('config').doc('stats_layout').set(this.data.statsLayout);
            }
            window.UI.applyStatsLayout();
        });

        window.db.collection('config').doc('info_page').onSnapshot(snap => {
            if(snap.exists) { this.data.info = snap.data(); } else { this.data.info = { title: "Información", content: "Bienvenido a CananTyper." }; }
            window.UI.renderInfoPage();
        });

        window.db.collection('config').doc('shortcuts').onSnapshot(snap => {
            if(snap.exists) { this.data.shortcuts = snap.data(); } else { this.data.shortcuts = { restart: 'Tab', next: 'Enter', quit: 'Escape' }; }
        });

        if(this.ses()) { window.UI.initLobby(); } 
        else { window.UI.show('auth-screen'); window.updateDiscordStatus("En la pantalla de acceso", "Esperando credenciales...", false); }

        window.db.collection('users').onSnapshot(snap => { this.data.u = snap.docs.map(d => d.data()); localStorage.setItem('ct_cache_u', JSON.stringify(this.data.u)); window.UI.refreshActiveViews(); });
        
        window.App.loadDashboardData();

        window.db.collection('phrases').onSnapshot(snap => { 
            this.data.p = snap.docs.map(d => d.data()); 
            if(this.data.p.length === 0) { window.db.collection('phrases').doc("1").set({ id: 1, title: "1", c: "General", text: "La programación es un arte.", order: Date.now() }); }
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p)); window.UI.refreshActiveViews(); 
        });
        window.db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            if(this.data.c.length === 0) { window.db.collection('categories').doc("General").set({name: "General", order: Date.now()}); }
            localStorage.setItem('ct_cache_c', JSON.stringify(this.data.c)); window.UI.updateCategorySelects(); window.UI.renderTrainDropdown(); window.UI.refreshActiveViews(); 
        });
        window.db.collection('announcements').orderBy('id', 'desc').onSnapshot(snap => { this.data.a = snap.docs.map(d => d.data()); window.UI.checkAnnouncements(); window.UI.refreshActiveViews(); });

        window.db.collection('config').doc('ui_texts').onSnapshot(snap => {
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
                't_lbl_exit': { l: 'Btn Salir', v: 'SALIR' }, 't_phr_search': { l: 'Phrases Buscar', v: 'Buscar texto...' },
                't_phr_btn_update': { l: 'Phrases Btn Update', v: 'ACTUALIZAR' }, 't_phr_btn_cancel': { l: 'Phrases Btn Cancel', v: 'CANCELAR' },
                't_phr_btn_edit': { l: 'Phrases Btn Edit', v: 'EDITAR' }, 't_phr_btn_delete': { l: 'Phrases Btn Delete', v: 'BORRAR' },
                't_usr_btn_img': { l: 'Users Btn Img', v: 'IMAGEN' }, 't_lbl_theme_classic_g': { l: 'Tema Clasico Verde', v: 'Clásico (Verde)' },
                't_lbl_theme_classic_o': { l: 'Tema Clasico Naranja', v: 'Clásico (Naranja)' }, 't_lbl_theme_galactic': { l: 'Tema Galactico', v: 'Galáctico (Snoopy)' },
                't_lbl_theme_hacker': { l: 'Tema Hacker', v: 'Hacker Terminal' },
                't_adm_btn_save_phr': { l: 'Admin Btn Save Phr', v: 'GUARDAR TEXTO' }, 't_adm_btn_del_cat': { l: 'Admin Btn Del Cat', v: 'ELIMINAR' },
                't_adm_btn_cre_cat': { l: 'Admin Btn Cre Cat', v: 'CREAR CATEGORÍA' }, 't_st_lbl_cpm': { l: 'Stats Lbl CPM', v: 'CPM' },
                't_st_lbl_wpm': { l: 'Stats Lbl WPM', v: 'WPM' }, 't_game_lbl_time': { l: 'Game Lbl Tiempo', v: 'TIEMPO' },
                't_game_lbl_speed': { l: 'Game Lbl Velocidad', v: 'VELOCIDAD' }, 't_crop_lbl_zoom': { l: 'Crop Lbl Zoom', v: 'Zoom' },
                't_nav_logout_tt': { l: 'Nav Logout Tooltip', v: 'Cerrar Sesión' }, 't_nav_settings_tt': { l: 'Nav Settings Tooltip', v: 'Ajustes' }
            };
            
            if (!snap.exists && window.CT.data.ui && Object.keys(window.CT.data.ui).length > 0) return;

            window.CT.data.ui = window.CT.data.ui || {};
            const snapData = snap.exists ? snap.data() : {};
            
            Object.keys(defaults).forEach(k => {
                if (snapData[k] && typeof snapData[k] === 'object' && snapData[k].v !== undefined) {
                    window.CT.data.ui[k] = { l: snapData[k].l || defaults[k].l, v: snapData[k].v };
                } else if (typeof snapData[k] === 'string') {
                    window.CT.data.ui[k] = { l: defaults[k].l, v: snapData[k] };
                } else {
                    window.CT.data.ui[k] = { l: defaults[k].l, v: defaults[k].v };
                }
            });
            localStorage.setItem('ct_cache_ui', JSON.stringify(window.CT.data.ui));
            window.UI.applyUITexts(); window.UI.refreshActiveViews();
        });
    },
    ses: () => { const s = JSON.parse(localStorage.getItem('ct_ses')); return s ? (window.CT.data.u || []).find(x => x.h === s.h) : null; }
};
