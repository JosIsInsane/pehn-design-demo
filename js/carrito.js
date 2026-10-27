/* Pehn Design — CARRITO (datos): lo que hay en el pedido, guardado en el navegador, y sus totales.
   Depende de: base.js, producto.js, datos.js. Lo usan: cajón del pedido, personalizador, WhatsApp, envío y aviso de privacidad.
   El estado está en App.cart; la pantalla del carrito es cajon.js. */

// al cargar: lo guardado, sin productos que ya no existen y con las opciones al día
App.cart = (Array.isArray(leer(KEY_CART, [])) ? leer(KEY_CART, []) : []).filter(i => i && productoDe(i.id));
App.cart.forEach(i => normCfg(productoDe(i.id), i.cfg));

function saveCart() {
  guardar(KEY_CART, App.cart); // sin almacenamiento sigue en memoria
  const n = $('#cartCount'); if (n) n.textContent = App.cart.reduce((s, i) => s + i.qty, 0);
}

// renglones con precio y descuento por volumen, más subtotal, descuento y total
function cartTotals() {
  let gross = 0, disc = 0;
  const rows = App.cart.map(i => {
    const p = productoDe(i.id);
    const { unit } = priceOf(p, i.cfg);
    const t = lineTotal(unit, i.qty);
    gross += t.gross; disc += t.disc;
    return { i, p, unit, ...t };
  });
  return { rows, gross, disc, total: gross - disc };
}
