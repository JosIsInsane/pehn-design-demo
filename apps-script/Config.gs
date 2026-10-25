/**
 * Pehn Design — pedidos e inventario en Google Sheets.
 * Nombres de hojas, columnas y estados en un solo lugar.
 */

const SHEETS = {
  pedidos: 'Pedidos',
  partidas: 'Partidas',
  inventario: 'Inventario',
  recetas: 'Recetas',
  movimientos: 'Movimientos',
  config: 'Config',
};

const HEADERS = {
  pedidos: ['ID', 'Fecha', 'Estado', 'Cliente', 'WhatsApp', 'Correo', 'Ciudad', 'Para cuándo', 'Productos',
    'Piezas', 'Total', 'Moneda', 'Vista previa', 'Carpeta', 'Stock', 'Notas del cliente', 'Notas internas', 'Actualizado', 'Datos'],
  partidas: ['Pedido', '#', 'Producto', 'Cantidad', 'Precio unitario', 'Descuento', 'Total', 'Opciones',
    'Vista previa', 'Imágenes del cliente', 'Archivo vista previa'],
  inventario: ['SKU', 'Pieza', 'Categoría', 'Stock', 'Mínimo', 'Unidad', 'Costo unitario', 'Proveedor', 'Estado', 'Actualizado'],
  recetas: ['Clave', 'SKU', 'Cantidad', 'Notas'],
  movimientos: ['Fecha', 'SKU', 'Pieza', 'Cantidad', 'Stock después', 'Motivo', 'Pedido', 'Usuario'],
  config: ['Ajuste', 'Valor', 'Para qué sirve'],
};

const ESTADOS = ['Nuevo', 'Diseño enviado', 'Aprobado', 'En producción', 'Listo', 'Enviado', 'Entregado', 'Cancelado'];

// valores iniciales de la hoja Config (se pueden cambiar desde la hoja)
const CONFIG_DEFAULTS = [
  ['Nombre del negocio', 'Pehn Design', 'Aparece en los correos.'],
  ['Correo del negocio', '', 'Recibe el aviso de cada pedido y el resumen de stock bajo.'],
  ['Admins', '', 'Correos que pueden abrir el panel como web app, separados por coma.'],
  ['WhatsApp del negocio', '', 'Con código de país, ej. 50498765432.'],
  ['Token del sitio', '', 'Se genera solo. Cópialo en CONFIG.sheetsToken de app.js.'],
  ['Estado que descuenta stock', 'En producción', 'Al llegar a este estado se descuentan las piezas.'],
  ['Confirmar al cliente por correo', 'Sí', 'Sí / No'],
  ['Aviso de stock bajo', 'Sí', 'Sí / No. Correo diario a las 8 am con lo que hay que reponer.'],
  ['Carpeta de Drive', '', 'Se llena sola. Aquí se guardan fotos y vistas previas.'],
  ['Moneda', 'HNL', 'Lempiras.'],
];

const COL = {}; // COL.pedidos.Estado -> número de columna (1-based)
Object.keys(HEADERS).forEach(k => {
  COL[k] = {};
  HEADERS[k].forEach((h, i) => { COL[k][h] = i + 1; });
});

function ss_() { return SpreadsheetApp.getActive(); }

function sheet_(key) {
  const sh = ss_().getSheetByName(SHEETS[key]);
  if (!sh) throw new Error(`Falta la hoja "${SHEETS[key]}". Corre Pehn › Configurar hojas.`);
  return sh;
}

// filas como objetos {Encabezado: valor, _row: n}
function rows_(key) {
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

function now_() { return new Date(); }
function who_() { try { return Session.getActiveUser().getEmail() || 'sitio web'; } catch (e) { return 'sitio web'; } }
