/**
 * Pehn Design — pedidos e inventario en Google Sheets.
 * Nombres de hojas, columnas, estados y utilidades compartidas en un solo lugar.
 *
 * Archivos:
 *   Config.gs     este: nombres, columnas y utilidades
 *   Setup.gs      menú, crear hojas, disparadores, respaldo y revisión
 *   Orders.gs     recibir pedidos del sitio (doPost)
 *   Inventory.gs  recetas, apartados y movimientos de stock
 *   Pagos.gs      Rastrear pedido y comprobantes del anticipo (lee el monto)
 *   Sitio.gs      colores, textos y fotos del sitio que se cambian desde el CRM
 *   Admin.gs      datos y acciones del CRM; AdminPagina.html y AdminEstilos, AdminVistas y AdminJs*.html son la pantalla
 *
 * SI ALGO FALLA: menú Pehn › Revisar que todo funcione. Dice qué está mal y cómo arreglarlo.
 * Para cambiar una columna: agrégala AL FINAL de HEADERS (nunca en medio) y corre Pehn › Configurar hojas.
 */

const SHEETS = {
  pedidos: 'Pedidos',
  partidas: 'Partidas',
  inventario: 'Inventario',
  recetas: 'Recetas',
  movimientos: 'Movimientos',
  clientes: 'Clientes',
  pagos: 'Pagos',
  sitio: 'Sitio',
  config: 'Config',
};

const HEADERS = {
  pedidos: ['ID', 'Fecha', 'Estado', 'Cliente', 'WhatsApp', 'Correo', 'Ciudad', 'Para cuándo', 'Productos',
    'Piezas', 'Total', 'Moneda', 'Vista previa', 'Carpeta', 'Stock', 'Notas del cliente', 'Notas internas', 'Actualizado', 'Datos', 'Correo cliente'],
  partidas: ['Pedido', '#', 'Producto', 'Cantidad', 'Precio unitario', 'Descuento', 'Total', 'Opciones',
    'Vista previa', 'Imágenes del cliente', 'Archivo vista previa'],
  inventario: ['SKU', 'Pieza', 'Categoría', 'Stock', 'Mínimo', 'Unidad', 'Costo unitario', 'Proveedor', 'Estado', 'Actualizado'],
  recetas: ['Clave', 'SKU', 'Cantidad', 'Notas'],
  movimientos: ['Fecha', 'SKU', 'Pieza', 'Cantidad', 'Stock después', 'Motivo', 'Pedido', 'Usuario'],
  clientes: ['WhatsApp', 'Nombre', 'Correo', 'Ciudad', 'Primer pedido', 'Último pedido', 'Etiquetas', 'Notas'],
  sitio: ['Clave', 'Valor', 'Tipo', 'Para qué sirve'],
  pagos: ['Fecha', 'Pedido', 'Monto leído', 'Esperado', 'Resultado', 'Comprobante', 'Texto leído', 'Revisado por', 'Notas', 'Huella'],
  config: ['Ajuste', 'Valor', 'Para qué sirve'],
};

// El orden importa: el CRM calcula el avance con él. Si agregas uno, agrégalo también en los colores de Setup.gs y AdminEstilos.html (.st-*).
const ESTADOS = ['Nuevo', 'Diseño enviado', 'Aprobado', 'En producción', 'Listo', 'Enviado', 'Entregado', 'Cancelado'];

// valores iniciales de la hoja Config (se pueden cambiar desde la hoja)
const CONFIG_DEFAULTS = [
  ['Nombre del negocio', 'Pehn Design', 'Aparece en los correos.'],
  ['Correo del negocio', '', 'Recibe UN solo correo al día con el resumen (pedidos, cobros, entregas y stock). Los pedidos no avisan uno por uno: míralos en el CRM.'],
  ['Admins', '', 'Correos que pueden abrir el CRM sin la clave, separados por coma.'],
  ['WhatsApp del negocio', '', 'Con código de país, ej. 50498765432.'],
  ['Token del sitio', '', 'Se genera solo. Cópialo en CONFIG.sheetsToken de datos.js.'],
  ['Clave del CRM', '', 'Se genera sola. Va en el enlace del CRM (?k=…). Cámbiala si el enlace se comparte de más.'],
  ['Estado que descuenta stock', 'En producción', 'Al llegar a este estado se descuentan las piezas.'],
  ['Confirmar al cliente por correo', 'Sí', 'Sí / No. Un solo correo al cliente por pedido, al confirmarlo.'],
  ['Carpeta de Drive', '', 'Se llena sola. Aquí se guardan fotos y vistas previas.'],
  ['Moneda', 'HNL', 'Lempiras.'],
  ['Sitio web', '', 'Dirección de la página (ej. https://pehndesign.com). El CRM la usa para "Ver sitio".'],
  ['Anticipo antes de enviar', 'Sí', 'Sí = el cliente sube el comprobante del anticipo antes de mandar el pedido. No = puede pagar después.'],
  ['Anticipo (%)', 50, 'Porcentaje que se paga para empezar el pedido. El sitio lo muestra en Mi pedido.'],
  ['Datos bancarios', '', 'Cuenta para el anticipo. Se muestra al cliente en Mi pedido (ej. BAC · Ahorro · 123456789 · Pehn Design).'],
  ['Hora del resumen diario', 20, 'Hora (0 a 23) en que llega el resumen al Correo del negocio. 20 = 8 pm. Al cambiarla se reprograma sola.'],
  ['Resumen diario al negocio', 'Sí', 'Sí / No. Reemplaza al viejo "Aviso de stock bajo" (si ese ajuste existía, se copia aquí su valor).'],
  ['Comprobante que no pasa la verificación', 'Rechazar', 'Rechazar = el sitio no deja enviar un comprobante que no cuadra (monto, cuenta, fecha, repetido). Revisar = lo acepta y queda en CRM › Pagos para revisarlo a mano.'],
  ['Días que vale un comprobante', 7, 'Un comprobante con fecha más vieja que esto se rechaza (si el comprobante muestra fecha).'],
  ['Nombre de quien paga', 'Debe coincidir', 'Debe coincidir = si el comprobante muestra quién transfirió, debe ser el cliente o la persona que puso en "¿Lo paga otra persona?". No revisar = no se compara el nombre.'],
];

// hora del resumen: entero 0–23; vacío o inválido = 20
function horaResumen_(cfg) {
  const v = (cfg || config_())['Hora del resumen diario'];
  if (v === '' || v == null || !isFinite(Number(v))) return 20;
  return Math.min(23, Math.max(0, Math.floor(Number(v))));
}

const COL = {}; // COL.pedidos.Estado -> número de columna (1-based)
Object.keys(HEADERS).forEach(k => {
  COL[k] = {};
  HEADERS[k].forEach((h, i) => { COL[k][h] = i + 1; });
});

function ss_() { return SpreadsheetApp.getActive(); }

function sheet_(key) {
  const sh = ss_().getSheetByName(SHEETS[key]);
  if (!sh) throw new Error(`Falta la hoja "${SHEETS[key]}". Corre Pehn › Configurar hojas.`);
  if (!esNuestra_(sh, key)) throw new Error(`La hoja "${SHEETS[key]}" ya existía con otros datos. No se tocó. Instala el sistema en una hoja de cálculo nueva.`);
  return sh;
}

// protege hojas que ya existían: solo se usa una hoja vacía o con nuestros encabezados
const NUESTRA_ = {};
function esNuestra_(sh, key) {
  const id = sh.getSheetId ? sh.getSheetId() : key;
  if (NUESTRA_[id] === true) return true;
  const head = HEADERS[key];
  if (sh.getLastRow() === 0) return true; // vacía: todavía no es de nadie
  const got = sh.getRange(1, 1, 1, head.length).getValues()[0].map(v => String(v).trim());
  const ok = got[0] === head[0] && head.every((h, i) => got[i] === h || got[i] === '');
  if (ok) NUESTRA_[id] = true;
  return ok;
}

// fila 1 con los encabezados y el estilo de la casa
function ponerEncabezado_(sh, key) {
  sh.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]])
    .setFontWeight('bold').setBackground('#1E1611').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
}

// la hoja Clientes se crea sola la primera vez (con los clientes de pedidos anteriores)
function hojaClientes_() {
  let sh = ss_().getSheetByName(SHEETS.clientes);
  if (sh) return esNuestra_(sh, 'clientes') ? sh : null; // una hoja "Clientes" ajena no se toca
  sh = ss_().insertSheet(SHEETS.clientes);
  ponerEncabezado_(sh, 'clientes');
  const map = {};
  rows_('pedidos').forEach(p => {
    const k = telKey_(p.WhatsApp); if (!k) return;
    const c = map[k] = map[k] || ["'" + k, p.Cliente, p.Correo, p.Ciudad, p.Fecha, p.Fecha, '', ''];
    c[1] = p.Cliente || c[1]; c[2] = p.Correo || c[2]; c[3] = p.Ciudad || c[3]; c[5] = p.Fecha;
  });
  const vals = Object.values(map);
  if (vals.length) sh.getRange(2, 1, vals.length, 8).setValues(vals);
  return sh;
}

// filas como objetos {Encabezado: valor, _row: n}
// Memo de lectura: dentro de conMemo_ cada hoja se lee una sola vez.
// Solo se usa en funciones que no escriben (CRM y cálculo de apartados).
let MEMO_ = null;
function conMemo_(fn) {
  if (MEMO_) return fn();
  MEMO_ = {};
  try { return fn(); } finally { MEMO_ = null; }
}

function rows_(key) {
  if (MEMO_ && MEMO_[key]) return MEMO_[key];
  const out = leerFilas_(key);
  if (MEMO_) MEMO_[key] = out;
  return out;
}

function leerFilas_(key) {
  const sh = sheet_(key), last = sh.getLastRow();
  if (last < 2) return [];
  const head = HEADERS[key];
  return sh.getRange(2, 1, last - 1, head.length).getValues()
    .map((r, i) => { const o = { _row: i + 2 }; head.forEach((h, j) => { o[h] = r[j]; }); return o; })
    .filter(o => o[head[0]] !== '');
}

function config_() {
  const out = {};
  rows_('config').forEach(r => { out[r.Ajuste] = r.Valor; });
  return out;
}

function setConfig_(name, value) {
  const r = rows_('config').find(x => x.Ajuste === name);
  if (r) sheet_('config').getRange(r._row, 2).setValue(value);
  else sheet_('config').appendRow([name, value, '']);
}

const yes_ = v => /^s[ií]|^true$|^1$/i.test(String(v).trim());

function money_(n, cur) {
  try { return new Intl.NumberFormat('es-HN', { style: 'currency', currency: cur || 'HNL', maximumFractionDigits: 0 }).format(Number(n) || 0); }
  catch (e) { return 'L ' + Math.round(Number(n) || 0).toLocaleString(); }
}

// un solo cambio a la vez (dos pedidos o dos clics al mismo tiempo no se pisan)
function conCandado_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('La hoja está ocupada con otro cambio. Espera unos segundos e intenta de nuevo.');
  try { return fn(); } finally { lock.releaseLock(); }
}

// Seguridad: todo texto que venga de afuera pasa por celda_ antes de escribirse en la hoja.
// Un texto que empieza con = + - @ se volvería fórmula (puede leer otras celdas o llamar URLs).
// Con el apóstrofo delante Sheets lo guarda como texto tal cual.
const celda_ = v => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? "'" + v : v);
const fila_ = arr => arr.map(celda_);
// texto limpio y con tope de largo (sin caracteres de control)
// una sola línea (nombres, asuntos de correo): sin saltos que permitan colar encabezados
const linea_ = (v, max) => texto_(v, max * 2).replace(/\s+/g, ' ').slice(0, max);
const texto_ = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

// WhatsApp como clave única: solo dígitos y con 504 si son 8 dígitos (Honduras)
const telKey_ = t => { const n = String(t || '').replace(/\D/g, ''); return n.length === 8 ? '504' + n : n; };
const nuevaClave_ = (largo = 32) => Utilities.getUuid().replace(/-/g, '').slice(0, largo);
const dataUrl_ = blob => `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

function now_() { return new Date(); }
function who_() { try { return Session.getActiveUser().getEmail() || 'sitio web'; } catch (e) { return 'sitio web'; } }
