let allBeats = [];
let activeGenre = '';
let activeSearch = '';
let activeBpm = '';
let activeKey = '';

async function loadCatalog() {
    const grid = document.getElementById('catalogue-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/beats');
        allBeats = await res.json();
        const countEl = document.getElementById('count-tracks');
        if (countEl) countEl.textContent = allBeats.length;
        renderCatalog();
        bindFilters();
    } catch (err) {
        console.error('Error cargando catálogo:', err);
        grid.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px">Error cargando el catálogo. Intenta de nuevo.</p>';
    }
}

function filterBeats() {
    return allBeats.filter(beat => {
        // Filtro por colección (si se activó desde Collections)
        if (window._collectionFilter?.length && !window._collectionFilter.includes(beat.id)) return false;
        // Género
        if (activeGenre && beat.genre !== activeGenre) return false;

        // BPM
        if (activeBpm) {
            const bpm = beat.bpm;
            if (activeBpm === 'slow'  && bpm >= 85)  return false;
            if (activeBpm === 'mid'   && (bpm < 85  || bpm > 115)) return false;
            if (activeBpm === 'fast'  && (bpm < 115 || bpm > 145)) return false;
            if (activeBpm === 'hard'  && bpm <= 145) return false;
        }

        // Key
        if (activeKey && beat.key !== activeKey) return false;

        // Búsqueda de texto
        if (activeSearch) {
            const q = activeSearch.toLowerCase();
            const inTitle = beat.title.toLowerCase().includes(q);
            const inTags  = beat.tags.some(t => t.toLowerCase().includes(q));
            const inGenre = beat.genre.toLowerCase().includes(q);
            if (!inTitle && !inTags && !inGenre) return false;
        }

        return true;
    });
}

function renderCatalog() {
    const grid = document.getElementById('catalogue-grid');
    const countEl = document.getElementById('results-count');
    const clearBtn = document.getElementById('btn-clear');
    if (!grid) return;

    const filtered = filterBeats();
    const hasFilters = activeGenre || activeSearch || activeBpm || activeKey;
    if (clearBtn) {
        clearBtn.style.display = '';
        clearBtn.classList.toggle('show', !!hasFilters);
    }

    if (countEl) {
        countEl.textContent = hasFilters
            ? `${filtered.length} beat${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`
            : `${allBeats.length} beat${allBeats.length !== 1 ? 's' : ''} disponible${allBeats.length !== 1 ? 's' : ''}`;
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

    // Precio mínimo de licencias
    function minPrice(beat) {
        if (!beat.licenses) return null;
        const prices = Object.values(beat.licenses).map(l => l.price).filter(Boolean);
        return prices.length ? Math.min(...prices) : null;
    }

    grid.innerHTML = filtered.map(beat => {
        const hasPreview = !!beat.preview;
        const cover      = beat.image || 'assets/images/alsxbeatsportada.png';
        const price      = minPrice(beat);
        const priceHtml  = price ? `<small>Desde</small>€${price}` : '<small>—</small>';

        return `
        <div class="beat-row" data-id="${beat.id}" data-preview="${beat.preview || ''}" data-title="${escHtml(beat.title)}" data-img="${cover}">
            <button class="row-play" onclick="rowPlay(this)" title="Reproducir">
                <i class="fas fa-play"></i>
            </button>
            <img class="row-cover" src="${cover}" alt="${escHtml(beat.title)}" onerror="this.src='assets/images/alsxbeatsportada.png'">
            <div class="row-info">
                <div class="row-title">${escHtml(beat.title)}</div>
                <div class="row-producer">AlsxBeats</div>
            </div>
            <div class="row-genre-cell"><span class="row-genre">${beat.genre || '—'}</span></div>
            <div class="row-stats">
                <span>${beat.bpm ? beat.bpm + ' BPM' : '—'}</span>
                <span>${beat.key || '—'}</span>
            </div>
            <div class="row-price">${priceHtml}</div>
            <div class="row-actions">
                <a href="licencias.html?beatId=${beat.id}" class="btn-row-lic">Ver licencias</a>
                <button class="btn-row-more" title="Más opciones"><i class="fas fa-ellipsis"></i></button>
            </div>
        </div>`;
    }).join('');

    // Evento click en filas para reproducir
    document.querySelectorAll('.beat-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.row-actions') || e.target.closest('.row-play')) return;
            const btn = row.querySelector('.row-play');
            if (btn) btn.click();
        });
    });

}

function bindFilters() {
    // Búsqueda con debounce
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                activeSearch = searchInput.value.trim();
                renderCatalog();
            }, 220);
        });
    }

    // BPM
    const bpmSelect = document.getElementById('filter-bpm');
    if (bpmSelect) {
        bpmSelect.addEventListener('change', () => {
            activeBpm = bpmSelect.value;
            renderCatalog();
        });
    }

    // Key
    const keySelect = document.getElementById('filter-key');
    if (keySelect) {
        keySelect.addEventListener('change', () => {
            activeKey = keySelect.value;
            renderCatalog();
        });
    }

    // Género tabs / pills / btns
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

    const s = document.getElementById('filter-search');
    const b = document.getElementById('filter-bpm');
    const k = document.getElementById('filter-key');
    if (s) s.value = '';
    if (b) b.value = '';
    if (k) k.value = '';

    document.querySelectorAll('.genre-pill, .genre-tab, .genre-btn').forEach(p => p.classList.remove('active'));
    const allTab = document.querySelector('.genre-pill[data-genre=""], .genre-tab[data-genre=""], .genre-btn[data-genre=""]');
    if (allTab) allTab.classList.add('active');

    renderCatalog();
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

function quickAddToCart(btn) {
    const card = btn.closest('.beat-card');
    const item = {
        beatId:      card.dataset.id,
        licenseType: 'basic',
        title:       card.dataset.title,
        image:       card.dataset.img,
        license:     'Basic Lease',
        price:       29
    };
    if (window.Cart) window.Cart.add(item);
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
    window.bpLoad?.(preview, row.dataset.title, row.dataset.img, row);
}

document.addEventListener('DOMContentLoaded', loadCatalog);
