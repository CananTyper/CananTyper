/* ================================================================
    CANANTYPER - MÓDULO MULTIJUGADOR (FASE BETA)
    Lobby, Matchmaking y Sincronización de Duelos 1v1
   ================================================================ */

window.Multiplayer = {
    isOnline: false,
    presenceUnsubscribe: null,
    invitesUnsubscribe: null,

    initLobby: () => {
        const u = window.CT.ses();
        if (!u) return window.UI.show('auth-screen');

        window.UI.show('multiplayer-screen');
        window.Multiplayer.isOnline = true;
        
        // Simulamos la carga visual por ahora
        window.Multiplayer.renderMockLobby(u);
    },

    exitLobby: () => {
        window.Multiplayer.isOnline = false;
        // Aquí luego cortaremos la conexión a Firebase
        window.UI.showLobby();
    },

    // --- FUNCIÓN TEMPORAL PARA TESTEAR EL DISEÑO ---
    renderMockLobby: (myUser) => {
        const onlineList = document.getElementById('mp-online-list');
        const countDisplay = document.getElementById('mp-online-count');
        
        // Simulamos algunos usuarios conectados
        const mockUsers = [
            { h: myUser.h, n: myUser.n, a: myUser.a, isMe: true },
            { h: '@fantasma', n: 'Fantasma', a: '' },
            { h: '@canantyper', n: 'CananTyper', a: 'https://ui-avatars.com/api/?name=CT&background=000&color=00e5ff', v: 2 } // Simula un verificado
        ];

        countDisplay.innerText = `${mockUsers.length} ONLINE`;

        onlineList.innerHTML = mockUsers.map(p => {
            const isMe = p.isMe ? '<span style="background: rgba(179,136,255,0.2); color: #b388ff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; border: 1px solid #b388ff;">TÚ</span>' : '';
            
            // Lógica de botones: Si sos vos, no te podés retar.
            const actionBtn = p.isMe 
                ? `<span style="color: #555; font-size: 0.8rem; font-style: italic;">Esperando...</span>`
                : `<button class="btn-outline" style="border-color: #b388ff; color: #b388ff; padding: 6px 12px; font-size: 0.8rem;" onclick="alert('Funcionalidad de reto en construcción')">RETAR ⚔️</button>`;

            return `
            <li class="st-list-item" style="padding: 12px 10px; border-color: rgba(255,255,255,0.05);">
                <div style="display:flex; align-items:center; gap:10px; flex-grow: 1;">
                    <div class="avatar-xs" style="border: 1px solid #b388ff;"><img src="${p.a || window.CT.defAvatar}"></div>
                    <div style="display:flex; flex-direction:column;">
                        <span style="color:#fff; font-weight:bold; font-size:0.95rem;">${p.n} ${isMe}</span>
                        <span style="color:#777; font-size:0.75rem; font-family:monospace;">${p.h}</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    ${actionBtn}
                </div>
            </li>`;
        }).join('');
    }
};
