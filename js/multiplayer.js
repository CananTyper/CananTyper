/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (FASE BETA + CANANTYPER 2.0)
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

        .cinematic-overlay { position: absolute; inset: -20px; background: rgba(5,5,10,0.95); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); animation: fadeIn 0.4s forwards; border-radius: 15px; }
        .vs-avatars { display: flex; align-items: center; gap: 40px; margin-bottom: 20px; }
        .vs-avatar-box { text-align: center; animation: slideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .vs-avatar-box img { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #b388ff; box-shadow: 0 0 30px rgba(179,136,255,0.5); margin-bottom: 15px; object-fit: cover; }
        .vs-text { font-size: 4rem; font-weight: 900; color: transparent; -webkit-text-stroke: 2px #b388ff; text-shadow: 0 0 30px rgba(179,136,255,0.7); font-style: italic; margin: 0 20px; animation: popIn 0.5s ease; }
        .winner-box { text-align: center; animation: popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .winner-box img { width: 150px; height: 150px; border-radius: 50%; border: 4px solid #a6ff00; box-shadow: 0 0 50px rgba(166,255,0,0.6); margin-bottom: 20px; object-fit: cover; }
        .winner-title { font-size: 3rem; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 2px; }
        .winner-subtitle { color: #fff; font-size: 1.2rem; margin-top: 10px; opacity: 0.9; letter-spacing: 1px; }
        
        .taunt-btn { background: rgba(0,0,0,0.6); border: 1px solid #b388ff; color: #b388ff; padding: 5px 15px; border-radius: 20px; font-size: 0.85rem; cursor: pointer; transition: 0.2s; font-family: monospace; font-weight: bold;}
        .taunt-btn:hover { background: #b388ff; color: #000; box-shadow: 0 0 10px #b388ff; }
        .taunt-popup { position: absolute; background: rgba(0,0,0,0.85); color: #fff; font-weight: bold; border: 1px solid #b388ff; padding: 5px 12px; border-radius: 8px; z-index: 100; animation: floatUp 2s forwards; pointer-events: none; white-space: nowrap; box-shadow: 0 0 10px rgba(179,136,255,0.5); }
        @keyframes floatUp { 0% { opacity: 0; transform: translateY(10px) scale(0.8); } 15% { opacity: 1; transform: translateY(-10px) scale(1.1); } 80% { opacity: 1; transform: translateY(-30px) scale(1); } 100% { opacity: 0; transform: translateY(-50px); } }

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
    currentRivalHandle: null, // CACHÉ VITAL: Evita perder al rival si se borra la sala
    currentRound: 1,          // SISTEMA DE RONDAS: Corrige el bug del reinicio fantasma
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
                vh: window.Multiplayer.myVehicle,
                mp: userDoc.mp, streak: userDoc.mp.streak || 0,
                status: 'idle', matchId: null, invite: null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.db.collection('mp_lobby').doc(userDoc.h).set(presenceData);
            window.Multiplayer.isOnline = true;
            window.addEventListener('beforeunload', window.Multiplayer.handleUnload);
            window.Multiplayer.startRadar();
        } catch (e) {
            alert("Los servidores de duelo están inalcanzables.");
            window.UI.showLobby();
        }
    },

    goOffline: async () => {
        window.Multiplayer.isOnline = false;
        if (window.Multiplayer.lobbyUnsubscribe) { window.Multiplayer.lobbyUnsubscribe(); window.Multiplayer.lobbyUnsubscribe = null; }
        if (window.Multiplayer.matchUnsubscribe) { window.Multiplayer.matchUnsubscribe(); window.Multiplayer.matchUnsubscribe = null; }
        window.removeEventListener('keydown', window.Multiplayer.tauntKeyListener);
        window.removeEventListener('beforeunload', window.Multiplayer.handleUnload);
        try { if (window.Multiplayer.myHandle) await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete(); } catch (e) {}
    },

    handleUnload: (e) => {
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
            const myStreak = me.mp.streak || 0;
            const streakDisplay = myStreak >= 3 ? `<span style="font-size:0.9rem; color:#ff9800; vertical-align:middle; text-shadow: 0 0 10px #ff9800;">🔥x${myStreak}</span>` : '';
            
            document.getElementById('mp-stat-winrate').innerHTML = `${wr}% ${streakDisplay}`;
            document.getElementById('mp-stat-wins').innerText = me.mp.wins;
            document.getElementById('mp-stat-losses').innerText = me.mp.losses;
            document.getElementById('mp-stat-avg').innerText = me.mp.avg_cpm || 0;
            document.getElementById('mp-stat-best').innerText = me.mp.best_cpm || 0;
        }

        document.getElementById('mp-online-count').innerText = `${players.length} ONLINE`;
        const onlineList = document.getElementById('mp-online-list');
        
        if (others.length === 0) {
            onlineList.innerHTML = `<li style="text-align: center; color: #777; padding: 20px;">La sala está vacía.<br>Eres el único duelista aquí.</li>`;
        } else {
            onlineList.innerHTML = others.map(p => {
                let actionBtn = '';
                if (p.status === 'in_game') actionBtn = `<span style="color: var(--error); font-size: 0.75rem; font-weight:bold;">EN COMBATE</span>`;
                else if (p.status === 'waiting') actionBtn = `<span style="color: #ffd700; font-size: 0.75rem; font-style:italic;">Ocupado...</span>`;
                else if (me.status === 'waiting') actionBtn = `<span style="color: #555; font-size: 0.75rem;">Espera...</span>`;
                else actionBtn = `<button class="btn-outline" style="border-color: #b388ff; color: #b388ff; padding: 6px 12px; font-size: 0.75rem;" onclick="window.Multiplayer.sendChallenge('${p.h}')">RETAR ⚔️</button>`;

                let streakBadge = (p.streak && p.streak >= 3) ? `<span style="color:#ff9800; font-size:0.75rem; margin-left:5px; filter:drop-shadow(0 0 3px #ff9800);">🔥 x${p.streak}</span>` : '';

                return `
                <li class="st-list-item" style="padding: 10px; border-color: rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:10px; flex-grow: 1;">
                        <div class="avatar-xs" style="border: 1px solid #b388ff; position:relative;">
                            <img src="${p.a || window.CT.defAvatar}">
                            <div style="position:absolute; bottom:-5px; right:-5px; font-size:0.8rem; filter:drop-shadow(0 0 2px #000);">${p.vh || '🏎️'}</div>
                        </div>
                        <div style="display:flex; flex-direction:column;">
                            <span style="color:#fff; font-weight:bold; font-size:0.9rem;">${p.n} ${streakBadge}</span>
                            <span style="color:#777; font-size:0.7rem; font-family:monospace;">${p.h}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">${actionBtn}</div>
                </li>`;
            }).join('');
        }

        const invitesList = document.getElementById('mp-invites-list');
        if (me.status === 'waiting') {
            invitesList.innerHTML = `<div style="text-align: center; padding: 30px 10px;"><div class="pulse" style="width: 20px; height: 20px; background: #ffd700; margin: 0 auto 15px; display: block;"></div><h4 style="color: #ffd700; margin: 0 0 5px 0;">Reto Enviado</h4><p style="color: #aaa; font-size: 0.85rem;">Esperando respuesta...</p><button class="btn-outline" style="border-color: #ff4a4a; color: #ff4a4a; margin-top: 15px;" onclick="window.Multiplayer.cancelChallenge()">CANCELAR</button></div>`;
        } else if (me.invite) {
            invitesList.innerHTML = `<div style="background: rgba(179,136,255,0.1); border: 1px solid #b388ff; border-radius: 8px; padding: 20px; text-align: center;"><div style="font-size: 2.5rem; margin-bottom: 10px;">🔥</div><h4 style="color: #fff; margin: 0 0 5px 0; font-size: 1.2rem;">¡TE HAN DESAFIADO!</h4><p style="color: #b388ff; font-size: 0.95rem; font-weight: bold; margin-bottom: 20px;">${me.invite.n}</p><div style="display: flex; gap: 10px;"><button class="btn-primary" style="flex: 1; background: #b388ff; color: #000;" onclick="window.Multiplayer.acceptChallenge('${me.invite.h}')">ACEPTAR</button><button class="btn-outline" style="flex: 1; border-color: #ff4a4a; color: #ff4a4a;" onclick="window.Multiplayer.rejectChallenge()">RECHAZAR</button></div></div>`;
        } else {
            invitesList.innerHTML = `<div style="text-align: center; color: #777; padding: 30px 10px; font-size: 0.85rem;"><div style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;">🛡️</div>Ningún desafío pendiente.<br>Estás a salvo por ahora.</div>`;
        }
    },

    sendChallenge: async (targetHandle) => {
        try {
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'waiting' });
            const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);
            await window.db.collection('mp_lobby').doc(targetHandle).update({ invite: { h: myUser.h, n: myUser.n, t: Date.now() } });
            setTimeout(() => { window.Multiplayer.autoExpireChallenge(targetHandle); }, 15000);
        } catch(e) { window.Multiplayer.cancelChallenge(); }
    },

    cancelChallenge: async () => { try { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' }); } catch(e) {} },

    autoExpireChallenge: async (targetHandle) => {
        try {
            const meDoc = await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).get();
            if (meDoc.exists && meDoc.data().status === 'waiting') {
                await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' });
                await window.db.collection('mp_lobby').doc(targetHandle).update({ invite: null });
            }
        } catch(e) {}
    },

    rejectChallenge: async () => {
        try {
            const meDoc = await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).get();
            if (!meDoc.exists || !meDoc.data().invite) return;
            const rivalHandle = meDoc.data().invite.h;
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });
            await window.db.collection('mp_lobby').doc(rivalHandle).update({ status: 'idle' });
        } catch(e) {}
    },

    acceptChallenge: async (rivalHandle) => {
        try {
            const matchId = `duel_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);
            const tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]'));
            const chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];

            await window.db.collection('mp_matches').doc(matchId).set({
                track: chosenTrack,
                round: 1, // EL CORAZÓN DEL FIX DE REVANCHA
                p1: { h: rivalHandle, prog: 0, cpm: 0, done: false, rematch: false, taunt: null },
                p2: { h: myUser.h, prog: 0, cpm: 0, done: false, rematch: false, taunt: null },
                status: 'starting'
            });

            const batch = window.db.batch();
            batch.update(window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle), { invite: null, status: 'in_game', matchId: matchId });
            batch.update(window.db.collection('mp_lobby').doc(rivalHandle), { status: 'in_game', matchId: matchId });
            await batch.commit();

        } catch(e) { console.error(e); alert("Error creando la sala de duelo."); }
    },

    tauntKeyListener: (e) => {
        if (['1','2','3'].includes(e.key)) {
            const activeWordEl = document.querySelector('.active-word');
            if (activeWordEl && activeWordEl.innerText.includes(e.key) && document.activeElement.id === 'duel-input') return;
            e.preventDefault();
            if (e.key === '1') window.Multiplayer.sendTaunt('GG');
            if (e.key === '2') window.Multiplayer.sendTaunt('EZ');
            if (e.key === '3') window.Multiplayer.sendTaunt('💀');
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
        const card = who === 'me' ? document.querySelector('.duel-player-card:not(.right)') : document.querySelector('.duel-player-card.right');
        if(!card) return;
        
        const popup = document.createElement('div');
        popup.className = 'taunt-popup';
        popup.innerText = msg;
        
        popup.style.top = '-20px';
        if (who === 'me') popup.style.left = '60px';
        else popup.style.right = '60px';
        
        card.appendChild(popup);
        setTimeout(() => popup.remove(), 2500);
    },

    initDuelInterface: async () => {
        window.UI.show('duel-screen');
        window.Multiplayer.matchEnded = false;
        window.Multiplayer.resetting = false;
        window.Multiplayer.currentRound = 1;

        const matchDoc = await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).get();
        if(!matchDoc.exists) return window.Multiplayer.quitDuel();

        const matchData = matchDoc.data();
        const isP1 = matchData.p1.h === window.Multiplayer.myHandle;
        window.Multiplayer.myMatchKey = isP1 ? 'p1' : 'p2';
        window.Multiplayer.isHost = !isP1; 
        
        const rivalHandle = isP1 ? matchData.p2.h : matchData.p1.h;
        window.Multiplayer.currentRivalHandle = rivalHandle; // CACHÉ: Arregla el bug de Rivalidad en Cero

        const rivalLobbyDoc = await window.db.collection('mp_lobby').doc(rivalHandle).get();
        const rivalData = rivalLobbyDoc.exists ? rivalLobbyDoc.data() : { n: rivalHandle, a: '', vh: '🚀' };
        const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);

        document.getElementById('duel-my-name').innerText = "TÚ";
        document.getElementById('duel-my-avatar').src = myUser.a || window.CT.defAvatar;
        document.getElementById('duel-rival-name').innerText = rivalData.n.toUpperCase();
        document.getElementById('duel-rival-avatar').src = rivalData.a || window.CT.defAvatar;
        document.getElementById('duel-rival-vehicle').innerText = rivalData.vh || '🚀';

        window.addEventListener('keydown', window.Multiplayer.tauntKeyListener);

        // BÚSQUEDA DEL NÉMESIS
        const sortedHandles = [window.Multiplayer.myHandle, rivalHandle].sort();
        const rivalryId = `${sortedHandles[0]}_${sortedHandles[1]}`;
        let myScore = 0; let rivalScore = 0;
        try {
            const rivDoc = await window.db.collection('mp_rivalries').doc(rivalryId).get();
            if (rivDoc.exists) {
                const rData = rivDoc.data();
                myScore = (window.Multiplayer.myHandle === sortedHandles[0]) ? rData.score_p1 : rData.score_p2;
                rivalScore = (rivalHandle === sortedHandles[0]) ? rData.score_p1 : rData.score_p2;
            }
        } catch(e) {}

        window.Multiplayer.startNewRound(matchData.track, true, myScore, rivalScore);

        window.Multiplayer.matchUnsubscribe = window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).onSnapshot(snap => {
            if(!snap.exists) return window.Multiplayer.quitDuel(); 
            const d = snap.data();
            const myKey = window.Multiplayer.myMatchKey;
            const rivalKey = myKey === 'p1' ? 'p2' : 'p1';
            
            if (d[rivalKey].taunt && d[rivalKey].taunt.t !== window.Multiplayer.lastTauntT) {
                window.Multiplayer.lastTauntT = d[rivalKey].taunt.t;
                window.Multiplayer.showTaunt(d[rivalKey].taunt.msg, 'rival');
            }
            if (d[myKey].taunt && d[myKey].taunt.t !== window.Multiplayer.lastMyTauntT) {
                window.Multiplayer.lastMyTauntT = d[myKey].taunt.t;
                window.Multiplayer.showTaunt(d[myKey].taunt.msg, 'me');
            }

            if (!window.Multiplayer.resetting) {
                const rivalProg = d[rivalKey].prog;
                document.getElementById('duel-rival-vehicle').style.left = `${rivalProg}%`;
                document.getElementById('duel-rival-fill').style.width = `${rivalProg}%`;
                document.getElementById('duel-rival-cpm').innerText = `${d[rivalKey].cpm} CPM`;

                if (d[rivalKey].done && !document.getElementById('duel-input').disabled && !window.Multiplayer.matchEnded) {
                    window.Multiplayer.endDuel(false, null);
                }
            }

            if (d.p1.done && d.p2.done) {
                if (d[rivalKey].rematch) {
                    const statusEl = document.getElementById('rematch-status');
                    if (statusEl) statusEl.innerHTML = `<span style="color:#ffd700; filter:drop-shadow(0 0 5px #ffd700);">¡El rival pide revancha!</span>`;
                }
                if (d.p1.rematch && d.p2.rematch) {
                    if (window.Multiplayer.isHost && !window.Multiplayer.resetting) {
                        window.Multiplayer.resetting = true;
                        window.Multiplayer.triggerRematchReset();
                    }
                }
            }

            // SISTEMA DE RONDAS: El salvador del Bug de Reinicio Fantasma
            if (d.round > window.Multiplayer.currentRound) {
                window.Multiplayer.currentRound = d.round;
                window.Multiplayer.matchEnded = false;
                window.Multiplayer.resetting = false;
                window.Multiplayer.startNewRound(d.track, false, 0, 0); 
            }
        });
    },

    startNewRound: (trackData, showCinematic, myScore, rivalScore) => {
        const cines = document.querySelectorAll('.cinematic-overlay');
        cines.forEach(c => c.remove());

        window.Multiplayer.duelWords = trackData.text.split(' ');
        window.Multiplayer.currentWordIndex = 0;
        window.Multiplayer.errorsCount = 0;
        window.Multiplayer.nextCheckpointIdx = 0;
        
        const myVeh = document.getElementById('duel-my-vehicle');
        const myFill = document.getElementById('duel-my-fill');
        const rivalVeh = document.getElementById('duel-rival-vehicle');
        const rivalFill = document.getElementById('duel-rival-fill');
        
        myVeh.style.transition = 'none'; myFill.style.transition = 'none';
        rivalVeh.style.transition = 'none'; rivalFill.style.transition = 'none';
        
        myVeh.style.left = '0%'; myFill.style.width = '0%';
        rivalVeh.style.left = '0%'; rivalFill.style.width = '0%';
        
        document.getElementById('duel-my-vehicle').innerText = window.Multiplayer.myVehicle;
        document.getElementById('duel-my-cpm').innerText = '0 CPM';
        document.getElementById('duel-rival-cpm').innerText = '0 CPM';
        
        void myVeh.offsetWidth; 
        
        myVeh.style.transition = 'left 1.5s linear'; myFill.style.transition = 'width 1.5s linear';
        rivalVeh.style.transition = 'left 1.5s linear'; rivalFill.style.transition = 'width 1.5s linear';

        document.getElementById('duel-target-text').innerHTML = window.Multiplayer.duelWords.map((w, i) => `<span id="dw-${i}">${w}</span>`).join(' ');
        document.getElementById('dw-0').classList.add('active-word');
        
        const input = document.getElementById('duel-input');
        input.value = '';
        input.disabled = true;
        input.placeholder = "[ PREPARANDO ENLACE ]";

        if (showCinematic) {
            const duelContainer = document.querySelector('.duel-container');
            const cineLayer = document.createElement('div');
            cineLayer.className = 'cinematic-overlay';
            
            const scoreHtml = (myScore > 0 || rivalScore > 0) 
                ? `<div style="color: #ffd700; font-family: monospace; font-size: 1.5rem; margin-bottom: 25px; letter-spacing: 2px; text-shadow: 0 0 10px rgba(255,215,0,0.5);">HISTORIAL: TÚ ${myScore} - ${rivalScore} RIVAL</div>` 
                : `<div style="color: #888; font-family: monospace; font-size: 1rem; margin-bottom: 25px; letter-spacing: 2px;">PRIMER ENCUENTRO</div>`;

            cineLayer.innerHTML = `
                <h3 style="color: #fff; letter-spacing: 5px; margin-bottom: 15px; opacity: 0.7;">PREPARANDO PISTA</h3>
                ${scoreHtml}
                <div class="vs-avatars">
                    <div class="vs-avatar-box">
                        <img src="${document.getElementById('duel-my-avatar').src}">
                        <div style="color: #b388ff; font-weight: bold; font-size: 1.3rem;">TÚ</div>
                    </div>
                    <div class="vs-text">VS</div>
                    <div class="vs-avatar-box" style="animation-delay: 0.2s;">
                        <img src="${document.getElementById('duel-rival-avatar').src}" style="border-color: #ff4a4a; box-shadow: 0 0 30px rgba(255,74,74,0.4);">
                        <div style="color: #ff4a4a; font-weight: bold; font-size: 1.3rem;">${document.getElementById('duel-rival-name').innerText}</div>
                    </div>
                </div>
            `;
            duelContainer.appendChild(cineLayer);

            setTimeout(() => {
                cineLayer.style.animation = 'fadeOut 0.4s forwards';
                setTimeout(() => {
                    cineLayer.remove();
                    window.Multiplayer.playCountdown();
                }, 400);
            }, 3500);
        } else {
            window.Multiplayer.playCountdown();
        }
    },

    playCountdown: () => {
        const cd = document.getElementById('duel-cd');
        const input = document.getElementById('duel-input');
        cd.style.display = 'block';
        cd.style.fontSize = '8rem';
        cd.innerHTML = "3";
        setTimeout(() => cd.innerText = "2", 1000);
        setTimeout(() => cd.innerText = "1", 2000);
        setTimeout(() => { 
            cd.innerText = "¡YA!"; 
            input.disabled = false;
            input.placeholder = "";
            input.focus();
            window.Multiplayer.startTime = Date.now();
            input.oninput = window.Multiplayer.handleInput;
            setTimeout(() => cd.style.display = 'none', 1000);
        }, 3000);
    },

    handleInput: (e) => {
        const input = e.target;
        let typed = input.value;
        const targetWord = window.Multiplayer.duelWords[window.Multiplayer.currentWordIndex];
        const wordEl = document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`);
        const isLastWord = window.Multiplayer.currentWordIndex === window.Multiplayer.duelWords.length - 1;

        if (typed.length > targetWord.length + 5) {
            typed = typed.slice(0, targetWord.length + 5);
            input.value = typed;
        }

        if (targetWord.startsWith(typed.trim())) {
            input.classList.remove('error-shake');
            wordEl.style.color = '#ccc';
        } else {
            input.classList.add('error-shake');
            wordEl.style.color = '#ff4a4a';
        }

        let isCorrectAndFinished = false;
        if (typed.endsWith(' ') && typed.trim() === targetWord) {
            isCorrectAndFinished = true;
        } else if (isLastWord && typed === targetWord) {
            isCorrectAndFinished = true;
        }

        if (isCorrectAndFinished) {
            input.value = '';
            wordEl.classList.remove('active-word');
            wordEl.classList.add('correct');
            window.Multiplayer.currentWordIndex++;
            
            const rawProg = (window.Multiplayer.currentWordIndex / window.Multiplayer.duelWords.length) * 100;
            document.getElementById('duel-my-vehicle').style.left = `${rawProg}%`;
            document.getElementById('duel-my-fill').style.width = `${rawProg}%`;

            const timeMin = (Date.now() - window.Multiplayer.startTime) / 60000;
            const currentCPM = Math.round((window.Multiplayer.duelWords.slice(0, window.Multiplayer.currentWordIndex).join(' ').length) / timeMin) || 0;
            document.getElementById('duel-my-cpm').innerText = `${currentCPM} CPM`;

            if (window.Multiplayer.nextCheckpointIdx < window.Multiplayer.checkpoints.length) {
                const targetProg = window.Multiplayer.checkpoints[window.Multiplayer.nextCheckpointIdx];
                if (rawProg >= targetProg) {
                    window.Multiplayer.syncProgress(targetProg, currentCPM, false);
                    window.Multiplayer.nextCheckpointIdx++;
                }
            }

            if (window.Multiplayer.currentWordIndex >= window.Multiplayer.duelWords.length) {
                window.Multiplayer.syncProgress(100, currentCPM, true);
                window.Multiplayer.endDuel(true, currentCPM);
            } else {
                document.getElementById(`dw-${window.Multiplayer.currentWordIndex}`).classList.add('active-word');
            }
        } else if (typed.endsWith(' ') && typed.trim() !== targetWord) {
            input.value = typed.trim(); 
            window.Multiplayer.errorsCount++;
            wordEl.classList.add('error');
        }
    },

    syncProgress: async (prog, cpm, done) => {
        if(!window.Multiplayer.currentMatchId) return;
        try {
            const updatePayload = {};
            updatePayload[`${window.Multiplayer.myMatchKey}.prog`] = prog; 
            updatePayload[`${window.Multiplayer.myMatchKey}.cpm`] = cpm; 
            updatePayload[`${window.Multiplayer.myMatchKey}.done`] = done; 

            await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update(updatePayload);
        } catch(e) { console.error("Error sincronizando:", e); }
    },

    endDuel: (isWinner, finalCPM_Param) => {
        if (window.Multiplayer.matchEnded) return; 
        window.Multiplayer.matchEnded = true;

        const input = document.getElementById('duel-input');
        input.disabled = true;
        input.oninput = null;
        
        let finalCPM = finalCPM_Param;
        if (!finalCPM) {
            const timeMin = (Date.now() - window.Multiplayer.startTime) / 60000;
            const chars = window.Multiplayer.duelWords.slice(0, window.Multiplayer.currentWordIndex).join(' ').length;
            finalCPM = Math.round(chars / timeMin) || 0;
            
            const rawProg = (window.Multiplayer.currentWordIndex / window.Multiplayer.duelWords.length) * 100;
            window.Multiplayer.syncProgress(rawProg, finalCPM, true);
        }

        const acc = Math.max(0, 100 - (window.Multiplayer.errorsCount * 2)); 

        const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);
        const myName = myUser.n.toUpperCase();
        const rivalName = document.getElementById('duel-rival-name').innerText;
        const myAv = document.getElementById('duel-my-avatar').src;
        const rivalAv = document.getElementById('duel-rival-avatar').src;

        const saveVIPStats = async () => {
            try {
                const myHandle = window.Multiplayer.myHandle;
                const rivalHandle = window.Multiplayer.currentRivalHandle; // Usamos el Caché vital

                const myRef = window.db.collection('users').doc(myHandle);
                const dbDoc = await myRef.get();
                let myMP = dbDoc.data().mp || { wins: 0, losses: 0, races: 0, avg_cpm: 0, best_cpm: 0, history: [], streak: 0 };

                myMP.races += 1;
                if (isWinner) {
                    myMP.wins += 1;
                    myMP.streak = (myMP.streak || 0) + 1;
                } else {
                    myMP.losses += 1;
                    myMP.streak = 0; 
                }

                if (finalCPM > myMP.best_cpm) myMP.best_cpm = finalCPM;
                myMP.avg_cpm = Math.round(((myMP.avg_cpm * (myMP.races - 1)) + finalCPM) / myMP.races);

                myMP.history.unshift({ rival: rivalHandle, res: isWinner ? 'win' : 'loss', cpm: finalCPM, date: new Date().toISOString() });
                if (myMP.history.length > 10) myMP.history.pop();

                await myRef.update({ mp: myMP });
                await window.db.collection('mp_lobby').doc(myHandle).update({ streak: myMP.streak });

                if (rivalHandle) {
                    const sortedHandles = [myHandle, rivalHandle].sort();
                    const rivalryId = `${sortedHandles[0]}_${sortedHandles[1]}`;
                    const rivRef = window.db.collection('mp_rivalries').doc(rivalryId);
                    await window.db.runTransaction(async (t) => {
                        const rivDoc = await t.get(rivRef);
                        let rivData = { p1: sortedHandles[0], p2: sortedHandles[1], score_p1: 0, score_p2: 0, last_encounter: firebase.firestore.FieldValue.serverTimestamp() };
                        if (rivDoc.exists) rivData = rivDoc.data();
                        if (isWinner) {
                            if (myHandle === sortedHandles[0]) rivData.score_p1 += 1; else rivData.score_p2 += 1;
                        }
                        t.set(rivRef, rivData, { merge: true });
                    });
                }
            } catch (err) { console.error(err); }
        };
        saveVIPStats();

        const winnerName = isWinner ? myName : rivalName;
        const winnerAv = isWinner ? myAv : rivalAv;
        const winnerColor = isWinner ? '#a6ff00' : '#ff4a4a';
        const msg = isWinner ? '¡TE LLEVAS LA VICTORIA!' : 'HA DOMINADO LA PISTA';

        const duelContainer = document.querySelector('.duel-container');
        const cineLayer = document.createElement('div');
        cineLayer.className = 'cinematic-overlay';
        cineLayer.innerHTML = `
            <div class="winner-box">
                <h3 style="color: #fff; letter-spacing: 5px; margin-bottom: 20px; opacity: 0.7;">COMBATE FINALIZADO</h3>
                <img src="${winnerAv}" style="border-color: ${winnerColor}; box-shadow: 0 0 40px ${winnerColor}80;">
                <h2 class="winner-title" style="color: ${winnerColor}; text-shadow: 0 0 20px ${winnerColor}80;">${winnerName}</h2>
                <div class="winner-subtitle">${msg}</div>
                <div style="margin-top: 15px; font-family: monospace; font-size: 1.5rem; color: #ccc;">
                    ${isWinner ? finalCPM + ' CPM | ' + acc + '% PREC' : 'RIVAL INALCANZABLE'}
                </div>
                
                <div class="rematch-controls" style="margin-top: 30px; display: flex; gap: 15px; justify-content: center;">
                    <button id="btn-rematch" class="btn-primary" style="padding: 10px 30px; font-size: 1.1rem; background: #b388ff; color: #000;" onclick="window.Multiplayer.requestRematch()">REVANCHA</button>
                    <button class="btn-outline" style="border-color: #ff4a4a; color: #ff4a4a;" onclick="window.Multiplayer.quitDuel()">SALIR</button>
                </div>
                <div id="rematch-status" style="margin-top: 15px; color: #aaa; font-size: 0.95rem; min-height: 20px;"></div>
            </div>
        `;
        duelContainer.appendChild(cineLayer);
    },

    requestRematch: async () => {
        if(!window.Multiplayer.currentMatchId) return;
        const btn = document.getElementById('btn-rematch');
        if(btn) { btn.disabled = true; btn.innerText = "ESPERANDO..."; }
        try {
            await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
                [`${window.Multiplayer.myMatchKey}.rematch`]: true
            });
        } catch(e) { console.error(e); }
    },

    triggerRematchReset: async () => {
        try {
            const matchDoc = await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).get();
            const currentRound = matchDoc.exists ? (matchDoc.data().round || 1) : 1;
            
            const tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]'));
            const chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];

            await window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).update({
                track: chosenTrack,
                round: currentRound + 1, // EL SALVADOR DEL BUG
                'p1.prog': 0, 'p1.cpm': 0, 'p1.done': false, 'p1.rematch': false, 'p1.taunt': null,
                'p2.prog': 0, 'p2.cpm': 0, 'p2.done': false, 'p2.rematch': false, 'p2.taunt': null
            });
        } catch(e) { console.error("Error reseteando sala:", e); }
    },

    quitDuel: async () => {
        if (window.Multiplayer.matchUnsubscribe) { window.Multiplayer.matchUnsubscribe(); window.Multiplayer.matchUnsubscribe = null; }
        window.removeEventListener('keydown', window.Multiplayer.tauntKeyListener);
        
        const cines = document.querySelectorAll('.cinematic-overlay');
        cines.forEach(c => c.remove());
        
        if(window.Multiplayer.currentMatchId) {
            window.db.collection('mp_matches').doc(window.Multiplayer.currentMatchId).delete().catch(e=>{});
            window.Multiplayer.currentMatchId = null;
        }

        if (window.Multiplayer.myHandle && window.Multiplayer.isOnline) {
            try { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle', matchId: null }); } catch(e){}
        }

        const input = document.getElementById('duel-input');
        input.disabled = true; input.value = ''; input.classList.remove('error-shake');
        document.getElementById('duel-cd').style.display = 'none';
        window.UI.show('multiplayer-screen');
    }
};
