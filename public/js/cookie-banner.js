(function () {
    if (localStorage.getItem('cookieConsent')) return;

    var css = [
        '#cookie-banner{',
            'position:fixed;bottom:0;left:0;right:0;z-index:99999;',
            'background:rgba(11,13,20,.97);',
            'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
            'border-top:1px solid rgba(255,255,255,.08);',
            'padding:18px 32px;',
            'font-family:"Inter",sans-serif;',
            'box-shadow:0 -8px 32px rgba(0,0,0,.4);',
        '}',
        '.cb-inner{',
            'max-width:1200px;margin:0 auto;',
            'display:flex;align-items:center;gap:24px;flex-wrap:wrap;',
        '}',
        '.cb-text{flex:1;min-width:260px;}',
        '.cb-text p{font-size:13px;color:#94a3b8;line-height:1.6;margin:0;}',
        '.cb-text strong{color:#fff;font-size:14px;}',
        '.cb-text a{color:#4ecdc4;text-decoration:none;}',
        '.cb-text a:hover{text-decoration:underline;}',
        '.cb-actions{display:flex;gap:10px;flex-shrink:0;flex-wrap:wrap;}',
        '.cb-btn-ess{',
            'background:rgba(255,255,255,.05);',
            'border:1px solid rgba(255,255,255,.12);',
            'color:#94a3b8;font-size:13px;font-weight:600;',
            'font-family:"Inter",sans-serif;',
            'padding:10px 20px;border-radius:9px;',
            'cursor:pointer;transition:.2s;white-space:nowrap;',
        '}',
        '.cb-btn-ess:hover{background:rgba(255,255,255,.09);color:#fff;}',
        '.cb-btn-acc{',
            'background:#4ecdc4;border:none;color:#000;',
            'font-size:13px;font-weight:700;',
            'font-family:"Inter",sans-serif;',
            'padding:10px 22px;border-radius:9px;',
            'cursor:pointer;transition:opacity .2s;white-space:nowrap;',
        '}',
        '.cb-btn-acc:hover{opacity:.85;}',
        '@media(max-width:600px){',
            '#cookie-banner{padding:14px 16px;}',
            '.cb-actions{width:100%;}',
            '.cb-btn-ess,.cb-btn-acc{flex:1;text-align:center;}',
        '}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML =
        '<div class="cb-inner">' +
            '<div class="cb-text">' +
                '<p><strong>Usamos cookies</strong></p>' +
                '<p>Utilizamos cookies esenciales para el funcionamiento de la web (sesión, carrito) y cookies de pago gestionadas por Stripe. ' +
                'No usamos cookies publicitarias ni de rastreo. ' +
                '<a href="privacidad.html">Política de privacidad</a>.</p>' +
            '</div>' +
            '<div class="cb-actions">' +
                '<button class="cb-btn-ess" id="cb-ess">Solo esenciales</button>' +
                '<button class="cb-btn-acc" id="cb-acc">Aceptar todo</button>' +
            '</div>' +
        '</div>';

    function dismiss(val) {
        localStorage.setItem('cookieConsent', val);
        banner.style.transition = 'opacity .35s, transform .35s';
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(20px)';
        setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 380);
    }

    function init() {
        document.body.appendChild(banner);
        document.getElementById('cb-acc').onclick = function () { dismiss('all'); };
        document.getElementById('cb-ess').onclick = function () { dismiss('essential'); };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
