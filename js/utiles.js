/* Pehn Design — UTILIDADES: funciones pequeñas de texto, color, DOM e imagen que usan varios módulos.
   No importa nada (es la base de todo): por eso no puede haber dependencias circulares con ella. */

// ---------- texto y color ----------
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// aclara (p > 0) u oscurece (p < 0) un color #rrggbb
export function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (p < 0 ? c : 255 - c) * p)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export const HEX = /^#[0-9a-f]{6}$/i;
export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- DOM ----------
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
// ¿la persona pidió "menos movimiento"? Entonces solo se quitan el vuelo al carrito y la inclinación; lo demás son fundidos cortos
export const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clone = o => JSON.parse(JSON.stringify(o));

// reduce la imagen para que el carrito (localStorage) y los envíos no pesen de más
export function shrinkImage(file, max) {
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
