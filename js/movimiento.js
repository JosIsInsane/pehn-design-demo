/* Pehn Design — MOVIMIENTO Y NAVEGACIÓN: aparición al desplazar, barra superior, menú móvil y sección activa.
   Depende de: base.js, marco.js (el menú ya está en la página). Lo usan todas las páginas; el catálogo llama a reveal() al pintar tarjetas.
   Si la página pinta tarjetas por JavaScript (inicio), este archivo va DESPUÉS de inicio.js para que también aparezcan. */

// ---------- aparición al desplazar ----------
const io = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px' });
function reveal(fresh = false) {
  if (!io) return;
  document.querySelectorAll('.sec-head,.how,.cat-tile,.card,.ph,.rev,.post,.faq details,.cta-band,.trust-item,.story-in>*').forEach(el => {
    if (el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    el.style.setProperty('--i', [...el.parentElement.children].indexOf(el) % 6);
    if (fresh) requestAnimationFrame(() => el.classList.add('in')); else io.observe(el);
  });
}
reveal();

// ---------- barra superior y enlace activo ----------
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

// ---------- menú móvil ----------
$('#menuBtn')?.addEventListener('click', () => {
  const m = $('#mNav'), open = !m.classList.contains('open');
  m.classList.toggle('open', open); $('#menuBtn').setAttribute('aria-expanded', open);
});
document.querySelectorAll('#mNav a').forEach(l => l.addEventListener('click', () => { $('#mNav').classList.remove('open'); $('#menuBtn')?.setAttribute('aria-expanded', 'false'); }));
