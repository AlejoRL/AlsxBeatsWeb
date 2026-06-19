---
name: project-status
description: Estado actual de AlsxBeatsWeb — qué está implementado y qué falta
metadata:
  type: project
---

Beat store para productor AlsxBeats. Stack: Node.js + Express (sin framework frontend).

**Why:** Convertir una web estática con pago falso en una tienda real que procese pagos y entregue archivos.

## Lo que ya está implementado (Fase 1 — jun 2026)

- `data/beats.json` — catálogo de beats (3 beats iniciales), fuente de verdad
- `routes/beats.js` — API GET /api/beats (con filtros genre/search) y GET /api/beats/:id
- `routes/checkout.js` — Stripe Checkout real: POST /create-session, GET /complete, POST /webhook
- `routes/download.js` — Entrega protegida por token: GET /info/:token, GET /file/:token/:beatId/:licenseType
- `public/success.html` — Página post-pago con enlaces de descarga (48h)
- `public/js/catalog.js` — Catálogo dinámico desde API (reemplazó HTML hardcodeado)
- `public/js/cart.js` — Carrito actualizado: checkout redirige a Stripe real
- `public/licencias.html` — Acepta ?beatId= (API) con fallback a ?title=&img=&audio= (legacy)
- `private/beats/` — Carpeta para archivos de audio de alta calidad (fuera de public/)
- `.env.example` — Plantilla de variables de entorno

## Pendiente de configurar por el usuario

- Crear `.env` con claves reales de Stripe (sk_test_... / sk_live_...)
- Para testing local: `stripe listen --forward-to localhost:3000/api/checkout/webhook`
- Subir archivos WAV/STEMS a `private/beats/{beatId}/{licenseType}/archivo.wav`
- Email (opcional): configurar Gmail App Password en .env

## Estructura de cart items (formato actual)

```json
{ "beatId": "lofi-vintage-memories", "licenseType": "basic", "title": "...", "image": "...", "license": "Basic Lease", "price": 29 }
```

## Fase 2 pendiente

- Panel admin para subir beats (sin tocar código)
- Filtros UI en el catálogo (por género, BPM, key)
- Cuentas de usuario con historial de compras

**How to apply:** Al sugerir cambios, respetar la arquitectura: datos en beats.json, lógica en routes/, no hardcodear beats en HTML.
