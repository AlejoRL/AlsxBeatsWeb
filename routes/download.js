const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { isMediaRef, mediaIdFromRef, streamFile } = require('../lib/gridfs');

const TOKENS_FILE = path.join(__dirname, '../data/tokens.json');
const VALID_LICENSE_TYPES = new Set(['basic', 'basicWav', 'premium', 'unlimited', 'exclusive']);
const SAFE_ID_REGEX = /^[a-z0-9\-]+$/;

function loadTokens() {
    if (!fs.existsSync(TOKENS_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
    catch { return {}; }
}

// GET /api/download/info/:token — devuelve los items sin exponer rutas de archivo
router.get('/info/:token', (req, res) => {
    const tokens = loadTokens();
    const entry = tokens[req.params.token];

    if (!entry) return res.status(404).json({ error: 'Token no válido' });
    if (Date.now() > entry.expiresAt) return res.status(410).json({ error: 'Enlace expirado (válido 48h desde la compra)' });

    res.json({ items: entry.items, expiresAt: entry.expiresAt });
});

// GET /api/download/file/:token/:beatId/:licenseType — sirve el archivo protegido
router.get('/file/:token/:beatId/:licenseType', async (req, res) => {
    // Validación estricta de parámetros para evitar path traversal
    if (!SAFE_ID_REGEX.test(req.params.beatId))
        return res.status(400).json({ error: 'Parámetro inválido' });
    if (!VALID_LICENSE_TYPES.has(req.params.licenseType))
        return res.status(400).json({ error: 'Tipo de licencia inválido' });

    const tokens = loadTokens();
    const entry = tokens[req.params.token];

    if (!entry) return res.status(404).json({ error: 'Token no válido' });
    if (Date.now() > entry.expiresAt) return res.status(410).json({ error: 'Enlace expirado' });

    const item = entry.items.find(
        i => i.beatId === req.params.beatId && i.licenseType === req.params.licenseType
    );
    if (!item) return res.status(403).json({ error: 'No tienes acceso a este archivo' });

    const safeName = item.title.replace(/[^\w\s\-áéíóúñ]/gi, '').trim();

    // Busca primero en la carpeta privada (archivos de alta calidad)
    const privateDir = path.join(__dirname, '../private/beats', req.params.beatId, req.params.licenseType);
    let filePath = null;

    if (fs.existsSync(privateDir)) {
        const files = fs.readdirSync(privateDir).filter(f => /\.(wav|mp3|zip)$/i.test(f));
        if (files.length > 0) filePath = path.join(privateDir, files[0]);
    }

    if (filePath) {
        const ext = path.extname(filePath).slice(1);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName} - ${item.licenseLabel}.${ext}"`);
        res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'audio/wav');
        return res.sendFile(path.resolve(filePath));
    }

    // Fallback al preview público (útil en desarrollo antes de tener los archivos finales)
    if (item.preview && isMediaRef(item.preview)) {
        try {
            return await streamFile(mediaIdFromRef(item.preview), req, res, {
                download: true,
                filename: `${safeName} - ${item.licenseLabel}.mp3`
            });
        } catch (err) {
            console.error('Download stream error:', err.message);
            if (!res.headersSent) return res.status(500).json({ error: 'Error al servir el archivo.' });
            return;
        }
    }

    if (item.preview) {
        const staticPath = path.join(__dirname, '../public', item.preview);
        if (fs.existsSync(staticPath)) {
            const ext = path.extname(staticPath).slice(1);
            res.setHeader('Content-Disposition', `attachment; filename="${safeName} - ${item.licenseLabel}.${ext}"`);
            res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'audio/wav');
            return res.sendFile(path.resolve(staticPath));
        }
    }

    res.status(404).json({ error: 'Archivo no disponible. Contacta con alsxbeats@gmail.com' });
});

module.exports = router;
