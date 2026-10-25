/* Pehn Design — catálogo + personalizador
   Precios de ejemplo: ajustar en PRODUCTS. Envío del pedido: ver submitOrder(). */

const CONFIG = {
  currency: 'MXN',          // TODO: confirmar moneda / país con cliente
  locale: 'es-MX',
  bulkMin: 5,               // descuento por volumen desde N piezas
  bulkPct: 10,
  ordersEnabled: true,      // false = sin carrito, cada diseño se pide directo por WhatsApp
  whatsapp: '',             // TODO: número con lada, ej. '5215512345678'
};

const fmt = n => new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency, maximumFractionDigits: 0 }).format(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
let UID = 0; // ids únicos para gradientes/filtros dentro de cada SVG

function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (p < 0 ? c : 255 - c) * p)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const isLight = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 170; };

/* ---------- paletas ---------- */
const SKIN = [['#F6D3B3', 'Claro'], ['#E8B98F', 'Medio'], ['#C68B5E', 'Canela'], ['#8A5634', 'Oscuro'], ['#FFD23F', 'Amarillo clásico']];
const HAIRC = [['#1F1712', 'Negro'], ['#5A3720', 'Castaño'], ['#A8692E', 'Miel'], ['#E9C46A', 'Rubio'], ['#B03A2E', 'Pelirrojo'], ['#B9B4AE', 'Canoso'], ['#E45A84', 'Rosa']];
const CLOTH = [['#1F2A44', 'Marino'], ['#2A1A0E', 'Negro'], ['#FFFDF9', 'Blanco'], ['#9BB0C9', 'Gris azul'], ['#C9B46A', 'Mostaza'], ['#8E9C5A', 'Olivo'], ['#D9363E', 'Rojo'], ['#F48FB1', 'Rosa'], ['#3E6E8E', 'Azul'], ['#E9D8B4', 'Beige']];
const PANTS = [['#2E4A8C', 'Mezclilla'], ['#6FA8DC', 'Azul claro'], ['#1F1712', 'Negro'], ['#B39B6E', 'Caqui'], ['#F1EBDD', 'Blanco'], ['#1F2A44', 'Marino']];
const HEART = [['#F48FB1', 'Rosa'], ['#8EC5F2', 'Azul'], ['#D9363E', 'Rojo'], ['#7CC68A', 'Verde'], ['#B9A2F0', 'Lila'], ['#F6B07A', 'Durazno'], ['none', 'Sin corazón']];
const sw = arr => arr.map(([v, label]) => ({ v, label, price: 0 }));
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const FONTS = { groovy: "'Bagel Fat One'", clasica: "'Outfit'", script: "'Pacifico'", serif: "'Playfair Display'", college: "'Alfa Slab One'", firma: "'Great Vibes'" };

/* ---------- opciones de cada figura ---------- */
const FIG_GROUPS = [
  { id: 'name', label: 'Nombre', type: 'text', max: 12, placeholder: 'Ej. Fer' },
  { id: 'skin', label: 'Tono de piel', type: 'swatch', options: sw(SKIN) },
  { id: 'hair', label: 'Peinado', type: 'choice', options: [
    { v: 'corto', label: 'Corto', price: 0 }, { v: 'lado', label: 'De lado', price: 0 },
    { v: 'largo', label: 'Largo', price: 0 }, { v: 'ondas', label: 'Ondulado', price: 0 },
    { v: 'chongo', label: 'Chongo', price: 0 }, { v: 'rizos', label: 'Rizos', price: 0 },
    { v: 'sombrero', label: 'Sombrero', price: 25 }, { v: 'vaquero', label: 'Vaquero', price: 25 },
    { v: 'calvo', label: 'Sin cabello', price: 0 }] },
  { id: 'hairColor', label: 'Color de cabello', type: 'swatch', options: sw(HAIRC), showIf: c => c.hair !== 'calvo' },
  { id: 'face', label: 'Cara', type: 'choice', options: [
    { v: 'feliz', label: 'Sonrisa', price: 0 }, { v: 'labios', label: 'Labios rojos', price: 0 },
    { v: 'lentes', label: 'Lentes', price: 15 }, { v: 'barba', label: 'Barba', price: 15 }, { v: 'guino', label: 'Guiño', price: 0 }] },
  { id: 'outfit', label: 'Ropa', type: 'choice', options: [
    { v: 'playera', label: 'Playera', price: 0 }, { v: 'blusa', label: 'Blusa', price: 0 },
    { v: 'sueter', label: 'Suéter', price: 20 }, { v: 'cuadros', label: 'Camisa a cuadros', price: 20 },
    { v: 'traje', label: 'Traje', price: 30 }, { v: 'vestido', label: 'Vestido', price: 30 },
    { v: 'texto', label: 'Con texto', price: 35 }] },
  { id: 'torso', label: 'Color de ropa', type: 'swatch', options: sw(CLOTH) },
  { id: 'printText', label: 'Texto en playera', type: 'text', max: 6, placeholder: 'Ej. PAPÁ', showIf: c => c.outfit === 'texto' },
  { id: 'legs', label: 'Color de pantalón', type: 'swatch', options: sw(PANTS), showIf: c => c.outfit !== 'vestido' },
];
const FIG_PRESETS = [
  { name: 'Fer', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'feliz', outfit: 'sueter', torso: '#1F2A44', legs: '#B39B6E', printText: '' },
  { name: 'Clau', skin: '#E8B98F', hair: 'chongo', hairColor: '#1F1712', face: 'labios', outfit: 'blusa', torso: '#E9C88A', legs: '#1F2A44', printText: '' },
  { name: 'Alberto', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'lentes', outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712', printText: '' },
  { name: 'Ángela', skin: '#F6D3B3', hair: 'largo', hairColor: '#1F1712', face: 'labios', outfit: 'playera', torso: '#D9363E', legs: '#F1EBDD', printText: '' },
  { name: 'Leo', skin: '#C68B5E', hair: 'rizos', hairColor: '#1F1712', face: 'guino', outfit: 'texto', torso: '#F6952A', legs: '#2E4A8C', printText: 'LEO' },
  { name: 'Vale', skin: '#F6D3B3', hair: 'ondas', hairColor: '#A8692E', face: 'feliz', outfit: 'vestido', torso: '#F48FB1', legs: '#2E4A8C', printText: '' },
];
const figDefault = i => ({ ...FIG_PRESETS[i % FIG_PRESETS.length], name: '' });

// estilos rápidos: cambian la figura activa de un toque (se conserva el nombre)
const LOOKS = [
  { label: 'Casual él', f: { hair: 'corto', face: 'feliz', outfit: 'playera', torso: '#3E6E8E', legs: '#2E4A8C' } },
  { label: 'Casual ella', f: { hair: 'largo', face: 'labios', outfit: 'blusa', torso: '#F48FB1', legs: '#1F1712' } },
  { label: 'Novio', f: { hair: 'lado', face: 'feliz', outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712' } },
  { label: 'Novia', f: { hair: 'chongo', face: 'labios', outfit: 'vestido', torso: '#FFFDF9' } },
  { label: 'Vaquero', f: { hair: 'vaquero', hairColor: '#5A3720', face: 'feliz', outfit: 'cuadros', torso: '#3E6E8E', legs: '#1F1712' } },
];

const TEXTS = {
  amor: 'Es el acto de dar sin esperar nada a cambio, es querer compartir el ahora, el hoy y siempre. Es un entrelazamiento entre dos almas, un cálido abrazo y un café especial.',
  amor2: 'Persona única capaz de transformar la soledad en compañía, la rutina en magia y cualquier lugar en un verdadero hogar.',
  cumple: 'Usted es pieza clave en la construcción diaria de nuestros anhelos. Hasta que deje de respirar.',
  aniv: 'Gracias por cada día a tu lado. Por muchos años más construyendo juntos.',
  cal: 'Dios tejió nuestro amor con hilos de luz y esperanza, y en cada abrazo tuyo encontré mi hogar.',
  frase: 'Te adoro mi monito precioso ♥',
};

/* ---------- productos ---------- */
const PRODUCTS = [
  {
    id: 'cuadro', name: 'Cuadro con minifiguras', cat: 'cuadros', base: 390, badge: 'Más pedido', bg: '#F48FB1',
    desc: 'Marco de profundidad con sus minifiguras, sus nombres, corazón en spray y su frase.',
    render: 'frame',
    steps: ['Figuras', 'Diseño', 'Texto', 'Marco'],
    groups: [
      { step: 0, id: 'figs', label: 'Figuras', type: 'figs', min: 1, max: 4, pricePer: 180 },
      { step: 0, id: 'cats', label: 'Gatitos', type: 'stepper', min: 0, max: 3, pricePer: 70, note: 'c/u' },
      { step: 0, id: 'dogs', label: 'Perritos', type: 'stepper', min: 0, max: 3, pricePer: 70, note: 'c/u' },
      { step: 1, id: 'tpl', label: 'Estilo', type: 'choice', options: [
        { v: 'amor', label: 'Definición', price: 0 }, { v: 'cumple', label: 'Happy Birthday', price: 0 },
        { v: 'calendario', label: 'Calendario', price: 30 }, { v: 'frase', label: 'Frase', price: 0 },
        { v: 'aniv', label: 'Dedicatoria', price: 0 }, { v: 'libre', label: 'Solo nombres', price: 0 }] },
      { step: 1, id: 'heart', label: 'Corazón en spray', type: 'swatch', options: sw(HEART) },
      { step: 1, id: 'deco', label: 'Detalle', type: 'choice', options: [
        { v: 'ninguno', label: 'Ninguno', price: 0 }, { v: 'brillos', label: 'Brillitos', price: 0 },
        { v: 'estrella', label: 'Estrella dorada', price: 0 }, { v: 'corazones', label: 'Corazones', price: 20 },
        { v: 'pride', label: 'Arcoíris', price: 20 }] },
      { step: 1, id: 'nameFont', label: 'Letra de los nombres', type: 'choice', options: [
        { v: 'serif', label: 'Elegante', price: 0 }, { v: 'firma', label: 'Manuscrita', price: 0 }] },
      { step: 2, id: 'word', label: 'Palabra', type: 'text', max: 12, placeholder: 'Amor', showIf: c => c.tpl === 'amor' },
      { step: 2, id: 'top', label: 'Título arriba', type: 'text', max: 22, placeholder: 'Happy Birthday', showIf: c => c.tpl === 'cumple' },
      { step: 2, id: 'calDate', label: 'Fecha especial', type: 'date', showIf: c => c.tpl === 'calendario' },
      { step: 2, id: 'body', label: 'Texto', type: 'textarea', max: 220, showIf: c => c.tpl !== 'libre',
        suggest: [TEXTS.amor, TEXTS.amor2, TEXTS.cal, TEXTS.cumple, TEXTS.frase] },
      { step: 2, id: 'date', label: 'Fecha', type: 'text', max: 14, placeholder: '29 08 2025', showIf: c => c.tpl === 'cumple' || c.tpl === 'aniv' },
      { step: 3, id: 'frame', label: 'Marco', type: 'choice', options: [
        { v: '#FFFDF9', label: 'Blanco', price: 0 }, { v: '#2A1A0E', label: 'Negro', price: 0 }, { v: '#B9824C', label: 'Madera', price: 60 }] },
      { step: 3, id: 'size', label: 'Tamaño', type: 'choice', options: [
        { v: '23', label: '23×23 cm', price: 0 }, { v: '30', label: '30×30 cm', price: 180 }] },
    ],
    init: c => { c.body = TEXTS.amor; c.word = 'Amor'; c.calDate = '2025-05-31'; },
  },
  {
    id: 'minifig', name: 'Minifigura personalizada', cat: 'figuras', base: 220, bg: '#F6952A',
    desc: 'Una mini versión de ti (o de quien quieras) con base transparente y su nombre.',
    render: 'minifig',
    groups: [
      ...FIG_GROUPS,
      { id: 'pack', label: 'Empaque', type: 'choice', options: [
        { v: 'bolsa', label: 'Bolsita', price: 0 }, { v: 'kraft', label: 'Caja regalo', price: 50 }, { v: 'acrilico', label: 'Vitrina acrílica', price: 90 }] },
    ],
    init: c => Object.assign(c, FIG_PRESETS[4]),
  },
  {
    id: 'llavero', name: 'Llavero minifigura', cat: 'figuras', base: 150, bg: '#8EC5F2',
    desc: 'Mini tú para tus llaves. Pídelos en par para tu persona favorita.',
    render: 'keychain',
    groups: [
      ...FIG_GROUPS.filter(g => g.id !== 'name' && g.id !== 'legs'),
      { id: 'tagText', label: 'Iniciales o fecha en la placa', type: 'text', max: 8, placeholder: 'Ej. F & C', price: 20 },
      { id: 'ring', label: 'Argolla', type: 'choice', options: [
        { v: '#B9B4AE', label: 'Plateada', price: 0 }, { v: '#E0B44C', label: 'Dorada', price: 20 }] },
    ],
    init: c => Object.assign(c, FIG_PRESETS[0]),
  },
  {
    id: 'sudadera', name: 'Sudaderas para parejas', cat: 'ropa', base: 520, badge: 'Nuevo', bg: '#BDE7C9',
    desc: 'Tu inicial y un corazón en la manga. Una para ti, otra para tu persona.',
    render: 'hoodie',
    groups: [
      { id: 'pair', label: '¿Cuántas?', type: 'choice', options: [
        { v: '2', label: 'Par (2)', price: 0 }, { v: '1', label: 'Solo una', price: -260 }] },
      { id: 'color1', label: 'Sudadera 1 · color', type: 'swatch', options: sw([['#F7F4EE', 'Blanco'], ['#9A9A9E', 'Gris jaspe'], ['#2A1A0E', 'Negro'], ['#1F2A44', 'Marino'], ['#E9D8B4', 'Beige'], ['#F48FB1', 'Rosa']]) },
      { id: 'ini1', label: 'Sudadera 1 · inicial', type: 'text', max: 2, placeholder: 'E' },
      { id: 'ink1', label: 'Sudadera 1 · color del bordado', type: 'swatch', options: sw([['#B3262E', 'Rojo'], ['#6FA8DC', 'Azul'], ['#2A1A0E', 'Negro'], ['#FFFDF9', 'Blanco'], ['#F48FB1', 'Rosa'], ['#2F8F5B', 'Verde']]) },
      { id: 'size1', label: 'Sudadera 1 · talla', type: 'choice', options: ['CH', 'M', 'G', 'XG'].map(v => ({ v, label: v, price: 0 })) },
      { id: 'color2', label: 'Sudadera 2 · color', type: 'swatch', options: sw([['#9A9A9E', 'Gris jaspe'], ['#F7F4EE', 'Blanco'], ['#2A1A0E', 'Negro'], ['#1F2A44', 'Marino'], ['#E9D8B4', 'Beige'], ['#F48FB1', 'Rosa']]), showIf: c => c.pair === '2' },
      { id: 'ini2', label: 'Sudadera 2 · inicial', type: 'text', max: 2, placeholder: 'K', showIf: c => c.pair === '2' },
      { id: 'ink2', label: 'Sudadera 2 · color del bordado', type: 'swatch', options: sw([['#6FA8DC', 'Azul'], ['#B3262E', 'Rojo'], ['#2A1A0E', 'Negro'], ['#FFFDF9', 'Blanco'], ['#F48FB1', 'Rosa'], ['#2F8F5B', 'Verde']]), showIf: c => c.pair === '2' },
      { id: 'size2', label: 'Sudadera 2 · talla', type: 'choice', options: ['CH', 'M', 'G', 'XG'].map(v => ({ v, label: v, price: 0 })), showIf: c => c.pair === '2' },
    ],
    init: c => { c.ini1 = 'E'; c.ini2 = 'K'; },
  },
  {
    id: 'playera', name: 'Playera personalizada', cat: 'ropa', base: 320, bg: '#FFD23F',
    desc: 'Algodón suave con tu frase o tu propia imagen, al frente o en la espalda.',
    render: 'shirt',
    groups: [
      { id: 'color', label: 'Color de playera', type: 'swatch', options: sw(CLOTH) },
      { id: 'size', label: 'Talla', type: 'choice', options: ['CH', 'M', 'G', 'XG'].map(v => ({ v, label: v, price: 0 })).concat({ v: 'XXG', label: 'XXG', price: 30 }) },
      { id: 'text', label: 'Texto', type: 'text', max: 18, placeholder: 'Ej. Good vibes' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'college', label: 'College', price: 0 },
        { v: 'script', label: 'Script', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
      { id: 'ink', label: 'Color de tinta', type: 'swatch', options: sw(CLOTH.slice(1)) },
      { id: 'img', label: 'Tu imagen o logo', type: 'file', price: 60 },
      { id: 'pos', label: 'Posición', type: 'choice', options: [
        { v: 'frente', label: 'Frente', price: 0 }, { v: 'espalda', label: 'Espalda', price: 0 }, { v: 'ambos', label: 'Ambos lados', price: 120 }] },
    ],
  },
  {
    id: 'taza', name: 'Taza personalizada', cat: 'hogar', base: 190, bg: '#B9A2F0',
    desc: 'Cerámica 11 oz con nombre, frase o foto. Versión mágica que aparece con calor.',
    render: 'mug',
    groups: [
      { id: 'type', label: 'Tipo', type: 'choice', options: [
        { v: 'clasica', label: 'Clásica', price: 0 }, { v: 'magica', label: 'Mágica', price: 80 }] },
      { id: 'inner', label: 'Color interior y asa', type: 'swatch', options: sw(CLOTH.filter(c => c[0] !== '#FFFDF9')) },
      { id: 'text', label: 'Texto', type: 'text', max: 16, placeholder: 'Ej. Café con Ana' },
      { id: 'font', label: 'Letra', type: 'choice', options: [
        { v: 'script', label: 'Script', price: 0 }, { v: 'groovy', label: 'Groovy', price: 0 }, { v: 'serif', label: 'Elegante', price: 0 }] },
      { id: 'img', label: 'Foto o diseño', type: 'file', price: 40 },
    ],
  },
];

/* tarjetas del catálogo. Cada cuadro con foto trae el diseño de ese pedido real ya armado */
const CARDS = [
  { id: 'cuadro', title: 'Cuadro “Amor”', desc: 'La definición de amor con sus minifiguras sobre un corazón rosa en spray.', badge: 'Más pedido', bg: '#F48FB1', photo: 'fotos/cuadro-amor.jpg',
    cfg: { tpl: 'amor', word: 'Amor', body: TEXTS.amor, heart: '#F48FB1', figs: [{ ...FIG_PRESETS[0] }, { ...FIG_PRESETS[1] }] } },
  { id: 'cuadro', title: 'Happy Birthday azul', desc: 'Letras recortadas, corazón azul con brillitos, dedicatoria y fecha.', bg: '#8EC5F2', photo: 'fotos/cuadro-cumple.jpg',
    cfg: { tpl: 'cumple', top: 'Happy Birthday', body: TEXTS.cumple, date: '29 08 2025', heart: '#8EC5F2', deco: 'brillos', figs: [{ ...FIG_PRESETS[2], name: 'Alberto' }, { ...FIG_PRESETS[3], name: 'Ángela' }] } },
  { id: 'cuadro', title: 'Corazón rojo', desc: 'Happy Birthday con estrella, corazón rojo intenso y su frase.', bg: '#D9363E', photo: 'fotos/cuadro-cumple-rojo.jpg', photoPos: '50% 40%',
    cfg: { tpl: 'cumple', top: 'Happy Birthday', body: TEXTS.frase, date: '', heart: '#D9363E', deco: 'estrella', nameFont: 'firma',
      figs: [{ name: 'Dani', skin: '#F6D3B3', hair: 'lado', hairColor: '#1F1712', face: 'feliz', outfit: 'playera', torso: '#1F2A44', legs: '#1F1712' },
        { name: 'Vale', skin: '#F6D3B3', hair: 'largo', hairColor: '#1F1712', face: 'labios', outfit: 'blusa', torso: '#F7B6C8', legs: '#F1EBDD' }] } },
  { id: 'cuadro', title: 'Calendario', desc: 'El mes de su fecha especial con un corazón en el día, sus nombres y su frase.', badge: 'Nuevo', bg: '#E9D8B4', photo: 'fotos/cuadro-calendario.jpg',
    cfg: { tpl: 'calendario', calDate: '2025-05-31', body: TEXTS.cal, heart: 'none', nameFont: 'firma',
      figs: [{ name: 'Jhonson', skin: '#F6D3B3', hair: 'vaquero', hairColor: '#5A3720', face: 'feliz', outfit: 'cuadros', torso: '#3E6E8E', legs: '#1F1712' },
        { name: 'Odalis', skin: '#F6D3B3', hair: 'largo', hairColor: '#6B4428', face: 'labios', outfit: 'blusa', torso: '#C8102E', legs: '#1F1712' }] } },
  { id: 'cuadro', title: 'Con sus mascotas', desc: 'Ustedes y sus peludos: gatitos y perritos junto a sus figuras.', badge: 'Familia', bg: '#FFD23F', photo: 'fotos/cuadros-varios.jpg', photoPos: '50% 30%',
    cfg: { tpl: 'amor', word: 'Amor', body: TEXTS.amor2, heart: '#D9363E', cats: 1, dogs: 2,
      figs: [{ name: '', skin: '#F6D3B3', hair: 'corto', hairColor: '#1F1712', face: 'feliz', outfit: 'traje', torso: '#2A1A0E', legs: '#1F1712' },
        { name: '', skin: '#F6D3B3', hair: 'ondas', hairColor: '#5A3720', face: 'labios', outfit: 'vestido', torso: '#2A1A0E' }] } },
  { id: 'cuadro', title: 'Amor con arcoíris', desc: 'Bandera arcoíris y corazones para celebrar su amor tal cual es.', bg: '#B9A2F0', photo: 'fotos/cuadros-varios.jpg', photoPos: '30% 100%',
    cfg: { tpl: 'amor', word: 'AMOR', body: TEXTS.amor, heart: '#F48FB1', deco: 'pride',
      figs: [{ name: '', skin: '#F6D3B3', hair: 'sombrero', hairColor: '#1F1712', face: 'feliz', outfit: 'playera', torso: '#FFFDF9', legs: '#1F1712' },
        { name: '', skin: '#F6D3B3', hair: 'sombrero', hairColor: '#1F1712', face: 'barba', outfit: 'playera', torso: '#FFFDF9', legs: '#1F1712' }] } },
  { id: 'sudadera', photo: 'fotos/sudaderas.jpg' }, { id: 'minifig' }, { id: 'llavero' }, { id: 'playera' }, { id: 'taza' },
];

const CATS = [['todos', 'Todos'], ['cuadros', 'Cuadros'], ['figuras', 'Figuras'], ['ropa', 'Ropa'], ['hogar', 'Hogar']];

function defaults(p) {
  const c = {};
  p.groups.forEach(g => {
    if (g.type === 'swatch' || g.type === 'choice') c[g.id] = g.options[0].v;
    else if (g.type === 'stepper') c[g.id] = g.min;
    else if (g.type === 'figs') c[g.id] = [figDefault(0), figDefault(1)];
    else c[g.id] = '';
  });
  p.init && p.init(c);
  return c;
}
const clone = o => JSON.parse(JSON.stringify(o));
const visible = (g, cfg) => !g.showIf || g.showIf(cfg);
const cardCfg = card => { const p = PRODUCTS.find(x => x.id === card.id); return { ...defaults(p), ...clone(card.cfg || {}) }; };

function optPrices(groups, cfg, lines, prefix = '') {
  groups.forEach(g => {
    if (!visible(g, cfg)) return;
    const v = cfg[g.id];
    if (g.type === 'swatch' || g.type === 'choice') {
      const o = g.options.find(o => o.v === v);
      if (o && o.price) lines.push({ label: prefix + o.label, price: o.price });
    } else if ((g.type === 'text' || g.type === 'file') && g.price && String(v || '').trim()) {
      lines.push({ label: prefix + g.label, price: g.price });
    } else if (g.type === 'stepper' && v) {
      lines.push({ label: `${g.label} ×${v}`, price: v * g.pricePer });
    } else if (g.type === 'figs') {
      lines.push({ label: `${v.length} figura${v.length > 1 ? 's' : ''}`, price: v.length * g.pricePer });
      v.forEach((f, i) => optPrices(FIG_GROUPS, f, lines, `${f.name || 'Figura ' + (i + 1)}: `));
    }
  });
}
function priceOf(p, cfg) {
  const lines = [{ label: 'Base', price: p.base }];
  optPrices(p.groups, cfg, lines);
  return { lines, unit: lines.reduce((s, l) => s + l.price, 0) };
}
function lineTotal(unit, qty) {
  const gross = unit * qty;
  const disc = qty >= CONFIG.bulkMin ? Math.round(gross * CONFIG.bulkPct / 100) : 0;
  return { gross, disc, total: gross - disc };
}

function summaryOf(groups, cfg) {
  return groups.filter(g => visible(g, cfg)).flatMap(g => {
    const v = cfg[g.id];
    if (g.type === 'swatch' || g.type === 'choice') return [[g.label, g.options.find(o => o.v === v)?.label]];
    if (g.type === 'file') return v ? [[g.label, cfg[g.id + 'Name'] || 'Imagen adjunta']] : [];
    if (g.type === 'stepper') return v ? [[g.label, v]] : [];
    if (g.type === 'figs') return v.map((f, i) => [`Figura ${i + 1}`, summaryOf(FIG_GROUPS, f).map(x => x[1]).join(', ')]);
    if (g.type === 'date') return v ? [[g.label, fmtDate(v)]] : [];
    return String(v || '').trim() ? [[g.label, v]] : [];
  });
}
const summary = (p, cfg) => summaryOf(p.groups, cfg);
function fmtDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return y ? `${d} de ${MONTHS[m - 1].toLowerCase()} de ${y}` : ''; }

/* =================================================================
   ILUSTRACIÓN. Busca parecerse al producto físico: plástico con brillo,
   base acrílica, papel con sombra del marco, spray difuminado.
   ================================================================= */

// gradientes de volumen para una figura (luz desde arriba a la izquierda)
function figDefs(k) {
  return `<defs>
    <linearGradient id="${k}h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".35" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <linearGradient id="${k}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <radialGradient id="${k}g" cx=".32" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>`;
}

function hairSVG(style, c, k) {
  const s = shade(c, -0.35);
  const st = `fill="${c}" stroke="${s}" stroke-width="1.6" stroke-linejoin="round"`;
  const gloss = d => `<path d="${d}" fill="url(#${k}g)"/>`;
  switch (style) {
    case 'corto': { const d = 'M66 54C60 16 140 16 134 54C128 44 120 38 108 40C96 34 80 38 66 54Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'lado': { const d = 'M64 58C56 14 140 10 138 50C134 44 128 42 122 44C110 34 84 44 72 40C70 46 68 52 64 58Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'largo': { const d = 'M62 58C56 12 144 12 138 58L142 106C134 110 126 110 120 106L124 50C110 38 90 38 76 50L80 106C74 110 66 110 58 106Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'ondas': { const d = 'M62 58C54 10 146 10 138 58C146 70 136 80 144 92C148 102 138 110 128 106C122 98 128 84 124 72L124 50C110 38 90 38 76 50L76 72C72 84 78 98 72 106C62 110 52 102 56 92C64 80 54 70 62 58Z'; return `<path ${st} d="${d}"/>${gloss(d)}`; }
    case 'rizos': return `<g ${st}>${[[70, 42], [82, 28], [100, 22], [118, 28], [130, 42], [66, 58], [134, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`).join('')}</g><ellipse cx="88" cy="28" rx="16" ry="9" fill="url(#${k}g)"/>`;
    case 'chongo': return `<g ${st}><circle cx="100" cy="12" r="14"/><path d="M66 54C60 18 140 18 134 54C120 40 80 40 66 54Z"/></g>${gloss('M66 54C60 18 140 18 134 54C120 40 80 40 66 54Z')}`;
    case 'sombrero': return `<g fill="#1E1A18" stroke="#000" stroke-width="1.6" stroke-linejoin="round"><path d="M74 40L78 8Q100 0 122 8L126 40Z"/><ellipse cx="100" cy="40" rx="44" ry="8"/></g><rect x="76" y="30" width="48" height="6" fill="#B3262E"/><path d="M80 12Q100 4 112 10L110 32H82Z" fill="url(#${k}g)"/>`;
    case 'vaquero': {
      const h = c === '#1F1712' ? '#6B4428' : c, ho = shade(h, -0.35);
      return `<g fill="${h}" stroke="${ho}" stroke-width="1.6" stroke-linejoin="round"><path d="M48 44Q52 32 72 36L76 10Q100 0 124 10L128 36Q148 32 152 44Q140 54 100 52Q60 54 48 44Z"/></g>
        <path d="M76 30Q100 36 124 30" stroke="${shade(h, -0.5)}" stroke-width="5" fill="none"/><path d="M92 6Q100 14 108 6" stroke="${ho}" stroke-width="2" fill="none"/><path d="M80 14Q96 6 110 10L108 28H80Z" fill="url(#${k}g)"/>`;
    }
    default: return '';
  }
}

function faceSVG(face) {
  const k = '#231A14';
  const eye = x => `<ellipse cx="${x}" cy="52" rx="3.6" ry="4.6" fill="${k}"/><circle cx="${x + 1.2}" cy="50.5" r="1.1" fill="#fff"/>`;
  const brows = `<path d="M82 42h10M108 42h10" stroke="${k}" stroke-width="2.4" stroke-linecap="round"/>`;
  const smile = `<path d="M88 64Q100 73 112 64" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`;
  switch (face) {
    case 'guino': return `${eye(88)}<path d="M107 53Q112 48 117 53" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round"/>${smile}`;
    case 'labios': return `${eye(88)}${eye(112)}<path d="M82 47l-4-3M118 47l4-3" stroke="${k}" stroke-width="1.8" stroke-linecap="round"/><path d="M90 64Q100 60 110 64Q100 73 90 64Z" fill="#B7212D"/><circle cx="80" cy="62" r="4" fill="#F48FB1" opacity=".45"/><circle cx="120" cy="62" r="4" fill="#F48FB1" opacity=".45"/>`;
    case 'lentes': return `<g fill="none" stroke="${k}" stroke-width="2.6"><rect x="77" y="44" width="19" height="15" rx="6"/><rect x="104" y="44" width="19" height="15" rx="6"/><path d="M96 50h8"/></g>${eye(87)}${eye(113)}${smile}`;
    case 'barba': return `${brows}${eye(88)}${eye(112)}<path d="M72 58C74 86 126 86 128 58C120 70 112 72 100 72C88 72 80 70 72 58Z" fill="#3B2617"/><path d="M90 66Q100 72 110 66" fill="none" stroke="#000" stroke-width="2.6" stroke-linecap="round"/>`;
    default: return `${eye(88)}${eye(112)}${smile}`;
  }
}

function outfitSVG(f, k) {
  const t = f.torso || '#1F2A44', o = shade(t, -0.3);
  switch (f.outfit) {
    case 'sueter': {
      const st = isLight(t) ? '#B3262E' : '#E8D9B8';
      return `<path d="M60 124H140M58 142H142" stroke="${st}" stroke-width="5"/><path d="M64 133l6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5 6-5 6 5" fill="none" stroke="#B3262E" stroke-width="2.6"/>`;
    }
    case 'cuadros': {
      const a = shade(t, 0.35), b = shade(t, -0.35);
      return `<defs><clipPath id="${k}c"><path d="M66 90H134L148 186H52Z"/></clipPath></defs><g clip-path="url(#${k}c)" opacity=".85">
        ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${50 + i * 18}" y="88" width="7" height="100" fill="${a}" opacity=".6"/>`).join('')}
        ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="48" y="${94 + i * 16}" width="104" height="6" fill="${b}" opacity=".55"/>`).join('')}</g>
        <path d="M88 90L100 104L112 90" fill="none" stroke="${b}" stroke-width="2.4"/><path d="M100 104V184" stroke="${b}" stroke-width="1.6"/>`;
    }
    case 'traje': return `<path d="M88 90L100 128L112 90Z" fill="#FFFDF9"/><path d="M96 98h8l5 40-9 10-9-10Z" fill="#7A1A24"/><path d="M86 90L100 150M114 90L100 150" stroke="${shade(t, 0.18)}" stroke-width="2.6"/><circle cx="100" cy="160" r="2.4" fill="${shade(t, 0.3)}"/>`;
    case 'vestido': return `<path d="M82 92Q100 110 118 92" fill="none" stroke="${shade(t, 0.35)}" stroke-width="2.6"/><path d="M70 150H130" stroke="${o}" stroke-width="2.4"/>`;
    case 'blusa': return `<path d="M80 90Q100 112 120 90" fill="${f.skin || '#F6D3B3'}" stroke="${shade(f.skin || '#F6D3B3', -0.25)}" stroke-width="1.4"/>`;
    case 'texto': {
      const tx = String(f.printText || 'TÚ').toUpperCase().slice(0, 6);
      return `<text x="100" y="138" text-anchor="middle" font-family="'Bagel Fat One'" font-size="${tx.length > 4 ? 16 : 22}" fill="${isLight(t) ? '#2A1A0E' : '#FFFDF9'}">${esc(tx)}</text>`;
    }
    default: return '';
  }
}

function minifig(f, opts = {}) {
  const k = 'm' + (++UID);
  const skin = f.skin || '#F6D3B3', torso = f.torso || '#1F2A44';
  const dress = f.outfit === 'vestido';
  const bareArms = f.outfit === 'blusa';
  const legs = dress ? torso : (f.legs || '#2E4A8C');
  const so = shade(skin, -0.3), to = shade(torso, -0.32), lo = shade(legs, -0.32);
  const arm = bareArms ? skin : torso, ao = bareArms ? so : to;
  const L = 'stroke-width="1.6" stroke-linejoin="round"';
  const H = `fill="url(#${k}h)"`, V = `fill="url(#${k}v)"`;
  let s = figDefs(k);
  if (!opts.half) {
    s += dress
      ? `<path d="M56 184H144L156 264H44Z" fill="${legs}" stroke="${lo}" ${L}/><path d="M56 184H144L156 264H44Z" ${H}/><path d="M80 186L74 262M120 186L126 262" stroke="${lo}" stroke-width="1.6" opacity=".55"/>
         <rect x="58" y="262" width="34" height="8" rx="3" fill="${skin}" stroke="${so}" ${L}/><rect x="108" y="262" width="34" height="8" rx="3" fill="${skin}" stroke="${so}" ${L}/>`
      : `<rect x="52" y="184" width="96" height="16" rx="3" fill="${legs}" stroke="${lo}" ${L}/><rect x="52" y="184" width="96" height="16" rx="3" ${H}/>
        <rect x="54" y="198" width="44" height="64" rx="4" fill="${legs}" stroke="${lo}" ${L}/><rect x="54" y="198" width="44" height="64" rx="4" ${H}/><rect x="54" y="198" width="44" height="64" rx="4" ${V}/>
        <rect x="102" y="198" width="44" height="64" rx="4" fill="${legs}" stroke="${lo}" ${L}/><rect x="102" y="198" width="44" height="64" rx="4" ${H}/><rect x="102" y="198" width="44" height="64" rx="4" ${V}/>
        <rect x="50" y="256" width="50" height="14" rx="4" fill="${shade(legs, -0.08)}" stroke="${lo}" ${L}/>
        <rect x="100" y="256" width="50" height="14" rx="4" fill="${shade(legs, -0.08)}" stroke="${lo}" ${L}/>`;
  }
  s += `<rect x="88" y="16" width="24" height="12" rx="3" fill="${skin}" stroke="${so}" ${L}/>
    <rect x="90" y="80" width="20" height="12" fill="${shade(skin, -0.15)}" stroke="${so}" ${L}/>
    <g transform="rotate(14 60 96)"><rect x="46" y="94" width="22" height="64" rx="10" fill="${arm}" stroke="${ao}" ${L}/><rect x="46" y="94" width="22" height="64" rx="10" ${H}/></g>
    <g transform="rotate(-14 140 96)"><rect x="132" y="94" width="22" height="64" rx="10" fill="${arm}" stroke="${ao}" ${L}/><rect x="132" y="94" width="22" height="64" rx="10" ${H}/></g>
    <path d="M66 90H134L148 186H52Z" fill="${torso}" stroke="${to}" ${L}/>
    ${bareArms ? `<path d="M66 90L60 104M134 90L140 104" stroke="${to}" stroke-width="1.4"/>` : ''}
    ${f.outfit === 'traje' || bareArms ? '' : `<path d="M86 90Q100 104 114 90" fill="none" stroke="${to}" stroke-width="2"/>`}
    ${outfitSVG(f, k)}
    <path d="M66 90H134L148 186H52Z" ${H}/>
    <g fill="${skin}" stroke="${so}" stroke-width="1.6"><circle cx="40" cy="164" r="11"/><circle cx="160" cy="164" r="11"/></g>
    <g fill="${so}"><circle cx="40" cy="166" r="4"/><circle cx="160" cy="166" r="4"/></g>
    <rect x="70" y="24" width="60" height="62" rx="18" fill="${skin}" stroke="${so}" ${L}/>
    <rect x="70" y="24" width="60" height="62" rx="18" ${H}/>
    <ellipse cx="84" cy="36" rx="9" ry="5" fill="#fff" opacity=".45"/>
    ${faceSVG(f.face)}
    ${hairSVG(f.hair, f.hairColor || '#1F1712', k)}`;
  return s;
}

// base acrílica transparente; toma un poco del color del fondo
const stand = tint => `<path d="M46 268H154L151 314H49Z" fill="${tint}" fill-opacity=".22"/>
  <path d="M46 268H154L151 314H49Z" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="2.4" stroke-opacity=".95"/>
  <path d="M46 268H154" stroke="#fff" stroke-width="4"/><path d="M57 276V306" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".85"/>
  <path d="M140 276V304" stroke="#000" stroke-opacity=".08" stroke-width="4" stroke-linecap="round"/>`;

function minifigSVG(c) {
  const name = String(c.name || '').trim();
  const pack = c.pack === 'acrilico' ? `<rect x="12" y="2" width="176" height="350" rx="10" fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="3" stroke-opacity=".8"/><path d="M26 18L40 18L26 60Z" fill="#fff" opacity=".45"/>`
    : c.pack === 'kraft' ? `<g transform="translate(150 236) rotate(8)"><rect width="44" height="40" rx="4" fill="#C69C6D" stroke="#2A1A0E" stroke-width="2"/><path d="M22 0V40M0 16H44" stroke="#D9363E" stroke-width="4"/></g>` : '';
  return `<svg viewBox="0 0 200 356" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="318" rx="62" ry="7" fill="#000" opacity=".18"/>${stand('#ffffff')}${minifig(c)}
    ${name ? `<text x="100" y="344" text-anchor="middle" font-family="'Playfair Display'" font-weight="700" font-size="24" fill="#2A1A0E">${esc(name)}</text>` : ''}${pack}</svg>`;
}

/* ---------- cuadro ---------- */
function ransom(text, cx, y, maxW) {
  const words = String(text).toUpperCase().split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur);
  const bgs = ['#F1E4CF', '#2A1A0E', '#8FA89A', '#E8B27A', '#FFFFFF', '#3E5C76', '#D9C7A7', '#B7212D'];
  const fonts = ["'Playfair Display'", "'Bagel Fat One'", "'Outfit'", "'Space Mono'", "'Alfa Slab One'"];
  let k = 0, out = '', lastX = cx;
  lines.slice(0, 2).forEach((ln, li) => {
    const cw = Math.min(18, maxW / ln.length);
    const x0 = cx - (cw * ln.length) / 2;
    [...ln].forEach((ch, i) => {
      if (ch === ' ') { k++; return; }
      const bg = bgs[(k * 3 + li) % bgs.length], fg = isLight(bg) ? '#2A1A0E' : '#FFFDF9';
      const rot = ((k * 37) % 11) - 5, x = x0 + i * cw + cw / 2, yy = y + li * (cw + 7) + ((k * 13) % 3) - 1;
      out += `<g transform="translate(${x.toFixed(1)} ${yy}) rotate(${rot})"><rect x="${-cw / 2 + 0.6}" y="${-cw * .64}" width="${cw - 1.2}" height="${cw * 1.2}" fill="${bg}"/>
        <rect x="${-cw / 2 + 0.6}" y="${-cw * .64}" width="${cw - 1.2}" height="${cw * 1.2}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".6"/>
        <text y="${cw * .3}" text-anchor="middle" font-family="${fonts[k % fonts.length]}" font-size="${cw * .92}" fill="${fg}">${esc(k % 4 === 1 ? ch.toLowerCase() : ch)}</text></g>`;
      if (li === 0) lastX = x + cw / 2;
      k++;
    });
  });
  return { svg: out, lines: Math.min(2, lines.length), lastX };
}

function wrap(text, n) {
  const out = []; let cur = '';
  String(text).split(/\s+/).filter(Boolean).forEach(w => {
    if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  });
  if (cur) out.push(cur);
  return out;
}

const HEART_D = 'M0 52C-62 16-70-26-40-40C-20-49-4-36 0-22C4-36 20-49 40-40C70-26 62 16 0 52Z';
const SPARK_D = 'M0-14c1 9 5 13 14 14-9 1-13 5-14 14-1-9-5-13-14-14 9-1 13-5 14-14Z';
const CAT = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#231C18"><path d="M-8 0Q-12-14-6-20L-6-28L-2-23H2L6-28L6-20Q12-14 8 0Z"/><path d="M8-2Q18-4 16-16" stroke="#231C18" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-19" r="1.2" fill="#E9C46A"/><circle cx="3" cy="-19" r="1.2" fill="#E9C46A"/><path d="M-4-24Q0-27 4-24" stroke="#fff" stroke-opacity=".25" fill="none"/></g>`;
const DOG = (x, y, s = 1, col = '#8A5634', spots = false) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0V-10Q-14-16-6-16H8L10-24Q18-26 18-18Q18-12 12-12V0H8V-6H-8V0Z" fill="${col}"/>${spots ? '<circle cx="-6" cy="-11" r="2.4" fill="#231C18"/><circle cx="2" cy="-13" r="1.8" fill="#231C18"/><circle cx="13" cy="-20" r="1.6" fill="#231C18"/>' : ''}<path d="M12-24Q8-22 9-15" fill="${shade(col, -0.35)}"/><circle cx="14" cy="-19" r="1.3" fill="#000"/><path d="M-14-12Q-20-16-18-22" stroke="${col}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;

// layout por estilo: centro del corazón (hy), base de las figuras (base), línea de nombres (ny)
const LAYOUT = {
  amor: { hy: 112, base: 158, ny: 170 },
  cumple: { hy: 152, base: 196, ny: 208 },
  frase: { hy: 128, base: 176, ny: 190 },
  aniv: { hy: 118, base: 164, ny: 176 },
  libre: { hy: 138, base: 186, ny: 200 },
  calendario: { hy: 186, base: 214, ny: 228 },
};

function calendarSVG(iso) {
  const [y, m, d] = String(iso || '2025-05-31').split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const x0 = 96, cw = 18, y0 = 78, rh = 11.5;
  let s = `<text x="150" y="52" text-anchor="middle" font-family="'Playfair Display'" font-size="11" letter-spacing="2" fill="#231A14">${esc(MONTHS[m - 1].toUpperCase())}</text>`;
  s += ['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((w, i) => `<text x="${x0 + i * cw}" y="65" text-anchor="middle" font-family="'Playfair Display'" font-size="7" fill="#231A14">${w}</text>`).join('');
  for (let n = 1; n <= days; n++) {
    const idx = first + n - 1, cx = x0 + (idx % 7) * cw, cy = y0 + Math.floor(idx / 7) * rh;
    s += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="'Playfair Display'" font-size="6.6" fill="#231A14">${n}</text>`;
    if (n === d) s += `<path transform="translate(${cx + 1} ${cy - 2.4}) scale(.15)" d="${HEART_D}" fill="none" stroke="#C8102E" stroke-width="7" stroke-linecap="round"/>`;
  }
  return s;
}

function frameSVG(c) {
  const k = 'f' + (++UID);
  const figs = c.figs || [], n = figs.length;
  const fr = c.frame || '#FFFDF9', heart = c.heart || '#F48FB1';
  const tpl = LAYOUT[c.tpl] ? c.tpl : 'amor';
  const { hy, base, ny } = LAYOUT[tpl];
  const nameFont = c.nameFont === 'firma' ? FONTS.firma : FONTS.serif;
  const tint = heart === 'none' ? '#ffffff' : heart;

  // título y calendario
  let top = '', starX = 0;
  if (tpl === 'cumple') { const r = ransom(c.top || 'Happy Birthday', 150, 62, 200); top = r.svg; starX = r.lastX; }
  if (tpl === 'calendario') top = calendarSVG(c.calDate);

  // corazón en spray: núcleo saturado, orilla difuminada con grano
  const hs = n > 3 ? 1.4 : n > 2 ? 1.22 : 1.06;
  const heartSVG = heart === 'none' ? '' : `<g transform="translate(150 ${hy}) scale(${hs})">
      <path d="${HEART_D}" fill="url(#${k}hg)" filter="url(#${k}sp)"/>
      <path d="${HEART_D}" fill="${heart}" opacity=".35" filter="url(#${k}gr)" transform="scale(1.08)"/>
    </g>`;

  // figuras
  const sc = tpl === 'calendario' ? (n > 2 ? 0.2 : 0.25) : n > 3 ? 0.22 : n > 2 ? 0.27 : 0.32;
  const fw = 200 * sc, gap = 7 * (sc / 0.32);
  const total = n * fw + (n - 1) * gap;
  const x0 = 150 - total / 2, fy = base - 314 * sc;
  const figsSVG = figs.map((f, i) => {
    const x = x0 + i * (fw + gap);
    const name = String(f.name || '').trim();
    return `<g transform="translate(${x.toFixed(1)} ${fy.toFixed(1)}) scale(${sc})" filter="url(#${k}ds)">${stand(tint)}${minifig(f)}</g>
      ${name ? `<text x="${(x + fw / 2).toFixed(1)}" y="${ny}" text-anchor="middle" font-family="${nameFont}" font-size="${c.nameFont === 'firma' ? 13 : 8.5}" fill="#231A14">${esc(name)}</text>` : ''}`;
  }).join('');

  // mascotas a los lados
  let petsSVG = '';
  const petList = [...Array(c.cats || 0).fill('c'), ...Array(c.dogs || 0).fill('d')];
  petList.forEach((t, i) => {
    const left = i % 2 === 0, j = Math.floor(i / 2);
    const x = left ? x0 - 14 - j * 22 : x0 + total + 14 + j * 22;
    petsSVG += t === 'c' ? CAT(x, base - 4, 0.62) : DOG(x, base - 4, 0.62, i % 3 === 2 ? '#BDB6AE' : '#8A5634', i % 3 === 2);
  });

  // detalles
  const figTop = fy + 10 * sc;
  let deco = '';
  if (c.deco === 'brillos') deco = `<g fill="#fff">${[[108, hy - 30, .4], [196, hy - 14, .32], [102, hy + 26, .3], [192, hy + 36, .38], [150, hy - 46, .26]].map(([x, y, s]) => `<path transform="translate(${x} ${y}) scale(${s})" d="${SPARK_D}"/>`).join('')}</g>`;
  if (c.deco === 'estrella') deco = `<path transform="translate(${tpl === 'cumple' ? Math.min(starX + 12, 252) : 200} ${tpl === 'cumple' ? 58 : figTop - 6}) scale(.62)" d="M0-14l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L0 7.1l-8.4 4.5 1.8-9.3-6.9-6.5 9.4-1.2Z" fill="#E0B44C" stroke="#B88A2A" stroke-width="1.2"/>`;
  if (c.deco === 'corazones') deco = `<g fill="#E45A84">${[[118, figTop - 6], [182, figTop - 6], [150, figTop - 14]].map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.14)" d="${HEART_D}"/>`).join('')}</g>`;
  if (c.deco === 'pride') deco = `<g transform="translate(138 ${figTop - 20})">${['#E5484D', '#F6952A', '#FFD23F', '#2FB67C', '#4B7BF5', '#8E6CEF'].map((col, i) => `<rect y="${i * 2.6}" width="24" height="2.6" fill="${col}"/>`).join('')}</g>
    <g>${figs.map((_, i) => `<path transform="translate(${(x0 + i * (fw + gap) + fw / 2).toFixed(1)} ${ny - 4}) scale(.2)" d="${HEART_D}" fill="#F05AA0"/><path transform="translate(${(x0 + i * (fw + gap) + fw / 2 - 3).toFixed(1)} ${ny - 7}) scale(.06)" d="${HEART_D}" fill="#fff" opacity=".6"/>`).join('')}</g>`;

  // textos
  let text = '';
  const body = String(c.body || '').trim();
  if (tpl === 'amor') {
    const lines = wrap(body, 54).slice(0, 6);
    const w = c.word || 'Amor';
    text = `<text x="48" y="${ny + 22}" font-family="'Playfair Display'" font-size="15" font-weight="500" fill="#231A14">${esc(w)}</text>
      <text x="48" y="${ny + 32}" font-family="'Playfair Display'" font-size="6.8" fill="#231A14">sus. [${esc(String(w).toLowerCase())}]</text>
      <text font-family="'Playfair Display'" font-size="5.9" fill="#231A14">${lines.map((l, i) => `<tspan x="48" y="${ny + 42 + i * 7.4}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'cumple' || tpl === 'aniv') {
    const lines = wrap(body, 60).slice(0, 3);
    const date = String(c.date || '').trim();
    const names = date ? figs.map(f => String(f.name || '').trim()).filter(Boolean).join(' & ').toUpperCase() : '';
    const all = [...lines, date, names].filter(Boolean);
    const big = !date && lines.length === 1;
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="${big ? 10 : 6.6}" fill="#231A14">${all.map((l, i) => `<tspan x="150" y="${ny + (big ? 30 : 22) + i * 8.4}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'frase') {
    const lines = wrap(body, 34).slice(0, 2);
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="10.5" fill="#231A14">${lines.map((l, i) => `<tspan x="150" y="${ny + 34 + i * 13}">${esc(l)}</tspan>`).join('')}</text>`;
  } else if (tpl === 'calendario') {
    const lines = wrap(body, 62).slice(0, 2);
    text = `<text text-anchor="middle" font-family="'Playfair Display'" font-size="6.8" fill="#231A14">${lines.map((l, i) => `<tspan x="150" y="${ny + 20 + i * 8.6}">${esc(l)}</tspan>`).join('')}</text>`;
  }

  const frDark = shade(fr === '#FFFDF9' ? '#E2DAD0' : fr, -0.25);
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" class="frame-svg">
    <defs>
      <radialGradient id="${k}hg" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${tint}" stop-opacity=".95"/><stop offset=".6" stop-color="${tint}" stop-opacity=".75"/><stop offset="1" stop-color="${tint}" stop-opacity=".25"/></radialGradient>
      <filter id="${k}sp" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="5.5"/></filter>
      <filter id="${k}gr" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="7" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.6" result="dots"/><feComposite in="SourceGraphic" in2="dots" operator="in" result="sp"/><feGaussianBlur in="sp" stdDeviation="1.6"/></filter>
      <filter id="${k}ds" x="-30%" y="-10%" width="160%" height="130%"><feDropShadow dx="6" dy="10" stdDeviation="6" flood-color="#000" flood-opacity=".22"/></filter>
      <linearGradient id="${k}fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(fr, 0.12)}"/><stop offset="1" stop-color="${shade(fr, -0.07)}"/></linearGradient>
      <linearGradient id="${k}wt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient>
      <linearGradient id="${k}wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".03"/></linearGradient>
      <linearGradient id="${k}cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".12" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="${k}cl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".08" stop-color="#000" stop-opacity="0"/></linearGradient>
      <linearGradient id="${k}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="1" y="1" width="298" height="298" rx="3" fill="url(#${k}fr)" stroke="${frDark}" stroke-width="1.5"/>
    <rect x="10" y="10" width="280" height="280" fill="none" stroke="${frDark}" stroke-opacity=".45"/>
    <rect x="16" y="16" width="268" height="268" fill="${fr === '#FFFDF9' ? '#F4F0EA' : shade(fr, 0.1)}"/>
    <path d="M16 16H284L268 32H32Z" fill="url(#${k}wt)"/>
    <path d="M16 16L32 32V268L16 284Z" fill="url(#${k}wl)"/>
    <path d="M284 16V284L268 268V32Z" fill="#000" fill-opacity=".035"/>
    <rect x="32" y="32" width="236" height="236" fill="#FFFFFF"/>
    <rect x="32" y="32" width="236" height="236" fill="url(#${k}cs)"/>
    <rect x="32" y="32" width="236" height="236" fill="url(#${k}cl)"/>
    ${heartSVG}${top}${petsSVG}${figsSVG}${deco}${text}
    <text x="150" y="${base - 8}" text-anchor="middle" font-family="'Outfit'" font-style="italic" font-size="5" fill="#fff" opacity=".75">@pehn.designn</text>
    <rect x="16" y="16" width="268" height="268" fill="url(#${k}gl)"/>
  </svg>`;
}

/* ---------- otros productos ---------- */
const textFit = (t, max, base) => t.length > max ? Math.max(10, Math.round(base * max / t.length)) : base;
const imgTag = (src, x, y, w, h) => src ? `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>` : '';

function keychainSVG(c) {
  const ring = c.ring || '#B9B4AE', t = String(c.tagText || '').trim();
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="30" r="22" fill="none" stroke="${ring}" stroke-width="7"/>
    <circle cx="100" cy="30" r="22" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="10 40" opacity=".7"/>
    <path d="M100 52v12" stroke="${ring}" stroke-width="5"/><circle cx="100" cy="66" r="5" fill="none" stroke="${ring}" stroke-width="4"/>
    <g transform="translate(20 56) scale(.8)">${minifig(c, { half: true })}</g>
    <rect x="58" y="214" width="84" height="44" rx="10" fill="${ring}" stroke="${shade(ring, -0.35)}" stroke-width="2"/>
    <rect x="62" y="218" width="76" height="12" rx="6" fill="#fff" opacity=".35"/>
    <text x="100" y="243" text-anchor="middle" font-family="'Playfair Display'" font-weight="700" font-size="${textFit(t || '✦', 6, 20)}" fill="#2A1A0E">${esc(t || '✦')}</text>
  </svg>`;
}

function sleeve(x, y, rot, col, ini, ink) {
  const o = shade(col, -0.18), cuff = shade(col, -0.06);
  const t = String(ini || '').toUpperCase().slice(0, 2) || 'A';
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M-50 -150C-60 -60-54 20-46 60H46C54 20 60-60 50-150Z" fill="${col}" stroke="${o}" stroke-width="3"/>
    <path d="M-30 -130C-36 -60-30 0-26 40" stroke="${o}" stroke-width="2" fill="none" opacity=".5"/>
    <rect x="-48" y="56" width="96" height="44" rx="10" fill="${cuff}" stroke="${o}" stroke-width="3"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M${-40 + i * 8} 60V96" stroke="${o}" stroke-width="1.5" opacity=".6"/>`).join('')}
    <text x="-14" y="30" text-anchor="middle" font-family="'Alfa Slab One'" font-size="44" fill="${ink}" stroke="${shade(ink, -0.35)}" stroke-width="1.5">${esc(t)}</text>
    <path transform="translate(${t.length > 1 ? 34 : 24} 10) scale(.42)" d="${HEART_D}" fill="${ink}" stroke="${shade(ink, -0.35)}" stroke-width="3"/>
  </g>`;
}
function hoodieSVG(c) {
  const two = c.pair !== '1';
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><g transform="translate(22 26) scale(.85)">
    ${two ? sleeve(205, 150, 10, c.color2 || '#9A9A9E', c.ini2 || 'K', c.ink2 || '#6FA8DC') : ''}
    ${sleeve(two ? 100 : 150, two ? 160 : 150, two ? -8 : 0, c.color1 || '#F7F4EE', c.ini1 || 'E', c.ink1 || '#B3262E')}
  </g></svg>`;
}

function shirtSVG(c) {
  const col = c.color || '#1F2A44', ink = c.ink || '#2A1A0E', o = shade(col, -0.25);
  const t = String(c.text || '').trim(), back = c.pos === 'espalda';
  const font = FONTS[c.font] || FONTS.groovy, hasImg = !!c.img;
  return `<svg viewBox="0 0 300 320" xmlns="http://www.w3.org/2000/svg">
    <path d="M98 30L128 18Q150 ${back ? 26 : 44} 172 18L202 30L266 74L238 122L214 106V296H86V106L62 122L34 74Z" fill="${col}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M128 18Q150 ${back ? 26 : 44} 172 18" fill="none" stroke="${o}" stroke-width="5"/>
    ${imgTag(c.img, 105, 80, 90, 120)}
    ${t ? `<text x="150" y="${hasImg ? 232 : 165}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 9, 30)}" fill="${ink}">${esc(t)}</text>` : (hasImg ? '' : `<g opacity=".55"><rect x="100" y="110" width="100" height="90" rx="10" fill="none" stroke="${shade(col, isLight(col) ? -0.35 : 0.5)}" stroke-width="3" stroke-dasharray="8 7"/><text x="150" y="162" text-anchor="middle" font-family="'Outfit'" font-weight="700" font-size="14" fill="${shade(col, isLight(col) ? -0.45 : 0.6)}">Tu diseño</text></g>`)}
    ${c.pos === 'ambos' || back ? `<text x="150" y="286" text-anchor="middle" font-family="'Outfit'" font-weight="700" font-size="12" fill="${shade(col, isLight(col) ? -0.45 : 0.6)}">${back ? 'VISTA ESPALDA' : 'FRENTE + ESPALDA'}</text>` : ''}
  </svg>`;
}

function mugSVG(c) {
  const inn = c.inner || '#1F2A44', t = String(c.text || '').trim();
  const font = FONTS[c.font] || FONTS.script, magic = c.type === 'magica';
  return `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    <path d="M218 110h18a32 32 0 0 1 0 64h-18" fill="none" stroke="${inn}" stroke-width="16"/>
    <path d="M58 70H222V236Q222 262 196 262H84Q58 262 58 236Z" fill="#FFFDF9" stroke="#2A1A0E" stroke-width="3"/>
    <ellipse cx="140" cy="70" rx="82" ry="14" fill="${inn}" stroke="#2A1A0E" stroke-width="3"/>
    ${imgTag(c.img, 86, 96, 108, 100)}
    ${t ? `<text x="140" y="${c.img ? 228 : 172}" text-anchor="middle" font-family="${font}" font-size="${textFit(t, 8, 28)}" fill="#2A1A0E">${esc(t)}</text>` : (c.img ? '' : `<text x="140" y="172" text-anchor="middle" font-family="'Pacifico'" font-size="26" fill="${inn}">tu frase</text>`)}
    ${magic ? `<rect x="60" y="86" width="160" height="174" fill="#2A1A0E" opacity=".35"/><text x="140" y="250" text-anchor="middle" font-family="'Outfit'" font-weight="700" font-size="12" fill="#FFFDF9">✦ aparece con calor</text>` : ''}
    <path d="M70 92V230" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".6"/>
  </svg>`;
}

const RENDER = { minifig: minifigSVG, frame: frameSVG, keychain: keychainSVG, hoodie: hoodieSVG, shirt: shirtSVG, mug: mugSVG };
const renderProduct = (p, cfg) => RENDER[p.render](cfg);

// cara chiquita para las pestañas de figuras
function headSVG(f) {
  return `<svg viewBox="40 0 120 100" aria-hidden="true">${minifig(f, { half: true })}</svg>`;
}

/* ---------- catálogo ---------- */
let filter = 'todos';
function renderFilters() {
  const count = id => CARDS.filter(c => id === 'todos' || PRODUCTS.find(p => p.id === c.id).cat === id).length;
  $('#filters').innerHTML = CATS.map(([id, l]) => `<button role="tab" aria-selected="${id === filter}" data-f="${id}">${l}<b>${count(id)}</b></button>`).join('');
}
function cardHTML(card, ci, href) {
  const p = PRODUCTS.find(x => x.id === card.id);
  const cfg = cardCfg(card);
  const badge = card.badge ?? (card.cfg ? '' : p.badge);
  const open = href ? `href="${href}"` : `data-card="${ci}" role="button" tabindex="0" aria-label="Personalizar ${esc(card.title || p.name)}"`;
  const tag = href ? 'a' : 'div';
  const hasPhoto = card.photo && photoOK[card.photo] !== false;
  return `<article class="card${hasPhoto ? ' has-photo' : ''}">
    <${tag} class="card-art" style="background:${card.bg || p.bg}" ${open}>${badge ? `<span class="badge">${badge}</span>` : ''}
      <div class="art-illus">${renderProduct(p, cfg)}</div>
      ${hasPhoto ? `<img class="real" src="${card.photo}" alt="Foto real: ${esc(card.title || p.name)}" loading="lazy" style="object-position:${card.photoPos || '50% 50%'}" onerror="this.closest('.card').classList.remove('has-photo');this.remove()"><span class="real-chip"><i></i>Pedido real</span>` : ''}</${tag}>
    <div class="card-body"><h3>${card.title || p.name}</h3><p>${card.desc || p.desc}</p>
      <div class="card-row"><span class="from">desde<b>${fmt(priceOf(p, cfg).unit)}</b></span>
      ${href ? `<a class="btn btn-dark" href="${href}">Personalizar</a>` : `<button class="btn btn-dark" data-card="${ci}">Personalizar</button>`}</div></div>
  </article>`;
}
function renderGrid() {
  $('#grid').innerHTML = CARDS.map((card, ci) => {
    const p = PRODUCTS.find(x => x.id === card.id);
    return filter !== 'todos' && p.cat !== filter ? '' : cardHTML(card, ci);
  }).join('');
}
$('#filters')?.addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b || b.dataset.f === filter) return;
  filter = b.dataset.f; renderFilters();
  const g = $('#grid');
  swapContent(g, () => { renderGrid(); reveal(true); });
});

// cambia contenido con un fundido corto (solo opacidad/transform)
function swapContent(el, fn) {
  if (REDUCED) return fn();
  el.classList.add('swap-out');
  setTimeout(() => { fn(); el.classList.remove('swap-out'); el.classList.add('swap-in'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('swap-in'))); }, 140);
}

/* ---------- personalizador ---------- */
let cur = null; // { p, cfg, qty, editIdx, fig, step, photo }

function openCustom(id, cfg, qty = 1, editIdx = null, photo = null, photoPos = null) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  cur = { p, cfg: cfg ? clone(cfg) : defaults(p), qty, editIdx, fig: 0, step: 0, photo, photoPos, showPhoto: false };
  $('#cCat').textContent = photo ? 'Inspirado en un pedido real' : (CATS.find(c => c[0] === p.cat)?.[1] || '');
  $('#cTitle').textContent = p.name;
  $('#cDesc').textContent = p.desc;
  $('#cPreview').style.setProperty('--pv', p.render === 'frame' ? '#E9E1D6' : p.bg);
  const rb = $('#refBtn'); rb.hidden = !photo; rb.classList.remove('on');
  if (photo) { rb.querySelector('img').src = photo; rb.querySelector('img').style.objectPosition = photoPos || '50% 50%'; }
  $('#cHint').hidden = p.render !== 'frame';
  $('#cBreak').hidden = true; $('#brkBtn').setAttribute('aria-expanded', 'false');
  lastPrice = null;
  buildForm(); update(true);
  openModal('#custom');
  $('#cForm').scrollTop = 0;
}

const plus = n => n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : '';

// sc = 'p' (producto) o 'f' (figura activa)
function groupHTML(g, cfg, sc) {
  if (!visible(g, cfg)) return '';
  const v = cfg[g.id];
  const a = `data-sc="${sc}" data-g="${g.id}"`;
  if (g.type === 'swatch' || g.type === 'choice') {
    const sel = g.options.find(o => o.v === v);
    const head = `<div class="grp-h"><span class="l">${g.label}</span><em>${sel ? sel.label : ''}</em></div>`;
    const body = g.type === 'swatch'
      ? `<div class="sw" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" title="${o.label}" aria-label="${o.label}" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" style="--c:${o.v === 'none' ? '#fff' : o.v}" class="${o.v === 'none' ? 'none' : ''}" ${a} data-v="${o.v}"></button>`).join('')}</div>`
      : `<div class="ch" role="radiogroup" aria-label="${g.label}">${g.options.map(o => `<button type="button" role="radio" aria-checked="${o.v === v}" aria-pressed="${o.v === v}" ${a} data-v="${o.v}">${o.label}${o.price ? `<small>${plus(o.price)}</small>` : ''}</button>`).join('')}</div>`;
    return `<div class="grp">${head}${body}</div>`;
  }
  const fid = `f_${sc}_${g.id}`;
  if (g.type === 'text' || g.type === 'textarea') {
    const cnt = `${String(v || '').length}/${g.max}${g.price ? ' · ' + plus(g.price) : ''}`;
    const input = g.type === 'text'
      ? `<input type="text" id="${fid}" ${a} data-t="1" maxlength="${g.max}" placeholder="${esc(g.placeholder || '')}" value="${esc(v)}" autocomplete="off" enterkeyhint="done">`
      : `<textarea id="${fid}" ${a} data-t="1" maxlength="${g.max}" rows="3">${esc(v)}</textarea>`;
    const sug = g.suggest ? `<div class="sug" aria-label="Ideas de texto"><span>Ideas:</span>${g.suggest.map((t, i) => `<button type="button" ${a} data-sug="${i}">${esc(t.length > 34 ? t.slice(0, 32) + '…' : t)}</button>`).join('')}</div>` : '';
    return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em data-cnt="${fid}">${cnt}</em></div>${input}${sug}</div>`;
  }
  if (g.type === 'date') {
    return `<div class="grp"><div class="grp-h"><label for="${fid}">${g.label}</label><em>${v ? fmtDate(v) : ''}</em></div>
      <input type="date" id="${fid}" ${a} data-t="1" value="${esc(v)}"></div>`;
  }
  if (g.type === 'file') {
    return `<div class="grp"><div class="grp-h"><span class="l">${g.label}</span><em>${plus(g.price || 0)}</em></div>
      <label class="file">${v ? `<img class="thumb" src="${v}" alt="">` : '<span class="thumb"></span>'}<span>${v ? esc(cfg[g.id + 'Name'] || 'Imagen lista') + ' · cambiar' : 'Subir imagen (PNG/JPG)'}</span><input type="file" accept="image/*" ${a} data-file="1"></label>
      ${v ? `<button type="button" class="rm" ${a} data-clear="1" style="margin-top:8px">Quitar imagen</button>` : ''}</div>`;
  }
  if (g.type === 'stepper') {
    return `<div class="grp row"><div class="grp-h"><span class="l">${g.label}</span><em>${fmt(g.pricePer)} ${g.note}</em></div>
      <div class="step-n"><button type="button" ${a} data-d="-1" aria-label="Menos ${g.label.toLowerCase()}" ${v <= g.min ? 'disabled' : ''}>−</button><b aria-live="polite">${v}</b><button type="button" ${a} data-d="1" aria-label="Más ${g.label.toLowerCase()}" ${v >= g.max ? 'disabled' : ''}>+</button></div></div>`;
  }
  if (g.type === 'figs') {
    const i = Math.min(cur.fig, v.length - 1); cur.fig = i;
    const f = v[i];
    return `<div class="grp figs-grp"><div class="grp-h"><span class="l">${g.label} · ${fmt(g.pricePer)} c/u</span><em>${v.length} de ${g.max}</em></div>
      <div class="ftabs" role="tablist">${v.map((x, j) => `<button type="button" role="tab" aria-selected="${j === i}" aria-pressed="${j === i}" data-tab="${j}"><span class="av">${headSVG(x)}</span><span class="nm">${esc(String(x.name || '').trim() || 'Figura ' + (j + 1))}</span></button>`).join('')}
        ${v.length < g.max ? `<button type="button" class="add-fig" ${a} data-d="1" aria-label="Agregar figura"><span class="av">+</span><span class="nm">Agregar</span></button>` : ''}</div>
      <div class="figbox" role="tabpanel">
        <div class="looks"><span>Estilo rápido:</span>${LOOKS.map((l, j) => `<button type="button" data-look="${j}">${l.label}</button>`).join('')}</div>
        ${FIG_GROUPS.map(fg => groupHTML(fg, f, 'f')).join('')}
        ${v.length > g.min ? `<button type="button" class="rm del-fig" ${a} data-d="-1">Quitar ${esc(String(f.name || '').trim() || 'esta figura')}</button>` : ''}
      </div></div>`;
  }
  return '';
}

const qtyHTML = () => `<div class="grp row"><div class="grp-h"><span class="l">Cantidad</span><em>${CONFIG.bulkPct}% menos desde ${CONFIG.bulkMin}</em></div>
  <div class="step-n"><button type="button" data-qty="-1" aria-label="Menos" ${cur.qty <= 1 ? 'disabled' : ''}>−</button><b aria-live="polite">${cur.qty}</b><button type="button" data-qty="1" aria-label="Más">+</button></div></div>`;

const isLast = () => !cur.p.steps || cur.step === cur.p.steps.length - 1;

function buildForm(dir = 0) {
  const { p } = cur;
  const form = $('#cForm');
  let html;
  if (!p.steps) html = p.groups.map(g => groupHTML(g, cur.cfg, 'p')).join('') + qtyHTML();
  else {
    const s = cur.step;
    html = `<nav class="steps-nav" aria-label="Pasos"><span class="bar" style="--p:${(s + 1) / p.steps.length}"></span>${p.steps.map((t, i) => `<button type="button" data-step="${i}" ${i === s ? 'aria-current="step"' : ''} class="${i < s ? 'done' : ''}"><i>${i < s ? '✓' : i + 1}</i><span>${t}</span></button>`).join('')}</nav>`
      + `<div class="step-body">${p.groups.filter(g => (g.step || 0) === s).map(g => groupHTML(g, cur.cfg, 'p')).join('')}${isLast() ? qtyHTML() : ''}</div>`;
  }
  form.innerHTML = html;
  if (dir && !REDUCED) {
    const b = form.querySelector('.step-body');
    b && b.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  updateCTA();
}

function updateCTA() {
  const label = $('#addLabel');
  if (!isLast()) label.textContent = `Siguiente: ${cur.p.steps[cur.step + 1]}`;
  else label.textContent = !CONFIG.ordersEnabled ? 'Pedir por WhatsApp' : cur.editIdx === null ? 'Agregar al pedido' : 'Guardar cambios';
  $('#addBtn').classList.toggle('is-next', !isLast());
}

const target = sc => sc === 'f' ? cur.cfg.figs[cur.fig] : cur.cfg;
const groupsOf = sc => sc === 'f' ? FIG_GROUPS : cur.p.groups;

let lastPrice = null, priceRAF = 0;
function animatePrice(to) {
  const el = $('#cTotal');
  if (lastPrice === null || REDUCED || lastPrice === to) { el.textContent = fmt(to); lastPrice = to; return; }
  const from = lastPrice, t0 = performance.now(), D = 380;
  cancelAnimationFrame(priceRAF);
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add(to > from ? 'tick' : 'tick');
  const step = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) priceRAF = requestAnimationFrame(step);
  };
  priceRAF = requestAnimationFrame(step);
  lastPrice = to;
}

let stageRAF = 0;
function update(first = false, quiet = false) {
  const { p, cfg, qty } = cur;
  cancelAnimationFrame(stageRAF);
  stageRAF = requestAnimationFrame(() => {
    const stage = $('#cStage');
    stage.innerHTML = cur.showPhoto ? `<img class="stage-photo" src="${cur.photo}" alt="Foto real del pedido" style="object-position:${cur.photoPos || '50% 50%'}">` : renderProduct(p, cfg);
    if (!first && !quiet && !REDUCED) stage.firstElementChild?.animate([{ transform: 'scale(.985)', opacity: .7 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
  const { lines, unit } = priceOf(p, cfg);
  const t = lineTotal(unit, qty);
  animatePrice(t.total);
  $('#cBreak').innerHTML = `<ul>${lines.map(l => `<li><span>${esc(l.label)}</span><b>${l.price < 0 ? '−' + fmt(-l.price) : fmt(l.price)}</b></li>`).join('')}
    ${qty > 1 ? `<li><span>Cantidad</span><b>× ${qty}</b></li>` : ''}${t.disc ? `<li class="disc"><span>Descuento ${CONFIG.bulkPct}%</span><b>−${fmt(t.disc)}</b></li>` : ''}</ul>`;
}

$('#cForm')?.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab !== undefined) { cur.fig = +b.dataset.tab; buildForm(); return; }
  if (b.dataset.step !== undefined) { const n = +b.dataset.step, d = Math.sign(n - cur.step); cur.step = n; buildForm(d); $('#cForm').scrollTop = 0; return; }
  if (b.dataset.qty) { cur.qty = Math.max(1, Math.min(99, cur.qty + +b.dataset.qty)); buildForm(); update(false, true); return; }
  if (b.dataset.look !== undefined) {
    const f = cur.cfg.figs[cur.fig];
    Object.assign(f, LOOKS[+b.dataset.look].f);
    buildForm(); update(); return;
  }
  const sc = b.dataset.sc, id = b.dataset.g; if (!sc) return;
  const obj = target(sc), g = groupsOf(sc).find(x => x.id === id);
  if (b.dataset.sug !== undefined) { obj[id] = g.suggest[+b.dataset.sug]; buildForm(); update(); return; }
  if (b.dataset.v !== undefined) {
    if (obj[id] === b.dataset.v) return;
    obj[id] = b.dataset.v;
    // actualiza solo la selección para no perder scroll ni foco
    const wrapEl = b.parentElement;
    wrapEl.querySelectorAll('button').forEach(x => { const on = x === b; x.setAttribute('aria-pressed', on); x.setAttribute('aria-checked', on); });
    const em = b.closest('.grp').querySelector('.grp-h em'); if (em) em.textContent = g.options.find(o => o.v === b.dataset.v)?.label || '';
    // grupos condicionales o pestañas pueden cambiar: reconstruye si hace falta
    const needs = groupsOf(sc).some(x => x.showIf) || (sc === 'f' && (id === 'torso' || id === 'hair' || id === 'skin' || id === 'hairColor' || id === 'face'));
    if (needs) { const y = $('#cForm').scrollTop; buildForm(); $('#cForm').scrollTop = y; }
    update(); return;
  }
  if (b.dataset.clear) { obj[id] = ''; obj[id + 'Name'] = ''; }
  else if (b.dataset.d && g.type === 'figs') {
    const arr = obj[id];
    if (+b.dataset.d > 0 && arr.length < g.max) { arr.push(figDefault(arr.length)); cur.fig = arr.length - 1; }
    else if (+b.dataset.d < 0 && arr.length > g.min) { arr.splice(cur.fig, 1); cur.fig = Math.max(0, cur.fig - 1); }
  } else if (b.dataset.d) obj[id] = Math.max(g.min, Math.min(g.max, obj[id] + Number(b.dataset.d)));
  const y = $('#cForm').scrollTop; buildForm(); $('#cForm').scrollTop = y; update();
});
$('#cForm')?.addEventListener('input', e => {
  const el = e.target; if (!el.dataset.t) return;
  const sc = el.dataset.sc, id = el.dataset.g, g = groupsOf(sc).find(x => x.id === id);
  target(sc)[id] = el.value;
  const cnt = document.querySelector(`[data-cnt="${el.id}"]`);
  if (cnt) cnt.textContent = `${el.value.length}/${g.max}${g.price ? ' · ' + plus(g.price) : ''}`;
  if (g.type === 'date') { const em = el.closest('.grp').querySelector('em'); if (em) em.textContent = fmtDate(el.value); }
  // nombre de figura: refresca la pestaña sin perder el foco
  if (sc === 'f' && id === 'name') { const tab = document.querySelector(`[data-tab="${cur.fig}"] .nm`); if (tab) tab.textContent = el.value.trim() || 'Figura ' + (cur.fig + 1); }
  update(false, true);
});
$('#cForm')?.addEventListener('change', e => {
  const el = e.target; if (!el.dataset.file || !el.files[0]) return;
  const f = el.files[0], obj = target(el.dataset.sc), id = el.dataset.g;
  if (f.size > 8 * 1024 * 1024) return toast('Imagen muy pesada (máx. 8 MB)');
  shrinkImage(f, 900).then(url => { obj[id] = url; obj[id + 'Name'] = f.name; buildForm(); update(); });
});

// reduce la imagen para que el carrito (localStorage) no se llene
function shrinkImage(file, max) {
  return new Promise(res => {
    const img = new Image(), r = new FileReader();
    r.onload = () => { img.src = r.result; };
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
    };
    r.readAsDataURL(file);
  });
}

$('#brkBtn')?.addEventListener('click', () => {
  const b = $('#cBreak'), open = b.hidden;
  b.hidden = !open; $('#brkBtn').setAttribute('aria-expanded', open);
  if (open && !REDUCED) b.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
});
$('#refBtn')?.addEventListener('click', () => {
  cur.showPhoto = !cur.showPhoto;
  $('#refBtn').classList.toggle('on', cur.showPhoto);
  $('#refBtn span').textContent = cur.showPhoto ? 'Mi diseño' : 'Pedido real';
  $('#refBtn img').src = cur.showPhoto ? 'data:image/svg+xml,' + encodeURIComponent(renderProduct(cur.p, cur.cfg).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')) : cur.photo;
  update();
});

$('#addBtn')?.addEventListener('click', () => {
  if (!isLast()) { cur.step++; buildForm(1); $('#cForm').scrollTop = 0; return; }
  if (!CONFIG.ordersEnabled) {
    window.open(waURL(waText(cur.p, cur.cfg, cur.qty)), '_blank', 'noopener');
    return;
  }
  const item = { id: cur.p.id, cfg: clone(cur.cfg), qty: cur.qty };
  const isNew = cur.editIdx === null;
  if (isNew) cart.push(item); else cart[cur.editIdx] = item;
  flyToCart();
  saveCart(); closeModal('#custom');
  toast(isNew ? '¡Agregado a tu pedido! ✦' : 'Cambios guardados');
});

// la vista previa "vuela" al carrito flotante
function flyToCart() {
  const from = $('#cStage')?.getBoundingClientRect(), fab = $('#cartBtn');
  if (!from || !fab || REDUCED) { bumpCart(); return; }
  const to = fab.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'fly';
  ghost.innerHTML = renderProduct(cur.p, cur.cfg);
  const size = Math.min(from.width, from.height) * .8;
  Object.assign(ghost.style, { width: size + 'px', height: size + 'px', left: (from.left + from.width / 2 - size / 2) + 'px', top: (from.top + from.height / 2 - size / 2) + 'px' });
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * .5}px, ${dy * .3 - 60}px) scale(.45)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .4 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.75,0)' }).onfinish = () => { ghost.remove(); bumpCart(); };
}
function bumpCart() { const cb = $('#cartBtn'); if (!cb) return; cb.classList.remove('bump'); void cb.offsetWidth; cb.classList.add('bump'); }

// en la landing no hay personalizador: se edita en el catálogo
function editItem(idx) {
  const i = cart[idx]; if (!i) return;
  if (!$('#custom')) { location.href = `catalogo.html?edit=${idx}`; return; }
  closeDrawer(); openCustom(i.id, i.cfg, i.qty, idx);
}

/* ---------- WhatsApp ---------- */
function waCartText() {
  const { rows, total } = cartTotals();
  return ['¡Hola Pehn Design! ✦ Quiero hacer este pedido:', '',
    ...rows.flatMap((r, n) => [`*${n + 1}. ${r.p.name}* ×${r.i.qty} — ${fmt(r.total)}`, ...summary(r.p, r.i.cfg).map(([k, v]) => `• ${k}: ${v}`), '']),
    `Total estimado: *${fmt(total)}*`].join('\n');
}
const waURL = text => `https://wa.me/${CONFIG.whatsapp}${text ? '?text=' + encodeURIComponent(text) : ''}`;
function waText(p, cfg, qty) {
  const t = lineTotal(priceOf(p, cfg).unit, qty);
  const hasImg = p.groups.some(g => g.type === 'file' && cfg[g.id]);
  return [
    '¡Hola Pehn Design! ✦ Quiero este diseño:', '',
    `*${p.name}* ×${qty}`,
    ...summary(p, cfg).map(([k, v]) => `• ${k}: ${v}`), '',
    `Total estimado: *${fmt(t.total)}*${t.disc ? ` (incluye ${CONFIG.bulkPct}% de descuento)` : ''}`,
    hasImg ? '(Te mando mi imagen por aquí)' : '',
  ].join('\n').trim();
}
document.querySelectorAll('.wa-link').forEach(el => { el.href = waURL('¡Hola Pehn Design! ✦ Quiero cotizar un diseño.'); });

/* ---------- carrito ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('pehn_cart') || '[]').filter(i => PRODUCTS.some(p => p.id === i.id)); } catch { cart = []; }
function saveCart() {
  try { localStorage.setItem('pehn_cart', JSON.stringify(cart)); } catch { /* sin storage: sigue en memoria */ }
  const n = $('#cartCount'); if (n) n.textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function cartTotals() {
  let gross = 0, disc = 0;
  const rows = cart.map(i => {
    const p = PRODUCTS.find(x => x.id === i.id);
    const { unit } = priceOf(p, i.cfg);
    const t = lineTotal(unit, i.qty);
    gross += t.gross; disc += t.disc;
    return { i, p, unit, ...t };
  });
  return { rows, gross, disc, total: gross - disc };
}

let view = 'cart';
function renderDrawer() {
  if (!CONFIG.ordersEnabled) {
    $('#dTitle').textContent = 'Pedidos en línea';
    $('#dBody').innerHTML = `<div class="empty locked-box"><div class="lock-ico"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1a5 5 0 0 0-5 5v3H5v14h14V9h-2V6a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v3H9V6Z"/></svg></div><p><b>El carrito abre muy pronto.</b><br>Mientras tanto, personaliza tu diseño y mándalo por WhatsApp con un clic: te llega con todos los detalles y el precio.</p></div>`;
    $('#dFoot').innerHTML = `<a class="btn btn-dark" href="${waURL('¡Hola Pehn Design! ✦ Quiero hacer un pedido.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a><p class="note">Pagos y carrito en línea: próximamente.</p>`;
    return;
  }
  const { rows, gross, disc, total } = cartTotals();
  if (!rows.length) {
    view = 'cart';
    $('#dBody').innerHTML = `<div class="empty">${minifigSVG({ ...FIG_PRESETS[5], face: 'guino', name: '' })}<p><b>Tu pedido está vacío.</b><br>Elige un producto y hazlo tuyo.</p></div>`;
    $('#dFoot').innerHTML = `<a href="catalogo.html" class="btn btn-dark">Ver catálogo</a>`;
    return;
  }
  if (view === 'checkout') return renderCheckout(total);
  $('#dBody').innerHTML = rows.map((r, idx) => `<div class="item" style="--i:${idx}">
    <div class="th" style="background:${r.p.render === 'frame' ? '#E9E1D6' : r.p.bg}">${renderProduct(r.p, r.i.cfg)}</div>
    <div><h4>${r.p.name}</h4><ul>${summary(r.p, r.i.cfg).slice(0, 5).map(([k, v]) => `<li>${esc(k)}: <b>${esc(String(v).slice(0, 60))}</b></li>`).join('')}</ul>
      <button class="rm" data-edit="${idx}">Editar</button> · <button class="rm" data-del="${idx}">Quitar</button></div>
    <div class="side"><div><b>${fmt(r.total)}</b><small>${r.i.qty} × ${fmt(r.unit)}</small>${r.disc ? `<small style="color:var(--green)">−${CONFIG.bulkPct}%</small>` : ''}</div></div>
  </div>`).join('');
  $('#dFoot').innerHTML = `<div class="tot"><span>Subtotal</span><span>${fmt(gross)}</span></div>
    ${disc ? `<div class="tot"><span>Descuento por volumen</span><span class="disc">−${fmt(disc)}</span></div>` : ''}
    <div class="tot"><span>Envío</span><span>Se cotiza al confirmar</span></div>
    <div class="tot big"><span>Total</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="goCheckout">Continuar con mis datos →</button>
    <a class="btn btn-ghost wa-cart" href="${waURL(waCartText())}" target="_blank" rel="noopener">o pídelo por WhatsApp</a>
    <p class="note">No se cobra nada aún. Primero te enviamos tu diseño para aprobar.</p>`;
}

function renderCheckout(total) {
  const d = (() => { try { return JSON.parse(localStorage.getItem('pehn_contact') || '{}'); } catch { return {}; } })();
  $('#dBody').innerHTML = `<button class="back" id="backCart">← Volver al pedido</button>
    <form class="co" id="coForm" novalidate>
      <label>Nombre completo<input name="name" autocomplete="name" required value="${esc(d.name)}"></label>
      <div class="row2">
        <label>WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="10 dígitos" value="${esc(d.phone)}"></label>
        <label>Correo<input name="email" type="email" inputmode="email" autocomplete="email" required value="${esc(d.email)}"></label>
      </div>
      <div class="row2">
        <label>Ciudad<input name="city" autocomplete="address-level2" required value="${esc(d.city)}"></label>
        <label>¿Para cuándo?<input name="date" type="date"></label>
      </div>
      <label>Notas para el diseño<textarea name="notes" placeholder="Ej. él usa lentes redondos, ella tiene fleco; es para nuestro aniversario..."></textarea></label>
      <div class="err" id="coErr" role="alert"></div>
    </form>`;
  $('#dFoot').innerHTML = `<div class="tot big"><span>Total estimado</span><span>${fmt(total)}</span></div>
    <button class="btn btn-dark" id="sendOrder">Enviar pedido ✦</button>
    <p class="note">Recibirás confirmación por WhatsApp y correo.</p>`;
}

$('#drawer')?.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.del !== undefined) {
    const row = t.closest('.item');
    const go = () => { cart.splice(+t.dataset.del, 1); saveCart(); renderDrawer(); };
    if (REDUCED || !row) go(); else row.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(40px)' }], { duration: 200, easing: 'ease-in' }).onfinish = go;
  }
  else if (t.dataset.edit !== undefined) { editItem(+t.dataset.edit); }
  else if (t.id === 'goCheckout') { view = 'checkout'; renderDrawer(); }
  else if (t.id === 'backCart') { view = 'cart'; renderDrawer(); }
  else if (t.id === 'sendOrder') handleSend(t);
});

async function handleSend(btn) {
  const f = $('#coForm'), err = $('#coErr');
  const data = Object.fromEntries(new FormData(f));
  const missing = ['name', 'phone', 'email', 'city'].filter(k => !String(data[k] || '').trim());
  if (missing.length) { err.textContent = 'Completa nombre, WhatsApp, correo y ciudad.'; f.elements[missing[0]].focus(); return; }
  if (!/^\S+@\S+\.\S+$/.test(data.email)) { err.textContent = 'Revisa tu correo.'; f.elements.email.focus(); return; }
  if (String(data.phone).replace(/\D/g, '').length < 10) { err.textContent = 'Revisa tu número de WhatsApp.'; f.elements.phone.focus(); return; }
  err.textContent = '';
  try { localStorage.setItem('pehn_contact', JSON.stringify({ name: data.name, phone: data.phone, email: data.email, city: data.city })); } catch { }

  const { rows, gross, disc, total } = cartTotals();
  const order = {
    id: 'PEHN-' + Date.now().toString(36).toUpperCase().slice(-6),
    createdAt: new Date().toISOString(),
    customer: data,
    currency: CONFIG.currency,
    items: rows.map(r => ({
      product: r.p.name, qty: r.i.qty, unitPrice: r.unit, discount: r.disc, total: r.total,
      options: summary(r.p, r.i.cfg),
      images: r.p.groups.filter(g => g.type === 'file' && r.i.cfg[g.id]).map(g => r.i.cfg[g.id]),
    })),
    subtotal: gross, discount: disc, total,
  };

  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    await submitOrder(order);
    cart = []; saveCart(); view = 'cart'; closeDrawer();
    $('#doneTxt').innerHTML = `Tu número de pedido es <b>${order.id}</b>.<br>Total estimado <b>${fmt(total)}</b>.<br>Te escribimos a <b>${esc(data.phone)}</b> con tu diseño para aprobar.`;
    openModal('#done');
  } catch {
    $('#coErr').textContent = 'No se pudo enviar. Intenta de nuevo.';
  } finally { btn.disabled = false; btn.textContent = 'Enviar pedido ✦'; }
}

/* ===== ENVÍO DEL PEDIDO =====
   PENDIENTE (requiere autorización): conectar a Google Sheets / CRM
   y disparar mensaje de confirmación al cliente.
   Por ahora solo simula el envío y deja el pedido en consola. */
async function submitOrder(order) {
  console.log('[Pehn] pedido listo para enviar:', order);
  await new Promise(r => setTimeout(r, 700));
  return { ok: true };
}

/* ---------- modales (entrada y salida animadas) ---------- */
let lastFocus = null;
function openModal(s) {
  const m = $(s); if (!m || m.classList.contains('open')) return;
  lastFocus = document.activeElement;
  m.classList.remove('closing'); m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => (m.querySelector('.sheet,.d-panel,.done-card') || m).focus?.({ preventScroll: true }), 50);
}
function closeModal(s) {
  const m = $(s); if (!m || !m.classList.contains('open')) return;
  const done = () => {
    m.classList.remove('open', 'closing'); m.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.open,.drawer.open')) document.body.style.overflow = '';
    lastFocus?.focus?.({ preventScroll: true });
  };
  if (REDUCED) return done();
  m.classList.add('closing');
  setTimeout(done, 200);
}
function openDrawer() { renderDrawer(); openModal('#drawer'); }
function closeDrawer() { closeModal('#drawer'); }

document.addEventListener('click', e => {
  const c = e.target.closest('[data-card]');
  if (c) { openCard(+c.dataset.card); return; }
  if (e.target.closest('[data-close]')) closeModal('#custom');
  if (e.target.closest('[data-dclose]')) closeDrawer();
  if (e.target.closest('[data-xdone]')) closeModal('#done');
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card-art[data-card]')) { e.preventDefault(); openCard(+e.target.dataset.card); }
  if (e.key !== 'Escape') return;
  ['#done', '#custom'].forEach(s => $(s)?.classList.contains('open') && closeModal(s));
  if ($('#drawer')?.classList.contains('open')) closeDrawer();
});
$('#cartBtn')?.addEventListener('click', openDrawer);

// fotos reales: solo se ofrecen si el archivo existe
const photoOK = {};
CARDS.forEach(c => {
  if (!c.photo || c.photo in photoOK) return;
  photoOK[c.photo] = null;
  const im = new Image();
  im.onload = () => { photoOK[c.photo] = true; };
  im.onerror = () => { photoOK[c.photo] = false; };
  im.src = c.photo;
});
function openCard(ci) {
  const card = CARDS[ci]; if (!card) return;
  openCustom(card.id, cardCfg(card), 1, null, card.photo && photoOK[card.photo] !== false ? card.photo : null, card.photoPos);
}

let toastT;
function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

/* ---------- hero: cuadros que se van cruzando ---------- */
const HERO = [0, 1, 3, 2, 4].map(i => CARDS[i].cfg);
let heroI = 0, heroTimer = 0;
function hero(animate = true) {
  const box = $('#heroFig'); if (!box) return;
  const layer = document.createElement('div');
  layer.className = 'hero-layer';
  layer.innerHTML = frameSVG({ ...defaults(PRODUCTS[0]), ...clone(HERO[heroI % HERO.length]) });
  box.appendChild(layer);
  const old = [...box.children].slice(0, -1);
  if (!animate || REDUCED) { old.forEach(o => o.remove()); return; }
  layer.animate([{ opacity: 0, transform: 'translateY(14px) rotate(-1.5deg) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
  old.forEach(o => o.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-10px) scale(.98)' }], { duration: 450, easing: 'ease-in', fill: 'forwards' }).onfinish = () => o.remove());
}
if ($('#heroFig')) {
  hero(false);
  const next = () => { heroI++; hero(); };
  $('#shuffle').addEventListener('click', () => { next(); clearInterval(heroTimer); heroTimer = setInterval(() => !document.hidden && next(), 5000); });
  if (!REDUCED) heroTimer = setInterval(() => !document.hidden && next(), 5000);
}

// huecos de fotos reales: si no existe el archivo se muestra el aviso
document.querySelectorAll('img[data-ph]').forEach(img => {
  const fail = () => {
    const f = img.closest('.ph'); f.classList.add('missing');
    f.insertAdjacentHTML('afterbegin', `<div class="ph-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg><b>Foto real aquí</b><small>fotos/${img.dataset.ph}</small></div>`);
    img.remove();
  };
  if (img.complete && !img.naturalWidth) fail(); else img.addEventListener('error', fail);
});

// blog: ilustraciones mientras no hay fotos
const MINIS = [CARDS[0].cfg, CARDS[3].cfg, CARDS[1].cfg];
document.querySelectorAll('[data-mini]').forEach(el => { el.innerHTML = frameSVG({ ...defaults(PRODUCTS[0]), ...clone(MINIS[+el.dataset.mini]) }); });

if ($('#featured')) $('#featured').innerHTML = [0, 1, 3].map(i => cardHTML(CARDS[i], i, `catalogo.html?card=${i}`)).join('');

/* ---------- movimiento y navegación ---------- */
const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
function reveal(fresh = false) {
  if (!io) return;
  document.querySelectorAll('.sec-head,.step,.card,.ph,.rev,.post,.faq details,.promo-card,.story-in>*').forEach(el => {
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 6);
    if (fresh) requestAnimationFrame(() => el.classList.add('in')); else io.observe(el);
  });
}
reveal();

// tarjetas: leve inclinación siguiendo el puntero (solo mouse)
if (matchMedia('(hover: hover) and (pointer: fine)').matches && !REDUCED) {
  document.addEventListener('pointermove', e => {
    const art = e.target.closest?.('.card-art'); if (!art) return;
    const r = art.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    art.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg'); art.style.setProperty('--ry', (x * 6).toFixed(2) + 'deg');
  }, { passive: true });
  document.addEventListener('pointerout', e => { const art = e.target.closest?.('.card-art'); if (art && !art.contains(e.relatedTarget)) { art.style.removeProperty('--rx'); art.style.removeProperty('--ry'); } });
}

const nav = $('.nav');
const spy = [...document.querySelectorAll('.links a[href^="#"]')].map(a => [a, document.querySelector(a.getAttribute('href'))]).filter(x => x[1]);
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', scrollY > 8);
    let curA = null;
    spy.forEach(([a, sec]) => { if (sec.getBoundingClientRect().top < innerHeight * .4) curA = a; });
    spy.forEach(([a]) => a.classList.toggle('active', a === curA));
    ticking = false;
  });
}, { passive: true });

if (!CONFIG.ordersEnabled) document.body.classList.add('locked');
$('#yr').textContent = new Date().getFullYear();
if ($('#grid')) {
  const q = new URLSearchParams(location.search);
  if (CATS.some(c => c[0] === q.get('cat'))) filter = q.get('cat');
  renderFilters(); renderGrid(); reveal();
  if (q.has('card')) openCard(+q.get('card'));
  else if (q.has('edit')) editItem(+q.get('edit'));
}
saveCart();
