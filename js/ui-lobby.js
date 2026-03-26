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
    // SISTEMA NERVIOSO DE LA ARENA (E-SPORTS) - VERSIÓN DINÁMICA
    // =========================================================
    arenaTimerInterval: null,
    arenaCurrentConfig: null,
    arenaUnsubScores: null,
    hasArenaPass: false,

    initArenaListener: () => {
        window.db.collection('config').doc('arena_event').onSnapshot(doc => {
            if (doc.exists) {
                window.UI.arenaCurrentConfig = doc.data();
                window.UI.evaluateArenaPass(); 
                window.UI.processArenaEvent(); 
            }
        });
    },

    evaluateArenaPass: () => {
        const conf = window.UI.arenaCurrentConfig;
        const u = window.CT.ses();
        if (!u || !conf) return;

        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        let pass = true;

        if (conf.minCpm > 0) {
            let maxCpm = 0;
            if (userDoc.hi && userDoc.hi.length > 0) maxCpm = Math.max(...userDoc.hi.filter(v => typeof v === 'number'));
            if (maxCpm < conf.minCpm) pass = false;
        }

        if (conf.reqMedal && conf.reqMedal.trim() !== '') {
            let medals = userDoc.custom_medals || []; 
            if (!medals.includes(conf.reqMedal.trim())) pass = false;
        }

        if (userDoc.r === 'admin') pass = true;

        window.UI.hasArenaPass = pass;
    },

    processArenaEvent: () => {
        const conf = window.UI.arenaCurrentConfig;
        if (!conf) return;

        const navBtn = document.querySelector('.btn-arena-nav');
        
        // 1. DINAMISMO DE TEMAS (Colores)
        let tColor = '#b388ff'; let tBg = 'rgba(179,136,255,0.1)'; let tShadow = 'rgba(179,136,255,0.5)';
        if (conf.theme === 'red') { tColor = '#ff4a4a'; tBg = 'rgba(255,74,74,0.1)'; tShadow = 'rgba(255,74,74,0.5)'; }
        if (conf.theme === 'gold') { tColor = '#ffd700'; tBg = 'rgba(255,215,0,0.1)'; tShadow = 'rgba(255,215,0,0.5)'; }

        if(navBtn) { navBtn.style.borderColor = tColor; navBtn.style.color = tColor; navBtn.style.boxShadow = `0 0 10px ${tBg}`; }

        const arTitle = document.getElementById('ar-title');
        const arSub = document.getElementById('ar-subtitle');
        const badge = document.getElementById('arena-status-badge');
        const playBtn = document.getElementById('btn-play-arena');
        const prizeBox = document.getElementById('arena-prize-display');
        const prizeName = document.getElementById('arena-prize-name');
        const prizeTarget = document.getElementById('arena-prize-target-lbl');

        if(arTitle) { arTitle.innerText = conf.title || "Evento Oficial"; arTitle.style.color = "#fff"; arTitle.style.textShadow = `0 0 20px ${tShadow}`; }
        if(arSub) { arSub.innerText = conf.msg || "Conectando con CananStudio"; arSub.style.color = tColor; }

        // Exhibición de Medalla Dinámica
        if (prizeBox && prizeName) {
            if (conf.medal && conf.medal.trim() !== '') {
                prizeBox.classList.remove('hidden');
                prizeBox.style.borderColor = tColor;
                prizeBox.style.boxShadow = `0 10px 40px rgba(0,0,0,0.6), inset 0 0 30px ${tBg}`;
                prizeName.innerText = conf.medal; 
                prizeName.style.color = "#fff";
                document.getElementById('arena-prize-circle').style.borderColor = tColor;
                document.getElementById('arena-prize-circle').style.boxShadow = `0 0 25px ${tShadow}`;
                document.getElementById('arena-prize-icon').style.filter = `drop-shadow(0 0 15px ${tColor})`;

                if(prizeTarget) {
                    if(conf.target === 'top1') prizeTarget.innerText = "🏆 EXCLUSIVO PARA EL TOP 1";
                    else if(conf.target === 'top10') prizeTarget.innerText = "🎖️ PREMIO AL TOP 10";
                    else prizeTarget.innerText = "🎁 PARA TODOS LOS CLASIFICADOS";
                    prizeTarget.style.background = tColor;
                    prizeTarget.style.color = "#000";
                    prizeTarget.style.boxShadow = `0 0 15px ${tShadow}`;
                }
            } else {
                prizeBox.classList.add('hidden');
            }
        }

        const isTimeExpired = conf.endTime ? (new Date(conf.endTime).getTime() - Date.now() < 0) : false;
        const isEnded = !conf.active || isTimeExpired;

        if (isEnded) {
            if(badge) { badge.innerText = "ESTADO: FINALIZADO"; badge.style.color = "#ff4a4a"; badge.style.borderColor = "#ff4a4a"; badge.style.background = "rgba(255,74,74,0.1)"; }
            if(playBtn) { playBtn.disabled = true; playBtn.innerText = "TORNEO CERRADO"; playBtn.style.filter = "grayscale(1)"; playBtn.style.boxShadow = "none"; }
            document.getElementById('ar-cd-d').innerText = "00"; document.getElementById('ar-cd-h').innerText = "00";
            document.getElementById('ar-cd-m').innerText = "00"; document.getElementById('ar-cd-s').innerText = "00";
            if (window.UI.arenaTimerInterval) clearInterval(window.UI.arenaTimerInterval);

            const hasSeenWinner = localStorage.getItem(`ct_aw_${conf.version}`);
            if (!hasSeenWinner && window.UI.hasArenaPass) window.UI.resolveAndShowWinner(conf, tColor);
            if(navBtn && !conf.active) navBtn.style.display = 'none'; 
        } else {
            if(navBtn) navBtn.style.display = 'inline-block';
            if(badge) { badge.innerText = "ESTADO: EN CURSO"; badge.style.color = tColor; badge.style.borderColor = tColor; badge.style.background = tBg; }
            if(playBtn) {
                if (window.UI.hasArenaPass) { playBtn.disabled = false; playBtn.innerText = "INICIAR CARRERA OFICIAL"; playBtn.style.filter = "none"; playBtn.style.boxShadow = `0 0 20px ${tShadow}`; playBtn.style.background = tColor; playBtn.style.color = "#000"; } 
                else { playBtn.disabled = true; playBtn.innerText = "NO CLASIFICADO"; playBtn.style.filter = "grayscale(1)"; playBtn.style.background = "transparent"; playBtn.style.color = "#888"; playBtn.style.boxShadow = "none"; }
            }
            if (conf.endTime) window.UI.startArenaCountdown(conf.endTime);

            const hasSeenWelcome = localStorage.getItem(`ct_awel_${conf.version}`);
            if (!hasSeenWelcome && window.UI.hasArenaPass) {
                const modal = document.getElementById('announcement-modal');
                document.getElementById('motd-icon').innerText = '🏆';
                document.getElementById('motd-title').innerText = "CLASIFICACIÓN APROBADA";
                document.getElementById('motd-title').style.color = tColor; 
                document.getElementById('motd-msg').innerText = "Tienes acceso al Torneo: " + conf.title + "\n\n" + conf.msg;
                modal.classList.remove('hidden');
                localStorage.setItem(`ct_awel_${conf.version}`, 'true');
            }
        }

        // CONEXIÓN A LA TABLA EN VIVO (Bypass Índice Firebase)
        if (window.UI.arenaUnsubScores) window.UI.arenaUnsubScores(); 
        window.UI.arenaUnsubScores = window.db.collection('arena_scores')
            .where('version', '==', conf.version || 'v1')
            .onSnapshot(snap => {
                let scores = snap.docs.map(doc => doc.data());
                
                // Ordenamos en RAM para burlar la restricción de Índices
                scores.sort((a, b) => b.score - a.score);
                scores = scores.slice(0, 50);

                window.UI.renderArenaLeaderboard(scores, tColor, conf);

                const u = window.CT.ses();
                if (u && !window.UI.hasArenaPass && scores.some(s => s.h === u.h)) {
                    window.UI.hasArenaPass = true;
                }
            });
    },

    startArenaCountdown: (endTimeStr) => {
        if (window.UI.arenaTimerInterval) clearInterval(window.UI.arenaTimerInterval);
        const endDate = new Date(endTimeStr).getTime();

        const updateClock = () => {
            const distance = endDate - Date.now();
            if (distance < 0) {
                clearInterval(window.UI.arenaTimerInterval);
                window.UI.processArenaEvent(); 
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
        window.UI.arenaTimerInterval = setInterval(updateClock, 1000);
    },

    // 2. TABLA INTELIGENTE (Cambia las columnas según el modo)
    renderArenaLeaderboard: (scores, tColor, conf) => {
        const thead = document.querySelector('#arena-screen .data-table thead');
        const tbody = document.getElementById('arena-live-rank');
        if (!tbody || !thead) return;

        // Títulos Dinámicos de Columnas
        let col3Name = "PRECISIÓN";
        let col4Name = "PUNTAJE FINAL";
        
        if (conf.mode === 'league') col3Name = "CARRERAS";
        if (conf.scoring === 'cpm') col4Name = conf.mode === 'league' ? "PROM. CPM" : "MÁX. CPM";

        thead.innerHTML = `<tr>
            <th width="15%" style="color:${tColor};">RANGO</th>
            <th width="45%">PILOTO</th>
            <th width="20%">${col3Name}</th>
            <th width="20%" style="color:${tColor};">${col4Name}</th>
        </tr>`;

        if (scores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#777;">Aún no hay tiempos registrados en este evento.</td></tr>';
            return;
        }

        tbody.innerHTML = scores.map((s, index) => {
            let rankVisual = `#${index + 1}`;
            if (index === 0) rankVisual = `<b style="color:#ffd700; text-shadow: 0 0 10px rgba(255,215,0,0.5);">#1</b>`;
            else if (index === 1) rankVisual = `<b style="color:#c0c0c0;">#2</b>`;
            else if (index === 2) rankVisual = `<b style="color:#cd7f32;">#3</b>`;

            // Valores Dinámicos
            let col3Value = `${s.acc || 0}%`;
            if (conf.mode === 'league') col3Value = `${s.races || 1} 🏁`;

            return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding:15px 10px;">${rankVisual}</td>
                <td style="padding:15px 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${s.a || window.CT.defAvatar}" style="width:25px; height:25px; border-radius:50%; border:1px solid ${tColor};">
                        <span style="color:#fff; font-weight:bold;">${s.n}</span>
                    </div>
                </td>
                <td style="padding:15px 10px; color:#aaa; font-family:monospace;">${col3Value}</td>
                <td style="padding:15px 10px; color:${tColor}; font-weight:bold; font-family:monospace; font-size:1.2rem;">${s.score}</td>
            </tr>`;
        }).join('');
    },

    resolveAndShowWinner: async (conf, tColor) => {
        try {
            // Bypass de Índice Firebase
            const snap = await window.db.collection('arena_scores').where('version', '==', conf.version).get();
            if(!snap.empty) {
                let scores = snap.docs.map(doc => doc.data());
                scores.sort((a, b) => b.score - a.score);
                const winner = scores[0]; 
                
                document.getElementById('aw-avatar').src = winner.a || window.CT.defAvatar;
                document.getElementById('aw-avatar').style.borderColor = tColor;
                document.getElementById('aw-avatar').style.boxShadow = `0 0 40px ${tColor}80`;

                document.getElementById('aw-name').innerText = winner.n;
                document.getElementById('aw-score').innerText = winner.score;
                document.getElementById('aw-score').style.color = tColor;
                document.getElementById('aw-score').style.textShadow = `0 0 10px ${tColor}`;

                document.getElementById('aw-cpm').innerText = winner.cpm;
                document.getElementById('aw-acc').innerText = `${winner.acc}%`;
                
                const medalEl = document.getElementById('aw-medal');
                if (conf.medal && conf.medal.trim() !== '') {
                    medalEl.innerText = "🏆"; 
                    medalEl.style.display = 'block';
                } else {
                    medalEl.style.display = 'none';
                }

                const modalCard = document.querySelector('#arena-winner-modal .auth-card');
                if(modalCard) {
                    modalCard.style.borderColor = tColor;
                    modalCard.style.boxShadow = `0 0 80px ${tColor}40`;
                    document.querySelector('#arena-winner-modal h3').style.color = tColor;
                }

                document.getElementById('arena-winner-modal').classList.remove('hidden');
                localStorage.setItem(`ct_aw_${conf.version}`, 'true'); 
            }
        } catch (e) { console.error("Error resolviendo ganador de la Arena:", e); }
    }
});
