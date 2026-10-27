/* Pehn Design — PERSONALIZADOR · CIERRE: abrir una tarjeta, cerrar el modal y avisar de cambios sin guardar.
   En escritorio, cerrar con cambios pregunta "¿salir?"; en el teléfono Atrás guarda un borrador (personalizador-movil.js).
   Depende de: base.js, modales.js, personalizador.js (openCard), personalizador-form.js (dirty), personalizador-movil.js (cerrarPagina, atras). */

function tryCloseCustom() {
  if (App.cur?.mov) return cerrarPagina();
  if (!dirty() || !$('#leave')) return closeModal('#custom');
  const l = $('#leave'); l.hidden = false; l.querySelector('[data-stay]').focus();
}
addEventListener('beforeunload', e => { if ($('#custom')?.classList.contains('open') && dirty() && !App.cur.mov) { e.preventDefault(); e.returnValue = ''; } });

document.addEventListener('click', e => {
  const c = e.target.closest('[data-card]');
  if (c) { openCard(+c.dataset.card); return; }
  if (e.target.closest('[data-close]')) tryCloseCustom();
  if (e.target.closest('[data-stay]')) $('#leave').hidden = true;
  if (e.target.closest('[data-leave]')) { $('#leave').hidden = true; closeModal('#custom'); }
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[data-card]')) { e.preventDefault(); openCard(+e.target.dataset.card); }
  if (e.key !== 'Escape' || !$('#custom')) return;
  if ($('#leave') && !$('#leave').hidden) { $('#leave').hidden = true; return; }
  if ($('#custom').classList.contains('open')) App.cur?.mov ? atras() : tryCloseCustom();
});
