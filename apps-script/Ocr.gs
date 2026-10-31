/**
 * Lectura de texto de comprobantes (OCR de Google Drive).
 * Drive convierte la imagen o PDF en un Documento de Google; de ahí se saca el texto y el documento se borra.
 *
 * Dos caminos, en orden:
 *   1. API REST de Drive con el permiso de la cuenta dueña (no depende de servicios avanzados ni de DocumentApp).
 *   2. Servicio avanzado "Drive" (respaldo, por si el 1 falla).
 * Si los dos fallan devuelve null y guarda el motivo: Pehn › Probar lectura de comprobantes lo muestra.
 */

const OCR = { api: 'https://www.googleapis.com', idioma: 'es', errorSeg: 21600 };

// blob (imagen o PDF) -> texto, o null si no se pudo leer
function leerTexto_(blob) {
  const fallos = [];
  for (const camino of [ocrPorRest_, ocrPorServicio_]) {
    try { return camino(blob); } catch (err) { fallos.push(`${camino.name}: ${err && err.message || err}`); }
  }
  anotarFalloOcr_(fallos.join(' | '));
  return null;
}

// ---------- camino 1: API REST ----------
function ocrPorRest_(blob) {
  const id = subirComoDocumento_(blob);
  try { return exportarTexto_(id); } finally { borrarTemporal_(id); }
}
// sube el archivo pidiendo que Drive lo convierta a Documento (con OCR); devuelve el id
function subirComoDocumento_(blob) {
  const limite = 'pehn' + Utilities.getUuid().replace(/-/g, '');
  const meta = JSON.stringify({ name: 'ocr-temporal', mimeType: 'application/vnd.google-apps.document' });
  const cabeza = `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${limite}\r\nContent-Type: ${blob.getContentType()}\r\n\r\n`;
  const cuerpo = [...Utilities.newBlob(cabeza).getBytes(), ...blob.getBytes(), ...Utilities.newBlob(`\r\n--${limite}--`).getBytes()];
  const r = llamarDrive_(`${OCR.api}/upload/drive/v3/files?uploadType=multipart&ocrLanguage=${OCR.idioma}&fields=id`,
    { method: 'post', contentType: `multipart/related; boundary=${limite}`, payload: cuerpo });
  return JSON.parse(r).id;
}
const exportarTexto_ = id => llamarDrive_(`${OCR.api}/drive/v3/files/${encodeURIComponent(id)}/export?mimeType=text/plain`, { method: 'get' });
function llamarDrive_(url, o) {
  const res = UrlFetchApp.fetch(url, { ...o, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() >= 300) throw new Error(`Drive respondió ${res.getResponseCode()}: ${String(res.getContentText()).slice(0, 200)}`);
  return res.getContentText();
}
function borrarTemporal_(id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* ya no está */ } }

// ---------- camino 2: servicio avanzado Drive (respaldo) ----------
function ocrPorServicio_(blob) {
  if (typeof Drive === 'undefined' || !Drive.Files) throw new Error('servicio avanzado Drive no activado');
  const id = Drive.Files.create({ name: 'ocr-temporal', mimeType: 'application/vnd.google-apps.document' }, blob, { ocrLanguage: OCR.idioma }).id;
  try { return DocumentApp.openById(id).getBody().getText(); } finally { borrarTemporal_(id); }
}

// ---------- diagnóstico ----------
function anotarFalloOcr_(motivo) {
  console.error('OCR falló:', motivo);
  try { CacheService.getScriptCache().put('ocr_error', String(motivo).slice(0, 900), OCR.errorSeg); } catch (e) { /* sin caché */ }
}

// Menú: lee el comprobante más reciente guardado en Drive y muestra lo que salió (o por qué falló)
function probarLecturaComprobantes() {
  const archivos = DriveApp.searchFiles("title contains 'Comprobante' and trashed = false");
  let ultimo = null;
  while (archivos.hasNext()) { const f = archivos.next(); if (!ultimo || f.getLastUpdated() > ultimo.getLastUpdated()) ultimo = f; }
  if (!ultimo) return avisar_('Probar lectura', 'No hay comprobantes guardados en Drive todavía.');
  const texto = leerTexto_(ultimo.getBlob());
  const msg = texto == null
    ? `No se pudo leer "${ultimo.getName()}".\n\nMotivo: ${CacheService.getScriptCache().get('ocr_error') || 'desconocido'}`
    : `Leído de "${ultimo.getName()}":\n\n${texto.slice(0, 600)}`;
  avisar_('Probar lectura', msg);
}
function avisar_(titulo, msg) {
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(titulo, msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* corrido desde el editor: ver el registro */ }
  return msg;
}
