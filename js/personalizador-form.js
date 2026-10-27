/* Pehn Design — PERSONALIZADOR · FORMULARIO: el HTML de cada grupo de opciones, los pasos y el botón principal.
   Funciones que solo leen App.cur y regresan HTML (no escuchan eventos). Depende de: base.js, producto.js,
   datos.js (FIG_GROUPS, LOOKS, varDisp), dibujos.js (headSVG). Lo usan: personalizador-movil.js (que también dibuja el formulario) y -eventos.js. */

const plus = n => n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '';
const multiTxt = n => n ? `${n} elegido${n > 1 ? 's' : ''}` : 'Puedes elegir varios';
const cntTxt = (len, g) => `${len}/${g.max}${g.price ? ' · ' + plus(g.price) : ''}`;
const isLast = () => !App.cur.p.steps || App.cur.step === App.cur.p.steps.length - 1;
const dirty = () => App.cur && JSON.stringify([App.cur.cfg, App.cur.qty]) !== App.cur.start;
// sc = 'p' (producto) o 'f' (figura activa)
const target = sc => sc === 'f' ? App.cur.cfg.figs[App.cur.fig] : App.cur.cfg;
const groupsOf = sc => sc === 'f' ? FIG_GROUPS : App.cur.p.groups;

// ---------- un grupo de opciones, según su tipo ----------
const grpHead = (label, em) => `<div class="grp-h"><span class="l">${label}</span><em>${em}</em></div>`;
const attrsDe = (sc, g) => `data-sc="${sc}" data-g="${g.id}"`;
const precioChip = o => o.price ? `<small>${plus(o.price)}</small>` : '';

// colores (swatch) y opciones únicas (choice)
function opcionesHTML(g, cfg, sc) {
  const v = cfg[g.id], a = attrsDe(sc, g), { p } = App.cur;
  const sel = g.options.find(o => o.v === v);
  const off = o => (sc === 'p' && p.variants && !varDisp(p, g.id, o.v, cfg) ? ' disabled' : '');
  const body = g.type === 'swatch'
    ? `<div class="sw" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" title="${o.label}" aria-label="${o.label}" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" style="--c:${o.v === 'none' ? '#fff' : o.v}" class="${o.v === 'none' ? 'none' : ''}" ${a} data-v="${o.v}"${off(o)}></button>`).join('')}</div>`
    : `<div class="ch" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" ${a} data-v="${o.v}"${off(o)}>${o.label}${precioChip(o)}</button>`).join('')}</div>`;
  return `<div class="grp"><div class="grp-h"><span class="l">${g.label}</span><em>${sel ? sel.label : ''}</em></div>${body}</div>`;
}
function multiHTML(g, cfg, sc) {
  const on = cfg[g.id] || [], a = attrsDe(sc, g);
  return `<div class="grp"><div class="grp-h"><span class="l">${g.label}</span><em data-mc>${multiTxt(on.length)}</em></div>
      <div class="ch multi" role="group" aria-label="${g.label}">${g.options.map(o => `<button type="button" aria-pressed="${on.includes(o.v)}" ${a} data-m="${o.v}"><span class="tick" aria-hidden="true"></span>${o.label}${precioChip(o)}</button>`).join('')}</div></div>`;
}
function textoHTML(g, cfg, sc) {
  const v = cfg[g.id], a = attrsDe(sc, g), fid = `f_${sc}_${g.id}`;
  const input = g.type === 'text'
    ? `<input type="text" id="${fid}" name="${sc}_${g.id}" ${a} data-t="1" maxlength="${g.max}" placeholder="${esc(g.placeholder || '')}" value="${esc(v)}" autocomplete="off" spellcheck="false" ${g.id === 'name' ? 'autocapitalize="words"' : ''} enterkeyhint="done">`
    : `<textarea id="${fid}" name="${sc}_${g.id}" ${a} data-t="1" maxlength="${g.max}" rows="3" autocomplete="off">${esc(v)}</textarea>`;
  const sug = g.suggest ? `<div class="sug" aria-label="Ideas de texto"><span>Ideas:</span>${g.suggest.map((t, i) => `<button type="button" ${a} data-sug="${i}">${esc(t.length > 34 ? t.slice(0, 32) + '…' : t)}</button>`).join('')}</div>` : '';
  return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em data-cnt="${fid}">${cntTxt(String(v || '').length, g)}</em></div>${input}${sug}</div>`;
}
function fechaHTML(g, cfg, sc) {
  const v = cfg[g.id], fid = `f_${sc}_${g.id}`;
  return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em>${v ? fmtDate(v) : ''}</em></div>
      <input type="date" id="${fid}" name="${sc}_${g.id}" ${attrsDe(sc, g)} data-t="1" value="${esc(v)}" autocomplete="off"></div>`;
}
function archivoHTML(g, cfg, sc) {
  const v = cfg[g.id], a = attrsDe(sc, g);
  return `<div class="grp">${grpHead(g.label, plus(g.price || 0))}
      <label class="file">${v ? `<img class="thumb" src="${v}" alt="" width="44" height="44">` : '<span class="thumb"></span>'}<span>${v ? esc(cfg[g.id + 'Name'] || 'Imagen lista') + ' · cambiar' : 'Subir imagen (PNG/JPG)'}</span><input type="file" accept="image/*" ${a} data-file="1"></label>
      ${v ? `<button type="button" class="rm" ${a} data-clear="1" style="margin-top:8px">Quitar imagen</button>` : ''}</div>`;
}
function contadorHTML(g, cfg, sc) {
  const v = cfg[g.id], a = attrsDe(sc, g), low = g.label.toLowerCase();
  return `<div class="grp row">${grpHead(g.label, `${fmt(g.pricePer)} ${g.note}`)}
      <div class="step-n"><button type="button" ${a} data-d="-1" aria-label="Menos ${low}" ${v <= g.min ? 'disabled' : ''}>−</button><b aria-live="polite">${v}</b><button type="button" ${a} data-d="1" aria-label="Más ${low}" ${v >= g.max ? 'disabled' : ''}>+</button></div></div>`;
}
// figuras del cuadro (escritorio): pestañas, estilos rápidos y las opciones de la figura activa
function figurasHTML(g, cfg, sc) {
  const v = cfg[g.id], a = attrsDe(sc, g), cur = App.cur;
  const i = Math.min(cur.fig, v.length - 1); cur.fig = i;
  const f = v[i];
  return `<div class="grp figs-grp">${grpHead(`${g.label} · ${fmt(g.pricePer)} c/u`, `${v.length} de ${g.max}`)}
      <div class="ftabs" role="tablist">${v.map((x, j) => `<button type="button" role="tab" aria-selected="${j === i}" aria-pressed="${j === i}" data-tab="${j}"><span class="av">${headSVG(x)}</span><span class="nm">${esc(String(x.name || '').trim() || 'Figura ' + (j + 1))}</span></button>`).join('')}
        ${v.length < g.max ? `<button type="button" class="add-fig" ${a} data-d="1" aria-label="Agregar figura"><span class="av">+</span><span class="nm">Agregar</span></button>` : ''}</div>
      <div class="figbox" role="tabpanel">
        <div class="looks"><span>Estilo rápido:</span>${LOOKS.map((l, j) => `<button type="button" data-look="${j}">${l.label}</button>`).join('')}</div>
        ${FIG_GROUPS.map(fg => groupHTML(fg, f, 'f')).join('')}
        ${v.length > g.min ? `<button type="button" class="rm del-fig" ${a} data-d="-1">Quitar ${esc(String(f.name || '').trim() || 'esta figura')}</button>` : ''}
      </div></div>`;
}
const HTML_DE_GRUPO = { swatch: opcionesHTML, choice: opcionesHTML, multi: multiHTML, text: textoHTML, textarea: textoHTML, date: fechaHTML, file: archivoHTML, stepper: contadorHTML, figs: figurasHTML };
function groupHTML(g, cfg, sc) {
  if (!visible(g, cfg)) return '';
  return HTML_DE_GRUPO[g.type]?.(g, cfg, sc) ?? '';
}

// ---------- cantidad, pasos y botón principal ----------
const qtyHTML = () => `<div class="grp row"><div class="grp-h"><span class="l">Cantidad</span><em>${CONFIG.bulkPct}% menos desde ${CONFIG.bulkMin}</em></div>
  <div class="step-n"><button type="button" data-qty="-1" aria-label="Menos" ${App.cur.qty <= 1 ? 'disabled' : ''}>−</button><b aria-live="polite">${App.cur.qty}</b><button type="button" data-qty="1" aria-label="Más">+</button></div></div>`;
const stepsNavHTML = (p, s) => `<nav class="steps-nav" aria-label="Pasos"><span class="bar" style="--p:${(s + 1) / p.steps.length}"></span>${p.steps.map((t, i) => `<button type="button" data-step="${i}" ${i === s ? 'aria-current="step"' : ''} class="${i < s ? 'done' : ''}"><i>${i < s ? '✓' : i + 1}</i><span>${t}</span></button>`).join('')}</nav>`;

// entra deslizando (con "menos movimiento" solo se funde)
function slideIn(el, dir) {
  el.animate([{ opacity: 0, transform: REDUCED ? 'none' : `translateX(${dir * 28}px)` }, { opacity: 1, transform: 'none' }], { duration: REDUCED ? 160 : 280, easing: 'cubic-bezier(.22,1,.36,1)' });
}
function updateCTA() {
  const cur = App.cur, label = $('#addLabel');
  if (cur.mov) { $('#backBtn').hidden = cur.sub || cur.step === 0; }
  if (cur.mov && cur.sub) label.textContent = 'Listo';
  else if (!isLast()) label.textContent = `Siguiente: ${cur.p.steps[cur.step + 1]}`;
  else label.textContent = !CONFIG.ordersEnabled ? 'Pedir por WhatsApp' : cur.editIdx === null ? 'Agregar al pedido' : 'Guardar cambios';
  $('#addBtn').classList.toggle('is-next', !isLast() && !(cur.mov && cur.sub));
}

// formulario de escritorio: todo el producto, o un paso a la vez
function buildFormEscritorio(dir = 0) {
  const { p } = App.cur, form = $('#cForm');
  const grupos = (s) => p.groups.filter(g => (g.step || 0) === s).map(g => groupHTML(g, App.cur.cfg, 'p')).join('');
  if (!p.steps) form.innerHTML = p.groups.map(g => groupHTML(g, App.cur.cfg, 'p')).join('') + qtyHTML();
  else {
    const s = App.cur.step;
    form.innerHTML = stepsNavHTML(p, s) + `<div class="step-body">${grupos(s)}${isLast() ? qtyHTML() : ''}</div>`;
  }
  if (dir) { const b = form.querySelector('.step-body'); b && slideIn(b, dir); }
  updateCTA();
}
