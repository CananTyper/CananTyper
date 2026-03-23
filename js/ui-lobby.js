/* ================================================================
    CANANTYPER - UI LOBBY (INICIO)
   ================================================================ */

Object.assign(window.UI, {
    initLobby: () => {
        if(window.CT.data.maint && window.CT.data.maint.active) { const u = window.CT.ses(); if(!u || u.r !== 'admin') { window.UI.checkMaintenance(); return; } }
        const u = window.CT.ses(); if(!u) return window.UI.show('auth-screen');
        window.updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);
        document.getElementById('val-display-name').innerText = u.n; document.getElementById('val-username').innerText = u.h; document.getElementById('lobby-avatar').src = u.a || window.CT.defAvatar;
        
        window.UI.updateUnitVisuals(window.CT.currentUnit); 
        window.UI.renderGlobal(); 
        window.UI.renderTrainDropdown(); 
        window.UI.show('home-screen'); 
        
        // Disparadores de Anuncios
        window.UI.checkAnnouncements(); 
        window.UI.checkArenaAnnouncement(); // NUEVA LLAMADA AL POP-UP DE LA ARENA
    },

    showLobby: () => window.UI.initLobby(),

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

    renderTrainDropdown: () => {
        const tPurge = window.CT.data.ui && window.CT.data.ui['t_btn_tr_purge'] ? window.CT.data.ui['t_btn_tr_purge'].v : '🔥 Purgar Errores';
        let html = `<button onclick="window.App.startPurge()">${tPurge}</button>`;
        const trnCats = window.CT.dbLocal('c').filter(c => c.name.startsWith('[TRN]'));
        trnCats.sort((a,b) => (a.order||0) - (b.order||0)).forEach(c => { html += `<button onclick="window.App.startTrnCategory('${c.name}')">⚡ ${c.name.replace('[TRN] ', '')}</button>`; });
        const drp = document.getElementById('train-dropdown'); if(drp) drp.innerHTML = html;
    },

    checkAnnouncements: () => {
        const anns = window.CT.dbLocal('a').filter(x => x.active);
        if (anns.length > 0) { const latest = anns[0]; const lastSeen = localStorage.getItem('ct_last_announcement'); if (latest.id.toString() !== lastSeen) window.UI.showAnnouncement(latest); }
    },

    showAnnouncement: (data) => { 
        if(!data.id) return; 
        window.UI.currentAnnId = data.id.toString(); 
        document.getElementById('motd-icon').innerText = data.icon || "🚀"; 
        document.getElementById('motd-title').innerText = data.title || "Anuncio"; 
        document.getElementById('motd-title').style.color = ''; // Limpiamos el color custom
        document.getElementById('motd-msg').innerHTML = data.msg || ""; 
        document.getElementById('announcement-modal').classList.remove('hidden'); 
    },
    
    closeAnnouncement: () => { 
        if(window.UI.currentAnnId) { localStorage.setItem('ct_last_announcement', window.UI.currentAnnId); } 
        document.getElementById('announcement-modal').classList.add('hidden'); 
        document.getElementById('motd-title').style.color = ''; // Limpieza de seguridad
    },

    // =========================================================
    // NUEVO: CONTROLADOR DE ANUNCIOS DE LA ARENA (POP-UP)
    // =========================================================
    checkArenaAnnouncement: () => {
        // Objeto de configuración (A futuro se descargará de Firebase desde CananStudio)
        const arenaConfig = {
            active: true,
            version: "pre-season-1", // Al cambiar esta variable en CananStudio, el pop-up reaparecerá para todos
            title: "🏆 ¡LA ARENA ESTÁ ABIERTA!",
            msg: "El Torneo de Pre-Temporada ha comenzado en CananTyper.\n\nDemuestra tu velocidad en la pista oficial del evento. Los mejores tiempos quedarán inmortalizados en el Salón de la Fama y recibirán la exclusiva Medalla de Obsidiana.\n\n¿Tienes lo que se necesita para entrar al Top 10?",
            showPopup: true // Control para silenciar el pop-up y dejar solo el botón en el menú
        };

        if (arenaConfig.active && arenaConfig.showPopup) {
            // Verificamos si el usuario ya vio ESTA versión del anuncio en su computadora
            const hasSeen = localStorage.getItem('ct_arena_seen_' + arenaConfig.version);
            
            if (!hasSeen) {
                const modal = document.getElementById('announcement-modal');
                document.getElementById('motd-icon').innerText = '🟣';
                
                const titleEl = document.getElementById('motd-title');
                titleEl.innerText = arenaConfig.title;
                titleEl.style.color = '#b388ff'; // Color neón del evento
                
                document.getElementById('motd-msg').innerText = arenaConfig.msg;
                
                modal.classList.remove('hidden');
                
                // Marcamos como leído para que no vuelva a molestar al recargar
                localStorage.setItem('ct_arena_seen_' + arenaConfig.version, 'true');
            }
        }
    }
});
