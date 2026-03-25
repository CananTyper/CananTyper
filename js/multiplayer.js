/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (FASE BETA)
    Lobby, Matchmaking y Sincronización de Duelos 1v1
   ================================================================ */

// INYECCIÓN DE ESTÉTICA VIP (Barra de desplazamiento Violeta)
if (!document.getElementById('mp-scroll-styles')) {
    const style = document.createElement('style');
    style.id = 'mp-scroll-styles';
    style.innerHTML = `
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb {
            background: #b388ff;
            border-radius: 10px;
            border: 2px solid rgba(10,10,15,1);
        }
        #multiplayer-screen .custom-scroll::-webkit-scrollbar-thumb:hover {
            background: #9b59b6;
        }
    `;
    document.head.appendChild(style);
}

window.Multiplayer = {
    isOnline: false,
    lobbyUnsubscribe: null,
    myHandle: null,
    
    initLobby: async () => {
        const u = window.CT.ses();
        if (!u) return window.UI.show('auth-screen');

        window.Multiplayer.myHandle = u.h;
        window.UI.show('multiplayer-screen');
        
        document.getElementById('mp-online-list').innerHTML = '<li style="text-align: center; color: #b388ff; padding: 20px;">Estableciendo enlace seguro...</li>';
        
        await window.Multiplayer.goOnline(u);
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
            // 1. Registramos presencia en la colección mp_lobby
            const userDoc = window.CT.dbLocal('u').find(x => x.h === user.h) || user;
            
            const presenceData = {
                h: userDoc.h,
                n: userDoc.n,
                a: userDoc.a || '',
                v: userDoc.v || 0,
                status: 'idle', // idle, waiting, in_game
                invite: null,   // Datos de quien te reta
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.db.collection('mp_lobby').doc(userDoc.h).set(presenceData);
            window.Multiplayer.isOnline = true;

            // 2. Evento "Anti-Fantasmas" (Si el jugador cierra la pestaña de golpe)
            window.addEventListener('beforeunload', window.Multiplayer.handleUnload);

            // 3. Encender el Radar (Escuchar la sala)
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
        // Borrado síncrono de emergencia si el navegador lo permite
        if (window.Multiplayer.myHandle && window.Multiplayer.isOnline) {
            window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).delete();
        }
    },

    // --- EL RADAR (ESCUCHA EN TIEMPO REAL) ---
    startRadar: () => {
        window.Multiplayer.lobbyUnsubscribe = window.db.collection('mp_lobby').onSnapshot(snap => {
            const players = snap.docs.map(doc => doc.data());
            window.Multiplayer.renderLobbyState(players);
        });
    },

    renderLobbyState: (players) => {
        const me = players.find(p => p.h === window.Multiplayer.myHandle);
        const others = players.filter(p => p.h !== window.Multiplayer.myHandle);

        // Si por algún error fuimos borrados, forzamos salida
        if (!me && window.Multiplayer.isOnline) {
            window.Multiplayer.goOffline();
            window.UI.showLobby();
            return;
        }

        // 1. RENDERIZAR PANEL IZQUIERDO (ONLINE)
        document.getElementById('mp-online-count').innerText = `${players.length} ONLINE`;
        
        const onlineList = document.getElementById('mp-online-list');
        if (others.length === 0) {
            onlineList.innerHTML = `<li style="text-align: center; color: #777; padding: 20px;">La sala está vacía.<br>Eres el único duelista aquí.</li>`;
        } else {
            onlineList.innerHTML = others.map(p => {
                let actionBtn = '';
                
                // Lógica Visual del Botón de Reto
                if (p.status === 'in_game') {
                    actionBtn = `<span style="color: var(--error); font-size: 0.75rem; font-weight:bold;">EN COMBATE</span>`;
                } else if (p.status === 'waiting') {
                    actionBtn = `<span style="color: #ffd700; font-size: 0.75rem; font-style:italic;">Ocupado...</span>`;
                } else if (me.status === 'waiting') {
                    actionBtn = `<span style="color: #555; font-size: 0.75rem;">Espera...</span>`;
                } else {
                    actionBtn = `<button class="btn-outline" style="border-color: #b388ff; color: #b388ff; padding: 6px 12px; font-size: 0.75rem;" onclick="window.Multiplayer.sendChallenge('${p.h}', '${p.n}')">RETAR ⚔️</button>`;
                }

                // Insignias
                let vIcon = '';
                if (p.v === 1) vIcon = `<svg style="width:16px; height:16px; margin-left:4px; vertical-align:text-bottom; filter:drop-shadow(0 0 2px var(--p));" viewBox="0 0 24 24"><path d="M11.99 2.5l-2.6 1.83-3.13-.53-.88 3.05-2.73 1.63L3.89 12l-1.24 3.52 2.73 1.63.88 3.05 3.13-.53 2.6 1.83 2.6-1.83 3.13.53.88-3.05 2.73-1.63L20.11 12l1.24-3.52-2.73-1.63-.88-3.05-3.13.53-2.6-1.83z" fill="var(--p)"/><path d="M10.5 15.5l-4-4 1.5-1.5 2.5 2.5 6-6 1.5 1.5-7.5 7.5z" fill="#000"/></svg>`;
                else if (p.v === 2) vIcon = `<svg style="width:15px; height:15px; margin-left:4px; vertical-align:text-bottom; filter:drop-shadow(0 0 2px #e2e8f0);" viewBox="0 0 24 24"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="#e2e8f0"/><path d="M12 4.5l-6 3.4v8.2l6 3.4 6-3.4v-8.2l-6-3.4z" fill="#0a0a0c"/><path d="M12 15.5l-3.5-2V9.5L12 7.5l3.5 2v4l-3.5 2z" fill="#e2e8f0"/></svg>`;

                return `
                <li class="st-list-item" style="padding: 10px; border-color: rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:10px; flex-grow: 1; cursor:pointer;" onclick="window.UI.showProfile('${p.h}')" title="Ver Perfil">
                        <div class="avatar-xs" style="border: 1px solid #b388ff;"><img src="${p.a || window.CT.defAvatar}"></div>
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

        // 2. RENDERIZAR PANEL DERECHO (ESTADO PERSONAL / RETOS)
        const invitesList = document.getElementById('mp-invites-list');

        if (me.status === 'waiting') {
            // Yo envié un reto, estoy esperando
            invitesList.innerHTML = `
                <div style="text-align: center; padding: 30px 10px;">
                    <div class="pulse" style="width: 20px; height: 20px; background: #ffd700; margin: 0 auto 15px; display: block;"></div>
                    <h4 style="color: #ffd700; margin: 0 0 5px 0;">Reto Enviado</h4>
                    <p style="color: #aaa; font-size: 0.85rem;">Esperando a que el rival acepte el desafío...</p>
                    <button class="btn-outline" style="border-color: #ff4a4a; color: #ff4a4a; margin-top: 15px;" onclick="window.Multiplayer.cancelChallenge()">CANCELAR</button>
                </div>`;
        } else if (me.invite) {
            // Alguien me retó
            invitesList.innerHTML = `
                <div style="background: rgba(179,136,255,0.1); border: 1px solid #b388ff; border-radius: 8px; padding: 20px; text-align: center; animation: pulseGlow 2s infinite;">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">🔥</div>
                    <h4 style="color: #fff; margin: 0 0 5px 0; font-size: 1.2rem;">¡TE HAN DESAFIADO!</h4>
                    <p style="color: #b388ff; font-size: 0.95rem; font-weight: bold; margin-bottom: 20px;">${me.invite.n} <span style="color:#777; font-size:0.8rem; font-family:monospace;">(${me.invite.h})</span></p>
                    
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-primary" style="flex: 1; background: #b388ff; color: #000;" onclick="window.Multiplayer.acceptChallenge('${me.invite.h}')">ACEPTAR</button>
                        <button class="btn-outline" style="flex: 1; border-color: #ff4a4a; color: #ff4a4a;" onclick="window.Multiplayer.rejectChallenge()">RECHAZAR</button>
                    </div>
                </div>
                <style>
                    @keyframes pulseGlow {
                        0% { box-shadow: 0 0 5px rgba(179,136,255,0.2); }
                        50% { box-shadow: 0 0 20px rgba(179,136,255,0.6); }
                        100% { box-shadow: 0 0 5px rgba(179,136,255,0.2); }
                    }
                </style>`;
        } else {
            // Estado natural
            invitesList.innerHTML = `
                <div style="text-align: center; color: #777; padding: 30px 10px; font-size: 0.85rem;">
                    <div style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;">🛡️</div>
                    Ningún desafío pendiente.<br>Estás a salvo por ahora.
                </div>`;
        }
    },

    // --- ACCIONES DE COMBATE ---
    sendChallenge: async (targetHandle, targetName) => {
        try {
            // Me pongo en espera
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'waiting' });
            
            const myUser = window.CT.dbLocal('u').find(x => x.h === window.Multiplayer.myHandle);
            
            // Le inyecto la invitación al rival
            await window.db.collection('mp_lobby').doc(targetHandle).update({
                invite: { h: myUser.h, n: myUser.n, t: Date.now() }
            });

            // Autocancelar a los 15 segundos si no responde
            setTimeout(() => {
                window.Multiplayer.autoExpireChallenge(targetHandle);
            }, 15000);

        } catch(e) {
            console.error("Error enviando reto:", e);
            window.Multiplayer.cancelChallenge();
        }
    },

    cancelChallenge: async () => {
        try {
            // Vuelvo a idle
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ status: 'idle' });
            // Deberíamos limpiar el invite del rival, pero requeriría saber a quién se lo mandamos. 
            // Para la Beta, el autoExpire lo limpiará.
        } catch(e) { console.error(e); }
    },

    autoExpireChallenge: async (targetHandle) => {
        try {
            // Verificamos mi estado actual. Si sigo en waiting, asumo que caducó
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

            // Limpio mi buzón
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });
            
            // Libero al rival
            await window.db.collection('mp_lobby').doc(rivalHandle).update({ status: 'idle' });
        } catch(e) { console.error(e); }
    },

    acceptChallenge: async (rivalHandle) => {
        try {
            alert(`Aceptaste el reto de ${rivalHandle}.\n\n[Fase 3: Generación de la Sala de Carrera en desarrollo]`);
            
            // Lógica futura: 
            // 1. Crear un documento en colección 'mp_matches' con un ID único.
            // 2. Elegir un texto aleatorio para el combate.
            // 3. Actualizar el estado de ambos a 'in_game' y meterles el ID del match.
            // 4. Redirigir a la interfaz de combate dual.
            
            // Temporal: Limpiar la invitación para no trabarse
            await window.db.collection('mp_lobby').doc(window.Multiplayer.myHandle).update({ invite: null });

        } catch(e) { console.error(e); }
    }
};
