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

const LIMITS = { items: 20, imageChars: 7e6, perContact: 5 };

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Formato inválido.' }); }
  try {
    const res = recibirPedido_(data);
    return json_({ ok: true, id: res.id });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function recibirPedido_(d) {
  const cfg = config_();
  if (!cfg['Token del sitio'] || d.token !== cfg['Token del sitio']) throw new Error('Token inválido.');
  if (d.website) throw new Error('Rechazado.'); // campo trampa para bots
  const c = d.customer || {};
  ['name', 'phone', 'city'].forEach(k => { if (!String(c[k] || '').trim()) throw new Error('Faltan datos del cliente.'); });
  if (!Array.isArray(d.items) || !d.items.length || d.items.length > LIMITS.items) throw new Error('Pedido vacío o demasiado grande.');

  // máximo N pedidos por contacto cada 10 minutos
  const cache = CacheService.getScriptCache(), ck = 'p_' + String(c.phone).replace(/\D/g, '');
  const n = Number(cache.get(ck) || 0);
  if (n >= LIMITS.perContact) throw new Error('Demasiados pedidos seguidos. Escríbenos por WhatsApp.');
  cache.put(ck, String(n + 1), 600);

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
    const row = [id, fecha, 'Nuevo', c.name, c.phone, c.email || '', c.city, c.date || '', textoProductos, textoPiezas,
      Number(d.total) || 0, d.currency || 'HNL', '', folder.getUrl(), disp.texto, c.notes || '', '', fecha,
      JSON.stringify({ items: d.items.map(stripImages_), piezas, descontado: false })];
    sh.appendRow(row);
    const r = sh.getLastRow();
    if (partidas[0] && partidas[0].prev) ponerImagen_(sh.getRange(r, COL.pedidos['Vista previa']), partidas[0].prev);
    sh.setRowHeight(r, 110);

    // Partidas
    const sp = sheet_('partidas');
    partidas.forEach(({ it, prev, subidas }, i) => {
      sp.appendRow([id, i + 1, it.product, it.qty, it.unitPrice, it.discount, it.total, opcionesTexto_(it.options), '',
        subidas.map(s => s.url).join('\n'), prev ? prev.url : '']);
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
    sh.getRange(cur._row, 2, 1, 3).setValues([[c.name || cur.Nombre, c.email || cur.Correo, c.city || cur.Ciudad]]);
    sh.getRange(cur._row, COL.clientes['Último pedido']).setValue(fecha);
  } else {
    sh.appendRow(["'" + key, c.name, c.email || '', c.city || '', fecha, fecha, '', '']);
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

// data:image/...;base64,... -> archivo privado en la carpeta del pedido
function guardarImagen_(folder, dataUrl, name) {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m || m[2].length > LIMITS.imageChars) return null;
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
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
