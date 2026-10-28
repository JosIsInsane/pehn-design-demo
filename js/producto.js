/* Pehn Design — PRODUCTO: configuración por defecto, precio y resumen de un producto ya configurado.
   Funciones puras (no tocan la página). Las usan tarjetas, carrito, personalizador, envío del pedido y WhatsApp. */
import { CONFIG, FIG_GROUPS, figDefault, varInicio, varFix, varLines } from '../datos.js';
import { HEX, clone } from './utiles.js';
import { fmtDate } from './formato.js';
import { productoDe } from '../datos.js';

// opciones iniciales de un producto (la primera de cada grupo; las variantes arrancan en la más barata)
export function defaults(p) {
  const c = {};
  p.groups.forEach(g => {
    if (g.type === 'swatch' || g.type === 'choice') c[g.id] = g.options[0].v;
    else if (g.type === 'stepper') c[g.id] = g.min;
    else if (g.type === 'figs') c[g.id] = [figDefault(0), figDefault(1)];
    else if (g.type === 'multi') c[g.id] = [];
    else c[g.id] = '';
  });
  if (p.variants) varInicio(p, c);
  p.init && p.init(c);
  if (p.variants) varFix(p, c);
  return c;
}
export const visible = (g, cfg) => !g.showIf || g.showIf(cfg);
export const cardCfg = card => { const p = productoDe(card.id); return { ...defaults(p), ...clone(card.cfg || {}) }; };

// ---------- precio ----------
// agrega a `lines` ({ label, price }) lo que cuesta cada opción elegida
function optPrices(groups, cfg, lines, prefix = '') {
  groups.filter(g => visible(g, cfg)).forEach(g => {
    const v = cfg[g.id];
    if (g.type === 'swatch' || g.type === 'choice') {
      const o = g.options.find(x => x.v === v);
      if (o && o.price) lines.push({ label: prefix + o.label, price: o.price });
    } else if (g.type === 'multi') {
      g.options.filter(o => (v || []).includes(o.v) && o.price).forEach(o => lines.push({ label: prefix + o.label, price: o.price }));
    } else if ((g.type === 'text' || g.type === 'file') && g.price && String(v || '').trim()) {
      lines.push({ label: prefix + g.label, price: g.price });
    } else if (g.type === 'stepper' && v) {
      lines.push({ label: `${g.label} ×${v}`, price: v * g.pricePer });
    } else if (g.type === 'figs') {
      lines.push({ label: `${v.length} figura${v.length > 1 ? 's' : ''}`, price: v.length * g.pricePer });
      v.forEach((f, i) => optPrices(FIG_GROUPS, f, lines, `${f.name || 'Figura ' + (i + 1)}: `));
    }
  });
}
export function priceOf(p, cfg) {
  // variantes: el precio sale de la talla/color elegidos; si no, es la base + opciones
  const lines = p.variants ? varLines(p, cfg) : p.base ? [{ label: 'Base', price: p.base }] : [];
  optPrices(p.groups, cfg, lines);
  return { lines, unit: lines.reduce((s, l) => s + l.price, 0) };
}
export function lineTotal(unit, qty) {
  const gross = unit * qty;
  const disc = qty >= CONFIG.bulkMin ? Math.round(gross * CONFIG.bulkPct / 100) : 0;
  return { gross, disc, total: gross - disc };
}

// ---------- resumen en texto ----------
// nombre del color de la paleta más parecido (para colores de pedidos reales fuera de la paleta)
function colorName(g, v) {
  const rgb = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  if (!HEX.test(v)) return v;
  return g.options.filter(o => o.v.startsWith('#')).map(o => ({ o, d: rgb(o.v).reduce((s, c, i) => s + (c - rgb(v)[i]) ** 2, 0) })).sort((x, y) => x.d - y.d)[0]?.o.label || v;
}
export const optLabel = (g, v) => g.options.find(o => o.v === v)?.label || (g.type === 'swatch' ? colorName(g, v) : v);

// pares [etiqueta, valor] de lo elegido (para el carrito, WhatsApp y el pedido)
function summaryOf(groups, cfg) {
  return groups.filter(g => visible(g, cfg)).flatMap(g => {
    const v = cfg[g.id];
    if ((g.id === 'hat' || g.id === 'hand') && v === 'ninguno') return [];
    if (g.type === 'swatch' || g.type === 'choice') return v ? [[g.label, optLabel(g, v)]] : [];
    if (g.type === 'file') return v ? [[g.label, cfg[g.id + 'Name'] || 'Imagen adjunta']] : [];
    if (g.type === 'stepper') return v ? [[g.label, v]] : [];
    if (g.type === 'figs') return v.map((f, i) => [`Figura ${i + 1}`, summaryOf(FIG_GROUPS, f).map(x => x[1]).join(', ')]);
    if (g.type === 'date') return v ? [[g.label, fmtDate(v)]] : [];
    if (g.type === 'multi') { const l = g.options.filter(o => (v || []).includes(o.v)).map(o => o.label); return l.length ? [[g.label, l.join(' + ')]] : []; }
    return String(v || '').trim() ? [[g.label, v]] : [];
  });
}
export const summary = (p, cfg) => summaryOf(p.groups, cfg);
