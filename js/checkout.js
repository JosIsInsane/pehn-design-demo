/* Pehn Design — DATOS Y ANTICIPO (pasos del cajón) y envío del pedido.
   Paso 1: datos de contacto. Paso 2: paga el % y sube el comprobante; el pedido y el comprobante viajan juntos.
   Si en Config "Anticipo antes de enviar" = No, se salta el paso 2. El % y los datos bancarios llegan con ?api=sitio.
   Lo usa: cajon.js (y pedidos.js para leerVoucher). El estado del cajón está en estado.js. */
import { CONFIG } from '../datos.js';
import { $, esc, shrinkImage } from './utiles.js';
import { fmt } from './formato.js';
import { leer, guardar, borrar, KEY_PAGO, KEY_CONSENT, KEY_CONTACT, KEY_ORDERS } from './almacen.js';
import {
  datosDeCaja, comprobanteDeCaja, fichaDeCaja, guardarComprobanteDeCaja, pagadorDeCaja, guardarPagadorDeCaja, marcarInicioDeFormulario, msDesdeElFormulario,
  reiniciarCaja, vaciarCarrito,
} from './estado.js';
import { cartTotals, saveCart } from './carrito.js';
import { summary } from './producto.js';
import { HOLA, waURL, waCartText } from './whatsapp.js';
import { api, bomOf, previewImage } from './envio.js';
import { tsBox, montarTurnstile, reiniciarTurnstile, tokenTurnstile } from './turnstile.js';
import { openModal, closeModal } from './modales.js';

const pagoInfo = () => ({ pct: 50, banco: '', antes: true, ...leer(KEY_PAGO, {}) });
export const leerDatos = () => { const f = $('#coForm'); return f ? Object.fromEntries(new FormData(f)) : datosDeCaja(); };

// ---------- paso 1: datos ----------
const checkbox = (nombre, marcado, html, req = '') => `<label class="chk"><input type="checkbox" name="${nombre}" ${req}${marcado ? ' checked' : ''}> ${html}</label>`;
function datosFormHTML(d, antes) {
  const datos = datosDeCaja();
  return `<form class="co" id="coForm" novalidate>
      <label>Nombre completo<input name="name" autocomplete="name" required value="${esc(d.name)}"></label>
      <div class="row2">
        <label>WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="8 dígitos, ej. 9876 5432…" value="${esc(d.phone)}"></label>
        <label>Correo<input name="email" type="email" inputmode="email" autocomplete="email" required value="${esc(d.email)}"></label>
      </div>
      <div class="row2">
        <label>Ciudad<input name="city" autocomplete="address-level2" required value="${esc(d.city)}"></label>
        <label>¿Para cuándo?<input name="date" type="date" value="${esc(d.date)}"></label>
      </div>
      <label>Notas para el diseño<textarea name="notes" placeholder="Ej. él usa lentes redondos, ella tiene fleco…">${esc(d.notes)}</textarea></label>
      ${checkbox('remember', datos ? datos.remember : leer(KEY_CONSENT, '') !== 'minimo', 'Recordar mis datos y mis pedidos en este dispositivo')}
      ${checkbox('consent', datos?.consent, 'Acepto el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a>: usan mis datos solo para hacer, enviar y darle seguimiento a mi pedido.', 'required')}
      <label class="hp" aria-hidden="true">No llenar<input name="website" tabindex="-1" autocomplete="off"></label>
      ${antes ? '' : tsBox()}
      <div class="err" id="coErr" role="alert"></div>
    </form>`;
}
export function renderCheckout(total) {
  const d = datosDeCaja() || leer(KEY_CONTACT, {}), antes = pagoInfo().antes;
  marcarInicioDeFormulario(); // el servidor rechaza envíos "instantáneos" de bots
  $('#dTitle').textContent = 'Tus datos';
  $('#dBody').innerHTML = `${antes ? '<ol class="co-pasos" aria-label="Pasos"><li aria-current="step">1. Tus datos</li><li>2. Anticipo</li></ol>' : ''}<button class="back" id="backCart">← Volver al pedido</button>
    ${datosFormHTML(d, antes)}`;
  $('#dFoot').innerHTML = `<div class="tot big"><span>Total estimado</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="${antes ? 'goPago' : 'sendOrder'}">${antes ? 'Siguiente: pagar anticipo →' : 'Enviar pedido ✦'}</button>
    <p class="note">${antes ? `Para empezar tu pedido se paga el ${pagoInfo().pct}%.` : 'Te confirmamos por correo y te escribimos por WhatsApp con tu diseño.'}</p>`;
  montarTurnstile();
}

// revisa el paso 1; marca cada campo con su error y regresa los datos o null
const REGLAS = {
  name: v => v.trim() ? '' : 'Escribe tu nombre.',
  phone: v => v.replace(/\D/g, '').replace(/^504/, '').length >= 8 ? '' : 'Escribe tu WhatsApp de 8 dígitos, ej. 9876 5432.',
  email: v => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v.trim()) ? '' : 'Revisa tu correo, ej. ana@correo.com.',
  city: v => v.trim() ? '' : 'Escribe tu ciudad.',
  consent: v => v ? '' : 'Necesitamos tu permiso para usar tus datos en el pedido.',
};
// pone (o quita) el mensaje de error junto a un campo
function marcarCampo(el, k, msg) {
  const id = 'e_' + k;
  let m = document.getElementById(id);
  if (!m) { m = document.createElement('span'); m.id = id; m.className = 'f-err'; (el.type === 'checkbox' ? el.parentElement : el).after(m); el.setAttribute('aria-describedby', id); }
  m.textContent = msg; el.setAttribute('aria-invalid', !!msg);
}
export function validarDatos() {
  const f = $('#coForm'), err = $('#coErr');
  const data = Object.fromEntries(new FormData(f));
  let first = null;
  Object.entries(REGLAS).forEach(([k, fn]) => {
    const el = f.elements[k], msg = fn(String(data[k] || ''));
    marcarCampo(el, k, msg);
    if (msg && !first) first = el;
  });
  if (first) { err.textContent = 'Revisa los campos marcados.'; first.focus(); return null; }
  err.textContent = '';
  // solo se recuerdan si la persona lo pidió; si no, se borra lo que hubiera
  if (data.remember) guardar(KEY_CONTACT, { name: data.name, phone: data.phone, email: data.email, city: data.city }); else borrar(KEY_CONTACT);
  return data;
}

// ---------- paso 2: anticipo ----------
export const FLECHA_SUBIR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>';
export function renderAnticipo(total) {
  const { pct, banco } = pagoInfo(), monto = Math.round(total * pct / 100), listo = comprobanteDeCaja();
  $('#dTitle').textContent = 'Paga tu anticipo';
  $('#dBody').innerHTML = `<ol class="co-pasos" aria-label="Pasos"><li>1. Tus datos</li><li aria-current="step">2. Anticipo</li></ol>
    <button class="back" id="backDatos">← Mis datos</button>
    <div class="pago">
      <h3>Transfiere ${fmt(monto)} (${pct}% de ${fmt(total)})</h3>
      ${banco ? `<p class="banco">${esc(banco)}</p>` : `<p class="note" style="text-align:left">Pídenos la cuenta por <a class="wa-link" href="${waURL(`${HOLA} Quiero pagar el anticipo de mi pedido.`)}" target="_blank" rel="noopener">WhatsApp</a>.</p>`}
      <label class="pagador">¿Lo paga otra persona? <small>(opcional) nombre del titular de la cuenta que transfiere</small>
        <input id="pagador" name="pagador" maxlength="80" autocomplete="off" placeholder="Ej. Emma García" value="${esc(pagadorDeCaja())}"></label>
      <label class="drop${listo ? ' lleno' : ''}" id="anticipoDrop"><input type="file" id="anticipoFile" accept="image/jpeg,image/png,image/webp,application/pdf"><span class="drop-ico" aria-hidden="true">${FLECHA_SUBIR}</span><span id="anticipoTxt" aria-live="polite">${listo ? '<b>Comprobante verificado ✓</b><small>Toca para cambiarlo</small>' : '<b>Sube la captura de tu comprobante</b><small>Lo verificamos al instante · JPG, PNG o PDF · máx. 5&nbsp;MB</small>'}</span></label>
      <p class="note" style="text-align:left;margin:0">El saldo (${fmt(total - monto)}) se paga al entregar. Te mandamos tu diseño para aprobar antes de producir.</p>
    </div>
    ${tsBox()}
    <div class="err" id="coErr" role="alert"></div>`;
  $('#dFoot').innerHTML = `<div class="tot big"><span>Anticipo</span><span>${fmt(monto)}</span></div>
    <button class="btn btn-dark" id="sendOrder" ${listo ? '' : 'disabled'}>Enviar pedido y comprobante ✦</button>
    <p class="note">Solo se puede enviar con un comprobante verificado.</p>`;
  montarTurnstile();
}

// foto (se reduce) o PDF del comprobante, como texto para enviarlo
export async function leerVoucher(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo pesa más de 5 MB.');
  if (file.type === 'application/pdf') return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); });
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Sube una foto (JPG o PNG) o un PDF.');
  return shrinkImage(file, 1800); // legible para leer el monto, liviana para enviar
}
// cambió quién paga: lo verificado ya no vale (el nombre es parte de la verificación)
export function cambiarPagador(nombre) {
  guardarPagadorDeCaja(nombre);
  if (!comprobanteDeCaja()) return;
  guardarComprobanteDeCaja(''); $('#sendOrder').disabled = true;
  $('#anticipoDrop').classList.remove('lleno');
  $('#anticipoTxt').innerHTML = '<b>Vuelve a subir tu comprobante</b><small>Cambiaste quién paga: hay que verificarlo de nuevo</small>';
}
// el cliente eligió un archivo en el paso 2: se verifica en el servidor al instante (monto, cuenta, fecha, repetido)
export async function elegirComprobante(file) {
  guardarComprobanteDeCaja(''); $('#sendOrder').disabled = true; $('#coErr').textContent = '';
  const drop = $('#anticipoDrop'), txt = $('#anticipoTxt');
  drop.classList.remove('lleno', 'malo'); drop.classList.add('revisando');
  txt.innerHTML = `<b>Verificando tu comprobante…</b><small>Toma unos segundos</small>`;
  try {
    const archivo = await leerVoucher(file);
    const { verificacion: v } = await api('verificar', { comprobante: archivo, total: cartTotals().total, nombre: (datosDeCaja() || {}).name || '', pagador: pagadorDeCaja() });
    if (!v.ok) throw new Error(v.motivo);
    guardarComprobanteDeCaja(archivo, v.ficha);
    txt.innerHTML = `<b>Comprobante verificado ✓</b><small>Leímos ${fmt(v.monto)} · toca para cambiarlo</small>`;
    drop.classList.add('lleno'); $('#sendOrder').disabled = false;
  } catch (x) {
    txt.innerHTML = `<b>${esc(file.name)}</b><small>No pasó la verificación · toca para subir otro</small>`;
    drop.classList.add('malo');
    $('#coErr').innerHTML = `${esc(x.message)} Si tu transferencia es correcta, <a class="wa-link" href="${waURL(`${HOLA} Mi comprobante no pasó la verificación del sitio.`)}" target="_blank" rel="noopener">escríbenos por WhatsApp</a>.`;
  } finally { drop.classList.remove('revisando'); }
}

// ---------- envío ----------
// el pedido tal como lo recibe Apps Script
function armarPedido(data, totales, previews) {
  const { rows, gross, disc, total } = totales, { website, remember, consent, ...customer } = data;
  return {
    customer, website: website || '', turnstile: tokenTurnstile(), fillMs: msDesdeElFormulario(),
    currency: CONFIG.currency,
    items: rows.map((r, i) => ({
      product: r.p.name, qty: r.i.qty, unitPrice: r.unit, discount: r.disc, total: r.total,
      options: summary(r.p, r.i.cfg),
      images: r.p.groups.filter(g => g.type === 'file' && r.i.cfg[g.id]).map(g => r.i.cfg[g.id]),
      preview: previews[i],
      bom: bomOf(r.p, r.i.cfg, r.i.qty),
    })),
    subtotal: gross, discount: disc, total,
    comprobante: comprobanteDeCaja(), ficha: fichaDeCaja(), pagador: pagadorDeCaja(),
  };
}
// recuerda el número de pedido en este dispositivo (si la persona lo permitió) y vacía el carrito
function cerrarPedido(id, data) {
  if (id && data.remember) guardar(KEY_ORDERS, [{ id, phone: data.phone, fecha: new Date().toISOString().slice(0, 10) }, ...leer(KEY_ORDERS, []).filter(o => o.id !== id)].slice(0, 20));
  vaciarCarrito(); saveCart(); reiniciarCaja(); closeModal('#drawer');
}
function mostrarGracias(res, data, total) {
  const id = res.id || '';
  const pago = res.pago ? (res.pago.resultado === 'Coincide' ? `<br>Anticipo verificado: <b>${fmt(res.pago.monto)}</b>. ✓` : '<br>Recibimos tu comprobante; lo revisamos y te confirmamos.') : '';
  $('#doneTxt').innerHTML = `${id ? `Tu número de pedido es <b>${esc(id)}</b>.<br>` : ''}Total <b>${fmt(total)}</b>.${pago}<br>Te escribimos a <b>${esc(data.phone)}</b> con tu diseño para aprobar.${id ? `<br><a href="pedido.html?id=${encodeURIComponent(id)}">Ver mis pedidos →</a>` : ''}`;
  openModal('#done');
}
export async function enviarPedido(btn, data) {
  if (CONFIG.turnstileSiteKey && !tokenTurnstile()) { $('#coErr').textContent = 'Espera un momento: estamos verificando que eres una persona.'; return; }
  const totales = cartTotals(), label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparando tu diseño…';
  const previews = await Promise.all(totales.rows.map(r => previewImage(r.p, r.i.cfg).catch(() => '')));
  const order = armarPedido(data, totales, previews);
  btn.textContent = 'Enviando…';
  try {
    const res = await api('pedido', order);
    cerrarPedido(res.id || '', data);
    mostrarGracias(res, data, totales.total);
  } catch (e) {
    $('#coErr').innerHTML = `No se pudo enviar (${esc(e.message || 'sin conexión')}). Intenta de nuevo o <a href="${waURL(waCartText())}" target="_blank" rel="noopener">mándalo por WhatsApp</a>.`;
    btn.disabled = false; btn.textContent = label; reiniciarTurnstile();
  }
}
