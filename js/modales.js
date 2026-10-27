/* Pehn Design — MODALES y AVISO EMERGENTE (toast): entrada y salida animadas, foco atrapado, resto de la página inerte.
   Depende de: base.js. Lo usan: cajón del pedido, personalizador, filtros del catálogo y "pedido recibido". */

let lastFocus = null;
let inertados = []; // solo el modal abierto es usable; lo demás queda inerte para teclado y lectores de pantalla
function syncInert() {
  inertados.forEach(el => { el.inert = false; }); inertados = [];
  const top = [...document.querySelectorAll('.modal.open:not(.closing),.drawer.open:not(.closing)')].pop(); if (!top) return;
  // se bloquea todo lo que no es el modal ni lo que lo contiene (el cajón de filtros está dentro de <main>)
  for (let n = top; n.parentElement; n = n.parentElement) {
    [...n.parentElement.children].forEach(el => { if (el !== n && el.tagName !== 'SCRIPT' && !el.classList.contains('toast')) { el.inert = true; inertados.push(el); } });
  }
}
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

// Tab no se sale del modal abierto
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const top = [...document.querySelectorAll('.modal.open,.drawer.open')].pop(); if (!top) return;
  const f = [...top.querySelectorAll('button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
  else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
});

// "pedido recibido"
document.addEventListener('click', e => { if (e.target.closest('[data-xdone]')) closeModal('#done'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#done')?.classList.contains('open')) closeModal('#done'); });

let toastT;
function toast(msg, action) {
  const t = $('#toast'); if (!t) return;
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast-act">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('.toast-act').onclick = () => { action.run(); t.classList.remove('show'); };
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), action ? 6000 : 2600);
}
