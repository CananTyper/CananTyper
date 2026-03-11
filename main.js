// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDlDLS1X6u3zodYVadV4T-hw5Uq7eHHuFk",
    authDomain: "canantyper.firebaseapp.com",
    projectId: "canantyper",
    storageBucket: "canantyper.firebasestorage.app",
    messagingSenderId: "55384940628",
    appId: "1:55384940628:web:6211a5e6c8bc36694e8dc1"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. CORE DE DATOS
const CT = {
    data: { u: [], s: [], p: [], c: [], a: [], ui: null, maint: null }, 
    defAvatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    currentUnit: 'cpm', charPerWord: 5,
    editIdx: null, profPage: 0, activeProfHandle: null,
    
    getARDate: () => { return new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }); },
    dbLocal: (k) => CT.data[k] || [], 
    
    init: function() {
        let storedUnit = localStorage.getItem('ct_unit_pref');
        if (storedUnit !== 'cpm' && storedUnit !== 'wpm' && storedUnit !== 'zen') { storedUnit = 'cpm'; localStorage.setItem('ct_unit_pref', 'cpm'); }
        this.currentUnit = storedUnit;
        document.documentElement.setAttribute('data-theme', this.currentUnit);

        const cU = localStorage.getItem('ct_cache_u');
        const cS = localStorage.getItem('ct_cache_s');
        const cP = localStorage.getItem('ct_cache_p');
        const cC = localStorage.getItem('ct_cache_c');
        if(cU) this.data.u = JSON.parse(cU);
        if(cS) this.data.s = JSON.parse(cS);
        if(cP) this.data.p = JSON.parse(cP);
        if(cC) this.data.c = JSON.parse(cC);

        UI.updateUnitVisuals(this.currentUnit);
        
        // Listener Kill Switch (Mantenimiento)
        db.collection('config').doc('maintenance').onSnapshot(snap => {
            if(snap.exists) {
                this.data.maint = snap.data();
            } else {
                this.data.maint = { active: false, icon: '🛠️', title: 'Mantenimiento', msg: 'Estamos actualizando el servidor.' };
                if(this.ses() && this.ses().r === 'admin') db.collection('config').doc('maintenance').set(this.data.maint);
            }
            UI.checkMaintenance();
        });

        // Autenticación con localStorage (Persistente)
        if(this.ses()) { UI.initLobby(); } else { UI.show('auth-screen'); }

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
                const seed = { id: 1, title: "1", c: "General", text: "La programación es un arte competitivo. En el código limpio se encuentra la verdadera maestría." };
                db.collection('phrases').doc("1").set(seed);
            }
            localStorage.setItem('ct_cache_p', JSON.stringify(this.data.p));
            UI.refreshActiveViews(); 
        });
        db.collection('categories').onSnapshot(snap => { 
            this.data.c = snap.docs.map(d => d.data()); 
            if(this.data.c.length === 0) { db.collection('categories').doc("General").set({name: "General"}); }
            localStorage.setItem('ct_cache_c', JSON.stringify(this.data.c));
            UI.updateCategorySelects();
            UI.refreshActiveViews(); 
        });

        db.collection('announcements').orderBy('id', 'desc').onSnapshot(snap => {
            this.data.a = snap.docs.map(d => d.data());
            UI.refreshActiveViews();
        });

        db.collection('config').doc('announcement').onSnapshot(snap => {
            if(snap.exists && this.ses()) {
                const data = snap.data();
                const lastSeen = localStorage.getItem('ct_last_announcement');
                if(data.id && data.id.toString() !== lastSeen) {
                    UI.showAnnouncement(data);
                }
            }
        });

        // LÉXICO EXPANDIDO
        db.collection('config').doc('ui_texts').onSnapshot(snap => {
            const defaults = {
                't_auth_title': { l: 'Título de Inicio', v: 'CananTyper' },
                't_auth_sub': { l: 'Subtítulo de Inicio', v: 'Mecanografía' },
                't_btn_login': { l: 'Botón: Iniciar sesión', v: 'Iniciar sesión' },
                't_btn_register': { l: 'Botón: Crear Cuenta', v: 'CREAR CUENTA' },
                't_txt_new': { l: 'Texto: ¿Nuevo?', v: '¿Nuevo? Registrarse' },
                't_txt_haveacc': { l: 'Texto: ¿Tenés cuenta?', v: '¿Tenés cuenta? Inicia sesión' },
                't_btn_random': { l: 'Botón: Modo Aleatorio', v: 'MODO ALEATORIO' },
                't_btn_custom': { l: 'Botón: Modo Personalizado', v: 'MODO PERSONALIZADO' },
                't_admin_title': { l: 'Título Panel Admin', v: 'CananTyper' },
                't_admin_sub': { l: 'Subtítulo Panel Admin', v: 'Panel de administración' },
                't_nav_admin': { l: 'Menú: Administración', v: 'Administración' },
                't_nav_stats': { l: 'Menú: Estadísticas', v: 'Estadísticas' },
                't_nav_logout': { l: 'Menú: Cerrar sesión', v: 'Cerrar sesión' },
                't_hd_rank_races': { l: 'Título: Ranking Carreras', v: 'Ranking | Carreras' },
                't_hd_rank_avg': { l: 'Título: Ranking Promedios', v: 'Ranking | Promedios' },
                't_hd_stats': { l: 'Título: Estadísticas', v: 'Estadísticas' },
                't_hd_stats_sub': { l: 'Subtítulo: Estadísticas', v: 'Análisis de rendimiento' },
                't_hd_track': { l: 'Título: Personalizado', v: 'Modo Personalizado' },
                't_hd_track_sub': { l: 'Subtítulo: Personalizado', v: 'Selecciona una categoría o texto' },
                't_st_box_top10': { l: 'Caja: Mejores Carreras', v: 'Mejores Carreras (TOP 10)' },
                't_st_box_texts': { l: 'Caja: Mejores Textos', v: 'Mejores Textos (Top 10)' },
                't_btn_back': { l: 'Juego Botón: Volver', v: 'Volver' },
                't_btn_retry': { l: 'Juego Botón: Repetir', v: 'Repetir' },
                't_btn_new': { l: 'Juego Botón: Nueva', v: 'Nueva' },
                't_btn_cont': { l: 'Juego Botón: Continuar', v: 'Continuar' },
                't_btn_retry2': { l: 'Result Botón: Repetir', v: 'Repetir' },
                't_btn_back2': { l: 'Result Botón: Volver', v: 'Volver' },
                't_prof_races': { l: 'Perfil: Carreras', v: 'CARRERAS' },
                't_tab_ann': { l: 'Admin Tab: Anuncios', v: 'Anuncios' },
                't_tab_lex': { l: 'Admin Tab: Léxico', v: 'Léxico' },
                't_tab_srv': { l: 'Admin Tab: Servidor', v: 'Servidor' },
                't_tab_usr': { l: 'Admin Tab: Usuarios', v: 'Usuarios' },
                't_tab_rac': { l: 'Admin Tab: Carreras', v: 'Carreras' },
                't_tab_txt': { l: 'Admin Tab: Textos', v: 'Textos' },
                't_tab_cre': { l: 'Admin Tab: Crear', v: 'Crear' }
            };

            if(snap.exists) {
                this.data.ui = { ...defaults, ...snap.data() };
            } else {
                this.data.ui = defaults;
            }
            UI.applyUITexts();
            UI.refreshActiveViews();
        });
    },
    ses: () => { 
        const s = JSON.parse(localStorage.getItem('ct_ses')); 
        return s ? (CT.data.u || []).find(x => x.h === s.h) : null; 
    }
};

const UI = {
    trackPage: 0, adminRacePage: 0, adminPhrasePage: 0, activeAdminCat: null, activeTrackCat: null,
    lexiconPage: 0, 
    cropX: 0, cropY: 0, cropScale: 1, isDragging: false, startX: 0, startY: 0,
    currentAnnId: null, 
    formatValue: (cpm) => { return (CT.currentUnit === 'wpm') ? Math.round(cpm / CT.charPerWord) : cpm; },

    // GESTIÓN DEL KILL SWITCH
    checkMaintenance: () => {
        if(!CT.data.maint) return;
        const m = CT.data.maint;
        const u = CT.ses();
        const isAdmin = u && u.r === 'admin';

        if(m.active && !isAdmin) {
            document.getElementById('maint-icon-display').innerText = m.icon || '🛠️';
            document.getElementById('maint-title-display').innerText = m.title || 'Mantenimiento';
            document.getElementById('maint-msg-display').innerText = m.msg || 'Volvemos pronto.';
            UI.show('maintenance-screen');
        } else {
            if(!document.getElementById('maintenance-screen').classList.contains('hidden')) {
                if(u) UI.showLobby();
                else UI.show('auth-screen');
            }
        }

        // Actualizar botón en el panel de Admin
        const toggleBtn = document.getElementById('btn-maint-toggle');
        if(toggleBtn) {
            if(m.active) {
                toggleBtn.innerText = "⛔ MANTENIMIENTO: ACTIVADO (WEB BLOQUEADA)";
                toggleBtn.style.borderColor = "var(--error)";
                toggleBtn.style.color = "var(--error)";
            } else {
                toggleBtn.innerText = "✅ MANTENIMIENTO: DESACTIVADO (WEB PÚBLICA)";
                toggleBtn.style.borderColor = "var(--success)";
                toggleBtn.style.color = "var(--success)";
            }
        }
    },

    show: (id) => { 
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
        document.getElementById(id).classList.remove('hidden');
    },
    toggleAuth: (login) => { 
        document.getElementById('login-form').classList.toggle('hidden', !login); 
        document.getElementById('register-form').classList.toggle('hidden', login); 
    },
    initLobby() {
        if(CT.data.maint && CT.data.maint.active) {
            const u = CT.ses();
            if(!u || u.r !== 'admin') { UI.checkMaintenance(); return; }
        }

        const u = CT.ses(); if(!u) return this.show('auth-screen');
        document.getElementById('val-display-name').innerText = u.n;
        document.getElementById('val-username').innerText = u.h;
        document.getElementById('lobby-avatar').src = u.a || CT.defAvatar;
        
        document.getElementById('t_nav_admin').classList.toggle('hidden', u.r !== 'admin');
        
        UI.updateUnitVisuals(CT.currentUnit);
        this.renderGlobal(); this.show('home-screen');
    },
    showLobby() { this.initLobby(); },
    
    showAdmin() { this.switchTab('announcements'); UI.updateUnitVisuals(CT.currentUnit); this.show('admin-screen'); },

    showStats() {
        this.switchStatsTab('personal');
        UI.updateUnitVisuals(CT.currentUnit);
        this.show('stats-screen');
    },
    switchStatsTab(tab) {
        document.getElementById('pane-stats-personal').classList.add('hidden');
        document.getElementById('pane-stats-general').classList.add('hidden');
        document.getElementById('pane-stats-elite').classList.add('hidden');
        
        document.getElementById('t-st-pe').classList.remove('active');
        document.getElementById('t-st-ge').classList.remove('active');
        document.getElementById('t-st-el').classList.remove('active');
        
        document.getElementById(`pane-stats-${tab}`).classList.remove('hidden');
        document.getElementById(`t-st-${tab.substring(0,2)}`).classList.add('active');
        
        if (tab === 'personal') this.renderPersonalStats();
        else if (tab === 'general') this.renderGlobalStats();
        else this.renderEliteStats();
    },

    applyUITexts: () => {
        if(!CT.data.ui) return;
        Object.keys(CT.data.ui).forEach(k => {
            const el = document.getElementById(k);
            if(el) {
                if(k === 't_txt_new') { el.innerHTML = CT.data.ui[k].v.replace('Registrarse', '<span onclick="UI.toggleAuth(false)">Registrarse</span>'); }
                else if(k === 't_txt_haveacc') { el.innerHTML = CT.data.ui[k].v.replace('Inicia sesión', '<span onclick="UI.toggleAuth(true)">Inicia sesión</span>'); }
                else { el.innerText = CT.data.ui[k].v; }
            }
        });
    },

    renderPersonalStats() {
        const u = CT.ses(); if(!u) return;
        const userScores = CT.dbLocal('s').filter(s => s.h === u.h);
        
        document.querySelectorAll('.st-p-owner').forEach(el => el.innerText = u.n);
        
        document.getElementById('st-p-total-races').innerText = userScores.length;
        
        const top10 = [...userScores].sort((a,b) => b.c - a.c).slice(0, 10);
        document.getElementById('st-p-top10-races').innerHTML = top10.map((s, i) => `<tr>
            <td>${i+1}</td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.track}</div></td><td><b style="color:var(--p)">${UI.formatValue(s.c)}</b></td><td>${s.d}</td>
        </tr>`).join('');
        
        const avgGen = userScores.length ? Math.round(userScores.reduce((a,b)=>a+b.c, 0) / userScores.length) : 0;
        document.getElementById('st-p-best-avg').innerText = UI.formatValue(avgGen);
        
        const last10Arr = [...userScores].sort((a,b)=>b.id - a.id).slice(0, 10);
        const avgLast10 = last10Arr.length ? Math.round(last10Arr.reduce((a,b)=>a+b.c, 0) / last10Arr.length) : 0;
        document.getElementById('st-p-last10-avg').innerText = UI.formatValue(avgLast10);
        
        let textMaxes = {};
        userScores.forEach(s => {
            if(!textMaxes[s.track] || s.c > textMaxes[s.track]) textMaxes[s.track] = s.c;
        });
        const topTexts = Object.keys(textMaxes).map(k => ({ t: k, max: textMaxes[k] })).sort((a,b) => b.max - a.max).slice(0, 10);
        document.getElementById('st-p-top10-texts').innerHTML = topTexts.map((tr, i) => `<tr>
            <td><b style="color:var(--p)">#${i+1}</b></td><td><div style="width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.t}</div></td><td><b style="color:var(--p)">${UI.formatValue(tr.max)}</b></td>
        </tr>`).join('');
        
        const phrases = CT.dbLocal('p');
        let catAvgs = {};
        userScores.forEach(s => {
            const trackObj = phrases.find(p => p.title.toString() === s.track.toString());
            const cat = trackObj ? (trackObj.c || 'General') : 'General';
            if(!catAvgs[cat]) catAvgs[cat] = { sum: 0, count: 0 };
            catAvgs[cat].sum += s.c;
            catAvgs[cat].count++;
        });
        let bestCat = "-"; let maxCatAvg = -1;
        for (let c in catAvgs) {
            let avg = catAvgs[c].sum / catAvgs[c].count;
            if(avg > maxCatAvg) { maxCatAvg = avg; bestCat = c; }
        }
        document.getElementById('st-p-best-cat').innerText = bestCat;
    },

    renderGlobalStats() {
        const scores = CT.dbLocal('s'); const users = CT.dbLocal('u'); const phrases = CT.dbLocal('p');
        document.getElementById('st-g-users').innerText = users.length;
        document.getElementById('st-g-races').innerText = scores.length;
        
        const avgGlobal = scores.length ? Math.round(scores.reduce((a,b)=>a+b.c, 0) / scores.length) : 0;
        document.getElementById('st-g-avg').innerText = UI.formatValue(avgGlobal);
        
        let bestRace = { c: 0, n: "Nadie", track: "Ninguno" };
        if(scores.length > 0) bestRace = scores.reduce((prev, current) => (current.c > prev.c) ? current : prev);
        document.getElementById('st-g-record').innerText = UI.formatValue(bestRace.c);
        
        let textCounts = {};
        scores.forEach(s => { textCounts[s.track] = (textCounts[s.track] || 0) + 1; });
        const topTexts = Object.keys(textCounts).map(k => ({ t: k, count: textCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-texts').innerHTML = topTexts.map((tr, i) => `<tr>
            <td><b style="color:var(--p)">#${i+1}</b></td><td>${tr.t}</td><td>${tr.count}</td>
        </tr>`).join('');

        let catCounts = {};
        scores.forEach(s => {
            const trackObj = phrases.find(p => p.title.toString() === s.track.toString());
            const cat = trackObj ? (trackObj.c || 'General') : 'General';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        let topCats = Object.keys(catCounts).map(k => ({ c: k, count: catCounts[k] })).sort((a,b) => b.count - a.count).slice(0, 10);
        document.getElementById('st-g-top-cats').innerHTML = topCats.map((tc, i) => `<tr>
            <td><b style="color:var(--p)">#${i+1}</b></td><td>${tc.c}</td><td>${tc.count}</td>
        </tr>`).join('');
    },

    renderEliteStats() {
        const scores = CT.dbLocal('s'); const phrases = CT.dbLocal('p');
        if (scores.length === 0) return;

        let userRaces = {};
        scores.forEach(s => { userRaces[s.h] = (userRaces[s.h] || 0) + 1; });
        let topRacerH = Object.keys(userRaces).reduce((a, b) => userRaces[a] > userRaces[b] ? a : b);
        let topRacerName = scores.find(s => s.h === topRacerH).n;
        document.getElementById('st-e-most-races-val').innerText = userRaces[topRacerH];
        document.getElementById('st-e-most-races-user').innerText = topRacerName;

        let bestRace = scores.reduce((p, c) => (c.c > p.c) ? c : p);
        document.getElementById('st-e-record-val').innerText = UI.formatValue(bestRace.c);
        document.getElementById('st-e-record-user').innerText = bestRace.n;

        let trackMaxes = {}; 
        scores.forEach(s => {
            if (!trackMaxes[s.track] || s.c > trackMaxes[s.track].c) { trackMaxes[s.track] = { c: s.c, h: s.h, n: s.n }; }
        });
        let top1Counts = {};
        Object.values(trackMaxes).forEach(tm => { top1Counts[tm.h] = (top1Counts[tm.h] || 0) + 1; });
        let mostTop1H = Object.keys(top1Counts).length ? Object.keys(top1Counts).reduce((a, b) => top1Counts[a] > top1Counts[b] ? a : b) : "";
        let mostTop1Name = mostTop1H ? scores.find(s => s.h === mostTop1H).n : "-";
        document.getElementById('st-e-top1-val').innerText = mostTop1H ? top1Counts[mostTop1H] : 0;
        document.getElementById('st-e-top1-user').innerText = mostTop1Name;

        let userSums = {};
        scores.forEach(s => {
            if(!userSums[s.h]) userSums[s.h] = { sum: 0, count: 0, n: s.n };
            userSums[s.h].sum += s.c;
            userSums[s.h].count++;
        });
        let bestAvgH = ""; let bestAvgVal = -1;
        Object.keys(userSums).forEach(h => {
            if (userSums[h].count >= 5) {
                let avg = userSums[h].sum / userSums[h].count;
                if (avg > bestAvgVal) { bestAvgVal = avg; bestAvgH = h; }
            }
        });
        if (bestAvgVal === -1) {
            Object.keys(userSums).forEach(h => {
                let avg = userSums[h].sum / userSums[h].count;
                if (avg > bestAvgVal) { bestAvgVal = avg; bestAvgH = h; }
            });
        }
        document.getElementById('st-e-bestavg-val').innerText = UI.formatValue(Math.round(bestAvgVal));
        document.getElementById('st-e-bestavg-user').innerText = bestAvgH ? userSums[bestAvgH].n : "-";

        let tCounts = {};
        scores.forEach(s => { tCounts[s.track] = (tCounts[s.track] || 0) + 1; });
        let top10T = Object.keys(tCounts).sort((a,b) => tCounts[b] - tCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-texts').innerHTML = top10T.map((tr, i) => {
            let trMax = scores.filter(s => s.track === tr).reduce((p, c) => (c.c > p.c) ? c : p);
            return `<tr><td><b>#${i+1}</b></td><td>${tr}</td><td>${trMax.n}</td><td><b style="color:var(--p)">${UI.formatValue(trMax.c)}</b></td></tr>`;
        }).join('');

        let scoresWithCat = scores.map(s => {
            let tObj = phrases.find(p => p.title.toString() === s.track.toString());
            return { ...s, cat: tObj ? (tObj.c || 'General') : 'General' };
        });
        let cCounts = {};
        scoresWithCat.forEach(s => { cCounts[s.cat] = (cCounts[s.cat] || 0) + 1; });
        let top10C = Object.keys(cCounts).sort((a,b) => cCounts[b] - cCounts[a]).slice(0, 10);
        document.getElementById('st-e-table-cats').innerHTML = top10C.map((cat, i) => {
            let catMax = scoresWithCat.filter(s => s.cat === cat).reduce((p, c) => (c.c > p.c) ? c : p);
            return `<tr><td><b>#${i+1}</b></td><td>${cat}</td><td>${catMax.n}</td><td><b style="color:var(--p)">${UI.formatValue(catMax.c)}</b></td></tr>`;
        }).join('');
    },

    refreshActiveViews: () => {
        if(!document.getElementById('game-screen').classList.contains('hidden')) return; 
        if(!document.getElementById('home-screen').classList.contains('hidden')) UI.renderGlobal();
        if(!document.getElementById('profile-screen').classList.contains('hidden')) UI.showProfile(CT.activeProfHandle || 'me');
        if(!document.getElementById('admin-screen').classList.contains('hidden')) { 
            UI.renderAdminAnn(); UI.renderAdminLexicon(); UI.renderAdminP(); UI.renderAdminR(); UI.renderAdminU(); 
            UI.renderAdminServerConfig();
        }
        if(!document.getElementById('track-screen').classList.contains('hidden')) {
            if(UI.activeTrackCat) UI.renderTrackList(); else UI.showTrackCategorySelect();
        }
        if(!document.getElementById('stats-screen').classList.contains('hidden')) {
            if(!document.getElementById('pane-stats-personal').classList.contains('hidden')) UI.renderPersonalStats();
            else if(!document.getElementById('pane-stats-general').classList.contains('hidden')) UI.renderGlobalStats();
            else UI.renderEliteStats();
        }
    },

    setUnit: (unit) => {
        if(CT.currentUnit === unit) return;
        CT.currentUnit = unit;
        localStorage.setItem('ct_unit_pref', unit);
        UI.updateUnitVisuals(unit);
        UI.refreshActiveViews();
    },

    updateUnitVisuals: (unit) => {
        document.documentElement.setAttribute('data-theme', unit);
        document.querySelectorAll('.unit-switcher .sw-btn').forEach(s => s.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${unit}`);
        if(activeBtn) activeBtn.classList.add('active');

        // FIX ZEN BLUR
        if (unit === 'zen') {
            document.getElementById('game-speed-display').classList.add('zen-blur');
        } else {
            document.getElementById('game-speed-display').classList.remove('zen-blur');
        }

        const label = unit.toUpperCase();
        
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-unit-admin', 'th-st-p-vel', 'th-st-p-t-max', 'th-st-e-t-vel', 'th-st-e-c-vel'];
        thIds.forEach(id => {
            if(document.getElementById(id)) {
                document.getElementById(id).innerText = 'VEL. (' + label + ')';
                document.getElementById(id).classList.add('active-unit');
            }
        });
        
        if(document.getElementById('th-unit-rank')) document.getElementById('th-unit-rank').innerText = 'PROMEDIO ' + label;

        if(document.getElementById('lbl-st-avg')) document.getElementById('lbl-st-avg').innerText = 'PROM. ' + label;
        if(document.getElementById('lbl-st-last')) document.getElementById('lbl-st-last').innerText = 'ÚLT. 10 ' + label;
        if(document.getElementById('lbl-st-best')) document.getElementById('lbl-st-best').innerText = 'RÉCORD ' + label;
        
        if(document.getElementById('lbl-st-p-best-avg')) document.getElementById('lbl-st-p-best-avg').innerText = 'PROM. GENERAL ' + label;
        if(document.getElementById('lbl-st-p-last10-avg')) document.getElementById('lbl-st-p-last10-avg').innerText = 'PROM. ÚLT. 10 ' + label;
        
        if(document.getElementById('lbl-st-g-avg')) document.getElementById('lbl-st-g-avg').innerText = 'PROMEDIO SERVIDOR ' + label;
        if(document.getElementById('lbl-st-g-record')) document.getElementById('lbl-st-g-record').innerText = 'RÉCORD ABSOLUTO ' + label;

        if(document.getElementById('game-unit-label')) document.getElementById('game-unit-label').innerText = label;
    },

    updateCategorySelects() {
        const cats = CT.dbLocal('c');
        const options = cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        const createSel = document.getElementById('new-phrase-category');
        const editSel = document.getElementById('phrase-category');
        const deleteSel = document.getElementById('delete-cat-select');
        
        if(createSel) createSel.innerHTML = options;
        if(editSel) {
            const currentVal = editSel.value;
            editSel.innerHTML = options;
            editSel.value = currentVal || (cats[0] ? cats[0].name : '');
        }
        if(deleteSel) {
            deleteSel.innerHTML = cats.filter(c => c.name !== 'General').map(c => `<option value="${c.name}">${c.name}</option>`).join('');
        }
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
            <td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td>
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
            <td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td>
            <td><b style="color:var(--p)">${UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td>
        </tr>`).join('');
    },

    showProfile(who) {
        try {
            const currentSes = CT.ses(); const targetHandle = (who === 'me') ? currentSes.h : who;
            const u = CT.dbLocal('u').find(x => x.h === targetHandle); if(!u) return;
            CT.activeProfHandle = u.h;
            document.getElementById('prof-name').innerText = u.n;
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
        const scores = CT.dbLocal('s'); 
        const userScores = scores.filter(s => s.h === CT.activeProfHandle).sort((a,b) => b.id - a.id);
        const start = CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr>
            <td><b style="color:var(--p)">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td>
        </tr>`).join('');
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
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`pane-${tab}`).classList.remove('hidden');
        
        let btnId = 't-' + tab.substring(0,2);
        if (tab === 'create') btnId = 't-cr';
        if (tab === 'announcements') btnId = 't_tab_ann';
        if (tab === 'lexicon') btnId = 't_tab_lex';
        if (tab === 'server') btnId = 't_tab_srv';
        if (tab === 'users') btnId = 't_tab_usr';
        if (tab === 'races') btnId = 't_tab_rac';
        if (tab === 'phrases') btnId = 't_tab_txt';
        if (tab === 'create') btnId = 't_tab_cre';

        const activeTabBtn = document.getElementById(btnId);
        if(activeTabBtn) activeTabBtn.classList.add('active');
        
        if(tab === 'announcements') { UI.renderAdminAnn(); }
        if(tab === 'lexicon') { UI.lexiconPage = 0; UI.renderAdminLexicon(); }
        if(tab === 'server') { UI.renderAdminServerConfig(); }
        if(tab === 'phrases') { UI.showAdminPhraseCategories(); }
        if(tab === 'races') { UI.adminRacePage = 0; this.renderAdminR(); }
        if(tab === 'users') { this.renderAdminU(); }
        if(tab === 'create') { this.toggleCreateForm('text'); }
    },

    renderAdminAnn() {
        const list = CT.dbLocal('a');
        document.getElementById('admin-ann-list').innerHTML = list.map(a => `
            <tr>
                <td style="font-size: 1.5rem; text-align: center;">${a.icon}</td>
                <td>
                    <span style="color: ${a.active ? 'var(--p)' : 'var(--text-muted)'}; font-weight: bold; font-size: 0.8rem;">
                        ${a.active ? 'VIGENTE' : 'FINALIZADO'}
                    </span>
                </td>
                <td style="white-space: nowrap; font-size: 0.75rem; color: var(--text-muted); text-align: center;">${a.date}</td>
                <td>
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        ${a.active 
                            ? `<button onclick="App.cancelAnnouncement('${a.id}')" class="btn-outline" style="padding: 4px 8px; border-color: var(--error); color: var(--error);" title="Anular">❌</button>`
                            : `<span style="display: inline-block; width: 30px;"></span>`
                        }
                        <button onclick="App.deleteAnnouncement('${a.id}')" class="btn-outline" style="padding: 4px 8px;" title="Eliminar del Historial">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    renderAdminLexicon() {
        if(!CT.data.ui) return;
        const query = (document.getElementById('lexicon-search').value || "").toLowerCase();
        const listEl = document.getElementById('admin-lexicon-list');
        
        let filtered = Object.keys(CT.data.ui).filter(k => {
            const item = CT.data.ui[k];
            return item.l.toLowerCase().includes(query) || item.v.toLowerCase().includes(query);
        });

        const start = UI.lexiconPage * 20;
        const pageData = filtered.slice(start, start + 20);

        let html = '';
        pageData.forEach(k => {
            const item = CT.data.ui[k];
            html += `
            <li class="admin-list-item" style="border-left: 4px solid var(--p); border-radius: 4px;">
                <div style="display: flex; flex-direction: column; gap: 4px; text-align: left;">
                    <small style="color:var(--text-muted); font-size:0.7rem; font-weight:bold; text-transform: uppercase;">${item.l}</small>
                    <span><b style="color:var(--text-main); font-size:1rem;">${item.v}</b></span>
                </div>
                <button onclick="App.editUIText('${k}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button>
            </li>
            `;
        });
        listEl.innerHTML = html;

        document.getElementById('admin-le-prev').disabled = UI.lexiconPage === 0;
        document.getElementById('admin-le-next').disabled = (start + 20) >= filtered.length;
        document.getElementById('admin-le-page-num').innerText = `Página ${UI.lexiconPage + 1}`;
    },
    changeAdminLexiconPage(delta) {
        const query = (document.getElementById('lexicon-search').value || "").toLowerCase();
        let filtered = Object.keys(CT.data.ui).filter(k => {
            const item = CT.data.ui[k];
            return item.l.toLowerCase().includes(query) || item.v.toLowerCase().includes(query);
        });
        const nextStart = (UI.lexiconPage + delta) * 20;
        if(nextStart >= 0 && nextStart < filtered.length) { UI.lexiconPage += delta; this.renderAdminLexicon(); }
    },

    renderAdminServerConfig() {
        if(!CT.data.maint) return;
        document.getElementById('maint-icon-input').value = CT.data.maint.icon || '🛠️';
        document.getElementById('maint-title-input').value = CT.data.maint.title || 'Mantenimiento';
        document.getElementById('maint-msg-input').value = CT.data.maint.msg || '';
    },

    toggleCreateForm(type) {
        document.getElementById('create-text-form').classList.add('hidden');
        document.getElementById('create-cat-form').classList.add('hidden');
        
        const btnText = document.getElementById('btn-create-text');
        const btnCat = document.getElementById('btn-create-cat');
        
        if(type === 'text') {
            UI.updateCategorySelects();
            document.getElementById('create-text-form').classList.remove('hidden');
            btnText.className = 'btn-primary btn-admin-mode active';
            btnCat.className = 'btn-primary btn-alt btn-admin-mode';
        } else {
            UI.updateCategorySelects();
            document.getElementById('create-cat-form').classList.remove('hidden');
            btnCat.className = 'btn-primary btn-admin-mode active';
            btnText.className = 'btn-primary btn-alt btn-admin-mode';
        }
    },

    showAdminPhraseCategories() {
        UI.activeAdminCat = null;
        document.getElementById('admin-phrase-form').classList.add('hidden');
        document.getElementById('admin-phrase-list-view').classList.add('hidden');
        document.getElementById('admin-phrase-categories').classList.remove('hidden');
        document.getElementById('admin-phrase-search').value = '';
        UI.renderAdminP();
    },
    selectAdminPhraseCategory(cat) {
        UI.activeAdminCat = cat;
        UI.adminPhrasePage = 0;
        document.getElementById('admin-phrase-categories').classList.add('hidden');
        document.getElementById('admin-phrase-list-view').classList.remove('hidden');
        document.getElementById('btn-back-cat-admin').classList.remove('hidden');
        UI.renderAdminP();
    },
    renderAdminP() {
        const query = (document.getElementById('admin-phrase-search').value || "").toLowerCase();
        let tracks = CT.dbLocal('p');
        
        if (query) {
            document.getElementById('admin-phrase-categories').classList.add('hidden');
            document.getElementById('admin-phrase-list-view').classList.remove('hidden');
            document.getElementById('btn-back-cat-admin').classList.add('hidden');
            
            let filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
            const start = UI.adminPhrasePage * 20;
            const pageData = filtered.slice(start, start + 20);
            
            document.getElementById('admin-phrases-list').innerHTML = pageData.map((t, i) => `
                <li class="admin-list-item">
                    <span><b style="color:var(--p)">#${t.title}</b> <small style="color:var(--text-muted); margin-left:10px;">[${t.c || 'General'}]</small></span>
                    <div>
                        <button onclick="UI.prepEdit('${t.id}')" class="btn-outline" style="margin-right:10px;">EDITAR</button>
                        <button onclick="UI.delP('${t.id}')" class="btn-error">BORRAR</button>
                    </div>
                </li>
            `).join('');
            document.getElementById('admin-ph-prev').disabled = UI.adminPhrasePage === 0;
            document.getElementById('admin-ph-next').disabled = (start + 20) >= filtered.length;
            document.getElementById('admin-ph-page-num').innerText = `Página ${UI.adminPhrasePage + 1}`;
        } else if (!UI.activeAdminCat) {
            document.getElementById('admin-phrase-categories').classList.remove('hidden');
            document.getElementById('admin-phrase-list-view').classList.add('hidden');
            
            let cats = CT.dbLocal('c');
            let catCounts = {};
            tracks.forEach(t => { const c = t.c || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
            
            document.getElementById('admin-phrase-categories').innerHTML = cats.map(cat => `
                <div class="cat-card" onclick="UI.selectAdminPhraseCategory('${cat.name}')">
                    <h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span>
                </div>
            `).join('');
        } else {
            document.getElementById('admin-phrase-categories').classList.add('hidden');
            document.getElementById('admin-phrase-list-view').classList.remove('hidden');
            document.getElementById('btn-back-cat-admin').classList.remove('hidden');
            
            let filtered = tracks.filter(t => (t.c || 'General') === UI.activeAdminCat);
            const start = UI.adminPhrasePage * 20;
            const pageData = filtered.slice(start, start + 20);
            
            document.getElementById('admin-phrases-list').innerHTML = pageData.map((t, i) => `
                <li class="admin-list-item">
                    <span><b style="color:var(--p)">#${t.title}</b></span>
                    <div>
                        <button onclick="UI.prepEdit('${t.id}')" class="btn-outline" style="margin-right:10px;">EDITAR</button>
                        <button onclick="UI.delP('${t.id}')" class="btn-error">BORRAR</button>
                    </div>
                </li>
            `).join('');
            document.getElementById('admin-ph-prev').disabled = UI.adminPhrasePage === 0;
            document.getElementById('admin-ph-next').disabled = (start + 20) >= filtered.length;
            document.getElementById('admin-ph-page-num').innerText = `Página ${UI.adminPhrasePage + 1}`;
        }
    },
    changeAdminPhrasePage(delta) {
        const query = (document.getElementById('admin-phrase-search').value || "").toLowerCase();
        let filtered = CT.dbLocal('p');
        if (query) {
            filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
        } else {
            filtered = filtered.filter(t => (t.c || 'General') === UI.activeAdminCat);
        }
        const nextStart = (UI.adminPhrasePage + delta) * 20;
        if(nextStart >= 0 && nextStart < filtered.length) { UI.adminPhrasePage += delta; this.renderAdminP(); }
    },
    prepEdit(idStr) {
        const pList = CT.dbLocal('p');
        const idx = pList.findIndex(t => t.id.toString() === idStr.toString());
        if(idx === -1) return;
        UI.updateCategorySelects();
        document.getElementById('phrase-title').value = pList[idx].title;
        document.getElementById('phrase-category').value = pList[idx].c || 'General';
        document.getElementById('phrase-input').value = pList[idx].text;
        CT.editIdx = idx;
        document.getElementById('admin-phrase-form').classList.remove('hidden');
    },
    cancelEditP() {
        CT.editIdx = null;
        document.getElementById('admin-phrase-form').classList.add('hidden');
        document.getElementById('phrase-title').value = '';
        document.getElementById('phrase-input').value = '';
    },
    delP: (idStr) => { if(confirm("¿Eliminar texto?")) { db.collection('phrases').doc(idStr.toString()).delete(); }},

    renderAdminR() {
        const scores = CT.dbLocal('s'); const query = (document.getElementById('race-search').value || "").toLowerCase();
        let filtered = scores.filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query));
        filtered.sort((a,b) => b.id - a.id);
        
        const start = UI.adminRacePage * 20;
        const pageData = filtered.slice(start, start + 20);

        document.getElementById('admin-races-list').innerHTML = pageData.map((s) => `<tr>
            <td><b>${s.n}</b></td><td><b style="color:var(--p)">${UI.formatValue(s.c)}</b></td><td>${s.track}</td><td>${s.d}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="UI.editRace('${s.id}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button>
                    <button onclick="UI.delRace('${s.id}')" class="btn-error">ELIMINAR</button>
                </div>
            </td>
        </tr>`).join('');

        document.getElementById('admin-ra-prev').disabled = UI.adminRacePage === 0;
        document.getElementById('admin-ra-next').disabled = (start + 20) >= filtered.length;
        document.getElementById('admin-ra-page-num').innerText = `Página ${UI.adminRacePage + 1}`;
    },
    changeAdminRacePage(delta) {
        const query = (document.getElementById('race-search').value || "").toLowerCase();
        let filtered = CT.dbLocal('s').filter(s => s.n.toLowerCase().includes(query) || s.h.toLowerCase().includes(query));
        const nextStart = (UI.adminRacePage + delta) * 20;
        if(nextStart >= 0 && nextStart < filtered.length) { UI.adminRacePage += delta; this.renderAdminR(); }
    },
    editRace: (raceId) => {
        let scores = CT.dbLocal('s'); const idx = scores.findIndex(s => s.id === raceId); if(idx === -1) return;
        const oldCPM = Number(scores[idx].c); const newCPM = prompt("Nuevo CPM (Base exacta local):", oldCPM);
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

    renderAdminU() {
        const query = (document.getElementById('user-search').value || "").toLowerCase();
        let filtered = CT.dbLocal('u').filter(u => u.n.toLowerCase().includes(query) || u.h.toLowerCase().includes(query));
        
        document.getElementById('admin-users-list').innerHTML = filtered.map((u, i) => `<tr>
            <td><div style="display:flex; align-items:center; gap:8px; justify-content:center;"><div class="avatar-xs"><img src="${u.a || CT.defAvatar}"></div><span>${u.n}</span></div></td>
            <td>${u.h}</td><td><span class="role-badge">${u.r}</span></td>
            <td>
                <div class="action-buttons">
                    <button onclick="UI.adminEditUserName('${u.h}')" class="btn-outline" style="color:var(--p); border-color:var(--p);">EDITAR</button>
                    <button onclick="UI.adminResetUserPic('${u.h}')" class="btn-outline">IMAGEN</button>
                    <button onclick="UI.delU('${u.h}')" class="btn-error">ELIMINAR</button>
                </div>
            </td>
        </tr>`).join('');
    },
    adminEditUserName: async (handle) => {
        const u = CT.dbLocal('u').find(x => x.h === handle); if(!u) return;
        const newName = prompt(`Nuevo nombre visible para ${handle}:`, u.n);
        if(newName && newName.trim() !== '' && newName.trim() !== u.n) {
            if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres.");
            await db.collection('users').doc(handle).update({ n: newName.trim() });
            const q = await db.collection('scores').where('h', '==', handle).get();
            const batch = db.batch();
            q.forEach(doc => { batch.update(doc.ref, { n: newName.trim() }); });
            await batch.commit();
        }
    },
    adminResetUserPic: async (handle) => {
        if(confirm(`¿Eliminar la foto de perfil de ${handle}?`)) {
            await db.collection('users').doc(handle).update({ a: '' });
            const q = await db.collection('scores').where('h', '==', handle).get();
            const batch = db.batch();
            q.forEach(doc => { batch.update(doc.ref, { a: '' }); });
            await batch.commit();
        }
    },
    delU: (handle) => { if(confirm(`¿Eliminar al usuario ${handle} por completo?`)) { db.collection('users').doc(handle).delete(); }},

    showTrackSelect() {
        document.getElementById('track-search').value = '';
        UI.activeTrackCat = null;
        UI.showTrackCategorySelect();
        this.show('track-screen');
    },
    showTrackCategorySelect() {
        document.getElementById('track-list-view').classList.add('hidden');
        document.getElementById('track-category-view').classList.remove('hidden');
        const tracks = CT.dbLocal('p');
        const cats = CT.dbLocal('c');
        let catCounts = {};
        tracks.forEach(t => { const c = t.c || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
        
        document.getElementById('track-category-view').innerHTML = cats.map(cat => `
            <div class="cat-card" onclick="UI.selectTrackCategory('${cat.name}')">
                <h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span>
            </div>
        `).join('');
    },
    selectTrackCategory(cat) {
        UI.activeTrackCat = cat;
        UI.trackPage = 0;
        document.getElementById('track-category-view').classList.add('hidden');
        document.getElementById('track-list-view').classList.remove('hidden');
        document.getElementById('btn-back-cat-track').classList.remove('hidden');
        UI.renderTrackList();
    },
    renderTrackList() {
        const query = (document.getElementById('track-search').value || "").toLowerCase();
        let tracks = CT.dbLocal('p');
        
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden');
            document.getElementById('track-list-view').classList.remove('hidden');
            document.getElementById('btn-back-cat-track').classList.add('hidden');
            
            let filtered = tracks.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
            const start = UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
            
            document.getElementById('track-list-full').innerHTML = pageData.map(t => `
                <div class="track-card" onclick="App.startRaceWithTrack(${t.id})">
                    <div class="track-card-id">#${t.title}</div>
                    <div class="track-card-content">
                        <p class="track-card-text">${t.text}</p>
                        <span class="track-card-meta">${t.text.split(' ').length} PALABRAS | [${t.c || 'General'}]</span>
                    </div>
                </div>
            `).join('');
            document.getElementById('track-prev').disabled = UI.trackPage === 0;
            document.getElementById('track-next').disabled = (start + 20) >= filtered.length;
            document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
        } else if (!UI.activeTrackCat) {
            document.getElementById('track-category-view').classList.remove('hidden');
            document.getElementById('track-list-view').classList.add('hidden');
            
            const cats = CT.dbLocal('c');
            let catCounts = {};
            tracks.forEach(t => { const c = t.c || 'General'; catCounts[c] = (catCounts[c] || 0) + 1; });
            
            document.getElementById('track-category-view').innerHTML = cats.map(cat => `
                <div class="cat-card" onclick="UI.selectTrackCategory('${cat.name}')">
                    <h3>${cat.name}</h3><span>${catCounts[cat.name] || 0} TEXTOS</span>
                </div>
            `).join('');
        } else {
            document.getElementById('track-category-view').classList.add('hidden');
            document.getElementById('track-list-view').classList.remove('hidden');
            document.getElementById('btn-back-cat-track').classList.remove('hidden');
            
            let filtered = tracks.filter(t => (t.c || 'General') === UI.activeTrackCat);
            const start = UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
            
            document.getElementById('track-list-full').innerHTML = pageData.map(t => `
                <div class="track-card" onclick="App.startRaceWithTrack(${t.id})">
                    <div class="track-card-id">#${t.title}</div>
                    <div class="track-card-content">
                        <p class="track-card-text">${t.text}</p>
                        <span class="track-card-meta">${t.text.split(' ').length} PALABRAS</span>
                    </div>
                </div>
            `).join('');
            document.getElementById('track-prev').disabled = UI.trackPage === 0;
            document.getElementById('track-next').disabled = (start + 20) >= filtered.length;
            document.getElementById('track-page-num').innerText = `Página ${UI.trackPage + 1}`;
        }
    },
    changeTrackPage(delta) {
        const query = (document.getElementById('track-search').value || "").toLowerCase();
        let filtered = CT.dbLocal('p');
        if (query) {
            filtered = filtered.filter(t => t.title.toString().toLowerCase().includes(query) || t.text.toLowerCase().includes(query));
        } else {
            filtered = filtered.filter(t => (t.c || 'General') === UI.activeTrackCat);
        }
        const nextStart = (UI.trackPage + delta) * 20;
        if(nextStart >= 0 && nextStart < filtered.length) { UI.trackPage += delta; this.renderTrackList(); }
    },

    showAnnouncement(data) {
        if(!data.id) return; 
        UI.currentAnnId = data.id.toString();
        document.getElementById('motd-icon').innerText = data.icon || "🚀";
        document.getElementById('motd-title').innerText = data.title || "Anuncio";
        document.getElementById('motd-msg').innerHTML = data.msg || ""; 
        document.getElementById('announcement-modal').classList.remove('hidden');
    },
    closeAnnouncement() {
        if(UI.currentAnnId) {
            localStorage.setItem('ct_last_announcement', UI.currentAnnId);
        }
        document.getElementById('announcement-modal').classList.add('hidden');
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
    startRandomRace: () => { const tracks = CT.dbLocal('p'); if(!tracks || tracks.length === 0) return alert("No hay textos disponibles."); App.currentTrack = tracks[Math.floor(Math.random() * tracks.length)]; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(App.currentTrack); },
    startRaceWithTrack: (id) => { const track = CT.dbLocal('p').find(t => t.id === id); if(track) { App.currentTrack = track; if(App.activeEngine) App.activeEngine.stop(); App.activeEngine = new Engine(track); } },
    retryRace: () => { if(App.activeEngine) App.activeEngine.stop(); if(App.currentTrack) App.activeEngine = new Engine(App.currentTrack); },
    nextRace: () => { if(App.activeEngine) App.activeEngine.stop(); App.startRandomRace(); },
    quitRace: () => { if(App.activeEngine) App.activeEngine.stop(); UI.showLobby(); },
    
    // KILL SWITCH LOGIC
    toggleMaintenance: () => {
        const current = CT.data.maint ? CT.data.maint.active : false;
        const next = !current;
        const confirmMsg = next 
            ? "⚠️ ¿Seguro que deseas ACTIVAR el mantenimiento? Todos los usuarios no administradores serán expulsados a la pantalla de bloqueo." 
            : "✅ ¿Seguro que deseas DESACTIVAR el mantenimiento? La web volverá a ser pública.";
        
        if(confirm(confirmMsg)) {
            db.collection('config').doc('maintenance').update({ active: next }).catch(e => alert("Error al cambiar estado."));
        }
    },
    saveMaintenanceInfo: () => {
        const icon = document.getElementById('maint-icon-input').value;
        const title = document.getElementById('maint-title-input').value.trim();
        const msg = document.getElementById('maint-msg-input').value.trim();
        if(!title || !msg) return alert("Completa los datos del cartel de mantenimiento.");
        db.collection('config').doc('maintenance').update({ icon, title, msg })
            .then(() => alert("Cartel de mantenimiento actualizado con éxito."))
            .catch(() => alert("Error al guardar el cartel."));
    },

    publishAnnouncement: async () => {
        const title = document.getElementById('ann-title').value.trim();
        const msg = document.getElementById('ann-msg').innerHTML.trim();
        const icon = document.getElementById('ann-icon').value;
        if(!title || !msg || msg === '<br>') return alert("Rellena el título y el mensaje del anuncio.");
        
        if(confirm("¿Seguro que deseas lanzar este Pop-Up a todos los jugadores?")) {
            const annId = Date.now().toString();
            const timeStr = new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit', timeZone: 'America/Argentina/Buenos_Aires'});
            const dateStr = CT.getARDate() + " - " + timeStr;
            
            try {
                const activeDocs = await db.collection('announcements').where('active', '==', true).get();
                const batch = db.batch();
                activeDocs.forEach(d => {
                    batch.update(d.ref, { active: false });
                });
                
                const newAnn = { id: annId, title: title, msg: msg, icon: icon, date: dateStr, active: true };
                batch.set(db.collection('announcements').doc(annId), newAnn);
                batch.set(db.collection('config').doc('announcement'), { id: annId, title: title, msg: msg, icon: icon });
                
                await batch.commit();
                alert("Anuncio publicado con éxito.");
                document.getElementById('ann-title').value = '';
                document.getElementById('ann-msg').innerHTML = '';
            } catch(e) {
                alert("Error al publicar el anuncio.");
                console.error(e);
            }
        }
    },
    cancelAnnouncement: async (idStr) => {
        if(confirm("¿Seguro que deseas anular este anuncio? Dejará de aparecerle a los nuevos usuarios.")) {
            try {
                const batch = db.batch();
                batch.update(db.collection('announcements').doc(idStr.toString()), { active: false });
                
                const activeDoc = await db.collection('config').doc('announcement').get();
                if(activeDoc.exists && activeDoc.data().id === idStr.toString()) {
                    batch.update(db.collection('config').doc('announcement'), { id: null });
                }
                await batch.commit();
            } catch(e) {
                alert("Error al anular anuncio.");
            }
        }
    },
    deleteAnnouncement: async (idStr) => {
        if(confirm("¿Seguro que deseas eliminar permanentemente este anuncio del historial?")) {
            try {
                await db.collection('announcements').doc(idStr.toString()).delete();
                const activeDoc = await db.collection('config').doc('announcement').get();
                if(activeDoc.exists && activeDoc.data().id === idStr.toString()) {
                    await db.collection('config').doc('announcement').update({ id: null });
                }
            } catch(e) {
                alert("Error al eliminar anuncio.");
            }
        }
    },
    
    editUIText: (key) => {
        if(!CT.data.ui || !CT.data.ui[key]) return;
        const currentVal = CT.data.ui[key].v;
        const newVal = prompt(`Editar [${CT.data.ui[key].l}]:`, currentVal);
        if(newVal && newVal.trim() !== currentVal) {
            db.collection('config').doc('ui_texts').update({
                [`${key}.v`]: newVal.trim()
            }).then(() => alert("Actualizado con éxito. Los cambios son en vivo.")).catch(() => alert("Error al conectar con la base de datos."));
        }
    },

    createNewCategory: () => {
        const nameInp = document.getElementById('new-cat-name');
        const catName = nameInp.value.trim();
        if(!catName) return alert("Falta el nombre de la categoría.");
        db.collection('categories').doc(catName).set({ name: catName });
        nameInp.value = ''; alert("Categoría Creada."); UI.toggleCreateForm('text');
    },
    deleteCategory: () => {
        const sel = document.getElementById('delete-cat-select');
        const catName = sel.value;
        if(!catName) return;
        if(catName === 'General') return alert("No puedes eliminar la categoría predeterminada 'General'.");
        if(confirm(`¿Seguro que deseas eliminar la categoría "${catName}"? Los textos dentro de ella pasarán a "General".`)) {
            db.collection('categories').doc(catName).delete();
            let pList = CT.dbLocal('p');
            let updated = false;
            pList.forEach(p => {
                if (p.c === catName) { 
                    p.c = 'General'; updated = true; 
                    db.collection('phrases').doc(p.id.toString()).update({c: 'General'}); 
                }
            });
            if (updated) CT.save('p', pList);
            alert("Categoría eliminada con éxito.");
        }
    },
    createNewPhrase: () => {
        const titleInp = document.getElementById('new-phrase-title');
        const catInp = document.getElementById('new-phrase-category');
        const textInp = document.getElementById('new-phrase-input');
        if(!titleInp.value || !textInp.value) return alert("Faltan datos del texto.");
        
        const idStr = titleInp.value.toString();
        const catValue = catInp.value.trim() || 'General';
        db.collection('phrases').doc(idStr).set({ id: Number(idStr) || Date.now(), title: titleInp.value, c: catValue, text: textInp.value });
        titleInp.value = ''; textInp.value = ''; alert("Texto guardado con éxito.");
    },

    editDisplayName: () => { 
        const u = CT.ses(); if(!u) return; 
        const newName = prompt("Nuevo nombre:", u.n); 
        if(newName && newName.trim() !== '') { 
            if(newName.trim().length > 15) return alert("El nombre no puede exceder los 15 caracteres.");
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
        try {
            const docRef = await db.collection('users').doc(handle).get();
            if(docRef.exists && docRef.data().p === p) { 
                localStorage.setItem('ct_ses', JSON.stringify({h: handle})); 
                if(!CT.data.u.find(u => u.h === handle)) CT.data.u.push(docRef.data());
                UI.initLobby(); 
            } else { alert("Usuario o contraseña incorrectos"); }
        } catch(e) { 
            console.error("Error en login:", e);
            alert("Fallo de conexión a la base de datos"); 
        }
    },
    register: async () => { 
        const n = document.getElementById('reg-display').value; const hRaw = document.getElementById('reg-user').value.toLowerCase(); const handle = hRaw.startsWith('@') ? hRaw : '@' + hRaw; const p = document.getElementById('reg-pass').value; 
        if(!n || !hRaw || !p) return alert("Completa todos los campos");
        if(n.length > 15 || hRaw.length > 15) return alert("El nombre y usuario no pueden exceder los 15 caracteres.");
        try {
            const docRef = await db.collection('users').doc(handle).get();
            if(docRef.exists) return alert("Ese usuario ya está en uso");
            const role = (handle === '@angel') ? 'admin' : 'usuario'; 
            const newUser = { h: handle, n, p, r: role, a: '', hi: [] };
            await db.collection('users').doc(handle).set(newUser);
            UI.toggleAuth(true); alert("Cuenta creada con éxito.");
        } catch(e) { alert("Error al conectar con la Nube"); }
    },
    savePhrase: () => { 
        const catInp = document.getElementById('phrase-category'); 
        const textInp = document.getElementById('phrase-input'); 
        if(!textInp.value) return alert("Faltan datos");
        
        if(CT.editIdx !== null) { 
            const pList = CT.dbLocal('p'); 
            const idxStr = pList[CT.editIdx].id.toString();
            const catValue = catInp.value.trim() || 'General';
            db.collection('phrases').doc(idxStr).update({ c: catValue, text: textInp.value });
            UI.cancelEditP();
        } 
    },
    logout: () => { localStorage.removeItem('ct_ses'); location.reload(); },

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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); 
        
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
        
        const inp = document.getElementById('game-input'); 
        inp.value = ''; inp.disabled = false; inp.focus(); 
        
        inp.onpaste = (e) => { e.preventDefault(); return false; };
        inp.oncopy = (e) => { e.preventDefault(); return false; };
        inp.oncontextmenu = (e) => { e.preventDefault(); return false; };
        
        inp.oninput = (e) => this.check(e.target.value, e.target); 
        
        inp.onblur = () => { if(!inp.disabled) inp.focus(); };

        const display = document.getElementById('target-text');
        display.style.fontSize = '1.6rem';
        setTimeout(() => {
            let size = 1.6;
            while (display.scrollHeight > display.clientHeight && size > 0.8) {
                size -= 0.05;
                display.style.fontSize = size + 'rem';
            }
        }, 10);
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
        
        if (v.length > cur.length + 5) {
            v = v.slice(0, cur.length + 5);
            el.value = v;
        }
        
        let typed = v; let isSubmitting = false;
        if (!last && typed.endsWith(' ')) { isSubmitting = true; typed = typed.slice(0, -1); }

        let isPrefixValid = cur.startsWith(typed);
        if (isPrefixValid) {
            el.classList.remove('input-error');
            activeSpan.innerHTML = `<span class="char-ok">${typed}</span>${cur.slice(typed.length)}`;
        } else {
            el.classList.add('input-error');
            let matchLen = 0;
            while(matchLen < typed.length && matchLen < cur.length && typed[matchLen] === cur[matchLen]) matchLen++;
            let correctPart = cur.slice(0, matchLen); let errLen = typed.length - matchLen;
            let wordWrongPart = cur.slice(matchLen, matchLen + errLen); let remPart = cur.slice(matchLen + wordWrongPart.length);
            activeSpan.innerHTML = `<span class="char-ok">${correctPart}</span><span class="char-err">${wordWrongPart}</span>${remPart}`;
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
    end() { 
        this.stop(); 
        const sec = (new Date()-this.s)/1000;
        const finalCPM = Math.round(this.c/(sec/60)) || 0; 
        
        document.getElementById('game-input').disabled = true; 
        document.getElementById('game-input').classList.add('hidden');
        document.getElementById('in-game-controls').classList.add('hidden');
        
        // FIX: Mostrar el resultado final desencriptado si es ZEN
        const finalUnitLabel = CT.currentUnit === 'zen' ? 'CPM (ZEN)' : CT.currentUnit.toUpperCase();
        const finalSpeedValue = CT.currentUnit === 'wpm' ? Math.round(finalCPM/5) : finalCPM;
        
        document.getElementById('final-speed-display').innerText = finalSpeedValue + " " + finalUnitLabel;
        document.getElementById('game-result-modal').classList.remove('hidden');

        const u = CT.ses(); 
        if(u) {
            const dateStr = CT.getARDate();
            const scoreId = Date.now().toString();
            
            u.hi.push(finalCPM);
            let sList = CT.dbLocal('s');
            const newScore = { id: scoreId, n: u.n, h: u.h, c: finalCPM, a: u.a, d: dateStr, track: this.track.title };
            sList.unshift(newScore);
            CT.data.s = sList;

            db.collection('users').doc(u.h).update({ hi: firebase.firestore.FieldValue.arrayUnion(finalCPM) }); 
            db.collection('scores').doc(scoreId).set(newScore); 
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { CT.init(); });

document.getElementById('img-input').onchange = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if(!validTypes.includes(file.type)) { alert("Formato no válido."); e.target.value = ''; return; }
    if(file.size > 5 * 1024 * 1024) { alert("Máximo 5MB."); e.target.value = ''; return; }
    const r = new FileReader();
    r.onload = (ev) => { UI.openCropModal(ev.target.result); };
    r.readAsDataURL(file);
};
