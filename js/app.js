/* ================================================================
    CANANTYPER - LÓGICA DE NEGOCIO Y CONTROLADORES (APP)
   ================================================================ */

window.App = {
    currentTrack: null, activeEngine: null, currentRaceContext: null,
    
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
            userDoc.favs = favs; window.db.collection('users').doc(u.h).update({ favs: favs });
        }
    },

    saveWidgetOrderFromDOM: (tab, gridElementId) => {
        const grid = document.getElementById(gridElementId); if(!grid) return;
        const visibleDomIds = Array.from(grid.children).filter(el => !el.classList.contains('hidden')).map(el => el.getAttribute('data-id'));
        let layout = window.CT.data.statsLayout[tab];
        layout.forEach(w => { const domIdx = visibleDomIds.indexOf(w.id); w.order = domIdx !== -1 ? domIdx : 999; });
        window.db.collection('config').doc('stats_layout').set(window.CT.data.statsLayout);
    },

    cycleWidgetSize: (tab, widgetId) => {
        let layout = window.CT.data.statsLayout; if (!layout || !layout[tab]) return;
        let w = layout[tab].find(x => x.id === widgetId);
        if (w) {
            if (w.s === 3) w.s = 4; else if (w.s === 4) w.s = 6; else if (w.s === 6) w.s = 8; else if (w.s === 8) w.s = 12; else w.s = 3;
            window.db.collection('config').doc('stats_layout').set(layout);
        }
    },

    loadDashboardData: async () => {
        try {
            const topReqFb = await window.db.collection('scores').orderBy('c', 'desc').limit(50).get();
            window.CT.data.s_top = topReqFb.docs.map(d => d.data());
        } catch(err) { window.CT.data.s_top = []; }
        
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
            const req = await window.db.collection('scores').where('h', '==', handle).limit(150).get();
            let scores = req.docs.map(d => d.data());
            scores.sort((a,b) => b.id - a.id);
            window.CT.data.userScores[handle] = scores;
            return scores;
        } catch(e) { return []; }
    },
    
    startRandomRace: () => { 
        window.App.currentRaceContext = { type: 'random' };
        let tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(window.App.activeEngine) window.App.activeEngine.stop(); 
        window.App.activeEngine = new window.Engine(window.App.currentTrack, 'normal'); 
    },
    
    startHardcoreRace: () => { 
        window.App.currentRaceContext = { type: 'hardcore' };
        let tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(window.App.activeEngine) window.App.activeEngine.stop(); 
        window.App.activeEngine = new window.Engine(window.App.currentTrack, 'hardcore'); 
    },
    
    startGhostRace: (trackTitle, cpm) => {
        window.App.currentRaceContext = { type: 'ghost' };
        let track = window.CT.dbLocal('p').find(t => t.title.toString() === trackTitle.toString());
        if(!track) return alert("Pista no encontrada o eliminada.");
        window.App.currentTrack = track;
        if(window.App.activeEngine) window.App.activeEngine.stop();
        window.App.activeEngine = new window.Engine(track, 'normal', cpm);
    },

    startPurge: () => {
        window.App.currentRaceContext = { type: 'training' };
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
        window.App.currentRaceContext = { type: 'training' };
        let extTracks = window.CT.dbLocal('p').filter(t => t.c === catName);
        if(extTracks.length === 0) return alert("No hay textos en esta modalidad.");
        window.App.currentTrack = extTracks[Math.floor(Math.random() * extTracks.length)];
        if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(window.App.currentTrack, 'training');
        window.UI.toggleTrainMenu();
    },

    startRaceWithTrack: (id) => { 
        if (window.UI.filterFavs) window.App.currentRaceContext = { type: 'favs' };
        else if (window.UI.activeTrackCat) window.App.currentRaceContext = { type: 'cat', val: window.UI.activeTrackCat };
        else window.App.currentRaceContext = { type: 'custom' };

        const track = window.CT.dbLocal('p').find(t => t.id.toString() === id.toString()); 
        if(track) { window.App.currentTrack = track; if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(track, 'normal'); } 
    },

    // =====================================================================
    // NUEVAS FUNCIONES DE LA ARENA (TORNEOS)
    // =====================================================================
    startArenaRace: () => {
        window.App.currentRaceContext = { type: 'arena' };
        
        // Simulación: Buscamos un texto adecuado en la base de datos (Ej: el primero de "General")
        // En el futuro, esto leerá la ID del texto oficial desde Firebase `events`
        let tracks = window.CT.dbLocal('p').filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles para la Arena."); 
        
        // Elegimos uno consistente para el torneo
        window.App.currentTrack = tracks[0]; 
        
        if(window.App.activeEngine) window.App.activeEngine.stop(); 
        
        // Instanciamos el motor en modo 'arena', lo que activa la UI estricta
        window.App.activeEngine = new window.Engine(window.App.currentTrack, 'arena'); 
    },

    quitArenaRace: () => {
        if(confirm("¿Seguro que deseas rendirte? Obtendrás 0 puntos en el Torneo.")) {
            if(window.App.activeEngine) { window.App.activeEngine.stop(); window.App.activeEngine = null; } 
            window.App.currentRaceContext = null;
            // A futuro aquí enviaremos un "0" a Firebase para penalizar el ragequit
            window.UI.show('arena-screen'); // Volvemos a la sala de espera del torneo
        }
    },
    // =====================================================================
    
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
                if (window.App.currentRaceContext) {
                    if (window.App.currentRaceContext.type === 'favs') {
                        const u = window.CT.ses();
                        let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
                        let favs = userDoc.favs || [];
                        let tracks = window.CT.dbLocal('p').filter(t => favs.includes(t.id.toString()));
                        if(tracks.length > 0) {
                            window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)];
                            window.App.activeEngine = new window.Engine(window.App.currentTrack, 'normal');
                            return;
                        }
                    } else if (window.App.currentRaceContext.type === 'cat') {
                        let tracks = window.CT.dbLocal('p').filter(t => (t.c || 'General').trim() === window.App.currentRaceContext.val.trim());
                        if(tracks.length > 0) {
                            window.App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)];
                            window.App.activeEngine = new window.Engine(window.App.currentTrack, 'normal');
                            return;
                        }
                    }
                }
                window.App.startRandomRace(); 
            }
        } 
    },
    
    quitRace: () => { 
        if(window.App.activeEngine) { window.App.activeEngine.stop(); window.App.activeEngine = null; } 
        window.App.currentRaceContext = null;
        window.UI.showLobby(); 
    },
    
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
        else if (themeName === 'wpm') { themeObj = { p: '#ff3c00', bg: '#000000', surface: '#141414' }; }
        else { themeObj = { p: '#a6ff00', bg: '#000000', surface: '#141414' }; } 
        
        localStorage.setItem('ct_custom_theme', JSON.stringify(themeObj));
        const u = window.CT.ses(); if(u) { window.db.collection('users').doc(u.h).update({ theme: themeObj }); }
        window.UI.applySavedTheme(); window.UI.closeThemeModal();
    },

    clearCache: () => {
        if(confirm("¿Seguro que deseas limpiar la caché local? Se volverán a descargar los textos y usuarios de la nube.")) {
            localStorage.removeItem('ct_cache_u'); localStorage.removeItem('ct_cache_s');
            localStorage.removeItem('ct_cache_p'); localStorage.removeItem('ct_cache_c');
            localStorage.removeItem('ct_cache_ui');
            location.reload();
        }
    },
    
    saveProfileEdits: async () => {
        const u = window.CT.ses(); if(!u) return;
        const newName = document.getElementById('ep-name').value.trim();
        const newBio = document.getElementById('ep-bio').value.trim();
        const newCountry = document.getElementById('ep-country').value.trim();
        const newLayout = document.getElementById('ep-layout').value;
        const newSwitches = document.getElementById('ep-switches').value.trim();
        const newDiscord = document.getElementById('ep-discord').value.trim();

        if(!newName) return alert("El nombre no puede estar vacío.");
        if(newName.length > 15) return alert("El nombre no puede exceder los 15 caracteres.");

        const btn = document.querySelector('#edit-profile-modal .btn-primary');
        const oldText = btn.innerText; btn.innerText = "GUARDANDO..."; btn.disabled = true;

        try {
            await window.db.collection('users').doc(u.h).update({ 
                n: newName, bio: newBio, country: newCountry, layout: newLayout, switches: newSwitches, discord: newDiscord 
            });
            
            if (u.n !== newName) {
                const q = await window.db.collection('scores').where('h', '==', u.h).get();
                const batch = window.db.batch();
                q.forEach(doc => { batch.update(doc.ref, { n: newName }); });
                await batch.commit();
            }

            window.UI.closeEditProfileModal();
            window.UI.showProfile('me'); 
        } catch(e) {
            console.error(e);
            alert("Hubo un error al guardar el perfil.");
        } finally {
            btn.innerText = oldText; btn.disabled = false;
        }
    },

    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); 
        const p = document.getElementById('login-pass').value; 
        const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        
        if(!hInp || !p) return alert("Por favor, ingresa usuario y contraseña.");

        const btn = document.getElementById('t_btn_login');
        const originalText = btn.innerText; btn.innerText = "CONECTANDO..."; btn.disabled = true;

        const cachedUser = window.CT.data.u.find(u => u.h === handle);
        if (cachedUser && cachedUser.p === p) {
            localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            window.UI.initLobby(); btn.innerText = originalText; btn.disabled = false; return; 
        }

        const attemptLogin = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try { 
                    const docRef = await window.db.collection('users').doc(handle).get(); 
                    if(docRef.exists && docRef.data().p === p) { 
                        localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                        if(!window.CT.data.u.find(u => u.h === handle)) window.CT.data.u.push(docRef.data()); 
                        window.UI.initLobby(); return true;
                    } else { alert("Usuario o contraseña incorrectos"); return true; } 
                } catch(e) { if (i === retries - 1) throw e; await new Promise(r => setTimeout(r, 1000)); }
            }
            return false;
        };

        try { const success = await attemptLogin(); if(!success) throw new Error("Timeout"); } 
        catch(e) { btn.innerText = "REINTENTAR"; setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000); return; }
        btn.innerText = originalText; btn.disabled = false;
    },

    register: async () => { 
        const n = document.getElementById('reg-display').value; 
        const hRaw = document.getElementById('reg-user').value.toLowerCase(); 
        const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; 
        const p = document.getElementById('reg-pass').value; 
        if(!n || !hRaw || !p) return alert("Completa todos los campos"); 
        if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); 
        try { 
            const docRef = await window.db.collection('users').doc(handle).get(); 
            if(docRef.exists) return alert("Ese usuario ya está en uso"); 
            const role = (handle === '@angel') ? 'admin' : 'usuario'; 
            const newUser = { 
                h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [],
                createdAt: window.CT.getARDate(), bio: '', country: '', layout: '', switches: '', discord: ''
            }; 
            await window.db.collection('users').doc(handle).set(newUser); 
            window.UI.toggleAuth(true); alert("Cuenta creada con éxito."); 
        } catch(e) { alert("Error al conectar con la Nube"); } 
    },
    
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * window.UI.cropScale); const sH = (imgH * 220) / (viewerImgH * window.UI.cropScale); const sX = (((viewerImgW * window.UI.cropScale) / 2) - window.UI.cropX - 110) * (imgW / (viewerImgW * window.UI.cropScale)); const sY = (((viewerImgH * window.UI.cropScale) / 2) - window.UI.cropY - 110) * (imgH / (viewerImgH * window.UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = window.CT.ses(); if(u) { window.db.collection('users').doc(u.h).update({ a: compressedBase64 }); window.db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = window.db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } window.UI.closeCropModal(); }
};
