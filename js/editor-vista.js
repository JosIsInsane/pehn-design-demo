/* Pehn Design — EDICIÓN DIRECTA dentro de la vista previa del editor (/admin), estilo Wix:
   tocas un texto de la página y escribes encima; tocas una foto y eliges cambiarla o quitarla.
   Solo corre cuando la página está dentro del iframe de /admin (mismo dominio) y el editor ya entró:
   lo carga js/sitio.js con import() (la página normal no lo descarga). Avisa cada cambio al editor por postMessage. */

const avisar = m => parent.postMessage(m, location.origin);
let activo = false, tipos = {}, menu = null;

const ESTILO = `
.en-editor [data-edit]{cursor:text;border-radius:4px;transition:outline-color .15s}
.en-editor [data-edit]:hover{outline:2px dashed color-mix(in srgb,var(--brand) 70%,transparent);outline-offset:4px}
.en-editor [data-edit]:focus{outline:2px solid var(--brand);outline-offset:4px;background:color-mix(in srgb,var(--brand-soft) 60%,transparent)}
.en-editor [data-edit-img]{cursor:pointer}
.en-editor [data-edit-img]:hover{outline:3px dashed var(--brand);outline-offset:-3px}
.ed-menu-foto{position:absolute;z-index:9999;display:flex;gap:6px;padding:6px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font:600 14px/1 Inter,system-ui,sans-serif}
.ed-menu-foto button{border:0;border-radius:8px;padding:10px 14px;cursor:pointer;background:#F4EDE4;color:#1E1611;font:inherit}
.ed-menu-foto button:first-child{background:var(--brand);color:#fff}`;

function cerrarMenu() { menu?.remove(); menu = null; }
function menuFoto(img) {
  cerrarMenu();
  const r = img.getBoundingClientRect();
  menu = document.createElement('div'); menu.className = 'ed-menu-foto';
  [['cambiar', 'Cambiar foto'], ['quitar', 'Quitar foto']].forEach(([accion, txt]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = txt;
    b.addEventListener('click', e => { e.stopPropagation(); avisar({ tipo: 'pehn-foto', clave: img.dataset.editImg, accion }); cerrarMenu(); });
    menu.append(b);
  });
  menu.style.left = `${Math.max(8, r.left + scrollX + r.width / 2 - 110)}px`;
  menu.style.top = `${r.top + scrollY + Math.min(r.height / 2, 80)}px`;
  document.body.append(menu);
}

function activar() {
  activo = true;
  const st = document.createElement('style'); st.textContent = ESTILO; document.head.append(st);
  document.querySelectorAll('[data-edit]').forEach(el => {
    const clave = el.dataset.edit;
    if (!tipos[clave] || !/^(texto|largo)$/.test(tipos[clave])) return; // solo textos (colores, WhatsApp y enlaces van en el panel)
    try { el.contentEditable = 'plaintext-only'; } catch { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.spellcheck = true;
    el.addEventListener('input', () => avisar({ tipo: 'pehn-cambio', clave, valor: el.textContent }));
    el.addEventListener('focus', () => avisar({ tipo: 'pehn-foco', clave }));
    // títulos: una sola línea (Enter termina); Escape también
    el.addEventListener('keydown', e => { if ((e.key === 'Enter' && tipos[clave] !== 'largo') || e.key === 'Escape') { e.preventDefault(); el.blur(); } });
    el.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData?.getData('text/plain') || '').replace(/\s+/g, ' ')); });
  });
  // dentro del editor, tocar un texto que está en un enlace o botón edita (no navega); las fotos abren su menú
  document.addEventListener('click', e => {
    const img = e.target.closest('[data-edit-img]');
    if (img) { e.preventDefault(); e.stopPropagation(); return menuFoto(img); }
    if (!e.target.closest('.ed-menu-foto')) cerrarMenu();
    if (e.target.closest('[data-edit]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  addEventListener('scroll', cerrarMenu, { passive: true });
}

export function iniciarVistaEditor(aplicarSitio, alRecibir) {
  addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== window.parent || !e.data || typeof e.data !== 'object') return;
    if (e.data.tipo === 'pehn-vista') {
      alRecibir();
      tipos = e.data.tipos || tipos;
      // no se pisa el texto que la persona está escribiendo en este momento
      const foco = document.activeElement?.dataset?.edit, sitio = { ...e.data.sitio };
      if (foco) delete sitio[foco];
      aplicarSitio(sitio);
      if (!activo) activar();
    }
    if (e.data.tipo === 'pehn-resaltar') {
      const k = CSS.escape(String(e.data.clave));
      const el = document.querySelector(`[data-edit="${k}"],[data-edit-img="${k}"]`);
      document.querySelectorAll('.pehn-resaltado').forEach(x => x.classList.remove('pehn-resaltado'));
      if (el && !el.closest('[hidden]')) { el.classList.add('pehn-resaltado'); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
  });
  avisar({ tipo: 'pehn-lista' });
}
