/* Pehn Design — TURNSTILE (opcional): verificación anti-bots de Cloudflare en el último paso del pedido.
   Solo actúa si datos.js trae CONFIG.turnstileSiteKey. Depende de: base.js. Lo usa: checkout.js.
   El widget va en el paso donde está el botón de enviar; cada token sirve una sola vez. */

const Ts = { token: '', widget: null, script: null };

const tsBox = () => CONFIG.turnstileSiteKey ? '<div id="tsBox" class="ts-box"></div>' : '';
function cargarScriptTurnstile() {
  Ts.script = Ts.script || new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true;
    s.onload = () => ok(window.turnstile); s.onerror = () => { Ts.script = null; ko(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return Ts.script;
}
function montarTurnstile() {
  Ts.token = ''; Ts.widget = null;
  if (!CONFIG.turnstileSiteKey || !$('#tsBox')) return;
  cargarScriptTurnstile().then(t => {
    const box = $('#tsBox'); if (!t || !box) return;
    Ts.widget = t.render(box, {
      sitekey: CONFIG.turnstileSiteKey, language: 'es',
      callback: tok => { Ts.token = tok; }, 'expired-callback': () => { Ts.token = ''; }, 'error-callback': () => { Ts.token = ''; },
    });
  }).catch(() => { const e = $('#coErr'); if (e) e.textContent = 'No se pudo cargar la verificación. Recarga la página o pídelo por WhatsApp.'; });
}
// cada token sirve una sola vez: tras un intento se pide otro
const reiniciarTurnstile = () => { Ts.token = ''; try { if (Ts.widget !== null) window.turnstile.reset(Ts.widget); } catch { /* sin widget */ } };
