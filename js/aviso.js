/* Pehn Design — AVISO DE PRIVACIDAD (abajo, una sola vez) y borrado de lo guardado en el navegador.
   "Entendido": se recuerdan datos y pedidos si la persona lo marca al pedir.
   "Solo el carrito": se borra lo guardado y la casilla "Recordar" sale desmarcada.
   Depende de: base.js, carrito.js (saveCart), modales.js (toast). */

// mientras se ve, en celular se esconden los botones flotantes para que no lo tapen
function aviso(mostrar) { const a = $('#aviso'); if (a) a.hidden = !mostrar; document.body.classList.toggle('con-aviso', !!mostrar); }
if (!leer(KEY_CONSENT, '')) aviso(true);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aviso],[data-aviso-abrir]'); if (!b) return;
  if (b.dataset.avisoAbrir !== undefined) return aviso(true);
  guardar(KEY_CONSENT, b.dataset.aviso);
  if (b.dataset.aviso === 'minimo') { borrar(KEY_CONTACT); borrar(KEY_ORDERS); toast('Listo: solo guardamos tu carrito.'); }
  aviso(false);
});

$('#borrarDatos')?.addEventListener('click', () => {
  [KEY_CART, KEY_CONTACT, KEY_ORDERS, KEY_CONSENT, KEY_SITIO, KEY_PAGO].forEach(borrar); App.cart = []; saveCart();
  sesion.limpiar();
  toast('Listo: borramos todo lo que este sitio guardó en tu navegador.');
});
