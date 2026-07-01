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
    updateAddBeatAccess(data.user);
})();

// El botón de "Subir beat" solo se muestra a usuarios con plan de pago (Pro/Elite)
function updateAddBeatAccess(user) {
    const canAdd = !!(user && (user.plan === 'pro' || user.plan === 'elite'));
    document.querySelectorAll('.nav-add-beat-btn, .mobile-add-beat-link').forEach(el => {
        el.style.display = canAdd ? '' : 'none';
    });
}

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
        const verifiedBadge = user.verified
            ? `<i class="fas fa-circle-check" title="Cuenta verificada" style="color:#3b82f6;font-size:14px;flex-shrink:0"></i>`
            : '';
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
                ${user.avatar
                    ? `<img src="${user.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0">`
                    : `<span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4ecdc4,#2980b9);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#000;flex-shrink:0">${initial}</span>`
                }
                <span class="user-name-label">${user.name.split(' ')[0]}</span>
                ${verifiedBadge}
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
                <div style="display:flex;align-items:center;gap:10px">
                    ${user.avatar
                        ? `<img src="${user.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0">`
                        : `<span style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4ecdc4,#2980b9);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#000;flex-shrink:0">${initial}</span>`
                    }
                    <div>
                        <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#fff">
                            ${user.name} ${verifiedBadge} ${planBadge}
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:1px">${user.email}</div>
                    </div>
                </div>
                ${!user.verified ? renderVerifBadgeDropdown() : ''}
            </div>
            <a href="profile.html#perfil"   class="dd-item"><i class="fas fa-user"></i> Mi perfil</a>
            <a href="profile.html#compras"  class="dd-item"><i class="fas fa-download"></i> Mis compras</a>
            <a href="profile.html#likes"    class="dd-item"><i class="fas fa-heart"></i> Me gusta</a>
            <a href="profile.html#recientes" class="dd-item"><i class="fas fa-clock-rotate-left"></i> Últimos escuchados</a>
            <a href="profile.html#playlist" class="dd-item"><i class="fas fa-list-music"></i> Mis playlists</a>
            <div style="height:1px;background:#1c232b;margin:4px 0"></div>
            <a href="profile.html#settings" class="dd-item"><i class="fas fa-gear"></i> Configuración</a>
            <div style="height:1px;background:#1c232b;margin:4px 0"></div>
            ${user.isAdmin ? `<a href="/admin" class="dd-item" style="color:#f59e0b"><i class="fas fa-shield-halved" style="color:#f59e0b"></i> Panel admin</a><div style="height:1px;background:#1c232b;margin:4px 0"></div>` : ''}
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

function renderVerifBadgeDropdown() {
    return `<button onclick="openOtpModal()" style="margin-top:6px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#3b82f6;font-size:11px;font-weight:600;font-family:Inter,sans-serif;padding:4px 10px;border-radius:6px;cursor:pointer"><i class="fas fa-envelope-circle-check"></i> Verificar cuenta</button>`;
}

let otpResendTimer = 0;

async function openOtpModal() {
    let m = document.getElementById('otp-modal-overlay');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = 'otp-modal-overlay';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    m.innerHTML = `
    <div style="background:#11151a;border:1px solid #1c232b;border-radius:20px;width:100%;max-width:380px;padding:32px;position:relative;text-align:center">
        <button onclick="document.getElementById('otp-modal-overlay').remove()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1">&times;</button>
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(59,130,246,.12);border:2px solid rgba(59,130,246,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
            <i class="fas fa-envelope" style="color:#3b82f6;font-size:22px"></i>
        </div>
        <h2 style="font-size:17px;font-weight:800;color:#fff;margin-bottom:6px">Verifica tu cuenta</h2>
        <p id="otp-subtitle" style="font-size:12px;color:#94a3b8;margin-bottom:24px;line-height:1.6">Enviando código a tu email...</p>
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px" id="otp-inputs">
            ${[0,1,2,3,4,5].map(i => `<input id="otp-d${i}" maxlength="1" inputmode="numeric" pattern="[0-9]"
                style="width:44px;height:52px;text-align:center;font-size:22px;font-weight:700;font-family:monospace;
                background:#0b0d14;border:2px solid #1c232b;border-radius:10px;color:#fff;outline:none;
                transition:border-color .2s" oninput="otpInput(this,${i})" onkeydown="otpKey(event,${i})">`).join('')}
        </div>
        <div id="otp-error" style="display:none;color:#ef4444;font-size:12px;font-weight:600;margin-bottom:12px;padding:8px;background:rgba(239,68,68,.08);border-radius:6px"></div>
        <button id="otp-submit-btn" onclick="submitOtp()" disabled
            style="width:100%;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer;opacity:.4;transition:.2s">
            Verificar
        </button>
        <div style="margin-top:14px;font-size:12px;color:#64748b">
            ¿No recibiste el código?
            <button id="otp-resend-btn" onclick="resendOtp()" style="background:none;border:none;color:#3b82f6;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;padding:0">
                Reenviar
            </button>
            <span id="otp-timer" style="color:#64748b;font-size:12px"></span>
        </div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    await sendOtp();
}

async function sendOtp() {
    const res  = await fetch('/api/auth/send-otp', { method: 'POST' }).catch(() => null);
    const data = res ? await res.json() : null;
    const sub  = document.getElementById('otp-subtitle');
    if (res?.ok && !data?.already) {
        const masked = data.email.replace(/(.{2}).+(@.+)/, '$1***$2');
        if (sub) sub.textContent = `Hemos enviado un código de 6 dígitos a ${masked}. Expira en 10 minutos.`;
        startResendTimer(60);
        document.getElementById('otp-d0')?.focus();
    } else if (data?.already) {
        if (sub) sub.textContent = 'Tu cuenta ya está verificada.';
    } else {
        if (sub) sub.textContent = 'Error al enviar el código. Inténtalo de nuevo.';
    }
}

async function resendOtp() {
    if (otpResendTimer > 0) return;
    document.getElementById('otp-resend-btn').disabled = true;
    [0,1,2,3,4,5].forEach(i => { const el = document.getElementById(`otp-d${i}`); if (el) el.value = ''; });
    document.getElementById('otp-submit-btn').disabled = true;
    document.getElementById('otp-submit-btn').style.opacity = '.4';
    await sendOtp();
    document.getElementById('otp-resend-btn').disabled = false;
}

function startResendTimer(s) {
    otpResendTimer = s;
    const btn = document.getElementById('otp-resend-btn');
    const timer = document.getElementById('otp-timer');
    if (btn) btn.style.display = 'none';
    const iv = setInterval(() => {
        otpResendTimer--;
        if (timer) timer.textContent = ` (${otpResendTimer}s)`;
        if (otpResendTimer <= 0) {
            clearInterval(iv);
            if (btn) btn.style.display = 'inline';
            if (timer) timer.textContent = '';
        }
    }, 1000);
}

function otpInput(el, idx) {
    el.value = el.value.replace(/\D/g, '').slice(-1);
    el.style.borderColor = el.value ? '#3b82f6' : '#1c232b';
    if (el.value && idx < 5) document.getElementById(`otp-d${idx+1}`)?.focus();
    const code = [0,1,2,3,4,5].map(i => document.getElementById(`otp-d${i}`)?.value || '').join('');
    const btn = document.getElementById('otp-submit-btn');
    btn.disabled = code.length < 6;
    btn.style.opacity = code.length < 6 ? '.4' : '1';
    if (code.length === 6) btn.focus();
}

function otpKey(e, idx) {
    if (e.key === 'Backspace' && !e.target.value && idx > 0)
        document.getElementById(`otp-d${idx-1}`)?.focus();
}

async function submitOtp() {
    const code = [0,1,2,3,4,5].map(i => document.getElementById(`otp-d${i}`)?.value || '').join('');
    const btn  = document.getElementById('otp-submit-btn');
    const err  = document.getElementById('otp-error');
    err.style.display = 'none';
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const res  = await fetch('/api/auth/verify-otp', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) }).catch(() => null);
    const data = res ? await res.json() : null;
    if (res?.ok) {
        const wrap = document.getElementById('otp-modal-overlay').querySelector('div');
        wrap.innerHTML = `
            <div style="text-align:center;padding:16px 0">
                <i class="fas fa-circle-check" style="font-size:52px;color:#3b82f6;display:block;margin-bottom:16px"></i>
                <h3 style="color:#fff;font-size:18px;margin-bottom:8px">¡Cuenta verificada!</h3>
                <p style="color:#94a3b8;font-size:13px;margin-bottom:24px">Ya tienes el badge de verificado en tu perfil.</p>
                <button onclick="location.reload()" style="background:#3b82f6;color:#fff;border:none;padding:11px 28px;border-radius:8px;font-family:Inter,sans-serif;cursor:pointer;font-size:14px;font-weight:700">Continuar</button>
            </div>`;
    } else {
        btn.disabled = false; btn.innerHTML = 'Verificar'; btn.style.opacity = '1';
        err.textContent = data?.error || 'Código incorrecto.';
        err.style.display = 'block';
        [0,1,2,3,4,5].forEach(i => { const el = document.getElementById(`otp-d${i}`); if (el) { el.value = ''; el.style.borderColor = '#ef4444'; } });
        document.getElementById('otp-d0')?.focus();
    }
}
