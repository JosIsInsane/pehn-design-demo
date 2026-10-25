/**
 * Panel de control: se abre desde la hoja (Pehn › Abrir panel)
 * o como web app solo para los correos de "Admins".
 */

function doGet() {
  const me = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const admins = String(config_()['Admins'] || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (!me || !admins.includes(me)) {
    return HtmlService.createHtmlOutput('<p style="font:16px system-ui;padding:40px">Sin acceso. Abre el panel desde la hoja: <b>Pehn › Abrir panel</b>.</p>').setTitle('Pehn · Panel');
  }
  return panelHtml_().setTitle('Pehn · Panel').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function abrirPanel() {
  SpreadsheetApp.getUi().showModelessDialog(panelHtml_().setWidth(1280).setHeight(820), 'Pehn · Panel');
}

function panelHtml_() { return HtmlService.createTemplateFromFile('Admin').evaluate(); }

// ---------- API para el panel (google.script.run) ----------
function panelDatos() {
  const cfg = config_(), tz = Session.getScriptTimeZone();
  const txt = v => v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v);
  const pedidos = rows_('pedidos').map(p => {
    const d = datos_(p);
    return {
      row: p._row, id: p.ID, fecha: p.Fecha ? new Date(p.Fecha).toISOString() : '', estado: p.Estado,
      cliente: txt(p.Cliente), wa: txt(p.WhatsApp), correo: txt(p.Correo), ciudad: txt(p.Ciudad), para: txt(p['Para cuándo']),
      productos: txt(p.Productos), piezas: txt(p.Piezas), total: Number(p.Total) || 0, moneda: p.Moneda || 'HNL', stock: txt(p.Stock),
      notasCliente: txt(p['Notas del cliente']), notas: txt(p['Notas internas']), carpeta: txt(p.Carpeta),
      descontado: !!d.descontado, items: (d.items || []).map(it => ({ product: it.product, qty: it.qty, total: it.total, options: it.options })),
    };
  }).reverse();
  const previews = {};
  rows_('partidas').forEach(r => {
    const id = String(r['Archivo vista previa'] || '').match(/[-\w]{25,}/);
    if (id) (previews[r.Pedido] = previews[r.Pedido] || []).push(id[0]);
  });
  pedidos.forEach(p => { p.previews = previews[p.id] || []; });
  const inventario = rows_('inventario').map(i => ({
    row: i._row, sku: i.SKU, pieza: i.Pieza, cat: i['Categoría'], stock: Number(i.Stock) || 0, min: Number(i['Mínimo']) || 0,
    unidad: i.Unidad, costo: Number(i['Costo unitario']) || 0, proveedor: i.Proveedor,
  }));
  const recetas = rows_('recetas').map(r => ({ row: r._row, clave: r.Clave, sku: r.SKU, qty: Number(r.Cantidad) || 1, notas: r.Notas }));
  const res = reservado_();
  inventario.forEach(i => { i.apartado = res[i.sku] || 0; });
  const movs = rows_('movimientos').slice(-40).reverse().map(m => ({ fecha: new Date(m.Fecha).toISOString(), sku: m.SKU, pieza: m.Pieza, qty: m.Cantidad, despues: m['Stock después'], motivo: m.Motivo, pedido: m.Pedido }));
  return {
    estados: ESTADOS, gatillo: cfg['Estado que descuenta stock'] || 'En producción',
    negocio: cfg['Nombre del negocio'] || 'Pehn Design', waNegocio: cfg['WhatsApp del negocio'] || '',
    hoja: ss_().getUrl(), pedidos, inventario, recetas, movs,
  };
}

function panelImagen(fileId) {
  const b = DriveApp.getFileById(fileId).getBlob();
  return `data:${b.getContentType()};base64,${Utilities.base64Encode(b.getBytes())}`;
}

function panelEstado(row, estado) {
  if (!ESTADOS.includes(estado)) throw new Error('Estado inválido.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    sheet_('pedidos').getRange(row, COL.pedidos.Estado).setValue(estado);
    aplicarEstado_(row, estado); // setValue desde script no dispara onEdit
  } finally { lock.releaseLock(); }
  return panelDatos();
}

function panelNota(row, texto) {
  sheet_('pedidos').getRange(row, COL.pedidos['Notas internas']).setValue(String(texto).slice(0, 2000));
  return true;
}

function panelAjuste(sku, delta, motivo) {
  delta = Number(delta);
  if (!delta) throw new Error('Cantidad inválida.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { moverStock_(sku, delta, motivo || (delta > 0 ? 'Entrada de mercancía' : 'Salida manual'), ''); } finally { lock.releaseLock(); }
  return panelDatos();
}

function panelPieza(p) {
  const sku = String(p.sku || '').trim().toUpperCase();
  if (!sku || !String(p.pieza || '').trim()) throw new Error('SKU y nombre son obligatorios.');
  const sh = sheet_('inventario'), inv = inventarioMap_(), cur = inv[sku];
  const vals = [sku, p.pieza, p.cat || '', Number(p.stock) || 0, Number(p.min) || 0, p.unidad || 'pza', Number(p.costo) || 0, p.proveedor || ''];
  if (cur) {
    const antes = Number(cur.Stock) || 0;
    sh.getRange(cur._row, 1, 1, 8).setValues([vals]);
    if (antes !== vals[3]) sheet_('movimientos').appendRow([now_(), sku, p.pieza, vals[3] - antes, vals[3], 'Ajuste desde el panel', '', who_()]);
    sh.getRange(cur._row, COL.inventario.Actualizado).setValue(now_());
  } else {
    const r = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(r, 1, 1, 8).setValues([vals]);
    sh.getRange(r, COL.inventario.Actualizado).setValue(now_());
    if (vals[3]) sheet_('movimientos').appendRow([now_(), sku, p.pieza, vals[3], vals[3], 'Alta de pieza', '', who_()]);
  }
  return panelDatos();
}

function panelReceta(row, sku, qty) {
  const sh = sheet_('recetas');
  sh.getRange(row, COL.recetas.SKU).setValue(String(sku || '').trim().toUpperCase());
  sh.getRange(row, COL.recetas.Cantidad).setValue(Number(qty) || 1);
  sh.getRange(row, COL.recetas.Notas).setValue(sku ? '' : 'Sin inventario');
  return panelDatos();
}
