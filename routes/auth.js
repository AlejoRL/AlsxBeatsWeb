const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const User    = require('../models/User');

const ADMIN_EMAIL = 'alsxbeats@gmail.com';

function sanitize(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    const { password, _id, ...safe } = obj;
    safe.isAdmin = obj.email === ADMIN_EMAIL;
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
    const user = await User.create({
        id:       crypto.randomUUID(),
        name:     name.trim(),
        email:    email.toLowerCase().trim(),
        password: hashed
    });

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

async function sendOtpEmail(to, name, code) {
    if (!process.env.RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from:    'AlsxBeats <onboarding@resend.dev>',
            to,
            subject: `${code} es tu código de verificación de AlsxBeats`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0b0d14;border-radius:16px;padding:32px">
                    <h2 style="color:#4ecdc4;margin-bottom:4px">AlsxBeats</h2>
                    <p style="color:#94a3b8;margin-bottom:24px">Hola ${name}, introduce este código para verificar tu cuenta.</p>
                    <div style="background:#11151a;border:2px solid #1c232b;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px">
                        <span style="font-size:40px;font-weight:900;letter-spacing:14px;color:#fff;font-family:monospace">${code}</span>
                    </div>
                    <p style="color:#64748b;font-size:12px">Expira en 10 minutos. Si no solicitaste esto, ignora este email.</p>
                </div>
            `
        })
    });
}

// POST /api/auth/send-otp
router.post('/send-otp', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.verified) return res.json({ ok: true, already: true });
    const code   = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode   = code;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOtpEmail(user.email, user.name, code).catch(console.error);
    res.json({ ok: true, email: user.email });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', requireUser, async (req, res) => {
    const { code } = req.body;
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.verified) return res.json({ ok: true, already: true });
    if (!user.otpCode || !user.otpExpiry) return res.status(400).json({ error: 'Solicita un código primero.' });
    if (new Date() > user.otpExpiry) return res.status(400).json({ error: 'El código ha expirado. Solicita uno nuevo.' });
    if (user.otpCode !== String(code).trim()) return res.status(400).json({ error: 'Código incorrecto.' });
    user.verified  = true;
    user.otpCode   = null;
    user.otpExpiry = null;
    await user.save();
    res.json({ ok: true });
});

// POST /api/auth/avatar
router.post('/avatar', requireUser, async (req, res) => {
    const { avatar } = req.body;
    if (!avatar?.startsWith('data:image/')) return res.status(400).json({ error: 'Imagen inválida.' });
    if (avatar.length > 2_500_000) return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 2MB.' });
    const user = await User.findOneAndUpdate({ id: req.session.userId }, { avatar }, { new: true });
    res.json({ ok: true, avatar: user.avatar });
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
