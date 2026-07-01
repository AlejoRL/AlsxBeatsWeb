const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const BEATS_FILE = path.join(__dirname, '../data/beats.json');

function loadBeats() {
    try { return JSON.parse(fs.readFileSync(BEATS_FILE, 'utf8')); }
    catch { return []; }
}

router.get('/', (req, res) => {
    const { genre, search } = req.query;
    const beats = loadBeats();
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
    const beat = loadBeats().find(b => b.id === req.params.id);
    if (!beat) return res.status(404).json({ error: 'Beat not found' });
    res.json(beat);
});

module.exports = router;
