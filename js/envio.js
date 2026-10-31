/* Pehn Design — ENVÍO a Google Sheets: consumo de piezas (receta), foto del diseño y la única puerta api().
   Apps Script (carpeta apps-script/) guarda el pedido, la foto y descuenta inventario según la hoja Recetas.
   Lo usan: checkout.js y pedidos.js. */
import { CONFIG, FIG_GROUPS, normFig, varSets, varActivos, varKey } from '../datos.js';
import { renderProduct } from '../dibujos.js';
import { optLabel, visible } from './producto.js';

// ---------- consumo de piezas (la hoja Recetas dice qué pieza gasta cada clave) ----------
const bomLimpia = s => String(s).replace(/ /g, ' ').trim(); // igual que clean() en herramientas/generar-tienda.js
const bomEtiqueta = (groups, id, v) => { const g = groups.find(x => x.id === id); return g?.options ? optLabel(g, v) : v; };
const bomSinStock = l => /^(Ninguno|Ninguna|Sin corazón)$/i.test(l);

// piezas de una figura: cuerpo, cabeza, cabello, ropa, accesorios y (si lleva) base acrílica
function bomFigura(add, f0, conBase) {
  const f = normFig({ ...f0, extras: [...(f0.extras || [])] }), L = (id, v) => bomEtiqueta(FIG_GROUPS, id, v);
  add('Figura · Cuerpo');
  add(`Figura · Cabeza · ${L('skin', f.skin)}`);
  if (f.hair !== 'calvo') add(`Figura · Cabello · ${L('hair', f.hair)} · ${L('hairColor', f.hairColor)}`);
  if (f.outfit === 'vestido') add(`Figura · Vestido · ${L('torso', f.torso)}`);
  else { add(`Figura · Torso · ${L('outfit', f.outfit)} · ${L('torso', f.torso)}`); if (f.legs) add(`Figura · Piernas · ${L('legs', f.legs)}`); }
  if (f.hat && f.hat !== 'ninguno') add(`Figura · Sombrero · ${L('hat', f.hat)}`);
  if (['lego', 'falda'].includes(f.outfit)) add(`Figura · Ropa · ${L('outfit', f.outfit)}`);
  if (f.hand && f.hand !== 'ninguno') add(`Figura · Accesorio · ${L('hand', f.hand)}`);
  f.extras.forEach(x => add(`Figura · Detalle · ${L('extras', x) || x}`));
  if (conBase) add('Figura · Base acrílica');
}
// ids de grupos que ya cuentan como parte de una combinación (talla+color, etc.) y no se descuentan solos
function bomCombos(p) {
  const combo = new Set((p.stockKeys || []).flat());
  if (p.variants) varSets(p).forEach(s => Object.values(s.map).forEach(id => combo.add(id)));
  return combo;
}
// una opción de un grupo del producto
function bomGrupo(add, p, g, v, combo) {
  const lab = x => bomEtiqueta(p.groups, g.id, x);
  if (g.type === 'figs') v.forEach(f => bomFigura(add, f, true));
  else if (g.type === 'stepper') { if (v) add(`${p.name} · ${g.label}`, v); }
  else if (g.type === 'multi') (v || []).forEach(x => add(`${p.name} · ${g.label} · ${lab(x)}`));
  else if ((g.type === 'choice' || g.type === 'swatch') && !combo.has(g.id) && !g.noStock && !['font', 'tpl'].includes(g.id) && !bomSinStock(lab(v))) add(`${p.name} · ${g.label} · ${lab(v)}`);
}
export function bomOf(p, cfg, qty) {
  const out = [], add = (key, n = 1) => out.push({ key: bomLimpia(key), qty: n * qty });
  const figLike = p.groups.some(g => g.id === 'extras'); // el producto trae las opciones de la figura sueltas
  const figIds = new Set(FIG_GROUPS.map(g => g.id)), combo = bomCombos(p);
  add(p.name);
  p.groups.forEach(g => { if (visible(g, cfg) && !(figLike && figIds.has(g.id))) bomGrupo(add, p, g, cfg[g.id], combo); });
  if (p.variants) varActivos(p, cfg).forEach(s => add(varKey(p, s, cfg)));
  (p.stockKeys || []).forEach(ids => add(`${p.name} · ` + ids.map(id => { const g = p.groups.find(x => x.id === id); return `${g.label} ${bomEtiqueta(p.groups, id, cfg[id])}`; }).join(' · ')));
  if (figLike) bomFigura(add, cfg, p.id !== 'llavero');
  return out;
}

// ---------- foto del diseño ----------
// fuentes incrustadas para que la foto del diseño salga con las mismas letras
const SVG_FONTS = ['Playfair Display:ital,wght@0,500;0,700', 'Great Vibes', 'Bagel Fat One', 'Pacifico', 'Space Mono:wght@700', 'Alfa Slab One', 'Inter:wght@500;700'];
let fontCSS = null;
const aDataURL = u => fetch(u).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));
// descarga el CSS de Google Fonts y cambia cada archivo (solo el bloque latino) por su versión en base64
async function cssDeFuentes() {
  const css = await fetch('https://fonts.googleapis.com/css2?' + SVG_FONTS.map(f => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap').then(r => r.text());
  const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter(b => /\/\*\s*latin\s*\*\//.test(b));
  const out = await Promise.all(blocks.map(async b => {
    const m = b.match(/url\((https:[^)]+)\)/);
    return m ? b.replace(m[1], await aDataURL(m[1])) : b;
  }));
  return out.join('\n');
}
function embeddedFonts() {
  if (fontCSS) return fontCSS;
  const timeout = new Promise(ok => setTimeout(() => ok(''), 5000));
  fontCSS = Promise.race([cssDeFuentes(), timeout]).catch(() => '');
  return fontCSS;
}
// SVG con fuentes y tamaño fijo, listo para dibujarse en un canvas
function svgParaFoto(p, cfg, fonts, size) {
  let svg = renderProduct(p, cfg);
  if (fonts) svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${fonts}</style>`);
  const vb = (svg.match(/viewBox="([\d.\s-]+)"/) || [, '0 0 300 300'])[1].split(/\s+/).map(Number);
  const k = size / Math.max(vb[2], vb[3]), w = Math.round(vb[2] * k), h = Math.round(vb[3] * k);
  return { svg: svg.replace(/<svg /, `<svg width="${w}" height="${h}" `), w, h };
}
// foto JPG del diseño tal como lo ve el cliente
export async function previewImage(p, cfg, size = 900) {
  const { svg, w, h } = svgParaFoto(p, cfg, await embeddedFonts(), size);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image(); img.decoding = 'async';
    await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = url; });
    const pad = Math.round(size * 0.06), cv = document.createElement('canvas');
    cv.width = w + pad * 2; cv.height = h + pad * 2;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = p.render === 'frame' ? '#EDE5DA' : '#FBF7F2';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, pad, pad, w, h);
    return cv.toDataURL('image/jpeg', 0.86);
  } catch { return ''; } finally { URL.revokeObjectURL(url); }
}

// ---------- la puerta ----------
// Única puerta hacia Google Sheets (apps-script/Orders.gs › doPost). accion: 'pedido' | 'verificar' | 'seguimiento' | 'comprobante' | 'misPedidos'.
// Se manda como texto plano: así el navegador no hace la consulta previa (CORS) que Apps Script no contesta.
export async function api(accion, data) {
  if (!CONFIG.sheetsUrl) {
    console.warn('[Pehn] Falta CONFIG.sheetsUrl en datos.js: no se envió nada.', accion);
    throw new Error('el sistema de pedidos no está conectado');
  }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
  try {
    const res = await fetch(CONFIG.sheetsUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...data, accion, token: CONFIG.sheetsToken }), signal: ctl.signal });
    const out = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor' }));
    if (!out.ok) throw new Error(out.error || 'No se pudo completar');
    return out;
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'tardó demasiado, revisa tu conexión' : e.message);
  } finally { clearTimeout(t); }
}
