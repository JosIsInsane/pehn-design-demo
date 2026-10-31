# Seguridad del sistema Pehn Design

Revisión del 27 de octubre de 2026. Cubre el sitio (`*.html`, `*.js`), el CRM y Apps Script (`apps-script/`).

## Cómo se prueba

```bash
node pruebas/seguridad.test.js   # 79 pruebas del servidor en un simulador de Google Apps Script
node pruebas/sitio.test.js       # pedido de punta a punta en Chromium, con las cabeceras de _headers
```

Correr las dos antes de publicar cambios. Si alguna falla, no publicar.

## Qué se probó y cómo quedó

| Ataque | Qué pasaba antes | Ahora |
|---|---|---|
| **Inyección en la hoja** (equivalente a "SQL injection" en Google Sheets): un nombre como `=IMPORTXML("http://…")` | Se guardaba como fórmula: podía mandar datos de la hoja a otro sitio | Todo texto de afuera pasa por `celda_()`: se guarda como texto. Probado en Pedidos, Partidas, Clientes, Recetas, Pagos, Sitio, Inventario y Movimientos |
| Teléfono `+504…` | Sheets lo tomaba como fórmula/número | Se guarda como texto |
| **Bots y spam** | Solo campo trampa y límite por número | Campo trampa + tiempo mínimo de llenado (2.5 s) + 5 pedidos por WhatsApp cada 10 min + 40 pedidos por hora en toda la tienda |
| Campos gigantes o raros | Se guardaban tal cual | Lista blanca de campos, topes de largo, números acotados, saltos de línea fuera de nombres y asuntos de correo |
| Archivos peligrosos (SVG con código, HTML) | SVG se aceptaba | Solo JPG, PNG, WEBP y PDF, con base64 válido y máximo ~5 MB |
| **XSS** (código en el nombre, notas o textos del sitio) | El número de pedido del servidor se pintaba sin escapar | Todo pasa por `esc()`/`textContent`. Probado: ningún texto ejecuta código |
| Ver pedidos ajenos en Rastrear pedido | No existía | Pide número **y** WhatsApp; si no coinciden responde igual que si no existiera; 15 intentos por pedido cada 10 min; nunca devuelve nombre, correo, ciudad ni notas |
| CRM: escribir en la fila de encabezados o fuera de rango | Posible con una llamada manipulada | `filaValida_()` en cada escritura |
| Clave del CRM filtrada por "Referer" al abrir WhatsApp/Drive | Posible | `no-referrer` en el CRM |
| Enlaces `javascript:` en datos de la hoja | El CRM los ponía como enlace | Solo enlaces `https` de Google |
| Sitio dentro de un iframe ajeno (clickjacking), scripts inyectados | Sin cabeceras | `_headers`: CSP estricta (solo scripts propios), `frame-ancestors 'none'`, HSTS, nosniff |
| Correo que falla (límite de 100 al día) | El cliente veía error aunque el pedido sí se guardó, y podía mandarlo dos veces | El pedido se guarda igual; el error del correo queda en Ejecuciones de Apps Script |
| **XSS reflejado en el CRM** (`?k=` con código se pintaba en la página del dueño) y datos con `<!--<script>` que dejaban el CRM en blanco | Posible | `?k=` solo se refleja si es exactamente la clave; todo `<` va como `\u003c` en la clave y en los datos. Probado también en Chromium |
| Clave del CRM en el correo diario, adivinada por tiempos | La clave viajaba en el enlace del resumen; comparación normal | El correo ya no lleva la clave; comparación en tiempo constante; intentos fallidos quedan en *Ejecuciones* (sin la clave); **Pehn › Cambiar clave del CRM** |
| Usar el token público para llenar de correos a un tercero | Sin tope por destinatario | Máximo 1 correo por destinatario (hash SHA-256 en caché, ~6 h); regla estricta de correo (sin `?bcc=` ni saltos de línea) |
| Archivo falso con tipo de imagen | Solo se miraba el tipo declarado | Se verifican los primeros bytes (JPG, PNG, WEBP, PDF) |
| Pedidos lentos que bloqueaban a los demás | Drive, OCR y correo ocurrían dentro del candado | Fuera del candado; dentro solo ID, filas y stock |
| Mensajes internos (nombres de hojas, SKU) visibles en el sitio | Se devolvía el texto del error | Solo mensajes de una lista conocida; el resto es genérico |
| IDs repetidos al borrar filas | Sí | Usa el número más alto del día |

## Riesgos que quedan (y qué hacer)

1. **El token del sitio es público** (vive en `datos.js`). Sirve contra spam simple, no contra un atacante decidido. Los topes de arriba limitan el daño. Si llega spam: cambiar el token en Config y en `datos.js`. **Cloudflare Turnstile** (captcha invisible gratis) ya viene integrado y apagado: actívalo con la site key en `datos.js` y `TURNSTILE_SECRET` en Apps Script (ver `apps-script/README.md`).
2. **El total lo calcula el navegador.** Alguien podría mandar un pedido con precio alterado. Por eso el flujo pide aprobar el diseño por WhatsApp antes de cobrar: **confirmen siempre el total antes de pedir el anticipo.**
3. **Un comprobante puede ser falso.** El sistema lee el monto, no verifica con el banco. "Coincide" significa que el número es correcto, no que el dinero llegó: **confirmen en la app del banco antes de producir.**
4. **Quien tenga el enlace del CRM entra.** No compartirlo. Si se filtra: **Pehn › Cambiar clave del CRM** (los enlaces viejos dejan de servir). El correo diario ya no lleva el enlace.
5. **Fotos del sitio** subidas desde el CRM son públicas (deben serlo para mostrarse). Las de pedidos y comprobantes son privadas.
6. El límite de "1 correo por destinatario" usa la caché de Google, que guarda como máximo 6 horas: un mismo correo puede recibir otro pasado ese tiempo. Si hace falta un día exacto, habría que guardarlo en una hoja.
7. Si una carpeta de pedido queda suelta en Drive porque un pedido falló a medias, se puede borrar sin problema.
8. El aviso de privacidad es un modelo de buenas prácticas: que lo revise un abogado en Honduras antes de darlo por definitivo.

## Privacidad, plagio y archivos públicos (31 oct 2026)

- **GPC (Global Privacy Control):** si el navegador manda la señal, `js/aviso.js` elige "Solo el carrito" sin preguntar
  y lo dice en el aviso. Se declara en `/.well-known/gpc.json`. Si algún día se agrega Pixel, Analytics o similar, se carga
  **solo** si `permiteMedicion()` (en `js/aviso.js`) da `true`.
- **security.txt:** `/.well-known/security.txt` dice a quién avisar de una falla. Vence cada año: cambia `Expires` antes del 31 oct 2027.
- **Licencia:** `LICENSE` (todos los derechos reservados) y © en el pie. El repo debe ser **privado** en GitHub.
- **Dependabot:** `.github/dependabot.yml` abre un PR al mes si hay versiones nuevas de las acciones o herramientas de prueba.
  Three.js (en `vendor/`) se actualiza a mano.
- **Si cambia el dominio** (de `pehn-design-demo.pages.dev` a uno propio), cambia la URL en: las etiquetas `og:` y `canonical`
  de las 4 páginas, `robots.txt`, `sitemap.xml` y `.well-known/security.txt`.
- **Página 404:** `404.html` (Cloudflare Pages la muestra sola). Lleva `<base href="/">` para que sus enlaces funcionen en cualquier ruta.

## Portero de Cloudflare (`functions/api.js`)

La web ya no habla directo con Apps Script. Todo pasa por `/api`, una Cloudflare Pages Function que:
- guarda el **token del sitio** en secreto (`SITE_TOKEN`); el que estaba en `datos.js` quedó público en el historial,
  por eso hay que **cambiarlo** (Pehn › Cambiar token del sitio) una vez que el portero esté publicado;
- solo deja pasar las 5 acciones que existen y hasta 30 MB;
- limita por **IP** (Apps Script no la ve): primer filtro en el portero y la cuenta real en Apps Script (`TOPES_IP` de Orders.gs);
- revisa **Turnstile** antes de tocar Google si existe `TURNSTILE_SECRET` (y avisa a Apps Script con `portero: true`
  para que no lo vuelva a revisar: un token de Turnstile sirve una sola vez);
- no abre el pedido (con fotos pesa megas y el plan gratis da ~10 ms de CPU): lo pasa en streaming y le pega al final
  token, IP, acción y portero. En JSON gana la última clave repetida: el navegador no puede colar los suyos.
- La CSP ya no permite que el navegador se conecte a script.google.com.
Pruebas: `pruebas/portero.test.js` (con Google simulado) y la de punta a punta (`sitio.test.js`) pasa por el portero real.
