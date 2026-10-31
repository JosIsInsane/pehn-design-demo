/* Pehn Design — DIBUJOS (vistas previas en SVG)
   Cada producto tiene una función que recibe su configuración y regresa un <svg>.
   Las conecta RENDER (al final). Un producto nuevo necesita su función aquí y su nombre en RENDER.
   SI UN DIBUJO SALE EN BLANCO: en la consola (F12) prueba renderProduct(PRODUCTS[0], defaults(PRODUCTS[0])).
   Un error ahí dice qué opción llega vacía.
   Es un módulo: exporta renderProduct, RENDER y las funciones de dibujo que usan otros archivos. */
import { CONFIG, FIG_GROUPS, FONTS, catName, normFig } from './datos.js';
import { esc, shade } from './js/utiles.js';

let UID = 0; // ids únicos para gradientes/filtros dentro de cada SVG

const isLight = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 170; };
const MONTH_FMT = new Intl.DateTimeFormat(CONFIG.locale, { month: 'long' });

/* =================================================================
   ILUSTRACIÓN. Busca parecerse al producto físico: plástico con brillo,
   base acrílica, papel con sombra del marco, spray difuminado.
   ================================================================= */

// gradientes de volumen para una figura (luz desde arriba a la izquierda)
function figDefs(k) {
  return `<defs>
    <linearGradient id="${k}h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".35" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <linearGradient id="${k}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <radialGradient id="${k}g" cx=".32" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function hairSVG(style, c, k) {
  const s = shade(c, -0.35);
  const st = `fill="${c}" stroke="${s}" stroke-width="1.6" stroke-linejoin="round"`;
  const gloss = d => `<path d="${d}" fill="url(#${k}g)"/>`;
  switch (style) {
    case 'corto': { const d = 'M66 54C60 16 140 16 134 54C128 44 120 38 108 40C96 34 80 38 66 54Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'lado': { const d = 'M64 58C56 14 140 10 138 50C134 44 128 42 122 44C110 34 84 44 72 40C70 46 68 52 64 58Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'largo': { const d = 'M62 58C56 12 144 12 138 58L142 106C134 110 126 110 120 106L124 50C110 38 90 38 76 50L80 106C74 110 66 110 58 106Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'ondas': { const d = 'M62 58C54 10 146 10 138 58C146 70 136 80 144 92C148 102 138 110 128 106C122 98 128 84 124 72L124 50C110 38 90 38 76 50L76 72C72 84 78 98 72 106C62 110 52 102 56 92C64 80 54 70 62 58Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'rizos': return `<g ${st}>${[[70, 42], [82, 28], [100, 22], [118, 28], [130, 42], [66, 58], [134, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('')}</g><ellipse cx="88" cy="28" rx="16" ry="9" fill="url(#${k}g)"/>`;
    case 'chongo': return `<g ${st}><circle cx="100" cy="12" r="14"/><path d="M66 54C60 18 140 18 134 54C120 40 80 40 66 54Z"/></g>${gloss('M66 54C60 18 140 18 134 54C120 40 80 40 66 54Z')}`;
    default: return '';
  }
}

// va encima del peinado: el pelo largo sigue viéndose a los lados
function hatSVG(hat, f, k) {
  switch (hat) {
    case 'sombrero': return `<g fill="#1E1A18" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><path d="M74 40L78 8Q100 0 122 8L126 40Z"/><ellipse cx="100" cy="40" rx="44" ry="8"/></g><rect x="76" y="30" width="48" height="6" fill="#B3262E"/><path d="M80 12Q100 4 112 10L110 32H82Z" fill="url(#${k}g)"/>`;
    case 'vaquero': {
      const h = '#6B4428', ho = shade(h, -0.35);
      return `<g fill="${h}" stroke="${ho}" stroke-width="1.6" stroke-linejoin="round"><path d="M48 44Q52 32 72 36L76 10Q100 0 124 10L128 36Q148 32 152 44Q140 54 100 52Q60 54 48 44Z"/></g>
        <path d="M76 30Q100 36 124 30" stroke="${shade(h, -0.5)}" stroke-width="5" fill="none"/><path d="M92 6Q100 14 108 6" stroke="${ho}" stroke-width="2" fill="none"/><path d="M80 14Q96 6 110 10L108 28H80Z" fill="url(#${k}g)"/>`;
    }
    case 'gorra': {
      const h = f.torso && !isLight(f.torso) ? f.torso : '#B3262E', ho = shade(h, -0.35);
      return `<g fill="${h}" stroke="${ho}" stroke-width="1.6" stroke-linejoin="round"><path d="M66 44C64 12 136 12 134 44Z"/><path d="M60 44H152Q156 52 146 54H62Z"/></g><circle cx="100" cy="14" r="3.5" fill="${ho}"/><path d="M78 20Q96 10 110 14L108 38H78Z" fill="url(#${k}g)"/>`;
    }
    case 'casco': return `<g fill="#F2B705" stroke="#8A6500" stroke-width="1.6" stroke-linejoin="round"><path d="M64 46C62 12 138 12 136 46Z"/><path d="M56 46H144Q148 54 140 55H60Q52 54 56 46Z"/><path d="M94 14H106V46H94Z" fill="#FFD84D"/></g><path d="M76 22Q92 12 100 16L98 40H76Z" fill="url(#${k}g)"/>`;
    case 'cumple': return `<g stroke="#8A2C5A" stroke-width="1.6" stroke-linejoin="round"><path d="M78 40L100 -8L122 40Q100 46 78 40Z" fill="#F06AA6"/></g><g fill="#FFD23F"><circle cx="96" cy="22" r="3"/><circle cx="106" cy="30" r="3"/><circle cx="92" cy="34" r="2.4"/></g><path d="M86 24L98 2" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="-8" r="6" fill="#FFD23F" stroke="#B88A2A" stroke-width="1.4"/>`;
    case 'birrete': return `<g fill="#1E1A18" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><path d="M76 30V44Q100 54 124 44V30Z"/><path d="M54 24L100 8L146 24L100 40Z"/></g><path d="M100 24L136 28V46" stroke="#E0B44C" stroke-width="2.4" fill="none"/><circle cx="136" cy="48" r="3.4" fill="#E0B44C"/><path d="M62 24L100 12" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>`;
    case 'mono': return `<g transform="translate(124 26) rotate(18)" fill="#E45A84" stroke="#B33A63" stroke-width="1.4" stroke-linejoin="round"><path d="M0 0L-16-10V10Z"/><path d="M0 0L16-10V10Z"/><circle r="4.5"/></g>`;
    default: return '';
  }
}

function faceSVG(f) {
  const k = '#231A14', x = new Set(f.extras || []), ex = f.face || 'feliz';
  const lips = x.has('labios');
  const eye = cx => `<ellipse cx="${cx}" cy="52" rx="3.6" ry="4.6" fill="${k}"/><circle cx="${cx + 1.2}" cy="50.5" r="1.1" fill="#fff"/>`;
  let s = '';
  if (x.has('rubor')) s += `<circle cx="80" cy="62" r="5" fill="#F48FB1" opacity=".5"/><circle cx="120" cy="62" r="5" fill="#F48FB1" opacity=".5"/>`;
  if (x.has('pecas')) s += `<g fill="#9A5B3A" opacity=".7">${[[78, 58], [83, 61], [79, 64], [117, 58], [122, 61], [118, 64]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.1"/>`).join('')}</g>`;
  if (x.has('barba')) s += `<path d="M72 58C74 86 126 86 128 58C120 70 112 72 100 72C88 72 80 70 72 58Z" fill="#3B2617"/>`;
  if (x.has('bigote')) s += `<path d="M86 63Q93 57 100 61Q107 57 114 63Q107 62 100 64Q93 62 86 63Z" fill="#2B1C12"/>`;
  // boca según expresión; con labios rojos se pinta
  const mc = lips ? '#B7212D' : (x.has('barba') ? '#000' : k);
  if (ex === 'risa') s += `<path d="M87 63Q100 80 113 63Z" fill="${lips ? '#B7212D' : '#4A2018'}"/><path d="M91 64H109" stroke="#fff" stroke-width="2.4"/>`;
  else if (ex === 'seria') s += `<path d="M91 66H109" stroke="${mc}" stroke-width="${lips ? 4 : 3}" stroke-linecap="round"/>`;
  else s += lips ? `<path d="M89 64Q100 60 111 64Q100 74 89 64Z" fill="#B7212D"/>` : `<path d="M88 64Q100 73 112 64" fill="none" stroke="${mc}" stroke-width="3" stroke-linecap="round"/>`;
  // ojos
  if (ex === 'guino') s += `${eye(88)}<path d="M107 53Q112 48 117 53" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`;
  else s += eye(88) + eye(112);
  if (lips) s += `<path d="M82 47l-4-3M118 47l4-3" stroke="${k}" stroke-width="1.6" stroke-linecap="round"/>`;
  if (x.has('barba') || ex === 'seria') s += `<path d="M82 42h10M108 42h10" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (x.has('lentes')) s += `<g fill="none" stroke="${k}" stroke-width="2.6"><rect x="77" y="44" width="19" height="15" rx="6"/><rect x="104" y="44" width="19" height="15" rx="6"/><path d="M96 50h8M77 49l-6-2M123 49l6-2"/></g>`;
  if (x.has('sol')) s += `<g fill="#1A1412" stroke="#000" stroke-width="1.6"><path d="M75 45H97V53Q96 62 86 61Q76 60 75 53Z"/><path d="M103 45H125V53Q124 60 114 61Q104 62 103 53Z"/><path d="M97 47h6M75 46l-5-2M125 46l5-2" fill="none"/></g><path d="M79 48l6 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><path d="M107 48l6 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>`;
  if (x.has('aretes')) s += `<g fill="#D9B44A" stroke="#A8862A" stroke-width="1"><circle cx="70" cy="70" r="3.2"/><circle cx="130" cy="70" r="3.2"/></g>`;
  return s;
}

function outfitSVG(f, k) {
  const t = f.torso || '#1F2A44', o = shade(t, -0.3);
  switch (f.outfit) {
    case 'sueter': {
      const st = isLight(t) ? '#B3262E' : '#E8D9B8';
      return `<path d="M60 124H140M58 142H142" stroke="${st}" stroke-width="5"/><path d="M64 133l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" fill="none" stroke="#B3262E" stroke-width="2.6"/>`;
    }
    case 'cuadros': {
      const a = shade(t, 0.35), b = shade(t, -0.35);
      return `<defs><clipPath id="${k}c"><path d="M66 90H134L148 186H52Z"/></clipPath></defs><g clip-path="url(#${k}c)" opacity=".85">
        ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${50 + i * 18}" y="88" width="7" height="100" fill="${a}" opacity=".6"/>`).join('')}
        ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="48" y="${94 + i * 16}" width="104" height="6" fill="${b}" opacity=".55"/>`).join('')}</g>
        <path d="M88 90L100 104L112 90" fill="none" stroke="${b}" stroke-width="2.4"/><path d="M100 104V184" stroke="${b}" stroke-width="1.6"/>`;
    }
    case 'traje': return `<path d="M88 90L100 128L112 90Z" fill="#FFFDF9"/><path d="M96 98h8l5 40-9 10-9-10Z" fill="#7A1A24"/><path d="M86 90L100 150M114 90L100 150" stroke="${shade(t, 0.18)}" stroke-width="2.6"/><circle cx="100" cy="160" r="2.4" fill="${shade(t, 0.3)}"/>`;
    case 'lego': return `<g fill="${isLight(t) ? shade(t, -0.18) : shade(t, 0.22)}" stroke="${o}" stroke-width="1.2">${[[86, 118], [114, 118], [86, 146], [114, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>`;
    case 'vestido': return `<path d="M82 92Q100 110 118 92" fill="none" stroke="${shade(t, 0.35)}" stroke-width="2.6"/><path d="M70 150H130" stroke="${o}" stroke-width="2.4"/>`;
    case 'blusa': return `<path d="M80 90Q100 112 120 90" fill="${f.skin || '#F6D3B3'}" stroke="${shade(f.skin || '#F6D3B3', -0.25)}" stroke-width="1.4"/>`;
    case 'texto': {
      const tx = String(f.printText || 'TÚ').toUpperCase().slice(0, 6);
      return `<text x="100" y="138" text-anchor="middle" font-family="'Bagel Fat One'" font-size="${tx.length > 4 ? 16 : 22}" fill="${isLight(t) ? '#2A1A0E' : '#FFFDF9'}">${esc(tx)}</text>`;
    }
    default: return '';
  }
}

// accesorio en la mano: etiqueta redonda con la inicial (son 23 accesorios; no se dibuja cada uno)
const HAND_COLS = ['#E45A84', '#3E6E8E', '#2F8F5B', '#F08A1C', '#8E6CEF', '#D9363E', '#C9A44C'];
function handSVG(v) {
  const g = v && v !== 'ninguno' ? FIG_GROUPS.find(x => x.id === 'hand').options : null, i = g ? g.findIndex(o => o.v === v) : -1;
  if (i < 1) return '';
  const col = HAND_COLS[i % HAND_COLS.length];
  return `<g><circle cx="168" cy="148" r="19" fill="${col}" stroke="${shade(col, -0.35)}" stroke-width="2"/><circle cx="168" cy="148" r="19" fill="#fff" opacity=".12"/>
    <text x="168" y="156" text-anchor="middle" font-family="'Inter'" font-weight="700" font-size="22" fill="#fff">${esc(g[i].label.charAt(0).toUpperCase())}</text></g>`;
}

function minifig(f0, opts = {}) {
  const f = normFig({ ...f0, extras: [...(f0.extras || [])] });
  const k = 'm' + (++UID);
  const skin = f.skin || '#F6D3B3', torso = f.torso || '#1F2A44';
  const dress = f.outfit === 'vestido';
  const bareArms = f.outfit === 'blusa';
  const legs = dress ? torso : (f.legs || '#2E4A8C');
  const so = shade(skin, -0.3), to = shade(torso, -0.32), lo = shade(legs, -0.32);
  const arm = bareArms ? skin : torso, ao = bareArms ? so : to;
  const L = 'stroke-width="1.6" stroke-linejoin="round"';
  const H = `fill="url(#${k}h)"`, V = `fill="url(#${k}v)"`;
  let s = figDefs(k);
  if (!opts.half) {
    s += dress
      ? `<path d="M56 184H144L156 264H44Z" fill="${legs}" stroke="${lo}" ${L}/><path d="M56 184H144L156 264H44Z" ${H}/><path d="M80 186L74 262M120 186L126 262" stroke="${lo}" stroke-width="1.6" opacity=".55"/>
         <rect x="58" y="262" width="34" height="8" rx="3" fill="${skin}" stroke="${so}" ${L}/><rect x="108" y="262" width="34" height="8" rx="3" fill="${skin}" stroke="${so}" ${L}/>`
      : `<rect x="52" y="184" width="96" height="16" rx="3" fill="${legs}" stroke="${lo}" ${L}/><rect x="52" y="184" width="96" height="16" rx="3" ${H}/>
        <rect x="54" y="198" width="44" height="64" rx="4" fill="${legs}" stroke="${lo}" ${L}/><rect x="54" y="198" width="44" height="64" rx="4" ${H}/><rect x="54" y="198" width="44" height="64" rx="4" ${V}/>
        <rect x="102" y="198" width="44" height="64" rx="4" fill="${legs}" stroke="${lo}" ${L}/><rect x="102" y="198" width="44" height="64" rx="4" ${H}/><rect x="102" y="198" width="44" height="64" rx="4" ${V}/>
        <rect x="50" y="256" width="50" height="14" rx="4" fill="${shade(legs, -0.08)}" stroke="${lo}" ${L}/>
        <rect x="100" y="256" width="50" height="14" rx="4" fill="${shade(legs, -0.08)}" stroke="${lo}" ${L}/>`;
    if (f.outfit === 'falda') s += `<path d="M48 184H152L166 236H34Z" fill="${legs}" stroke="${lo}" ${L}/><path d="M48 184H152L166 236H34Z" ${H}/><path d="M76 188L66 234M100 188V234M124 188L134 234" stroke="${lo}" stroke-width="1.4" opacity=".5"/>`;
  }
  s += `<rect x="88" y="16" width="24" height="12" rx="3" fill="${skin}" stroke="${so}" ${L}/>
    <rect x="90" y="80" width="20" height="12" fill="${shade(skin, -0.15)}" stroke="${so}" ${L}/>
    <g transform="rotate(14 60 96)"><rect x="46" y="94" width="22" height="64" rx="10" fill="${arm}" stroke="${ao}" ${L}/><rect x="46" y="94" width="22" height="64" rx="10" ${H}/></g>
    <g transform="rotate(-14 140 96)"><rect x="132" y="94" width="22" height="64" rx="10" fill="${arm}" stroke="${ao}" ${L}/><rect x="132" y="94" width="22" height="64" rx="10" ${H}/></g>
    <path d="M66 90H134L148 186H52Z" fill="${torso}" stroke="${to}" ${L}/>
    ${bareArms ? `<path d="M66 90L60 104M134 90L140 104" stroke="${to}" stroke-width="1.4"/>` : ''}
    ${f.outfit === 'traje' || bareArms ? '' : `<path d="M86 90Q100 104 114 90" fill="none" stroke="${to}" stroke-width="2"/>`}
    ${outfitSVG(f, k)}
    <path d="M66 90H134L148 186H52Z" ${H}/>
    <g fill="${skin}" stroke="${so}" stroke-width="1.6"><circle cx="40" cy="164" r="11"/><circle cx="160" cy="164" r="11"/></g>
    <g fill="${so}"><circle cx="40" cy="166" r="4"/><circle cx="160" cy="166" r="4"/></g>
    ${handSVG(f.hand)}
    <rect x="70" y="24" width="60" height="62" rx="18" fill="${skin}" stroke="${so}" ${L}/>
    <rect x="70" y="24" width="60" height="62" rx="18" ${H}/>
    <ellipse cx="84" cy="36" rx="9" ry="5" fill="#fff" opacity=".45"/>
    ${faceSVG(f)}
    ${hairSVG(f.hat !== 'ninguno' && f.hair === 'chongo' ? 'corto' : f.hair, f.hairColor || '#1F1712', k)}
    ${hatSVG(f.hat, f, k)}`;
  return s;
}

// base acrílica transparente; toma un poco del color del fondo
const stand = tint => `<path d="M46 268H154L151 314H49Z" fill="${tint}" fill-opacity=".22"/>
  <path d="M46 268H154L151 314H49Z" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="2.4" stroke-opacity=".95"/>
  <path d="M46 268H154" stroke="#fff" stroke-width="4"/><path d="M57 276V306" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  <path d="M140 276V304" stroke="#000" stroke-opacity=".08" stroke-width="4" stroke-linecap="round"/>`;

export function minifigSVG(c) {
  const name = String(c.name || '').trim();
  const pack = String(c.pack).startsWith('acrilico') ? `<rect x="12" y="2" width="176" height="350" rx="10" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="3" stroke-opacity=".8"/><path d="M26 18L40 18L26 60Z" fill="#fff" opacity=".45"/>`
    : c.pack === 'kraft' ? `<g transform="translate(150 236) rotate(8)"><rect width="44" height="40" rx="4" fill="#C69C6D" stroke="#2A1A0E" stroke-width="2"/><path d="M22 0V40M0 16H44" stroke="#D9363E" stroke-width="4"/></g>` : '';
  return `<svg viewBox="0 0 200 356" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="318" rx="62" ry="7" fill="#000" opacity=".18"/>${stand('#ffffff')}${minifig(c)}
    ${name ? `<text x="100" y="344" text-anchor="middle" font-family="'Playfair Display'" font-weight="700" font-size="24" fill="#2A1A0E">${esc(name)}</text>` : ''}${pack}</svg>`;
}

/* ---------- cuadro ---------- */
function ransom(text, cx, y, maxW) {
  const lines = wrap(String(text).toUpperCase(), 11);
  const bgs = ['#F1E4CF', '#2A1A0E', '#8FA89A', '#E8B27A', '#FFFFFF', '#3E5C76', '#D9C7A7', '#B7212D'];
  const fonts = ["'Playfair Display'", "'Bagel Fat One'", "'Outfit'", "'Space Mono'", "'Alfa Slab One'"];
  let k = 0, out = '', lastX = cx;
  lines.slice(0, 2).forEach((ln, li) => {
    const cw = Math.min(18, maxW / ln.length);
    const x0 = cx - (cw * ln.length) / 2;
    [...ln].forEach((ch, i) => {
      if (ch === ' ') { k++; return; }
      const bg = bgs[(k * 3 + li) % bgs.length], fg = isLight(bg) ? '#2A1A0E' : '#FFFDF9';
      const rot = ((k * 37) % 11) - 5, x = x0 + i * cw + cw / 2, yy = y + li * (cw + 7) + ((k * 13) % 3) - 1;
      out += `<g transform="translate(${x.toFixed(1)} ${yy}) rotate(${rot})"><rect x="${-cw / 2 + 0.6}" y="${-cw * .64}" width="${cw - 1.2}" height="${cw * 1.2}" fill="${bg}"/>
        <rect x="${-cw / 2 + 0.6}" y="${-cw * .64}" width="${cw - 1.2}" height="${cw * 1.2}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".6"/>
        <text y="${cw * .3}" text-anchor="middle" font-family="${fonts[k % fonts.length]}" font-size="${cw * .92}" fill="${fg}">${esc(k % 4 === 1 ? ch.toLowerCase() : ch)}</text></g>`;
      if (li === 0) lastX = x + cw / 2;
      k++;
    });
  });
  return { svg: out, lines: Math.min(2, lines.length), lastX };
}

// parte un texto en renglones de máximo n letras sin cortar palabras
function wrap(text, n) {
  const out = []; let cur = '';
  String(text).split(/\s+/).filter(Boolean).forEach(w => {
    if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  });
  if (cur) out.push(cur);
  return out;
}

const HEART_D = 'M0 52C-62 16-70-26-40-40C-20-49-4-36 0-22C4-36 20-49 40-40C70-26 62 16 0 52Z';
const SPARK_D = 'M0-14c1 9 5 13 14 14-9 1-13 5-14 14-1-9-5-13-14-14 9-1 13-5 14-14Z';
const CAT = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#231C18"><path d="M-8 0Q-12-14-6-20L-6-28L-2-23H2L6-28L6-20Q12-14 8 0Z"/><path d="M8-2Q18-4 16-16" stroke="#231C18" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-19" r="1.2" fill="#E9C46A"/><circle cx="3" cy="-19" r="1.2" fill="#E9C46A"/><path d="M-4-24Q0-27 4-24" stroke="#fff" stroke-opacity=".25" fill="none"/></g>`;
const DOG = (x, y, s = 1, col = '#8A5634', spots = false) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0V-10Q-14-16-6-16H8L10-24Q18-26 18-18Q18-12 12-12V0H8V-6H-8V0Z" fill="${col}"/>${spots ? '<circle cx="-6" cy="-11" r="2.4" fill="#231C18"/><circle cx="2" cy="-13" r="1.8" fill="#231C18"/><circle cx="13" cy="-20" r="1.6" fill="#231C18"/>' : ''}<path d="M12-24Q8-22 9-15" fill="${shade(col, -0.35)}"/><circle cx="14" cy="-19" r="1.3" fill="#000"/><path d="M-14-12Q-20-16-18-22" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;

const BUNNY = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="-9" rx="11" ry="9" fill="#F4EEE6" stroke="#CFC4B6" stroke-width="1"/><circle cx="9" cy="-19" r="7" fill="#F4EEE6" stroke="#CFC4B6" stroke-width="1"/><path d="M6-25Q3-40 7-39Q11-38 10-25Z M11-25Q12-40 16-38Q18-36 14-25Z" fill="#F4EEE6" stroke="#CFC4B6" stroke-width="1"/><path d="M7-27Q6-36 8-36M13-27Q14-35 15-35" stroke="#F2B3C4" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="11" cy="-20" r="1.1" fill="#231C18"/><circle cx="-11" cy="-10" r="3.6" fill="#fff" stroke="#CFC4B6" stroke-width="1"/></g>`;

// layout por estilo: centro del corazón (hy), base de las figuras (base), línea de nombres (ny)
const LAYOUT = {
  amor: { hy: 112, base: 158, ny: 170 },
  cumple: { hy: 152, base: 196, ny: 208 },
  frase: { hy: 128, base: 176, ny: 190 },
  aniv: { hy: 118, base: 164, ny: 176 },
  libre: { hy: 138, base: 186, ny: 200 },
  calendario: { hy: 186, base: 214, ny: 228 },
};

function calendarSVG(iso) {
  const [y, m, d] = String(iso || '2025-05-31').split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const x0 = 96, cw = 18, y0 = 78, rh = 11.5;
  let s = `<text x="150" y="52" text-anchor="middle" font-family="'Playfair Display'" font-size="11" letter-spacing="2" fill="#231A14">${esc(MONTH_FMT.format(new Date(y, m - 1, 1)).toUpperCase())}</text>`;
  s += ['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((w, i) => `<text x="${x0 + i * cw}" y="65" text-anchor="middle" font-family="'Playfair Display'" font-size="7" fill="#231A14">${w}</text>`).join('');
  for (let n = 1; n <= days; n++) {
    const idx = first + n - 1, cx = x0 + (idx % 7) * cw, cy = y0 + Math.floor(idx / 7) * rh;
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="'Playfair Display'" font-size="6.6" fill="#231A14">${n}</text>`;
    if (n === d) s += `<path transform="translate(${cx + 1} ${cy - 2.4}) scale(.15)" d="${HEART_D}" fill="none" stroke="#C8102E" stroke-width="7" stroke-linecap="round"/>`;
  }
  return s;
}

// medidas de las figuras dentro del cuadro (en unidades del dibujo, 300×300); el personalizador las usa para acercar la figura que se edita
function frameGeom(c) {
  const n = (c.figs || []).length, tpl = LAYOUT[c.tpl] ? c.tpl : 'amor', { base } = LAYOUT[tpl];
  const sc = tpl === 'calendario' ? (n > 2 ? 0.2 : 0.25) : n > 3 ? 0.22 : n > 2 ? 0.27 : 0.32;
  const fw = 200 * sc, gap = 7 * (sc / 0.32), total = n * fw + (n - 1) * gap;
  return { sc, fw, gap, total, x0: 150 - total / 2, fy: base - 314 * sc };
}
export function frameFigBox(c, i) { const g = frameGeom(c); return { x: g.x0 + i * (g.fw + g.gap), y: g.fy, w: g.fw, h: 314 * g.sc }; }
// foto de fondo que sube el cliente (extra "Fondo"): solo imágenes del propio navegador (data:image)
const fondoFoto = c => (c.adds || []).includes('fondo') && /^data:image\/(png|jpeg|webp);base64,[\w+/=]+$/.test(c.bgImg || '')
  ? `<image href="${c.bgImg}" x="32" y="32" width="236" height="236" preserveAspectRatio="xMidYMid slice" opacity=".92"/>` : '';
export function frameSVG(c) {
  const k = 'f' + (++UID);
  const figs = c.figs || [], n = figs.length;
  const fr = c.frame || '#FFFDF9', heart = c.heart || '#F48FB1';
  const tpl = LAYOUT[c.tpl] ? c.tpl : 'amor';
  const { hy, base, ny } = LAYOUT[tpl];
  const nameFont = c.nameFont === 'firma' ? FONTS.firma : FONTS.serif;
  const tint = heart === 'none' ? '#ffffff' : heart;

  // título y calendario
  let top = '', starX = 0;
  if (tpl === 'cumple') { const r = ransom(c.top || 'Happy Birthday', 150, 62, 200); top = r.svg; starX = r.lastX; }
  if (tpl === 'calendario') top = calendarSVG(c.calDate);

  // corazón en spray: núcleo saturado, orilla difuminada con grano
  const hs = n > 3 ? 1.4 : n > 2 ? 1.22 : 1.06;
  const heartSVG = heart === 'none' ? '' : `<g transform="translate(150 ${hy}) scale(${hs})">
      <path d="${HEART_D}" fill="url(#${k}hg)" filter="url(#${k}sp)"/>
      <path d="${HEART_D}" fill="${heart}" opacity=".35" filter="url(#${k}gr)" transform="scale(1.08)"/>
    </g>`;

  // figuras
  const { sc, fw, gap, total, x0, fy } = frameGeom(c);
  const figsSVG = figs.map((f, i) => {
    const x = x0 + i * (fw + gap);
    const name = String(f.name || '').trim();
    return `<g transform="translate(${x.toFixed(1)} ${fy.toFixed(1)}) scale(${sc})" filter="url(#${k}ds)">${stand(tint)}${minifig(f)}</g>
      ${name ? `<text x="${(x + fw / 2).toFixed(1)}" y="${ny}" text-anchor="middle" font-family="${nameFont}" font-size="${c.nameFont === 'firma' ? 13 : 8.5}" fill="#231A14">${esc(name)}</text>` : ''}`;
  }).join('');

  // mascotas a los lados
  let petsSVG = '';
  const petList = [...Array(c.cats || 0).fill('c'), ...Array(c.dogs || 0).fill('d'), ...Array(c.bunnies || 0).fill('b')];
  petList.forEach((t, i) => {
    const left = i % 2 === 0, j = Math.floor(i / 2);
    const x = left ? x0 - 14 - j * 22 : x0 + total + 14 + j * 22;
    petsSVG += t === 'c' ? CAT(x, base - 4, 0.62) : t === 'b' ? BUNNY(x, base - 4, 0.7) : DOG(x, base - 4, 0.62, i % 3 === 2 ? '#BDB6AE' : '#8A5634', i % 3 === 2);
  });

  // detalles
  const figTop = fy + 10 * sc;
  let deco = '';
  if (c.deco === 'brillos') deco = `<g fill="#fff">${[[108, hy - 30, .4], [196, hy - 14, .32], [102, hy + 26, .3], [192, hy + 36, .38], [150, hy - 46, .26]].map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="${SPARK_D}"/>`).join('')}</g>`;
  if (c.deco === 'estrella') deco = `<path transform="translate(${tpl === 'cumple' ? Math.min(starX + 12, 252) : 200} ${tpl === 'cumple' ? 58 : figTop - 6}) scale(.62)" d="M0-14l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L0 7.1l-8.4 4.5 1.8-9.3-6.9-6.5 9.4-1.2Z" fill="#E0B44C" stroke="#B88A2A" stroke-width="1.2"/>`;
  if (c.deco === 'corazones') deco = `<g fill="#E45A84">${[[118, figTop - 6], [182, figTop - 6], [150, figTop - 14]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.14)" d="${HEART_D}"/>`).join('')}</g>`;
  if (c.deco === 'pride') deco = `<g transform="translate(138 ${figTop - 20})">${['#E5484D', '#F6952A', '#FFD23F', '#2FB67C', '#4B7BF5', '#8E6CEF'].map((col, i) => `<rect y="${i * 2.6}" width="24" height="2.6" fill="${col}"/>`).join('')}</g>
    <g>${figs.map((_, i) => `<path transform="translate(${(x0 + i * (fw + gap) + fw / 2).toFixed(1)} ${ny - 4}) scale(.2)" d="${HEART_D}" fill="#F05AA0"/><path transform="translate(${(x0 + i * (fw + gap) + fw / 2 - 3).toFixed(1)} ${ny - 7}) scale(.06)" d="${HEART_D}" fill="#fff" opacity=".6"/>`).join('')}</g>`;

  // luces (extra): hilo de foquitos arriba
  const luces = (c.adds || []).includes('luces') ? `<path d="M40 40Q95 56 150 40T260 40" fill="none" stroke="#6B5A48" stroke-width="1"/>${[48, 82, 116, 150, 184, 218, 252].map((x, i) => `<circle cx="${x}" cy="${42 + (i % 2 ? 6 : 0) + (i === 3 ? -4 : 0)}" r="3.2" fill="${['#FFD23F', '#FF8FB1', '#8EC5F2'][i % 3]}" stroke="#fff" stroke-width=".8"/>`).join('')}` : '';

  // textos
  let text = '';
  const body = String(c.body || '').trim();
  if (tpl === 'amor') {
    const lines = wrap(body, 54).slice(0, 6);
    const w = c.word || 'Amor';
    text = `<text x="48" y="${ny + 22}" font-family="'Playfair Display'" font-size="15" font-weight="500" fill="#231A14">${esc(w)}</text>
      <text x="48" y="${ny + 32}" font-family="'Playfair Display'" font-size="6.8" fill="#231A14">sus. [${esc(String(w).toLowerCase())}]</text>
      <text font-family="'Playfair Display'" font-size="5.9" fill="#231A14">${lines.map((l, i) => `<tspan x="48" y="${ny + 42 + i * 7.4}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'cumple' || tpl === 'aniv') {
    const lines = wrap(body, 60).slice(0, 3);
    const date = String(c.date || '').trim();
    const names = date ? figs.map(f => String(f.name || '').trim()).filter(Boolean).join(' & ').toUpperCase() : '';
    const all = [...lines, date, names].filter(Boolean);
    const big = !date && lines.length === 1;
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="${big ? 10 : 6.6}" fill="#231A14">${all.map((l, i) => `<tspan x="150" y="${ny + (big ? 30 : 22) + i * 8.4}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'frase') {
    const lines = wrap(body, 34).slice(0, 2);
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="10.5" fill="#231A14">${lines.map((l, i) => `<tspan x="150" y="${ny + 34 + i * 13}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'calendario') {
    const lines = wrap(body, 62).slice(0, 2);
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="6.8" fill="#231A14">${lines.map((l, i) => `<tspan x="150" y="${ny + 20 + i * 8.6}">${esc(l)}</tspan>`).join('')}</text>`;
  }

  const frDark = shade(fr === '#FFFDF9' ? '#E2DAD0' : fr, -0.25);
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" class="frame-svg">
    <defs>
      <radialGradient id="${k}hg" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${tint}" stop-opacity=".95"/><stop offset=".6" stop-color="${tint}" stop-opacity=".75"/><stop offset="1" stop-color="${tint}" stop-opacity=".25"/></radialGradient>
      <filter id="${k}sp" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="5.5"/></filter>
      <filter id="${k}gr" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="7" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.6" result="dots"/><feComposite in="SourceGraphic" in2="dots" operator="in" result="sp"/><feGaussianBlur in="sp" stdDeviation="1.6"/></filter>
      <filter id="${k}ds" x="-30%" y="-10%" width="160%" height="130%"><feDropShadow dx="6" dy="10" stdDeviation="6" flood-color="#000" flood-opacity=".22"/></filter>
      <linearGradient id="${k}fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(fr, 0.12)}"/><stop offset="1" stop-color="${shade(fr, -0.07)}"/></linearGradient>
      <linearGradient id="${k}wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient>
      <linearGradient id="${k}wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".03"/></linearGradient>
      <linearGradient id="${k}cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".12" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="${k}cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".08" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="${k}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="1" y="1" width="298" height="298" rx="3" fill="url(#${k}fr)" stroke="${frDark}" stroke-width="1.5"/>
    <rect x="10" y="10" width="280" height="280" fill="none" stroke="${frDark}" stroke-opacity=".45"/>
    <rect x="16" y="16" width="268" height="268" fill="${fr === '#FFFDF9' ? '#F4F0EA' : shade(fr, 0.1)}"/>
    <path d="M16 16H284L268 32H32Z" fill="url(#${k}wt)"/>
    <path d="M16 16L32 32V268L16 284Z" fill="url(#${k}wl)"/>
    <path d="M284 16V284L268 268V32Z" fill="#000" fill-opacity=".035"/>
    <rect x="32" y="32" width="236" height="236" fill="#FFFFFF"/>
    ${fondoFoto(c)}
    <rect x="32" y="32" width="236" height="236" fill="url(#${k}cs)"/>
    <rect x="32" y="32" width="236" height="236" fill="url(#${k}cl)"/>
    ${heartSVG}${top}${petsSVG}${figsSVG}${deco}${luces}${text}
    <text x="150" y="${base - 8}" text-anchor="middle" font-family="'Inter'" font-style="italic" font-size="5" fill="#fff" opacity=".75">@pehn.designn</text>
    <rect x="16" y="16" width="268" height="268" fill="url(#${k}gl)"/>
  </svg>`;
}

/* ---------- otros productos ---------- */
const textFit = (t, max, base) => t.length > max ? Math.max(10, Math.round(base * max / t.length)) : base;
const imgTag = (src, x, y, w, h) => src ? `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>` : '';

function keychainSVG(c) {
  const ring = c.ring || '#B9B4AE', t = String(c.tagText || '').trim();
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="30" r="22" fill="none" stroke="${ring}" stroke-width="7"/>
    <circle cx="100" cy="30" r="22" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="10 40" opacity=".7"/>
    <path d="M100 52v12" stroke="${ring}" stroke-width="5"/><circle cx="100" cy="66" r="5" fill="none" stroke="${ring}" stroke-width="4"/>
    <g transform="translate(20 56) scale(.8)">${minifig(c, { half: true })}</g>
    <rect x="58" y="214" width="84" height="44" rx="10" fill="${ring}" stroke="${shade(ring, -0.35)}" stroke-width="2"/>
    <rect x="62" y="218" width="76" height="12" rx="6" fill="#fff" opacity=".35"/>
    <text x="100" y="243" text-anchor="middle" font-family="'Playfair Display'" font-weight="700" font-size="${textFit(t || '✦', 6, 20)}" fill="#2A1A0E">${esc(t || '✦')}</text>
  </svg>`;
}

function sleeve(x, y, rot, col, ini, ink) {
  const o = shade(col, -0.18), cuff = shade(col, -0.06);
  const t = String(ini || '').toUpperCase().slice(0, 2) || 'A';
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M-50 -150C-60 -60-54 20-46 60H46C54 20 60-60 50-150Z" fill="${col}" stroke="${o}" stroke-width="3"/>
    <path d="M-30 -130C-36 -60-30 0-26 40" stroke="${o}" stroke-width="2" fill="none" opacity=".5"/>
    <rect x="-48" y="56" width="96" height="44" rx="10" fill="${cuff}" stroke="${o}" stroke-width="3"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M${-40 + i * 8} 60V96" stroke="${o}" stroke-width="1.5" opacity=".6"/>`).join('')}
    <text x="-14" y="30" text-anchor="middle" font-family="'Alfa Slab One'" font-size="44" fill="${ink}" stroke="${shade(ink, -0.35)}" stroke-width="1.5">${esc(t)}</text>
    <path transform="translate(${t.length > 1 ? 34 : 24} 10) scale(.42)" d="${HEART_D}" fill="${ink}" stroke="${shade(ink, -0.35)}" stroke-width="3"/>
  </g>`;
}
function hoodieSVG(c) {
  const two = c.pair !== '1';
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(22 26) scale(.85)">
    ${two ? sleeve(205, 150, 10, c.color2 || '#9A9A9E', c.ini2 || 'K', c.ink2 || '#6FA8DC') : ''}
    ${sleeve(two ? 100 : 150, two ? 160 : 150, two ? -8 : 0, c.color1 || '#F7F4EE', c.ini1 || 'E', c.ink1 || '#B3262E')}
  </g></svg>`;
}

function shirtSVG(c) {
  const col = c.color || '#1F2A44', ink = c.ink || '#2A1A0E', o = shade(col, -0.25);
  const t = String(c.text || '').trim(), back = c.pos === 'espalda';
  const font = FONTS[c.font] || FONTS.groovy, hasImg = !!c.img;
  return `<svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
    <path d="M98 30L128 18Q150 ${back ? 26 : 44} 172 18L202 30L266 74L238 122L214 106V296H86V106L62 122L34 74Z" fill="${col}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 18Q150 ${back ? 26 : 44} 172 18" fill="none" stroke="${o}" stroke-width="5"/>
    ${imgTag(c.img, 105, 80, 90, 120)}
    ${t ? `<text x="150" y="${hasImg ? 232 : 165}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 9, 30)}" fill="${ink}">${esc(t)}</text>` : (hasImg ? '' : `<g opacity=".55"><rect x="100" y="110" width="100" height="90" rx="10" fill="none" stroke="${shade(col, isLight(col) ? -0.35 : 0.5)}" stroke-width="3" stroke-dasharray="8 7"/><text x="150" y="162" text-anchor="middle" font-family="'Inter'" font-weight="700" font-size="14" fill="${shade(col, isLight(col) ? -0.45 : 0.6)}">Tu diseño</text></g>`)}
    ${c.pos === 'ambos' || back ? `<text x="150" y="286" text-anchor="middle" font-family="'Inter'" font-weight="700" font-size="12" fill="${shade(col, isLight(col) ? -0.45 : 0.6)}">${back ? 'VISTA ESPALDA' : 'FRENTE + ESPALDA'}</text>` : ''}
  </svg>`;
}

function mugSVG(c) {
  const inn = c.inner || '#1F2A44', t = String(c.text || '').trim();
  const font = FONTS[c.font] || FONTS.script, magic = c.type === 'magica';
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <path d="M218 110h18a32 32 0 0 1 0 64h-18" fill="none" stroke="${inn}" stroke-width="16"/>
    <path d="M58 70H222V236Q222 262 196 262H84Q58 262 58 236Z" fill="#FFFDF9" stroke="#2A1A0E" stroke-width="3"/>
    <ellipse cx="140" cy="70" rx="82" ry="14" fill="${inn}" stroke="#2A1A0E" stroke-width="3"/>
    ${imgTag(c.img, 86, 96, 108, 100)}
    ${t ? `<text x="140" y="${c.img ? 228 : 172}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 8, 28)}" fill="#2A1A0E">${esc(t)}</text>` : (c.img ? '' : `<text x="140" y="172" text-anchor="middle" font-family="'Pacifico'" font-size="26" fill="${inn}">tu frase</text>`)}
    ${magic ? `<rect x="60" y="86" width="160" height="174" fill="#2A1A0E" opacity=".35"/><text x="140" y="250" text-anchor="middle" font-family="'Inter'" font-weight="700" font-size="12" fill="#FFFDF9">✦ aparece con calor</text>` : ''}
    <path d="M70 92V230" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".6"/>
  </svg>`;
}

function cupSVG(c) {
  const k = 'c' + (++UID), col = c.cup || '#F4F1EC', clear = col === '#F4F1EC', big = c.size === '24';
  const t = String(c.name || '').trim(), ink = c.ink || '#FFFFFF', font = FONTS[c.font] || FONTS.firma;
  const top = big ? 52 : 70, w0 = big ? 64 : 60, w1 = big ? 44 : 42;
  const body = `M${150 - w0} ${top}L${150 - w1} 282Q150 290 ${150 + w1} 282L${150 + w0} ${top}Z`;
  const inkFill = clear && ink === '#FFFFFF' ? '#1E1611' : ink;
  return `<svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${k}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".22" stop-color="#fff" stop-opacity=".08"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>
    <ellipse cx="150" cy="292" rx="58" ry="7" fill="#000" opacity=".14"/>
    <rect x="164" y="${top - 58}" width="9" height="${big ? 110 : 96}" rx="4" transform="rotate(10 168 ${top})" fill="${clear ? '#F08A1C' : shade(col, -0.2)}"/>
    <path d="${body}" fill="${col}" fill-opacity="${clear ? .55 : .95}" stroke="${shade(col, -0.25)}" stroke-width="1.5"/>
    ${clear ? `<path d="M${150 - w0 + 12} ${top + 18}L${150 - w1 + 8} 272Q150 278 ${150 + w1 - 8} 272L${150 + w0 - 12} ${top + 18}Z" fill="#fff" opacity=".5"/>` : ''}
    <path d="${body}" fill="url(#${k}g)"/>
    <rect x="${150 - w0 - 4}" y="${top - 12}" width="${(w0 + 4) * 2}" height="16" rx="7" fill="${clear ? '#E9E3DA' : shade(col, -0.12)}" stroke="${shade(col, -0.3)}" stroke-width="1.2"/>
    <path d="M${150 - w0 + 2} ${top - 12}Q150 ${top - 30} ${150 + w0 - 2} ${top - 12}Z" fill="${clear ? '#F4EFE7' : col}" stroke="${shade(col, -0.3)}" stroke-width="1.2"/>
    ${t ? `<text x="150" y="${top + 96}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 7, c.font === 'firma' ? 40 : 30)}" fill="${inkFill}">${esc(t)}</text>` : ''}
    <path d="M${150 - w0 + 8} ${top + 10}L${150 - w1 + 6} 270" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  </svg>`;
}

function tumblerSVG(c) {
  const k = 't' + (++UID), col = c.color || '#1E1611', t = String(c.name || '').trim() || 'Tu nombre';
  const font = FONTS[c.font] || FONTS.firma, tall = c.model === 'skinny';
  const h = tall ? 220 : 190, y0 = 290 - h;
  const ink = isLight(col) ? '#5C4C41' : '#E9E3DA';
  return `<svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${k}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".05"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
    <ellipse cx="150" cy="296" rx="56" ry="7" fill="#000" opacity=".15"/>
    <rect x="108" y="${y0 - 30}" width="84" height="34" rx="9" fill="#2B2420"/><rect x="108" y="${y0 - 30}" width="84" height="34" rx="9" fill="url(#${k}g)"/>
    <rect x="130" y="${y0 - 42}" width="40" height="14" rx="6" fill="#3A302A"/>
    <rect x="102" y="${y0}" width="96" height="${h}" rx="20" fill="${col}"/>
    <rect x="102" y="${y0}" width="96" height="${h}" rx="20" fill="url(#${k}g)"/>
    <text transform="translate(154 ${y0 + h / 2}) rotate(-90)" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${textFit(t, 7, c.font === 'firma' ? 38 : 30)}" fill="${ink}" opacity=".95">${esc(t)}</text>
  </svg>`;
}

function toteSVG(c) {
  const k = 'b' + (++UID), col = c.color || '#EFE3CC', ink = c.ink || '#1E1611', t = String(c.text || '').trim();
  const font = FONTS[c.font] || FONTS.serif, big = c.size === 'g';
  const inkFill = col === '#1E1611' && ink === '#1E1611' ? '#FFFFFF' : ink;
  const x0 = big ? 56 : 66, x1 = big ? 244 : 234;
  return `<svg viewBox="0 0 300 330" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="${k}p" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0h4M0 2h4" stroke="#000" stroke-opacity=".05"/><path d="M0 0v4M2 0v4" stroke="#fff" stroke-opacity=".06"/></pattern>
      <linearGradient id="${k}g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".14"/></linearGradient></defs>
    <ellipse cx="150" cy="318" rx="92" ry="7" fill="#000" opacity=".12"/>
    <path d="M110 112V70a40 40 0 0 1 80 0v42" fill="none" stroke="${shade(col, -0.18)}" stroke-width="11" stroke-linecap="round"/>
    <path d="M${x0} 104H${x1}L${x1 + 8} 310H${x0 - 8}Z" fill="${col}"/>
    <path d="M${x0} 104H${x1}L${x1 + 8} 310H${x0 - 8}Z" fill="url(#${k}p)"/>
    <path d="M${x0} 104H${x1}L${x1 + 8} 310H${x0 - 8}Z" fill="url(#${k}g)"/>
    <path d="M${x0} 116H${x1}" stroke="#000" stroke-opacity=".08" stroke-dasharray="3 3"/>
    ${imgTag(c.img, 100, 140, 100, 90)}
    ${t ? `<text x="150" y="${c.img ? 262 : 214}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 10, c.font === 'firma' ? 34 : 26)}" fill="${inkFill}">${esc(t)}</text>` : ''}
  </svg>`;
}

// productos de la tienda sin dibujo propio: su foto (p.photo) o una tarjeta de color con el nombre
function genericoSVG(c, p = {}) {
  const k = 'g' + (++UID), bg = p.bg || '#E9D8B4', name = String(p.name || ''), lines = wrap(name, 13).slice(0, 4);
  const ink = isLight(bg) ? '#2A1A0E' : '#FFFDF9', fs = lines.length > 3 ? 22 : lines.some(l => l.length > 11) ? 25 : 30;
  const y0 = 150 - (lines.length - 1) * fs * 0.6;
  const col = c.color && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '', det = [c.size, c.model].filter(Boolean).join(' · ');
  const clip = `<clipPath id="${k}c"><rect x="10" y="10" width="280" height="280" rx="26"/></clipPath>`;
  if (p.photo) return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs>${clip}</defs><rect x="10" y="10" width="280" height="280" rx="26" fill="${bg}"/><image href="${esc(p.photo)}" x="10" y="10" width="280" height="280" preserveAspectRatio="xMidYMid slice" clip-path="url(#${k}c)"/></svg>`;
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
    <rect x="10" y="10" width="280" height="280" rx="26" fill="${bg}"/><rect x="10" y="10" width="280" height="280" rx="26" fill="url(#${k}g)"/>
    <circle cx="246" cy="54" r="64" fill="#fff" opacity=".18"/><circle cx="36" cy="270" r="54" fill="#fff" opacity=".14"/>
    <text x="150" y="${(y0 - fs - 6).toFixed(1)}" text-anchor="middle" font-family="'Inter'" font-weight="700" font-size="11" letter-spacing="3" fill="${ink}" opacity=".6">${esc(catName(p.cat).toUpperCase())}</text>
    <text text-anchor="middle" font-family="'Playfair Display'" font-weight="700" font-size="${fs}" fill="${ink}">${lines.map((l, i) => `<tspan x="150" y="${(y0 + i * fs * 1.2).toFixed(1)}">${esc(l)}</tspan>`).join('')}</text>
    ${col || det ? `<g transform="translate(150 252)">${col ? `<circle cx="${det ? -Math.min(60, 4 + det.length * 5) : 0}" cy="0" r="12" fill="${col}" stroke="${ink}" stroke-opacity=".5" stroke-width="2"/>` : ''}${det ? `<text x="${col ? 8 : 0}" text-anchor="middle" y="5" font-family="'Inter'" font-weight="700" font-size="15" fill="${ink}">${esc(det)}</text>` : ''}</g>` : ''}
  </svg>`;
}

export const RENDER = { minifig: minifigSVG, frame: frameSVG, keychain: keychainSVG, hoodie: hoodieSVG, shirt: shirtSVG, mug: mugSVG, cup: cupSVG, tumbler: tumblerSVG, tote: toteSVG, generico: genericoSVG };
export const renderProduct = (p, cfg) => RENDER[p.render](cfg, p);

// cara chiquita para las pestañas de figuras
export function headSVG(f) {
  return `<svg viewBox="40 0 120 100" aria-hidden="true">${minifig(f, { half: true })}</svg>`;
}
