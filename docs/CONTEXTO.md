# Contexto para seguir en una sesión nueva

Pega esto al empezar: "Lee docs/CONTEXTO.md del repo JosIsInsane/pehn-design-demo y seguimos."

## El proyecto
- Sitio + CRM para **Pehn Design** (cuadros con minifiguras y regalos personalizados, Honduras, @pehn.designn). Trato cerrado: L 6,500.
- Repo `JosIsInsane/pehn-design-demo`, rama `main`. **Push a main = sale en vivo** (Cloudflare Pages).
- Usuario prefiere respuestas cortas (modo caveman): hacer y explicar lo mínimo.
- Commits: autor `Claude <noreply@anthropic.com>`.

## Archivos
- Sitio: `index.html`, `catalogo.html`, `pedido.html` (Mis pedidos), `privacidad.html`; todo el JS son **módulos ES** (`import`/`export`, sin globales). Cada página carga un solo `<script type="module" src="js/paginas/….js">`. En la raíz: `marco.js` (menú/pie/carrito comunes), `datos.js` (productos y precios; importa `piezas.js` y `datos-tienda.js`, generados), `dibujos.js` (SVG). En `js/`: `utiles`/`almacen`/`formato` (utilidades), `estado` (carrito, cajón y diseño abierto, con funciones con nombre), `producto`, `carrito`, `whatsapp`, `sitio`, `modales`, `turnstile`, `envio`, `checkout`, `cajon`, `tarjetas`, `movimiento`, `aviso`, `arranque`, `inicio`, `catalogo`, `catalogo-movil`, `pedidos`, `personalizador-carga` y el personalizador (`personalizador` + `-form`, `-movil`, `-vista`, `-eventos`, `-cierre`, `zoom`), que **se descarga solo al abrir un producto**. `css/` (`base`, `tarjetas`, `inicio`, `catalogo`, `personalizador`, `carrito`, `personalizador-movil`, `pedidos`, `legal`, `movimiento`), `_headers` (CSP y caché), `_redirects`. Mapa de dependencias, reglas y pasos para agregar productos o páginas: `docs/ARQUITECTURA.md`. Regla: nada de código escrito a mano pasa de 400 líneas (`pruebas/tamanos.test.js`).
- Apps Script (`apps-script/`): `Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Pagos.gs`, `Sitio.gs`, `Admin.gs`, CRM en HTML partido con `incluir_()` (`Admin.html` esqueleto, `AdminEstilos.html`, `AdminVistas.html`, `AdminJs*.html` uno por vista), `appsscript.json`. Se pega a mano en el editor + Nueva versión.
- Calidad: `npm install` una vez; `npm run lint` (ESLint 9, debe dar 0 errores) y `npm test` (seguridad 79 con el simulador de Apps Script, precios, tamaños, módulos y sitio punta a punta con Playwright). `npm run test:rapido` omite la del sitio. Cada archivo corre solo, p. ej. `node pruebas/precios.test.js`. Sin script `build`: Pages no construye nada.
- Docs: `docs/SEGURIDAD.md`, `docs/PLAN-CRM-Y-MENSAJES.md`, `docs/referencias-crm/` (estilo del CRM).

## Hecho
- CRM estilo panel (menú café oscuro), cambios al instante, vistas: Inicio, Pedidos, Clientes, Pagos, Inventario, Recetas, Movimientos, Sitio web.
- Seguridad: anti-fórmulas en la hoja, validación en servidor, anti-bots (trampa, tiempo, límites), CSP, sin fugas de la clave del CRM.
- Carrito en 2 pasos: datos → anticipo (50%) con comprobante; OCR lee el monto (Drive API). Config `Anticipo antes de enviar` Sí/No.
- Mis pedidos: tarjetas por dispositivo, detalle, subir comprobante del saldo.
- Aviso de privacidad + consentimiento. Dueños editan colores/textos/fotos/WhatsApp en CRM › Sitio web.

## Pendiente
1. El usuario debe pegar los `.gs` nuevos en Apps Script, agregar servicio **Drive API**, correr **Pehn › Configurar hojas**, llenar Config › Datos bancarios y Sitio web, sacar Nueva versión.
2. Recibir datos del cliente (fotos, precios, textos, su hoja con miles de pedidos) y adaptar el CRM a su hoja (importador + archivo + búsqueda en servidor; ver plan).
3. Módulo de **Finanzas** en el CRM (cobrado L 1,000 en el desglose).
4. Automatizar WhatsApp/Instagram (opción recomendada: ManyChat; necesita cuentas Meta del cliente).
5. Correos: Gmail gratis = 100/día; esperan 50–80 pedidos/día (2–3 correos c/u) y no alcanza. Propuesto (sin decidir): quitar avisos al negocio (ya están en el CRM) o resumen diario, o Google Workspace (1,500/día). Drive API (OCR) es gratis y aguanta.
6. Acceso de colaboradores **solo al CRM** (nunca a la hoja de cálculo; la hoja solo para dueños): hoja "Equipo" (nombre, clave propia, rol, activo); cada uno entra con su enlace; el servidor revisa permisos por acción; Movimientos/Pagos registran quién hizo qué. Roles propuestos: Dueño (todo), Ventas (pedidos, clientes, pagos), Taller (pedidos, estados, inventario; sin precios ni pagos). **El usuario mandará los roles detallados.**
7. El OCR de comprobantes solo se probó con simulador: probar con comprobantes reales (BAC, Atlántida…) y ajustar `montosEn_` en `Pagos.gs`.
