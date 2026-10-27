/* Pehn Design — MIS PEDIDOS (pedido.html): pide número + WhatsApp, muestra estado y montos, y recibe el comprobante.
   El servidor (apps-script/Pagos.gs) valida que el WhatsApp sea el del pedido y lee el monto del comprobante.
   Depende de: base.js, envio.js (api), checkout.js (leerVoucher), modales.js (toast). */

// mismo orden que ESTADOS en apps-script/Config.gs
const PASOS = ['Nuevo', 'Diseño enviado', 'Aprobado', 'En producción', 'Listo', 'Enviado', 'Entregado'];
const PASO_TXT = { 'Nuevo': 'Recibido', 'Diseño enviado': 'Diseño enviado', 'Aprobado': 'Aprobado', 'En producción': 'En producción', 'Listo': 'Listo', 'Enviado': 'En camino', 'Entregado': 'Entregado' };
let seguido = null; // { id, phone } del pedido que se está viendo
let voucherData = '';

// ---------- una tarjeta con el detalle de un pedido ----------
function pasosHTML(p) {
  if (p.estado === 'Cancelado') return '<p class="note">Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.</p>';
  const i = PASOS.indexOf(p.estado);
  return `<ol class="pasos">${PASOS.map((s, j) => `<li class="${j < i ? 'hecho' : j === i ? 'ahora' : ''}"${j === i ? ' aria-current="step"' : ''}><i aria-hidden="true">${j < i ? '✓' : j + 1}</i><span>${PASO_TXT[s]}</span></li>`).join('')}</ol>`;
}
const comprobantesHTML = p => p.comprobantes.length
  ? `<p class="note">Comprobantes recibidos: ${p.comprobantes.map(c => `${c.monto ? fmt(c.monto) : 'monto por revisar'} (${esc(/Coincide|Confirmado/.test(c.resultado) ? 'confirmado' : c.resultado === 'Rechazado' ? 'no válido' : 'en revisión')})`).join(' · ')}</p>` : '';
// bloque para pagar lo que falta (o el aviso de pedido pagado)
function cobroHTML(p) {
  if (p.estado === 'Cancelado') return '';
  if (!(p.saldo > 0)) return '<p class="note ok">¡Pedido pagado por completo! Gracias.</p>';
  const falta = p.porPagarAnticipo > 0;
  return `<div class="pago">
      <h3>${falta ? `Paga tu anticipo de ${fmt(p.porPagarAnticipo)} para empezar` : `Saldo pendiente: ${fmt(p.saldo)}`}</h3>
      ${p.banco ? `<p class="banco">${esc(p.banco)}</p>` : '<p class="note">Te mandamos los datos de pago por WhatsApp.</p>'}
      <label class="drop" id="drop"><input type="file" id="voucher" accept="image/jpeg,image/png,image/webp,application/pdf"><span class="drop-ico" aria-hidden="true">${FLECHA_SUBIR}</span><span id="dropTxt"><b>Sube la foto o PDF de tu comprobante</b><small>JPG, PNG o PDF · máx. 5 MB</small></span></label>
      <button class="btn btn-dark" id="sendVoucher" disabled>Enviar comprobante</button>
      <div class="err" id="voucherErr" role="alert"></div>
    </div>`;
}
function pintarPedido(p) {
  $('#estadoPedido').innerHTML = `<article class="ped-card">
    <header><p class="card-cat">Pedido</p><h2>${esc(p.id)}</h2>${p.fecha ? `<small>Hecho el ${esc(fmtDate(p.fecha))}</small>` : ''}</header>
    ${pasosHTML(p)}
    <div class="ped-prod"><b>Productos</b><p>${esc(p.productos).replace(/\n/g, '<br>')}</p></div>
    <dl class="ped-montos">
      <div><dt>Total</dt><dd>${fmt(p.total)}</dd></div>
      <div><dt>Anticipo (${p.pct}%)</dt><dd>${fmt(p.anticipo)}</dd></div>
      <div><dt>Pagado</dt><dd class="${p.pagado ? 'ok' : ''}">${fmt(p.pagado)}</dd></div>
      <div><dt>Saldo</dt><dd>${fmt(p.saldo)}</dd></div>
    </dl>
    ${comprobantesHTML(p)}
    ${cobroHTML(p)}
  </article>`;
}

// ---------- "Mis pedidos": los de este dispositivo con su estado y lo que falta pagar ----------
const mioHTML = p => `<button type="button" class="mio" data-mio="${esc(p.id)}">
          <span class="mio-top"><b>${esc(p.id)}</b><span class="tag-est${p.estado === 'Cancelado' ? ' no' : p.estado === 'Entregado' ? ' ok' : ''}">${esc(PASO_TXT[p.estado] || p.estado)}</span></span>
          <small>${p.fecha ? esc(fmtDate(p.fecha)) + ' · ' : ''}${esc(String(p.productos).split('\n')[0])}${String(p.productos).includes('\n') ? ' y más' : ''}</small>
          <span class="mio-pago">${p.porPagarAnticipo > 0 ? `<em>Falta tu anticipo: ${fmt(p.porPagarAnticipo)}</em>` : `Pagado ${fmt(p.pagado)} de ${fmt(p.total)}`}</span>
        </button>`;
async function pintarMis(mis) {
  const box = $('#misLista');
  if (!mis.length) { box.innerHTML = '<p class="mis-vacio">Aquí aparecen los pedidos que hagas desde este teléfono o computadora. ¿Pediste desde otro lado? Búscalo abajo con su número y tu WhatsApp.</p>'; return; }
  box.innerHTML = mis.map(o => `<div class="mio esqueleto"><b>${esc(o.id)}</b><small>Cargando…</small></div>`).join('');
  try {
    const { pedidos } = await api('misPedidos', { pedidos: mis.map(o => ({ id: o.id, phone: o.phone })) });
    box.innerHTML = pedidos.length ? pedidos.map(mioHTML).join('') : '<p class="mis-vacio">No encontramos tus pedidos guardados. Búscalos abajo.</p>';
  } catch (x) { box.innerHTML = `<p class="mis-vacio">No pudimos cargar tus pedidos (${esc(x.message)}). Intenta de nuevo en un momento.</p>`; }
}

// ---------- búsqueda por número + WhatsApp ----------
function datosBusqueda(f) {
  const id = f.elements.id.value.trim().toUpperCase(), phone = f.elements.phone.value.trim(), err = $('#seguirErr');
  if (!/^PEHN-[\w-]{3,24}$/.test(id)) { err.textContent = 'El número de pedido empieza con PEHN-, ej. PEHN-261027-001.'; f.elements.id.focus(); return null; }
  if (phone.replace(/\D/g, '').length < 8) { err.textContent = 'Escribe el WhatsApp con el que hiciste el pedido.'; f.elements.phone.focus(); return null; }
  err.textContent = '';
  return { id, phone };
}
async function buscarPedido(f, estado) {
  const q = datosBusqueda(f); if (!q) return;
  const err = $('#seguirErr');
  $('#seguirBtn').disabled = true; $('#seguirBtn').textContent = 'Buscando…';
  try {
    const r = await api('seguimiento', q);
    seguido = q; pintarPedido(r.pedido);
    // pedido encontrado a mano: se suma a "Mis pedidos" (si la persona no pidió "solo el carrito")
    if (!estado.mis.some(o => o.id === q.id) && leer(KEY_CONSENT, '') !== 'minimo') { estado.mis = [{ ...q, fecha: r.pedido.fecha }, ...estado.mis].slice(0, 20); guardar(KEY_ORDERS, estado.mis); pintarMis(estado.mis); }
    const u = new URL(location.href); u.searchParams.set('id', q.id); history.replaceState(null, '', u); // el WhatsApp nunca va en la dirección
    $('#estadoPedido').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  } catch (x) { err.textContent = x.message; $('#estadoPedido').innerHTML = ''; }
  finally { $('#seguirBtn').disabled = false; $('#seguirBtn').textContent = 'Buscar pedido'; }
}

// ---------- comprobante del saldo ----------
async function elegirVoucher(file) {
  const err = $('#voucherErr');
  try {
    voucherData = await leerVoucher(file); err.textContent = '';
    $('#dropTxt').innerHTML = `<b>${esc(file.name)}</b><small>Listo para enviar · toca para cambiar</small>`;
    $('#drop').classList.add('lleno'); $('#sendVoucher').disabled = false;
  } catch (x) { voucherData = ''; err.textContent = x.message; $('#sendVoucher').disabled = true; }
}
async function enviarVoucher(btn, f) {
  const err = $('#voucherErr');
  btn.disabled = true; btn.textContent = 'Enviando y leyendo el monto…';
  try {
    const { pago } = await api('comprobante', { ...seguido, file: voucherData });
    voucherData = '';
    toast(pago.resultado === 'Coincide' ? `¡Listo! Recibimos ${fmt(pago.monto)}.` : 'Recibimos tu comprobante. Lo revisamos y te confirmamos por WhatsApp.');
    f.requestSubmit();
  } catch (x) { err.textContent = `No se pudo enviar: ${x.message}.`; btn.disabled = false; btn.textContent = 'Enviar comprobante'; }
}

function iniciarPedidos() {
  const f = $('#seguir'), q = new URLSearchParams(location.search);
  const estado = { mis: leer(KEY_ORDERS, []) };
  if (q.get('id')) f.elements.id.value = q.get('id');
  const conocido = estado.mis.find(o => o.id === f.elements.id.value);
  if (conocido) f.elements.phone.value = conocido.phone;
  pintarMis(estado.mis);
  $('#misLista').addEventListener('click', e => {
    const b = e.target.closest('[data-mio]'); if (!b) return;
    const o = estado.mis.find(x => x.id === b.dataset.mio); f.elements.id.value = o.id; f.elements.phone.value = o.phone; f.requestSubmit();
  });
  f.addEventListener('submit', e => { e.preventDefault(); buscarPedido(f, estado); });
  $('#estadoPedido').addEventListener('change', e => { if (e.target.id === 'voucher' && e.target.files[0]) elegirVoucher(e.target.files[0]); });
  $('#estadoPedido').addEventListener('click', e => { if (e.target.id === 'sendVoucher' && voucherData && seguido) enviarVoucher(e.target, f); });
  if (f.elements.id.value && f.elements.phone.value) f.requestSubmit();
}
if ($('#seguir')) iniciarPedidos();
