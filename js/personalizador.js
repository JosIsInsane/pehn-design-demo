/* Pehn Design — PERSONALIZADOR · APERTURA: arma el diseño abierto (estado.js) y abre el modal o la página del teléfono.
   Es la puerta de entrada del personalizador: personalizador-carga.js lo descarga solo cuando se abre un producto
   y llama a iniciarPersonalizador() una vez. */
import { CARDS, productoDe, catName, normCfg, figDefault } from '../datos.js';
import { $, clone } from './utiles.js';
import { abrirDiseno, setBorrador } from './estado.js';
import { defaults, cardCfg } from './producto.js';
import { fotoDisponible } from './tarjetas.js';
import { openModal } from './modales.js';
import { showTip, zReset, iniciarZoom } from './zoom.js';
import { MOV, cargarBorrador, buildForm, vvAjusta, iniciarPaginaMovil } from './personalizador-movil.js';
import { update, olvidarPrecio } from './personalizador-vista.js';
import { iniciarEventos } from './personalizador-eventos.js';
import { iniciarCierre } from './personalizador-cierre.js';
import { iniciarPantallaCompleta } from './pantalla-completa.js';

// qué hay abierto: { p, cfg, qty, editIdx, fig (figura activa), step, photo, photoPos, showPhoto, mov (¿teléfono?), sub (¿pantalla de figura?), stack, open, start, draft, done }
function nuevoDiseno(p, cfg, qty, editIdx, photo, photoPos) {
  const c = normCfg(p, cfg ? clone(cfg) : defaults(p));
  return {
    p, cfg: c, qty, editIdx, fig: 0, step: 0, photo, photoPos, showPhoto: false,
    start: JSON.stringify([c, qty]),
    // en el teléfono (≤ 760 px) es una página con su propio historial; en escritorio sigue el modal de siempre
    mov: MOV.matches, sub: false, stack: [{ step: 0, sub: false }], open: new Set(['pcara']),
  };
}
// título, descripción y foto de referencia del encabezado
function pintarEncabezado(cur) {
  const { p, photo, photoPos } = cur;
  $('#cCat').textContent = photo ? 'Inspirado en un pedido real' : catName(p.cat);
  $('#cTitle').textContent = p.name;
  $('#cDesc').textContent = p.desc;
  $('#cPreview').style.setProperty('--pv', p.render === 'frame' ? '#E9E1D6' : p.bg);
  const rb = $('#refBtn'); rb.hidden = !photo; rb.classList.remove('on');
  if (photo) { rb.querySelector('img').src = photo; rb.querySelector('img').style.objectPosition = photoPos || '50% 50%'; }
  $('#cBreak').hidden = true; $('#brkBtn').setAttribute('aria-expanded', 'false');
}

export function openCustom(id, cfg, qty = 1, editIdx = null, photo = null, photoPos = null) {
  const p = productoDe(id); if (!p) return;
  const cur = abrirDiseno(nuevoDiseno(p, cfg, qty, editIdx, photo, photoPos));
  $('#custom').classList.toggle('pg', cur.mov);
  $('#custom .sheet').classList.remove('mini', 'kb');
  if (cur.mov) { history.pushState({ pehn: 0 }, ''); setBorrador(editIdx === null ? cargarBorrador(p.id) : null); }
  pintarEncabezado(cur);
  olvidarPrecio();
  buildForm(); update(true);
  openModal('#custom');
  requestAnimationFrame(() => { zReset(false); showTip(); });
  $('#cForm').scrollTop = 0;
  if (cur.mov) { vvAjusta(); setTimeout(() => $('#cScreen').focus({ preventScroll: true }), 80); }
}
// abre una tarjeta del catálogo (con su foto real, si existe). figuras: cuántas figuras traer de entrada (?figuras=3)
export function openCard(ci, { figuras } = {}) {
  const card = CARDS[ci]; if (!card) return;
  const cfg = cardCfg(card), g = productoDe(card.id).groups.find(x => x.type === 'figs');
  if (g && figuras) {
    const n = Math.max(g.min, Math.min(g.max, Math.round(figuras)));
    cfg[g.id] = Array.from({ length: n }, (_, i) => cfg[g.id][i] || figDefault(i));
  }
  openCustom(card.id, cfg, 1, null, card.photo && fotoDisponible(card.photo) ? card.photo : null, card.photoPos);
}

// pone a escuchar zoom, teléfono, formulario y cierre (una sola vez, al descargar el personalizador)
export function iniciarPersonalizador() {
  iniciarZoom();
  iniciarPaginaMovil();
  iniciarEventos();
  iniciarCierre();
  iniciarPantallaCompleta();
}
