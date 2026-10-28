/* Pehn Design — FORMATO: precios en lempiras y fechas en español, según CONFIG de datos.js. */
import { CONFIG } from '../datos.js';

export const fmt = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
const DATE_FMT = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'long', year: 'numeric' });
export function fmtDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return y ? DATE_FMT.format(new Date(y, m - 1, d)) : ''; }
