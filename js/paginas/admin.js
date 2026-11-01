/* Pehn Design — EDITOR DEL SITIO (/admin): entra con correo + código y edita textos, colores y fotos
   viendo la página real al lado (iframe del mismo sitio; js/sitio.js recibe los cambios por postMessage).
   Backend: apps-script/EditorSitio.gs, por el portero (functions/api.js). La sesión vive solo en esta pestaña. */
import { CONFIG } from '../../datos.js';
import { shrinkImage } from '../utiles.js';

const $ = s => document.querySelector(s);
const CLAVE_SESION = 'pehn_editor';
const GRUPOS = [
  ['color.', 'Colores'], ['anuncio', 'Portada'], ['hero.', 'Portada'], ['seccion.', 'Portada'], ['plazo.', 'Carrito'],
  ['como.', 'Cómo funciona'], ['historia.', 'Nuestra historia'], ['faq.', 'Preguntas frecuentes'], ['pie', 'Contacto y pie'], ['contacto.', 'Contacto y pie'],
];
const grupoDe = k => (GRUPOS.find(([p]) => k.startsWith(p)) || [, 'Otros'])[1];
const VALIDO = {
  color: v => /^#[0-9a-f]{6}$/i.test(v),
  whatsapp: v => !v || /^\d{8,15}$/.test(v.replace(/\D/g, '')),
  enlace: v => !v || /^https:\/\/[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v),
};

const estado = { sesion: null, correo: '', campos: [], original: {}, actual: {} };

// ---------- servidor ----------
async function api(accion, datos = {}) {
  const res = await fetch(CONFIG.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8', 'X-Accion': accion }, body: JSON.stringify({ ...datos, accion }) });
  const out = await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }));
  if (!out.ok) throw new Error(out.error || 'No se pudo completar.');
  return out;
}
const leerSesion = () => { try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || 'null'); } catch { return null; } };
const guardarSesion = s => { try { s ? sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s)) : sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin almacenamiento: se vuelve a entrar */ } };

// ---------- entrar ----------
const error = m => { $('#edError').textContent = m || ''; };
function ocupado(form, si) { form.querySelectorAll('button,input').forEach(b => { b.disabled = si; }); }
$('#edPaso1').addEventListener('submit', async e => {
  e.preventDefault(); error(''); ocupado(e.target, true);
  try {
    await api('editorCodigo', { correo: $('#edCorreo').value });
    $('#edPaso1').hidden = true; $('#edPaso2').hidden = false; $('#edCodigo').focus();
  } catch (err) { error(err.message); } finally { ocupado(e.target, false); }
});
$('#edPaso2').addEventListener('submit', async e => {
  e.preventDefault(); error(''); ocupado(e.target, true);
  try {
    const r = await api('editorEntrar', { correo: $('#edCorreo').value, codigo: $('#edCodigo').value });
    guardarSesion({ sesion: r.sesion, correo: r.correo });
    abrirEditor(r.sesion, r.correo, r.campos);
  } catch (err) { error(err.message); $('#edCodigo').select(); } finally { ocupado(e.target, false); }
});
$('#edOtro').addEventListener('click', () => { $('#edPaso2').hidden = true; $('#edPaso1').hidden = false; error(''); $('#edCorreo').focus(); });

function salir(msg) {
  guardarSesion(null); estado.sesion = null;
  $('#edApp').hidden = true; $('#edEntrar').hidden = false; $('#edPaso2').hidden = true; $('#edPaso1').hidden = false;
  error(msg || '');
}
$('#edSalir').addEventListener('click', () => { if (!hayCambios() || confirm('Tienes cambios sin guardar. ¿Salir igual?')) salir(); });

// ---------- editar ----------
const hayCambios = () => Object.keys(estado.actual).some(k => estado.actual[k] !== estado.original[k]);
function abrirEditor(sesion, correo, campos) {
  Object.assign(estado, { sesion, correo, campos });
  estado.original = Object.fromEntries(campos.map(c => [c.clave, String(c.valor)]));
  estado.actual = { ...estado.original };
  $('#edQuien').textContent = correo;
  pintarCampos();
  $('#edEntrar').hidden = true; $('#edApp').hidden = false;
  actualizar();
}

function crear(tag, props = {}, ...hijos) { const el = Object.assign(document.createElement(tag), props); el.append(...hijos); return el; }
function campoHTML(c) {
  const id = 'f_' + c.clave.replace(/\W/g, '_'), v = estado.actual[c.clave];
  const caja = crear('div', { className: 'ed-campo' });
  caja.dataset.clave = c.clave;
  const etiqueta = crear('label', { htmlFor: id, textContent: c.ayuda || c.clave });
  let control;
  if (c.tipo === 'largo') control = crear('textarea', { id, value: v, maxLength: 900 });
  else if (c.tipo === 'color') {
    const txt = crear('input', { id, value: v, maxLength: 7 }), rueda = crear('input', { type: 'color', value: VALIDO.color(v) ? v : '#000000' });
    rueda.setAttribute('aria-label', 'Elegir color');
    rueda.addEventListener('input', () => { txt.value = rueda.value.toUpperCase(); cambiar(c.clave, txt.value); });
    txt.addEventListener('input', () => { if (VALIDO.color(txt.value)) rueda.value = txt.value; });
    control = crear('div', { className: 'ed-color' }, rueda, txt); control.campo = txt;
  } else if (c.tipo === 'imagen') {
    const img = crear('img', { src: v, alt: '', hidden: !v }), vacia = crear('span', { className: 'ed-sin-foto', textContent: 'Sin foto', hidden: !!v });
    const archivo = crear('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
    archivo.dataset.foto = c.clave;
    const boton = crear('button', { type: 'button', className: 'btn btn-ghost btn-sm', textContent: v ? 'Cambiar foto' : 'Poner foto' });
    const quitar = crear('button', { type: 'button', className: 'linkish ed-quitar', textContent: 'Quitar foto', hidden: !v });
    boton.id = id; quitar.dataset.quitar = c.clave;
    boton.addEventListener('click', () => archivo.click());
    quitar.addEventListener('click', () => quitarFoto(c.clave));
    archivo.addEventListener('change', () => subirFoto(c.clave, archivo, img, boton));
    control = crear('div', { className: 'ed-foto' }, img, vacia, crear('div', { className: 'ed-foto-botones' }, boton, quitar), archivo);
  } else control = crear('input', { id, value: v, maxLength: c.tipo === 'texto' ? 160 : 200, type: c.tipo === 'enlace' ? 'url' : 'text', inputMode: c.tipo === 'whatsapp' ? 'tel' : 'text' });
  const campo = control.campo || control;
  if (campo.tagName !== 'DIV') campo.addEventListener('input', () => cambiar(c.clave, campo.value));
  caja.addEventListener('focusin', () => avisarVista({ tipo: 'pehn-resaltar', clave: c.clave }));
  caja.append(etiqueta, control, crear('small', { textContent: c.clave }));
  return caja;
}
function pintarCampos() {
  const cont = $('#edCampos'); cont.textContent = '';
  const grupos = new Map();
  estado.campos.forEach(c => { const g = grupoDe(c.clave); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(c); });
  grupos.forEach((lista, nombre) => cont.append(crear('section', { className: 'ed-grupo' }, crear('h2', { textContent: nombre }), ...lista.map(campoHTML))));
}
function cambiar(clave, valor) { estado.actual[clave] = valor; actualizar(); }

// foto vacía = la página la esconde (Sitio.gs acepta '' para las fotos)
function pintarFoto(clave) {
  const caja = document.querySelector(`.ed-campo[data-clave="${CSS.escape(clave)}"]`), v = estado.actual[clave];
  if (!caja) return;
  const img = caja.querySelector('img');
  img.hidden = !v; if (v) img.src = v;
  caja.querySelector('.ed-sin-foto').hidden = !!v; caja.querySelector('.ed-quitar').hidden = !v;
  caja.querySelector('.ed-foto-botones .btn').textContent = v ? 'Cambiar foto' : 'Poner foto';
}
function quitarFoto(clave) { cambiar(clave, ''); pintarFoto(clave); }

async function subirFoto(clave, archivo, img, boton) {
  const f = archivo.files[0]; archivo.value = '';
  if (!f) return;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return estadoPie('Sube una foto JPG, PNG o WEBP.', 'mal');
  boton.disabled = true; boton.textContent = 'Subiendo…';
  try {
    const dataUrl = await shrinkImage(f, 1600);
    const r = await api('editorFoto', { sesion: estado.sesion, dataUrl });
    cambiar(clave, r.url);
  } catch (err) { manejarError(err); } finally { boton.disabled = false; pintarFoto(clave); }
}

// ---------- vista previa ----------
const marco = $('#edFrame');
const avisarVista = m => marco.contentWindow?.postMessage(m, location.origin);
const valoresValidos = () => Object.fromEntries(estado.campos.filter(c => !VALIDO[c.tipo] || VALIDO[c.tipo](estado.actual[c.clave])).map(c => [c.clave, estado.actual[c.clave]]));
const tiposDe = () => Object.fromEntries(estado.campos.map(c => [c.clave, c.tipo]));
const campoDe = clave => document.querySelector(`.ed-campo[data-clave="${CSS.escape(clave)}"]`);
// lo que pasa en la página (edición directa, js/editor-vista.js)
addEventListener('message', e => {
  if (e.origin !== location.origin || e.source !== marco.contentWindow || !estado.sesion || !e.data) return;
  const { tipo, clave } = e.data, c = estado.campos.find(x => x.clave === clave);
  if (tipo === 'pehn-lista') avisarVista({ tipo: 'pehn-vista', sitio: valoresValidos(), tipos: tiposDe() });
  if (!c) return;
  if (tipo === 'pehn-cambio' && /^(texto|largo)$/.test(c.tipo)) {
    const valor = String(e.data.valor || '').slice(0, c.tipo === 'largo' ? 900 : 160);
    estado.actual[clave] = valor;
    const campo = campoDe(clave)?.querySelector('input,textarea'); if (campo) campo.value = valor;
    actualizar(false);
  }
  if (tipo === 'pehn-foco') {
    document.querySelectorAll('.ed-campo.activo').forEach(x => x.classList.remove('activo'));
    const caja = campoDe(clave); caja?.classList.add('activo'); caja?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  if (tipo === 'pehn-foto' && c.tipo === 'imagen') {
    if (e.data.accion === 'quitar') quitarFoto(clave);
    else document.querySelector(`input[data-foto="${CSS.escape(clave)}"]`)?.click();
  }
});
document.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-ver]').forEach(x => x.classList.toggle('on', x === b)); marco.src = b.dataset.ver;
}));
document.querySelectorAll('[data-ancho]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-ancho]').forEach(x => x.classList.toggle('on', x === b)); $('.ed-marco').classList.toggle('cel', !!b.dataset.ancho);
}));

// ---------- pie: estado, deshacer y guardar ----------
function estadoPie(texto, clase = '') { const s = $('#edEstado'); s.textContent = texto; s.className = clase; }
function actualizar(aVista = true) {
  let malos = 0, cambios = 0;
  document.querySelectorAll('.ed-campo').forEach(caja => {
    const c = estado.campos.find(x => x.clave === caja.dataset.clave), v = estado.actual[c.clave];
    const malo = VALIDO[c.tipo] && !VALIDO[c.tipo](v), cambio = v !== estado.original[c.clave];
    caja.classList.toggle('malo', !!malo); caja.classList.toggle('cambio', cambio);
    malos += malo ? 1 : 0; cambios += cambio ? 1 : 0;
  });
  $('#edGuardar').disabled = !cambios || malos > 0; $('#edDeshacer').disabled = !cambios;
  estadoPie(malos ? `Revisa ${malos} campo${malos > 1 ? 's' : ''} en rojo` : cambios ? `${cambios} cambio${cambios > 1 ? 's' : ''} sin guardar` : 'Sin cambios', malos ? 'mal' : '');
  if (aVista) avisarVista({ tipo: 'pehn-vista', sitio: valoresValidos(), tipos: tiposDe() });
}
$('#edDeshacer').addEventListener('click', () => { estado.actual = { ...estado.original }; pintarCampos(); actualizar(); });
$('#edGuardar').addEventListener('click', async () => {
  const cambios = Object.keys(estado.actual).filter(k => estado.actual[k] !== estado.original[k]).map(clave => ({ clave, valor: estado.actual[clave] }));
  $('#edGuardar').disabled = true; estadoPie('Guardando…');
  try {
    const r = await api('editorGuardar', { sesion: estado.sesion, cambios });
    abrirEditor(estado.sesion, estado.correo, r.campos);
    estadoPie('Guardado ✓ Ya está en la página (puede tardar hasta 5 minutos en todos los teléfonos).', 'ok');
  } catch (err) { manejarError(err); actualizar(); }
});
function manejarError(err) {
  if (/sesión venció/.test(err.message)) return salir('Tu sesión venció. Entra otra vez (tus cambios sin guardar se perdieron).');
  estadoPie(err.message, 'mal');
}
addEventListener('beforeunload', e => { if (estado.sesion && hayCambios()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- al abrir: si ya había sesión en esta pestaña, entra directo ----------
const previa = leerSesion();
if (previa?.sesion) {
  api('editorDatos', { sesion: previa.sesion }).then(r => abrirEditor(previa.sesion, previa.correo, r.campos)).catch(() => salir());
}
