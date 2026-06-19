const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');

const dataDir = path.join(__dirname, '../data');
const pubDir  = path.join(__dirname, '../public');

function readJson(file) {
    const fp = path.join(dataDir, file);
    if (!fs.existsSync(fp)) return [];
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJson(file, data) {
    fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}
function requireAdmin(req, res, next) {
    if (req.session?.isAdmin) return next();
    res.status(401).json({ error: 'No autorizado' });
}
function slug(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Multer: imágenes para artistas / kits / colecciones ──────────────────────
const imgStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(pubDir, 'assets/images');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const imgUpload = multer({ storage: imgStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Multer: archivos de sound kits (ZIP, WAV, etc.)
const kitStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, `../private/soundkits/${req.params.id}`);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});
const kitUpload = multer({ storage: kitStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// ════════════════════════════════════════════════════════════════
// ARTISTS
// ════════════════════════════════════════════════════════════════
router.get('/artists', (req, res) => res.json(readJson('artists.json')));

router.post('/artists', requireAdmin, (req, res) => {
    const list = readJson('artists.json');
    const { name, bio, genres, location, social } = req.body;
    const artist = {
        id: slug(name) || Date.now().toString(),
        name, bio,
        avatar: '',
        verified: false,
        genres: Array.isArray(genres) ? genres : (genres || '').split(',').map(g => g.trim()).filter(Boolean),
        location: location || '',
        social: social || { instagram: '', youtube: '', soundcloud: '' },
        publishedAt: new Date().toISOString().split('T')[0]
    };
    list.push(artist);
    writeJson('artists.json', list);
    res.json(artist);
});

router.put('/artists/:id', requireAdmin, (req, res) => {
    const list = readJson('artists.json');
    const idx = list.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    const { name, bio, genres, location, social, verified } = req.body;
    list[idx] = {
        ...list[idx], name, bio,
        genres: Array.isArray(genres) ? genres : (genres || '').split(',').map(g => g.trim()).filter(Boolean),
        location: location || list[idx].location,
        social: social || list[idx].social,
        verified: verified !== undefined ? verified : list[idx].verified
    };
    writeJson('artists.json', list);
    res.json(list[idx]);
});

router.delete('/artists/:id', requireAdmin, (req, res) => {
    let list = readJson('artists.json');
    list = list.filter(a => a.id !== req.params.id);
    writeJson('artists.json', list);
    res.json({ ok: true });
});

router.post('/artists/:id/avatar', requireAdmin, imgUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
    const list = readJson('artists.json');
    const idx = list.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    list[idx].avatar = `assets/images/${req.file.filename}`;
    writeJson('artists.json', list);
    res.json({ path: list[idx].avatar });
});

// ════════════════════════════════════════════════════════════════
// SOUND KITS
// ════════════════════════════════════════════════════════════════
router.get('/soundkits', (req, res) => res.json(readJson('soundkits.json')));

router.post('/soundkits', requireAdmin, (req, res) => {
    const list = readJson('soundkits.json');
    const { title, price, fileCount, formats, tags, description } = req.body;
    const kit = {
        id: Date.now().toString(),
        title, price: Number(price),
        fileCount: Number(fileCount) || 0,
        formats: Array.isArray(formats) ? formats : (formats || '').split(',').map(f => f.trim()).filter(Boolean),
        tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
        description: description || '',
        image: '',
        file: null,
        publishedAt: new Date().toISOString().split('T')[0]
    };
    list.push(kit);
    writeJson('soundkits.json', list);
    res.json(kit);
});

router.put('/soundkits/:id', requireAdmin, (req, res) => {
    const list = readJson('soundkits.json');
    const idx = list.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    const { title, price, fileCount, formats, tags, description } = req.body;
    list[idx] = {
        ...list[idx], title, price: Number(price),
        fileCount: Number(fileCount) || list[idx].fileCount,
        formats: Array.isArray(formats) ? formats : (formats || '').split(',').map(f => f.trim()).filter(Boolean),
        tags: Array.isArray(tags) ? tags : (tags || '').split(',').map(t => t.trim()).filter(Boolean),
        description: description || list[idx].description
    };
    writeJson('soundkits.json', list);
    res.json(list[idx]);
});

router.delete('/soundkits/:id', requireAdmin, (req, res) => {
    let list = readJson('soundkits.json');
    list = list.filter(k => k.id !== req.params.id);
    writeJson('soundkits.json', list);
    res.json({ ok: true });
});

router.post('/soundkits/:id/image', requireAdmin, imgUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
    const list = readJson('soundkits.json');
    const idx = list.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    list[idx].image = `assets/images/${req.file.filename}`;
    writeJson('soundkits.json', list);
    res.json({ path: list[idx].image });
});

router.post('/soundkits/:id/file', requireAdmin, kitUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
    const list = readJson('soundkits.json');
    const idx = list.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    list[idx].file = req.file.originalname;
    writeJson('soundkits.json', list);
    res.json({ file: req.file.originalname });
});

// ════════════════════════════════════════════════════════════════
// COLLECTIONS
// ════════════════════════════════════════════════════════════════
router.get('/collections', (req, res) => res.json(readJson('collections.json')));

router.post('/collections', requireAdmin, (req, res) => {
    const list = readJson('collections.json');
    const { title, description, beatIds } = req.body;
    const col = {
        id: Date.now().toString(),
        title, description: description || '',
        image: '',
        beatIds: Array.isArray(beatIds) ? beatIds : [],
        publishedAt: new Date().toISOString().split('T')[0]
    };
    list.push(col);
    writeJson('collections.json', list);
    res.json(col);
});

router.put('/collections/:id', requireAdmin, (req, res) => {
    const list = readJson('collections.json');
    const idx = list.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    const { title, description, beatIds } = req.body;
    list[idx] = {
        ...list[idx], title,
        description: description ?? list[idx].description,
        beatIds: Array.isArray(beatIds) ? beatIds : list[idx].beatIds
    };
    writeJson('collections.json', list);
    res.json(list[idx]);
});

router.delete('/collections/:id', requireAdmin, (req, res) => {
    let list = readJson('collections.json');
    list = list.filter(c => c.id !== req.params.id);
    writeJson('collections.json', list);
    res.json({ ok: true });
});

router.post('/collections/:id/image', requireAdmin, imgUpload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
    const list = readJson('collections.json');
    const idx = list.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
    list[idx].image = `assets/images/${req.file.filename}`;
    writeJson('collections.json', list);
    res.json({ path: list[idx].image });
});

module.exports = router;
