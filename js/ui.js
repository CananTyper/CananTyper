/* ================================================================
    CANANTYPER - INTERFAZ DE USUARIO (UI)
   ================================================================ */

window.UI = {
    listLayout: 'layout-list',
    trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null,
    formatValue: (cpm) => { return (window.CT.currentUnit === 'wpm') ? Math.round(cpm / window.CT.charPerWord) : cpm; },

    initSortable: (containerId, type, pageContext = 0) => {
        if (typeof Sortable === 'undefined') return;
        const container = document.getElementById(containerId);
        if (!container) return;
        if (container._sortable) { container._sortable.destroy(); container._sortable = null; }

        if (type === 'track' && !window.UI.filterFavs) return;

        container._sortable = Sortable.create(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex === evt.newIndex) return;
                window.App.handleDragReorder('favs', evt.oldIndex, evt.newIndex, pageContext);
            }
        });
    },

    setLayout: (mode) => {
        window.UI.listLayout = mode;
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
        } else {
            if(!document.getElementById('maintenance-screen').classList.contains('hidden')) { if(u) window.UI.showLobby(); else window.UI.show('auth-screen'); }
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
        if(window.CT.data.maint && window.CT.data.maint.active) { const u = window.CT.ses(); if(!u || u.r !== 'admin') { window.UI.checkMaintenance(); return; } }
        const u = window.CT.ses(); if(!u) return this.show('auth-screen');

        window.updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);

        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || window.CT.defAvatar;
        
        window.UI.updateUnitVisuals(window.CT.currentUnit); 
        this.renderGlobal(); 
        window.UI.renderTrainDropdown();
        this.show('home-screen');
        window.UI.checkAnnouncements(); 
    },

    showLobby() { this.initLobby(); },
    
    async showStats() { 
        const u = window.CT.ses();
        if(u) await window.App.getUserScores(u.h); 
        this.switchStatsTab('personal'); 
        window.UI.updateUnitVisuals(window.CT.currentUnit); 
        this.show('stats-screen'); 
    },
    
    showInfo() { this.renderInfoPage(); this.show('info-screen'); },

    async switchStatsTab(tab) {
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
        if(!window.CT.data.ui) return;
        Object.keys(window.CT.data.ui).forEach(k => {
            const el = document.getElementById(k);
            if(el) {
                if(k === 't_txt_new') { el.innerHTML = window.CT.data.ui[k].v.replace('Registrarse', '<span onclick="window.UI.toggleAuth(false)">Registrarse</span>'); }
                else if(k === 't_txt_haveacc') { el.innerHTML = window.CT.data.ui[k].v.replace('Inicia sesión', '<span onclick="window.UI.toggleAuth(true)">Inicia sesión</span>'); }
                else if(['t_sett_fast', 't_sett_fast_on', 't_sett_fast_off', 't_btn_pin_on', 't_btn_pin_off', 't_adm_btn_maint_on', 't_adm_btn_maint_off', 't_adm_srv_feat_info', 't_adm_srv_feat_theme'].includes(k)) { }
                else if(el.tagName === 'INPUT' && el.type === 'text') { el.placeholder = window.CT.data.ui[k].v; }
                else { el.innerText = window.CT.data.ui[k].v; }
            }
        });
    },

    renderPersonalStats() {
        const u = window.CT.ses(); if(!u) return;
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        const userScores = (window.CT.data.userScores[u.h] || []).filter(s => !s.hc); 
        
        document.querySelectorAll('.st-p-owner').forEach(el => el.innerText = userDoc.n);
        document.getElementById('st-p-total-races').innerText = userScores.length;
        
        const avgGen = userScores.length ? Math.round(userScores.reduce((a,b)=>a+b.c, 0) / userScores.length) : 0;
        document.getElementById('st-p-best-avg').innerText = window.UI.formatValue(avgGen);
        const last10Arr = [...userScores].sort((a,b)=>b.id - a.id).slice(0, 10);
        const avgLast10 = last10Arr.length ? Math.round(last10Arr.reduce((a,b)=>a+b.c, 0) / last10Arr.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = window.UI.formatValue(avgLast10);
        
        const phrases = window.CT.dbLocal('p'); let catAvgs = {};
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
        document.getElementById('st-p-top10-races').innerHTML = top10.map((s, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td></tr>`).join('');

        let trackAvgs = {};
        userScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
        let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
        let bottom5 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg).slice(0, 5);
        if(bottom5.length === 0) bottom5 = trackList.sort((a,b) => a.avg - b.avg).slice(0, 5);
        document.getElementById('st-p-worst-tracks').innerHTML = bottom5.map((tr, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.t}</div></td><td><b class="val-blurrable">${window.UI.formatValue(Math.round(tr.avg))}</b></td></tr>`).join('');

        const bw = userDoc.bad_words || {};
        let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 30);
        document.getElementById('st-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<tr><td><b>#${i+1}</b></td><td>${bwItem.w}</td><td><b>${bwItem.errs}</b></td></tr>`).join('');
    },

    renderHardcoreStats() {
        const u = window.CT.ses(); if(!u) return;
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        const hcScores = (window.CT.data.userScores[u.h] || []).filter(s => s.hc === true);
        
        const survCount = hcScores.length;
        const deaths = userDoc.hc_deaths || 0;
        const totalAttempts = survCount + deaths;
        const survRate = totalAttempts > 0 ? Math.round((deaths / totalAttempts) * 100) : 0;
        
        document.getElementById('st-hc-record').innerText = window.UI.formatValue(userDoc.hi_hc && userDoc.hi_hc.length > 0 ? Math.max(...userDoc.hi_hc) : 0);
        document.getElementById('st-hc-surv').innerText = survCount;
        document.getElementById('st-hc-deaths').innerText = deaths;
        document.getElementById('st-hc-rate').innerText = survRate + '%';

        const top10 = [...hcScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-hc-top10').innerHTML = top10.map((s, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b class="val-blurrable">${window.UI.formatValue(s.c)}</b></td></tr>`).join('');
        
        let trackDeaths = userDoc.hc_track_deaths || {};
        let deathList = Object.keys(trackDeaths).map(k => ({ t: k, d: trackDeaths[k] })).sort((a,b) => b.d - a.d).slice(0, 10);
        document.getElementById('st-hc-worst').innerHTML = deathList.map((td, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${td.t}</div></td><td><b>${td.d}</b></td></tr>`).join('');
    },

    renderGlobalStats() {
        const users = window.CT.dbLocal('u');
        document.getElementById('st-g-users-val').innerText = users.length; 
        
        let totalRaces = 0; let totalSum = 0; let globalMax = 0;
        users.forEach(u => {
            totalRaces += (u.hi || []).length;
            totalSum += (u.hi || []).reduce((a,b)=>a+b, 0);
            let uMax = Math.max(...(u.hi || [0]), 0);
            if(uMax > globalMax) globalMax = uMax;
        });
        
        document.getElementById('st-g-races-val').innerText = totalRaces;
        document.getElementById('st-g-avg').innerText = window.UI.formatValue(totalRaces ? Math.round(totalSum/totalRaces) : 0);
        document.getElementById('st-g-record').innerText = window.UI.formatValue(globalMax);
        
        let textCounts = {}; (window.CT.data.s_recent || []).forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
        const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-texts').innerHTML = topTexts.map((tr, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tr.t}</td><td>${tr.count}</td></tr>`).join('');
        
        const phrases = window.CT.dbLocal('p'); let catCounts = {}; 
        (window.CT.data.s_recent || []).forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-cats').innerHTML = topCats.map((tc, i) => `<tr><td><b style="color:var(--p)">#${i+1}</b></td><td>${tc.c}</td><td>${tc.count}</td></tr>`).join('');
    },

    renderEliteStats() {
        const users = window.CT.dbLocal('u'); if (users.length === 0) return;
        
        let mostRacesUser = users.reduce((p, c) => ((c.hi||[]).length > (p.hi||[]).length) ? c : p, users[0]);
        document.getElementById('st-e-most-races-val').innerText = (mostRacesUser.hi||[]).length;
        document.getElementById('st-e-most-races-user').innerText = mostRacesUser.n || "-";

        let recordUser = users.reduce((p, c) => {
            let maxC = Math.max(...(c.hi||[0]), 0);
            let maxP = Math.max(...(p.hi||[0]), 0);
            return maxC > maxP ? c : p;
        }, users[0]);
        document.getElementById('st-e-record-val').innerText = window.UI.formatValue(Math.max(...(recordUser.hi||[0]), 0));
        document.getElementById('st-e-record-user').innerText = recordUser.n || "-";

        let avgUser = users.reduce((p, c) => {
            let avgC = (c.hi||[]).length >= 5 ? (c.hi.reduce((a,b)=>a+b,0)/(c.hi.length)) : 0;
            let avgP = (p.hi||[]).length >= 5 ? (p.hi.reduce((a,b)=>a+b,0)/(p.hi.length)) : 0;
            return avgC > avgP ? c : p;
        }, users[0]);
        let bestAvg = (avgUser.hi||[]).length ? (avgUser.hi.reduce((a,b)=>a+b,0)/(avgUser.hi.length)) : 0;
        document.getElementById('st-e-bestavg-val').innerText = window.UI.formatValue(Math.round(bestAvg));
        document.getElementById('st-e-bestavg-user').innerText = avgUser.n || "-";

        const topS = window.CT.data.s_top || [];
        let tm = {}; topS.forEach(s => { if(!tm[s.track] || s.c > tm[s.track].c) tm[s.track] = s; });
        let top1c = {}; Object.values(tm).forEach(s => { top1c[s.h] = (top1c[s.h]||0)+1; });
        let mTop1h = Object.keys(top1c).reduce((a,b) => top1c[a] > top1c[b] ? a : b, "");
        let mTop1Name = mTop1h ? (users.find(u=>u.h===mTop1h)||{n:"-"}).n : "-";
        document.getElementById('st-e-top1-val').innerText = mTop1h ? top1c[mTop1h] : 0;
        document.getElementById('st-e-top1-user').innerText = mTop1Name;
        
        let tCounts = {}; topS.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; }); let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-texts').innerHTML = top10T.map((tr, i) => { let trMax = topS.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0}); return `<tr><td><b>#${i+1}</b></td><td>${tr}</td><td>${trMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(trMax.c)}</b></td></tr>`; }).join('');
        
        const phrases = window.CT.dbLocal('p');
        let scoresWithCat = topS.map(s => { let tObj = phrases.find(p => p.title.toString() === s.track.toString()); return { ...s, cat: tObj ? (tObj.c || 'General') : 'General' }; });
        let cCounts = {}; scoresWithCat.forEach(s => { cCounts[s.cat] = (cCounts[s.cat] || 0) + 1; }); let top10C = Object.keys(cCounts).sort((a,b) => cCounts[b] - cCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-cats').innerHTML = top10C.map((cat, i) => { let catMax = scoresWithCat.filter(s => s.cat === cat).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0}); return `<tr><td><b>#${i+1}</b></td><td>${cat}</td><td>${catMax.n}</td><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(catMax.c)}</b></td></tr>`; }).join('');
    },

    renderInfoPage() {
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

    setUnit: (unit) => {
        if(window.CT.currentUnit === unit) return;
        localStorage.removeItem('ct_custom_theme');
        const u = window.CT.ses(); 
        if(u && u.theme) { window.db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        document.documentElement.removeAttribute('data-custom-theme');

        window.CT.currentUnit = unit; localStorage.setItem('ct_unit_pref', unit); 
        window.UI.updateUnitVisuals(unit); 
        window.UI.refreshActiveViews();
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
        const textLabel = window.CT.data.ui && window.CT.data.ui['t_sett_fast'] ? window.CT.data.ui['t_sett_fast'].v : '⚡ Modo Rápido:';
        const onVal = window.CT.data.ui && window.CT.data.ui['t_sett_fast_on'] ? window.CT.data.ui['t_sett_fast_on'].v : 'SI';
        const offVal = window.CT.data.ui && window.CT.data.ui['t_sett_fast_off'] ? window.CT.data.ui['t_sett_fast_off'].v : 'NO';
        const btn = document.getElementById('btn-fast-mode');
        if(btn) btn.innerText = `${textLabel} ${window.CT.fastMode ? onVal : offVal}`;
    },

    toggleFastMode: () => {
        window.CT.fastMode = !window.CT.fastMode;
        localStorage.setItem('ct_fast_mode', window.CT.fastMode);
        window.UI.updateFastModeVisuals();
    },

    updateCategorySelects() {
        const cats = window.CT.dbLocal('c');
        const trnCats = cats.filter(c => c.name.startsWith('[TRN]'));
        const trnOptions = trnCats.map(c => `<option value="${c.name}">${c.name.replace('[TRN] ', '')}</option>`).join('');
        const trnNewCatSel = document.getElementById('trn-new-cat'); if(trnNewCatSel) trnNewCatSel.innerHTML = trnOptions;
        const trnDelCatSel = document.getElementById('trn-delete-cat-select'); if(trnDelCatSel) trnDelCatSel.innerHTML = trnOptions;
    },

    renderTrainDropdown() {
        const tPurge = window.CT.data.ui && window.CT.data.ui['t_btn_tr_purge'] ? window.CT.data.ui['t_btn_tr_purge'].v : '🔥 Purgar Errores';
        let html = `<button onclick="window.App.startPurge()">${tPurge}</button>`;
        const trnCats = window.CT.dbLocal('c').filter(c => c.name.startsWith('[TRN]'));
        trnCats.sort((a,b) => (a.order||0) - (b.order||0)).forEach(c => {
            const cleanName = c.name.replace('[TRN] ', '');
            html += `<button onclick="window.App.startTrnCategory('${c.name}')">⚡ ${cleanName}</button>`;
        });
        const drp = document.getElementById('train-dropdown');
        if(drp) drp.innerHTML = html;
    },

    renderGlobal() {
        const todayAR = window.CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        let filteredScores = typeEl.value === 'today' ? (window.CT.data.s_recent || []).filter(s => !s.hc && s.d === todayAR) : (window.CT.data.s_top || []).filter(s => !s.hc);
        let limitTimes = typeEl.value === 'today' ? 10 : 20; 
        filteredScores.sort((a,b) => b.c - a.c);
        
        document.getElementById('global-rank-times').innerHTML = filteredScores.slice(0, limitTimes).map((s, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="window.UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || window.CT.defAvatar}"></div><span>${s.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td>
                <td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width:100px;">${s.track}</span>
                    <button class="ghost-btn" onclick="window.App.startGhostRace('${s.track}', ${s.c})" title="Competir contra el Fantasma">👻</button>
                </div></td>
            </tr>`;
        }).join('');

        const rankingMode = rankTypeEl.value;
        const users = window.CT.dbLocal('u');
        let playerStats = users.map(u => {
            const history = u.hi || []; 
            let averageCPM = (rankingMode === 'last10') ? (history.slice(-10).length ? Math.round(history.slice(-10).reduce((a,b)=>a+b)/history.slice(-10).length) : 0) : (history.length ? Math.round(history.reduce((a,b)=>a+b)/history.length) : 0);
            return { n: u.n, a: u.a, h: u.h, avgCPM: averageCPM, total: history.length };
        }).filter(u => u.total > 0).sort((a,b) => b.avgCPM - a.avgCPM);

        document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="window.UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || window.CT.defAvatar}"></div><span>${p.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td>
            </tr>`;
        }).join('');
    },

    async showProfile(who) {
        try {
            const currentSes = window.CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            const u = window.CT.dbLocal('u').find(x => x.h === targetHandle); if(!u) return;
            window.CT.activeProfHandle = u.h;
            
            await window.App.getUserScores(u.h);
            
            document.getElementById('prof-name').innerText = u.n; document.getElementById('prof-img').src = u.a || window.CT.defAvatar; document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            const hi = u.hi || []; const total = hi.length; document.getElementById('st-total').innerText = total;
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10); const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;
            document.getElementById('st-avg').innerText = window.UI.formatValue(avgCPM); document.getElementById('st-last-10').innerText = window.UI.formatValue(avg10CPM); document.getElementById('st-best').innerText = window.UI.formatValue(bestCPM);
            window.CT.profPage = 0; this.renderProfileHistory();
            const isMe = (currentSes && u.h === currentSes.h);
            document.getElementById('btn-open-edit').classList.toggle('hidden', !isMe); document.getElementById('edit-dropdown').classList.add('hidden');
            this.show('profile-screen');
        } catch (error) { console.error(error); }
    },
    
    toggleEditMenu: () => { document.getElementById('edit-dropdown').classList.toggle('hidden'); },
    toggleSettings: () => { document.getElementById('settings-dropdown').classList.toggle('hidden'); const dot = document.getElementById('update-dot'); if (dot && dot.classList.contains('dot-yellow')) dot.classList.add('hidden'); },
    toggleTrainMenu: () => { document.getElementById('train-dropdown').classList.toggle('hidden'); },
    
    openThemeBuilder: () => { document.getElementById('theme-modal').classList.remove('hidden'); window.UI.toggleSettings(); },
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
        const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = window.CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td><td>${s.track}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="window.App.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = window.CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${window.CT.profPage + 1}`;
    },
    changeProfPage(delta) { const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc); const nextStart = (window.CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { window.CT.profPage += delta; this.renderProfileHistory(); } },

    checkAnnouncements: () => {
        const anns = window.CT.dbLocal('a').filter(x => x.active);
        if (anns.length > 0) {
            const latest = anns[0];
            const lastSeen = localStorage.getItem('ct_last_announcement');
            if (latest.id.toString() !== lastSeen) {
                window.UI.showAnnouncement(latest);
            }
        }
    },

    showTrackSelect() { document.getElementById('track-search').value = ''; window.UI.activeTrackCat = null; window.UI.filterFavs = false; window.UI.showTrackCategorySelect(); this.show('track-screen'); },
    showTrackCategorySelect() {
        document.getElementById('track-list-view').classList.add('hidden'); document.getElementById('track-category-view').classList.remove('hidden');
        const tracks = window.CT.dbLocal('p'); let cats = window.CT.dbLocal('c'); let catCounts = {}; 
        tracks.forEach(t => { const c = (t.c || 'General').trim(); catCounts[c] = (catCounts[c] || 0) + 1; });
        cats = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).sort((a,b) => (a.order || 0) - (b.order || 0));

        let t_fav = window.CT.data.ui && window.CT.data.ui['t_trk_fav_filter'] ? window.CT.data.ui['t_trk_fav_filter'].v : '⭐ Ver Favoritos';
        let html = `<div class="cat-card cat-fav-card" onclick="window.UI.toggleFavFilter()"><h3><span>${t_fav}</span></h3><span style="color:var(--text-main)">Textos favoritos</span></div>`;
        html += cats.map(cat => `<div class="cat-card" onclick="window.UI.selectTrackCategory('${cat.name}')"><h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span></div>`).join('');
        document.getElementById('track-category-view').innerHTML = html;
    },
    toggleFavFilter() { window.UI.filterFavs = true; window.UI.activeTrackCat = null; window.UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); window.UI.renderTrackList(); },
    selectTrackCategory(cat) { window.UI.activeTrackCat = cat; window.UI.filterFavs = false; window.UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); window.UI.renderTrackList(); },
    
    renderTrackList() {
        const query = (document.getElementById('track-search').value || "").toLowerCase(); let tracks = window.CT.dbLocal('p');
        const u = window.CT.ses(); let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];

        const listContainer = document.getElementById('track-list-full');
        listContainer.className = 'custom-scroll track-list ' + window.UI.listLayout;
        
        if (window.UI.filterFavs) listContainer.classList.add('fav-scroll');
        else listContainer.classList.remove('fav-scroll');

        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
        } else if (window.UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString()));
            filtered.sort((a,b) => favs.indexOf(a.id.toString()) - favs.indexOf(b.id.toString()));
        } else if (!window.UI.activeTrackCat) {
            window.UI.showTrackCategorySelect(); return;
        } else {
            filtered = tracks.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()); 
            filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0));
        }

        let textPinOn = window.CT.data.ui && window.CT.data.ui['t_btn_pin_on'] ? window.CT.data.ui['t_btn_pin_on'].v : '⭐';
        let textPinOff = window.CT.data.ui && window.CT.data.ui['t_btn_pin_off'] ? window.CT.data.ui['t_btn_pin_off'].v : '☆';

        const start = window.UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
        listContainer.innerHTML = pageData.map(t => {
            let isFav = favs.includes(t.id.toString());
            let starClass = isFav ? 'fav-active' : 'fav-inactive';
            
            let reorderFavHtml = (window.UI.filterFavs && !query) ? `<span class="drag-handle" style="cursor:grab; font-size:1.5rem; color:#ffd700; margin-top:5px; display:inline-block;" title="Arrastrar para ordenar" onclick="event.stopPropagation()">⠿</span>` : '';
            let cardStyle = isFav ? `border-color: color-mix(in srgb, #ffd700 50%, transparent); box-shadow: 0 5px 15px color-mix(in srgb, #ffd700 10%, transparent);` : ``;
            let idColorStyle = isFav ? `color: #ffd700; text-shadow: 0 0 10px color-mix(in srgb, #ffd700 30%, transparent);` : `color: var(--p);`;

            return `<div class="track-card" onclick="window.App.startRaceWithTrack('${t.id}')" style="${cardStyle}">
                <div class="track-card-id" style="display:flex; flex-direction:column; gap:10px; ${idColorStyle}">
                    #${t.title}
                    <button onclick="event.stopPropagation(); window.App.toggleFav('${t.id}')" class="fav-star-btn ${starClass}">${isFav ? textPinOn : textPinOff}</button>
                    ${reorderFavHtml}
                </div>
                <div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${(t.c || 'General').trim()}]</span></div>
            </div>`;
        }).join('');
        document.getElementById('track-prev').disabled = window.UI.trackPage === 0; document.getElementById('track-next').disabled = (start + 20) >= filtered.length; document.getElementById('track-page-num').innerText = `Página ${window.UI.trackPage + 1}`;
        
        setTimeout(() => {
            if (window.UI.filterFavs && !query) window.UI.initSortable('track-list-full', 'track', window.UI.trackPage);
            else { const c = document.getElementById('track-list-full'); if (c && c._sortable) { c._sortable.destroy(); c._sortable = null; } }
        }, 50);
    },
    changeTrackPage(delta) { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = window.CT.dbLocal('p'); const u = window.CT.ses(); let favs = (window.CT.dbLocal('u').find(x => x.h === u.h) || u).favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (window.UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()); } const nextStart = (window.UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { window.UI.trackPage += delta; this.renderTrackList(); } },

    showAnnouncement(data) { if(!data.id) return; window.UI.currentAnnId = data.id.toString(); document.getElementById('motd-icon').innerText = data.icon || "🚀"; document.getElementById('motd-title').innerText = data.title || "Anuncio"; document.getElementById('motd-msg').innerHTML = data.msg || ""; document.getElementById('announcement-modal').classList.remove('hidden'); },
    closeAnnouncement() { if(window.UI.currentAnnId) { localStorage.setItem('ct_last_announcement', window.UI.currentAnnId); } document.getElementById('announcement-modal').classList.add('hidden'); },

    openCropModal(src) { const img = document.getElementById('crop-image'); img.src = src; img.onload = () => { window.UI.cropScale = 1; window.UI.cropX = 0; window.UI.cropY = 0; document.getElementById('crop-zoom').value = 1; const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight; if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } window.UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); window.UI.setupCropEvents(); }; },
    closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform() { const img = document.getElementById('crop-image'); img.style.transform = `translate(-50%, -50%) translate(${window.UI.cropX}px, ${window.UI.cropY}px) scale(${window.UI.cropScale})`; img.style.left = '50%'; img.style.top = '50%'; },
    setupCropEvents() { const area = document.getElementById('crop-area'); const startDrag = (e) => { window.UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; window.UI.startX = cx - window.UI.cropX; window.UI.startY = cy - window.UI.cropY; }; const moveDrag = (e) => { if(!window.UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; window.UI.cropX = cx - window.UI.startX; window.UI.cropY = cy - window.UI.startY; window.UI.updateCropTransform(); }; const endDrag = () => { window.UI.isDragging = false; }; area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; document.getElementById('crop-zoom').oninput = (e) => { window.UI.cropScale = e.target.value; window.UI.updateCropTransform(); }; }
};
