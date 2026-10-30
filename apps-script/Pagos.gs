/**
 * "Mi pedido" en el sitio: el cliente ve el estado de su pedido y sube el comprobante del anticipo.
 * - Para ver un pedido se pide el número de pedido Y el WhatsApp con el que se hizo. Si no coinciden
 *   se responde lo mismo que si no existiera (así nadie puede adivinar pedidos ajenos).
 * - Nunca se devuelve nombre, correo, ciudad ni notas: solo estado, productos y montos.
 * - El comprobante se verifica en el momento (Verificacion.gs): si no pasa, se rechaza o queda en revisión
 *   según Config. "Coincide" = pasó todas las reglas; el CRM › Pagos permite confirmar a mano.
 *
 * SI NO LEE EL MONTO ("Sin lectura" / "No pudimos leer"): Pehn › Probar lectura de comprobantes (Ocr.gs) dice por qué.
 */

const PAGO_OK = ['Coincide', 'Confirmado']; // estos cuentan como pagado
const PAGO_TOPES = { porPedido: 15, comprobantes: 5 };

// número de pedido + WhatsApp -> fila del pedido, o error genérico
function pedidoDeCliente_(d) {
  const id = linea_(d.id, 30).toUpperCase(), tel = telKey_(d.phone);
  if (!/^PEHN-[\w-]{3,24}$/.test(id) || tel.length < 8) throw new Error('Revisa el número de pedido y tu WhatsApp.');
  limite_('s_' + id, PAGO_TOPES.porPedido, 600, 'Demasiados intentos. Espera unos minutos.');
  const p = rows_('pedidos').find(x => String(x.ID).toUpperCase() === id);
  // compara los últimos 8 dígitos: así da igual si escribió +504 o no
  if (!p || telKey_(p.WhatsApp).slice(-8) !== tel.slice(-8)) throw new Error('No encontramos un pedido con ese número y ese WhatsApp.');
  return p;
}

function pagosDe_(id) { return rows_('pagos').filter(x => String(x.Pedido) === String(id)); }

// ---------- candado de producción ----------
// Solo cuenta lo que confirmó una persona en CRM › Pagos (después de verlo en la app del banco).
// "Coincide" (lectura automática) NO alcanza: una captura editada podría pasar la lectura.
const confirmadoDe_ = id => pagosDe_(id).filter(x => x.Resultado === 'Confirmado').reduce((s, x) => s + (Number(x['Monto leído']) || 0), 0);
// '' si el pedido puede pasar a "nuevo"; si no, el motivo
function candadoDeEstado_(p, nuevo, cfg) {
  if (!yes_(cfg['Candado de producción'] ?? 'Sí') || nuevo === 'Cancelado') return '';
  const i = ESTADOS.indexOf(nuevo), total = Number(p.Total) || 0, pagado = confirmadoDe_(p.ID);
  const anticipo = Math.round(total * (Number(cfg['Anticipo (%)']) || 50) / 100);
  if (i >= ESTADOS.indexOf('Enviado') && pagado + 1 < total) return `Falta confirmar el saldo: confirmado ${money_(pagado, p.Moneda)} de ${money_(total, p.Moneda)} (CRM › Pagos).`;
  if (i >= ESTADOS.indexOf('En producción') && pagado + 1 < anticipo) return `No se puede producir sin el anticipo confirmado: confirmado ${money_(pagado, p.Moneda)} de ${money_(anticipo, p.Moneda)} (CRM › Pagos).`;
  return '';
}

function resumenPago_(p, cfg) {
  const total = Number(p.Total) || 0, pct = Number(cfg['Anticipo (%)']) || 50;
  const pagado = pagosDe_(p.ID).filter(x => PAGO_OK.includes(x.Resultado)).reduce((s, x) => s + (Number(x['Monto leído']) || 0), 0);
  const anticipo = Math.round(total * pct / 100);
  return { total, pct, anticipo, pagado, porPagarAnticipo: Math.max(0, anticipo - pagado), saldo: Math.max(0, total - pagado) };
}

function seguimiento_(d) {
  const cfg = config_(), p = pedidoDeCliente_(d), pago = resumenPago_(p, cfg);
  const fecha = p.Fecha instanceof Date ? Utilities.formatDate(p.Fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
  return {
    id: String(p.ID), estado: String(p.Estado || 'Nuevo'), fecha, productos: String(p.Productos || ''),
    moneda: String(p.Moneda || 'HNL'), ...pago,
    banco: String(cfg['Datos bancarios'] || ''),
    comprobantes: pagosDe_(p.ID).map(x => ({ resultado: String(x.Resultado), monto: Number(x['Monto leído']) || 0 })),
  };
}

function recibirComprobante_(d, cfg) {
  const p = pedidoDeCliente_(d);
  limite_('c_' + p.ID, PAGO_TOPES.comprobantes, 3600, 'Ya recibimos varios comprobantes de este pedido. Escríbenos por WhatsApp.');
  if (p.Estado === 'Cancelado') throw new Error('Este pedido está cancelado. Escríbenos por WhatsApp.');
  const pago = resumenPago_(p, cfg);
  const esperado = pago.porPagarAnticipo || pago.saldo;
  if (!comprobanteValido_(d.file)) throw new Error('El comprobante debe ser foto (JPG, PNG) o PDF de menos de 5 MB.');

  // lo lento (OCR y Drive) va FUERA del candado; si no pasa y Config dice Rechazar, no se guarda nada
  const lectura = leerComprobante_(d.file);
  const revision = revisarComprobante_(lectura, esperado, pago.saldo || esperado, cfg, [p.Cliente, linea_(d.pagador, 80)]);
  if (!revision.ok && rechazarSinVerificar_(cfg)) throw new Error(revision.motivo);
  const archivo = guardarComprobante_(carpetaDePedido_(p), d.file);
  return conCandado_(() => anotarPago_(p, { archivo, lectura, revision }, esperado));
}

// ¿el archivo parece un comprobante válido? (tipo, tamaño y firma de bytes; se revisa antes de crear nada)
const comprobanteValido_ = s => !!dataUrlValido_(s);

function guardarComprobante_(carpeta, dataUrl) {
  const archivo = guardarImagen_(carpeta, dataUrl, `Comprobante ${Utilities.formatDate(now_(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH.mm')}`);
  if (!archivo) throw new Error('El comprobante debe ser foto (JPG, PNG) o PDF de menos de 5 MB.');
  return archivo;
}

// Solo la fila en Pagos: esto sí va dentro del candado. p: { ID }; revision viene de Verificacion.gs
function anotarPago_(p, { archivo, lectura, revision }, esperado) {
  const monto = revision.monto;
  const resultado = revision.ok ? 'Coincide' : lectura.texto == null ? 'Sin lectura' : 'Revisar: ' + revision.nota;
  sheet_('pagos').appendRow(fila_([now_(), p.ID, monto == null ? '' : monto, esperado, resultado, archivo.url,
    texto_(lectura.texto || '', 2000), '', revision.ok ? (revision.pagador ? 'Pagó: ' + revision.pagador : '') : revision.motivo, marcaDe_(lectura)]));
  return { resultado: revision.ok ? 'Coincide' : 'Revisión', monto, esperado };
}

// "Mis pedidos": varios pedidos de este dispositivo a la vez (cada uno con su WhatsApp)
function misPedidos_(d) {
  const lista = (Array.isArray(d.pedidos) ? d.pedidos : []).slice(0, 20);
  const out = [];
  lista.forEach(x => { try { out.push(seguimiento_(x)); } catch (e) { /* ese ya no coincide o no existe: se omite */ } });
  return out;
}

function carpetaDePedido_(p) {
  const id = String(p.Carpeta || '').match(/[-\w]{25,}/);
  if (id) { try { return DriveApp.getFolderById(id[0]); } catch (e) { /* carpeta borrada: va a la general */ } }
  return folder_();
}

// Todos los montos que parecen dinero en un texto: "L 1,250.00", "Lps. 1250", "HNL 1.250,00", "Monto: 625"
function montosEn_(txt) {
  const out = [], re = /(L\.?|Lps\.?|HNL|Lempiras|monto|total|importe|valor|cantidad)?[\s:$]*(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi;
  let m;
  while ((m = re.exec(String(txt || '')))) {
    const n = numeroDe_(m[2]);
    if (n > 0 && n < 1e7) out.push({ n, moneda: !!m[1] });
  }
  return out;
}

// "1,250.00" / "1.250,00" / "1 250" / "625" -> número
function numeroDe_(s) {
  s = String(s).replace(/\s/g, '');
  const dec = /[.,]\d{1,2}$/.test(s) ? s.slice(-3).replace(/^\d/, '').charAt(0) : '';
  const ent = dec ? s.slice(0, s.lastIndexOf(dec)) : s, cen = dec ? s.slice(s.lastIndexOf(dec) + 1) : '';
  return Number(ent.replace(/[.,]/g, '') + (cen ? '.' + cen : ''));
}

// el monto que más se parece al esperado; si ninguno coincide, el mayor marcado como dinero
function elegirMonto_(montos, esperado) {
  if (!montos.length) return null;
  const igual = montos.find(m => Math.abs(m.n - esperado) <= 1);
  if (igual) return igual.n;
  const conMoneda = montos.filter(m => m.moneda);
  return Math.max(...(conMoneda.length ? conMoneda : montos).map(m => m.n));
}
