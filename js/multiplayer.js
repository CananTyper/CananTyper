/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (VERSIÓN 2.2 - RIVALRY & TAUNT FIX)
    Lobby, Matchmaking, Sincronización, Cinemáticas y Taunts
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
        .duel-track-line:last-child { border-bottom: none; margin-bottom: 0; }
        
        .duel-vehicle-icon { position: absolute; font-size: 2.5rem; top: 50%; transform: translateY(-50%); left: 0%; transition: left 1.5s linear; z-index: 5; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
        .duel-progress-glow { position: absolute; height: 4px; background: #b388ff; top: 50%; transform: translateY(-50%); left: 0; width: 0%; transition: width 1.5s linear; box-shadow: 0 0 15px #b388ff; z-index: 1; border-radius: 2px; }

        .duel-text-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(179,136,255,0.2); border-radius: 12px; padding: 30px; color: #666; font-size: 1.4rem; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; min-height: 150px; text-align: justify; backdrop-filter: blur(10px); box-shadow: inset 0 0 20px rgba(179,136,255,0.02); }
        .duel-text-box span { transition: color 0.1s; }
        .duel-text-box .correct { color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.4); }
        .duel-text-box .error { color: #ff4a4a; text-decoration: underline; text-shadow: 0 0 8px rgba(255,74,74,0.6); }
        .duel-text-box .active-word { border-bottom: 2px solid #b388ff; color: #ccc; }

        .duel-input-box { width: 100%; background: rgba(0,0,0,0.5); border: 2px solid #b388ff; border-radius: 12px; padding: 20px; color: #fff; font-size: 1.5rem; text-align: center; outline: none; transition: 0.3s; box-shadow: 0 0 20px rgba(179,136,255,0.1); }
        .duel-input-box:focus { box-shadow: 0 0 30px rgba(179,136,255,0.4); background: rgba(179,136,255,0.05); }
        .duel-input-box.error-shake { animation: shake 0.3s; border-color: #ff4a4a; box-shadow: 0 0 30px rgba(255,74,74,0.4); }
        
        .duel-countdown { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8rem; font-weight: 900; color: #fff; text-shadow: 0 0 40px #b388ff; z-index: 100; pointer-events: none; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

        .cinematic-overlay { position: absolute; inset: -20px; background: rgba(5,5,10,0.95); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeIn 0.4s forwards; border-radius: 15px; overflow: hidden; }
        .vs-avatars { display: flex; align-items: center; gap: 40px; margin-bottom: 20px; }
        .vs-avatar-box { text-align: center; animation: slideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; }
        .vs-avatar-box img { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #b388ff; box-shadow: 0 0 30px rgba(179,136,255,0.5); margin-bottom: 15px; object-fit: cover; }
        .vs-text { font-size: 4rem; font-weight: 900; color: transparent; -webkit-text-stroke: 2px #b388ff; text-shadow: 0 0 30px rgba(179,136,255,0.7); font-style: italic; margin: 0 20px; animation: popIn 0.5s ease; }
        
        .winner-box { text-align: center; animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; width: 100%; }
        .winner-avatar-wrapper { position: relative; display: inline-block; margin-bottom: 20px; }
        .winner-box img { width: 150px; height: 150px; border-radius: 50%; border: 4px solid #a6ff00; box-shadow: 0 0 50px rgba(166,255,0,0.6); object-fit: cover; }
        .winner-title { font-size: 3rem; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 2px; }
        .winner-subtitle { color: #fff; font-size: 1.2rem; margin-top: 10px; opacity: 0.9; letter-spacing: 1px; }
        
        .taunt-btn { background: rgba(0,0,0,0.6); border: 1px solid #b388ff; color: #b388ff; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: 0.2s; font-family: monospace; font-weight: bold;}
        .taunt-btn:hover { background: #b388ff; color: #000; box-shadow: 0 0 10px #b388ff; }
        
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
    
    // Motor de Combate Variables
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
    checkpoints: [10, 25, 50, 75, 100],
    nextCheckpointIdx: 0,
    lastTauntT: 0,
    lastMyTauntT: 0,
    
    initLobby: async () => {
        const u = window.CT.ses();
        if (!u) return window.UI.show('auth-screen');
        window.Multiplayer.myHandle = u.h;
        window.UI.show('multiplayer-screen');
        window.Multiplayer.renderVehicleSelector();
        document.getElementById('mp-online-list').innerHTML = '<li style="text-align: center; color: #b388ff; padding: 20px;">Estableciendo enlace seguro...</li>';
        await window.Multiplayer.goOnline(u);
    },

    renderVehicleSelector: () => {
        const container = document.getElementById('mp-vehicles');
        if (!container) return;
        container.innerHTML = window.Multiplayer.availableVehicles.map(v => `
            <button class="vehicle-btn ${v === window.Multiplayer.myVehicle ? 'active' : ''}" onclick="window.Multiplayer.selectVehicle('${v}')" title="Elegir ${v}">${v}</button>
        `).join('');
    },

    selectVehicle: async (v) => {
        window.Multiplayer.myVehicle = v;
        localStorage.setItem('ct_mp_vehicle', v);
        window.Multiplayer.renderVehicleSelector();
        if (window.Multiplayer.isOnline && window.Multiplayer.myHandle) {
            try { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ vh: v }); } 
            catch (e) { console.error(e); }
        }
    },

    exitLobby: async () => {
        if (!window.Multiplayer.isOnline) return window.UI.showLobby();
        document.getElementById('mp-online-list').innerHTML = '<li style="text-align: center; color: #777; padding: 20px;">Desconectando...</li>';
        await window.Multiplayer.goOffline();
        window.UI.showLobby();
    },

    goOnline: async (user) => {
        try {
            const userDoc = window.CT.dbLocal('u').find(x => x.h === user.h) || user;
            if(!userDoc.mp) userDoc.mp = { wins: 0, losses: 0, races: 0, avg_cpm: 0, best_cpm: 0, history: [], streak: 0 };
            const presenceData = {
                h: userDoc.h, n: userDoc.n, a: userDoc.a || '', v: userDoc.v || 0,
                vh: window.Multiplayer.myVehicle, mp: userDoc.mp, streak: userDoc.mp.streak || 0,
                status: 'idle', matchId: null, invite: null, joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await window.db.collection('mp_lobby').doc(userDoc.h).set(presenceData);
            window.Multiplayer.isOnline = true;
            window.addEventListener('beforeunload', window.Multiplayer.handleUnload);
            window.Multiplayer.startRadar();
        } catch (e) { window.UI.showLobby(); }
    },

    goOffline: async () => {
        window.Multiplayer.isOnline = false;
        if (window.Multiplayer.lobbyUnsubscribe) { window.Multiplayer.lobbyUnsubscribe(); window.Multiplayer.lobbyUnsubscribe = null; }
        if (window.Multiplayer.matchUnsubscribe) { window.Multiplayer.matchUnsubscribe(); window.Multiplayer.matchUnsubscribe = null; }
        window.removeEventListener('keydown', window.Multiplayer.tauntKeyListener);
        window.removeEventListener('beforeunload', window.Multiplayer.handleUnload);
        try { if (window.Multiplayer.myHandle) await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete(); } catch (e) {}
    },

    handleUnload: () => {
        if (window.Multiplayer.myHandle && window.Multiplayer.isOnline) {
            window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete();
            if(window.Multiplayer.currentMatchId) window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).delete();
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
        if (!me && window.Multiplayer.isOnline) return window.Multiplayer.exitLobby();

        if (me.status === 'in_game' && me.matchId && !window.Multiplayer.currentMatchId) {
            window.Multiplayer.currentMatchId = me.matchId;
            window.Multiplayer.initDuelInterface();
            return;
        }

        if (me.mp) {
            const total = me.mp.wins + me.mp.losses;
            const wr = total > 0 ? Math.round((me.mp.wins / total) * 100) : 0;
            document.getElementById('mp-stat-winrate').innerHTML = `${wr}% ${me.mp.streak >= 3 ? '🔥x'+me.mp.streak : ''}`;
            document.getElementById('mp-stat-wins').innerText = me.mp.wins;
            document.getElementById('mp-stat-losses').innerText = me.mp.losses;
            document.getElementById('mp-stat-avg').innerText = me.mp.avg_cpm || 0;
            document.getElementById('mp-stat-best').innerText = me.mp.best_cpm || 0;
        }

        document.getElementById('mp-online-count').innerText = `${players.length} ONLINE`;
        const onlineList = document.getElementById('mp-online-list');
        onlineList.innerHTML = others.map(p => `
            <li class="st-list-item" style="padding: 10px; border-color: rgba(255,255,255,0.05);">
                <div style="display:flex; align-items:center; gap:10px; flex-grow: 1;">
                    <div class="avatar-xs" style="border: 1px solid #b388ff; position:relative;"><img src="${p.a || window.CT.defAvatar}"><div style="position:absolute; bottom:-5px; right:-5px; font-size:0.8rem;">${p.vh || '🏎️'}</div></div>
                    <div style="display:flex; flex-direction:column;"><span style="color:#fff; font-weight:bold; font-size:0.9rem;">${p.n} ${p.streak >= 3 ? '🔥x'+p.streak : ''}</span><span style="color:#777; font-size:0.7rem; font-family:monospace;">${p.h}</span></div>
                </div>
                <div style="text-align: right;">${p.status === 'in_game' ? '<span style="color:var(--error);font-size:0.7rem;">EN DUELO</span>' : '<button class="btn-outline" style="border-color:#b388ff;color:#b388ff;padding:6px 12px;font-size:0.75rem;" onclick="window.Multiplayer.sendChallenge(\''+p.h+'\')">RETAR ⚔️</button>'}</div>
            </li>
        `).join('') || '<li style="text-align:center; color:#777; padding:20px;">Eres el único conectado.</li>';

        const invitesList = document.getElementById('mp-invites-list');
        if (me.invite) {
            invitesList.innerHTML = `<div style="background:rgba(179,136,255,0.1);border:1px solid #b388ff;border-radius:8px;padding:20px;text-align:center;"><h4>¡RETO DE ${me.invite.n}!</h4><div style="display:flex;gap:10px;margin-top:15px;"><button class="btn-primary" style="flex:1;background:#b388ff;color:#000;" onclick="window.Multiplayer.acceptChallenge('${me.invite.h}')">ACEPTAR</button><button class="btn-outline" style="flex:1;border-color:#ff4a4a;color:#ff4a4a;" onclick="window.Multiplayer.rejectChallenge()">RECHAZAR</button></div></div>`;
        } else {
            invitesList.innerHTML = `<div style="text-align:center;color:#777;padding:30px 10px;">Ningún desafío pendiente.</div>`;
        }
    },

    sendChallenge: async (target) => {
        await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'waiting' });
        const myUser = window.CT.ses();
        await window.db.collection('mp_lobby').doc(target).update({ invite: { h: myUser.h, n: myUser.n, t: Date.now() } });
    },

    cancelChallenge: async () => { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' }); },
    rejectChallenge: async () => {
        const meDoc = await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).get();
        const rival = meDoc.data().invite.h;
        await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });
        await window.db.collection('mp_lobby').doc(rival).update({ status: 'idle' });
    },

    acceptChallenge: async (rival) => {
        const matchId = `duel_${Date.now()}`;
        const tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]'));
        const chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];
        await window.db.collection('mp_matches').doc(matchId).set({
            track: chosenTrack, round: 1,
            p1: { h: rival, prog: 0, cpm: 0, done: false, rematch: false, taunt: null },
            p2: { h: window.Multiplayer.myHandle, prog: 0, cpm: 0, done: false, rematch: false, taunt: null },
            status: 'starting'
        });
        await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null, status: 'in_game', matchId: matchId });
        await window.db.collection('mp_lobby').doc(rival).update({ status: 'in_game', matchId: matchId });
    },

    // --- TAUNTS SYSTEM (DURANTE Y POST-PARTIDA) ---
    tauntKeyListener: (e) => {
        if (['1','2','3'].includes(e.key)) {
            const input = document.activeElement;
            if (input.id === 'duel-input' && !window.Multiplayer.matchEnded) {
                const targetWord = window.Multiplayer.duelWords[window.Multiplayer.currentWordIndex];
                if (targetWord && targetWord.includes(e.key)) return; // No taunt si el número es parte de la palabra
            }
            e.preventDefault();
            const msg = e.key === '1' ? 'GG' : (e.key === '2' ? 'EZ' : '💀');
            window.Multiplayer.sendTaunt(msg);
        }
    },

    sendTaunt: async (msg) => {
        if(!window.Multiplayer.currentMatchId || !window.Multiplayer.myMatchKey) return;
        try {
            await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
                [`${window.Multiplayer.myMatchKey}.taunt`]: { msg: msg, t: Date.now() }
            });
        } catch(e) {}
    },

    showTaunt: (msg, who) => {
        const cinematic = document.querySelector('.cinematic-overlay');
        let target;
        
        if (cinematic) {
            // Si hay cinemática (Victoria/Derrota), el emote sale sobre la zona central de fotos
            target = cinematic.querySelector('.winner-avatar-wrapper') || cinematic.querySelector('.vs-avatars');
        } else {
            // En carrera normal, sale en las cards del HUD
            target = who === 'me' ? document.querySelector('.duel-player-card:not(.right)') : document.querySelector('.duel-player-card.right');
        }

        if(!target) return;
        const popup = document.createElement('div');
        popup.className = 'taunt-popup';
        popup.innerText = msg;
        target.appendChild(popup);
        setTimeout(() => popup.remove(), 2500);
    },

    // --- MOTOR DE DUELO ---
    initDuelInterface: async () => {
        window.UI.show('duel-screen');
        window.Multiplayer.matchEnded = false;
        window.Multiplayer.resetting = false;

        const matchDoc = await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).get();
        if(!matchDoc.exists) return window.Multiplayer.quitDuel();

        const d = matchDoc.data();
        const isMeP1 = d.p1.h === window.Multiplayer.myHandle;
        window.Multiplayer.myMatchKey = isMeP1 ? 'p1' : 'p2';
        window.Multiplayer.isHost = !isMeP1;
        const rivalHandle = isMeP1 ? d.p2.h : d.p1.h;
        window.Multiplayer.currentRivalHandle = rivalHandle;

        // FIX RIVALIDAD: Buscar marcador histórico antes de arrancar
        const sorted = [window.Multiplayer.myHandle, rivalHandle].sort();
        const rivId = `${sorted[0]}_${sorted[1]}`;
        const rivDoc = await window.db.collection('mp_rivalries').doc(rivId).get();
        let myScore = 0, rivalScore = 0;
        if (rivDoc.exists) {
            const rd = rivDoc.data();
            myScore = (window.Multiplayer.myHandle === sorted[0]) ? rd.score_p1 : rd.score_p2;
            rivalScore = (rivalHandle === sorted[0]) ? rd.score_p1 : rd.score_p2;
        }

        const myUser = window.CT.ses();
        const rivalLobby = await window.db.collection('mp_lobby').doc(rivalHandle).get();
        const rivalData = rivalLobby.exists ? rivalLobby.data() : { n: 'RIVAL', a: '', vh: '🚀' };

        document.getElementById('duel-my-avatar').src = myUser.a || window.CT.defAvatar;
        document.getElementById('duel-rival-name').innerText = rivalData.n.toUpperCase();
        document.getElementById('duel-rival-avatar').src = rivalData.a || window.CT.defAvatar;
        document.getElementById('duel-rival-vehicle').innerText = rivalData.vh || '🚀';

        window.addEventListener('keydown', window.Multiplayer.tauntKeyListener);
        window.Multiplayer.startNewRound(d.track, true, myScore, rivalScore);

        window.Multiplayer.matchUnsubscribe = window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).onSnapshot(snap => {
            if(!snap.exists) return window.Multiplayer.quitDuel();
            const data = snap.data();
            const rivalKey = window.Multiplayer.myMatchKey === 'p1' ? 'p2' : 'p1';

            // Escuchar Taunts
            if (data[rivalKey].taunt?.t !== window.Multiplayer.lastTauntT) {
                window.Multiplayer.lastTauntT = data[rivalKey].taunt.t;
                window.Multiplayer.showTaunt(data[rivalKey].taunt.msg, 'rival');
            }
            if (data[window.Multiplayer.myMatchKey].taunt?.t !== window.Multiplayer.lastMyTauntT) {
                window.Multiplayer.lastMyTauntT = data[window.Multiplayer.myMatchKey].taunt.t;
                window.Multiplayer.showTaunt(data[window.Multiplayer.myMatchKey].taunt.msg, 'me');
            }

            // Progreso Rival
            if (!window.Multiplayer.resetting) {
                document.getElementById('duel-rival-vehicle').style.left = `${data[rivalKey].prog}%`;
                document.getElementById('duel-rival-fill').style.width = `${data[rivalKey].prog}%`;
                document.getElementById('duel-rival-cpm').innerText = `${data[rivalKey].cpm} CPM`;
                if (data[rivalKey].done && !window.Multiplayer.matchEnded) window.Multiplayer.endDuel(false);
            }

            // Revancha
            if (data[rivalKey].rematch) document.getElementById('rematch-status').innerHTML = '<span style="color:#ffd700;">¡El rival quiere revancha!</span>';
            if (data.p1.rematch && data.p2.rematch && window.Multiplayer.isHost && !window.Multiplayer.resetting) {
                window.Multiplayer.resetting = true;
                window.Multiplayer.triggerRematchReset();
            }

            // Reset de Ronda (Fix Carrera Fantasma)
            if (data.round > window.Multiplayer.currentRound) {
                window.Multiplayer.currentRound = data.round;
                window.Multiplayer.startNewRound(data.track, false, 0, 0);
            }
        });
    },

    startNewRound: (track, showCine, myScore, rivalScore) => {
        const cines = document.querySelectorAll('.cinematic-overlay');
        cines.forEach(c => c.remove());
        window.Multiplayer.matchEnded = false;
        window.Multiplayer.resetting = false;
        window.Multiplayer.duelWords = track.text.split(' ');
        window.Multiplayer.currentWordIndex = 0;
        window.Multiplayer.errorsCount = 0;
        window.Multiplayer.nextCheckpointIdx = 0;

        document.getElementById('duel-my-vehicle').style.transition = 'none';
        document.getElementById('duel-my-vehicle').style.left = '0%';
        document.getElementById('duel-my-fill').style.width = '0%';
        document.getElementById('duel-rival-vehicle').style.left = '0%';
        document.getElementById('duel-rival-fill').style.width = '0%';
        void document.getElementById('duel-my-vehicle').offsetWidth;
        document.getElementById('duel-my-vehicle').style.transition = 'left 1.5s linear';

        document.getElementById('duel-target-text').innerHTML = window.Multiplayer.duelWords.map((w, i) => `<span id="dw-${i}">${w}</span>`).join(' ');
        document.getElementById('dw-0').classList.add('active-word');
        document.getElementById('duel-input').value = '';
        document.getElementById('duel-input').disabled = true;

        if (showCine) {
            const overlay = document.createElement('div');
            overlay.className = 'cinematic-overlay';
            const histHtml = (myScore > 0 || rivalScore > 0) ? `<div style="color:#ffd700;font-family:monospace;font-size:1.4rem;margin-bottom:20px;">HISTORIAL: TÚ ${myScore} - ${rivalScore} RIVAL</div>` : '<div style="color:#777;margin-bottom:20px;">PRIMER ENCUENTRO</div>';
            overlay.innerHTML = `<h3>PREPARANDO</h3>${histHtml}<div class="vs-avatars"><div class="vs-avatar-box"><img src="${document.getElementById('duel-my-avatar').src}"></div><div class="vs-text">VS</div><div class="vs-avatar-box"><img src="${document.getElementById('duel-rival-avatar').src}"></div></div>`;
            document.querySelector('.duel-container').appendChild(overlay);
            setTimeout(() => { overlay.remove(); window.Multiplayer.playCountdown(); }, 3500);
        } else { window.Multiplayer.playCountdown(); }
    },

    playCountdown: () => {
        const cd = document.getElementById('duel-cd');
        cd.style.display = 'block';
        let count = 3;
        const itv = setInterval(() => {
            cd.innerText = count > 0 ? count : '¡YA!';
            if (count === -1) {
                clearInterval(itv); cd.style.display = 'none';
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
        let typed = input.value;
        const target = window.Multiplayer.duelWords[window.Multiplayer.currentWordIndex];
        const wordEl = document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`);
        const isLast = window.Multiplayer.currentWordIndex === window.Multiplayer.duelWords.length - 1;

        if (typed.length > target.length + 5) { typed = typed.slice(0, target.length + 5); input.value = typed; }
        if (target.startsWith(typed.trim())) { input.classList.remove('error-shake'); wordEl.style.color = '#ccc'; }
        else { input.classList.add('error-shake'); wordEl.style.color = '#ff4a4a'; }

        if (typed === target + ' ' || (isLast && typed === target)) {
            input.value = '';
            wordEl.className = 'correct';
            window.Multiplayer.currentWordIndex++;
            const prog = (window.Multiplayer.currentWordIndex / window.Multiplayer.duelWords.length) * 100;
            document.getElementById('duel-my-vehicle').style.left = `${prog}%`;
            document.getElementById('duel-my-fill').style.width = `${prog}%`;
            
            const currentCPM = Math.round((window.Multiplayer.duelWords.slice(0, window.Multiplayer.currentWordIndex).join(' ').length) / ((Date.now() - window.Multiplayer.startTime) / 60000)) || 0;
            document.getElementById('duel-my-cpm').innerText = `${currentCPM} CPM`;

            if (prog >= window.Multiplayer.checkpoints[window.Multiplayer.nextCheckpointIdx]) {
                window.Multiplayer.syncProgress(prog, currentCPM, false);
                window.Multiplayer.nextCheckpointIdx++;
            }

            if (window.Multiplayer.currentWordIndex === window.Multiplayer.duelWords.length) {
                window.Multiplayer.syncProgress(100, currentCPM, true);
                window.Multiplayer.endDuel(true, currentCPM);
            } else { document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`).classList.add('active-word'); }
        }
    },

    syncProgress: async (p, cpm, done) => {
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
            [`${window.Multiplayer.myMatchKey}.prog`]: p,
            [`${window.Multiplayer.myMatchKey}.cpm`]: cpm,
            [`${window.Multiplayer.myMatchKey}.done`]: done
        });
    },

    endDuel: async (isWinner, finalCPM) => {
        if (window.Multiplayer.matchEnded) return;
        window.Multiplayer.matchEnded = true;
        document.getElementById('duel-input').disabled = true;

        if (isWinner) {
            const rival = window.Multiplayer.currentRivalHandle;
            const sorted = [window.Multiplayer.myHandle, rival].sort();
            const rivRef = window.db.collection('mp_rivalries').doc(`${sorted[0]}_${sorted[1]}`);
            const field = window.Multiplayer.myHandle === sorted[0] ? 'score_p1' : 'score_p2';
            await rivRef.set({ [field]: firebase.firestore.FieldValue.increment(1), last_encounter: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            
            const myRef = window.db.collection('users').doc(window.Multiplayer.myHandle);
            const dbDoc = await myRef.get();
            let mp = dbDoc.data().mp || { wins: 0, losses: 0, races: 0, avg_cpm: 0, streak: 0 };
            mp.wins++; mp.races++; mp.streak++;
            if (finalCPM > (mp.best_cpm || 0)) mp.best_cpm = finalCPM;
            mp.avg_cpm = Math.round(((mp.avg_cpm * (mp.races - 1)) + finalCPM) / mp.races);
            await myRef.update({ mp: mp });
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ streak: mp.streak });
        } else {
             const myRef = window.db.collection('users').doc(window.Multiplayer.myHandle);
             await myRef.update({ 'mp.losses': firebase.firestore.FieldValue.increment(1), 'mp.streak': 0, 'mp.races': firebase.firestore.FieldValue.increment(1) });
             await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ streak: 0 });
        }

        const overlay = document.createElement('div');
        overlay.className = 'cinematic-overlay';
        const winnerAv = isWinner ? document.getElementById('duel-my-avatar').src : document.getElementById('duel-rival-avatar').src;
        overlay.innerHTML = `<div class="winner-box"><h3 style="color:#777;letter-spacing:5px;">COMBATE FINALIZADO</h3><div class="winner-avatar-wrapper"><img src="${winnerAv}"></div><h2 class="winner-title" style="color:${isWinner?'#a6ff00':'#ff4a4a'}">${isWinner?'¡VICTORIA!':'DERROTA'}</h2><div class="rematch-controls" style="margin-top:30px;display:flex;gap:15px;justify-content:center;"><button class="btn-primary" style="background:#b388ff;color:#000;" onclick="window.Multiplayer.requestRematch()">REVANCHA</button><button class="btn-outline" style="border-color:#ff4a4a;color:#ff4a4a;" onclick="window.Multiplayer.quitDuel()">SALIR</button></div><div id="rematch-status" style="margin-top:15px;"></div></div>`;
        document.querySelector('.duel-container').appendChild(overlay);
    },

    requestRematch: async () => {
        document.querySelector('.btn-primary').innerText = "ESPERANDO...";
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({ [`${window.Multiplayer.myMatchKey}.rematch`]: true });
    },

    triggerRematchReset: async () => {
        const tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]'));
        const chosen = tracks[Math.floor(Math.random() * tracks.length)];
        await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
            track: chosen, round: firebase.firestore.FieldValue.increment(1),
            'p1.prog': 0, 'p1.done': false, 'p1.rematch': false, 'p1.taunt': null,
            'p2.prog': 0, 'p2.done': false, 'p2.rematch': false, 'p2.taunt': null
        });
    },

    quitDuel: () => {
        if(window.Multiplayer.isHost) window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).delete().catch(e=>{});
        window.Multiplayer.goOffline();
        location.reload(); 
    }
};
