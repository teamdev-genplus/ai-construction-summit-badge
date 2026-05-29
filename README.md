# AI Construction Summit 2026 — Badge Generator

Generador de badges personalizados para asistentes al **AI Construction Summit 2026**
(17–18 julio · Auditorio CIP Lima · organizado por CIP + AECODE).

Cada asistente llena un mini-form (nombre, cargo opcional, empresa opcional, foto),
ajusta su foto con zoom/crop, y descarga su badge listo para compartir en redes
con `#AIConstructionSummit2026`.

## Stack

- HTML/CSS/JS vanilla — sin build step
- [Cropper.js 1.6](https://github.com/fengyuanchen/cropperjs) — modal de crop/zoom de foto
- [html-to-image 1.11](https://github.com/bubkoo/html-to-image) — render del badge a PNG vía SVG foreignObject
- Inter (Google Fonts)
- Logo oficial Summit en SVG (paleta cyan → azul → morado de AECODE)

## Funcionalidad

- Preview en vivo del badge mientras se llena el form
- Dos formatos: **4:5 vertical** (1080×1350, Instagram / Stories) y **1:1 cuadrado** (1080×1080, LinkedIn / WhatsApp)
- Crop/zoom de la foto con Cropper.js — botón "✏️ Editar foto" para volver a recortar sin re-upload
- Split inteligente del nombre con convención LatAm (1, 2 o 3+ nombres)
- Cargo y empresa opcionales; si vacíos se ocultan en el badge
- Logo oficial Summit en blanco, rotado en banda gradient
- Share directo a LinkedIn, WhatsApp, X

## Estructura

```
aecode-badge-poc/
├── index.html          # Form + preview + modal crop
├── styles.css          # Estilos
├── app.js              # Lógica
├── assets/
│   ├── summit_logo.svg # Logo oficial Summit (de Firebase storage AECODE)
│   └── aecodito.png    # Mascot AECODE
└── README.md
```

## Cómo correrlo local

Cualquier static server sirve. Por ejemplo:

```powershell
cd aecode-badge-poc
python -m http.server 8765
```

Y abre `http://localhost:8765`.

## Deploy

Apto para Vercel / Netlify / GitHub Pages (es estático puro):

- **Vercel**: import del repo, deploy automático
- **Netlify**: drag & drop de la carpeta o conectar repo
- **GitHub Pages**: Settings → Pages → branch main, folder `/aecode-badge-poc` o root

## Roadmap (post-POC)

- Migrar a Next.js + Vercel para tener URL única por badge (`/badge/[id]`)
- Endpoint `/api/badge` que sube foto a Firebase Storage del Summit
- Open Graph dinámico → preview rico en LinkedIn cuando el asistente comparte
- Stats de uso (cuántos badges generados, top empresas)
