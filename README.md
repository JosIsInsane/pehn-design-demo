# Pehn Design — demo

Landing + catálogo con personalizador para [@pehn.designn](https://www.instagram.com/pehn.designn/).

- `index.html` — landing (galería, historia, reseñas, blog, FAQ, contacto)
- `catalogo.html` — catálogo con personalizador, precio automático y carrito
- `app.js` — productos, precios, vistas previas SVG, carrito y WhatsApp
- `styles.css` — estilos
- `apps-script/` — pedidos e inventario en Google Sheets + panel (ver `apps-script/README.md`)
- `fotos/` — fotos reales de pedidos; cada cuadro del catálogo abre el diseño de su foto ya armado

Sitio estático: abrir `index.html` o servir la carpeta (`python3 -m http.server`).

Precios en lempiras (HNL). Para guardar pedidos, sigue `apps-script/README.md` y pega `sheetsUrl` y `sheetsToken` en `app.js`.

Pendiente: precios reales, número de WhatsApp (`CONFIG.whatsapp`) y fotos de sudaderas/taller.
