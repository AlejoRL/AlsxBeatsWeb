const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

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
        filename: (req, file, cb) => cb(null, file.originalname)
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
            basic:     { price: parseInt(p.basic)     || 29,  label: 'Basic Lease',     formats: ['MP3'] },
            premium:   { price: parseInt(p.premium)   || 59,  label: 'Premium Lease',   formats: ['WAV', 'MP3'] },
            unlimited: { price: parseInt(p.unlimited) || 149, label: 'Unlimited Lease', formats: ['WAV', 'STEMS', 'MP3'] },
            exclusive: { price: parseInt(p.exclusive) || 299, label: 'Exclusive Rights',formats: ['WAV', 'STEMS'] }
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
            basic:     { ...beats[idx].licenses.basic,     price: parseInt(p.basic)     || beats[idx].licenses.basic.price },
            premium:   { ...beats[idx].licenses.premium,   price: parseInt(p.premium)   || beats[idx].licenses.premium.price },
            unlimited: { ...beats[idx].licenses.unlimited, price: parseInt(p.unlimited) || beats[idx].licenses.unlimited.price },
            exclusive: { ...beats[idx].licenses.exclusive, price: parseInt(p.exclusive) || beats[idx].licenses.exclusive.price }
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
    if (idx !== -1) { beats[idx].preview = `assets/audio/${req.file.filename}`; writeBeats(beats); }
    res.json({ path: `assets/audio/${req.file.filename}` });
});

// POST /api/admin/beats/:beatId/license/:licenseType
router.post('/beats/:beatId/license/:licenseType', privateUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    res.json({ ok: true, filename: req.file.filename });
});

// GET /api/admin/beats/:beatId/files — qué archivos privados tiene cada tier
router.get('/beats/:beatId/files', (req, res) => {
    const tiers = ['basic', 'premium', 'unlimited', 'exclusive'];
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

// POST /api/admin/reset-verified — temporal para testing
router.post('/reset-verified', requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const result = await User.updateMany({}, { verified: false, verificationToken: null, verificationStatus: 'none' });
    res.json({ ok: true, modified: result.modifiedCount });
});

// GET /api/admin/verifications
router.get('/verifications', requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const users = await User.find({ verificationStatus: { $in: ['pending', 'rejected', 'approved'] } })
        .select('id name email verificationStatus verificationData plan createdAt')
        .sort({ 'verificationData.submittedAt': -1 });
    res.json(users);
});

// POST /api/admin/verifications/:userId/approve
router.post('/verifications/:userId/approve', requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const user = await User.findOne({ id: req.params.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    user.verified = true;
    user.verificationStatus = 'approved';
    user.verificationData.reviewedAt = new Date();
    user.verificationData.rejectionReason = '';
    await user.save();
    res.json({ ok: true });
});

// POST /api/admin/verifications/:userId/reject
router.post('/verifications/:userId/reject', requireAdmin, async (req, res) => {
    const User = require('../models/User');
    const { reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });
    const user = await User.findOne({ id: req.params.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    user.verified = false;
    user.verificationStatus = 'rejected';
    user.verificationData.reviewedAt = new Date();
    user.verificationData.rejectionReason = reason.trim();
    await user.save();
    res.json({ ok: true });
});

module.exports = router;
