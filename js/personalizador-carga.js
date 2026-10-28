/* Pehn Design — CARGA DEL PERSONALIZADOR: lo descarga solo cuando hace falta.
   El personalizador (js/personalizador*.js, js/zoom.js y css/personalizador*.css) pesa casi la mitad del catálogo y
   solo se usa al abrir un producto. Por eso la página NO lo trae al inicio: esta función lo pide la primera vez
   (con import() y un <link> agregado al vuelo) y las siguientes veces ya está en memoria.
   Esta es la única puerta: nadie más importa personalizador*.js. */
import { toast } from './modales.js';

// hoja de estilos -> la hoja ANTES de la cual se inserta (así queda en el mismo lugar de la cascada que tenía en el HTML)
const ESTILOS = [
  ['css/personalizador.css', 'css/carrito.css'],
  ['css/personalizador-movil.css', 'css/movimiento.css'],
];

// agrega un <link rel="stylesheet"> y espera a que cargue
function agregarEstilo(href, antesDe) {
  return new Promise((listo, fallo) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    link.onload = listo; link.onerror = () => fallo(new Error('No cargó ' + href));
    document.head.insertBefore(link, document.querySelector(`link[href="${antesDe}"]`));
  });
}

// La carga en curso (o ya hecha): así se descarga una sola vez. Si falla (sin internet) el navegador recuerda el
// error del módulo hasta recargar la página, por eso el aviso ofrece "Recargar" en vez de reintentar.
let promesa = null;
function cargar() {
  promesa ??= Promise.all([...ESTILOS.map(([href, antesDe]) => agregarEstilo(href, antesDe)), import('./personalizador.js')])
    .then(([, , modulo]) => { modulo.iniciarPersonalizador(); return modulo; });
  return promesa;
}

// Descarga el personalizador (si falta) y luego corre accion(modulo), por ejemplo p => p.openCard(3).
// `el` es el botón o tarjeta que se tocó: mientras carga lleva aria-busy="true" y se avisa a lectores de pantalla.
export async function conPersonalizador(accion, el) {
  el?.setAttribute('aria-busy', 'true');
  const aviso = setTimeout(() => toast('Abriendo el personalizador…'), 400); // solo si tarda
  let modulo;
  try {
    modulo = await cargar();
  } catch {
    toast('No se pudo abrir el personalizador. Revisa tu conexión y recarga la página.', { label: 'Recargar', run: () => location.reload() });
    return;
  } finally {
    clearTimeout(aviso);
    el?.removeAttribute('aria-busy');
  }
  accion(modulo);
}
