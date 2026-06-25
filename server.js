require('dotenv').config();
// Evita que promesas rechazadas sin catch colapsen el proceso
process.on('unhandledRejection', (err) => {
    console.error('UnhandledRejection:', err.message);
});
const express   = require('express');
const session   = require('express-session');
const path      = require('path');
const mongoose  = require('mongoose');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

// Conectar a MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alsxbeats';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB conectado'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Necesario para que Express detecte HTTPS correctamente detrás de Render/proxies
app.set('trust proxy', 1);

// ── Seguridad: headers HTTP ──────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                         "https://js.stripe.com", "https://unpkg.com"],
            styleSrc:   ["'self'", "'unsafe-inline'",
                         "https://fonts.googleapis.com",
                         "https://cdnjs.cloudflare.com"],
            fontSrc:    ["'self'",
                         "https://fonts.gstatic.com",
                         "https://cdnjs.cloudflare.com"],
            imgSrc:     ["'self'", "data:", "https:"],
            frameSrc:   ["https://js.stripe.com"],
            connectSrc: ["'self'", "https://api.stripe.com"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// ── Rate limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20,
    message: { error: 'Demasiados intentos. Espera 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 5,
    message: { error: 'Demasiados intentos de verificación. Espera 10 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de acceso admin. Espera 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Webhook de Stripe necesita body raw ANTES del parser JSON
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));

app.use(session({
    secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET no configurado en .env'); })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge:   8 * 60 * 60 * 1000, // 8 horas
        httpOnly: true,                // JS del cliente NO puede leer la cookie
        secure:   isProd,             // Solo HTTPS en producción
        sameSite: 'lax'               // Protección CSRF básica
    }
}));

// Aplicar rate limiters
app.use('/api/auth/login',      authLimiter);
app.use('/api/auth/register',   authLimiter);
app.use('/api/auth/send-otp',   otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/admin/login',     adminLimiter);

// API
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/beats',    require('./routes/beats'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/download', require('./routes/download'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/catalog',  require('./routes/catalog'));
app.use('/api/contact',  require('./routes/contact'));

// Proteger /admin — redirige al login si no hay sesión
app.get('/admin', (req, res) => {
    if (req.session?.isAdmin) {
        res.sendFile(path.join(__dirname, 'public/admin/index.html'));
    } else {
        res.redirect('/admin/login.html');
    }
});

// Archivos estáticos (admin y público)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`🚀 AlsxBeats corriendo en http://localhost:${PORT}`);
    console.log(`🔐 Panel admin en http://localhost:${PORT}/admin`);
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_XXXX')) {
        console.warn('⚠️  Stripe no configurado.');
    }
});
