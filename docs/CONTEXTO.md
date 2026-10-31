# Contexto para seguir en una sesión nueva

Pega esto al empezar: "Lee docs/CONTEXTO.md del repo JosIsInsane/pehn-design-demo y seguimos."

## El proyecto
- Sitio + CRM para **Pehn Design** (cuadros con minifiguras y regalos personalizados, Honduras, @pehn.designn). Trato cerrado: L 6,500.
- Repo `JosIsInsane/pehn-design-demo`, rama `main`. **Push a main = sale en vivo** (Cloudflare Pages).
- Usuario prefiere respuestas cortas (modo caveman): hacer y explicar lo mínimo.
- Commits: autor `Claude <noreply@anthropic.com>`.

## Archivos
- Sitio: `index.html`, `catalogo.html`, `pedido.html` (Mis pedidos), `privacidad.html`; todo el JS son **módulos ES** (`import`/`export`, sin globales). Cada página carga un solo `<script type="module" src="js/paginas/….js">`. En la raíz: `marco.js` (menú/pie/carrito comunes), `datos.js` (productos y precios; importa `piezas.js` y `datos-tienda.js`, generados), `dibujos.js` (SVG). En `js/`: `utiles`/`almacen`/`formato` (utilidades), `estado` (carrito, cajón y diseño abierto, con funciones con nombre), `producto`, `carrito`, `whatsapp`, `sitio`, `modales`, `turnstile`, `envio`, `checkout`, `cajon`, `tarjetas`, `movimiento`, `aviso`, `arranque`, `inicio`, `catalogo`, `catalogo-movil`, `pedidos`, `personalizador-carga` y el personalizador (`personalizador` + `-form`, `-movil`, `-vista`, `-eventos`, `-cierre`, `zoom`), que **se descarga solo al abrir un producto**. `css/` (`base`, `tarjetas`, `inicio`, `catalogo`, `personalizador`, `carrito`, `personalizador-movil`, `pedidos`, `legal`, `movimiento`), `_headers` (CSP y caché), `_redirects`. Mapa de dependencias, reglas y pasos para agregar productos o páginas: `docs/ARQUITECTURA.md`. Regla: nada de código escrito a mano pasa de 400 líneas (`pruebas/tamanos.test.js`).
- Apps Script (`apps-script/`): `Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Pagos.gs`, `Sitio.gs`, `Admin.gs`, CRM en HTML partido con `incluir_()` (`AdminPagina.html` esqueleto, `AdminEstilos.html`, `AdminVistas.html`, `AdminJs*.html` uno por vista), `appsscript.json`. Se sube con clasp (`apps-script/README.md`) o a mano + Nueva versión.
- Calidad: `npm install` una vez; `npm run lint` (ESLint 9, debe dar 0 errores) y `npm test` (seguridad 79 con el simulador de Apps Script, precios, tamaños, módulos y sitio punta a punta con Playwright). `npm run test:rapido` omite la del sitio. Cada archivo corre solo, p. ej. `node pruebas/precios.test.js`. Sin script `build`: Pages no construye nada.
- Docs: `docs/SEGURIDAD.md`, `docs/PLAN-CRM-Y-MENSAJES.md`, `docs/referencias-crm/` (estilo del CRM).

## Hecho
- CRM estilo panel (menú café oscuro), cambios al instante, vistas: Inicio, Pedidos, Clientes, Pagos, Inventario, Recetas, Movimientos, Sitio web.
- Catálogo real: 232 piezas con precio de VENTA (`docs/inventario/catalogo-base.csv`); un producto armado = suma de sus piezas (marco del cuadro = Retratera 3D). Regenerar con `node herramientas/generar-tienda.js`. Menú Pehn › Cargar catálogo de piezas.
- Catálogo con sidebar de categorías desplegables (cajón "Filtros" en el teléfono). Personalizador en el teléfono como página.
- Correos: 1 al cliente por pedido (ID, 50 % y saldo; máx. 1 por destinatario cada ~6 h) y resumen diario al negocio a las 8 pm (Config › Hora del resumen diario).
- Seguridad: auditoría Cyber Neo (27/10/2026) con CN-001…004, 007 y 012 arreglados; Turnstile opcional (site key en datos.js + TURNSTILE_SECRET en Propiedades del script).
- Infraestructura: módulos ES, ESLint, CI en GitHub (lint + pruebas en cada PR), clasp (`.clasp.json.ejemplo`), `docs/ARQUITECTURA.md`, `docs/DESPLIEGUE.md`.
- PR JosIsInsane/pehn-design-demo#1 unido a main el 28/10/2026.

## Pendiente
1. **Apps Script en vivo está desactualizado** (el 28/10/2026 `?api=sitio` devolvía la página "sin acceso" del CRM): subir `apps-script/` con clasp o a mano, Nueva versión con el mismo deployment, y luego Pehn › Configurar hojas, Cargar catálogo de piezas y Cambiar clave del CRM. Llenar Config › Datos bancarios, Sitio web, WhatsApp.
2. Dudas del cliente: llavero con muñeco (L 150 o L 240), qué es "RM" (Termo lata RM), opciones quitadas (taza mágica, vaso 24 oz, termo 750 ml, XXG); combinaciones de piezas que va a mandar; fotos reales de productos.
3. Importar su hoja de pedidos + CRM escalable (archivo y búsqueda en servidor; ver docs/PLAN-PRODUCCION.md).
4. Finanzas en el CRM. 5. Colaboradores con roles (hoja Equipo; el usuario manda los roles).
6. WhatsApp/Instagram (ManyChat). 7. Probar OCR con comprobantes reales y ajustar `montosEn_`.
8. Diseñador exclusivo para quien pagó (link efímero): cotizado aparte; ver conversación del 27/10 (marca de agua + link con vencimiento dentro del trato; portero en Cloudflare como extra).
9. Hallazgos bajos de Cyber Neo sin arreglar: CN-005, 006, 008, 009, 010, 011, 013.
