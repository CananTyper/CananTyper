/* ================================================================
    CANANTYPER - LÓGICA DE NEGOCIO Y CONTROLADORES (APP)
   ================================================================ */

const App = {
    currentTrack: null, activeEngine: null,
    
    // LÓGICA DE REORDENAMIENTO CON DRAG AND DROP (FRACCIONES DECIMALES Y ARRAYS)
    handleDragReorder: async (type, domOldIdx, domNewIdx, pageContext) => {
        if (type === 'favs') {
            const u = CT.ses(); if(!u) return;
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let favs = [...(userDoc.favs || [])];

            let actualOldIdx = (pageContext * 20) + domOldIdx;
            let actualNewIdx = (pageContext * 20) + domNewIdx;

            if(actualOldIdx < 0 || actualOldIdx >= favs.length || actualNewIdx < 0 || actualNewIdx >= favs.length) return;

            const [movedItem] = favs.splice(actualOldIdx, 1);
            favs.splice(actualNewIdx, 0, movedItem);

            userDoc.favs = favs;
            db.collection('users').doc(u.h).update({ favs: favs });
        }
    },

    loadDashboardData: async () => {
        try {
            const topReq = await db.collection('scores').where('hc', '==', false).orderBy('c', 'desc').limit(50).get();
            CT.data.s_top = topReq.docs.map(d => d.data());
        } catch(e) {
            try {
                const topReqFb = await db.collection('scores').orderBy('c', 'desc').limit(50).get();
                CT.data.s_top = topReqFb.docs.map(d => d.data()).filter(x => !x.hc);
            } catch(err) { CT.data.s_top = []; }
        }
        
        try {
            const recReq = await db.collection('scores').orderBy('id', 'desc').limit(100).get();
            CT.data.s_recent = recReq.docs.map(d => d.data());
        } catch(e) { CT.data.s_recent = []; }
        
        UI.refreshActiveViews();
    },

    getUserScores: async (handle) => {
        if(!CT.data.userScores) CT.data.userScores = {};
        if(CT.data.userScores[handle]) return CT.data.userScores[handle];
        try {
            const req = await db.collection('scores').where('h', '==', handle).limit(100).get();
            let scores = req.docs.map(d => d.data());
            scores.sort((a,b) => b.id - a.id);
            CT.data.userScores[handle] = scores;
            return scores;
        } catch(e) { return []; }
    },
    
    startRandomRace: () => { 
        let tracks = CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(App.activeEngine) App.activeEngine.stop(); 
        App.activeEngine = new Engine(App.currentTrack, 'normal'); 
    },
    
    startHardcoreRace: () => { 
        let tracks = CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(App.activeEngine) App.activeEngine.stop(); 
        App.activeEngine = new Engine(App.currentTrack, 'hardcore'); 
    },
    
    startGhostRace: (trackTitle, cpm) => {
        let track = CT.dbLocal('p').find(t => t.title.toString() === trackTitle.toString());
        if(!track) return alert("Pista no encontrada o eliminada.");
        App.currentTrack = track;
        if(App.activeEngine) App.activeEngine.stop();
        App.activeEngine = new Engine(track, 'normal', cpm);
    },

    startPurge: () => {
        const u = CT.ses(); let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        const bw = userDoc.bad_words || {}; let words = Object.keys(bw);
        if(words.length < 5) return alert("No tienes suficientes errores registrados aún. ¡Juega más partidas normales!");
        let genText = []; for(let i=0; i<20; i++) { genText.push(words[Math.floor(Math.random()*words.length)]); }
        const track = { id: 'purge', title: 'Purgatorio', c: 'Entrenamiento', text: genText.join(' ') };
        App.currentTrack = track;
        if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track, 'training');
        UI.toggleTrainMenu();
    },

    startTrnCategory: (catName) => {
        let extTracks = CT.dbLocal('p').filter(t => t.c === catName);
        if(extTracks.length === 0) return alert("No hay textos en esta modalidad.");
        App.currentTrack = extTracks[Math.floor(Math.random() * extTracks.length)];
        if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(App.currentTrack, 'training');
        UI.toggleTrainMenu();
    },

    startRaceWithTrack: (id) => { const track = CT.dbLocal('p').find(t => t.id.toString() === id.toString()); if(track) { App.currentTrack = track; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track, 'normal'); } },
    
    retryRace: () => { if(App.activeEngine) { const m = App.activeEngine.mode; const g = App.activeEngine.ghostCPM; App.activeEngine.stop(); if(App.currentTrack) App.activeEngine = new Engine(App.currentTrack, m, g); } },
    
    nextRace: () => { 
        if(App.activeEngine) { 
            const m = App.activeEngine.mode; 
            const track = App.activeEngine.track; 
            App.activeEngine.stop(); 
            if(m === 'hardcore') {
                App.startHardcoreRace(); 
            } else if (m === 'training') {
                if (track && track.id === 'purge') App.startPurge();
                else if (track && track.c && track.c.startsWith('[TRN]')) App.startTrnCategory(track.c);
                else App.startPurge(); 
            } else {
                App.startRandomRace(); 
            }
        } 
    },
    
    quitRace: () => { if(App.activeEngine) { App.activeEngine.stop(); App.activeEngine = null; } UI.showLobby(); },
    
    toggleFav: (idStr) => {
        const u = CT.ses(); if(!u) return;
        let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];
        if (favs.includes(idStr.toString())) { favs = favs.filter(f => f !== idStr.toString()); } 
        else { favs.push(idStr.toString()); }
        userDoc.favs = favs; 
        db.collection('users').doc(u.h).update({ favs: favs });
        UI.renderTrackList(); 
    },

    saveTheme: (themeName) => {
        let themeObj;
        if (themeName === 'galactic') { themeObj = { p: '#b388ff', bg: '#090a0f', surface: '#161824' }; }
        else if (themeName === 'hacker') { themeObj = { p: '#00ff00', bg: '#050505', surface: '#0a0a0a' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: themeObj }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },

    resetTheme: () => {
        localStorage.removeItem('ct_custom_theme');
        const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        UI.applySavedTheme(); UI.closeThemeModal();
    },

    listenShortcutInput: (e, id) => { e.preventDefault(); document.getElementById(id).value = e.key; },

    handleUpdateClick: () => { const btn = document.getElementById('btn-update-status'); if (btn.innerText.includes("APLICAR")) { if(ipcRenderer) ipcRenderer.send('apply-update'); } },
    toggleFullscreen: () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => console.warn(err)); } else { if (document.exitFullscreen) document.exitFullscreen(); } UI.toggleSettings(); },
    
    downloadSetup: () => {
        const directUrl = 'https://github.com/CananTyper/CananTyper/releases/latest/download/CananTyper_Setup.exe';
        const link = document.createElement('a'); link.href = directUrl; link.download = 'CananTyper_Setup.exe';
        document.body.appendChild(link); link.click(); document.body.removeChild(link); UI.toggleSettings();
    },

    clearCache: () => {
        if(confirm("¿Seguro que deseas limpiar la caché local? Se volverán a descargar los textos y usuarios de la nube.")) {
            localStorage.removeItem('ct_cache_u'); localStorage.removeItem('ct_cache_s');
            localStorage.removeItem('ct_cache_p'); localStorage.removeItem('ct_cache_c');
            localStorage.removeItem('ct_cache_ui');
            location.reload();
        }
    },

    editDisplayName: () => { const u = CT.ses(); if(!u) return; const newName = prompt("Nuevo nombre:", u.n); if(newName && newName.trim() !== '') { if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres."); db.collection('users').doc(u.h).update({ n: newName }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { n: newName }); }); batch.commit(); }); } },
    
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        
        if(!hInp || !p) return alert("Por favor, ingresa usuario y contraseña.");

        const btn = document.getElementById('t_btn_login');
        const originalText = btn.innerText;
        btn.innerText = "CONECTANDO...";
        btn.disabled = true;

        const cachedUser = CT.data.u.find(u => u.h === handle);
        if (cachedUser && cachedUser.p === p) {
            localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            UI.initLobby();
            btn.innerText = originalText;
            btn.disabled = false;
            return; 
        }

        const attemptLogin = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try { 
                    const docRef = await db.collection('users').doc(handle).get(); 
                    if(docRef.exists && docRef.data().p === p) { 
                        localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                        if(!CT.data.u.find(u => u.h === handle)) CT.data.u.push(docRef.data()); 
                        UI.initLobby(); 
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

    register: async () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; if(!n || !hRaw || !p) return alert("Completa todos los campos"); if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); try { const docRef = await db.collection('users').doc(handle).get(); if(docRef.exists) return alert("Ese usuario ya está en uso"); const role = (handle === '@angel') ? 'admin' : 'usuario'; const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [] }; await db.collection('users').doc(handle).set(newUser); UI.toggleAuth(true); alert("Cuenta creada con éxito."); } catch(e) { alert("Error al conectar con la Nube"); } },
    
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * UI.cropScale); const sH = (imgH * 220) / (viewerImgH * UI.cropScale); const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale)); const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ a: compressedBase64 }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } UI.closeCropModal(); }
};

// Arranque de la aplicación
document.addEventListener('DOMContentLoaded', () => { CT.init(); });
