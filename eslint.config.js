/* Configuración de ESLint (revisa el código sin ejecutarlo).  Correr:  npm run lint
   Reglas mínimas pero útiles: variables sin definir o sin usar, nombres repetidos o que tapan a otros,
   "==" en vez de "===", variables globales sin querer y "let" que nunca cambia.
   Cada grupo de archivos vive en un entorno distinto, por eso hay un bloque por grupo. */
import fs from 'node:fs';
import path from 'node:path';
import globals from 'globals';

// ---------- reglas comunes a todo el proyecto ----------
const reglas = {
  'no-undef': 'error',                 // usar algo que nadie declaró (casi siempre un error de dedo)
  'no-unused-vars': ['error', { ignoreRestSiblings: true }], // declarar algo y no usarlo (sí vale sacar campos con { a, ...resto })
  'no-redeclare': 'error',             // declarar dos veces el mismo nombre
  'no-shadow': 'warn',                 // una variable que tapa a otra de afuera
  eqeqeq: ['error', 'smart'],          // === siempre (== solo para comparar con null)
  'no-implicit-globals': 'error',      // variables globales sin querer en archivos que no son módulos
  'prefer-const': 'error',             // let que nunca se reasigna
};

// ---------- Apps Script (apps-script/*.gs) ----------
// En Apps Script todos los .gs comparten un solo ámbito global: una función de Orders.gs se llama
// directo desde Pagos.gs. Por eso aquí las funciones de un archivo son "globals" para los demás.
// La lista se genera sola leyendo las declaraciones del margen izquierdo de cada .gs
// (así no hay que mantenerla a mano). Un nombre repetido en dos archivos lo detecta no-redeclare.
const carpetaGs = path.join(import.meta.dirname, 'apps-script');
const archivosGs = fs.readdirSync(carpetaGs).filter(f => f.endsWith('.gs'));
const declaradosEn = f => [...fs.readFileSync(path.join(carpetaGs, f), 'utf8')
  .matchAll(/^(?:async\s+)?function\s+([\w$]+)|^(?:const|let|var)\s+([\w$]+)/gm)].map(m => m[1] || m[2]);
const nombresPorArchivo = Object.fromEntries(archivosGs.map(f => [f, declaradosEn(f)]));

// Servicios que Google ofrece en todo proyecto de Apps Script (más los servicios avanzados de appsscript.json)
const serviciosAppsScript = Object.fromEntries([
  'SpreadsheetApp', 'DriveApp', 'DocumentApp', 'MailApp', 'GmailApp', 'HtmlService', 'ContentService', 'CacheService',
  'PropertiesService', 'LockService', 'ScriptApp', 'Session', 'Utilities', 'UrlFetchApp', 'Logger', 'MimeType',
  'Drive', // servicio avanzado "Drive API v3" (userSymbol en apps-script/appsscript.json)
].map(n => [n, 'readonly']));

const bloquesGs = archivosGs.map(f => ({
  files: [`apps-script/${f}`],
  languageOptions: {
    ecmaVersion: 2022, sourceType: 'script',
    globals: {
      ...globals.es2021, console: 'readonly', ...serviciosAppsScript,
      // lo declarado en los OTROS .gs (lo de este mismo archivo ya está declarado en él)
      ...Object.fromEntries(archivosGs.filter(o => o !== f).flatMap(o => nombresPorArchivo[o]).map(n => [n, 'readonly'])),
    },
  },
  rules: {
    ...reglas,
    'no-implicit-globals': 'off', // en Apps Script todo es global a propósito
    // doGet, onOpen y las funciones de los menús las llama Google (o un texto del menú), no otro archivo
    // (catch (e) sin usar "e" también se deja pasar: es el estilo de estos archivos)
    'no-unused-vars': ['error', { vars: 'local', caughtErrors: 'none' }],
  },
}));

export default [
  { ignores: ['node_modules/', 'docs/'] },

  // ---------- el sitio en el navegador: módulos de js/ y los de datos, dibujos y marco ----------
  {
    files: ['js/**/*.js', 'datos.js', 'piezas.js', 'datos-tienda.js', 'dibujos.js', 'marco.js'],
    // TEMPORAL (paso 1): todavía son scripts clásicos que comparten globales; el paso 2 los pasa a módulos
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
    rules: { ...reglas, 'no-undef': 'off', 'no-implicit-globals': 'off', 'no-redeclare': 'off', 'no-unused-vars': ['error', { vars: 'local', ignoreRestSiblings: true }] },
  },

  // ---------- Node: pruebas, herramientas y este mismo archivo ----------
  {
    files: ['pruebas/**/*.js', 'herramientas/**/*.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: reglas,
  },
  // Los callbacks de page.evaluate(...) en las pruebas corren DENTRO del navegador (document, localStorage…)
  { files: ['pruebas/**/*.js'], languageOptions: { globals: { ...globals.browser } } },
  // TEMPORAL (paso 1): las pruebas todavía llaman a funciones globales del sitio dentro de page.evaluate
  { files: ['pruebas/**/*.js'], rules: { 'no-undef': 'off' } },

  ...bloquesGs,
];
