// (BÚSCALO EN TU MAIN.JS) - Esto repara el Switch de Unidades 
    setUnit: (unit) => {
        if(CT.currentUnit === unit) return;
        localStorage.removeItem('ct_custom_theme');
        try {
            const u = CT.ses(); 
            if(u && u.theme) { db.collection('users').doc(u.h).update({ theme: firebase.firestore.FieldValue.delete() }); }
        } catch(e){}
        document.documentElement.removeAttribute('data-custom-theme');

        CT.currentUnit = unit; localStorage.setItem('ct_unit_pref', unit); 
        UI.updateUnitVisuals(unit); 
        UI.refreshActiveViews();
    },

    updateUnitVisuals: (unit) => {
        document.documentElement.setAttribute('data-theme', unit);
        document.querySelectorAll('.unit-switcher .sw-btn').forEach(s => s.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${unit}`); if(activeBtn) activeBtn.classList.add('active');
        
        const label = unit === 'zen' ? 'ZEN' : unit.toUpperCase();
        const thIds = ['th-unit-times', 'th-unit-hist', 'th-unit-admin', 'th-st-p-vel', 'th-st-p-t-max', 'th-st-e-t-vel', 'th-st-e-c-vel', 'th_st_p_top10_vel'];
        thIds.forEach(id => { if(document.getElementById(id)) { document.getElementById(id).innerText = 'VEL. (' + label + ')'; document.getElementById(id).classList.add('active-unit'); } });
        
        if(document.getElementById('th-unit-rank')) document.getElementById('th-unit-rank').innerText = 'PROMEDIO ' + label;
        if(document.getElementById('lbl-st-avg')) document.getElementById('lbl-st-avg').innerText = 'PROM. ' + label;
        if(document.getElementById('lbl-st-last')) document.getElementById('lbl-st-last').innerText = 'ÚLT. 10 ' + label;
        if(document.getElementById('lbl-st-best')) document.getElementById('lbl-st-best').innerText = 'RÉCORD ' + label;
        if(document.getElementById('t_lbl_st_p_best_avg')) document.getElementById('t_lbl_st_p_best_avg').innerText = 'PROM. GENERAL ' + label;
        if(document.getElementById('t_lbl_st_p_last10_avg')) document.getElementById('t_lbl_st_p_last10_avg').innerText = 'PROM. ÚLT. 10 ' + label;
        if(document.getElementById('lbl-st-g-avg')) document.getElementById('lbl-st-g-avg').innerText = 'PROMEDIO SERVIDOR ' + label;
        if(document.getElementById('lbl-st-g-record')) document.getElementById('lbl-st-g-record').innerText = 'RÉCORD ABSOLUTO ' + label;
        if(document.getElementById('game-unit-label')) document.getElementById('game-unit-label').innerText = label;
    },

    // (BÚSCALO EN TU MAIN.JS) - Esto repara el Ranking del Lobby para que se vea IGUAL que antes
    renderGlobal() {
        const todayAR = CT.getARDate();
        const typeEl = document.getElementById('leaderboard-type'); const rankTypeEl = document.getElementById('ranking-type');
        if(!typeEl || !rankTypeEl) return; 

        // Recuperamos la lógica que no pide cosas complejas a Firebase:
        let filteredScores = typeEl.value === 'today' ? (CT.data.s_recent || []).filter(s => !s.hc && s.d === todayAR) : (CT.data.s_top || []).filter(s => !s.hc);
        let limitTimes = typeEl.value === 'today' ? 10 : 20; 
        filteredScores.sort((a,b) => b.c - a.c);
        
        document.getElementById('global-rank-times').innerHTML = filteredScores.slice(0, limitTimes).map((s, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="UI.showProfile('${s.h}')"><div class="avatar-xs"><img src="${s.a || CT.defAvatar}"></div><span>${s.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(s.c)}</b></td>
                <td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width:100px;">${s.track}</span>
                    <button class="ghost-btn" onclick="App.startGhostRace('${s.track}', ${s.c})" title="Competir contra el Fantasma">👻</button>
                </div></td>
            </tr>`;
        }).join('');

        const rankingMode = rankTypeEl.value;
        const users = CT.dbLocal('u');
        let playerStats = users.map(u => {
            const history = u.hi || []; 
            let averageCPM = (rankingMode === 'last10') ? (history.slice(-10).length ? Math.round(history.slice(-10).reduce((a,b)=>a+b)/history.slice(-10).length) : 0) : (history.length ? Math.round(history.reduce((a,b)=>a+b)/history.length) : 0);
            return { n: u.n, a: u.a, h: u.h, avgCPM: averageCPM, total: history.length };
        }).filter(u => u.total > 0).sort((a,b) => b.avgCPM - a.avgCPM);

        document.getElementById('global-rank-players').innerHTML = playerStats.slice(0, 10).map((p, idx) => {
            const posClass = idx === 0 ? 'podium-1' : (idx === 1 ? 'podium-2' : (idx === 2 ? 'podium-3' : ''));
            return `<tr>
                <td class="${posClass}">${idx + 1}</td>
                <td><div class="player-link" onclick="UI.showProfile('${p.h}')"><div class="avatar-xs"><img src="${p.a || CT.defAvatar}"></div><span>${p.n}</span></div></td>
                <td><b style="color:var(--p)" class="val-blurrable">${UI.formatValue(p.avgCPM)}</b></td><td>${p.total}</td>
            </tr>`;
        }).join('');
    },
