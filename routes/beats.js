const express = require('express');
const router  = express.Router();
const Beat    = require('../models/Beat');

router.get('/', async (req, res) => {
    try {
        const { genre, search } = req.query;
        const query = {};

        if (genre && genre !== 'all') {
            query.genre = new RegExp(`^${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        }

        let beats = await Beat.find(query).lean();

        if (search) {
            const q = search.toLowerCase();
            beats = beats.filter(b =>
                b.title.toLowerCase().includes(q) ||
                (b.tags || []).some(t => t.toLowerCase().includes(q)) ||
                (b.genre || '').toLowerCase().includes(q)
            );
        }

        res.json(beats);
    } catch (err) {
        console.error('List beats error:', err.message);
        res.status(500).json({ error: 'Error al cargar el catálogo.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const beat = await Beat.findOne({ id: req.params.id }).lean();
        if (!beat) return res.status(404).json({ error: 'Beat not found' });
        res.json(beat);
    } catch (err) {
        console.error('Get beat error:', err.message);
        res.status(500).json({ error: 'Error al cargar el beat.' });
    }
});

module.exports = router;
