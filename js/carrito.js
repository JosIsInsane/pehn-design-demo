/* Pehn Design — CARRITO (datos): lo que hay en el pedido, guardado en el navegador, y sus totales.
   La lista vive en estado.js; la pantalla del carrito es cajon.js. */
import { cargarCarrito, leerCarrito } from './estado.js';
import { leer, guardar, KEY_CART } from './almacen.js';
import { $ } from './utiles.js';
import { productoDe, normCfg } from '../datos.js';
import { priceOf, lineTotal } from './producto.js';

// al abrir la página: lo guardado, sin productos que ya no existen y con las opciones al día
export function iniciarCarrito() {
  const guardado = leer(KEY_CART, []);
  const renglones = (Array.isArray(guardado) ? guardado : []).filter(i => i && productoDe(i.id));
  renglones.forEach(i => normCfg(productoDe(i.id), i.cfg));
  cargarCarrito(renglones);
}

// guarda el carrito en el navegador (sin almacenamiento sigue en memoria) y pinta el contador
export function saveCart() {
  const renglones = leerCarrito();
  guardar(KEY_CART, renglones);
  const n = $('#cartCount'); if (n) n.textContent = renglones.reduce((s, i) => s + i.qty, 0);
}

// renglones con precio y descuento por volumen, más subtotal, descuento y total
export function cartTotals() {
  let gross = 0, disc = 0;
  const rows = leerCarrito().map(i => {
    const p = productoDe(i.id);
    const { unit } = priceOf(p, i.cfg);
    const t = lineTotal(unit, i.qty);
    gross += t.gross; disc += t.disc;
    return { i, p, unit, ...t };
  });
  return { rows, gross, disc, total: gross - disc };
}
