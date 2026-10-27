/* Genera, desde docs/inventario/catalogo-base.csv:
     datos-tienda.js          productos sencillos de la tienda (talla/color con precio de la variante)
     apps-script/Catalogo.gs  piezas del Inventario + filas de Recetas (se cargan con Pehn › Cargar catálogo de piezas)
   Correr:  node herramientas/generar-tienda.js
   Cada vez que cambie el CSV (precios, piezas nuevas) se vuelve a correr y se commitean los dos archivos.
   Los personalizadores (cuadro, taza, vaso, termo, tote, playera, sudadera, llavero) viven en datos.js:
   aquí solo se leen para armar sus recetas. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

// ---------- CSV ----------
function parseCSV(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const piezas = parseCSV(leer('docs/inventario/catalogo-base.csv')).map(r => ({ ...r, precio: Number(r.precio) }));
const bySku = Object.fromEntries(piezas.map(p => [p.sku, p]));

// ---------- piezas.js: tabla sku -> [nombre, precio de venta] (todas las filas del CSV son piezas) ----------
const nombrePieza = c => [c.producto, c.talla, c.color].filter(Boolean).join(' ');
const qq = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
fs.writeFileSync(path.join(RAIZ, 'piezas.js'), `/* Pehn Design — PIEZAS (generado)
   NO se edita a mano: lo escribe herramientas/generar-tienda.js desde docs/inventario/catalogo-base.csv.
   Cada fila del CSV es una pieza con su precio de venta. Los productos se arman sumando piezas (ver op() en datos.js).
   Se carga ANTES de datos.js. */
const PIEZAS = {
${piezas.map(c => `  ${qq(c.sku)}: [${qq(nombrePieza(c))}, ${c.precio}],`).join('\n')}
};
`);

// ---------- datos.js en un contexto aislado ----------
const ctx = vm.createContext({ console });
vm.runInContext(leer('piezas.js') + '\n' + leer('datos.js') + '\n;this.__d = { PRODUCTS, FIG_GROUPS, COLORES, CATS, varSets, varActivos, varKey, varLabel };', ctx);
const D = ctx.__d;

// ---------- qué se publica en la tienda ----------
// Piezas que solo sirven para armar, o que ya tienen su personalizador: no salen como producto suelto.
const SOLO_ARMAR = new Set(['Accesorios', 'Adicional', 'Camisa Lego', 'Gorrito', 'Pieza corazón Lego', 'Pieza llavero Lego', 'Fondo', 'Dedicatoria', 'Iniciales', 'Fotos', 'Luces', 'Dulces', 'Vitrina pequeña', 'Vitrina grande', 'Lanyards', 'Llavero base']);
const PERSONALIZADOR = c => ['Tote bag', 'Termo', 'Camisas'].includes(c.categoria) || (c.categoria === 'Abrigos' && c.producto === 'Hoodie')
  || (c.categoria === 'Taza' && c.producto === 'Taza') || (c.categoria === 'Vaso' && c.producto === 'Vaso de silicón');
const enTienda = c => !SOLO_ARMAR.has(c.categoria) && c.producto !== 'Muñecos Lego' && c.precio > 0 && !PERSONALIZADOR(c);

const CAT_APP = {
  Boxer: 'ropa', Mameluco: 'ropa', Pijamas: 'ropa', Abrigos: 'ropa',
  Vaso: 'vasos', Taza: 'vasos',
  Llavero: 'figuras', 'Llavero Lego': 'figuras', Instax: 'figuras',
  Collar: 'joyeria', Pulsera: 'joyeria', Relicario: 'joyeria', Dije: 'joyeria', Joyero: 'joyeria',
  Peluche: 'peluches',
  Lego: 'lego', 'Caja Lego': 'lego', Cumple: 'lego', Armable: 'lego', Estadio: 'lego',
};
// subcategoría (id, nombre) según la categoría del CSV (el orden de esta tabla es el orden del filtro); lo que no está aquí cae en "Otros detalles" (regalos) o sin sub
const SUB_APP = {
  Pijamas: ['pijamas', 'Pijamas'], Boxer: ['boxer', 'Boxer'], Mameluco: ['mamelucos', 'Mamelucos'], Abrigos: ['abrigos', 'Abrigos'],
  Vaso: ['vasos', 'Vasos'], Taza: ['tazas', 'Tazas'],
  Llavero: ['llaveros', 'Llaveros'], 'Llavero Lego': ['llaveros', 'Llaveros'], Instax: ['llaveros', 'Llaveros'],
  Collar: ['collares', 'Collares'], Pulsera: ['pulseras', 'Pulseras'], Dije: ['dijes', 'Dijes'], Relicario: ['relicarios', 'Relicarios'], Joyero: ['joyeros', 'Joyeros'],
  Armable: ['armables', 'Sets armables'], Cumple: ['cumple', 'Cumpleaños'], Estadio: ['estadios', 'Estadios'], 'Caja Lego': ['cajas-lego', 'Cajas Lego'], Lego: ['sets', 'Sets Lego'],
  Flores: ['flores', 'Flores'], Funko: ['coleccion', 'Coleccionables'], Hotwheels: ['coleccion', 'Coleccionables'],
};
const ORDEN_SUB = [...Object.values(SUB_APP).map(v => v[0]), 'otros'];
const SUB_OTROS = ['otros', 'Otros detalles'];
const subApp = (c, cat) => SUB_APP[c] || (cat === 'regalos' ? SUB_OTROS : null);
const CATS_NUEVAS = [['joyeria', 'Joyería'], ['peluches', 'Peluches'], ['regalos', 'Regalos']].concat([['lego', 'Lego y sets']]);
const BG = { ropa: '#BDE7C9', vasos: '#B9A2F0', figuras: '#8EC5F2', joyeria: '#F7B6C8', peluches: '#FFD23F', regalos: '#F6B07A', lego: '#F6952A' };
const PREFIJO = { 'Llavero Lego': 'Llavero Lego ', Estadio: 'Estadio ', Peluche: 'Peluche ' };
const NOMBRE = { Ramo: 'Ramo de flores', Hotwheels: 'Hot Wheels', Hotwheel: 'Hot Wheel personalizado' };
const ORDEN_TALLA = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'CH', 'G', 'XG'];
const DESC = {
  ropa: 'Pídela en la talla y el color que quieras.', vasos: 'Elige el color y pídelo para regalar o para ti.', figuras: 'Llavero listo para regalar.',
  joyeria: 'Joyería para regalar, en el acabado que prefieras.', peluches: 'Peluche suave para abrazar y regalar.', regalos: 'Un detalle para sorprender.', lego: 'Sets y piezas Lego para armar y regalar.',
};

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const catApp = c => CAT_APP[c] || 'regalos';

// agrupa por producto (categoría + nombre)
const grupos = new Map();
piezas.filter(enTienda).forEach(c => {
  const k = c.categoria + '|' + c.producto;
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k).push(c);
});

const tienda = [];
const usados = new Set(D.PRODUCTS.map(p => p.id));
grupos.forEach(rows => {
  const c0 = rows[0], cat = catApp(c0.categoria);
  let name = NOMBRE[c0.producto] || (PREFIJO[c0.categoria] || '') + c0.producto;
  if (c0.categoria === 'Cumple') name = c0.producto;
  let id = 't-' + slug(name); while (usados.has(id)) id += '-2'; usados.add(id);
  const tallas = [...new Set(rows.map(r => r.talla).filter(Boolean))].sort((a, b) => ORDEN_TALLA.indexOf(a) - ORDEN_TALLA.indexOf(b));
  let colores = [...new Set(rows.map(r => r.color || (rows.some(x => x.color) ? 'Estándar' : '')).filter(Boolean))];
  colores.forEach(n => { if (!D.COLORES[n]) throw new Error(`Color sin tono en COLORES (datos.js): ${n}`); });
  const groups = [];
  if (colores.length > 1) groups.push({ id: 'color', label: 'Color', type: 'swatch', options: colores.map(n => ({ v: D.COLORES[n], label: n, price: 0 })) });
  if (tallas.length > 1) groups.push({ id: 'size', label: 'Talla', type: 'choice', options: tallas.map(t => ({ v: t, label: t, price: 0 })) });
  const variants = rows.map(r => {
    const o = {};
    if (colores.length > 1) o.color = D.COLORES[r.color || 'Estándar'];
    if (tallas.length > 1) o.size = r.talla;
    return { o, price: r.precio, sku: r.sku };
  });
  const photo = ['jpg', 'webp', 'png'].map(e => `fotos/tienda/${id}.${e}`).find(f => fs.existsSync(path.join(RAIZ, f)));
  const sub = subApp(c0.categoria, cat);
  tienda.push({ id, name, cat, sub, base: 0, bg: BG[cat], desc: DESC[cat], render: 'generico', ...(photo ? { photo } : {}), groups, variants });
});

// ---------- datos-tienda.js ----------
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const obj = o => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${q(v)}`).join(', ') + ' }';
const grp = g => `{ id: ${q(g.id)}, label: ${q(g.label)}, type: ${q(g.type)}, options: [${g.options.map(o => `{ v: ${q(o.v)}, label: ${q(o.label)}, price: 0 }`).join(', ')}] }`;
let js = `/* Pehn Design — PRODUCTOS DE LA TIENDA (generado)
   NO se edita a mano: lo escribe herramientas/generar-tienda.js desde docs/inventario/catalogo-base.csv.
   Para cambiar un precio o una pieza: edita el CSV y corre  node herramientas/generar-tienda.js
   Se carga después de datos.js. Cada producto tiene sus variantes (talla/color que existen) y el precio de cada una.
   Sin dibujo propio: usa render 'generico' (foto en fotos/tienda/<id>.jpg si existe, o tarjeta de color con el nombre). */

${CATS_NUEVAS.map(c => `CATS.push([${q(c[0])}, ${q(c[1])}]);`).join('\n')}

// subcategorías (en orden de aparición, tras las de los personalizadores)
${[...new Map(tienda.filter(p => p.sub).map(p => [p.cat + '|' + p.sub[0], [p.cat, ...p.sub]])).values()].sort((a, b) => ORDEN_SUB.indexOf(a[1]) - ORDEN_SUB.indexOf(b[1])).map(a => `addSub(${a.map(q).join(', ')});`).join('\n')}

// tv: variante con el precio de su pieza (PIEZAS)
const tv = (o, sku) => ({ o, sku, price: precioDe(sku) });
const TIENDA = [
${tienda.map(p => `  { id: ${q(p.id)}, name: ${q(p.name)}, cat: ${q(p.cat)},${p.sub ? ` sub: ${q(p.sub[0])},` : ''} base: 0, bg: ${q(p.bg)}, desc: ${q(p.desc)}, render: 'generico',${p.photo ? ` photo: ${q(p.photo)},` : ''}
    groups: [${p.groups.map(grp).join(', ')}],
    variants: [
${p.variants.map(v => `      tv(${obj(v.o)}, ${q(v.sku)}),`).join('\n')}
    ] },`).join('\n')}
];
TIENDA.forEach(p => { PRODUCTS.push(p); CARDS.push({ id: p.id }); });
`;
fs.writeFileSync(path.join(RAIZ, 'datos-tienda.js'), js);

// ---------- recetas (mismas claves que bomOf en app.js) ----------
vm.runInContext(js, ctx); // suma los productos de la tienda a PRODUCTS del contexto
const rec = new Map();
// una clave puede gastar varias piezas (skus); sin piezas = no gasta inventario
const addRec = (key, skus = [], qty = 1) => {
  key = key.replace(/\u00a0/g, ' ').trim(); // igual que clean() en bomOf (app.js)
  skus = [].concat(skus || []).filter(Boolean);
  skus.forEach(sku => { if (!bySku[sku]) throw new Error(`Receta "${key}" usa el SKU ${sku}, que no está en el CSV.`); });
  const prev = rec.get(key);
  if (prev && prev.skus.join() !== skus.join()) throw new Error(`Clave repetida con otras piezas: ${key}`);
  rec.set(key, { skus, qty });
};
const SKIP = /^(Ninguno|Ninguna|Sin corazón)$/i;
const figIds = new Set(D.FIG_GROUPS.map(g => g.id));
const hayFig = D.PRODUCTS.some(p => p.groups.some(g => g.id === 'extras'));
if (hayFig) {
  addRec('Figura · Cuerpo', ['LEG-MUNECOS-LEGO']);
  ['Cabeza', 'Cabello', 'Torso', 'Piernas', 'Vestido', 'Detalle'].forEach(t => addRec(`Figura · ${t} · *`));
  addRec('Figura · Base acrílica');
  const fg = id => D.FIG_GROUPS.find(g => g.id === id);
  [['Sombrero', 'hat'], ['Ropa', 'outfit'], ['Accesorio', 'hand']].forEach(([t, id]) => {
    fg(id).options.filter(o => o.skus && o.skus.length).forEach(o => addRec(`Figura · ${t} · ${o.label}`, o.skus));
    addRec(`Figura · ${t} · *`);
  });
}
D.PRODUCTS.forEach(p => {
  const figLike = p.groups.some(g => g.id === 'extras');
  const ids = new Set();
  if (p.variants) D.varSets(p).forEach(s => Object.values(s.map).forEach(i => ids.add(i)));
  addRec(p.name, p.skus);
  p.groups.forEach(g => {
    if (figLike && figIds.has(g.id)) return;
    if (g.type === 'figs') return;
    if (g.type === 'stepper') return addRec(`${p.name} · ${g.label}`, g.skus);
    if (g.type === 'multi') return g.options.forEach(o => addRec(`${p.name} · ${g.label} · ${o.label}`, o.skus));
    if ((g.type === 'choice' || g.type === 'swatch') && !ids.has(g.id) && !g.noStock && !['font', 'tpl'].includes(g.id)) {
      if (g.options.some(o => o.skus && o.skus.length)) g.options.filter(o => !SKIP.test(o.label)).forEach(o => addRec(`${p.name} · ${g.label} · ${o.label}`, o.skus));
      else addRec(`${p.name} · ${g.label} · *`);
    }
  });
  if (p.variants) {
    // una receta por variante: la clave sale de varKey (la misma función que usa el sitio)
    D.varSets(p).forEach(s => p.variants.forEach(r => {
      const cfg = {}; Object.keys(s.map).forEach(d => { cfg[s.map[d]] = r.o[d]; });
      addRec(D.varKey(p, s, cfg), [r.sku]);
    }));
  }
});

// ---------- Catalogo.gs ----------
const fila = a => '  [' + a.map(x => typeof x === 'number' ? x : q(x)).join(', ') + '],';
const gs = `/**
 * Catálogo de piezas y recetas (GENERADO por herramientas/generar-tienda.js desde docs/inventario/catalogo-base.csv).
 * No se edita a mano: cambia el CSV y vuelve a generar. Se carga con Pehn › Cargar catálogo de piezas
 * (cargarCatalogo en Setup.gs): agrega lo que falte y no toca lo que ya existe.
 */

// [SKU, Pieza (producto + talla + color), Categoría]
const CATALOGO_PIEZAS = [
${piezas.map(c => fila([c.sku, nombrePieza(c), c.categoria])).join('\n')}
];

// [Clave que manda el sitio, SKU (vacío = no gasta inventario), Cantidad, Notas]
const CATALOGO_RECETAS = [
${[...rec].flatMap(([k, r]) => (r.skus.length ? r.skus : ['']).map(sku => fila([k, sku, r.qty, sku ? '' : 'Sin inventario']))).join('\n')}
];
`;
fs.writeFileSync(path.join(RAIZ, 'apps-script', 'Catalogo.gs'), gs);
console.log(`datos-tienda.js: ${tienda.length} productos, ${tienda.reduce((s, p) => s + p.variants.length, 0)} variantes`);
console.log(`Catalogo.gs: ${piezas.length} piezas, ${rec.size} recetas`);
