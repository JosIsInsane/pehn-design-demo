# Seguridad del sistema Pehn Design

Revisión del 27 de octubre de 2026. Cubre el sitio (`*.html`, `*.js`), el CRM y Apps Script (`apps-script/`).

## Cómo se prueba

```bash
node pruebas/seguridad.test.js   # 37 pruebas del servidor en un simulador de Google Apps Script
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
| IDs repetidos al borrar filas | Sí | Usa el número más alto del día |

## Riesgos que quedan (y qué hacer)

1. **El token del sitio es público** (vive en `datos.js`). Sirve contra spam simple, no contra un atacante decidido. Los topes de arriba limitan el daño. Si llega spam: cambiar el token en Config y en `datos.js`. Siguiente paso recomendado: **Cloudflare Turnstile** (captcha invisible gratis), requiere crear la llave en Cloudflare.
2. **El total lo calcula el navegador.** Alguien podría mandar un pedido con precio alterado. Por eso el flujo pide aprobar el diseño por WhatsApp antes de cobrar: **confirmen siempre el total antes de pedir el anticipo.**
3. **Un comprobante puede ser falso.** El sistema lee el monto, no verifica con el banco. "Coincide" significa que el número es correcto, no que el dinero llegó: **confirmen en la app del banco antes de producir.**
4. **Quien tenga el enlace del CRM entra.** No compartirlo. Si se filtra: cambiar Config › Clave del CRM.
5. **Fotos del sitio** subidas desde el CRM son públicas (deben serlo para mostrarse). Las de pedidos y comprobantes son privadas.
6. El aviso de privacidad es un modelo de buenas prácticas: que lo revise un abogado en Honduras antes de darlo por definitivo.
