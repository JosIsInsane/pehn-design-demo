/* Pehn Design — "AGREGA AL REGALO": extras de un toque en el carrito (dedicatoria, caja, dulces, tarjeta)
   y el aviso del plazo de producción (texto editable en CRM › Sitio web, clave plazo.produccion).
   Los extras son productos de regalo.js; aquí solo se pintan y se agregan. Lo usa cajon.js. */
import { EXTRAS } from '../regalo.js';
import { esc } from './utiles.js';
import { fmt } from './formato.js';
import { leerCarrito, agregarAlCarrito } from './estado.js';
import { saveCart } from './carrito.js';
import { defaults } from './producto.js';
import { textoSitio } from './sitio.js';

const MAX = 3; // cuántos extras se sugieren a la vez
export const PLAZO_DE_SIEMPRE = 'Te confirmamos la fecha de entrega al aprobar tu diseño.';
export const plazoHTML = () => `<p class="plazo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>${esc(textoSitio('plazo.produccion', PLAZO_DE_SIEMPRE))}</span></p>`;

// los que aún no están en el pedido
const sugeridos = () => { const ya = new Set(leerCarrito().map(i => i.id)); return EXTRAS.filter(x => !ya.has(x.id)).slice(0, MAX); };
export function extrasHTML() {
  const l = sugeridos(); if (!l.length) return '';
  return `<section class="extras" aria-labelledby="extrasT"><h3 id="extrasT">Agrega al regalo</h3><ul>${l.map(x => `<li>
    <span class="ex-sw" style="background:${x.bg}" aria-hidden="true"></span>
    <span class="ex-t"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span>
    <button type="button" class="ex-add" data-extra="${x.id}" aria-label="Agregar ${esc(x.name)} por ${fmt(x.variants[0].price)}">+ ${fmt(x.variants[0].price)}</button></li>`).join('')}</ul></section>`;
}
// un toque: va al pedido con cantidad 1
export function agregarExtra(id) {
  const p = EXTRAS.find(x => x.id === id); if (!p) return null;
  agregarAlCarrito({ id, cfg: defaults(p), qty: 1 }); saveCart();
  return p;
}
