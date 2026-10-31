/**
 * Recepción de pedidos del sitio (doPost): guarda fotos en Drive,
 * escribe Pedidos y Partidas, revisa stock y manda UN correo al cliente (al negocio solo le llega el resumen diario).
 *
 * SI EL SITIO DICE "No se pudo enviar":
 *   "Token inválido"   -> SITE_TOKEN de Cloudflare no es el de Config › Token del sitio (Pehn › Ver URL y token).
 *   "Respuesta inválida" -> la app web no está publicada para "Cualquier usuario" o la URL de datos.js es vieja.
 *   Otro error         -> Extensiones › Apps Script › Ejecuciones: abre la de doPost y lee el mensaje.
 * Después de cambiar código: Implementar › Gestionar implementaciones › Nueva versión (si no, sigue el viejo).
 */

// Topes contra spam y abuso. Si un cliente real choca con uno, súbelo aquí.
const LIMITS = {
  body: 30e6,          // tamaño máximo de lo que manda el sitio (fotos incluidas)
  items: 20,           // productos por pedido
  options: 80,         // opciones por producto
  imagesPerItem: 4,
  imageChars: 7e6,     // ~5 MB por imagen
  perContact: 5,       // pedidos por WhatsApp cada 10 min
  perHour: 40,         // pedidos de toda la tienda por hora (frena inundaciones de bots)
  minFillMs: 2500,     // un humano tarda más que esto en llenar sus datos
};

// Todo lo que manda el sitio entra aquí. "accion" elige qué hacer; sin accion es un pedido.
function doPost(e) {
  let data;
  try {
    const body = e && e.postData && e.postData.contents || '';
    if (body.length > LIMITS.body) throw new Error('Demasiado grande.');
    data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato inválido.');
  } catch (err) { return json_({ ok: false, error: 'Formato inválido.' }); }
  try {
    const cfg = config_();
    if (!cfg['Token del sitio'] || data.token !== cfg['Token del sitio']) throw new Error('Token inválido.');
    limitePorIp_(data);
    switch (data.accion || 'pedido') {
      case 'pedido': { const r = recibirPedido_(data, cfg); return json_({ ok: true, id: r.id, pago: r.pago }); }
      case 'seguimiento': return json_({ ok: true, pedido: seguimiento_(data) });
      case 'comprobante': return json_({ ok: true, pago: recibirComprobante_(data, cfg) });
      case 'verificar': return json_({ ok: true, verificacion: verificarDesdeSitio_(data, cfg) });
      case 'misPedidos': return json_({ ok: true, pedidos: misPedidos_(data) });
      default: throw new Error('Acción desconocida.');
    }
  } catch (err) {
    console.error(err); // el detalle completo queda en Ejecuciones; al sitio solo van mensajes conocidos
    const msg = String(err && err.message || err);
    return json_({ ok: false, error: esMensajePublico_(msg) ? msg : 'No se pudo procesar. Intenta de nuevo o escríbenos por WhatsApp.' });
  }
}

// Límite por IP: la IP la pone el portero de Cloudflare (functions/api.js), que es el único que tiene el token.
// Mismos topes que TOPES de functions/api.js (allá es un primer filtro; aquí la cuenta de verdad).
const TOPES_IP = { pedido: [4, 600], comprobante: [8, 3600], verificar: [30, 3600], seguimiento: [30, 600], misPedidos: [30, 600] };
function limitePorIp_(data) {
  const ip = typeof data.ip === 'string' ? data.ip.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) : '', tope = TOPES_IP[data.accion || 'pedido'];
  if (ip && tope) limite_('ip_' + (data.accion || 'pedido') + '_' + ip, tope[0], tope[1], 'Demasiados intentos. Espera unos minutos.');
}

// Únicos mensajes de error que ve el cliente. Cualquier otro (nombres de hojas, SKU, fallos de Google) se oculta.
// Si agregas un throw nuevo que el cliente deba leer, súmalo aquí.
const MENSAJES_PUBLICOS = [
  'Demasiado grande.', 'Formato inválido.', 'Token inválido.', 'Acción desconocida.', 'Rechazado.',
  'Faltan datos del cliente.', 'Revisa el número de WhatsApp.', 'Revisa el correo.', 'Pedido vacío o demasiado grande.',
  'El comprobante debe ser foto (JPG, PNG) o PDF de menos de 5 MB.', 'Sube el comprobante de tu anticipo para enviar el pedido.',
  'Demasiados pedidos seguidos. Escríbenos por WhatsApp.', 'Estamos recibiendo muchos pedidos. Intenta en unos minutos o escríbenos por WhatsApp.',
  'Revisa el número de pedido y tu WhatsApp.', 'Demasiados intentos. Espera unos minutos.', 'No encontramos un pedido con ese número y ese WhatsApp.',
  'Ya recibimos varios comprobantes de este pedido. Escríbenos por WhatsApp.', 'Este pedido está cancelado. Escríbenos por WhatsApp.',
  'La hoja está ocupada con otro cambio. Espera unos segundos e intenta de nuevo.', 'Verificación fallida. Recarga la página e intenta de nuevo.',
  'El precio del pedido no coincide. Recarga la página e intenta de nuevo.',
];
// también son públicos los motivos de Verificacion.gs (se leen al usarse: el orden de los archivos no importa)
const esMensajePublico_ = msg => MENSAJES_PUBLICOS.includes(msg) || Object.values(MOTIVOS).includes(msg);

// cuenta en caché: más de "max" en "seg" segundos = rechazo
function limite_(clave, max, seg, msg) {
  const cache = CacheService.getScriptCache(), n = Number(cache.get(clave) || 0);
  if (n >= max) throw new Error(msg);
  cache.put(clave, String(n + 1), seg);
}

// Solo pasan los campos que conocemos, con tope de largo y formato revisado.
function limpiarPedido_(d) {
  if (d.website) throw new Error('Rechazado.'); // campo trampa: un humano no lo ve
  if (!(Number(d.fillMs) >= LIMITS.minFillMs)) throw new Error('Rechazado.'); // sin tiempo o llenado instantáneo = bot
  const c = d.customer || {};
  const customer = {
    name: linea_(c.name, 80), phone: linea_(c.phone, 25), email: linea_(c.email, 120).toLowerCase(),
    city: linea_(c.city, 60), date: linea_(c.date, 20), notes: texto_(c.notes, 1000),
  };
  if (!customer.name || !customer.city) throw new Error('Faltan datos del cliente.');
  const dig = customer.phone.replace(/\D/g, '');
  if (dig.length < 8 || dig.length > 15) throw new Error('Revisa el número de WhatsApp.');
  if (customer.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(customer.email)) throw new Error('Revisa el correo.');
  if (!Array.isArray(d.items) || !d.items.length || d.items.length > LIMITS.items) throw new Error('Pedido vacío o demasiado grande.');
  const num = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0));
  const items = d.items.map(it => ({
    product: linea_(it && it.product, 80) || 'Producto',
    qty: Math.round(num(it.qty, 1, 99)),
    unitPrice: num(it.unitPrice, 0, 1e6), discount: num(it.discount, 0, 1e6), total: num(it.total, 0, 1e7),
    options: (Array.isArray(it.options) ? it.options : []).slice(0, LIMITS.options)
      .map(o => Array.isArray(o) ? [linea_(o[0], 60), texto_(o[1], 240)] : [texto_(o, 240), '']),
    bom: (Array.isArray(it.bom) ? it.bom : []).slice(0, 200).map(b => ({ key: linea_(b && b.key, 160), qty: Math.round(num(b && b.qty, 1, 999)) })).filter(b => b.key),
    preview: typeof it.preview === 'string' ? it.preview : '',
    images: (Array.isArray(it.images) ? it.images : []).filter(x => typeof x === 'string').slice(0, LIMITS.imagesPerItem),
  }));
  return { customer, items, total: num(d.total, 0, 1e7), currency: /^[A-Z]{3}$/.test(d.currency) ? d.currency : 'HNL',
    comprobante: typeof d.comprobante === 'string' ? d.comprobante : '',
    ficha: typeof d.ficha === 'string' ? d.ficha.slice(0, 40) : '', pagador: linea_(d.pagador, 80) };
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// Turnstile (opcional): si la propiedad de script TURNSTILE_SECRET existe, el pedido debe traer un token válido.
// Sin la propiedad no se pide nada (ver apps-script/README.md › Turnstile).
// portero = true: el portero de Cloudflare ya lo revisó (un token de Turnstile sirve una sola vez). Solo él tiene el token del sitio.
function verificarTurnstile_(token, portero) {
  if (portero === true) return;
  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) return;
  const falla = new Error('Verificación fallida. Recarga la página e intenta de nuevo.');
  token = String(token || '');
  if (!token || token.length > 2048) throw falla;
  let r;
  try {
    r = JSON.parse(UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'post', payload: { secret, response: token }, muteHttpExceptions: true }).getContentText());
  } catch (err) { console.error('Turnstile no respondió:', err); throw falla; } // sin respuesta = no pasa
  if (!r || r.success !== true) throw falla;
}

// Lo lento (Drive, OCR, correo) va FUERA del candado; dentro solo ID, filas y stock.
// Si algo falla antes de guardar el pedido, la carpeta temporal se manda a la papelera (si no se puede, queda huérfana sin daño).
// Pasos: validar -> verificar comprobante (antes de crear nada) -> fotos (sin candado) -> filas (con candado) -> correo.
function recibirPedido_(raw, cfg) {
  const d = limpiarPedido_(raw), c = d.customer;
  validarPedido_(raw, d, cfg);
  const esperado = anticipoDe_(d.total, cfg);
  const anticipo = verificarAnticipo_(d, esperado, cfg); // si no pasa y Config dice Rechazar, aquí termina
  const folder = folder_().createFolder(`Nuevo · ${String(c.name).slice(0, 40)}`);
  const estado = { guardado: false }; // pasa a true cuando la fila del pedido ya está en la hoja
  try {
    const partidas = subirFotos_(folder, d);
    const leido = guardarAnticipo_(folder, d, anticipo);
    const { id, pago } = conCandado_(() => guardarFilas_(d, folder, partidas, leido, esperado, estado));
    avisarCliente_(id, d, partidas, cfg, pago, esperado);
    return { id, pago };
  } catch (err) {
    if (!estado.guardado) { try { folder.setTrashed(true); } catch (e) { /* queda huérfana: sin daño */ } }
    throw err;
  }
}

// comprobante (si el anticipo es antes de enviar), anti-bots y límites por contacto y por hora
function validarPedido_(raw, d, cfg) {
  if (d.comprobante && !comprobanteValido_(d.comprobante)) throw new Error('El comprobante debe ser foto (JPG, PNG) o PDF de menos de 5 MB.');
  if (!d.comprobante && yes_(cfg['Anticipo antes de enviar'] ?? 'Sí')) throw new Error('Sube el comprobante de tu anticipo para enviar el pedido.');
  verificarTurnstile_(raw.turnstile, raw.portero);
  limite_('p_' + telKey_(d.customer.phone), LIMITS.perContact, 600, 'Demasiados pedidos seguidos. Escríbenos por WhatsApp.');
  limite_('p_hora', LIMITS.perHour, 3600, 'Estamos recibiendo muchos pedidos. Intenta en unos minutos o escríbenos por WhatsApp.');
  if (d.total + 1 < totalMinimo_(d.items)) throw new Error('El precio del pedido no coincide. Recarga la página e intenta de nuevo.');
}
// Lo mínimo que puede costar el pedido: sus piezas a precio de catálogo, con el descuento por volumen más alto (10 %)
// y algo de margen. Un total bajado a mano en el navegador (para pagar menos anticipo) no pasa.
function totalMinimo_(items) {
  const precio = {}; CATALOGO_PIEZAS.forEach(p => { precio[p[0]] = Number(p[3]) || 0; });
  const suma = consumoDePedido_(items).reduce((s, x) => s + (precio[x.sku] || 0) * x.qty, 0);
  return Math.floor(suma * 0.85);
}
// 1) sin candado: la vista previa y las fotos del cliente de cada producto, guardadas en Drive
function subirFotos_(folder, d) {
  return d.items.map((it, i) => {
    const prev = it.preview ? guardarImagen_(folder, it.preview, `${i + 1} vista previa`) : null;
    const subidas = (it.images || []).slice(0, 4).map((src, j) => guardarImagen_(folder, src, `${i + 1} imagen cliente ${j + 1}`)).filter(Boolean);
    return { it, prev, subidas };
  });
}
// comprobante del anticipo: reusa la ficha de "verificar" (mismo archivo y total) o lo lee ahora
function verificarAnticipo_(d, esperado, cfg) {
  if (!d.comprobante) return null;
  const lectura = lecturaDeFicha_(d.ficha, d.comprobante, d.total) || leerComprobante_(d.comprobante);
  const revision = revisarComprobante_(lectura, esperado, d.total, cfg, [d.customer.name, d.pagador]);
  if (!revision.ok && rechazarSinVerificar_(cfg)) throw new Error(revision.motivo);
  return { lectura, revision };
}
// guarda el archivo del comprobante en la carpeta del pedido; si Drive falla, el pedido sigue
function guardarAnticipo_(folder, d, anticipo) {
  if (!anticipo) return null;
  try { return { archivo: guardarComprobante_(folder, d.comprobante), ...anticipo }; }
  catch (err) { console.error('Comprobante no guardado:', err); return null; }
}

// 2) con candado: ID, filas y stock
function guardarFilas_(d, folder, partidas, leido, esperado, estado) {
  const c = d.customer, id = nuevoId_();
  folder.setName(`${id} · ${String(c.name).slice(0, 40)}`);
  const fecha = now_();
  const piezas = consumoDePedido_(d.items);
  anotarPedido_(id, fecha, d, folder, partidas, piezas, estado);
  anotarPartidas_(id, partidas);
  // anticipo que mandó junto con el pedido
  let pago = null;
  if (leido) {
    try { pago = anotarPago_({ ID: id }, leido, esperado); }
    catch (err) { console.error('Pago no anotado:', err); }
  }
  // claves nuevas que todavía no tienen pieza asignada
  registrarClavesNuevas_(d.items);
  try { guardarCliente_(c, fecha); } catch (err) { console.error(err); } // nunca frena un pedido
  return { id, pago };
}
// hoja Pedidos: una fila con el resumen, la carpeta de Drive y la disponibilidad de piezas
function anotarPedido_(id, fecha, d, folder, partidas, piezas, estado) {
  const c = d.customer, disp = disponibilidad_(piezas);
  const textoProductos = d.items.map(it => `${it.qty} × ${it.product}`).join('\n');
  const textoPiezas = piezas.map(p => `${p.qty} × ${p.sku} ${p.name || ''}`.trim()).join('\n') || '(sin receta)';
  const sh = sheet_('pedidos');
  const row = [id, fecha, 'Nuevo', c.name, c.phone, c.email, c.city, c.date, textoProductos, textoPiezas,
    d.total, d.currency, '', folder.getUrl(), disp.texto, c.notes, '', fecha,
    datosJson_({ items: d.items.map(stripImages_), piezas, descontado: false }), ''];
  sh.appendRow(fila_(row));
  estado.guardado = true;
  const r = sh.getLastRow();
  if (partidas[0] && partidas[0].prev) ponerImagen_(sh.getRange(r, COL.pedidos['Vista previa']), partidas[0].prev);
  sh.setRowHeight(r, 110);
}
// hoja Partidas: una fila por producto del pedido
function anotarPartidas_(id, partidas) {
  const sp = sheet_('partidas');
  partidas.forEach(({ it, prev, subidas }, i) => {
    sp.appendRow(fila_([id, i + 1, it.product, it.qty, it.unitPrice, it.discount, it.total, opcionesTexto_(it.options), '',
      subidas.map(s => s.url).join('\n'), prev ? prev.url : '']));
    const pr = sp.getLastRow();
    if (prev) ponerImagen_(sp.getRange(pr, COL.partidas['Vista previa']), prev);
    sp.setRowHeight(pr, 110);
  });
}

// 3) sin candado: un solo correo al cliente; si falla o no hay cuota, el pedido ya quedó guardado y se anota en la hoja
function avisarCliente_(id, d, partidas, cfg, pago, esperado) {
  let marca;
  try { marca = correoCliente_(id, d, partidas, cfg, pago, !!d.comprobante, esperado); }
  catch (err) { console.error('Correo no enviado:', err); marca = 'Falló: ' + linea_(err && err.message || err, 80); }
  try {
    conCandado_(() => {
      const fila = rows_('pedidos').find(p => String(p.ID) === id);
      if (fila) sheet_('pedidos').getRange(fila._row, COL.pedidos['Correo cliente']).setValue(celda_(marca));
    });
  } catch (err) { console.error(err); }
}

// ficha del cliente (una por WhatsApp); las notas y etiquetas se editan en el CRM
function guardarCliente_(c, fecha) {
  const sh = hojaClientes_(); if (!sh) return;
  const key = telKey_(c.phone), cur = rows_('clientes').find(r => telKey_(r.WhatsApp) === key);
  if (cur) {
    sh.getRange(cur._row, 2, 1, 3).setValues([fila_([c.name || cur.Nombre, c.email || cur.Correo, c.city || cur.Ciudad])]);
    sh.getRange(cur._row, COL.clientes['Último pedido']).setValue(fecha);
  } else {
    sh.appendRow(fila_(["'" + key, c.name, c.email, c.city, fecha, fecha, '', '']));
  }
}

// PEHN-AAMMDD-001. Toma el número más alto del día (no la cuenta): borrar una fila no repite IDs.
function nuevoId_() {
  const tz = Session.getScriptTimeZone();
  const pre = 'PEHN-' + Utilities.formatDate(now_(), tz, 'yyMMdd') + '-';
  const max = rows_('pedidos').reduce((m, p) => String(p.ID).startsWith(pre) ? Math.max(m, Number(String(p.ID).slice(pre.length)) || 0) : m, 0);
  return pre + String(max + 1).padStart(3, '0');
}

const stripImages_ = it => ({ product: it.product, qty: it.qty, unitPrice: it.unitPrice, total: it.total, options: it.options, bom: it.bom });

function opcionesTexto_(opts) {
  return (opts || []).map(o => Array.isArray(o) ? `${o[0]}: ${o[1]}` : String(o)).join('\n');
}

// Una celda de Sheets aguanta 50 000 letras. Si un pedido gigante se pasa, se guarda sin opciones
// (el detalle completo sigue en Partidas).
function datosJson_(o) {
  const s = JSON.stringify(o);
  return s.length < 49000 ? s : JSON.stringify({ ...o, items: o.items.map(it => ({ ...it, options: [] })), recortado: true });
}

// data:image/...;base64,... -> archivo privado en la carpeta del pedido.
// Solo fotos comunes (no SVG: puede traer código) y base64 válido.
const TIPOS_OK = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
// Los primeros bytes del archivo deben coincidir con el tipo que dice ser (un "PNG" que es otra cosa se rechaza).
function firmaOk_(mime, b64) {
  let b;
  try { b = Array.from(Utilities.base64Decode(String(b64).slice(0, 16))).map(x => x & 255); } catch (e) { return false; }
  const igual = (i, arr) => arr.every((v, j) => b[i + j] === v);
  const letras = (i, t) => igual(i, Array.from(t, ch => ch.charCodeAt(0)));
  switch (mime) {
    case 'image/jpeg': return igual(0, [0xFF, 0xD8, 0xFF]);
    case 'image/png': return igual(0, [0x89, 0x50, 0x4E, 0x47]);
    case 'image/webp': return letras(0, 'RIFF') && letras(8, 'WEBP');
    case 'application/pdf': return letras(0, '%PDF');
    default: return false;
  }
}
// data URL de un tipo permitido, de tamaño razonable y con firma real -> coincidencia del regex; si no, null
function dataUrlValido_(s) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ''));
  return m && TIPOS_OK[m[1]] && m[2].length <= LIMITS.imageChars && firmaOk_(m[1], m[2]) ? m : null;
}
function guardarImagen_(folder, dataUrl, name) {
  const m = dataUrlValido_(dataUrl);
  if (!m) return null;
  const ext = TIPOS_OK[m[1]];
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], `${name}.${ext}`);
  const file = folder.createFile(blob);
  return { id: file.getId(), url: file.getUrl(), dataUrl, blob };
}

// imagen dentro de la celda (no necesita hacer público el archivo); si es muy grande, deja enlace
function ponerImagen_(cell, img) {
  try {
    cell.setValue(SpreadsheetApp.newCellImage().setSourceUrl(img.dataUrl).setAltTextTitle('Vista previa').build());
  } catch (err) {
    cell.setRichTextValue(SpreadsheetApp.newRichTextValue().setText('Ver imagen').setLinkUrl(img.url).build());
  }
}

const hashCorreo_ = email => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email).trim().toLowerCase()));

// por qué NO se le escribe al cliente ('' = sí se le puede escribir)
function sinCorreoPorque_(c, cfg) {
  if (!c.email || !yes_(cfg['Confirmar al cliente por correo'])) return 'Sin correo';
  // deja 1 correo de reserva para el resumen del negocio
  if (MailApp.getRemainingDailyQuota() < 2) return 'Sin correo (sin cuota hoy)';
  // máximo 1 correo por destinatario (el token del sitio es público: así no sirve para llenar de correos a un tercero).
  // Se guarda un hash, no el correo. La caché de Google aguanta como máximo 6 h (21600 s).
  try { limite_('m_' + hashCorreo_(c.email), 1, 21600, 'ya'); } catch (err) { return 'Sin correo (ya se le escribió hoy)'; }
  return '';
}
// tabla de productos del correo (con su vista previa en línea) y el total
function tablaCorreo_(d, partidas, inline) {
  const moneda = d.currency;
  const bloques = partidas.map(({ it, prev }, i) => {
    if (prev) inline['p' + i] = prev.blob.setName('p' + i);
    return `<tr><td style="padding:12px 0;vertical-align:top;width:130px">${prev ? `<img src="cid:p${i}" width="120" style="border-radius:10px;display:block">` : ''}</td>
      <td style="padding:12px;vertical-align:top"><b>${esc_(it.qty)} × ${esc_(it.product)}</b><br>
      <span style="color:#5C4C41;font-size:13px">${esc_(opcionesTexto_(it.options)).replace(/\n/g, '<br>')}</span><br><b>${money_(it.total, moneda)}</b></td></tr>`;
  }).join('');
  return `<table style="width:100%;border-collapse:collapse">${bloques}</table><p style="font-size:16px"><b>Total: ${money_(d.total, moneda)}</b></p>`;
}
// qué se le dice del anticipo: recibido, en verificación o cómo pagarlo
function estadoPagoCorreo_(d, cfg, pago, subioComprobante, anticipo) {
  const pct = Number(cfg['Anticipo (%)']) || 50, moneda = d.currency;
  const falta = Math.max(0, d.total - anticipo);
  let estadoPago;
  if (subioComprobante && pago && pago.resultado === 'Coincide') {
    estadoPago = `Recibimos tu anticipo de <b>${money_(anticipo, moneda)}</b> (${pct}%). Falta <b>${money_(falta, moneda)}</b>, que pagas al final cuando tu pedido esté listo.`;
  } else if (subioComprobante) {
    estadoPago = `Estamos verificando tu anticipo de <b>${money_(anticipo, moneda)}</b> (${pct}%). Te avisamos por WhatsApp cuando lo confirmemos. El resto (<b>${money_(falta, moneda)}</b>) lo pagas al final, cuando tu pedido esté listo.`;
  } else {
    const banco = cfg['Datos bancarios'] ? `<br>${esc_(cfg['Datos bancarios'])}` : '';
    estadoPago = `Para empezar paga el ${pct}% (<b>${money_(anticipo, moneda)}</b>) y súbelo en Mis pedidos o mándalo por WhatsApp.${banco}<br>El resto (<b>${money_(falta, moneda)}</b>) lo pagas al final, cuando tu pedido esté listo.`;
  }
  return estadoPago;
}

// Correo al cliente: uno solo por pedido. Devuelve la marca que se guarda en "Correo cliente":
// 'Enviado' / 'Sin correo' / 'Sin correo (sin cuota hoy)'. Si el envío truena, lanza error (lo anota quien llama).
function correoCliente_(id, d, partidas, cfg, pago, subioComprobante, anticipo) {
  const c = d.customer, motivo = sinCorreoPorque_(c, cfg);
  if (motivo) return motivo;
  const negocio = cfg['Nombre del negocio'] || 'Pehn Design', inline = {};
  const tabla = tablaCorreo_(d, partidas, inline);
  const estadoPago = estadoPagoCorreo_(d, cfg, pago, subioComprobante, anticipo);

  const sitio = /^https?:\/\//i.test(String(cfg['Sitio web'] || '').trim()) ? String(cfg['Sitio web']).trim().replace(/\/+$/, '') : '';
  const rastrear = sitio ? `<p><a href="${esc_(sitio)}/pedido.html?id=${encodeURIComponent(id)}" style="color:#1E1611">Ver mi pedido en Mis pedidos →</a></p>` : '';
  const wa = cfg['WhatsApp del negocio'] ? `<p><a href="https://wa.me/${encodeURIComponent(cfg['WhatsApp del negocio'])}?text=${encodeURIComponent('Hola, mi pedido es ' + id)}" style="background:#1E1611;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block">Escribir por WhatsApp</a></p>` : '';
  MailApp.sendEmail({
    to: c.email,
    subject: `Recibimos tu pedido ${id} · ${negocio}`,
    htmlBody: `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#1E1611">
      <h2 style="font-family:Georgia,serif;font-weight:500">¡Gracias, ${esc_(c.name)}!</h2>
      <p style="margin:0">Recibimos tu pedido</p>
      <p style="font-size:26px;font-weight:700;letter-spacing:.5px;margin:4px 0 14px">${esc_(id)}</p>
      <p>Te escribimos por WhatsApp al <b>${esc_(c.phone)}</b> con tu diseño para que lo apruebes antes de producir.</p>
      ${tabla}
      <p style="background:#F4EDE4;padding:12px 14px;border-radius:10px">${estadoPago}</p>
      ${rastrear}${wa}<p style="color:#8B7B6F;font-size:12px">${esc_(negocio)} · Guarda tu número de pedido para darle seguimiento.</p></div>`,
    inlineImages: inline,
    attachments: adjuntoComprobante_(d.comprobante, id),
    name: negocio,
  });
  return 'Enviado';
}
// el comprobante del anticipo va adjunto en el mismo correo (si lo subió)
function adjuntoComprobante_(dataUrl, id) {
  const m = dataUrl && dataUrlValido_(dataUrl);
  return m ? [Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], `Comprobante anticipo ${id}.${TIPOS_OK[m[1]]}`)] : [];
}
