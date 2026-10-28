/* Pehn Design — PRODUCTOS DE LA TIENDA (generado)
   NO se edita a mano: lo escribe herramientas/generar-tienda.js desde docs/inventario/catalogo-base.csv.
   Para cambiar un precio o una pieza: edita el CSV y corre  node herramientas/generar-tienda.js
   Lo importa datos.js. Cada producto tiene sus variantes (talla/color que existen) y el precio de cada una.
   Sin dibujo propio: usa render 'generico' (foto en fotos/tienda/<id>.jpg si existe, o tarjeta de color con el nombre). */

import { precioDe } from './piezas.js';

// categorías nuevas de la tienda
export const CATS_TIENDA = [
  ['joyeria', 'Joyería'],
  ['peluches', 'Peluches'],
  ['regalos', 'Regalos'],
  ['lego', 'Lego y sets'],
];

// subcategorías [categoría, id, nombre] (en orden de aparición, tras las de los personalizadores)
export const SUBS_TIENDA = [
  ['ropa', 'pijamas', 'Pijamas'],
  ['ropa', 'boxer', 'Boxer'],
  ['ropa', 'mamelucos', 'Mamelucos'],
  ['ropa', 'abrigos', 'Abrigos'],
  ['vasos', 'vasos', 'Vasos'],
  ['vasos', 'tazas', 'Tazas'],
  ['figuras', 'llaveros', 'Llaveros'],
  ['joyeria', 'collares', 'Collares'],
  ['joyeria', 'pulseras', 'Pulseras'],
  ['joyeria', 'dijes', 'Dijes'],
  ['joyeria', 'relicarios', 'Relicarios'],
  ['joyeria', 'joyeros', 'Joyeros'],
  ['lego', 'armables', 'Sets armables'],
  ['lego', 'cumple', 'Cumpleaños'],
  ['lego', 'estadios', 'Estadios'],
  ['lego', 'cajas-lego', 'Cajas Lego'],
  ['lego', 'sets', 'Sets Lego'],
  ['regalos', 'flores', 'Flores'],
  ['regalos', 'coleccion', 'Coleccionables'],
  ['regalos', 'otros', 'Otros detalles'],
];

// tv: variante con el precio de su pieza (PIEZAS)
const tv = (o, sku) => ({ o, sku, price: precioDe(sku) });
export const TIENDA = [
  { id: 't-boxer', name: 'Boxer', cat: 'ropa', sub: 'boxer', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }] }, { id: 'size', label: 'Talla', type: 'choice', options: [{ v: 'S', label: 'S', price: 0 }, { v: 'M', label: 'M', price: 0 }, { v: 'L', label: 'L', price: 0 }, { v: 'XL', label: 'XL', price: 0 }] }],
    variants: [
      tv({ color: '#FFFDF9', size: 'L' }, 'BOX-L-BLA'),
      tv({ color: '#2A1A0E', size: 'L' }, 'BOX-L-NEG'),
      tv({ color: '#FFFDF9', size: 'M' }, 'BOX-M-BLA'),
      tv({ color: '#2A1A0E', size: 'M' }, 'BOX-M-NEG'),
      tv({ color: '#FFFDF9', size: 'S' }, 'BOX-S-BLA'),
      tv({ color: '#2A1A0E', size: 'S' }, 'BOX-S-NEG'),
      tv({ color: '#FFFDF9', size: 'XL' }, 'BOX-XL-BLA'),
      tv({ color: '#2A1A0E', size: 'XL' }, 'BOX-XL-NEG'),
    ] },
  { id: 't-tarjeta-de-cumpleanos', name: 'Tarjeta de cumpleaños', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'TARJETA-DE-CUMPLEANOS'),
    ] },
  { id: 't-caja-lego', name: 'Caja Lego', cat: 'lego', sub: 'cajas-lego', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'CAJA-LEGO'),
    ] },
  { id: 't-cajas', name: 'Cajas', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'CAJAS'),
    ] },
  { id: 't-collar-2-dijes', name: 'Collar 2 dijes', cat: 'joyeria', sub: 'collares', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'COLLAR-2-DIJES'),
    ] },
  { id: 't-collar-dije-circular', name: 'Collar dije circular', cat: 'joyeria', sub: 'collares', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'COLLAR-DIJE-CIRCULAR'),
    ] },
  { id: 't-dije-de-moto', name: 'Dije de moto', cat: 'joyeria', sub: 'dijes', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'DIJE-DE-MOTO'),
    ] },
  { id: 't-pulsera-de-mirada', name: 'Pulsera de mirada', cat: 'joyeria', sub: 'pulseras', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PULSERA-DE-MIRADA'),
    ] },
  { id: 't-collar-de-mirada', name: 'Collar de mirada', cat: 'joyeria', sub: 'collares', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#D8CFC4', label: 'Estándar', price: 0 }, { v: '#D9B44A', label: 'Dorado', price: 0 }] }],
    variants: [
      tv({ color: '#D8CFC4' }, 'COLLAR-DE-MIRADA'),
      tv({ color: '#D9B44A' }, 'COLLAR-DE-MIRADA-DOR'),
    ] },
  { id: 't-moto-collar-dije-inicial', name: 'Moto - collar + dije inicial', cat: 'joyeria', sub: 'collares', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'COL-MOTO-COLLAR-DIJE-INICIAL'),
    ] },
  { id: 't-relicario', name: 'Relicario', cat: 'joyeria', sub: 'relicarios', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#C9CDD2', label: 'Plata', price: 0 }, { v: '#D9B44A', label: 'Dorado', price: 0 }] }],
    variants: [
      tv({ color: '#C9CDD2' }, 'RELICARIO-PLA'),
      tv({ color: '#D9B44A' }, 'RELICARIO-DOR'),
    ] },
  { id: 't-relicario-libro', name: 'Relicario libro', cat: 'joyeria', sub: 'relicarios', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#C9CDD2', label: 'Plata', price: 0 }, { v: '#D9B44A', label: 'Dorado', price: 0 }] }],
    variants: [
      tv({ color: '#C9CDD2' }, 'RELICARIO-LIBRO-PLA'),
      tv({ color: '#D9B44A' }, 'RELICARIO-LIBRO-DOR'),
    ] },
  { id: 't-mini-photobooth', name: 'Mini Photobooth', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PHO-MINI-PHOTOBOOTH'),
    ] },
  { id: 't-llavero-instax', name: 'Llavero Instax', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'INS-LLAVERO-INSTAX'),
    ] },
  { id: 't-estadio-camp-nou', name: 'Estadio Camp Nou', cat: 'lego', sub: 'estadios', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'EST-CAMP-NOU'),
    ] },
  { id: 't-estadio-santiago-bernabeu', name: 'Estadio Santiago Bernabéu', cat: 'lego', sub: 'estadios', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'EST-SANTIAGO-BERNABEU'),
    ] },
  { id: 't-ramo-de-flores', name: 'Ramo de flores', cat: 'regalos', sub: 'flores', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#F6D64A', label: 'Amarillo', price: 0 }, { v: '#3E6E8E', label: 'Azul', price: 0 }, { v: '#F08A1C', label: 'Naranja', price: 0 }, { v: '#F48FB1', label: 'Rosa', price: 0 }] }],
    variants: [
      tv({ color: '#F6D64A' }, 'FLO-RAMO-AMA'),
      tv({ color: '#3E6E8E' }, 'FLO-RAMO-AZU'),
      tv({ color: '#F08A1C' }, 'FLO-RAMO-NAR'),
      tv({ color: '#F48FB1' }, 'FLO-RAMO-RSA'),
    ] },
  { id: 't-funko-messi', name: 'Funko Messi', cat: 'regalos', sub: 'coleccion', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'FUNKO-MESSI'),
    ] },
  { id: 't-funko-cr7', name: 'Funko CR7', cat: 'regalos', sub: 'coleccion', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'FUNKO-CR7'),
    ] },
  { id: 't-sueter', name: 'Suéter', cat: 'ropa', sub: 'abrigos', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#2F8F5B', label: 'Verde', price: 0 }, { v: '#1F5A3A', label: 'Verde oscuro', price: 0 }] }, { id: 'size', label: 'Talla', type: 'choice', options: [{ v: 'S', label: 'S', price: 0 }, { v: 'M', label: 'M', price: 0 }, { v: 'L', label: 'L', price: 0 }, { v: 'XL', label: 'XL', price: 0 }] }],
    variants: [
      tv({ color: '#FFFDF9', size: 'L' }, 'SUE-L-BLA'),
      tv({ color: '#2A1A0E', size: 'L' }, 'SUE-L-NEG'),
      tv({ color: '#FFFDF9', size: 'M' }, 'SUE-M-BLA'),
      tv({ color: '#2A1A0E', size: 'M' }, 'SUE-M-NEG'),
      tv({ color: '#FFFDF9', size: 'S' }, 'SUE-S-BLA'),
      tv({ color: '#2A1A0E', size: 'S' }, 'SUE-S-NEG'),
      tv({ color: '#2A1A0E', size: 'XL' }, 'SUE-XL-NEG'),
      tv({ color: '#2F8F5B', size: 'M' }, 'SUE-M-VER'),
      tv({ color: '#1F5A3A', size: 'M' }, 'SUE-M-VEO'),
    ] },
  { id: 't-hot-wheels', name: 'Hot Wheels', cat: 'regalos', sub: 'coleccion', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'HOTWHEELS'),
    ] },
  { id: 't-hotwheel-personalizado', name: 'Hotwheel personalizado', cat: 'regalos', sub: 'coleccion', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'HOTWHEEL-PERSONALIZADO'),
    ] },
  { id: 't-joyero', name: 'Joyero', cat: 'joyeria', sub: 'joyeros', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#F7B6C8', label: 'Rosado', price: 0 }, { v: '#FFFDF9', label: 'Blanco', price: 0 }] }],
    variants: [
      tv({ color: '#F7B6C8' }, 'JOYERO-ROS'),
      tv({ color: '#FFFDF9' }, 'JOYERO-BLA'),
    ] },
  { id: 't-lampara-de-letra', name: 'Lámpara de letra', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LAMPARA-DE-LETRA'),
    ] },
  { id: 't-f1-lego', name: 'F1 Lego', cat: 'lego', sub: 'sets', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LEG-F1-LEGO'),
    ] },
  { id: 't-relicario-ovalo', name: 'Relicario óvalo', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#D9B44A', label: 'Dorado', price: 0 }, { v: '#A9AEB4', label: 'Plateado', price: 0 }] }],
    variants: [
      tv({ color: '#D9B44A' }, 'LLA-RELICARIO-OVALO-DOR'),
      tv({ color: '#A9AEB4' }, 'LLA-RELICARIO-OVALO-PLT'),
    ] },
  { id: 't-relicario-corazon', name: 'Relicario corazón', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-RELICARIO-CORAZON-PLT'),
    ] },
  { id: 't-llavero-acrilico', name: 'Llavero acrílico', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-ACRILICO'),
    ] },
  { id: 't-llavero-acrilico-circulo', name: 'Llavero acrílico círculo', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-ACRILICO-CIRCULO'),
    ] },
  { id: 't-llavero-sublimado', name: 'Llavero sublimado', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-SUBLIMADO'),
    ] },
  { id: 't-llaveros-legos-2', name: 'Llaveros Legos (2)', cat: 'lego', sub: 'sets', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LEG-LLAVEROS-LEGOS-2'),
    ] },
  { id: 't-caja-pequena-happy-birthday', name: 'Caja pequeña Happy Birthday', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'CAJA-PEQUENA-HAPPY-BIRTHDAY'),
    ] },
  { id: 't-altar-set-armable', name: 'Altar set armable', cat: 'lego', sub: 'armables', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'ARM-ALTAR-SET-ARMABLE'),
    ] },
  { id: 't-cabana-set-armable', name: 'Cabaña set armable', cat: 'lego', sub: 'armables', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'ARM-CABANA-SET-ARMABLE'),
    ] },
  { id: 't-up-set-armable', name: 'UP set armable', cat: 'lego', sub: 'armables', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'ARM-UP-SET-ARMABLE'),
    ] },
  { id: 't-medico-armable', name: 'Médico armable', cat: 'lego', sub: 'armables', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'ARM-MEDICO-ARMABLE'),
    ] },
  { id: 't-cumpleanos-lego', name: 'Cumpleaños Lego', cat: 'lego', sub: 'cumple', base: 0, bg: '#F6952A', desc: 'Sets y piezas Lego para armar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'CUMPLEANOS-LEGO'),
    ] },
  { id: 't-llavero-gwen', name: 'Llavero Gwen', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-GWEN'),
    ] },
  { id: 't-llavero-spiderman', name: 'Llavero Spiderman', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-SPIDERMAN'),
    ] },
  { id: 't-llavero-batman', name: 'Llavero Batman', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-BATMAN'),
    ] },
  { id: 't-llavero-batgirl', name: 'Llavero Batgirl', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-BATGIRL'),
    ] },
  { id: 't-llavero-rayo', name: 'Llavero Rayo', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-RAYO'),
    ] },
  { id: 't-llavero-sally', name: 'Llavero Sally', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLAVERO-SALLY'),
    ] },
  { id: 't-llavero-lego-messi-argentina', name: 'Llavero Lego Messi Argentina', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-MESSI-ARGENTINA'),
    ] },
  { id: 't-llavero-lego-cr7-manchester-united', name: 'Llavero Lego CR7 Manchester United', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-CR7-MANCHESTER-UNITED'),
    ] },
  { id: 't-llavero-lego-cr7-portugal', name: 'Llavero Lego CR7 Portugal', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-CR7-PORTUGAL'),
    ] },
  { id: 't-llavero-lego-cr7-real-madrid', name: 'Llavero Lego CR7 Real Madrid', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-CR7-REAL-MADRID'),
    ] },
  { id: 't-llavero-lego-cr7-juventus', name: 'Llavero Lego CR7 Juventus', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-CR7-JUVENTUS'),
    ] },
  { id: 't-llavero-lego-cr7-al-nassr', name: 'Llavero Lego CR7 Al Nassr', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-CR7-AL-NASSR'),
    ] },
  { id: 't-llavero-lego-messi-inter-de-miami', name: 'Llavero Lego Messi Inter de Miami', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-MESSI-INTER-DE-MIAMI'),
    ] },
  { id: 't-llavero-lego-messi-psg', name: 'Llavero Lego Messi PSG', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-MESSI-PSG'),
    ] },
  { id: 't-llavero-lego-messi-barcelona', name: 'Llavero Lego Messi Barcelona', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-MESSI-BARCELONA'),
    ] },
  { id: 't-llavero-lego-neymar-brasil', name: 'Llavero Lego Neymar Brasil', cat: 'figuras', sub: 'llaveros', base: 0, bg: '#8EC5F2', desc: 'Llavero listo para regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'LLA-NEYMAR-BRASIL'),
    ] },
  { id: 't-mameluco', name: 'Mameluco', cat: 'ropa', sub: 'mamelucos', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#FFFDF9', label: 'Blanco', price: 0 }] }],
    variants: [
      tv({ color: '#2A1A0E' }, 'MAMELUCO-NEG'),
      tv({ color: '#FFFDF9' }, 'MAMELUCO-BLA'),
    ] },
  { id: 't-peluche-snoopy', name: 'Peluche Snoopy', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-SNOOPY'),
    ] },
  { id: 't-peluche-snoopy-pequeno', name: 'Peluche Snoopy pequeño', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-SNOOPY-PEQUENO'),
    ] },
  { id: 't-peluche-coneja-amargada', name: 'Peluche Coneja amargada', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-CONEJA-AMARGADA'),
    ] },
  { id: 't-peluche-spiderman', name: 'Peluche Spiderman', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-SPIDERMAN'),
    ] },
  { id: 't-peluche-rayo-mcqueen', name: 'Peluche Rayo McQueen', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-RAYO-MCQUEEN'),
    ] },
  { id: 't-peluche-batman', name: 'Peluche Batman', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-BATMAN'),
    ] },
  { id: 't-peluche-stitch', name: 'Peluche Stitch', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-STITCH'),
    ] },
  { id: 't-peluche-pinguino', name: 'Peluche Pingüino', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-PINGUINO'),
    ] },
  { id: 't-peluche-stitch-anticolicos', name: 'Peluche Stitch anticólicos', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-STITCH-ANTICOLICOS'),
    ] },
  { id: 't-peluche-lotso-anticolicos', name: 'Peluche Lotso anticólicos', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-LOTSO-ANTICOLICOS'),
    ] },
  { id: 't-peluche-pinguino-hombre', name: 'Peluche Pingüino hombre', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-PINGUINO-HOMBRE'),
    ] },
  { id: 't-peluche-pinguino-mujer', name: 'Peluche Pingüino mujer', cat: 'peluches', base: 0, bg: '#FFD23F', desc: 'Peluche suave para abrazar y regalar.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PEL-PINGUINO-MUJER'),
    ] },
  { id: 't-pijama-cuadros-rojos', name: 'Pijama cuadros rojos', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'size', label: 'Talla', type: 'choice', options: [{ v: 'S', label: 'S', price: 0 }, { v: 'M', label: 'M', price: 0 }, { v: 'L', label: 'L', price: 0 }, { v: 'XL', label: 'XL', price: 0 }] }],
    variants: [
      tv({ size: 'L' }, 'PIJAMA-CUADROS-ROJOS-L'),
      tv({ size: 'M' }, 'PIJAMA-CUADROS-ROJOS-M'),
      tv({ size: 'S' }, 'PIJAMA-CUADROS-ROJOS-S'),
      tv({ size: 'XL' }, 'PIJAMA-CUADROS-ROJOS-XL'),
    ] },
  { id: 't-pijama-navidad-hello-kitty', name: 'Pijama Navidad Hello Kitty', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PIJAMA-NAVIDAD-HELLO-KITTY'),
    ] },
  { id: 't-pijama-spiderkitty', name: 'Pijama Spiderkitty', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#D9363E', label: 'Rojo', price: 0 }, { v: '#F48FB1', label: 'Rosa', price: 0 }] }],
    variants: [
      tv({ color: '#2A1A0E' }, 'PIJAMA-SPIDERKITTY-NEG'),
      tv({ color: '#D9363E' }, 'PIJAMA-SPIDERKITTY-ROJ'),
      tv({ color: '#F48FB1' }, 'PIJAMA-SPIDERKITTY-RSA'),
    ] },
  { id: 't-pijama-batikitty', name: 'Pijama Batikitty', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PIJAMA-BATIKITTY'),
    ] },
  { id: 't-pijama-spiderman', name: 'Pijama Spiderman', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PIJAMA-SPIDERMAN'),
    ] },
  { id: 't-pijama-grinch', name: 'Pijama Grinch', cat: 'ropa', sub: 'pijamas', base: 0, bg: '#BDE7C9', desc: 'Pídela en la talla y el color que quieras.', render: 'generico',
    groups: [{ id: 'size', label: 'Talla', type: 'choice', options: [{ v: 'S', label: 'S', price: 0 }, { v: 'M', label: 'M', price: 0 }, { v: 'L', label: 'L', price: 0 }] }],
    variants: [
      tv({ size: 'S' }, 'PIJAMA-GRINCH-S'),
      tv({ size: 'M' }, 'PIJAMA-GRINCH-M'),
      tv({ size: 'L' }, 'PIJAMA-GRINCH-L'),
    ] },
  { id: 't-placas-acrilico', name: 'Placas acrílico', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'PLACAS-ACRILICO'),
    ] },
  { id: 't-retratera-3d', name: 'Retratera 3D', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'RETRATERA-3D'),
    ] },
  { id: 't-retratera-3d-pequena', name: 'Retratera 3D pequeña', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'RETRATERA-3D-PEQUENA'),
    ] },
  { id: 't-retratera-3d-grande', name: 'Retratera 3D grande', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'RETRATERA-3D-GRANDE'),
    ] },
  { id: 't-retratera', name: 'Retratera', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#9A9A9E', label: 'Gris', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }] }],
    variants: [
      tv({ color: '#FFFDF9' }, 'RETRATERA-BLA'),
      tv({ color: '#9A9A9E' }, 'RETRATERA-GRI'),
      tv({ color: '#2A1A0E' }, 'RETRATERA-NEG'),
    ] },
  { id: 't-retratera-mini', name: 'Retratera mini', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }] }],
    variants: [
      tv({ color: '#FFFDF9' }, 'RETRATERA-MINI-BLA'),
      tv({ color: '#2A1A0E' }, 'RETRATERA-MINI-NEG'),
    ] },
  { id: 't-retratera-pequena', name: 'Retratera pequeña', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'RETRATERA-PEQUENA-NEG'),
    ] },
  { id: 't-stickers', name: 'Stickers', cat: 'regalos', sub: 'otros', base: 0, bg: '#F6B07A', desc: 'Un detalle para sorprender.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'STICKERS'),
    ] },
  { id: 't-pulsera', name: 'Pulsera', cat: 'joyeria', sub: 'pulseras', base: 0, bg: '#F7B6C8', desc: 'Joyería para regalar, en el acabado que prefieras.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#D9B44A', label: 'Dorado', price: 0 }, { v: '#A9AEB4', label: 'Plateado', price: 0 }] }],
    variants: [
      tv({ color: '#D9B44A' }, 'PULSERA-DOR'),
      tv({ color: '#A9AEB4' }, 'PULSERA-PLT'),
    ] },
  { id: 't-taza-peltre', name: 'Taza peltre', cat: 'vasos', sub: 'tazas', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#D9363E', label: 'Rojo', price: 0 }] }],
    variants: [
      tv({ color: '#2A1A0E' }, 'TAZ-PEL-NEG'),
      tv({ color: '#D9363E' }, 'TAZ-PEL-ROJ'),
    ] },
  { id: 't-vaso-plastico', name: 'Vaso plástico', cat: 'vasos', sub: 'vasos', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'VASO-PLASTICO-TRA'),
    ] },
  { id: 't-vaso-sublimado', name: 'Vaso sublimado', cat: 'vasos', sub: 'vasos', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'VASO-SUBLIMADO'),
    ] },
  { id: 't-vaso-iconico', name: 'Vaso icónico', cat: 'vasos', sub: 'vasos', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [{ id: 'color', label: 'Color', type: 'swatch', options: [{ v: '#D9363E', label: 'Rojo', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }] }],
    variants: [
      tv({ color: '#D9363E' }, 'VASO-ICONICO-ROJ'),
      tv({ color: '#2A1A0E' }, 'VASO-ICONICO-NEG'),
    ] },
  { id: 't-vaso-de-vidrio', name: 'Vaso de vidrio', cat: 'vasos', sub: 'vasos', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'VASO-DE-VIDRIO-TRA'),
    ] },
  { id: 't-vaso-sublimado-navidad', name: 'Vaso sublimado Navidad', cat: 'vasos', sub: 'vasos', base: 0, bg: '#B9A2F0', desc: 'Elige el color y pídelo para regalar o para ti.', render: 'generico',
    groups: [],
    variants: [
      tv({  }, 'VASO-SUBLIMADO-NAVIDAD'),
    ] },
];
