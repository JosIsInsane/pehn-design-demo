/* Pehn Design — PERSONALIZADOR · EVENTOS: clics, escritura y archivos del formulario, botón principal y cierre.
   Cada clic se reparte a una función con nombre según su data-* (ver clicEnFormulario). Las opciones elegidas
   (disenoActual().cfg) se editan aquí en el sitio; el resto del estado cambia con las funciones de estado.js.
   Lo pone a escuchar personalizador.js (iniciarPersonalizador). */
import { CONFIG, LOOKS, figDefault, normCfg, varFix } from '../datos.js';
import { headSVG, renderProduct } from '../dibujos.js';
import { $, clone, shrinkImage, movimientoReducido } from './utiles.js';
import { fmtDate } from './formato.js';
import {
  disenoActual, cambiarFigura, setPaso, setCantidad, reemplazarDiseno, setBorrador, mostrarFotoDeReferencia, marcarSinCambios,
  marcarDisenoTerminado, fijarPrimeraPantalla, seccionAbierta, abrirSeccion, agregarAlCarrito, reemplazarEnCarrito,
} from './estado.js';
import { saveCart } from './carrito.js';
import { waURL, waText } from './whatsapp.js';
import { toast, closeModal } from './modales.js';
import { target, groupsOf, multiTxt, cntTxt, isLast } from './personalizador-form.js';
import { buildForm, irA, atras, syncSecs, cerrarPagina, quitarBorrador } from './personalizador-movil.js';
import { update, flyToCart } from './personalizador-vista.js';
import { zReset } from './zoom.js';

const FIGURAS_QUE_REARMAN = ['torso', 'hair', 'skin', 'hairColor', 'face']; // cambian las pestañas o las secciones
const conservarScroll = fn => { const y = $('#cForm').scrollTop; fn(); $('#cForm').scrollTop = y; };
const rearmar = () => conservarScroll(() => buildForm());

// ---------- botones sueltos (no dependen de un grupo) ----------
function cambiarPestana(b) { cambiarFigura(+b.dataset.tab); buildForm(); }
function plegarSeccion(b) {
  const k = b.dataset.sec, open = !seccionAbierta(k), body = document.getElementById('sec_' + k);
  abrirSeccion(k, open);
  b.setAttribute('aria-expanded', open); b.closest('.fsec').classList.toggle('open', open); body.hidden = !open;
  if (open && !movimientoReducido()) body.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
}
function abrirFigura(b) { cambiarFigura(+b.dataset.figopen); irA(disenoActual().step, true); }
// el borrador de la vez pasada: seguir con él o empezar de nuevo
function resolverBorrador(b) {
  const cur = disenoActual(), d = cur.draft; setBorrador(null);
  if (b.dataset.draft === 'si') {
    reemplazarDiseno(normCfg(cur.p, clone(d.cfg)), d.qty || 1);
    if (cur.p.steps && d.step > 0 && d.step < cur.p.steps.length) fijarPrimeraPantalla(d.step);
  } else quitarBorrador(cur.p.id);
  buildForm(); update();
}
function cambiarPaso(b) {
  const cur = disenoActual(), n = +b.dataset.step;
  if (cur.mov) { if (n !== cur.step) irA(n); return; }
  const d = Math.sign(n - cur.step); setPaso(n); buildForm(d); $('#cForm').scrollTop = 0;
}
function cambiarCantidad(b) { setCantidad(Math.max(1, Math.min(99, disenoActual().qty + +b.dataset.qty))); buildForm(); update(false, true); }
function aplicarEstilo(b) {
  const cur = disenoActual();
  Object.assign(cur.cfg.figs[cur.fig], clone(LOOKS[+b.dataset.look].f));
  buildForm(); update();
}
// ordena las figuras: "j:dir" (dir -1 = más a la izquierda en el cuadro, 1 = más a la derecha)
function moverFigura(b) {
  const cur = disenoActual(), arr = cur.cfg.figs, [j, dir] = b.dataset.figmove.split(':').map(Number), k = j + dir;
  if (k < 0 || k >= arr.length) return;
  [arr[j], arr[k]] = [arr[k], arr[j]]; cambiarFigura(k);
  buildForm(); update();
  document.querySelector(`[data-figmove="${k}:${dir}"]`)?.focus();
}
// "Ver en 3D": el visor (y Three.js) se descargan solo la primera vez que se pide
let tresListo = false; // los botones de cierre del visor se escuchan una sola vez
async function verEn3D(b) {
  const cur = disenoActual(), j = +b.dataset.ver3d, f = cur.cfg.figs[j]; if (!f) return;
  b.setAttribute('aria-busy', 'true'); const txt = b.textContent; b.textContent = 'Cargando 3D…';
  try {
    const m = await import('./figura-3d.js');
    if (!tresListo) { tresListo = true; document.addEventListener('click', e => { if (e.target.closest('[data-3dclose]') || e.target.id === 'c3d') m.cerrar3D(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#c3d')?.classList.contains('open')) m.cerrar3D(); }); }
    m.abrir3D(f, `${String(f.name || '').trim() || 'Figura ' + (j + 1)} en 3D`);
  } catch (err) { console.error(err); toast('No se pudo cargar la vista 3D. Revisa tu conexión.'); }
  finally { b.removeAttribute('aria-busy'); b.textContent = txt; }
}
const CLICS_SUELTOS = [['ver3d', verEn3D], ['figmove', moverFigura], ['tab', cambiarPestana], ['sec', plegarSeccion], ['figopen', abrirFigura], ['draft', resolverBorrador], ['step', cambiarPaso], ['qty', cambiarCantidad], ['look', aplicarEstilo]];

// ---------- botones de un grupo (data-sc + data-g) ----------
// opción de varias a la vez; algunas se excluyen entre sí
function alternarMulti(b, obj, g, sc) {
  const id = g.id, arr = obj[id] = [...(obj[id] || [])], v = b.dataset.m, o = g.options.find(x => x.v === v);
  const i = arr.indexOf(v);
  if (i >= 0) arr.splice(i, 1); else { arr.push(v); (o.excl || []).forEach(e => { const j = arr.indexOf(e); if (j >= 0) arr.splice(j, 1); }); }
  b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', arr.includes(x.dataset.m)));
  const em = b.closest('.grp').querySelector('[data-mc]'); if (em) em.textContent = multiTxt(arr.length);
  if (sc === 'f') { const av = document.querySelector(`[data-tab="${disenoActual().fig}"] .av`); if (av) av.innerHTML = headSVG(obj); }
  update();
}
// opción única (color, talla…): se actualiza solo la selección para no perder scroll ni foco
function elegirValor(b, obj, g, sc) {
  const id = g.id, cur = disenoActual();
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
  const cur = disenoActual(), arr = obj[g.id], dir = +b.dataset.d;
  if (dir > 0 && arr.length < g.max) {
    arr.push(figDefault(arr.length)); cambiarFigura(arr.length - 1);
    if (cur.mov) { buildForm(); update(); irA(cur.step, true); return true; }
  } else if (dir < 0 && arr.length > g.min) {
    const at = cur.fig, [gone] = arr.splice(at, 1); cambiarFigura(Math.max(0, at - 1));
    toast(`Quitaste a ${String(gone.name || '').trim() || 'la figura ' + (at + 1)}`, { label: 'Deshacer', run: () => { arr.splice(at, 0, gone); cambiarFigura(at); buildForm(); update(); } });
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
// ---------- escritura y archivos: todo lo que escucha el formulario ----------
function ponerEventosDelFormulario() {
  $('#cForm')?.addEventListener('click', clicEnFormulario);
  $('#cForm')?.addEventListener('submit', e => e.preventDefault());
  // teléfono: los encabezados de las secciones siguen lo que se elige (corre después del manejador de arriba)
  $('#cForm')?.addEventListener('click', () => { if (disenoActual()?.mov) syncSecs(); });

  $('#cForm')?.addEventListener('input', e => {
    const el = e.target; if (!el.dataset.t) return;
    const cur = disenoActual(), sc = el.dataset.sc, id = el.dataset.g, g = groupsOf(sc).find(x => x.id === id);
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
}

// el SVG como imagen necesita xmlns una sola vez (repetido = imagen rota con "?")
const conXmlns = svg => /^<svg[^>]*\sxmlns=/.test(svg) ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

function ponerEventosDelDesglose() {
  $('#brkBtn')?.addEventListener('click', () => {
    const b = $('#cBreak'), open = b.hidden;
    b.hidden = !open; $('#brkBtn').setAttribute('aria-expanded', open);
    if (open) b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
  });
  $('#refBtn')?.addEventListener('click', () => {
    const cur = disenoActual();
    mostrarFotoDeReferencia(!cur.showPhoto);
    $('#refBtn').classList.toggle('on', cur.showPhoto);
    $('#refBtn span').textContent = cur.showPhoto ? 'Mi diseño' : 'Pedido real';
    zReset();
    $('#refBtn img').src = cur.showPhoto ? 'data:image/svg+xml,' + encodeURIComponent(conXmlns(renderProduct(cur.p, cur.cfg))) : cur.photo;
    update();
  });
}

// ---------- botón principal: siguiente paso, agregar al pedido o pedir por WhatsApp ----------
function agregarAlPedido() {
  const cur = disenoActual(), item = { id: cur.p.id, cfg: clone(cur.cfg), qty: cur.qty };
  marcarSinCambios();
  const isNew = cur.editIdx === null;
  if (isNew) agregarAlCarrito(item); else reemplazarEnCarrito(cur.editIdx, item);
  marcarDisenoTerminado(); quitarBorrador(cur.p.id);
  flyToCart();
  saveCart(); cur.mov ? cerrarPagina() : closeModal('#custom');
  toast(isNew ? '¡Agregado a tu pedido! ✦' : 'Cambios guardados');
}
function ponerEventosDelBoton() {
  $('#addBtn')?.addEventListener('click', () => {
    const cur = disenoActual();
    if (cur.mov && cur.sub) return atras(); // "Listo": de vuelta a la lista de figuras
    if (!isLast()) { if (cur.mov) return irA(cur.step + 1); setPaso(cur.step + 1); buildForm(1); $('#cForm').scrollTop = 0; return; }
    if (!CONFIG.ordersEnabled) { window.open(waURL(waText(cur.p, cur.cfg, cur.qty)), '_blank', 'noopener'); return; }
    agregarAlPedido();
  });
}

// pone a escuchar todo el formulario (lo llama iniciarPersonalizador)
export function iniciarEventos() {
  ponerEventosDelFormulario();
  ponerEventosDelDesglose();
  ponerEventosDelBoton();
}
