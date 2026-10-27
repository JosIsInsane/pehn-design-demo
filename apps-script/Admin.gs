/**
 * CRM de Pehn: página aparte (app web) con menú lateral.
 * Google Sheets guarda todo; aquí solo se consulta y se edita.
 * Acceso: enlace con la clave de Config (?k=…) o un correo de "Admins".
 * Toda respuesta viaja como texto JSON para evitar que Google la vacíe.
 *
 * SI EL CRM NO CARGA O SE QUEDA EN BLANCO:
 *   1. Editor › Ejecutar › probarCRM y lee el registro: dice qué hoja o dato falla.
 *   2. "Sin acceso" -> el enlace no trae la clave de Config › Clave del CRM; ábrelo desde Pehn › Abrir CRM.
 *   3. Cambiaste el código y no se ve -> Implementar › Gestionar implementaciones › Nueva versión.
 *   4. URL_APP vieja -> cópiala de Implementar › Gestionar implementaciones y pégala abajo.
 * Para agregar una acción nueva: un case en crm() aquí, y en Admin.html una entrada en LOCAL si debe verse al instante.
 */

function clave_() {
  let k = config_()['Clave del CRM'];
  if (!k) { k = nuevaClave_(); setConfig_('Clave del CRM', k); }
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
  // público: solo el contenido de la hoja Sitio (colores y textos de la página)
  if (e && e.parameter && e.parameter.api === 'sitio') {
    try { return json_(sitioPublico_()); } catch (err) { return json_({ ok: false, error: 'Sin contenido' }); }
  }
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

// URL de la app web (Implementar › Gestionar implementaciones › App web).
// Google a veces devuelve otra con getUrl(), por eso se fija aquí.
const URL_APP = 'https://script.google.com/macros/s/AKfycbyZ0Z1nr735rQ9tn2YSaYUtXEyDUL7fBQiMF78JuiRdUnRtzCt6BALCHgane8wpnsO5/exec';
const urlApp_ = () => URL_APP || ScriptApp.getService().getUrl();

// abre el CRM en otra pestaña (los navegadores piden un clic)
function abrirCRM() {
  const url = urlApp_();
  if (!url) { SpreadsheetApp.getUi().alert('Primero publica la app web: Implementar › Nueva implementación › App web.'); return; }
  const link = url + '?k=' + encodeURIComponent(clave_());
  const html = HtmlService.createHtmlOutput(`<div style="font:14px/1.6 system-ui;padding:6px">
    <p>Abre el CRM en una pestaña nueva. Guarda el enlace en favoritos para entrar directo.</p>
    <p><a id="go" href="${link}" target="_blank" rel="noopener" style="display:inline-block;background:#1E1611;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Abrir CRM</a></p>
    <p style="color:#8B7B6F;font-size:12px">El enlace lleva la clave de acceso: compártelo solo con tu equipo.</p>
    <script>try{window.open(${JSON.stringify(link.split('/'))}.join(String.fromCharCode(47)),'_blank');}catch(e){}</script></div>`).setWidth(440).setHeight(200);
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

function crmDatos_() { return conMemo_(crmDatosLeer_); }

function crmDatosLeer_() {
  const cfg = config_(), tz = Session.getScriptTimeZone();
  const txt = v => v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v);
  const dia = v => v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : (/^\d{4}-\d{2}-\d{2}/.test(String(v)) ? String(v).slice(0, 10) : '');
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
      cliente: txt(p.Cliente), wa: txt(p.WhatsApp), tel: telKey_(p.WhatsApp), correo: txt(p.Correo), ciudad: txt(p.Ciudad), para: txt(p['Para cuándo']), paraDia: dia(p['Para cuándo']),
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
  // pagos: si la hoja no existe todavía (instalación vieja) el CRM sigue funcionando sin ellos
  let pagos = [];
  try {
    pagos = rows_('pagos').slice(-300).reverse().map(x => ({ row: x._row, fecha: iso(x.Fecha), pedido: txt(x.Pedido), monto: Number(x['Monto leído']) || 0, leido: txt(x['Monto leído']),
      esperado: Number(x.Esperado) || 0, resultado: txt(x.Resultado), url: txt(x.Comprobante), revisado: txt(x['Revisado por']), texto: txt(x['Texto leído']).slice(0, 400) }));
  } catch (e) { console.warn('Sin hoja Pagos: corre Pehn › Configurar hojas.'); }
  const movs = rows_('movimientos').slice(-120).reverse().map(m => ({ fecha: iso(m.Fecha), sku: txt(m.SKU), pieza: txt(m.Pieza), qty: Number(m.Cantidad) || 0, despues: Number(m['Stock después']) || 0, motivo: txt(m.Motivo), pedido: txt(m.Pedido), usuario: txt(m.Usuario) }));

  return {
    estados: ESTADOS, gatillo: txt(cfg['Estado que descuenta stock']) || 'En producción',
    negocio: txt(cfg['Nombre del negocio']) || 'Pehn Design', waNegocio: txt(cfg['WhatsApp del negocio']),
    hoja: ss_().getUrl(), generado: new Date().toISOString(),
    anticipo: Number(cfg['Anticipo (%)']) || 50, web: txt(cfg['Sitio web']),
    sitio: sitioCrm_(),
    pedidos, clientes, inventario, recetas, movs, pagos,
  };
}

// ---------- acciones (todas devuelven los datos al día como texto JSON) ----------
// fila de datos válida (nunca la 1 de encabezados ni una que no existe)
function filaValida_(key, row) {
  const r = Number(row);
  if (!Number.isInteger(r) || r < 2 || r > sheet_(key).getLastRow()) throw new Error('Fila inválida. Actualiza los datos e intenta de nuevo.');
  return r;
}

function crm(k, accion, args) {
  exigir_(k);
  args = args && typeof args === 'object' ? args : {};
  switch (accion) {
    case 'datos': break;
    case 'imagenes': {
      const srcs = {};
      (Array.isArray(args.ids) ? args.ids : []).filter(id => /^[-\w]{25,80}$/.test(id)).slice(0, 6).forEach(id => {
        try { srcs[id] = dataUrl_(DriveApp.getFileById(String(id)).getBlob()); } catch (e) { /* foto borrada o sin permiso: el CRM muestra "Sin foto" */ }
      });
      return JSON.stringify({ srcs });
    }
    case 'estado': {
      if (!ESTADOS.includes(args.estado)) throw new Error('Estado inválido.');
      const row = filaValida_('pedidos', args.row);
      conCandado_(() => { sheet_('pedidos').getRange(row, COL.pedidos.Estado).setValue(args.estado); aplicarEstado_(row, args.estado); });
      break;
    }
    case 'nota':
      sheet_('pedidos').getRange(filaValida_('pedidos', args.row), COL.pedidos['Notas internas']).setValue(celda_(texto_(args.texto, 2000)));
      break;
    case 'cliente': {
      const sh = hojaClientes_();
      if (!sh) throw new Error('Ya existe una hoja "Clientes" con otros datos; no se modifica.');
      const et = linea_(args.etiquetas, 200), notas = texto_(args.notas, 2000);
      if (Number(args.row)) sh.getRange(filaValida_('clientes', args.row), COL.clientes.Etiquetas, 1, 2).setValues([fila_([et, notas])]);
      else sh.appendRow(fila_(["'" + telKey_(args.tel), linea_(args.nombre, 80), linea_(args.correo, 120), linea_(args.ciudad, 60), '', '', et, notas]));
      break;
    }
    case 'ajuste': {
      const delta = Number(args.delta);
      if (!delta) throw new Error('Cantidad inválida.');
      conCandado_(() => moverStock_(linea_(args.sku, 40), delta, linea_(args.motivo, 120) || (delta > 0 ? 'Entrada de mercancía' : 'Salida manual'), ''));
      break;
    }
    case 'pieza': conCandado_(() => guardarPieza_(args)); break;
    case 'sitio': conCandado_(() => guardarSitio_(args.cambios)); break;
    case 'sitioImagen': return JSON.stringify({ url: subirImagenSitio_(String(args.dataUrl || '')) });
    case 'receta': {
      const sh = sheet_('recetas'), row = filaValida_('recetas', args.row), sku = linea_(args.sku, 40).toUpperCase();
      sh.getRange(row, COL.recetas.SKU, 1, 3).setValues([fila_([sku, Math.max(1, Math.round(Number(args.qty) || 1)), sku ? '' : 'Sin inventario'])]);
      break;
    }
    case 'pago': {
      // el dueño confirma o rechaza un comprobante que subió el cliente
      if (!['Confirmado', 'Rechazado'].includes(args.resultado)) throw new Error('Resultado inválido.');
      const sh = sheet_('pagos'), row = filaValida_('pagos', args.row);
      sh.getRange(row, COL.pagos.Resultado).setValue(args.resultado);
      sh.getRange(row, COL.pagos['Revisado por']).setValue(celda_(who_()));
      if (args.monto !== undefined && args.monto !== '') sh.getRange(row, COL.pagos['Monto leído']).setValue(Math.max(0, Number(args.monto) || 0));
      break;
    }
    default: throw new Error('Acción desconocida: ' + accion);
  }
  return crmDatosJson_();
}

function guardarPieza_(p) {
  const sku = linea_(p.sku, 40).toUpperCase();
  p = { ...p, pieza: linea_(p.pieza, 120), cat: linea_(p.cat, 60), proveedor: linea_(p.proveedor, 120), unidad: linea_(p.unidad, 20) };
  if (!sku || !p.pieza) throw new Error('SKU y nombre son obligatorios.');
  const sh = sheet_('inventario'), cur = inventarioMap_()[sku];
  const vals = fila_([sku, p.pieza, p.cat, Number(p.stock) || 0, Number(p.min) || 0, p.unidad || 'pza', Number(p.costo) || 0, p.proveedor]);
  if (cur) {
    const antes = Number(cur.Stock) || 0;
    sh.getRange(cur._row, 1, 1, 8).setValues([vals]);
    if (antes !== vals[3]) registrarMovimiento_(sku, p.pieza, vals[3] - antes, vals[3], 'Ajuste desde el CRM', '');
    sh.getRange(cur._row, COL.inventario.Actualizado).setValue(now_());
  } else {
    const r = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(r, 1, 1, 8).setValues([vals]);
    sh.getRange(r, COL.inventario.Actualizado).setValue(now_());
    if (vals[3]) registrarMovimiento_(sku, p.pieza, vals[3], vals[3], 'Alta de pieza', '');
  }
}

// campos del sitio para el CRM (valor actual + tipo + ayuda), en el orden de SITIO_DEFAULTS
function sitioCrm_() {
  try {
    const actual = {}; rows_('sitio').forEach(r => { actual[String(r.Clave)] = String(r.Valor == null ? '' : r.Valor); });
    return SITIO_DEFAULTS.map(([clave, def, tipo, ayuda]) => ({ clave, valor: clave in actual ? actual[clave] : def, tipo, ayuda }));
  } catch (e) { return []; } // hoja Sitio aún no creada: Pehn › Configurar hojas
}
