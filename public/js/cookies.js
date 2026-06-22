(function () {
    if (localStorage.getItem('cookie_consent')) return;

    const style = document.createElement('style');
    style.textContent = `
        #cookie-banner {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99999;
            background: #11151a;
            border: 1px solid #1c232b;
            border-radius: 16px;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            max-width: 780px;
            width: calc(100% - 48px);
            box-shadow: 0 8px 40px rgba(0,0,0,.5);
            animation: cb-in .3s ease;
        }
        @keyframes cb-in {
            from { opacity: 0; transform: translateX(-50%) translateY(16px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        #cookie-banner p {
            flex: 1;
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.6;
            margin: 0;
        }
        #cookie-banner p a {
            color: #4ecdc4;
            text-decoration: none;
            font-weight: 600;
        }
        #cookie-banner p a:hover { text-decoration: underline; }
        .cb-actions {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
        }
        .cb-btn {
            font-family: 'Inter', sans-serif;
            font-size: 13px;
            font-weight: 700;
            padding: 9px 18px;
            border-radius: 9px;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            transition: opacity .2s;
        }
        .cb-btn:hover { opacity: .85; }
        .cb-accept { background: #4ecdc4; color: #000; }
        .cb-reject { background: rgba(255,255,255,.06); color: #94a3b8; border: 1px solid #1c232b; }
        .cb-reject:hover { color: #fff; }
        @media (max-width: 600px) {
            #cookie-banner { flex-direction: column; align-items: flex-start; gap: 14px; bottom: 16px; }
            .cb-actions { width: 100%; }
            .cb-btn { flex: 1; text-align: center; }
        }
    `;
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
        <p>
            Usamos cookies propias para mejorar tu experiencia y procesar pagos de forma segura.
            Al continuar navegando aceptas su uso.
            <a href="privacidad.html#cookies">Más información</a>
        </p>
        <div class="cb-actions">
            <button class="cb-btn cb-reject" id="cb-reject">Solo necesarias</button>
            <button class="cb-btn cb-accept" id="cb-accept">Aceptar</button>
        </div>
    `;
    document.body.appendChild(banner);

    function dismiss(value) {
        localStorage.setItem('cookie_consent', value);
        banner.style.animation = 'none';
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(16px)';
        banner.style.transition = 'opacity .25s, transform .25s';
        setTimeout(() => banner.remove(), 280);
    }

    document.getElementById('cb-accept').addEventListener('click', () => dismiss('all'));
    document.getElementById('cb-reject').addEventListener('click', () => dismiss('necessary'));
})();
