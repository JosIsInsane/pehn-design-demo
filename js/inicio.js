/* Pehn Design — PÁGINA DE INICIO: cuadros que se cruzan en el hero, destacados, categorías, blog y huecos de fotos.
   Depende de: base.js, producto.js, tarjetas.js (cardHTML, ARROW), datos.js (PORTADA, CARDS, CAT_TILES), dibujos.js (frameSVG, renderProduct).
   Cada bloque se salta solo si su elemento no está en la página. Va ANTES de movimiento.js. */

// ---------- hero ----------
const HERO = PORTADA.hero.map(i => CARDS[i].cfg);
const PAUSE_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const PLAY_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>';
const cuadroDe = cfg => frameSVG({ ...defaults(PRODUCTS[0]), ...clone(cfg) });
let heroI = 0;
// pone el siguiente cuadro encima y retira el anterior (con fundido)
function hero(animate = true) {
  const box = $('#heroFig'); if (!box) return;
  const layer = document.createElement('div');
  layer.className = 'hero-layer';
  layer.innerHTML = cuadroDe(HERO[heroI % HERO.length]);
  box.appendChild(layer);
  const old = [...box.children].slice(0, -1);
  if (!animate) { old.forEach(o => o.remove()); return; }
  layer.animate(REDUCED ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(14px) rotate(-1.5deg) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
  old.forEach(o => o.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(.98)' }], { duration: 450, easing: 'ease-in', fill: 'forwards' }).onfinish = () => o.remove());
}
// cambio automático cada 5 s; se detiene con el botón de pausa, al pasar el cursor o con la pestaña oculta
function iniciarHero() {
  hero(false);
  const next = () => { heroI++; hero(); };
  let paused = REDUCED, hover = false;
  const pb = $('#heroPause'), art = $('.hero-art');
  const setP = v => { paused = v; pb.setAttribute('aria-pressed', v); pb.setAttribute('aria-label', v ? 'Reanudar cambio automático' : 'Pausar cambio automático'); pb.innerHTML = v ? PLAY_ICO : PAUSE_ICO; };
  setP(paused);
  setInterval(() => { if (!paused && !hover && !document.hidden) next(); }, 5000);
  $('#shuffle').addEventListener('click', next);
  pb.addEventListener('click', () => setP(!paused));
  art.addEventListener('pointerenter', () => { hover = true; }); art.addEventListener('pointerleave', () => { hover = false; });
  art.addEventListener('focusin', () => { hover = true; }); art.addEventListener('focusout', () => { hover = false; });
}
if ($('#heroFig')) iniciarHero();

// ---------- huecos de fotos reales: si no existe el archivo se muestra el aviso ----------
document.querySelectorAll('img[data-ph]').forEach(img => {
  const fail = () => {
    const f = img.closest('.ph'); f.classList.add('missing');
    f.insertAdjacentHTML('afterbegin', `<div class="ph-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><b>Foto real aquí</b><small>fotos/${img.dataset.ph}</small></div>`);
    img.remove();
  };
  if (img.complete && !img.naturalWidth) fail(); else img.addEventListener('error', fail);
});

// ---------- blog, destacados, categorías y "cómo funciona" ----------
const MINIS = PORTADA.blog.map(i => CARDS[i].cfg);
document.querySelectorAll('[data-mini]').forEach(el => { el.innerHTML = cuadroDe(MINIS[+el.dataset.mini]); });

function catTileHTML(t) {
  const n = CARDS.filter(c => productoDe(c.id).cat === t.cat).length;
  const p = t.product && productoDe(t.product);
  const art = t.photo ? `<img src="${t.photo}" alt="" width="480" height="600" loading="lazy" decoding="async">` : renderProduct(p, defaults(p));
  return `<a class="cat-tile" href="catalogo.html?cat=${t.cat}" style="--tint:${t.tint}"><div class="cat-art">${art}</div>
    <div class="cat-label"><div><h3>${catName(t.cat)}</h3><small>${t.note} · ${n} diseño${n > 1 ? 's' : ''}</small></div><span class="cat-go">${ARROW}</span></div></a>`;
}
if ($('#featured')) $('#featured').innerHTML = PORTADA.destacados.map(i => cardHTML(CARDS[i], i, `catalogo.html?card=${i}`)).join('');
if ($('#cats')) $('#cats').innerHTML = CAT_TILES.map(catTileHTML).join('');
$('#howFig')?.insertAdjacentHTML('afterbegin', frameSVG(cardCfg(CARDS[0])));
