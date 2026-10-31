/* Pehn Design — FIGURA EN 3D: la minifigura armada con las piezas LEGO de verdad, que se gira con el dedo o el mouse.
   Las piezas son modelos de la biblioteca LDraw (CC BY 4.0, ldraw.org) pasados a binarios chiquitos con
   herramientas/piezas-ldraw.mjs → vendor/ldraw/*.bin. Se baja solo lo que usa cada figura (~40 KB).
   Todo se descarga solo al tocar "Ver en 3D" (import() desde personalizador-eventos.js); Three.js va en vendor/ (MIT).
   Medidas en LDU de LDraw (1 LDU = 0.4 mm) dentro de la figura; la escena usa LDU × S. */
import * as THREE from '../vendor/three-0.170.0.module.min.js';
import { caraSVG, estampadoSVG } from '../dibujos.js';
import { normFig } from '../datos.js';
import { ACC } from '../accesorios.js';
import { $ } from './utiles.js';
import { openModal, closeModal } from './modales.js';

const ESCALA_PX = 2; // nitidez de las texturas en pantallas densas
const S = 0.024;     // LDU → unidades de la escena (la figura mide ~2.4)
const VERSION_PIEZAS = 1; // súbelo si se vuelven a generar los .bin (se guardan en caché un año)

// ---------- materiales y texturas ----------
const plastico = (color, extra) => new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0x484848, ...extra });
// dibuja un SVG en un canvas y lo devuelve como textura (cara, estampado del torso, accesorio de la mano)
function texturaDeSVG(svg, ancho, alto, fondo, dibujar) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho; canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (fondo) { ctx.fillStyle = fondo; ctx.fillRect(0, 0, ancho, alto); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => { dibujar(ctx, img); tex.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return tex;
}

// ---------- piezas LDraw: se bajan una vez y se reusan ----------
const piezas = new Map();
function pieza(nombre) {
  if (!piezas.has(nombre)) {
    piezas.set(nombre, fetch(new URL(`../vendor/ldraw/${nombre}.bin?v=${VERSION_PIEZAS}`, import.meta.url))
      .then(r => { if (!r.ok) throw new Error('Pieza ' + nombre); return r.arrayBuffer(); })
      .then(leerPieza)
      .catch(e => { piezas.delete(nombre); throw e; }));
  }
  return piezas.get(nombre);
}
// formato en herramientas/piezas-ldraw.mjs
function leerPieza(buf) {
  const [nv, ni] = new Uint32Array(buf, 0, 2), al4 = b => b + (4 - (b % 4)) % 4;
  const oPos = 12, oNor = oPos + al4(nv * 6), oIdx = oNor + al4(nv * 3);
  const pos = Float32Array.from(new Int16Array(buf, oPos, nv * 3), v => v / 16);
  const nor = Float32Array.from(new Int8Array(buf, oNor, nv * 3), v => v / 127);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(new THREE.BufferAttribute(nv > 65535 ? new Uint32Array(buf, oIdx, ni) : new Uint16Array(buf, oIdx, ni), 1));
  geo.userData.compartida = true; // no se libera al cerrar el visor
  return geo;
}
const geoCabeza = () => pieza('cabeza').then(g => g.userData.conUV || (g.userData.conUV = uvCabeza(g)));
const geoTorso = () => pieza('torso').then(g => g.userData.conUV || (g.userData.conUV = uvTorso(g)));

// cabeza: la cara se pega alrededor del cilindro (u = vuelta, v = altura de la parte recta)
function uvCabeza(g0) {
  const g = g0.toNonIndexed(), p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < p.count; i++) if (Math.abs(n.getY(i)) < 0.2) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let t = 0; t < p.count; t += 3) {
    const us = [0, 1, 2].map(k => 0.5 + Math.atan2(p.getX(t + k), p.getZ(t + k)) / (2 * Math.PI));
    const max = Math.max(...us);
    for (let k = 0; k < 3; k++) {
      uv[(t + k) * 2] = max - us[k] > 0.5 ? us[k] + 1 : us[k]; // atrás, donde da la vuelta: sin costura
      uv[(t + k) * 2 + 1] = Math.min(1, Math.max(0, (p.getY(t + k) - y0) / (y1 - y0)));
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.userData = { compartida: true, altoRecto: y1 - y0, radio: 12 };
  return g;
}
// torso: el estampado va en la cara de enfrente (proyección plana); el resto, liso
function uvTorso(g0) {
  const t = g0.toNonIndexed(), p = t.attributes.position, n = t.attributes.normal;
  t.computeBoundingBox();
  const { min, max } = t.boundingBox, frente = [], resto = [];
  for (let i = 0; i < p.count; i += 3) ((n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2)) / 3 > 0.6 ? frente : resto).push(i);
  const orden = [...frente, ...resto], pos = new Float32Array(p.count * 3), nor = new Float32Array(p.count * 3), uv = new Float32Array(p.count * 2);
  orden.forEach((i, j) => {
    for (let k = 0; k < 3; k++) {
      const a = i + k, b = j * 3 + k;
      pos.set([p.getX(a), p.getY(a), p.getZ(a)], b * 3); nor.set([n.getX(a), n.getY(a), n.getZ(a)], b * 3);
      uv.set([(p.getX(a) - min.x) / (max.x - min.x), (p.getY(a) - min.y) / (max.y - min.y)], b * 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.addGroup(0, frente.length * 3, 1); g.addGroup(frente.length * 3, resto.length * 3, 0);
  g.userData.compartida = true;
  return g;
}

// coloca una pieza con la matriz de LDraw (x y z a b c d e f g h i; y hacia abajo y frente -z) ya pasada a la escena
function colocar(obj, [x, y, z, a = 1, b = 0, c = 0, d = 0, e = 1, f = 0, g = 0, h = 0, i = 1]) {
  const m = new THREE.Matrix4().set(a, -b, -c, x, -d, e, f, -y, -g, h, i, -z, 0, 0, 0, 1);
  m.decompose(obj.position, obj.quaternion, obj.scale);
  return obj;
}
// armado de una minifigura en LDraw (respecto al torso)
const LUGAR = {
  cabeza: [0, -24, 0], cadera: [0, 32, 0], piernas: [0, 44, 0],
  brazoDer: [-15.552, 9, 0, 0.985, -0.17, 0, 0.17, 0.985, 0, 0, 0, 1], brazoIzq: [15.552, 9, 0, 0.985, 0.17, 0, -0.17, 0.985, 0, 0, 0, 1],
  manoDer: [-23.69, 26.774, -9.898, 0.985, -0.12, 0.12, 0.17, 0.696, -0.696, 0, 0.707, 0.707],
  manoIzq: [23.69, 26.774, -9.898, 0.985, 0.12, -0.12, -0.17, 0.696, -0.696, 0, 0.707, 0.707],
};
const malla = (geo, mat, lugar) => colocar(new THREE.Mesh(geo, mat), lugar);

// ---------- lo que no tiene pieza en LDraw: birrete, gorrito de cumpleaños, moño, falda corta y bufanda ----------
// (medidas en unidades de la escena; van en un grupo con escala 1/S)
const enEscena = (obj, x, y, z) => { const g = new THREE.Group(); g.scale.setScalar(1 / S); g.position.set(x, y, z); g.add(obj); return g; };
const caja = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
function cajaTrapecio(w, h, d, bx, bz) { // abajo mide (w·bx, d·bz)
  const geo = new THREE.BoxGeometry(w, h, d), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) { pos.setX(i, pos.getX(i) * bx); pos.setZ(i, pos.getZ(i) * bz); }
  geo.computeVertexNormals();
  return geo;
}
function gorroHecho(h) {
  const g = new THREE.Group();
  if (h === 'birrete') {
    const negro = plastico('#1E1A18');
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 40), negro); copa.position.y = 0.26; g.add(copa);
    const tabla = caja(0.8, 0.04, 0.8, negro, 0, 0.36); tabla.rotation.y = Math.PI / 4; g.add(tabla);
    const oro = plastico('#E0B44C');
    const borla = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), oro); borla.position.set(0.4, 0.23, 0.12); g.add(borla);
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), oro); punta.position.set(0.4, 0.06, 0.12); g.add(punta);
  } else if (h === 'cumple') {
    const cono = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 32), plastico('#F06AA6')); cono.position.y = 0.58; g.add(cono);
    const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), plastico('#FFD23F')); pompon.position.y = 0.83; g.add(pompon);
  } else if (h === 'mono') {
    const mat = plastico('#E45A84'), m = new THREE.Group();
    [-1, 1].forEach(s => { const l = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16), mat); l.rotation.z = s * Math.PI / 2; l.position.x = s * 0.08; m.add(l); });
    m.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat));
    m.position.set(0.24, 0.32, 0.2); m.rotation.set(-0.5, 0.6, -0.3); g.add(m);
  }
  return g;
}
function bufanda() {
  const b = new THREE.Group(), mat = plastico('#B3262E');
  const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 12, 32), mat); anillo.rotation.x = Math.PI / 2; b.add(anillo);
  b.add(caja(0.12, 0.3, 0.05, mat, 0.12, -0.16, 0.22));
  return b;
}
// lo que lleva en la mano: el mismo dibujo del 2D, siempre de frente a la cámara
function accesorio(v) {
  if (!ACC[v]) return null;
  const svg = `<svg viewBox="-32 -50 64 72" xmlns="http://www.w3.org/2000/svg">${ACC[v]}</svg>`;
  const tex = texturaDeSVG(svg, 256 * ESCALA_PX, 288 * ESCALA_PX, null, (ctx, img) => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.center.set(0.5, 22 / 72); s.scale.set(0.86 / S, 0.97 / S, 1);
  return s;
}

// ---------- la figura completa (en LDU; el torso en el origen) ----------
const CON_PIEZA = { gorra: 'gorro-gorra', casco: 'gorro-casco', vaquero: 'gorro-vaquero', sombrero: 'gorro-sombrero' };
const ALZA = { rizos: 12, corto: 3 }; // LDU que el pelo sube sobre la cabeza (gorros hechos a mano)
const COLOR_GORRO = { casco: '#F2B705', vaquero: '#8A5634', sombrero: '#1E1A18' };
async function armarFigura(f0) {
  const f = normFig({ ...f0, extras: [...(f0.extras || [])] });
  const piel = f.skin || '#F6D3B3', ropa = f.torso || '#1F2A44', manga = f.outfit === 'blusa' ? piel : ropa;
  const vestido = f.outfit === 'vestido', h = f.hat && f.hat !== 'ninguno' ? f.hat : '';
  const tapan = ['gorra', 'casco', 'sombrero', 'vaquero', 'birrete'].includes(h) && !['largo', 'ondas'].includes(f.hair);
  const pelo = f.hair && f.hair !== 'calvo' && !tapan ? 'pelo-' + f.hair : '';
  const [cab, tor, bd, bi, mano, cad, pd, pi, ves, gPelo, gGorro] = await Promise.all([
    geoCabeza(), geoTorso(), pieza('brazoDer'), pieza('brazoIzq'), pieza('mano'),
    vestido ? null : pieza('cadera'), vestido ? null : pieza('piernaDer'), vestido ? null : pieza('piernaIzq'),
    vestido ? pieza('vestido') : null, pelo ? pieza(pelo) : null, CON_PIEZA[h] ? pieza(CON_PIEZA[h]) : null]);

  const fig = new THREE.Group();
  // cara: el dibujo del 2D alrededor de la cabeza, del tamaño de una cara impresa de verdad
  const { altoRecto, radio } = cab.userData;
  const cara = texturaDeSVG(caraSVG(f), 1024 * ESCALA_PX, 512 * ESCALA_PX, piel, (ctx, img) => {
    const W = ctx.canvas.width, H = ctx.canvas.height, w = W * 0.3, alto = w / W * 2 * Math.PI * radio * 48 / 68;
    const hpx = alto / altoRecto * H;
    ctx.drawImage(img, (W - w) / 2, (H - hpx) / 2 + hpx * 0.02, w, hpx);
  });
  cara.wrapS = THREE.RepeatWrapping;
  fig.add(malla(cab, plastico('#fff', { map: cara }), LUGAR.cabeza));
  const estampado = texturaDeSVG(estampadoSVG(f), 384 * ESCALA_PX, 384 * ESCALA_PX, ropa, (ctx, img) => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height));
  fig.add(new THREE.Mesh(tor, [plastico(ropa), plastico('#fff', { map: estampado })]));
  const mManga = plastico(manga), mPiel = plastico(piel);
  fig.add(malla(bd, mManga, LUGAR.brazoDer), malla(bi, mManga, LUGAR.brazoIzq), malla(mano, mPiel, LUGAR.manoDer), malla(mano, mPiel, LUGAR.manoIzq));
  if (vestido) fig.add(malla(ves, plastico(ropa), LUGAR.cadera));
  else {
    const mPierna = plastico(f.legs || '#2E4A8C');
    fig.add(malla(cad, mPierna, LUGAR.cadera), malla(pd, mPierna, LUGAR.piernas), malla(pi, mPierna, LUGAR.piernas));
    if (f.outfit === 'falda') fig.add(enEscena(new THREE.Mesh(cajaTrapecio(0.98, 0.34, 0.51, 1.12, 1.3), plastico(ropa)), 0, -40, 0));
  }
  if (gPelo) fig.add(malla(gPelo, plastico(f.hairColor || '#1F1712'), LUGAR.cabeza));
  if (gGorro) fig.add(malla(gGorro, plastico(COLOR_GORRO[h] || ropa), LUGAR.cabeza));
  else if (h) fig.add(enEscena(gorroHecho(h), 0, 12 + (gPelo ? ALZA[f.hair] || 4 : 0), 0)); // centro de la cabeza, encima del pelo
  if (f.hand === 'bufanda') fig.add(enEscena(bufanda(), 0, 1, 0));
  else { const a = accesorio(f.hand); if (a) { a.position.set(23.69, -30, 14); fig.add(a); } }

  // de LDU a la escena, con los pies en el piso
  const escala = new THREE.Group(); escala.scale.setScalar(S); escala.add(fig);
  const caja3 = new THREE.Box3().setFromObject(fig); fig.position.y = -caja3.min.y;
  const raiz = new THREE.Group(); raiz.add(escala); escala.position.y = -1.22;
  return raiz;
}

// ---------- visor: escena, giro con arrastre y cierre ----------
let visor = null;
function crearVisor(lienzo) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  lienzo.appendChild(renderer.domElement);
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camara.position.set(0, 0.35, 7.6); camara.lookAt(0, 0.05, 0);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.25));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-3, 5, 5); escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xfff1e0, 0.55); relleno.position.set(4, 1, 2); escena.add(relleno);
  const base = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
  base.rotation.x = -Math.PI / 2; base.position.y = -1.225; escena.add(base);
  const estado = { renderer, escena, camara, lienzo, figura: null, giro: 0.5, inclina: 0, solo: true, arrastre: null, corriendo: false };
  const medir = () => { const w = lienzo.clientWidth, h = lienzo.clientHeight; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); };
  estado.medir = medir;
  // arrastrar gira (y un poco de inclinación); doble toque vuelve al frente
  lienzo.addEventListener('pointerdown', e => { estado.arrastre = { x: e.clientX, y: e.clientY, g: estado.giro, i: estado.inclina }; estado.solo = false; lienzo.setPointerCapture(e.pointerId); });
  lienzo.addEventListener('pointermove', e => {
    const a = estado.arrastre; if (!a) return;
    estado.giro = a.g + (e.clientX - a.x) * 0.012;
    estado.inclina = Math.max(-0.45, Math.min(0.45, a.i + (e.clientY - a.y) * 0.006));
  });
  const soltar = () => { estado.arrastre = null; };
  lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('dblclick', () => { estado.giro = 0; estado.inclina = 0; });
  addEventListener('resize', () => estado.corriendo && medir());
  return estado;
}
function animar() {
  if (!visor?.corriendo) return;
  if (visor.solo) visor.giro += 0.008;
  if (!visor.figura) return requestAnimationFrame(animar);
  visor.figura.rotation.y = visor.giro; visor.figura.rotation.x = visor.inclina;
  visor.renderer.render(visor.escena, visor.camara);
  requestAnimationFrame(animar);
}
function soltarFigura() {
  if (!visor?.figura) return;
  visor.escena.remove(visor.figura);
  visor.figura.traverse(o => {
    if (!o.geometry?.userData.compartida) o.geometry?.dispose();
    [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); });
  });
  visor.figura = null;
}

// abre la figura f (objeto de la figura del personalizador) en 3D
// (las piezas llegan en un momento: mientras, el visor ya está abierto con "Armando…")
let pedido = 0;
export async function abrir3D(f, titulo) {
  const lienzo = $('#stage3d'), mio = ++pedido;
  visor = visor || crearVisor(lienzo);
  soltarFigura();
  Object.assign(visor, { giro: 0.5, inclina: 0, solo: true });
  $('#t3d').textContent = titulo;
  lienzo.classList.add('cargando');
  openModal('#c3d');
  setTimeout(() => $('#c3d .full-x')?.focus({ preventScroll: true }), 60);
  const figura = await armarFigura(f);
  if (mio !== pedido) return; // ya pidieron otra figura (o cerraron)
  lienzo.classList.remove('cargando');
  visor.figura = figura; visor.escena.add(figura);
  visor.medir();
  if (!visor.corriendo) { visor.corriendo = true; animar(); }
}
export function cerrar3D() {
  if (!visor) return;
  pedido++; visor.corriendo = false; soltarFigura();
  closeModal('#c3d');
}
