/* Pehn Design — FIGURA EN 3D: la minifigura armada con formas simples (Three.js) que se gira con el dedo o el mouse.
   Se descarga solo al tocar "Ver en 3D" (import() desde personalizador-eventos.js); Three.js va en vendor/ (MIT).
   Medidas en "unidades de minifigura": el pie en y = 0 y la cabeza arriba. Luz de plástico con Phong. */
import * as THREE from '../vendor/three-0.170.0.module.min.js';
import { caraSVG, estampadoSVG } from '../dibujos.js';
import { normFig } from '../datos.js';
import { ACC } from '../accesorios.js';
import { $ } from './utiles.js';
import { openModal, closeModal } from './modales.js';

const ESCALA_PX = 2; // nitidez de las texturas en pantallas densas

// ---------- materiales y texturas ----------
const plastico = color => new THREE.MeshPhongMaterial({ color, shininess: 80, specular: 0x404040 });
const oscuro = (hex, p) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, -p); return c; };
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
const caja = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
// caja que se angosta o ensancha: arriba mide (w·ax, d·az) y abajo (w·bx, d·bz)
function cajaTrapecio(w, h, d, ax, az, bx, bz) {
  const geo = new THREE.BoxGeometry(w, h, d), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const arriba = pos.getY(i) > 0;
    pos.setX(i, pos.getX(i) * (arriba ? ax : bx)); pos.setZ(i, pos.getZ(i) * (arriba ? az : bz));
  }
  geo.computeVertexNormals();
  return geo;
}

/* Medidas de una minifigura real (en mm) pasadas a unidades de aquí (1 = 16.25 mm, el ancho del torso abajo ≈ 0.96):
   piernas 0 → 0.74 · cadera → 0.935 · torso (12.8 mm) → 1.725 · cabeza (Ø 9.6 mm, orillas redondas) → 2.31 · botón arriba */
const Y = { cadera: 0.835, torso: 1.33, cabeza: 2.04 };

// ---------- cabeza: un torno con las orillas redondas; la cara va en la parte recta ----------
function cabeza(f) {
  const g = new THREE.Group(), piel = f.skin || '#F6D3B3', R = 0.295, H = 0.54, rc = 0.07;
  const perfil = [new THREE.Vector2(0.001, -H / 2)];
  const arco = (cx, cy, a0, a1) => { for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; perfil.push(new THREE.Vector2(cx + rc * Math.cos(a), cy + rc * Math.sin(a))); } };
  arco(R - rc, -H / 2 + rc, -Math.PI / 2, 0);
  const iRecta = perfil.length - 1, TRAMOS = 16;
  for (let k = 1; k <= TRAMOS; k++) perfil.push(new THREE.Vector2(R, -H / 2 + rc + (H - 2 * rc) * k / TRAMOS));
  const fRecta = perfil.length - 1;
  arco(R - rc, H / 2 - rc, 0, Math.PI / 2);
  perfil.push(new THREE.Vector2(0.001, H / 2));
  // phiStart = -π: el centro de la textura (u = 0.5) queda al frente, mirando a la cámara
  const geo = new THREE.LatheGeometry(perfil, 64, -Math.PI, Math.PI * 2);
  const v0 = iRecta / (perfil.length - 1), v1 = fRecta / (perfil.length - 1);
  const cara = texturaDeSVG(caraSVG(f), 1024 * ESCALA_PX, 512 * ESCALA_PX, piel, (ctx, img) => {
    const W = ctx.canvas.width, Hc = ctx.canvas.height;
    const w = W * 0.31, anchoReal = w / W * 2 * Math.PI * R, altoReal = anchoReal * 48 / 68;
    const h = altoReal / (H - 2 * rc) * (v1 - v0) * Hc, centro = (1 - (v0 + v1) / 2) * Hc;
    ctx.drawImage(img, (W - w) / 2, centro - h / 2 + h * 0.04, w, h);
  });
  g.add(new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: cara, shininess: 80, specular: 0x404040 })));
  // botón de arriba, hueco como en las cabezas de ahora
  const piel3 = plastico(piel);
  const boton = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.148, 0.1, 40), piel3); boton.position.y = H / 2 + 0.05; g.add(boton);
  const hueco = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), plastico(oscuro(piel, 0.22))); hueco.rotation.x = -Math.PI / 2; hueco.position.y = H / 2 + 0.101; g.add(hueco);
  return g;
}

// ---------- torso: trapecio (más angosto arriba), estampado al frente y el cuello que entra en la cabeza ----------
function torso(f) {
  const t = f.torso || '#1F2A44', g = new THREE.Group();
  const frente = texturaDeSVG(estampadoSVG(f), 384 * ESCALA_PX, 384 * ESCALA_PX, t, (ctx, img) => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height));
  const liso = plastico(t);
  g.add(new THREE.Mesh(cajaTrapecio(0.96, 0.79, 0.49, 0.75, 0.9, 1, 1), [liso, liso, liso, liso, new THREE.MeshPhongMaterial({ map: frente, shininess: 80, specular: 0x404040 }), liso]));
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 24), liso); cuello.position.y = 0.43; g.add(cuello);
  return g;
}

// ---------- brazo doblado en el codo hacia adelante y mano en C (abierta al frente) ----------
function brazoYMano(lado, colBrazo, piel) {
  const g = new THREE.Group(), mat = plastico(colBrazo), matPiel = plastico(piel);
  const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(lado * 0.05, -0.42, -0.03), new THREE.Vector3(lado * 0.07, -0.5, 0.2));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 24, 0.115, 20, false), mat));
  const hombro = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), mat); g.add(hombro);
  const fin = curva.getPoint(1), dir = curva.getTangent(1);
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), mat);
  tapa.position.copy(fin); tapa.lookAt(fin.clone().add(dir)); g.add(tapa);
  // muñeca y mano: siguen la dirección del antebrazo
  const mano = new THREE.Group(); mano.position.copy(fin); mano.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); g.add(mano);
  const muneca = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 14), matPiel); muneca.position.y = -0.05; mano.add(muneca);
  const c = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.05, 14, 28, Math.PI * 1.5), matPiel);
  c.rotation.set(-Math.PI / 2, 0, -Math.PI / 4); c.position.set(0, -0.12, 0.13);
  const agarre = new THREE.Group(); agarre.rotation.x = 1.0; agarre.add(c); mano.add(agarre);
  g.userData.puntoMano = new THREE.Vector3(fin.x, fin.y - 0.1, fin.z + 0.14);
  g.position.set(lado * 0.4, Y.torso + 0.27, 0); g.rotation.z = lado * 0.13;
  return g;
}

// ---------- cadera y piernas (o vestido / falda) ----------
function piernas(f) {
  const g = new THREE.Group();
  if (f.outfit === 'vestido') {
    // como la pieza de falda de LEGO: más ancha y honda abajo
    const col = f.torso || '#1F2A44';
    g.add(new THREE.Mesh(cajaTrapecio(0.96, 0.935, 0.49, 1, 1, 1.1, 1.36), plastico(col)).translateY(0.4675));
    return g;
  }
  const col = f.legs || '#2E4A8C', mat = plastico(col);
  g.add(caja(0.96, 0.2, 0.49, mat, 0, Y.cadera));
  g.add(caja(0.08, 0.22, 0.4, plastico(oscuro(col, 0.05)), 0, 0.64)); // la pieza del centro, entre las piernas
  [-0.2525, 0.2525].forEach(x => {
    g.add(caja(0.455, 0.62, 0.49, mat, x, 0.31));
    // arriba la pierna es redonda (gira en el perno de la cadera)
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.455, 32), mat); r.rotation.z = Math.PI / 2; r.position.set(x, 0.62, 0); g.add(r);
    g.add(caja(0.455, 0.16, 0.56, plastico(oscuro(col, 0.03)), x, 0.08, 0.035)); // pie, un poco hacia adelante
  });
  if (f.outfit === 'falda') g.add(new THREE.Mesh(cajaTrapecio(0.98, 0.34, 0.51, 1, 1, 1.12, 1.3), plastico(f.torso || '#1F2A44')).translateY(0.79));
  return g;
}

// ---------- pelo y sombreros ----------
const casquete = (r, alto, color, hasta = 0.56) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI * hasta), plastico(color));
  m.scale.y = alto; return m;
};
// tela abierta (cilindro sin tapas) que deja libre la cara: arco de 'abre' a 'abre + largo'
const cortina = (r1, r2, alto, color, abre, largo, ondas = 0) => {
  const geo = new THREE.CylinderGeometry(r1, r2, alto, 64, 12, true, abre, largo);
  if (ondas) { // ondulado: la orilla se mete y sale
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(x, z), k = 1 + ondas * Math.sin(a * 9) * (0.5 - y / alto);
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(geo, plastico(color)); m.material.side = THREE.DoubleSide; return m;
};
function pelo(f) {
  const g = new THREE.Group(), c = f.hairColor || '#1F1712', estilo = f.hair;
  if (!estilo || estilo === 'calvo') return g;
  if (estilo === 'rizos') {
    // muchos rizos sobre una esfera, sin tapar la cara
    const mat = plastico(c), base = casquete(0.34, 1, c, 0.62); base.position.y = 0.1; g.add(base);
    for (let i = 0; i < 70; i++) {
      const yy = 1 - (i + 0.5) / 70 * 1.45, r = Math.sqrt(Math.max(0, 1 - yy * yy)), a = i * 2.39996;
      const p = new THREE.Vector3(Math.sin(a) * r, yy, Math.cos(a) * r).multiplyScalar(0.37);
      if (p.y < -0.05 && p.z > 0) continue; // la cara
      if (p.y < 0.12 && p.z > 0.18) continue;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat); s.position.set(p.x, p.y + 0.1, p.z); g.add(s);
    }
    return g;
  }
  const casco = casquete(0.36, 0.95, c); casco.position.y = 0.11; g.add(casco); // tapa el botón y la orilla de arriba
  g.add(cortina(0.36, 0.34, 0.3, c, Math.PI * 0.62, Math.PI * 0.76).translateY(-0.03)); // nuca
  // flequillo: una banda sobre la frente, un poco más baja de un lado
  const fleco = cortina(0.355, 0.35, 0.09, c, -Math.PI * 0.38, Math.PI * 0.76); fleco.position.y = 0.17; g.add(fleco);
  if (estilo === 'lado') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), plastico(c));
    m.scale.set(1.25, 0.55, 0.9); m.position.set(-0.13, 0.27, 0.16); m.rotation.z = 0.25; g.add(m);
  }
  if (estilo === 'corto') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), plastico(c)); m.scale.set(1.6, 0.45, 0.8); m.position.set(0.02, 0.27, 0.2); g.add(m); }
  if (estilo === 'largo' || estilo === 'ondas') {
    // cae por detrás y a los lados hasta los hombros (deja libre la cara)
    const caida = cortina(0.34, estilo === 'ondas' ? 0.41 : 0.38, 0.7, c, Math.PI * 0.3, Math.PI * 1.4, estilo === 'ondas' ? 0.06 : 0);
    caida.position.y = -0.22; g.add(caida);
    const relleno = cortina(0.3, 0.33, 0.6, c, Math.PI * 0.6, Math.PI * 0.8); relleno.position.y = -0.2; g.add(relleno);
  }
  if (estilo === 'chongo') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), plastico(c)); b.position.set(0, 0.44, -0.16); g.add(b); }
  return g;
}
function sombrero(f) {
  const g = new THREE.Group(), h = f.hat;
  if (!h || h === 'ninguno') return g;
  if (h === 'gorra' || h === 'casco') {
    const col = h === 'casco' ? '#F2B705' : (f.torso || '#B3262E'), mat = plastico(col);
    const copa = casquete(0.37, h === 'casco' ? 1.05 : 0.95, col); copa.position.y = 0.12; g.add(copa);
    if (h === 'gorra') {
      const visera = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32, 1, false, -Math.PI / 2, Math.PI), mat);
      visera.scale.z = 0.8; visera.position.set(0, 0.13, 0.27); visera.rotation.x = 0.12; g.add(visera);
      const boton = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), mat); boton.position.y = 0.47; g.add(boton);
    } else { // casco de obra: ala alrededor y la cresta de arriba
      const ala = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 10, 48), mat); ala.rotation.x = Math.PI / 2; ala.position.y = 0.12; ala.scale.set(1, 1.2, 1); g.add(ala);
      g.add(caja(0.08, 0.06, 0.62, mat, 0, 0.47, -0.02));
    }
  } else if (h === 'sombrero' || h === 'vaquero') {
    const col = h === 'vaquero' ? '#8A5634' : '#1E1A18', mat = plastico(col);
    const geo = new THREE.CylinderGeometry(0.62, 0.62, 0.03, 48, 1);
    if (h === 'vaquero') { const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + 0.55 * pos.getX(i) ** 2); geo.computeVertexNormals(); }
    const ala = new THREE.Mesh(geo, mat); ala.position.y = 0.2; g.add(ala);
    const copa = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.32, 40), mat); copa.position.y = 0.37; g.add(copa);
    const hundido = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.5), plastico(oscuro(col, 0.08))); hundido.position.y = 0.53; g.add(hundido);
    const cinta = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.322, 0.06, 40, 1, true), plastico(h === 'vaquero' ? '#3A2618' : '#B3262E')); cinta.position.y = 0.25; g.add(cinta);
  } else if (h === 'birrete') {
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
    m.position.set(0.22, 0.3, 0.2); m.rotation.set(-0.5, 0.6, -0.3); g.add(m);
  }
  return g;
}

// ---------- lo que lleva en la mano: el mismo dibujo del 2D, siempre de frente a la cámara ----------
function accesorio(f, brazo) {
  if (f.hand === 'bufanda') {
    const b = new THREE.Group(), mat = plastico('#B3262E');
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 12, 32), mat); anillo.rotation.x = Math.PI / 2; b.add(anillo);
    b.add(caja(0.12, 0.3, 0.05, mat, 0.12, -0.16, 0.22));
    b.position.y = Y.torso + 0.42; return b;
  }
  if (!ACC[f.hand]) return null;
  const svg = `<svg viewBox="-32 -50 64 72" xmlns="http://www.w3.org/2000/svg">${ACC[f.hand]}</svg>`;
  const tex = texturaDeSVG(svg, 256 * ESCALA_PX, 288 * ESCALA_PX, null, (ctx, img) => ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  s.center.set(0.5, 22 / 72); s.scale.set(0.86, 0.97, 1);
  s.position.copy(brazo.localToWorld(brazo.userData.puntoMano.clone()));
  return s;
}

// ---------- la figura completa ----------
function armarFigura(f0) {
  const f = normFig({ ...f0, extras: [...(f0.extras || [])] });
  const fig = new THREE.Group(), piel = f.skin || '#F6D3B3', manga = f.outfit === 'blusa' ? piel : (f.torso || '#1F2A44');
  fig.add(piernas(f));
  const t = torso(f); t.position.y = Y.torso; fig.add(t);
  const izq = brazoYMano(-1, manga, piel), der = brazoYMano(1, manga, piel);
  fig.add(izq, der);
  const arriba = new THREE.Group(); arriba.position.y = Y.cabeza;
  const tapan = ['gorra', 'casco', 'sombrero', 'vaquero', 'birrete'].includes(f.hat) && !['largo', 'ondas'].includes(f.hair);
  arriba.add(cabeza(f), tapan ? new THREE.Group() : pelo(f), sombrero(f));
  fig.add(arriba);
  fig.updateMatrixWorld(true);
  const acc = accesorio(f, der); if (acc) fig.add(acc);
  fig.position.y = -1.22;
  return fig;
}

// ---------- visor: escena, giro con arrastre y cierre ----------
let visor = null;
function crearVisor(lienzo) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  lienzo.appendChild(renderer.domElement);
  const escena = new THREE.Scene(), camara = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camara.position.set(0, 0.35, 7.2); camara.lookAt(0, 0.05, 0);
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
  const lienzo = $('#stage3d');
  visor = visor || crearVisor(lienzo);
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
