/* Pehn Design — WHATSAPP: enlaces y mensajes con el diseño o el pedido completo.
   Depende de: base.js, producto.js, carrito.js (cartTotals). Lo usan: cajón, checkout, personalizador y contenido editable. */

const waURL = text => `https://wa.me/${CONFIG.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const lineasDe = (p, cfg) => summary(p, cfg).map(([k, v]) => `• ${k}: ${v}`);

// mensaje con todo el carrito
function waCartText() {
  const { rows, total } = cartTotals();
  return [`${HOLA} Quiero hacer este pedido:`, '',
    ...rows.flatMap((r, n) => [`*${n + 1}. ${r.p.name}* ×${r.i.qty} — ${fmt(r.total)}`, ...lineasDe(r.p, r.i.cfg), '']),
    `Total estimado: *${fmt(total)}*`].join('\n');
}
// mensaje con un solo diseño (cuando los pedidos en línea están apagados)
function waText(p, cfg, qty) {
  const t = lineTotal(priceOf(p, cfg).unit, qty);
  const hasImg = p.groups.some(g => g.type === 'file' && cfg[g.id]);
  return [
    `${HOLA} Quiero este diseño:`, '',
    `*${p.name}* ×${qty}`,
    ...lineasDe(p, cfg), '',
    `Total estimado: *${fmt(t.total)}*${t.disc ? ` (incluye ${CONFIG.bulkPct}% de descuento)` : ''}`,
    hasImg ? '(Te mando mi imagen por aquí)' : '',
  ].join('\n').trim();
}
// los botones "WhatsApp" de la página llevan el número de CONFIG
const pintarWa = () => document.querySelectorAll('.wa-link').forEach(el => { el.href = waURL(`${HOLA} Quiero cotizar un diseño.`); });
pintarWa();
