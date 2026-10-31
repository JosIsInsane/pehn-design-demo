/* Pehn Design — convierte piezas de la biblioteca LDraw (modelos 3D de piezas LEGO reales, CC BY 4.0) a archivos
   binarios chiquitos para el visor 3D (js/figura-3d.js). No corre en el sitio: solo cuando se agregan o cambian piezas.

   Uso:  node herramientas/piezas-ldraw.mjs /ruta/a/ldraw
         (la carpeta "ldraw" que sale de descomprimir https://library.ldraw.org/library/updates/complete.zip)
   Sale: vendor/ldraw/<nombre>.bin  (una pieza por archivo; ver PIEZAS abajo)

   Formato .bin (little endian):
     Uint32 nVertices, Uint32 nIndices, Uint32 0
     Int16  posiciones x,y,z × nVertices   (LDU × 16, ya con y hacia arriba y el frente hacia +z)
     Int8   normales x,y,z × nVertices     (× 127)          — relleno a múltiplo de 4 bytes después de cada bloque
     Uint16 (o Uint32 si nVertices > 65535) índices de triángulos */
import fs from 'node:fs';
import path from 'node:path';

// nombre en el visor → archivo de la pieza en LDraw
export const PIEZAS = {
  cabeza: '3626c', torso: '973', brazoDer: '3818', brazoIzq: '3819', mano: '3820', cadera: '3815b', piernaDer: '3816c', piernaIzq: '3817c',
  vestido: '3678b',
  'pelo-corto': '3901', 'pelo-lado': '62810', 'pelo-largo': '40239', 'pelo-ondas': '40251', 'pelo-chongo': '99240', 'pelo-rizos': '87995',
  'gorro-gorra': '86035', 'gorro-casco': '3833', 'gorro-vaquero': '3629', 'gorro-sombrero': '61506',
};
const SUAVE = Math.cos(35 * Math.PI / 180); // caras con menos de 35° entre sí se ven redondas; más, con orilla

const raiz = process.argv[2];
if (!raiz || !fs.existsSync(path.join(raiz, 'parts'))) { console.error('Uso: node herramientas/piezas-ldraw.mjs /ruta/a/ldraw'); process.exit(1); }
const CARPETAS = ['parts', 'p', 'models'].map(c => path.join(raiz, c));
function buscar(nombre) {
  const rel = nombre.toLowerCase().replace(/\\/g, '/');
  for (const c of CARPETAS) { const f = path.join(c, rel); if (fs.existsSync(f)) return f; }
  throw new Error('No encontré ' + nombre);
}

// ---------- leer un archivo y devolver sus triángulos (siempre en sentido antihorario), con sus sub-piezas ya puestas ----------
const memoria = new Map();
function triangulos(nombre) {
  if (memoria.has(nombre)) return memoria.get(nombre);
  const salida = [];
  let horario = false, invertirSiguiente = false;
  for (const linea of fs.readFileSync(buscar(nombre), 'utf8').split(/\r?\n/)) {
    const t = linea.trim().split(/\s+/), tipo = t[0];
    if (tipo === '0') {
      const bfc = t.slice(1).join(' ').toUpperCase();
      if (/^BFC (CERTIFY )?CW$/.test(bfc)) horario = true;
      else if (/^BFC (CERTIFY )?CCW$/.test(bfc)) horario = false;
      else if (bfc === 'BFC INVERTNEXT') invertirSiguiente = true;
      continue;
    }
    if (tipo === '1') {
      const [x, y, z, a, b, c, d, e, f, g, h, i] = t.slice(2, 14).map(Number);
      const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
      const voltear = (det < 0) !== invertirSiguiente;
      invertirSiguiente = false;
      for (const tri of triangulos(t.slice(14).join(' '))) {
        const p = [];
        for (let k = 0; k < 9; k += 3) {
          const [u, v, w] = [tri[k], tri[k + 1], tri[k + 2]];
          p.push(a * u + b * v + c * w + x, d * u + e * v + f * w + y, g * u + h * v + i * w + z);
        }
        salida.push(voltear ? [...p.slice(0, 3), ...p.slice(6, 9), ...p.slice(3, 6)] : p);
      }
      continue;
    }
    invertirSiguiente = false;
    if (tipo !== '3' && tipo !== '4') continue;
    const n = t.slice(2).map(Number), pts = [];
    for (let k = 0; k < (tipo === '3' ? 9 : 12); k += 3) pts.push(n.slice(k, k + 3));
    if (horario) pts.reverse();
    salida.push([...pts[0], ...pts[1], ...pts[2]]);
    if (tipo === '4') salida.push([...pts[0], ...pts[2], ...pts[3]]);
  }
  memoria.set(nombre, salida);
  return salida;
}

// ---------- unir vértices, normales suaves con orillas y empacar ----------
function empacar(tris) {
  // LDraw: y hacia abajo y el frente hacia -z → girar 180° en x (y = -y, z = -z; el sentido de los triángulos no cambia)
  tris = tris.map(p => p.map((v, k) => (k % 3 === 0 ? v : -v)));
  const clave = (x, y, z) => `${Math.round(x * 16)},${Math.round(y * 16)},${Math.round(z * 16)}`;
  const normalCara = tris.map(p => {
    const ux = p[3] - p[0], uy = p[4] - p[1], uz = p[5] - p[2], vx = p[6] - p[0], vy = p[7] - p[1], vz = p[8] - p[2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; // largo = 2 × área
  });
  const unit = n => { const l = Math.hypot(...n) || 1; return n.map(v => v / l); };
  const caras = new Map(); // posición → caras que la tocan
  tris.forEach((p, f) => { for (let k = 0; k < 9; k += 3) { const c = clave(p[k], p[k + 1], p[k + 2]); (caras.get(c) || caras.set(c, []).get(c)).push(f); } });
  const pos = [], nor = [], idx = [], visto = new Map();
  tris.forEach((p, f) => {
    if (Math.hypot(...normalCara[f]) < 1e-9) return; // triángulo aplastado
    const nf = unit(normalCara[f]);
    for (let k = 0; k < 9; k += 3) {
      const c = clave(p[k], p[k + 1], p[k + 2]), s = [0, 0, 0];
      for (const g of caras.get(c)) {
        const ng = normalCara[g], ug = unit(ng);
        if (ug[0] * nf[0] + ug[1] * nf[1] + ug[2] * nf[2] >= SUAVE) { s[0] += ng[0]; s[1] += ng[1]; s[2] += ng[2]; }
      }
      const n = unit(s).map(v => Math.round(v * 127)), cv = c + '|' + n.join(',');
      if (!visto.has(cv)) { visto.set(cv, pos.length / 3); pos.push(...c.split(',').map(Number)); nor.push(...n); }
      idx.push(visto.get(cv));
    }
  });
  const nv = pos.length / 3, grande = nv > 65535, pad = b => (4 - (b % 4)) % 4;
  const bPos = nv * 6, bNor = nv * 3, bIdx = idx.length * (grande ? 4 : 2);
  const buf = Buffer.alloc(12 + bPos + pad(bPos) + bNor + pad(bNor) + bIdx);
  buf.writeUInt32LE(nv, 0); buf.writeUInt32LE(idx.length, 4); buf.writeUInt32LE(0, 8);
  let o = 12;
  pos.forEach(v => { buf.writeInt16LE(v, o); o += 2; }); o += pad(bPos);
  nor.forEach(v => { buf.writeInt8(v, o); o += 1; }); o += pad(bNor);
  idx.forEach(v => { if (grande) buf.writeUInt32LE(v, o); else buf.writeUInt16LE(v, o); o += grande ? 4 : 2; });
  return { buf, nv, nt: idx.length / 3 };
}

const destino = path.join(import.meta.dirname, '..', 'vendor', 'ldraw');
fs.mkdirSync(destino, { recursive: true });
let total = 0;
for (const [nombre, pieza] of Object.entries(PIEZAS)) {
  const { buf, nv, nt } = empacar(triangulos(pieza + '.dat'));
  fs.writeFileSync(path.join(destino, nombre + '.bin'), buf);
  total += buf.length;
  console.log(`${nombre.padEnd(16)} ${pieza.padEnd(7)} ${String(nt).padStart(6)} triángulos ${String(nv).padStart(6)} vértices ${(buf.length / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`Total ${(total / 1024).toFixed(0)} KB en ${destino}`);
