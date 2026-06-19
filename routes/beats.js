const express = require('express');
const router = express.Router();
const beats = require('../data/beats.json');

router.get('/', (req, res) => {
    const { genre, search } = req.query;
    let result = beats;

    if (genre && genre !== 'all') {
        result = result.filter(b => b.genre.toLowerCase() === genre.toLowerCase());
    }

    if (search) {
        const q = search.toLowerCase();
        result = result.filter(b =>
            b.title.toLowerCase().includes(q) ||
            b.tags.some(t => t.toLowerCase().includes(q)) ||
            b.genre.toLowerCase().includes(q)
        );
    }

    res.json(result);
});

router.get('/:id', (req, res) => {
    const beat = beats.find(b => b.id === req.params.id);
    if (!beat) return res.status(404).json({ error: 'Beat not found' });
    res.json(beat);
});

module.exports = router;
