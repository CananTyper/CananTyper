/* ================================================================
   CANANTYPER - MÓDULO UI (V3.1.0 - OPTIMIZACIÓN Y GESTIÓN DE WIDGETS)
   ================================================================ */

const UI = {
    listLayout: 'layout-list',
    trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null,
    personalChartInstance: null,
    
    // Lista Maestra de Widgets (Si active=false, el código omite los cálculos para ahorrar CPU)
    widgetState: [
        { id: 'w-p-heat', name: 'Mapa de Calor', active: true, size: 'wide', pane: 'grid-stats-personal' },
        { id: 'w-p-trend', name: 'Evolución Personal', active: true, size: 'wide', pane: 'grid-stats-personal' },
        { id: 'w-p-top', name: 'Mis Mejores Carreras', active: true, size: 'normal', pane: 'grid-stats-personal' },
        { id: 'w-p-worst-trk', name: 'Textos a Mejorar', active: true, size: 'normal', pane: 'grid-stats-personal' },
        { id: 'w-p-worst-wrd', name: 'Palabras Críticas', active: true, size: 'normal', pane: 'grid-stats-personal' },
        { id: 'w-e-speed', name: 'Top 15: Velocidad', active: true, size: 'normal', pane: 'grid-stats-elite' },
        { id: 'w-e-active', name: 'Top 15: Actividad', active: true, size: 'normal', pane: 'grid-stats-elite' },
        { id: 'w-hc-surv', name: 'Sobrevivientes (HC)', active: true, size: 'normal', pane: 'grid-stats-hc' },
        { id: 'w-hc-deadly', name: 'Pistas Mortales (HC)', active: true, size: 'normal', pane: 'grid-stats-hc' }
    ],

    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

    handleImageUpload: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { UI.openCropModal(e.target.result); };
        reader.readAsDataURL(file);
    },

    /* --- SISTEMA DE GESTIÓN DE WIDGETS --- */
    applyStatsLayout: () => {
        if(CT.data.statsLayout && CT.data.statsLayout.length > 0) {
            // Actualizar nuestro state con el de Firebase
            CT.data.statsLayout.forEach(fbW => {
                let w = UI.widgetState.find(x => x.id === fbW.id);
                if(w) { w.active = fbW.active; w.size = fbW.size; w.pane = fbW.pane; }
            });
        }

        UI.widgetState.forEach(w => {
            const el = document.querySelector(`.analytic-widget[data-id="${w.id}"]`);
            const grid = document.getElementById(w.pane);
            if (el && grid) {
                grid.appendChild(el);
                el.style.display = w.active ? 'flex' : 'none'; // Si no está activo, se oculta
                el.classList.remove('w-wide', 'w-large');
                if(w.size === 'wide') el.classList.add('w-wide');
                if(w.size === 'large') el.classList.add('w-large');
            }
        });
        UI.buildStatsMenu();
        setTimeout(() => { if(UI.personalChartInstance) UI.personalChartInstance.resize(); }, 300);
    },

    saveStatsLayout: () => {
        const u = CT.ses(); if(!u || u.r !== 'admin') return;
        const layoutToSave = [];
        
        // Primero tomamos el orden actual del DOM
        const grids = ['grid-stats-personal', 'grid-stats-elite', 'grid-stats-hc'];
        grids.forEach(paneId => {
            const grid = document.getElementById(paneId);
            if(grid) {
                grid.querySelectorAll('.analytic-widget').forEach(el => {
                    const id = el.getAttribute('data-id');
                    const w = UI.widgetState.find(x => x.id === id);
                    if(w) {
                        w.size = el.classList.contains('w-large') ? 'large' : (el.classList.contains('w-wide') ? 'wide' : 'normal');
                        w.pane = paneId;
                        layoutToSave.push({ id: w.id, size: w.size, pane: w.pane, active: w.active });
                    }
                });
            }
        });
        db.collection('config').doc('stats_layout').set({ layout: layoutToSave });
    },

    resizeStatWidget: (id) => {
        const u = CT.ses(); if(!u || u.r !== 'admin') return;
        const el = document.querySelector(`.analytic-widget[data-id="${id}"]`);
        if(!el) return;
        if(el.classList.contains('w-large')) { el.classList.remove('w-large'); }
        else if(el.classList.contains('w-wide')) { el.classList.remove('w-wide'); el.classList.add('w-large'); }
        else { el.classList.add('w-wide'); }
        UI.saveStatsLayout();
    },

    toggleStatsMenu: () => {
        const u = CT.ses(); if(!u || u.r !== 'admin') return;
        document.getElementById('stats-dropdown').classList.toggle('hidden');
    },

    buildStatsMenu: () => {
        const list = document.getElementById('stats-menu-list');
        if(!list) return;
        list.innerHTML = '';
        UI.widgetState.forEach(w => {
            list.innerHTML += `
                <li style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #222;">
                    <span style="font-size: 0.75rem; color: #ccc;">${w.name}</span>
                    <label class="switch-pro"><input type="checkbox" onchange="UI.toggleWidget('${w.id}', this.checked)" ${w.active ? 'checked' : ''}><span class="slider-pro" style="transform: scale(0.7);"></span></label>
                </li>`;
        });
    },

    toggleWidget: (id, isActive) => {
        const w = UI.widgetState.find(x => x.id === id);
        if(w) w.active = isActive;
        UI.saveStatsLayout();
        UI.applyStatsLayout();
        UI.refreshActiveViews(); // Recalcular solo los activos
    },

    initStatsSortable: () => {
        if (typeof Sortable === 'undefined') return;
        const u = CT.ses(); if(!u || u.r !== 'admin') return;

        const grids = ['grid-stats-personal', 'grid-stats-elite', 'grid-stats-hc'];
        grids.forEach(paneId => {
            const container = document.getElementById(paneId);
            if(container) {
                if (container._sortable) { container._sortable.destroy(); container._sortable = null; }
                container._sortable = Sortable.create(container, {
                    handle: '.w-handle', animation: 150, ghostClass: 'sortable-ghost',
                    onEnd: () => UI.saveStatsLayout()
                });
            }
        });
    },

    isWidgetActive: (id) => {
        const w = UI.widgetState.find(x => x.id === id);
        return w ? w.active : false;
    },
    /* --------------------------------------------------------------- */

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
        try {
            const u = CT.ses();
            if(u) await App.getUserScores(u.h); 
            UI.switchStatsTab('personal'); 
            UI.updateUnitVisuals(CT.currentUnit); 
            if(UI.applyStatsLayout) UI.applyStatsLayout();
            if(UI.initStatsSortable) UI.initStatsSortable();
            UI.show('stats-screen'); 
        } catch(e) {
            console.error("Error abriendo estadísticas:", e);
        }
    },
    
    showInfo() { this.renderInfoPage(); this.show('info-screen'); },

    switchStatsTab(tab) {
        document.querySelectorAll('.pane').forEach(p => { if(p.id.startsWith('pane-stats')) p.classList.add('hidden') });
        document.querySelectorAll('.st-tab-btn').forEach(b => { if(b.id.startsWith('t-st-')) b.classList.remove('active') });
        
        const pane = document.getElementById(`pane-stats-${tab}`);
        if(pane) pane.classList.remove('hidden');
        
        const activeBtn = document.getElementById(`t-st-${tab.substring(0,2)}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        if (tab === 'personal') this.renderPersonalStats(); 
        else if (tab === 'elite') this.renderEliteStats();
        else if (tab === 'hc') this.renderHardcoreStats();

        setTimeout(() => { if(UI.personalChartInstance) UI.personalChartInstance.resize(); }, 300);
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
        
        const hi = u.hi || []; const totalRaces = hi.length;
        document.getElementById('st-p-total-races').innerText = totalRaces;
        const avgGen = totalRaces ? Math.round(hi.reduce((a,b)=>a+b, 0) / totalRaces) : 0;
        document.getElementById('st-p-best-avg').innerText = UI.formatValue(avgGen);
        const last10hi = hi.slice(-10);
        const avgLast10 = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0) / last10hi.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = UI.formatValue(avgLast10);
        
        const phrases = CT.data.p; let catAvgs = {};
        userScores.forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 }; catAvgs[cat].sum += s.c; catAvgs[cat].count++; });
        let bestCat = "-"; let maxCatAvg = -1;
        for (let c in catAvgs) { let avg = catAvgs[c].sum / catAvgs[c].count; if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; } }
        document.getElementById('st-p-best-cat').innerText = bestCat;

        // WIDGET: Evolución de Velocidad
        if(UI.isWidgetActive('w-p-trend') && typeof Chart !== 'undefined' && document.getElementById('personal-trend-chart')) {
            if(UI.personalChartInstance) { UI.personalChartInstance.destroy(); }
            const ctx = document.getElementById('personal-trend-chart').getContext('2d');
            const trendData = hi.slice(-20); 
            const labels = trendData.map((s, i) => `#${i+1}`);
            const dataPts = trendData.map(s => UI.formatValue(s));
            
            Chart.defaults.color = '#777'; Chart.defaults.font.family = 'monospace';
            UI.personalChartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'Velocidad', data: dataPts, borderColor: '#a6ff00', backgroundColor: 'rgba(166,255,0,0.05)', fill: true, tension: 0.2, pointRadius: 2, borderWidth: 2 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } }, scales: { y: { grid: { color: '#222' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { display: false } } } }
            });
        }

        // WIDGET: Teclado Heatmap
        if(UI.isWidgetActive('w-p-heat')) {
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
        }

        // WIDGET: Top 10
        if(UI.isWidgetActive('w-p-top')) {
            const top10 = [...userScores].sort((a,b) => b.c - a.c).slice(0, 15);
            document.getElementById('list-p-top10').innerHTML = top10.map((s, i) => `<li><span class="w-rank">${i+1}</span> <span style="flex-grow:1; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Texto #${s.track}</span> <b style="color:var(--p);" class="val-blurrable">${UI.formatValue(s.c)}</b></li>`).join('');
        }

        // WIDGET: Worst Tracks
        if(UI.isWidgetActive('w-p-worst-trk')) {
            let trackAvgs = {}; userScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
            let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
            let bottom5 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg).slice(0, 10);
            document.getElementById('list-p-worst-tracks').innerHTML = bottom5.map((tr, i) => `<li><span class="w-rank" style="color:var(--error);">${i+1}</span> <span style="flex-grow:1; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Texto #${tr.t}</span> <b style="color:var(--error);" class="val-blurrable">${UI.formatValue(Math.round(tr.avg))}</b></li>`).join('');
        }

        // WIDGET: Bad Words
        if(UI.isWidgetActive('w-p-worst-wrd')) {
            const bw = u.bad_words || {}; let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs).slice(0, 20);
            document.getElementById('list-p-worst-words').innerHTML = badWordsList.map((bwItem, i) => `<li><span class="w-rank" style="color:var(--error);">${i+1}</span> <span style="flex-grow:1; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${bwItem.w}</span> <b style="color:var(--error);">${bwItem.errs}</b></li>`).join('');
        }
    },

    renderHardcoreStats() {
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

        if(UI.isWidgetActive('w-hc-surv')) {
            const top10HC = eliteUsers.filter(eu => eu.hi_hc && eu.hi_hc.length > 0).sort((a,b) => Math.max(...b.hi_hc) - Math.max(...a.hi_hc)).slice(0, 15);
            document.getElementById('list-hc-surv').innerHTML = top10HC.map((eu, i) => `<li><span class="w-rank" style="color:var(--error);">${i+1}</span> <span style="flex-grow:1; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${eu.n}</span> <b style="color:var(--error);">${eu.hi_hc.length} 🏅</b></li>`).join('');
        }
        
        if(UI.isWidgetActive('w-hc-deadly')) {
            let trackDeathsGlobal = {}; eliteUsers.forEach(eu => { if(eu.hc_track_deaths) { Object.keys(eu.hc_track_deaths).forEach(tId => { trackDeathsGlobal[tId] = (trackDeathsGlobal[tId] || 0) + eu.hc_track_deaths[tId]; }); } });
            let deathList = Object.keys(trackDeathsGlobal).map(k => ({ t: k, d: trackDeathsGlobal[k] })).sort((a,b) => b.d - a.d).slice(0, 15);
            document.getElementById('list-hc-deadly').innerHTML = deathList.map((td, i) => `<li><span class="w-rank" style="color:var(--error);">${i+1}</span> <span style="flex-grow:1; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Texto #${td.t}</span> <b style="color:var(--error);">${td.d} ☠️</b></li>`).join('');
        }
    },

    renderEliteStats() {
        const eliteUsers = CT.data.eliteUsers || [];
        if (eliteUsers.length === 0) return;
        
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
        
        if (bestAvg > 0) {
            document.getElementById('st-e-bestavg-val').innerText = UI.formatValue(Math.round(bestAvg));
            document.getElementById('st-e-bestavg-user').innerText = avgUser.n || "-";
        } else {
            document.getElementById('st-e-bestavg-val').innerText = "0";
            document.getElementById('st-e-bestavg-user').innerText = "Min 5 car.";
        }
        
        if(UI.isWidgetActive('w-e-speed')) {
            const top10Speed = [...eliteUsers].sort((a,b) => Math.max(...(b.hi||[0]),0) - Math.max(...(a.hi||[0]),0)).slice(0, 15);
            document.getElementById('list-e-speed').innerHTML = top10Speed.map((u, i) => {
                const posClass = i === 0 ? 'podium-1' : (i === 1 ? 'podium-2' : (i === 2 ? 'podium-3' : ''));
                return `<li><span class="w-rank ${posClass}" style="width:20px;">${i+1}</span> <div class="player-link" style="flex-grow:1; justify-content:flex-start;" onclick="UI.showProfile('${u.h}')"><div class="avatar-xs" style="width:20px;height:20px;"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div> <b style="color:var(--p)" class="val-blurrable">${UI.formatValue(Math.max(...(u.hi||[0]), 0))}</b></li>`;
            }).join('');
        }

        if(UI.isWidgetActive('w-e-active')) {
            const todayAR = CT.getARDate(); let todayCounts = {};
            (CT.data.s_recent || []).forEach(s => { if(s.d === todayAR && !s.sb) todayCounts[s.h] = (todayCounts[s.h] || 0) + 1; });
            const topActive = Object.keys(todayCounts).map(h => {
                const uObj = eliteUsers.find(u => u.h === h);
                return { h: h, n: uObj ? uObj.n : h, a: uObj ? uObj.a : '', c: todayCounts[h] };
            }).sort((a,b) => b.c - a.c).slice(0, 15);

            document.getElementById('list-e-active').innerHTML = topActive.map((u, i) => {
                const posClass = i === 0 ? 'podium-1' : (i === 1 ? 'podium-2' : (i === 2 ? 'podium-3' : ''));
                return `<li><span class="w-rank ${posClass}" style="width:20px;">${i+1}</span> <div class="player-link" style="flex-grow:1; justify-content:flex-start;" onclick="UI.showProfile('${u.h}')"><div class="avatar-xs" style="width:20px;height:20px;"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div> <b style="color:#00bcd4;">${u.c} 🏎️</b></li>`;
            }).join('');
        }
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
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-st-e-t-vel'];
        thIds.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).innerText = 'VEL. (' + label + ')'; } });
        const subIds = ['t_st_e_record_sub', 't_st_e_bestavg_sub', 't_st_e_sk_sub'];
        subIds.forEach(id => { 
            const el = document.getElementById(id);
            if(el) {
                if(id === 't_st_e_bestavg_sub') el.innerText = ` ${label} (Min 5 car.)`;
                else if(id === 't_st_e_sk_sub') el.innerText = ` ${label} (Normales)`;
                else el.innerText = ` ${label}`;
            }
        });
    },

    updateFastModeVisuals: () => { const btn = document.getElementById('btn-fast-mode'); if(btn) btn.innerText = `⚡ Modo Rápido: ${CT.fastMode ? 'SI' : 'NO'}`; },
    toggleFastMode: () => { CT.fastMode = !CT.fastMode; localStorage.setItem('ct_fast_mode', CT.fastMode); UI.updateFastModeVisuals(); },
    renderTrainDropdown() { /* Intacto */ },

    // HOME RANKINGS (Corregido a "Recientes" exactos y "Promedios" exactos)
    renderGlobal() {
        const typeEl = document.getElementById('leaderboard-type'); if(!typeEl) return;

        let vivoScores = (CT.data.s_recent || []).filter(s => !s.sb);
        let histScores = (CT.data.s_top || []).filter(s => !s.sb);

        let filtered = typeEl.value === 'today' ? vivoScores : histScores;
        filtered.sort((a,b) => b.c - a.c);
        
        const targetTimes = document.getElementById('global-rank-times');
        if (filtered.length === 0) {
            targetTimes.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#aaa; padding:20px;">Sin registros aún. ¡Sé el primero!</td></tr>';
        } else {
            targetTimes.innerHTML = filtered.slice(0, 10).map((s, idx) => {
                const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
                return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td></tr>`;
            }).join('');
        }

        const rankingMode = document.getElementById('ranking-type').value;
        const eliteUsers = CT.data.eliteUsers || [];
        
        let playerStats = eliteUsers.map(u => {
            let arr = u.hi || []; let scores = rankingMode === 'last10' ? arr.slice(-10) : arr;
            let avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
            return { h: u.h, n: u.n, a: u.a, avg: avg, total: arr.length };
        }).filter(p => p.total >= 5) // Exigimos 5 carreras para evitar picos falsos
          .sort((a,b) => b.avg - a.avg);

        const targetPlayers = document.getElementById('global-rank-players');
        if (playerStats.length === 0) {
            targetPlayers.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#aaa; padding:20px;">No hay promedios suficientes (Min 5 carreras).</td></tr>';
        } else {
            targetPlayers.innerHTML = playerStats.slice(0, 10).map((p, idx) => {
                const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
                return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(p.avg)}</b></td><td>${p.total}</td></tr>`;
            }).join('');
        }
    },

    async showProfile(who) {
        try {
            const currentSes = CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            let u = (who === 'me') ? currentSes : null;
            if(!u) { const snap = await db.collection('users').doc(targetHandle).get(); if(snap.exists) u = snap.data(); }
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
    renderProfileHistory() {
        const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="EngineControl.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { const scores = CT.data.userScores[CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc); const nextStart = (CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { CT.profPage += delta; this.renderProfileHistory(); } },
    openThemeBuilder: () => { document.getElementById('theme-modal').classList.remove('hidden'); },
    closeThemeModal: () => { document.getElementById('theme-modal').classList.add('hidden'); },
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
    saveTheme: (themeName) => {
        let themeObj;
        if (themeName === 'galactic') { themeObj = { p: '#b388ff', bg: '#090a0f', surface: '#161824' }; }
        else if (themeName === 'hacker') { themeObj = { p: '#00ff00', bg: '#050505', surface: '#0a0a0a' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: themeObj }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },
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
    },
    checkAnnouncements: () => {
        const anns = CT.data.a.filter(x => x.active);
        if (anns.length > 0) {
            const latest = anns[0];
            const lastSeen = localStorage.getItem('ct_last_announcement');
            if (latest.id.toString() !== lastSeen) { UI.showAnnouncement(latest); }
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
        if (UI.filterFavs) listContainer.classList.add('fav-scroll'); else listContainer.classList.remove('fav-scroll');
        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
        } else if (UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString()));
            filtered.sort((a,b) => favs.indexOf(a.id.toString()) - favs.indexOf(b.id.toString()));
        } else if (!UI.activeTrackCat) { UI.showTrackCategorySelect(); return; } 
        else { filtered = tracks.filter(t => (t.c || 'General').trim() === UI.activeTrackCat.trim()); filtered = filtered.sort((a,b) => (a.order || 0) - (b.order || 0)); }

        let textPinOn = CT.data.ui && CT.data.ui['t_btn_pin_on'] ? CT.data.ui['t_btn_pin_on'].v : '⭐'; let textPinOff = CT.data.ui && CT.data.ui['t_btn_pin_off'] ? CT.data.ui['t_btn_pin_off'].v : '☆';
        const start = UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
        listContainer.innerHTML = pageData.map(t => {
            let isFav = favs.includes(t.id.toString()); let starClass = isFav ? 'fav-active' : 'fav-inactive';
            let reorderFavHtml = (UI.filterFavs && !query) ? `<span class="drag-handle" style="cursor:grab; font-size:1.5rem; color:#ffd700; margin-top:5px; display:inline-block;" title="Arrastrar para ordenar" onclick="event.stopPropagation()">⠿</span>` : '';
            let cardStyle = isFav ? `border-color: color-mix(in srgb, #ffd700 50%, transparent); box-shadow: 0 5px 15px color-mix(in srgb, #ffd700 10%, transparent);` : ``;
            let idColorStyle = isFav ? `color: #ffd700; text-shadow: 0 0 10px color-mix(in srgb, #ffd700 30%, transparent);` : `color: var(--p);`;
            return `<div class="track-card" onclick="EngineControl.startRaceWithTrack('${t.id}')" style="${cardStyle}">
                <div class="track-card-id" style="display:flex; flex-direction:column; gap:10px; ${idColorStyle}">#${t.title}<button onclick="event.stopPropagation(); App.toggleFav('${t.id}')" class="fav-star-btn ${starClass}">${isFav ? textPinOn : textPinOff}</button>${reorderFavHtml}</div>
                <div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${(t.c || 'General').trim()}]</span></div>
            </div>`;
        }).join('');
        document.getElementById('track-prev').disabled = UI.trackPage === 0; document.getElementById('track-next').disabled = (start + 20) >= filtered.length; document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
        setTimeout(() => { if (UI.filterFavs && !query) UI.initSortable('track-list-full', 'track', UI.trackPage); else { const c = document.getElementById('track-list-full'); if (c && c._sortable) { c._sortable.destroy(); c._sortable = null; } } }, 50);
    },
    changeTrackPage(delta) { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = CT.data.p; const u = CT.ses(); let favs = u.favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General').trim() === UI.activeTrackCat.trim()); } const nextStart = (UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { UI.trackPage += delta; this.renderTrackList(); } },
};
