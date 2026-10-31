/* Pehn Design — AVISO DE PRIVACIDAD (abajo, una sola vez) y borrado de lo guardado en el navegador.
   "Entendido": se recuerdan datos y pedidos si la persona lo marca al pedir.
   "Solo el carrito": se borra lo guardado y la casilla "Recordar" sale desmarcada.
   GPC (Global Privacy Control): si el navegador manda la señal "no compartas mis datos", se elige "Solo el carrito"
   sin preguntar y el aviso lo dice. El sitio lo declara en /.well-known/gpc.json. */
import { $ } from './utiles.js';
import { leer, guardar, borrar, sesion, KEY_CART, KEY_CONTACT, KEY_ORDERS, KEY_CONSENT, KEY_SITIO, KEY_PAGO } from './almacen.js';
import { vaciarCarrito } from './estado.js';
import { saveCart } from './carrito.js';
import { toast } from './modales.js';

// mientras se ve, en celular se esconden los botones flotantes para que no lo tapen
function aviso(mostrar) { const a = $('#aviso'); if (a) a.hidden = !mostrar; document.body.classList.toggle('con-aviso', !!mostrar); }
export const pideGPC = () => typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
// ÚNICO lugar para decidir si se puede medir o anunciar (Pixel, Analytics, etc.): hoy no hay nada de eso.
// Si algún día se agrega, cárgalo solo cuando esto dé true (aceptó "Entendido" y su navegador no pide GPC).
export const permiteMedicion = () => !pideGPC() && leer(KEY_CONSENT, '') === 'ok';

export function iniciarAviso() {
  if (pideGPC()) {
    if (leer(KEY_CONSENT, '') !== 'minimo') { guardar(KEY_CONSENT, 'minimo'); borrar(KEY_CONTACT); borrar(KEY_ORDERS); }
    const p = $('#aviso p');
    if (p && !$('#aviso .aviso-gpc')) p.insertAdjacentHTML('beforeend', ' <span class="aviso-gpc">Tu navegador pide privacidad (GPC) y la respetamos: solo guardamos tu carrito.</span>');
  } else if (!leer(KEY_CONSENT, '')) aviso(true);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-aviso],[data-aviso-abrir]'); if (!b) return;
    if (b.dataset.avisoAbrir !== undefined) return aviso(true);
    guardar(KEY_CONSENT, b.dataset.aviso);
    if (b.dataset.aviso === 'minimo') { borrar(KEY_CONTACT); borrar(KEY_ORDERS); toast('Listo: solo guardamos tu carrito.'); }
    aviso(false);
  });

  $('#borrarDatos')?.addEventListener('click', () => {
    [KEY_CART, KEY_CONTACT, KEY_ORDERS, KEY_CONSENT, KEY_SITIO, KEY_PAGO].forEach(borrar); vaciarCarrito(); saveCart();
    sesion.limpiar();
    toast('Listo: borramos todo lo que este sitio guardó en tu navegador.');
  });
}
