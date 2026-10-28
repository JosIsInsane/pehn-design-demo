/* Pehn Design — ALMACÉN: lo que se guarda en el navegador (localStorage y sessionStorage).
   En modo privado o sin permiso no truena: simplemente no recuerda. No importa nada. */

// claves de localStorage: cambiarlas vacía lo guardado de todos
export const KEY_CART = 'pehn_cart', KEY_CONTACT = 'pehn_contact', KEY_ORDERS = 'pehn_pedidos', KEY_CONSENT = 'pehn_aviso', KEY_SITIO = 'pehn_sitio', KEY_PAGO = 'pehn_pago';
const almacen = donde => ({
  leer(k, def) { try { return JSON.parse(donde().getItem(k)) ?? def; } catch { return def; } },
  guardar(k, v) { try { donde().setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: sigue sin recordar */ } },
  borrar(k) { try { donde().removeItem(k); } catch { /* nada que borrar */ } },
  limpiar() { try { donde().clear(); } catch { /* nada que limpiar */ } },
});
export const local = almacen(() => localStorage), sesion = almacen(() => sessionStorage);
export const { leer, guardar, borrar } = local;
