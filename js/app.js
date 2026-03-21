/* ================================================================
    CANANTYPER - LÓGICA DE NEGOCIO Y CONTROLADORES (APP)
   ================================================================ */

window.App = {
    currentTrack: null, activeEngine: null,
    currentRaceContext: null, // Sistema de continuidad
    
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

    saveWidgetOrderFromDOM: (tab, gridElementId) => {
        const grid = document.getElementById(gridElementId);
        if(!grid) return;
        
        const visibleDomIds = Array.from(grid.children)
            .filter(el => !el.classList.contains('hidden'))
            .map(el => el.getAttribute('data-id'));
            
        let layout = window.CT.data.statsLayout[tab];
        
        layout.forEach(w => {
            const domIdx = visibleDomIds.indexOf(w.id);
            w.order = domIdx !== -1 ? domIdx : 999;
        });

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
        window.App.currentRaceContext = { type: 'random' };
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
        window.App.currentRaceContext = { type: 'random' }; // Ghost overrides continuity
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

    startRaceWithTrack: (id) => { 
        if (window.UI.filterFavs) window.App.currentRaceContext = { type: 'favs' };
        else if (window.UI.activeTrackCat) window.App.currentRaceContext = { type: 'cat', val: window.UI.activeTrackCat };
        else window.App.currentRaceContext = { type: 'custom' };

        const track = window.CT.dbLocal('p').find(t => t.id.toString() === id.toString()); 
        if(track) { window.App.currentTrack = track; if(window.App.activeEngine) window.App.activeEngine.stop(); window.App.activeEngine = new window.Engine(track, 'normal'); } 
    },
    
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
                // Lógica de Continuidad de Contexto (Fase Pro)
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
