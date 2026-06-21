/* ── Persistent Bottom Player ─────────────────────────────────────────────
   Incluido en catalog.html y licencias.html.
   Guarda estado en sessionStorage para que el audio persista al navegar.
──────────────────────────────────────────────────────────────────────────── */
(function () {

    // Inyectar HTML si no existe en la página
    if (!document.getElementById('bottom-player')) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="bottom-player">
            <div class="bp-wave-row">
                <span class="bp-time" id="bp-cur">0:00</span>
                <div class="bp-bar" id="bp-bar">
                    <div id="bp-waveform"></div>
                </div>
                <span class="bp-time" id="bp-dur">0:00</span>
            </div>
            <div class="bp-ctrl-row">
                <div class="bp-left">
                    <img class="bp-cover" id="bp-cover" src="" alt="">
                    <div class="bp-info">
                        <div class="bp-title" id="bp-title">—</div>
                        <div class="bp-artist">AlsxBeats</div>
                    </div>
                </div>
                <div class="bp-controls">
                    <button class="bp-icon" id="bp-like-btn" title="Me gusta">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="bp-icon" id="bp-prev-btn" title="Anterior">
                        <i class="fas fa-backward-step"></i>
                    </button>
                    <button class="bp-play" id="bp-play-btn">
                        <i class="fas fa-play" id="bp-play-icon"></i>
                    </button>
                    <button class="bp-icon" id="bp-next-btn" title="Siguiente">
                        <i class="fas fa-forward-step"></i>
                    </button>
                    <button class="bp-icon" title="Playlist">
                        <i class="fas fa-list"></i>
                    </button>
                </div>
                <div class="bp-right">
                    <a class="bp-buy-btn" id="bp-buy-btn" href="#" title="Ver licencias">
                        <i class="fas fa-bag-shopping"></i>
                        <span id="bp-price"></span>
                    </a>
                    <i class="fas fa-volume-high"></i>
                    <input type="range" class="bp-vol" id="bp-vol"
                           min="0" max="1" step="0.05" value="1">
                </div>
            </div>
        </div>`);
    }

    const bpPanel    = document.getElementById('bottom-player');
    const bpPlayIcon = document.getElementById('bp-play-icon');
    const bpCur      = document.getElementById('bp-cur');
    const bpDur      = document.getElementById('bp-dur');

    let currentRow    = null;
    let currentBeatId = null;
    let lastSavedSec  = -1;

    // ── WaveSurfer ──────────────────────────────────────────
    const ws = WaveSurfer.create({
        container: '#bp-waveform',
        backend: 'MediaElement',
        waveColor: '#1b2330',
        progressColor: '#4ecdc4',
        cursorColor: '#4ecdc4',
        height: 44,
        barWidth: 3,
        barGap: 2,
        barRadius: 8,
        cursorWidth: 2,
        interact: true,
    });

    ws.on('ready', () => {
        bpDur.textContent = fmt(ws.getDuration());
        const savedTime = parseFloat(sessionStorage.getItem('bp_time') || '0');
        if (savedTime > 0 && ws.getDuration() > 0) {
            ws.seekTo(savedTime / ws.getDuration());
        }
        if (!window._bpNoAutoPlay) {
            ws.play();
            bpPlayIcon.className = 'fas fa-pause';
        }
    });

    ws.on('audioprocess', () => {
        bpCur.textContent = fmt(ws.getCurrentTime());
        const t = Math.floor(ws.getCurrentTime());
        if (t !== lastSavedSec) {
            lastSavedSec = t;
            sessionStorage.setItem('bp_time', ws.getCurrentTime());
        }
    });

    ws.on('seek', () => {
        bpCur.textContent = fmt(ws.getCurrentTime());
    });

    ws.on('finish', () => {
        bpPlayIcon.className = 'fas fa-play';
        bpNext();
    });

    // ── Helpers ─────────────────────────────────────────────
    function fmt(s) {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    }

    function updateLike() {
        const btn = document.getElementById('bp-like-btn');
        if (!btn || !currentBeatId) return;
        const liked = JSON.parse(localStorage.getItem('likedBeats') || '{}');
        btn.innerHTML = liked[currentBeatId]
            ? '<i class="fas fa-heart"></i>'
            : '<i class="far fa-heart"></i>';
        btn.classList.toggle('liked', !!liked[currentBeatId]);
    }

    function bpTogglePlay() {
        ws.playPause();
        bpPlayIcon.className = ws.isPlaying() ? 'fas fa-pause' : 'fas fa-play';
    }

    function bpPrev() {
        const rows = Array.from(document.querySelectorAll('.beat-row'));
        const idx  = rows.indexOf(currentRow);
        if (idx > 0) rows[idx - 1].querySelector('.row-play')?.click();
    }

    function bpNext() {
        const rows = Array.from(document.querySelectorAll('.beat-row'));
        const idx  = rows.indexOf(currentRow);
        if (idx !== -1 && idx < rows.length - 1)
            rows[idx + 1].querySelector('.row-play')?.click();
    }

    function bpToggleLike() {
        if (!currentBeatId) return;
        const liked = JSON.parse(localStorage.getItem('likedBeats') || '{}');
        liked[currentBeatId] = !liked[currentBeatId];
        localStorage.setItem('likedBeats', JSON.stringify(liked));
        updateLike();
    }

    // ── Botones ─────────────────────────────────────────────
    document.getElementById('bp-play-btn').addEventListener('click', bpTogglePlay);
    document.getElementById('bp-prev-btn').addEventListener('click', bpPrev);
    document.getElementById('bp-next-btn').addEventListener('click', bpNext);
    document.getElementById('bp-like-btn').addEventListener('click', bpToggleLike);
    document.getElementById('bp-vol').addEventListener('input',
        e => ws.setVolume(parseFloat(e.target.value)));

    // ── API pública para catalog.js ─────────────────────────
    window.bpPause = function () {
        if (ws.isPlaying()) ws.pause();
        bpPlayIcon.className = 'fas fa-play';
    };

    window.bpLoad = function (src, title, cover, row, price) {
        if (currentRow) currentRow.classList.remove('playing');
        currentRow    = row;
        currentBeatId = row ? row.dataset.id : null;
        if (row) row.classList.add('playing');

        document.getElementById('bp-title').textContent = title;
        document.getElementById('bp-cover').src         = cover;
        bpPanel.classList.add('visible');
        bpPlayIcon.className = 'fas fa-pause';

        const buyBtn   = document.getElementById('bp-buy-btn');
        const priceEl  = document.getElementById('bp-price');
        if (buyBtn) buyBtn.href = currentBeatId ? `licencias.html?beatId=${currentBeatId}` : '#';
        if (priceEl) priceEl.textContent = price ? `€${price}` : '';

        sessionStorage.setItem('bp_state', JSON.stringify({
            src, title, cover, beatId: currentBeatId, price: price || null
        }));
        sessionStorage.setItem('bp_time', '0');
        lastSavedSec = -1;

        ws.load(src);
        updateLike();
    };

    // ── Restaurar al volver de otra página ──────────────────
    const saved = JSON.parse(sessionStorage.getItem('bp_state') || 'null');
    if (saved && saved.src) {
        document.getElementById('bp-title').textContent = saved.title;
        document.getElementById('bp-cover').src         = saved.cover;
        currentBeatId = saved.beatId;
        bpPanel.classList.add('visible');
        const buyBtn  = document.getElementById('bp-buy-btn');
        const priceEl = document.getElementById('bp-price');
        if (buyBtn) buyBtn.href = saved.beatId ? `licencias.html?beatId=${saved.beatId}` : '#';
        if (priceEl) priceEl.textContent = saved.price ? `€${saved.price}` : '';
        updateLike();
        ws.load(saved.src);
    }

})();
