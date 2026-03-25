/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (FASE BETA)
    Lobby, Matchmaking, Selección de Naves y UI de Duelos
   ================================================================ */

// INYECCIÓN DE ESTÉTICA VIP Y COLISÉO (Aislado del resto de CananTyper)
if (!document.getElementById('mp-custom-styles')) {
    const style = document.createElement('style');
    style.id = 'mp-custom-styles';
    style.innerHTML = `
        /* Scrollbar VIP */
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb { background: #b388ff; border-radius: 10px; border: 2px solid rgba(10,10,15,1); }
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb:hover { background: #9b59b6; }
        
        /* Selectores de Naves */
        .vehicle-btn { background: transparent; border: 1px solid rgba(179,136,255,0.3); border-radius: 8px; font-size: 1.8rem; padding: 10px 15px; cursor: pointer; transition: 0.3s; filter: grayscale(1); opacity: 0.6; }
        .vehicle-btn:hover { border-color: #b388ff; opacity: 1; filter: grayscale(0); }
        .vehicle-btn.active { border-color: #b388ff; background: rgba(179,136,255,0.1); filter: grayscale(0); opacity: 1; box-shadow: 0 0 15px rgba(179,136,255,0.4); transform: scale(1.1); }

        /* --- MOTOR VISUAL: EL COLISEO (DUEL SCREEN) --- */
        .duel-mode-bg { background: radial-gradient(circle at 50% 0%, #1a0b2e 0%, #050508 80%); }
        .duel-container { max-width: 1000px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
        
        .duel-hud { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(179,136,255,0.2); border-radius: 15px; padding: 15px 30px; backdrop-filter: blur(10px); }
        .duel-player-card { display: flex; align-items: center; gap: 15px; width: 40%; }
        .duel-player-card.right { flex-direction: row-reverse; text-align: right; }
        .duel-avatar { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #b388ff; box-shadow: 0 0 15px rgba(179,136,255,0.3); object-fit: cover; }
        .duel-name { color: #fff; font-size: 1.2rem; font-weight: bold; display: block; }
        .duel-cpm { color: #b388ff; font-family: monospace; font-size: 1.1rem; font-weight: bold; }
        .duel-vs { font-size: 2rem; font-weight: 900; color: transparent; -webkit-text-stroke: 1px #b388ff; text-shadow: 0 0 15px rgba(179,136,255,0.5); font-style: italic; }

        .duel-tracks-wrapper { background: rgba(0,0,0,0.6); border: 1px solid rgba(179,136,255,0.3); border-radius: 15px; padding: 20px; position: relative; overflow: hidden; box-shadow: inset 0 0 50px rgba(0,0,0,0.8); }
        .duel-track-line { position: relative; height: 50px; border-bottom: 2px dashed rgba(179,136,255,0.2); margin-bottom: 10px; display: flex; align-items: center; }
        .duel-track-line:last-child { border-bottom: none; margin-bottom: 0; }
        
        /* Acá ocurre la magia fluida (interpolación de 1.5s) */
        .duel-vehicle-icon { position: absolute; font-size: 2.5rem; top: 50%; transform: translateY(-50%); left: 0%; transition: left 1.5s linear; z-index: 5; filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); }
        .duel-progress-glow { position: absolute; height: 4px; background: #b388ff; top: 50%; transform: translateY(-50%); left: 0; width: 0%; transition: width 1.5s linear; box-shadow: 0 0 15px #b388ff; z-index: 1; border-radius: 2px; }

        .duel-text-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(179,136,255,0.2); border-radius: 12px; padding: 30px; color: #ccc; font-size: 1.4rem; line-height: 1.6; font-family: 'Segoe UI', Tahoma, sans-serif; min-height: 150px; text-align: justify; backdrop-filter: blur(10px); box-shadow: inset 0 0 20px rgba(179,136,255,0.02); }
        .duel-input-box { width: 100%; background: rgba(0,0,0,0.5); border: 2px solid #b388ff; border-radius: 12px; padding: 20px; color: #fff; font-size: 1.5rem; text-align: center; outline: none; transition: 0.3s; box-shadow: 0 0 20px rgba(179,136,255,0.1); }
        .duel-input-box:focus { box-shadow: 0 0 30px rgba(179,136,255,0.4); background: rgba(179,136,255,0.05); }
        
        .duel-countdown { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8rem; font-weight: 900; color: #fff; text-shadow: 0 0 40px #b388ff; z-index: 100; pointer-events: none; }
    `;
    document.head.appendChild(style);
}

window.Multiplayer = {
    isOnline: false,
    lobbyUnsubscribe: null,
    myHandle: null,
    myVehicle: localStorage.getItem('ct_mp_vehicle') || '🏎️',
    availableVehicles: ['🏎️', '🚀', '🛸', '🚤', '🦖', '🐉', '🏍️', '🚁'],
    
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
            <button class="vehicle-btn ${v === window.Multiplayer.myVehicle ? 'active' : ''}" 
                    onclick="window.Multiplayer.selectVehicle('${v}')" 
                    title="Elegir ${v}">
                ${v}
            </button>
        `).join('');
    },

    selectVehicle: async (v) => {
        window.Multiplayer.myVehicle = v;
        localStorage.setItem('ct_mp_vehicle', v);
        window.Multiplayer.renderVehicleSelector();

        if (window.Multiplayer.isOnline && window.Multiplayer.myHandle) {
            try {
                await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ vh: v });
            } catch (e) { console.error("Error al guardar nave:", e); }
        }
    },

    exitLobby: async () => {
        if (!window.Multiplayer.isOnline) {
            window.UI.showLobby();
            return;
        }

        document.getElementById('mp-online-list').innerHTML = '<li style="text-align: center; color: #777; padding: 20px;">Desconectando...</li>';
        await window.Multiplayer.goOffline();
        window.UI.showLobby();
    },

    // --- CONEXIÓN DE DATOS ---
    goOnline: async (user) => {
        try {
            const userDoc = window.CT.dbLocal('u').find(x => x.h === user.h) || user;
            
            const presenceData = {
                h: userDoc.h,
                n: userDoc.n,
                a: userDoc.a || '',
                v: userDoc.v || 0,
                vh: window.Multiplayer.myVehicle, // Inyectamos la nave elegida
                status: 'idle',
                invite: null,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.db.collection('mp_lobby').doc(userDoc.h).set(presenceData);
            window.Multiplayer.isOnline = true;
            window.addEventListener('beforeunload', window.Multiplayer.handleUnload);
            window.Multiplayer.startRadar();

        } catch (e) {
            console.error("Error conectando al Lobby:", e);
            alert("Los servidores de duelo están inalcanzables en este momento.");
            window.UI.showLobby();
        }
    },

    goOffline: async () => {
        window.Multiplayer.isOnline = false;
        if (window.Multiplayer.lobbyUnsubscribe) {
            window.Multiplayer.lobbyUnsubscribe();
            window.Multiplayer.lobbyUnsubscribe = null;
        }
        window.removeEventListener('beforeunload', window.Multiplayer.handleUnload);
        
        try {
            if (window.Multiplayer.myHandle) {
                await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete();
            }
        } catch (e) { console.error("Error al borrar presencia:", e); }
    },

    handleUnload: (e) => {
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

        if (!me && window.Multiplayer.isOnline) {
            window.Multiplayer.goOffline();
            window.UI.showLobby();
            return;
        }

        document.getElementById('mp-online-count').innerText = `${players.length} ONLINE`;
        
        const onlineList = document.getElementById('mp-online-list');
        if (others.length === 0) {
            onlineList.innerHTML = `<li style="text-align: center; color: #777; padding: 20px;">La sala está vacía.<br>Eres el único duelista aquí.</li>`;
        } else {
            onlineList.innerHTML = others.map(p => {
                let actionBtn = '';
                
                if (p.status === 'in_game') {
                    actionBtn = `<span style="color: var(--error); font-size: 0.75rem; font-weight:bold;">EN COMBATE</span>`;
                } else if (p.status === 'waiting') {
                    actionBtn = `<span style="color: #ffd700; font-size: 0.75rem; font-style:italic;">Ocupado...</span>`;
                } else if (me.status === 'waiting') {
                    actionBtn = `<span style="color: #555; font-size: 0.75rem;">Espera...</span>`;
                } else {
                    actionBtn = `<button class="btn-outline" style="border-color: #b388ff; color: #b388ff; padding: 6px 12px; font-size: 0.75rem;" onclick="window.Multiplayer.sendChallenge('${p.h}', '${p.n}')">RETAR ⚔️</button>`;
                }

                let vIcon = '';
                if (p.v === 1) vIcon = `<svg style="width:16px; height:16px; margin-left:4px; vertical-align:text-bottom; filter:drop-shadow(0 0 2px var(--p));" viewBox="0 0 24 24"><path d="M11.99 2.5l-2.6 1.83-3.13-.53-.88 3.05-2.73 1.63L3.89 12l-1.24 3.52 2.73 1.63.88 3.05 3.13-.53 2.6 1.83 2.6-1.83 3.13.53.88-3.05 2.73-1.63L20.11 12l1.24-3.52-2.73-1.63-.88-3.05-3.13.53-2.6-1.83z" fill="var(--p)"/><path d="M10.5 15.5l-4-4 1.5-1.5 2.5 2.5 6-6 1.5 1.5-7.5 7.5z" fill="#000"/></svg>`;
                else if (p.v === 2) vIcon = `<svg style="width:15px; height:15px; margin-left:4px; vertical-align:text-bottom; filter:drop-shadow(0 0 2px #e2e8f0);" viewBox="0 0 24 24"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#e2e8f0"/><path d="M12 4.5l-6 3.4v8.2l6 3.4 6-3.4v-8.2l-6-3.4z" fill="#0a0a0c"/><path d="M12 15.5l-3.5-2V9.5L12 7.5l3.5 2v4l-3.5 2z" fill="#e2e8f0"/></svg>`;

                return `
                <li class="st-list-item" style="padding: 10px; border-color: rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:10px; flex-grow: 1; cursor:pointer;" onclick="window.UI.showProfile('${p.h}')">
                        <div class="avatar-xs" style="border: 1px solid #b388ff; position:relative;">
                            <img src="${p.a || window.CT.defAvatar}">
                            <div style="position:absolute; bottom:-5px; right:-5px; font-size:0.8rem; filter:drop-shadow(0 0 2px #000);">${p.vh || '🏎️'}</div>
                        </div>
                        <div style="display:flex; flex-direction:column;">
                            <span style="color:#fff; font-weight:bold; font-size:0.9rem;">${p.n} ${vIcon}</span>
                            <span style="color:#777; font-size:0.7rem; font-family:monospace;">${p.h}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        ${actionBtn}
                    </div>
                </li>`;
            }).join('');
        }

        const invitesList = document.getElementById('mp-invites-list');

        if (me.status === 'waiting') {
            invitesList.innerHTML = `
                <div style="text-align: center; padding: 30px 10px;">
                    <div class="pulse" style="width: 20px; height: 20px; background: #ffd700; margin: 0 auto 15px; display: block;"></div>
                    <h4 style="color: #ffd700; margin: 0 0 5px 0;">Reto Enviado</h4>
                    <p style="color: #aaa; font-size: 0.85rem;">Esperando a que el rival acepte el desafío...</p>
                    <button class="btn-outline" style="border-color: #ff4a4a; color: #ff4a4a; margin-top: 15px;" onclick="window.Multiplayer.cancelChallenge()">CANCELAR</button>
                </div>`;
        } else if (me.invite) {
            invitesList.innerHTML = `
                <div style="background: rgba(179,136,255,0.1); border: 1px solid #b388ff; border-radius: 8px; padding: 20px; text-align: center; animation: pulseGlow 2s infinite;">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">🔥</div>
                    <h4 style="color: #fff; margin: 0 0 5px 0; font-size: 1.2rem;">¡TE HAN DESAFIADO!</h4>
                    <p style="color: #b388ff; font-size: 0.95rem; font-weight: bold; margin-bottom: 20px;">${me.invite.n} <span style="color:#777; font-size:0.8rem; font-family:monospace;">(${me.invite.h})</span></p>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-primary" style="flex: 1; background: #b388ff; color: #000;" onclick="window.Multiplayer.acceptChallenge('${me.invite.h}', '${me.invite.n}')">ACEPTAR</button>
                        <button class="btn-outline" style="flex: 1; border-color: #ff4a4a; color: #ff4a4a;" onclick="window.Multiplayer.rejectChallenge()">RECHAZAR</button>
                    </div>
                </div>
                <style>
                    @keyframes pulseGlow { 0% { box-shadow: 0 0 5px rgba(179,136,255,0.2); } 50% { box-shadow: 0 0 20px rgba(179,136,255,0.6); } 100% { box-shadow: 0 0 5px rgba(179,136,255,0.2); } }
                </style>`;
        } else {
            invitesList.innerHTML = `
                <div style="text-align: center; color: #777; padding: 30px 10px; font-size: 0.85rem;">
                    <div style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;">🛡️</div>
                    Ningún desafío pendiente.<br>Estás a salvo por ahora.
                </div>`;
        }
    },

    sendChallenge: async (targetHandle, targetName) => {
        try {
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'waiting' });
            const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);
            
            await window.db.collection('mp_lobby').doc(targetHandle).update({
                invite: { h: myUser.h, n: myUser.n, t: Date.now() }
            });

            setTimeout(() => { window.Multiplayer.autoExpireChallenge(targetHandle); }, 15000);
        } catch(e) { console.error("Error enviando reto:", e); window.Multiplayer.cancelChallenge(); }
    },

    cancelChallenge: async () => {
        try { await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' }); } catch(e) { console.error(e); }
    },

    autoExpireChallenge: async (targetHandle) => {
        try {
            const meDoc = await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).get();
            if (meDoc.exists && meDoc.data().status === 'waiting') {
                await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' });
                await window.db.collection('mp_lobby').doc(targetHandle).update({ invite: null });
            }
        } catch(e) { console.error(e); }
    },

    rejectChallenge: async () => {
        try {
            const meDoc = await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).get();
            if (!meDoc.exists || !meDoc.data().invite) return;
            const rivalHandle = meDoc.data().invite.h;
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });
            await window.db.collection('mp_lobby').doc(rivalHandle).update({ status: 'idle' });
        } catch(e) { console.error(e); }
    },

    // --- FASE 3: INICIO DE LA TRANSICIÓN VISUAL AL DUELO ---
    acceptChallenge: async (rivalHandle, rivalName) => {
        try {
            // Simulamos la creación de la sala visualmente para que veas el nuevo diseño
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });
            
            window.UI.show('duel-screen');
            
            // Renderizamos los nombres simulados en la nueva HUD (Más adelante lo ataremos a Firebase)
            document.getElementById('duel-my-name').innerText = "TÚ";
            document.getElementById('duel-rival-name').innerText = rivalName.toUpperCase();
            
            document.getElementById('duel-my-vehicle').innerText = window.Multiplayer.myVehicle;
            document.getElementById('duel-rival-vehicle').innerText = "🚀"; // Provisional
            
            // Simulación de cuenta regresiva en pantalla
            const cd = document.getElementById('duel-cd');
            cd.style.display = 'block';
            cd.innerText = "3";
            setTimeout(() => cd.innerText = "2", 1000);
            setTimeout(() => cd.innerText = "1", 2000);
            setTimeout(() => { 
                cd.innerText = "¡YA!"; 
                document.getElementById('duel-input').disabled = false;
                document.getElementById('duel-input').focus();
                document.getElementById('duel-target-text').innerHTML = "La arquitectura <b>pro</b> está casi lista. En el próximo paso enlazaremos esta interfaz con el motor de juego.";
                setTimeout(() => cd.style.display = 'none', 1000);
            }, 3000);

        } catch(e) { console.error(e); }
    },
    
    quitDuel: () => {
        // Por ahora vuelve al lobby
        window.UI.show('multiplayer-screen');
        document.getElementById('duel-input').disabled = true;
        document.getElementById('duel-input').value = '';
    }
};
