// Almacena los archivos de audio/portada subidos por los usuarios directamente en
// MongoDB (GridFS) en vez del disco local, para que sobrevivan a los reinicios/
// redeploys de Render (cuyo filesystem es efímero).
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = mongoose.mongo;

const BUCKET_NAME = 'beatFiles';

function getBucket() {
    return new GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

function uploadBuffer(buffer, filename, contentType) {
    return new Promise((resolve, reject) => {
        const uploadStream = getBucket().openUploadStream(filename, { contentType });
        uploadStream.on('error', reject);
        uploadStream.on('finish', () => resolve(uploadStream.id));
        uploadStream.end(buffer);
    });
}

async function deleteFile(id) {
    if (!id) return;
    try { await getBucket().delete(new ObjectId(id)); } catch { /* ya no existe */ }
}

// Referencias a archivos guardados en GridFS: rutas con forma "/media/<id>"
function isMediaRef(str) {
    return typeof str === 'string' && str.startsWith('/media/');
}

function mediaIdFromRef(str) {
    return str.slice('/media/'.length);
}

function mediaRef(id) {
    return `/media/${id}`;
}

// Sirve un archivo de GridFS por res, con soporte de Range (necesario para
// reproducción/scrubbing de audio) y descarga forzada opcional.
async function streamFile(id, req, res, { download, filename } = {}) {
    let _id;
    try { _id = new ObjectId(id); }
    catch { return res.status(400).json({ error: 'Id de archivo inválido.' }); }

    const bucket = getBucket();
    const files = await bucket.find({ _id }).toArray();
    if (!files.length) return res.status(404).json({ error: 'Archivo no encontrado.' });
    const file = files[0];

    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Accept-Ranges', 'bytes');
    if (!download) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (download) res.set('Content-Disposition', `attachment; filename="${filename || file.filename}"`);

    const range = req.headers.range;
    if (range && !download) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        const start = match ? parseInt(match[1], 10) : 0;
        const end   = match && match[2] ? parseInt(match[2], 10) : file.length - 1;

        if (isNaN(start) || start >= file.length || end >= file.length) {
            res.status(416).set('Content-Range', `bytes */${file.length}`);
            return res.end();
        }

        res.status(206);
        res.set('Content-Range', `bytes ${start}-${end}/${file.length}`);
        res.set('Content-Length', end - start + 1);
        pipeWithErrorHandling(bucket.openDownloadStream(_id, { start, end: end + 1 }), res);
    } else {
        res.set('Content-Length', file.length);
        pipeWithErrorHandling(bucket.openDownloadStream(_id), res);
    }
}

// .pipe() no reenvía el evento 'error' del stream de origen: sin este listener,
// un fallo a mitad de la descarga (conexión de Mongo caída, etc.) tumbaría el proceso.
function pipeWithErrorHandling(sourceStream, res) {
    sourceStream.on('error', (err) => {
        console.error('GridFS stream error:', err.message);
        if (!res.headersSent) res.status(500).end();
        else res.destroy();
    });
    sourceStream.pipe(res);
}

module.exports = { getBucket, uploadBuffer, deleteFile, isMediaRef, mediaIdFromRef, mediaRef, streamFile, ObjectId };
