/* Orden en los módulos del sitio (js/, datos.js, dibujos.js, marco.js…), sin abrir el navegador.
   Correr:  node pruebas/modulos.test.js
   1. Todo lo que un módulo importa existe y está exportado (si no, el navegador falla con un SyntaxError).
   2. No hay dependencias circulares.
   3. El personalizador (personalizador*.js y zoom.js) solo se importa desde js/personalizador-carga.js, con import() dinámico:
      así no viaja con la página al inicio. */
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(import.meta.dirname, '..');
const LAZY = f => /^js\/(personalizador(?!-carga)[\w-]*|zoom)\.js$/.test(f);

const lista = dir => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? lista(path.join(dir, e.name)) : [path.posix.join(...path.join(dir, e.name).split(path.sep))]);
const archivos = [...lista('js'), 'datos.js', 'regalo.js', 'accesorios.js', 'piezas.js', 'datos-tienda.js', 'dibujos.js', 'marco.js'].filter(f => f.endsWith('.js'));
const fuente = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const resolver = (desde, destino) => path.posix.normalize(path.posix.join(path.posix.dirname(desde), destino));

// ---------- qué importa y qué exporta cada archivo ----------
const importa = {}, exporta = {};
for (const f of archivos) {
  const s = fuente(f);
  importa[f] = [...s.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'/g)]
    .map(m => ({ de: resolver(f, m[2]), nombres: m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean) }));
  const dinamicos = [...s.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map(m => resolver(f, m[1]));
  importa[f].dinamicos = dinamicos;
  const nombres = new Set();
  for (const m of s.matchAll(/^export\s+(?:async\s+)?function\s+([\w$]+)/gm)) nombres.add(m[1]);
  for (const m of s.matchAll(/^export\s+(?:const|let)\s+([^;\n]*)/gm)) {
    const resto = m[1];
    if (resto.startsWith('{')) resto.slice(1, resto.indexOf('}')).split(',').forEach(n => nombres.add(n.trim().split(/\s*:\s*/).pop()));
    else { nombres.add(resto.match(/^[\w$]+/)[0]); [...resto.matchAll(/,\s*([\w$]+)\s*=/g)].forEach(x => nombres.add(x[1])); }
  }
  exporta[f] = nombres;
}

let fallas = 0;
const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fallas++; };

// 1. lo importado existe
const malos = [];
for (const f of archivos) for (const i of importa[f]) {
  if (!archivos.includes(i.de)) { malos.push(`${f} importa ${i.de}, que no existe`); continue; }
  i.nombres.filter(n => !exporta[i.de].has(n)).forEach(n => malos.push(`${f} importa "${n}" de ${i.de}, que no lo exporta`));
}
ok(!malos.length, `${archivos.length} módulos: todo lo que se importa está exportado` + (malos.length ? '\n  ' + malos.join('\n  ') : ''));

// 2. sin ciclos (solo importaciones estáticas)
const ciclos = [];
const visitado = new Set(), enCurso = [];
function visitar(f) {
  if (enCurso.includes(f)) { ciclos.push([...enCurso.slice(enCurso.indexOf(f)), f].join(' → ')); return; }
  if (visitado.has(f)) return;
  visitado.add(f); enCurso.push(f);
  (importa[f] || []).forEach(i => archivos.includes(i.de) && visitar(i.de));
  enCurso.pop();
}
archivos.forEach(visitar);
ok(!ciclos.length, 'Sin dependencias circulares' + (ciclos.length ? '\n  ' + ciclos.join('\n  ') : ''));

// 3. el personalizador solo entra por la puerta de la carga diferida
const intrusos = archivos.filter(f => !LAZY(f) && importa[f].some(i => LAZY(i.de)));
ok(!intrusos.length, 'Nadie importa el personalizador de forma estática (solo personalizador-carga.js, con import())' + (intrusos.length ? ': ' + intrusos.join(', ') : ''));
ok(importa['js/personalizador-carga.js'].dinamicos.includes('js/personalizador.js'), 'personalizador-carga.js lo pide con import("./personalizador.js")');

// las páginas cargan UN solo punto de entrada de tipo módulo
const paginas = fs.readdirSync(RAIZ).filter(f => f.endsWith('.html'));
const mal = paginas.filter(p => {
  const scripts = [...fuente(p).matchAll(/<script\b[^>]*>/g)].map(m => m[0]);
  return scripts.length !== 1 || !/type="module"\s+src="\/?js\/paginas\/[\w-]+\.js"/.test(scripts[0]);
});
ok(paginas.length === 5 && !mal.length, `Cada página (${paginas.join(', ')}) carga un solo <script type="module"> de js/paginas/` + (mal.length ? ': revisa ' + mal.join(', ') : ''));

console.log(fallas ? `\n${fallas} fallaron` : '\nTodo pasó');
process.exit(fallas ? 1 : 0);
