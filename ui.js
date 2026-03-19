/* ================================================================
   CANANTYPER - MÓDULO UI (V2.1)
   Maneja DOM, Renderizado de Estadísticas, Modales y Temas.
   ================================================================ */

const UI = {
    listLayout: 'layout-list',
    trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null,
    
    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

    // EVENTO AÑADIDO: Leer la imagen de la PC
    handleImageUpload: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            UI.openCropModal(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    initSortable: (containerId, type, pageContext = 0) => {
        if (typeof Sortable === 'undefined') return;
        const container = document.getElementById(containerId);
        if (!container) return;
        if (container._sortable) { container._sortable.destroy(); container._sortable = null; }

        if (type === 'track' && !UI.filterFavs) return;

        container._sortable = Sortable.create(container, {
            handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex === evt.newIndex) return;
                UI.handleFavReorder(evt.oldIndex, evt.newIndex, pageContext);
            }
        });
    },

    handleFavReorder: (domOldIdx, domNewIdx, pageContext) => {
        const u = CT.ses(); if(!u) return;
        let favs = [...(u.favs || [])];
        let actualOldIdx = (pageContext * 20) + domOldIdx;
        let actualNewIdx = (pageContext * 20) + domNewIdx;

        if(actualOldIdx < 0 || actualOldIdx >= favs.length || actualNewIdx < 0 || actualNewIdx >= favs.length) return;

        const [movedItem] = favs.splice(actualOldIdx, 1);
        favs.splice(actualNewIdx, 0, movedItem);

        db.collection('users').doc(u.h).update({ favs: favs });
    },

    setLayout: (mode) => {
        UI.listLayout = mode; localStorage.setItem('ct_layout', mode);
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.style.borderColor = 'var(--p)'; btn.style.color = 'var(--p)'; btn.style.boxShadow = '0 0 10px color-mix(in srgb, var(--p) 20%, transparent)';
            } else {
                btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text-muted)'; btn.style.boxShadow = 'none';
            }
        });
        UI.refreshActiveViews();
    },

    checkMaintenance: () => {
        const m = CT.data.maint || { active: false, info: true, theme: true };
        const u = CT.ses(); 
        
        // Bloqueo si está activo
        if(m.active) {
            document.getElementById('maint-icon-display').innerText = m.icon || '🛠️';
            document.getElementById('maint-title-display').innerText = m.title || 'Mantenimiento';
            document.getElementById('maint-msg-display').innerText = m.msg || 'Volvemos pronto.';
            UI.show('maintenance-screen');
        } else {
            if(!document.getElementById('maintenance-screen').classList.contains('hidden')) { 
                if(u) UI.showLobby(); else UI.show('auth-screen'); 
            }
        }

        // Toggles de Info y Tema dictados por CananStudio
        const infoEnabled = m.info !== false;
        const themeEnabled = m.theme !== false;

        const navInfoBtn = document.getElementById('btn-nav-info');
        if(navInfoBtn) { if(!infoEnabled) navInfoBtn.classList.add('hidden'); else navInfoBtn.classList.remove('hidden'); }

        const themeBtn = document.getElementById('t_theme_btn');
        if(themeBtn) { if(!themeEnabled) themeBtn.classList.add('hidden'); else themeBtn.classList.remove('hidden'); }
    },
    
    show: (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    toggleAuth: (login) => { document.getElementById('login-form').classList.toggle('hidden', !login); document.getElementById('register-form').classList.toggle('hidden', login); },
    
    initLobby() {
        if(CT.data.maint && CT.data.maint.active) { UI.checkMaintenance(); return; } 
        const u = CT.ses(); if(!u) return this.show('auth-screen');

        if(typeof updateDiscordStatus === 'function') updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);

        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || CT.defAvatar;
        
        UI.applyUITexts();
        UI.updateUnitVisuals(CT.currentUnit); 
        UI.updateFastModeVisuals();
        UI.applySavedTheme();
        setTimeout(() => { if(UI.setLayout) UI.setLayout(UI.listLayout); }, 100);

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
        const userScores = (CT.data.userScores[u.h] || []).filter(s => !s.hc); 
        
        document.querySelectorAll('.st-p-owner').forEach(el => el.innerText = u.n);
        document.getElementById('st-p-total-races').innerText = userScores.length;
        
        const avgGen = userScores.length ? Math.round(userScores.reduce((a,b)=>a+b.c, 0) / userScores.length) : 0;
        document.getElementById('st-p-best-avg').innerText = UI.formatValue(avgGen);
        const last10Arr = [...userScores].sort((a,b)=>b.id - a.id).slice(0, 10);
        const avgLast10 = last10Arr.length ? Math.round(last10Arr.reduce((a,b)=>a+b.c, 0) / last10Arr.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = UI.formatValue(avgLast10);
        
        const phrases = CT.data.p; let catAvgs = {};
        userScores.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 }; catAvgs[cat].sum += s.c; catAvgs[cat].count++; });
        let bestCat = "-"; let maxCatAvg = -1;
        for (let c in catAvgs) { let avg = catAvgs[c].sum / catAvgs[c].count; if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; } }
        document.getElementById('st-p-best-cat').innerText = bestCat;

        const bk = u.bad_keys || {};
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
                el.style.removeProperty('background'); el.style.removeProperty('border-color'); el.style.removeProperty('color'); el.style.removeProperty('text-shadow');
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

        const bw = u.bad_words || {};
        let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 30);
        document.getElementById('st-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<tr><td><b>#${i+1}</b></td><td>${bwItem.w}</td><td><b>${bwItem.errs}</b></td></tr>`).join('');
    },

    renderHardcoreStats() {
        const u = CT.ses(); if(!u) return;
        const hcScores = (CT.data.userScores[u.h] || []).filter(s => s.hc === true);
        
        const survCount = hcScores.length;
        const deaths = u.hc_deaths || 0;
        const totalAttempts = survCount + deaths;
        const survRate = totalAttempts > 0 ? Math.round((survCount / totalAttempts) * 100) : 0;
        
        document.getElementById('st-hc-record').innerText = UI.formatValue(u.hi_hc && u.hi_hc.length > 0 ? Math.max(...u.hi_hc) : 0);
        document.getElementById('st-hc-surv').innerText = survCount;
        document.getElementById('st-hc-deaths').innerText = deaths;
        document.getElementById('st-hc-rate').innerText = survRate + '%';

        const top10 = [...hcScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-hc-top10').innerHTML = top10.map((s, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');
        
        let trackDeaths = u.hc_track_deaths || {};
        let deathList = Object.keys(trackDeaths).map(k => ({ t: k, d: trackDeaths[k] })).sort((a,b) => b.d - a.d).slice(0, 10);
        document.getElementById('st-hc-worst').innerHTML = deathList.map((td, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${td.t}</div></td><td><b>${td.d}</b></td></tr>`).join('');
    },

    renderGlobalStats() {
        const sTop = CT.data.s_top || [];
        const sRec = CT.data.s_recent || [];
        
        let uMap = {};
        sTop.forEach(s => { if(!uMap[s.h] || s.c > uMap[s.h].max) uMap[s.h] = { n: s.n, max: s.c }; });
        
        document.getElementById('st-g-users-val').innerText = Object.keys(uMap).length + "+";
        document.getElementById('st-g-races-val').innerText = sRec.length > 0 ? "1000+" : "0";
        
        let sumMax = 0; let countMax = 0; let globalMax = 0;
        Object.values(uMap).forEach(u => { sumMax += u.max; countMax++; if(u.max > globalMax) globalMax = u.max; });
        
        document.getElementById('st-g-avg').innerText = UI.formatValue(countMax ? Math.round(sumMax/countMax) : 0);
        document.getElementById('st-g-record').innerText = UI.formatValue(globalMax);
        
        let textCounts = {}; sRec.forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
        const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-texts').innerHTML = topTexts.map((tr, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tr.t}</td><td>${tr.count}</td></tr>`).join('');
        
        const phrases = CT.data.p; let catCounts = {}; 
        sRec.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-cats').innerHTML = topCats.map((tc, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tc.c}</td><td>${tc.count}</td></tr>`).join('');
    },

    renderEliteStats() {
        const topS = CT.data.s_top || [];
        if (topS.length === 0) return;
        
        let uCounts = {}; topS.forEach(s => { uCounts[s.h] = { n: s.n, count: (uCounts[s.h]?.count || 0) + 1, max: Math.max((uCounts[s.h]?.max || 0), s.c) }});
        
        let mostRacesUser = Object.values(uCounts).reduce((p, c) => (c.count > p.count) ? c : p, Object.values(uCounts)[0]);
        document.getElementById('st-e-most-races-val').innerText = mostRacesUser.count + "+";
        document.getElementById('st-e-most-races-user').innerText = mostRacesUser.n || "-";

        let recordUser = Object.values(uCounts).reduce((p, c) => (c.max > p.max) ? c : p, Object.values(uCounts)[0]);
        document.getElementById('st-e-record-val').innerText = UI.formatValue(recordUser.max);
        document.getElementById('st-e-record-user').innerText = recordUser.n || "-";

        let tm = {}; topS.forEach(s => { if(!tm[s.track] || s.c > tm[s.track].c) tm[s.track] = s; });
        let top1c = {}; Object.values(tm).forEach(s => { top1c[s.h] = { n: s.n, count: (top1c[s.h]?.count || 0)+1 }; });
        let mTop1Obj = Object.values(top1c).reduce((p, c) => c.count > p.count ? c : p, {n:"-", count:0});
        
        document.getElementById('st-e-top1-val').innerText = mTop1Obj.count;
        document.getElementById('st-e-top1-user').innerText = mTop1Obj.n;
        
        document.getElementById('st-e-bestavg-val').innerText = "N/A";
        document.getElementById('st-e-bestavg-user').innerText = "Requiere Admin";
        
        let tCounts = {}; topS.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; }); let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-texts').innerHTML = top10T.map((tr, i) => { let trMax = topS.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0}); return `<tr><td><b>#${i+1}</b></td><td>${tr}</td><td>${trMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(trMax.c)}</b></td></tr>`; }).join('');
        
        const phrases = CT.data.p;
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
        let html = `<button onclick="EngineControl.startPurge()">${tPurge}</button>`;
        const trnCats = CT.data.c.filter(c => c.name.startsWith('[TRN]'));
        trnCats.sort((a,b) => (a.order||0) - (b.order||0)).forEach(c => {
            const cleanName = c.name.replace('[TRN] ', '');
            html += `<button onclick="EngineControl.startTrnCategory('${c.name}')">⚡ ${cleanName}</button>`;
        });
        const drp = document.getElementById('train-dropdown');
        if(drp) drp.innerHTML = html;
    },

    renderGlobal() {
        const todayAR = CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        // Filtro Shadowban
        let filteredScores = typeEl.value === 'today' ? (CT.data.s_recent || []).filter(s => !s.hc && s.d === todayAR && !s.sb) : (CT.data.s_top || []).filter(s => !s.hc && !s.sb);
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
                    <button class="ghost-btn" onclick="EngineControl.startGhostRace('${s.track}', ${s.c})" title="Competir contra el Fantasma">👻</button>
                </div></td>
            </tr>`;
        }).join('');

        const rankingMode = rankTypeEl.value;
        let uAverages = {};
        (CT.data.s_recent || []).forEach(s => {
            if(s.sb) return;
            if(!uAverages[s.h]) uAverages[s.h] = { n: s.n, a: s.a, h: s.h, scores: [] };
            uAverages[s.h].scores.push(s.c);
        });

        let playerStats = Object.values(uAverages).map(p => {
            let relevantScores = rankingMode === 'last10' ? p.scores.slice(0, 10) : p.scores;
            let averageCPM = relevantScores.length ? Math.round(relevantScores.reduce((a,b)=>a+b)/relevantScores.length) : 0;
            return { ...p, avgCPM: averageCPM, total: p.scores.length };
        }).sort((a,b) => b.avgCPM - a.avgCPM);

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
            
            let u = (who === 'me') ? currentSes : null;
            if(!u) {
                const snap = await db.collection('users').doc(targetHandle).get();
                if(snap.exists) u = snap.data();
            }
            if(!u) return;

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
    
    saveTheme: (themeName) => {
        let themeObj;
        if (themeName === 'galactic') { themeObj = { p: '#b388ff', bg: '#090a0f', surface: '#161824' }; }
        else if (themeName === 'hacker') { themeObj = { p: '#00ff00', bg: '#050505', surface: '#0a0a0a' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: themeObj }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },

    renderProfileHistory() {
        const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="EngineControl.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc); const nextStart = (CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { CT.profPage += delta; this.renderProfileHistory(); } },

    checkAnnouncements: () => {
        const anns = CT.data.a.filter(x => x.active);
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
        const tracks = CT.data.p; let cats = CT.data.c; let catCounts = {}; 
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
        const query = (document.getElementById('track-search').value || "").toLowerCase(); let tracks = CT.data.p;
        const u = CT.ses(); let favs = u.favs || [];

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

            return `<div class="track-card" onclick="EngineControl.startRaceWithTrack('${t.id}')" style="${cardStyle}">
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
    changeTrackPage(delta) { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = CT.data.p; const u = CT.ses(); let favs = u.favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General').trim() === UI.activeTrackCat.trim()); } const nextStart = (UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.trackPage += delta; this.renderTrackList(); } },

    openCropModal(src) { const img = document.getElementById('crop-image'); img.src = src; img.onload = () => { UI.cropScale = 1; UI.cropX = 0; UI.cropY = 0; document.getElementById('crop-zoom').value = 1; const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight; if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); UI.setupCropEvents(); }; },
    closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform() { const img = document.getElementById('crop-image'); img.style.transform = `translate(-50%, -50%) translate(${UI.cropX}px, ${UI.cropY}px) scale(${UI.cropScale})`; img.style.left = '50%'; img.style.top = '50%'; },
    setupCropEvents() { const area = document.getElementById('crop-area'); const startDrag = (e) => { UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.startX = cx - UI.cropX; UI.startY = cy - UI.cropY; }; const moveDrag = (e) => { if(!UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.cropX = cx - UI.startX; UI.cropY = cy - UI.startY; UI.updateCropTransform(); }; const endDrag = () => { UI.isDragging = false; }; area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; document.getElementById('crop-zoom').oninput = (e) => { UI.cropScale = e.target.value; UI.updateCropTransform(); }; },
    
    saveCrop: () => { 
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); 
        const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; 
        let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } 
        const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; 
        const sW = (imgW * 220) / (viewerImgW * UI.cropScale); const sH = (imgH * 220) / (viewerImgH * UI.cropScale); 
        const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale)); 
        const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale)); 
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); 
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); 
        const u = CT.ses(); 
        if(u) { 
            db.collection('users').doc(u.h).update({ a: compressedBase64 }); 
            db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); 
            document.getElementById('prof-img').src = compressedBase64; 
        } 
        UI.closeCropModal(); 
    }
};
