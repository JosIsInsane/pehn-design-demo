/* Pehn Design — PERSONALIZADOR · TELÉFONO (≤ 760 px): una página con historial. Cada pantalla (paso o figura) es una
   entrada del historial: Atrás (navegador o gesto de Android) regresa una pantalla y, desde la primera, cierra la página.
   Lo elegido se conserva; si se sale con cambios sin guardar queda un borrador en sessionStorage y se ofrece al volver.
   Depende de: base.js, producto.js, personalizador-form.js, zoom.js, modales.js. Define buildForm(), que elige entre escritorio y teléfono. */

const MOV = matchMedia('(max-width:760px)');
const KEY_BORRADOR = 'pehn_borrador';

// ---------- borrador ----------
const borradores = () => sesion.leer(KEY_BORRADOR, {}) || {};
const cargarBorrador = id => { const d = borradores()[id]; return d && d.cfg ? d : null; };
function guardarBorrador() {
  const { p, cfg, qty, step } = App.cur;
  sesion.guardar(KEY_BORRADOR, { ...borradores(), [p.id]: { cfg, qty, step } });
}
function quitarBorrador(id) { const b = borradores(); delete b[id]; sesion.guardar(KEY_BORRADOR, b); }
const draftHTML = () => `<div class="draft" role="group" aria-label="Diseño sin terminar"><p><b>Tienes un diseño sin terminar</b><br>Lo dejaste a medias la última vez.</p>
    <div><button type="button" class="btn btn-dark btn-sm" data-draft="si">Seguir con tu diseño</button><button type="button" class="btn btn-ghost btn-sm" data-draft="no">Empezar de nuevo</button></div></div>`;

// ---------- secciones plegables de una figura (ids de FIG_GROUPS) ----------
const SECS = [
  ['cara', 'Cara y cabello', ['skin', 'hair', 'hairColor', 'face', 'extras']],
  ['ropa', 'Ropa', ['outfit', 'torso', 'printText', 'legs']],
  ['acc', 'Accesorios', ['hat', 'hand']],
  ['nombre', 'Nombre', ['name']],
];
const figLab = (f, id) => optLabel(FIG_GROUPS.find(g => g.id === id), f[id]);
const figName = j => String(App.cur.cfg.figs[j].name || '').trim();
// resumen de la sección en su encabezado
function secSum(k, f) {
  if (k === 'cara') return `Peinado: ${figLab(f, 'hair')} · ${figLab(f, 'face')}`;
  if (k === 'ropa') return figLab(f, 'outfit');
  if (k === 'acc') {
    const l = [f.hat && f.hat !== 'ninguno' && `Sombrero: ${figLab(f, 'hat')}`, f.hand && f.hand !== 'ninguno' && figLab(f, 'hand')].filter(Boolean);
    return l.length ? l.join(' · ') : 'Sin accesorios';
  }
  return String(f.name || '').trim() || 'Sin nombre';
}
function secHTML(groups, cfg, sc) {
  const used = new Set();
  const secs = SECS.map(([k, t, ids]) => {
    const gs = groups.filter(g => ids.includes(g.id)); gs.forEach(g => used.add(g.id));
    if (!gs.some(g => visible(g, cfg))) return '';
    const key = sc + k, open = App.cur.open.has(key);
    return `<section class="fsec${open ? ' open' : ''}"><h3><button type="button" class="sec-h" data-sec="${key}" aria-expanded="${open}" aria-controls="sec_${key}"><span class="sec-t">${t}</span><span class="sec-s" data-secsum="${k}" data-sc="${sc}">${esc(secSum(k, cfg))}</span><span class="chev" aria-hidden="true">▾</span></button></h3><div class="sec-b" id="sec_${key}"${open ? '' : ' hidden'}>${gs.map(g => groupHTML(g, cfg, sc)).join('')}</div></section>`;
  }).join('');
  return secs + groups.filter(g => !used.has(g.id)).map(g => groupHTML(g, cfg, sc)).join('');
}
// después de cada cambio: los encabezados de las secciones muestran la elección actual
function syncSecs() {
  const cur = App.cur;
  document.querySelectorAll('#cForm [data-secsum]').forEach(el => { el.textContent = secSum(el.dataset.secsum, el.dataset.sc === 'f' ? cur.cfg.figs[cur.fig] : cur.cfg); });
  if (cur.sub) updateBar();
}

// ---------- pantallas ----------
function figListHTML(g) {
  const v = App.cur.cfg.figs;
  return `<div class="grp figs-grp"><div class="grp-h"><span class="l">${g.label}</span><em>${v.length} de ${g.max} · ${fmt(g.pricePer)} c/u</em></div>
    <ul class="figlist">${v.map((x, j) => `<li><button type="button" class="figrow" data-figopen="${j}"><span class="av">${headSVG(x)}</span><span class="fi"><b>Figura ${j + 1}${figName(j) ? ' · ' + esc(figName(j)) : ''}</b><small>${esc(figLab(x, 'hair'))}, ${esc(figLab(x, 'outfit'))}</small></span><span class="go" aria-hidden="true">Editar ›</span></button></li>`).join('')}</ul>
    ${v.length < g.max ? `<button type="button" class="btn btn-ghost add-fig-m" data-sc="p" data-g="${g.id}" data-d="1">+ Agregar figura</button>` : ''}</div>`;
}
// pantalla de una figura: estilos rápidos y sus secciones
function figSubHTML() {
  const { cur } = App, g = cur.p.groups.find(x => x.type === 'figs'), v = cur.cfg.figs, f = v[cur.fig];
  return `<div class="looks-wrap"><p class="looks-t">Estilos rápidos</p><div class="looks">${LOOKS.map((l, j) => `<button type="button" data-look="${j}">${l.label}</button>`).join('')}</div></div>
    ${secHTML(FIG_GROUPS, f, 'f')}
    ${v.length > g.min ? `<button type="button" class="rm del-fig" data-sc="p" data-g="${g.id}" data-d="-1">Quitar ${esc(figName(cur.fig) || 'esta figura')}</button>` : ''}`;
}
// pantalla de un paso (o de todo el producto si no tiene pasos)
function pasoMovilHTML() {
  const { p, cfg } = App.cur, s = App.cur.step, inline = p.groups.some(g => g.id === 'extras');
  const gs = p.steps ? p.groups.filter(g => (g.step || 0) === s) : p.groups;
  const nav = p.steps ? stepsNavHTML(p, s) : '';
  const body = inline ? secHTML(gs, cfg, 'p') : gs.map(g => g.type === 'figs' ? figListHTML(g) : groupHTML(g, cfg, 'p')).join('');
  return `${nav}<div class="step-body">${body}${!p.steps || isLast() ? qtyHTML() : ''}</div>`;
}
function buildFormMov(dir = 0) {
  const cur = App.cur, form = $('#cForm'), y = form.scrollTop;
  form.innerHTML = (cur.draft ? draftHTML() : '') + (cur.sub ? `<div class="step-body sub">${figSubHTML()}</div>` : pasoMovilHTML());
  if (dir) { const b = form.querySelector('.step-body'); b && slideIn(b, dir); form.scrollTop = 0; } else form.scrollTop = y;
  updateCTA(); updateBar();
}
const buildForm = (dir = 0) => App.cur.mov ? buildFormMov(dir) : buildFormEscritorio(dir);
function updateBar() {
  const { p, step, sub, fig, photo } = App.cur, n = p.steps ? p.steps.length : 0;
  $('#cScreen').textContent = sub ? `Figura ${fig + 1}` : p.name;
  const paso = n ? `Paso ${step + 1} de ${n} · ${p.steps[step]}` : (photo ? 'Inspirado en un pedido real' : catName(p.cat));
  $('#cSub').textContent = sub ? `${figName(fig) ? figName(fig) + ' · ' : ''}${paso}` : paso;
}

// ---------- historial ----------
// ir a otra pantalla: se agrega al historial para que Atrás regrese aquí
function irA(step, sub = false) {
  const cur = App.cur, dir = sub || step > cur.step ? 1 : -1;
  cur.step = step; cur.sub = sub; cur.stack.push({ step, sub });
  history.pushState({ pehn: cur.stack.length - 1 }, '');
  pantalla(dir);
}
function pantalla(dir) {
  const cur = App.cur;
  if (cur.sub) cur.open = new Set(['fcara']);
  if (cur.sub || cur.step) cur.draft = null;
  buildForm(dir);
  $('#cScreen').focus({ preventScroll: true });
  $('#custom .sheet').classList.remove('mini'); $('#custom .sheet').classList.toggle('sub', cur.sub);
  if (cur.sub) enfocaFig(); else if (Z.s > 1) zReset();
}
function atras() { if (App.cur.stack.length > 1) history.back(); else cerrarPagina(); }
// cierra la página: se regresa en el historial a donde estaba antes de abrirla (el popstate hace el resto)
function cerrarPagina() {
  history.go(-App.cur.stack.length);
  setTimeout(() => { if ($('#custom').classList.contains('open')) salirPagina(); }, 600);
}
function salirPagina() {
  if (!$('#custom').classList.contains('open')) return;
  if (dirty() && !App.cur.done) { guardarBorrador(); toast('Guardamos tu diseño para que sigas luego'); }
  closeModal('#custom');
}
addEventListener('popstate', e => {
  const cur = App.cur;
  if (!cur || !cur.mov || !$('#custom').classList.contains('open')) return;
  const i = e.state && e.state.pehn;
  if (typeof i !== 'number') return salirPagina();
  if (i >= cur.stack.length) { history.replaceState({ pehn: cur.stack.length - 1 }, ''); return; } // "adelante" del navegador: no hay nada más
  cur.stack.length = i + 1;
  const t = cur.stack[i]; cur.step = t.step; cur.sub = t.sub;
  pantalla(-1);
});
addEventListener('pagehide', () => { const cur = App.cur; if (cur?.mov && $('#custom').classList.contains('open') && dirty() && !cur.done) guardarBorrador(); });

// ---------- teclado del teléfono y vista previa ----------
// el teclado recorta la vista: la página mide lo que de verdad se ve
function vvAjusta() {
  const v = window.visualViewport, s = $('#custom').style;
  if (!App.cur?.mov || !v) { s.removeProperty('--vvh'); s.removeProperty('--vvt'); return; }
  s.setProperty('--vvh', Math.round(v.height) + 'px'); s.setProperty('--vvt', Math.round(v.offsetTop) + 'px');
}
// acerca la vista previa a la figura que se edita (solo en el cuadro)
function enfocaFig() {
  const { cur } = App, area = zArea(), svg = $('#cStage svg.frame-svg');
  if (!area || !svg || cur.p.render !== 'frame' || !cur.cfg.figs[cur.fig]) return;
  const W = area.clientWidth, H = area.clientHeight, a = area.getBoundingClientRect();
  Z.s = 1; Z.x = 0; Z.y = 0; zApply(false);
  const r = svg.getBoundingClientRect(), k = Math.min(r.width, r.height) / 300;
  const ox = r.left - a.left + (r.width - 300 * k) / 2, oy = r.top - a.top + (r.height - 300 * k) / 2;
  const b = frameFigBox(cur.cfg, cur.fig);
  const s = Math.max(1.3, Math.min(3.4, H * .86 / (b.h * k)));
  Z.s = s; Z.x = W / 2 - (ox + (b.x + b.w / 2) * k) * s; Z.y = H / 2 - (oy + (b.y + b.h * .5) * k) * s; zApply(true);
}
(function initPaginaMov() {
  const form = $('#cForm'), sheet = $('#custom .sheet'); if (!form) return;
  // teclado: la vista previa se achica y el campo se centra para que no lo tape
  form.addEventListener('focusin', e => {
    if (!App.cur?.mov || !e.target.matches('input,textarea')) return;
    sheet.classList.add('kb');
    setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }), 250);
  });
  form.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement?.matches?.('#cForm input,#cForm textarea')) sheet.classList.remove('kb'); }, 120));
  window.visualViewport?.addEventListener('resize', vvAjusta);
  window.visualViewport?.addEventListener('scroll', vvAjusta);
  $('#cBack').addEventListener('click', atras);
  $('#backBtn').addEventListener('click', atras);
  if (window.ResizeObserver) new ResizeObserver(() => { if (App.cur?.mov) App.cur.sub ? enfocaFig() : zApply(); }).observe(zArea());
})();
