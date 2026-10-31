/* Pehn Design — PERSONALIZADOR · CIERRE: cerrar el modal y avisar de cambios sin guardar.
   En escritorio, cerrar con cambios pregunta "¿salir?"; en el teléfono Atrás guarda un borrador (personalizador-movil.js). */
import { $ } from './utiles.js';
import { disenoActual } from './estado.js';
import { closeModal } from './modales.js';
import { dirty } from './personalizador-form.js';
import { cerrarPagina, atras } from './personalizador-movil.js';

function tryCloseCustom() {
  if (disenoActual()?.mov) return cerrarPagina();
  if (!dirty() || !$('#leave')) return closeModal('#custom');
  const l = $('#leave'); l.hidden = false; l.querySelector('[data-stay]').focus();
}
export function iniciarCierre() {
  addEventListener('beforeunload', e => { if ($('#custom')?.classList.contains('open') && dirty() && !disenoActual().mov) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) tryCloseCustom();
    if (e.target.closest('[data-stay]')) $('#leave').hidden = true;
    if (e.target.closest('[data-leave]')) { $('#leave').hidden = true; closeModal('#custom'); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !$('#custom') || $('#cFull')?.classList.contains('open') || $('#c3d')?.classList.contains('open')) return; // pantalla completa se cierra sola
    if ($('#leave') && !$('#leave').hidden) { $('#leave').hidden = true; return; }
    if ($('#custom').classList.contains('open')) disenoActual()?.mov ? atras() : tryCloseCustom();
  });
}
