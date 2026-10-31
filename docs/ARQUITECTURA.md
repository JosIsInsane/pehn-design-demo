# Arquitectura del sitio

Sitio estático (Cloudflare Pages, **sin paso de build**: lo que está en el repo es lo que se publica) + Google Apps Script como servidor.
El navegador carga **módulos ES** (`import` / `export`): cada archivo dice qué usa y qué ofrece, y nada es global.

## Mapa de módulos
```
raíz   piezas.js (generado)  datos-tienda.js (generado)  datos.js  regalo.js  dibujos.js  marco.js
js/    utiles  almacen  formato  estado  producto  carrito  whatsapp  sitio  modales  turnstile  envio
       checkout  cajon  tarjetas  movimiento  aviso  arranque  inicio  catalogo  catalogo-movil  pedidos
       personalizador-carga ─(import() al abrir un producto)─▶ personalizador  -form  -movil  -vista  -eventos  -cierre  zoom
js/paginas/  inicio  catalogo  pedido  privacidad   ← un punto de entrada por página
```
Quién importa a quién (de abajo hacia arriba; una flecha = "usa a"):
```
                 utiles   almacen            (no importan nada)
                    ▲        ▲
 piezas ◀ datos-tienda ◀ datos ◀ formato, dibujos
                    ▲
 producto ◀ carrito ◀ whatsapp ◀ checkout (+ turnstile, envio) ◀ cajon ◀ arranque ◀ paginas/*
 estado (carrito, cajón, diseño abierto) ◀ carrito, checkout, cajon, personalizador*, aviso
 modales ◀ cajon, checkout, aviso, catalogo-movil, personalizador*, personalizador-carga

 index.html:      paginas/inicio    → arranque, inicio (→ tarjetas, dibujos)
 catalogo.html:   paginas/catalogo  → arranque, catalogo (→ tarjetas, movimiento, cajon, personalizador-carga), catalogo-movil
 pedido.html:     paginas/pedido    → arranque, pedidos (→ envio, checkout)
 privacidad.html: paginas/privacidad→ arranque
 (bajo demanda)   personalizador-carga ⇢ personalizador → form, movil, vista, eventos, cierre, zoom
```
`pruebas/modulos.test.js` comprueba que no haya ciclos, que todo lo importado exista y que el personalizador solo entre por `personalizador-carga.js`.

## Dónde va cada cosa
| Si es… | Va en… |
|---|---|
| Un precio, color, opción, producto o tarjeta | `datos.js` (los productos sencillos de la tienda salen del CSV, ver abajo) |
| Un dibujo SVG de un producto | `dibujos.js` |
| Una función pequeña sin relación con la página (texto, color) | `js/utiles.js`; lo que se guarda en el navegador, `js/almacen.js`; dinero y fechas, `js/formato.js` |
| Algo que **dos o más módulos** deben saber a la vez (carrito, paso del cajón, diseño abierto) | `js/estado.js`, con funciones con nombre (`agregarAlCarrito`, `irAVistaDeCaja`…) |
| Algo que solo usa un módulo | dentro de ese módulo (por ejemplo el zoom está en `zoom.js`) |
| El menú, pie y botones comunes | `marco.js` |
| Lo propio de una página | su módulo (`inicio.js`, `catalogo.js`, `pedidos.js`) y su entrada en `js/paginas/` |
| El orden en que arranca todo | `js/arranque.js` (`iniciarBase()` antes de pintar, `iniciarFinal()` después) |

Reglas: un módulo **exporta funciones** y no hace nada al importarse (solo `arranque.js` y las entradas ejecutan cosas); lo que necesite arrancar
exporta un `iniciarX()`. Nadie cambia el estado de `estado.js` directamente. Ningún archivo escrito a mano pasa de 400 líneas (`pruebas/tamanos.test.js`).
Nada de `window.algo`; no se usa `eval` ni `<script>` en línea (la política `_headers` solo permite `script-src 'self'` y Turnstile).

## Carga diferida del personalizador
El personalizador (`js/personalizador*.js`, `js/zoom.js`, `css/personalizador*.css`) pesa casi la mitad del catálogo. No está en el HTML:
al tocar una tarjeta (o llegar con `?card=` / `?edit=`) `js/personalizador-carga.js` agrega los `<link>` y hace `import('./personalizador.js')`.
Mientras carga, la tarjeta lleva `aria-busy="true"` y se avisa con el toast; si falla, un mensaje pide recargar.

## Cómo fluye un pedido
1. La persona arma su diseño (personalizador) y lo agrega al carrito (`estado.js` + `localStorage`).
2. Cajón: datos (`checkout.js`) → anticipo y comprobante → `enviarPedido()` arma el pedido, la foto del diseño y el consumo de piezas (`envio.js`, `bomOf`).
3. `api('pedido', …)` hace un `POST` de texto plano a la URL de Apps Script (`CONFIG.sheetsUrl`, con Turnstile si hay llave).
4. `apps-script/Orders.gs › doPost` valida (anti-bots, límites, anti-fórmulas), guarda en la hoja (Pedidos, Partidas, Pagos), sube fotos a Drive, descuenta Inventario según Recetas y lee el monto del comprobante (`Pagos.gs`).
5. Se mandan los correos (`MailApp`) y el pedido aparece en el CRM. El cliente lo sigue en `pedido.html` (`api('seguimiento', …)`).

## Revisar y probar
```
npm install            # una vez (ESLint, globals y Playwright; para los navegadores: npx playwright install chromium)
npm run lint           # revisa el código sin ejecutarlo (eslint.config.js explica cada regla)
npm test               # seguridad, precios, tamaños, módulos y la prueba de punta a punta del sitio
npm run test:rapido    # lo mismo sin la de punta a punta (no abre el navegador para el sitio)
python3 -m http.server # ver el sitio en http://localhost:8000 (con doble clic en el HTML los módulos no cargan)
```
Cada archivo de prueba también corre solo: `node pruebas/precios.test.js`.
Cloudflare Pages no construye nada: `package.json` no tiene script `build`; `_redirects` oculta `package.json`, `node_modules`, `herramientas/` y el config del lint.

## Cómo agregar…
**Un producto sencillo (talla/color con precio):** agrega sus filas al CSV `docs/inventario/catalogo-base.csv` y corre
`node herramientas/generar-tienda.js`; escribe `piezas.js`, `datos-tienda.js` y `apps-script/Catalogo.gs`. Commitea los tres.

**Un producto personalizable:**
1. En `datos.js`, copia uno de `PRODUCTS_BASE`, cambia `id`, `name`, `base` y las opciones (`op('valor', 'Texto', 'SKU')`: el precio sale del CSV).
2. Si necesita un dibujo nuevo, escribe su función en `dibujos.js` y agrégala a `RENDER`.
3. Agrega `{ id: 'tu-id' }` a `CARDS_BASE` para que salga en el catálogo.
4. Corre `node herramientas/generar-tienda.js` (las recetas de inventario salen de los mismos SKU), `npm run lint` y `npm test`.

**Una vista (página) nueva:**
1. Crea `tu-pagina.html` copiando `privacidad.html` (huecos `data-marco`, `<body data-page="…">`); al final un solo `<script type="module" src="js/paginas/tu-pagina.js">`.
2. Crea `js/paginas/tu-pagina.js`: `iniciarBase(); iniciarTuPagina(); iniciarFinal();`.
3. Escribe `js/tu-pagina.js` con `export function iniciarTuPagina()` y los `import` de lo que use.
4. Si lleva estado compartido, agrega sus funciones a `js/estado.js`; si lleva estilos, crea `css/tu-pagina.css` y enlázalo en el HTML.
5. Agrégala a `MENU` en `marco.js` si debe salir en el menú, y a `pruebas/modulos.test.js` (se cuentan las páginas) si hace falta.
6. `npm run lint && npm test`.

## Regalos (ocasiones, kits y extras)

- `regalo.js`: OCASIONES (filtro "Regalo para" del catálogo y sección del inicio; cada una con su regla de texto) y EXTRAS (dedicatoria, caja, dulces, tarjeta: se agregan con un toque desde el carrito y no salen en el catálogo).
- Kits por ocasión: tarjetas de `CARDS_BASE` en `datos.js` con `ocasion: 'graduacion'` y su `cfg` ya armado.
- `js/extras-carrito.js`: pinta "Agrega al regalo" y el aviso de plazo (texto editable en CRM › Sitio web, clave `plazo.produccion`).
- Enlaces útiles: `catalogo.html?ocasion=cumple`, `catalogo.html?card=N&figuras=3`.
