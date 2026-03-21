/* ================================================================
    CANANTYPER - UI PROFILE (PERFIL Y AJUSTES GLOBALES)
   ================================================================ */

Object.assign(window.UI, {
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
            await window.App.getUserScores(u.h);
            
            document.getElementById('prof-name').innerText = u.n; 
            document.getElementById('prof-img').src = u.a || window.CT.defAvatar; 
            document.getElementById('prof-role').innerText = (u.r || 'PILOTO').toUpperCase();
            
            const hi = u.hi || []; const total = hi.length; 
            document.getElementById('st-total').innerText = total;
            
            const avgCPM = total ? Math.round(hi.reduce((a,b)=>a+b, 0)/total) : 0;
            const last10hi = hi.slice(-10); 
            const avg10CPM = last10hi.length ? Math.round(last10hi.reduce((a,b)=>a+b, 0)/last10hi.length) : 0;
            const bestCPM = total ? Math.max(...hi) : 0;
            
            document.getElementById('st-avg').innerText = window.UI.formatValue(avgCPM); 
            document.getElementById('st-last-10').innerText = window.UI.formatValue(avg10CPM); 
            document.getElementById('st-best').innerText = window.UI.formatValue(bestCPM);
            
            window.CT.profPage = 0; window.UI.renderProfileHistory();
            document.getElementById('btn-open-edit').classList.toggle('hidden', !(currentSes && u.h === currentSes.h)); 
            document.getElementById('edit-dropdown').classList.add('hidden');
            window.UI.show('profile-screen');
        } catch (error) { console.error("Error en showProfile:", error); }
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
