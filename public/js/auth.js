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

const kycData = {};
let kycStep = 1;

function openKycModal() {
    kycStep = 1;
    let m = document.getElementById('kyc-modal-overlay');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = 'kyc-modal-overlay';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
    m.innerHTML = `
    <div style="background:#11151a;border:1px solid #1c232b;border-radius:20px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;padding:32px;position:relative">
        <button onclick="document.getElementById('kyc-modal-overlay').remove()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1">&times;</button>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <i class="fas fa-shield-halved" style="color:#3b82f6;font-size:20px"></i>
            <h2 style="font-size:17px;font-weight:800;color:#fff">Verificación de identidad</h2>
        </div>
        <div id="kyc-steps-bar" style="display:flex;gap:6px;margin:16px 0 24px"></div>
        <div id="kyc-step-content"></div>
    </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    renderKycStep();
}

function renderKycStep() {
    const bar = document.getElementById('kyc-steps-bar');
    const content = document.getElementById('kyc-step-content');
    const totalSteps = 4;
    const labels = ['Datos personales', 'Documento', 'Selfie', 'Declaración'];
    bar.innerHTML = labels.map((l, i) => {
        const n = i + 1;
        const active = n === kycStep;
        const done = n < kycStep;
        return `<div style="flex:1;text-align:center">
            <div style="width:28px;height:28px;border-radius:50%;margin:0 auto 4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
                background:${done ? '#22c55e' : active ? '#3b82f6' : '#1c232b'};
                color:${done || active ? '#fff' : '#64748b'};
                border:2px solid ${done ? '#22c55e' : active ? '#3b82f6' : '#1c232b'}">
                ${done ? '<i class="fas fa-check" style="font-size:10px"></i>' : n}
            </div>
            <div style="font-size:10px;color:${active ? '#fff' : '#64748b'};font-weight:${active ? '600' : '400'}">${l}</div>
        </div>`;
    }).join('<div style="flex:0;width:1px;background:#1c232b;margin:14px 0 0"></div>');

    const inp = (id, type, ph, extra='') =>
        `<input id="${id}" type="${type}" placeholder="${ph}" ${extra} style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:11px 13px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;margin-top:5px;box-sizing:border-box">`;
    const lbl = t => `<label style="font-size:12px;color:#94a3b8;font-weight:500">${t} <span style="color:#ef4444">*</span></label>`;
    const err = `<div id="kyc-error" style="display:none;margin-top:10px;color:#ef4444;font-size:12px;font-weight:600;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px"></div>`;

    if (kycStep === 1) {
        content.innerHTML = `
            <p style="font-size:12px;color:#94a3b8;margin-bottom:20px;line-height:1.6;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:10px 12px">
                <i class="fas fa-lock" style="color:#3b82f6"></i> Tus datos son <strong style="color:#fff">estrictamente confidenciales</strong> y se usan exclusivamente para verificar tu identidad.
            </p>
            <div style="display:flex;flex-direction:column;gap:14px">
                <div>${lbl('Nombre legal completo')}${inp('kyc-fullname','text','Tal como aparece en tu documento')}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div>${lbl('Tipo de documento')}
                        <select id="kyc-doctype" style="width:100%;background:#0b0d14;border:1px solid #1c232b;color:#fff;padding:11px 13px;border-radius:8px;font-size:13px;font-family:Inter,sans-serif;outline:none;margin-top:5px">
                            <option value="">Seleccionar...</option>
                            <option value="DNI">DNI</option><option value="NIE">NIE</option>
                            <option value="Pasaporte">Pasaporte</option><option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div>${lbl('Número de documento')}${inp('kyc-docnum','text','Ej: 12345678A')}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div>${lbl('País de residencia')}${inp('kyc-country','text','Ej: España')}</div>
                    <div>${lbl('Fecha de nacimiento')}${inp('kyc-birth','date','','style="color-scheme:dark"')}</div>
                </div>
            </div>
            ${err}
            <button onclick="kycNext1()" style="margin-top:20px;width:100%;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer">
                Continuar <i class="fas fa-arrow-right"></i>
            </button>`;
        if (kycData.fullName) document.getElementById('kyc-fullname').value = kycData.fullName;
        if (kycData.documentType) document.getElementById('kyc-doctype').value = kycData.documentType;
        if (kycData.documentNumber) document.getElementById('kyc-docnum').value = kycData.documentNumber;
        if (kycData.country) document.getElementById('kyc-country').value = kycData.country;
        if (kycData.birthDate) document.getElementById('kyc-birth').value = kycData.birthDate;
    }

    else if (kycStep === 2) {
        content.innerHTML = `
            <div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:10px;padding:16px;margin-bottom:20px">
                <p style="font-size:13px;color:#fff;font-weight:600;margin-bottom:6px"><i class="fas fa-id-card" style="color:#3b82f6"></i> Foto del documento — frente y reverso</p>
                <p style="font-size:12px;color:#94a3b8;line-height:1.6">Sube una imagen que muestre claramente <strong style="color:#fff">ambas caras</strong> de tu documento en Google Drive. Asegúrate de que el enlace sea accesible para cualquier persona con el link.</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
                <a href="https://drive.google.com/drive/my-drive" target="_blank" id="kyc-drive-doc-btn"
                   style="display:flex;align-items:center;justify-content:center;gap:10px;background:#1c232b;border:1px solid #2d3748;color:#fff;padding:13px;border-radius:10px;font-weight:600;font-size:14px;font-family:Inter,sans-serif;text-decoration:none;transition:.2s"
                   onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#2d3748'">
                    <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" style="width:20px;height:20px"> Abrir Google Drive
                </a>
                <div style="display:flex;align-items:center;gap:8px;color:#64748b;font-size:11px">
                    <div style="flex:1;height:1px;background:#1c232b"></div> después de subir, copia el enlace y pégalo aquí <div style="flex:1;height:1px;background:#1c232b"></div>
                </div>
                <div>${lbl('Enlace al documento (acceso público con enlace)')}${inp('kyc-docurl','url','https://drive.google.com/...')}</div>
            </div>
            ${err}
            <div style="display:flex;gap:10px;margin-top:20px">
                <button onclick="kycStep=1;renderKycStep()" style="flex:0;background:#1c232b;border:none;color:#94a3b8;padding:13px 20px;border-radius:10px;font-family:Inter,sans-serif;cursor:pointer;font-size:13px">
                    <i class="fas fa-arrow-left"></i> Atrás
                </button>
                <button onclick="kycNext2()" style="flex:1;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer">
                    Continuar <i class="fas fa-arrow-right"></i>
                </button>
            </div>`;
        if (kycData.documentUrl) document.getElementById('kyc-docurl').value = kycData.documentUrl;
    }

    else if (kycStep === 3) {
        content.innerHTML = `
            <div style="background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:10px;padding:16px;margin-bottom:20px">
                <p style="font-size:13px;color:#fff;font-weight:600;margin-bottom:6px"><i class="fas fa-camera" style="color:#3b82f6"></i> Selfie sosteniendo tu documento</p>
                <p style="font-size:12px;color:#94a3b8;line-height:1.6">Tómate una foto <strong style="color:#fff">sujetando tu documento abierto</strong> junto a tu cara. Ambos deben ser claramente visibles. Sube la imagen a Google Drive y comparte el enlace.</p>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px">
                <a href="https://drive.google.com/drive/my-drive" target="_blank"
                   style="display:flex;align-items:center;justify-content:center;gap:10px;background:#1c232b;border:1px solid #2d3748;color:#fff;padding:13px;border-radius:10px;font-weight:600;font-size:14px;font-family:Inter,sans-serif;text-decoration:none;transition:.2s"
                   onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#2d3748'">
                    <img src="https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" style="width:20px;height:20px"> Abrir Google Drive
                </a>
                <div style="display:flex;align-items:center;gap:8px;color:#64748b;font-size:11px">
                    <div style="flex:1;height:1px;background:#1c232b"></div> después de subir, copia el enlace y pégalo aquí <div style="flex:1;height:1px;background:#1c232b"></div>
                </div>
                <div>${lbl('Enlace a la selfie (acceso público con enlace)')}${inp('kyc-selfieurl','url','https://drive.google.com/...')}</div>
            </div>
            ${err}
            <div style="display:flex;gap:10px;margin-top:20px">
                <button onclick="kycStep=2;renderKycStep()" style="flex:0;background:#1c232b;border:none;color:#94a3b8;padding:13px 20px;border-radius:10px;font-family:Inter,sans-serif;cursor:pointer;font-size:13px">
                    <i class="fas fa-arrow-left"></i> Atrás
                </button>
                <button onclick="kycNext3()" style="flex:1;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer">
                    Continuar <i class="fas fa-arrow-right"></i>
                </button>
            </div>`;
        if (kycData.selfieUrl) document.getElementById('kyc-selfieurl').value = kycData.selfieUrl;
    }

    else if (kycStep === 4) {
        content.innerHTML = `
            <div style="background:rgba(255,255,255,.03);border:1px solid #1c232b;border-radius:10px;padding:14px;margin-bottom:20px;font-size:12px;color:#94a3b8;line-height:1.8">
                <div><span style="color:#64748b">Nombre legal:</span> <strong style="color:#fff">${kycData.fullName}</strong></div>
                <div><span style="color:#64748b">Documento:</span> <strong style="color:#fff">${kycData.documentType} · ${kycData.documentNumber}</strong></div>
                <div><span style="color:#64748b">País:</span> <strong style="color:#fff">${kycData.country}</strong></div>
                <div><span style="color:#64748b">Nacimiento:</span> <strong style="color:#fff">${kycData.birthDate}</strong></div>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.15);border-radius:8px;padding:14px;margin-bottom:6px">
                <input type="checkbox" id="kyc-declare" style="width:17px;height:17px;flex-shrink:0;margin-top:1px;accent-color:#3b82f6;cursor:pointer">
                <label for="kyc-declare" style="font-size:11px;color:#94a3b8;line-height:1.7;cursor:pointer">
                    Declaro bajo mi responsabilidad que <strong style="color:#fff">todos los datos facilitados son verídicos</strong>, que el documento presentado me pertenece y que las imágenes enviadas son auténticas. Soy consciente de que proporcionar información falsa o documentación fraudulenta puede tener <strong style="color:#fff">consecuencias legales</strong>.
                </label>
            </div>
            ${err}
            <div style="display:flex;gap:10px;margin-top:16px">
                <button onclick="kycStep=3;renderKycStep()" style="flex:0;background:#1c232b;border:none;color:#94a3b8;padding:13px 20px;border-radius:10px;font-family:Inter,sans-serif;cursor:pointer;font-size:13px">
                    <i class="fas fa-arrow-left"></i> Atrás
                </button>
                <button id="kyc-submit-btn" onclick="submitKyc()" style="flex:1;background:#3b82f6;color:#fff;border:none;padding:13px;border-radius:10px;font-weight:700;font-size:14px;font-family:Inter,sans-serif;cursor:pointer">
                    <i class="fas fa-paper-plane"></i> Enviar solicitud
                </button>
            </div>`;
    }
}

function kycNext1() {
    const fullName = document.getElementById('kyc-fullname').value.trim();
    const documentType = document.getElementById('kyc-doctype').value;
    const documentNumber = document.getElementById('kyc-docnum').value.trim();
    const country = document.getElementById('kyc-country').value.trim();
    const birthDate = document.getElementById('kyc-birth').value;
    if (!fullName || !documentType || !documentNumber || !country || !birthDate)
        return showKycError('Completa todos los campos antes de continuar.');
    Object.assign(kycData, { fullName, documentType, documentNumber, country, birthDate });
    kycStep = 2; renderKycStep();
}

function kycNext2() {
    const documentUrl = document.getElementById('kyc-docurl').value.trim();
    if (!documentUrl) return showKycError('Pega el enlace del documento antes de continuar.');
    if (!documentUrl.startsWith('http')) return showKycError('El enlace no es válido.');
    kycData.documentUrl = documentUrl;
    kycStep = 3; renderKycStep();
}

function kycNext3() {
    const selfieUrl = document.getElementById('kyc-selfieurl').value.trim();
    if (!selfieUrl) return showKycError('Pega el enlace de la selfie antes de continuar.');
    if (!selfieUrl.startsWith('http')) return showKycError('El enlace no es válido.');
    kycData.selfieUrl = selfieUrl;
    kycStep = 4; renderKycStep();
}

async function submitKyc() {
    if (!document.getElementById('kyc-declare').checked)
        return showKycError('Debes aceptar la declaración de veracidad para continuar.');
    const btn = document.getElementById('kyc-submit-btn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    const res  = await fetch('/api/auth/verification-request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(kycData) }).catch(() => null);
    const data = res ? await res.json() : null;
    if (res?.ok) {
        document.getElementById('kyc-step-content').innerHTML = `
            <div style="text-align:center;padding:24px 0">
                <i class="fas fa-circle-check" style="font-size:52px;color:#22c55e;margin-bottom:16px;display:block"></i>
                <h3 style="color:#fff;margin-bottom:8px">Solicitud enviada</h3>
                <p style="color:#94a3b8;font-size:13px;line-height:1.6">Revisaremos tu documentación en un plazo de <strong style="color:#fff">1–3 días hábiles</strong>.<br>Te notificaremos el resultado por email.</p>
                <button onclick="document.getElementById('kyc-modal-overlay').remove()" style="margin-top:24px;background:#1c232b;border:none;color:#fff;padding:11px 28px;border-radius:8px;font-family:Inter,sans-serif;cursor:pointer;font-size:14px">Cerrar</button>
            </div>`;
        document.getElementById('kyc-steps-bar').innerHTML = '';
    } else {
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar solicitud';
        showKycError(data?.error || 'Error al enviar la solicitud.');
    }
}

function showKycError(msg) {
    const err = document.getElementById('kyc-error');
    if (!err) return;
    err.textContent = msg;
    err.style.display = 'block';
}
