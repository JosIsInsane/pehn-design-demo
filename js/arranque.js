/* Pehn Design — ARRANQUE: lo último que corre en cada página (revisión de datos.js, año del pie, catálogo).
   Va al final de la lista de scripts de la página. Depende de: base.js, datos.js, carrito.js; catalogo.js solo si la página tiene #grid. */

// Revisa datos.js al cargar y avisa en la consola (F12) con "[Pehn]" lo que esté mal y cómo arreglarlo.
function revisarDatos() {
  const avisa = m => console.warn('[Pehn] ' + m);
  CARDS.forEach((c, i) => { if (!productoDe(c.id)) avisa(`CARDS[${i}] usa el producto "${c.id}", que no existe en PRODUCTS (datos.js).`); });
  PRODUCTS.forEach(p => { if (!RENDER[p.render]) avisa(`El producto "${p.id}" usa render: '${p.render}', que no existe en RENDER (dibujos.js).`); });
  Object.entries(PORTADA).forEach(([k, l]) => l.forEach(i => { if (!CARDS[i]?.cfg || CARDS[i].id !== 'cuadro') avisa(`PORTADA.${k} usa la tarjeta ${i}, que no es un cuadro con cfg. Ajusta los números en datos.js.`); }));
  if (!CONFIG.whatsapp) avisa('Falta CONFIG.whatsapp en datos.js: los botones de WhatsApp no llevan número.');
  if (!CONFIG.sheetsUrl) avisa('Falta CONFIG.sheetsUrl en datos.js: los pedidos no se guardan en Google Sheets.');
}
revisarDatos();

if (!CONFIG.ordersEnabled) document.body.classList.add('locked');
$('#yr').textContent = new Date().getFullYear();
if ($('#grid')) iniciarCatalogo();
saveCart(); // pinta el contador del carrito con lo guardado
