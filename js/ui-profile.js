/* ================================================================
    CANANTYPER - UI PROFILE (PERFIL, AJUSTES GLOBALES Y BUSCADOR)
   ================================================================ */

Object.assign(window.UI, {
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

    // --- MOTOR DE EVALUACIÓN DE MEDALLAS ---
    getUserMedals: (user) => {
        const catalog = window.App.medalsCatalog || [];
        let earnedMedals = [];

        const total = (user.hi || []).length;
        const avgCPM = total ? Math.round((user.hi || []).reduce((a,b)=>a+b, 0)/total) : 0;
        const bestCPM = total ? Math.max(...(user.hi || [])) : 0;
        const hcSurvivals = user.hc_survivals || 0;
        const arenaPts = user.arena_pts || 0;
        const customMedals = user.custom_medals || [];

        // 1. Contamos cuántas de cada una tiene
        let manualCounts = {};
        customMedals.forEach(id => {
            manualCounts[id] = (manualCounts[id] || 0) + 1;
        });

        // 2. Evaluamos el catálogo
        catalog.forEach(m => {
            let earned = false;
            let count = 1;

            if (m.condition === 'manual') {
                if (manualCounts[m.id] > 0) {
                    earned = true;
                    count = m.isStackable ? manualCounts[m.id] : 1;
                }
            } 
            else {
                if (m.condition === 'cpm_max' && bestCPM >= m.target) earned = true;
                else if (m.condition === 'cpm_avg' && avgCPM >= m.target) earned = true;
                else if (m.condition === 'races_total' && total >= m.target) earned = true;
                else if (m.condition === 'hc_survivals' && hcSurvivals >= m.target) earned = true;
                else if (m.condition === 'arena_pts' && arenaPts >= m.target) earned = true;
            }

            if (earned) {
                earnedMedals.push({ ...m, count: count });
            }
        });

        if (!user.createdAt) {
            earnedMedals.push({ id: 'anomalia_cero', icon: '💠', name: 'Beta Tester', desc: 'Registros anteriores al sistema', count: 1, isStackable: false });
        }

        return earnedMedals;
    },

    showProfile: async (who) => {
        try {
            const currentSes = window.CT.ses(); if (!currentSes) return;
            const targetHandle = (who === 'me') ? currentSes.h : who;

            if (targetHandle === '@canantyper') {
                document.getElementById('profile-normal-layout').classList.add('hidden');
                document.getElementById('profile-official-layout').classList.remove('hidden');
                
                const allUsers = window.CT.dbLocal('u') || [];
                let totalGlobalRaces = 0; let totalHcDeaths = 0;
                allUsers.forEach(us => { totalGlobalRaces += (us.hi || []).length; totalHcDeaths += (us.hc_deaths || 0); });

                const offUsersEl = document.getElementById('off-users');
                const offRacesEl = document.getElementById('off-races');
                const offHcEl = document.getElementById('off-hc-deaths');
                
                if (offUsersEl) offUsersEl.innerText = allUsers.length;
                if (offRacesEl) offRacesEl.innerText = window.UI.formatValue(totalGlobalRaces);
                if (offHcEl) offHcEl.innerText = window.UI.formatValue(totalHcDeaths);

                const topScores = window.CT.data.s_top || [];
                const normRankList = topScores.filter(s=>!s.hc).sort((a,b)=>b.c - a.c);
                
                let uniqueTopUsers = []; let seenHandles = new Set();
                for(let s of normRankList) {
                    if(!seenHandles.has(s.h)) {
                        uniqueTopUsers.push(s); seenHandles.add(s.h);
                        if(uniqueTopUsers.length === 3) break;
                    }
                }

                const podCont = document.getElementById('official-podium-container');
                if (podCont) {
                    if (uniqueTopUsers.length >= 3) {
                        const u1 = uniqueTopUsers[0]; const u2 = uniqueTopUsers[1]; const u3 = uniqueTopUsers[2];
                        const getAv = (handle) => { let user = window.CT.dbLocal('u').find(x => x.h === handle); return user && user.a ? user.a : window.CT.defAvatar; };

                        podCont.innerHTML = `
                            <div class="podium-spot p2" onclick="window.UI.showProfile('${u2.h}')" style="cursor:pointer;" title="Ver perfil de ${u2.n || u2.h}">
                                <img src="${getAv(u2.h)}" class="podium-avatar">
                                <div class="podium-name">🥈 ${u2.n || u2.h}</div>
                                <div class="podium-cpm">${window.UI.formatValue(u2.c)} CPM</div>
                            </div>
                            <div class="podium-spot p1" onclick="window.UI.showProfile('${u1.h}')" style="cursor:pointer;" title="Ver perfil de ${u1.n || u1.h}">
                                <div style="position:absolute; top:-60px; font-size:1.8rem; filter:drop-shadow(0 0 5px #ffd700);">👑</div>
                                <img src="${getAv(u1.h)}" class="podium-avatar">
                                <div class="podium-name">${u1.n || u1.h}</div>
                                <div class="podium-cpm" style="color:#ffd700; font-weight:bold;">${window.UI.formatValue(u1.c)} CPM</div>
                            </div>
                            <div class="podium-spot p3" onclick="window.UI.showProfile('${u3.h}')" style="cursor:pointer;" title="Ver perfil de ${u3.n || u3.h}">
                                <img src="${getAv(u3.h)}" class="podium-avatar">
                                <div class="podium-name">🥉 ${u3.n || u3.h}</div>
                                <div class="podium-cpm">${window.UI.formatValue(u3.c)} CPM</div>
                            </div>
                        `;
                    } else {
                        podCont.innerHTML = `<div style="color:var(--text-muted); font-style:italic; padding: 30px;">Esperando datos de la élite... (Se requieren al menos 3 pilotos)</div>`;
                    }
                }

                document.getElementById('user-search-input').value = '';
                document.getElementById('user-search-results').classList.add('hidden');
                document.getElementById('btn-edit-profile').classList.add('hidden');
                
                window.CT.activeProfHandle = '@canantyper';
                window.UI.show('profile-screen');
                return;
            }

            document.getElementById('profile-official-layout').classList.add('hidden');
            document.getElementById('profile-normal-layout').classList.remove('hidden');

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

            let tCounts = {}; let favTrackVal = "-"; let maxT = 0;
            scores.filter(s => !s.hc).forEach(s => { 
                tCounts[s.track] = (tCounts[s.track] || 0) + 1; 
                if(tCounts[s.track] > maxT) { maxT = tCounts[s.track]; favTrackVal = s.track; } 
            });
            
            let allMatches = window.CT.dbLocal('p').filter(t => t.id.toString() === favTrackVal.toString() || t.title === favTrackVal);
            let realTrack = allMatches.find(t => t.c !== 'General') || allMatches[0];
            document.getElementById('prof-fav-track').innerText = window.UI.formatTrackNameFull(realTrack ? realTrack.title : favTrackVal);
            
            const earnedMedals = window.UI.getUserMedals(u);
            const visibleIds = u.visible_medals || [];
            
            let displayMedals = [];
            if (visibleIds.length > 0) {
                visibleIds.forEach(vid => {
                    const match = earnedMedals.find(m => m.id === vid);
                    if(match) displayMedals.push(match);
                });
            } else {
                displayMedals = earnedMedals.slice(0, 6); 
            }

            let medalsHTML = '';
            if (displayMedals.length > 0) {
                medalsHTML = displayMedals.map(m => {
                    // Diseño más sutil y pequeño para el perfil
                    const countBadge = (m.isStackable && m.count > 1) 
                        ? `<div style="position:absolute; bottom:0px; right:-2px; background: var(--p); color: #000; font-size:0.65rem; font-weight:900; line-height:1; padding:2px 5px; border-radius:10px; box-shadow: 0 0 6px var(--p); border: 1.5px solid #111; z-index:5; display:flex; align-items:center; justify-content:center;">x${m.count}</div>` 
                        : '';
                    
                    return `
                    <div style="position:relative; display:inline-flex; align-items:center; justify-content:center; width: 50px; height: 50px; margin: 0 8px; overflow:visible;" title="${m.name}: ${m.desc}">
                        <span class="medal-item" style="font-size: 2.2rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">${m.icon}</span>
                        ${countBadge}
                    </div>`;
                }).join('');
            } else {
                medalsHTML = `<span style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">El medallero está vacío.</span>`;
            }
            document.getElementById('prof-medals').innerHTML = medalsHTML;

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

            const avCont = document.getElementById('prof-avatar-container');
            avCont.className = 'avatar-lrg prestige-border-none'; 
            
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
        
        const earnedMedals = window.UI.getUserMedals(u);
        const catalog = window.App.medalsCatalog || [];
        
        let html = `<div class="medal-showcase-grid">`;
        
        catalog.forEach(m => {
            const earnedMatch = earnedMedals.find(earned => earned.id === m.id);
            const hasIt = !!earnedMatch;
            
            if (!hasIt && m.isSecret) return; 

            // Reducido también en la vitrina completa
            const countBadge = (hasIt && m.isStackable && earnedMatch.count > 1) 
                ? `<div style="position:absolute; bottom:2px; right:0px; background: var(--p); color: #000; font-size:0.65rem; font-weight:900; line-height:1; padding:2px 5px; border-radius:10px; box-shadow: 0 0 6px var(--p); border: 1.5px solid #111; z-index:5; display:flex; align-items:center; justify-content:center;">x${earnedMatch.count}</div>` 
                : '';

            html += `<div class="medal-slot ${hasIt ? 'unlocked' : 'locked'}" title="${hasIt ? m.desc : 'Requisito desconocido'}" style="position:relative;">
                        <span class="m-icon" style="font-size: 2.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">${m.icon}</span>
                        <span class="m-name">${m.name}</span>
                        ${countBadge}
                     </div>`;
        });
        
        if (earnedMedals.some(m => m.id === 'anomalia_cero')) {
            html += `<div class="medal-slot unlocked" title="Registros anteriores al sistema">
                        <span class="m-icon" style="font-size: 2.5rem;">🧪</span>
                        <span class="m-name">Beta Tester</span>
                     </div>`;
        }
        
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

    // --- NUEVO SISTEMA DE EDICIÓN ESTÉTICA Y ORDENADA ---
    openEditProfileModal: () => {
        const u = window.CT.ses(); if(!u) return;
        const userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        
        document.getElementById('ep-name').value = userDoc.n || '';
        document.getElementById('ep-bio').value = userDoc.bio || '';
        document.getElementById('ep-country').value = userDoc.country || '';
        document.getElementById('ep-layout').value = userDoc.layout || '';
        document.getElementById('ep-switches').value = userDoc.switches || '';
        document.getElementById('ep-discord').value = userDoc.discord || '';

        const earnedMedals = window.UI.getUserMedals(userDoc);
        
        window.UI.tempEarnedMedals = earnedMedals; 
        window.UI.selectedMedalsOrder = [...(userDoc.visible_medals || [])]; 

        window.UI.selectedMedalsOrder = window.UI.selectedMedalsOrder.filter(id => earnedMedals.some(m => m.id === id));

        window.UI.renderMedalSelector();
        document.getElementById('edit-profile-modal').classList.remove('hidden');
    },

    renderMedalSelector: () => {
        const medalsGrid = document.getElementById('ep-medals-grid');
        const earnedMedals = window.UI.tempEarnedMedals || [];
        
        if (earnedMedals.length === 0) {
            medalsGrid.innerHTML = '<span style="color:#777; font-size:0.8rem; font-style:italic; grid-column: 1/-1;">Aún no has ganado medallas para lucir.</span>';
            return;
        }

        let html = '';
        earnedMedals.forEach(m => {
            const index = window.UI.selectedMedalsOrder.indexOf(m.id);
            const isSelected = index > -1;
            
            // Badge Numérico achicado a 18px
            const orderBadge = isSelected ? `<div style="position:absolute; top:-4px; right:-4px; background: var(--p); color: #000; font-weight:900; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; box-shadow:0 0 5px var(--p); border:1.5px solid #111; z-index:10; line-height:1;">${index + 1}</div>` : '';
            
            const typeLabel = m.isStackable ? `<span style="color:var(--p); font-size:0.7rem;">📦 Múltiple (x${m.count})</span>` : `<span style="color:#777; font-size:0.7rem;">🔒 Única</span>`;

            html += `
            <div onclick="window.UI.toggleMedalSelection('${m.id}')" style="position:relative; display:flex; align-items:center; gap:12px; cursor:pointer; padding:12px; background: ${isSelected ? 'var(--surface)' : 'transparent'}; border: 1px solid ${isSelected ? 'var(--p)' : 'var(--border)'}; border-radius: 8px; transition:0.2s; user-select:none;" onmouseover="this.style.borderColor='var(--p)'" onmouseout="this.style.borderColor='${isSelected ? 'var(--p)' : 'var(--border)'}'">
                <div style="font-size:2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                    ${m.icon}
                </div>
                <div style="display:flex; flex-direction:column; overflow:hidden;">
                    <span style="color:var(--text-main); font-weight:bold; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name}</span>
                    ${typeLabel}
                </div>
                ${orderBadge}
            </div>`;
        });

        html += `<div id="hidden-ordered-checkboxes" style="display:none;">`;
        window.UI.selectedMedalsOrder.forEach(id => {
            html += `<input type="checkbox" value="${id}" checked>`;
        });
        html += `</div>`;

        medalsGrid.innerHTML = html;
    },

    toggleMedalSelection: (id) => {
        const idx = window.UI.selectedMedalsOrder.indexOf(id);
        if (idx > -1) {
            window.UI.selectedMedalsOrder.splice(idx, 1); 
        } else {
            if (window.UI.selectedMedalsOrder.length >= 6) {
                return alert("Solo puedes destacar un máximo de 6 medallas en tu perfil.");
            }
            window.UI.selectedMedalsOrder.push(id); 
        }
        window.UI.renderMedalSelector();
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
