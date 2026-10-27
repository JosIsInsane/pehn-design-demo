/**
 * Contenido del sitio que los dueños cambian sin tocar código: colores, textos, fotos y contacto.
 * - Se edita en el CRM › Sitio web (o directo en la hoja "Sitio", columna Valor).
 * - El sitio lo lee de ?api=sitio (público, solo esta hoja) y lo guarda en el navegador para cargar rápido.
 * - En el HTML, cada texto editable lleva data-edit="clave" y cada foto data-edit-img="clave".
 *
 * PARA AGREGAR UN CAMPO NUEVO: súmalo a SITIO_DEFAULTS (clave, valor inicial, tipo, ayuda), pon
 * data-edit="esa.clave" en el elemento del HTML y corre Pehn › Configurar hojas (agrega la fila sin borrar nada).
 * SI UN CAMBIO NO SE VE: el sitio guarda una copia por 5 minutos. Espera o recarga dos veces.
 */

// tipo: color | texto | largo (párrafo) | imagen | whatsapp | enlace
const SITIO_DEFAULTS = [
  ['color.marca', '#F08A1C', 'color', 'Color principal: botones y detalles.'],
  ['color.fondo', '#FBF7F2', 'color', 'Color de fondo de la página.'],
  ['color.texto', '#1E1611', 'color', 'Color de las letras. Debe leerse bien sobre el fondo.'],
  ['anuncio', 'Apruebas tu diseño antes de que lo hagamos', 'texto', 'Franja de arriba de todas las páginas.'],
  ['hero.titulo', 'Ustedes, en', 'texto', 'Título grande de la portada (parte normal).'],
  ['hero.resaltado', 'minifigura', 'texto', 'Palabra resaltada del título.'],
  ['hero.texto', 'Elige peinado, ropa, mascotas y la frase de su historia. Ves el cuadro y el precio mientras lo armas; nosotros lo hacemos a mano.', 'largo', 'Texto bajo el título.'],
  ['hero.foto', 'fotos/cuadro-amor.jpg', 'imagen', 'Foto grande de la portada (vertical).'],
  ['hero.foto.pie', 'Pedido real · Fer & Clau', 'texto', 'Leyenda de la foto de portada.'],
  ['seccion.categorias', 'Elige qué personalizar', 'texto', 'Título de la sección de categorías.'],
  ['seccion.destacados', 'Los más pedidos', 'texto', 'Título de la sección de pedidos reales.'],
  ['como.titulo', 'Así se hace un pedido', 'texto', 'Título de "Cómo funciona".'],
  ['como.1.titulo', 'Elige un diseño', 'texto', 'Paso 1.'],
  ['como.1.texto', 'Parte de un pedido real o empieza desde cero. Cuadros, figuras, ropa, bolsas y vasos.', 'largo', 'Paso 1.'],
  ['como.2.titulo', 'Hazlo suyo', 'texto', 'Paso 2.'],
  ['como.2.texto', 'Peinado, ropa, mascotas, nombres, colores y frase. La vista previa y el precio cambian al momento.', 'largo', 'Paso 2.'],
  ['como.3.titulo', 'Aprueba y recibe', 'texto', 'Paso 3.'],
  ['como.3.texto', 'Te mandamos tu diseño por WhatsApp, lo apruebas y lo armamos a mano para enviártelo.', 'largo', 'Paso 3.'],
  ['historia.titulo', 'Hecho a mano, pieza por pieza', 'texto', 'Título de la historia.'],
  ['historia.texto1', 'Pehn Design nació de las ganas de regalar algo que no se compra en cualquier tienda. Empezamos armando un cuadro para alguien especial y hoy cada pedido es una historia nueva: aniversarios, cumpleaños, familias completas y hasta mascotas.', 'largo', 'Primer párrafo de la historia.'],
  ['historia.texto2', 'Cada figura se elige pieza por pieza para que se parezca a ti, y cada cuadro se arma, se pinta y se empaca a mano.', 'largo', 'Segundo párrafo de la historia.'],
  ['historia.foto', 'fotos/cuadros-varios.jpg', 'imagen', 'Foto de la historia (taller o equipo).'],
  ['faq.extra.titulo', '¿Tienes otra idea?', 'texto', 'Recuadro junto a las preguntas.'],
  ['faq.extra.texto', 'Escríbenos y la armamos contigo. Pedidos de 5 piezas o más tienen 10% de descuento.', 'largo', 'Recuadro junto a las preguntas.'],
  ['faq.1.p', '¿Cuánto tarda mi pedido?', 'texto', 'Pregunta 1. Déjala vacía para ocultarla.'],
  ['faq.1.r', 'Producimos entre 5 y 8 días hábiles según el producto. Te confirmamos la fecha exacta al aprobar tu diseño.', 'largo', 'Respuesta 1.'],
  ['faq.2.p', '¿Cómo hacen que se parezcan a nosotros?', 'texto', 'Pregunta 2.'],
  ['faq.2.r', 'En el personalizador eliges lo básico y por WhatsApp puedes mandarnos fotos o detalles (lentes, tatuajes, peinado). Buscamos las piezas más parecidas.', 'largo', 'Respuesta 2.'],
  ['faq.3.p', '¿Veo el diseño antes de que lo hagan?', 'texto', 'Pregunta 3.'],
  ['faq.3.r', 'Sí. Te mandamos una vista previa para aprobar antes de producir.', 'largo', 'Respuesta 3.'],
  ['faq.4.p', '¿Cómo pago?', 'texto', 'Pregunta 4.'],
  ['faq.4.r', 'Pagas el 50% de anticipo al hacer tu pedido (subes el comprobante ahí mismo) y el resto al entregar. Tus pagos quedan en Mis pedidos.', 'largo', 'Respuesta 4.'],
  ['faq.5.p', '¿Hacen envíos?', 'texto', 'Pregunta 5.'],
  ['faq.5.r', 'Sí, enviamos a todo el país. El costo se calcula según tu ciudad.', 'largo', 'Respuesta 5.'],
  ['faq.6.p', '', 'texto', 'Pregunta 6 (opcional).'],
  ['faq.6.r', '', 'largo', 'Respuesta 6.'],
  ['pie', 'Cuadros con minifiguras y regalos personalizados, hechos a mano para historias únicas.', 'largo', 'Texto del pie de página.'],
  ['contacto.whatsapp', '', 'whatsapp', 'Número de WhatsApp con código de país, ej. 50498765432.'],
  ['contacto.instagram', 'https://www.instagram.com/pehn.designn/', 'enlace', 'Enlace de Instagram.'],
];
const SITIO_TIPOS = Object.fromEntries(SITIO_DEFAULTS.map(r => [r[0], r[2]]));
const SITIO_CACHE = 'sitio_v1';

// agrega las claves que falten sin tocar lo que los dueños ya cambiaron
function seedSitio_() {
  const sh = ss_().getSheetByName(SHEETS.sitio) || ss_().insertSheet(SHEETS.sitio);
  if (!sh.getLastRow()) ponerEncabezado_(sh, 'sitio');
  const hay = new Set(rows_('sitio').map(r => String(r.Clave)));
  const faltan = SITIO_DEFAULTS.filter(r => !hay.has(r[0]));
  if (faltan.length) sh.getRange(sh.getLastRow() + 1, 1, faltan.length, 4).setValues(faltan.map(fila_));
  sh.setColumnWidth(COL.sitio.Valor, 420);
}

// Valor limpio según su tipo; null = no válido (no se guarda)
function valorSitio_(tipo, v) {
  v = String(v == null ? '' : v).trim();
  switch (tipo) {
    case 'color': return /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
    case 'whatsapp': { const d = v.replace(/\D/g, ''); return !d || (d.length >= 8 && d.length <= 15) ? d : null; }
    case 'enlace': return !v || /^https:\/\/[\w.-]+\.[a-z]{2,}(\/[^\s"'<>]*)?$/i.test(v) ? v : null;
    case 'imagen': return /^(fotos\/[\w.-]+\.(jpe?g|png|webp)|https:\/\/(lh3\.googleusercontent\.com|drive\.google\.com)\/[\w/=?.-]+)$/i.test(v) ? v : null;
    case 'largo': return texto_(v, 900);
    default: return linea_(v, 160);
  }
}

// lo que ve el sitio: solo clave -> valor de esta hoja (nada de pedidos ni clientes)
function sitioPublico_() {
  const cache = CacheService.getScriptCache(), hit = cache.get(SITIO_CACHE);
  if (hit) return JSON.parse(hit);
  const out = {};
  rows_('sitio').forEach(r => {
    const k = String(r.Clave), tipo = SITIO_TIPOS[k] || String(r.Tipo || 'texto');
    const v = valorSitio_(tipo, r.Valor);
    if (v !== null) out[k] = v;
  });
  // datos de pago para el paso "Paga tu anticipo" del carrito (públicos a propósito)
  const cfg = config_();
  const pago = { pct: Number(cfg['Anticipo (%)']) || 50, banco: String(cfg['Datos bancarios'] || ''), antes: yes_(cfg['Anticipo antes de enviar'] ?? 'Sí') };
  const res = { ok: true, sitio: out, pago, v: Date.now() };
  cache.put(SITIO_CACHE, JSON.stringify(res), 300);
  return res;
}

function guardarSitio_(cambios) {
  if (!Array.isArray(cambios) || cambios.length > 200) throw new Error('Cambios inválidos.');
  const sh = sheet_('sitio'), filas = {};
  rows_('sitio').forEach(r => { filas[String(r.Clave)] = r._row; });
  const malos = [];
  cambios.forEach(c => {
    const k = String(c && c.clave), row = filas[k];
    if (!row) return malos.push(k);
    const v = valorSitio_(SITIO_TIPOS[k] || 'texto', c.valor);
    if (v === null) return malos.push(k);
    sh.getRange(row, COL.sitio.Valor).setValue(celda_(v));
  });
  CacheService.getScriptCache().remove(SITIO_CACHE);
  if (malos.length) throw new Error('No se guardaron (formato inválido): ' + malos.join(', '));
}

// foto subida desde el CRM -> carpeta "Sitio" en Drive, pública para que la vea el sitio
function subirImagenSitio_(dataUrl) {
  const dir = folder_(), sub = dir.getFoldersByName('Sitio'), carpeta = sub.hasNext() ? sub.next() : dir.createFolder('Sitio');
  const img = guardarImagen_(carpeta, dataUrl, 'sitio ' + Utilities.formatDate(now_(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH.mm'));
  if (!img || /pdf$/i.test(img.blob.getName())) throw new Error('Sube una foto JPG, PNG o WEBP de menos de 5 MB.');
  DriveApp.getFileById(img.id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://lh3.googleusercontent.com/d/${img.id}=w1600`;
}
