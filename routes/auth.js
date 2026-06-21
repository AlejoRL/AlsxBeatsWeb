const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const User    = require('../models/User');

function sanitize(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    const { password, _id, ...safe } = obj;
    return safe;
}

// GET /api/auth/me
router.get('/me', async (req, res) => {
    if (!req.session?.userId) return res.json({ user: null });
    const user = await User.findOne({ id: req.session.userId });
    if (!user) { req.session.destroy(); return res.json({ user: null }); }
    res.json({ user: sanitize(user) });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    if (password.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email))
        return res.status(400).json({ error: 'El email no es válido.' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ error: 'Ya existe una cuenta con ese email.' });

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
        id:                crypto.randomUUID(),
        name:              name.trim(),
        email:             email.toLowerCase().trim(),
        password:          hashed,
        verificationToken
    });

    sendVerificationEmail(user.email, user.name, verificationToken).catch(console.error);

    req.session.userId = user.id;
    res.json({ user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password)
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    req.session.userId = user.id;
    res.json({ user: sanitize(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

function requireUser(req, res, next) {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado.' });
    next();
}

async function sendVerificationEmail(to, name, token) {
    if (!process.env.RESEND_API_KEY) return;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const link    = `${baseUrl}/verify.html?token=${token}`;
    await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from:    'AlsxBeats <onboarding@resend.dev>',
            to,
            subject: 'Verifica tu cuenta en AlsxBeats',
            html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
                    <h2 style="color:#4ecdc4">¡Hola, ${name}!</h2>
                    <p>Pulsa el botón para verificar tu cuenta y obtener el badge de verificado.</p>
                    <a href="${link}" style="display:inline-block;margin:20px 0;background:#4ecdc4;color:#000;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">
                        Verificar mi cuenta
                    </a>
                    <p style="color:#94a3b8;font-size:13px">Si no creaste una cuenta, ignora este email.</p>
                </div>
            `
        })
    });
}

// GET /api/auth/verify/:token
router.get('/verify/:token', async (req, res) => {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(404).json({ error: 'Token no válido o ya usado.' });
    user.verified = true;
    user.verificationToken = null;
    await user.save();
    res.json({ ok: true, name: user.name });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.verified) return res.json({ ok: true, already: true });
    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    await user.save();
    await sendVerificationEmail(user.email, user.name, token).catch(console.error);
    res.json({ ok: true });
});

// PUT /api/auth/profile
router.put('/profile', requireUser, async (req, res) => {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim())
        return res.status(400).json({ error: 'Nombre y email son obligatorios.' });
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email))
        return res.status(400).json({ error: 'El email no es válido.' });

    const dup = await User.findOne({ email: email.toLowerCase().trim(), id: { $ne: req.session.userId } });
    if (dup) return res.status(400).json({ error: 'Ese email ya está en uso.' });

    const user = await User.findOneAndUpdate(
        { id: req.session.userId },
        { name: name.trim(), email: email.toLowerCase().trim() },
        { new: true }
    );
    res.json({ user: sanitize(user) });
});

// PUT /api/auth/password
router.put('/password', requireUser, async (req, res) => {
    const { current, newPassword } = req.body;
    if (!current || !newPassword)
        return res.status(400).json({ error: 'Completa todos los campos.' });
    if (newPassword.length < 6)
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });

    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const match = await bcrypt.compare(current, user.password);
    if (!match) return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
});

// GET /api/auth/likes
router.get('/likes', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    res.json({ likes: user?.likes || [] });
});

// POST /api/auth/likes/:beatId — toggle
router.post('/likes/:beatId', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const idx = user.likes.indexOf(req.params.beatId);
    if (idx === -1) user.likes.push(req.params.beatId);
    else            user.likes.splice(idx, 1);
    await user.save();
    res.json({ liked: idx === -1, likes: user.likes });
});

// POST /api/auth/listened/:beatId
router.post('/listened/:beatId', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    user.recentlyListened = [
        req.params.beatId,
        ...user.recentlyListened.filter(id => id !== req.params.beatId)
    ].slice(0, 20);
    await user.save();
    res.json({ ok: true });
});

// GET /api/auth/orders
router.get('/orders', requireUser, async (req, res) => {
    const TOKENS_FILE = path.join(__dirname, '../data/tokens.json');
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!fs.existsSync(TOKENS_FILE)) return res.json({ orders: [] });
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    const orders = Object.entries(tokens)
        .filter(([, t]) => t.email?.toLowerCase() === user.email.toLowerCase())
        .map(([token, t]) => ({ token, ...t }))
        .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ orders });
});

// GET /api/auth/playlists
router.get('/playlists', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    res.json({ playlists: user?.playlists || [] });
});

// POST /api/auth/playlists
router.post('/playlists', requireUser, async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });

    const playlist = { id: crypto.randomUUID(), name: name.trim(), beats: [], createdAt: new Date().toISOString().split('T')[0] };
    const user = await User.findOneAndUpdate(
        { id: req.session.userId },
        { $push: { playlists: playlist } },
        { new: true }
    );
    res.json({ playlist });
});

// POST /api/auth/playlists/:id/beats/:beatId — toggle
router.post('/playlists/:id/beats/:beatId', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const pl = user.playlists.find(p => p.id === req.params.id);
    if (!pl) return res.status(404).json({ error: 'Playlist no encontrada.' });

    const bi = pl.beats.indexOf(req.params.beatId);
    if (bi === -1) pl.beats.push(req.params.beatId);
    else           pl.beats.splice(bi, 1);
    await user.save();
    res.json({ playlist: pl });
});

// DELETE /api/auth/playlists/:id
router.delete('/playlists/:id', requireUser, async (req, res) => {
    await User.findOneAndUpdate(
        { id: req.session.userId },
        { $pull: { playlists: { id: req.params.id } } }
    );
    res.json({ ok: true });
});

module.exports = router;
