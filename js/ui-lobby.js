/* ================================================================
    CANANTYPER - UI LOBBY (INICIO Y CONEXIÓN A E-SPORTS)
   ================================================================ */

Object.assign(window.UI, {
    initLobby: () => {
        if(window.CT.data.maint && window.CT.data.maint.active) { const u = window.CT.ses(); if(!u || u.r !== 'admin') { window.UI.checkMaintenance(); return; } }
        const u = window.CT.ses(); if(!u) return window.UI.show('auth-screen');
        window.updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);
        document.getElementById('val-display-name').innerText = u.n; document.getElementById('val-username').innerText = u.h; document.getElementById('lobby-avatar').src = u.a || window.CT.defAvatar;
        
        // EL GATEKEEPER DEL MULTIJUGADOR: Valida la medalla "duelista"
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        const hasDuelista = (userDoc.custom_medals || []).includes('duelista') || u.r === 'admin';
        const mpBtn = document.getElementById('t_btn_multiplayer');
        if (mpBtn) {
            if (hasDuelista) {
                mpBtn.classList.remove('hidden');
            } else {
                mpBtn.classList.add('hidden');
            }
        }

        window.UI.updateUnitVisuals(window.CT.currentUnit); 
        window.UI.renderGlobal(); 
        window.UI.renderTrainDropdown(); 
        window.UI.show('home-screen'); 
        
        window.UI.checkAnnouncements(); 
        window.UI.initArenaListener(); // CONECTAMOS AL GESTOR DE TORNEOS
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
        document.getElementById('motd-title').style.color = ''; 
        document.getElementById('motd-msg').innerHTML = data.msg || ""; 
        document.getElementById('announcement-modal').classList.remove('hidden'); 
    },
    
    closeAnnouncement: () => { 
        if(window.UI.currentAnnId) { localStorage.setItem('ct_last_announcement', window.UI.currentAnnId); } 
        document.getElementById('announcement-modal').classList.add('hidden'); 
        document.getElementById('motd-title').style.color = ''; 
    },

    // =========================================================
    // NUEVO: SISTEMA NERVIOSO DE LA ARENA (E-SPORTS)
    // =========================================================
    arenaTimerInterval: null,
    arenaCurrentConfig: null,

    initArenaListener: () => {
        // Escuchamos los cambios que haces en vivo desde CananStudio
        window.db.collection('config').doc('arena_event').onSnapshot(doc => {
            if (doc.exists) {
                window.UI.arenaCurrentConfig = doc.data();
                window.UI.processArenaEvent();
            }
        });
    },

    processArenaEvent: () => {
        const conf = window.UI.arenaCurrentConfig;
        if (!conf) return;

        const navBtn = document.querySelector('.btn-arena-nav');
        
        // 1. Apagado y Encendido
        if (!conf.active) {
            if(navBtn) navBtn.style.display = 'none';
            // Si el jugador está en la sala de la arena mientras la cierras, lo echamos al lobby
            if(!document.getElementById('arena-screen').classList.contains('hidden')) {
                alert("El torneo ha finalizado y la Arena se ha cerrado.");
                window.UI.show('home-screen');
            }
            return;
        }

        // Si está activo, mostramos el botón
        if(navBtn) navBtn.style.display = 'inline-block';

        // 2. Colores y Tema Visual del Torneo
        let tColor = '#b388ff'; // Galáctico (Por defecto)
        let tBg = 'rgba(179,136,255,0.1)';
        
        if (conf.theme === 'red') { tColor = '#ff4a4a'; tBg = 'rgba(255,74,74,0.1)'; }
        else if (conf.theme === 'gold') { tColor = '#ffd700'; tBg = 'rgba(255,215,0,0.1)'; }

        if(navBtn) {
            navBtn.style.borderColor = tColor;
            navBtn.style.color = tColor;
            navBtn.style.boxShadow = `0 0 10px ${tBg}`;
        }

        // 3. Actualizar la Interfaz de la Sala de Arena
        document.querySelector('#arena-screen .arena-title').innerText = conf.title || "Evento Oficial";
        document.querySelector('#arena-screen .arena-title').style.color = tColor;
        document.querySelector('#arena-screen .btn-arena-play').style.background = tColor;
        document.querySelector('#arena-screen .btn-arena-play').style.color = '#000';
        document.querySelector('#arena-screen .btn-arena-play').style.boxShadow = `0 0 20px ${tBg}`;

        const exitBtn = document.querySelector('#arena-screen .btn-outline');
        if(exitBtn) { exitBtn.style.borderColor = tColor; exitBtn.style.color = tColor; }
        
        const statusSpan = document.querySelector('#arena-screen span[style*="ESTADO: EN CURSO"]');
        if(statusSpan) { statusSpan.style.color = tColor; statusSpan.style.background = tBg; }

        // Mostrar u ocultar penalización visual en base a las reglas
        const penalMsg = document.querySelector('#arena-screen p[style*="Penalización activa"]');
        if (penalMsg) {
            penalMsg.style.display = conf.scoring === 'points' ? 'block' : 'none';
        }

        // Actualizar UI del Gestor de Recompensas
        if (conf.medal) {
            document.querySelector('#arena-screen h5').innerText = "Medalla Oficial"; 
            document.querySelector('#arena-screen .arena-panel:nth-child(2)').style.display = 'flex';
        } else {
            // Si elegiste "🚫 Ninguna", ocultamos el panel de recompensas
            document.querySelector('#arena-screen .arena-panel:nth-child(2)').style.display = 'none';
        }

        // 4. El Cronómetro en Vivo
        if (conf.endTime) {
            window.UI.startArenaCountdown(conf.endTime);
        } else {
            document.querySelector('.countdown-box').style.display = 'none';
        }

        // 5. El Disparo del Pop-up Automático (Anuncio Obligatorio)
        const hasSeen = localStorage.getItem('ct_arena_seen_' + conf.version);
        if (!hasSeen) {
            const modal = document.getElementById('announcement-modal');
            document.getElementById('motd-icon').innerText = '🟣';
            
            const titleEl = document.getElementById('motd-title');
            titleEl.innerText = conf.title;
            titleEl.style.color = tColor; 
            
            document.getElementById('motd-msg').innerText = conf.msg;
            
            modal.classList.remove('hidden');
            localStorage.setItem('ct_arena_seen_' + conf.version, 'true');
        }

        // 6. Carga del Leaderboard en Vivo
        window.UI.loadArenaLeaderboard(conf.version, tColor);
    },

    startArenaCountdown: (endTimeStr) => {
        const cdBox = document.querySelector('.countdown-box');
        if(!cdBox) return;
        cdBox.style.display = 'flex';
        
        if (window.UI.arenaTimerInterval) clearInterval(window.UI.arenaTimerInterval);

        const endDate = new Date(endTimeStr).getTime();

        const updateClock = () => {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                clearInterval(window.UI.arenaTimerInterval);
                cdBox.innerHTML = `<span style="color:var(--error); font-weight:bold; font-size:1.2rem;">EL EVENTO HA CONCLUIDO</span>`;
                const playBtn = document.querySelector('.btn-arena-play');
                if (playBtn) playBtn.style.display = 'none'; 
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

            cdBox.innerHTML = `
                <div class="cd-item"><span class="cd-val">${days < 10 ? '0'+days : days}</span><span class="cd-lbl">DÍAS</span></div>
                <div class="cd-item"><span class="cd-val">${hours < 10 ? '0'+hours : hours}</span><span class="cd-lbl">HRS</span></div>
                <div class="cd-item"><span class="cd-val">${minutes < 10 ? '0'+minutes : minutes}</span><span class="cd-lbl">MIN</span></div>
            `;
            
            const playBtn = document.querySelector('.btn-arena-play');
            if (playBtn) playBtn.style.display = 'block';
        };

        updateClock(); 
        window.UI.arenaTimerInterval = setInterval(updateClock, 60000); 
    },

    loadArenaLeaderboard: async (version, tColor) => {
        const tbody = document.querySelector('#arena-screen .data-table tbody');
        if(!tbody) return;

        try {
            // Buscamos a los pilotos que están corriendo este evento específico
            const snap = await window.db.collection('arena_scores').where('version', '==', version).orderBy('score', 'desc').limit(50).get();
            
            if(snap.empty) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#555;">La arena está vacía. ¡Sé el primero en correr!</td></tr>';
                return;
            }

            let html = '';
            snap.docs.forEach((doc, index) => {
                const s = doc.data();
                let rankVisual = `#${index + 1}`;
                if (index === 0) rankVisual = `<b style="color:#ffd700;">#1</b>`;
                if (index === 1) rankVisual = `<b style="color:#c0c0c0;">#2</b>`;
                if (index === 2) rankVisual = `<b style="color:#cd7f32;">#3</b>`;

                html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding:15px 10px;">${rankVisual}</td>
                    <td style="padding:15px 10px; color:#fff;">${s.n} <span style="color:#666; font-size:0.75rem; font-family:monospace;">${s.h}</span></td>
                    <td style="padding:15px 10px; color:${tColor}; font-weight:bold; font-family:monospace; font-size:1.1rem;">${s.score}</td>
                </tr>`;
            });
            tbody.innerHTML = html;
        } catch(e) {
            console.error("Error cargando Leaderboard de Arena:", e);
        }
    }
});
