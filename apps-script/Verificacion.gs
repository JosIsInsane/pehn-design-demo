/**
 * Verificación de comprobantes EN EL MOMENTO (antes de aceptar un pedido o un pago).
 * El sitio llama a "verificar" apenas el cliente sube el archivo; el pedido reusa ese resultado (ficha).
 *
 * Qué revisa, en orden (el primer fallo es el motivo que ve el cliente):
 *   1. que el texto se pueda leer (OCR de Drive)          4. la cuenta del negocio (si Config › Datos bancarios tiene número)
 *   2. que parezca un comprobante (palabras de banco)     5. la fecha (si trae una, de los últimos días)
 *   3. el monto del anticipo                              6. que no se haya usado antes (mismo archivo o misma referencia)
 * Límite honesto: un OCR no prueba que el banco movió el dinero; solo descarta lo que no cuadra.
 * Config › "Comprobante que no pasa la verificación": Rechazar (por defecto) o Revisar (se acepta y queda para el CRM).
 */

const VERIF = { diasFecha: 7, minLetras: 25, fichaSeg: 1800 };

// Lo que ve el cliente cuando no pasa (cada texto está en MENSAJES_PUBLICOS de Orders.gs)
const MOTIVOS = {
  ilegible: 'No pudimos leer tu comprobante. Sube una captura clara de la pantalla de tu banco.',
  noEsComprobante: 'El archivo no parece un comprobante de transferencia. Sube la captura que te da tu banco.',
  monto: 'El monto del comprobante no coincide con tu anticipo. Revisa que transferiste la cantidad exacta.',
  cuenta: 'El comprobante no muestra nuestra cuenta. Revisa que transferiste a la cuenta indicada.',
  fecha: 'La fecha del comprobante es de hace varios días. Sube el comprobante de esta transferencia.',
  usado: 'Este comprobante ya se usó en otro pago. Si es un error, escríbenos por WhatsApp.',
  sinFicha: 'Vuelve a subir tu comprobante para verificarlo.',
};

const PALABRAS_COMPROBANTE = /transferencia|transacci[oó]n|comprobante|dep[oó]sito|pago\s+(?:exitoso|realizado|enviado)|operaci[oó]n\s+exitosa|enviado|aprobad[oa]/i;
const REFERENCIA = /(?:referencia|ref\.?|autorizaci[oó]n|n[uú]mero\s+de\s+(?:transacci[oó]n|comprobante|operaci[oó]n)|no\.?\s+de\s+(?:transacci[oó]n|operaci[oó]n))\s*[:#.]?\s*([A-Z0-9-]{5,})/i;

// ---------- entrada desde el sitio: accion "verificar" ----------
// d: { comprobante: dataUrl, total } -> { ok, monto, motivo, ficha }
function verificarDesdeSitio_(d, cfg) {
  limite_('v_hora', 200, 3600, 'Demasiados intentos. Espera unos minutos.');
  const total = Number(d.total);
  if (!(total > 0 && total < 1e6)) throw new Error('Formato inválido.');
  if (!comprobanteValido_(d.comprobante)) throw new Error('El comprobante debe ser foto (JPG, PNG) o PDF de menos de 5 MB.');
  const esperado = anticipoDe_(total, cfg);
  const lectura = leerComprobante_(d.comprobante);
  const r = revisarComprobante_(lectura, esperado, total, cfg);
  const ficha = r.ok ? guardarFicha_(lectura, total) : '';
  return { ok: r.ok, monto: r.monto, motivo: r.motivo, ficha };
}

const anticipoDe_ = (total, cfg) => Math.round(total * (Number(cfg['Anticipo (%)']) || 50) / 100);

// ---------- lectura ----------
// dataUrl -> { huella, texto (null si no se pudo leer), referencia }
function leerComprobante_(dataUrl) {
  const m = dataUrlValido_(dataUrl);
  const bytes = Utilities.base64Decode(m[2]);
  const texto = leerTexto_(Utilities.newBlob(bytes, m[1], 'comprobante'));
  return { huella: huellaDe_(bytes), texto, referencia: referenciaEn_(texto) };
}
const huellaDe_ = bytes => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes));
function referenciaEn_(texto) {
  const m = REFERENCIA.exec(String(texto || ''));
  return m ? m[1].toUpperCase() : '';
}

// ---------- reglas ----------
// -> { ok, monto, motivo, nota } ; motivo es el texto público del primer fallo
function revisarComprobante_(lectura, esperado, total, cfg) {
  const texto = lectura.texto;
  const falla = (clave, monto) => ({ ok: false, monto: monto == null ? null : monto, motivo: MOTIVOS[clave], nota: clave });
  if (texto == null || (texto.match(/[a-záéíóúñ]/gi) || []).length < VERIF.minLetras) return falla('ilegible');
  if (!PALABRAS_COMPROBANTE.test(texto)) return falla('noEsComprobante');
  const monto = esperado > 0 ? montoQueCuadra_(montosEn_(texto), esperado, total) : 0; // sin monto a pagar no hay nada que cuadrar
  if (monto == null) return falla('monto', elegirMonto_(montosEn_(texto), esperado));
  if (!muestraLaCuenta_(texto, cfg['Datos bancarios'])) return falla('cuenta', monto);
  if (!fechaReciente_(texto)) return falla('fecha', monto);
  if (yaUsado_(lectura)) return falla('usado', monto);
  return { ok: true, monto, motivo: '', nota: 'verificado' };
}

// monto igual al anticipo (±1), o algo entre el anticipo y el total marcado como dinero (pagó de más)
function montoQueCuadra_(montos, esperado, total) {
  const igual = montos.find(m => Math.abs(m.n - esperado) <= 1);
  if (igual) return igual.n;
  const entre = montos.filter(m => m.moneda && m.n >= esperado && m.n <= total + 1);
  return entre.length ? Math.max(...entre.map(m => m.n)) : null;
}

// Si Datos bancarios trae un número de cuenta (6+ dígitos), sus últimos 4 deben aparecer en el comprobante
function muestraLaCuenta_(texto, datosBancarios) {
  const cuenta = (String(datosBancarios || '').replace(/[\s-]/g, '').match(/\d{6,}/g) || []).sort((a, b) => b.length - a.length)[0];
  if (!cuenta) return true; // sin cuenta configurada no se puede revisar
  return String(texto).replace(/[\s-]/g, '').includes(cuenta.slice(-4));
}

// Si el texto trae fechas (dd/mm/aaaa, dd-mm-aa o "27 oct 2026"), al menos una debe ser de los últimos días
function fechaReciente_(texto) {
  const fechas = fechasEn_(texto);
  if (!fechas.length) return true;
  const hoy = now_().getTime(), dia = 864e5;
  return fechas.some(f => f.getTime() <= hoy + dia && hoy - f.getTime() <= VERIF.diasFecha * dia);
}
const MESES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, set: 8, oct: 9, nov: 10, dic: 11 };
function fechasEn_(texto) {
  const out = [], t = String(texto || ''), anio = a => (a < 100 ? 2000 + a : a);
  let m;
  const num = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g;
  while ((m = num.exec(t))) out.push(new Date(anio(+m[3]), +m[2] - 1, +m[1]));
  const txt = /\b(\d{1,2})\s*(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)[a-z]*\.?\s*(?:de\s+)?(\d{4})\b/gi;
  while ((m = txt.exec(t))) out.push(new Date(+m[3], MESES[m[2].toLowerCase()], +m[1]));
  return out.filter(f => !isNaN(f) && f.getMonth() >= 0);
}

// mismo archivo o misma referencia ya registrados en Pagos (columna Huella)
function yaUsado_(lectura) {
  const marcas = rows_('pagos').map(p => String(p.Huella || ''));
  return marcas.some(h => h.includes('sha:' + lectura.huella) || (lectura.referencia && h.includes('ref:' + lectura.referencia)));
}
const marcaDe_ = lectura => `sha:${lectura.huella}${lectura.referencia ? ' ref:' + lectura.referencia : ''}`;

// ---------- ficha: el resultado de "verificar" se reusa al enviar el pedido (sin repetir el OCR) ----------
function guardarFicha_(lectura, total) {
  const ficha = Utilities.getUuid();
  CacheService.getScriptCache().put('f_' + ficha, JSON.stringify({ huella: lectura.huella, texto: String(lectura.texto).slice(0, 4000), referencia: lectura.referencia, total }), VERIF.fichaSeg);
  return ficha;
}
// La ficha solo vale para el MISMO archivo y el MISMO total; si no, se lee de nuevo
function lecturaDeFicha_(ficha, dataUrl, total) {
  const json = ficha && CacheService.getScriptCache().get('f_' + String(ficha).slice(0, 40));
  if (!json) return null;
  const f = JSON.parse(json), m = dataUrlValido_(dataUrl);
  if (!m || f.total !== total || f.huella !== huellaDe_(Utilities.base64Decode(m[2]))) return null;
  return { huella: f.huella, texto: f.texto, referencia: f.referencia };
}

// ¿se rechaza lo que no pasa? (Config › Comprobante que no pasa la verificación)
const rechazarSinVerificar_ = cfg => String(cfg['Comprobante que no pasa la verificación'] || 'Rechazar').trim().toLowerCase() !== 'revisar';
