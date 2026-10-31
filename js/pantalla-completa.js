/* Pehn Design — PANTALLA COMPLETA del diseño: el dibujo (o la foto del pedido real) ocupa toda la pantalla.
   Un toque acerca al doble en ese punto y otro aleja; en el teléfono también se puede pellizcar.
   Se cierra con ✕, Escape o tocando fuera del dibujo. Lo inicia personalizador.js. */
import { renderProduct } from '../dibujos.js';
import { $, esc } from './utiles.js';
import { disenoActual } from './estado.js';
import { openModal, closeModal } from './modales.js';

const abierta = () => $('#cFull')?.classList.contains('open');
let volverA = null;

function pintar() {
  const { p, cfg, photo, showPhoto } = disenoActual();
  $('#fullStage').innerHTML = showPhoto && photo
    ? `<img src="${esc(photo)}" alt="Foto real del pedido">`
    : renderProduct(p, cfg).replace('<svg ', `<svg role="img" aria-label="${esc(p.name)}: tu diseño" `);
  $('#fullStage').classList.remove('z2');
}
export function abrirPantallaCompleta() {
  if (!disenoActual()) return;
  volverA = document.activeElement;
  pintar(); openModal('#cFull');
  // pantalla completa de verdad (sin barras del navegador) donde se puede: computadora y Android.
  // En iPhone Safari no lo permite: queda la vista que cubre toda la página.
  $('#cFull').requestFullscreen?.().catch(() => {});
  setTimeout(() => $('#cFull .full-x').focus({ preventScroll: true }), 60);
}
function cerrar() {
  if (!abierta()) return;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  closeModal('#cFull');
  setTimeout(() => volverA?.focus?.({ preventScroll: true }), 220);
}
// un toque sobre el dibujo: acerca al doble justo ahí (otro toque aleja); fuera del dibujo: cierra
function tocar(e) {
  if (e.target.closest('[data-fullclose]')) return cerrar();
  const s = $('#fullStage'), d = s.firstElementChild;
  if (!d || !d.contains(e.target)) return cerrar();
  const r = s.getBoundingClientRect();
  s.style.transformOrigin = `${((e.clientX - r.left) / r.width * 100).toFixed(1)}% ${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`;
  s.classList.toggle('z2');
}
export function iniciarPantallaCompleta() {
  $('#zFull')?.addEventListener('click', abrirPantallaCompleta);
  $('#cFull')?.addEventListener('click', tocar);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierta()) cerrar(); }); // aunque el foco quede en el dibujo
  // salir de la pantalla completa con la tecla o el gesto del sistema también cierra la vista
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && abierta()) cerrar(); });
}
