/* ================================================================
    CANANTYPER - UI TRACKS (TEXTOS Y CATEGORÍAS)
   ================================================================ */

Object.assign(window.UI, {
    showTrackSelect: () => { 
        document.getElementById('track-search').value = ''; 
        window.UI.activeTrackCat = null; 
        window.UI.filterFavs = false; 
        window.UI.showTrackCategorySelect(); 
        window.UI.show('track-screen'); 
    },

    showTrackCategorySelect: () => {
        document.getElementById('track-list-view').classList.add('hidden'); 
        document.getElementById('track-category-view').classList.remove('hidden');
        
        // Obtenemos la lista ya filtrada por el State Manager (Ahorro de cuota)
        const tracks = window.CT.dbLocal('p'); 
        let cats = window.CT.dbLocal('c'); 
        let catCounts = {}; 
        
        tracks.forEach(t => { const c = (t.c || 'General').trim(); catCounts[c] = (catCounts[c] || 0) + 1; });
        cats = cats.filter(c => c.name !== 'General' && !c.name.startsWith('[TRN]')).sort((a,b) => (a.order || 0) - (b.order || 0));

        let t_fav = window.CT.data.ui && window.CT.data.ui['t_trk_fav_filter'] ? window.CT.data.ui['t_trk_fav_filter'].v : '⭐ Ver Favoritos';
        let html = `<div class="cat-card cat-fav-card" onclick="window.UI.toggleFavFilter()"><h3><span>${t_fav}</span></h3><span style="color:var(--text-main)">Textos favoritos</span></div>`;
        
        html += cats.map(cat => {
            const count = catCounts[cat.name] || 0;
            // Indicador visual para que el jugador sepa que esta categoría está optimizada
            const badgeHtml = cat.filterLong ? `<span style="font-size:0.6rem; background:rgba(166,255,0,0.1); color:var(--accent); padding:2px 6px; border-radius:4px; border:1px solid rgba(166,255,0,0.3); margin-top:5px; display:inline-block;">⚡ MODO RÁPIDO</span>` : '';
            
            return `
            <div class="cat-card" onclick="window.UI.selectTrackCategory('${cat.name}')">
                <h3>${cat.name}</h3>
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <span>${count} TEXTOS</span>
                    ${badgeHtml}
                </div>
            </div>`;
        }).join('');
        
        document.getElementById('track-category-view').innerHTML = html;
    },

    toggleFavFilter: () => { 
        window.UI.filterFavs = true; window.UI.activeTrackCat = null; window.UI.trackPage = 0; 
        document.getElementById('track-category-view').classList.add('hidden'); 
        document.getElementById('track-list-view').classList.remove('hidden'); 
        document.getElementById('btn-back-cat-track').classList.remove('hidden'); 
        window.UI.renderTrackList(); 
    },

    selectTrackCategory: (cat) => { 
        window.UI.activeTrackCat = cat; window.UI.filterFavs = false; window.UI.trackPage = 0; 
        document.getElementById('track-category-view').classList.add('hidden'); 
        document.getElementById('track-list-view').classList.remove('hidden'); 
        document.getElementById('btn-back-cat-track').classList.remove('hidden'); 
        window.UI.renderTrackList(); 
    },
    
    renderTrackList: () => {
        const query = (document.getElementById('track-search').value || "").toLowerCase(); 
        let tracks = window.CT.dbLocal('p'); // Lista limpia y filtrada
        const u = window.CT.ses(); 
        let userDoc = window.CT.dbLocal('u').find(x => x.h === u.h) || u;
        let favs = userDoc.favs || [];

        const listContainer = document.getElementById('track-list-full');
        listContainer.className = 'custom-scroll track-list ' + window.UI.listLayout;
        if (window.UI.filterFavs) listContainer.classList.add('fav-scroll'); else listContainer.classList.remove('fav-scroll');

        let filtered = tracks;
        if (query) {
            document.getElementById('track-category-view').classList.add('hidden'); 
            document.getElementById('track-list-view').classList.remove('hidden'); 
            document.getElementById('btn-back-cat-track').classList.add('hidden');
            filtered = tracks.filter(t => (t.title && t.title.toString().toLowerCase().includes(query)) || (t.text && t.text.toLowerCase().includes(query))); 
        } else if (window.UI.filterFavs) {
            filtered = tracks.filter(t => favs.includes(t.id.toString())).sort((a,b) => favs.indexOf(a.id.toString()) - favs.indexOf(b.id.toString()));
        } else if (!window.UI.activeTrackCat) {
            window.UI.showTrackCategorySelect(); return;
        } else {
            filtered = tracks.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()).sort((a,b) => (a.order || 0) - (b.order || 0));
        }

        let textPinOn = window.CT.data.ui && window.CT.data.ui['t_btn_pin_on'] ? window.CT.data.ui['t_btn_pin_on'].v : '⭐';
        let textPinOff = window.CT.data.ui && window.CT.data.ui['t_btn_pin_off'] ? window.CT.data.ui['t_btn_pin_off'].v : '☆';

        const start = window.UI.trackPage * 20; const pageData = filtered.slice(start, start + 20);
        listContainer.innerHTML = pageData.map(t => {
            let isFav = favs.includes(t.id.toString());
            let starClass = isFav ? 'fav-active' : 'fav-inactive';
            let reorderFavHtml = (window.UI.filterFavs && !query) ? `<span class="drag-handle" style="cursor:grab; font-size:1.5rem; color:#ffd700; margin-top:5px; display:inline-block;" title="Arrastrar para ordenar" onclick="event.stopPropagation()">⠿</span>` : '';
            let cardStyle = isFav ? `border-color: color-mix(in srgb, #ffd700 50%, transparent); box-shadow: 0 5px 15px color-mix(in srgb, #ffd700 10%, transparent);` : ``;
            let idColorStyle = isFav ? `color: #ffd700; text-shadow: 0 0 10px color-mix(in srgb, #ffd700 30%, transparent);` : `color: var(--p);`;

            // Mostramos cuántas palabras tiene el texto en la UI del jugador
            const wc = t.wc || (t.text ? t.text.trim().split(/\s+/).length : 0);

            return `<div class="track-card" onclick="window.App.startRaceWithTrack('${t.id}')" style="${cardStyle}"><div class="track-card-id" style="display:flex; flex-direction:column; gap:10px; ${idColorStyle}">${window.UI.formatTrackName(t.title)}<button onclick="event.stopPropagation(); window.App.toggleFav('${t.id}')" class="fav-star-btn ${starClass}">${isFav ? textPinOn : textPinOff}</button>${reorderFavHtml}</div><div class="track-card-content"><p class="track-card-text">${t.text}</p><span class="track-card-meta">${wc} PALABRAS | [${(t.c || 'General').trim()}]</span></div></div>`;
        }).join('');
        
        document.getElementById('track-prev').disabled = window.UI.trackPage === 0; 
        document.getElementById('track-next').disabled = (start + 20) >= filtered.length; 
        document.getElementById('track-page-num').innerText = `Página ${window.UI.trackPage + 1}`;
        
        setTimeout(() => {
            if (window.UI.filterFavs && !query) window.UI.initSortable('track-list-full', 'track', window.UI.trackPage);
            else { const c = document.getElementById('track-list-full'); if (c && c._sortable) { c._sortable.destroy(); c._sortable = null; } }
        }, 50);
    },

    changeTrackPage: (delta) => { 
        const query = (document.getElementById('track-search').value || "").toLowerCase(); 
        let filtered = window.CT.dbLocal('p'); 
        const u = window.CT.ses(); let favs = (window.CT.dbLocal('u').find(x => x.h === u.h) || u).favs || []; 
        
        if (query) { 
            filtered = filtered.filter(t => (t.title && t.title.toString().toLowerCase().includes(query)) || (t.text && t.text.toLowerCase().includes(query))); 
        } else if (window.UI.filterFavs) { 
            filtered = filtered.filter(t => favs.includes(t.id.toString())); 
        } else { 
            filtered = filtered.filter(t => (t.c || 'General').trim() === window.UI.activeTrackCat.trim()); 
        } 
        
        const nextStart = (window.UI.trackPage + delta) * 20; 
        if(nextStart >= 0 && nextStart < filtered.length) { 
            window.UI.trackPage += delta; window.UI.renderTrackList(); 
        } 
    },

    updateCategorySelects: () => {
        const trnCats = window.CT.dbLocal('c').filter(c => c.name.startsWith('[TRN]'));
        const trnOptions = trnCats.map(c => `<option value="${c.name}">${c.name.replace('[TRN] ', '')}</option>`).join('');
        const trnNewCatSel = document.getElementById('trn-new-cat'); if(trnNewCatSel) trnNewCatSel.innerHTML = trnOptions;
        const trnDelCatSel = document.getElementById('trn-delete-cat-select'); if(trnDelCatSel) trnDelCatSel.innerHTML = trnOptions;
    },

    showTrackPreview: (trackId) => {
        if(!trackId) return;
        const track = window.CT.dbLocal('p').find(t => (t.id && t.id.toString() === trackId.toString()) || (t.title && t.title.toString() === trackId.toString()));
        if(!track) return;
        
        const wc = track.wc || (track.text ? track.text.trim().split(/\s+/).length : 0);
        
        document.getElementById('tp-title').innerText = window.UI.formatTrackNameFull(track.title);
        document.getElementById('tp-cat').innerText = (track.c || 'General').trim();
        document.getElementById('tp-words').innerText = wc + " PALABRAS";
        document.getElementById('tp-content').innerText = track.text;
        document.getElementById('tp-btn-play').onclick = () => { window.App.startRaceWithTrack(track.id); window.UI.closeTrackPreview(); };
        document.getElementById('track-preview-modal').classList.remove('hidden');
    },

    closeTrackPreview: () => { 
        document.getElementById('track-preview-modal').classList.add('hidden'); 
    }
});
