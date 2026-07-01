const express = require('express');
const router  = express.Router();
const { streamFile } = require('../lib/gridfs');

// GET /media/:id — sirve audio/imágenes guardados en GridFS (persisten en MongoDB
// en vez del disco efímero del contenedor)
router.get('/:id', async (req, res) => {
    try {
        await streamFile(req.params.id, req, res);
    } catch (err) {
        console.error('Media stream error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Error al servir el archivo.' });
    }
});

module.exports = router;
