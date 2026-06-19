const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKENS_FILE = path.join(__dirname, '../data/tokens.json');

function loadTokens() {
    if (!fs.existsSync(TOKENS_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
    catch { return {}; }
}

function saveTokens(tokens) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function issueToken(sessionId, items, customerEmail) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokens = loadTokens();

    tokens[token] = {
        sessionId,
        items,
        email: customerEmail || null,
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        createdAt: Date.now()
    };

    saveTokens(tokens);
    return token;
}

async function sendDownloadEmail(to, token, items) {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) return;

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/success.html?token=${token}`;

    const itemRows = items.map(i =>
        `<li><strong>${i.title}</strong> — ${i.licenseLabel} (${i.formats.join(', ')})</li>`
    ).join('');

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'AlsxBeats <alsxbeats@gmail.com>',
        to,
        subject: '🎵 Tu compra en AlsxBeats está lista',
        html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0f111a;color:#fff;padding:32px;border-radius:12px">
                <h2 style="color:#4ecdc4">¡Gracias por tu compra!</h2>
                <p>Tus beats están listos para descargar. El enlace es válido durante <strong>48 horas</strong>.</p>
                <ul style="line-height:2">${itemRows}</ul>
                <a href="${successUrl}"
                   style="display:inline-block;background:#4ecdc4;color:#000;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:16px">
                    Descargar mis beats
                </a>
                <p style="margin-top:24px;color:#94a3b8;font-size:13px">
                    ¿Problemas? Escríbenos a <a href="mailto:alsxbeats@gmail.com" style="color:#4ecdc4">alsxbeats@gmail.com</a>
                </p>
            </div>
        `
    });
}

// POST /api/checkout/create-session
router.post('/create-session', async (req, res) => {
    try {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_XXXX')) {
            return res.status(503).json({ error: 'Stripe no configurado. Añade STRIPE_SECRET_KEY en .env' });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const beats = require('../data/beats.json');
        const { items } = req.body;

        if (!items?.length) return res.status(400).json({ error: 'El carrito está vacío' });

        const lineItems = [];
        const purchasedItems = [];
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        for (const item of items) {
            const beat = beats.find(b => b.id === item.beatId);
            const license = beat?.licenses[item.licenseType];
            if (!beat || !license) continue;

            lineItems.push({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `${beat.title} — ${license.label}`,
                        description: `Formatos incluidos: ${license.formats.join(', ')}`,
                        images: beat.image ? [`${baseUrl}/${beat.image}`] : []
                    },
                    unit_amount: license.price * 100
                },
                quantity: 1
            });

            purchasedItems.push({
                beatId: beat.id,
                title: beat.title,
                licenseType: item.licenseType,
                licenseLabel: license.label,
                formats: license.formats,
                price: license.price,
                image: beat.image,
                preview: beat.preview
            });
        }

        if (!lineItems.length) return res.status(400).json({ error: 'Items inválidos' });

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/#catalogue`,
            metadata: { items: JSON.stringify(purchasedItems) }
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error('create-session error:', err.message);
        res.status(500).json({ error: 'Error al crear la sesión de pago' });
    }
});

// GET /api/checkout/complete?session_id=xxx
// Llamado desde success.html para obtener el token de descarga
router.get('/complete', async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'session_id requerido' });

        // Reusar token si ya se generó para esta sesión
        const tokens = loadTokens();
        const existing = Object.entries(tokens).find(([, v]) => v.sessionId === session_id);
        if (existing) {
            return res.json({ token: existing[0], items: existing[1].items });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return res.status(402).json({ error: 'Pago no completado' });
        }

        const items = JSON.parse(session.metadata?.items || '[]');
        const email = session.customer_details?.email || null;
        const token = issueToken(session_id, items, email);

        if (email) sendDownloadEmail(email, token, items).catch(console.error);

        res.json({ token, items });

    } catch (err) {
        console.error('complete error:', err.message);
        res.status(500).json({ error: 'Error al verificar el pago' });
    }
});

// POST /api/checkout/webhook — Stripe webhook (backup/reconciliación)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return res.json({ received: true });

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const event = stripe.webhooks.constructEvent(
            req.body,
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            console.log(`✅ Pago confirmado por webhook: ${session.id}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

module.exports = router;
