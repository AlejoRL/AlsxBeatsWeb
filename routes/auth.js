const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');
const crypto   = require('crypto');

const USERS_FILE = path.join(__dirname, '../data/users.json');

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function sanitize(user) {
    const { password, ...safe } = user;
    return safe;
}

// GET /api/auth/me — usuario actual
router.get('/me', (req, res) => {
    if (!req.session?.userId) return res.json({ user: null });
    const users = readUsers();
    const user  = users.find(u => u.id === req.session.userId);
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

    const users = readUsers();

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
        return res.status(400).json({ error: 'Ya existe una cuenta con ese email.' });

    const hashed = await bcrypt.hash(password, 10);
    const user = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashed,
        avatar: '',
        createdAt: new Date().toISOString().split('T')[0]
    };

    users.push(user);
    writeUsers(users);

    req.session.userId = user.id;
    res.json({ user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password)
        return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });

    const users = readUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user)
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });

    req.session.userId = user.id;
    res.json({ user: sanitize(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// Middleware: requiere sesión de usuario
function requireUser(req, res, next) {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado.' });
    next();
}

// PUT /api/auth/profile — actualizar nombre / email
router.put('/profile', requireUser, (req, res) => {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim())
        return res.status(400).json({ error: 'Nombre y email son obligatorios.' });

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email))
        return res.status(400).json({ error: 'El email no es válido.' });

    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const duplicate = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== req.session.userId);
    if (duplicate) return res.status(400).json({ error: 'Ese email ya está en uso.' });

    users[idx].name  = name.trim();
    users[idx].email = email.toLowerCase().trim();
    writeUsers(users);
    res.json({ user: sanitize(users[idx]) });
});

// PUT /api/auth/password — cambiar contraseña
router.put('/password', requireUser, async (req, res) => {
    const { current, newPassword } = req.body;
    if (!current || !newPassword)
        return res.status(400).json({ error: 'Completa todos los campos.' });
    if (newPassword.length < 6)
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });

    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const match = await bcrypt.compare(current, users[idx].password);
    if (!match) return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });

    users[idx].password = await bcrypt.hash(newPassword, 10);
    writeUsers(users);
    res.json({ ok: true });
});

// GET /api/auth/likes
router.get('/likes', requireUser, (req, res) => {
    const users = readUsers();
    const user  = users.find(u => u.id === req.session.userId);
    res.json({ likes: user?.likes || [] });
});

// POST /api/auth/likes/:beatId — toggle like
router.post('/likes/:beatId', requireUser, (req, res) => {
    const users  = readUsers();
    const idx    = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!users[idx].likes) users[idx].likes = [];
    const beatId = req.params.beatId;
    const li     = users[idx].likes.indexOf(beatId);

    if (li === -1) users[idx].likes.push(beatId);
    else           users[idx].likes.splice(li, 1);

    writeUsers(users);
    res.json({ liked: li === -1, likes: users[idx].likes });
});

// POST /api/auth/listened/:beatId — añadir a recientes
router.post('/listened/:beatId', requireUser, (req, res) => {
    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (!users[idx].recentlyListened) users[idx].recentlyListened = [];
    const list   = users[idx].recentlyListened.filter(id => id !== req.params.beatId);
    list.unshift(req.params.beatId);
    users[idx].recentlyListened = list.slice(0, 20);
    writeUsers(users);
    res.json({ ok: true });
});

// GET /api/auth/orders — compras del usuario por email
router.get('/orders', requireUser, (req, res) => {
    const TOKENS_FILE = path.join(__dirname, '../data/tokens.json');
    const users  = readUsers();
    const user   = users.find(u => u.id === req.session.userId);
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
router.get('/playlists', requireUser, (req, res) => {
    const users = readUsers();
    const user  = users.find(u => u.id === req.session.userId);
    res.json({ playlists: user?.playlists || [] });
});

// POST /api/auth/playlists — crear playlist
router.post('/playlists', requireUser, (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio.' });

    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (!users[idx].playlists) users[idx].playlists = [];

    const playlist = { id: crypto.randomUUID(), name: name.trim(), beats: [], createdAt: new Date().toISOString().split('T')[0] };
    users[idx].playlists.push(playlist);
    writeUsers(users);
    res.json({ playlist });
});

// POST /api/auth/playlists/:id/beats/:beatId — toggle beat en playlist
router.post('/playlists/:id/beats/:beatId', requireUser, (req, res) => {
    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (!users[idx].playlists) return res.status(404).json({ error: 'Sin playlists.' });

    const pl = users[idx].playlists.find(p => p.id === req.params.id);
    if (!pl) return res.status(404).json({ error: 'Playlist no encontrada.' });

    const bi = pl.beats.indexOf(req.params.beatId);
    if (bi === -1) pl.beats.push(req.params.beatId);
    else           pl.beats.splice(bi, 1);

    writeUsers(users);
    res.json({ playlist: pl });
});

// DELETE /api/auth/playlists/:id
router.delete('/playlists/:id', requireUser, (req, res) => {
    const users = readUsers();
    const idx   = users.findIndex(u => u.id === req.session.userId);
    if (!users[idx].playlists) return res.json({ ok: true });
    users[idx].playlists = users[idx].playlists.filter(p => p.id !== req.params.id);
    writeUsers(users);
    res.json({ ok: true });
});

module.exports = router;
