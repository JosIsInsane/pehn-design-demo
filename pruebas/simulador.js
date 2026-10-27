/* Simulador mínimo de Google Apps Script para probar el código de apps-script/ en Node.
   Hojas en memoria, Drive en memoria, correo y caché falsos. No necesita internet ni dependencias.
   Uso: const sim = cargar(); sim.ctx.doPost(...); sim.hoja('Pedidos') -> filas. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function cargar(opts = {}) {
  const sheets = new Map();
  const files = new Map();
  const mails = [];
  const cache = new Map();
  let idN = 0;
  const nid = p => p + String(++idN).padStart(30, '0');

  function makeRange(sh, r, c, nr = 1, nc = 1) {
    const grid = sh._g;
    const ensure = (rr, cc) => { while (grid.length < rr) grid.push([]); const row = grid[rr - 1]; while (row.length < cc) row.push(''); };
    const api = {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (grid[r - 1 + i] || [])[c - 1 + j] ?? '')),
      getValue: () => (grid[r - 1] || [])[c - 1] ?? '',
      setValues: v => { v.forEach((row, i) => row.forEach((x, j) => { ensure(r + i, c + j); grid[r - 1 + i][c - 1 + j] = guardar(x); })); return api; },
      setValue: v => { ensure(r, c); grid[r - 1][c - 1] = guardar(v); return api; },
      setFormula: f => { ensure(r, c); grid[r - 1][c - 1] = f; return api; },
      setRichTextValue: v => { ensure(r, c); grid[r - 1][c - 1] = v.text; return api; },
      getRow: () => r, getColumn: () => c, getNumRows: () => nr, getNumColumns: () => nc, getSheet: () => sh,
    };
    ['setFontWeight', 'setBackground', 'setFontColor', 'setNumberFormat', 'setDataValidation', 'setNote'].forEach(k => { api[k] = () => api; });
    return api;
  }
  // como Sheets: un texto con ' adelante se guarda sin el apóstrofo y como texto; uno con = se vuelve fórmula
  function guardar(v) {
    if (typeof v === 'string' && v.startsWith("'")) return { texto: v.slice(1) };
    if (typeof v === 'string' && /^[=+\-@]/.test(v)) return { FORMULA: v };
    return v;
  }
  const valor = v => (v && typeof v === 'object' && 'texto' in v ? v.texto : v);

  function makeSheet(name) {
    const sh = {
      _g: [], _name: name, _id: ++idN,
      getName: () => name, getSheetId: () => sh._id,
      getLastRow: () => { let n = sh._g.length; while (n && sh._g[n - 1].every(x => x === '')) n--; return n; },
      getMaxRows: () => 1000,
      getRange: (r, c, nr, nc) => makeRange(sh, r, c, nr, nc),
      appendRow: row => { makeRange(sh, sh.getLastRow() + 1, 1, 1, row.length).setValues([row]); return sh; },
      setFrozenRows() {}, setRowHeight() {}, setColumnWidth() {}, hideColumns() {},
      getConditionalFormatRules: () => [], setConditionalFormatRules() {},
    };
    // getValues devuelve el valor "visible": quita el envoltorio de texto
    const gr = sh.getRange;
    sh.getRange = (r, c, nr, nc) => { const rg = gr(r, c, nr, nc); const gv = rg.getValues; rg.getValues = () => gv().map(row => row.map(valor)); const g1 = rg.getValue; rg.getValue = () => valor(g1()); return rg; };
    return sh;
  }
  const ss = {
    getSheetByName: n => sheets.get(n) || null,
    insertSheet: n => { const s = makeSheet(n); sheets.set(n, s); return s; },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/HOJA', getId: () => 'HOJA', toast() {}, setActiveSheet() {},
  };
  const builder = extra => { const b = new Proxy({}, { get: (t, k) => (k === 'build' ? () => ({ ...extra }) : (...a) => { if (k === 'setText') extra.text = a[0]; return b; }) }); return b; };

  function makeFolder(name) {
    const id = nid('F');
    const f = {
      id, name, getId: () => id, getUrl: () => 'https://drive.google.com/drive/folders/' + id,
      createFolder: n => { const s = makeFolder(n); return s; },
      createFile: blob => { const fid = nid('A'); const file = { setSharing() {}, getId: () => fid, getUrl: () => 'https://drive.google.com/file/d/' + fid, getBlob: () => blob, setTrashed() {}, makeCopy: () => file }; files.set(fid, file); return file; },
      getFoldersByName: () => ({ hasNext: () => false }),
    };
    files.set(id, f);
    return f;
  }

  const ctx = {
    console: opts.silencio ? { log() {}, warn() {}, error() {} } : console,
    SpreadsheetApp: {
      getActive: () => ss, getUi: () => { throw new Error('sin UI'); },
      newCellImage: () => builder({}), newRichTextValue: () => builder({}),
      newDataValidation: () => builder({}), newConditionalFormatRule: () => builder({}),
    },
    Utilities: {
      getUuid: () => 'abcd1234-ef56-7890-abcd-' + String(++idN).padStart(12, '0'),
      formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); return f.replace('yyyy', d.getFullYear()).replace('yy', String(d.getFullYear()).slice(2)).replace('MM', p(d.getMonth() + 1)).replace('dd', p(d.getDate())).replace('HH', p(d.getHours())).replace('mm', p(d.getMinutes())); },
      base64Decode: s => Buffer.from(s, 'base64'), base64Encode: b => Buffer.from(b).toString('base64'),
      newBlob: (bytes, type, name) => ({ bytes, type, name, getContentType: () => type, getBytes: () => bytes, setName() { return this; } }),
    },
    Session: { getScriptTimeZone: () => 'America/Tegucigalpa', getActiveUser: () => ({ getEmail: () => opts.usuario || '' }), getEffectiveUser: () => ({ getEmail: () => 'duenos@pehn.test' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: k => cache.delete(k) }) },
    DriveApp: { Access: {}, Permission: {}, createFolder: makeFolder, getFolderById: id => { const f = files.get(id); if (!f || !f.createFolder) throw new Error('no existe'); return f; }, getFileById: id => { const f = files.get(id); if (!f) throw new Error('no existe'); return f; } },
    MailApp: { sendEmail: m => mails.push(m), getRemainingDailyQuota: () => 100 },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType() { return this; }, getContent: () => s }) },
    HtmlService: { createHtmlOutput: h => ({ setTitle() { return this; }, getContent: () => h }), createTemplateFromFile: () => ({ evaluate: () => ({ setTitle() { return this; }, addMetaTag() { return this; } }) }) },
    ScriptApp: { getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => builder({}), getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/X/exec' }), WeekDay: {} },
    DocumentApp: { openById: () => ({ getBody: () => ({ getText: () => ctx.__ocr || '' }) }) },
  };
  if (opts.ocr !== false) ctx.Drive = { Files: { create: () => ({ id: nid('D') }) } };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'apps-script');
  const code = ['Config', 'Catalogo', 'Setup', 'Orders', 'Inventory', 'Pagos', 'Sitio', 'Admin'].map(f => fs.readFileSync(path.join(dir, f + '.gs'), 'utf8')).join('\n;\n');
  // las const de arriba quedan visibles para las pruebas
  vm.runInContext(code + '\n;globalThis.__x = { COL, HEADERS, LIMITS, telKey_, celda_, montosEn_, elegirMonto_, numeroDe_ };', ctx);

  // instala como lo haría "Pehn › Configurar hojas" (sin UI)
  ctx.Session.getActiveUser = () => ({ getEmail: () => 'duenos@pehn.test' });
  vm.runInContext('configurar()', ctx);
  ctx.Session.getActiveUser = () => ({ getEmail: () => opts.usuario || '' });

  const hoja = name => { const sh = sheets.get(name); const head = sh._g[0].map(valor); return sh._g.slice(1).filter(r => r.some(x => x !== '')).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))); };
  const config = name => vm.runInContext(`config_()[${JSON.stringify(name)}]`, ctx);
  const get = params => JSON.parse(ctx.doGet({ parameter: params }).getContent());
  const post = body => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).getContent());
  return { ctx, hoja, config, post, get, mails, cache, x: ctx.__x, run: c => vm.runInContext(c, ctx) };
}

module.exports = { cargar };
