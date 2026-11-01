/* Pehn Design — PORTERO del sistema de pedidos: Cloudflare Pages Function en /api.
   La web ya no habla directo con Google: todo pasa por aquí y recién después va a Apps Script (apps-script/Orders.gs › doPost).

   Qué hace:
   - Guarda el token del sitio en secreto (variable SITE_TOKEN de Cloudflare). El navegador ya no lo ve.
   - Solo deja pasar las acciones que existen y un tamaño máximo.
   - Límite por IP (Apps Script no ve la IP): un primer filtro aquí y la cuenta de verdad allá (le manda la IP).
   - Turnstile (si existe TURNSTILE_SECRET): revisa que sea una persona ANTES de tocar Google.
   - No abre el pedido (trae fotos y pesa megas; el plan gratis da ~10 ms de CPU): lo pasa tal cual y solo le
     agrega al final  ,"accion":…,"token":…,"ip":…,"portero":…}  — en JSON gana la última clave repetida,
     así nadie puede colar su propio token, IP o "portero" desde el navegador.

   Variables en Cloudflare (Pages › pehn-design-demo › Settings › Variables and Secrets), para Production y Preview:
     SITE_TOKEN        (secreto, obligatoria)  el de Config › Token del sitio
     TURNSTILE_SECRET  (secreto, opcional)     la "Secret key" del widget de Turnstile
     APPS_SCRIPT_URL   (opcional)              si cambia la URL de la app web; si no, se usa APPS_SCRIPT de abajo
   Después de cambiar una variable hay que volver a publicar (Deployments › ⋯ › Retry deployment). */

const APPS_SCRIPT = 'https://script.google.com/macros/s/AKfycbyZ0Z1nr735rQ9tn2YSaYUtXEyDUL7fBQiMF78JuiRdUnRtzCt6BALCHgane8wpnsO5/exec';
// acción → [máximo por IP, en cuántos segundos]. Apps Script lleva los mismos topes con su caché (aguanta varias instancias).
export const TOPES = { pedido: [4, 600], comprobante: [8, 3600], verificar: [30, 3600], seguimiento: [30, 600], misPedidos: [30, 600],
  editorCodigo: [5, 600], editorEntrar: [10, 600], editorDatos: [60, 600], editorGuardar: [60, 600], editorFoto: [20, 600] }; // editor del sitio (/admin)
const MAX_BYTES = 30e6; // igual que LIMITS.body de Orders.gs
const ERROR = 'No se pudo procesar. Intenta de nuevo o escríbenos por WhatsApp.';

const json = (cuerpo, extra = {}) => new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
// el sitio lee { ok, error } y muestra el error: por eso los rechazos van con 200
const no = error => json({ ok: false, error });

// primer filtro por IP, en la memoria de esta instancia (se reinicia sola; la cuenta fina la lleva Apps Script)
const golpes = new Map();
export function pasa(ip, accion, ahora = Date.now()) {
  const [max, seg] = TOPES[accion], k = ip + '|' + accion, g = golpes.get(k);
  if (golpes.size > 5000) golpes.clear(); // que no crezca sin fin
  if (!g || ahora - g.desde > seg * 1000) { golpes.set(k, { desde: ahora, n: 1 }); return true; }
  return ++g.n <= max;
}

async function turnstileOk(token, ip, secret) {
  if (!token || token.length > 2048) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token, remoteip: ip }) });
    return (await r.json()).success === true;
  } catch { return false; }
}

// pasa el cuerpo tal cual, menos su "}" final, y al terminar pega `extra` (que cierra el objeto)
function cerrarCon(body, extra) {
  let ultimo = -1;
  return body.pipeThrough(new TransformStream({
    transform(trozo, ctl) {
      if (!trozo.length) return;
      if (ultimo >= 0) ctl.enqueue(Uint8Array.of(ultimo));
      ctl.enqueue(trozo.subarray(0, trozo.length - 1));
      ultimo = trozo[trozo.length - 1];
    },
    flush(ctl) { if (ultimo !== 0x7d) throw new Error('Formato inválido.'); ctl.enqueue(extra); },
  }));
}

export async function onRequestPost({ request, env }) {
  const accion = request.headers.get('X-Accion') || '';
  if (!TOPES[accion]) return no('Acción desconocida.');
  const largo = Number(request.headers.get('Content-Length') || 0);
  if (!request.body || !largo || largo > MAX_BYTES) return no('Demasiado grande.');
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!pasa(ip, accion)) return no('Demasiados intentos. Espera unos minutos.');
  if (!env.SITE_TOKEN) { console.error('Falta la variable SITE_TOKEN en Cloudflare'); return no(ERROR); }
  let portero = false;
  if (accion === 'pedido' && env.TURNSTILE_SECRET) {
    if (!(await turnstileOk(request.headers.get('X-Turnstile'), ip, env.TURNSTILE_SECRET))) return no('Verificación fallida. Recarga la página e intenta de nuevo.');
    portero = true; // Apps Script ya no lo vuelve a revisar (un token de Turnstile sirve una sola vez)
  }
  const extra = new TextEncoder().encode(`,"accion":${JSON.stringify(accion)},"token":${JSON.stringify(env.SITE_TOKEN)},"ip":${JSON.stringify(ip)},"portero":${portero}}`);
  let cuerpo = cerrarCon(request.body, extra);
  const conLargo = typeof FixedLengthStream === 'function'; // en Cloudflare: así Google recibe Content-Length
  if (conLargo) { const f = new FixedLengthStream(largo - 1 + extra.length); cuerpo.pipeTo(f.writable).catch(() => {}); cuerpo = f.readable; }
  try {
    let r = await fetch(env.APPS_SCRIPT_URL || APPS_SCRIPT, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: cuerpo, redirect: 'manual', ...(conLargo ? {} : { duplex: 'half' }),
    });
    // Apps Script contesta con una redirección (302) a la respuesta de verdad; se sigue a mano con GET
    // (el estándar no deja seguirla sola cuando el cuerpo va en streaming)
    for (let i = 0; i < 3 && r.status >= 300 && r.status < 400 && r.headers.get('Location'); i++) r = await fetch(r.headers.get('Location'), { redirect: 'manual' });
    const texto = await r.text();
    if (!texto.startsWith('{')) { console.error('Apps Script no devolvió JSON', r.status, texto.slice(0, 200)); return no(ERROR); }
    return json(texto);
  } catch (e) {
    console.error('Apps Script no respondió', e);
    return no(ERROR);
  }
}

// colores y textos del sitio (hoja Sitio): públicos, con un minuto de caché para que la página cargue más rápido
export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url);
  if (u.searchParams.get('api') !== 'sitio') return no('Acción desconocida.');
  const cache = typeof caches === 'undefined' ? null : caches.default, clave = new Request(u.origin + '/api?api=sitio');
  const guardada = await cache?.match(clave);
  if (guardada) return guardada;
  try {
    const texto = await (await fetch((env.APPS_SCRIPT_URL || APPS_SCRIPT) + '?api=sitio', { redirect: 'follow' })).text();
    if (!texto.startsWith('{')) return no('Sin contenido');
    const res = json(texto, { 'Cache-Control': 'public, max-age=60' });
    if (cache && waitUntil) waitUntil(cache.put(clave, res.clone()));
    return res;
  } catch { return no('Sin contenido'); }
}
