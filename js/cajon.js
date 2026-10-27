/* Pehn Design — CAJÓN DEL PEDIDO: la lista del carrito y los botones que llevan a los pasos de checkout.js.
   Depende de: base.js, producto.js, carrito.js, whatsapp.js, checkout.js, modales.js, dibujos.js (renderProduct, minifigSVG).
   Opcional: personalizador*.js (solo existe en el catálogo) para editar un diseño. Estado: App.caja.vista = 'cart' | 'checkout' | 'anticipo'. */

const SIN_PEDIDOS = '<div class="empty locked-box"><div class="lock-ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H5v14h14V9h-2V6a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v3H9V6Z"/></svg></div><p><b>El carrito abre muy pronto.</b><br>Mientras tanto, personaliza tu diseño y mándalo por WhatsApp con un clic: te llega con todos los detalles y el precio.</p></div>';

// pedidos en línea apagados: solo se ofrece WhatsApp
function drawerBloqueado() {
  $('#dTitle').textContent = 'Pedidos en línea';
  $('#dBody').innerHTML = SIN_PEDIDOS;
  $('#dFoot').innerHTML = `<a class="btn btn-dark" href="${waURL(`${HOLA} Quiero hacer un pedido.`)}" target="_blank" rel="noopener">Escribir por WhatsApp</a><p class="note">Pagos y carrito en línea: próximamente.</p>`;
}
function drawerVacio() {
  App.caja.vista = 'cart';
  $('#dBody').innerHTML = `<div class="empty">${minifigSVG({ ...FIG_PRESETS[5], face: 'guino', name: '' })}<p><b>Tu pedido está vacío.</b><br>Elige un producto y hazlo tuyo.</p></div>`;
  $('#dFoot').innerHTML = `<a href="catalogo.html" class="btn btn-dark">Ver catálogo</a>`;
}
const itemHTML = (r, idx) => `<div class="item" style="--i:${idx}">
    <div class="th" style="background:${r.p.render === 'frame' ? '#E9E1D6' : r.p.bg}">${renderProduct(r.p, r.i.cfg)}</div>
    <div><h4>${r.p.name}</h4><ul>${summary(r.p, r.i.cfg).slice(0, 5).map(([k, v]) => `<li>${esc(k)}: <b>${esc(String(v).slice(0, 60))}</b></li>`).join('')}</ul>
      <button class="rm" data-edit="${idx}">Editar</button> · <button class="rm" data-del="${idx}">Quitar</button></div>
    <div class="side"><div><b>${fmt(r.total)}</b><small>${r.i.qty} × ${fmt(r.unit)}</small>${r.disc ? `<small style="color:var(--green)">−${CONFIG.bulkPct}%</small>` : ''}</div></div>
  </div>`;
function drawerLista({ rows, gross, disc, total }) {
  $('#dTitle').textContent = 'Tu pedido';
  $('#dBody').innerHTML = rows.map(itemHTML).join('');
  $('#dFoot').innerHTML = `<div class="tot"><span>Subtotal</span><span>${fmt(gross)}</span></div>
    ${disc ? `<div class="tot"><span>Descuento por volumen</span><span class="disc">−${fmt(disc)}</span></div>` : ''}
    <div class="tot"><span>Envío</span><span>Se cotiza al confirmar</span></div>
    <div class="tot big"><span>Total</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="goCheckout">Poner mis datos de envío →</button>
    <a class="btn btn-ghost wa-cart" href="${waURL(waCartText())}" target="_blank" rel="noopener">o pídelo por WhatsApp</a>
    <p class="note">Para empezar se paga un anticipo. Antes de producir te mandamos tu diseño para aprobar.</p>`;
}
function renderDrawer() {
  if (!CONFIG.ordersEnabled) return drawerBloqueado();
  const t = cartTotals();
  if (!t.rows.length) return drawerVacio();
  if (App.caja.vista === 'checkout') return renderCheckout(t.total);
  if (App.caja.vista === 'anticipo') return renderAnticipo(t.total);
  drawerLista(t);
}
function openDrawer() { renderDrawer(); openModal('#drawer'); }
function closeDrawer() { closeModal('#drawer'); }

// en la landing no hay personalizador: se edita en el catálogo
function editItem(idx) {
  const i = App.cart[idx]; if (!i) return;
  if (!$('#custom')) { location.href = `catalogo.html?edit=${idx}`; return; }
  closeDrawer(); openCustom(i.id, i.cfg, i.qty, idx);
}

// ---------- botones del cajón ----------
function quitarItem(t) {
  const row = t.closest('.item'), idx = +t.dataset.del;
  const go = () => {
    const [gone] = App.cart.splice(idx, 1); saveCart(); renderDrawer();
    toast('Quitado de tu pedido', { label: 'Deshacer', run: () => { App.cart.splice(idx, 0, gone); saveCart(); renderDrawer(); } });
  };
  if (!row) go(); else row.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 200, easing: 'ease-in' }).onfinish = go;
}
function irAPago() {
  const d = validarDatos(); if (!d) return;
  App.caja.datos = d; App.caja.vista = 'anticipo'; renderDrawer(); $('#dBody').scrollTop = 0;
}
// cada botón del cajón: id o data-* -> qué hace
const ACCIONES_CAJON = {
  goCheckout: () => { App.caja.vista = 'checkout'; renderDrawer(); },
  backCart: () => { App.caja.datos = leerDatos(); App.caja.vista = 'cart'; renderDrawer(); $('#dTitle').textContent = 'Tu pedido'; },
  goPago: irAPago,
  backDatos: () => { App.caja.vista = 'checkout'; renderDrawer(); },
  sendOrder: t => { const d = App.caja.vista === 'anticipo' ? App.caja.datos : validarDatos(); if (d) enviarPedido(t, d); },
};
$('#drawer')?.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.del !== undefined) quitarItem(t);
  else if (t.dataset.edit !== undefined) editItem(+t.dataset.edit);
  else ACCIONES_CAJON[t.id]?.(t);
});
$('#drawer')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('#coForm input')) { e.preventDefault(); ($('#goPago') || $('#sendOrder'))?.click(); }
});
$('#drawer')?.addEventListener('change', e => { if (e.target.id === 'anticipoFile' && e.target.files[0]) elegirComprobante(e.target.files[0]); });

$('#cartBtn')?.addEventListener('click', openDrawer);
document.addEventListener('click', e => { if (e.target.closest('[data-dclose]')) closeDrawer(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#drawer')?.classList.contains('open')) closeDrawer(); });
