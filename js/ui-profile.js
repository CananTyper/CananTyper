/* ================================================================
    CANANTYPER - UI PROFILE (PERFIL, AJUSTES GLOBALES Y BUSCADOR)
   ================================================================ */

Object.assign(window.UI, {
    // ==================================================================
    // FILTROS ANTI-BUGS GLOBALES (Sobreescriben las funciones por defecto)
    // ==================================================================
    formatTrackNameFull: (idOrTitle) => {
        if(!idOrTitle || idOrTitle === "-") return "-";
        const phrases = window.CT.dbLocal('p') || [];
        let allMatches = phrases.filter(t => t.id.toString() === idOrTitle.toString() || t.title.toString() === idOrTitle.toString());
        let track = allMatches.find(t => t.c !== 'General') || allMatches[0];
        if(track) return `${track.title} | ${track.c || 'General'}`;
        return idOrTitle;
    },
    formatTrackName: (idOrTitle) => {
        if(!idOrTitle || idOrTitle === "-") return "-";
        const phrases = window.CT.dbLocal('p') || [];
        let allMatches = phrases.filter(t => t.id.toString() === idOrTitle.toString() || t.title.toString() === idOrTitle.toString());
        let track = allMatches.find(t => t.c !== 'General') || allMatches[0];
        if(track) return track.title;
        return idOrTitle;
    },
    getTrackCat: (idOrTitle) => {
        const phrases = window.CT.dbLocal('p') || [];
        let allMatches = phrases.filter(t => t.id.toString() === idOrTitle.toString() || t.title.toString() === idOrTitle.toString());
        let track = allMatches.find(t => t.c !== 'General') || allMatches[0];
        return track ? (track.c || 'General') : 'General';
    },
    showTrackPreview: (idOrTitle) => {
        const phrases = window.CT.dbLocal('p') || [];
        let allMatches = phrases.filter(t => t.id.toString() === idOrTitle.toString() || t.title.toString() === idOrTitle.toString());
        let track = allMatches.find(t => t.c !== 'General') || allMatches[0];
        if(!track) return alert("Texto no encontrado en la base de datos.");
        
        document.getElementById('tp-title').innerText = track.title;
        document.getElementById('tp-cat').innerText = track.c || 'General';
        const wc = track.text ? track.text.split(' ').length : 0;
        document.getElementById('tp-words').innerText = wc + (wc === 1 ? ' PALABRA' : ' PALABRAS');
        document.getElementById('tp-content').innerText = track.text;
        
        const btn = document.getElementById('tp-btn-play');
        btn.onclick = () => { window.UI.closeTrackPreview(); window.App.startRaceWithTrack(track.id); };
        
        document.getElementById('track-preview-modal').classList.remove('hidden');
    },
    closeTrackPreview: () => { document.getElementById('track-preview-modal').classList.add('hidden'); },

    // ==================================================================
    // LÓGICA DEL PERFIL
    // ==================================================================
    showProfile: async (who) => {
        try {
            const currentSes = window.CT.ses(); if (!currentSes) return;
            const targetHandle = (who === 'me') ? currentSes.h : who;
            let u = window.CT.dbLocal('u').find(x => x.h === targetHandle); 
            if(!u) {
                const doc = await window.db.collection('users').doc(targetHandle).get();
                if(doc.exists) u = doc.data(); else return;
            }
            window.CT.activeProfHandle = u.h;
            const scores = await window.App.getUserScores(u.h);
            
            document.getElementById('prof-name').innerText = u.n; 
            document.getElementById('prof-handle').innerText = u.h; 
            document.getElementById('prof-img').src = u.a || window.CT.defAvatar; 
            document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            
            document.getElementById('prof-member-since').innerText = u.createdAt || 'Indefinido';
            document.getElementById('prof-bio').innerText = u.bio ? `${u.bio}` : 'Este piloto aún no ha escrito su historia.';
            
            const cEl = document.getElementById('prof-country');
            if(u.country) { cEl.innerText = `${u.country}`; cEl.style.display = 'inline-block'; } else { cEl.style.display = 'none'; }
            
            const lEl = document.getElementById('prof-hw-layout');
            if(u.layout) { lEl.innerText = `⌨️ ${u.layout}`; lEl.style.display = 'inline-block'; } else { lEl.style.display = 'none'; }

            const sEl = document.getElementById('prof-hw-switch');
            if(u.switches) { sEl.innerText = `🕹️ ${u.switches}`; sEl.style.display = 'inline-block'; } else { sEl.style.display = 'none'; }

            document.getElementById('prof-section-hw').style.display = (!u.layout && !u.switches) ? 'none' : 'block';

            const dcEl = document.getElementById('prof-soc-dc');
            if(u.discord) { 
                document.getElementById('prof-dc-name').innerText = u.discord; 
                dcEl.classList.remove('hidden'); 
            } else { 
                dcEl.classList.add('hidden'); 
            }

            const hi = u.hi || []; const total = hi.length; 
            document.getElementById('st-total').innerText = total;
            
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10); 
            const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;
            
            document.getElementById('st-avg').innerText = window.UI.formatValue(avgCPM); 
            document.getElementById('st-last-10').innerText = window.UI.formatValue(avg10CPM); 
            document.getElementById('st-best').innerText = window.UI.formatValue(bestCPM);

            // CALCULAR TEXTO FAVORITO CON FILTRO ANTI-BUGS
            let tCounts = {}; let favTrackVal = "-"; let maxT = 0;
            scores.filter(s => !s.hc).forEach(s => { 
                tCounts[s.track] = (tCounts[s.track] || 0) + 1; 
                if(tCounts[s.track] > maxT) { maxT = tCounts[s.track]; favTrackVal = s.track; } 
            });
            document.getElementById('prof-fav-track').innerText = window.UI.formatTrackNameFull(favTrackVal);
            
            // SISTEMA DE MEDALLAS DIFICULTAD PRO
            let medalsHTML = '';
            if(!u.createdAt) medalsHTML += `<span class="medal-item" title="Veterano (Registro anterior al sistema)">🎖️</span>`;
            if(total >= 100) medalsHTML += `<span class="medal-item" title="Dedos de Acero (100+ Carreras)">🦾</span>`;
            if(avgCPM >= 600) medalsHTML += `<span class="medal-item" title="Velocista (Promedio General +600 CPM)">⚡</span>`;
            if(bestCPM >= 1000) medalsHTML += `<span class="medal-item" title="Élite (1000+ CPM)">🏎️</span>`;
            if((u.hc_survivals || 0) >= 100) medalsHTML += `<span class="medal-item" title="Superviviente (100+ Victorias Hardcore)">🛡️</span>`;
            if((u.hc_deaths || 0) >= 100) medalsHTML += `<span class="medal-item" title="Kamikaze (100+ Muertes en Hardcore)">💀</span>`;
            if(!medalsHTML) medalsHTML = `<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Aún en entrenamiento...</span>`;
            document.getElementById('prof-medals').innerHTML = medalsHTML;

            // SISTEMA DE RANKING (BASADO EN ÚLTIMAS 10)
            const allUsers = window.CT.dbLocal('u');
            
            let userAverages = allUsers.map(user => {
                const hist = user.hi || [];
                const last10 = hist.slice(-10);
                return { h: user.h, avg: last10.length >= 5 ? last10.reduce((a,b)=>a+b,0)/last10.length : 0 };
            }).filter(user => user.avg > 0).sort((a,b) => b.avg - a.avg);

            let nRank = userAverages.findIndex(user => user.h === u.h) + 1;
            if (nRank === 0) nRank = 999;

            let userHcRecords = allUsers.map(user => {
                return { h: user.h, max: user.hi_hc && user.hi_hc.length ? Math.max(...user.hi_hc) : 0 };
            }).filter(user => user.max > 0).sort((a,b) => b.max - a.max);

            let hRank = userHcRecords.findIndex(user => user.h === u.h) + 1;
            if (hRank === 0) hRank = 999;

            let finalRank = Math.min(nRank, hRank);
            let isHcRank = hRank < nRank;

            // PODIOS Y MARCOS
            const avCont = document.getElementById('prof-avatar-container');
            avCont.className = 'avatar-lrg prestige-border-none'; // Reset
            
            let existingBadge = avCont.querySelector('.rank-badge');
            if(existingBadge) existingBadge.remove();

            if (nRank <= 10 || hRank <= 10) {
                let badgeHTML = '';
                let borderClass = '';

                if (nRank === 1 && hRank === 1) {
                    badgeHTML = `<div class="rank-badge rank-dual">👑 #1 <span style="color:#fff;">|</span> 💀 #1</div>`;
                    borderClass = 'prestige-border-dual';
                } else if (isHcRank && hRank <= 10) {
                    badgeHTML = `<div class="rank-badge rank-hc">💀 #${hRank}</div>`;
                    if (hRank === 1) borderClass = 'prestige-border-hardcore';
                    else if (hRank === 2) borderClass = 'prestige-border-top2';
                    else if (hRank === 3) borderClass = 'prestige-border-top3';
                    else borderClass = 'prestige-border-top10';
                } else if (nRank <= 10) {
                    badgeHTML = `<div class="rank-badge ${nRank <= 3 ? 'rank-top'+nRank : 'rank-top10'}">${nRank === 1 ? '👑' : (nRank===2 ? '🥈' : (nRank===3 ? '🥉' : '🏅'))} #${nRank}</div>`;
                    if (nRank === 1) borderClass = 'prestige-border-top1';
                    else if (nRank === 2) borderClass = 'prestige-border-top2';
                    else if (nRank === 3) borderClass = 'prestige-border-top3';
                    else borderClass = 'prestige-border-top10';
                }

                if (badgeHTML) avCont.insertAdjacentHTML('beforeend', badgeHTML);
                if (borderClass) avCont.classList.add(borderClass);
            }

            window.CT.profPage = 0; window.UI.renderProfileHistory();
            
            document.getElementById('user-search-input').value = '';
            document.getElementById('user-search-results').classList.add('hidden');
            document.getElementById('btn-edit-profile').classList.toggle('hidden', !(currentSes && u.h === currentSes.h)); 
            window.UI.show('profile-screen');
        } catch (error) { console.error("Error en showProfile:", error); }
    },

    showAllMedals: () => {
        const u = window.CT.dbLocal('u').find(x => x.h === window.CT.activeProfHandle);
        if(!u) return;
        
        const total = (u.hi || []).length;
        const avgCPM = total ? Math.round((u.hi || []).reduce((a,b)=>a+b, 0)/total) : 0;
        const bestCPM = total ? Math.max(...(u.hi || [])) : 0;
        
        let html = `<div class="medal-showcase-grid">`;
        
        const hasAnomalia = !u.createdAt;
        html += `<div class="medal-slot ${hasAnomalia ? 'unlocked' : 'locked'}" title="${hasAnomalia ? 'Registros anteriores al sistema' : '???'}"><span class="m-icon">🎖️</span><span class="m-name">Veterano</span></div>`;
        
        const hasVeterano = total >= 100;
        html += `<div class="medal-slot ${hasVeterano ? 'unlocked' : 'locked'}" title="${hasVeterano ? '100+ Carreras Totales' : 'Completa 100 carreras'}"><span class="m-icon">🦾</span><span class="m-name">Dedos de Acero</span></div>`;
        
        const hasVelocista = avgCPM >= 600;
        html += `<div class="medal-slot ${hasVelocista ? 'unlocked' : 'locked'}" title="${hasVelocista ? 'Promedio Histórico >= 600 CPM' : 'Alcanza 600 CPM de promedio'}"><span class="m-icon">⚡</span><span class="m-name">Velocista</span></div>`;
        
        const hasElite = bestCPM >= 1000;
        html += `<div class="medal-slot ${hasElite ? 'unlocked' : 'locked'}" title="${hasElite ? '1000+ CPM' : 'Supera los 1000 CPM en una carrera'}"><span class="m-icon">🏎️</span><span class="m-name">Élite</span></div>`;
        
        const hasSurv = (u.hc_survivals || 0) >= 100;
        html += `<div class="medal-slot ${hasSurv ? 'unlocked' : 'locked'}" title="${hasSurv ? '100+ Victorias Hardcore' : 'Sobrevive 100 veces en Hardcore'}"><span class="m-icon">🛡️</span><span class="m-name">Superviviente</span></div>`;
        
        const hasKami = (u.hc_deaths || 0) >= 100;
        html += `<div class="medal-slot ${hasKami ? 'unlocked' : 'locked'}" title="${hasKami ? '100+ Muertes en Hardcore' : 'Muere 100 veces en Hardcore'}"><span class="m-icon">💀</span><span class="m-name">Kamikaze</span></div>`;
        
        html += `</div>`;
        
        document.getElementById('all-medals-content').innerHTML = html;
        document.getElementById('medals-modal').classList.remove('hidden');
    },

    closeMedalsModal: () => { document.getElementById('medals-modal').classList.add('hidden'); },

    copyDiscord: () => {
        const nameEl = document.getElementById('prof-dc-name');
        if(nameEl && nameEl.innerText !== 'Usuario' && nameEl.innerText !== '¡Copiado!') {
            const originalText = nameEl.innerText;
            navigator.clipboard.writeText(originalText).then(() => {
                nameEl.innerText = "¡Copiado!";
                setTimeout(() => { nameEl.innerText = originalText; }, 2000);
            }).catch(err => { console.error('Error al copiar: ', err); });
        }
    },

    openEditProfileModal: () => {
        const u = window.CT.ses(); if(!u) return;
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        document.getElementById('ep-name').value = userDoc.n || '';
        document.getElementById('ep-bio').value = userDoc.bio || '';
        document.getElementById('ep-country').value = userDoc.country || '';
        document.getElementById('ep-layout').value = userDoc.layout || '';
        document.getElementById('ep-switches').value = userDoc.switches || '';
        document.getElementById('ep-discord').value = userDoc.discord || '';
        document.getElementById('edit-profile-modal').classList.remove('hidden');
    },

    closeEditProfileModal: () => { document.getElementById('edit-profile-modal').classList.add('hidden'); },

    filterUserSearch: () => {
        const query = document.getElementById('user-search-input').value.toLowerCase().trim();
        const resultsBox = document.getElementById('user-search-results');
        if(query.length < 2) { resultsBox.classList.add('hidden'); return; }
        
        const users = window.CT.dbLocal('u');
        const matches = users.filter(u => u.h.toLowerCase().includes(query) || (u.n && u.n.toLowerCase().includes(query))).slice(0, 5);
        
        if(matches.length === 0) {
            resultsBox.innerHTML = `<div style="padding: 10px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Piloto no encontrado.</div>`;
        } else {
            resultsBox.innerHTML = matches.map(m => `<button style="width: 100%; background: transparent; border: none; text-align: left; cursor: pointer; border-bottom: 1px solid var(--border);" onclick="window.UI.showProfile('${m.h}')"><div class="avatar-xs" style="display:inline-block; vertical-align:middle; margin-right:8px;"><img src="${m.a || window.CT.defAvatar}"></div><span style="color:var(--text-main); font-weight:bold;">${m.n}</span> <span style="color:var(--p); font-size:0.8rem;">${m.h}</span></button>`).join('');
        }
        resultsBox.classList.remove('hidden');
    },

    closeProfile: () => { window.UI.show('home-screen'); },
    
    renderProfileHistory: () => {
        const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; 
        const userScores = scores.filter(s => !s.hc).sort((a,b) => b.id - a.id);
        const start = window.CT.profPage * 10; const pageData = userScores.slice(start, start + 10);
        
        document.getElementById('prof-history-list').innerHTML = pageData.map(s => `<tr><td><b style="color:var(--p)" class="val-blurrable">${window.UI.formatValue(s.c)}</b></td><td><span class="track-link" onclick="window.UI.showTrackPreview('${s.track}')">${window.UI.formatTrackName(s.track)}</span></td><td><div style="display:flex; justify-content:center; align-items:center; gap:8px;">${s.d}<button class="ghost-btn" onclick="window.App.startGhostRace('${s.track}', ${s.c})" title="Fantasma">👻</button></div></td></tr>`).join('');
        
        document.getElementById('prof-prev').disabled = window.CT.profPage === 0; 
        document.getElementById('prof-next').disabled = (start + 10) >= userScores.length; 
        document.getElementById('prof-page-num').innerText = `Página ${window.CT.profPage + 1}`;
    },

    changeProfPage: (delta) => { 
        const scores = window.CT.data.userScores[window.CT.activeProfHandle] || []; 
        const userScores = scores.filter(s => !s.hc); 
        const nextStart = (window.CT.profPage + delta) * 10; 
        if(nextStart >= 0 && nextStart < userScores.length) { 
            window.CT.profPage += delta; window.UI.renderProfileHistory(); 
        } 
    },

    toggleEditMenu: () => { document.getElementById('edit-dropdown').classList.toggle('hidden'); },
    toggleSettings: () => { document.getElementById('settings-dropdown').classList.toggle('hidden'); const dot = document.getElementById('update-dot'); if (dot && dot.classList.contains('dot-yellow')) dot.classList.add('hidden'); },
    toggleTrainMenu: () => { document.getElementById('train-dropdown').classList.toggle('hidden'); },
    openThemeBuilder: () => { document.getElementById('theme-modal').classList.remove('hidden'); window.UI.toggleSettings(); },
    closeThemeModal: () => { document.getElementById('theme-modal').classList.add('hidden'); },

    openCropModal: (src) => { 
        const img = document.getElementById('crop-image'); img.src = src; 
        img.onload = () => { 
            window.UI.cropScale = 1; window.UI.cropX = 0; window.UI.cropY = 0; 
            document.getElementById('crop-zoom').value = 1; 
            const containerW = 220; const containerH = 220; 
            const imgW = img.naturalWidth; const imgH = img.naturalHeight; 
            if (imgW > imgH) { img.style.height = containerH + 'px'; img.style.width = 'auto'; } 
            else { img.style.width = containerW + 'px'; img.style.height = 'auto'; } 
            window.UI.updateCropTransform(); 
            document.getElementById('crop-modal').classList.remove('hidden'); 
            window.UI.setupCropEvents(); 
        }; 
    },
    
    closeCropModal: () => { document.getElementById('crop-modal').classList.add('hidden'); document.getElementById('img-input').value = ''; },
    
    updateCropTransform: () => { 
        const img = document.getElementById('crop-image'); 
        img.style.transform = `translate(-50%, -50%) translate(${window.UI.cropX}px, ${window.UI.cropY}px) scale(${window.UI.cropScale})`; 
        img.style.left = '50%'; img.style.top = '50%'; 
    },
    
    setupCropEvents: () => { 
        const area = document.getElementById('crop-area'); 
        const startDrag = (e) => { 
            window.UI.isDragging = true; 
            const cx = e.touches ? e.touches[0].clientX : e.clientX; 
            const cy = e.touches ? e.touches[0].clientY : e.clientY; 
            window.UI.startX = cx - window.UI.cropX; window.UI.startY = cy - window.UI.cropY; 
        }; 
        const moveDrag = (e) => { 
            if(!window.UI.isDragging) return; 
            const cx = e.touches ? e.touches[0].clientX : e.clientX; 
            const cy = e.touches ? e.touches[0].clientY : e.clientY; 
            window.UI.cropX = cx - window.UI.startX; window.UI.cropY = cy - window.UI.startY; 
            window.UI.updateCropTransform(); 
        }; 
        const endDrag = () => { window.UI.isDragging = false; }; 
        
        area.onmousedown = startDrag; window.onmousemove = moveDrag; window.onmouseup = endDrag; 
        area.ontouchstart = startDrag; window.ontouchmove = moveDrag; window.ontouchend = endDrag; 
        document.getElementById('crop-zoom').oninput = (e) => { window.UI.cropScale = e.target.value; window.UI.updateCropTransform(); }; 
    }
});
