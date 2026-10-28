/* Pehn Design — ARRANQUE común de todas las páginas, en dos tiempos (ver js/paginas/*.js):
     iniciarBase()   marco, carrito, WhatsApp, contenido editable, ventanas y cajón del pedido (antes de pintar la página)
     iniciarFinal()  movimiento, aviso de privacidad, revisión de datos, año del pie y contador del carrito (después) */
import { CONFIG, CARDS, PRODUCTS, PORTADA, productoDe } from '../datos.js';
import { RENDER } from '../dibujos.js';
import { montarMarco } from '../marco.js';
import { $ } from './utiles.js';
import { iniciarCarrito, saveCart } from './carrito.js';
import { pintarWa } from './whatsapp.js';
import { iniciarSitio } from './sitio.js';
import { iniciarModales } from './modales.js';
import { iniciarCajon } from './cajon.js';
import { iniciarMovimiento } from './movimiento.js';
import { iniciarAviso } from './aviso.js';

// Revisa datos.js al cargar y avisa en la consola (F12) con "[Pehn]" lo que esté mal y cómo arreglarlo.
function revisarDatos() {
  const avisa = m => console.warn('[Pehn] ' + m);
  CARDS.forEach((c, i) => { if (!productoDe(c.id)) avisa(`CARDS[${i}] usa el producto "${c.id}", que no existe en PRODUCTS (datos.js).`); });
  PRODUCTS.forEach(p => { if (!RENDER[p.render]) avisa(`El producto "${p.id}" usa render: '${p.render}', que no existe en RENDER (dibujos.js).`); });
  Object.entries(PORTADA).forEach(([k, l]) => l.forEach(i => { if (!CARDS[i]?.cfg || CARDS[i].id !== 'cuadro') avisa(`PORTADA.${k} usa la tarjeta ${i}, que no es un cuadro con cfg. Ajusta los números en datos.js.`); }));
  if (!CONFIG.whatsapp) avisa('Falta CONFIG.whatsapp en datos.js: los botones de WhatsApp no llevan número.');
  if (!CONFIG.sheetsUrl) avisa('Falta CONFIG.sheetsUrl en datos.js: los pedidos no se guardan en Google Sheets.');
}

// primero el marco: los demás módulos buscan en la página el menú, el cajón y los botones que él crea
export function iniciarBase() {
  montarMarco();
  iniciarCarrito();
  pintarWa();
  iniciarSitio();
  iniciarModales();
  iniciarCajon();
}

export function iniciarFinal() {
  iniciarMovimiento();
  iniciarAviso();
  revisarDatos();
  if (!CONFIG.ordersEnabled) document.body.classList.add('locked');
  $('#yr').textContent = new Date().getFullYear();
  saveCart(); // pinta el contador del carrito con lo guardado
}
