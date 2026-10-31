/* Pehn Design — ACCESORIOS EN LA MANO de las minifiguras (dibujos chicos, estilo pieza de plástico).
   Cada uno se dibuja con el origen (0, 0) en la mano en C derecha; lo usa dibujos.js (handSVG).
   Para agregar uno: una entrada más en ACC con la misma clave que su opción en datos.js (grupo 'hand').
   Sin dibujo propio (o uno nuevo sin dibujar todavía) -> se ve la ficha redonda con su inicial. */

const B = 'stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"';
const brillo = (x, y, w = 6) => `<path d="M${x} ${y}h${w}" stroke="#fff" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"/>`;

export const ACC = {
  flores: `<g ${B}><path d="M0 2L-7-20M0 2L0-26M0 2L7-20" stroke="#2F8F5B" stroke-width="2.4" fill="none"/>
    <circle cx="-7" cy="-22" r="5.5" fill="#F48FB1" stroke="#C2577E"/><circle cx="0" cy="-28" r="5.5" fill="#FFD23F" stroke="#B88A2A"/><circle cx="7" cy="-22" r="5.5" fill="#E5484D" stroke="#9E2B2F"/>
    <path d="M-9-6H9L4 8H-4Z" fill="#E9D8B4" stroke="#B39B6E"/></g>`,
  taza: `<g ${B}><path d="M5-10a6 6 0 0 1 0 10" fill="none" stroke="#C9C2B8" stroke-width="3"/><rect x="-9" y="-16" width="15" height="17" rx="2" fill="#FFFDF9" stroke="#B9B2A8"/>
    <ellipse cx="-1.5" cy="-15" rx="6.5" ry="1.8" fill="#6B4428"/>${brillo(-6, -11, 3)}</g>`,
  microfono: `<g ${B}><rect x="-2.5" y="-8" width="5" height="16" rx="2" fill="#2A2522" stroke="#000"/><circle cx="0" cy="-13" r="6.5" fill="#B9B4AE" stroke="#6E6A66"/>
    <path d="M-4-15h8M-5-12h10M-4-9h8" stroke="#6E6A66" stroke-width=".9"/></g>`,
  pelota: `<g ${B}><circle cx="0" cy="-12" r="10" fill="#FFFDF9" stroke="#3A332E"/><path d="M0-17l4 3-1.5 4.5h-5L-4-14Z" fill="#2A2522"/>
    <path d="M0-22v5M4-14l6-2M2.5-9.5l3 5M-2.5-9.5l-3 5M-4-14l-6-2" stroke="#2A2522" stroke-width="1.1"/></g>`,
  helado: `<g ${B}><path d="M0 8L-6-10H6Z" fill="#D9A766" stroke="#9A6F38"/><path d="M-4-4L3 3M-2-9L5-2" stroke="#9A6F38" stroke-width=".9"/>
    <circle cx="0" cy="-15" r="7.5" fill="#F7B6C8" stroke="#C2577E"/>${brillo(-4, -18, 3)}</g>`,
  vino: `<g ${B}><path d="M-7-26H7Q8-12 0-10Q-8-12-7-26Z" fill="#fff" fill-opacity=".55" stroke="#9AA3AA"/><path d="M-6.5-20H6.5Q6-12 0-11Q-6-12-6.5-20Z" fill="#8E1B2E"/>
    <path d="M0-10V4M-6 5H6" stroke="#9AA3AA" stroke-width="2"/></g>`,
  trofeo: `<g ${B}><path d="M-8-24H8Q8-12 0-10Q-8-12-8-24Z" fill="#E0B44C" stroke="#9E7A22"/><path d="M-8-21Q-14-21-12-15Q-11-12-6-13M8-21Q14-21 12-15Q11-12 6-13" fill="none" stroke="#9E7A22" stroke-width="1.6"/>
    <path d="M0-10V-2M-6 0H6V4H-6Z" fill="#E0B44C" stroke="#9E7A22"/>${brillo(-5, -21, 3)}</g>`,
  cocacola: `<g ${B}><rect x="-5.5" y="-22" width="11" height="22" rx="2" fill="#C8102E" stroke="#7E0A1D"/><path d="M-5.5-12q5.5-4 11 0" fill="none" stroke="#fff" stroke-width="1.6"/>
    <rect x="-5" y="-23" width="10" height="2.4" rx="1" fill="#C9C2B8"/>${brillo(-3, -18, 1.5)}</g>`,
  maletin: `<g ${B}><path d="M-5 0v-6h10V0" fill="none" stroke="#3A2618" stroke-width="2.2"/><rect x="-13" y="0" width="26" height="18" rx="2.5" fill="#6B4428" stroke="#3A2618"/>
    <path d="M-13 7H13" stroke="#3A2618"/><rect x="-2" y="5" width="4" height="4" fill="#E0B44C"/></g>`,
  cartera: `<g ${B}><path d="M-6 0Q0-10 6 0" fill="none" stroke="#7A1A24" stroke-width="2"/><path d="M-11 2H11L9 18H-9Z" fill="#B3262E" stroke="#7A1A24"/>
    <path d="M-11 2L0 10L11 2" fill="none" stroke="#7A1A24"/><circle cx="0" cy="10" r="1.8" fill="#E0B44C"/></g>`,
  camara: `<g ${B}><rect x="-12" y="-17" width="24" height="15" rx="2.5" fill="#2A2522" stroke="#000"/><rect x="-7" y="-20" width="8" height="4" rx="1" fill="#2A2522" stroke="#000"/>
    <circle cx="0" cy="-9.5" r="5" fill="#4A4642" stroke="#B9B4AE" stroke-width="1.6"/><circle cx="-1.5" cy="-11" r="1.5" fill="#fff" opacity=".6"/></g>`,
  mando: `<g ${B}><path d="M-13-9Q-13-15-7-15H7Q13-15 13-9L15 0Q15 4 11 3L7-1H-7L-11 3Q-15 4-15 0Z" fill="#2A2522" stroke="#000"/>
    <path d="M-9-10v5M-11.5-7.5h5" stroke="#B9B4AE" stroke-width="1.6"/><circle cx="7" cy="-10" r="1.4" fill="#4B7BF5"/><circle cx="10" cy="-7" r="1.4" fill="#E5484D"/></g>`,
  guitarra: `<g ${B}><path d="M-2-6L14-40" stroke="#5A3720" stroke-width="3.4"/><rect x="11" y="-46" width="7" height="8" rx="1.5" fill="#3A2618" transform="rotate(25 14 -42)"/>
    <path d="M-14 12Q-22 4-14-4Q-12-12-4-10Q4-12 4-4Q10 4 2 10Q-4 18-14 12Z" fill="#C2772E" stroke="#7A4A1C"/><circle cx="-5" cy="1" r="3.2" fill="#3A2618"/></g>`,
  osito: `<g ${B}><circle cx="-6" cy="-23" r="3.2" fill="#8A5634" stroke="#5A3720"/><circle cx="6" cy="-23" r="3.2" fill="#8A5634" stroke="#5A3720"/>
    <circle cx="0" cy="-17" r="7.5" fill="#A8692E" stroke="#5A3720"/><ellipse cx="0" cy="-3" rx="8" ry="9" fill="#A8692E" stroke="#5A3720"/>
    <circle cx="-2.5" cy="-18" r="1.1" fill="#231A14"/><circle cx="2.5" cy="-18" r="1.1" fill="#231A14"/><ellipse cx="0" cy="-14.5" rx="2.4" ry="1.8" fill="#E9C9A0"/></g>`,
  croissant: `<g ${B}><path d="M-14-8Q-10-20 0-20Q10-20 14-8Q10-12 6-10Q2-14-2-14Q-6-14-6-10Q-10-12-14-8Z" fill="#D9A766" stroke="#9A6F38"/>
    <path d="M-6-10L-3-19M2-14L3-20M6-10L8-18" stroke="#9A6F38" stroke-width="1.1"/></g>`,
  hotdog: `<g ${B}><rect x="-14" y="-13" width="28" height="9" rx="4.5" fill="#B5462E" stroke="#7A2A1A"/><path d="M-14-8Q0-1 14-8V-6Q14 0 0 0Q-14 0-14-6Z" fill="#E1B26A" stroke="#9A6F38"/>
    <path d="M-10-12Q-6-9-2-12T6-12T12-11" fill="none" stroke="#FFD23F" stroke-width="1.6"/></g>`,
  varita: `<g ${B}><path d="M0 4L8-24" stroke="#2A2522" stroke-width="2.6"/><path transform="translate(9 -27) scale(.5)" d="M0-14l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L0 7.1l-8.4 4.5 1.8-9.3-6.9-6.5 9.4-1.2Z" fill="#FFD23F" stroke="#B88A2A" stroke-width="2"/></g>`,
  peine: `<g ${B}><rect x="-3" y="-24" width="6" height="30" rx="2" fill="#F06AA6" stroke="#B33A63"/><path d="M3-21h4M3-17h4M3-13h4M3-9h4M3-5h4" stroke="#B33A63" stroke-width="1.4"/></g>`,
  gym: `<g ${B}><rect x="-12" y="-2.5" width="24" height="5" rx="2" fill="#6E6A66" stroke="#3A3632"/><rect x="-17" y="-8" width="6" height="16" rx="2" fill="#2A2522" stroke="#000"/><rect x="11" y="-8" width="6" height="16" rx="2" fill="#2A2522" stroke="#000"/></g>`,
  laptop: `<g ${B}><rect x="-15" y="-4" width="30" height="20" rx="2" fill="#B9B4AE" stroke="#6E6A66"/><circle cx="0" cy="6" r="2.2" fill="#E8E4DE"/>${brillo(-11, 0, 8)}</g>`,
  bebe: `<g ${B}><ellipse cx="0" cy="-6" rx="10" ry="12" fill="#F7F4EE" stroke="#C9C2B8"/><circle cx="0" cy="-15" r="6" fill="#F6D3B3" stroke="#C49A74"/>
    <circle cx="-2" cy="-15.5" r=".9" fill="#231A14"/><circle cx="2" cy="-15.5" r=".9" fill="#231A14"/><path d="M-2-12.5q2 1.6 4 0" fill="none" stroke="#231A14" stroke-width=".9"/></g>`,
};
