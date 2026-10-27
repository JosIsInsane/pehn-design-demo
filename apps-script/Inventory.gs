/**
 * Inventario automático.
 * - Cada partida del sitio trae claves de consumo (bom), ej. "Figura · Cabello · Largo · Negro".
 * - La hoja Recetas traduce clave -> SKU y cantidad. "*" sirve de comodín.
 * - Al llegar al estado configurado se descuenta stock; al cancelar se regresa.
 *
 * SI EL STOCK NO CUADRA: revisa la hoja Movimientos (cada cambio queda ahí con quién y por qué).
 *   Un pedido no descontó -> su receta no tiene SKU (Recetas › Por asignar) o el SKU no existe en Inventario.
 *   Para corregir a mano, cambia el Stock en la hoja: el cambio queda registrado en Movimientos.
 */

function recetas_() {
  return rows_('recetas').filter(r => String(r.Clave).trim()).map(r => {
    const k = String(r.Clave).trim();
    const wild = k.includes('*');
    const re = wild ? new RegExp('^' + k.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i') : null;
    return { key: k, wild, re, sku: String(r.SKU).trim(), qty: Number(r.Cantidad) || 1 };
  });
}

// filas de receta que aplican a una clave: exactas primero; si no hay, comodines
function recetaDe_(key, recs) {
  const exact = recs.filter(r => !r.wild && r.key.toLowerCase() === key.toLowerCase());
  return exact.length ? exact : recs.filter(r => r.wild && r.re.test(key));
}

function consumoDePedido_(items, recs) {
  recs = recs || recetas_();
  const inv = inventarioMap_(), acc = {};
  (items || []).forEach(it => (it.bom || []).forEach(b => {
    recetaDe_(String(b.key), recs).forEach(r => {
      if (!r.sku) return; // clave registrada pero sin pieza asignada
      acc[r.sku] = (acc[r.sku] || 0) + r.qty * (Number(b.qty) || 1);
    });
  }));
  return Object.keys(acc).map(sku => ({ sku, name: (inv[sku] || {}).Pieza || '', qty: acc[sku] }));
}

function inventarioMap_() {
  const m = {};
  rows_('inventario').forEach(r => { m[String(r.SKU).trim()] = r; });
  return m;
}

// lo que ya está apartado por pedidos activos que aún no descuentan
function reservado_(exceptId) {
  return conMemo_(() => {
    const recs = recetas_(), acc = {};
    rows_('pedidos').forEach(p => {
      if (p.ID === exceptId || ['Cancelado', 'Entregado'].includes(p.Estado)) return;
      const d = datos_(p);
      if (d.descontado) return;
      consumoDePedido_(d.items, recs).forEach(x => { acc[x.sku] = (acc[x.sku] || 0) + x.qty; });
    });
    return acc;
  });
}

function disponibilidad_(piezas, exceptId) {
  const inv = inventarioMap_(), res = reservado_(exceptId), faltan = [];
  piezas.forEach(p => {
    const item = inv[p.sku];
    const stock = item ? Number(item.Stock) || 0 : 0;
    const libre = stock - (res[p.sku] || 0);
    if (!item) faltan.push(`${p.sku} no existe en Inventario`);
    else if (libre < p.qty) faltan.push(`${p.qty} × ${p.sku} (libres ${Math.max(0, libre)})`);
  });
  return { ok: !faltan.length, faltan, texto: faltan.length ? 'Falta: ' + faltan.join('; ') : (piezas.length ? 'Alcanza' : 'Sin receta') };
}

function datos_(p) { try { return JSON.parse(p.Datos || '{}'); } catch (e) { return {}; } }

// claves que llegan del sitio y no tienen receta: se agregan para que solo se asigne el SKU
function registrarClavesNuevas_(items) {
  const recs = recetas_(), nuevas = new Set();
  items.forEach(it => (it.bom || []).forEach(b => {
    const k = String(b.key);
    if (!recetaDe_(k, recs).length) nuevas.add(k);
  }));
  if (!nuevas.size) return;
  const sh = sheet_('recetas');
  const data = [...nuevas].map(k => fila_([k, '', 1, 'Nueva: asigna la pieza (SKU) o déjala vacía si no usa inventario']));
  sh.getRange(sh.getLastRow() + 1, 1, data.length, 4).setValues(data);
}

// ---------- movimientos de stock ----------
// toda entrada o salida pasa por aquí: así Movimientos siempre tiene el historial completo
function registrarMovimiento_(sku, pieza, delta, despues, motivo, pedido) {
  sheet_('movimientos').appendRow(fila_([now_(), String(sku), String(pieza || ''), delta, despues, motivo, pedido || '', who_()]));
}

function moverStock_(sku, delta, motivo, pedido) {
  const inv = inventarioMap_(), item = inv[sku];
  if (!item) throw new Error(`No existe el SKU ${sku} en Inventario. Agrégalo o corrige la receta que lo usa.`);
  const nuevo = (Number(item.Stock) || 0) + delta;
  const sh = sheet_('inventario');
  sh.getRange(item._row, COL.inventario.Stock).setValue(nuevo);
  sh.getRange(item._row, COL.inventario.Actualizado).setValue(now_());
  registrarMovimiento_(sku, item.Pieza, delta, nuevo, motivo, pedido);
  return nuevo;
}

// ---------- cambios de estado ----------
function aplicarEstado_(row, nuevo) {
  const sh = sheet_('pedidos');
  const p = rows_('pedidos').find(x => x._row === row);
  if (!p) return;
  const d = datos_(p), cfg = config_();
  const gatillo = ESTADOS.indexOf(cfg['Estado que descuenta stock'] || 'En producción');
  const i = ESTADOS.indexOf(nuevo);

  if (nuevo === 'Cancelado' && d.descontado) {
    (d.descontadas || []).forEach(x => moverStock_(x.sku, x.qty, 'Pedido cancelado: se regresa', p.ID));
    d.descontado = false; d.descontadas = [];
    sh.getRange(row, COL.pedidos.Stock).setValue('Regresado al inventario');
  } else if (nuevo !== 'Cancelado' && i >= gatillo && !d.descontado) {
    // receta actual (por si se asignaron piezas después de recibir el pedido)
    const piezas = consumoDePedido_(d.items);
    const disp = disponibilidad_(piezas, p.ID);
    piezas.forEach(x => moverStock_(x.sku, -x.qty, `Pedido ${nuevo.toLowerCase()}`, p.ID));
    d.descontado = true; d.descontadas = piezas; d.piezas = piezas;
    sh.getRange(row, COL.pedidos.Piezas).setValue(piezas.map(x => `${x.qty} × ${x.sku} ${x.name}`).join('\n') || '(sin receta)');
    sh.getRange(row, COL.pedidos.Stock).setValue(disp.ok ? 'Descontado' : 'Descontado con faltantes: ' + disp.faltan.join('; '));
  }
  sh.getRange(row, COL.pedidos.Datos).setValue(JSON.stringify(d));
  sh.getRange(row, COL.pedidos.Actualizado).setValue(now_());
}

// disparador instalable (Setup.instalarDisparadores_)
function alEditar_(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet(), name = sh.getName(), r = e.range.getRow(), c = e.range.getColumn();
  if (r < 2 || e.range.getNumRows() > 1 || e.range.getNumColumns() > 1) return;
  if (!Object.keys(SHEETS).some(k => SHEETS[k] === name && esNuestra_(sh, k))) return; // hojas ajenas: nada
  // cambió la hora del resumen: se reprograma el disparador
  if (name === SHEETS.config && c === COL.config.Valor && sh.getRange(r, COL.config.Ajuste).getValue() === 'Hora del resumen diario') {
    try { instalarResumen_(); } catch (err) { console.error('No se reprogramó el resumen:', err); }
  }
  if (name === SHEETS.pedidos && c === COL.pedidos.Estado) conCandado_(() => aplicarEstado_(r, e.value));
  if (name === SHEETS.inventario && c === COL.inventario.Stock) {
    const antes = Number(e.oldValue) || 0, ahora = Number(e.value) || 0;
    if (antes !== ahora) {
      registrarMovimiento_(sh.getRange(r, COL.inventario.SKU).getValue(), sh.getRange(r, COL.inventario.Pieza).getValue(), ahora - antes, ahora, 'Ajuste manual en la hoja', '');
      sh.getRange(r, COL.inventario.Actualizado).setValue(now_());
    }
  }
}

// ---------- alertas ----------
function reporteStock_() {
  const inv = rows_('inventario'), res = reservado_();
  const bajos = inv.filter(i => (Number(i.Stock) || 0) <= (Number(i['Mínimo']) || 0));
  const faltantes = inv.map(i => ({ sku: i.SKU, name: i.Pieza, stock: Number(i.Stock) || 0, apartado: res[i.SKU] || 0 }))
    .filter(x => x.apartado > x.stock).map(x => ({ ...x, falta: x.apartado - x.stock }));
  return { bajos: bajos.map(i => ({ sku: i.SKU, name: i.Pieza, stock: Number(i.Stock) || 0, min: Number(i['Mínimo']) || 0 })), faltantes };
}

// Disparador viejo (8 am): ya no hace nada. Pehn › Configurar hojas lo borra.
function resumenStockDiario_() { /* reemplazado por resumenDiario_ */ }

// ¿está prendido el resumen? Usa el ajuste nuevo; si no existe, respeta el viejo "Aviso de stock bajo".
const resumenActivo_ = cfg => yes_(cfg['Resumen diario al negocio'] ?? cfg['Aviso de stock bajo'] ?? 'Sí');

// día "yyyy-MM-dd" de una fecha de la hoja (Date o texto)
function dia_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return /^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : '';
}

// ÚNICO correo al negocio: resumen del día a la hora de Config. Se arma con lo que ya está en las hojas.
function resumenDiario_() {
  const cfg = config_(), to = cfg['Correo del negocio'];
  if (!resumenActivo_(cfg) || !to) return;
  if (MailApp.getRemainingDailyQuota() < 1) { console.error('Sin cuota de correo para el resumen.'); return; }
  const tz = Session.getScriptTimeZone(), negocio = cfg['Nombre del negocio'] || 'Pehn Design';
  const html = conMemo_(() => {
    const hoy = dia_(now_()), en3 = dia_(new Date(now_().getTime() + 3 * 864e5));
    const pedidos = rows_('pedidos'), pagos = rows_('pagos');
    const porId = {}; pedidos.forEach(p => { porId[String(p.ID)] = p; });
    const mon = (n, p) => money_(n, (p && p.Moneda) || cfg.Moneda || 'HNL');
    const li = a => `<ul style="padding-left:18px">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
    const sec = (t, cuerpo) => `<h3 style="margin:18px 0 4px;font-size:15px">${t}</h3>${cuerpo}`;

    // pedidos nuevos de hoy
    const nuevos = pedidos.filter(p => dia_(p.Fecha) === hoy);
    const vendido = nuevos.filter(p => p.Estado !== 'Cancelado').reduce((s, p) => s + (Number(p.Total) || 0), 0);
    const filaPedido = p => {
      const pg = resumenPago_(p, cfg);
      return `<b>${esc_(p.ID)}</b> · ${esc_(p.Cliente)} · ${mon(p.Total, p)} · anticipo recibido ${mon(pg.pagado, p)} · ${esc_(p.Ciudad || '—')}${p['Para cuándo'] ? ' · para ' + esc_(dia_(p['Para cuándo']) || p['Para cuándo']) : ''}`;
    };

    // cobros de hoy: el primero que cubre el anticipo cuenta como anticipo; lo que sigue, como saldo
    let anticipos = 0, saldos = 0;
    const acum = {};
    pagos.filter(x => PAGO_OK.includes(x.Resultado)).forEach(x => {
      const p = porId[String(x.Pedido)], antes = acum[x.Pedido] || 0, m = Number(x['Monto leído']) || 0;
      acum[x.Pedido] = antes + m;
      if (dia_(x.Fecha) !== hoy) return;
      const meta = p ? Math.round((Number(p.Total) || 0) * (Number(cfg['Anticipo (%)']) || 50) / 100) : 0;
      if (antes < meta - 1) anticipos += m; else saldos += m;
    });

    // comprobantes por revisar (no coinciden / sin lectura; lo confirmado o rechazado ya no cuenta)
    const revisar = pagos.filter(x => !PAGO_OK.includes(x.Resultado) && x.Resultado !== 'Rechazado');

    // activos por estado y entregas próximas
    const activos = pedidos.filter(p => !['Entregado', 'Cancelado'].includes(p.Estado));
    const porEstado = ESTADOS.map(e => [e, activos.filter(p => (p.Estado || 'Nuevo') === e).length]).filter(x => x[1]);
    const entregas = activos.filter(p => { const d = dia_(p['Para cuándo']); return d && d >= hoy && d <= en3; })
      .sort((a, b) => dia_(a['Para cuándo']).localeCompare(dia_(b['Para cuándo'])));

    // correos de cliente que no salieron hoy (falló o no hubo cuota)
    const sinCorreo = nuevos.filter(p => /^Falló|^Sin correo \(/.test(String(p['Correo cliente'])));

    const r = reporteStock_();
    let h = `<div style="font-family:system-ui,sans-serif;max-width:640px;color:#1E1611">
      <h2 style="font-family:Georgia,serif;font-weight:500;margin-bottom:4px">Resumen de hoy · ${esc_(negocio)}</h2>
      <p style="margin:0;color:#5C4C41">${nuevos.length ? `<b>${nuevos.length}</b> pedido(s) nuevo(s) · vendido hoy <b>${mon(vendido)}</b>` : '<b>Sin pedidos hoy.</b>'}
        ${anticipos || saldos ? `<br>Cobrado hoy: anticipos <b>${mon(anticipos)}</b> · saldos <b>${mon(saldos)}</b>` : ''}</p>`;
    if (nuevos.length) h += sec('Pedidos nuevos', li(nuevos.map(filaPedido)));
    if (revisar.length) h += sec(`Comprobantes por revisar (${revisar.length})`, li(revisar.slice(0, 20).map(x => `<b>${esc_(x.Pedido)}</b> · ${esc_(x.Resultado)} · leído ${x['Monto leído'] === '' ? '—' : mon(x['Monto leído'], porId[String(x.Pedido)])} · esperado ${mon(x.Esperado, porId[String(x.Pedido)])}`)) + '<p style="margin:0;font-size:13px">Confírmalos en el CRM › Pagos.</p>');
    if (porEstado.length) h += sec('Pedidos activos por estado', li(porEstado.map(([e, n]) => `${esc_(e)}: <b>${n}</b>`)));
    if (entregas.length) h += sec('Entregas en los próximos 3 días', li(entregas.map(p => `<b>${esc_(p.ID)}</b> · ${esc_(p.Cliente)} · ${esc_(dia_(p['Para cuándo']))} · ${esc_(p.Estado || 'Nuevo')}`)));
    if (sinCorreo.length) h += sec('Correos al cliente que no salieron', li(sinCorreo.map(p => `<b>${esc_(p.ID)}</b> · ${esc_(p.Cliente)} · ${esc_(p.WhatsApp)} · ${esc_(p['Correo cliente'])} (escríbele por WhatsApp)`)));
    if (r.faltantes.length) h += sec('Inventario: no alcanza para pedidos activos', li(r.faltantes.map(x => `<b>${esc_(x.sku)}</b> ${esc_(x.name)}: faltan ${x.falta} (hay ${x.stock}, se necesitan ${x.apartado})`)));
    if (r.bajos.length) h += sec('Inventario: en el mínimo o debajo', li(r.bajos.map(x => `<b>${esc_(x.sku)}</b> ${esc_(x.name)}: ${x.stock} (mínimo ${x.min})`)));
    if (!r.faltantes.length && !r.bajos.length) h += sec('Inventario', '<p style="margin:0">Todo en orden.</p>');
    // el correo NO lleva la clave del CRM (los correos se reenvían y se guardan): se abre desde la hoja
    h += `<p style="margin-top:20px"><a href="${esc_(ss_().getUrl())}">Abrir la hoja</a></p><p style="color:#8B7B6F;font-size:13px">Abre el CRM desde Pehn › Abrir CRM.</p></div>`;
    return { h, n: nuevos.length };
  });
  MailApp.sendEmail({
    to,
    subject: html.n ? `Resumen de hoy · ${html.n} pedido(s) · ${negocio}` : `Sin pedidos hoy · ${negocio}`,
    htmlBody: html.h,
    name: negocio,
  });
}

function revisarStockMenu() {
  const r = reporteStock_();
  ss_().toast(`${r.faltantes.length} faltantes para pedidos activos · ${r.bajos.length} piezas por reponer. Detalle en Pehn › Abrir CRM.`, 'Inventario', 8);
}
