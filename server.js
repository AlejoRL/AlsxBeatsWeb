require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const path     = require('path');
const mongoose = require('mongoose');

// Conectar a MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/alsxbeats';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB conectado'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

const app  = express();
const PORT = process.env.PORT || 3000;

// Webhook de Stripe necesita body raw ANTES del parser JSON
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'alsxbeats-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas
}));

// API
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/beats',    require('./routes/beats'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/download', require('./routes/download'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/catalog',  require('./routes/catalog'));

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
