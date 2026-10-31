/* Pehn Design — FIGURA EN 3D: la minifigura armada con formas simples (Three.js) que se gira con el dedo o el mouse.
   Se descarga solo al tocar "Ver en 3D" (import() desde personalizador-eventos.js); Three.js va en vendor/ (MIT).
   Medidas en "unidades de minifigura": el pie en y = 0 y la cabeza arriba. Luz de plástico con Phong. */
import * as THREE from '../vendor/three-0.170.0.module.min.js';
import { caraSVG, estampadoSVG } from '../dibujos.js';
import { $ } from './utiles.js';
import { openModal, closeModal } from './modales.js';

const ESCALA_PX = 2; // nitidez de las texturas en pantallas densas

// ---------- materiales y texturas ----------
const plastico = color => new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x3a3a3a });
const oscuro = (hex, p) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, -p); return c; };
// dibuja un SVG en un canvas y lo devuelve como textura (para la cara y el estampado del torso)
function texturaDeSVG(svg, ancho, alto, fondo, dibujar) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho; canvas.height = alto;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = fondo; ctx.fillRect(0, 0, ancho, alto);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const img = new Image();
  img.onload = () => { dibujar(ctx, img); tex.needsUpdate = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return tex;
}

// ---------- piezas ----------
function cabeza(f) {
  const g = new THREE.Group(), piel = f.skin || '#F6D3B3';
  // la cara va al frente del cilindro (thetaStart = π: el centro de la textura queda mirando a la cámara)
  const cara = texturaDeSVG(caraSVG(f), 1024 * ESCALA_PX / 2, 320 * ESCALA_PX / 2, piel, (ctx, img) => {
    const w = ctx.canvas.width * 0.33, h = w * 48 / 68;
    ctx.drawImage(img, (ctx.canvas.width - w) / 2, (ctx.canvas.height - h) / 2 + ctx.canvas.height * 0.06, w, h);
  });
  const lados = plastico(piel);
  const cil = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 48, 1, false, Math.PI), [new THREE.MeshPhongMaterial({ map: cara, shininess: 70, specular: 0x3a3a3a }), lados, lados]);
  g.add(cil);
  [0.25, -0.25].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.03, 12, 48), lados); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); });
  [0.28, -0.28].forEach(y => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 48), lados); t.position.y = y; g.add(t); });
  const boton = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 32), lados); boton.position.y = 0.36; g.add(boton);
  return g;
}

// torso: caja que se angosta arriba, con el estampado al frente
function torso(f) {
  const t = f.torso || '#1F2A44', geo = new THREE.BoxGeometry(0.96, 0.9, 0.5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setX(i, pos.getX(i) * 0.72);
  geo.computeVertexNormals();
  const frente = texturaDeSVG(estampadoSVG(f), 384 * ESCALA_PX / 2, 384 * ESCALA_PX / 2, t, (ctx, img) => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height));
  const liso = plastico(t);
  return new THREE.Mesh(geo, [liso, liso, liso, liso, new THREE.MeshPhongMaterial({ map: frente, shininess: 70, specular: 0x3a3a3a }), liso]);
}

function brazoYMano(lado, colBrazo, piel) {
  const g = new THREE.Group();
  const brazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 8, 16), plastico(colBrazo));
  brazo.position.y = -0.27; g.add(brazo);
  const muneca = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 12), plastico(piel)); muneca.position.y = -0.56; g.add(muneca);
  // mano en C: anillo abierto, con la abertura hacia adelante y abajo
  const mano = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.038, 12, 24, Math.PI * 1.55), plastico(piel));
  mano.position.set(0, -0.66, 0.03); mano.rotation.set(Math.PI / 2.4, 0, Math.PI * 1.22);
  g.add(mano);
  g.position.set(lado * 0.42, 1.48, 0); g.rotation.z = lado * 0.16; g.rotation.x = -0.12;
  return g;
}

function piernas(f) {
  const g = new THREE.Group(), col = f.outfit === 'vestido' ? (f.torso || '#1F2A44') : (f.legs || '#2E4A8C');
  if (f.outfit === 'vestido') {
    const falda = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 0.74, 32), plastico(col)); falda.position.y = 0.37; g.add(falda);
    return g;
  }
  const cadera = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.14, 0.5), plastico(col)); cadera.position.y = 0.67; g.add(cadera);
  [-0.245, 0.245].forEach(x => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.5), plastico(col)); p.position.set(x, 0.3, 0); g.add(p);
    const pie = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.56), plastico(oscuro(col, 0.02))); pie.position.set(x, 0.1, 0.03); g.add(pie);
  });
  if (f.outfit === 'falda') { const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.36, 32), plastico(col)); fa.position.y = 0.56; g.add(fa); }
  return g;
}

// ---------- pelo y sombreros (formas aproximadas) ----------
const casquete = (r, alto, color) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.56), plastico(color));
  m.scale.y = alto; return m;
};
function pelo(f) {
  const g = new THREE.Group(), c = f.hairColor || '#1F1712', estilo = f.hair;
  if (!estilo || estilo === 'calvo') return g;
  if (estilo === 'rizos') {
    [[0, .26, 0], [-.2, .2, .05], [.2, .2, .05], [-.24, .02, .02], [.24, .02, .02], [0, .2, -.2], [-.16, .1, -.2], [.16, .1, -.2], [0, .32, -.08]]
      .forEach(([x, y, z]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), plastico(c)); s.position.set(x, y, z); g.add(s); });
    return g;
  }
  const casco = casquete(0.385, 1, c); casco.position.y = 0.12; g.add(casco); // tapa el botón y la orilla de arriba
  // nuca: el pelo corto también tapa la parte de atrás de la cabeza
  const nuca = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.36, 0.3, 40, 1, true, Math.PI * 0.55, Math.PI * 0.9), plastico(c));
  nuca.material.side = THREE.DoubleSide; nuca.position.y = -0.03; g.add(nuca);
  if (estilo === 'largo' || estilo === 'ondas') {
    // cae por detrás y a los lados hasta los hombros (deja libre la cara)
    const caida = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.62, 40, 1, true, Math.PI * 0.32, Math.PI * 1.36), plastico(c));
    caida.material.side = THREE.DoubleSide; caida.position.y = -0.2; g.add(caida);
  }
  if (estilo === 'chongo') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), plastico(c)); b.position.set(0, 0.56, -0.08); g.add(b); }
  return g;
}
function sombrero(f) {
  const g = new THREE.Group(), h = f.hat;
  if (!h || h === 'ninguno') return g;
  if (h === 'gorra' || h === 'casco') {
    const col = h === 'casco' ? '#F2B705' : (f.torso || '#B3262E');
    const copa = casquete(0.395, 1, col); copa.position.y = 0.13; g.add(copa);
    const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 32, 1, false, -Math.PI / 2.4, Math.PI / 1.2), plastico(col));
    visera.position.set(0, 0.14, h === 'gorra' ? 0.16 : 0); g.add(visera);
  } else if (h === 'sombrero' || h === 'vaquero') {
    const col = h === 'vaquero' ? '#6B4428' : '#1E1A18';
    const ala = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.03, 40), plastico(col)); ala.position.y = 0.2; g.add(ala);
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.3, 32), plastico(col)); copa.position.y = 0.36; g.add(copa);
  } else if (h === 'birrete') {
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.14, 32), plastico('#1E1A18')); copa.position.y = 0.3; g.add(copa);
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.78), plastico('#1E1A18')); tabla.position.y = 0.39; tabla.rotation.y = Math.PI / 4; g.add(tabla);
    const borla = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 8), plastico('#E0B44C')); borla.position.set(0.36, 0.27, 0.12); g.add(borla);
  } else if (h === 'cumple') {
    const cono = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 32), plastico('#F06AA6')); cono.position.y = 0.6; g.add(cono);
    const pompon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), plastico('#FFD23F')); pompon.position.y = 0.85; g.add(pompon);
  } else if (h === 'mono') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 20), plastico('#E45A84')); m.position.set(0.26, 0.24, 0.05); g.add(m);
  }
  return g;
}

// ---------- la figura completa ----------
function armarFigura(f) {
  const fig = new THREE.Group(), piel = f.skin || '#F6D3B3', manga = f.outfit === 'blusa' ? piel : (f.torso || '#1F2A44');
  fig.add(piernas(f));
  const t = torso(f); t.position.y = 1.19; fig.add(t);
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 20), plastico(piel)); cuello.position.y = 1.68; fig.add(cuello);
  fig.add(brazoYMano(-1, manga, piel), brazoYMano(1, manga, piel));
  const arriba = new THREE.Group(); arriba.position.y = 2.0;
  const tapan = ['gorra', 'casco', 'sombrero', 'vaquero', 'birrete'].includes(f.hat) && !['largo', 'ondas'].includes(f.hair);
  arriba.add(cabeza(f), tapan ? new THREE.Group() : pelo(f), sombrero(f));
  fig.add(arriba);
  fig.position.y = -1.2;
  return fig;
}

// ---------- visor: escena, giro con arrastre y cierre ----------
let visor = null;
function crearVisor(caja) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  caja.appendChild(renderer.domElement);
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camara.position.set(0, 0.35, 7.2); camara.lookAt(0, 0.05, 0);
  escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.25));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-3, 5, 5); escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xfff1e0, 0.55); relleno.position.set(4, 1, 2); escena.add(relleno);
  const base = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
  base.rotation.x = -Math.PI / 2; base.position.y = -1.205; escena.add(base);
  const estado = { renderer, escena, camara, caja, figura: null, giro: 0.5, inclina: 0, solo: true, arrastre: null, corriendo: false };
  const medir = () => { const w = caja.clientWidth, h = caja.clientHeight; renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); };
  estado.medir = medir;
  // arrastrar gira (y un poco de inclinación); doble toque vuelve al frente
  caja.addEventListener('pointerdown', e => { estado.arrastre = { x: e.clientX, y: e.clientY, g: estado.giro, i: estado.inclina }; estado.solo = false; caja.setPointerCapture(e.pointerId); });
  caja.addEventListener('pointermove', e => {
    const a = estado.arrastre; if (!a) return;
    estado.giro = a.g + (e.clientX - a.x) * 0.012;
    estado.inclina = Math.max(-0.45, Math.min(0.45, a.i + (e.clientY - a.y) * 0.006));
  });
  const soltar = () => { estado.arrastre = null; };
  caja.addEventListener('pointerup', soltar); caja.addEventListener('pointercancel', soltar);
  caja.addEventListener('dblclick', () => { estado.giro = 0; estado.inclina = 0; });
  addEventListener('resize', () => estado.corriendo && medir());
  return estado;
}
function animar() {
  if (!visor?.corriendo) return;
  if (visor.solo) visor.giro += 0.008;
  visor.figura.rotation.y = visor.giro; visor.figura.rotation.x = visor.inclina;
  visor.renderer.render(visor.escena, visor.camara);
  requestAnimationFrame(animar);
}
function soltarFigura() {
  if (!visor?.figura) return;
  visor.escena.remove(visor.figura);
  visor.figura.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); });
  visor.figura = null;
}

// abre la figura f (objeto de la figura del personalizador) en 3D
export function abrir3D(f, titulo) {
  const caja = $('#stage3d');
  visor = visor || crearVisor(caja);
  soltarFigura();
  visor.figura = armarFigura(f); visor.escena.add(visor.figura);
  Object.assign(visor, { giro: 0.5, inclina: 0, solo: true });
  $('#t3d').textContent = titulo;
  openModal('#c3d');
  requestAnimationFrame(() => { visor.medir(); visor.corriendo = true; animar(); });
  setTimeout(() => $('#c3d .full-x')?.focus({ preventScroll: true }), 60);
}
export function cerrar3D() {
  if (!visor) return;
  visor.corriendo = false; soltarFigura();
  closeModal('#c3d');
}
