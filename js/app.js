/* ================================================================
    CANANTYPER - LÓGICA DE NEGOCIO Y CONTROLADORES (APP)
   ================================================================ */

window.App = {
    currentTrack: null, activeEngine: null,
    
    handleDragReorder: async (type, domOldIdx, domNewIdx, pageContext) => {
        if (type === 'favs') {
            const u = window.CT.ses(); if(!u) return;
            let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
            let favs = [...(userDoc.favs || [])];

            let actualOldIdx = (pageContext * 20) + domOldIdx;
            let actualNewIdx = (pageContext * 20) + domNewIdx;

            if(actualOldIdx < 0 || actualOldIdx >= favs.length || actualNewIdx < 0 || actualNewIdx >= favs.length) return;

            const [movedItem] = favs.splice(actualOldIdx, 1);
            favs.splice(actualNewIdx, 0, movedItem);

            userDoc.favs = favs;
            window.db.collection('users').doc(u.h).update({ favs: favs });
        }
    },

    handleWidgetDragReorder: (tab, oldIdx, newIdx) => {
        let layout = window.CT.data.statsLayout;
        if (!layout || !layout[tab]) return;
        
        let arr = layout[tab];
        if (oldIdx < 0 || oldIdx >= arr.length || newIdx < 0 || newIdx >= arr.length) return;

        const [movedItem] = arr.splice(oldIdx, 1);
        arr.splice(newIdx, 0, movedItem);

        arr.forEach((w, i) => w.order = i);
        window.App.saveStatsLayout();
    },

    toggleWidgetVisibility: (tab, widgetId) => {
        let layout = window.CT.data.statsLayout;
        if (!layout || !layout[tab]) return;
        
        let w = layout[tab].find(x => x.id === widgetId);
        if (w) {
            w.v = !w.v;
            window.App.saveStatsLayout();
        }
    },

    cycleWidgetSize: (tab, widgetId) => {
        let layout = window.CT.data.statsLayout;
        if (!layout || !layout[tab]) return;
        
        let w = layout[tab].find(x => x.id === widgetId);
        if (w) {
            // Ciclo: 3 -> 4 -> 6 -> 8 -> 12 -> 3
            if (w.s === 3) w.s = 4;
            else if (w.s === 4) w.s = 6;
            else if (w.s === 6) w.s = 8;
            else if (w.s === 8) w.s = 12;
            else w.s = 3;
            
            window.App.saveStatsLayout();
        }
    },

    saveStatsLayout: () => {
        window.db.collection('config').doc('stats_layout').set(window.CT.data.statsLayout)
            .then(() => window.UI.applyStatsLayout())
            .catch(err => console.error("Error guardando layout de widgets", err));
    },

    loadDashboardData: async () => {
        try {
            const topReq = await window.db.collection('scores').where('hc', '==', false).orderBy('c', 'desc').limit(50).get();
            window.CT.data.s_top = topReq.docs.map(d => d.data());
        } catch(e) {
            try {
                const topReqFb = await window.db.collection('scores').orderBy('c', 'desc').limit(50).get();
                window.CT.data.s_top = topReqFb.docs.map(d => d.data()).filter(x => !x.hc);
            } catch(err) { window.CT.data.s_top = []; }
        }
        
        try {
            const recReq = await window.db.collection('scores').orderBy('id', 'desc').limit(100).get();
            window.CT.data.s_recent = recReq.docs.map(d => d.data());
        } catch(e) { window.CT.data.s_recent = []; }
        
        window.UI.refreshActiveViews();
    },

    getUserScores: async (handle) => {
        if(!window.CT.data.userScores) window.CT.data.userScores = {};
        if(window.CT.data.userScores[handle]) return window.CT.data.userScores[handle];
        try {
            const req = await window.db.collection('scores').where('h', '==', handle).limit(100).get();
            let scores = req.docs.map(d => d.data());
            scores.sort((a,b) => b.id - a.id);
            window.CT.data.userScores[handle] = scores;
            return scores;
        } catch(e) { return []; }
    },
    
    startRandomRace: () => { 
        let tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(window.App.activeEngine) window.App.activeEngine.stop(); 
        window.App.activeEngine = new window.Engine(window.App.currentTrack, 'normal'); 
    },
    
    startHardcoreRace: () => { 
        let tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(window.App.activeEngine) window.App.activeEngine.stop(); 
        window.App.activeEngine = new window.Engine(window.App.currentTrack, 'hardcore'); 
    },
    
    startGhostRace: (trackTitle, cpm) => {
        let track = window.CT.dbLocal('p').find(t => t.title.toString() === trackTitle.toString());
        if(!track) return alert("Pista no encontrada o eliminada.");
        window.App.currentTrack = track;
        if(window.App.activeEngine) window.App.activeEngine.stop();
        window.App.activeEngine = new window.Engine(track, 'normal', cpm);
    },

    startPurge: () => {
        const u = window.CT.ses(); let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        const bw = userDoc.bad_words || {}; let words = Object.keys(bw);
        if(words.length < 5) return alert("No tienes suficientes errores registrados aún. ¡Juega más partidas normales!");
        let genText = []; for(let i=0; i<20; i++) { genText.push(words[Math.floor(Math.random()*words.length)]); }
        const track = { id: 'purge', title: 'Purgatorio', c: 'Entrenamiento', text: genText.join(' ') };
        window.App.currentTrack = track;
        if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(track, 'training');
        window.UI.toggleTrainMenu();
    },

    startTrnCategory: (catName) => {
        let extTracks = window.CT.dbLocal('p').filter(t => t.c === catName);
        if(extTracks.length === 0) return alert("No hay textos en esta modalidad.");
        window.App.currentTrack = extTracks[Math.floor(Math.random() * extTracks.length)];
        if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(window.App.currentTrack, 'training');
        window.UI.toggleTrainMenu();
    },

    startRaceWithTrack: (id) => { const track = window.CT.dbLocal('p').find(t => t.id.toString() === id.toString()); if(track) { window.App.currentTrack = track; if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(track, 'normal'); } },
    
    retryRace: () => { if(window.App.activeEngine) { const m = window.App.activeEngine.mode; const g = window.App.activeEngine.ghostCPM; window.App.activeEngine.stop(); if(window.App.currentTrack) window.App.activeEngine = new window.Engine(window.App.currentTrack, m, g); } },
    
    nextRace: () => { 
        if(window.App.activeEngine) { 
            const m = window.App.activeEngine.mode; 
            const track = window.App.activeEngine.track; 
            window.App.activeEngine.stop(); 
            if(m === 'hardcore') {
                window.App.startHardcoreRace(); 
            } else if (m === 'training') {
                if (track && track.id === 'purge') window.App.startPurge();
                else if (track && track.c && track.c.startsWith('[TRN]')) window.App.startTrnCategory(track.c);
                else window.App.startPurge(); 
            } else {
                window.App.startRandomRace(); 
            }
        } 
    },
    
    quitRace: () => { if(window.App.activeEngine) { window.App.activeEngine.stop(); window.App.activeEngine = null; } window.UI.showLobby(); },
    
    toggleFav: (idStr) => {
        const u = window.CT.ses(); if(!u) return;
        let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];
        if (favs.includes(idStr.toString())) { favs = favs.filter(f => f !== idStr.toString()); } 
        else { favs.push(idStr.toString()); }
        userDoc.favs = favs; 
        window.db.collection('users').doc(u.h).update({ favs: favs });
        window.UI.renderTrackList(); 
    },

    saveTheme: (themeName) => {
        let themeObj;
        if (themeName === 'galactic') { themeObj = { p: '#b388ff', bg: '#090a0f', surface: '#161824' }; }
        else if (themeName === 'hacker') { themeObj = { p: '#00ff00', bg: '#050505', surface: '#0a0a0a' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = window.CT.ses(); if(u) { window.db.collection('users').doc(u.h).update({ theme: themeObj }); }
        window.UI.applySavedTheme(); window.UI.closeThemeModal();
    },

    resetTheme: () => {
        localStorage.removeItem('ct_custom_theme');
        const u = window.CT.ses(); if(u) { window.db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        window.UI.applySavedTheme(); window.UI.closeThemeModal();
    },

    listenShortcutInput: (e, id) => { e.preventDefault(); document.getElementById(id).value = e.key; },

    handleUpdateClick: () => { const btn = document.getElementById('btn-update-status'); if (btn.innerText.includes("APLICAR")) { if(window.ipcRenderer) window.ipcRenderer.send('apply-update'); } },
    toggleFullscreen: () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => console.warn(err)); } else { if (document.exitFullscreen) document.exitFullscreen(); } window.UI.toggleSettings(); },
    
    downloadSetup: () => {
        const directUrl = 'https://github.com/CananTyper/CananTyper/releases/latest/download/CananTyper_Setup.exe';
        const link = document.createElement('a'); link.href = directUrl; link.download = 'CananTyper_Setup.exe';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); window.UI.toggleSettings();
    },

    clearCache: () => {
        if(confirm("¿Seguro que deseas limpiar la caché local? Se volverán a descargar los textos y usuarios de la nube.")) {
            localStorage.removeItem('ct_cache_u'); localStorage.removeItem('ct_cache_s');
            localStorage.removeItem('ct_cache_p'); localStorage.removeItem('ct_cache_c');
            localStorage.removeItem('ct_cache_ui');
            location.reload();
        }
    },

    editDisplayName: () => { const u = window.CT.ses(); if(!u) return; const newName = prompt("Nuevo nombre:", u.n); if(newName && newName.trim() !== '') { if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); window.db.collection('users').doc(u.h).update({ n: newName }); window.db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = window.db.batch(); q.forEach(doc => { batch.update(doc.ref, { n: newName }); }); batch.commit(); }); } },
    
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        
        if(!hInp || !p) return alert("Por favor, ingresa usuario y contraseña.");

        const btn = document.getElementById('t_btn_login');
        const originalText = btn.innerText;
        btn.innerText = "CONECTANDO...";
        btn.disabled = true;

        const cachedUser = window.CT.data.u.find(u => u.h === handle);
        if (cachedUser && cachedUser.p === p) {
            localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            window.UI.initLobby();
            btn.innerText = originalText;
            btn.disabled = false;
            return; 
        }

        const attemptLogin = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try { 
                    const docRef = await window.db.collection('users').doc(handle).get(); 
                    if(docRef.exists && docRef.data().p === p) { 
                        localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                        if(!window.CT.data.u.find(u => u.h === handle)) window.CT.data.u.push(docRef.data()); 
                        window.UI.initLobby(); 
                        return true;
                    } else { 
                        alert("Usuario o contraseña incorrectos"); 
                        return true; 
                    } 
                } catch(e) { 
                    if (i === retries - 1) throw e; 
                    await new Promise(r => setTimeout(r, 1000)); 
                }
            }
            return false;
        };

        try {
            const success = await attemptLogin();
            if(!success) throw new Error("Timeout");
        } catch(e) {
            console.error("Error en DB:", e); 
            btn.innerText = "REINTENTAR";
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
            return;
        }

        btn.innerText = originalText;
        btn.disabled = false;
    },

    register: async () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; if(!n || !hRaw || !p) return alert("Completa todos los campos"); if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); try { const docRef = await window.db.collection('users').doc(handle).get(); if(docRef.exists) return alert("Ese usuario ya está en uso"); const role = (handle === '@angel') ? 'admin' : 'usuario'; const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [] }; await window.db.collection('users').doc(handle).set(newUser); window.UI.toggleAuth(true); alert("Cuenta creada con éxito."); } catch(e) { alert("Error al conectar con la Nube"); } },
    
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * window.UI.cropScale); const sH = (imgH * 220) / (viewerImgH * window.UI.cropScale); const sX = (((viewerImgW * window.UI.cropScale) / 2) - window.UI.cropX - 110) * (imgW / (viewerImgW * window.UI.cropScale)); const sY = (((viewerImgH * window.UI.cropScale) / 2) - window.UI.cropY - 110) * (imgH / (viewerImgH * window.UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = window.CT.ses(); if(u) { window.db.collection('users').doc(u.h).update({ a: compressedBase64 }); window.db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = window.db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } window.UI.closeCropModal(); }
};

// Arranque de la aplicación
document.addEventListener('DOMContentLoaded', () => { window.CT.init(); });
