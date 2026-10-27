/* Pehn Design — catálogo, personalizador, carrito y envío del pedido
   Datos y precios: datos.js. Dibujos: dibujos.js. Este archivo solo maneja la página.
   Envío del pedido a Google Sheets: ver api() y apps-script/README.md. */

const fmt = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
const $ = s => document.querySelector(s);
// con "menos movimiento" activo solo se quitan el vuelo al carrito y la inclinación; lo demás son fundidos cortos
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const productoDe = id => PRODUCTS.find(p => p.id === id);
const HOLA = '¡Hola Pehn Design! ✦';
// claves del navegador (localStorage): cambiarlas vacía el carrito guardado de todos
const KEY_CART = 'pehn_cart', KEY_CONTACT = 'pehn_contact', KEY_ORDERS = 'pehn_pedidos', KEY_CONSENT = 'pehn_aviso';
// lectura/escritura segura del navegador: en modo privado o sin permiso no truena
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: sigue sin recordar */ } };
const borrar = k => { try { localStorage.removeItem(k); } catch { } };

function defaults(p) {
  const c = {};
  p.groups.forEach(g => {
    if (g.type === 'swatch' || g.type === 'choice') c[g.id] = g.options[0].v;
    else if (g.type === 'stepper') c[g.id] = g.min;
    else if (g.type === 'figs') c[g.id] = [figDefault(0), figDefault(1)];
    else if (g.type === 'multi') c[g.id] = [];
    else c[g.id] = '';
  });
  p.init && p.init(c);
  return c;
}
const clone = o => JSON.parse(JSON.stringify(o));
const visible = (g, cfg) => !g.showIf || g.showIf(cfg);
const cardCfg = card => { const p = productoDe(card.id); return { ...defaults(p), ...clone(card.cfg || {}) }; };

function optPrices(groups, cfg, lines, prefix = '') {
  groups.forEach(g => {
    if (!visible(g, cfg)) return;
    const v = cfg[g.id];
    if (g.type === 'swatch' || g.type === 'choice') {
      const o = g.options.find(o => o.v === v);
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
function priceOf(p, cfg) {
  const lines = [{ label: 'Base', price: p.base }];
  optPrices(p.groups, cfg, lines);
  return { lines, unit: lines.reduce((s, l) => s + l.price, 0) };
}
function lineTotal(unit, qty) {
  const gross = unit * qty;
  const disc = qty >= CONFIG.bulkMin ? Math.round(gross * CONFIG.bulkPct / 100) : 0;
  return { gross, disc, total: gross - disc };
}

// nombre del color de la paleta más parecido (para colores de pedidos reales fuera de la paleta)
function colorName(g, v) {
  const rgb = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  if (!/^#[0-9a-f]{6}$/i.test(v)) return v;
  return g.options.filter(o => o.v.startsWith('#')).map(o => ({ o, d: rgb(o.v).reduce((s, c, i) => s + (c - rgb(v)[i]) ** 2, 0) })).sort((x, y) => x.d - y.d)[0]?.o.label || v;
}
const optLabel = (g, v) => g.options.find(o => o.v === v)?.label || (g.type === 'swatch' ? colorName(g, v) : v);

function summaryOf(groups, cfg) {
  return groups.filter(g => visible(g, cfg)).flatMap(g => {
    const v = cfg[g.id];
    if (g.id === 'hat' && v === 'ninguno') return [];
    if (g.type === 'swatch' || g.type === 'choice') return v ? [[g.label, optLabel(g, v)]] : [];
    if (g.type === 'file') return v ? [[g.label, cfg[g.id + 'Name'] || 'Imagen adjunta']] : [];
    if (g.type === 'stepper') return v ? [[g.label, v]] : [];
    if (g.type === 'figs') return v.map((f, i) => [`Figura ${i + 1}`, summaryOf(FIG_GROUPS, f).map(x => x[1]).join(', ')]);
    if (g.type === 'date') return v ? [[g.label, fmtDate(v)]] : [];
    if (g.type === 'multi') { const l = g.options.filter(o => (v || []).includes(o.v)).map(o => o.label); return l.length ? [[g.label, l.join(' + ')]] : []; }
    return String(v || '').trim() ? [[g.label, v]] : [];
  });
}
const summary = (p, cfg) => summaryOf(p.groups, cfg);
const DATE_FMT = new Intl.DateTimeFormat(CONFIG.locale, { day: 'numeric', month: 'long', year: 'numeric' });
function fmtDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return y ? DATE_FMT.format(new Date(y, m - 1, d)) : ''; }

/* ---------- catálogo ---------- */
const PAGE = 8;
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const state = { cat: 'todos', q: '', sort: 'feat', shown: PAGE };

function cardHTML(card, ci, href) {
  const p = productoDe(card.id);
  const cfg = cardCfg(card);
  const title = card.title || p.name;
  const badge = card.badge ?? (card.cfg ? '' : p.badge);
  const hasPhoto = card.photo && photoOK[card.photo] !== false;
  const tint = `color-mix(in srgb, ${card.bg || p.bg} 26%, #FBF7F2)`;
  const sg = p.groups.find(g => g.type === 'swatch');
  const dots = sg ? `<span class="dots" aria-hidden="true">${sg.options.filter(o => o.v !== 'none').slice(0, 4).map(o => `<i style="background:${o.v}"></i>`).join('')}</span>` : '';
  const open = href ? `href="${href}"` : `data-card="${ci}" role="button" tabindex="0"`;
  const tag = href ? 'a' : 'article';
  return `<${tag} class="card${hasPhoto ? ' has-photo' : ''}" ${open} aria-label="Personalizar ${esc(title)}">
    <div class="card-media" style="--tint:${tint}">
      ${badge ? `<span class="badge">${badge}</span>` : ''}
      <div class="art-illus">${renderProduct(p, cfg)}</div>
      ${hasPhoto ? `<img class="real" src="${card.photo}" alt="" width="480" height="600" loading="lazy" decoding="async" style="object-position:${card.photoPos || '50% 50%'}" onerror="this.closest('.card').classList.remove('has-photo');this.nextElementSibling.remove();this.remove()"><span class="real-chip"><i></i>Pedido real</span>` : ''}
      <span class="card-cta">Personalizar ${ARROW}</span>
    </div>
    <div class="card-body">
      <p class="card-cat">${catName(p.cat)}</p>
      <h3>${esc(title)}</h3>
      <p class="card-desc">${esc(card.desc || p.desc)}</p>
      <div class="card-foot"><span class="price"><small>desde</small>${fmt(priceOf(p, cfg).unit)}</span>${dots}</div>
    </div>
  </${tag}>`;
}

function results() {
  const q = norm(state.q.trim());
  let list = CARDS.map((card, ci) => {
    const p = productoDe(card.id);
    return { card, ci, p, price: priceOf(p, cardCfg(card)).unit, title: card.title || p.name };
  }).filter(r => (state.cat === 'todos' || r.p.cat === state.cat)
    && (!q || norm([r.title, r.card.desc || r.p.desc, catName(r.p.cat), r.p.name].join(' ')).includes(q)));
  if (state.sort === 'asc') list.sort((x, y) => x.price - y.price);
  if (state.sort === 'desc') list.sort((x, y) => y.price - x.price);
  if (state.sort === 'name') list.sort((x, y) => x.title.localeCompare(y.title, 'es'));
  return list;
}

function renderFilters() {
  const count = id => CARDS.filter(c => id === 'todos' || productoDe(c.id).cat === id).length;
  $('#filters').innerHTML = CATS.map(([id, l]) => `<button role="tab" aria-selected="${id === state.cat}" data-f="${id}">${l}<b>${count(id)}</b></button>`).join('');
}

function renderGrid(append = false) {
  const list = results(), grid = $('#grid');
  const from = append ? grid.querySelectorAll('.card').length : 0;
  const slice = list.slice(from, state.shown);
  const html = slice.map(r => cardHTML(r.card, r.ci)).join('');
  if (append) grid.insertAdjacentHTML('beforeend', html);
  else grid.innerHTML = list.length ? html : `<div class="empty-search"><h3>Nada por aquí… todavía</h3><p>No encontramos “${esc(state.q)}”. Prueba otra palabra o escríbenos: lo hacemos a la medida.</p><button class="btn btn-dark" data-reset>Ver todo el catálogo</button></div>`;
  const shown = Math.min(state.shown, list.length);
  $('#resCount').textContent = list.length ? `${list.length} producto${list.length > 1 ? 's' : ''}${state.cat !== 'todos' ? ' en ' + catName(state.cat) : ''}` : 'Sin resultados';
  const lm = $('#loadMore');
  lm.hidden = shown >= list.length;
  $('#loadTxt').textContent = `Mostrando ${shown} de ${list.length}`;
  $('#loadBtn').textContent = `Mostrar ${Math.min(PAGE, list.length - shown)} más`;
  $('#loadBar').style.transform = `scaleX(${list.length ? shown / list.length : 0})`;
  reveal(true);
}

function syncURL() {
  const u = new URL(location.href);
  [['cat', state.cat !== 'todos' && state.cat], ['q', state.q.trim()], ['sort', state.sort !== 'feat' && state.sort]].forEach(([k, v]) => v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
  ['card', 'edit'].forEach(k => u.searchParams.delete(k));
  history.replaceState(null, '', u);
}
function refresh() { state.shown = PAGE; syncURL(); swapContent($('#grid'), () => renderGrid()); }

$('#filters')?.addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b || b.dataset.f === state.cat) return;
  state.cat = b.dataset.f; renderFilters(); refresh();
});
let qT;
$('#q')?.addEventListener('input', e => {
  state.q = e.target.value; $('#qClear').hidden = !state.q;
  clearTimeout(qT); qT = setTimeout(refresh, 160);
});
$('#qClear')?.addEventListener('click', () => { $('#q').value = ''; state.q = ''; $('#qClear').hidden = true; $('#q').focus(); refresh(); });
$('#sort')?.addEventListener('change', e => { state.sort = e.target.value; refresh(); });
$('#loadBtn')?.addEventListener('click', () => { state.shown += PAGE; renderGrid(true); });
document.addEventListener('click', e => {
  if (!e.target.closest('[data-reset]')) return;
  state.q = ''; state.cat = 'todos'; $('#q').value = ''; $('#qClear').hidden = true; renderFilters(); refresh();
});

// cambia contenido con un fundido corto (solo opacidad/transform)
function swapContent(el, fn) {
  el.classList.add('swap-out');
  setTimeout(() => { fn(); el.classList.remove('swap-out'); el.classList.add('swap-in'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('swap-in'))); }, 140);
}

/* ---------- zoom de la vista previa ---------- */
const Z = { s: 1, x: 0, y: 0, min: 1, max: 4 };
const zArea = () => $('#cZoomArea'), zLayer = () => $('#cStage');
function zApply(anim = false) {
  const area = zArea(), layer = zLayer(); if (!area) return;
  const W = area.clientWidth, H = area.clientHeight;
  Z.s = Math.min(Z.max, Math.max(Z.min, Z.s));
  Z.x = Math.min(0, Math.max(W - W * Z.s, Z.x));
  Z.y = Math.min(0, Math.max(H - H * Z.s, Z.y));
  layer.classList.toggle('anim', anim);
  layer.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.s})`;
  area.classList.toggle('zoomed', Z.s > 1.01);
  $('#zVal').textContent = Math.round(Z.s * 100) + '%';
  $('#zOut').disabled = Z.s <= Z.min + .01; $('#zIn').disabled = Z.s >= Z.max - .01; $('#zReset').disabled = Z.s <= 1.01;
}
function zoomAt(cx, cy, ns, anim = false) {
  ns = Math.min(Z.max, Math.max(Z.min, ns));
  Z.x = cx - (cx - Z.x) * (ns / Z.s); Z.y = cy - (cy - Z.y) * (ns / Z.s); Z.s = ns;
  zApply(anim); hideTip();
}
function zReset(anim = true) { Z.s = 1; Z.x = 0; Z.y = 0; zApply(anim); }
const zCenter = () => { const a = zArea(); return [a.clientWidth / 2, a.clientHeight / 2]; };
let tipT;
function showTip() {
  const t = $('#zoomTip'); if (!t) return;
  try { if (sessionStorage.getItem('pehn_tip')) { t.classList.add('hide'); return; } sessionStorage.setItem('pehn_tip', '1'); } catch { }
  t.textContent = matchMedia('(pointer: coarse)').matches ? 'Pellizca o toca dos veces para acercar' : 'Usa la rueda o doble clic para acercar';
  t.classList.remove('hide'); clearTimeout(tipT); tipT = setTimeout(hideTip, 3200);
}
function hideTip() { $('#zoomTip')?.classList.add('hide'); }
(function initZoom() {
  const area = zArea(); if (!area) return;
  const pts = new Map(); let last = null, pinch = null, lastTap = 0;
  const rel = e => { const r = area.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  area.addEventListener('wheel', e => {
    e.preventDefault();
    const [cx, cy] = rel(e);
    zoomAt(cx, cy, Z.s * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)));
  }, { passive: false });
  area.addEventListener('pointerdown', e => {
    area.setPointerCapture(e.pointerId); pts.set(e.pointerId, rel(e));
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: Z.s }; }
    last = rel(e);
    // doble toque/clic: acerca al punto o regresa
    const now = performance.now();
    if (pts.size === 1 && now - lastTap < 300) { const [cx, cy] = rel(e); Z.s > 1.01 ? zReset() : zoomAt(cx, cy, 2.5, true); lastTap = 0; }
    else lastTap = now;
  });
  area.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, rel(e));
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.s * d / pinch.d);
    } else if (pts.size === 1 && Z.s > 1.01 && last) {
      const p = rel(e); Z.x += p[0] - last[0]; Z.y += p[1] - last[1]; last = p;
      area.classList.add('dragging'); zApply();
    }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = pts.size ? [...pts.values()][0] : null; area.classList.remove('dragging'); };
  area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up);
  area.addEventListener('gesturestart', e => e.preventDefault());
  area.addEventListener('keydown', e => {
    const k = e.key, step = 48;
    if (k === '+' || k === '=') zoomAt(...zCenter(), Z.s * 1.5, true);
    else if (k === '-' || k === '_') zoomAt(...zCenter(), Z.s / 1.5, true);
    else if (k === '0') zReset();
    else if (k.startsWith('Arrow') && Z.s > 1.01) {
      Z.x += k === 'ArrowLeft' ? step : k === 'ArrowRight' ? -step : 0;
      Z.y += k === 'ArrowUp' ? step : k === 'ArrowDown' ? -step : 0;
      zApply(true);
    } else return;
    e.preventDefault();
  });
  $('#zIn').addEventListener('click', () => zoomAt(...zCenter(), Z.s * 1.5, true));
  $('#zOut').addEventListener('click', () => zoomAt(...zCenter(), Z.s / 1.5, true));
  $('#zReset').addEventListener('click', () => zReset());
  addEventListener('resize', () => zApply());
})();

/* ---------- personalizador ---------- */
let cur = null; // { p, cfg, qty, editIdx, fig, step, photo }

function openCustom(id, cfg, qty = 1, editIdx = null, photo = null, photoPos = null) {
  const p = productoDe(id); if (!p) return;
  cur = { p, cfg: normCfg(p, cfg ? clone(cfg) : defaults(p)), qty, editIdx, fig: 0, step: 0, photo, photoPos, showPhoto: false };
  cur.start = JSON.stringify([cur.cfg, qty]);
  $('#cCat').textContent = photo ? 'Inspirado en un pedido real' : catName(p.cat);
  $('#cTitle').textContent = p.name;
  $('#cDesc').textContent = p.desc;
  $('#cPreview').style.setProperty('--pv', p.render === 'frame' ? '#E9E1D6' : p.bg);
  const rb = $('#refBtn'); rb.hidden = !photo; rb.classList.remove('on');
  if (photo) { rb.querySelector('img').src = photo; rb.querySelector('img').style.objectPosition = photoPos || '50% 50%'; }
  $('#cBreak').hidden = true; $('#brkBtn').setAttribute('aria-expanded', 'false');
  lastPrice = null;
  buildForm(); update(true);
  openModal('#custom');
  requestAnimationFrame(() => { zReset(false); showTip(); });
  $('#cForm').scrollTop = 0;
}

const plus = n => n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '';
const multiTxt = n => n ? `${n} elegido${n > 1 ? 's' : ''}` : 'Puedes elegir varios';
const cntTxt = (len, g) => `${len}/${g.max}${g.price ? ' · ' + plus(g.price) : ''}`;

// sc = 'p' (producto) o 'f' (figura activa)
function groupHTML(g, cfg, sc) {
  if (!visible(g, cfg)) return '';
  const v = cfg[g.id];
  const a = `data-sc="${sc}" data-g="${g.id}"`;
  if (g.type === 'swatch' || g.type === 'choice') {
    const sel = g.options.find(o => o.v === v);
    const head = `<div class="grp-h"><span class="l">${g.label}</span><em>${sel ? sel.label : ''}</em></div>`;
    const body = g.type === 'swatch'
      ? `<div class="sw" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" title="${o.label}" aria-label="${o.label}" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" style="--c:${o.v === 'none' ? '#fff' : o.v}" class="${o.v === 'none' ? 'none' : ''}" ${a} data-v="${o.v}"></button>`).join('')}</div>`
      : `<div class="ch" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" ${a} data-v="${o.v}">${o.label}${o.price ? `<small>${plus(o.price)}</small>` : ''}</button>`).join('')}</div>`;
    return `<div class="grp">${head}${body}</div>`;
  }
  if (g.type === 'multi') {
    const on = v || [];
    return `<div class="grp"><div class="grp-h"><span class="l">${g.label}</span><em data-mc>${multiTxt(on.length)}</em></div>
      <div class="ch multi" role="group" aria-label="${g.label}">${g.options.map(o => `<button type="button" aria-pressed="${on.includes(o.v)}" ${a} data-m="${o.v}"><span class="tick" aria-hidden="true"></span>${o.label}${o.price ? `<small>${plus(o.price)}</small>` : ''}</button>`).join('')}</div></div>`;
  }
  const fid = `f_${sc}_${g.id}`;
  if (g.type === 'text' || g.type === 'textarea') {
    const cnt = cntTxt(String(v || '').length, g);
    const input = g.type === 'text'
      ? `<input type="text" id="${fid}" name="${sc}_${g.id}" ${a} data-t="1" maxlength="${g.max}" placeholder="${esc(g.placeholder || '')}" value="${esc(v)}" autocomplete="off" spellcheck="false" ${g.id === 'name' ? 'autocapitalize="words"' : ''} enterkeyhint="done">`
      : `<textarea id="${fid}" name="${sc}_${g.id}" ${a} data-t="1" maxlength="${g.max}" rows="3" autocomplete="off">${esc(v)}</textarea>`;
    const sug = g.suggest ? `<div class="sug" aria-label="Ideas de texto"><span>Ideas:</span>${g.suggest.map((t, i) => `<button type="button" ${a} data-sug="${i}">${esc(t.length > 34 ? t.slice(0, 32) + '…' : t)}</button>`).join('')}</div>` : '';
    return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em data-cnt="${fid}">${cnt}</em></div>${input}${sug}</div>`;
  }
  if (g.type === 'date') {
    return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em>${v ? fmtDate(v) : ''}</em></div>
      <input type="date" id="${fid}" name="${sc}_${g.id}" ${a} data-t="1" value="${esc(v)}" autocomplete="off"></div>`;
  }
  if (g.type === 'file') {
    return `<div class="grp"><div class="grp-h"><span class="l">${g.label}</span><em>${plus(g.price || 0)}</em></div>
      <label class="file">${v ? `<img class="thumb" src="${v}" alt="" width="44" height="44">` : '<span class="thumb"></span>'}<span>${v ? esc(cfg[g.id + 'Name'] || 'Imagen lista') + ' · cambiar' : 'Subir imagen (PNG/JPG)'}</span><input type="file" accept="image/*" ${a} data-file="1"></label>
      ${v ? `<button type="button" class="rm" ${a} data-clear="1" style="margin-top:8px">Quitar imagen</button>` : ''}</div>`;
  }
  if (g.type === 'stepper') {
    return `<div class="grp row"><div class="grp-h"><span class="l">${g.label}</span><em>${fmt(g.pricePer)} ${g.note}</em></div>
      <div class="step-n"><button type="button" ${a} data-d="-1" aria-label="Menos ${g.label.toLowerCase()}" ${v <= g.min ? 'disabled' : ''}>−</button><b aria-live="polite">${v}</b><button type="button" ${a} data-d="1" aria-label="Más ${g.label.toLowerCase()}" ${v >= g.max ? 'disabled' : ''}>+</button></div></div>`;
  }
  if (g.type === 'figs') {
    const i = Math.min(cur.fig, v.length - 1); cur.fig = i;
    const f = v[i];
    return `<div class="grp figs-grp"><div class="grp-h"><span class="l">${g.label} · ${fmt(g.pricePer)} c/u</span><em>${v.length} de ${g.max}</em></div>
      <div class="ftabs" role="tablist">${v.map((x, j) => `<button type="button" role="tab" aria-selected="${j === i}" aria-pressed="${j === i}" data-tab="${j}"><span class="av">${headSVG(x)}</span><span class="nm">${esc(String(x.name || '').trim() || 'Figura ' + (j + 1))}</span></button>`).join('')}
        ${v.length < g.max ? `<button type="button" class="add-fig" ${a} data-d="1" aria-label="Agregar figura"><span class="av">+</span><span class="nm">Agregar</span></button>` : ''}</div>
      <div class="figbox" role="tabpanel">
        <div class="looks"><span>Estilo rápido:</span>${LOOKS.map((l, j) => `<button type="button" data-look="${j}">${l.label}</button>`).join('')}</div>
        ${FIG_GROUPS.map(fg => groupHTML(fg, f, 'f')).join('')}
        ${v.length > g.min ? `<button type="button" class="rm del-fig" ${a} data-d="-1">Quitar ${esc(String(f.name || '').trim() || 'esta figura')}</button>` : ''}
      </div></div>`;
  }
  return '';
}

const qtyHTML = () => `<div class="grp row"><div class="grp-h"><span class="l">Cantidad</span><em>${CONFIG.bulkPct}% menos desde ${CONFIG.bulkMin}</em></div>
  <div class="step-n"><button type="button" data-qty="-1" aria-label="Menos" ${cur.qty <= 1 ? 'disabled' : ''}>−</button><b aria-live="polite">${cur.qty}</b><button type="button" data-qty="1" aria-label="Más">+</button></div></div>`;

const isLast = () => !cur.p.steps || cur.step === cur.p.steps.length - 1;

function buildForm(dir = 0) {
  const { p } = cur;
  const form = $('#cForm');
  let html;
  if (!p.steps) html = p.groups.map(g => groupHTML(g, cur.cfg, 'p')).join('') + qtyHTML();
  else {
    const s = cur.step;
    html = `<nav class="steps-nav" aria-label="Pasos"><span class="bar" style="--p:${(s + 1) / p.steps.length}"></span>${p.steps.map((t, i) => `<button type="button" data-step="${i}" ${i === s ? 'aria-current="step"' : ''} class="${i < s ? 'done' : ''}"><i>${i < s ? '✓' : i + 1}</i><span>${t}</span></button>`).join('')}</nav>`
      + `<div class="step-body">${p.groups.filter(g => (g.step || 0) === s).map(g => groupHTML(g, cur.cfg, 'p')).join('')}${isLast() ? qtyHTML() : ''}</div>`;
  }
  form.innerHTML = html;
  if (dir) {
    const b = form.querySelector('.step-body');
    b && b.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  updateCTA();
}

function updateCTA() {
  const label = $('#addLabel');
  if (!isLast()) label.textContent = `Siguiente: ${cur.p.steps[cur.step + 1]}`;
  else label.textContent = !CONFIG.ordersEnabled ? 'Pedir por WhatsApp' : cur.editIdx === null ? 'Agregar al pedido' : 'Guardar cambios';
  $('#addBtn').classList.toggle('is-next', !isLast());
}

const target = sc => sc === 'f' ? cur.cfg.figs[cur.fig] : cur.cfg;
const groupsOf = sc => sc === 'f' ? FIG_GROUPS : cur.p.groups;

let lastPrice = null, priceRAF = 0;
function animatePrice(to) {
  const el = $('#cTotal');
  if (lastPrice === null || lastPrice === to) { el.textContent = fmt(to); lastPrice = to; return; }
  const from = lastPrice, t0 = performance.now(), D = 380;
  cancelAnimationFrame(priceRAF);
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) priceRAF = requestAnimationFrame(step);
  };
  priceRAF = requestAnimationFrame(step);
  lastPrice = to;
}

let stageRAF = 0;
function update(first = false, quiet = false) {
  const { p, cfg, qty } = cur;
  cancelAnimationFrame(stageRAF);
  stageRAF = requestAnimationFrame(() => {
    const stage = $('#cStage');
    stage.innerHTML = cur.showPhoto ? `<img class="stage-photo" src="${cur.photo}" alt="Foto real del pedido" width="480" height="600" style="object-position:${cur.photoPos || '50% 50%'}">` : renderProduct(p, cfg);
    if (!first && !quiet) stage.firstElementChild?.animate([{ transform: 'scale(.985)', opacity: .7 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
  const { lines, unit } = priceOf(p, cfg);
  const t = lineTotal(unit, qty);
  animatePrice(t.total);
  $('#cBreak').innerHTML = `<ul>${lines.map(l => `<li><span>${esc(l.label)}</span><b>${l.price < 0 ? '−' + fmt(-l.price) : fmt(l.price)}</b></li>`).join('')}
    ${qty > 1 ? `<li><span>Cantidad</span><b>× ${qty}</b></li>` : ''}${t.disc ? `<li class="disc"><span>Descuento ${CONFIG.bulkPct}%</span><b>−${fmt(t.disc)}</b></li>` : ''}</ul>`;
}

$('#cForm')?.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab !== undefined) { cur.fig = +b.dataset.tab; buildForm(); return; }
  if (b.dataset.step !== undefined) { const n = +b.dataset.step, d = Math.sign(n - cur.step); cur.step = n; buildForm(d); $('#cForm').scrollTop = 0; return; }
  if (b.dataset.qty) { cur.qty = Math.max(1, Math.min(99, cur.qty + +b.dataset.qty)); buildForm(); update(false, true); return; }
  if (b.dataset.look !== undefined) {
    const f = cur.cfg.figs[cur.fig];
    Object.assign(f, clone(LOOKS[+b.dataset.look].f));
    buildForm(); update(); return;
  }
  const sc = b.dataset.sc, id = b.dataset.g; if (!sc) return;
  const obj = target(sc), g = groupsOf(sc).find(x => x.id === id);
  if (b.dataset.sug !== undefined) { obj[id] = g.suggest[+b.dataset.sug]; buildForm(); update(); return; }
  if (b.dataset.m !== undefined) {
    const arr = obj[id] = [...(obj[id] || [])], v = b.dataset.m, o = g.options.find(x => x.v === v);
    const i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else { arr.push(v); (o.excl || []).forEach(e => { const j = arr.indexOf(e); if (j >= 0) arr.splice(j, 1); }); }
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', arr.includes(x.dataset.m)));
    const em = b.closest('.grp').querySelector('[data-mc]'); if (em) em.textContent = multiTxt(arr.length);
    if (sc === 'f') { const av = document.querySelector(`[data-tab="${cur.fig}"] .av`); if (av) av.innerHTML = headSVG(obj); }
    update(); return;
  }
  if (b.dataset.v !== undefined) {
    if (obj[id] === b.dataset.v) return;
    obj[id] = b.dataset.v;
    // actualiza solo la selección para no perder scroll ni foco
    const wrapEl = b.parentElement;
    wrapEl.querySelectorAll('button').forEach(x => { const on = x === b; x.setAttribute('aria-pressed', on); x.setAttribute('aria-checked', on); });
    const em = b.closest('.grp').querySelector('.grp-h em'); if (em) em.textContent = g.options.find(o => o.v === b.dataset.v)?.label || '';
    // grupos condicionales o pestañas pueden cambiar: reconstruye si hace falta
    const needs = groupsOf(sc).some(x => x.showIf) || (sc === 'f' && (id === 'torso' || id === 'hair' || id === 'skin' || id === 'hairColor' || id === 'face'));
    if (needs) { const y = $('#cForm').scrollTop; buildForm(); $('#cForm').scrollTop = y; }
    update(); return;
  }
  if (b.dataset.clear) { obj[id] = ''; obj[id + 'Name'] = ''; }
  else if (b.dataset.d && g.type === 'figs') {
    const arr = obj[id];
    if (+b.dataset.d > 0 && arr.length < g.max) { arr.push(figDefault(arr.length)); cur.fig = arr.length - 1; }
    else if (+b.dataset.d < 0 && arr.length > g.min) {
      const at = cur.fig, [gone] = arr.splice(at, 1); cur.fig = Math.max(0, at - 1);
      toast(`Quitaste a ${String(gone.name || '').trim() || 'la figura ' + (at + 1)}`, { label: 'Deshacer', run: () => { arr.splice(at, 0, gone); cur.fig = at; buildForm(); update(); } });
    }
  } else if (b.dataset.d) obj[id] = Math.max(g.min, Math.min(g.max, obj[id] + Number(b.dataset.d)));
  const y = $('#cForm').scrollTop; buildForm(); $('#cForm').scrollTop = y; update();
});
$('#cForm')?.addEventListener('input', e => {
  const el = e.target; if (!el.dataset.t) return;
  const sc = el.dataset.sc, id = el.dataset.g, g = groupsOf(sc).find(x => x.id === id);
  target(sc)[id] = el.value;
  const cnt = document.querySelector(`[data-cnt="${el.id}"]`);
  if (cnt) cnt.textContent = cntTxt(el.value.length, g);
  if (g.type === 'date') { const em = el.closest('.grp').querySelector('em'); if (em) em.textContent = fmtDate(el.value); }
  // nombre de figura: refresca la pestaña sin perder el foco
  if (sc === 'f' && id === 'name') { const tab = document.querySelector(`[data-tab="${cur.fig}"] .nm`); if (tab) tab.textContent = el.value.trim() || 'Figura ' + (cur.fig + 1); }
  update(false, true);
});
$('#cForm')?.addEventListener('change', e => {
  const el = e.target; if (!el.dataset.file || !el.files[0]) return;
  const f = el.files[0], obj = target(el.dataset.sc), id = el.dataset.g;
  if (f.size > 8 * 1024 * 1024) return toast('Imagen muy pesada (máx. 8 MB)');
  shrinkImage(f, 900).then(url => { obj[id] = url; obj[id + 'Name'] = f.name; buildForm(); update(); });
});

// reduce la imagen para que el carrito (localStorage) no se llene
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

$('#brkBtn')?.addEventListener('click', () => {
  const b = $('#cBreak'), open = b.hidden;
  b.hidden = !open; $('#brkBtn').setAttribute('aria-expanded', open);
  if (open) b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
});
$('#refBtn')?.addEventListener('click', () => {
  cur.showPhoto = !cur.showPhoto;
  $('#refBtn').classList.toggle('on', cur.showPhoto);
  $('#refBtn span').textContent = cur.showPhoto ? 'Mi diseño' : 'Pedido real';
  zReset();
  $('#refBtn img').src = cur.showPhoto ? 'data:image/svg+xml,' + encodeURIComponent(renderProduct(cur.p, cur.cfg).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) : cur.photo;
  update();
});

$('#addBtn')?.addEventListener('click', () => {
  if (!isLast()) { cur.step++; buildForm(1); $('#cForm').scrollTop = 0; return; }
  if (!CONFIG.ordersEnabled) {
    window.open(waURL(waText(cur.p, cur.cfg, cur.qty)), '_blank', 'noopener');
    return;
  }
  const item = { id: cur.p.id, cfg: clone(cur.cfg), qty: cur.qty };
  cur.start = JSON.stringify([cur.cfg, cur.qty]);
  const isNew = cur.editIdx === null;
  if (isNew) cart.push(item); else cart[cur.editIdx] = item;
  flyToCart();
  saveCart(); closeModal('#custom');
  toast(isNew ? '¡Agregado a tu pedido! ✦' : 'Cambios guardados');
});

// la vista previa "vuela" al carrito flotante
function flyToCart() {
  const from = $('#cStage')?.getBoundingClientRect(), fab = $('#cartBtn');
  if (!from || !fab || REDUCED) { bumpCart(); return; }
  const to = fab.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  ghost.innerHTML = renderProduct(cur.p, cur.cfg);
  const size = Math.min(from.width, from.height) * .8;
  Object.assign(ghost.style, { width: size + 'px', height: size + 'px', left: (from.left + from.width / 2 - size / 2) + 'px', top: (from.top + from.height / 2 - size / 2) + 'px' });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px, ${dy * .3 - 60}px) scale(.45)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .4 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.75,0)' }).onfinish = () => { ghost.remove(); bumpCart(); };
}
function bumpCart() { const cb = $('#cartBtn'); if (!cb) return; cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); }

// en la landing no hay personalizador: se edita en el catálogo
function editItem(idx) {
  const i = cart[idx]; if (!i) return;
  if (!$('#custom')) { location.href = `catalogo.html?edit=${idx}`; return; }
  closeDrawer(); openCustom(i.id, i.cfg, i.qty, idx);
}

/* ---------- WhatsApp ---------- */
function waCartText() {
  const { rows, total } = cartTotals();
  return [`${HOLA} Quiero hacer este pedido:`, '',
    ...rows.flatMap((r, n) => [`*${n + 1}. ${r.p.name}* ×${r.i.qty} — ${fmt(r.total)}`, ...summary(r.p, r.i.cfg).map(([k, v]) => `• ${k}: ${v}`), '']),
    `Total estimado: *${fmt(total)}*`].join('\n');
}
const waURL = text => `https://wa.me/${CONFIG.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
function waText(p, cfg, qty) {
  const t = lineTotal(priceOf(p, cfg).unit, qty);
  const hasImg = p.groups.some(g => g.type === 'file' && cfg[g.id]);
  return [
    `${HOLA} Quiero este diseño:`, '',
    `*${p.name}* ×${qty}`,
    ...summary(p, cfg).map(([k, v]) => `• ${k}: ${v}`), '',
    `Total estimado: *${fmt(t.total)}*${t.disc ? ` (incluye ${CONFIG.bulkPct}% de descuento)` : ''}`,
    hasImg ? '(Te mando mi imagen por aquí)' : '',
  ].join('\n').trim();
}
document.querySelectorAll('.wa-link').forEach(el => { el.href = waURL(`${HOLA} Quiero cotizar un diseño.`); });

/* ---------- carrito ---------- */
let cart = [];
cart = (Array.isArray(leer(KEY_CART, [])) ? leer(KEY_CART, []) : []).filter(i => i && productoDe(i.id));
cart.forEach(i => normCfg(productoDe(i.id), i.cfg));
function saveCart() {
  guardar(KEY_CART, cart); // sin almacenamiento sigue en memoria
  const n = $('#cartCount'); if (n) n.textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function cartTotals() {
  let gross = 0, disc = 0;
  const rows = cart.map(i => {
    const p = productoDe(i.id);
    const { unit } = priceOf(p, i.cfg);
    const t = lineTotal(unit, i.qty);
    gross += t.gross; disc += t.disc;
    return { i, p, unit, ...t };
  });
  return { rows, gross, disc, total: gross - disc };
}

let view = 'cart';
function renderDrawer() {
  if (!CONFIG.ordersEnabled) {
    $('#dTitle').textContent = 'Pedidos en línea';
    $('#dBody').innerHTML = `<div class="empty locked-box"><div class="lock-ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H5v14h14V9h-2V6a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v3H9V6Z"/></svg></div><p><b>El carrito abre muy pronto.</b><br>Mientras tanto, personaliza tu diseño y mándalo por WhatsApp con un clic: te llega con todos los detalles y el precio.</p></div>`;
    $('#dFoot').innerHTML = `<a class="btn btn-dark" href="${waURL(`${HOLA} Quiero hacer un pedido.`)}" target="_blank" rel="noopener">Escribir por WhatsApp</a><p class="note">Pagos y carrito en línea: próximamente.</p>`;
    return;
  }
  const { rows, gross, disc, total } = cartTotals();
  if (!rows.length) {
    view = 'cart';
    $('#dBody').innerHTML = `<div class="empty">${minifigSVG({ ...FIG_PRESETS[5], face: 'guino', name: '' })}<p><b>Tu pedido está vacío.</b><br>Elige un producto y hazlo tuyo.</p></div>`;
    $('#dFoot').innerHTML = `<a href="catalogo.html" class="btn btn-dark">Ver catálogo</a>`;
    return;
  }
  if (view === 'checkout') return renderCheckout(total);
  $('#dBody').innerHTML = rows.map((r, idx) => `<div class="item" style="--i:${idx}">
    <div class="th" style="background:${r.p.render === 'frame' ? '#E9E1D6' : r.p.bg}">${renderProduct(r.p, r.i.cfg)}</div>
    <div><h4>${r.p.name}</h4><ul>${summary(r.p, r.i.cfg).slice(0, 5).map(([k, v]) => `<li>${esc(k)}: <b>${esc(String(v).slice(0, 60))}</b></li>`).join('')}</ul>
      <button class="rm" data-edit="${idx}">Editar</button> · <button class="rm" data-del="${idx}">Quitar</button></div>
    <div class="side"><div><b>${fmt(r.total)}</b><small>${r.i.qty} × ${fmt(r.unit)}</small>${r.disc ? `<small style="color:var(--green)">−${CONFIG.bulkPct}%</small>` : ''}</div></div>
  </div>`).join('');
  $('#dFoot').innerHTML = `<div class="tot"><span>Subtotal</span><span>${fmt(gross)}</span></div>
    ${disc ? `<div class="tot"><span>Descuento por volumen</span><span class="disc">−${fmt(disc)}</span></div>` : ''}
    <div class="tot"><span>Envío</span><span>Se cotiza al confirmar</span></div>
    <div class="tot big"><span>Total</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="goCheckout">Poner mis datos de envío →</button>
    <a class="btn btn-ghost wa-cart" href="${waURL(waCartText())}" target="_blank" rel="noopener">o pídelo por WhatsApp</a>
    <p class="note">No se cobra nada aún. Primero te enviamos tu diseño para aprobar.</p>`;
}

let checkoutAt = 0; // cuándo se mostró el formulario: el servidor rechaza envíos "instantáneos" de bots
function renderCheckout(total) {
  const d = leer(KEY_CONTACT, {});
  checkoutAt = performance.now();
  $('#dBody').innerHTML = `<button class="back" id="backCart">← Volver al pedido</button>
    <form class="co" id="coForm" novalidate>
      <label>Nombre completo<input name="name" autocomplete="name" required value="${esc(d.name)}"></label>
      <div class="row2">
        <label>WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="8 dígitos, ej. 9876 5432…" value="${esc(d.phone)}"></label>
        <label>Correo<input name="email" type="email" inputmode="email" autocomplete="email" required value="${esc(d.email)}"></label>
      </div>
      <div class="row2">
        <label>Ciudad<input name="city" autocomplete="address-level2" required value="${esc(d.city)}"></label>
        <label>¿Para cuándo?<input name="date" type="date"></label>
      </div>
      <label>Notas para el diseño<textarea name="notes" placeholder="Ej. él usa lentes redondos, ella tiene fleco…"></textarea></label>
      <label class="chk"><input type="checkbox" name="remember" ${leer(KEY_CONSENT, '') !== 'minimo' ? 'checked' : ''}> Recordar mis datos y mis pedidos en este dispositivo</label>
      <label class="chk"><input type="checkbox" name="consent" required> Acepto el <a href="privacidad.html" target="_blank" rel="noopener">aviso de privacidad</a>: usan mis datos solo para hacer, enviar y darle seguimiento a mi pedido.</label>
      <label class="hp" aria-hidden="true">No llenar<input name="website" tabindex="-1" autocomplete="off"></label>
      <div class="err" id="coErr" role="alert"></div>
    </form>`;
  $('#dFoot').innerHTML = `<div class="tot big"><span>Total estimado</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="sendOrder">Enviar pedido ✦</button>
    <p class="note">Te confirmamos por correo y te escribimos por WhatsApp con tu diseño.</p>`;
}

$('#drawer')?.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.del !== undefined) {
    const row = t.closest('.item');
    const idx = +t.dataset.del;
    const go = () => {
      const [gone] = cart.splice(idx, 1); saveCart(); renderDrawer();
      toast('Quitado de tu pedido', { label: 'Deshacer', run: () => { cart.splice(idx, 0, gone); saveCart(); renderDrawer(); } });
    };
    if (!row) go(); else row.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 200, easing: 'ease-in' }).onfinish = go;
  }
  else if (t.dataset.edit !== undefined) { editItem(+t.dataset.edit); }
  else if (t.id === 'goCheckout') { view = 'checkout'; renderDrawer(); }
  else if (t.id === 'backCart') { view = 'cart'; renderDrawer(); }
  else if (t.id === 'sendOrder') handleSend(t);
});
$('#drawer')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('#coForm input')) { e.preventDefault(); $('#sendOrder')?.click(); }
});

async function handleSend(btn) {
  const f = $('#coForm'), err = $('#coErr');
  const data = Object.fromEntries(new FormData(f));
  const checks = {
    name: v => v.trim() ? '' : 'Escribe tu nombre.',
    phone: v => v.replace(/\D/g, '').replace(/^504/, '').length >= 8 ? '' : 'Escribe tu WhatsApp de 8 dígitos, ej. 9876 5432.',
    email: v => /^\S+@\S+\.\S+$/.test(v) ? '' : 'Revisa tu correo, ej. ana@correo.com.',
    city: v => v.trim() ? '' : 'Escribe tu ciudad.',
    consent: v => v ? '' : 'Necesitamos tu permiso para usar tus datos en el pedido.',
  };
  let first = null;
  Object.entries(checks).forEach(([k, fn]) => {
    const el = f.elements[k], msg = fn(String(data[k] || '')), id = 'e_' + k;
    let m = document.getElementById(id);
    if (!m) { m = document.createElement('span'); m.id = id; m.className = 'f-err'; (el.type === 'checkbox' ? el.parentElement : el).after(m); el.setAttribute('aria-describedby', id); }
    m.textContent = msg; el.setAttribute('aria-invalid', !!msg);
    if (msg && !first) first = el;
  });
  if (first) { err.textContent = 'Revisa los campos marcados.'; first.focus(); return; }
  err.textContent = '';
  // solo se recuerdan si la persona lo pidió; si no, se borra lo que hubiera
  if (data.remember) guardar(KEY_CONTACT, { name: data.name, phone: data.phone, email: data.email, city: data.city }); else borrar(KEY_CONTACT);

  const { rows, gross, disc, total } = cartTotals();
  btn.disabled = true; btn.textContent = 'Preparando tu diseño…';
  const previews = await Promise.all(rows.map(r => previewImage(r.p, r.i.cfg).catch(() => '')));
  const { website, remember, consent, ...customer } = data;
  const order = {
    customer, website: website || '', fillMs: Math.round(performance.now() - checkoutAt),
    currency: CONFIG.currency,
    items: rows.map((r, i) => ({
      product: r.p.name, qty: r.i.qty, unitPrice: r.unit, discount: r.disc, total: r.total,
      options: summary(r.p, r.i.cfg),
      images: r.p.groups.filter(g => g.type === 'file' && r.i.cfg[g.id]).map(g => r.i.cfg[g.id]),
      preview: previews[i],
      bom: bomOf(r.p, r.i.cfg, r.i.qty),
    })),
    subtotal: gross, discount: disc, total,
  };

  btn.textContent = 'Enviando…';
  try {
    const res = await api('pedido', order);
    const id = res.id || '';
    if (id && data.remember) guardar(KEY_ORDERS, [{ id, phone: data.phone, fecha: new Date().toISOString().slice(0, 10) }, ...leer(KEY_ORDERS, []).filter(o => o.id !== id)].slice(0, 20));
    cart = []; saveCart(); view = 'cart'; closeDrawer();
    $('#doneTxt').innerHTML = `${id ? `Tu número de pedido es <b>${esc(id)}</b>.<br>` : ''}Total estimado <b>${fmt(total)}</b>.<br>Te escribimos a <b>${esc(data.phone)}</b> con tu diseño para aprobar.${id ? `<br><a href="pedido.html?id=${encodeURIComponent(id)}">Ver mi pedido y pagar el anticipo →</a>` : ''}`;
    openModal('#done');
  } catch (e) {
    $('#coErr').innerHTML = `No se pudo enviar (${esc(e.message || 'sin conexión')}). Intenta de nuevo o <a href="${waURL(waCartText())}" target="_blank" rel="noopener">mándalo por WhatsApp</a>.`;
  } finally { btn.disabled = false; btn.textContent = 'Enviar pedido ✦'; }
}

/* ===== ENVÍO DEL PEDIDO A GOOGLE SHEETS =====
   Apps Script (carpeta apps-script/) guarda el pedido, la foto del diseño
   y descuenta inventario según la hoja Recetas. */

// claves de consumo: la hoja Recetas dice qué pieza gasta cada una
function bomOf(p, cfg, qty) {
  const out = [], clean = s => String(s).replace(/ /g, ' ').trim();
  const add = (key, n = 1) => out.push({ key: clean(key), qty: n * qty });
  const lab = (groups, id, v) => { const g = groups.find(x => x.id === id); return g?.options ? optLabel(g, v) : v; };
  const skip = l => /^(Ninguno|Ninguna|Sin corazón)$/i.test(l);
  const figKeys = (f0, base) => {
    const f = normFig({ ...f0, extras: [...(f0.extras || [])] }), L = (id, v) => lab(FIG_GROUPS, id, v);
    add('Figura · Cuerpo');
    add(`Figura · Cabeza · ${L('skin', f.skin)}`);
    if (f.hair !== 'calvo') add(`Figura · Cabello · ${L('hair', f.hair)} · ${L('hairColor', f.hairColor)}`);
    if (f.outfit === 'vestido') add(`Figura · Vestido · ${L('torso', f.torso)}`);
    else { add(`Figura · Torso · ${L('outfit', f.outfit)} · ${L('torso', f.torso)}`); if (f.legs) add(`Figura · Piernas · ${L('legs', f.legs)}`); }
    if (f.hat && f.hat !== 'ninguno') add(`Figura · Sombrero · ${L('hat', f.hat)}`);
    f.extras.forEach(x => add(`Figura · Detalle · ${L('extras', x) || x}`));
    if (base) add('Figura · Base acrílica');
  };
  const figLike = p.groups.some(g => g.id === 'extras');
  const figIds = new Set(FIG_GROUPS.map(g => g.id));
  const combo = new Set((p.stockKeys || []).flat());
  add(p.name);
  p.groups.forEach(g => {
    if (!visible(g, cfg) || (figLike && figIds.has(g.id))) return;
    const v = cfg[g.id];
    if (g.type === 'figs') v.forEach(f => figKeys(f, true));
    else if (g.type === 'stepper') { if (v) add(`${p.name} · ${g.label}`, v); }
    else if (g.type === 'multi') (v || []).forEach(x => add(`${p.name} · ${g.label} · ${lab(p.groups, g.id, x)}`));
    else if ((g.type === 'choice' || g.type === 'swatch') && !combo.has(g.id) && !g.noStock && !['font', 'tpl'].includes(g.id) && !skip(lab(p.groups, g.id, v))) add(`${p.name} · ${g.label} · ${lab(p.groups, g.id, v)}`);
  });
  (p.stockKeys || []).forEach(ids => add(`${p.name} · ` + ids.map(id => { const g = p.groups.find(x => x.id === id); return `${g.label} ${lab(p.groups, id, cfg[id])}`; }).join(' · ')));
  if (figLike) figKeys(cfg, p.id !== 'llavero');
  return out;
}

// fuentes incrustadas para que la foto del diseño salga con las mismas letras
const SVG_FONTS = ['Playfair Display:ital,wght@0,500;0,700', 'Great Vibes', 'Bagel Fat One', 'Pacifico', 'Space Mono:wght@700', 'Alfa Slab One', 'Inter:wght@500;700'];
let fontCSS = null;
function embeddedFonts() {
  if (fontCSS) return fontCSS;
  const url = 'https://fonts.googleapis.com/css2?' + SVG_FONTS.map(f => 'family=' + f.replace(/ /g, '+')).join('&') + '&display=swap';
  const toData = u => fetch(u).then(r => r.blob()).then(b => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b); }));
  const work = fetch(url).then(r => r.text()).then(async css => {
    const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter(b => /\/\*\s*latin\s*\*\//.test(b));
    const out = await Promise.all(blocks.map(async b => {
      const m = b.match(/url\((https:[^)]+)\)/);
      return m ? b.replace(m[1], await toData(m[1])) : b;
    }));
    return out.join('\n');
  });
  const timeout = new Promise(ok => setTimeout(() => ok(''), 5000));
  fontCSS = Promise.race([work, timeout]).catch(() => '');
  return fontCSS;
}

// foto JPG del diseño tal como lo ve el cliente
async function previewImage(p, cfg, size = 900) {
  let svg = renderProduct(p, cfg);
  const fonts = await embeddedFonts();
  if (fonts) svg = svg.replace(/<svg([^>]*)>/, `<svg$1><style>${fonts}</style>`);
  const vb = (svg.match(/viewBox="([\d.\s-]+)"/) || [, '0 0 300 300'])[1].split(/\s+/).map(Number);
  const k = size / Math.max(vb[2], vb[3]), w = Math.round(vb[2] * k), h = Math.round(vb[3] * k);
  svg = svg.replace(/<svg /, `<svg width="${w}" height="${h}" `);
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

// Única puerta hacia Google Sheets (apps-script/Orders.gs › doPost). accion: 'pedido' | 'seguimiento' | 'comprobante'.
// Se manda como texto plano: así el navegador no hace la consulta previa (CORS) que Apps Script no contesta.
async function api(accion, data) {
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

/* ---------- cambios sin guardar ---------- */
const dirty = () => cur && JSON.stringify([cur.cfg, cur.qty]) !== cur.start;
function tryCloseCustom() {
  if (!dirty() || !$('#leave')) return closeModal('#custom');
  const l = $('#leave'); l.hidden = false; l.querySelector('[data-stay]').focus();
}
addEventListener('beforeunload', e => { if ($('#custom')?.classList.contains('open') && dirty()) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- modales (entrada y salida animadas) ---------- */
let lastFocus = null;
// solo el modal abierto es usable; lo demás queda inerte para teclado y lectores de pantalla
function syncInert() {
  const top = [...document.querySelectorAll('.modal.open:not(.closing),.drawer.open:not(.closing)')].pop();
  [...document.body.children].forEach(el => { if (el.tagName !== 'SCRIPT') el.inert = !!top && el !== top && !el.classList.contains('toast'); });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const top = [...document.querySelectorAll('.modal.open,.drawer.open')].pop(); if (!top) return;
  const f = [...top.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});
function openModal(s) {
  const m = $(s); if (!m || m.classList.contains('open')) return;
  lastFocus = document.activeElement;
  m.classList.remove('closing'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; syncInert();
  setTimeout(() => (m.querySelector('.sheet,.d-panel,.done-card') || m).focus?.({ preventScroll: true }), 50);
}
function closeModal(s) {
  const m = $(s); if (!m || !m.classList.contains('open')) return;
  const done = () => {
    m.classList.remove('open', 'closing'); m.setAttribute('aria-hidden', 'true');
    syncInert();
    if (!document.querySelector('.modal.open,.drawer.open')) { document.body.style.overflow = ''; lastFocus?.focus?.({ preventScroll: true }); }
  };
  m.classList.add('closing'); syncInert();
  setTimeout(done, 200);
}
function openDrawer() { renderDrawer(); openModal('#drawer'); }
function closeDrawer() { closeModal('#drawer'); }

document.addEventListener('click', e => {
  const c = e.target.closest('[data-card]');
  if (c) { openCard(+c.dataset.card); return; }
  if (e.target.closest('[data-close]')) tryCloseCustom();
  if (e.target.closest('[data-stay]')) $('#leave').hidden = true;
  if (e.target.closest('[data-leave]')) { $('#leave').hidden = true; closeModal('#custom'); }
  if (e.target.closest('[data-dclose]')) closeDrawer();
  if (e.target.closest('[data-xdone]')) closeModal('#done');
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[data-card]')) { e.preventDefault(); openCard(+e.target.dataset.card); }
  if (e.key !== 'Escape') return;
  if ($('#leave') && !$('#leave').hidden) { $('#leave').hidden = true; return; }
  if ($('#done')?.classList.contains('open')) closeModal('#done');
  if ($('#custom')?.classList.contains('open')) tryCloseCustom();
  if ($('#drawer')?.classList.contains('open')) closeDrawer();
});
$('#cartBtn')?.addEventListener('click', openDrawer);

// fotos reales: solo se ofrecen si el archivo existe
const photoOK = {};
CARDS.forEach(c => {
  if (!c.photo || c.photo in photoOK) return;
  photoOK[c.photo] = null;
  const im = new Image();
  im.onload = () => { photoOK[c.photo] = true; };
  im.onerror = () => { photoOK[c.photo] = false; };
  im.src = c.photo;
});
function openCard(ci) {
  const card = CARDS[ci]; if (!card) return;
  openCustom(card.id, cardCfg(card), 1, null, card.photo && photoOK[card.photo] !== false ? card.photo : null, card.photoPos);
}

let toastT;
function toast(msg, action) {
  const t = $('#toast'); if (!t) return;
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('.toast-act').onclick = () => { action.run(); t.classList.remove('show'); };
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), action ? 6000 : 2600);
}

/* ---------- hero: cuadros que se van cruzando ---------- */
const HERO = PORTADA.hero.map(i => CARDS[i].cfg);
const PAUSE_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const PLAY_ICO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>';
let heroI = 0;
function hero(animate = true) {
  const box = $('#heroFig'); if (!box) return;
  const layer = document.createElement('div');
  layer.className = 'hero-layer';
  layer.innerHTML = frameSVG({ ...defaults(PRODUCTS[0]), ...clone(HERO[heroI % HERO.length]) });
  box.appendChild(layer);
  const old = [...box.children].slice(0, -1);
  if (!animate) { old.forEach(o => o.remove()); return; }
  layer.animate(REDUCED ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(14px) rotate(-1.5deg) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
  old.forEach(o => o.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(.98)' }], { duration: 450, easing: 'ease-in', fill: 'forwards' }).onfinish = () => o.remove());
}
if ($('#heroFig')) {
  hero(false);
  const next = () => { heroI++; hero(); };
  let paused = REDUCED, hover = false;
  const pb = $('#heroPause');
  const setP = v => { paused = v; pb.setAttribute('aria-pressed', v); pb.setAttribute('aria-label', v ? 'Reanudar cambio automático' : 'Pausar cambio automático'); pb.innerHTML = v ? PLAY_ICO : PAUSE_ICO; };
  setP(paused);
  setInterval(() => { if (!paused && !hover && !document.hidden) next(); }, 5000);
  $('#shuffle').addEventListener('click', next);
  pb.addEventListener('click', () => setP(!paused));
  const art = $('.hero-art');
  art.addEventListener('pointerenter', () => { hover = true; }); art.addEventListener('pointerleave', () => { hover = false; });
  art.addEventListener('focusin', () => { hover = true; }); art.addEventListener('focusout', () => { hover = false; });
}

// huecos de fotos reales: si no existe el archivo se muestra el aviso
document.querySelectorAll('img[data-ph]').forEach(img => {
  const fail = () => {
    const f = img.closest('.ph'); f.classList.add('missing');
    f.insertAdjacentHTML('afterbegin', `<div class="ph-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><b>Foto real aquí</b><small>fotos/${img.dataset.ph}</small></div>`);
    img.remove();
  };
  if (img.complete && !img.naturalWidth) fail(); else img.addEventListener('error', fail);
});

// blog: ilustraciones mientras no hay fotos
const MINIS = PORTADA.blog.map(i => CARDS[i].cfg);
document.querySelectorAll('[data-mini]').forEach(el => { el.innerHTML = frameSVG({ ...defaults(PRODUCTS[0]), ...clone(MINIS[+el.dataset.mini]) }); });

if ($('#featured')) $('#featured').innerHTML = PORTADA.destacados.map(i => cardHTML(CARDS[i], i, `catalogo.html?card=${i}`)).join('');
if ($('#cats')) $('#cats').innerHTML = CAT_TILES.map(t => {
  const n = CARDS.filter(c => productoDe(c.id).cat === t.cat).length;
  const p = t.product && productoDe(t.product);
  const art = t.photo ? `<img src="${t.photo}" alt="" width="480" height="600" loading="lazy" decoding="async">` : renderProduct(p, defaults(p));
  return `<a class="cat-tile" href="catalogo.html?cat=${t.cat}" style="--tint:${t.tint}"><div class="cat-art">${art}</div>
    <div class="cat-label"><div><h3>${catName(t.cat)}</h3><small>${t.note} · ${n} diseño${n > 1 ? 's' : ''}</small></div><span class="cat-go">${ARROW}</span></div></a>`;
}).join('');
$('#howFig')?.insertAdjacentHTML('afterbegin', frameSVG(cardCfg(CARDS[0])));

// menú móvil
$('#menuBtn')?.addEventListener('click', () => {
  const m = $('#mNav'), open = !m.classList.contains('open');
  m.classList.toggle('open', open); $('#menuBtn').setAttribute('aria-expanded', open);
});
document.querySelectorAll('#mNav a').forEach(l => l.addEventListener('click', () => { $('#mNav').classList.remove('open'); $('#menuBtn')?.setAttribute('aria-expanded', 'false'); }));

/* ---------- movimiento y navegación ---------- */
const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
function reveal(fresh = false) {
  if (!io) return;
  document.querySelectorAll('.sec-head,.how,.cat-tile,.card,.ph,.rev,.post,.faq details,.cta-band,.trust-item,.story-in>*').forEach(el => {
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 6);
    if (fresh) requestAnimationFrame(() => el.classList.add('in')); else io.observe(el);
  });
}
reveal();

const nav = $('.nav');
const spy = [...document.querySelectorAll('.links a[href^="#"]')].map(a => [a, document.querySelector(a.getAttribute('href'))]).filter(x => x[1]);
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', scrollY > 8);
    let curA = null;
    spy.forEach(([a, sec]) => { if (sec.getBoundingClientRect().top < innerHeight * .4) curA = a; });
    spy.forEach(([a]) => a.classList.toggle('active', a === curA));
    ticking = false;
  });
}, { passive: true });

/* ---------- Rastrear pedido (pedido.html) ----------
   Pide número + WhatsApp, muestra estado y montos, y recibe el comprobante del anticipo.
   El servidor (apps-script/Pagos.gs) valida que el WhatsApp sea el del pedido y lee el monto del comprobante. */
// mismo orden que ESTADOS en apps-script/Config.gs
const PASOS = ['Nuevo', 'Diseño enviado', 'Aprobado', 'En producción', 'Listo', 'Enviado', 'Entregado'];
const PASO_TXT = { 'Nuevo': 'Recibido', 'Diseño enviado': 'Diseño enviado', 'Aprobado': 'Aprobado', 'En producción': 'En producción', 'Listo': 'Listo', 'Enviado': 'En camino', 'Entregado': 'Entregado' };
let seguido = null; // { id, phone } del pedido que se está viendo

function pintarPedido(p) {
  const i = PASOS.indexOf(p.estado), money = n => fmt(n);
  const cancel = p.estado === 'Cancelado';
  const pasos = cancel ? '<p class="note">Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.</p>'
    : `<ol class="pasos">${PASOS.map((s, j) => `<li class="${j < i ? 'hecho' : j === i ? 'ahora' : ''}"${j === i ? ' aria-current="step"' : ''}><i aria-hidden="true">${j < i ? '✓' : j + 1}</i><span>${PASO_TXT[s]}</span></li>`).join('')}</ol>`;
  const falta = p.porPagarAnticipo > 0, debe = p.saldo > 0;
  $('#estadoPedido').innerHTML = `<article class="ped-card">
    <header><p class="card-cat">Pedido</p><h2>${esc(p.id)}</h2>${p.fecha ? `<small>Hecho el ${esc(fmtDate(p.fecha))}</small>` : ''}</header>
    ${pasos}
    <div class="ped-prod"><b>Productos</b><p>${esc(p.productos).replace(/\n/g, '<br>')}</p></div>
    <dl class="ped-montos">
      <div><dt>Total</dt><dd>${money(p.total)}</dd></div>
      <div><dt>Anticipo (${p.pct}%)</dt><dd>${money(p.anticipo)}</dd></div>
      <div><dt>Pagado</dt><dd class="${p.pagado ? 'ok' : ''}">${money(p.pagado)}</dd></div>
      <div><dt>Saldo</dt><dd>${money(p.saldo)}</dd></div>
    </dl>
    ${p.comprobantes.length ? `<p class="note">Comprobantes recibidos: ${p.comprobantes.map(c => `${c.monto ? money(c.monto) : 'monto por revisar'} (${esc(/Coincide|Confirmado/.test(c.resultado) ? 'confirmado' : c.resultado === 'Rechazado' ? 'no válido' : 'en revisión')})`).join(' · ')}</p>` : ''}
    ${!cancel && debe ? `<div class="pago">
      <h3>${falta ? `Paga tu anticipo de ${money(p.porPagarAnticipo)} para empezar` : `Saldo pendiente: ${money(p.saldo)}`}</h3>
      ${p.banco ? `<p class="banco">${esc(p.banco)}</p>` : '<p class="note">Te mandamos los datos de pago por WhatsApp.</p>'}
      <label class="drop" id="drop"><input type="file" id="voucher" accept="image/jpeg,image/png,image/webp,application/pdf"><span class="drop-ico" aria-hidden="true">⇪</span><span id="dropTxt"><b>Sube la foto o PDF de tu comprobante</b><small>JPG, PNG o PDF · máx. 5 MB</small></span></label>
      <button class="btn btn-dark" id="sendVoucher" disabled>Enviar comprobante</button>
      <div class="err" id="voucherErr" role="alert"></div>
    </div>` : !cancel ? '<p class="note ok">¡Pedido pagado por completo! Gracias.</p>' : ''}
  </article>`;
}

let voucherData = '';
async function leerVoucher(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('El archivo pesa más de 5 MB.');
  if (file.type === 'application/pdf') return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); });
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Sube una foto (JPG o PNG) o un PDF.');
  return shrinkImage(file, 1800); // legible para leer el monto, liviana para enviar
}

if ($('#seguir')) {
  const f = $('#seguir'), q = new URLSearchParams(location.search);
  const mis = leer(KEY_ORDERS, []);
  if (q.get('id')) f.elements.id.value = q.get('id');
  const conocido = mis.find(o => o.id === f.elements.id.value);
  if (conocido) f.elements.phone.value = conocido.phone;
  if (mis.length) {
    $('#misPedidos').hidden = false;
    $('#misPedidos').innerHTML = `<b>Tus pedidos en este dispositivo</b>${mis.map(o => `<button type="button" class="chip" data-mio="${esc(o.id)}">${esc(o.id)}<small>${esc(o.fecha || '')}</small></button>`).join('')}`;
  }
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const id = f.elements.id.value.trim().toUpperCase(), phone = f.elements.phone.value.trim(), err = $('#seguirErr');
    if (!/^PEHN-[\w-]{3,24}$/.test(id)) { err.textContent = 'El número de pedido empieza con PEHN-, ej. PEHN-261027-001.'; f.elements.id.focus(); return; }
    if (phone.replace(/\D/g, '').length < 8) { err.textContent = 'Escribe el WhatsApp con el que hiciste el pedido.'; f.elements.phone.focus(); return; }
    err.textContent = ''; $('#seguirBtn').disabled = true; $('#seguirBtn').textContent = 'Buscando…';
    try {
      const r = await api('seguimiento', { id, phone });
      seguido = { id, phone }; pintarPedido(r.pedido);
      $('#estadoPedido').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    } catch (x) { err.textContent = x.message; $('#estadoPedido').innerHTML = ''; }
    finally { $('#seguirBtn').disabled = false; $('#seguirBtn').textContent = 'Ver mi pedido'; }
  });
  $('#misPedidos').addEventListener('click', e => {
    const b = e.target.closest('[data-mio]'); if (!b) return;
    const o = mis.find(x => x.id === b.dataset.mio); f.elements.id.value = o.id; f.elements.phone.value = o.phone; f.requestSubmit();
  });
  $('#estadoPedido').addEventListener('change', async e => {
    if (e.target.id !== 'voucher' || !e.target.files[0]) return;
    const file = e.target.files[0], err = $('#voucherErr');
    try {
      voucherData = await leerVoucher(file); err.textContent = '';
      $('#dropTxt').innerHTML = `<b>${esc(file.name)}</b><small>Listo para enviar · toca para cambiar</small>`;
      $('#drop').classList.add('lleno'); $('#sendVoucher').disabled = false;
    } catch (x) { voucherData = ''; err.textContent = x.message; $('#sendVoucher').disabled = true; }
  });
  $('#estadoPedido').addEventListener('click', async e => {
    if (e.target.id !== 'sendVoucher' || !voucherData || !seguido) return;
    const btn = e.target, err = $('#voucherErr');
    btn.disabled = true; btn.textContent = 'Enviando y leyendo el monto…';
    try {
      const { pago } = await api('comprobante', { ...seguido, file: voucherData });
      voucherData = '';
      toast(pago.resultado === 'Coincide' ? `¡Listo! Recibimos ${fmt(pago.monto)}.` : 'Recibimos tu comprobante. Lo revisamos y te confirmamos por WhatsApp.');
      f.requestSubmit();
    } catch (x) { err.textContent = `No se pudo enviar: ${x.message}.`; btn.disabled = false; btn.textContent = 'Enviar comprobante'; }
  });
  if (f.elements.id.value && f.elements.phone.value) f.requestSubmit();
}

/* ---------- aviso de privacidad (abajo, una sola vez) ----------
   "Entendido": se recuerdan datos y pedidos si la persona lo marca al pedir.
   "Solo el carrito": se borra lo guardado y la casilla "Recordar" sale desmarcada. */
function aviso(mostrar) { const a = $('#aviso'); if (a) a.hidden = !mostrar; }
if (!leer(KEY_CONSENT, '')) aviso(true);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-aviso],[data-aviso-abrir]'); if (!b) return;
  if (b.dataset.avisoAbrir !== undefined) return aviso(true);
  guardar(KEY_CONSENT, b.dataset.aviso);
  if (b.dataset.aviso === 'minimo') { borrar(KEY_CONTACT); borrar(KEY_ORDERS); toast('Listo: solo guardamos tu carrito.'); }
  aviso(false);
});

$('#borrarDatos')?.addEventListener('click', () => {
  [KEY_CART, KEY_CONTACT, KEY_ORDERS, KEY_CONSENT].forEach(borrar); cart = []; saveCart();
  try { sessionStorage.clear(); } catch { }
  toast('Listo: borramos todo lo que este sitio guardó en tu navegador.');
});

// Revisa datos.js al cargar y avisa en la consola (F12) con "[Pehn]" lo que esté mal y cómo arreglarlo.
function revisarDatos() {
  const avisa = m => console.warn('[Pehn] ' + m);
  CARDS.forEach((c, i) => { if (!productoDe(c.id)) avisa(`CARDS[${i}] usa el producto "${c.id}", que no existe en PRODUCTS (datos.js).`); });
  PRODUCTS.forEach(p => { if (!RENDER[p.render]) avisa(`El producto "${p.id}" usa render: '${p.render}', que no existe en RENDER (dibujos.js).`); });
  Object.entries(PORTADA).forEach(([k, l]) => l.forEach(i => { if (!CARDS[i]?.cfg || CARDS[i].id !== 'cuadro') avisa(`PORTADA.${k} usa la tarjeta ${i}, que no es un cuadro con cfg. Ajusta los números en datos.js.`); }));
  if (!CONFIG.whatsapp) avisa('Falta CONFIG.whatsapp en datos.js: los botones de WhatsApp no llevan número.');
  if (!CONFIG.sheetsUrl) avisa('Falta CONFIG.sheetsUrl en datos.js: los pedidos no se guardan en Google Sheets.');
}
revisarDatos();

if (!CONFIG.ordersEnabled) document.body.classList.add('locked');
$('#yr').textContent = new Date().getFullYear();
if ($('#grid')) {
  const q = new URLSearchParams(location.search);
  if (CATS.some(c => c[0] === q.get('cat'))) state.cat = q.get('cat');
  if (q.get('q')) { state.q = q.get('q'); $('#q').value = state.q; $('#qClear').hidden = false; }
  if (['asc', 'desc', 'name'].includes(q.get('sort'))) { state.sort = q.get('sort'); $('#sort').value = state.sort; }
  renderFilters(); renderGrid();
  if (q.has('card')) openCard(+q.get('card'));
  else if (q.has('edit')) editItem(+q.get('edit'));
}
saveCart();
