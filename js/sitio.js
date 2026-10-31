/* Pehn Design — CONTENIDO EDITABLE (CRM › Sitio web, hoja "Sitio"): colores, textos, fotos y contacto.
   Llega de Apps Script (?api=sitio) y se guarda en el navegador para la siguiente visita.
   Seguridad: los textos se ponen con textContent (nunca como HTML); colores y enlaces se validan aquí también.
   Si no hay conexión o falla, se queda lo que trae el HTML. */
import { CONFIG } from '../datos.js';
import { shade, HEX } from './utiles.js';
import { leer, guardar, KEY_SITIO, KEY_PAGO } from './almacen.js';
import { pintarWa } from './whatsapp.js';

const luz = h => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
const contraste = (a, b) => { const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const hexDe = v => HEX.test(v || '') ? v : null;

function aplicarColores(v) {
  const r = document.documentElement.style, marca = hexDe(v['color.marca']);
  if (marca) { r.setProperty('--brand', marca); r.setProperty('--brand-600', shade(marca, -0.1)); r.setProperty('--brand-ink', shade(marca, -0.45)); r.setProperty('--brand-soft', shade(marca, 0.85)); }
  const fondo = hexDe(v['color.fondo']), tinta = hexDe(v['color.texto']);
  // los colores de fondo y texto solo se aplican si se leen bien juntos (contraste 4.5:1)
  if (fondo && tinta && contraste(fondo, tinta) < 4.5) return console.warn('[Pehn] color.fondo y color.texto casi no contrastan: se dejan los de siempre.');
  if (fondo) { r.setProperty('--bg', fondo); r.setProperty('--bg-2', shade(fondo, -0.04)); document.querySelector('meta[name=theme-color]')?.setAttribute('content', fondo); }
  if (tinta) { r.setProperty('--ink', tinta); r.setProperty('--ink-2', shade(tinta, 0.3)); }
}
function aplicarTextos(v) {
  document.querySelectorAll('[data-edit]').forEach(el => {
    const k = el.dataset.edit; if (!(k in v)) return;
    const txt = String(v[k]);
    if (/\.p$/.test(k)) { const d = el.closest('details'); if (d) d.hidden = !txt.trim(); }
    if (el.textContent.trim() !== txt.trim()) el.textContent = txt; // si es igual se respeta el HTML (por ejemplo, un enlace)
  });
}
function aplicarFotos(v) {
  document.querySelectorAll('[data-edit-img]').forEach(el => {
    const u = String(v[el.dataset.editImg] || '');
    if (/^(fotos\/[\w.-]+|https:\/\/(lh3\.googleusercontent\.com|drive\.google\.com)\/\S+)$/.test(u) && el.getAttribute('src') !== u) el.src = u;
  });
}
function aplicarContacto(v) {
  const wa = String(v['contacto.whatsapp'] || '').replace(/\D/g, '');
  if (wa.length >= 8) { CONFIG.whatsapp = wa; pintarWa(); } // el número del CRM manda sobre el de datos.js
  if (/^https:\/\/(www\.)?instagram\.com\//.test(v['contacto.instagram'] || '')) document.querySelectorAll('.ig-link').forEach(a => { a.href = v['contacto.instagram']; });
}
function aplicarSitio(v) {
  if (!v || typeof v !== 'object') return;
  aplicarColores(v); aplicarTextos(v); aplicarFotos(v); aplicarContacto(v);
}

// Vista previa del editor (/admin): la página va dentro de un iframe del mismo sitio y recibe los cambios
// mientras se escriben (solo mensajes de este mismo dominio). Nada se guarda: es solo lo que se ve.
let enVistaPrevia = false;
function escucharEditor() {
  if (window.parent === window) return;
  try { if (window.parent.location.pathname.startsWith('/admin')) document.documentElement.classList.add('en-editor'); } catch { /* otro dominio: no es el editor */ }
  addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || typeof e.data !== 'object') return;
    if (e.data.tipo === 'pehn-vista') { enVistaPrevia = true; aplicarSitio(e.data.sitio); }
    if (e.data.tipo === 'pehn-resaltar') {
      const el = document.querySelector(`[data-edit="${CSS.escape(String(e.data.clave))}"],[data-edit-img="${CSS.escape(String(e.data.clave))}"]`);
      document.querySelectorAll('.pehn-resaltado').forEach(x => x.classList.remove('pehn-resaltado'));
      if (el) { el.classList.add('pehn-resaltado'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  });
  parent.postMessage({ tipo: 'pehn-lista' }, location.origin);
}

export function iniciarSitio() {
  aplicarSitio(leer(KEY_SITIO, null)); // lo guardado: la página sale con el contenido nuevo sin esperar
  escucharEditor();
  if (CONFIG.api) {
    fetch(CONFIG.api + '?api=sitio').then(r => r.json()).then(r => { if (enVistaPrevia) return; if (r && r.ok && r.sitio) { aplicarSitio(r.sitio); guardar(KEY_SITIO, r.sitio); if (r.pago) guardar(KEY_PAGO, r.pago); } }).catch(() => { /* sin conexión: queda el HTML */ });
  }
}

// un texto editable para piezas que se pintan después (carrito, personalizador): lo guardado del CRM o el de siempre
export const textoSitio = (clave, deSiempre) => String(leer(KEY_SITIO, {})[clave] || deSiempre);
