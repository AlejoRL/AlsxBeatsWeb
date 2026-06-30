const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const BEATS_FILE = path.join(__dirname, '../data/beats.json');

function readBeats() {
    return JSON.parse(fs.readFileSync(BEATS_FILE, 'utf8'));
}
function writeBeats(beats) {
    fs.writeFileSync(BEATS_FILE, JSON.stringify(beats, null, 2));
}
function slugify(str) {
    return str.toLowerCase()
        .replace(/[áà]/g,'a').replace(/[éè]/g,'e').replace(/[íì]/g,'i')
        .replace(/[óò]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n')
        .replace(/[^a-z0-9\s-]/g,'').trim()
        .replace(/\s+/g,'-').replace(/-+/g,'-');
}

// ── Auth middleware ──────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
    if (req.session?.isAdmin) return next();
    res.status(401).json({ error: 'No autorizado' });
}

// ── Multer: imágenes (public) ────────────────────────────────────────────────
const imageUpload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, '../public/assets/images'),
        filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    }),
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Solo imágenes'));
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ── Multer: preview audio (public, watermarked) ──────────────────────────────
const previewUpload = multer({
    storage: multer.diskStorage({
        destination: path.join(__dirname, '../public/assets/audio'),
        filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    }),
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('audio/') ? cb(null, true) : cb(new Error('Solo audio'));
    },
    limits: { fileSize: 100 * 1024 * 1024 }
});

// ── Multer: archivos privados por licencia ───────────────────────────────────
const VALID_LICENSE_TYPES = ['basic', 'basicWav', 'premium', 'unlimited', 'exclusive'];

const privateUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '../private/beats', req.params.beatId, req.params.licenseType);
            fs.mkdirSync(dir, { recursive: true });
            // Borrar archivo anterior si existe
            if (fs.existsSync(dir)) {
                fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
            }
            cb(null, dir);
        },
        // Sanitiza el nombre del archivo original para evitar path traversal
        filename: (req, file, cb) => {
            const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
            cb(null, safe);
        }
    }),
    limits: { fileSize: 500 * 1024 * 1024 }
});

// ── Auth routes (públicas) ───────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    const validEmail = (email || '').toLowerCase().trim() === 'alsxbeats@gmail.com';
    const validPass  = password === process.env.ADMIN_PASSWORD;
    if (validEmail && validPass) {
        req.session.isAdmin = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ error: 'Credenciales incorrectas' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

router.get('/session', (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
});

// ── Todas las rutas de abajo requieren admin ─────────────────────────────────
router.use(requireAdmin);

// GET /api/admin/beats
router.get('/beats', (req, res) => res.json(readBeats()));

// POST /api/admin/beats — crear beat (sin archivos, solo metadata)
router.post('/beats', (req, res) => {
    const beats = readBeats();
    const { title, genre, bpm, key, tags, prices } = req.body;

    let id = slugify(title || 'beat');
    if (beats.find(b => b.id === id)) id += `-${Date.now()}`;

    const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const p = prices || {};

    const beat = {
        id,
        title: title || 'Sin título',
        producer: 'AlsxBeats',
        bpm: parseInt(bpm) || 140,
        key: key || 'Cm',
        genre: genre || 'Trap',
        tags: tagList,
        image: '',
        preview: null,
        publishedAt: new Date().toISOString().split('T')[0],
        licenses: {
            basic:     { price: parseFloat(p.basic)     || 29.99,  label: 'Basic Lease',     formats: ['MP3'] },
            basicWav:  { price: parseFloat(p.basicWav)  || 38.99,  label: 'Basic Lease WAV', formats: ['WAV', 'MP3'] },
            premium:   { price: parseFloat(p.premium)   || 75.99,  label: 'Premium Lease',   formats: ['WAV', 'STEMS', 'MP3'] },
            unlimited: { price: parseFloat(p.unlimited) || 145.99, label: 'Unlimited Lease', formats: ['WAV', 'STEMS', 'MP3'] },
            exclusive: { price: null,                               label: 'Exclusive Rights',formats: ['WAV', 'STEMS', 'MP3'] }
        }
    };

    beats.unshift(beat);
    writeBeats(beats);
    res.json(beat);
});

// PUT /api/admin/beats/:id — editar metadata
router.put('/beats/:id', (req, res) => {
    const beats = readBeats();
    const idx = beats.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Beat no encontrado' });

    const { title, genre, bpm, key, tags, prices } = req.body;
    const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const p = prices || {};

    beats[idx] = {
        ...beats[idx],
        title:  title  || beats[idx].title,
        genre:  genre  || beats[idx].genre,
        bpm:    parseInt(bpm) || beats[idx].bpm,
        key:    key    || beats[idx].key,
        tags:   tagList.length ? tagList : beats[idx].tags,
        licenses: {
            basic:     { ...beats[idx].licenses.basic,     price: parseFloat(p.basic)     || beats[idx].licenses.basic.price },
            basicWav:  { ...beats[idx].licenses.basicWav,  price: parseFloat(p.basicWav)  || beats[idx].licenses.basicWav?.price || 38.99 },
            premium:   { ...beats[idx].licenses.premium,   price: parseFloat(p.premium)   || beats[idx].licenses.premium.price },
            unlimited: { ...beats[idx].licenses.unlimited, price: parseFloat(p.unlimited) || beats[idx].licenses.unlimited.price },
            exclusive: { ...beats[idx].licenses.exclusive, price: parseFloat(p.exclusive) || beats[idx].licenses.exclusive.price }
        }
    };

    writeBeats(beats);
    res.json(beats[idx]);
});

// DELETE /api/admin/beats/:id
router.delete('/beats/:id', (req, res) => {
    const beats = readBeats();
    const idx = beats.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Beat no encontrado' });
    beats.splice(idx, 1);
    writeBeats(beats);
    res.json({ ok: true });
});

// POST /api/admin/beats/:id/image
router.post('/beats/:id/image', imageUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const beats = readBeats();
    const idx = beats.findIndex(b => b.id === req.params.id);
    if (idx !== -1) { beats[idx].image = `assets/images/${req.file.filename}`; writeBeats(beats); }
    res.json({ path: `assets/images/${req.file.filename}` });
});

// POST /api/admin/beats/:id/preview
router.post('/beats/:id/preview', previewUpload.single('audio'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const beats = readBeats();
    const idx = beats.findIndex(b => b.id === req.params.id);
    if (idx !== -1) { beats[idx].preview = `assets/audio/${req.file.filename}`; beats[idx].peaks = null; writeBeats(beats); }
    res.json({ path: `assets/audio/${req.file.filename}` });
});

// POST /api/admin/beats/:id/peaks
router.post('/beats/:id/peaks', express.json({ limit: '64kb' }), (req, res) => {
    const peaks = req.body?.peaks;
    if (!Array.isArray(peaks) || peaks.length < 10) return res.status(400).json({ error: 'Peaks inválidos' });
    const beats = readBeats();
    const idx = beats.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Beat no encontrado' });
    beats[idx].peaks = peaks.map(v => Math.round(v * 1000) / 1000);
    writeBeats(beats);
    res.json({ ok: true });
});

// POST /api/admin/beats/:beatId/license/:licenseType
router.post('/beats/:beatId/license/:licenseType', privateUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    res.json({ ok: true, filename: req.file.filename });
});

// GET /api/admin/beats/:beatId/files — qué archivos privados tiene cada tier
router.get('/beats/:beatId/files', (req, res) => {
    const tiers = ['basic', 'basicWav', 'premium', 'unlimited', 'exclusive'];
    const result = {};
    tiers.forEach(t => {
        const dir = path.join(__dirname, '../private/beats', req.params.beatId, t);
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => /\.(wav|mp3|zip)$/i.test(f));
            result[t] = files[0] || null;
        } else {
            result[t] = null;
        }
    });
    res.json(result);
});

// GET /api/admin/users
router.get('/users', requireAdmin, asyncHandler(async (req, res) => {
    const User = require('../models/User');
    const users = await User.find({})
        .select('id name email plan verified createdAt')
        .sort({ createdAt: -1 });
    res.json(users);
}));

// PUT /api/admin/users/:id/plan
router.put('/users/:id/plan', requireAdmin, asyncHandler(async (req, res) => {
    const User = require('../models/User');
    const { plan } = req.body;
    if (!['starter', 'pro', 'elite'].includes(plan))
        return res.status(400).json({ error: 'Plan no válido.' });
    const user = await User.findOneAndUpdate({ id: req.params.id }, { plan }, { new: true })
        .select('id name email plan');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ ok: true, user });
}));

// POST /api/admin/reset-verified — testing
router.post('/reset-verified', requireAdmin, asyncHandler(async (req, res) => {
    const User = require('../models/User');
    const result = await User.updateMany({}, { verified: false, otpCode: null, otpExpiry: null });
    res.json({ ok: true, modified: result.modifiedCount });
}));

module.exports = router;
