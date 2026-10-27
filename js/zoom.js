/* Pehn Design — ZOOM de la vista previa del personalizador: rueda, pellizco, doble toque, arrastre, teclado y botones.
   Solo se acerca el producto, nunca la página. Depende de: base.js. Estado: App.zoom = { s, x, y, min, max }.
   Lo usan: personalizador.js y personalizador-movil.js (zReset, zApply). */

const Z = App.zoom;
const zArea = () => $('#cZoomArea'), zLayer = () => $('#cStage');
const zCenter = () => { const a = zArea(); return [a.clientWidth / 2, a.clientHeight / 2]; };

// aplica la escala y el desplazamiento (sin salirse del área)
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
// acerca/aleja manteniendo fijo el punto (cx, cy)
function zoomAt(cx, cy, ns, anim = false) {
  ns = Math.min(Z.max, Math.max(Z.min, ns));
  Z.x = cx - (cx - Z.x) * (ns / Z.s); Z.y = cy - (cy - Z.y) * (ns / Z.s); Z.s = ns;
  zApply(anim); hideTip();
}
function zReset(anim = true) { Z.s = 1; Z.x = 0; Z.y = 0; zApply(anim); }

// ---------- pista "usa la rueda / pellizca" (una vez por visita) ----------
let tipT;
function showTip() {
  const t = $('#zoomTip'); if (!t) return;
  if (sesion.leer('pehn_tip', 0)) { t.classList.add('hide'); return; }
  sesion.guardar('pehn_tip', 1);
  t.textContent = matchMedia('(pointer: coarse)').matches ? 'Pellizca para acercar' : 'Usa la rueda o doble clic para acercar';
  t.classList.remove('hide'); clearTimeout(tipT); tipT = setTimeout(hideTip, 3200);
}
function hideTip() { $('#zoomTip')?.classList.add('hide'); }

// ---------- gestos ----------
function gestosDeZoom(area) {
  const pts = new Map(); let last = null, pinch = null, lastTap = 0;
  const rel = e => { const r = area.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  area.addEventListener('wheel', e => {
    e.preventDefault();
    const [cx, cy] = rel(e);
    zoomAt(cx, cy, Z.s * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)));
  }, { passive: false });
  area.addEventListener('pointerdown', e => {
    area.setPointerCapture(e.pointerId); pts.set(e.pointerId, rel(e));
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: dist(a, b), s: Z.s }; }
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
      zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch.s * dist(a, b) / pinch.d);
    } else if (pts.size === 1 && Z.s > 1.01 && last) {
      const p = rel(e); Z.x += p[0] - last[0]; Z.y += p[1] - last[1]; last = p;
      area.classList.add('dragging'); zApply();
    }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; last = pts.size ? [...pts.values()][0] : null; area.classList.remove('dragging'); };
  area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up);
  area.addEventListener('gesturestart', e => e.preventDefault());
}
// + − 0 y flechas
function tecladoDeZoom(area) {
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
}
(function initZoom() {
  const area = zArea(); if (!area) return;
  gestosDeZoom(area); tecladoDeZoom(area);
  $('#zIn').addEventListener('click', () => zoomAt(...zCenter(), Z.s * 1.5, true));
  $('#zOut').addEventListener('click', () => zoomAt(...zCenter(), Z.s / 1.5, true));
  $('#zReset').addEventListener('click', () => zReset());
  addEventListener('resize', () => zApply());
})();
