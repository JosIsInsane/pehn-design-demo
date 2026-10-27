/* Pehn Design — CATÁLOGO: filtros por categoría, buscador, orden, lista de tarjetas y su dirección (?cat= ?sub= ?q= ?sort=).
   Depende de: base.js, producto.js, tarjetas.js, movimiento.js (reveal), datos.js (CATS, SUBS, CARDS, catName, subName).
   Arranque: iniciarCatalogo() la llama arranque.js al final (usa personalizador*.js para ?card= y ?edit=). Filtros del celular: catalogo-movil.js. */

const PAGE = 8; // tarjetas por tanda
const filtro = { cat: 'todos', sub: '', q: '', sort: 'feat', shown: PAGE, open: '' };
const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// árbol del filtro: categoría -> subcategorías con productos. Con una sola (o ninguna) la categoría no se despliega.
const ARBOL = CATS.map(([id, nombre]) => {
  const cuenta = sub => CARDS.filter(c => { const p = productoDe(c.id); return id === 'todos' || (p.cat === id && (!sub || p.sub === sub)); }).length;
  const subs = id === 'todos' ? [] : (SUBS[id] || []).map(([sid, sn]) => [sid, sn, cuenta(sid)]).filter(x => x[2]);
  return { id, nombre, n: cuenta(''), subs: subs.length > 1 ? subs : [] };
});
const arbolDe = id => ARBOL.find(g => g.id === id);

// ---------- resultados ----------
function results() {
  const q = norm(filtro.q.trim());
  const coincide = r => (filtro.cat === 'todos' || r.p.cat === filtro.cat) && (!filtro.sub || r.p.sub === filtro.sub)
    && (!q || norm([r.title, r.card.desc || r.p.desc, catName(r.p.cat), subName(r.p.cat, r.p.sub), r.p.name].join(' ')).includes(q));
  const list = CARDS.map((card, ci) => {
    const p = productoDe(card.id);
    return { card, ci, p, price: priceOf(p, cardCfg(card)).unit, title: card.title || p.name };
  }).filter(coincide);
  if (filtro.sort === 'asc') list.sort((x, y) => x.price - y.price);
  if (filtro.sort === 'desc') list.sort((x, y) => y.price - x.price);
  if (filtro.sort === 'name') list.sort((x, y) => x.title.localeCompare(y.title, 'es'));
  return list;
}

// ---------- lista de filtros (se arma una vez; syncFilters solo cambia estados para no perder el foco) ----------
const acordeonHTML = g => g.subs.length
  ? `<li class="acc-item" data-g="${g.id}"><button type="button" class="acc-h" id="ah-${g.id}" data-acc="${g.id}" aria-expanded="false" aria-controls="as-${g.id}"><span>${g.nombre}</span><b>${g.n}</b>${CHEV}</button>
      <div class="acc-sub" id="as-${g.id}" role="group" aria-labelledby="ah-${g.id}"><ul>${[['', 'Ver todo', g.n], ...g.subs].map(([sid, sn, n]) => `<li><button type="button" class="acc-s" data-cat="${g.id}" data-sub="${sid}"><span>${sn}</span><b>${n}</b></button></li>`).join('')}</ul></div></li>`
  : `<li class="acc-item"><button type="button" class="acc-h" data-cat="${g.id}" data-sub=""><span>${g.nombre}</span><b>${g.n}</b></button></li>`;
function renderFilters() { $('#filters').innerHTML = ARBOL.map(acordeonHTML).join(''); syncFilters(); }
function syncFilters() {
  $$('#filters .acc-item[data-g]').forEach(li => {
    const abierto = li.dataset.g === filtro.open;
    li.classList.toggle('open', abierto); li.classList.toggle('act', li.dataset.g === filtro.cat);
    li.querySelector('.acc-h').setAttribute('aria-expanded', abierto);
  });
  $$('#filters [data-cat]').forEach(b => {
    const on = b.dataset.cat === filtro.cat && b.dataset.sub === filtro.sub;
    b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current');
  });
}
// elegir categoría (y subcategoría): una sola abierta a la vez
function elegir(cat, sub = '') {
  const cambia = cat !== filtro.cat || sub !== filtro.sub;
  filtro.cat = cat; filtro.sub = sub; filtro.open = arbolDe(cat)?.subs.length ? cat : '';
  syncFilters(); if (cambia) refresh();
}

// ---------- tarjetas ----------
const plural = n => `${n} producto${n > 1 ? 's' : ''}`;
// contadores, chip del filtro activo y botón "mostrar más"
function pintarEstado(list) {
  const shown = Math.min(filtro.shown, list.length), activo = filtro.cat !== 'todos';
  $('#resCount').textContent = list.length ? plural(list.length) : 'Sin resultados';
  $('#fApply').textContent = list.length ? `Ver ${plural(list.length)}` : 'Sin resultados';
  $('#chip').hidden = !activo; if (activo) $('#chipTxt').textContent = catName(filtro.cat) + (filtro.sub ? ' · ' + subName(filtro.cat, filtro.sub) : '');
  $('#fBadge').hidden = !activo; $('#fBadge').textContent = activo ? '1' : '';
  $('#fBtn').setAttribute('aria-label', activo ? 'Filtros, 1 activo' : 'Filtros');
  $('#loadMore').hidden = shown >= list.length;
  $('#loadTxt').textContent = `Mostrando ${shown} de ${list.length}`;
  $('#loadBtn').textContent = `Mostrar ${Math.min(PAGE, list.length - shown)} más`;
  $('#loadBar').style.transform = `scaleX(${list.length ? shown / list.length : 0})`;
}
const sinResultadosHTML = () => `<div class="empty-search"><h3>Nada por aquí… todavía</h3><p>No encontramos “${esc(filtro.q)}”. Prueba otra palabra o escríbenos: lo hacemos a la medida.</p><button class="btn btn-dark" data-reset>Ver todo el catálogo</button></div>`;
function renderGrid(append = false) {
  const list = results(), grid = $('#grid');
  const from = append ? grid.querySelectorAll('.card').length : 0;
  const html = list.slice(from, filtro.shown).map(r => cardHTML(r.card, r.ci)).join('');
  if (append) grid.insertAdjacentHTML('beforeend', html);
  else grid.innerHTML = list.length ? html : sinResultadosHTML();
  pintarEstado(list);
  reveal(true);
}
function syncURL() {
  const u = new URL(location.href);
  [['cat', filtro.cat !== 'todos' && filtro.cat], ['sub', filtro.sub], ['q', filtro.q.trim()], ['sort', filtro.sort !== 'feat' && filtro.sort]].forEach(([k, v]) => v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
  ['card', 'edit'].forEach(k => u.searchParams.delete(k));
  history.replaceState(history.state, '', u); // conserva el estado del cajón de filtros
}
// cambia contenido con un fundido corto (solo opacidad/transform)
function swapContent(el, fn) {
  el.classList.add('swap-out');
  setTimeout(() => { fn(); el.classList.remove('swap-out'); el.classList.add('swap-in'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('swap-in'))); }, 140);
}
function refresh() { filtro.shown = PAGE; syncURL(); swapContent($('#grid'), () => renderGrid()); }

// ---------- buscador: hay dos (barra de arriba en celular, columna en escritorio); se mantienen iguales ----------
let qT;
function setQ(v, desde) {
  filtro.q = v;
  $$('#q,#qs').forEach(i => { if (i !== desde) i.value = v; });
  $$('[data-qclear]').forEach(b => { b.hidden = !v; });
}

// ---------- eventos ----------
function clicEnFiltros(e) {
  const h = e.target.closest('[data-acc]');
  if (h) { // encabezado de categoría: despliega (y la elige si aún no lo estaba) o pliega
    const g = h.dataset.acc;
    if (filtro.open === g) { filtro.open = ''; syncFilters(); } else if (filtro.cat !== g) elegir(g); else { filtro.open = g; syncFilters(); }
    return;
  }
  const b = e.target.closest('[data-cat]'); if (b) elegir(b.dataset.cat, b.dataset.sub);
}
// teclado: flechas, Inicio y Fin recorren los botones visibles de la lista
function tecladoEnFiltros(e) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const bs = $$('#filters button').filter(b => !b.classList.contains('acc-s') || b.closest('.acc-item').classList.contains('open'));
  const i = bs.indexOf(document.activeElement); if (i < 0) return;
  e.preventDefault();
  bs[e.key === 'Home' ? 0 : e.key === 'End' ? bs.length - 1 : Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
}
$('#filters')?.addEventListener('click', clicEnFiltros);
$('#filters')?.addEventListener('keydown', tecladoEnFiltros);
$('#chip')?.addEventListener('click', () => { elegir('todos'); $('#fBtn').offsetParent ? $('#fBtn').focus() : $('#filters .acc-h')?.focus(); });
$$('#q,#qs').forEach(i => i.addEventListener('input', e => { setQ(e.target.value, e.target); clearTimeout(qT); qT = setTimeout(refresh, 160); }));
$$('[data-qclear]').forEach(b => b.addEventListener('click', () => { setQ(''); b.parentElement.querySelector('input').focus(); refresh(); }));
$('#sort')?.addEventListener('change', e => { filtro.sort = e.target.value; refresh(); });
$('#loadBtn')?.addEventListener('click', () => { filtro.shown += PAGE; renderGrid(true); });
document.addEventListener('click', e => {
  if (!e.target.closest('[data-reset]')) return;
  setQ(''); filtro.cat = 'todos'; filtro.sub = ''; filtro.open = ''; syncFilters(); refresh();
});

// ---------- arranque: lee la dirección y pinta ----------
function iniciarCatalogo() {
  const q = new URLSearchParams(location.search);
  if (CATS.some(c => c[0] === q.get('cat'))) {
    filtro.cat = q.get('cat');
    if (arbolDe(filtro.cat).subs.some(x => x[0] === q.get('sub'))) filtro.sub = q.get('sub');
    if (arbolDe(filtro.cat).subs.length) filtro.open = filtro.cat;
  }
  if (q.get('q')) setQ(q.get('q'));
  if (['asc', 'desc', 'name'].includes(q.get('sort'))) { filtro.sort = q.get('sort'); $('#sort').value = filtro.sort; }
  renderFilters(); renderGrid();
  if (q.has('card')) openCard(+q.get('card'));
  else if (q.has('edit')) editItem(+q.get('edit'));
}
