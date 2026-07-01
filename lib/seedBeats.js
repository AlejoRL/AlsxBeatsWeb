const fs   = require('fs');
const path = require('path');
const Beat = require('../models/Beat');

const SEED_FILE = path.join(__dirname, '../data/beats.json');

// Los beats "de catálogo" originales viven en data/beats.json (sus imágenes están
// commiteadas en el repo, así que no necesitan GridFS). Los insertamos en MongoDB
// una sola vez por id — si ya existen (o un admin los editó luego) no se tocan.
async function seedBeats() {
    let seed;
    try { seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')); }
    catch { return; }

    for (const beat of seed) {
        try {
            await Beat.updateOne({ id: beat.id }, { $setOnInsert: beat }, { upsert: true });
        } catch (err) {
            console.error(`Seed beat "${beat.id}" error:`, err.message);
        }
    }
}

module.exports = seedBeats;
