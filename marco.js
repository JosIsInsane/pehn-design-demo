/* Pehn Design — MARCO COMÚN de todas las páginas: menú, pie, botones flotantes, carrito y aviso de privacidad.
   Está en un solo lugar: si cambias el menú aquí, cambia en todas las páginas.

   Cada página solo pone los huecos:
     <header data-marco="menu"></header> ... <footer data-marco="pie"></footer> <div data-marco="flotantes"></div>
   y en <body data-page="..."> dice cuál es (home, catalog, pedido, privacidad) para marcar el menú.

   SI EL MENÚ NO APARECE: este archivo debe cargarse ANTES de app.js y DESPUÉS de los huecos (al final del body). */
(function marco() {
  const pagina = document.body.dataset.page || '';
  // en la página de inicio los enlaces a sus secciones no recargan la página
  const a = href => (pagina === 'home' && href.startsWith('index.html#') ? href.slice(10) : href);
  const MENU = [
    ['index.html', 'Inicio', 'home'],
    ['catalogo.html', 'Catálogo', 'catalog'],
    ['index.html#trabajos', 'Pedidos reales'],
    ['index.html#como', 'Cómo funciona'],
    ['pedido.html', 'Rastrear pedido', 'pedido'],
    ['index.html#faq', 'Preguntas'],
  ];
  const link = ([href, txt, p]) => `<a href="${a(href)}"${p && p === pagina ? ' aria-current="page"' : ''}>${txt}</a>`;
  const BRAND = '<a href="index.html" class="brand" aria-label="Pehn Design, inicio"><img src="logo.png" alt="" width="44" height="44"><span class="brand-name" translate="no">Pehn Design</span></a>';
  const WA_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.6c-2 0-4-.6-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.5 6.5 0 0 0 1.3 3.4 14.8 14.8 0 0 0 5.7 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.2-.3-.3-.6-.4Z"/></svg>';

  const html = {
    menu: `<header class="nav" id="top">
  <div class="wrap nav-in">
    ${BRAND}
    <nav class="links" aria-label="Principal">${MENU.filter(m => m[2] !== 'home' || pagina !== 'home').slice(0, 5).map(link).join('')}</nav>
    <div class="nav-actions">
      <a class="icon-btn" href="catalogo.html#buscar" aria-label="Buscar en el catálogo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a>
      <a class="btn btn-primary btn-sm" href="catalogo.html?card=0">Diseñar el mío</a>
      <button class="icon-btn menu-btn" id="menuBtn" aria-label="Abrir menú" aria-expanded="false" aria-controls="mNav"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
  <nav class="m-nav" id="mNav" aria-label="Menú móvil">${MENU.map(link).join('')}<a class="btn btn-primary" href="catalogo.html?card=0">Diseñar el mío</a></nav>
</header>`,
    pie: `<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand">${BRAND}<p data-edit="pie">Cuadros con minifiguras y regalos personalizados, hechos a mano para historias únicas.</p></div>
      <nav aria-label="Tienda"><b>Tienda</b><a href="catalogo.html">Catálogo</a><a href="catalogo.html?cat=cuadros">Cuadros</a><a href="catalogo.html?cat=ropa">Ropa</a><a href="catalogo.html?cat=vasos">Vasos y tazas</a></nav>
      <nav aria-label="Pehn"><b>Pehn</b><a href="${a('index.html#historia')}">Historia</a><a href="${a('index.html#faq')}">Preguntas</a><a href="pedido.html">Rastrear pedido</a><a href="privacidad.html">Privacidad</a></nav>
      <nav aria-label="Contacto"><b>Contacto</b><a class="wa-link" href="#" target="_blank" rel="noopener">WhatsApp</a><a class="ig-link" href="https://www.instagram.com/pehn.designn/" target="_blank" rel="noopener">Instagram</a></nav>
    </div>
    <div class="copy"><span>© <span id="yr"></span> Pehn Design</span><span><a href="privacidad.html">Aviso de privacidad</a> · <button type="button" class="linkish" data-aviso-abrir>Preferencias</button></span></div>
  </div>
</footer>`,
    flotantes: `<a class="wa-float wa-link" href="#" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${WA_ICON}</a>
<button class="cart-fab" id="cartBtn" aria-label="Abrir tu carrito">
  <svg class="ico-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
  <span>Carrito</span><b id="cartCount">0</b>
</button>
<div class="drawer" id="drawer" aria-hidden="true">
  <div class="modal-bg" data-dclose></div>
  <aside class="d-panel" role="dialog" aria-modal="true" aria-labelledby="dTitle" tabindex="-1">
    <div class="d-head"><h2 id="dTitle">Tu pedido</h2><button class="x" data-dclose aria-label="Cerrar">✕</button></div>
    <div class="d-body" id="dBody"></div>
    <div class="d-foot" id="dFoot"></div>
  </aside>
</div>
<div class="modal" id="done" aria-hidden="true">
  <div class="modal-bg" data-xdone></div>
  <div class="done-card" role="dialog" aria-modal="true" tabindex="-1">
    <img src="logo.png" alt="" width="88" height="88">
    <h2>¡Pedido recibido!</h2>
    <p id="doneTxt"></p>
    <button class="btn btn-dark" data-xdone>Volver a la tienda</button>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<section class="aviso" id="aviso" role="region" aria-label="Aviso de privacidad" hidden>
  <p><b>Tu privacidad.</b> No usamos cookies de publicidad ni de rastreo. Este navegador guarda tu carrito y, si tú lo eliges, tus datos y tus números de pedido para que no los escribas otra vez. <a href="privacidad.html">Leer aviso</a></p>
  <div class="aviso-row"><button type="button" class="btn btn-ghost btn-sm" data-aviso="minimo">Solo el carrito</button><button type="button" class="btn btn-dark btn-sm" data-aviso="ok">Entendido</button></div>
</section>`,
  };
  document.querySelectorAll('[data-marco]').forEach(el => { el.outerHTML = html[el.dataset.marco] || ''; });
})();
