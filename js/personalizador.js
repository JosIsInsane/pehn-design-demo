/* Pehn Design — PERSONALIZADOR · APERTURA: arma el diseño actual (App.cur) y abre el modal o la página del teléfono.
   Depende de: base.js, producto.js, tarjetas.js (App.fotos), zoom.js, modales.js, personalizador-form/-movil/-vista.js, datos.js (normCfg, catName).
   Lo usan: cajon.js (editItem), catalogo.js (?card= y ?edit=) y personalizador-eventos.js. */

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

function openCustom(id, cfg, qty = 1, editIdx = null, photo = null, photoPos = null) {
  const p = productoDe(id); if (!p) return;
  const cur = App.cur = nuevoDiseno(p, cfg, qty, editIdx, photo, photoPos);
  $('#custom').classList.toggle('pg', cur.mov);
  $('#custom .sheet').classList.remove('mini', 'kb');
  if (cur.mov) { history.pushState({ pehn: 0 }, ''); cur.draft = editIdx === null ? cargarBorrador(p.id) : null; }
  pintarEncabezado(cur);
  olvidarPrecio();
  buildForm(); update(true);
  openModal('#custom');
  requestAnimationFrame(() => { zReset(false); showTip(); });
  $('#cForm').scrollTop = 0;
  if (cur.mov) { vvAjusta(); setTimeout(() => $('#cScreen').focus({ preventScroll: true }), 80); }
}
// abre una tarjeta del catálogo (con su foto real, si existe)
function openCard(ci) {
  const card = CARDS[ci]; if (!card) return;
  openCustom(card.id, cardCfg(card), 1, null, card.photo && App.fotos[card.photo] !== false ? card.photo : null, card.photoPos);
}
