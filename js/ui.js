/* ================================================================
    CANANTYPER - INTERFAZ DE USUARIO (UI)
   ================================================================ */

window.UI = {
    listLayout: 'layout-list', trackPage: 0, activeTrackCat: null, filterFavs: false,
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0, currentAnnId: null, activeStatsTab: 'personal',
    
    // Motor inteligente para listas (Ahorra cientos de líneas de código)
    _genList: (arr, limit, hasMeta, rowFn) => {
        let html = '';
        for(let i=0; i<limit; i++) {
            if(arr[i]) html += rowFn(arr[i], i+1);
            else html += `<li class="st-list-item" style="opacity:0.3;"><div class="st-list-rank">#${i+1}</div><div class="st-list-name">Vacío</div>${hasMeta ? '<div class="st-list-meta">-</div>' : ''}<div class="st-list-val">-</div></li>`;
        }
        return html;
    },

    formatValue: (cpm) => { return (window.CT.currentUnit === 'wpm') ? Math.round(cpm / window.CT.charPerWord) : cpm; },
    formatTrackName: (t) => { return !t ? 'Desconocido' : (isNaN(t) ? t : '#' + t); },
    formatTrackNameFull: (t) => { 
        if(!t) return 'Desconocido';
        const cat = window.UI.getTrackCat(t);
        const name = isNaN(t) ? t : 'Texto ' + t;
        return (cat && cat !== 'General' && cat !== '-') ? name + ' | ' + cat.replace('[TRN] ', '') : name + ' | ' + cat; 
    },

    initSortable: (containerId, type, pageContext = 0) => {
        if (typeof Sortable === 'undefined') return;
        const container = document.getElementById(containerId);
        if (!container) return;
        if (container._sortable) { container._sortable.destroy(); container._sortable = null; }
        if (type === 'track' && !window.UI.filterFavs) return;

        container._sortable = Sortable.create(container, {
            handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                if (evt.oldIndex === evt.newIndex) return;
                if (type.startsWith('widgets-')) window.App.saveWidgetOrderFromDOM(type.split('-')[1], containerId);
                else window.App.handleDragReorder('favs', evt.oldIndex, evt.newIndex, pageContext);
            }
        });
    },

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
    
    show: (id) => { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); },
    toggleAuth: (login) => { document.getElementById('login-form').classList.toggle('hidden', !login); document.getElementById('register-form').classList.toggle('hidden', login); },
    
    initLobby: () => {
        if(window.CT.data.maint && window.CT.data.maint.active) { const u = window.CT.ses(); if(!u || u.r !== 'admin') { window.UI.checkMaintenance(); return; } }
        const u = window.CT.ses(); if(!u) return window.UI.show('auth-screen');
        window.updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);
        document.getElementById('val-display-name').innerText = u.n; document.getElementById('val-username').innerText = u.h; document.getElementById('lobby-avatar').src = u.a || window.CT.defAvatar;
        window.UI.updateUnitVisuals(window.CT.currentUnit); window.UI.renderGlobal(); window.UI.renderTrainDropdown(); window.UI.show('home-screen'); window.UI.checkAnnouncements(); 
    },

    showLobby: () => window.UI.initLobby(),
    
    showStats: async () => { 
        const u = window.CT.ses();
        if(u) { await window.App.getUserScores(u.h); document.getElementById('btn-stats-widgets').classList.toggle('hidden', u.r !== 'admin'); }
        window.UI.switchStatsTab('personal'); window.UI.updateUnitVisuals(window.CT.currentUnit); window.UI.show('stats-screen'); 
    },
    
    showInfo: () => { window.UI.renderInfoPage(); window.UI.show('info-screen'); },

    switchStatsTab: (tab) => {
        window.UI.activeStatsTab = tab;
        document.querySelectorAll('#stats-screen .st-pane').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.st-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`pane-stats-${tab}`).classList.remove('hidden');
        const activeBtn = document.getElementById(`t-st-${tab.substring(0,2)}`); if (activeBtn) activeBtn.classList.add('active');
        if (tab === 'personal') window.UI.renderPersonalStats(); else if (tab === 'elite') window.UI.renderEliteStats(); else if (tab === 'hc') window.UI.renderHardcoreStats();
        if(window.CT.ses() && window.CT.ses().r === 'admin') window.UI.renderWidgetsMenu();
    },

    cycleWidgetSize: (btn) => {
        const widget = btn.closest('.st-widget');
        if (widget) window.App.cycleWidgetSize(window.UI.activeStatsTab, widget.getAttribute('data-id'));
    },

    applyStatsLayout: () => {
        const layout = window.CT.data.statsLayout; if (!layout) return;
        const isAdmin = window.CT.ses() && window.CT.ses().r === 'admin';
        ['personal', 'elite', 'hc'].forEach(tab => {
            const grid = document.getElementById(`grid-stats-${tab}`); if (!grid) return;
            const arr = [...(layout[tab] || [])].sort((a,b) => (a.order || 0) - (b.order || 0));
            arr.forEach((w, idx) => {
                const wEl = grid.querySelector(`[data-id="${w.id}"]`);
                if(wEl) {
                    wEl.style.order = idx; wEl.classList.toggle('hidden', !w.v);
                    wEl.className = wEl.className.replace(/st-col-\d+/g, '').trim(); wEl.classList.add(`st-col-${w.s || 3}`);
                    wEl.querySelectorAll('.admin-only').forEach(h => h.classList.toggle('hidden', !isAdmin));
                }
            });
            if (isAdmin) window.UI.initSortable(`grid-stats-${tab}`, `widgets-${tab}`, 0);
        });
    },

    toggleWidgetsMenu: () => { document.getElementById('widgets-menu').classList.toggle('hidden'); window.UI.renderWidgetsMenu(); },
    renderWidgetsMenu: () => {
        const layout = window.CT.data.statsLayout; if (!layout) return;
        const tab = window.UI.activeStatsTab; let html = '';
        [...(layout[tab] || [])].sort((a,b) => (a.order || 0) - (b.order || 0)).forEach(w => {
            const el = document.querySelector(`[data-id="${w.id}"] .st-widget-header span:not(.drag-handle)`);
            const title = el ? el.innerText.trim() : w.id;
            html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #1a1a1a; align-items:center;"><span style="color:#ccc; font-size:0.75rem; font-weight:bold;">${title}</span><label class="st-switch"><input type="checkbox" ${w.v ? 'checked' : ''} onchange="window.App.toggleWidgetVisibility('${tab}', '${w.id}')"><span class="st-slider"></span></label></div>`;
        });
        document.getElementById('widgets-menu-list').innerHTML = html;
    },

    generateLineChartSVG: (dataArray) => {
        if(!dataArray || dataArray.length < 2) return '';
        const max = Math.max(...dataArray, 10); const width = 1000; const height = 220; const stepX = width / (dataArray.length - 1);
        let points = dataArray.map((val, i) => `${i * stepX},${height - ((val / max) * (height - 20)) - 10}`).join(' ');
        let pathD = `M0,${height} L0,${height - ((dataArray[0] / max) * (height - 20)) - 10} ` + dataArray.map((val, i) => `L${i*stepX},${height - ((val/max)*(height-20)) - 10}`).join(' ') + ` L${width},${height} Z`;
        let circles = dataArray.map((val, i) => {
            const x = i * stepX; const y = height - ((val / max) * (height - 20)) - 10;
            return `<circle cx="${x}" cy="${y}" r="4" class="st-chart-point" style="stroke:var(--p);"></circle><text x="${x}" y="${y - 12}" fill="#aaa" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">${val}</text>`;
        }).join('');
        return `<svg class="st-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;"><defs><linearGradient id="grad-p" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:color-mix(in srgb, var(--p) 30%, transparent);stop-opacity:1" /><stop offset="100%" style="stop-color:transparent;stop-opacity:0" /></linearGradient></defs><path class="st-chart-area" d="${pathD}" style="fill:url(#grad-p);"></path><polyline class="st-chart-line" points="${points}" style="stroke:var(--p);"></polyline>${circles}</svg>`;
    },

    generateBarChartSVG: (dataObj) => {
        const labels = Object.keys(dataObj); if (labels.length === 0) return '';
        const maxVal = Math.max(...Object.values(dataObj), 1);
        let html = `<div style="display:flex; width:100%; height:100%; justify-content:space-between; align-items:flex-end; padding-bottom:20px; gap:10px;">`;
        labels.forEach(l => { html += `<div class="st-bar-group"><span class="st-bar-val">${dataObj[l]}</span><div class="st-bar" style="height:${(dataObj[l] / maxVal) * 100}%;"></div><span class="st-bar-label">${l}</span></div>`; });
        return html + `</div>`;
    },

    generateDonutSVG: (percentage, colorVar) => {
        const p = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
        return `<svg viewBox="0 0 36 36" class="st-donut"><path class="st-donut-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><path class="st-donut-fill" style="stroke:${colorVar};" stroke-dasharray="${p}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" /><text x="18" y="21" class="st-donut-text" style="fill:${colorVar};">${Math.round(p)}%</text></svg>`;
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

    // Modal de Pista Completa inyectado
    showTrackPreview: (trackId) => {
        if(!trackId) return;
        const track = window.CT.dbLocal('p').find(t => (t.id && t.id.toString() === trackId.toString()) || (t.title && t.title.toString() === trackId.toString()));
        if(!track) return;
        document.getElementById('tp-title').innerText = window.UI.formatTrackNameFull(track.title);
        document.getElementById('tp-cat').innerText = (track.c || 'General').trim();
        document.getElementById('tp-words').innerText = track.text.split(' ').length + " PALABRAS";
        document.getElementById('tp-content').innerText = track.text;
        document.getElementById('tp-btn-play').onclick = () => { window.App.startRaceWithTrack(track.id); window.UI.closeTrackPreview(); };
        document.getElementById('track-preview-modal').classList.remove('hidden');
    },

    closeTrackPreview: () => { document.getElementById('track-preview-modal').classList.add('hidden'); },

    setUnit: (unit) => {
        if(window.CT.currentUnit === unit) return;
    ('c').filter(c => c.name.startsWith('[TRN]'));
        trnCats.sort((a,b) => (a.order||0) - (b.order||0)).forEach(c => { html += `<button onclick="window.App.startTrnCategory('${c.name}')">⚡ ${c.name.replace('[TRN] ', '')}</button>`; });
        const drp = document.getElementById('train-dropdown'); if(drp) drp.innerHTML = html;
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

    // FIN DE LA PARTE 1 - CONTINÚA EN EL SIGUIENTE MENSAJE
    renderPersonalStats: () => {
        try {
            const u = window.CT.ses(); if(!u) return;
            const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
            
            let compScores = (window.CT.data.userScores[u.h] || []).filter(s => !s.hc && window.UI.isCompetitiveTrack(s.track)).sort((a,b) => a.id - b.id);
            
            const elTotal = document.getElementById('st-p-total-races'); if(elTotal) elTotal.innerText = compScores.length;
            const avgGen = compScores.length ? Math.round(compScores.reduce((a,b)=>a+b.c, 0) / compScores.length) : 0;
            const elAvgGen = document.getElementById('st-p-best-avg'); if(elAvgGen) elAvgGen.innerText = window.UI.formatValue(avgGen);
            const last10Arr = [...compScores].slice(-10);
            const avgLast10 = last10Arr.length ? Math.round(last10Arr.reduce((a,b)=>a+b.c, 0) / last10Arr.length) : 0;
            const elLast10 = document.getElementById('st-p-last10-avg'); if(elLast10) elLast10.innerText = window.UI.formatValue(avgLast10);
            const maxVal = compScores.length ? Math.max(...compScores.map(s => s.c)) : 0;
            const elRec = document.getElementById('st-p-record-val'); if(elRec) elRec.innerText = window.UI.formatValue(maxVal);
            
            let catAvgs = {}; compScores.forEach(s => { const cat = window.UI.getTrackCat(s.track); if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 }; catAvgs[cat].sum += s.c; catAvgs[cat].count++; });
            let bestCat = "-"; let maxCatAvg = -1; let bestCatCount = 0;
            for (let c in catAvgs) { let avg = catAvgs[c].sum / catAvgs[c].count; if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; bestCatCount = catAvgs[c].count; } }
            const elBestCat = document.getElementById('st-p-best-cat'); if(elBestCat) elBestCat.innerText = bestCat;

            const first10 = [...compScores].slice(0, 10);
            const avgF = first10.length ? first10.reduce((a,b)=>a+b.c,0)/first10.length : 0;
            let trend = 0; if(avgF > 0) trend = ((avgLast10 - avgF) / avgF) * 100;
            const elTrend = document.getElementById('st-p-trend-val');
            if(elTrend) {
                elTrend.innerText = (trend > 0 ? '+' : '') + trend.toFixed(1) + '%';
                elTrend.style.color = trend >= 0 ? 'var(--p)' : 'var(--error)';
                elTrend.style.textShadow = trend >= 0 ? '0 0 10px color-mix(in srgb, var(--p) 30%, transparent)' : 'none';
            }

            const elDonut = document.getElementById('st-p-donut-acc'); if(elDonut) elDonut.innerHTML = window.UI.generateDonutSVG(compScores.length > 0 ? (bestCatCount / compScores.length) * 100 : 0, 'var(--p)');
            const last15Scores = [...compScores].slice(-15).map(s => window.UI.formatValue(s.c));
            const svgContainer = document.getElementById('st-p-svg-container');
            if(svgContainer) svgContainer.innerHTML = last15Scores.length > 0 ? window.UI.generateLineChartSVG(last15Scores) : '<div style="color:#333; text-align:center; margin-top:80px; font-family:monospace;">FALTAN DATOS DE TELEMETRÍA</div>';

            const v200 = window.UI.formatValue(200); const v500 = window.UI.formatValue(500); const v700 = window.UI.formatValue(700); const v1000 = window.UI.formatValue(1000);
            let dist = { [`<${v200}`]: 0, [`${v200}-${v500}`]: 0, [`${v500}-${v700}`]: 0, [`${v700}-999`]: 0, [`≥${v1000}`]: 0 };
            compScores.forEach(s => {
                let v = window.UI.formatValue(s.c);
                if(v < v200) dist[`<${v200}`]++; else if(v >= v200 && v < v500) dist[`${v200}-${v500}`]++; else if(v >= v500 && v < v700) dist[`${v500}-${v700}`]++; else if(v >= v700 && v < v1000) dist[`${v700}-999`]++; else dist[`≥${v1000}`]++;
            });
            const barContainer = document.getElementById('st-p-bar-container'); if(barContainer) barContainer.innerHTML = window.UI.generateBarChartSVG(dist);

            const bk = userDoc.bad_keys || {}; const maxErr = Math.max(...Object.values(bk), 5); 
            document.querySelectorAll('#pane-stats-personal kbd[data-key]').forEach(el => {
                el.style.removeProperty('border-color'); el.style.removeProperty('color'); el.style.removeProperty('text-shadow');
                const errs = bk[el.getAttribute('data-key')] || 0;
                if(errs >= 5) { el.style.setProperty('border-color', 'var(--error)', 'important'); el.style.setProperty('color', 'var(--error)', 'important'); el.title = `Errores críticos: ${errs}`; } 
                else if (errs > 0) el.title = `Errores leves: ${errs}`; else el.title = 'Estable';
            });

            const compScoresDesc = [...compScores].sort((a,b) => b.c - a.c);
            const elTop10 = document.getElementById('st-p-top10-races'); 
            if(elTop10) elTop10.innerHTML = window.UI._genList(compScoresDesc, 20, false, (s, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${s.track}')">${window.UI.formatTrackNameFull(s.track)}</div><div class="st-list-val val-blurrable">${window.UI.formatValue(s.c)}</div></li>`);

            let trackAvgs = {}; compScores.forEach(s => { if(!trackAvgs[s.track]) trackAvgs[s.track] = { sum: 0, count: 0 }; trackAvgs[s.track].sum += s.c; trackAvgs[s.track].count++; });
            let trackList = Object.keys(trackAvgs).map(k => ({ t: k, avg: trackAvgs[k].sum / trackAvgs[k].count, count: trackAvgs[k].count }));
            let bottom20 = trackList.filter(t => t.count >= 2).sort((a,b) => a.avg - b.avg);
            if(bottom20.length === 0) bottom20 = trackList.sort((a,b) => a.avg - b.avg);
            const elBottom = document.getElementById('st-p-worst-tracks'); 
            if(elBottom) elBottom.innerHTML = window.UI._genList(bottom20, 20, false, (tr, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${tr.t}')">${window.UI.formatTrackNameFull(tr.t)}</div><div class="st-list-val val-blurrable">${window.UI.formatValue(Math.round(tr.avg))}</div></li>`);

            const bw = userDoc.bad_words || {}; let badWordsList = Object.keys(bw).map(k => ({ w: k, errs: bw[k] })).sort((a,b) => b.errs - a.errs);
            const elWords = document.getElementById('st-p-worst-words'); 
            if(elWords) elWords.innerHTML = window.UI._genList(badWordsList, 20, false, (bwItem, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name">${bwItem.w}</div><div class="st-list-val" style="font-size:0.75rem; width:80px;">${bwItem.errs} errores</div></li>`);
            
            if(window.UI.applyStatsLayout) window.UI.applyStatsLayout();
        } catch(e) { console.error("Error renderPersonalStats:", e); }
    },

    renderGlobalStats: () => {
        try {
            const users = window.CT.dbLocal('u');
            const elUsers = document.getElementById('st-g-users-val'); if(elUsers) elUsers.innerText = users.length; 
            
            let totalRaces = 0; let totalSum = 0; let globalMax = 0;
            users.forEach(u => {
                totalRaces += (u.hi || []).length;
                totalSum += (u.hi || []).reduce((a,b)=>a+b, 0);
                let uMax = Math.max(...(u.hi || [0]), 0);
                if(uMax > globalMax) globalMax = uMax;
            });
            
            const elRaces = document.getElementById('st-g-races-val'); if(elRaces) elRaces.innerText = totalRaces;
            const elAvg = document.getElementById('st-g-avg'); if(elAvg) elAvg.innerText = window.UI.formatValue(totalRaces ? Math.round(totalSum/totalRaces) : 0);
            const elRecord = document.getElementById('st-g-record'); if(elRecord) elRecord.innerText = window.UI.formatValue(globalMax);
            
            let textCounts = {}; (window.CT.data.s_recent || []).forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
            const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count);
            const elTopTexts = document.getElementById('st-g-top-texts'); 
            if(elTopTexts) elTopTexts.innerHTML = window.UI._genList(topTexts, 10, false, (tr, r) => `<tr><td><b style="color:var(--p)">#${r}</b></td><td><div class="track-link" onclick="window.UI.showTrackPreview('${tr.t}')">${window.UI.formatTrackNameFull(tr.t)}</div></td><td>${tr.count}</td></tr>`);
            
            const phrases = window.CT.dbLocal('p'); let catCounts = {}; 
            (window.CT.data.s_recent || []).forEach(s => { const trackObj = phrases.find(p => p.title.toString() === s.track.toString()); const cat = trackObj ? (trackObj.c || 'General') : 'General'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
            let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count);
            const elTopCats = document.getElementById('st-g-top-cats'); 
            if(elTopCats) elTopCats.innerHTML = window.UI._genList(topCats, 10, false, (tc, r) => `<tr><td><b style="color:var(--p)">#${r}</b></td><td>${tc.c}</td><td>${tc.count}</td></tr>`);
        } catch(e) { console.error("Error renderGlobalStats:", e); }
    },

    renderEliteStats: () => {
        try {
            const users = window.CT.dbLocal('u'); if (users.length === 0) return;
            const topS = (window.CT.data.s_top || []).filter(s => window.UI.isCompetitiveTrack(s.track));
            const recentS = (window.CT.data.s_recent || []).filter(s => window.UI.isCompetitiveTrack(s.track) && !s.hc).sort((a,b) => a.id - b.id);
            
            let mostRacesUser = users.reduce((p, c) => ((c.hi||[]).length > (p.hi||[]).length ? c : p), users[0]);
            const elMostVal = document.getElementById('st-e-most-races-val'); if(elMostVal) elMostVal.innerText = (mostRacesUser.hi||[]).length;
            const elMostUsr = document.getElementById('st-e-most-races-user'); if(elMostUsr) elMostUsr.innerText = mostRacesUser.n || "-";

            let recordUser = users.reduce((p, c) => (Math.max(...(c.hi||[0]), 0) > Math.max(...(p.hi||[0]), 0) ? c : p), users[0]);
            const elRecVal = document.getElementById('st-e-record-val'); if(elRecVal) elRecVal.innerText = window.UI.formatValue(Math.max(...(recordUser.hi||[0]), 0));
            const elRecUsr = document.getElementById('st-e-record-user'); if(elRecUsr) elRecUsr.innerText = recordUser.n || "-";

            let avgUser = users.reduce((p, c) => {
                let avgC = (c.hi||[]).length >= 5 ? (c.hi.reduce((a,b)=>a+b,0)/(c.hi.length)) : 0;
                let avgP = (p.hi||[]).length >= 5 ? (p.hi.reduce((a,b)=>a+b,0)/(p.hi.length)) : 0;
                return avgC > avgP ? c : p;
            }, users[0]);
            let bestAvg = (avgUser.hi||[]).length ? (avgUser.hi.reduce((a,b)=>a+b,0)/(avgUser.hi.length)) : 0;
            const elAvgVal = document.getElementById('st-e-bestavg-val'); if(elAvgVal) elAvgVal.innerText = window.UI.formatValue(Math.round(bestAvg));
            const elAvgUsr = document.getElementById('st-e-bestavg-user'); if(elAvgUsr) elAvgUsr.innerText = avgUser.n || "-";

            let tm = {}; topS.forEach(s => { if(!tm[s.track] || s.c > tm[s.track].c) tm[s.track] = s; });
            let top1c = {}; Object.values(tm).forEach(s => { top1c[s.h] = (top1c[s.h]||0)+1; });
            let mTop1h = Object.keys(top1c).reduce((a,b) => top1c[a] > top1c[b] ? a : b, "");
            let mTop1Name = mTop1h ? (users.find(u=>u.h===mTop1h)||{n:"-"}).n : "-";
            const elTop1Val = document.getElementById('st-e-top1-val'); if(elTop1Val) elTop1Val.innerText = mTop1h ? top1c[mTop1h] : 0;
            const elDonutE = document.getElementById('st-e-donut-monopoly'); if(elDonutE) elDonutE.innerHTML = window.UI.generateDonutSVG(Object.values(top1c).reduce((a,b)=>a+b,0) > 0 ? (top1c[mTop1h] / Object.values(top1c).reduce((a,b)=>a+b,0)) * 100 : 0, 'var(--p)');
            const elDonutUser = document.getElementById('st-e-donut-user'); if(elDonutUser) elDonutUser.innerText = mTop1Name.substring(0, 15);
            
            const globalLast20 = [...recentS].slice(-20).map(s => window.UI.formatValue(s.c));
            const eSvgContainer = document.getElementById('st-e-svg-container');
            if(eSvgContainer) eSvgContainer.innerHTML = globalLast20.length > 0 ? window.UI.generateLineChartSVG(globalLast20) : '<div style="color:#333; text-align:center; margin-top:80px; font-family:monospace;">ESPERANDO DATOS GLOBALES</div>';

            let playerStats = users.map(us => { const hist = (us.hi||[]); return hist.length ? Math.round(hist.reduce((a,b)=>a+b)/hist.length) : 0; }).filter(v => v > 0);
            const v40 = window.UI.formatValue(40); const v80 = window.UI.formatValue(80); const v120 = window.UI.formatValue(120);
            let tiers = { [`<${v40}`]: 0, [`${v40}-${v80}`]: 0, [`${v80}-${v120}`]: 0, [`>${v120}`]: 0 };
            playerStats.forEach(v => { let formV = window.UI.formatValue(v); if(formV < v40) tiers[`<${v40}`]++; else if(formV >= v40 && formV < v80) tiers[`${v40}-${v80}`]++; else if(formV >= v80 && formV < v120) tiers[`${v80}-${v120}`]++; else tiers[`>${v120}`]++; });
            const tierContainer = document.getElementById('st-e-bar-tier'); if(tierContainer) tierContainer.innerHTML = window.UI.generateBarChartSVG(tiers);

            let tCounts = {}; topS.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; }); 
            let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]);
            const elTxts = document.getElementById('st-e-table-texts'); 
            if(elTxts) elTxts.innerHTML = window.UI._genList(top10T, 10, true, (tr, r) => {
                let trMax = topS.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0, h:'-'}); 
                return `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${tr}')">${window.UI.formatTrackNameFull(tr)}</div><div class="st-list-meta player-link" onclick="window.UI.showProfile('${trMax.h}')">${trMax.n}</div><div class="st-list-val val-blurrable">${window.UI.formatValue(trMax.c)}</div></li>`;
            });
            
            let scoresWithCat = topS.map(s => ({ ...s, cat: window.UI.getTrackCat(s.track) }));
            let cCounts = {}; scoresWithCat.forEach(s => { cCounts[s.cat] = (cCounts[s.cat] || 0) + 1; }); 
            let top10C = Object.keys(cCounts).sort((a,b) => cCounts[b] - cCounts[a]);
            const elCats = document.getElementById('st-e-table-cats'); 
            if(elCats) elCats.innerHTML = window.UI._genList(top10C, 10, true, (cat, r) => {
                let catMax = scoresWithCat.filter(s => s.cat === cat).reduce((p, c) => (c.c > p.c) ? c : p, {n:'-', c:0, h:'-'}); 
                return `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name">${cat}</div><div class="st-list-meta player-link" onclick="window.UI.showProfile('${catMax.h}')">${catMax.n}</div><div class="st-list-val val-blurrable">${window.UI.formatValue(catMax.c)}</div></li>`;
            });

            let pAct = {}; recentS.forEach(s => { pAct[s.h] = (pAct[s.h] || 0) + 1; }); 
            let topAct = Object.keys(pAct).sort((a,b) => pAct[b] - pAct[a]);
            const elAct = document.getElementById('st-e-table-players'); 
            if(elAct) elAct.innerHTML = window.UI._genList(topAct, 10, true, (h, r) => {
                let n = (users.find(x=>x.h===h)||{n:h}).n;
                return `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name player-link" style="justify-content:flex-start;" onclick="window.UI.showProfile('${h}')">${n}</div><div class="st-list-meta">${h}</div><div class="st-list-val" style="color:#fff;">${pAct[h]}</div></li>`;
            });

            if(window.UI.applyStatsLayout) window.UI.applyStatsLayout();
        } catch(e) { console.error("Error renderEliteStats:", e); }
    },

    renderHardcoreStats: () => {
        try {
            const users = window.CT.dbLocal('u');
            const globalHcScores = (window.CT.data.s_top || []).concat(window.CT.data.s_recent || []).filter(s => s.hc === true);
            
            let globalDeaths = 0; let globalSurvivals = 0; let globalRecord = 0;
            users.forEach(us => {
                globalDeaths += (us.hc_deaths || 0); globalSurvivals += (us.hc_survivals || 0);
                const userHcMax = us.hi_hc && us.hi_hc.length ? Math.max(...us.hi_hc) : 0;
                if(userHcMax > globalRecord) globalRecord = userHcMax;
            });

            const totalAttempts = globalSurvivals + globalDeaths;
            const survRate = totalAttempts > 0 ? ((globalDeaths / totalAttempts) * 100) : 0;
            
            const elRec = document.getElementById('st-hc-record'); if(elRec) elRec.innerText = window.UI.formatValue(globalRecord);
            const elSurv = document.getElementById('st-hc-surv'); if(elSurv) elSurv.innerText = globalSurvivals;
            const elDeath = document.getElementById('st-hc-deaths'); if(elDeath) elDeath.innerText = globalDeaths;
            const elRate = document.getElementById('st-hc-rate'); if(elRate) elRate.innerText = Math.round(survRate) + '%';
            const elDonut = document.getElementById('st-hc-donut-rate'); if(elDonut) elDonut.innerHTML = window.UI.generateDonutSVG(survRate, 'var(--error)');

            const top10 = [...globalHcScores].sort((a,b) => b.c - a.c);
            const elHcTop = document.getElementById('st-hc-top10'); 
            if(elHcTop) elHcTop.innerHTML = window.UI._genList(top10, 10, true, (s, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${s.track}')">${window.UI.formatTrackNameFull(s.track)}</div><div class="st-list-meta player-link" onclick="window.UI.showProfile('${s.h}')">${s.n}</div><div class="st-list-val val-blurrable">${window.UI.formatValue(s.c)}</div></li>`);
            
            let trackDeaths = {}; users.forEach(us => { let td = us.hc_track_deaths || {}; for(let k in td) trackDeaths[k] = (trackDeaths[k] || 0) + td[k]; });
            let deathList = Object.keys(trackDeaths).map(k => ({ t: k, d: trackDeaths[k] })).sort((a,b) => b.d - a.d);
            const elHcWorst = document.getElementById('st-hc-worst'); 
            if(elHcWorst) elHcWorst.innerHTML = window.UI._genList(deathList, 10, false, (td, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${td.t}')">${window.UI.formatTrackNameFull(td.t)}</div><div class="st-list-val" style="font-size:0.75rem;">${td.d} ☠️</div></li>`);

            let legends = users.filter(u => (u.hc_survivals || 0) > 0).sort((a,b) => b.hc_survivals - a.hc_survivals);
            const elLeg = document.getElementById('st-hc-legends'); 
            if(elLeg) elLeg.innerHTML = window.UI._genList(legends, 10, false, (lg, r) => `<li class="st-list-item" style="border-bottom-color: color-mix(in srgb, var(--error) 20%, transparent);"><div class="st-list-rank" style="color:var(--error);">#${r}</div><div class="st-list-name player-link" style="justify-content:flex-start;" onclick="window.UI.showProfile('${lg.h}')">${lg.n}</div><div class="st-list-val" style="font-size:0.75rem; color:var(--error);">${lg.hc_survivals} VICS</div></li>`);

            let victims = users.map(us => ({ n: us.n, h: us.h, d: us.hc_deaths || 0 })).filter(us => us.d > 0).sort((a,b) => b.d - a.d);
            const elVic = document.getElementById('st-hc-victims'); 
            if(elVic) elVic.innerHTML = window.UI._genList(victims, 10, false, (v, r) => `<li class="st-list-item"><div class="st-list-rank">#${r}</div><div class="st-list-name player-link" style="justify-content:flex-start;" onclick="window.UI.showProfile('${v.h}')">${v.n}</div><div class="st-list-val" style="font-size:0.75rem;">${v.d} ☠️</div></li>`);

            let hcSurvivals = {}; globalHcScores.forEach(s => { hcSurvivals[s.track] = (hcSurvivals[s.track] || 0) + 1; });
            let safeTracks = Object.keys(hcSurvivals).map(k => ({ t: k, s: hcSurvivals[k] - (trackDeaths[k] || 0) })).sort((a,b) => b.s - a.s);
            const elSafe = document.getElementById('st-hc-safe'); 
            if(elSafe) elSafe.innerHTML = window.UI._genList(safeTracks, 10, false, (st, r) => `<li class="st-list-item" style="border-bottom-color:#1a1a1a;"><div class="st-list-rank" style="color:var(--success);">#${r}</div><div class="st-list-name track-link" onclick="window.UI.showTrackPreview('${st.t}')">${window.UI.formatTrackNameFull(st.t)}</div><div class="st-list-val" style="color:var(--success); font-size:0.75rem;">RATIO: ${st.s}</div></li>`);

            if(window.UI.applyStatsLayout) window.UI.applyStatsLayout();
        } catch(e) { console.error("Error renderHardcoreStats:", e); }
    },

    renderGlobal: () => {
        try {
            const todayAR = window.CT.getARDate();
            const typeEl = document.getElementById('leaderboard-type'); 
            const rankTypeEl = document.getElementById('ranking-type');
            if(!typeEl || !rankTypeEl) return; 

            let filteredScores = typeEl.value === 'today' ? (window.CT.data.s_recent || []).filter(s => !s.hc && s.d === todayAR) : (window.CT.data.s_top || []).filter(s => !s.hc);
            filteredScores.sort((a,b) => b.c - a.c);
            
            document.getElementById('global-rank-times').innerHTML = filteredScores.slice(0, typeEl.value === 'today' ? 10 : 20).map((s, idx) => {
                const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
                return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="window.UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || window.CT.defAvatar}"></div><span>${s.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;"><span class="track-link" onclick="window.UI.showTrackPreview('${s.track}')" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width:100px;">${window.UI.formatTrackName(s.track)}</span><button class="ghost-btn" onclick="window.App.startGhostRace('${s.track}', ${s.c})" title="Competir contra el Fantasma">👻</button></div></td></tr>`;
            }).join('');

            const rankingMode = rankTypeEl.value; const users = window.CT.dbLocal('u');
            let playerStats = users.map(u => {
                const history = (u.hi || []).filter(val => typeof val === 'number' && !isNaN(val)); 
                let averageCPM = 0;
                if(rankingMode === 'last10') { const l10 = history.slice(-10); averageCPM = l10.length ? Math.round(l10.reduce((a,b)=>a+b, 0) / l10.length) : 0; } 
                else { averageCPM = history.length ? Math.round(history.reduce((a,b)=>a+b, 0) / history.length) : 0; }
                return { n: u.n, a: u.a, h: u.h, avgCPM: averageCPM, total: history.length };
            }).filter(u => u.total > 0).sort((a,b) => b.avgCPM - a.avgCPM);

            document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => {
                const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
                return `<tr><td class="${posClass}">${idx + 1}</td><td><div class="player-link" onclick="window.UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || window.CT.defAvatar}"></div><span>${p.n}</span></div></td><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td></tr>`;
            }).join('');
        } catch(e) { console.error("Error rendering global:", e); }
    },

    showProfile: async (who) => {
        try {
            const currentSes = window.CT.ses(); if (!currentSes) return;
            const targetHandle = (who === 'me') ? currentSes.h : who;
            let u = window.CT.dbLocal('u').find(x => x.h === targetHandle); 
            if(!u) {
                const doc = await window.db.collection('users').doc(targetHandle).get();
                if(doc.exists) u = doc.data(); else return;
            }
            window.CT.activeProfHandle = u.h;
            await window.App.getUserScores(u.h);
            document.getElementById('prof-name').innerText = u.n; document.getElementById('prof-img').src = u.a || window.CT.defAvatar; document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            const hi = u.hi || []; const total = hi.length; document.getElementById('st-total').innerText = total;
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10); const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;
            document.getElementById('st-avg').innerText = window.UI.formatValue(avgCPM); document.getElementById('st-last-10').innerText = window.UI.formatValue(avg10CPM); document.getElementById('st-best').innerText = window.UI.formatValue(bestCPM);
            window.CT.profPage = 0; window.UI.renderProfileHistory();
            document.getElementById('btn-open-edit').classList.toggle('hidden', !(currentSes && u.h === currentSes.h)); document.getElementById('edit-dropdown').classList.add('hidden');
            window.UI.show('profile-screen');
        } catch (error) { console.error("Error en showProfile:", error); }
    },

    closeProfile: () => { window.UI.show('home-screen'); },
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
        } else { document.documentElement.removeAttribute('data-custom-theme'); }
    },

    renderProfileHistory: () => {
        const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = window.CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td><td><span class="track-link" onclick="window.UI.showTrackPreview('${s.track}')">${window.UI.formatTrackName(s.track)}</span></td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="window.App.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        document.getElementById('prof-prev').disabled = window.CT.profPage === 0; document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; document.getElementById('prof-page-num').innerText = `Página ${window.CT.profPage + 1}`;
    },
    changeProfPage: (delta) => { const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; const userScores = scores.filter(s => !s.hc); const nextStart = (window.CT.profPage + delta) * 10; if(nextStart >= 0 && nextStart < userScores.length) { window.CT.profPage += delta; window.UI.renderProfileHistory(); } },

    checkAnnouncements: () => {
        const anns = window.CT.dbLocal('a').filter(x => x.active);
        if (anns.length > 0) { const latest = anns[0]; const lastSeen = localStorage.getItem('ct_last_announcement'); if (latest.id.toString() !== lastSeen) window.UI.showAnnouncement(latest); }
    },

    showTrackSelect: () => { document.getElementById('track-search').value = ''; window.UI.activeTrackCat = null; window.UI.filterFavs = false; window.UI.showTrackCategorySelect(); window.UI.show('track-screen'); },
    showTrackCategorySelect: () => {
        document.getElementById('track-list-view').classList.add('hidden'); document.getElementById('track-category-view').classList.remove('hidden');
        const tracks = window.CT.dbLocal('p'); let cats = window.CT.dbLocal('c'); let catCounts = {}; 
        tracks.forEach(t => { const c = (t.c || 'General').trim(); catCounts[c] = (catCounts[c] || 0) + 1; });
        cats = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).sort((a,b) => (a.order || 0) - (b.order || 0));

        let t_fav = window.CT.data.ui && window.CT.data.ui['t_trk_fav_filter'] ? window.CT.data.ui['t_trk_fav_filter'].v : '⭐ Ver Favoritos';
        let html = `<div class="cat-card cat-fav-card" onclick="window.UI.toggleFavFilter()"><h3><span>${t_fav}</span></h3><span style="color:var(--text-main)">Textos favoritos</span></div>`;
        html += cats.map(cat => `<div class="cat-card" onclick="window.UI.selectTrackCategory('${cat.name}')"><h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span></div>`).join('');
        document.getElementById('track-category-view').innerHTML = html;
    },
    toggleFavFilter: () => { window.UI.filterFavs = true; window.UI.activeTrackCat = null; window.UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); window.UI.renderTrackList(); },
    selectTrackCategory: (cat) => { window.UI.activeTrackCat = cat; window.UI.filterFavs = false; window.UI.trackPage = 0; document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.remove('hidden'); window.UI.renderTrackList(); },
    
    renderTrackList: () => {
        const query = (document.getElementById('track-search').value || "").toLowerCase(); let tracks = window.CT.dbLocal('p');
        const u = window.CT.ses(); let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];

        const listContainer = document.getElementById('track-list-full');
        listContainer.className = 'custom-scroll track-list ' + window.UI.listLayout;
        if (window.UI.filterFavs) listContainer.classList.add('fav-scroll'); else listContainer.classList.remove('fav-scroll');

        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); document.getElementById('track-list-view').classList.remove('hidden'); document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); 
        } else if (window.UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString())).sort((a,b) => favs.indexOf(a.id.toString()) - favs.indexOf(b.id.toString()));
        } else if (!window.UI.activeTrackCat) {
            window.UI.showTrackCategorySelect(); return;
        } else {
            filtered = tracks.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()).sort((a,b) => (a.order || 0) - (b.order || 0));
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

            return `<div class="track-card" onclick="window.App.startRaceWithTrack('${t.id}')" style="${cardStyle}"><div class="track-card-id" style="display:flex; flex-direction:column; gap:10px; ${idColorStyle}">${window.UI.formatTrackName(t.title)}<button onclick="event.stopPropagation(); window.App.toggleFav('${t.id}')" class="fav-star-btn ${starClass}">${isFav ? textPinOn : textPinOff}</button>${reorderFavHtml}</div><div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${(t.c || 'General').trim()}]</span></div></div>`;
        }).join('');
        document.getElementById('track-prev').disabled = window.UI.trackPage === 0; document.getElementById('track-next').disabled = (start + 20) >= filtered.length; document.getElementById('track-page-num').innerText = `Página ${window.UI.trackPage + 1}`;
        
        setTimeout(() => {
            if (window.UI.filterFavs && !query) window.UI.initSortable('track-list-full', 'track', window.UI.trackPage);
            else { const c = document.getElementById('track-list-full'); if (c && c._sortable) { c._sortable.destroy(); c._sortable = null; } }
        }, 50);
    },
    changeTrackPage: (delta) => { const query = (document.getElementById('track-search').value || "").toLowerCase(); let filtered = window.CT.dbLocal('p'); const u = window.CT.ses(); let favs = (window.CT.dbLocal('u').find(x => x.h === u.h) || u).favs || []; if (query) { filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query)); } else if (window.UI.filterFavs) { filtered = filtered.filter(t => favs.includes(t.id.toString())); } else { filtered = filtered.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()); } const nextStart = (window.UI.trackPage + delta) * 20; if(nextStart >= 0 && nextStart < filtered.length) { window.UI.trackPage += delta; window.UI.renderTrackList(); } },

    showAnnouncement: (data) => { if(!data.id) return; window.UI.currentAnnId = data.id.toString(); document.getElementById('motd-icon').innerText = data.icon || "🚀"; document.getElementById('motd-title').innerText = data.title || "Anuncio"; document.getElementById('motd-msg').innerHTML = data.msg || ""; document.getElementById('announcement-modal').classList.remove('hidden'); },
    closeAnnouncement: () => { if(window.UI.currentAnnId) { localStorage.setItem('ct_last_announcement', window.UI.currentAnnId); } document.getElementById('announcement-modal').classList.add('hidden'); },

    openCropModal: (src) => { const img = document.getElementById('crop-image'); img.src = src; img.onload = () => { window.UI.cropScale = 1; window.UI.cropX = 0; window.UI.cropY = 0; document.getElementById('crop-zoom').value = 1; const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight; if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } window.UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); window.UI.setupCropEvents(); }; },
    closeCropModal: () => { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform: () => { const img = document.getElementById('crop-image'); img.style.transform = `translate(-50%, -50%) translate(${window.UI.cropX}px, ${window.UI.cropY}px) scale(${window.UI.cropScale})`; img.style.left = '50%'; img.style.top = '50%'; },
    setupCropEvents: () => { const area = document.getElementById('crop-area'); const startDrag = (e) => { window.UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; window.UI.startX = cx - window.UI.cropX; window.UI.startY = cy - window.UI.cropY; }; const moveDrag = (e) => { if(!window.UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; window.UI.cropX = cx - window.UI.startX; window.UI.cropY = cy - window.UI.startY; window.UI.updateCropTransform(); }; const endDrag = () => { window.UI.isDragging = false; }; area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; document.getElementById('crop-zoom').oninput = (e) => { window.UI.cropScale = e.target.value; window.UI.updateCropTransform(); }; },
    
    ses: () => { 
        const s = JSON.parse(localStorage.getItem('ct_ses')); 
        if(!s) return null;
        const found = (window.CT.data.u || []).find(x => x.h === s.h);
        return found || { h: s.h, n: s.h, r: 'usuario' }; 
    }
};

document.addEventListener('DOMContentLoaded', () => { 
    if(window.CT && window.CT.init) window.CT.init(); 
});
