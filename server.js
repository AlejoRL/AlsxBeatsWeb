require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// El webhook de Stripe necesita el body en raw ANTES del middleware JSON
app.use('/api/checkout/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// API
app.use('/api/beats',    require('./routes/beats'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/download', require('./routes/download'));

// Archivos estáticos públicos
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
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_XXXX')) {
        console.warn('⚠️  Stripe no configurado. Copia .env.example → .env y añade tus claves.');
    }
});
