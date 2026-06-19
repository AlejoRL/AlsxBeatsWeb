async function loadCatalog() {
    const catalogue = document.querySelector('.catalogue');
    if (!catalogue) return;

    try {
        const res = await fetch('/api/beats');
        const beats = await res.json();

        catalogue.innerHTML = beats.map(beat => {
            const hasPreview = !!beat.preview;
            const playAction = hasPreview
                ? `playBeat('${beat.preview}', this.closest('.beat-card'))`
                : `Cart.showToast('Vista previa no disponible aún', true)`;

            return `
            <div class="beat-card"
                data-id="${beat.id}"
                data-title="${escHtml(beat.title)}"
                data-img="${beat.image}"
                data-audio="${beat.preview || ''}">

                <button class="like-btn" data-id="${beat.id}">❤️</button>

                <div class="image-container" onclick="${playAction}">
                    <img src="${beat.image}" alt="${escHtml(beat.title)}">
                    <div class="play-overlay"><span>${hasPreview ? '▶' : '🔒'}</span></div>
                </div>

                <div class="card-info">
                    <h2>${escHtml(beat.title)}</h2>
                    <p class="beat-meta">${beat.bpm} BPM &middot; ${beat.key} &middot; ${beat.genre}</p>
                    <p class="price">€${beat.licenses.basic.price} Lease <span class="divider">|</span> €${beat.licenses.exclusive.price} Exclusive</p>
                    <div class="card-actions">
                        <a href="licencias.html?beatId=${beat.id}"
                           class="btn btn-secondary btn-ver-licencias">
                            Ver Licencias
                        </a>
                        <button class="btn-quick-cart" onclick="quickAddToCart(this)">
                            <i class="fas fa-shopping-cart"></i> Añadir
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        initLikeButtons();

    } catch (err) {
        console.error('Error cargando catálogo:', err);
        catalogue.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px">Error cargando el catálogo. Intenta de nuevo.</p>';
    }
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function initLikeButtons() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        const id = btn.dataset.id;
        const liked = JSON.parse(localStorage.getItem('likedBeats') || '{}');
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
        beatId: card.dataset.id,
        licenseType: 'basic',
        title: card.dataset.title,
        image: card.dataset.img,
        license: 'Basic Lease',
        price: 29
    };
    if (window.Cart) window.Cart.add(item);
}

document.addEventListener('DOMContentLoaded', loadCatalog);
