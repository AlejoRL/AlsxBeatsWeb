const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const User    = require('../models/User');
const Beat    = require('../models/Beat');
const { uploadBuffer, deleteFile, mediaRef } = require('../lib/gridfs');

const PLAN_LIMITS = { starter: 0, pro: 10, elite: Infinity };

function requireUser(req, res, next) {
    if (!req.session?.userId) return res.status(401).json({ error: 'No autenticado.' });
    next();
}

// Los archivos se reciben en memoria y se suben a GridFS (MongoDB) en vez de
// escribirse en disco, para que sobrevivan a los reinicios/redeploys de Render.
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'audio') {
        const audioTypes = ['audio/mpeg', 'audio/mp3'];
        const isMp3 = audioTypes.includes(file.mimetype) && path.extname(file.originalname).toLowerCase() === '.mp3';
        if (!isMp3) return cb(new Error('Solo se admiten archivos MP3 para el audio.'));
        return cb(null, true);
    }
    if (file.fieldname === 'cover') {
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!imageTypes.includes(file.mimetype)) return cb(new Error('La portada debe ser una imagen JPG, PNG o WEBP.'));
        return cb(null, true);
    }
    cb(null, false);
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 80 * 1024 * 1024 }
});

// Envuelve un middleware de multer para devolver errores en JSON (tipo, tamaño, etc.)
function handleUpload(middleware) {
    return (req, res, next) => {
        middleware(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido.' });
                }
                return res.status(400).json({ error: err.message || 'Error al subir el archivo.' });
            }
            next();
        });
    };
}

// GET /api/upload/status
router.get('/status', requireUser, async (req, res) => {
    const user = await User.findOne({ id: req.session.userId });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const used  = await Beat.countDocuments({ uploadedBy: user.id });
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

    const beats = await Beat.find({ uploadedBy: user.id }).lean();
    res.json({ beats });
});

// POST /api/upload
router.post('/', requireUser, handleUpload(upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
])), async (req, res) => {
    const uploadedFileIds = [];
    const cleanup = () => Promise.all(uploadedFileIds.map(deleteFile));

    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) { await cleanup(); return res.status(404).json({ error: 'Usuario no encontrado.' }); }

        const used  = await Beat.countDocuments({ uploadedBy: user.id });
        const limit = PLAN_LIMITS[user.plan] ?? 0;

        if (used >= limit) {
            await cleanup();
            return res.status(403).json({ error: 'Has alcanzado el límite de uploads de tu plan.' });
        }

        const audioFile = req.files?.audio?.[0];
        if (!audioFile) { await cleanup(); return res.status(400).json({ error: 'El archivo de audio es obligatorio.' }); }

        const { title, genre, bpm, key, tags } = req.body;
        if (!title?.trim()) { await cleanup(); return res.status(400).json({ error: 'El título es obligatorio.' }); }

        const coverFile = req.files.cover?.[0];

        const audioFileId = await uploadBuffer(audioFile.buffer, audioFile.originalname, audioFile.mimetype);
        uploadedFileIds.push(audioFileId);

        let coverFileId = null;
        if (coverFile) {
            coverFileId = await uploadBuffer(coverFile.buffer, coverFile.originalname, coverFile.mimetype);
            uploadedFileIds.push(coverFileId);
        }

        const slug   = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const beatId = `${slug}-${Date.now()}`;

        const newBeat = await Beat.create({
            id:            beatId,
            title:         title.trim(),
            producer:      user.name,
            bpm:           bpm ? parseInt(bpm) || null : null,
            key:           key?.trim() || null,
            genre:         genre?.trim() || null,
            tags:          tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            image:         coverFileId ? mediaRef(coverFileId) : 'assets/images/alsxbeatsportada.png',
            imageFileId:   coverFileId,
            preview:       mediaRef(audioFileId),
            previewFileId: audioFileId,
            publishedAt:   new Date().toISOString().split('T')[0],
            peaks:         null,
            uploadedBy:    user.id,
            licenses: {
                basic:     { price: 29.99,  label: 'Basic Lease',     formats: ['MP3'] },
                basicWav:  { price: 38.99,  label: 'Basic Lease WAV', formats: ['WAV', 'MP3'] },
                premium:   { price: 75.99,  label: 'Premium Lease',   formats: ['WAV', 'STEMS', 'MP3'] },
                unlimited: { price: 145.99, label: 'Unlimited Lease', formats: ['WAV', 'STEMS', 'MP3'] },
                exclusive: { price: null,   label: 'Exclusive Rights', formats: ['WAV', 'STEMS', 'MP3'] }
            }
        });

        res.json({ ok: true, beat: newBeat.toPublic(), used: used + 1, limit: limit === Infinity ? null : limit });
    } catch (err) {
        await cleanup();
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Error al subir el beat.' });
    }
});

// PUT /api/upload/:beatId/audio — reemplazar el archivo MP3 de un beat propio
router.put('/:beatId/audio', requireUser, handleUpload(upload.single('audio')), async (req, res) => {
    const cleanup = () => req.gridFsFileId && deleteFile(req.gridFsFileId);

    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) { await cleanup(); return res.status(404).json({ error: 'Usuario no encontrado.' }); }

        const beat = await Beat.findOne({ id: req.params.beatId });

        if (!beat) { await cleanup(); return res.status(404).json({ error: 'Beat no encontrado.' }); }
        if (beat.uploadedBy !== user.id) { await cleanup(); return res.status(403).json({ error: 'Sin permiso.' }); }
        if (!req.file) return res.status(400).json({ error: 'Selecciona un archivo MP3.' });

        const newFileId = await uploadBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
        req.gridFsFileId = newFileId;

        const oldFileId = beat.previewFileId;
        beat.preview       = mediaRef(newFileId);
        beat.previewFileId = newFileId;
        await beat.save();

        if (oldFileId) await deleteFile(oldFileId);

        res.json({ ok: true, beat: beat.toPublic() });
    } catch (err) {
        await cleanup();
        console.error('Update audio error:', err);
        res.status(500).json({ error: 'Error al actualizar el archivo de audio.' });
    }
});

// PUT /api/upload/:beatId — editar precios de licencias de un beat propio
router.put('/:beatId', requireUser, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.session.userId });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const beat = await Beat.findOne({ id: req.params.beatId });

        if (!beat) return res.status(404).json({ error: 'Beat no encontrado.' });
        if (beat.uploadedBy !== user.id) return res.status(403).json({ error: 'Sin permiso.' });

        const { licenses } = req.body;
        if (licenses && typeof licenses === 'object') {
            for (const key of Object.keys(beat.licenses.toObject())) {
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

        await beat.save();
        res.json({ ok: true, beat: beat.toPublic() });
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

        const beat = await Beat.findOne({ id: req.params.beatId });

        if (!beat) return res.status(404).json({ error: 'Beat no encontrado.' });
        if (beat.uploadedBy !== user.id && user.email !== process.env.ADMIN_EMAIL)
            return res.status(403).json({ error: 'Sin permiso.' });

        await Promise.all([deleteFile(beat.previewFileId), deleteFile(beat.imageFileId)]);
        await Beat.deleteOne({ id: req.params.beatId });

        res.json({ ok: true });
    } catch (err) {
        console.error('Delete beat error:', err);
        res.status(500).json({ error: 'Error al eliminar el beat.' });
    }
});

module.exports = router;
