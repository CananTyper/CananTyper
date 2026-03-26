/* ================================================================
    CANANTYPER - MOTOR DEL JUEGO (GAME ENGINE)
   ================================================================ */

window.Engine = class Engine {
    constructor(trackObj, mode = 'normal', ghostCPM = 0) { 
        this.track = trackObj; this.t = trackObj.text; this.w = this.t.split(' '); 
        this.i = 0; this.c = 0; this.s = null; this.timer = null; 
        this.mode = mode; 
        this.ghostCPM = ghostCPM;
        
        // Variables para penalización en la Arena
        this.totalKeystrokes = 0;
        this.errorKeystrokes = 0;
        this.currentMultiplier = 1.0;

        this.errKeys = {}; this.errWords = {}; this.lastV = '';
        window.App.activeEngine = this;
        
        // Bloqueo de Reintentos en Arena (Si es Muerte Súbita, el bloqueo es aún más estricto visualmente, pero aquí aseguramos que no recargue)
        if (this.mode === 'arena') {
            window.addEventListener('beforeunload', this.preventRageQuit);
        }

        this.init(); 
    }
    
    preventRageQuit = (e) => {
        if (this.s && this.i < this.w.length) {
            e.preventDefault();
            e.returnValue = '';
        }
    };

    stop() { 
        if(this.timer) clearInterval(this.timer); 
        this.timer = null; 
        document.body.classList.remove('zen-focus'); 
        document.body.style.backgroundColor = ''; 
        if (this.mode === 'arena') window.removeEventListener('beforeunload', this.preventRageQuit);
    }
    
    init() { 
        // 1. ENRUTADOR DE HUD (Muestra pantalla Normal o pantalla Arena)
        if (this.mode === 'arena') {
            window.UI.show('arena-game-screen');
            let statusText = `Compitiendo en la Arena 🔴`;
            window.updateDiscordStatus(statusText, "Torneo en Curso");

            document.getElementById('arena-result-modal').classList.add('hidden');
            
            const hudEl = document.querySelector('.arena-hud');
            if(hudEl) hudEl.classList.remove('hidden');
            const textEl = document.getElementById('arena-target-text');
            if(textEl) textEl.classList.remove('hidden');
            const progEl = document.querySelector('#arena-game-screen .progress-container');
            if(progEl) progEl.classList.remove('hidden');

            document.getElementById('arena-game-input').classList.remove('hidden');
            document.getElementById('arena-in-game-controls').style.opacity = '1';
            document.getElementById('arena-target-text').innerHTML = this.w.map((w,idx) => `<span class="word ${idx===0?'active':''}">${w}</span>`).join(' '); 
            document.getElementById('arena-timer').innerText = '0.0s';
            document.getElementById('arena-speed-display').innerText = '0';
            document.getElementById('arena-acc-display').innerText = '100%';
            document.getElementById('arena-mult-display').innerText = 'x1.00';
            document.getElementById('arena-penalty-box').className = 'arena-hud-box'; 
            document.getElementById('arena-race-progress').style.width = '0%';

            const inp = document.getElementById('arena-game-input'); 
            inp.value = ''; inp.disabled = false; inp.focus(); 
            inp.onpaste = (e) => { e.preventDefault(); return false; };
            inp.oncopy = (e) => { e.preventDefault(); return false; };
            inp.oncontextmenu = (e) => { e.preventDefault(); return false; };
            inp.onkeydown = (e) => {
                if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); return false; }
            };
            inp.oninput = (e) => this.check(e.target.value, e.target); 
            inp.onblur = () => { if(!inp.disabled) inp.focus(); };

            const display = document.getElementById('arena-target-text');
            display.style.fontSize = '1.6rem';
            setTimeout(() => { let size = 1.6; while (display.scrollHeight > display.clientHeight && size > 0.8) { size -= 0.05; display.style.fontSize = size + 'rem'; } }, 10);

        } else {
            // INICIO NORMAL / HARDCORE / TRAINING
            window.UI.show('game-screen'); 
            let statusText = this.mode === 'hardcore' ? "Jugando: Muerte Súbita 💀" : (this.mode === 'training' ? "Modo Entrenamiento 🏋️" : `Corriendo: #${this.track.title}`);
            window.updateDiscordStatus(statusText, "En plena carrera 🏎️");

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
    }

    check(v, el) { 
        // 1. INICIAR CRONÓMETRO
        if(!this.s) { 
            this.s = new Date(); 
            if(window.CT.currentUnit === 'zen' && !document.body.classList.contains('zen-focus') && this.mode !== 'arena') { document.body.classList.add('zen-focus'); }
            
            this.timer = setInterval(() => { 
                const sec = (new Date()-this.s)/1000; 
                const currentCPM = Math.round(this.c/(sec/60));

                if (this.mode === 'arena') {
                    document.getElementById('arena-timer').innerText = sec.toFixed(1) + 's'; 
                    document.getElementById('arena-speed-display').innerText = window.UI.formatValue(currentCPM);
                } else {
                    if(document.getElementById('game-timer')) document.getElementById('game-timer').innerText = Math.floor(sec)+'s'; 
                    if(document.getElementById('game-speed-display')) document.getElementById('game-speed-display').innerText = window.UI.formatValue(currentCPM);
                    if (this.ghostCPM > 0) {
                        const totalChars = this.t.length;
                        const ghostCharsExpected = (this.ghostCPM / 60) * sec;
                        let gProg = (ghostCharsExpected / totalChars) * 100;
                        if(gProg > 100) gProg = 100;
                        document.getElementById('ghost-progress').style.width = gProg + '%';
                    }
                }
            }, 100); 
        } 
        
        // 2. LÓGICA DE TECLAS Y ERRORES
        const cur = this.w[this.i]; 
        const spans = document.querySelectorAll(this.mode === 'arena' ? '.arena-text-display .word' : '.game-text-display .word'); 
        const activeSpan = spans[this.i]; 
        const last = this.i === this.w.length - 1; 
        
        if (v.length > cur.length + 5) { v = v.slice(0, cur.length + 5); el.value = v; }
        
        let typed = v; let isSubmitting = false;
        if (!last && typed.endsWith(' ')) { isSubmitting = true; typed = typed.slice(0, -1); }

        let isPrefixValid = cur.startsWith(typed);
        let addedChar = v.length > this.lastV.length;
        
        if (addedChar) this.totalKeystrokes++;

        if (!isPrefixValid && addedChar) {
            this.errorKeystrokes++;
            
            // Efecto visual y Multiplicador en Arena
            if (this.mode === 'arena') {
                this.updateArenaPenalty();
            }

            if (window.CT.fastMode && this.mode !== 'hardcore' && this.mode !== 'arena') { window.App.nextRace(); return; }
            
            // En la nueva Arena, si el modo desde CananStudio es sudden_death, el app.js inyectó el motor como hardcore.
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

        // 3. ENVÍO DE PALABRA
        if (isSubmitting || (last && v === cur)) {
            if (typed === cur && isPrefixValid) {
                this.c += cur.length + (last ? 0 : 1);
                activeSpan.className = 'word correct'; activeSpan.innerHTML = cur; 
                this.i++; el.value = ''; el.classList.remove('input-error'); this.lastV = '';
                
                const progress = (this.i / this.w.length) * 100;
                document.getElementById(this.mode === 'arena' ? 'arena-race-progress' : 'race-progress').style.width = progress + '%';

                if(this.i < this.w.length) spans[this.i].classList.add('active'); else this.end(); 
            } else { el.value = v; el.classList.add('input-error'); }
        }
    }

    updateArenaPenalty() {
        let rawAcc = ((this.totalKeystrokes - this.errorKeystrokes) / this.totalKeystrokes) * 100;
        let accuracy = Math.max(0, Math.min(100, rawAcc)); 
        this.currentMultiplier = (accuracy / 100).toFixed(2);

        document.getElementById('arena-acc-display').innerText = accuracy.toFixed(1) + '%';
        document.getElementById('arena-mult-display').innerText = 'x' + this.currentMultiplier;

        const penaltyBox = document.getElementById('arena-penalty-box');
        if (accuracy < 98 && accuracy >= 95) penaltyBox.className = 'arena-hud-box warning';
        else if (accuracy < 95) penaltyBox.className = 'arena-hud-box danger';
        else penaltyBox.className = 'arena-hud-box';
    }

    die() {
        this.stop(); document.body.style.backgroundColor = '#4a0000'; window.updateDiscordStatus("Muerto en Hardcore 💀", "F", false);
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        const uiTextDeath = window.CT.data.ui && window.CT.data.ui['t_game_dead_title'] ? window.CT.data.ui['t_game_dead_title'].v : "HAS MUERTO";
        document.getElementById('final-speed-display').innerText = `💀 ${uiTextDeath}`;
        
        const u = window.CT.ses();
        if(u) {
            let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
            let hc_deaths = (userDoc.hc_deaths || 0) + 1;
            let track_deaths = userDoc.hc_track_deaths || {};
            track_deaths[this.track.title] = (track_deaths[this.track.title] || 0) + 1;
            window.db.collection('users').doc(u.h).update({ hc_deaths: hc_deaths, hc_track_deaths: track_deaths });

            // NUEVA LÓGICA: Si es Muerte Súbita de Arena, guardamos un 0 espantoso en el tablero
            if (window.App.currentRaceContext && window.App.currentRaceContext.type === 'arena') {
                const conf = window.UI.arenaCurrentConfig;
                if (conf && conf.mode === 'sudden_death') {
                    window.db.collection('arena_scores').doc(`${u.h}_${conf.version}`).set({
                        h: u.h, n: u.n, a: u.a || window.CT.defAvatar,
                        cpm: 0, acc: 0, score: 0, races: 1, version: conf.version,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        document.getElementById('game-result-modal').classList.remove('hidden');
        setTimeout(() => { document.body.style.backgroundColor = ''; }, 1500); 
    }

    async end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000; 
        const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        const u = window.CT.ses(); 
        let userDoc = u ? (window.CT.dbLocal('u').find(x => x.h === u.h) || u) : null;

        // ==============================================
        // FINALIZACIÓN MODO ARENA (LÓGICA E-SPORTS)
        // ==============================================
        if (this.mode === 'arena') {
            document.getElementById('arena-game-input').disabled = true; 
            document.getElementById('arena-game-input').classList.add('hidden'); 
            document.getElementById('arena-in-game-controls').style.opacity = '0';

            const hudEl = document.querySelector('.arena-hud'); if(hudEl) hudEl.classList.add('hidden');
            const textEl = document.getElementById('arena-target-text'); if(textEl) textEl.classList.add('hidden');
            const progEl = document.querySelector('#arena-game-screen .progress-container'); if(progEl) progEl.classList.add('hidden');

            let rawAcc = this.totalKeystrokes > 0 ? ((this.totalKeystrokes - this.errorKeystrokes) / this.totalKeystrokes) * 100 : 100;
            let finalAcc = Math.max(0, Math.min(100, rawAcc));
            
            const conf = window.UI.arenaCurrentConfig;
            let runScore = finalCPM;
            
            if (conf && conf.scoring === 'points') {
                let multiplier = finalAcc / 100;
                runScore = Math.round(finalCPM * multiplier);
            }

            window.updateDiscordStatus("Carrera de Torneo terminada", `Puntaje: ${runScore} Pts`, false);

            document.getElementById('arena-final-cpm').innerText = finalCPM;
            document.getElementById('arena-final-acc').innerText = finalAcc.toFixed(1) + '%';
            document.getElementById('arena-final-score').innerText = runScore;

            if(userDoc && conf) {
                // 1. Guardar Errores para Entrenamiento
                let bk = userDoc.bad_keys || {}; let bw = userDoc.bad_words || {};
                for(let k in this.errKeys) bk[k] = (bk[k] || 0) + this.errKeys[k];
                for(let w in this.errWords) bw[w] = (bw[w] || 0) + this.errWords[w];
                let sortedWords = Object.keys(bw).sort((a,b) => bw[b] - bw[a]); let prunedBw = {};
                sortedWords.slice(0, 30).forEach(w => prunedBw[w] = bw[w]);
                
                // 2. GUARDADO SILENCIOSO GLOBAL (El que alimenta CananStudio a largo plazo)
                let total_arena_pts = (userDoc.arena_pts || 0) + runScore;
                let total_arena_races = (userDoc.arena_races || 0) + 1;

                window.db.collection('users').doc(userDoc.h).update({ 
                    bad_keys: bk, 
                    bad_words: prunedBw,
                    arena_pts: total_arena_pts,
                    arena_races: total_arena_races
                });

                // 3. LÓGICA DE REGISTRO OFICIAL (LEADERBOARD DEL TORNEO ACTUAL)
                const docId = `${u.h}_${conf.version}`;
                const docRef = window.db.collection('arena_scores').doc(docId);
                
                try {
                    const docSnap = await docRef.get();
                    let recordScore = runScore;
                    let recordAcc = finalAcc;
                    let recordRaces = 1;

                    if (docSnap.exists) {
                        const existing = docSnap.data();
                        
                        if (conf.mode === 'sprint') {
                            // En sprint solo guardamos si es mejor
                            if (runScore <= existing.score) {
                                document.getElementById('arena-result-modal').classList.remove('hidden');
                                return; 
                            }
                        } else if (conf.mode === 'league') {
                            // En liga sumamos y promediamos
                            recordRaces = (existing.races || 1) + 1;
                            let sumScore = (existing.score * (existing.races || 1)) + runScore;
                            let sumAcc = (existing.acc * (existing.races || 1)) + finalAcc;
                            
                            recordScore = Math.round(sumScore / recordRaces);
                            recordAcc = Math.round(sumAcc / recordRaces);
                        }
                    }

                    await docRef.set({
                        h: u.h, n: u.n, a: u.a || window.CT.defAvatar,
                        cpm: finalCPM, acc: recordAcc, score: recordScore, races: recordRaces,
                        version: conf.version, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`[E-SPORTS] Score Torneo Guardado: ${recordScore} | Puntos Globales Acumulados: ${total_arena_pts}`);

                } catch(e) { console.error("Error guardando score Arena", e); }
            }

            document.getElementById('arena-result-modal').classList.remove('hidden');
            return;
        }

        // ==============================================
        // FINALIZACIÓN MODO NORMAL / HC / TRAINING
        // ==============================================
        document.getElementById('game-input').disabled = true; document.getElementById('game-input').classList.add('hidden'); document.getElementById('in-game-controls').classList.add('hidden');
        
        const finalUnitLabel = window.CT.currentUnit === 'zen' ? 'ZEN' : window.CT.currentUnit.toUpperCase();
        const finalSpeedValue = window.CT.currentUnit === 'wpm' ? Math.round(finalCPM/5) : finalCPM;
        
        window.updateDiscordStatus("Carrera terminada", `Resultado: ${finalSpeedValue} ${finalUnitLabel}`, false);
        const speedDisplayEl = document.getElementById('final-speed-display');
        speedDisplayEl.innerText = finalSpeedValue + " " + finalUnitLabel;

        document.getElementById('game-speed-display').innerText = finalSpeedValue;
        document.getElementById('game-timer').innerText = sec.toFixed(1) + 's';
        
        if (window.CT.currentUnit === 'zen') { speedDisplayEl.classList.add('val-blurrable'); }
        if (this.mode === 'training') { document.getElementById('game-result-modal').classList.remove('hidden'); return; }

        if(userDoc) {
            let arrRef = this.mode === 'hardcore' ? (userDoc.hi_hc || []) : (userDoc.hi || []);
            const previousBest = arrRef.length > 0 ? Math.max(...arrRef) : 0;
            if(finalCPM > previousBest && arrRef.length > 0) { document.getElementById('pb-alert').classList.remove('hidden'); }

            let bk = userDoc.bad_keys || {}; let bw = userDoc.bad_words || {};
            for(let k in this.errKeys) bk[k] = (bk[k] || 0) + this.errKeys[k];
            for(let w in this.errWords) bw[w] = (bw[w] || 0) + this.errWords[w];
            
            let sortedWords = Object.keys(bw).sort((a,b) => bw[b] - bw[a]); let prunedBw = {};
            sortedWords.slice(0, 30).forEach(w => prunedBw[w] = bw[w]);

            const dateStr = window.CT.getARDate(); const scoreId = Date.now().toString();
            let sList = window.CT.data.s_recent || []; const isHC = this.mode === 'hardcore';
            const newScore = { id: scoreId, n: userDoc.n, h: userDoc.h, c: finalCPM, a: userDoc.a, d: dateStr, track: this.track.title, hc: isHC };
            sList.unshift(newScore); window.CT.data.s_recent = sList;
            
            if (window.CT.data.userScores && window.CT.data.userScores[userDoc.h]) {
                window.CT.data.userScores[userDoc.h].unshift(newScore);
            }

            let updatePayload = { bad_keys: bk, bad_words: prunedBw };
            if (isHC) { updatePayload.hi_hc = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi_hc) userDoc.hi_hc = []; userDoc.hi_hc.push(finalCPM); } 
            else { updatePayload.hi = firebase.firestore.FieldValue.arrayUnion(finalCPM); if (!userDoc.hi) userDoc.hi = []; userDoc.hi.push(finalCPM); }
            
            userDoc.bad_keys = bk; userDoc.bad_words = prunedBw;
            window.db.collection('users').doc(userDoc.h).update(updatePayload); 
            window.db.collection('scores').doc(scoreId).set(newScore); 
        }
        document.getElementById('game-result-modal').classList.remove('hidden');
    }
}
