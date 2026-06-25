const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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
router.get('/file/:token/:beatId/:licenseType', (req, res) => {
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

    // Busca primero en la carpeta privada (archivos de alta calidad)
    const privateDir = path.join(__dirname, '../private/beats', req.params.beatId, req.params.licenseType);
    let filePath = null;

    if (fs.existsSync(privateDir)) {
        const files = fs.readdirSync(privateDir).filter(f => /\.(wav|mp3|zip)$/i.test(f));
        if (files.length > 0) filePath = path.join(privateDir, files[0]);
    }

    // Fallback al preview público (útil en desarrollo antes de tener los archivos finales)
    if (!filePath && item.preview) {
        filePath = path.join(__dirname, '../public', item.preview);
    }

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no disponible. Contacta con alsxbeats@gmail.com' });
    }

    const ext = path.extname(filePath).slice(1);
    const safeName = item.title.replace(/[^\w\s\-áéíóúñ]/gi, '').trim();
    const fileName = `${safeName} - ${item.licenseLabel}.${ext}`;

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    res.sendFile(path.resolve(filePath));
});

module.exports = router;
