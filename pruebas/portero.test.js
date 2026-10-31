/* Prueba del PORTERO de Cloudflare (functions/api.js), sin Cloudflare: Google y Turnstile simulados.
   Correr:  node pruebas/portero.test.js */
import { onRequestPost, onRequestGet, pasa } from '../functions/api.js';

let fallas = 0, n = 0;
const ok = (c, m) => { n++; console.log(c ? '✓' : '✗', m); if (!c) fallas++; };

// Google y Cloudflare simulados: guardan lo que se les mandó
const llamadas = [];
let ultimoCuerpo = '', turnstileDice = true, googleDice = () => '{"ok":true,"id":"PD-1"}';
globalThis.fetch = async (url, o = {}) => {
  const cuerpo = o.body instanceof URLSearchParams ? Object.fromEntries(o.body) : o.body ? await new Response(o.body).text() : '';
  llamadas.push({ url: String(url), o, cuerpo });
  if (String(url).includes('turnstile')) return Response.json({ success: turnstileDice });
  // como Apps Script: el POST contesta 302 hacia la respuesta, que se pide con GET
  if (o.method === 'POST') { ultimoCuerpo = cuerpo; return new Response(null, { status: 302, headers: { Location: 'https://script.googleusercontent.com/macros/echo?user_content_key=abc' } }); }
  return new Response(googleDice(ultimoCuerpo));
};
const env = { SITE_TOKEN: 'secreto-xyz' };
let ipN = 0;
const pedir = (accion, cuerpo, { ip = '10.0.0.' + (++ipN), cabeceras = {}, e = env } = {}) => {
  const body = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  const request = new Request('https://pehn.test/api', {
    method: 'POST', body, headers: { 'Content-Type': 'text/plain', 'Content-Length': String(Buffer.byteLength(body)), 'CF-Connecting-IP': ip, ...(accion ? { 'X-Accion': accion } : {}), ...cabeceras },
  });
  return onRequestPost({ request, env: e }).then(r => r.json());
};
const ultima = () => llamadas[llamadas.length - 1];
const alGoogle = () => llamadas.filter(l => l.o.method === 'POST' && l.url.startsWith('https://script.google.com/')).pop();

// 1. pasa a Google con token, IP y acción agregados al final; lo del navegador no los puede pisar
llamadas.length = 0;
let r = await pedir('pedido', { customer: { name: 'Ana 😊 ñ' }, token: 'del-navegador', ip: '1.1.1.1', portero: true, accion: 'otra' }, { ip: '203.0.113.9' });
const llego = JSON.parse(alGoogle().cuerpo);
ok(r.ok && r.id === 'PD-1', 'Devuelve lo que contesta Apps Script');
ok(llego.token === 'secreto-xyz' && llego.ip === '203.0.113.9' && llego.portero === false && llego.accion === 'pedido', 'Token secreto, IP real, acción de la cabecera y portero=false: el navegador no los puede pisar');
ok(llego.customer.name === 'Ana 😊 ñ', 'El pedido llega intacto (acentos y emojis incluidos)');
ok(alGoogle().o.redirect === 'manual' && ultima().url.startsWith('https://script.googleusercontent.com/') && !ultima().o.method, 'Va a la app web de Apps Script y sigue su redirección con GET');

// 2. lo que no pasa
llamadas.length = 0;
ok(/Acción desconocida/.test((await pedir('borrarTodo', { a: 1 })).error) && /Acción desconocida/.test((await pedir('', { a: 1 })).error), 'Acción que no existe: no pasa');
ok(!(await pedir('pedido', '[1,2]')).ok, 'Cuerpo que no es un objeto JSON: no llega armado a Google');
ok(/Demasiado grande/.test((await pedir('pedido', { a: 1 }, { cabeceras: { 'Content-Length': String(31e6) } })).error), 'Más de 30 MB: no pasa');
ok(/procesar/.test((await pedir('pedido', { a: 1 }, { e: {} })).error), 'Sin SITE_TOKEN en Cloudflare: error genérico (y aviso en el registro)');
googleDice = () => '<html>Google error</html>';
ok(/procesar/.test((await pedir('seguimiento', { id: 'x' })).error), 'Si Google contesta HTML (caído), mensaje genérico');
googleDice = () => '{"ok":true,"id":"PD-1"}';

// 3. Turnstile en el portero
llamadas.length = 0; turnstileDice = false;
const conTs = { ...env, TURNSTILE_SECRET: 'ts-sec' };
r = await pedir('pedido', { a: 1 }, { e: conTs, cabeceras: { 'X-Turnstile': 'tok-malo' } });
ok(!r.ok && /Verificación fallida/.test(r.error) && llamadas.length === 1 && llamadas[0].cuerpo.secret === 'ts-sec', 'Turnstile malo: se frena antes de tocar Google');
llamadas.length = 0; turnstileDice = true;
r = await pedir('pedido', { a: 1 }, { e: conTs, cabeceras: { 'X-Turnstile': 'tok-bueno' } });
ok(r.ok && JSON.parse(alGoogle().cuerpo).portero === true, 'Turnstile bueno: pasa con portero=true (Apps Script no lo vuelve a revisar)');
ok(!(await pedir('pedido', { a: 1 }, { e: conTs })).ok, 'Sin token de Turnstile: no pasa');
llamadas.length = 0;
await pedir('seguimiento', { id: 'x' }, { e: conTs });
ok(!llamadas.some(l => l.url.includes('turnstile')), 'Turnstile solo se pide al hacer el pedido');

// 4. límite por IP
const ip = '198.51.100.50';
const seguidos = [];
for (let i = 0; i < 5; i++) seguidos.push((await pedir('pedido', { a: i }, { ip })).ok);
ok(seguidos.slice(0, 4).every(Boolean) && !seguidos[4], 'Límite por IP: el 5º pedido en 10 min se frena aquí mismo');
ok(pasa('9.9.9.9', 'pedido', 0) && pasa('9.9.9.9', 'pedido', 601e3), 'El límite se reinicia pasado el tiempo');

// 5. textos del sitio (GET)
llamadas.length = 0;
googleDice = () => '{"ok":true,"sitio":{"anuncio":"Hola"}}';
const g = await onRequestGet({ request: new Request('https://pehn.test/api?api=sitio'), env });
ok((await g.json()).sitio.anuncio === 'Hola' && /max-age=60/.test(g.headers.get('Cache-Control')) && ultima().url.endsWith('?api=sitio'), 'Textos del sitio: pasan con un minuto de caché');
ok(!(await (await onRequestGet({ request: new Request('https://pehn.test/api?api=pedidos'), env })).json()).ok, 'GET de otra cosa: no');

console.log(fallas ? `\n${fallas} de ${n} fallaron` : '\nTodo pasó');
process.exit(fallas ? 1 : 0);
