/**
 * Menú, creación de hojas, datos de ejemplo y disparadores.
 * Corre `configurar()` una vez (Pehn › Configurar hojas).
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Pehn')
    .addItem('Abrir panel', 'abrirPanel')
    .addItem('Revisar stock ahora', 'revisarStockMenu')
    .addSeparator()
    .addItem('Configurar hojas', 'configurar')
    .addItem('Ver URL y token para el sitio', 'mostrarConexion')
    .addToUi();
}

function configurar() {
  const ss = ss_();
  Object.keys(SHEETS).forEach(key => {
    let sh = ss.getSheetByName(SHEETS[key]);
    if (!sh) sh = ss.insertSheet(SHEETS[key]);
    const head = HEADERS[key];
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight('bold').setBackground('#1E1611').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  });

  // Config: valores iniciales sin pisar lo que ya exista
  const cfg = config_();
  CONFIG_DEFAULTS.forEach(([k, v, note]) => { if (!(k in cfg)) sheet_('config').appendRow([k, v, note]); });
  if (!config_()['Token del sitio']) setConfig_('Token del sitio', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  if (!config_()['Correo del negocio']) setConfig_('Correo del negocio', Session.getEffectiveUser().getEmail());
  if (!config_()['Admins']) setConfig_('Admins', Session.getEffectiveUser().getEmail());
  folder_();

  formatPedidos_();
  formatInventario_();
  seedInventario_();
  seedRecetas_();
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

  const colors = { 'Nuevo': '#FDEBD6', 'Diseño enviado': '#E8E0F7', 'Aprobado': '#DCEAF6', 'En producción': '#FBEFC4', 'Listo': '#E0EBDB', 'Enviado': '#D6F0E4', 'Entregado': '#C9E8D2', 'Cancelado': '#F3D6D2' };
  const range = sh.getRange(2, COL.pedidos.Estado, sh.getMaxRows() - 1, 1);
  const rules = sh.getConditionalFormatRules().filter(r => !r.getRanges().some(x => x.getColumn() === COL.pedidos.Estado));
  Object.entries(colors).forEach(([k, c]) => rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(c).setRanges([range]).build()));
  const stock = sh.getRange(2, COL.pedidos.Stock, sh.getMaxRows() - 1, 1);
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Falta').setBackground('#F3D6D2').setFontColor('#8A2A1A').setRanges([stock]).build());
  sh.setConditionalFormatRules(rules);

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

// datos de ejemplo: ajústalos a tu inventario real
const SEED_INVENTARIO = [
  ['MAR-B-23', 'Marco blanco 23×23 cm', 'Marcos'], ['MAR-N-23', 'Marco negro 23×23 cm', 'Marcos'], ['MAR-M-23', 'Marco madera 23×23 cm', 'Marcos'],
  ['MAR-B-30', 'Marco blanco 30×30 cm', 'Marcos'], ['MAR-N-30', 'Marco negro 30×30 cm', 'Marcos'], ['MAR-M-30', 'Marco madera 30×30 cm', 'Marcos'],
  ['FIG-CUERPO', 'Cuerpo de minifigura (torso + piernas)', 'Figuras'], ['FIG-CABEZA', 'Cabeza de minifigura', 'Figuras'], ['BASE-ACR', 'Base acrílica transparente', 'Figuras'],
  ['PEL-CORTO', 'Cabello corto', 'Cabello'], ['PEL-LADO', 'Cabello de lado', 'Cabello'], ['PEL-LARGO', 'Cabello largo', 'Cabello'],
  ['PEL-ONDAS', 'Cabello ondulado', 'Cabello'], ['PEL-CHONGO', 'Cabello con chongo', 'Cabello'], ['PEL-RIZOS', 'Cabello rizado', 'Cabello'],
  ['ACC-SOMB', 'Sombrero', 'Accesorios'], ['ACC-VAQ', 'Sombrero vaquero', 'Accesorios'], ['ACC-GORRA', 'Gorra', 'Accesorios'], ['ACC-MONO', 'Moño', 'Accesorios'],
  ['ACC-LENTES', 'Lentes', 'Accesorios'], ['ACC-SOL', 'Lentes de sol', 'Accesorios'], ['ACC-ARETES', 'Aretes', 'Accesorios'],
  ['MASC-GATO', 'Gatito', 'Mascotas'], ['MASC-PERRO', 'Perrito', 'Mascotas'],
  ['LLAV-ARG', 'Argolla de llavero', 'Llaveros'],
  ['VASO-16', 'Vaso doble pared 16 oz', 'Vasos'], ['VASO-24', 'Vaso doble pared 24 oz', 'Vasos'], ['VINIL', 'Hoja de vinil', 'Insumos'],
  ['TERMO-500', 'Termo 500 ml', 'Vasos'], ['TERMO-750', 'Termo 750 ml', 'Vasos'],
  ['TAZA-11', 'Taza 11 oz', 'Vasos'], ['TAZA-MAG', 'Taza mágica 11 oz', 'Vasos'],
  ['TOTE-M', 'Tote de manta mediana', 'Bolsas'], ['TOTE-G', 'Tote de manta grande', 'Bolsas'],
  ['SUD-CH', 'Sudadera talla CH', 'Ropa'], ['SUD-M', 'Sudadera talla M', 'Ropa'], ['SUD-G', 'Sudadera talla G', 'Ropa'], ['SUD-XG', 'Sudadera talla XG', 'Ropa'],
  ['PLA-CH', 'Playera talla CH', 'Ropa'], ['PLA-M', 'Playera talla M', 'Ropa'], ['PLA-G', 'Playera talla G', 'Ropa'], ['PLA-XG', 'Playera talla XG', 'Ropa'], ['PLA-XXG', 'Playera talla XXG', 'Ropa'],
];

function seedInventario_() {
  const sh = sheet_('inventario');
  if (rows_('inventario').length) return;
  const data = SEED_INVENTARIO.map(([sku, name, cat]) => [sku, name, cat, 10, 3, 'pza', 0, '']);
  sh.getRange(2, 1, data.length, 8).setValues(data);
  sh.getRange(2, COL.inventario.Actualizado, data.length, 1).setValue(now_());
  sh.getRange(2 + data.length, 1).setNote('Stock de ejemplo: cámbialo por tu conteo real.');
}

// clave que manda el sitio -> pieza del inventario. "*" vale por cualquier texto.
const SEED_RECETAS = [
  ['Figura · Cuerpo', 'FIG-CUERPO', 1, 'Una por figura'],
  ['Figura · Cabeza · *', 'FIG-CABEZA', 1, 'Cualquier tono de piel'],
  ['Figura · Base acrílica', 'BASE-ACR', 1, ''],
  ['Figura · Cabello · Corto · *', 'PEL-CORTO', 1, 'Cualquier color'], ['Figura · Cabello · De lado · *', 'PEL-LADO', 1, ''],
  ['Figura · Cabello · Largo · *', 'PEL-LARGO', 1, ''], ['Figura · Cabello · Ondulado · *', 'PEL-ONDAS', 1, ''],
  ['Figura · Cabello · Chongo · *', 'PEL-CHONGO', 1, ''], ['Figura · Cabello · Rizos · *', 'PEL-RIZOS', 1, ''],
  ['Figura · Sombrero · Sombrero', 'ACC-SOMB', 1, ''], ['Figura · Sombrero · Vaquero', 'ACC-VAQ', 1, ''],
  ['Figura · Sombrero · Gorra', 'ACC-GORRA', 1, ''], ['Figura · Sombrero · Moño', 'ACC-MONO', 1, ''],
  ['Figura · Detalle · Lentes', 'ACC-LENTES', 1, ''], ['Figura · Detalle · Lentes de sol', 'ACC-SOL', 1, ''], ['Figura · Detalle · Aretes', 'ACC-ARETES', 1, ''],
  ['Cuadro con minifiguras · Marco Blanco · Tamaño 23×23 cm', 'MAR-B-23', 1, ''], ['Cuadro con minifiguras · Marco Negro · Tamaño 23×23 cm', 'MAR-N-23', 1, ''],
  ['Cuadro con minifiguras · Marco Madera · Tamaño 23×23 cm', 'MAR-M-23', 1, ''], ['Cuadro con minifiguras · Marco Blanco · Tamaño 30×30 cm', 'MAR-B-30', 1, ''],
  ['Cuadro con minifiguras · Marco Negro · Tamaño 30×30 cm', 'MAR-N-30', 1, ''], ['Cuadro con minifiguras · Marco Madera · Tamaño 30×30 cm', 'MAR-M-30', 1, ''],
  ['Cuadro con minifiguras · Gatitos', 'MASC-GATO', 1, 'Por cada gatito'], ['Cuadro con minifiguras · Perritos', 'MASC-PERRO', 1, 'Por cada perrito'],
  ['Llavero minifigura', 'LLAV-ARG', 1, ''],
  ['Vaso con nombre · Tamaño · 16 oz', 'VASO-16', 1, ''], ['Vaso con nombre · Tamaño · 24 oz', 'VASO-24', 1, ''], ['Vaso con nombre', 'VINIL', 1, ''],
  ['Termo grabado · Capacidad · 500 ml', 'TERMO-500', 1, ''], ['Termo grabado · Capacidad · 750 ml', 'TERMO-750', 1, ''],
  ['Taza personalizada · Tipo · Clásica', 'TAZA-11', 1, ''], ['Taza personalizada · Tipo · Mágica', 'TAZA-MAG', 1, ''],
  ['Tote bag personalizada · Tamaño · Mediana', 'TOTE-M', 1, ''], ['Tote bag personalizada · Tamaño · Grande con fuelle', 'TOTE-G', 1, ''],
  ['Sudaderas para parejas · Sudadera * · talla · CH', 'SUD-CH', 1, 'Sudadera 1 y 2'], ['Sudaderas para parejas · Sudadera * · talla · M', 'SUD-M', 1, ''],
  ['Sudaderas para parejas · Sudadera * · talla · G', 'SUD-G', 1, ''], ['Sudaderas para parejas · Sudadera * · talla · XG', 'SUD-XG', 1, ''],
  ['Playera personalizada · Talla · CH', 'PLA-CH', 1, ''], ['Playera personalizada · Talla · M', 'PLA-M', 1, ''], ['Playera personalizada · Talla · G', 'PLA-G', 1, ''],
  ['Playera personalizada · Talla · XG', 'PLA-XG', 1, ''], ['Playera personalizada · Talla · XXG', 'PLA-XXG', 1, ''],
  // opciones que no gastan inventario aparte (SKU vacío a propósito)
  ['Figura · Torso · *', '', 1, 'Sin inventario: va en FIG-CUERPO'], ['Figura · Piernas · *', '', 1, 'Sin inventario: va en FIG-CUERPO'],
  ['Figura · Vestido · *', '', 1, 'Sin inventario: va en FIG-CUERPO'],
  ['Figura · Detalle · Barba', '', 1, 'Sin inventario: impreso'], ['Figura · Detalle · Bigote', '', 1, 'Sin inventario: impreso'],
  ['Figura · Detalle · Labios rojos', '', 1, 'Sin inventario: impreso'], ['Figura · Detalle · Chapitas', '', 1, 'Sin inventario: impreso'],
  ['Figura · Detalle · Pecas', '', 1, 'Sin inventario: impreso'],
  ['Cuadro con minifiguras', '', 1, 'Sin inventario'], ['Minifigura personalizada', '', 1, 'Sin inventario'], ['Sudaderas para parejas', '', 1, 'Sin inventario'],
  ['Playera personalizada', '', 1, 'Sin inventario'], ['Taza personalizada', '', 1, 'Sin inventario'], ['Termo grabado', '', 1, 'Sin inventario'],
  ['Tote bag personalizada', '', 1, 'Sin inventario'],
];

function seedRecetas_() {
  if (rows_('recetas').length) return;
  sheet_('recetas').getRange(2, 1, SEED_RECETAS.length, 4).setValues(SEED_RECETAS);
}

function instalarDisparadores_() {
  const want = { alEditar_: 'edit', resumenStockDiario_: 'daily' };
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() in want) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('alEditar_').forSpreadsheet(ss_()).onEdit().create();
  ScriptApp.newTrigger('resumenStockDiario_').timeBased().everyDays(1).atHour(8).create();
}

function folder_() {
  const id = config_()['Carpeta de Drive'];
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* se borró: se crea otra */ } }
  const f = DriveApp.createFolder('Pehn Design · Pedidos');
  setConfig_('Carpeta de Drive', f.getId());
  return f;
}

function mostrarConexion() {
  const url = ScriptApp.getService().getUrl() || '(primero publica: Implementar › Nueva implementación › App web)';
  const html = HtmlService.createHtmlOutput(`<div style="font:14px/1.6 system-ui;padding:8px">
    <p><b>1.</b> En <code>app.js</code> pega:</p>
    <pre style="background:#F4EDE4;padding:12px;border-radius:10px;white-space:pre-wrap">sheetsUrl: '${url}',\nsheetsToken: '${config_()['Token del sitio']}',</pre>
    <p><b>2.</b> La app web debe estar publicada como <i>Ejecutar como: Yo</i> y <i>Quién tiene acceso: Cualquier usuario</i>.</p></div>`).setWidth(560).setHeight(260);
  SpreadsheetApp.getUi().showModalDialog(html, 'Conectar el sitio');
}
