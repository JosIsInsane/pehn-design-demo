/**
 * Menú, creación de hojas, datos de ejemplo, disparadores, respaldo y revisión.
 * Corre `configurar()` una vez (Pehn › Configurar hojas). Se puede repetir: no borra nada.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Pehn')
    .addItem('Abrir CRM (pestaña nueva)', 'abrirCRM')
    .addItem('Abrir CRM aquí', 'abrirPanel')
    .addItem('Cambiar clave del CRM', 'cambiarClaveCRM')
    .addItem('Revisar stock ahora', 'revisarStockMenu')
    .addItem('Cargar catálogo de piezas', 'cargarCatalogo')
    .addItem('Respaldar la hoja ahora', 'respaldarAhora')
    .addSeparator()
    .addItem('Revisar que todo funcione', 'revisarSistema')
    .addItem('Probar lectura de comprobantes', 'probarLecturaComprobantes')
    .addItem('Configurar hojas', 'configurar')
    .addItem('Ver URL y token para el sitio', 'mostrarConexion')
    .addToUi();
}

function configurar() {
  // la app web expone las funciones públicas: esta solo corre para quien abre la hoja
  if (!Session.getActiveUser().getEmail()) throw new Error('Corre esto desde la hoja: Pehn › Configurar hojas.');
  const ss = ss_();
  // antes de escribir nada: si una hoja con el mismo nombre ya tiene otros datos, no se toca ninguna
  const ajenas = Object.keys(SHEETS).filter(key => { const sh = ss.getSheetByName(SHEETS[key]); return sh && !esNuestra_(sh, key); });
  if (ajenas.length) {
    SpreadsheetApp.getUi().alert(`No se cambió nada.\n\nEstas hojas ya existen con otros datos: ${ajenas.map(k => SHEETS[k]).join(', ')}.\n\nInstala el sistema en una hoja de cálculo nueva para no mezclar información.`);
    return;
  }
  Object.keys(SHEETS).forEach(key => {
    ponerEncabezado_(ss.getSheetByName(SHEETS[key]) || ss.insertSheet(SHEETS[key]), key);
  });

  // Config: valores iniciales sin pisar lo que ya exista
  let cfg = config_();
  // el viejo "Aviso de stock bajo" pasa a "Resumen diario al negocio" con el mismo valor
  if (!('Resumen diario al negocio' in cfg) && 'Aviso de stock bajo' in cfg) sheet_('config').appendRow(['Resumen diario al negocio', cfg['Aviso de stock bajo'], CONFIG_DEFAULTS.find(x => x[0] === 'Resumen diario al negocio')[2]]);
  const viejo = rows_('config').find(x => x.Ajuste === 'Aviso de stock bajo');
  if (viejo) sheet_('config').getRange(viejo._row, 3).setValue('Ya no se usa: ahora es "Resumen diario al negocio".');
  cfg = config_();
  CONFIG_DEFAULTS.forEach(([k, v, note]) => { if (!(k in cfg)) sheet_('config').appendRow([k, v, note]); });
  if (!config_()['Token del sitio']) setConfig_('Token del sitio', nuevaClave_(20));
  clave_();
  if (!config_()['Correo del negocio']) setConfig_('Correo del negocio', Session.getEffectiveUser().getEmail());
  if (!config_()['Admins']) setConfig_('Admins', Session.getEffectiveUser().getEmail());
  folder_();

  formatPedidos_();
  formatInventario_();
  seedInventario_();
  seedRecetas_();
  seedSitio_();
  instalarDisparadores_();

  ss.setActiveSheet(sheet_('pedidos'));
  ss.toast('Listo. Ahora publica la web app (Implementar › Nueva implementación) y pega la URL en el sitio.', 'Pehn', 8);
}

function formatPedidos_() {
  const sh = sheet_('pedidos');
  const estado = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build();
  sh.getRange(2, COL.pedidos.Estado, sh.getMaxRows() - 1, 1).setDataValidation(estado);
  sh.setColumnWidth(COL.pedidos['Vista previa'], 140);
  sh.setColumnWidth(COL.pedidos.Productos, 260);
  sh.setColumnWidth(COL.pedidos.Piezas, 260);
  sh.setColumnWidth(COL.pedidos.Datos, 80);
  sh.getRange(2, COL.pedidos.Total, sh.getMaxRows() - 1, 1).setNumberFormat('"L" #,##0');
  sh.getRange(2, COL.pedidos.Fecha, sh.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sh.hideColumns(COL.pedidos.Datos);

  // mismos tonos que .st-* en AdminEstilos.html
  const colors = { 'Nuevo': '#FDEBD6', 'Diseño enviado': '#E8E0F7', 'Aprobado': '#DCEAF6', 'En producción': '#FBEFC4', 'Listo': '#E0EBDB', 'Enviado': '#D6F0E4', 'Entregado': '#C9E8D2', 'Cancelado': '#F3D6D2' };
  const range = sh.getRange(2, COL.pedidos.Estado, sh.getMaxRows() - 1, 1);
  const rules = sh.getConditionalFormatRules().filter(r => !r.getRanges().some(x => x.getColumn() === COL.pedidos.Estado));
  Object.entries(colors).forEach(([k, c]) => rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(c).setRanges([range]).build()));
  const stock = sh.getRange(2, COL.pedidos.Stock, sh.getMaxRows() - 1, 1);
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Falta').setBackground('#F3D6D2').setFontColor('#8A2A1A').setRanges([stock]).build());
  sh.setConditionalFormatRules(rules);

  const pg = sheet_('pagos');
  pg.getRange(2, COL.pagos.Fecha, pg.getMaxRows() - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  pg.getRange(2, COL.pagos['Monto leído'], pg.getMaxRows() - 1, 2).setNumberFormat('"L" #,##0.00');
  pg.setColumnWidth(COL.pagos['Texto leído'], 260);

  sheet_('partidas').setColumnWidth(COL.partidas['Vista previa'], 140);
  sheet_('partidas').setColumnWidth(COL.partidas.Opciones, 380);
  sheet_('partidas').getRange(2, COL.partidas['Precio unitario'], sheet_('partidas').getMaxRows() - 1, 3).setNumberFormat('"L" #,##0');
}

function formatInventario_() {
  const sh = sheet_('inventario');
  // Estado se calcula solo: no escribir en la columna I
  sh.getRange(2, COL.inventario.Estado).setFormula('=ARRAYFORMULA(IF(A2:A="",,IF(D2:D<=0,"Agotado",IF(D2:D<=E2:E,"Reponer","OK"))))');
  const range = sh.getRange(2, COL.inventario.Estado, sh.getMaxRows() - 1, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Agotado').setBackground('#F3D6D2').setFontColor('#8A2A1A').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Reponer').setBackground('#FBEFC4').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('OK').setBackground('#E0EBDB').setRanges([range]).build(),
  ]);
  sh.getRange(2, COL.inventario['Costo unitario'], sh.getMaxRows() - 1, 1).setNumberFormat('"L" #,##0.00');
  sh.setColumnWidth(COL.inventario.Pieza, 240);
  sheet_('recetas').setColumnWidth(COL.recetas.Clave, 420);
}

// Catálogo de piezas y recetas: los datos viven en Catalogo.gs (generado desde docs/inventario/catalogo-base.csv).
// Agrega lo que falte y NUNCA toca ni duplica lo que ya existe (el SKU o la clave ya están = se deja igual).
function cargarCatalogoPiezas_() {
  const inv = sheet_('inventario'), rec = sheet_('recetas');
  const tengo = {}; rows_('inventario').forEach(r => { tengo[String(r.SKU).trim().toUpperCase()] = true; });
  const nuevas = CATALOGO_PIEZAS.filter(p => !tengo[p[0].toUpperCase()]);
  if (nuevas.length) {
    // la siguiente fila libre se saca de la columna SKU (la columna Estado tiene una fórmula que llega hasta abajo)
    const col = inv.getRange(2, 1, Math.max(1, inv.getMaxRows() - 1), 1).getValues();
    let ult = 0; col.forEach((r, i) => { if (r[0] !== '') ult = i + 1; });
    const data = nuevas.map(([sku, pieza, cat]) => fila_([sku, pieza, cat, 0, '', 'pza', '', '']));
    inv.getRange(2 + ult, 1, data.length, 8).setValues(data);
    inv.getRange(2 + ult, COL.inventario.Actualizado, data.length, 1).setValue(now_());
  }
  const claves = {}; rows_('recetas').forEach(r => { claves[String(r.Clave).trim().toLowerCase()] = true; });
  const rn = CATALOGO_RECETAS.filter(r => !claves[r[0].toLowerCase()]);
  if (rn.length) rec.getRange(rec.getLastRow() + 1, 1, rn.length, 4).setValues(rn.map(r => fila_(r)));
  return { piezas: nuevas.length, existentes: CATALOGO_PIEZAS.length - nuevas.length, recetas: rn.length };
}

// Pehn › Cargar catálogo de piezas
function cargarCatalogo() {
  // la app web expone las funciones públicas: esta solo corre para quien abre la hoja
  if (!Session.getActiveUser().getEmail()) throw new Error('Corre esto desde la hoja: Pehn › Cargar catálogo de piezas.');
  const r = conCandado_(cargarCatalogoPiezas_);
  const txt = `Piezas nuevas: ${r.piezas} (ya estaban: ${r.existentes}). Recetas nuevas: ${r.recetas}. Lo que ya existía no se tocó; el stock de las piezas nuevas empieza en 0.`;
  try { SpreadsheetApp.getUi().alert('Catálogo de piezas', txt, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { ss_().toast(txt, 'Pehn', 8); }
  return r;
}

function seedInventario_() { cargarCatalogoPiezas_(); }
function seedRecetas_() { /* las recetas se cargan junto con las piezas (cargarCatalogoPiezas_) */ }

function instalarDisparadores_() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'alEditar_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('alEditar_').forSpreadsheet(ss_()).onEdit().create();
  instalarResumen_();
  instalarRespaldo_();
}

// resumen diario a la hora de Config; borra también el viejo resumenStockDiario_ (8 am)
function instalarResumen_() {
  ScriptApp.getProjectTriggers().forEach(t => { if (['resumenDiario_', 'resumenStockDiario_'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('resumenDiario_').timeBased().everyDays(1).atHour(horaResumen_()).create();
}

// copia completa de la hoja en Drive (carpeta Respaldos). Solo copia: no borra ni cambia nada.
function respaldarAhora() {
  const r = respaldar_();
  instalarRespaldo_();
  SpreadsheetApp.getUi().alert(`Listo. Copia guardada en Drive: ${r.name}\n\nDesde ahora se hace sola cada lunes en la madrugada.`);
}
function respaldoSemanal_() {
  try { respaldar_(); } catch (err) {
    const to = config_()['Correo del negocio'];
    if (to) MailApp.sendEmail(to, 'No se pudo respaldar la hoja de Pehn', String(err && err.message || err));
    throw err;
  }
}
function respaldar_() {
  const dir = folder_(), sub = dir.getFoldersByName('Respaldos'), carpeta = sub.hasNext() ? sub.next() : dir.createFolder('Respaldos');
  const name = 'Respaldo Pehn · ' + Utilities.formatDate(now_(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const file = DriveApp.getFileById(ss_().getId()).makeCopy(name, carpeta);
  return { name, id: file.getId() };
}
function instalarRespaldo_() {
  if (ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'respaldoSemanal_')) return;
  ScriptApp.newTrigger('respaldoSemanal_').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(3).create();
}

function folder_() {
  const id = config_()['Carpeta de Drive'];
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: se crea otra */ } }
  const f = DriveApp.createFolder('Pehn Design · Pedidos');
  setConfig_('Carpeta de Drive', f.getId());
  return f;
}

// ---------- revisión: busca lo que suele romperse y dice cómo arreglarlo ----------
function revisarSistema() {
  const mal = [], ok = [];
  const ver = (bien, okTxt, malTxt) => (bien ? ok.push('✓ ' + okTxt) : mal.push('✗ ' + malTxt));
  const ss = ss_();
  Object.keys(SHEETS).forEach(key => {
    const sh = ss.getSheetByName(SHEETS[key]);
    if (!sh) return mal.push(`✗ Falta la hoja "${SHEETS[key]}". Arreglo: Pehn › Configurar hojas.`);
    const got = sh.getRange(1, 1, 1, HEADERS[key].length).getValues()[0].map(String);
    const dif = HEADERS[key].filter((h, i) => got[i] !== h);
    ver(!dif.length, `Hoja ${SHEETS[key]}`, `La hoja "${SHEETS[key]}" tiene columnas movidas o renombradas (${dif.slice(0, 3).join(', ')}). Arreglo: regresa las columnas a su lugar; no se insertan columnas en medio.`);
  });
  try {
    const cfg = config_();
    ver(!!cfg['Token del sitio'], 'Token del sitio', 'Sin token del sitio. Arreglo: Pehn › Configurar hojas.');
    ver(!!cfg['Correo del negocio'], 'Correo del negocio', 'Config › Correo del negocio vacío: no llega el resumen diario.');
    let carpeta = false; try { carpeta = !!DriveApp.getFolderById(cfg['Carpeta de Drive']); } catch (e) { }
    ver(carpeta, 'Carpeta de Drive', 'La carpeta de Drive no existe. Arreglo: Pehn › Configurar hojas crea otra.');
    const trig = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    ['alEditar_', 'resumenDiario_', 'respaldoSemanal_'].forEach(f => ver(trig.includes(f), `Disparador ${f}`, `Falta el disparador ${f}. Arreglo: Pehn › Configurar hojas.`));
    if (trig.includes('resumenStockDiario_')) mal.push('• Sigue el disparador viejo resumenStockDiario_. Arreglo: Pehn › Configurar hojas lo borra.');
    ver(typeof Drive !== 'undefined', 'Lectura de comprobantes (Drive API)', 'Sin Drive API: los comprobantes se guardan pero el monto se revisa a mano. Arreglo: Editor › Servicios (+) › Drive API › Agregar.');
    ver(!!cfg['Datos bancarios'], 'Datos bancarios', 'Config › Datos bancarios vacío: el cliente no ve a dónde pagar el anticipo.');
    ver(!!urlApp_(), 'App web publicada', 'La app web no está publicada. Arreglo: Implementar › Nueva implementación › App web.');
    const sinSku = rows_('recetas').filter(r => /^Nueva/.test(r.Notas)).length;
    if (sinSku) mal.push(`• ${sinSku} opción(es) nuevas sin pieza asignada. Arreglo: CRM › Recetas › Por asignar.`);
    const cuota = MailApp.getRemainingDailyQuota();
    if (cuota < 10) mal.push(`• Quedan ${cuota} correos hoy (Google da 100 al día). Mañana se reinicia.`);
  } catch (e) { mal.push('✗ ' + (e.message || e)); }
  const txt = (mal.length ? 'Hay que revisar:\n\n' + mal.join('\n') + '\n\n' : 'Todo bien.\n\n') + ok.join('\n');
  console.log(txt);
  try { SpreadsheetApp.getUi().alert('Revisión de Pehn', txt, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* corrido desde el editor: ver el registro */ }
  return txt;
}

function mostrarConexion() {
  const url = urlApp_() || '(primero publica: Implementar › Nueva implementación › App web)';
  const html = HtmlService.createHtmlOutput(`<div style="font:14px/1.6 system-ui;padding:8px">
    <p><b>1.</b> En <code>datos.js</code> pega:</p>
    <pre style="background:#F4EDE4;padding:12px;border-radius:10px;white-space:pre-wrap">sheetsUrl: '${url}',\nsheetsToken: '${config_()['Token del sitio']}',</pre>
    <p><b>2.</b> La app web debe estar publicada como <i>Ejecutar como: Yo</i> y <i>Quién tiene acceso: Cualquier usuario</i>.</p></div>`).setWidth(560).setHeight(260);
  SpreadsheetApp.getUi().showModalDialog(html, 'Conectar el sitio');
}
