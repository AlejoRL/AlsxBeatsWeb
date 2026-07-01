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

// Limpieza puntual: estos dos beats de muestra nunca tuvieron audio adjunto y ya
// no están en data/beats.json — se borran de Mongo si quedaron de una siembra
// anterior. Es una operación idempotente (no pasa nada si ya no existen).
const RETIRED_BEAT_IDS = ['dark-drill', 'rnb-type-beat'];
async function removeRetiredBeats() {
    try {
        const result = await Beat.deleteMany({ id: { $in: RETIRED_BEAT_IDS } });
        if (result.deletedCount) console.log(`🧹 Beats sin audio eliminados: ${result.deletedCount}`);
    } catch (err) {
        console.error('removeRetiredBeats error:', err.message);
    }
}

module.exports = seedBeats;
module.exports.removeRetiredBeats = removeRetiredBeats;
