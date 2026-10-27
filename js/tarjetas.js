/* Pehn Design — TARJETAS de producto (inicio y catálogo): el HTML de cada tarjeta y sus fotos reales.
   Depende de: base.js, producto.js, datos.js (CARDS, catName), dibujos.js (renderProduct). Lo usan: inicio.js, catalogo.js, personalizador.js.
   Estado: App.fotos (qué fotos reales existen). */

const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// fotos reales: solo se ofrecen si el archivo existe
CARDS.forEach(c => {
  if (!c.photo || c.photo in App.fotos) return;
  App.fotos[c.photo] = null;
  const im = new Image();
  im.onload = () => { App.fotos[c.photo] = true; };
  im.onerror = () => { App.fotos[c.photo] = false; };
  im.src = c.photo;
});
// foto real que no carga: la tarjeta se queda con el dibujo. Se escucha en captura porque "error" no burbujea.
document.addEventListener('error', e => {
  const img = e.target; if (!(img instanceof HTMLImageElement) || !img.matches('img[data-real]')) return;
  img.closest('.card')?.classList.remove('has-photo'); img.nextElementSibling?.remove(); img.remove();
}, true);

// puntitos con los primeros colores del producto
function dotsHTML(p) {
  const sg = p.groups.find(g => g.type === 'swatch');
  return sg ? `<span class="dots" aria-hidden="true">${sg.options.filter(o => o.v !== 'none').slice(0, 4).map(o => `<i style="background:${o.v}"></i>`).join('')}</span>` : '';
}
// con `href` la tarjeta es un enlace (inicio); sin él abre el personalizador (catálogo)
function cardHTML(card, ci, href) {
  const p = productoDe(card.id), cfg = cardCfg(card);
  const title = card.title || p.name;
  const badge = card.badge ?? (card.cfg ? '' : p.badge);
  const hasPhoto = card.photo && App.fotos[card.photo] !== false;
  const tint = `color-mix(in srgb, ${card.bg || p.bg} 26%, #FBF7F2)`;
  const open = href ? `href="${href}"` : `data-card="${ci}" role="button" tabindex="0"`;
  const tag = href ? 'a' : 'article';
  return `<${tag} class="card${hasPhoto ? ' has-photo' : ''}" ${open} aria-label="Personalizar ${esc(title)}">
    <div class="card-media" style="--tint:${tint}">
      ${badge ? `<span class="badge">${badge}</span>` : ''}
      <div class="art-illus">${renderProduct(p, cfg)}</div>
      ${hasPhoto ? `<img class="real" src="${card.photo}" alt="" width="480" height="600" loading="lazy" decoding="async" style="object-position:${card.photoPos || '50% 50%'}" data-real><span class="real-chip"><i></i>Pedido real</span>` : ''}
      <span class="card-cta">Personalizar ${ARROW}</span>
    </div>
    <div class="card-body">
      <p class="card-cat">${catName(p.cat)}</p>
      <h3>${esc(title)}</h3>
      <p class="card-desc">${esc(card.desc || p.desc)}</p>
      <div class="card-foot"><span class="price"><small>desde</small>${fmt(priceOf(p, cfg).unit)}</span>${dotsHTML(p)}</div>
    </div>
  </${tag}>`;
}
