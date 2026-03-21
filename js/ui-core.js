/* ================================================================
    CANANTYPER - UI CORE (NÚCLEO)
   ================================================================ */

window.UI = {
    listLayout: 'layout-list', trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null, activeStatsTab: 'personal',
    
    // Motor inteligente para listas
    _genList: (arr, limit, hasMeta, rowFn) => {
        let html = '';
        for(let i=0; i<limit; i++) {
            if(arr[i]) html += rowFn(arr[i], i+1);
            else html += `<li class="st-list-item" style="opacity:0.3;"><div class="st-list-rank">#${i+1}</div><div class="st-list-name">Vacío</div>${hasMeta ? '<div class="st-list-meta">-</div>' : ''}<div class="st-list-val">-</div></li>`;
        }
        return html;
    },

    formatValue: (cpm) => Math.round((window.CT.currentUnit === 'wpm') ? cpm / window.CT.charPerWord : cpm),
    formatTrackName: (t) => (!t ? 'Desconocido' : (isNaN(t) ? t : '#' + t)),
    formatTrackNameFull: (t) => { 
        if(!t) return 'Desconocido';
        const cat = window.UI.getTrackCat(t); const name = isNaN(t) ? t : 'Texto ' + t;
        return (cat && cat !== 'General' && cat !== '-') ? name + ' | ' + cat.replace('[TRN] ', '') : name + ' | ' + cat; 
    },

    isCompetitiveTrack: (trackTitle) => {
        if(!trackTitle) return false;
        const tObj = window.CT.dbLocal('p').find(p => p.title && p.title.toString() === trackTitle.toString());
        if(!tObj) return true;
        const cat = (tObj.c || '').trim(); return cat !== 'General' && cat !== 'Entrenamiento' && !cat.includes('[TRN]');
    },

    getTrackCat: (trackTitle) => {
        if(!trackTitle) return 'General';
        const tObj = window.CT.dbLocal('p').find(p => p.title && p.title.toString() === trackTitle.toString());
        return tObj ? (tObj.c || 'General').trim() : 'General';
    },

    show: (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    toggleAuth: (login) => { document.getElementById('login-form').classList.toggle('hidden', !login); document.getElementById('register-form').classList.toggle('hidden', login); },
    
    setLayout: (mode) => {
        window.UI.listLayout = mode; localStorage.setItem('ct_layout', mode);
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.dataset.mode === mode) { btn.style.borderColor = 'var(--p)'; btn.style.color = 'var(--p)'; btn.style.boxShadow = '0 0 10px color-mix(in srgb, var(--p) 20%, transparent)'; } 
            else { btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text-muted)'; btn.style.boxShadow = 'none'; }
        });
        window.UI.refreshActiveViews();
    },

    checkMaintenance: () => {
        const m = window.CT.data.maint || { active: false, info: true, theme: true };
        const u = window.CT.ses(); const isAdmin = u && u.r === 'admin';
        if(m.active && !isAdmin) {
            document.getElementById('maint-icon-display').innerText = m.icon || '🛠️';
            document.getElementById('maint-title-display').innerText = m.title || 'Mantenimiento';
            document.getElementById('maint-msg-display').innerText = m.msg || 'Volvemos pronto.';
            window.UI.show('maintenance-screen');
        } else if(!document.getElementById('maintenance-screen').classList.contains('hidden')) { 
            if(u) window.UI.showLobby(); else window.UI.show('auth-screen'); 
        }
        const navInfoBtn = document.getElementById('btn-nav-info');
        if(navInfoBtn) { if(m.info === false && !isAdmin) navInfoBtn.classList.add('hidden'); else navInfoBtn.classList.remove('hidden'); }
        const themeBtn = document.getElementById('t_theme_btn');
        if(themeBtn) { if(m.theme === false && !isAdmin) themeBtn.classList.add('hidden'); else themeBtn.classList.remove('hidden'); }
    },

    setUnit: (unit) => {
        if(window.CT.currentUnit === unit) return;
        localStorage.removeItem('ct_custom_theme');
        const u = window.CT.ses(); 
        if(u && u.theme) { window.db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        document.documentElement.removeAttribute('data-custom-theme');
        window.CT.currentUnit = unit; localStorage.setItem('ct_unit_pref', unit); 
        window.UI.updateUnitVisuals(unit); window.UI.refreshActiveViews();
    },

    updateUnitVisuals: (unit) => {
        document.documentElement.setAttribute('data-theme', unit);
        document.querySelectorAll('.unit-switcher .sw-btn').forEach(s => s.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${unit}`); if(activeBtn) activeBtn.classList.add('active');
        
        const label = unit === 'zen' ? 'ZEN' : unit.toUpperCase();
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-unit-admin', 'th-st-p-vel', 'th-st-p-t-max', 'th-st-e-t-vel', 'th-st-e-c-vel', 'th_st_p_top10_vel'];
        thIds.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).innerText = 'VEL. (' + label + ')'; document.getElementById(id).classList.add('active-unit'); } });
        
        const els = { 'th-unit-rank': 'PROMEDIO ', 'lbl-st-avg': 'PROM. ', 'lbl-st-last': 'ÚLT. 10 ', 'lbl-st-best': 'RÉCORD ', 'game-unit-label': '' };
        Object.keys(els).forEach(k => { if(document.getElementById(k)) document.getElementById(k).innerText = els[k] + label; });
    },

    updateFastModeVisuals: () => {
        const textLabel = window.CT.data.ui && window.CT.data.ui['t_sett_fast'] ? window.CT.data.ui['t_sett_fast'].v : '⚡ Modo Rápido:';
        const onVal = window.CT.data.ui && window.CT.data.ui['t_sett_fast_on'] ? window.CT.data.ui['t_sett_fast_on'].v : 'SI';
        const offVal = window.CT.data.ui && window.CT.data.ui['t_sett_fast_off'] ? window.CT.data.ui['t_sett_fast_off'].v : 'NO';
        const btn = document.getElementById('btn-fast-mode');
        if(btn) btn.innerText = `${textLabel} ${window.CT.fastMode ? onVal : offVal}`;
    },

    toggleFastMode: () => { window.CT.fastMode = !window.CT.fastMode; localStorage.setItem('ct_fast_mode', window.CT.fastMode); window.UI.updateFastModeVisuals(); },

    applySavedTheme: () => {
        const customTheme = localStorage.getItem('ct_custom_theme');
        if (customTheme) {
            const t = JSON.parse(customTheme);
            document.documentElement.setAttribute('data-custom-theme', 'true');
            document.documentElement.style.setProperty('--theme-custom', t.p);
            document.documentElement.style.setProperty('--bg-custom', t.bg);
            document.documentElement.style.setProperty('--surface-custom', t.surface);
        } else { document.documentElement.removeAttribute('data-custom-theme'); }
    },

    applyUITexts: () => {
        if(!window.CT.data.ui) return;
        Object.keys(window.CT.data.ui).forEach(k => {
            const el = document.getElementById(k);
            if(el) {
                if(k === 't_txt_new') el.innerHTML = window.CT.data.ui[k].v.replace('Registrarse', '<span onclick="window.UI.toggleAuth(false)">Registrarse</span>');
                else if(k === 't_txt_haveacc') el.innerHTML = window.CT.data.ui[k].v.replace('Inicia sesión', '<span onclick="window.UI.toggleAuth(true)">Inicia sesión</span>');
                else if(!['t_sett_fast', 't_sett_fast_on', 't_sett_fast_off', 't_btn_pin_on', 't_btn_pin_off', 't_adm_btn_maint_on', 't_adm_btn_maint_off', 't_adm_srv_feat_info', 't_adm_srv_feat_theme'].includes(k)) {
                    if(el.tagName === 'INPUT' && el.type === 'text') el.placeholder = window.CT.data.ui[k].v; else el.innerText = window.CT.data.ui[k].v;
                }
            }
        });
    },

    showInfo: () => { window.UI.renderInfoPage(); window.UI.show('info-screen'); },
    renderInfoPage: () => {
        if(!window.CT.data.info) return;
        document.getElementById('info-display-title').innerText = window.CT.data.info.title || "Información";
        document.getElementById('info-display-content').innerHTML = window.CT.data.info.content || "";
    },

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; 
        if(!document.getElementById('home-screen').classList.contains('hidden')) window.UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) window.UI.showProfile(window.CT.activeProfHandle || 'me');
        if(!document.getElementById('track-screen').classList.contains('hidden')) { if(window.UI.activeTrackCat || window.UI.filterFavs) window.UI.renderTrackList(); else window.UI.showTrackCategorySelect(); }
        if(!document.getElementById('stats-screen').classList.contains('hidden')) { if(!document.getElementById('pane-stats-personal').classList.contains('hidden')) window.UI.renderPersonalStats(); else if(!document.getElementById('pane-stats-general').classList.contains('hidden')) window.UI.renderGlobalStats(); else if(!document.getElementById('pane-stats-elite').classList.contains('hidden')) window.UI.renderEliteStats(); else window.UI.renderHardcoreStats(); }
    },

    ses: () => { 
        const s = JSON.parse(localStorage.getItem('ct_ses')); 
        if(!s) return null;
        const found = (window.CT.data.u || []).find(x => x.h === s.h);
        return found || { h: s.h, n: s.h, r: 'usuario' }; 
    }
};

// Disparador principal aislado (solo se ejecuta aquí)
document.addEventListener('DOMContentLoaded', () => { 
    if(window.CT && window.CT.init) window.CT.init(); 
});
