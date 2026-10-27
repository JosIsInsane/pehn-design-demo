/* Pehn Design — PERSONALIZADOR · EVENTOS: clics, escritura y archivos del formulario, botón principal y cierre.
   Cada clic se reparte a una función con nombre según su data-* (ver clicEnFormulario). Los cambios se aplican a App.cur.
   Depende de: base.js, producto.js, whatsapp.js, carrito.js, modales.js, personalizador-form/-movil/-vista.js, personalizador.js, datos.js (LOOKS, figDefault, normCfg, varFix). */

const FIGURAS_QUE_REARMAN = ['torso', 'hair', 'skin', 'hairColor', 'face']; // cambian las pestañas o las secciones
const conservarScroll = fn => { const y = $('#cForm').scrollTop; fn(); $('#cForm').scrollTop = y; };
const rearmar = () => conservarScroll(() => buildForm());

// ---------- botones sueltos (no dependen de un grupo) ----------
function cambiarPestana(b) { App.cur.fig = +b.dataset.tab; buildForm(); }
function plegarSeccion(b) {
  const k = b.dataset.sec, open = !App.cur.open.has(k), body = document.getElementById('sec_' + k);
  open ? App.cur.open.add(k) : App.cur.open.delete(k);
  b.setAttribute('aria-expanded', open); b.closest('.fsec').classList.toggle('open', open); body.hidden = !open;
  if (open && !REDUCED) body.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
}
function abrirFigura(b) { App.cur.fig = +b.dataset.figopen; irA(App.cur.step, true); }
// el borrador de la vez pasada: seguir con él o empezar de nuevo
function resolverBorrador(b) {
  const cur = App.cur, d = cur.draft; cur.draft = null;
  if (b.dataset.draft === 'si') {
    cur.cfg = normCfg(cur.p, clone(d.cfg)); cur.qty = d.qty || 1; cur.fig = 0;
    if (cur.p.steps && d.step > 0 && d.step < cur.p.steps.length) { cur.step = d.step; cur.stack[0].step = d.step; }
  } else quitarBorrador(cur.p.id);
  buildForm(); update();
}
function cambiarPaso(b) {
  const cur = App.cur, n = +b.dataset.step;
  if (cur.mov) { if (n !== cur.step) irA(n); return; }
  const d = Math.sign(n - cur.step); cur.step = n; buildForm(d); $('#cForm').scrollTop = 0;
}
function cambiarCantidad(b) { App.cur.qty = Math.max(1, Math.min(99, App.cur.qty + +b.dataset.qty)); buildForm(); update(false, true); }
function aplicarEstilo(b) {
  const cur = App.cur;
  Object.assign(cur.cfg.figs[cur.fig], clone(LOOKS[+b.dataset.look].f));
  buildForm(); update();
}
const CLICS_SUELTOS = [['tab', cambiarPestana], ['sec', plegarSeccion], ['figopen', abrirFigura], ['draft', resolverBorrador], ['step', cambiarPaso], ['qty', cambiarCantidad], ['look', aplicarEstilo]];

// ---------- botones de un grupo (data-sc + data-g) ----------
// opción de varias a la vez; algunas se excluyen entre sí
function alternarMulti(b, obj, g, sc) {
  const id = g.id, arr = obj[id] = [...(obj[id] || [])], v = b.dataset.m, o = g.options.find(x => x.v === v);
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1); else { arr.push(v); (o.excl || []).forEach(e => { const j = arr.indexOf(e); if (j >= 0) arr.splice(j, 1); }); }
  b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', arr.includes(x.dataset.m)));
  const em = b.closest('.grp').querySelector('[data-mc]'); if (em) em.textContent = multiTxt(arr.length);
  if (sc === 'f') { const av = document.querySelector(`[data-tab="${App.cur.fig}"] .av`); if (av) av.innerHTML = headSVG(obj); }
  update();
}
// opción única (color, talla…): se actualiza solo la selección para no perder scroll ni foco
function elegirValor(b, obj, g, sc) {
  const id = g.id, cur = App.cur;
  if (obj[id] === b.dataset.v) return;
  obj[id] = b.dataset.v;
  if (sc === 'p' && cur.p.variants) varFix(cur.p, cur.cfg); // lo que ya no existe pasa a la primera opción disponible
  b.parentElement.querySelectorAll('button').forEach(x => { const on = x === b; x.setAttribute('aria-pressed', on); x.setAttribute('aria-checked', on); });
  const em = b.closest('.grp').querySelector('.grp-h em'); if (em) em.textContent = g.options.find(o => o.v === b.dataset.v)?.label || '';
  // grupos condicionales o pestañas pueden cambiar: reconstruye si hace falta
  if ((sc === 'p' && cur.p.variants) || groupsOf(sc).some(x => x.showIf) || (sc === 'f' && FIGURAS_QUE_REARMAN.includes(g.id))) rearmar();
  update();
}
// agregar (+) o quitar (−) una figura. Regresa true si ya repintó todo
function cambiarFiguras(b, obj, g) {
  const cur = App.cur, arr = obj[g.id], dir = +b.dataset.d;
  if (dir > 0 && arr.length < g.max) {
    arr.push(figDefault(arr.length)); cur.fig = arr.length - 1;
    if (cur.mov) { buildForm(); update(); irA(cur.step, true); return true; }
  } else if (dir < 0 && arr.length > g.min) {
    const at = cur.fig, [gone] = arr.splice(at, 1); cur.fig = Math.max(0, at - 1);
    toast(`Quitaste a ${String(gone.name || '').trim() || 'la figura ' + (at + 1)}`, { label: 'Deshacer', run: () => { arr.splice(at, 0, gone); cur.fig = at; buildForm(); update(); } });
    if (cur.mov && cur.sub) { update(); history.back(); return true; } // la figura ya no existe: de vuelta a la lista
  }
  return false;
}
function clicEnGrupo(b) {
  const d = b.dataset, sc = d.sc; if (!sc) return;
  const obj = target(sc), g = groupsOf(sc).find(x => x.id === d.g);
  if (d.sug !== undefined) { obj[g.id] = g.suggest[+d.sug]; buildForm(); update(); return; }
  if (d.m !== undefined) return alternarMulti(b, obj, g, sc);
  if (d.v !== undefined) return elegirValor(b, obj, g, sc);
  if (d.clear) { obj[g.id] = ''; obj[g.id + 'Name'] = ''; }
  else if (d.d && g.type === 'figs') { if (cambiarFiguras(b, obj, g)) return; }
  else if (d.d) obj[g.id] = Math.max(g.min, Math.min(g.max, obj[g.id] + Number(d.d)));
  rearmar(); update();
}
function clicEnFormulario(e) {
  const b = e.target.closest('button'); if (!b) return;
  const suelto = CLICS_SUELTOS.find(([k]) => b.dataset[k] !== undefined);
  if (suelto) return suelto[1](b);
  clicEnGrupo(b);
}
$('#cForm')?.addEventListener('click', clicEnFormulario);
$('#cForm')?.addEventListener('submit', e => e.preventDefault());
// teléfono: los encabezados de las secciones siguen lo que se elige (corre después del manejador de arriba)
$('#cForm')?.addEventListener('click', () => { if (App.cur?.mov) syncSecs(); });

// ---------- escritura y archivos ----------
$('#cForm')?.addEventListener('input', e => {
  const el = e.target; if (!el.dataset.t) return;
  const cur = App.cur, sc = el.dataset.sc, id = el.dataset.g, g = groupsOf(sc).find(x => x.id === id);
  target(sc)[id] = el.value;
  const cnt = document.querySelector(`[data-cnt="${el.id}"]`);
  if (cnt) cnt.textContent = cntTxt(el.value.length, g);
  if (g.type === 'date') { const em = el.closest('.grp').querySelector('em'); if (em) em.textContent = fmtDate(el.value); }
  // nombre de figura: refresca la pestaña sin perder el foco
  if (sc === 'f' && id === 'name') { const tab = document.querySelector(`[data-tab="${cur.fig}"] .nm`); if (tab) tab.textContent = el.value.trim() || 'Figura ' + (cur.fig + 1); }
  update(false, true);
  if (cur.mov) syncSecs();
});
$('#cForm')?.addEventListener('change', e => {
  const el = e.target; if (!el.dataset.file || !el.files[0]) return;
  const f = el.files[0], obj = target(el.dataset.sc), id = el.dataset.g;
  if (f.size > 8 * 1024 * 1024) return toast('Imagen muy pesada (máx. 8 MB)');
  shrinkImage(f, 900).then(url => { obj[id] = url; obj[id + 'Name'] = f.name; buildForm(); update(); });
});

// ---------- desglose y foto de referencia ----------
$('#brkBtn')?.addEventListener('click', () => {
  const b = $('#cBreak'), open = b.hidden;
  b.hidden = !open; $('#brkBtn').setAttribute('aria-expanded', open);
  if (open) b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
});
// el SVG como imagen necesita xmlns una sola vez (repetido = imagen rota con "?")
const conXmlns = svg => /^<svg[^>]*\sxmlns=/.test(svg) ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
$('#refBtn')?.addEventListener('click', () => {
  const cur = App.cur;
  cur.showPhoto = !cur.showPhoto;
  $('#refBtn').classList.toggle('on', cur.showPhoto);
  $('#refBtn span').textContent = cur.showPhoto ? 'Mi diseño' : 'Pedido real';
  zReset();
  $('#refBtn img').src = cur.showPhoto ? 'data:image/svg+xml,' + encodeURIComponent(conXmlns(renderProduct(cur.p, cur.cfg))) : cur.photo;
  update();
});

// ---------- botón principal: siguiente paso, agregar al pedido o pedir por WhatsApp ----------
function agregarAlPedido() {
  const cur = App.cur, item = { id: cur.p.id, cfg: clone(cur.cfg), qty: cur.qty };
  cur.start = JSON.stringify([cur.cfg, cur.qty]);
  const isNew = cur.editIdx === null;
  if (isNew) App.cart.push(item); else App.cart[cur.editIdx] = item;
  cur.done = true; quitarBorrador(cur.p.id);
  flyToCart();
  saveCart(); cur.mov ? cerrarPagina() : closeModal('#custom');
  toast(isNew ? '¡Agregado a tu pedido! ✦' : 'Cambios guardados');
}
$('#addBtn')?.addEventListener('click', () => {
  const cur = App.cur;
  if (cur.mov && cur.sub) return atras(); // "Listo": de vuelta a la lista de figuras
  if (!isLast()) { if (cur.mov) return irA(cur.step + 1); cur.step++; buildForm(1); $('#cForm').scrollTop = 0; return; }
  if (!CONFIG.ordersEnabled) { window.open(waURL(waText(cur.p, cur.cfg, cur.qty)), '_blank', 'noopener'); return; }
  agregarAlPedido();
});
