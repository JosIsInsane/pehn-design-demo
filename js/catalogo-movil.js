/* Pehn Design — CATÁLOGO EN CELULAR Y TABLET (≤ 960 px): barra de búsqueda que se esconde y filtros en un cajón lateral.
   El mismo panel de la columna es un cajón desde la izquierda: entra al historial (Atrás lo cierra) y usa el sistema de
   modales (inert, foco, animación). Depende de: base.js, modales.js, catalogo.js (syncURL). */

// la barra de búsqueda se esconde al bajar y vuelve al subir (o si algo de ella tiene el foco)
const toolbar = $('.toolbar');
if (toolbar) {
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY, movil = innerWidth <= 960, dentro = toolbar.contains(document.activeElement);
    toolbar.classList.toggle('tuck', movil && !dentro && y > lastY && y > toolbar.parentElement.offsetTop + 160);
    if (Math.abs(y - lastY) > 4) lastY = y;
  }, { passive: true });
}

// ---------- cajón de filtros ----------
const mqSide = matchMedia('(max-width:960px)');
// al cruzar los 960 px el panel cambia de columna a cajón (y al revés)
function ajustaSide() {
  const p = $('#sidePanel'), d = $('#side'); if (!p) return;
  if (mqSide.matches) { p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); return; }
  p.removeAttribute('role'); p.removeAttribute('aria-modal'); d.removeAttribute('aria-hidden');
  if (d.classList.contains('open')) { // se agrandó la ventana con el cajón abierto
    d.classList.remove('open', 'closing'); document.body.style.overflow = ''; syncInert();
    if (history.state?.pehnF) history.replaceState(null, '');
    $('#fBtn').setAttribute('aria-expanded', 'false');
  }
}
function abrirFiltros() {
  if (!mqSide.matches || $('#side').classList.contains('open')) return;
  history.pushState({ pehnF: 1 }, '');
  openModal('#side'); $('#fBtn').setAttribute('aria-expanded', 'true');
}
function soltarFiltros() { closeModal('#side'); $('#fBtn').setAttribute('aria-expanded', 'false'); }
function cerrarFiltros() {
  if (!$('#side').classList.contains('open')) return;
  if (history.state?.pehnF) history.back(); else soltarFiltros();
}
if ($('#side')) {
  ajustaSide(); mqSide.addEventListener('change', ajustaSide);
  $('#fBtn').addEventListener('click', abrirFiltros);
  document.addEventListener('click', e => { if (e.target.closest('[data-fclose]')) cerrarFiltros(); });
  $('#fApply').addEventListener('click', () => {
    cerrarFiltros();
    const y = $('.results-meta').getBoundingClientRect().top + scrollY - 130;
    if (scrollY > y) scrollTo({ top: Math.max(0, y), behavior: 'auto' });
  });
  addEventListener('popstate', () => { if ($('#side').classList.contains('open') && !history.state?.pehnF) { soltarFiltros(); syncURL(); } }); // Atrás deja la URL del paso anterior: se reescribe con el filtro actual
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#side').classList.contains('open')) cerrarFiltros(); });
}
