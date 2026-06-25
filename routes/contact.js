const express = require('express');
const router  = express.Router();

// Escapa caracteres HTML para prevenir XSS en el cuerpo del email
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

router.post('/', async (req, res) => {
    const { name, email, message, beat } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: 'Email no configurado en el servidor.' });
    }

    const safeName    = escapeHtml(name);
    const safeEmail   = escapeHtml(email);
    const safeBeat    = escapeHtml(beat || '—');
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from:     'AlsxBeats <onboarding@resend.dev>',
                to:       'alsxbeats@gmail.com',
                reply_to: `${safeName} <${safeEmail}>`,
                subject:  `Exclusive Lease — ${safeBeat}`,
                html: `
                    <div style="font-family:sans-serif;max-width:520px">
                        <h2 style="color:#4ecdc4;margin-bottom:4px">Solicitud de Exclusive Lease</h2>
                        <p style="color:#666;margin-top:0">Beat: <strong>${safeBeat}</strong></p>
                        <hr style="border:none;border-top:1px solid #eee">
                        <p><strong>Nombre:</strong> ${safeName}</p>
                        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
                        <p><strong>Mensaje:</strong></p>
                        <blockquote style="border-left:3px solid #4ecdc4;margin:0;padding:8px 16px;color:#333;background:#f9f9f9">
                            ${safeMessage}
                        </blockquote>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Resend response:', response.status, JSON.stringify(err));
            throw new Error(err.message || `Resend error ${response.status}`);
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('Error enviando email:', err.message);
        res.status(500).json({ error: 'No se pudo enviar el mensaje. Inténtalo de nuevo.' });
    }
});

module.exports = router;
