const express = require('express');
const path = require('path');
const app = express();

// Definimos el puerto (Render usa process.env.PORT, en local usamos el 3000)
const PORT = process.env.PORT || 3000;

// Servir de forma estática los archivos de la carpeta public (HTML, CSS, imágenes, música)
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para servir el index.html de forma limpia
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores globales para evitar que el servidor se caiga
app.use((err, req, res, next) => {
    console.error("Error en el servidor:", err.stack);
    res.status(500).send('Algo salió mal en el servidor backend.');
});

// Levantar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo con éxito.`);
    console.log(`🌍 Accede de forma local en: http://localhost:${PORT}`);
});