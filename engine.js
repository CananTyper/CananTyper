/* ================================================================
   CANANTYPER - ENGINE MÓDULO (FASE 1)
   ================================================================ */

const App = {
    currentTrack: null, activeEngine: null,
    
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

    register: async () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; if(!n || !hRaw || !p) return alert("Completa todos los campos"); if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres."); try { const docRef = await db.collection('users').doc(handle).get(); if(docRef.exists) return alert("Ese usuario ya está en uso"); const role = 'usuario'; const newUser = { h: handle, n, p, r: role, a: '', hi: [], hi_hc: [], bad_keys: {}, bad_words: {}, favs: [] }; await db.collection('users').doc(handle).set(newUser); UI.toggleAuth(true); alert("Cuenta creada con éxito."); } catch(e) { alert("Error al conectar con la Nube"); } },
    
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

    saveCrop: () => { const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d'); const img = document.getElementById('crop-image'); const imgW = img.naturalWidth; const imgH = img.naturalHeight; let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; } const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale; const sW = (imgW * 220) / (viewerImgW * UI.cropScale); const sH = (imgH * 220) / (viewerImgH * UI.cropScale); const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale)); const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale)); ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); const u = CT.ses(); if(u) { db.collection('users').doc(u.h).update({ a: compressedBase64 }); db.collection('scores').where('h', '==', u.h).get().then(q => { const batch = db.batch(); q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); }); batch.commit(); }); document.getElementById('prof-img').src = compressedBase64; } UI.closeCropModal(); },

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
    }
};

class Engine {
    constructor(trackObj, mode = 'normal', ghostCPM = 0) { 
        this.track = trackObj; this.t = trackObj.text; this.w = this.t.split(' '); 
        this.i = 0; this.c = 0; this.s = null; this.timer = null; 
        this.mode = mode; 
        this.ghostCPM = ghostCPM;
        this.errKeys = {}; this.errWords = {}; this.lastV = '';
        App.activeEngine = this;
        this.init(); 
    }
    
    stop() { 
        if(this.timer) clearInterval(this.timer); 
        this.timer = null; 
        document.body.classList.remove('zen-focus'); 
        document.body.style.backgroundColor = ''; 
    }
    
    init() { 
        UI.show('game-screen'); 
        let statusText = this.mode === 'hardcore' ? "Jugando: Muerte Súbita 💀" : (this.mode === 'training' ? "Modo Entrenamiento 🏋️" : `Corriendo: #${this.track.title}`);
        updateDiscordStatus(statusText, "En plena carrera 🏎️");

        document.getElementById('game-result-modal').classList.add('hidden');
        document.getElementById('game-input').classList.remove('hidden');
        document.getElementById('in-game-controls').classList.remove('hidden');
        document.getElementById('target-text').innerHTML = this.w.map((w,idx) => `<span class="word ${idx===0?'active':''}">${w}</span>`).join(' '); 
        document.getElementById('game-timer').innerText = '0s';
        document.getElementById('game-speed-display').innerText = '0';
        
        document.getElementById('final-speed-display').classList.remove('val-blurrable');
        
        document.getElementById('race-progress').style.width = '0%';
        document.getElementById('ghost-progress').style.width = '0%';
        document.getElementById('ghost-progress').classList.toggle('hidden', this.ghostCPM === 0);
        
        document.getElementById('pb-alert').classList.add('hidden');
        document.body.classList.remove('zen-focus');
        
        const inp = document.getElementById('game-input'); 
        inp.value = ''; inp.disabled = false; inp.focus(); 
        inp.onpaste = (e) => { e.preventDefault(); return false; };
        inp.oncopy = (e) => { e.preventDefault(); return false; };
        inp.oncontextmenu = (e) => { e.preventDefault(); return false; };
        inp.oninput = (e) => this.check(e.target.value, e.target); 
        inp.onblur = () => { if(!inp.disabled) inp.focus(); };

        const display = document.getElementById('target-text');
        display.style.fontSize = '1.6rem';
        setTimeout(() => { let size = 1.6; while (display.scrollHeight > display.clientHeight && size > 0.8) { size -= 0.05; display.style.fontSize = size + 'rem'; } }, 10);
    }

    check(v, el) { 
        if(!this.s) { 
            this.s = new Date(); 
            if(CT.currentUnit === 'zen' && !document.body.classList.contains('zen-focus')) { document.body.classList.add('zen-focus'); }
            
            this.timer = setInterval(() => { 
                const sec = (new Date()-this.s)/1000; 
                if(document.getElementById('game-timer')) document.getElementById('game-timer').innerText = Math.floor(sec)+'s'; 
                if(document.getElementById('game-speed-display')) {
                    const currentCPM = Math.round(this.c/(sec/60));
                    document.getElementById('game-speed-display').innerText = UI.formatValue(currentCPM);
                }
                if (this.ghostCPM > 0) {
                    const totalChars = this.t.length;
                    const ghostCharsExpected = (this.ghostCPM / 60) * sec;
                    let gProg = (ghostCharsExpected / totalChars) * 100;
                    if(gProg > 100) gProg = 100;
                    document.getElementById('ghost-progress').style.width = gProg + '%';
                }
            }, 100); 
        } 
        
        const cur = this.w[this.i]; const spans = document.querySelectorAll('.word'); const activeSpan = spans[this.i]; const last = this.i === this.w.length - 1; 
        if (v.length > cur.length + 5) { v = v.slice(0, cur.length + 5); el.value = v; }
        
        let typed = v; let isSubmitting = false;
        if (!last && typed.endsWith(' ')) { isSubmitting = true; typed = typed.slice(0, -1); }

        let isPrefixValid = cur.startsWith(typed);
        let addedChar = v.length > this.lastV.length;
        
        if (!isPrefixValid && addedChar) {
            if (CT.fastMode && this.mode !== 'hardcore') { App.nextRace(); return; }
            if (this.mode === 'hardcore') { this.die(); return; }

            let matchLen = 0; 
            while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let expectedChar = cur[matchLen] ? cur[matchLen].toLowerCase() : null;
            if (expectedChar && /[a-z0-9ñáéíóú]/.test(expectedChar)) {
                 let key = expectedChar.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
                 this.errKeys[key] = (this.errKeys[key] || 0) + 1;
            }
            let cleanWord = cur.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]/g, '').toLowerCase();
            if(cleanWord) this.errWords[cleanWord] = (this.errWords[cleanWord] || 0) + 1;
        }
        this.lastV = v;

        if (isPrefixValid) {
            el.classList.remove('input-error'); activeSpan.innerHTML = `<span class="char-ok">${typed}</span>${cur.slice(typed.length)}`;
        } else {
            el.classList.add('input-error'); let matchLen = 0; while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let correctPart = cur.slice(0, matchLen); let errLen = typed.length - matchLen;
            let wordWrongPart = cur.slice(matchLen, matchLen + errLen); let remPart = cur.slice(matchLen + wordWrongPart.length);
            activeSpan.innerHTML = `<span class="char-ok">${correctPart}</span><span class="char-err">${wordWrongPart}</span>${remPart}`;
        }

        if (isSubmitting || (last && v === cur)) {
            if (typed === cur && isPrefixValid) {
                this.c += cur.length + (last ? 0 : 1);
                activeSpan.className = 'word correct'; activeSpan.innerHTML = cur; 
                this.i++; el.value = ''; el.classList.remove('input-error'); this.lastV = '';
                
                const progress = (this.i / this.w.length) * 100;
                document.getElementById('race-progress').style.width = progress + '%';

                if(this.i < this.w.length) spans[this.i].classList.add('active'); else this.end(); 
            } else { el.value = v; el.classList.add('input-error'); }
        }
    }

    die() {
        this.stop(); document.body.style.backgroundColor = '#4a0000'; updateDiscordStatus("Muerto en Hardcore 💀", "F", false);
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        const uiTextDeath = CT.data.ui && CT.data.ui['t_game_dead_title'] ? CT.data.ui['t_game_dead_title'].v : "HAS MUERTO";
        document.getElementById('final-speed-display').innerText = `💀 ${uiTextDeath}`;
        
        const u = CT.ses();
        if(u) {
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let hc_deaths = (userDoc.hc_deaths || 0) + 1;
            let track_deaths = userDoc.hc_track_deaths || {};
            track_deaths[this.track.title] = (track_deaths[this.track.title] || 0) + 1;
            db.collection('users').doc(u.h).update({ hc_deaths: hc_deaths, hc_track_deaths: track_deaths });
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 1500); 
    }

    end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000; const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        
        const finalUnitLabel = CT.currentUnit === 'zen' ? 'ZEN' : CT.currentUnit.toUpperCase();
        const finalSpeedValue = CT.currentUnit === 'wpm' ? Math.round(finalCPM/5) : finalCPM;
        
        updateDiscordStatus("Carrera terminada", `Resultado: ${finalSpeedValue} ${finalUnitLabel}`, false);
        const speedDisplayEl = document.getElementById('final-speed-display');
        speedDisplayEl.innerText = finalSpeedValue + " " + finalUnitLabel;

        document.getElementById('game-speed-display').innerText = finalSpeedValue;
        document.getElementById('game-timer').innerText = sec.toFixed(1) + 's';
        
        if (CT.currentUnit === 'zen') { speedDisplayEl.classList.add('val-blurrable'); }
        if (this.mode === 'training') { document.getElementById('game-result-modal').classList.remove('hidden'); return; }

        const u = CT.ses(); 
        if(u) {
            let userDoc = CT.dbLocal('u').find(x => x.h === u.h) || u;
            let arrRef = this.mode === 'hardcore' ? (userDoc.hi_hc || []) : (userDoc.hi || []);
            const previousBest = arrRef.length > 0 ? Math.max(...arrRef) : 0;
            if(finalCPM > previousBest && arrRef.length > 0) { document.getElementById('pb-alert').classList.remove('hidden'); }

            let bk = userDoc.bad_keys || {}; let bw = userDoc.bad_words || {};
            for(let k in this.errKeys) bk[k] = (bk[k] || 0) + this.errKeys[k];
            for(let w in this.errWords) bw[w] = (bw[w] || 0) + this.errWords[w];
            
            let sortedWords = Object.keys(bw).sort((a,b) => bw[b] - bw[a]); let prunedBw = {};
            sortedWords.slice(0, 30).forEach(w => prunedBw[w] = bw[w]);

            const dateStr = CT.getARDate(); const scoreId = Date.now().toString();
            let sList = CT.data.s_recent || []; const isHC = this.mode === 'hardcore';
            const newScore = { id: scoreId, n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title, hc: isHC };
            sList.unshift(newScore); CT.data.s_recent = sList;
            
            if (CT.data.userScores && CT.data.userScores[u.h]) {
                CT.data.userScores[u.h].unshift(newScore);
            }

            let updatePayload = { bad_keys: bk, bad_words: prunedBw };
            if (isHC) { updatePayload.hi_hc = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi_hc) userDoc.hi_hc = []; userDoc.hi_hc.push(finalCPM); } 
            else { updatePayload.hi = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi) userDoc.hi = []; userDoc.hi.push(finalCPM); }
            
            userDoc.bad_keys = bk; userDoc.bad_words = prunedBw;
            db.collection('users').doc(u.h).update(updatePayload); 
            db.collection('scores').doc(scoreId).set(newScore); 
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
    }
}
