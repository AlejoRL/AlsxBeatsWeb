let allBeats = [];
let activeGenre = '';
let activeSearch = '';
let activeBpm = '';
let activeKey = '';
let activeTag = '';

async function loadCatalog() {
    const grid = document.getElementById('catalogue-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/beats');
        allBeats = await res.json();
        const countEl = document.getElementById('count-tracks');
        if (countEl) countEl.textContent = allBeats.length;
        populateTagCloud(allBeats);
        renderCatalog();
        bindFilters();
    } catch (err) {
        console.error('Error cargando catálogo:', err);
        grid.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px">Error cargando el catálogo. Intenta de nuevo.</p>';
    }
}

function minPrice(beat) {
    if (!beat.licenses) return null;
    const prices = Object.values(beat.licenses).map(l => l.price).filter(Boolean);
    return prices.length ? Math.min(...prices) : null;
}

function filterBeats() {
    return allBeats.filter(beat => {
        if (window._collectionFilter?.length && !window._collectionFilter.includes(beat.id)) return false;
        if (activeGenre && beat.genre !== activeGenre) return false;

        if (activeBpm) {
            const bpm = beat.bpm;
            if (activeBpm === 'slow'  && bpm >= 85)  return false;
            if (activeBpm === 'mid'   && (bpm < 85  || bpm > 115)) return false;
            if (activeBpm === 'fast'  && (bpm < 115 || bpm > 145)) return false;
            if (activeBpm === 'hard'  && bpm <= 145) return false;
        }

        if (activeKey && beat.key !== activeKey) return false;

        if (activeTag) {
            const tagLower = activeTag.toLowerCase();
            if (!beat.tags || !beat.tags.some(t => t.toLowerCase() === tagLower)) return false;
        }

        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            const inTitle = beat.title.toLowerCase().includes(q);
            const inTags  = (beat.tags || []).some(t => t.toLowerCase().includes(q));
            const inGenre = (beat.genre || '').toLowerCase().includes(q);
            if (!inTitle && !inTags && !inGenre) return false;
        }

        return true;
    });
}

function renderCard(beat, price) {
    const cover   = beat.image || 'assets/images/alsxbeatsportada.png';
    const tags    = (beat.tags || []).slice(0, 3);
    const hasFree = !!beat.preview;

    return `
    <div class="beat-card" data-id="${beat.id}" data-preview="${beat.preview || ''}" data-title="${escHtml(beat.title)}" data-img="${cover}" data-price="${price || ''}" data-peaks='${JSON.stringify(beat.peaks || [])}'>
        <div class="beat-card-cover">
            <img src="${cover}" alt="${escHtml(beat.title)}" onerror="this.src='assets/images/alsxbeatsportada.png'" loading="lazy">
            ${hasFree ? '<span class="card-free-badge"><i class="fas fa-download"></i> Free</span>' : ''}
            <div class="card-overlay">
                <button class="card-play-circle" onclick="cardPlay(this, event)">
                    <i class="fas fa-play"></i>
                </button>
            </div>
        </div>
        <div class="beat-card-body">
            <div class="card-title">${escHtml(beat.title)}</div>
            <div class="card-producer">${escHtml(beat.producer || 'AlsxBeats')}</div>
            <div class="card-meta">
                ${beat.genre ? `<span class="card-genre-tag">${escHtml(beat.genre)}</span>` : ''}
                ${beat.bpm || beat.key ? `<span class="card-bpm-key">${[beat.bpm ? beat.bpm + ' BPM' : '', beat.key || ''].filter(Boolean).join(' · ')}</span>` : ''}
            </div>
            ${tags.length ? `<div class="card-tags">${tags.map(t => `<span class="card-tag-chip" onclick="filterByTag('${escHtml(t)}', event)">${escHtml(t)}</span>`).join('')}</div>` : ''}
            <div class="card-actions">
                ${hasFree ? `<a href="${beat.preview}" download="${escHtml(beat.title)}.mp3" class="btn-card-dl" title="Descarga MP3 gratis" onclick="event.stopPropagation()"><i class="fas fa-download"></i></a>` : ''}
                <a href="licencias.html?beatId=${beat.id}" class="btn-card-buy" onclick="event.stopPropagation()">
                    <i class="fas fa-bag-shopping"></i> ${price ? `€${price}` : 'Ver'}
                </a>
            </div>
        </div>
    </div>`;
}

function renderCatalog() {
    const grid    = document.getElementById('catalogue-grid');
    const countEl = document.getElementById('results-count');
    const clearBtn = document.getElementById('btn-clear');
    if (!grid) return;

    const filtered   = filterBeats();
    const hasFilters = activeGenre || activeSearch || activeBpm || activeKey || activeTag;
    if (clearBtn) clearBtn.classList.toggle('show', !!hasFilters);

    if (countEl) {
        const n = filtered.length;
        countEl.innerHTML = hasFilters
            ? `<strong>${n}</strong> beat${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}`
            : `<strong>${allBeats.length}</strong> beat${allBeats.length !== 1 ? 's' : ''} disponible${allBeats.length !== 1 ? 's' : ''}`;
    }

    if (!filtered.length) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-music"></i>
                <p>No hay beats con esos filtros.</p>
                <button onclick="clearFilters()" style="margin-top:12px;background:var(--accent-celeste);color:#000;border:none;padding:8px 20px;border-radius:8px;font-weight:700;cursor:pointer">
                    Ver todos
                </button>
            </div>`;
        return;
    }

    const isGrid = window._currentView !== 'list';

    if (isGrid) {
        grid.classList.add('beats-grid');
        grid.classList.remove('beat-list');
        grid.innerHTML = filtered.map(beat => renderCard(beat, minPrice(beat))).join('');

        document.querySelectorAll('.beat-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.card-actions') || e.target.closest('.card-play-circle')) return;
                const btn = card.querySelector('.card-play-circle');
                if (btn) btn.click();
            });
        });
    } else {
        grid.classList.remove('beats-grid');
        grid.classList.add('beat-list');
        grid.innerHTML = filtered.map(beat => {
            const cover     = beat.image || 'assets/images/alsxbeatsportada.png';
            const price     = minPrice(beat);
            const priceHtml = price ? `<small>Desde</small>€${price}` : '<small>—</small>';
            const dlBtn     = beat.preview
                ? `<a href="${beat.preview}" download="${escHtml(beat.title)}.mp3" class="btn-row-more" title="Descarga gratuita MP3"><i class="fas fa-download"></i></a>`
                : `<button class="btn-row-more" disabled style="opacity:.3;cursor:default"><i class="fas fa-download"></i></button>`;

            return `
            <div class="beat-row" data-id="${beat.id}" data-preview="${beat.preview || ''}" data-title="${escHtml(beat.title)}" data-img="${cover}" data-price="${price || ''}" data-peaks='${JSON.stringify(beat.peaks || [])}'>
                <button class="row-play" onclick="rowPlay(this)" title="Reproducir"><i class="fas fa-play"></i></button>
                <img class="row-cover" src="${cover}" alt="${escHtml(beat.title)}" onerror="this.src='assets/images/alsxbeatsportada.png'">
                <div class="row-info">
                    <div class="row-title">${escHtml(beat.title)}</div>
                    <div class="row-producer">${escHtml(beat.producer || 'AlsxBeats')}</div>
                </div>
                <div class="row-genre-cell"><span class="row-genre">${beat.genre || '—'}</span></div>
                <div class="row-stats">
                    <span>${beat.bpm ? beat.bpm + ' BPM' : '—'}</span>
                    <span>${beat.key || '—'}</span>
                </div>
                <div class="row-price">${priceHtml}</div>
                <div class="row-actions">
                    <a href="licencias.html?beatId=${beat.id}" class="btn-row-lic"><i class="fas fa-bag-shopping"></i> €${price || '—'}</a>
                    ${dlBtn}
                </div>
            </div>`;
        }).join('');

        document.querySelectorAll('.beat-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('.row-actions') || e.target.closest('.row-play')) return;
                row.querySelector('.row-play')?.click();
            });
        });
    }
}

function bindFilters() {
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        const urlSearch = new URLSearchParams(location.search).get('search');
        if (urlSearch) { searchInput.value = urlSearch; activeSearch = urlSearch; renderCatalog(); }

        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => { activeSearch = searchInput.value.trim(); renderCatalog(); }, 220);
        });
    }

    const bpmSelect = document.getElementById('filter-bpm');
    if (bpmSelect) bpmSelect.addEventListener('change', () => { activeBpm = bpmSelect.value; renderCatalog(); });

    const keySelect = document.getElementById('filter-key');
    if (keySelect) keySelect.addEventListener('change', () => { activeKey = keySelect.value; renderCatalog(); });

    document.querySelectorAll('.genre-pill, .genre-tab, .genre-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.genre-pill, .genre-tab, .genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeGenre = btn.dataset.genre;
            renderCatalog();
        });
    });
}

function clearFilters() {
    activeGenre = '';
    activeSearch = '';
    activeBpm = '';
    activeKey = '';
    activeTag = '';

    const s = document.getElementById('filter-search');
    const b = document.getElementById('filter-bpm');
    const k = document.getElementById('filter-key');
    if (s) s.value = '';
    if (b) b.value = '';
    if (k) k.value = '';

    document.querySelectorAll('.genre-pill, .genre-tab, .genre-btn').forEach(p => p.classList.remove('active'));
    const allTab = document.querySelector('[data-genre=""].genre-pill, [data-genre=""].genre-tab, [data-genre=""].genre-btn');
    if (allTab) allTab.classList.add('active');

    document.querySelectorAll('#tag-cloud .tag-cloud-pill').forEach(p => p.classList.remove('active'));

    renderCatalog();
}

function cardPlay(btn, e) {
    if (e) e.stopPropagation();
    const card    = btn.closest('.beat-card');
    const preview = card.dataset.preview;
    if (!preview) {
        window.location.href = `licencias.html?beatId=${card.dataset.id}`;
        return;
    }
    document.querySelectorAll('.beat-card.playing').forEach(c => {
        c.classList.remove('playing');
        const icon = c.querySelector('.card-play-circle i');
        if (icon) icon.className = 'fas fa-play';
    });
    document.querySelectorAll('.beat-row.playing').forEach(r => r.classList.remove('playing'));

    card.classList.add('playing');
    const playIcon = btn.querySelector('i');
    if (playIcon) playIcon.className = 'fas fa-pause';

    const peaks = JSON.parse(card.dataset.peaks || '[]');
    window.bpLoad?.(preview, card.dataset.title, card.dataset.img, card, card.dataset.price, peaks);
}

function filterByTag(tag, e) {
    if (e) e.stopPropagation();
    activeTag = tag;
    document.querySelectorAll('#tag-cloud .tag-cloud-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.tag === tag);
    });
    renderCatalog();
}

function populateTagCloud(beats) {
    const tagMap = {};
    beats.forEach(b => (b.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
    const tags  = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const cloud = document.getElementById('tag-cloud');
    const block = document.getElementById('tags-filter-block');
    if (!cloud || !tags.length) return;
    if (block) block.style.display = '';
    cloud.innerHTML = tags.map(([t, count]) =>
        `<button class="tag-cloud-pill${activeTag === t ? ' active' : ''}" data-tag="${escHtml(t)}" onclick="filterByTag('${escHtml(t)}')">${escHtml(t)} <span>${count}</span></button>`
    ).join('');
}

function initLikeButtons() {
    const liked = JSON.parse(localStorage.getItem('likedBeats') || '{}');
    document.querySelectorAll('.like-btn').forEach(btn => {
        const id = btn.dataset.id;
        if (liked[id]) btn.classList.add('liked');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const likes = JSON.parse(localStorage.getItem('likedBeats') || '{}');
            likes[id] = !likes[id];
            localStorage.setItem('likedBeats', JSON.stringify(likes));
            btn.classList.toggle('liked');
        });
    });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function rowPlay(btn) {
    const row     = btn.closest('.beat-row');
    const preview = row.dataset.preview;
    if (!preview) {
        window.location.href = `licencias.html?beatId=${row.dataset.id}`;
        return;
    }
    const peaks = JSON.parse(row.dataset.peaks || '[]');
    window.bpLoad?.(preview, row.dataset.title, row.dataset.img, row, row.dataset.price, peaks);
}

document.addEventListener('DOMContentLoaded', loadCatalog);
