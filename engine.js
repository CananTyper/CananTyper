/* ================================================================
   CANANTYPER - MÓDULO ENGINE (V2.0)
   Motor matemático de tipeo, validación NFD y sistema Anti-Cheat.
   ================================================================ */

const EngineControl = {
    startRandomRace: () => { 
        let tracks = CT.data.p.filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        EngineControl.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(EngineControl.activeEngine) EngineControl.activeEngine.stop(); 
        EngineControl.activeEngine = new Engine(EngineControl.currentTrack, 'normal'); 
    },
    
    startHardcoreRace: () => { 
        let tracks = CT.data.p.filter(t => !t.c.startsWith('[TRN]')); 
        if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); 
        EngineControl.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; 
        if(EngineControl.activeEngine) EngineControl.activeEngine.stop(); 
        EngineControl.activeEngine = new Engine(EngineControl.currentTrack, 'hardcore'); 
    },
    
    startGhostRace: (trackTitle, cpm) => {
        let track = CT.data.p.find(t => t.title.toString() === trackTitle.toString());
        if(!track) return alert("Pista no encontrada o eliminada.");
        EngineControl.currentTrack = track;
        if(EngineControl.activeEngine) EngineControl.activeEngine.stop();
        EngineControl.activeEngine = new Engine(track, 'normal', cpm);
    },

    startPurge: () => {
        const u = CT.ses(); 
        const bw = u.bad_words || {}; let words = Object.keys(bw);
        if(words.length < 5) return alert("No tienes suficientes errores registrados aún. ¡Juega más partidas normales!");
        let genText = []; for(let i=0; i<20; i++) { genText.push(words[Math.floor(Math.random()*words.length)]); }
        const track = { id: 'purge', title: 'Purgatorio', c: 'Entrenamiento', text: genText.join(' ') };
        EngineControl.currentTrack = track;
        if(EngineControl.activeEngine) EngineControl.activeEngine.stop(); EngineControl.activeEngine = new Engine(track, 'training');
        UI.toggleTrainMenu();
    },

    startTrnCategory: (catName) => {
        let extTracks = CT.data.p.filter(t => t.c === catName);
        if(extTracks.length === 0) return alert("No hay textos en esta modalidad.");
        EngineControl.currentTrack = extTracks[Math.floor(Math.random() * extTracks.length)];
        if(EngineControl.activeEngine) EngineControl.activeEngine.stop(); EngineControl.activeEngine = new Engine(EngineControl.currentTrack, 'training');
        UI.toggleTrainMenu();
    },

    startRaceWithTrack: (id) => { 
        const track = CT.data.p.find(t => t.id.toString() === id.toString()); 
        if(track) { 
            EngineControl.currentTrack = track; 
            if(EngineControl.activeEngine) EngineControl.activeEngine.stop(); 
            EngineControl.activeEngine = new Engine(track, 'normal'); 
        } 
    },
    
    retryRace: () => { 
        if(EngineControl.activeEngine) { 
            const m = EngineControl.activeEngine.mode; const g = EngineControl.activeEngine.ghostCPM; EngineControl.activeEngine.stop(); 
            if(EngineControl.currentTrack) EngineControl.activeEngine = new Engine(EngineControl.currentTrack, m, g); 
        } 
    },
    
    nextRace: () => { 
        if(EngineControl.activeEngine) { 
            const m = EngineControl.activeEngine.mode; 
            const track = EngineControl.activeEngine.track; 
            EngineControl.activeEngine.stop(); 
            if(m === 'hardcore') {
                EngineControl.startHardcoreRace(); 
            } else if (m === 'training') {
                if (track && track.id === 'purge') EngineControl.startPurge();
                else if (track && track.c && track.c.startsWith('[TRN]')) EngineControl.startTrnCategory(track.c);
                else EngineControl.startPurge(); 
            } else {
                EngineControl.startRandomRace(); 
            }
        } 
    },
    
    quitRace: () => { 
        if(EngineControl.activeEngine) { EngineControl.activeEngine.stop(); EngineControl.activeEngine = null; } 
        UI.showLobby(); 
    }
};

// Listener aislado de Teclas para Atajos en Carrera
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (!EngineControl.activeEngine) return;
    const sc = CT.data.shortcuts || { restart: 'Tab', next: 'Enter', quit: 'Escape' };
    if (e.key === sc.restart) { e.preventDefault(); EngineControl.retryRace(); }
    else if (e.key === sc.next) { e.preventDefault(); EngineControl.nextRace(); }
    else if (e.key === sc.quit) { e.preventDefault(); EngineControl.quitRace(); }
});

class Engine {
    constructor(trackObj, mode = 'normal', ghostCPM = 0) { 
        this.track = trackObj; this.t = trackObj.text; this.w = this.t.split(' '); 
        this.i = 0; this.c = 0; this.s = null; this.timer = null; 
        this.mode = mode; 
        this.ghostCPM = ghostCPM;
        this.errKeys = {}; this.errWords = {}; this.lastV = '';
        EngineControl.activeEngine = this;
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
        if(typeof updateDiscordStatus === 'function') updateDiscordStatus(statusText, "En plena carrera 🏎️");

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
            if (CT.fastMode && this.mode !== 'hardcore') { EngineControl.nextRace(); return; }
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
        this.stop(); document.body.style.backgroundColor = '#4a0000'; 
        if(typeof updateDiscordStatus === 'function') updateDiscordStatus("Muerto en Hardcore 💀", "F", false);
        
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        const uiTextDeath = CT.data.ui && CT.data.ui['t_game_dead_title'] ? CT.data.ui['t_game_dead_title'].v : "HAS MUERTO";
        document.getElementById('final-speed-display').innerText = `💀 ${uiTextDeath}`;
        
        const u = CT.ses();
        if(u) {
            let hc_deaths = (u.hc_deaths || 0) + 1;
            let track_deaths = u.hc_track_deaths || {};
            track_deaths[this.track.title] = (track_deaths[this.track.title] || 0) + 1;
            
            // Actualización segura para la cuota (solo manda info)
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
        
        if(typeof updateDiscordStatus === 'function') updateDiscordStatus("Carrera terminada", `Resultado: ${finalSpeedValue} ${finalUnitLabel}`, false);
        
        const speedDisplayEl = document.getElementById('final-speed-display');
        speedDisplayEl.innerText = finalSpeedValue + " " + finalUnitLabel;

        document.getElementById('game-speed-display').innerText = finalSpeedValue;
        document.getElementById('game-timer').innerText = sec.toFixed(1) + 's';
        
        if (CT.currentUnit === 'zen') { speedDisplayEl.classList.add('val-blurrable'); }
        if (this.mode === 'training') { document.getElementById('game-result-modal').classList.remove('hidden'); return; }

        const u = CT.ses(); 
        if(u) {
            // Evaluamos contra el usuario en memoria
            let arrRef = this.mode === 'hardcore' ? (u.hi_hc || []) : (u.hi || []);
            const previousBest = arrRef.length > 0 ? Math.max(...arrRef) : 0;
            if(finalCPM > previousBest && arrRef.length > 0) { document.getElementById('pb-alert').classList.remove('hidden'); }

            let bk = u.bad_keys || {}; let bw = u.bad_words || {};
            for(let k in this.errKeys) bk[k] = (bk[k] || 0) + this.errKeys[k];
            for(let w in this.errWords) bw[w] = (bw[w] || 0) + this.errWords[w];
            
            let sortedWords = Object.keys(bw).sort((a,b) => bw[b] - bw[a]); let prunedBw = {};
            sortedWords.slice(0, 30).forEach(w => prunedBw[w] = bw[w]);

            const dateStr = CT.getARDate(); const scoreId = Date.now().toString();
            const isHC = this.mode === 'hardcore';
            
            // Creamos la carrera
            const newScore = { id: scoreId, n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title, hc: isHC, sb: (u.sb || false) };
            
            // Enviamos el Batch
            let updatePayload = { bad_keys: bk, bad_words: prunedBw };
            if (isHC) { updatePayload.hi_hc = firebase.firestore.FieldValue.arrayUnion(finalCPM); } 
            else { updatePayload.hi = firebase.firestore.FieldValue.arrayUnion(finalCPM); }
            
            db.collection('users').doc(u.h).update(updatePayload); 
            db.collection('scores').doc(scoreId).set(newScore); 
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
    }
}
