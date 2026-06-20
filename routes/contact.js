const express = require('express');
const router  = express.Router();

router.post('/', async (req, res) => {
    const { name, email, message, beat } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: 'Email no configurado en el servidor.' });
    }

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
                reply_to: `${name} <${email}>`,
                subject:  `Exclusive Lease — ${beat || 'beat'}`,
                html: `
                    <div style="font-family:sans-serif;max-width:520px">
                        <h2 style="color:#4ecdc4;margin-bottom:4px">Solicitud de Exclusive Lease</h2>
                        <p style="color:#666;margin-top:0">Beat: <strong>${beat || '—'}</strong></p>
                        <hr style="border:none;border-top:1px solid #eee">
                        <p><strong>Nombre:</strong> ${name}</p>
                        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                        <p><strong>Mensaje:</strong></p>
                        <blockquote style="border-left:3px solid #4ecdc4;margin:0;padding:8px 16px;color:#333;background:#f9f9f9">
                            ${message.replace(/\n/g, '<br>')}
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
