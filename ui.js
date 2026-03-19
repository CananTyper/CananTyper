/* ================================================================
   CANANTYPER - MÓDULO UI (V2.2 - COMPETITIVO)
   ================================================================ */

const UI = {
    listLayout: 'layout-list',
    trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null,
    personalChartInstance: null,
    
    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

    handleImageUpload: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            UI.openCropModal(e.target.result);
        };
        reader.readAsDataURL(file);
    },

    setLayout: (mode) => {
        UI.listLayout = mode; localStorage.setItem('ct_layout', mode);
        document.querySelectorAll('.layout-btn').forEach(btn => {
            if (btn.dataset.mode === mode) { btn.style.color = 'var(--p)'; } 
            else { btn.style.color = 'var(--text-muted)'; }
        });
        UI.refreshActiveViews();
    },

    checkMaintenance: () => {
        const m = CT.data.maint || { active: false, info: true, theme: true };
        const u = CT.ses(); 
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
        const infoEnabled = m.info !== false;
        const navInfoBtn = document.getElementById('btn-nav-info');
        if(navInfoBtn) { if(!infoEnabled) navInfoBtn.classList.add('hidden'); else navInfoBtn.classList.remove('hidden'); }
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
        
        UI.applyUITexts(); UI.updateUnitVisuals(CT.currentUnit); UI.updateFastModeVisuals(); UI.applySavedTheme();
        this.renderGlobal(); UI.renderTrainDropdown(); this.show('home-screen'); UI.checkAnnouncements(); 
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
                else if(el.tagName === 'INPUT' && el.type === 'text') { el.placeholder = CT.data.ui[k].v; }
                else if(['t_sett_fast', 't_sett_fast_on', 't_sett_fast_off'].includes(k)) {}
                else { el.innerText = CT.data.ui[k].v; }
            }
        });
    },

    renderPersonalStats() {
        const u = CT.ses(); if(!u) return;
        const userScores = (CT.data.userScores[u.h] || []).filter(s => !s.hc); 
        
        document.querySelectorAll('.st-p-owner').forEach(el => el.innerText = u.n);
        
        // Numéricos (Arrays históricos exactos del user doc)
        const hi = u.hi || []; const totalRaces = hi.length;
        document.getElementById('st-p-total-races').innerText = totalRaces;
        
        const avgGen = totalRaces ? Math.round(hi.reduce((a,b)=>a+b, 0) / totalRaces) : 0;
        document.getElementById('st-p-best-avg').innerText = UI.formatValue(avgGen);
        
        const last10hi = hi.slice(-10);
        const avgLast10 = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0) / last10hi.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = UI.formatValue(avgLast10);
        
        // Mejor Categoría (requiere cruce con frases)
        const phrases = CT.data.p; let catAvgs = {};
        userScores.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 }; catAvgs[cat].sum += s.c; catAvgs[cat].count++; });
        let bestCat = "-"; let maxCatAvg = -1;
        for (let c in catAvgs) { let avg = catAvgs[c].sum / catAvgs[c].count; if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; } }
        document.getElementById('st-p-best-cat').innerText = bestCat;

        // Gráfico de Evolución (similar CananStudio)
        if(typeof Chart !== 'undefined' && document.getElementById('personal-trend-chart')) {
            if(UI.personalChartInstance) UI.personalChartInstance.destroy();
            const ctx = document.getElementById('personal-trend-chart').getContext('2d');
            const trendData = hi.slice(-20); // Últimas 20
            const labels = trendData.map((s, i) => `#${i+1}`);
            const dataPts = trendData.map(s => UI.formatValue(s));
            
            Chart.defaults.color = '#777'; Chart.defaults.font.family = 'monospace';
            UI.personalChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'Velocidad', data: dataPts, borderColor: '#a6ff00', backgroundColor: 'rgba(166,255,0,0.05)', fill: true, tension: 0.1, pointRadius: 2, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { grid: { color: '#222' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { display: false } } } }
            });
        }

        // Teclado Heatmap
        const bk = u.bad_keys || {};
        const maxErr = Math.max(...Object.values(bk), 1); 
        document.querySelectorAll('kbd[data-key]').forEach(el => {
            const key = el.getAttribute('data-key'); const errs = bk[key] || 0;
            if(errs > 0) {
                const pct = (errs / maxErr) * 100; const bgPct = Math.max(10, Math.min(pct, 70)); 
                el.style.setProperty('background', `color-mix(in srgb, var(--error) ${bgPct}%, rgba(0,0,0,0.3))`, 'important');
                el.style.setProperty('border-color', 'var(--error)', 'important');
                el.style.setProperty('color', '#ffffff', 'important');
                el.title = `${errs} errores históricos`;
            } else { el.style.removeProperty('background'); el.style.removeProperty('border-color'); el.style.removeProperty('color'); el.title = '0 errores'; }
        });

        // Tablas
        const top10 = [...userScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-p-top10-races').innerHTML = top10.map((s, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td></tr>`).join('');

        let trackAvgs = {}; userScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
        let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
        let bottom5 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg).slice(0, 5);
        document.getElementById('st-p-worst-tracks').innerHTML = bottom5.map((tr, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.t}</div></td><td><b class="val-blurrable">${UI.formatValue(Math.round(tr.avg))}</b></td></tr>`).join('');

        const bw = u.bad_words || {}; let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 30);
        document.getElementById('st-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<tr><td><b>#${i+1}</b></td><td>${bwItem.w}</td><td><b>${bwItem.errs}</b></td></tr>`).join('');
    },

    renderHardcoreStats() {
        const u = CT.ses(); if(!u) return;
        
        // Exactos del Servidor (Calculados desde Élite)
        const eliteUsers = CT.data.eliteUsers || [];
        let rG = 0; let mG = 0; let dG = 0; let dnG = 0;
        let rU = "-", sU = "-", dU = "-", dnU = "-";

        eliteUsers.forEach(eu => {
            let maxHC = eu.hi_hc && eu.hi_hc.length > 0 ? Math.max(...eu.hi_hc) : 0;
            if(maxHC > rG) { rG = maxHC; rU = eu.n; }
            
            let survCount = (eu.hi_hc || []).length;
            if(survCount > mG) { mG = survCount; sU = eu.n; }

            let deathCount = eu.hc_deaths || 0;
            if(deathCount > dG) { dG = deathCount; dU = eu.n; }
            
            let total = survCount + deathCount;
            if(total >= 3) {
                let rate = deathCount / total;
                if(rate > dnG) { dnG = rate; dnU = eu.n; }
            }
        });

        document.getElementById('st-hc-record').innerText = UI.formatValue(rG);
        document.getElementById('st-hc-record-user').innerText = rU;
        document.getElementById('st-hc-surv').innerText = mG;
        document.getElementById('st-hc-surv-user').innerText = sU;
        document.getElementById('st-hc-deaths').innerText = dG;
        document.getElementById('st-hc-deaths-user').innerText = dU;
        document.getElementById('st-hc-danger-val').innerText = Math.round(dnG * 100) + "%";
        document.getElementById('st-hc-danger-user').innerText = dnU;

        const top10HC = eliteUsers.filter(eu => eu.hi_hc && eu.hi_hc.length > 0).sort((a,b) => Math.max(...b.hi_hc) - Math.max(...a.hi_hc)).slice(0, 10);
        document.getElementById('st-hc-top10').innerHTML = top10HC.map((eu, i) => `<tr><td><b>#${i+1}</b></td><td><div class="player-link" onclick="UI.showProfile('${eu.h}')"><div class="avatar-xs"><img src="${eu.a || CT.defAvatar}"></div><span>${eu.n}</span></div></td><td><b class="val-blurrable">${UI.formatValue(Math.max(...eu.hi_hc))}</b></td></tr>`).join('');
        
        let trackDeathsGlobal = {}; eliteUsers.forEach(eu => { if(eu.hc_track_deaths) { Object.keys(eu.hc_track_deaths).forEach(tId => { trackDeathsGlobal[tId] = (trackDeathsGlobal[tId] || 0) + eu.hc_track_deaths[tId]; }); } });
        let deathList = Object.keys(trackDeathsGlobal).map(k => ({ t: k, d: trackDeathsGlobal[k] })).sort((a,b) => b.d - a.d).slice(0, 10);
        document.getElementById('st-hc-worst').innerHTML = deathList.map((td, i) => `<tr><td><b>#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${td.t}</div></td><td><b>${td.d} ☠️</b></td></tr>`).join('');
    },

    renderEliteStats() {
        const eliteUsers = CT.data.eliteUsers || [];
        if (eliteUsers.length === 0) return;
        
        // Agregación Local CananTyper 2.2 (Agregación matemática en cliente sin costo de cuota)
        let mostRacesUser = eliteUsers.reduce((p, c) => ((c.hi||[]).length + (c.hi_hc||[]).length > (p.hi||[]).length + (p.hi_hc||[]).length) ? c : p, eliteUsers[0]);
        document.getElementById('st-e-most-races-val').innerText = (mostRacesUser.hi||[]).length + (mostRacesUser.hi_hc||[]).length;
        document.getElementById('st-e-most-races-user').innerText = mostRacesUser.n || "-";

        let recordUser = eliteUsers.reduce((p, c) => {
            let maxC = Math.max(...(c.hi||[0]), ...(c.hi_hc||[0]), 0);
            let maxP = Math.max(...(p.hi||[0]), ...(p.hi_hc||[0]), 0);
            return maxC > maxP ? c : p;
        }, eliteUsers[0]);
        let maxGlobalCPM = Math.max(...(recordUser.hi||[0]), ...(recordUser.hi_hc||[0]), 0);
        document.getElementById('st-e-record-val').innerText = UI.formatValue(maxGlobalCPM);
        document.getElementById('st-e-record-user').innerText = recordUser.n || "-";

        let speedKing = eliteUsers.reduce((p, c) => (Math.max(...(c.hi||[0]), 0) > Math.max(...(p.hi||[0]), 0)) ? c : p, eliteUsers[0]);
        document.getElementById('st-e-speed-king-val').innerText = UI.formatValue(Math.max(...(speedKing.hi||[0]), 0));
        document.getElementById('st-e-speed-king-user').innerText = speedKing.n || "-";

        let avgUser = eliteUsers.reduce((p, c) => {
            let cScores = [...(c.hi||[]), ...(c.hi_hc||[])]; let pScores = [...(p.hi||[]), ...(p.hi_hc||[])];
            let avgC = cScores.length >= 5 ? (cScores.reduce((a,b)=>a+b,0)/cScores.length) : 0;
            let avgP = pScores.length >= 5 ? (pScores.reduce((a,b)=>a+b,0)/pScores.length) : 0;
            return avgC > avgP ? c : p;
        }, eliteUsers[0]);
        let bestScores = [...(avgUser.hi||[]), ...(avgUser.hi_hc||[])];
        let bestAvg = bestScores.length >= 5 ? (bestScores.reduce((a,b)=>a+b,0)/bestScores.length) : 0;
        
        // Exactos (Calculados matemáticamente en cliente)
        document.getElementById('st-e-bestavg-val').innerText = bestAvg > 0 ? UI.formatValue(Math.round(bestAvg)) : "0";
        document.getElementById('st-e-bestavg-user').innerText = bestAvg > 0 ? (avgUser.n || "-") : "Faltan datos (Min 5 car.)";
        
        // Tablas HOFS (Calculadas desde arrays exactos)
        const top10Speed = [...eliteUsers].sort((a,b) => Math.max(...(b.hi||[0]),0) - Math.max(...(a.hi||[0]),0)).slice(0, 10);
        document.getElementById('st-e-table-speed').innerHTML = top10Speed.map((u, i) => {
            const posClass = i === 0 ? 'podium-1' : (i === 1 ? 'podium-2' : (i === 2 ? 'podium-3' : ''));
            return `<tr><td class="${posClass}">${i+1}</td><td><div class="player-link" onclick="UI.showProfile('${u.h}')"><div class="avatar-xs"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(Math.max(...(u.hi||[0]), 0))}</b></td></tr>`;
        }).join('');

        const top10HC = [...eliteUsers].sort((a,b) => Math.max(...(b.hi_hc||[0]),0) - Math.max(...(a.hi_hc||[0]),0)).slice(0, 10);
        document.getElementById('st-e-table-active').innerHTML = top10HC.map((u, i) => {
            const posClass = i === 0 ? 'podium-1' : (i === 1 ? 'podium-2' : (i === 2 ? 'podium-3' : ''));
            return `<tr><td class="${posClass}">${i+1}</td><td><div class="player-link" onclick="UI.showProfile('${u.h}')"><div class="avatar-xs"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(Math.max(...(u.hi_hc||[0]), 0))}</b></td></tr>`;
        }).join('');
    },

    renderInfoPage() { if(!CT.data.info) return; document.getElementById('info-display-title').innerText = CT.data.info.title || "Información"; document.getElementById('info-display-content').innerHTML = CT.data.info.content || ""; },

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; 
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
        if(!document.getElementById('track-screen').classList.contains('hidden')) { if(UI.activeTrackCat || UI.filterFavs) UI.renderTrackList(); else UI.showTrackCategorySelect(); }
        if(!document.getElementById('stats-screen').classList.contains('hidden')) { if(!document.getElementById('pane-stats-personal').classList.contains('hidden')) UI.renderPersonalStats(); else if(!document.getElementById('pane-stats-elite').classList.contains('hidden')) UI.renderEliteStats(); else UI.renderHardcoreStats(); }
    },

    updateUnitVisuals: (unit) => {
        document.documentElement.setAttribute('data-theme', unit);
        document.querySelectorAll('.unit-switcher .sw-btn').forEach(s => s.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${unit}`); if(activeBtn) activeBtn.classList.add('active');
        const label = unit === 'zen' ? 'ZEN' : unit.toUpperCase();
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-st-p-vel', 'th-st-e-t-vel'];
        thIds.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).innerText = 'VEL. (' + label + ')'; } });
        const subIds = ['t_st_p_best_avg_sub', 't_st_p_last10_sub', 't_st_e_record_sub'];
        subIds.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = label; });
    },

    updateFastModeVisuals: () => { const btn = document.getElementById('btn-fast-mode'); if(btn) btn.innerText = `⚡ Modo Rápido: ${CT.fastMode ? 'SI' : 'NO'}`; },
    toggleFastMode: () => { CT.fastMode = !CT.fastMode; localStorage.setItem('ct_fast_mode', CT.fastMode); UI.updateFastModeVisuals(); },
    renderTrainDropdown() { /* Intacto */ },

    // REPARADO: Consulta exacta a Firestore para Hoy y muestra Élite para Historial
    renderGlobal() {
        const typeEl = document.getElementById('leaderboard-type'); if(!typeEl) return;
        const todayAR = CT.getARDate();

        // En Vivo (Hoy): Viene directo de Firestore s_recent (filtrado por d==todayAR en core)
        let vivoScores = (CT.data.s_recent || []).filter(s => !s.sb && s.d === todayAR);
        
        // Histórico Muestra: Viene de s_top (los TOP 50 descargados)
        let histScores = (CT.data.s_top || []).filter(s => !s.sb);

        let filtered = typeEl.value === 'today' ? vivoScores : histScores;
        filtered.sort((a,b) => b.c - a.c);
        
        document.getElementById('global-rank-times').innerHTML = filtered.slice(0, 15).map((s, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td></tr>`;
        }).join('');

        // Promedios (Hall of Fame Exacto basado en Muestra Élite)
        const rankingMode = document.getElementById('ranking-type').value;
        const eliteUsers = CT.data.eliteUsers || [];
        
        let playerStats = eliteUsers.map(u => {
            let arr = u.hi || []; let scores = rankingMode === 'last10' ? arr.slice(-10) : arr;
            let avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b)/scores.length) : 0;
            return { h: u.h, n: u.n, a: u.a, avg: avg, total: arr.length };
        }).filter(p => p.avg > 0).sort((a,b) => b.avg - a.avg);

        document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(p.avg)}</b></td><td>${p.total}</td></tr>`;
        }).join('');
    },

    // RESTO DE FUNCIONES (Intactas)
    async showProfile(who) { /* Intacto Phase 2 anterior */ },
    renderProfileHistory() { /* Intacto */ },
    // Modales, Crop, Temas, Anuncios, Tracks (Intactos Phase 2 anterior)
    openThemeBuilder: () => { document.getElementById('theme-modal').classList.remove('hidden'); },
    closeThemeModal: () => { document.getElementById('theme-modal').classList.add('hidden'); },
    applySavedTheme: () => { /* Intacto */ },
    saveTheme: (name) => { /* Intacto */ },
    openCropModal(src) { /* Intacto */ },
    closeCropModal() { /* Intacto */ },
    saveCrop: () => { /* Intacto Phase 2 anterior */ },
    checkAnnouncements: () => { /* Intacto */ },
    showAnnouncement(data) { /* Intacto */ },
    closeAnnouncement() { /* Intacto */ },
    showTrackSelect() { /* Intacto */ },
    renderTrackList() { /* Intacto Phase 2 anterior con Sortable */ }
};
