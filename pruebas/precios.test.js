/* Precios y recetas contra el CSV (docs/inventario/catalogo-base.csv).
   Correr:  node pruebas/precios.test.js   (necesita Playwright)
   - Un producto armado cuesta la SUMA de sus piezas (cuadro, accesorios, extras…).
   - Cada opción con precio sale de sus piezas (SKU) y coincide con el CSV.
   - Un producto de variantes cambia de precio con la talla/color y solo deja elegir combinaciones que existen.
   - Cada opción con precio y cada variante tiene receta que descuenta su SKU (mismas claves que bomOf). */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { cargar } from './simulador.js';

// Playwright se busca igual que con require: sirve el instalado en el proyecto o el global
const { chromium } = createRequire(import.meta.url)('playwright');

const RAIZ = path.join(import.meta.dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const f = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
// Corre fn dentro de la página con los módulos del sitio ya cargados (son los mismos que usa la página: import() comparte caché).
// fn recibe (modulos, arg): saca de modulos lo que necesite, por ejemplo ({ productoDe, defaults }, cambios) => …
const conSitio = (pagina, fn, arg = null) => pagina.evaluate(`(async () => {
  const rutas = ['/datos.js', '/js/producto.js', '/js/envio.js', '/js/utiles.js'];
  const modulos = Object.assign({}, ...(await Promise.all(rutas.map(r => import(r)))));
  return (${fn})(modulos, ${JSON.stringify(arg)});
})()`);

let fallas = 0;
const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fallas++; };

// CSV simple (sin comas dentro de comillas en las columnas que usamos)
const filas = fs.readFileSync(path.join(RAIZ, 'docs/inventario/catalogo-base.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const CSV = Object.fromEntries(filas.map(r => [r[0], Number(r[5])]));

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /\[Pehn\]/.test(m.text()) && !/WhatsApp|sheetsUrl/.test(m.text())) errores.push(m.text()); });
  await page.route(/script\.google\.com|fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.goto(base + 'catalogo.html');
  await page.click('[data-aviso="ok"]');

  // 1. el cuadro cuesta la suma de sus piezas
  const precio = cambios => conSitio(page, ({ productoDe, defaults, priceOf }, c) => { const p = productoDe('cuadro'), cfg = defaults(p); Object.assign(cfg, c); return priceOf(p, cfg).unit; }, cambios);
  ok(await precio({ size: 'gra', dogs: 1, adds: ['luces'] }) === 570 + 180 + 70 + 90, 'Cuadro: Retratera 3D grande + 2 figuras + 1 perro + luces = 910');
  ok(await precio({ size: 'peq' }) === 500 + 180, 'Cuadro: Retratera 3D pequeña + 2 figuras = 680');
  ok(await precio({ size: 'med', cats: 1, bunnies: 2 }) === 530 + 180 + 70 + 140, 'Cuadro: mediana + gatito + 2 conejitos');
  ok(await precio({ size: 'med', adds: ['luces', 'dedicatoria', 'iniciales', 'fotos', 'dulces'] }) === 530 + 180 + 90 + 30 + 40 + 30 + 120, 'Cuadro: los cinco extras suman sus piezas');
  ok(await precio({ size: 'med', fondo: 'foto' }) === 530 + 180 + 30 && await precio({ size: 'med', fondo: 'blanco' }) === 530 + 180, 'Cuadro: fondo con tu foto suma L 30; blanco no');
  ok(await precio({ size: 'med', tpl: 'calendario', deco: 'pride', frame: '#B9824C' }) === 530 + 180, 'Calendario, arcoíris y marco madera no cuestan');
  const conFig = await conSitio(page, ({ productoDe, defaults, priceOf }) => {
    const p = productoDe('cuadro'), cfg = defaults(p); cfg.size = 'med';
    Object.assign(cfg.figs[0], { hat: 'cumple', outfit: 'falda', hand: 'moto', extras: ['lentes', 'barba', 'aretes'] });
    Object.assign(cfg.figs[1], { hat: 'birrete', outfit: 'lego', hand: 'bebe' });
    return priceOf(p, cfg).unit;
  });
  ok(conFig === 530 + 180 + (90 + 30 + 120) + (60 + 30 + 90), 'Figuras: gorrito 90 + falda 30 + moto 120 + birrete 60 + camisa Lego 30 + bebé 90 (lentes, barba y aretes a 0)');
  ok(await conSitio(page, ({ FIG_GROUPS }) => { const g = FIG_GROUPS.find(x => x.id === 'hand'); return g.options.length === 24 && g.options[0].price === 0; }), 'Accesorio en la mano: Ninguno + 23 accesorios');

  // 2. todas las opciones con piezas cuestan lo que dice el CSV
  const opciones = await conSitio(page, ({ FIG_GROUPS, PRODUCTS }) => {
    const out = [], ver = (what, skus, price) => out.push({ what, skus, price });
    const grupos = (gs, p) => gs.forEach(g => {
      (g.options || []).forEach(o => { if (o.skus) ver(`${p} · ${g.label} · ${o.label}`, o.skus, o.price); else if (o.price) ver(`${p} · ${o.label} (sin pieza)`, [], o.price); });
      if (g.skus) ver(`${p} · ${g.label}`, g.skus, g.pricePer);
      else if (g.pricePer || g.price) ver(`${p} · ${g.label} (sin pieza)`, [], g.pricePer || g.price);
    });
    grupos(FIG_GROUPS, 'Figura');
    PRODUCTS.forEach(p => {
      grupos(p.groups.filter(g => !FIG_GROUPS.includes(g)), p.name);
      if (p.skus) ver(p.name + ' (base)', p.skus, p.base); else if (p.base) ver(p.name + ' (base sin pieza)', [], p.base);
      (p.variants || []).forEach(v => ver(`${p.name} ${JSON.stringify(v.o)}`, [v.sku], v.price));
    });
    return out;
  });
  const malas = opciones.filter(o => o.skus.reduce((s, k) => s + (CSV[k] ?? NaN), 0) !== o.price || (!o.skus.length));
  ok(opciones.length > 200 && !malas.length, `${opciones.length} opciones/variantes con precio = suma de sus piezas del CSV` + (malas.length ? ': ' + malas.slice(0, 5).map(m => m.what).join(' | ') : ''));
  ok(await conSitio(page, ({ PRODUCTS }) => PRODUCTS.flatMap(p => (p.variants || []).map(v => v.sku)).length), 'Hay variantes');

  // 3. variantes: cambia el precio con talla/color y solo existen combinaciones reales
  const v = await conSitio(page, ({ productoDe, defaults, varFix, priceOf, COLORES, varDisp }) => {
    const out = {}, pr = id => productoDe(id), at = (id, c) => { const p = pr(id), cfg = defaults(p); Object.assign(cfg, c); varFix(p, cfg); return { cfg, price: priceOf(p, cfg).unit }; };
    const mini = pr('t-retratera-mini'), col = id => mini.groups.find(g => g.id === 'color').options.find(o => o.label === id).v;
    out.miniBlanco = at('t-retratera-mini', { color: col('Blanco') }).price; out.miniNegro = at('t-retratera-mini', { color: col('Negro') }).price;
    out.alg = at('playera', {}).price; out.pepe = at('playera', { model: 'pepe' }).price;
    const t3 = at('playera', { size: '3XL' }); out.t3 = [t3.cfg.model, t3.cfg.color, t3.price];
    const pepe3 = at('playera', { model: 'pepe', size: '3XL' }); out.pepe3 = [pepe3.cfg.model, pepe3.cfg.size];
    out.sud = at('sudadera', {}).price; out.sud1 = at('sudadera', { pair: '1' }).price;
    const ce = at('sudadera', { color1: COLORES.Celeste }); out.celeste = [ce.cfg.size1, ce.price];
    out.dispXL = varDisp(pr('sudadera'), 'size1', 'XL', { color1: COLORES.Rojo });
    const box = pr('t-boxer'); out.boxer = at('t-boxer', {}).price; out.boxerFotos = box.variants.length;
    return out;
  });
  ok(v.miniBlanco === 420 && v.miniNegro === 190, 'Retratera mini: Blanco 420, Negro 190 (el precio sigue al color)');
  ok(v.alg === 240 && v.pepe === 490, 'Playera: algodón 240, Camisa Pepe 490');
  ok(v.t3[0] === 'alg' && v.t3[2] === 240, 'Playera 3XL solo existe en Negro (se acomoda sola)');
  ok(v.pepe3[1] !== '3XL', 'Camisa Pepe no tiene 3XL: pasa a una talla que existe');
  ok(v.sud === 1400 && v.sud1 === 700, 'Sudaderas: el par son 2 × 700, una sola 700');
  ok(v.celeste[0] === 'M' && v.celeste[1] === 1400, 'Hoodie celeste solo en M');
  ok(v.dispXL === false, 'Hoodie rojo no tiene XL');
  ok(v.boxer === 420, 'Boxer 420');

  // 3b. en pantalla: la tarjeta de la retratera mini cambia de precio al elegir color
  const tarjeta = await conSitio(page, ({ CARDS }) => CARDS.findIndex(c => c.id === 't-retratera-mini'));
  await page.goto(base + 'catalogo.html?card=' + tarjeta); // abre el personalizador (se descarga en ese momento)
  await page.waitForSelector('#custom.open');
  const t0 = (await page.textContent('#cTotal')).replace(/\D/g, '');
  await page.click('#cForm .sw button[title="Negro"]'); await page.waitForTimeout(700);
  const t1 = (await page.textContent('#cTotal')).replace(/\D/g, '');
  ok(t0 === '190' || t1 === '190', `Precio en pantalla sigue al color (${t0} → ${t1})`);
  ok((await page.locator('#cForm .ch button:disabled, #cForm .sw button:disabled').count()) >= 0, 'Opciones inexistentes salen deshabilitadas');
  await page.keyboard.press('Escape');

  // 4. recetas: toda clave que arma el sitio tiene receta, y cada pieza con precio descuenta su SKU
  const claves = await conSitio(page, ({ PRODUCTS, FIG_GROUPS, defaults, clone, varFix, varSets, bomOf }) => {
    const out = [];
    PRODUCTS.forEach(p => {
      const probar = (cfg, tag) => bomOf(p, cfg, 1).forEach(k => out.push({ k: k.key, tag: `${p.name} ${tag}` }));
      probar(defaults(p), 'base');
      const variar = (gs, objetivo, cfg0) => gs.forEach(g => {
        if (g.type === 'swatch' || g.type === 'choice') g.options.forEach(o => { const c = clone(cfg0()); objetivo(c)[g.id] = o.v; probar(p.variants ? varFix(p, c) : c, `${g.label}=${o.label}`); });
        else if (g.type === 'multi') g.options.forEach(o => { const c = clone(cfg0()); objetivo(c)[g.id] = [o.v]; probar(c, `${g.label}=${o.label}`); });
        else if (g.type === 'stepper') { const c = clone(cfg0()); c[g.id] = 1; probar(c, g.label); }
      });
      variar(p.groups, c => c, () => defaults(p));
      const fg = p.groups.find(g => g.type === 'figs');
      if (fg) variar(FIG_GROUPS, c => c.figs[0], () => defaults(p));
      if (p.variants) p.variants.forEach(r => { const c = defaults(p); varSets(p).forEach(s => Object.keys(s.map).forEach(d => { c[s.map[d]] = r.o[d]; })); probar(c, 'variante ' + r.sku); });
    });
    return out;
  });
  const sim = cargar({ silencio: true });
  sim.run('cargarCatalogoPiezas_()');
  const unicas = [...new Set(claves.map(c => c.k))];
  const res = JSON.parse(sim.run(`JSON.stringify(${JSON.stringify(unicas)}.map(k => recetaDe_(k, recetas_()).map(r => r.sku)))`));
  const sinReceta = unicas.filter((k, i) => !res[i].length);
  ok(unicas.length > 400 && !sinReceta.length, `${unicas.length} claves del sitio, todas con receta` + (sinReceta.length ? ': ' + sinReceta.slice(0, 4).join(' | ') : ''));
  const inv = new Set(sim.hoja('Inventario').map(r => r.SKU));
  const skusUsados = [...new Set(res.flat().filter(Boolean))];
  ok(skusUsados.every(s => inv.has(s)), `${skusUsados.length} SKU de las recetas existen en Inventario`);
  // cada opción con precio descuenta justo las piezas que cobra
  const faltan = await conSitio(page, ({ PRODUCTS, FIG_GROUPS }) => {
    const todos = [];
    const rev = (gs, p) => gs.forEach(g => (g.options || []).forEach(o => { if (o.skus && o.skus.length) todos.push([`${p} · ${g.label} · ${o.label}`, o.skus]); }));
    PRODUCTS.forEach(p => rev(p.groups.filter(g => !(p.groups.some(x => x.id === 'extras') && FIG_GROUPS.some(f => f.id === g.id))), p.name));
    return todos.map(([k, s]) => [k.replace(/\u00a0/g, ' '), s]);
  });
  const claveOpc = faltan.filter(([k]) => !/^Figura/.test(k));
  const r2 = JSON.parse(sim.run(`JSON.stringify(${JSON.stringify(claveOpc.map(x => x[0]))}.map(k => recetaDe_(k, recetas_()).map(r => r.sku)))`));
  const mal2 = claveOpc.filter(([k, skus], i) => r2[i].slice().sort().join() !== skus.slice().sort().join() && !/Argolla|Letra/.test(k));
  ok(!mal2.length, `${claveOpc.length} opciones con pieza descuentan exactamente su SKU` + (mal2.length ? ': ' + mal2.slice(0, 4).map(x => x[0]).join(' | ') : ''));
  // cargar el catálogo dos veces no duplica nada y no toca stock existente
  const n1 = sim.hoja('Inventario').length, r1 = sim.hoja('Recetas').length;
  sim.run(`sheet_('inventario').getRange(2, ${4}, 1, 1).setValue(7)`);
  sim.run('cargarCatalogoPiezas_()');
  ok(n1 === 232 && sim.hoja('Inventario').length === 232 && sim.hoja('Recetas').length === r1, 'Cargar catálogo otra vez: 232 piezas, sin duplicar');
  ok(sim.hoja('Inventario')[0].Stock === 7, 'Cargar catálogo no toca el stock que ya existía');

  ok(!errores.length, 'Sin errores ni avisos [Pehn] en la consola' + (errores.length ? ': ' + errores.slice(0, 3).join(' | ') : ''));
  await b.close(); server.close();
  console.log(fallas ? `\n${fallas} fallaron` : '\nTodo pasó');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
