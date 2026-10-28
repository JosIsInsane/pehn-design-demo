/* Higiene del código: ningún archivo escrito a mano pasa de 400 líneas.
   Correr:  node pruebas/tamanos.test.js
   Revisa js/*.js, css/*.css, apps-script/*.gs y *.html y los *.html del sitio.
   Quedan fuera los archivos generados (piezas.js, datos-tienda.js, apps-script/Catalogo.gs) y pruebas/.
   Si uno se pasa: pártelo por responsabilidad (ver docs/CONTEXTO.md) en vez de subir el límite. */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
const MAX = 400;
const GENERADOS = new Set(['piezas.js', 'datos-tienda.js', 'apps-script/Catalogo.gs']);

const lista = (dir, ext) => fs.existsSync(path.join(RAIZ, dir))
  ? fs.readdirSync(path.join(RAIZ, dir)).filter(f => ext.test(f)).map(f => (dir ? dir + '/' : '') + f)
  : [];
const archivos = [
  ...lista('js', /\.js$/), ...lista('js/paginas', /\.js$/), ...lista('css', /\.css$/),
  ...lista('apps-script', /\.(gs|html)$/), ...lista('', /\.html$/),
].filter(f => !GENERADOS.has(f));

let fallas = 0;
const lineas = f => fs.readFileSync(path.join(RAIZ, f), 'utf8').split('\n').length - 1;
archivos.forEach(f => {
  const n = lineas(f), bien = n <= MAX;
  if (!bien) { console.log(`✗ ${f}: ${n} líneas (máximo ${MAX})`); fallas++; }
});
// Apps Script quita la extensión: un .gs y un .html con el mismo nombre chocan al subir
const nombres = lista('apps-script', /\.(gs|html)$/).map(f => path.basename(f).replace(/\.(gs|html)$/, ''));
const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
if (repetidos.length) { console.log(`✗ apps-script: nombres repetidos sin extensión (${repetidos.join(', ')})`); fallas++; }
if (!archivos.length) { console.log('✗ no se encontró ningún archivo que revisar'); fallas++; }
else if (!fallas) console.log(`✓ ${archivos.length} archivos, ninguno pasa de ${MAX} líneas`);
if (fallas) { console.log(`\n${fallas} archivo(s) muy largos. Pártelos por responsabilidad.`); process.exit(1); }
console.log('\nTodo pasó');
