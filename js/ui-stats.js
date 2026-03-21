/* ================================================================
    CANANTYPER - UI STATS (ESTADÍSTICAS PRO Y WIDGETS)
   ================================================================ */

Object.assign(window.UI, {
    showStats: async () => { 
        const u = window.CT.ses();
        if(u) { await window.App.getUserScores(u.h); document.getElementById('btn-stats-widgets').classList.toggle('hidden', u.r !== 'admin'); }
        window.UI.switchStatsTab('personal'); window.UI.updateUnitVisuals(window.CT.currentUnit); window.UI.show('stats-screen'); 
    },

    switchStatsTab: (tab) => {
        const wrapper = document.getElementById('st-transition-wrapper');
        if(wrapper) { wrapper.classList.remove('st-fade-in'); void wrapper.offsetWidth; wrapper.classList.add('st-fade-in'); }

        window.UI.activeStatsTab = tab;
        document.querySelectorAll('#stats-screen .st-pane').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.st-nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`pane-stats-${tab}`).classList.remove('hidden');
        
        const activeBtn = document.getElementById(`t-st-${tab.substring(0,2)}`); 
        if (activeBtn) activeBtn.classList.add('active');
        
        if (tab === 'personal') window.UI.renderPersonalStats(); 
        else if (tab === 'elite') window.UI.renderEliteStats(); 
        else if (tab === 'hc') window.UI.renderHardcoreStats();
        
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
            arr.forEach((w) => {
                const wEl = grid.querySelector(`[data-id="${w.id}"]`);
                if(wEl) {
                    // FIX ARRASTRE: Mover el elemento físicamente en el DOM
                    grid.appendChild(wEl); 
                    wEl.classList.toggle('hidden', !w.v);
                    wEl.className = wEl.className.replace(/st-col-\d+/g, '').trim(); 
                    wEl.classList.add(`st-col-${w.s || 3}`);
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
            // FIX TÍTULOS: Leer desde el drag-handle directamente y limpiar el menú
            const el = document.querySelector(`[data-id="${w.id}"] .st-widget-header .drag-handle`);
            const title = el ? el.innerText.replace('≡ ', '').trim() : w.id;
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
