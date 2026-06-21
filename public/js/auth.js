// Estilos del dropdown
const ddStyle = document.createElement('style');
ddStyle.textContent = `
    .dd-item {
        display:flex;align-items:center;gap:10px;
        padding:9px 14px;border-radius:8px;
        font-size:13px;font-weight:500;color:#cbd5e1;
        text-decoration:none;cursor:pointer;
        background:none;border:none;width:100%;
        font-family:Inter,sans-serif;transition:.15s;
    }
    .dd-item i { width:14px;font-size:12px;color:#94a3b8; }
    .dd-item:hover { background:rgba(255,255,255,.05);color:#fff; }
    .dd-item:hover i { color:#4ecdc4; }
    .dd-danger { color:#ef4444 !important; }
    .dd-danger i { color:#ef4444 !important; }
    .dd-danger:hover { background:rgba(239,68,68,.08) !important; }
    @keyframes ddFadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
`;
document.head.appendChild(ddStyle);

// Init
(async function () {
    const res  = await fetch('/api/auth/me').catch(() => null);
    const data = res ? await res.json() : { user: null };
    window.__authUser = data.user;
    renderAuthNav(data.user);
})();

function renderAuthNav(user) {
    // Busca o crea el widget
    let widget = document.getElementById('auth-widget');
    if (!widget) {
        const nav = document.querySelector('.nav-container');
        if (!nav) return;
        widget = document.createElement('div');
        widget.id = 'auth-widget';
        nav.appendChild(widget);
    }
    widget.style.cssText = 'display:flex;align-items:center;gap:10px;position:relative;justify-content:flex-end;';

    if (user) {
        const initial   = user.name.charAt(0).toUpperCase();
        const planBadge = user.plan === 'pro'
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:999px;font-size:10px;font-weight:700;padding:2px 8px;"><i class="fas fa-bolt" style="font-size:9px"></i> Pro</span>`
            : user.plan === 'elite'
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:999px;font-size:10px;font-weight:700;padding:2px 8px;"><i class="fas fa-crown" style="font-size:9px"></i> Elite</span>`
            : '';
        widget.innerHTML = `
            <button id="user-menu-btn" style="
                display:flex;align-items:center;gap:9px;
                background:rgba(255,255,255,.05);
                border:1px solid rgba(255,255,255,.1);
                color:#fff;padding:7px 14px 7px 8px;
                border-radius:999px;cursor:pointer;
                font-family:Inter,sans-serif;font-size:14px;font-weight:600;
            ">
                <span style="
                    width:28px;height:28px;border-radius:50%;
                    background:linear-gradient(135deg,#4ecdc4,#2980b9);
                    display:flex;align-items:center;justify-content:center;
                    font-size:12px;font-weight:800;color:#000;flex-shrink:0;
                ">${initial}</span>
                <span class="user-name-label">${user.name.split(' ')[0]}</span>
                ${planBadge}
                <i id="dd-chevron" class="fas fa-chevron-down dd-chevron" style="font-size:10px;color:#94a3b8;transition:transform .2s"></i>
            </button>
        `;

        // Dropdown pegado al body
        let dd = document.getElementById('user-dropdown-global');
        if (dd) dd.remove();
        dd = document.createElement('div');
        dd.id = 'user-dropdown-global';
        dd.style.cssText = 'position:fixed;background:#11151a;border:1px solid #1c232b;border-radius:14px;min-width:210px;box-shadow:0 16px 40px rgba(0,0,0,.7);padding:6px;display:none;z-index:99999;animation:ddFadeIn .15s ease;';
        dd.innerHTML = `
            <div style="padding:12px 14px 10px;border-bottom:1px solid #1c232b;margin-bottom:4px">
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#fff">
                    ${user.name} ${planBadge}
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px">${user.email}</div>
            </div>
            <a href="profile.html#perfil"   class="dd-item"><i class="fas fa-user"></i> Mi perfil</a>
            <a href="profile.html#compras"  class="dd-item"><i class="fas fa-download"></i> Mis compras</a>
            <a href="profile.html#likes"    class="dd-item"><i class="fas fa-heart"></i> Me gusta</a>
            <a href="profile.html#recientes" class="dd-item"><i class="fas fa-clock-rotate-left"></i> Últimos escuchados</a>
            <a href="profile.html#playlist" class="dd-item"><i class="fas fa-list-music"></i> Mis playlists</a>
            <div style="height:1px;background:#1c232b;margin:4px 0"></div>
            <a href="profile.html#settings" class="dd-item"><i class="fas fa-gear"></i> Configuración</a>
            <div style="height:1px;background:#1c232b;margin:4px 0"></div>
            <button onclick="authLogout()" class="dd-item dd-danger"><i class="fas fa-right-from-bracket"></i> Cerrar sesión</button>
        `;
        document.body.appendChild(dd);

        const btn     = document.getElementById('user-menu-btn');
        const chevron = document.getElementById('dd-chevron');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dd.style.display === 'block';
            if (!open) {
                const rect = btn.getBoundingClientRect();
                dd.style.top   = (rect.bottom + 8) + 'px';
                dd.style.right = (window.innerWidth - rect.right) + 'px';
                dd.style.left  = 'auto';
            }
            dd.style.display = open ? 'none' : 'block';
            chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        document.addEventListener('click', (e) => {
            if (!dd.contains(e.target)) {
                dd.style.display = 'none';
                chevron.style.transform = 'rotate(0deg)';
            }
        });

        // Actualizar menú móvil cuando hay sesión
        const mobileAuth = document.getElementById('mobile-auth-links');
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <a href="profile.html">Mi perfil</a>
                <a href="profile.html#compras">Mis compras</a>
                <a href="#" onclick="authLogout();return false;" style="color:#ef4444;">Cerrar sesión</a>
            `;
        }

    } else {
        widget.innerHTML = `
            <a href="login.html" style="color:#94a3b8;font-size:14px;font-weight:600;text-decoration:none;padding:8px 14px;transition:color .2s"
               onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">
                Iniciar sesión
            </a>
            <a href="register.html" style="background:#4ecdc4;color:#000;font-size:13px;font-weight:700;text-decoration:none;padding:8px 18px;border-radius:8px;transition:opacity .2s"
               onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                Registrarse
            </a>
        `;
    }
}

async function authLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}
