/**
 * Recepción de pedidos del sitio (doPost): guarda fotos en Drive,
 * escribe Pedidos y Partidas, revisa stock y manda correos.
 *
 * SI EL SITIO DICE "No se pudo enviar":
 *   "Token inválido"   -> el token de app.js no es el de Config › Token del sitio (Pehn › Ver URL y token).
 *   "Respuesta inválida" -> la app web no está publicada para "Cualquier usuario" o la URL de app.js es vieja.
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
    switch (data.accion || 'pedido') {
      case 'pedido': return json_({ ok: true, id: recibirPedido_(data, cfg).id });
      case 'seguimiento': return json_({ ok: true, pedido: seguimiento_(data) });
      case 'comprobante': return json_({ ok: true, pago: recibirComprobante_(data, cfg) });
      default: throw new Error('Acción desconocida.');
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err.message || err) });
  }
}

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
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error('Revisa el correo.');
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
  return { customer, items, total: num(d.total, 0, 1e7), currency: /^[A-Z]{3}$/.test(d.currency) ? d.currency : 'HNL' };
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function recibirPedido_(raw, cfg) {
  const d = limpiarPedido_(raw), c = d.customer;
  limite_('p_' + telKey_(c.phone), LIMITS.perContact, 600, 'Demasiados pedidos seguidos. Escríbenos por WhatsApp.');
  limite_('p_hora', LIMITS.perHour, 3600, 'Estamos recibiendo muchos pedidos. Intenta en unos minutos o escríbenos por WhatsApp.');

  return conCandado_(() => {
    const id = nuevoId_();
    const folder = folder_().createFolder(`${id} · ${String(c.name).slice(0, 40)}`);
    const fecha = now_();

    // imágenes: vista previa por partida + archivos que subió el cliente
    const partidas = d.items.map((it, i) => {
      const prev = it.preview ? guardarImagen_(folder, it.preview, `${i + 1} vista previa`) : null;
      const subidas = (it.images || []).slice(0, 4).map((src, j) => guardarImagen_(folder, src, `${i + 1} imagen cliente ${j + 1}`)).filter(Boolean);
      return { it, prev, subidas };
    });

    const piezas = consumoDePedido_(d.items);
    const disp = disponibilidad_(piezas);
    const textoProductos = d.items.map(it => `${it.qty} × ${it.product}`).join('\n');
    const textoPiezas = piezas.map(p => `${p.qty} × ${p.sku} ${p.name || ''}`.trim()).join('\n') || '(sin receta)';

    // Pedidos
    const sh = sheet_('pedidos');
    const row = [id, fecha, 'Nuevo', c.name, c.phone, c.email, c.city, c.date, textoProductos, textoPiezas,
      d.total, d.currency, '', folder.getUrl(), disp.texto, c.notes, '', fecha,
      datosJson_({ items: d.items.map(stripImages_), piezas, descontado: false })];
    sh.appendRow(fila_(row));
    const r = sh.getLastRow();
    if (partidas[0] && partidas[0].prev) ponerImagen_(sh.getRange(r, COL.pedidos['Vista previa']), partidas[0].prev);
    sh.setRowHeight(r, 110);

    // Partidas
    const sp = sheet_('partidas');
    partidas.forEach(({ it, prev, subidas }, i) => {
      sp.appendRow(fila_([id, i + 1, it.product, it.qty, it.unitPrice, it.discount, it.total, opcionesTexto_(it.options), '',
        subidas.map(s => s.url).join('\n'), prev ? prev.url : '']));
      const pr = sp.getLastRow();
      if (prev) ponerImagen_(sp.getRange(pr, COL.partidas['Vista previa']), prev);
      sp.setRowHeight(pr, 110);
    });

    // claves nuevas que todavía no tienen pieza asignada
    registrarClavesNuevas_(d.items);
    try { guardarCliente_(c, fecha); } catch (err) { console.error(err); } // nunca frena un pedido

    // si el correo falla (límite de 100 al día) el pedido ya quedó guardado
    try { correos_(id, d, partidas, disp, cfg); } catch (err) { console.error('Correo no enviado:', err); }
    return { id };
  });
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
function guardarImagen_(folder, dataUrl, name) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m || !TIPOS_OK[m[1]] || m[2].length > LIMITS.imageChars) return null;
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

function correos_(id, d, partidas, disp, cfg) {
  const negocio = cfg['Nombre del negocio'] || 'Pehn Design';
  const c = d.customer, inline = {};
  const bloques = partidas.map(({ it, prev }, i) => {
    if (prev) inline['p' + i] = prev.blob.setName('p' + i);
    return `<tr><td style="padding:12px 0;vertical-align:top;width:130px">${prev ? `<img src="cid:p${i}" width="120" style="border-radius:10px;display:block">` : ''}</td>
      <td style="padding:12px;vertical-align:top"><b>${esc_(it.qty)} × ${esc_(it.product)}</b><br>
      <span style="color:#5C4C41;font-size:13px">${esc_(opcionesTexto_(it.options)).replace(/\n/g, '<br>')}</span><br><b>${money_(it.total, d.currency)}</b></td></tr>`;
  }).join('');
  const tabla = `<table style="width:100%;border-collapse:collapse">${bloques}</table><p style="font-size:16px"><b>Total estimado: ${money_(d.total, d.currency)}</b></p>`;

  if (c.email && yes_(cfg['Confirmar al cliente por correo'])) {
    const wa = cfg['WhatsApp del negocio'] ? `<p><a href="https://wa.me/${cfg['WhatsApp del negocio']}?text=${encodeURIComponent('Hola, mi pedido es ' + id)}" style="background:#1E1611;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;display:inline-block">Escribir por WhatsApp</a></p>` : '';
    MailApp.sendEmail({
      to: c.email,
      subject: `Recibimos tu pedido ${id} · ${negocio}`,
      htmlBody: `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#1E1611">
        <h2 style="font-family:Georgia,serif;font-weight:500">¡Gracias, ${esc_(c.name)}!</h2>
        <p>Tu pedido <b>${id}</b> ya está con nosotros. Te escribimos por WhatsApp al <b>${esc_(c.phone)}</b> con tu diseño para que lo apruebes antes de producir.</p>
        ${tabla}${wa}<p style="color:#8B7B6F;font-size:12px">${negocio} · No se cobra nada hasta que apruebes tu diseño.</p></div>`,
      inlineImages: inline,
      name: negocio,
    });
  }
  const to = cfg['Correo del negocio'];
  if (to) {
    MailApp.sendEmail({
      to,
      subject: `Nuevo pedido ${id} · ${c.name} · ${money_(d.total, d.currency)}`,
      htmlBody: `<div style="font-family:system-ui,sans-serif;max-width:620px">
        <p><b>${esc_(c.name)}</b> · ${esc_(c.phone)} · ${esc_(c.email || 'sin correo')} · ${esc_(c.city)}${c.date ? ' · para el ' + esc_(c.date) : ''}</p>
        ${c.notes ? `<p style="background:#FBEFC4;padding:10px;border-radius:8px">${esc_(c.notes)}</p>` : ''}
        <p>Stock: <b>${esc_(disp.texto)}</b></p>${tabla}
        <p><a href="${ss_().getUrl()}">Abrir la hoja</a></p></div>`,
      inlineImages: inline,
    });
  }
}
