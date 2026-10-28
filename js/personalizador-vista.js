/* Pehn Design — PERSONALIZADOR · VISTA: lo que se repinta cuando cambia el diseño (dibujo, precio animado, desglose)
   y el vuelo de la vista previa hacia el carrito. */
import { CONFIG } from '../datos.js';
import { renderProduct } from '../dibujos.js';
import { $, esc, movimientoReducido } from './utiles.js';
import { fmt } from './formato.js';
import { disenoActual } from './estado.js';
import { priceOf, lineTotal } from './producto.js';

// ---------- precio animado ----------
let lastPrice = null, priceRAF = 0, liveT;
export const olvidarPrecio = () => { lastPrice = null; }; // al abrir otro diseño el total no "cuenta" desde el anterior
function animatePrice(to) {
  const el = $('#cTotal');
  if (lastPrice === null || lastPrice === to) { el.textContent = fmt(to); lastPrice = to; return; }
  const from = lastPrice, t0 = performance.now(), D = 380;
  cancelAnimationFrame(priceRAF);
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) priceRAF = requestAnimationFrame(step);
  };
  priceRAF = requestAnimationFrame(step);
  lastPrice = to;
}

// ---------- dibujo y desglose ----------
let stageRAF = 0;
function pintarEscenario(first, quiet) {
  cancelAnimationFrame(stageRAF);
  stageRAF = requestAnimationFrame(() => {
    const { p, cfg, photo, photoPos, showPhoto } = disenoActual(), stage = $('#cStage');
    stage.innerHTML = showPhoto ? `<img class="stage-photo" src="${photo}" alt="Foto real del pedido" width="480" height="600" style="object-position:${photoPos || '50% 50%'}">` : renderProduct(p, cfg);
    if (!first && !quiet) stage.firstElementChild?.animate([{ transform: 'scale(.985)', opacity: .7 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
}
function pintarDesglose(lines, t, qty) {
  $('#cBreak').innerHTML = `<ul>${lines.map(l => `<li><span>${esc(l.label)}</span><b>${l.price < 0 ? '−' + fmt(-l.price) : fmt(l.price)}</b></li>`).join('')}
    ${qty > 1 ? `<li><span>Cantidad</span><b>× ${qty}</b></li>` : ''}${t.disc ? `<li class="disc"><span>Descuento ${CONFIG.bulkPct}%</span><b>−${fmt(t.disc)}</b></li>` : ''}</ul>`;
}
// después de cada cambio: dibujo, total (animado, y anunciado a lectores de pantalla) y desglose
export function update(first = false, quiet = false) {
  const { p, cfg, qty } = disenoActual();
  pintarEscenario(first, quiet);
  const { lines, unit } = priceOf(p, cfg);
  const t = lineTotal(unit, qty);
  animatePrice(t.total);
  clearTimeout(liveT); liveT = setTimeout(() => { const l = $('#cLive'); if (l) l.textContent = `Total ${fmt(t.total)}`; }, 700);
  pintarDesglose(lines, t, qty);
}

// ---------- la vista previa "vuela" al carrito flotante ----------
export function flyToCart() {
  const from = $('#cStage')?.getBoundingClientRect(), fab = $('#cartBtn');
  if (!from || !fab || movimientoReducido()) { bumpCart(); return; }
  const to = fab.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  ghost.innerHTML = renderProduct(disenoActual().p, disenoActual().cfg);
  const size = Math.min(from.width, from.height) * .8;
  Object.assign(ghost.style, { width: size + 'px', height: size + 'px', left: (from.left + from.width / 2 - size / 2) + 'px', top: (from.top + from.height / 2 - size / 2) + 'px' });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px, ${dy * .3 - 60}px) scale(.45)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .4 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.75,0)' }).onfinish = () => { ghost.remove(); bumpCart(); };
}
function bumpCart() { const cb = $('#cartBtn'); if (!cb) return; cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); }
