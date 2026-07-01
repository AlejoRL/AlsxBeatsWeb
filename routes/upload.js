const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');
const User    = require('../models/User');

const BEATS_FILE  = path.join(__dirname, '../data/beats.json');
const AUDIO_DIR   = path.join(__dirname, '../public/assets/audio');
const IMAGES_DIR  = path.join(__dirname, '../public/assets/images');

const PLAN_LIMITS = { starter: 0, pro: 10, elite: Infinity };

// Ensure upload directories exist
[AUDIO_DIR, IMAGES_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

function requireUser(req, res, next) {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado.' });
    next();
}

function loadBeats() {
    try { return JSON.parse(fs.readFileSync(BEATS_FILE, 'utf8')); }
    catch { return []; }
}

function saveBeats(beats) {
    fs.writeFileSync(BEATS_FILE, JSON.stringify(beats, null, 2));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, file.fieldname === 'audio' ? AUDIO_DIR : IMAGES_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const audioTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp3'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.fieldname === 'audio') return cb(null, audioTypes.includes(file.mimetype));
    if (file.fieldname === 'cover') return cb(null, imageTypes.includes(file.mimetype));
    cb(null, false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 80 * 1024 * 1024 }
});

// GET /api/upload/status
router.get('/status', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const beats = loadBeats();
    const used  = beats.filter(b => b.uploadedBy === user.id).length;
    const limit = PLAN_LIMITS[user.plan] ?? 0;

    res.json({
        plan:      user.plan,
        used,
        limit:     limit === Infinity ? null : limit,
        canUpload: used < limit
    });
});

// GET /api/upload/my-beats
router.get('/my-beats', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const beats = loadBeats().filter(b => b.uploadedBy === user.id);
    res.json({ beats });
});

// POST /api/upload
router.post('/', requireUser, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]), async (req, res) => {
    const cleanup = () => {
        [req.files?.audio?.[0]?.path, req.files?.cover?.[0]?.path]
            .filter(Boolean)
            .forEach(p => { try { fs.unlinkSync(p); } catch {} });
    };

    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) { cleanup(); return res.status(404).json({ error: 'Usuario no encontrado.' }); }

        const beats = loadBeats();
        const used  = beats.filter(b => b.uploadedBy === user.id).length;
        const limit = PLAN_LIMITS[user.plan] ?? 0;

        if (used >= limit) {
            cleanup();
            return res.status(403).json({ error: 'Has alcanzado el límite de uploads de tu plan.' });
        }

        if (!req.files?.audio?.[0]) { cleanup(); return res.status(400).json({ error: 'El archivo de audio es obligatorio.' }); }

        const { title, genre, bpm, key, tags } = req.body;
        if (!title?.trim()) { cleanup(); return res.status(400).json({ error: 'El título es obligatorio.' }); }

        const audioFile = req.files.audio[0];
        const coverFile = req.files.cover?.[0];

        const slug   = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const beatId = `${slug}-${Date.now()}`;

        const newBeat = {
            id:          beatId,
            title:       title.trim(),
            producer:    user.name,
            bpm:         bpm ? parseInt(bpm) || null : null,
            key:         key?.trim() || null,
            genre:       genre?.trim() || null,
            tags:        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            image:       coverFile ? `assets/images/${coverFile.filename}` : 'assets/images/alsxbeatsportada.png',
            preview:     `assets/audio/${audioFile.filename}`,
            publishedAt: new Date().toISOString().split('T')[0],
            peaks:       null,
            uploadedBy:  user.id,
            licenses: {
                basic:     { price: 29.99,  label: 'Basic Lease',     formats: ['MP3'] },
                basicWav:  { price: 38.99,  label: 'Basic Lease WAV', formats: ['WAV', 'MP3'] },
                premium:   { price: 75.99,  label: 'Premium Lease',   formats: ['WAV', 'STEMS', 'MP3'] },
                unlimited: { price: 145.99, label: 'Unlimited Lease', formats: ['WAV', 'STEMS', 'MP3'] },
                exclusive: { price: null,   label: 'Exclusive Rights', formats: ['WAV', 'STEMS', 'MP3'] }
            }
        };

        beats.push(newBeat);
        saveBeats(beats);

        res.json({ ok: true, beat: newBeat, used: used + 1, limit: limit === Infinity ? null : limit });
    } catch (err) {
        cleanup();
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Error al subir el beat.' });
    }
});

// PUT /api/upload/:beatId — editar precios de licencias de un beat propio
router.put('/:beatId', requireUser, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const beats = loadBeats();
        const beat  = beats.find(b => b.id === req.params.beatId);

        if (!beat) return res.status(404).json({ error: 'Beat no encontrado.' });
        if (beat.uploadedBy !== user.id) return res.status(403).json({ error: 'Sin permiso.' });

        const { licenses } = req.body;
        if (licenses && typeof licenses === 'object') {
            for (const key of Object.keys(beat.licenses)) {
                if (!(key in licenses)) continue;
                const raw = licenses[key];
                if (raw === '' || raw === null || raw === undefined) {
                    beat.licenses[key].price = null;
                    continue;
                }
                const price = Number(raw);
                if (Number.isFinite(price) && price >= 0) {
                    beat.licenses[key].price = Math.round(price * 100) / 100;
                }
            }
        }

        saveBeats(beats);
        res.json({ ok: true, beat });
    } catch (err) {
        console.error('Update beat error:', err);
        res.status(500).json({ error: 'Error al actualizar el beat.' });
    }
});

// DELETE /api/upload/:beatId
router.delete('/:beatId', requireUser, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const beats = loadBeats();
        const beat  = beats.find(b => b.id === req.params.beatId);

        if (!beat) return res.status(404).json({ error: 'Beat no encontrado.' });
        if (beat.uploadedBy !== user.id && user.email !== process.env.ADMIN_EMAIL)
            return res.status(403).json({ error: 'Sin permiso.' });

        const audioPath = path.join(__dirname, '../public', beat.preview);
        const imagePath = path.join(__dirname, '../public', beat.image);
        try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath); } catch {}
        try { if (beat.image !== 'assets/images/alsxbeatsportada.png' && fs.existsSync(imagePath)) fs.unlinkSync(imagePath); } catch {}

        saveBeats(beats.filter(b => b.id !== req.params.beatId));
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete beat error:', err);
        res.status(500).json({ error: 'Error al eliminar el beat.' });
    }
});

module.exports = router;
