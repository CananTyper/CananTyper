/* ================================================================
    CANANTYPER - UI LOBBY (INICIO Y CONEXIÓN A E-SPORTS / ARENA)
   ================================================================ */

Object.assign(window.UI, {
    initLobby: () => {
        if(window.CT.data.maint && window.CT.data.maint.active) { const u = window.CT.ses(); if(!u || u.r !== 'admin') { window.UI.checkMaintenance(); return; } }
        const u = window.CT.ses(); if(!u) return window.UI.show('auth-screen');
        window.updateDiscordStatus("En el menú principal", `Piloto: ${u.n}`, false);
        document.getElementById('val-display-name').innerText = u.n; document.getElementById('val-username').innerText = u.h; document.getElementById('lobby-avatar').src = u.a || window.CT.defAvatar;
        
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        const hasDuelista = (userDoc.custom_medals || []).includes('duelista') || u.r === 'admin';
        const mpBtn = document.getElementById('t_btn_multiplayer');
        if (mpBtn) {
            if (hasDuelista) mpBtn.classList.remove('hidden');
            else mpBtn.classList.add('hidden');
        }

        window.UI.updateUnitVisuals(window.CT.currentUnit); 
        window.UI.renderGlobal(); 
        window.UI.renderTrainDropdown(); 
        window.UI.show('home-screen'); 
        
        window.UI.checkAnnouncements(); 
        window.UI.initArenaListener(); // CONECTAMOS AL GESTOR DE TORNEOS (CANANSTUDIO)
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
    // SISTEMA DE ARENA (CONECTADO A CANANSTUDIO)
    // =========================================================
    arenaTimerInterval: null,
    arenaCurrentConfig: null,
    arenaUnsubScores: null,
    hasArenaPass: false,
    
    initArenaListener: () => {
        const u = window.CT.ses();
        if (u) {
            const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
            // Evaluamos si puede participar/ver premios (Podés agregar medallas específicas aquí)
            window.UI.hasArenaPass = userDoc.r === 'admin' || true; // Por ahora todos pueden ver el pop-up si participan
        }

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
        const tColor = '#b388ff'; // Forzamos estética violeta pro
        const tBg = 'rgba(179,136,255,0.1)';

        if(navBtn) {
            navBtn.style.borderColor = tColor; navBtn.style.color = tColor; navBtn.style.boxShadow = `0 0 10px ${tBg}`;
        }

        // --- 1. ACTUALIZAR TEXTOS DESDE CANANSTUDIO ---
        const arTitle = document.getElementById('ar-title');
        const badge = document.getElementById('arena-status-badge');
        const playBtn = document.getElementById('btn-play-arena');

        if(arTitle) {
            arTitle.innerText = conf.title || "Evento Oficial";
            arTitle.style.color = "#fff"; arTitle.style.textShadow = `0 0 20px rgba(179,136,255,0.5)`;
        }
        
        // --- 2. LÓGICA DE TIEMPO Y ESTADO ---
        const isTimeExpired = conf.endTime ? (new Date(conf.endTime).getTime() - Date.now() < 0) : false;
        const isEnded = !conf.active || isTimeExpired;

        if (isEnded) {
            if(badge) {
                badge.innerText = "ESTADO: FINALIZADO";
                badge.style.color = "#ff4a4a"; badge.style.borderColor = "#ff4a4a"; badge.style.background = "rgba(255,74,74,0.1)";
            }
            if(playBtn) {
                playBtn.disabled = true; playBtn.innerText = "TORNEO CERRADO"; playBtn.style.filter = "grayscale(1)"; playBtn.style.boxShadow = "none";
            }
            document.getElementById('ar-cd-d').innerText = "00"; document.getElementById('ar-cd-h').innerText = "00";
            document.getElementById('ar-cd-m').innerText = "00"; document.getElementById('ar-cd-s').innerText = "00";
            if (window.UI.arenaTimerInterval) clearInterval(window.UI.arenaTimerInterval);

            // DISPARAR POPUP DE VICTORIA (Solo si no lo vio ya para esta versión)
            const hasSeen = localStorage.getItem(`ct_arena_winner_${conf.version}`);
            if (!hasSeen && window.UI.hasArenaPass) {
                window.UI.resolveArenaWinner(conf);
            }

            if(navBtn && !conf.active) navBtn.style.display = 'none'; // Ocultar del lobby si se apagó de CananStudio

        } else {
            // EN CURSO
            if(navBtn) navBtn.style.display = 'inline-block';
            if(badge) {
                badge.innerText = "ESTADO: EN CURSO";
                badge.style.color = tColor; badge.style.borderColor = tColor; badge.style.background = tBg;
            }
            if(playBtn) {
                playBtn.disabled = false; playBtn.innerText = "INICIAR CARRERA OFICIAL"; playBtn.style.filter = "none"; playBtn.style.boxShadow = `0 0 20px rgba(179,136,255,0.4)`;
            }
            if (conf.endTime) window.UI.startArenaCountdown(conf.endTime);
        }

        // --- 3. CONEXIÓN A LA TABLA EN VIVO ---
        if (window.UI.arenaUnsubScores) window.UI.arenaUnsubScores(); 
        window.UI.arenaUnsubScores = window.db.collection('arena_scores')
            .where('version', '==', conf.version || 'v1')
            .orderBy('score', 'desc')
            .limit(50)
            .onSnapshot(snap => {
                const scores = snap.docs.map(doc => doc.data());
                window.UI.renderArenaLeaderboard(scores, tColor);
            });
    },

    startArenaCountdown: (endTimeStr) => {
        if (window.UI.arenaTimerInterval) clearInterval(window.UI.arenaTimerInterval);
        const endDate = new Date(endTimeStr).getTime();

        const updateClock = () => {
            const distance = endDate - Date.now();
            if (distance < 0) {
                clearInterval(window.UI.arenaTimerInterval);
                window.UI.processArenaEvent(); // Re-evaluar estado (cerrar torneo)
                return;
            }

            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);

            const dEl = document.getElementById('ar-cd-d'); if(dEl) dEl.innerText = d.toString().padStart(2, '0');
            const hEl = document.getElementById('ar-cd-h'); if(hEl) hEl.innerText = h.toString().padStart(2, '0');
            const mEl = document.getElementById('ar-cd-m'); if(mEl) mEl.innerText = m.toString().padStart(2, '0');
            const sEl = document.getElementById('ar-cd-s'); if(sEl) sEl.innerText = s.toString().padStart(2, '0');
        };
        updateClock(); 
        window.UI.arenaTimerInterval = setInterval(updateClock, 1000); // 1000ms = Reloj dinámico por segundo
    },

    renderArenaLeaderboard: (scores, tColor) => {
        const tbody = document.getElementById('arena-live-rank');
        if (!tbody) return;

        if (scores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">Aún no hay tiempos registrados en este evento.</td></tr>';
            return;
        }

        tbody.innerHTML = scores.map((s, index) => {
            let rankVisual = `#${index + 1}`;
            if (index === 0) rankVisual = `<b style="color:#ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5);">#1</b>`;
            else if (index === 1) rankVisual = `<b style="color:#c0c0c0;">#2</b>`;
            else if (index === 2) rankVisual = `<b style="color:#cd7f32;">#3</b>`;

            return `
            <tr style="border-bottom: 1px solid rgba(179,136,255,0.1);">
                <td style="padding:15px 10px;">${rankVisual}</td>
                <td style="padding:15px 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${s.a || window.CT.defAvatar}" style="width:25px; height:25px; border-radius:50%; border:1px solid ${tColor};">
                        <span style="color:#fff;">${s.n}</span>
                    </div>
                </td>
                <td style="padding:15px 10px; color:#aaa; font-family:monospace;">${s.acc || 0}%</td>
                <td style="padding:15px 10px; color:${tColor}; font-weight:bold; font-family:monospace; font-size:1.2rem;">${s.score}</td>
            </tr>`;
        }).join('');
    },

    resolveArenaWinner: async (conf) => {
        try {
            // Buscamos al Top 1 de la base de datos
            const snap = await window.db.collection('arena_scores').where('version', '==', conf.version).orderBy('score', 'desc').limit(1).get();
            if(!snap.empty) {
                const winner = snap.docs[0].data();
                
                document.getElementById('aw-avatar').src = winner.a || window.CT.defAvatar;
                document.getElementById('aw-name').innerText = winner.n;
                document.getElementById('aw-score').innerText = winner.score;
                document.getElementById('aw-cpm').innerText = winner.cpm;
                document.getElementById('aw-acc').innerText = `${winner.acc}%`;
                
                const medalEl = document.getElementById('aw-medal');
                if (conf.medal && conf.medal !== '') {
                    // Si configuraste una medalla en CananStudio (Ej: Obsidiana), la mostramos. Por defecto usamos un trofeo o cristal 🔮
                    medalEl.innerText = "🔮"; 
                    medalEl.style.display = 'block';
                } else {
                    medalEl.style.display = 'none';
                }

                document.getElementById('arena-winner-modal').classList.remove('hidden');
                localStorage.setItem(`ct_arena_winner_${conf.version}`, 'true'); // Marcar como visto
            }
        } catch (e) { console.error("No se pudo calcular el ganador:", e); }
    }
});
