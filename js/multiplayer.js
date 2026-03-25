/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (VERSIÓN 2.1 - RIVALRY FIX)
   ================================================================ */

if (!document.getElementById('mp-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'mp-custom-styles';
    style.innerHTML = `
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb { background: #b388ff; border-radius: 10px; border: 2px solid rgba(10,10,15,1); }
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb:hover { background: #9b59b6; }
        
        .vehicle-btn { background: transparent; border: 1px solid rgba(179,136,255,0.3); border-radius: 8px; font-size: 1.8rem; padding: 10px 15px; cursor: pointer; transition: 0.3s; filter: grayscale(1); opacity: 0.6; }
        .vehicle-btn:hover { border-color: #b388ff; opacity: 1; filter: grayscale(0); }
        .vehicle-btn.active { border-color: #b388ff; background: rgba(179,136,255,0.1); filter: grayscale(0); opacity: 1; box-shadow: 0 0 15px rgba(179,136,255,0.4); transform: scale(1.1); }

        .duel-mode-bg { background: radial-gradient(circle at 50% 0%, #1a0b2e 0%, #050508 80%); }
        .duel-container { max-width: 1000px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; position: relative; }
        
        .duel-hud { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(179,136,255,0.2); border-radius: 15px; padding: 15px 30px; backdrop-filter: blur(10px); z-index: 10;}
        .duel-player-card { display: flex; align-items: center; gap: 15px; width: 40%; position: relative; }
        .duel-player-card.right { flex-direction: row-reverse; text-align: right; }
        .duel-avatar { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #b388ff; box-shadow: 0 0 15px rgba(179,136,255,0.3); object-fit: cover; }
        .duel-name { color: #fff; font-size: 1.2rem; font-weight: bold; display: block; }
        .duel-cpm { color: #b388ff; font-family: monospace; font-size: 1.1rem; font-weight: bold; }
        .duel-vs { font-size: 2rem; font-weight: 900; color: transparent; -webkit-text-stroke: 1px #b388ff; text-shadow: 0 0 15px rgba(179,136,255,0.5); font-style: italic; }

        .duel-tracks-wrapper { background: rgba(0,0,0,0.6); border: 1px solid rgba(179,136,255,0.3); border-radius: 15px; padding: 20px; position: relative; overflow: hidden; box-shadow: inset 0 0 50px rgba(0,0,0,0.8); }
        .duel-track-line { position: relative; height: 50px; border-bottom: 2px dashed rgba(179,136,255,0.2); margin-bottom: 10px; display: flex; align-items: center; }
        
        .duel-vehicle-icon { position: absolute; font-size: 2.5rem; top: 50%; transform: translateY(-50%); left: 0%; transition: left 1.5s linear; z-index: 5; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
        .duel-progress-glow { position: absolute; height: 4px; background: #b388ff; top: 50%; transform: translateY(-50%); left: 0; width: 0%; transition: width 1.5s linear; box-shadow: 0 0 15px #b388ff; z-index: 1; border-radius: 2px; }

        .duel-text-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(179,136,255,0.2); border-radius: 12px; padding: 30px; color: #666; font-size: 1.4rem; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; min-height: 150px; text-align: justify; backdrop-filter: blur(10px); }
        .duel-text-box span { transition: color 0.1s; }
        .duel-text-box .correct { color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.4); }
        .duel-text-box .error { color: #ff4a4a; text-decoration: underline; text-shadow: 0 0 8px rgba(255,74,74,0.6); }
        .duel-text-box .active-word { border-bottom: 2px solid #b388ff; color: #ccc; }

        .duel-input-box { width: 100%; background: rgba(0,0,0,0.5); border: 2px solid #b388ff; border-radius: 12px; padding: 20px; color: #fff; font-size: 1.5rem; text-align: center; outline: none; }
        
        .cinematic-overlay { position: absolute; inset: -20px; background: rgba(5,5,10,0.95); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeIn 0.4s forwards; border-radius: 15px; overflow: hidden; }
        .vs-avatars { display: flex; align-items: center; gap: 40px; margin-bottom: 20px; }
        .vs-avatar-box { text-align: center; animation: slideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; }
        .vs-avatar-box img { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #b388ff; box-shadow: 0 0 30px rgba(179,136,255,0.5); margin-bottom: 15px; object-fit: cover; }
        .vs-text { font-size: 4rem; font-weight: 900; color: transparent; -webkit-text-stroke: 2px #b388ff; text-shadow: 0 0 30px rgba(179,136,255,0.7); font-style: italic; }
        
        .winner-box { text-align: center; animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; width: 100%; }
        .winner-avatar-wrapper { position: relative; display: inline-block; margin-bottom: 20px; }
        .winner-box img { width: 150px; height: 150px; border-radius: 50%; border: 4px solid #a6ff00; box-shadow: 0 0 50px rgba(166,255,0,0.4); object-fit: cover; }
        .winner-title { font-size: 3rem; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 2px; }
        
        .taunt-popup { position: absolute; background: rgba(0,0,0,0.9); color: #fff; font-weight: bold; border: 1px solid #b388ff; padding: 8px 15px; border-radius: 10px; z-index: 2000; animation: floatUp 2s forwards; pointer-events: none; white-space: nowrap; font-size: 1.2rem; box-shadow: 0 0 20px rgba(179,136,255,0.6); }
        @keyframes floatUp { 0% { opacity: 0; transform: translateY(20px) scale(0.5); } 15% { opacity: 1; transform: translateY(-20px) scale(1.2); } 80% { opacity: 1; transform: translateY(-60px) scale(1); } 100% { opacity: 0; transform: translateY(-100px); } }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideIn { from { transform: translateX(-50px) scale(0.9); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
        @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
}

window.Multiplayer = {
    isOnline: false,
    lobbyUnsubscribe: null,
    matchUnsubscribe: null,
    myHandle: null,
    myVehicle: localStorage.getItem('ct_mp_vehicle') || '🏎️',
    availableVehicles: ['🏎️', '🚀', '🛸', '🚤', '🦖', '🐉', '🏍️', '🚁'],
    
    currentMatchId: null,
    currentRivalHandle: null,
    currentRound: 1,
    myMatchKey: null,
    isHost: false,
    matchEnded: false,
    resetting: false,
    duelWords: [],
    currentWordIndex: 0,
    startTime: null,
    errorsCount: 0,
    nextCheckpointIdx: 0,
    lastTauntT: 0,
    lastMyTauntT: 0,
    
    initLobby: async () => {
        const u = window.CT.ses();
        if (!u) return window.UI.show('auth-screen');
        window.Multiplayer.myHandle = u.h;
        window.UI.show('multiplayer-screen');
        window.Multiplayer.renderVehicleSelector();
        await window.Multiplayer.goOnline(u);
    },

    renderVehicleSelector: () => {
        const container = document.getElementById('mp-vehicles');
        if (!container) return;
        container.innerHTML = window.Multiplayer.availableVehicles.map(v => `
            <button class="vehicle-btn ${v === window.Multiplayer.myVehicle ? 'active' : ''}" onclick="window.Multiplayer.selectVehicle('${v}')">${v}</button>
        `).join('');
    },

    selectVehicle: async (v) => {
        window.Multiplayer.myVehicle = v;
        localStorage.setItem('ct_mp_vehicle', v);
        window.Multiplayer.renderVehicleSelector();
        if (window.Multiplayer.isOnline && window.Multiplayer.myHandle) {
            try { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ vh: v }); } catch (e) {}
        }
    },

    goOnline: async (user) => {
        try {
            const presenceData = {
                h: user.h, n: user.n, a: user.a || '', vh: window.Multiplayer.myVehicle,
                status: 'idle', matchId: null, invite: null, joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await window.db.collection('mp_lobby').doc(user.h).set(presenceData);
            window.Multiplayer.isOnline = true;
            window.addEventListener('beforeunload', window.Multiplayer.handleUnload);
            window.Multiplayer.startRadar();
        } catch (e) { window.UI.showLobby(); }
    },

    goOffline: async () => {
        window.Multiplayer.isOnline = false;
        if (window.Multiplayer.lobbyUnsubscribe) window.Multiplayer.lobbyUnsubscribe();
        if (window.Multiplayer.matchUnsubscribe) window.Multiplayer.matchUnsubscribe();
        window.removeEventListener('keydown', window.Multiplayer.tauntKeyListener);
        try { if (window.Multiplayer.myHandle) await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete(); } catch (e) {}
    },

    handleUnload: () => {
        if (window.Multiplayer.myHandle && window.Multiplayer.isOnline) {
            window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete();
        }
    },

    startRadar: () => {
        window.Multiplayer.lobbyUnsubscribe = window.db.collection('mp_lobby').onSnapshot(snap => {
            const players = snap.docs.map(doc => doc.data());
            window.Multiplayer.renderLobbyState(players);
        });
    },

    renderLobbyState: (players) => {
        const me = players.find(p => p.h === window.Multiplayer.myHandle);
        const others = players.filter(p => p.h !== window.Multiplayer.myHandle);
        if (!me) return;

        if (me.status === 'in_game' && me.matchId && !window.Multiplayer.currentMatchId) {
            window.Multiplayer.currentMatchId = me.matchId;
            window.Multiplayer.initDuelInterface();
            return;
        }

        const onlineList = document.getElementById('mp-online-list');
        onlineList.innerHTML = others.map(p => `
            <li class="st-list-item" style="padding: 10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar-xs"><img src="${p.a || window.CT.defAvatar}"></div>
                    <span style="color:#fff;">${p.n}</span>
                </div>
                <button class="btn-outline" onclick="window.Multiplayer.sendChallenge('${p.h}')">RETAR ⚔️</button>
            </li>
        `).join('') || '<li style="text-align:center; color:#777; padding:20px;">No hay oponentes...</li>';

        const invitesList = document.getElementById('mp-invites-list');
        if (me.invite) {
            invitesList.innerHTML = `<div style="text-align:center;"><p>¡RETO DE ${me.invite.n}!</p><button class="btn-primary" onclick="window.Multiplayer.acceptChallenge('${me.invite.h}')">ACEPTAR</button></div>`;
        } else {
            invitesList.innerHTML = `<div style="text-align:center; color:#777;">Sin retos...</div>`;
        }
    },

    sendChallenge: async (target) => {
        const myUser = window.CT.ses();
        await window.db.collection('mp_lobby').doc(target).update({ invite: { h: myUser.h, n: myUser.n } });
        await window.db.collection('mp_lobby').doc(myUser.h).update({ status: 'waiting' });
    },

    acceptChallenge: async (rival) => {
        const matchId = `duel_${Date.now()}`;
        const tracks = window.CT.dbLocal('p');
        const chosen = tracks[Math.floor(Math.random() * tracks.length)];
        
        await window.db.collection('mp_matches').doc(matchId).set({
            track: chosen, round: 1,
            p1: { h: rival, prog: 0, done: false, rematch: false },
            p2: { h: window.Multiplayer.myHandle, prog: 0, done: false, rematch: false },
            status: 'live'
        });

        await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'in_game', matchId: matchId, invite: null });
        await window.db.collection('mp_lobby').doc(rival).update({ status: 'in_game', matchId: matchId });
    },

    tauntKeyListener: (e) => {
        // Permitimos taunts incluso si la partida terminó (matchEnded = true)
        if (['1','2','3'].includes(e.key)) {
            if (document.activeElement.id === 'duel-input' && !window.Multiplayer.matchEnded) {
                const activeWord = document.querySelector('.active-word');
                if (activeWord && activeWord.innerText.includes(e.key)) return;
            }
            e.preventDefault();
            const msg = e.key === '1' ? 'GG' : (e.key === '2' ? 'EZ' : '💀');
            window.Multiplayer.sendTaunt(msg);
        }
    },

    sendTaunt: async (msg) => {
        if(!window.Multiplayer.currentMatchId) return;
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
            [`${window.Multiplayer.myMatchKey}.taunt`]: { msg: msg, t: Date.now() }
        });
    },

    showTaunt: (msg, who) => {
        // Buscamos si existe la capa de victoria
        const cine = document.querySelector('.cinematic-overlay');
        let target;

        if (cine) {
            // Si hay cinemática, el taunt sale sobre el ganador o sobre la caja central
            target = cine.querySelector('.winner-avatar-wrapper') || cine.querySelector('.vs-avatars');
        } else {
            // Si estamos en carrera, sale en la card del HUD
            target = who === 'me' ? document.querySelector('.duel-player-card:not(.right)') : document.querySelector('.duel-player-card.right');
        }

        if(!target) return;
        const popup = document.createElement('div');
        popup.className = 'taunt-popup';
        popup.innerText = msg;
        target.appendChild(popup);
        setTimeout(() => popup.remove(), 2000);
    },

    initDuelInterface: async () => {
        window.UI.show('duel-screen');
        window.Multiplayer.matchEnded = false;
        window.Multiplayer.resetting = false;

        const matchDoc = await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).get();
        const d = matchDoc.data();
        const isP1 = d.p1.h === window.Multiplayer.myHandle;
        window.Multiplayer.myMatchKey = isP1 ? 'p1' : 'p2';
        window.Multiplayer.currentRivalHandle = isP1 ? d.p2.h : d.p1.h;

        // CARGA DE DATOS DE RIVALIDAD (FIX)
        const sorted = [window.Multiplayer.myHandle, window.Multiplayer.currentRivalHandle].sort();
        const rivId = `${sorted[0]}_${sorted[1]}`;
        const rivDoc = await window.db.collection('mp_rivalries').doc(rivId).get();
        
        let scoreText = "PRIMER ENCUENTRO";
        if (rivDoc.exists) {
            const rd = rivDoc.data();
            const myScore = window.Multiplayer.myHandle === sorted[0] ? rd.score_p1 : rd.score_p2;
            const rivalScore = window.Multiplayer.currentRivalHandle === sorted[0] ? rd.score_p1 : rd.score_p2;
            scoreText = `HISTORIAL: TÚ ${myScore} - ${rivalScore} RIVAL`;
        }

        window.addEventListener('keydown', window.Multiplayer.tauntKeyListener);
        window.Multiplayer.startNewRound(d.track, true, scoreText);

        window.Multiplayer.matchUnsubscribe = window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).onSnapshot(snap => {
            if(!snap.exists) return;
            const data = snap.data();
            const rivalKey = window.Multiplayer.myMatchKey === 'p1' ? 'p2' : 'p1';

            // Escuchar taunts
            if (data[rivalKey].taunt?.t !== window.Multiplayer.lastTauntT) {
                window.Multiplayer.lastTauntT = data[rivalKey].taunt.t;
                window.Multiplayer.showTaunt(data[rivalKey].taunt.msg, 'rival');
            }
            if (data[window.Multiplayer.myMatchKey].taunt?.t !== window.Multiplayer.lastMyTauntT) {
                window.Multiplayer.lastMyTauntT = data[window.Multiplayer.myMatchKey].taunt.t;
                window.Multiplayer.showTaunt(data[window.Multiplayer.myMatchKey].taunt.msg, 'me');
            }

            // Sincronizar rival
            if (!window.Multiplayer.matchEnded) {
                document.getElementById('duel-rival-vehicle').style.left = `${data[rivalKey].prog}%`;
                document.getElementById('duel-rival-fill').style.width = `${data[rivalKey].prog}%`;
                if (data[rivalKey].done) window.Multiplayer.endDuel(false);
            }

            // Reset de ronda
            if (data.round > window.Multiplayer.currentRound) {
                window.Multiplayer.currentRound = data.round;
                window.Multiplayer.startNewRound(data.track, false, "");
            }
        });
    },

    startNewRound: (track, showCine, scoreText) => {
        window.Multiplayer.matchEnded = false;
        window.Multiplayer.duelWords = track.text.split(' ');
        window.Multiplayer.currentWordIndex = 0;
        
        document.getElementById('duel-target-text').innerHTML = window.Multiplayer.duelWords.map((w, i) => `<span id="dw-${i}">${w}</span>`).join(' ');
        document.getElementById('dw-0').classList.add('active-word');
        
        if (showCine) {
            const overlay = document.createElement('div');
            overlay.className = 'cinematic-overlay';
            overlay.innerHTML = `<h2 style="color:#b388ff; letter-spacing:10px;">PREPARANDO</h2><p style="color:#777;">${scoreText}</p>`;
            document.querySelector('.duel-container').appendChild(overlay);
            setTimeout(() => { overlay.remove(); window.Multiplayer.playCountdown(); }, 3000);
        } else {
            window.Multiplayer.playCountdown();
        }
    },

    playCountdown: () => {
        const cd = document.getElementById('duel-cd');
        cd.style.display = 'block';
        let count = 3;
        const intv = setInterval(() => {
            cd.innerText = count > 0 ? count : '¡YA!';
            if (count === -1) { 
                clearInterval(intv); cd.style.display = 'none'; 
                document.getElementById('duel-input').disabled = false;
                document.getElementById('duel-input').focus();
                window.Multiplayer.startTime = Date.now();
                document.getElementById('duel-input').oninput = window.Multiplayer.handleInput;
            }
            count--;
        }, 1000);
    },

    handleInput: (e) => {
        const input = e.target;
        const target = window.Multiplayer.duelWords[window.Multiplayer.currentWordIndex];
        const wordEl = document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`);

        if (input.value === target + ' ' || (window.Multiplayer.currentWordIndex === window.Multiplayer.duelWords.length - 1 && input.value === target)) {
            input.value = '';
            wordEl.className = 'correct';
            window.Multiplayer.currentWordIndex++;
            
            const prog = (window.Multiplayer.currentWordIndex / window.Multiplayer.duelWords.length) * 100;
            document.getElementById('duel-my-vehicle').style.left = `${prog}%`;
            document.getElementById('duel-my-fill').style.width = `${prog}%`;
            window.Multiplayer.syncProgress(prog, false);

            if (window.Multiplayer.currentWordIndex === window.Multiplayer.duelWords.length) {
                window.Multiplayer.endDuel(true);
            } else {
                document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`).classList.add('active-word');
            }
        }
    },

    syncProgress: async (p, done) => {
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
            [`${window.Multiplayer.myMatchKey}.prog`]: p,
            [`${window.Multiplayer.myMatchKey}.done`]: done
        });
    },

    endDuel: async (isWinner) => {
        if (window.Multiplayer.matchEnded) return;
        window.Multiplayer.matchEnded = true;
        document.getElementById('duel-input').disabled = true;

        if (isWinner) {
            window.Multiplayer.syncProgress(100, true);
            // Actualizar Rivalidad en DB
            const sorted = [window.Multiplayer.myHandle, window.Multiplayer.currentRivalHandle].sort();
            const rivRef = window.db.collection('mp_rivalries').doc(`${sorted[0]}_${sorted[1]}`);
            const field = window.Multiplayer.myHandle === sorted[0] ? 'score_p1' : 'score_p2';
            await rivRef.set({ [field]: firebase.firestore.FieldValue.increment(1) }, { merge: true });
        }

        const overlay = document.createElement('div');
        overlay.className = 'cinematic-overlay';
        overlay.innerHTML = `
            <div class="winner-box">
                <div class="winner-avatar-wrapper">
                    <img src="${isWinner ? window.CT.ses().a : (document.getElementById('duel-rival-avatar').src)}">
                </div>
                <h2 class="winner-title">${isWinner ? '¡VICTORIA!' : 'DERROTA'}</h2>
                <div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                    <button class="btn-primary" onclick="window.Multiplayer.requestRematch()">REVANCHA</button>
                    <button class="btn-outline" onclick="window.Multiplayer.quitDuel()">SALIR</button>
                </div>
            </div>
        `;
        document.querySelector('.duel-container').appendChild(overlay);
    },

    requestRematch: async () => {
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
            [`${window.Multiplayer.myMatchKey}.rematch`]: true
        });
        // Lógica de host para resetear sala si ambos aceptan...
    },

    quitDuel: () => {
        window.Multiplayer.goOffline();
        window.UI.show('multiplayer-screen');
        location.reload(); // Hard reset para limpiar estado
    }
};s
