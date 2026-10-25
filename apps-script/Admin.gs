/**
 * CRM de Pehn: página aparte (app web) con menú lateral.
 * Google Sheets guarda todo; aquí solo se consulta y se edita.
 * Acceso: enlace con la clave de Config (?k=…) o un correo de "Admins".
 * Toda respuesta viaja como texto JSON para evitar que Google la vacíe.
 */

function clave_() {
  let k = config_()['Clave del CRM'];
  if (!k) { k = Utilities.getUuid().replace(/-/g, ''); setConfig_('Clave del CRM', k); }
  return String(k);
}

function autorizado_(k) {
  if (k && String(k) === clave_()) return true;
  const me = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const admins = String(config_()['Admins'] || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  return !!me && admins.includes(me);
}
function exigir_(k) { if (!autorizado_(k)) throw new Error('Sin acceso. Abre el CRM desde la hoja: Pehn › Abrir CRM.'); }

function doGet(e) {
  const k = (e && e.parameter && e.parameter.k) || '';
  if (!autorizado_(k)) {
    return HtmlService.createHtmlOutput('<div style="font:16px/1.6 system-ui;padding:48px;max-width:520px"><h2 style="font-weight:500">Pehn · CRM</h2><p>Este enlace no tiene acceso. Ábrelo desde la hoja: <b>Pehn › Abrir CRM (pestaña nueva)</b>.</p></div>').setTitle('Pehn · CRM');
  }
  return crmHtml_(k).setTitle('Pehn · CRM').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function crmHtml_(k) {
  const t = HtmlService.createTemplateFromFile('Admin');
  t.k = k || clave_();
  try { t.inicial = crmDatosJson_(); t.error = ''; } catch (err) { t.inicial = 'null'; t.error = String(err && err.stack || err); }
  return t.evaluate();
}

// abre el CRM en otra pestaña (los navegadores piden un clic)
function abrirCRM() {
  const url = ScriptApp.getService().getUrl();
  if (!url) { SpreadsheetApp.getUi().alert('Primero publica la app web: Implementar › Nueva implementación › App web.'); return; }
  const link = url + '?k=' + encodeURIComponent(clave_());
  const html = HtmlService.createHtmlOutput(`<div style="font:14px/1.6 system-ui;padding:6px">
    <p>Abre el CRM en una pestaña nueva. Guarda el enlace en favoritos para entrar directo.</p>
    <p><a id="go" href="${link}" target="_blank" rel="noopener" style="display:inline-block;background:#1E1611;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Abrir CRM</a></p>
    <p style="color:#8B7B6F;font-size:12px">El enlace lleva la clave de acceso: compártelo solo con tu equipo.</p>
    <script>try{window.open(${JSON.stringify(link)},'_blank');}catch(e){}</script></div>`).setWidth(440).setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pehn · CRM');
}

// versión dentro de la hoja
function abrirPanel() {
  SpreadsheetApp.getUi().showModelessDialog(crmHtml_(clave_()).setWidth(1280).setHeight(820), 'Pehn · CRM');
}

// para revisar desde el editor si algo falla: Ejecutar › probarCRM y mirar el registro
function probarCRM() {
  const s = crmDatosJson_();
  const d = JSON.parse(s);
  console.log(`OK · ${d.pedidos.length} pedidos · ${d.clientes.length} clientes · ${d.inventario.length} piezas · ${Math.round(s.length / 1024)} KB`);
}

// ---------- datos ----------
function crmDatosJson_() { return JSON.stringify(crmDatos_()); }

function crmDatos_() {
  const cfg = config_(), tz = Session.getScriptTimeZone();
  const txt = v => v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v);
  const iso = v => { const d = v instanceof Date ? v : (v ? new Date(v) : null); return d && !isNaN(d) ? d.toISOString() : ''; };

  const previews = {};
  rows_('partidas').forEach(r => {
    const id = String(r['Archivo vista previa'] || '').match(/[-\w]{25,}/);
    if (id) (previews[r.Pedido] = previews[r.Pedido] || []).push(id[0]);
  });

  const pedidos = rows_('pedidos').map(p => {
    const d = datos_(p);
    return {
      row: p._row, id: txt(p.ID), fecha: iso(p.Fecha), estado: txt(p.Estado) || 'Nuevo',
      cliente: txt(p.Cliente), wa: txt(p.WhatsApp), tel: telKey_(p.WhatsApp), correo: txt(p.Correo), ciudad: txt(p.Ciudad), para: txt(p['Para cuándo']),
      productos: txt(p.Productos), piezas: txt(p.Piezas), total: Number(p.Total) || 0, moneda: txt(p.Moneda) || 'HNL', stock: txt(p.Stock),
      notasCliente: txt(p['Notas del cliente']), notas: txt(p['Notas internas']), carpeta: txt(p.Carpeta), actualizado: iso(p.Actualizado),
      descontado: !!d.descontado,
      items: (d.items || []).map(it => ({ product: String(it.product || ''), qty: Number(it.qty) || 1, total: Number(it.total) || 0, options: (it.options || []).map(o => Array.isArray(o) ? [String(o[0]), String(o[1])] : [String(o), '']) })),
      previews: previews[p.ID] || [],
    };
  }).reverse();

  // clientes: ficha de la hoja + lo que se calcula de sus pedidos
  const fichas = {};
  const shC = hojaClientes_();
  if (shC) rows_('clientes').forEach(r => { fichas[telKey_(r.WhatsApp)] = r; });
  const map = {};
  pedidos.slice().reverse().forEach(p => {
    const key = p.tel || p.cliente;
    const c = map[key] = map[key] || { tel: p.tel, wa: p.wa, nombre: p.cliente, correo: p.correo, ciudad: p.ciudad, pedidos: [], total: 0, primero: p.fecha, ultimo: p.fecha };
    c.pedidos.push(p.id); c.nombre = p.cliente || c.nombre; c.correo = p.correo || c.correo; c.ciudad = p.ciudad || c.ciudad; c.ultimo = p.fecha;
    if (p.estado !== 'Cancelado') c.total += p.total;
  });
  const clientes = Object.values(map).map(c => {
    const f = fichas[c.tel] || {};
    return { ...c, row: f._row || 0, etiquetas: txt(f.Etiquetas), notas: txt(f.Notas) };
  }).sort((a, b) => String(b.ultimo).localeCompare(String(a.ultimo)));

  const res = reservado_();
  const inventario = rows_('inventario').map(i => ({
    row: i._row, sku: txt(i.SKU), pieza: txt(i.Pieza), cat: txt(i['Categoría']), stock: Number(i.Stock) || 0, min: Number(i['Mínimo']) || 0,
    unidad: txt(i.Unidad), costo: Number(i['Costo unitario']) || 0, proveedor: txt(i.Proveedor), actualizado: iso(i.Actualizado), apartado: res[txt(i.SKU)] || 0,
  }));
  const recetas = rows_('recetas').map(r => ({ row: r._row, clave: txt(r.Clave), sku: txt(r.SKU), qty: Number(r.Cantidad) || 1, notas: txt(r.Notas) }));
  const movs = rows_('movimientos').slice(-120).reverse().map(m => ({ fecha: iso(m.Fecha), sku: txt(m.SKU), pieza: txt(m.Pieza), qty: Number(m.Cantidad) || 0, despues: Number(m['Stock después']) || 0, motivo: txt(m.Motivo), pedido: txt(m.Pedido), usuario: txt(m.Usuario) }));

  return {
    estados: ESTADOS, gatillo: txt(cfg['Estado que descuenta stock']) || 'En producción',
    negocio: txt(cfg['Nombre del negocio']) || 'Pehn Design', waNegocio: txt(cfg['WhatsApp del negocio']),
    hoja: ss_().getUrl(), generado: new Date().toISOString(),
    pedidos, clientes, inventario, recetas, movs,
  };
}

// ---------- acciones (todas devuelven los datos al día como texto JSON) ----------
function crm(k, accion, args) {
  exigir_(k);
  args = args || {};
  const lock = LockService.getScriptLock();
  switch (accion) {
    case 'datos': break;
    case 'imagen': {
      const b = DriveApp.getFileById(String(args.id)).getBlob();
      return JSON.stringify({ src: `data:${b.getContentType()};base64,${Utilities.base64Encode(b.getBytes())}` });
    }
    case 'estado': {
      if (!ESTADOS.includes(args.estado)) throw new Error('Estado inválido.');
      lock.waitLock(20000);
      try { sheet_('pedidos').getRange(args.row, COL.pedidos.Estado).setValue(args.estado); aplicarEstado_(args.row, args.estado); } finally { lock.releaseLock(); }
      break;
    }
    case 'nota':
      sheet_('pedidos').getRange(args.row, COL.pedidos['Notas internas']).setValue(String(args.texto || '').slice(0, 2000));
      break;
    case 'cliente': {
      const sh = hojaClientes_();
      if (!sh) throw new Error('Ya existe una hoja "Clientes" con otros datos; no se modifica.');
      const row = Number(args.row) || 0;
      if (row) sh.getRange(row, COL.clientes.Etiquetas, 1, 2).setValues([[args.etiquetas || '', args.notas || '']]);
      else sh.appendRow(["'" + telKey_(args.tel), args.nombre || '', args.correo || '', args.ciudad || '', '', '', args.etiquetas || '', args.notas || '']);
      break;
    }
    case 'ajuste': {
      const delta = Number(args.delta);
      if (!delta) throw new Error('Cantidad inválida.');
      lock.waitLock(20000);
      try { moverStock_(String(args.sku), delta, args.motivo || (delta > 0 ? 'Entrada de mercancía' : 'Salida manual'), ''); } finally { lock.releaseLock(); }
      break;
    }
    case 'pieza': guardarPieza_(args); break;
    case 'receta': {
      const sh = sheet_('recetas'), sku = String(args.sku || '').trim().toUpperCase();
      sh.getRange(args.row, COL.recetas.SKU).setValue(sku);
      sh.getRange(args.row, COL.recetas.Cantidad).setValue(Number(args.qty) || 1);
      sh.getRange(args.row, COL.recetas.Notas).setValue(sku ? '' : 'Sin inventario');
      break;
    }
    default: throw new Error('Acción desconocida: ' + accion);
  }
  return crmDatosJson_();
}

function guardarPieza_(p) {
  const sku = String(p.sku || '').trim().toUpperCase();
  if (!sku || !String(p.pieza || '').trim()) throw new Error('SKU y nombre son obligatorios.');
  const sh = sheet_('inventario'), cur = inventarioMap_()[sku];
  const vals = [sku, p.pieza, p.cat || '', Number(p.stock) || 0, Number(p.min) || 0, p.unidad || 'pza', Number(p.costo) || 0, p.proveedor || ''];
  if (cur) {
    const antes = Number(cur.Stock) || 0;
    sh.getRange(cur._row, 1, 1, 8).setValues([vals]);
    if (antes !== vals[3]) sheet_('movimientos').appendRow([now_(), sku, p.pieza, vals[3] - antes, vals[3], 'Ajuste desde el CRM', '', who_()]);
    sh.getRange(cur._row, COL.inventario.Actualizado).setValue(now_());
  } else {
    const r = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(r, 1, 1, 8).setValues([vals]);
    sh.getRange(r, COL.inventario.Actualizado).setValue(now_());
    if (vals[3]) sheet_('movimientos').appendRow([now_(), sku, p.pieza, vals[3], vals[3], 'Alta de pieza', '', who_()]);
  }
}
