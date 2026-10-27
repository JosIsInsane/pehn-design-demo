/* Pehn Design — BASE: utilidades comunes y el estado compartido (App). Todas las páginas lo cargan.
   Depende de: datos.js (CONFIG, PRODUCTS). Se carga ANTES de dibujos.js, que usa esc() y shade().
   Aquí va todo lo que dos o más módulos necesitan; cada módulo solo declara lo suyo. */

// ---------- texto y color ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// aclara (p > 0) u oscurece (p < 0) un color #rrggbb
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (p < 0 ? c : 255 - c) * p)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const HEX = /^#[0-9a-f]{6}$/i;
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- DOM y formato ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
// con "menos movimiento" activo solo se quitan el vuelo al carrito y la inclinación; lo demás son fundidos cortos
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
const DATE_FMT = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'long', year: 'numeric' });
function fmtDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return y ? DATE_FMT.format(new Date(y, m - 1, d)) : ''; }
const clone = o => JSON.parse(JSON.stringify(o));
const productoDe = id => PRODUCTS.find(p => p.id === id);
const HOLA = '¡Hola Pehn Design! ✦';

// ---------- almacenamiento del navegador (en modo privado o sin permiso no truena) ----------
// claves de localStorage: cambiarlas vacía lo guardado de todos
const KEY_CART = 'pehn_cart', KEY_CONTACT = 'pehn_contact', KEY_ORDERS = 'pehn_pedidos', KEY_CONSENT = 'pehn_aviso', KEY_SITIO = 'pehn_sitio', KEY_PAGO = 'pehn_pago';
const almacen = donde => ({
  leer(k, def) { try { return JSON.parse(donde().getItem(k)) ?? def; } catch { return def; } },
  guardar(k, v) { try { donde().setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: sigue sin recordar */ } },
  borrar(k) { try { donde().removeItem(k); } catch { /* nada que borrar */ } },
  limpiar() { try { donde().clear(); } catch { /* nada que limpiar */ } },
});
const local = almacen(() => localStorage), sesion = almacen(() => sessionStorage);
const { leer, guardar, borrar } = local;

// reduce la imagen para que el carrito (localStorage) y los envíos no pesen de más
function shrinkImage(file, max) {
  return new Promise(res => {
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.src = r.result; };
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
    };
    r.readAsDataURL(file);
  });
}

// ---------- estado compartido entre módulos ----------
// Lo que solo usa un módulo vive dentro de ese módulo; lo que comparten dos o más está aquí.
const App = {
  cart: [],        // [{ id, cfg, qty }] lo que hay en el pedido (carrito.js)
  cur: null,       // diseño abierto en el personalizador: { p, cfg, qty, editIdx, fig, step, mov, sub, … } (personalizador*.js)
  zoom: { s: 1, x: 0, y: 0, min: 1, max: 4 }, // zoom de la vista previa (zoom.js)
  fotos: {},       // foto real -> true (existe) / false (no existe) / null (comprobando) (tarjetas.js)
  caja: { vista: 'cart', datos: null, comprobante: '', desde: 0 }, // cajón del pedido: paso, datos del paso 1, comprobante, cuándo se mostró el formulario
};
