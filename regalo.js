/* Pehn Design — REGALOS: ocasiones (para filtrar y para el inicio) y extras que se agregan desde el carrito.
   Es un módulo de datos como datos.js (lo importa datos.js y los módulos de js/). Sin nada del navegador.

   CÓMO AGREGAR...
   - Una ocasión: súmala a OCASIONES con id, nombre, nota, color y su regla (prueba) o los ids de kits que la abren.
   - Un extra del carrito: súmalo a EXTRAS con la pieza (SKU) del CSV; el precio sale de piezas.js. */

import { precioDe } from './piezas.js';

// ---------- ocasiones ----------
// prueba(t): t = texto de la tarjeta (título, nombre, descripción, sin tildes y en minúsculas) + su estilo de cuadro (tpl)
export const OCASIONES = [
  { id: 'cumple', nombre: 'Cumpleaños', nota: 'Su día, a su manera', tint: '#FBD9A7',
    prueba: t => /cumple|birthday|gorrito|tarjeta|dulces|tpl:cumple/.test(t) },
  { id: 'novios', nombre: 'Aniversario y novios', nota: 'Para tu persona favorita', tint: '#F7C6D3',
    prueba: t => /tpl:(amor|aniv|calendario)|parejas|relicario|corazon|ramo|flores|collar|pulsera|mirada/.test(t) },
  { id: 'graduacion', nombre: 'Graduación', nota: 'Birrete, toga y su logro', tint: '#C9D6F2',
    prueba: t => /gradua|birrete|toga|retratera|minifigura personalizada|llavero minifigura/.test(t) },
  { id: 'mama', nombre: 'Día de la Madre', nota: 'Gracias por tanto', tint: '#E6D3F2',
    prueba: t => /mama|madre|relicario|joyero|ramo|flores|taza|termo|retratera|collar/.test(t) },
  { id: 'navidad', nombre: 'Navidad', nota: 'Pijamas, termos y su cuadro', tint: '#CDE6D2',
    prueba: t => /navidad|grinch|pijama|termo|taza/.test(t) },
];
export const ocasionDe = id => OCASIONES.find(o => o.id === id);
const plano = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// ocasiones de una tarjeta: las que diga la tarjeta (card.ocasion) o las que encajen por su texto
export function ocasionesDe(card, p) {
  if (card.ocasion) return [card.ocasion];
  const t = plano([card.title, p.name, card.desc, p.desc, p.sub, card.cfg?.tpl && 'tpl:' + card.cfg.tpl].join(' '));
  return OCASIONES.filter(o => o.prueba(t)).map(o => o.id);
}

// ---------- extras del carrito: un toque y van al pedido (no salen en el catálogo) ----------
const extra = (id, name, sku, bg, desc) => ({
  id, name, cat: 'regalos', sub: 'extras', base: 0, bg, desc, render: 'generico', extra: true, groups: [],
  variants: [{ o: {}, sku, price: precioDe(sku) }],
});
export const EXTRAS = [
  extra('x-dedicatoria', 'Dedicatoria escrita', 'DEDICATORIA', '#F4EDE4', 'Unas palabras tuyas, escritas a mano.'),
  extra('x-caja', 'Caja de regalo', 'CAJAS', '#F6B07A', 'Llega listo para regalar.'),
  extra('x-dulces', 'Dulces', 'DULCES', '#F7C6D3', 'Un toque dulce junto al regalo.'),
  extra('x-tarjeta', 'Tarjeta de cumpleaños', 'TARJETA-DE-CUMPLEANOS', '#FBD9A7', 'Para escribirle algo bonito.'),
];
