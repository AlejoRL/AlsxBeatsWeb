const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Beat    = require('../models/Beat');
const { uploadBuffer, deleteFile, mediaRef } = require('../lib/gridfs');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

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

// ── Multer: imágenes de beats — se suben a GridFS (MongoDB), no al disco ──────
const imageUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Solo imágenes'));
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ── Multer: preview audio de beats (público, watermarked) — a GridFS también ──
const previewUpload = multer({
    storage: multer.memoryStorage(),
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
router.get('/beats', asyncHandler(async (req, res) => {
    res.json(await Beat.find().sort({ publishedAt: -1 }).lean());
}));

// POST /api/admin/beats — crear beat (sin archivos, solo metadata)
router.post('/beats', asyncHandler(async (req, res) => {
    const { title, genre, bpm, key, tags, prices } = req.body;

    let id = slugify(title || 'beat');
    if (await Beat.exists({ id })) id += `-${Date.now()}`;

    const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const p = prices || {};

    const beat = await Beat.create({
        id,
        title: title || 'Sin título',
        producer: 'AlsxBeats',
        bpm: parseInt(bpm) || 140,
        key: key || 'Cm',
        genre: genre || 'Trap',
        tags: tagList,
        image: 'assets/images/alsxbeatsportada.png',
        preview: null,
        publishedAt: new Date().toISOString().split('T')[0],
        licenses: {
            basic:     { price: parseFloat(p.basic)     || 29.99,  label: 'Basic Lease',     formats: ['MP3'] },
            basicWav:  { price: parseFloat(p.basicWav)  || 38.99,  label: 'Basic Lease WAV', formats: ['WAV', 'MP3'] },
            premium:   { price: parseFloat(p.premium)   || 75.99,  label: 'Premium Lease',   formats: ['WAV', 'STEMS', 'MP3'] },
            unlimited: { price: parseFloat(p.unlimited) || 145.99, label: 'Unlimited Lease', formats: ['WAV', 'STEMS', 'MP3'] },
            exclusive: { price: null,                               label: 'Exclusive Rights',formats: ['WAV', 'STEMS', 'MP3'] }
        }
    });

    res.json(beat.toPublic());
}));

// PUT /api/admin/beats/:id — editar metadata
router.put('/beats/:id', asyncHandler(async (req, res) => {
    const beat = await Beat.findOne({ id: req.params.id });
    if (!beat) return res.status(404).json({ error: 'Beat no encontrado' });

    const { title, genre, bpm, key, tags, prices } = req.body;
    const tagList = (tags || '').split(',').map(t => t.trim()).filter(Boolean);
    const p = prices || {};

    beat.title = title || beat.title;
    beat.genre = genre || beat.genre;
    beat.bpm   = parseInt(bpm) || beat.bpm;
    beat.key   = key || beat.key;
    beat.tags  = tagList.length ? tagList : beat.tags;

    beat.licenses.basic.price     = parseFloat(p.basic)     || beat.licenses.basic.price;
    beat.licenses.basicWav.price  = parseFloat(p.basicWav)  || beat.licenses.basicWav?.price || 38.99;
    beat.licenses.premium.price   = parseFloat(p.premium)   || beat.licenses.premium.price;
    beat.licenses.unlimited.price = parseFloat(p.unlimited) || beat.licenses.unlimited.price;
    beat.licenses.exclusive.price = parseFloat(p.exclusive) || beat.licenses.exclusive.price;

    await beat.save();
    res.json(beat.toPublic());
}));

// DELETE /api/admin/beats/:id
router.delete('/beats/:id', asyncHandler(async (req, res) => {
    const beat = await Beat.findOne({ id: req.params.id });
    if (!beat) return res.status(404).json({ error: 'Beat no encontrado' });

    await Promise.all([deleteFile(beat.previewFileId), deleteFile(beat.imageFileId)]);
    await Beat.deleteOne({ id: req.params.id });
    res.json({ ok: true });
}));

// POST /api/admin/beats/:id/image
router.post('/beats/:id/image', imageUpload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const beat = await Beat.findOne({ id: req.params.id });
    if (!beat) return res.status(404).json({ error: 'Beat no encontrado' });

    const oldFileId = beat.imageFileId;
    const fileId = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    beat.image = mediaRef(fileId);
    beat.imageFileId = fileId;
    await beat.save();
    if (oldFileId) await deleteFile(oldFileId);

    res.json({ path: beat.image });
}));

// POST /api/admin/beats/:id/preview
router.post('/beats/:id/preview', previewUpload.single('audio'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
    const beat = await Beat.findOne({ id: req.params.id });
    if (!beat) return res.status(404).json({ error: 'Beat no encontrado' });

    const oldFileId = beat.previewFileId;
    const fileId = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
    beat.preview = mediaRef(fileId);
    beat.previewFileId = fileId;
    beat.peaks = null;
    await beat.save();
    if (oldFileId) await deleteFile(oldFileId);

    res.json({ path: beat.preview });
}));

// POST /api/admin/beats/:id/peaks
router.post('/beats/:id/peaks', express.json({ limit: '64kb' }), asyncHandler(async (req, res) => {
    const peaks = req.body?.peaks;
    if (!Array.isArray(peaks) || peaks.length < 10) return res.status(400).json({ error: 'Peaks inválidos' });
    const beat = await Beat.findOne({ id: req.params.id });
    if (!beat) return res.status(404).json({ error: 'Beat no encontrado' });
    beat.peaks = peaks.map(v => Math.round(v * 1000) / 1000);
    await beat.save();
    res.json({ ok: true });
}));

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
