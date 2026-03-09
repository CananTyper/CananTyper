const CT = {
    keys: { u: 'ct_v12_users', s: 'ct_v12_scores', p: 'ct_v12_phrases' },
    db: (k) => JSON.parse(localStorage.getItem(CT.keys[k])) || [],
    save: (k, d) => localStorage.setItem(CT.keys[k], JSON.stringify(d)),
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5,
    editIdx: null, profPage: 0, activeProfHandle: null,
    
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    init() {
        if(!localStorage.getItem(this.keys.u)) this.save('u', []);
        if(!localStorage.getItem(this.keys.s)) this.save('s', []);
        if(!localStorage.getItem(this.keys.p)) this.save('p', [{ id: 1, title: "1", text: "La programación es un arte competitivo. En el código limpio se encuentra la verdadera maestría." }]);
        const storedUnit = localStorage.getItem('ct_unit_pref');
        if(storedUnit) this.currentUnit = storedUnit;
    },
    ses: () => { const s = JSON.parse(sessionStorage.getItem('ct_ses')); return s ? (CT.db('u')).find(x => x.h === s.h) : null; }
};

const UI = {
    trackPage: 0, cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0,
    
    formatValue: (cpm) => { return CT.currentUnit === 'wpm' ? Math.round(cpm / CT.charPerWord) : cpm; },

    show: (id) => { 
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
        document.getElementById(id).classList.remove('hidden');
    },
    toggleAuth: (login) => { 
        document.getElementById('login-form').classList.toggle('hidden', !login); 
        document.getElementById('register-form').classList.toggle('hidden', login); 
    },
    initLobby() {
        const u = CT.ses(); if(!u) return this.show('auth-screen');
        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || CT.defAvatar;
        document.getElementById('btn-go-admin').classList.toggle('hidden', u.r === 'usuario');
        UI.updateUnitVisuals(CT.currentUnit);
        this.renderGlobal(); this.show('home-screen');
    },
    showLobby() { this.initLobby(); },
    showAdmin() { this.switchTab('phrases'); UI.updateUnitVisuals(CT.currentUnit); this.show('admin-screen'); },

    toggleUnits: () => {
        CT.currentUnit = (CT.currentUnit === 'cpm') ? 'wpm' : 'cpm';
        localStorage.setItem('ct_unit_pref', CT.currentUnit);
        UI.updateUnitVisuals(CT.currentUnit);
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
    },

    updateUnitVisuals: (unit) => {
        document.querySelectorAll('.unit-switcher span').forEach(s => s.classList.remove('active'));
        document.getElementById(`unit-${unit}`).classList.add('active');
        const unitLabel = unit.toUpperCase();
        if(document.getElementById('th-unit-times')) document.getElementById('th-unit-times').innerText = unitLabel;
        if(document.getElementById('th-unit-rank')) document.getElementById('th-unit-rank').innerText = (unit === 'cpm' ? 'PROMEDIO CPM' : 'PROMEDIO WPM');
        if(document.getElementById('th-unit-hist')) document.getElementById('th-unit-hist').innerText = 'Velocidad (' + unitLabel + ')';
        if(document.getElementById('th-unit-admin')) document.getElementById('th-unit-admin').innerText = unitLabel;
        document.querySelectorAll('th.active-unit').forEach(th => th.classList.remove('active-unit'));
        if(document.getElementById('th-unit-times')) document.getElementById('th-unit-times').classList.add('active-unit');
        if(document.getElementById('th-unit-hist')) document.getElementById('th-unit-hist').classList.add('active-unit');
        if(document.getElementById('lbl-st-avg')) document.getElementById('lbl-st-avg').innerText = 'PROM. ' + unitLabel;
        if(document.getElementById('lbl-st-last')) document.getElementById('lbl-st-last').innerText = 'ÚLT. 10 ' + unitLabel;
        if(document.getElementById('lbl-st-best')) document.getElementById('lbl-st-best').innerText = 'RÉCORD ' + unitLabel;
        if(document.getElementById('game-unit-label')) document.getElementById('game-unit-label').innerText = unitLabel;
        if (unit === 'wpm') { document.body.classList.add('wpm-mode'); } else { document.body.classList.remove('wpm-mode'); }
    },

    renderGlobal() {
        const scores = CT.db('s'); const users = CT.db('u'); const todayAR = CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        let filteredScores = typeEl.value === 'today' ? scores.filter(s => s.d === todayAR) : scores;
        let limitTimes = typeEl.value === 'today' ? 10 : 20; 
        filteredScores.sort((a,b) => b.c - a.c);
        
        document.getElementById('global-rank-times').innerHTML = filteredScores.slice(0, limitTimes).map((s, idx) => `<tr>
            <td>${idx + 1}</td>
            <td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-frame-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td>
            <td><b style="color:var(--p)">${UI.formatValue(s.c)}</b></td><td>${s.track}</td>
        </tr>`).join('');

        const rankingMode = rankTypeEl.value;
        let playerStats = users.map(u => {
            const history = u.hi || []; 
            let averageCPM = (rankingMode === 'last10') 
                ? (history.slice(-10).length ? Math.round(history.slice(-10).reduce((a,b)=>a+b)/history.slice(-10).length) : 0)
                : (history.length ? Math.round(history.reduce((a,b)=>a+b)/history.length) : 0);
            return { n: u.n, a: u.a, h: u.h, avgCPM: averageCPM, total: history.length };
        }).filter(u => u.total > 0).sort((a,b) => b.avgCPM - a.avgCPM);

        document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => `<tr>
            <td>${idx + 1}</td>
            <td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-frame-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td>
            <td><b style="color:var(--p)">${UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td>
        </tr>`).join('');
    },

    showProfile(who) {
        try {
            const currentSes = CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            const u = CT.db('u').find(x => x.h === targetHandle); if(!u) return;
            CT.activeProfHandle = u.h;
            document.getElementById('prof-name').innerText = u.n || "Piloto";
            document.getElementById('prof-img').src = u.a || CT.defAvatar;
            document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            
            const hi = u.hi || []; const total = hi.length;
            document.getElementById('st-total').innerText = total;
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10);
            const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;

            document.getElementById('st-avg').innerText = UI.formatValue(avgCPM);
            document.getElementById('st-last-10').innerText = UI.formatValue(avg10CPM);
            document.getElementById('st-best').innerText = UI.formatValue(bestCPM);
            
            CT.profPage = 0; this.renderProfileHistory();
            const isMe = (currentSes && u.h === currentSes.h);
            document.getElementById('btn-open-edit').classList.toggle('hidden', !isMe);
            document.getElementById('edit-dropdown').classList.add('hidden');
            this.show('profile-screen');
        } catch (error) { console.error(error); }
    },
    toggleEditMenu() { document.getElementById('edit-dropdown').classList.toggle('hidden'); },

    renderProfileHistory() {
        const scores = CT.db('s'); const userScores = scores.filter(s => s.h === CT.activeProfHandle);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td style="color:var(--p)"><b>${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0;
        document.getElementById('prof-next').disabled = (start + 10) >= userScores.length;
        document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { 
        const userScores = CT.db('s').filter(s => s.h === CT.activeProfHandle); const nextStart = (CT.profPage + delta) * 10;
        if(nextStart >= 0 && nextStart < userScores.length) { CT.profPage += delta; this.renderProfileHistory(); }
    },

    switchTab(tab) {
        document.querySelectorAll('.pane').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`pane-${tab}`).classList.remove('hidden');
        document.getElementById(`t-${tab.substring(0,2)}`).classList.add('active');
        if(tab === 'phrases') this.renderAdminP();
        if(tab === 'races') this.renderAdminR();
        if(tab === 'users') this.renderAdminU();
    },
    renderAdminR() {
        const scores = CT.db('s'); const query = (document.getElementById('race-search').value || "").toLowerCase();
        let filtered = scores.filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query));
        document.getElementById('admin-races-list').innerHTML = filtered.map((s) => `<tr><td><b>${s.n}</b></td><td style="color:var(--p)"><b>${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td><td><button onclick="UI.editRace('${s.id}')" class="btn-exit-outline" style="border-color:var(--p);color:var(--p); margin-right:5px;">EDITAR</button><button onclick="UI.delRace('${s.id}')" class="btn-exit-outline" style="color:#f44;border-color:#400">ELIMINAR</button></td></tr>`).join('');
    },
    editRace(raceId) {
        let scores = CT.db('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return;
        const oldCPM = Number(scores[idx].c); const newCPM = prompt("Nuevo CPM (Base exacta):", oldCPM);
        if(!newCPM || isNaN(newCPM)) return;
        const targetCPM = parseInt(newCPM); let users = CT.db('u'); const uIdx = users.findIndex(u => u.h === scores[idx].h);
        if(uIdx !== -1) { const hIdx = users[uIdx].hi.indexOf(oldCPM); if(hIdx !== -1) users[uIdx].hi[hIdx] = targetCPM; CT.save('u', users); }
        scores[idx].c = targetCPM; CT.save('s', scores); this.renderAdminR(); this.renderGlobal();
    },
    delRace(raceId) {
        if(!confirm("¿Eliminar?")) return;
        let scores = CT.db('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return;
        const raceData = scores[idx]; let users = CT.db('u'); const uIdx = users.findIndex(u => u.h === raceData.h);
        if(uIdx !== -1) { const hIdx = users[uIdx].hi.indexOf(Number(raceData.c)); if(hIdx !== -1) users[uIdx].hi.splice(hIdx, 1); CT.save('u', users); }
        scores.splice(idx, 1); CT.save('s', scores); this.renderAdminR(); this.renderGlobal();
    },
    renderAdminP() {
        document.getElementById('admin-phrases-list').innerHTML = CT.db('p').map((t, i) => `<li class="phrase-item"><span><b>#${t.title}</b></span><div><button onclick="UI.prepEdit(${i})" class="btn-exit-outline" style="margin-right:10px;">EDITAR</button><button onclick="UI.delP(${i})" class="btn-exit-outline" style="color:#f44;border-color:#400;">BORRAR</button></div></li>`).join('');
    },
    prepEdit(i) {
        const p = CT.db('p'); document.getElementById('phrase-title').value = p[i].title; document.getElementById('phrase-input').value = p[i].text; CT.editIdx = i; document.getElementById('btn-save-phrase').innerText = "ACTUALIZAR";
    },
    delP(i) { if(confirm("¿Eliminar?")) { let p = CT.db('p'); p.splice(i, 1); CT.save('p', p); this.renderAdminP(); }},
    renderAdminU() {
        document.getElementById('admin-users-list').innerHTML = CT.db('u').map((u, i) => `<tr><td>${u.n}</td><td>${u.h}</td><td>${u.r}</td><td><button onclick="UI.delU(${i})" class="btn-exit-outline" style="color:#f44;border-color:#400;">ELIMINAR</button></td></tr>`).join('');
    },
    delU(i) { if(confirm("¿Eliminar?")) { let u = CT.db('u'); u.splice(i, 1); CT.save('u', u); this.renderAdminU(); }},
    
    // LISTA DE TEXTOS REPARADA Y CON CLASES CSS CORRECTAS
    showTrackSelect() {
        UI.trackPage = 0; this.renderTrackList(); this.show('track-screen');
    },
    renderTrackList() {
        const tracks = CT.db('p'); const start = UI.trackPage * 20; const pageData = tracks.slice(start, start + 20);
        document.getElementById('track-list-full').innerHTML = pageData.map(t => `
            <div class="custom-track-row" onclick="App.startRaceWithTrack(${t.id})">
                <div class="track-id">#${t.title}</div>
                <div class="track-content">
                    <p class="track-full-text">${t.text}</p>
                    <span class="track-meta">${t.text.split(' ').length} PALABRAS</span>
                </div>
            </div>
        `).join('');
        document.getElementById('track-prev').disabled = UI.trackPage === 0;
        document.getElementById('track-next').disabled = (start + 20) >= tracks.length;
        document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
    },
    changeTrackPage(delta) {
        const tracks = CT.db('p'); const nextStart = (UI.trackPage + delta) * 20;
        if(nextStart >= 0 && nextStart < tracks.length) { UI.trackPage += delta; this.renderTrackList(); }
    },

    openCropModal(src) {
        const img = document.getElementById('crop-image'); img.src = src;
        img.onload = () => {
            UI.cropScale = 1; UI.cropX = 0; UI.cropY = 0; document.getElementById('crop-zoom').value = 1;
            const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight;
            if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } 
            else { img.style.width = containerW + 'px'; img.style.height = 'auto'; }
            UI.updateCropTransform(); document.getElementById('crop-modal').classList.remove('hidden'); UI.setupCropEvents();
        };
    },
    closeCropModal() { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    updateCropTransform() {
        const img = document.getElementById('crop-image');
        img.style.transform = `translate(-50%, -50%) translate(${UI.cropX}px, ${UI.cropY}px) scale(${UI.cropScale})`;
        img.style.left = '50%'; img.style.top = '50%';
    },
    setupCropEvents() {
        const area = document.getElementById('crop-area');
        const startDrag = (e) => { UI.isDragging = true; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.startX = cx - UI.cropX; UI.startY = cy - UI.cropY; };
        const moveDrag = (e) => { if(!UI.isDragging) return; const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; UI.cropX = cx - UI.startX; UI.cropY = cy - UI.startY; UI.updateCropTransform(); };
        const endDrag = () => { UI.isDragging = false; };
        area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag;
        area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag;
        document.getElementById('crop-zoom').oninput = (e) => { UI.cropScale = e.target.value; UI.updateCropTransform(); };
    }
};

const App = {
    currentTrack: null, activeEngine: null,
    startRandomRace: () => { const tracks = CT.db('p'); if(!tracks || tracks.length === 0) return alert("Crea una pista."); App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(App.currentTrack); },
    startRaceWithTrack: (id) => { const track = CT.db('p').find(t => t.id === id); if(track) { App.currentTrack = track; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track); } },
    retryRace: () => { if(App.activeEngine) App.activeEngine.stop(); if(App.currentTrack) App.activeEngine = new Engine(App.currentTrack); },
    nextRace: () => { if(App.activeEngine) App.activeEngine.stop(); App.startRandomRace(); },
    quitRace: () => { if(App.activeEngine) App.activeEngine.stop(); UI.showLobby(); },
    editDisplayName: () => { const u = CT.ses(); if(!u) return; const newName = prompt("Nuevo nombre:", u.n); if(newName && newName.trim()) { let users = CT.db('u'); const idx = users.findIndex(x => x.h === u.h); users[idx].n = newName; CT.save('u', users); let scores = CT.db('s'); scores.forEach(s => { if(s.h === u.h) s.n = newName; }); CT.save('s', scores); UI.showProfile('me'); } },
    login: () => { const hInp = document.getElementById('login-user').value.toLowerCase(); const p = document.getElementById('login-pass').value; const handle = hInp.startsWith('@') ? hInp : '@' + hInp; const u = CT.db('u').find(x => x.h === handle && x.p === p); if(u) { sessionStorage.setItem('ct_ses', JSON.stringify(u)); UI.initLobby(); } else alert("Error"); },
    register: () => { const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; let uList = CT.db('u'); if(uList.some(x => x.h === handle)) return alert("En uso"); const role = (uList.length === 0 || handle === '@angel') ? 'admin' : 'usuario'; uList.push({ h: handle, n, p, r: role, a: '', hi: [] }); CT.save('u', uList); UI.toggleAuth(true); },
    savePhrase: () => { const titleInp = document.getElementById('phrase-title'); const textInp = document.getElementById('phrase-input'); if(!titleInp.value || !textInp.value) return alert("Faltan datos"); let p = CT.db('p'); if(CT.editIdx !== null) { p[CT.editIdx].title = titleInp.value; p[CT.editIdx].text = textInp.value; CT.editIdx = null; document.getElementById('btn-save-phrase').innerText = "GUARDAR"; } else { p.push({ id: Date.now(), title: titleInp.value, text: textInp.value }); } CT.save('p', p); titleInp.value = ''; textInp.value = ''; UI.renderAdminP(); },
    logout: () => { sessionStorage.clear(); location.reload(); },

    saveCrop: () => {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext('2d');
        const img = document.getElementById('crop-image');
        const imgW = img.naturalWidth; const imgH = img.naturalHeight;
        let baseScale; if (imgW > imgH) { baseScale = 220 / imgH; } else { baseScale = 220 / imgW; }
        const viewerImgW = imgW * baseScale; const viewerImgH = imgH * baseScale;
        const sW = (imgW * 220) / (viewerImgW * UI.cropScale);
        const sH = (imgH * 220) / (viewerImgH * UI.cropScale);
        const sX = (((viewerImgW * UI.cropScale) / 2) - UI.cropX - 110) * (imgW / (viewerImgW * UI.cropScale));
        const sY = (((viewerImgH * UI.cropScale) / 2) - UI.cropY - 110) * (imgH / (viewerImgH * UI.cropScale));
        
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,256,256);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, 256, 256); 
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88); 
        
        let users = CT.db('u'); const idx = users.findIndex(x => x.h === CT.ses().h);
        users[idx].a = compressedBase64; CT.save('u', users); 
        let scores = CT.db('s'); scores.forEach(s => { if(s.h === CT.ses().h) s.a = compressedBase64; });
        CT.save('s', scores);
        UI.closeCropModal(); UI.showProfile('me');
    }
};

// MOTOR DE JUEGO (PENALIZACIÓN ESTRICTA TYPERACER APLICADA)
class Engine {
    constructor(trackObj) { 
        this.track = trackObj; this.t = trackObj.text; this.w = this.t.split(' '); 
        this.i = 0; this.c = 0; this.s = null; this.timer = null; this.init(); 
    }
    stop() { if(this.timer) clearInterval(this.timer); this.timer = null; }
    init() { 
        UI.show('game-screen'); 
        document.getElementById('game-result-modal').classList.add('hidden');
        document.getElementById('game-input').classList.remove('hidden');
        document.getElementById('in-game-controls').classList.remove('hidden');
        document.getElementById('target-text').innerHTML = this.w.map((w,idx) => `<span class="word ${idx===0?'active':''}">${w}</span>`).join(' '); 
        document.getElementById('game-timer').innerText = '0s';
        document.getElementById('game-speed-display').innerText = '0';
        const inp = document.getElementById('game-input'); inp.value = ''; inp.disabled = false; inp.focus(); 
        inp.oninput = (e) => this.check(e.target.value, e.target); 
    }
    check(v, el) { 
        if(!this.s) { 
            this.s = new Date(); 
            this.timer = setInterval(() => { 
                const sec = (new Date()-this.s)/1000; 
                if(document.getElementById('game-timer')) document.getElementById('game-timer').innerText = Math.floor(sec)+'s'; 
                if(document.getElementById('game-speed-display')) {
                    const currentCPM = Math.round(this.c/(sec/60));
                    document.getElementById('game-speed-display').innerText = UI.formatValue(currentCPM);
                }
            }, 500); 
        } 
        
        const cur = this.w[this.i]; 
        const spans = document.querySelectorAll('.word'); 
        const activeSpan = spans[this.i];
        const last = this.i === this.w.length - 1; 

        let typed = v;
        let isSubmitting = false;
        
        if (!last && typed.endsWith(' ')) {
            isSubmitting = true;
            typed = typed.slice(0, -1);
        }

        // Lógica Estricta de validación
        let isPrefixValid = cur.startsWith(typed);

        if (isPrefixValid) {
            el.classList.remove('input-error');
            // Letras correctas en verde
            activeSpan.innerHTML = `<span style="color:var(--ok)">${typed}</span>${cur.slice(typed.length)}`;
        } else {
            // "Castigo" TypeRacer: Bloqueo en rojo, obliga a borrar
            el.classList.add('input-error');
            let matchLen = 0;
            while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            
            let correctPart = cur.slice(0, matchLen);
            let errLen = typed.length - matchLen;
            let wordWrongPart = cur.slice(matchLen, matchLen + errLen);
            let remPart = cur.slice(matchLen + wordWrongPart.length);
            
            // Fondo rojo para el error visible
            activeSpan.innerHTML = `<span style="color:var(--ok)">${correctPart}</span><span style="background:rgba(244,67,54,0.4);color:var(--err)">${wordWrongPart}</span>${remPart}`;
        }

        // Sumisión de la palabra
        if (isSubmitting || (last && v === cur)) {
            if (typed === cur && isPrefixValid) {
                // Avance correcto
                this.c += cur.length + (last ? 0 : 1);
                activeSpan.className = 'word correct';
                activeSpan.innerHTML = cur; 
                this.i++; 
                el.value = ''; 
                el.classList.remove('input-error');
                if(this.i < this.w.length) spans[this.i].classList.add('active'); else this.end(); 
            } else {
                // Impide avanzar si la palabra es incorrecta, obligando a corregir
                el.value = v; 
                el.classList.add('input-error');
            }
        }
    }
    end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000;
        const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        const s_ses = JSON.parse(sessionStorage.getItem('ct_ses')); const u = s_ses ? (CT.db('u')).find(x => x.h === s_ses.h) : null; 
        if(u) {
            let users = CT.db('u'); const uIdx = users.findIndex(x => x.h === u.h); users[uIdx].hi.push(finalCPM); CT.save('u', users); 
            const dateStr = CT.getARDate();
            let s = CT.db('s'); s.unshift({ id: Date.now().toString(), n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title }); CT.save('s', s); 
        }
        
        document.getElementById('game-input').classList.add('hidden');
        document.getElementById('in-game-controls').classList.add('hidden');
        
        const finalSpeedValue = UI.formatValue(finalCPM);
        const finalUnitLabel = CT.currentUnit.toUpperCase();
        document.getElementById('final-speed-display').innerText = finalSpeedValue + " " + finalUnitLabel;
        
        document.getElementById('game-result-modal').classList.remove('hidden');
    }
}

CT.init();
document.addEventListener('DOMContentLoaded', () => { if(CT.ses()) UI.initLobby(); else UI.show('auth-screen'); });

document.getElementById('img-input').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if(!validTypes.includes(file.type)) { alert("Formato no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)."); e.target.value = ''; return; }
    if(file.size > 5 * 1024 * 1024) { alert("La imagen es demasiado pesada. Máximo 5MB."); e.target.value = ''; return; }
    const r = new FileReader();
    r.onload = (ev) => { UI.openCropModal(ev.target.result); };
    r.readAsDataURL(file);
};
