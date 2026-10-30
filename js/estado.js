/* Pehn Design — ESTADO COMPARTIDO: lo que dos o más módulos necesitan saber a la vez.
   Las variables son PRIVADAS de este archivo: nadie las toca directo; se leen y se cambian con las funciones de abajo.
   Así, para saber quién cambia el carrito basta buscar "agregarAlCarrito" o "quitarDelCarrito".
   No importa nada. Lo que usa un solo módulo vive en ese módulo (por ejemplo, el zoom está en zoom.js). */

// ---------- el carrito: [{ id, cfg, qty }] ----------
let carrito = [];
// copia de la lista (los renglones solo se leen; para cambiarlos usa las funciones de abajo)
export const leerCarrito = () => [...carrito];
// un renglón por su posición (undefined si no existe)
export const renglonDelCarrito = idx => carrito[idx];
// reemplaza todo el carrito (al cargar lo guardado en el navegador)
export function cargarCarrito(renglones) { carrito = renglones; }
// agrega un renglón al final
export function agregarAlCarrito(renglon) { carrito.push(renglon); }
// cambia el renglón de esa posición (al editar un diseño ya agregado)
export function reemplazarEnCarrito(idx, renglon) { carrito[idx] = renglon; }
// saca el renglón y lo regresa (para poder deshacer)
export function quitarDelCarrito(idx) { return carrito.splice(idx, 1)[0]; }
// vuelve a poner un renglón en su lugar (deshacer)
export function reinsertarEnCarrito(idx, renglon) { carrito.splice(idx, 0, renglon); }
// deja el carrito vacío
export function vaciarCarrito() { carrito = []; }

// ---------- el cajón del pedido: paso, datos del paso 1, comprobante y cuándo se mostró el formulario ----------
const caja = { vista: 'cart', datos: null, comprobante: '', ficha: '', pagador: '', desde: 0 };
// qué paso se ve: 'cart' | 'checkout' | 'anticipo'
export const vistaDeCaja = () => caja.vista;
export function irAVistaDeCaja(vista) { caja.vista = vista; }
// lo que la persona escribió en el paso 1 (null si aún nada)
export const datosDeCaja = () => caja.datos;
export function guardarDatosDeCaja(datos) { caja.datos = datos; }
// foto o PDF del comprobante YA VERIFICADO, como texto ('' si aún no hay), y la ficha que dio el servidor al verificarlo
export const comprobanteDeCaja = () => caja.comprobante;
export const fichaDeCaja = () => caja.ficha;
export function guardarComprobanteDeCaja(comprobante, ficha = '') { caja.comprobante = comprobante; caja.ficha = comprobante ? ficha : ''; }
// nombre del titular de la cuenta si paga otra persona ('' = paga el cliente)
export const pagadorDeCaja = () => caja.pagador;
export function guardarPagadorDeCaja(nombre) { caja.pagador = String(nombre || '').trim(); }
// anota la hora en que se mostró el formulario (solo la primera vez): el servidor rechaza envíos "instantáneos" de bots
export function marcarInicioDeFormulario() { if (!caja.desde) caja.desde = performance.now(); }
// milisegundos desde que se mostró el formulario
export const msDesdeElFormulario = () => Math.round(performance.now() - caja.desde);
// después de enviar el pedido: el cajón vuelve a empezar
export function reiniciarCaja() { Object.assign(caja, { vista: 'cart', datos: null, comprobante: '', ficha: '', pagador: '', desde: 0 }); }

// ---------- el diseño abierto en el personalizador ----------
// { p (producto), cfg (opciones elegidas), qty, editIdx (posición en el carrito, o null si es nuevo), fig (figura activa),
//   step, sub (¿pantalla de una figura?), stack (historial del teléfono), mov (¿teléfono?), open (secciones abiertas),
//   photo, photoPos, showPhoto (foto de referencia), start (para saber si hay cambios sin guardar), draft, done }
// Sigue disponible después de cerrar el modal (el historial del teléfono lo necesita un momento más).
let diseno = null;
// el diseño actual (null si nunca se abrió). Se puede leer; para cambiarlo usa las funciones de abajo.
// OJO: las opciones elegidas (diseno.cfg) son el documento que se edita y personalizador-eventos.js las modifica en el sitio.
export const disenoActual = () => diseno;
// empieza a trabajar con un diseño nuevo (lo arma personalizador.js)
export function abrirDiseno(nuevo) { diseno = nuevo; return diseno; }
// la figura que se edita (pestaña en escritorio, pantalla en teléfono)
export function cambiarFigura(i) { diseno.fig = i; }
// el paso del producto (0 es el primero)
export function setPaso(n) { diseno.step = n; }
// cantidad de piezas del diseño
export function setCantidad(qty) { diseno.qty = qty; }
// reemplaza las opciones y la cantidad (al seguir con un borrador)
export function reemplazarDiseno(cfg, qty) { diseno.cfg = cfg; diseno.qty = qty; diseno.fig = 0; }
// el borrador que se ofrece al abrir (o null cuando ya se decidió)
export function setBorrador(borrador) { diseno.draft = borrador; }
// foto real de referencia o dibujo propio en la vista previa
export function mostrarFotoDeReferencia(ver) { diseno.showPhoto = ver; }
// lo que hay ahora cuenta como "sin cambios" (se acaba de agregar al pedido)
export function marcarSinCambios() { diseno.start = JSON.stringify([diseno.cfg, diseno.qty]); }
// ya se agregó al pedido: al salir no hay borrador que guardar
export function marcarDisenoTerminado() { diseno.done = true; }

// pantallas del teléfono: cada una es una entrada del historial del navegador
// la pantalla a la que se va (un paso, o la de una figura); se agrega a la pila
export function apilarPantalla(step, sub) { diseno.step = step; diseno.sub = sub; diseno.stack.push({ step, sub }); }
// Atrás: se regresa a la pantalla número i de la pila y se descartan las de arriba
export function volverAPantalla(i) {
  diseno.stack.length = i + 1;
  diseno.step = diseno.stack[i].step; diseno.sub = diseno.stack[i].sub;
}
// la primera pantalla de la pila sigue siendo el paso en que se retomó el borrador
export function fijarPrimeraPantalla(step) { diseno.step = step; diseno.stack[0].step = step; }

// secciones plegables (teléfono): cuáles están abiertas
export const seccionAbierta = clave => diseno.open.has(clave);
export function abrirSeccion(clave, abrir) { if (abrir) diseno.open.add(clave); else diseno.open.delete(clave); }
export function dejarSoloSeccion(clave) { diseno.open = new Set([clave]); }
