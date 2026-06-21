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
                <span style="
                    width:28px;height:28px;border-radius:50%;
                    background:linear-gradient(135deg,#4ecdc4,#2980b9);
                    display:flex;align-items:center;justify-content:center;
                    font-size:12px;font-weight:800;color:#000;flex-shrink:0;
                ">${initial}</span>
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
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#fff">
                    ${user.name} ${verifiedBadge} ${planBadge}
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px">${user.email}</div>
                ${!user.verified ? renderVerifBadgeDropdown(user) : ''}
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

function renderVerifBadgeDropdown(user) {
    const s = user.verificationStatus || 'none';
    if (s === 'pending')
        return `<div style="margin-top:6px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:#f59e0b;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:5px"><i class="fas fa-clock"></i> Verificación en revisión</div>`;
    if (s === 'rejected')
        return `<div style="margin-top:6px"><div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#ef4444;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:5px"><i class="fas fa-xmark"></i> Solicitud rechazada</div><div style="font-size:10px;color:#94a3b8;margin-top:3px">${user.verificationData?.rejectionReason || ''}</div><button onclick="openKycModal()" style="margin-top:5px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#3b82f6;font-size:11px;font-weight:600;font-family:Inter,sans-serif;padding:4px 10px;border-radius:6px;cursor:pointer"><i class="fas fa-rotate-right"></i> Volver a solicitar</button></div>`;
    return `<button onclick="openKycModal()" style="margin-top:6px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.25);color:#3b82f6;font-size:11px;font-weight:600;font-family:Inter,sans-serif;padding:4px 10px;border-radius:6px;cursor:pointer"><i class="fas fa-shield-halved"></i> Solicitar verificación</button>`;
}

function openKycModal() {
    let m = document.getElementById('kyc-modal-overlay');
    if (!m) {
        m = document.createElement('div');
        m.id = 'kyc-modal-overlay';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
        m.innerHTML = `
        <div style="background:#11151a;border:1px solid #1c232b;border-radius:20px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:32px;position:relative">
            <button onclick="document.getElementById('kyc-modal-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">&times;</button>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                <i class="fas fa-shield-halved" style="color:#3b82f6;font-size:22px"></i>
                <h2 style="font-size:18px;font-weight:800;color:#fff">Solicitud de verificación</h2>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-bottom:24px;line-height:1.6;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:10px 12px">
                <i class="fas fa-lock" style="color:#3b82f6"></i> Tus datos se tratarán de forma <strong style="color:#fff">estrictamente confidencial</strong> y únicamente para verificar tu identidad. Al enviar, declaras que la información es verídica y aceptas responsabilidad legal por datos falsos.
            </p>
            <div id="kyc-form-wrap">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                <div style="grid-column:1/-1">
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Nombre legal completo <span style="color:#ef4444">*</span></label>
                    <input id="kyc-fullname" type="text" placeholder="Tal como aparece en tu documento" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                </div>
                <div>
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Tipo de documento <span style="color:#ef4444">*</span></label>
                    <select id="kyc-doctype" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                        <option value="">Seleccionar...</option>
                        <option value="DNI">DNI</option>
                        <option value="NIE">NIE</option>
                        <option value="Pasaporte">Pasaporte</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Número de documento <span style="color:#ef4444">*</span></label>
                    <input id="kyc-docnum" type="text" placeholder="Ej: 12345678A" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                </div>
                <div>
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">País de residencia <span style="color:#ef4444">*</span></label>
                    <input id="kyc-country" type="text" placeholder="Ej: España" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                </div>
                <div>
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Fecha de nacimiento <span style="color:#ef4444">*</span></label>
                    <input id="kyc-birth" type="date" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;color-scheme:dark">
                </div>
                <div style="grid-column:1/-1">
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Enlace a foto del documento — frente y reverso <span style="color:#ef4444">*</span></label>
                    <input id="kyc-docurl" type="url" placeholder="Google Drive / Dropbox (acceso con enlace)" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                    <p style="font-size:11px;color:#64748b;margin-top:4px">Sube ambas caras en un mismo archivo o carpeta compartida</p>
                </div>
                <div style="grid-column:1/-1">
                    <label style="display:block;font-size:12px;color:#94a3b8;margin-bottom:5px">Enlace a selfie sosteniendo el documento <span style="color:#ef4444">*</span></label>
                    <input id="kyc-selfieurl" type="url" placeholder="Google Drive / Dropbox (acceso con enlace)" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none">
                    <p style="font-size:11px;color:#64748b;margin-top:4px">Tu cara y el documento deben ser claramente visibles</p>
                </div>
                <div style="grid-column:1/-1;display:flex;align-items:flex-start;gap:10px;background:rgba(255,255,255,.03);border:1px solid #1c232b;border-radius:8px;padding:12px">
                    <input type="checkbox" id="kyc-declare" style="width:16px;height:16px;flex-shrink:0;margin-top:1px;accent-color:#3b82f6;cursor:pointer">
                    <label for="kyc-declare" style="font-size:11px;color:#94a3b8;line-height:1.6;cursor:pointer">Declaro bajo mi responsabilidad que todos los datos facilitados son verídicos y que el documento presentado me pertenece. Soy consciente de que proporcionar información falsa puede tener consecuencias legales.</label>
                </div>
            </div>
            <div id="kyc-error" style="display:none;margin-top:12px;color:#ef4444;font-size:12px;font-weight:600"></div>
            <button onclick="submitKyc()" style="margin-top:20px;width:100%;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer;transition:.2s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                <i class="fas fa-paper-plane"></i> Enviar solicitud
            </button>
            </div>
        </div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
    }
    m.style.display = 'flex';
}

async function submitKyc() {
    const err = document.getElementById('kyc-error');
    err.style.display = 'none';
    const fields = {
        fullName:      document.getElementById('kyc-fullname').value.trim(),
        documentType:  document.getElementById('kyc-doctype').value,
        documentNumber:document.getElementById('kyc-docnum').value.trim(),
        country:       document.getElementById('kyc-country').value.trim(),
        birthDate:     document.getElementById('kyc-birth').value,
        documentUrl:   document.getElementById('kyc-docurl').value.trim(),
        selfieUrl:     document.getElementById('kyc-selfieurl').value.trim()
    };
    if (!document.getElementById('kyc-declare').checked)
        return showKycError('Debes aceptar la declaración de veracidad.');
    if (Object.values(fields).some(v => !v))
        return showKycError('Todos los campos son obligatorios.');

    const btn = document.querySelector('#kyc-modal-overlay button[onclick="submitKyc()"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const res  = await fetch('/api/auth/verification-request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(fields) }).catch(() => null);
    const data = res ? await res.json() : null;

    if (res?.ok) {
        document.getElementById('kyc-form-wrap').innerHTML = `
            <div style="text-align:center;padding:20px 0">
                <i class="fas fa-circle-check" style="font-size:48px;color:#22c55e;margin-bottom:16px;display:block"></i>
                <h3 style="color:#fff;margin-bottom:8px">Solicitud enviada</h3>
                <p style="color:#94a3b8;font-size:13px">Revisaremos tu documentación en un plazo de 1–3 días hábiles. Te notificaremos el resultado.</p>
                <button onclick="document.getElementById('kyc-modal-overlay').style.display='none'" style="margin-top:20px;background:#1c232b;border:none;color:#fff;padding:10px 24px;border-radius:8px;font-family:Inter,sans-serif;cursor:pointer">Cerrar</button>
            </div>`;
    } else {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar solicitud';
        showKycError(data?.error || 'Error al enviar la solicitud.');
    }
}

function showKycError(msg) {
    const err = document.getElementById('kyc-error');
    err.textContent = msg;
    err.style.display = 'block';
}
