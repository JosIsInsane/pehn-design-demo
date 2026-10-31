/**
 * EDITOR DEL SITIO en vivo (pehn-design-demo.pages.dev/admin): los dueños cambian textos, colores y fotos
 * y ven la página real al lado, cambiando mientras escriben.
 *
 * Verificación en dos pasos, sin claves que se puedan filtrar:
 *   1. Escriben su correo. Solo si está en Config › Admins (o es el Correo del negocio) les llega un código de 6 cifras.
 *      Al sitio siempre se le contesta lo mismo (no revela qué correos son admins).
 *   2. Con el código (vale 10 minutos, 5 intentos) reciben una sesión de 6 horas (solo vive en la caché de Apps Script).
 * Todo entra por el portero de Cloudflare (functions/api.js), que ya limita por IP.
 * Guarda con lo mismo que el CRM (Sitio.gs › guardarSitio_ y subirImagenSitio_) y anota cada cambio en Movimientos.
 */

const EDITOR = { codigoSeg: 600, intentos: 5, sesionSeg: 21600, codigosPorCorreo: 3 };
// máximo por IP en N segundos (los usa limitePorIp_ de Orders.gs; los mismos que TOPES de functions/api.js)
const TOPES_EDITOR = { editorCodigo: [5, 600], editorEntrar: [10, 600], editorDatos: [60, 600], editorGuardar: [60, 600], editorFoto: [20, 600] };

const correoEditor_ = v => String(v || '').trim().toLowerCase().slice(0, 120);
function esEditor_(correo) {
  const cfg = config_();
  const lista = String(cfg['Admins'] || '').toLowerCase().split(/[,\s]+/).concat(String(cfg['Correo del negocio'] || '').toLowerCase()).filter(Boolean);
  return !!correo && lista.indexOf(correo) >= 0;
}
const huellaEditor_ = s => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('').slice(0, 40);

// paso 1: manda el código (si el correo es de un admin)
function editorCodigo_(d) {
  const correo = correoEditor_(d.correo);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Revisa el correo.');
  limite_('edc_' + huellaEditor_(correo), EDITOR.codigosPorCorreo, EDITOR.codigoSeg, 'Demasiados intentos. Espera unos minutos.');
  if (!esEditor_(correo)) return { enviado: true }; // misma respuesta: no se sabe quién es admin
  const codigo = String(100000 + Math.floor(Math.random() * 900000));
  CacheService.getScriptCache().put('edk_' + huellaEditor_(correo), JSON.stringify({ h: huellaEditor_(codigo), n: 0 }), EDITOR.codigoSeg);
  MailApp.sendEmail({
    to: correo, subject: `Tu código para editar el sitio: ${codigo}`,
    htmlBody: `<div style="font:15px/1.6 system-ui,sans-serif;max-width:460px"><p>Tu código para entrar al editor del sitio de Pehn Design:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:12px 0">${codigo}</p>
      <p style="color:#76675C">Vale 10 minutos. Si no fuiste tú, ignora este correo: sin el código nadie puede entrar.</p></div>`,
  });
  return { enviado: true };
}

// paso 2: revisa el código y abre la sesión
function editorEntrar_(d) {
  const correo = correoEditor_(d.correo), cache = CacheService.getScriptCache(), k = 'edk_' + huellaEditor_(correo);
  const guardado = JSON.parse(cache.get(k) || 'null'), codigo = String(d.codigo || '').replace(/\D/g, '');
  const falla = new Error('Código incorrecto o vencido. Pide otro.');
  if (!guardado || guardado.n >= EDITOR.intentos || codigo.length !== 6) throw falla;
  if (guardado.h !== huellaEditor_(codigo)) { guardado.n++; cache.put(k, JSON.stringify(guardado), EDITOR.codigoSeg); throw falla; }
  cache.remove(k); // un código sirve una sola vez
  const sesion = nuevaClave_(32);
  cache.put('eds_' + huellaEditor_(sesion), correo, EDITOR.sesionSeg);
  return { sesion, correo, campos: sitioCrm_() };
}

// sesión válida → correo del editor; si no, error (el sitio vuelve a pedir el código)
function editorSesion_(d) {
  const correo = CacheService.getScriptCache().get('eds_' + huellaEditor_(String(d.sesion || '').slice(0, 64)));
  if (!correo || !esEditor_(correo)) throw new Error('Tu sesión venció. Entra otra vez.');
  return correo;
}
function editorDatos_(d) { editorSesion_(d); return { campos: sitioCrm_() }; }
function editorGuardar_(d) {
  const correo = editorSesion_(d);
  conCandado_(() => guardarSitio_(d.cambios));
  try {
    const claves = (d.cambios || []).map(c => String(c && c.clave)).join(', ').slice(0, 300);
    sheet_('movimientos').appendRow(fila_([now_(), '', '', '', '', 'Sitio web: ' + claves, '', correo]));
  } catch (e) { /* el registro no frena el guardado */ }
  return { campos: sitioCrm_() };
}
function editorFoto_(d) { editorSesion_(d); return { url: subirImagenSitio_(String(d.dataUrl || '')) }; }

// acciones que doPost (Orders.gs) pasa aquí. Se resuelven al llamarlas: así no importa el orden de carga de los .gs
const EDITOR_ACCIONES = {
  editorCodigo: d => editorCodigo_(d), editorEntrar: d => editorEntrar_(d), editorDatos: d => editorDatos_(d),
  editorGuardar: d => editorGuardar_(d), editorFoto: d => editorFoto_(d),
};
