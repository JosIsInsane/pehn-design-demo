/**
 * Inventario automático.
 * - Cada partida del sitio trae claves de consumo (bom), ej. "Figura · Cabello · Largo · Negro".
 * - La hoja Recetas traduce clave -> SKU y cantidad. "*" sirve de comodín.
 * - Al llegar al estado configurado se descuenta stock; al cancelar se regresa.
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
  const data = [...nuevas].map(k => [k, '', 1, 'Nueva: asigna la pieza (SKU) o déjala vacía si no usa inventario']);
  sh.getRange(sh.getLastRow() + 1, 1, data.length, 4).setValues(data);
}

// ---------- movimientos de stock ----------
function moverStock_(sku, delta, motivo, pedido) {
  const inv = inventarioMap_(), item = inv[sku];
  if (!item) throw new Error(`No existe el SKU ${sku}.`);
  const nuevo = (Number(item.Stock) || 0) + delta;
  const sh = sheet_('inventario');
  sh.getRange(item._row, COL.inventario.Stock).setValue(nuevo);
  sh.getRange(item._row, COL.inventario.Actualizado).setValue(now_());
  sheet_('movimientos').appendRow([now_(), sku, item.Pieza, delta, nuevo, motivo, pedido || '', who_()]);
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
  if (name === SHEETS.pedidos && c === COL.pedidos.Estado) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { aplicarEstado_(r, e.value); } finally { lock.releaseLock(); }
  }
  if (name === SHEETS.inventario && c === COL.inventario.Stock) {
    const antes = Number(e.oldValue) || 0, ahora = Number(e.value) || 0;
    if (antes !== ahora) {
      const sku = sh.getRange(r, COL.inventario.SKU).getValue();
      sheet_('movimientos').appendRow([now_(), sku, sh.getRange(r, COL.inventario.Pieza).getValue(), ahora - antes, ahora, 'Ajuste manual en la hoja', '', who_()]);
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

function resumenStockDiario_() {
  const cfg = config_();
  if (!yes_(cfg['Aviso de stock bajo']) || !cfg['Correo del negocio']) return;
  const r = reporteStock_();
  if (!r.bajos.length && !r.faltantes.length) return;
  const li = a => a.map(x => `<li>${x}</li>`).join('');
  MailApp.sendEmail({
    to: cfg['Correo del negocio'],
    subject: `Inventario: ${r.faltantes.length} faltantes, ${r.bajos.length} por reponer`,
    htmlBody: `<div style="font-family:system-ui,sans-serif">
      ${r.faltantes.length ? `<h3>No alcanza para pedidos activos</h3><ul>${li(r.faltantes.map(x => `<b>${esc_(x.sku)}</b> ${esc_(x.name)}: faltan ${x.falta} (hay ${x.stock}, se necesitan ${x.apartado})`))}</ul>` : ''}
      ${r.bajos.length ? `<h3>En el mínimo o debajo</h3><ul>${li(r.bajos.map(x => `<b>${esc_(x.sku)}</b> ${esc_(x.name)}: ${x.stock} (mínimo ${x.min})`))}</ul>` : ''}
      <p><a href="${ss_().getUrl()}">Abrir inventario</a></p></div>`,
  });
}

function revisarStockMenu() {
  const r = reporteStock_();
  ss_().toast(`${r.faltantes.length} faltantes para pedidos activos · ${r.bajos.length} piezas por reponer. Detalle en Pehn › Abrir CRM.`, 'Inventario', 8);
}
