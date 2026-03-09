const firebaseConfig = {
    apiKey: "AIzaSyDlDLS1X6u3zodYVadV4T-hw5Uq7eHHuFk",
    authDomain: "canantyper.firebaseapp.com",
    projectId: "canantyper",
    storageBucket: "canantyper.firebasestorage.app",
    messagingSenderId: "55384940628",
    appId: "1:55384940628:web:6211a5e6c8bc36694e8dc1"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const CT = {
    data: { u: [], s: [], p: [] }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5,
    editIdx: null, profPage: 0, activeProfHandle: null,
    
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    dbLocal: (k) => CT.data[k], 
    
    init: function() {
        const storedUnit = localStorage.getItem('ct_unit_pref');
        if(storedUnit) this.currentUnit = storedUnit;

        // Carga Cero-Lag (Cache local)
        const localU = localStorage.getItem('ct_cache_u');
        const localS = localStorage.getItem('ct_cache_s');
        const localP = localStorage.getItem('ct_cache_p');
        
        if (localU) this.data.u = JSON.parse(localU);
        if (localS) this.data.s = JSON.parse(localS);
        if (localP) this.data.p = JSON.parse(localP);

        if(this.ses()) UI.initLobby(); else UI.show('auth-screen');

        // Sincronización en segundo plano con Firebase
        db.collection('users').onSnapshot(snap => { 
            this.data.u = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_u', JSON.stringify(this.data.u));
            UI.refreshActiveViews(); 
        });
        db.collection('scores').onSnapshot(snap => { 
            this.data.s = snap.docs.map(d => d.data()); 
            localStorage.setItem('ct_cache_s', JSON.stringify(this.data.s));
            UI.refreshActiveViews(); 
        });
        db.collection('phrases').onSnapshot(snap => { 
            this.data.p = snap.docs.map(d => d.data()); 
            if(this.data.p.length === 0) {
                db.collection('phrases').doc("1").set({ id: 1, title: "1", text: "La programación es un arte competitivo. En el código limpio se encuentra la verdadera maestría." });
            }
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p));
            UI.refreshActiveViews(); 
        });
    },
    ses: () => { 
        const s = JSON.parse(sessionStorage.getItem('ct_ses')); 
        return s ? CT.data.u.find(x => x.h === s.h) : null; 
    }
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

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; // No refrescar si está jugando
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
        if(!document.getElementById('admin-screen').classList.contains('hidden')) { UI.renderAdminP(); UI.renderAdminR(); UI.renderAdminU(); }
        if(!document.getElementById('track-screen').classList.contains('hidden')) UI.renderTrackList();
    },

    // LÓGICA DE INTERRUPTOR CERO FALLOS
    toggleUnits: () => {
        CT.currentUnit = (CT.currentUnit === 'cpm') ? 'wpm' : 'cpm';
        localStorage.setItem('ct_unit_pref', CT.currentUnit);
        UI.updateUnitVisuals(CT.currentUnit);
        UI.refreshActiveViews();
    },

    updateUnitVisuals: (unit) => {
        // Interfaz
        document.querySelectorAll('.unit-switcher span').forEach(s => s.classList.remove('active'));
        document.getElementById(`unit-${unit}`).classList.add('active');
        
        // Inyección de Raíz (Absoluta precisión de CSS)
        document.documentElement.setAttribute('data-theme', unit);

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
    },

    renderGlobal() {
        const scores = CT.dbLocal('s'); const users = CT.dbLocal('u'); const todayAR = CT.getARDate();
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
            const u = CT.dbLocal('u').find(x => x.h === targetHandle); if(!u) return;
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
        const scores = CT.dbLocal('s'); const userScores = scores.filter(s => s.h === CT.activeProfHandle);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td style="color:var(--p)"><b>${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td></tr>`).join('');
        document.getElementById('prof-prev').disabled = CT.profPage === 0;
        document.getElementById('prof-next').disabled = (start + 10) >= userScores.length;
        document.getElementById('prof-page-num').innerText = `Página ${CT.profPage + 1}`;
    },
    changeProfPage(delta) { 
        const userScores = CT.dbLocal('s').filter(s => s.h === CT.activeProfHandle); const nextStart = (CT.profPage + delta) * 10;
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
        const scores = CT.dbLocal('s'); const query = (document.getElementById('race-search').value || "").toLowerCase();
        let filtered = scores.filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query));
        document.getElementById('admin-races-list').innerHTML = filtered.map((s) => `<tr><td><b>${s.n}</b></td><td style="color:var(--p)"><b>${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td><td><button onclick="UI.editRace('${s.id}')" class="btn-exit-outline" style="border-color:var(--p);color:var(--p); margin-right:5px;">EDITAR</button><button onclick="UI.delRace('${s.id}')" class="btn-exit-outline" style="color:#f44;border-color:#400">ELIMINAR</button></td></tr>`).join('');
    },
    editRace: (raceId) => {
        let scores = CT.dbLocal('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return;
        const oldCPM = Number(scores[idx].c); const newCPM = prompt("Nuevo CPM (Base exacta):", oldCPM);
        if(!newCPM || isNaN(newCPM)) return;
        const targetCPM = parseInt(newCPM); 
        db.collection('scores').doc(raceId).update({ c: targetCPM });
        const u = CT.dbLocal('u').find(u => u.h === scores[idx].h);
        if(u) { let hi = u.hi; const hIdx = hi.indexOf(oldCPM); if(hIdx !== -1) { hi[hIdx] = targetCPM; db.collection('users').doc(u.h).update({ hi: hi }); } }
    },
    delRace: (raceId) => {
        if(!confirm("¿Eliminar?")) return;
        let scores = CT.dbLocal('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return;
        const raceData = scores[idx]; 
        db.collection('scores').doc(raceId).delete();
        const u = CT.dbLocal('u').find(u => u.h === raceData.h);
        if(u) { let hi = u.hi; const hIdx = hi.indexOf(Number(raceData.c)); if(hIdx !== -1) { hi.splice(hIdx, 1); db.collection('users').doc(u.h).update({ hi: hi }); } }
    },
    renderAdminP() {
        document.getElementById('admin-phrases-list').innerHTML = CT.dbLocal('p').map((t, i) => `<li class="phrase-item"><span><b>#${t.title}</b></span><div><button onclick="UI.prepEdit(${i})" class="btn-exit-outline" style="margin-right:10px;">EDITAR</button><button onclick="UI.delP('${t.id}')" class="btn-exit-outline" style="color:#f44;border-color:#400;">BORRAR</button></div></li>`).join('');
    },
    prepEdit(i) {
        const p = CT.dbLocal('p'); document.getElementById('phrase-title').value = p[i].title; document.getElementById('phrase-input').value = p[i].text; CT.editIdx = i; document.getElementById('btn-save-phrase').innerText = "ACTUALIZAR";
    },
    delP: (idStr) => { if(confirm("¿Eliminar?")) { db.collection('phrases').doc(idStr.toString()).delete(); }},
    renderAdminU() {
        document.getElementById('admin-users-list').innerHTML = CT.dbLocal('u').map((u, i) => `<tr><td>${u.n}</td><td>${u.h}</td><td>${u.r}</td><td><button onclick="UI.delU('${u.h}')" class="btn-exit-outline" style="color:#f44;border-color:#400;">ELIMINAR</button></td></tr>`).join('');
    },
    delU: (handle) => { if(confirm("¿Eliminar usuario?")) { db.collection('users').doc(handle).delete(); }},
    
    showTrackSelect() {
        UI.trackPage = 0; this.renderTrackList(); this.show('track-screen');
    },
    renderTrackList() {
        const tracks = CT.dbLocal('p'); const start = UI.trackPage * 20; const pageData = tracks.slice(start, start + 20);
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
        const tracks = CT.dbLocal('p'); const nextStart = (UI.trackPage + delta) * 20;
        if(nextStart >= 0 && nextStart < tracks.length) { UI.trackPage += delta; this.renderTrackList(); }
    },

    openCropModal(src) {
        const img = document.getElementById('crop-image'); img.src = src;
        img.onload = () => {
            UI.cropScale = 1; UI.cropX = 0; UI.cropY = 0; document.getElementById('crop-zoom').value = 1;
            const containerW = 220; const containerH = 220; const imgW = img.naturalWidth; const imgH = img.naturalHeight;
            if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } else { img.style.width = containerW + 'px'; img.style.height = 'auto'; }
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
    startRandomRace: () => { const tracks = CT.dbLocal('p'); if(!tracks || tracks.length === 0) return alert("Crea una pista."); App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(App.currentTrack); },
    startRaceWithTrack: (id) => { const track = CT.dbLocal('p').find(t => t.id === id); if(track) { App.currentTrack = track; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track); } },
    retryRace: () => { if(App.activeEngine) App.activeEngine.stop(); if(App.currentTrack) App.activeEngine = new Engine(App.currentTrack); },
    nextRace: () => { if(App.activeEngine) App.activeEngine.stop(); App.startRandomRace(); },
    quitRace: () => { if(App.activeEngine) App.activeEngine.stop(); UI.showLobby(); },
    
    editDisplayName: () => { 
        const u = CT.ses(); if(!u) return; 
        const newName = prompt("Nuevo nombre:", u.n); 
        if(newName && newName.trim()) { 
            db.collection('users').doc(u.h).update({ n: newName });
            db.collection('scores').where('h', '==', u.h).get().then(q => {
                const batch = db.batch();
                q.forEach(doc => { batch.update(doc.ref, { n: newName }); });
                batch.commit();
            });
        } 
    },
    login: async () => { 
        const hInp = document.getElementById('login-user').value.toLowerCase(); const p = document.getElementById('login-pass').value; const handle = hInp.startsWith('@') ? hInp : '@' + hInp; 
        const docRef = await db.collection('users').doc(handle).get();
        if(docRef.exists && docRef.data().p === p) { 
            sessionStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
            UI.initLobby(); 
        } else { alert("Usuario o contraseña incorrectos"); }
    },
    register: async () => { 
        const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; 
        const docRef = await db.collection('users').doc(handle).get();
        if(docRef.exists) return alert("Ese usuario ya está en uso");
        const role = (CT.dbLocal('u').length === 0 || handle === '@angel') ? 'admin' : 'usuario'; 
        const newUser = { h: handle, n, p, r: role, a: '', hi: [] };
        await db.collection('users').doc(handle).set(newUser);
        UI.toggleAuth(true); alert("Cuenta creada con éxito.");
    },
    savePhrase: () => { 
        const titleInp = document.getElementById('phrase-title'); const textInp = document.getElementById('phrase-input'); if(!titleInp.value || !textInp.value) return alert("Faltan datos");
        const p = CT.dbLocal('p'); 
        const idStr = (CT.editIdx !== null) ? p[CT.editIdx].id.toString() : Date.now().toString();
        db.collection('phrases').doc(idStr).set({ id: Number(idStr), title: titleInp.value, text: textInp.value });
        CT.editIdx = null; document.getElementById('btn-save-phrase').innerText = "GUARDAR";
        titleInp.value = ''; textInp.value = ''; 
    },
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
        
        const u = CT.ses();
        if(u) {
            db.collection('users').doc(u.h).update({ a: compressedBase64 });
            db.collection('scores').where('h', '==', u.h).get().then(q => {
                const batch = db.batch();
                q.forEach(doc => { batch.update(doc.ref, { a: compressedBase64 }); });
                batch.commit();
            });
            document.getElementById('prof-img').src = compressedBase64;
        }
        UI.closeCropModal();
    }
};

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
        
        const cur = this.w[this.i]; const spans = document.querySelectorAll('.word'); const activeSpan = spans[this.i]; const last = this.i === this.w.length - 1; 
        let typed = v; let isSubmitting = false;
        if (!last && typed.endsWith(' ')) { isSubmitting = true; typed = typed.slice(0, -1); }

        let isPrefixValid = cur.startsWith(typed);
        if (isPrefixValid) {
            el.classList.remove('input-error');
            activeSpan.innerHTML = `<span style="color:var(--ok)">${typed}</span>${cur.slice(typed.length)}`;
        } else {
            el.classList.add('input-error');
            let matchLen = 0;
            while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let correctPart = cur.slice(0, matchLen); let errLen = typed.length - matchLen;
            let wordWrongPart = cur.slice(matchLen, matchLen + errLen); let remPart = cur.slice(matchLen + wordWrongPart.length);
            activeSpan.innerHTML = `<span style="color:var(--ok)">${correctPart}</span><span style="background:rgba(244,67,54,0.4);color:var(--err)">${wordWrongPart}</span>${remPart}`;
        }

        if (isSubmitting || (last && v === cur)) {
            if (typed === cur && isPrefixValid) {
                this.c += cur.length + (last ? 0 : 1);
                activeSpan.className = 'word correct'; activeSpan.innerHTML = cur; 
                this.i++; el.value = ''; el.classList.remove('input-error');
                if(this.i < this.w.length) spans[this.i].classList.add('active'); else this.end(); 
            } else { el.value = v; el.classList.add('input-error'); }
        }
    }
    
    // CERO LAG: Interfaz inmediata, Base de datos en segundo plano
    end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000;
        const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        // 1. Mostrar Pantalla (0ms de retraso)
        document.getElementById('game-input').classList.add('hidden');
        document.getElementById('in-game-controls').classList.add('hidden');
        const finalSpeedValue = UI.formatValue(finalCPM);
        const finalUnitLabel = CT.currentUnit.toUpperCase();
        document.getElementById('final-speed-display').innerText = finalSpeedValue + " " + finalUnitLabel;
        document.getElementById('game-result-modal').classList.remove('hidden');

        // 2. Procesar en la nube (Fondo)
        setTimeout(() => {
            const u = CT.ses(); 
            if(u) {
                db.collection('users').doc(u.h).update({ hi: firebase.firestore.FieldValue.arrayUnion(finalCPM) }); 
                const dateStr = CT.getARDate();
                const scoreId = Date.now().toString();
                
                // Actualiza espejo local para la tabla
                const newScore = { id: scoreId, n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title };
                let s = CT.dbLocal('s'); s.unshift(newScore); CT.data.s = s;
                
                // Envía a Firebase
                db.collection('scores').doc(scoreId).set(newScore); 
            }
        }, 10);
    }
}

document.addEventListener('DOMContentLoaded', () => { CT.init(); });

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
