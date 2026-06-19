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
    if (clearBtn) clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';

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

    grid.innerHTML = filtered.map(beat => {
        const hasPreview = !!beat.preview;
        const playAction = hasPreview
            ? `playBeat('${beat.preview}', this.closest('.beat-card'))`
            : `window.Cart && Cart.showToast('Preview no disponible aún', true)`;

        return `
        <div class="beat-card"
            data-id="${beat.id}"
            data-title="${escHtml(beat.title)}"
            data-img="${beat.image}"
            data-audio="${beat.preview || ''}">

<div class="image-container" onclick="${playAction}">
                <img src="${beat.image}" alt="${escHtml(beat.title)}"
                     onerror="this.src='assets/images/alsxbeatsportada.png'">
                <div class="play-overlay"><span>${hasPreview ? '▶' : '🔒'}</span></div>
            </div>

            <div class="card-info">
                <h2>${escHtml(beat.title)}</h2>
                <p class="beat-meta">${beat.bpm} BPM <span class="divider">|</span> ${beat.key} <span class="divider">|</span> ${beat.genre}</p>
                <div class="card-actions">
                    <a href="licencias.html?beatId=${beat.id}" class="btn btn-secondary btn-ver-licencias">
                        Ver Licencias
                    </a>
                </div>
            </div>
        </div>`;
    }).join('');

    initLikeButtons();
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

    // Género pills
    document.querySelectorAll('.genre-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeGenre = pill.dataset.genre;
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

    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
    const allPill = document.querySelector('.genre-pill[data-genre=""]');
    if (allPill) allPill.classList.add('active');

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

document.addEventListener('DOMContentLoaded', loadCatalog);
