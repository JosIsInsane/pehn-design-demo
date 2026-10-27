/* Pehn Design — DATOS DEL CATÁLOGO
   Aquí se cambia lo que vende la tienda: precios, opciones, colores, productos y tarjetas.
   No hace falta tocar dibujos.js ni app.js para eso.

   Orden de carga (todas las páginas): piezas.js → datos.js → datos-tienda.js → dibujos.js → app.js.
   datos-tienda.js lo genera herramientas/generar-tienda.js desde docs/inventario/catalogo-base.csv (no se edita a mano).

   PRECIOS = los de venta por pieza del CSV. Un producto armado cuesta la SUMA de sus piezas.
   TODAS las filas del CSV son piezas (tabla PIEZAS en piezas.js, generada). Una opción referencia sus piezas con
   op(valor, 'Etiqueta', 'SKU', …) y su precio es la suma de esas piezas: nunca se escribe a mano. Las recetas salen de los mismos SKU.

   CÓMO AGREGAR...
   - Un color: súmalo a la paleta (SKIN, HAIRC, CLOTH…) como ['#hex', 'Nombre'].
   - Una opción con precio: op('valor', 'Texto', 'SKU') dentro de options (el precio sale del CSV). Gratis: { v, label, price: 0 }.
   - Un producto: copia uno de PRODUCTS, cambia id/name/base y su render (debe existir en RENDER de dibujos.js).
   - Una tarjeta del catálogo: agrega { id: 'producto' } a CARDS (cfg y photo son opcionales).
   SI ALGO SE VE MAL: abre la consola del navegador (F12). revisarDatos() en app.js avisa con "[Pehn]"
   cuando una tarjeta apunta a un producto que no existe o a un dibujo que falta. */

/* Pehn Design — catálogo + personalizador
   Precios de ejemplo: ajustar en PRODUCTS. Envío del pedido: ver submitOrder(). */

const CONFIG = {
  currency: 'HNL',          // lempiras
  locale: 'es-HN',
  bulkMin: 5,               // descuento por volumen desde N piezas
  bulkPct: 10,
  ordersEnabled: true,      // false = sin carrito, cada diseño se pide directo por WhatsApp
  whatsapp: '',             // TODO: número con código de país, ej. '50498765432'
  // Google Sheets: URL de la app web de Apps Script y el token de la hoja Config (Pehn › Ver URL y token)
  sheetsUrl: 'https://script.google.com/macros/s/AKfycbyZ0Z1nr735rQ9tn2YSaYUtXEyDUL7fBQiMF78JuiRdUnRtzCt6BALCHgane8wpnsO5/exec',
  sheetsToken: '5eadaaf740544df59772',
  // Cloudflare Turnstile (opcional, anti-bots): pega aquí la "site key" del widget. Vacío = sin verificación.
  // Para activarlo del todo hace falta también TURNSTILE_SECRET en Apps Script (ver apps-script/README.md).
  turnstileSiteKey: '',
};

/* ---------- piezas ----------
   PIEZAS (piezas.js, generado del CSV) = { sku: [nombre, precio de venta] }. El precio de una opción es la suma de sus piezas. */
const precioDe = (...skus) => skus.reduce((s, k) => {
  if (!PIEZAS[k]) { console.warn('[Pehn] SKU que no está en el CSV (piezas.js): ' + k); return s; }
  return s + PIEZAS[k][1];
}, 0);
// opción cuyo precio sale de sus piezas (una o varias): op('casco', 'Casco', 'ACC-CASCO')
const op = (v, label, ...skus) => ({ v, label, skus, price: precioDe(...skus) });

/* ---------- paletas ---------- */
const SKIN = [['#F6D3B3', 'Claro'], ['#E8B98F', 'Medio'], ['#C68B5E', 'Canela'], ['#8A5634', 'Oscuro'], ['#FFD23F', 'Amarillo clásico']];
const HAIRC = [['#1F1712', 'Negro'], ['#5A3720', 'Castaño'], ['#A8692E', 'Miel'], ['#E9C46A', 'Rubio'], ['#B03A2E', 'Pelirrojo'], ['#B9B4AE', 'Canoso'], ['#E45A84', 'Rosa']];
const CLOTH = [['#1F2A44', 'Marino'], ['#2A1A0E', 'Negro'], ['#FFFDF9', 'Blanco'], ['#9BB0C9', 'Gris azul'], ['#C9B46A', 'Mostaza'], ['#8E9C5A', 'Olivo'], ['#D9363E', 'Rojo'], ['#F48FB1', 'Rosa'], ['#3E6E8E', 'Azul'], ['#E9D8B4', 'Beige']];
const PANTS = [['#2E4A8C', 'Mezclilla'], ['#6FA8DC', 'Azul claro'], ['#1F1712', 'Negro'], ['#B39B6E', 'Caqui'], ['#F1EBDD', 'Blanco'], ['#1F2A44', 'Marino']];
const HEART = [['#F48FB1', 'Rosa'], ['#8EC5F2', 'Azul'], ['#D9363E', 'Rojo'], ['#7CC68A', 'Verde'], ['#B9A2F0', 'Lila'], ['#F6B07A', 'Durazno'], ['none', 'Sin corazón']];
const BORDADO = [['#B3262E', 'Rojo'], ['#6FA8DC', 'Azul'], ['#2A1A0E', 'Negro'], ['#FFFDF9', 'Blanco'], ['#F48FB1', 'Rosa'], ['#2F8F5B', 'Verde']];
// nombres de color del CSV -> color en pantalla (cada color tiene un tono distinto)
const COLORES = { Amarillo: '#F6D64A', Azul: '#3E6E8E', Beige: '#E9D8B4', Blanco: '#FFFDF9', Celeste: '#8EC5F2', Dorado: '#D9B44A', 'Estándar': '#D8CFC4', Gris: '#9A9A9E', Lila: '#B9A2F0', Naranja: '#F08A1C', Negro: '#2A1A0E', Plata: '#C9CDD2', Plateado: '#A9AEB4', Rojo: '#D9363E', Rosa: '#F48FB1', Rosado: '#F7B6C8', Transparente: '#F4F1EC', Verde: '#2F8F5B', 'Verde aqua': '#7FD6C2', 'Verde oscuro': '#1F5A3A' };
// [color, sku] -> opción de color cuyo precio es el de esa pieza
const colSku = list => list.map(([n, sku]) => op(COLORES[n], n, sku));
const colSw = names => names.map(n => ({ v: COLORES[n], label: n, price: 0 }));
const TALLAS = ['S', 'M', 'L', 'XL'].map(t => ({ v: t, label: t, price: 0 }));
// [valor, nombre] -> opción sin costo extra
const sw = arr => arr.map(([v, label]) => ({ v, label, price: 0 }));
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// letras del personalizador (deben estar también en el <link> de Google Fonts de los .html)
const FONTS = { groovy: "'Bagel Fat One'", clasica: "'Outfit'", script: "'Pacifico'", serif: "'Playfair Display'", college: "'Alfa Slab One'", firma: "'Great Vibes'" };

/* ---------- opciones de cada figura ---------- */
const FIG_GROUPS = [
  { id: 'name', label: 'Nombre', type: 'text', max: 12, placeholder: 'Ej. Fer…' },
  { id: 'skin', label: 'Tono de piel', type: 'swatch', options: sw(SKIN) },
  { id: 'hair', label: 'Peinado', type: 'choice', options: [
    { v: 'corto', label: 'Corto', price: 0 }, { v: 'lado', label: 'De lado', price: 0 },
    { v: 'largo', label: 'Largo', price: 0 }, { v: 'ondas', label: 'Ondulado', price: 0 },
    { v: 'chongo', label: 'Chongo', price: 0 }, { v: 'rizos', label: 'Rizos', price: 0 },
    { v: 'calvo', label: 'Sin cabello', price: 0 }] },
  { id: 'hairColor', label: 'Color de cabello', type: 'swatch', options: sw(HAIRC), showIf: c => c.hair !== 'calvo' },
  { id: 'hat', label: 'Sombrero o gorra', type: 'choice', options: [
    { v: 'ninguno', label: 'Ninguno', price: 0 }, { v: 'sombrero', label: 'Sombrero', price: 0 },
    { v: 'vaquero', label: 'Vaquero', price: 0 }, op('gorra', 'Gorrita', 'ACC-GORRITA'),
    op('casco', 'Casco', 'ACC-CASCO'), op('cumple', 'Gorrito cumpleañero', 'GORRITO-CUMPLEANERO'),
    op('birrete', 'Birrete y toga', 'ACC-BIRRETE-Y-TOGA'), { v: 'mono', label: 'Moño', price: 0 }] },
  { id: 'face', label: 'Expresión', type: 'choice', options: [
    { v: 'feliz', label: 'Sonrisa', price: 0 }, { v: 'risa', label: 'Carcajada', price: 0 },
    { v: 'guino', label: 'Guiño', price: 0 }, { v: 'seria', label: 'Seria', price: 0 }] },
  // se pueden combinar: barba + lentes + labios rojos…
  { id: 'extras', label: 'Detalles de la cara', type: 'multi', options: [
    { v: 'lentes', label: 'Lentes', price: 0, excl: ['sol'] }, { v: 'sol', label: 'Lentes de sol', price: 0, excl: ['lentes'] },
    { v: 'barba', label: 'Barba', price: 0 }, { v: 'bigote', label: 'Bigote', price: 0 },
    { v: 'labios', label: 'Labios rojos', price: 0 }, { v: 'rubor', label: 'Chapitas', price: 0 },
    { v: 'pecas', label: 'Pecas', price: 0 }, { v: 'aretes', label: 'Aretes', price: 0 }] },
  { id: 'outfit', label: 'Ropa', type: 'choice', options: [
    { v: 'playera', label: 'Playera', price: 0 }, { v: 'blusa', label: 'Blusa', price: 0 },
    { v: 'sueter', label: 'Suéter', price: 0 }, { v: 'cuadros', label: 'Camisa a cuadros', price: 0 },
    { v: 'traje', label: 'Traje', price: 0 }, { v: 'vestido', label: 'Vestido', price: 0 },
    { v: 'texto', label: 'Con texto', price: 0 }, op('lego', 'Camisa Lego', 'CAMISA-LEGO'),
    op('falda', 'Falda', 'ACC-FALDA')] },
  { id: 'torso', label: 'Color de ropa', type: 'swatch', options: sw(CLOTH) },
  { id: 'printText', label: 'Texto en playera', type: 'text', max: 6, placeholder: 'Ej. PAPÁ…', showIf: c => c.outfit === 'texto' },
  { id: 'legs', label: 'Color de pantalón', type: 'swatch', options: sw(PANTS), showIf: c => c.outfit !== 'vestido' },
  // todos los accesorios del CSV (categoría Accesorios) que no son ropa ni sombrero; se dibuja una etiqueta con la inicial
  { id: 'hand', label: 'Accesorio en la mano', type: 'choice', options: [{ v: 'ninguno', label: 'Ninguno', price: 0 }].concat([
    ['bebe', 'Bebé', 'ACC-BEBE'], ['camara', 'Cámara', 'ACC-CAMARA'], ['gym', 'Gym', 'ACC-GYM'], ['varita', 'Varita mágica', 'ACC-VARITA-MAGICA'],
    ['flores', 'Flores', 'ACC-FLORES'], ['microfono', 'Micrófono', 'ACC-MICROFONO'], ['taza', 'Taza', 'ACC-TAZA'], ['bufanda', 'Bufanda', 'ACC-BUFANDA'],
    ['laptop', 'Laptop', 'ACC-LAPTOP'], ['cartera', 'Cartera', 'ACC-CARTERA'], ['cocacola', 'Coca Cola', 'ACC-COCA-COLA'], ['maletin', 'Maletín', 'ACC-MALETIN'],
    ['croissant', 'Croissant', 'ACC-CROISSANT'], ['pelota', 'Pelota', 'ACC-PELOTA'], ['moto', 'Moto con casco', 'ACC-MOTO-CON-CASCO'], ['peine', 'Peine', 'ACC-PEINE'],
    ['osito', 'Osito de peluche', 'ACC-OSITO-DE-PELUCHE'], ['helado', 'Cono de helado', 'ACC-CONO-DE-HELADO'], ['hotdog', 'Hot dog', 'ACC-HOT-DOG'],
    ['vino', 'Copa de vino', 'ACC-COPA-DE-VINO'], ['trofeo', 'Trofeo', 'ACC-TROFEO'], ['mando', 'Mando Play', 'ACC-MANDO-PLAY'], ['guitarra', 'Guitarra', 'ACC-GUITARRA'],
  ].map(([v, label, sku]) => op(v, label, sku))) },
];
const FIG_PRESETS = [
  { name: 'Fer', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'feliz', outfit: 'sueter', torso: '#1F2A44', legs: '#B39B6E', printText: '' },
  { name: 'Clau', skin: '#E8B98F', hair: 'chongo', hairColor: '#1F1712', face: 'labios', outfit: 'blusa', torso: '#E9C88A', legs: '#1F2A44', printText: '' },
  { name: 'Alberto', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'lentes', outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712', printText: '' },
  { name: 'Ángela', skin: '#F6D3B3', hair: 'largo', hairColor: '#1F1712', face: 'labios', outfit: 'playera', torso: '#D9363E', legs: '#F1EBDD', printText: '' },
  { name: 'Leo', skin: '#C68B5E', hair: 'rizos', hairColor: '#1F1712', face: 'guino', outfit: 'texto', torso: '#F6952A', legs: '#2E4A8C', printText: 'LEO' },
  { name: 'Vale', skin: '#F6D3B3', hair: 'ondas', hairColor: '#A8692E', face: 'feliz', outfit: 'vestido', torso: '#F48FB1', legs: '#2E4A8C', printText: '' },
];
/* ---------- variantes: solo talla/color que existen ----------
   p.variants = [{ o: { color: '#hex', size: 'M' }, sku: 'CAM-…', price: precioDe(sku) }]  (el orden de o es el orden de elección)
   p.varSets  = una o más piezas por pedido (ej. las dos sudaderas): { map: { color: 'color1', size: 'size1' }, showIf }
   Sin varSets se usa un solo juego con los mismos nombres. El precio sale de la variante elegida. */
const varSets = p => p.varSets || [{ map: Object.fromEntries(Object.keys(p.variants[0].o).map(k => [k, k])) }];
const varActivos = (p, cfg) => varSets(p).filter(s => !s.showIf || s.showIf(cfg));
const varMatch = (r, s, cfg, n = Infinity) => Object.keys(s.map).slice(0, n).every(d => r.o[d] === cfg[s.map[d]]);
const varFind = (p, s, cfg) => p.variants.find(r => varMatch(r, s, cfg));
// ¿existe una variante con esa opción, dadas las elecciones anteriores?
function varDisp(p, id, v, cfg) {
  const s = varSets(p).find(x => Object.values(x.map).includes(id)); if (!s) return true;
  const d = Object.keys(s.map).find(k => s.map[k] === id);
  return p.variants.some(r => varMatch(r, s, cfg, Object.keys(s.map).indexOf(d)) && r.o[d] === v);
}
// corrige una configuración: lo que no existe pasa a la primera opción que sí
function varFix(p, cfg) {
  varSets(p).forEach(s => Object.keys(s.map).forEach((d, i) => {
    const id = s.map[d];
    if (!varDisp(p, id, cfg[id], cfg)) cfg[id] = p.variants.find(r => varMatch(r, s, cfg, i)).o[d];
  }));
  return cfg;
}
// arranca en la variante más barata (la tarjeta dice "desde")
function varInicio(p, cfg) {
  const r = p.variants.reduce((m, x) => (x.price < m.price ? x : m));
  varSets(p).forEach(s => Object.keys(s.map).forEach(d => { cfg[s.map[d]] = r.o[d]; }));
}
const varLabel = (p, id, v) => p.groups.find(g => g.id === id)?.options.find(o => o.v === v)?.label ?? v;
// clave de receta de la variante elegida: la usan bomOf (app.js) y el generador de recetas
const varKey = (p, s, cfg) => `${p.name} · ${Object.keys(s.map).map(d => varLabel(p, s.map[d], cfg[s.map[d]])).join(' · ') || 'Estándar'}`;
function varLines(p, cfg) {
  const act = varActivos(p, cfg);
  return act.map((s, i) => {
    const r = varFind(p, s, cfg), det = Object.keys(s.map).map(d => varLabel(p, s.map[d], cfg[s.map[d]])).join(' · ');
    return { label: (act.length > 1 ? `Pieza ${i + 1}` : p.name) + (det ? ' · ' + det : ''), price: r ? r.price : 0 };
  });
}

// formato viejo (cara única, sombrero en el peinado) -> capas nuevas; sirve también para pedidos guardados
function normFig(f) {
  if (!f || typeof f !== 'object') return f;
  if (!Array.isArray(f.extras)) f.extras = [];
  if (['labios', 'lentes', 'barba'].includes(f.face)) { if (!f.extras.includes(f.face)) f.extras.push(f.face); f.face = 'feliz'; }
  if (f.face === 'labios') f.face = 'feliz';
  if (['sombrero', 'vaquero'].includes(f.hair)) { f.hat = f.hair; f.hair = 'corto'; }
  if (!f.hat) f.hat = 'ninguno';
  if (!f.face) f.face = 'feliz';
  if (!f.hand) f.hand = 'ninguno';
  return f;
}
const normCfg = (p, c) => { if (!c) return c; if (Array.isArray(c.figs)) c.figs.forEach(normFig); if (p && p.groups.some(g => g.id === 'extras')) normFig(c); if (p && p.variants) varFix(p, c); return c; };
FIG_PRESETS.forEach(normFig);
const figDefault = i => ({ ...clone(FIG_PRESETS[i % FIG_PRESETS.length]), name: '' });

// estilos rápidos: cambian la figura activa de un toque (se conserva el nombre)
const LOOKS = [
  { label: 'Casual él', f: { hair: 'corto', hat: 'ninguno', face: 'feliz', extras: [], outfit: 'playera', torso: '#3E6E8E', legs: '#2E4A8C' } },
  { label: 'Casual ella', f: { hair: 'largo', hat: 'ninguno', face: 'feliz', extras: ['labios', 'rubor'], outfit: 'blusa', torso: '#F48FB1', legs: '#1F1712' } },
  { label: 'Novio', f: { hair: 'lado', hat: 'ninguno', face: 'feliz', extras: ['barba'], outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712' } },
  { label: 'Novia', f: { hair: 'chongo', hat: 'ninguno', face: 'feliz', extras: ['labios', 'rubor', 'aretes'], outfit: 'vestido', torso: '#FFFDF9' } },
  { label: 'Vaquero', f: { hair: 'corto', hat: 'vaquero', face: 'feliz', extras: ['bigote'], outfit: 'cuadros', torso: '#3E6E8E', legs: '#1F1712' } },
];

const TEXTS = {
  amor: 'Es el acto de dar sin esperar nada a cambio, es querer compartir el ahora, el hoy y siempre. Es un entrelazamiento entre dos almas, un cálido abrazo y un café especial.',
  amor2: 'Persona única capaz de transformar la soledad en compañía, la rutina en magia y cualquier lugar en un verdadero hogar.',
  cumple: 'Usted es pieza clave en la construcción diaria de nuestros anhelos. Hasta que deje de respirar.',
  aniv: 'Gracias por cada día a tu lado. Por muchos años más construyendo juntos.',
  cal: 'Dios tejió nuestro amor con hilos de luz y esperanza, y en cada abrazo tuyo encontré mi hogar.',
  frase: 'Te adoro mi monito precioso ♥',
};

/* ---------- productos ---------- */
// variantes de camisas y sudaderas (sacadas del CSV; pruebas/precios.test.js las compara): [color, talla, sku]
const vv = (model, rows) => rows.map(([color, size, sku]) => ({ o: model ? { model, color: COLORES[color], size } : { color: COLORES[color], size }, sku, price: precioDe(sku) }));
const CAMISAS = [
  ...vv('alg', [['Negro', '3XL', 'CAM-ALG-3XL-NEG'], ['Blanco', '2XL', 'CAM-ALG-2XL-BLA'], ['Negro', '2XL', 'CAM-ALG-2XL-NEG'], ['Beige', 'L', 'CAM-ALG-L-BEI'], ['Blanco', 'L', 'CAM-ALG-L-BLA'], ['Gris', 'L', 'CAM-ALG-L-GRI'], ['Negro', 'L', 'CAM-ALG-L-NEG'], ['Rojo', 'L', 'CAM-ALG-L-ROJ'], ['Beige', 'M', 'CAM-ALG-M-BEI'], ['Blanco', 'M', 'CAM-ALG-M-BLA'], ['Gris', 'M', 'CAM-ALG-M-GRI'], ['Negro', 'M', 'CAM-ALG-M-NEG'], ['Beige', 'S', 'CAM-ALG-S-BEI'], ['Blanco', 'S', 'CAM-ALG-S-BLA'], ['Gris', 'S', 'CAM-ALG-S-GRI'], ['Negro', 'S', 'CAM-ALG-S-NEG'], ['Beige', 'XL', 'CAM-ALG-XL-BEI'], ['Blanco', 'XL', 'CAM-ALG-XL-BLA'], ['Gris', 'XL', 'CAM-ALG-XL-GRI'], ['Negro', 'XL', 'CAM-ALG-XL-NEG'], ['Blanco', 'XS', 'CAM-ALG-XS-BLA'], ['Negro', 'XS', 'CAM-ALG-XS-NEG']]),
  ...vv('pepe', [['Blanco', 'L', 'CAM-PEPE-L-BLA'], ['Negro', 'L', 'CAM-PEPE-L-NEG'], ['Blanco', 'M', 'CAM-PEPE-M-BLA'], ['Negro', 'M', 'CAM-PEPE-M-NEG'], ['Blanco', 'S', 'CAM-PEPE-S-BLA'], ['Negro', 'S', 'CAM-PEPE-S-NEG'], ['Blanco', 'XL', 'CAM-PEPE-XL-BLA'], ['Negro', 'XL', 'CAM-PEPE-XL-NEG'], ['Blanco', 'XS', 'CAM-PEPE-XS-BLA'], ['Negro', 'XS', 'CAM-PEPE-XS-NEG'], ['Negro', '2XL', 'CAM-PEPE-2XL-NEG']]),
];
const HOODIES = vv('', [['Blanco', 'L', 'HOO-L-BLA'], ['Negro', 'L', 'HOO-L-NEG'], ['Blanco', 'M', 'HOO-M-BLA'], ['Negro', 'M', 'HOO-M-NEG'], ['Blanco', 'S', 'HOO-S-BLA'], ['Negro', 'S', 'HOO-S-NEG'], ['Blanco', 'XL', 'HOO-XL-BLA'], ['Negro', 'XL', 'HOO-XL-NEG'], ['Rojo', 'S', 'HOO-S-ROJ'], ['Rojo', 'M', 'HOO-M-ROJ'], ['Rojo', 'L', 'HOO-L-ROJ'], ['Celeste', 'M', 'HOO-M-CEL'], ['Rosado', 'S', 'HOO-S-ROS']]);
const sizeSw = list => list.map(t => ({ v: t, label: t, price: 0 }));

// Marcos del cuadro (Retratera 3D). Para sumar una combinación nueva solo agrega una fila aquí: op(v, label, sku)
const MARCOS_CUADRO = [
  op('peq', 'Pequeña', 'RETRATERA-3D-PEQUENA'),
  op('med', 'Mediana', 'RETRATERA-3D'),
  op('gra', 'Grande', 'RETRATERA-3D-GRANDE'),
];

const PRODUCTS = [
  {
    // precio = suma de piezas: retratera 3D + figuras + mascotas + accesorios + extras (sin base)
    id: 'cuadro', name: 'Cuadro con minifiguras', cat: 'cuadros', base: 0, badge: 'Más pedido', bg: '#F48FB1',
    desc: 'Marco con sus minifiguras, sus nombres, corazón en spray y su frase.',
    render: 'frame',
    steps: ['Figuras', 'Diseño', 'Texto', 'Marco'],
    groups: [
      { step: 0, id: 'figs', label: 'Figuras', type: 'figs', min: 1, max: 4, skus: ['LEG-MUNECOS-LEGO'], pricePer: precioDe('LEG-MUNECOS-LEGO') },
      { step: 0, id: 'cats', label: 'Gatitos', type: 'stepper', min: 0, max: 3, skus: ['ADI-GATO'], pricePer: precioDe('ADI-GATO'), note: 'c/u' },
      { step: 0, id: 'dogs', label: 'Perritos', type: 'stepper', min: 0, max: 3, skus: ['ADI-PERRO'], pricePer: precioDe('ADI-PERRO'), note: 'c/u' },
      { step: 0, id: 'bunnies', label: 'Conejitos', type: 'stepper', min: 0, max: 3, skus: ['ADI-CONEJITO'], pricePer: precioDe('ADI-CONEJITO'), note: 'c/u' },
      { step: 1, id: 'tpl', label: 'Estilo', type: 'choice', options: [
        { v: 'amor', label: 'Definición', price: 0 }, { v: 'cumple', label: 'Happy Birthday', price: 0 },
        { v: 'calendario', label: 'Calendario', price: 0 }, { v: 'frase', label: 'Frase', price: 0 },
        { v: 'aniv', label: 'Aniversario', price: 0 }, { v: 'libre', label: 'Solo nombres', price: 0 }] },
      { step: 1, id: 'heart', label: 'Corazón en spray', type: 'swatch', options: sw(HEART) },
      { step: 1, id: 'deco', label: 'Detalle', type: 'choice', options: [
        { v: 'ninguno', label: 'Ninguno', price: 0 }, { v: 'brillos', label: 'Brillitos', price: 0 },
        { v: 'estrella', label: 'Estrella dorada', price: 0 }, { v: 'corazones', label: 'Corazones', price: 0 },
        { v: 'pride', label: 'Arcoíris', price: 0 }] },
      { step: 1, id: 'adds', label: 'Extras', type: 'multi', options: [
        op('luces', 'Luces', 'LUCES'), op('dedicatoria', 'Dedicatoria', 'DEDICATORIA'),
        op('iniciales', 'Iniciales', 'INICIALES'), op('fotos', 'Fotos pequeñas', 'FOTOS-PEQUENAS'),
        op('fondo', 'Fondo', 'FONDO-CAJITA'), op('dulces', 'Dulces', 'DULCES')] },
      { step: 1, id: 'nameFont', label: 'Letra de los nombres', type: 'choice', noStock: true, options: [
        { v: 'serif', label: 'Elegante', price: 0 }, { v: 'firma', label: 'Manuscrita', price: 0 }] },
      { step: 2, id: 'word', label: 'Palabra', type: 'text', max: 12, placeholder: 'Amor…', showIf: c => c.tpl === 'amor' },
      { step: 2, id: 'top', label: 'Título arriba', type: 'text', max: 22, placeholder: 'Happy Birthday…', showIf: c => c.tpl === 'cumple' },
      { step: 2, id: 'calDate', label: 'Fecha especial', type: 'date', showIf: c => c.tpl === 'calendario' },
      { step: 2, id: 'body', label: 'Texto', type: 'textarea', max: 220, showIf: c => c.tpl !== 'libre',
        suggest: [TEXTS.amor, TEXTS.amor2, TEXTS.cal, TEXTS.cumple, TEXTS.frase] },
      { step: 2, id: 'date', label: 'Fecha', type: 'text', max: 14, placeholder: '29 08 2025…', showIf: c => c.tpl === 'cumple' || c.tpl === 'aniv' },
      // el marco es la Retratera 3D (el tamaño la define; ninguno es gratis); el color no cuesta
      { step: 3, id: 'frame', label: 'Color del marco', type: 'choice', options: [
        { v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#B9824C', label: 'Madera', price: 0 }] },
      { step: 3, id: 'size', label: 'Retratera 3D', type: 'choice', options: MARCOS_CUADRO },
    ],
    init: c => { c.body = TEXTS.amor; c.word = 'Amor'; c.calDate = '2025-05-31'; },
  },
  {
    id: 'minifig', name: 'Minifigura personalizada', cat: 'figuras', sub: 'minifiguras', base: precioDe('LEG-MUNECOS-LEGO'), bg: '#F6952A',
    desc: 'Una mini versión de ti (o de quien quieras) con base transparente y su nombre.',
    render: 'minifig', skus: ['LEG-MUNECOS-LEGO'],
    groups: [
      ...FIG_GROUPS,
      { id: 'pack', label: 'Empaque', type: 'choice', options: [
        { v: 'bolsa', label: 'Bolsita', price: 0 }, op('kraft', 'Caja regalo', 'CAJAS'),
        op('acrilico', 'Vitrina acrílica pequeña', 'VITRINA-PEQUENA'), op('acrilico-g', 'Vitrina acrílica grande', 'VITRINA-GRANDE')] },
    ],
    init: c => Object.assign(c, FIG_PRESETS[4]),
  },
  {
    id: 'llavero', name: 'Llavero minifigura', cat: 'figuras', sub: 'llaveros', base: precioDe('LLAVERO-BASE'), bg: '#8EC5F2',
    desc: 'Mini tú para tus llaves. Pídelos en par para tu persona favorita.',
    render: 'keychain', skus: ['LLAVERO-BASE'],
    groups: [
      ...FIG_GROUPS.filter(g => g.id !== 'name' && g.id !== 'legs'),
      { id: 'tagText', label: 'Iniciales o fecha en la placa', type: 'text', max: 8, placeholder: 'Ej. F & C…' },
      { id: 'ring', label: 'Argolla', type: 'choice', options: [
        { v: '#B9B4AE', label: 'Plateada', price: 0 }, { v: '#E0B44C', label: 'Dorada', price: 0 }] },
    ],
    init: c => Object.assign(c, FIG_PRESETS[0]),
  },
  {
    // hoodie 700 por pieza; el par son dos piezas (cada una con su color y talla que existan)
    id: 'sudadera', name: 'Sudaderas para parejas', cat: 'ropa', sub: 'abrigos', base: 0, badge: 'Nuevo', bg: '#BDE7C9',
    desc: 'Tu inicial y un corazón en la manga. Una para ti, otra para tu persona.',
    render: 'hoodie',
    variants: HOODIES,
    varSets: [{ map: { color: 'color1', size: 'size1' } }, { map: { color: 'color2', size: 'size2' }, showIf: c => c.pair === '2' }],
    groups: [
      { id: 'pair', label: '¿Cuántas?', type: 'choice', options: [
        { v: '2', label: 'Par (2)', price: 0 }, { v: '1', label: 'Solo una', price: 0 }] },
      { id: 'color1', label: 'Sudadera 1 · color', type: 'swatch', options: colSw(['Blanco', 'Negro', 'Rojo', 'Celeste', 'Rosado']) },
      { id: 'ini1', label: 'Sudadera 1 · inicial', type: 'text', max: 2, placeholder: 'E…' },
      { id: 'ink1', label: 'Sudadera 1 · color del bordado', type: 'swatch', options: sw(BORDADO) },
      { id: 'size1', label: 'Sudadera 1 · talla', type: 'choice', options: TALLAS },
      { id: 'color2', label: 'Sudadera 2 · color', type: 'swatch', options: colSw(['Blanco', 'Negro', 'Rojo', 'Celeste', 'Rosado']), showIf: c => c.pair === '2' },
      { id: 'ini2', label: 'Sudadera 2 · inicial', type: 'text', max: 2, placeholder: 'K…', showIf: c => c.pair === '2' },
      { id: 'ink2', label: 'Sudadera 2 · color del bordado', type: 'swatch', options: sw(BORDADO), showIf: c => c.pair === '2' },
      { id: 'size2', label: 'Sudadera 2 · talla', type: 'choice', options: TALLAS, showIf: c => c.pair === '2' },
    ],
    // la sudadera 2 arranca distinta a la 1 para que se vea el par
    init: c => { c.ini1 = 'E'; c.ini2 = 'K'; c.color2 = COLORES.Negro; c.ink2 = '#6FA8DC'; },
  },
  {
    // camisa de algodón 240 (con sus tallas y colores); la Pepe 490 es otra opción
    id: 'playera', name: 'Playera personalizada', cat: 'ropa', sub: 'camisas', base: 0, bg: '#FFD23F',
    desc: 'Algodón suave con tu frase o tu propia imagen, al frente o en la espalda.',
    render: 'shirt',
    variants: CAMISAS,
    groups: [
      { id: 'model', label: 'Modelo', type: 'choice', options: [{ v: 'alg', label: 'Algodón', price: 0 }, { v: 'pepe', label: 'Camisa Pepe', price: 0 }] },
      { id: 'color', label: 'Color de playera', type: 'swatch', options: colSw(['Beige', 'Blanco', 'Gris', 'Negro', 'Rojo']) },
      { id: 'size', label: 'Talla', type: 'choice', options: sizeSw(['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']) },
      { id: 'text', label: 'Texto', type: 'text', max: 18, placeholder: 'Ej. Good vibes…' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'college', label: 'College', price: 0 },
        { v: 'script', label: 'Script', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
      { id: 'ink', label: 'Color de tinta', type: 'swatch', options: sw(CLOTH.slice(1)) },
      { id: 'img', label: 'Tu imagen o logo', type: 'file' },
      { id: 'pos', label: 'Posición', type: 'choice', options: [
        { v: 'frente', label: 'Frente', price: 0 }, { v: 'espalda', label: 'Espalda', price: 0 }, { v: 'ambos', label: 'Ambos lados', price: 0 }] },
    ],
  },
  {
    id: 'taza', name: 'Taza personalizada', cat: 'vasos', sub: 'tazas', base: 0, bg: '#B9A2F0',
    desc: 'Cerámica 11 oz con nombre, frase o foto, en el color que prefieras.',
    render: 'mug',
    groups: [
      { id: 'inner', label: 'Color de la taza', type: 'swatch', options: colSku([['Amarillo', 'TAZ-AMA'], ['Azul', 'TAZ-AZU'], ['Blanco', 'TAZ-BLA'], ['Naranja', 'TAZ-NAR'], ['Rojo', 'TAZ-ROJ'], ['Rosado', 'TAZ-ROS'], ['Transparente', 'TAZ-TRA'], ['Verde', 'TAZ-VER']]) },
      { id: 'text', label: 'Texto', type: 'text', max: 16, placeholder: 'Ej. Café con Ana…' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'script', label: 'Script', price: 0 }, { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
      { id: 'img', label: 'Foto o diseño', type: 'file' },
    ],
  },
  {
    // vaso de silicón (300) con tapa y popote; los demás vasos están en la tienda
    id: 'vaso', name: 'Vaso con nombre', cat: 'vasos', sub: 'vasos', base: 0, bg: '#8EC5F2',
    desc: 'Vaso de silicón con tapa, popote y tu nombre en vinil.',
    render: 'cup',
    groups: [
      { id: 'cup', label: 'Color del vaso', type: 'swatch', options: colSku([['Lila', 'VAS-SIL-LIL'], ['Negro', 'VAS-SIL-NEG'], ['Rojo', 'VAS-SIL-ROJ'], ['Verde aqua', 'VAS-SIL-VAQ']]) },
      { id: 'name', label: 'Nombre', type: 'text', max: 12, placeholder: 'Ej. Sofía…' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'firma', label: 'Manuscrita', price: 0 }, { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
      { id: 'ink', label: 'Color del vinil', type: 'swatch', options: sw([['#FFFFFF', 'Blanco'], ['#1E1611', 'Negro'], ['#C9A44C', 'Dorado'], ['#E45A84', 'Rosa'], ['#3E6E8E', 'Azul']]) },
    ],
    init: c => { c.name = 'Sofía'; },
  },
  {
    id: 'termo', name: 'Termo grabado', cat: 'vasos', sub: 'termos', base: 0, bg: '#C9B8F0',
    desc: 'Acero inoxidable, frío 24 h y caliente 12 h, con nombre grabado.',
    render: 'tumbler',
    groups: [
      { id: 'model', label: 'Modelo', type: 'choice', options: [
        op('lata', 'Lata', 'TERMO-LATA'), op('skinny', 'Skinny', 'TERMO-SKINNY'),
        op('sport', 'Sport 600 ml', 'TERMO-SPORT-600-ML')] },
      { id: 'color', label: 'Color', type: 'swatch', options: sw([['#1E1611', 'Negro'], ['#F08A1C', 'Naranja'], ['#F7F4EE', 'Blanco'], ['#F7B6C8', 'Rosa'], ['#3E6E8E', 'Azul'], ['#7FA88A', 'Salvia']]) },
      { id: 'name', label: 'Nombre', type: 'text', max: 12, placeholder: 'Ej. Valeria…' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'firma', label: 'Manuscrita', price: 0 }, { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
    ],
    init: c => { c.name = 'Valeria'; },
  },
  {
    id: 'tote', name: 'Tote bag personalizada', cat: 'bolsas', base: precioDe('TOTE-BAG'), bg: '#E9D8B4',
    desc: 'Manta resistente con tu frase, tus iniciales o tu propia imagen.',
    render: 'tote', skus: ['TOTE-BAG'],
    groups: [
      { id: 'color', label: 'Color de la bolsa', type: 'choice', options: [
        { v: '#EFE3CC', label: 'Natural', price: 0 }, { v: '#1E1611', label: 'Negra', price: 0 }, { v: '#C9D6BE', label: 'Salvia', price: 0 }] },
      { id: 'text', label: 'Texto', type: 'text', max: 18, placeholder: 'Ej. Plantas & café…' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'serif', label: 'Elegante', price: 0 }, { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'firma', label: 'Manuscrita', price: 0 }] },
      { id: 'ink', label: 'Color de tinta', type: 'swatch', options: sw([['#1E1611', 'Negro'], ['#F08A1C', 'Naranja'], ['#B3262E', 'Rojo'], ['#3E6E8E', 'Azul'], ['#FFFFFF', 'Blanco']]) },
      { id: 'img', label: 'Tu imagen', type: 'file' },
    ],
    init: c => { c.text = 'Plantas & café'; },
  },
];

/* tarjetas del catálogo. Cada cuadro con foto trae el diseño de ese pedido real ya armado */
const CARDS = [
  { id: 'cuadro', title: 'Cuadro “Amor”', desc: 'La definición de amor con sus minifiguras sobre un corazón rosa en spray.', badge: 'Más pedido', bg: '#F48FB1', photo: 'fotos/cuadro-amor.jpg',
    cfg: { tpl: 'amor', word: 'Amor', body: TEXTS.amor, heart: '#F48FB1', figs: [{ ...FIG_PRESETS[0] }, { ...FIG_PRESETS[1] }] } },
  { id: 'cuadro', title: 'Happy Birthday azul', desc: 'Letras recortadas, corazón azul con brillitos, dedicatoria y fecha.', bg: '#8EC5F2', photo: 'fotos/cuadro-cumple.jpg',
    cfg: { tpl: 'cumple', top: 'Happy Birthday', body: TEXTS.cumple, date: '29 08 2025', heart: '#8EC5F2', deco: 'brillos', figs: [{ ...FIG_PRESETS[2], name: 'Alberto' }, { ...FIG_PRESETS[3], name: 'Ángela' }] } },
  { id: 'cuadro', title: 'Corazón rojo', desc: 'Happy Birthday con estrella, corazón rojo intenso y su frase.', bg: '#D9363E', photo: 'fotos/cuadro-cumple-rojo.jpg', photoPos: '50% 40%',
    cfg: { tpl: 'cumple', top: 'Happy Birthday', body: TEXTS.frase, date: '', heart: '#D9363E', deco: 'estrella', nameFont: 'firma',
      figs: [{ name: 'Dani', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'feliz', outfit: 'playera', torso: '#1F2A44', legs: '#1F1712' },
        { name: 'Vale', skin: '#F6D3B3', hair: 'largo', hairColor: '#1F1712', face: 'labios', outfit: 'blusa', torso: '#F7B6C8', legs: '#F1EBDD' }] } },
  { id: 'cuadro', title: 'Calendario', desc: 'El mes de su fecha especial con un corazón en el día, sus nombres y su frase.', badge: 'Nuevo', bg: '#E9D8B4', photo: 'fotos/cuadro-calendario.jpg',
    cfg: { tpl: 'calendario', calDate: '2025-05-31', body: TEXTS.cal, heart: 'none', nameFont: 'firma',
      figs: [{ name: 'Jhonson', skin: '#F6D3B3', hair: 'vaquero', hairColor: '#5A3720', face: 'feliz', outfit: 'cuadros', torso: '#3E6E8E', legs: '#1F1712' },
        { name: 'Odalis', skin: '#F6D3B3', hair: 'largo', hairColor: '#6B4428', face: 'labios', outfit: 'blusa', torso: '#C8102E', legs: '#1F1712' }] } },
  { id: 'cuadro', title: 'Con sus mascotas', desc: 'Ustedes y sus peludos: gatitos y perritos junto a sus figuras.', badge: 'Familia', bg: '#FFD23F', photo: 'fotos/cuadros-varios.jpg', photoPos: '50% 30%',
    cfg: { tpl: 'amor', word: 'Amor', body: TEXTS.amor2, heart: '#D9363E', cats: 1, dogs: 2,
      figs: [{ name: '', skin: '#F6D3B3', hair: 'corto', hairColor: '#1F1712', face: 'feliz', outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712' },
        { name: '', skin: '#F6D3B3', hair: 'ondas', hairColor: '#5A3720', face: 'labios', outfit: 'vestido', torso: '#2A1A0E' }] } },
  { id: 'cuadro', title: 'Amor con arcoíris', desc: 'Bandera arcoíris y corazones para celebrar su amor tal cual es.', bg: '#B9A2F0', photo: 'fotos/cuadros-varios.jpg', photoPos: '30% 100%',
    cfg: { tpl: 'amor', word: 'AMOR', body: TEXTS.amor, heart: '#F48FB1', deco: 'pride',
      figs: [{ name: '', skin: '#F6D3B3', hair: 'sombrero', hairColor: '#1F1712', face: 'feliz', outfit: 'playera', torso: '#FFFDF9', legs: '#1F1712' },
        { name: '', skin: '#F6D3B3', hair: 'sombrero', hairColor: '#1F1712', face: 'barba', outfit: 'playera', torso: '#FFFDF9', legs: '#1F1712' }] } },
  { id: 'sudadera', photo: 'fotos/sudaderas.jpg' }, { id: 'vaso', badge: 'Nuevo' }, { id: 'tote' }, { id: 'minifig' },
  { id: 'termo' }, { id: 'llavero' }, { id: 'playera' }, { id: 'taza' },
];

CARDS.forEach(c => c.cfg?.figs?.forEach(normFig));

const CATS = [['todos', 'Todos'], ['cuadros', 'Cuadros'], ['figuras', 'Figuras y llaveros'], ['ropa', 'Ropa'], ['bolsas', 'Bolsas'], ['vasos', 'Vasos y tazas']];
const catName = id => CATS.find(c => c[0] === id)?.[1] || '';
// subcategorías de cada categoría, en el orden en que salen en el filtro: [id, nombre]. Cada producto lleva su `sub`.
// Aquí van las de los personalizadores; las de la tienda las suma datos-tienda.js (generado).
const SUBS = {};
const addSub = (cat, id, nombre) => { const l = SUBS[cat] || (SUBS[cat] = []); if (!l.some(s => s[0] === id)) l.push([id, nombre]); };
[['figuras', 'minifiguras', 'Minifiguras'], ['figuras', 'llaveros', 'Llaveros'], ['ropa', 'camisas', 'Camisas'], ['ropa', 'abrigos', 'Abrigos'],
  ['vasos', 'tazas', 'Tazas'], ['vasos', 'vasos', 'Vasos'], ['vasos', 'termos', 'Termos']].forEach(a => addSub(...a));
const subName = (cat, id) => SUBS[cat]?.find(s => s[0] === id)?.[1] || '';
// mosaicos de categorías en la landing
const CAT_TILES = [
  { cat: 'cuadros', photo: 'fotos/cuadro-amor.jpg', tint: 'var(--blush)', note: 'Con sus figuras, nombres y frase' },
  { cat: 'figuras', product: 'minifig', tint: 'var(--butter)', note: 'Minifiguras y llaveros' },
  { cat: 'ropa', product: 'sudadera', tint: 'var(--sage)', note: 'Sudaderas y playeras' },
  { cat: 'bolsas', product: 'tote', tint: 'var(--sand)', note: 'Totes de manta' },
  { cat: 'vasos', product: 'vaso', tint: 'var(--sky)', note: 'Vasos, termos y tazas' },
];

// Tarjetas que salen en la landing, por su posición en CARDS (0 = la primera).
// Si reordenas CARDS, ajusta estos números. Deben ser cuadros con cfg.
const PORTADA = {
  hero: [0, 1, 3, 2, 4],    // cuadros que van cambiando arriba
  destacados: [0, 1, 3, 2], // sección "Pedidos reales"
  blog: [0, 3, 1],          // dibujos de los artículos (data-mini="0..2")
};
