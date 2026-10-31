# Pehn Design — demo

Landing + catálogo con personalizador para [@pehn.designn](https://www.instagram.com/pehn.designn/).

- `index.html` — landing (galería, historia, reseñas, blog, FAQ, contacto)
- `catalogo.html` — catálogo con personalizador, precio automático y carrito
- `pedido.html` — Rastrear pedido: estado, montos y subir comprobante del anticipo
- `privacidad.html` — aviso de privacidad
- `marco.js` — menú, pie, carrito y aviso de privacidad comunes a todas las páginas
- `datos.js` — **lo que se edita seguido**: número de WhatsApp, precios, opciones, colores, productos, tarjetas y portada
- `dibujos.js` — vistas previas en SVG de cada producto
- `js/` — el código de la página: módulos ES (`import`/`export`), uno por tarea; cada página carga un solo punto de entrada (`js/paginas/*.js`) y el personalizador se descarga solo al abrir un producto. Mapa y reglas en `docs/ARQUITECTURA.md`
- `css/` — estilos por sección (`base.css` trae colores y medidas en `:root`); cada página enlaza solo los suyos
- `apps-script/` — pedidos, inventario, pagos y contenido en Google Sheets + CRM (ver `apps-script/README.md`)
- `pruebas/` — pruebas de seguridad, precios, tamaño de archivos, módulos y de punta a punta. Primero `npm install`; luego `npm run lint` y `npm test` (ver `docs/ARQUITECTURA.md`)
- `docs/` — `SEGURIDAD.md` (revisión y riesgos), `PLAN-CRM-Y-MENSAJES.md` (siguientes pasos)
- `_headers`, `_redirects` — seguridad y carpetas ocultas en Cloudflare Pages
- `fotos/` — fotos reales de pedidos; cada cuadro del catálogo abre el diseño de su foto ya armado

Sitio estático: hay que servir la carpeta (`python3 -m http.server`) y abrir `http://localhost:8000`; con doble clic en `index.html` (`file://`) los módulos ES no cargan.

Precios en lempiras (HNL). Para guardar pedidos, sigue `apps-script/README.md`: el sitio habla con el portero `functions/api.js` (Cloudflare Pages Function), que lleva el token en secreto (variable `SITE_TOKEN`).

Pendiente: precios reales (en `datos.js`), fotos de sudaderas y taller. El WhatsApp, textos, colores y fotos de portada se cambian en CRM › Sitio web.

## Si algo se rompe

| Qué pasa | Dónde mirar |
|---|---|
| El sitio se ve vacío o un producto no aparece | Abre la consola del navegador (F12). Los avisos `[Pehn]` dicen qué dato de `datos.js` está mal |
| "No se pudo enviar" al mandar un pedido | El mensaje dice la causa. Guía al inicio de `apps-script/Orders.gs` |
| El CRM no carga, o algo de la hoja no cuadra | En la hoja: **Pehn › Revisar que todo funcione** |
| Cambié código de Apps Script y no se nota | Implementar › Gestionar implementaciones › Nueva versión |
| El stock no cuadra | Hoja **Movimientos**: cada cambio queda ahí con quién y por qué |

Cada archivo empieza con un comentario que explica qué hace y cómo agregar cosas.
