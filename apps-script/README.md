# Pedidos e inventario en Google Sheets

El sitio manda cada pedido a una hoja de Google con la foto del diseño. La hoja lleva el inventario sola.

## Qué hace

- **Recibe pedidos** del sitio: cliente, productos, opciones, total en lempiras y **foto del diseño** (dentro de la celda y en Drive). Si el cliente sube imágenes, también se guardan.
- **Confirma por correo** al cliente (un solo correo por pedido). Al negocio ya no le llega un aviso por pedido: ve *Correos* abajo.
- **Calcula las piezas** de cada pedido con la hoja *Recetas* (ej. 2 cuerpos, 1 cabello largo, 1 marco blanco 23×23).
- **Aparta y avisa**: al llegar un pedido revisa si alcanza el stock, contando los pedidos activos que ya apartaron piezas.
- **Descuenta stock** cuando el pedido pasa a *En producción*. Si se cancela, lo regresa. Todo queda en *Movimientos*.
- **CRM aparte** (se abre en otra pestaña): Inicio con pendientes del día, Pedidos en tablero o lista (con foto), Clientes con historial, etiquetas y notas, Inventario, Recetas y Movimientos. Buscador para todo. Google Sheets solo guarda la información.

## Hojas

| Hoja | Para qué |
|---|---|
| Pedidos | Un renglón por pedido. Cambia el **Estado** aquí o en el CRM. |
| Partidas | Un renglón por producto del pedido, con su foto y opciones. |
| Inventario | Tus piezas: stock, mínimo, costo. La columna *Estado* se calcula sola. |
| Recetas | Qué pieza gasta cada opción del sitio. `*` sirve de comodín. |
| Movimientos | Historial de cada entrada y salida de stock. |
| Clientes | Una ficha por WhatsApp. Etiquetas y notas se editan en el CRM. |
| Pagos | Comprobantes del anticipo: monto leído, esperado y si coincide. Se confirman en el CRM. |
| Sitio | Colores, textos y fotos que ve el cliente. Se editan en CRM › Sitio web. |
| Config | Correo del negocio, hora del resumen, admins, estado que descuenta, token, clave del CRM. |

## Si el negocio ya tiene su propia hoja

**Instala esto en una hoja de cálculo nueva**, no dentro de la que ya usan. Así su información de antes no se mezcla con nada.

Aun así, el código se protege solo:
- Si encuentra una pestaña con el mismo nombre (Pedidos, Inventario, Clientes, Config…) pero con otros encabezados, **no la toca**. *Configurar hojas* se detiene sin cambiar nada y avisa cuáles chocan.
- Nunca borra hojas, filas ni archivos. Solo agrega filas en sus propias hojas.
- Los disparadores que instala son solo los suyos (`alEditar_`, `resumenDiario_`, `respaldoSemanal_`); no borra otros.
- Si su hoja ya tiene un proyecto de Apps Script con `onOpen`, `doGet` o `doPost`, pegar estos archivos ahí los reemplazaría. Otra razón para usar una hoja nueva.

## Correos (Gmail gratis: 100 destinatarios al día)

- **Al cliente: 1 por pedido y máximo 1 por destinatario** (el mismo correo no recibe otro hasta pasadas unas 6 horas; la columna *Correo cliente* dice "Sin correo (ya se le escribió hoy)" y sale en el resumen para escribirle por WhatsApp). Al confirmarlo: ID grande, productos, total, estado del anticipo (50 %), enlace a Mis pedidos y botón de WhatsApp. No hay más correos al cliente.
- **Al negocio: 1 al día** (*Config › Correo del negocio*) con el resumen: pedidos y cobros de hoy, comprobantes por revisar, pedidos por estado, entregas de 3 días, correos de cliente que fallaron y el inventario. Sin pedidos manda "Sin pedidos hoy" con el stock.
- Cambia la hora en *Config › Hora del resumen diario* (0 a 23; 20 = 8 pm). Se reprograma sola al guardar; si no, corre **Pehn › Configurar hojas**. Apágalo con *Resumen diario al negocio = No*.
- Siempre queda 1 correo de reserva para el resumen. Sin cuota o si Gmail falla, el pedido se guarda igual y la columna *Correo cliente* dice "Sin correo" o "Falló: motivo" (sale en el resumen para escribirle por WhatsApp).
- Con 48 pedidos al día salen 48 + 1 correos, bajo el límite de 100.

## Comprobantes: verificación al instante (Verificacion.gs)

Apenas el cliente sube su comprobante, el sitio lo manda a verificar y en unos segundos le dice si pasó.
Se rechaza si: no se puede leer · no parece comprobante de banco · el monto no es el anticipo (pagar de más sí pasa) ·
no aparecen los últimos 4 dígitos de la cuenta de **Config › Datos bancarios** · la fecha es de hace más de 7 días ·
el mismo archivo o la misma referencia ya se usó. El total del pedido tampoco puede ser menor que el precio de sus piezas.
**Config › Comprobante que no pasa la verificación**: `Rechazar` (por defecto) o `Revisar` (lo acepta y queda en CRM › Pagos).
Límite honesto: leer una imagen no prueba que el banco movió el dinero; una captura editada con todos los datos
correctos pasaría. Para eso hay que comparar con el estado de cuenta (o las alertas de transferencia del banco).

## Instalación (15 minutos)

1. Crea una hoja nueva en Google Sheets. Menú **Extensiones › Apps Script**.
2. Copia los archivos de esta carpeta en el editor, con el mismo nombre:
   `Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Pagos.gs`, `Sitio.gs`, `Admin.gs` y los archivos HTML del CRM: `AdminPagina.html`, `AdminEstilos.html`, `AdminVistas.html` y los `AdminJs*.html` (Base, Servidor, Imagenes, Navegacion, Inicio, Pedidos, Ficha, Clientes, Inventario, Pagos, Sitio, Busqueda, Exportar, Eventos, Arranque). Cada uno se crea como archivo HTML con ese nombre (sin `.html`); `AdminPagina.html` los pega con `incluir_()`.
   En **Configuración del proyecto** activa *Mostrar el archivo de manifiesto* y pega `appsscript.json`.
   En **Servicios (+)** agrega **Drive API** (para leer el monto de los comprobantes).
3. Guarda, recarga la hoja y usa el menú **Pehn › Configurar hojas**. Acepta los permisos.
   Se crean las hojas, inventario y recetas de ejemplo, la carpeta de Drive y los avisos diarios.
4. **Implementar › Nueva implementación › App web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Menú **Pehn › Ver URL y token para el sitio**. Pega los dos valores en `datos.js`:
   ```js
   sheetsUrl: 'https://script.google.com/macros/s/…/exec',
   sheetsToken: '…',
   ```
6. Haz un pedido de prueba en el sitio. Debe aparecer en *Pedidos* con su foto.

> Si cambias el código de Apps Script, vuelve a **Implementar › Gestionar implementaciones › Editar (lápiz) › Versión: Nueva versión › Implementar**. La URL no cambia. Sin este paso el sitio y el CRM siguen usando el código viejo.

## Subir con un comando (clasp)

`clasp` es la herramienta oficial de Google para subir los archivos de esta carpeta al editor de Apps Script de una vez (en vez de pegar ~27 a mano). Versión fijada: **3.4.1**. Necesita Node 22 o más nuevo.

**Una sola vez:**

1. Instala [Node.js](https://nodejs.org) (versión 22 o más nueva). Revisa con `node -v`.
2. Activa la API de Apps Script en <https://script.google.com/home/usersettings> (interruptor *Google Apps Script API* en "Activado").
3. En la carpeta del repo: `npx @google/clasp@3.4.1 login`. Se abre el navegador: entra con la cuenta de Google dueña de la hoja y acepta.
4. Saca el **Script ID**: en el editor de Apps Script, *Configuración del proyecto* (engrane) › *IDs* › *ID de secuencia de comandos*.
5. Copia la plantilla: `cp .clasp.json.ejemplo .clasp.json` y pega el ID en lugar de `PEGA_AQUI_EL_ID`. Ese archivo está en `.gitignore`: no se sube a GitHub.

**Cada vez que cambie el backend:**

```
npx @google/clasp@3.4.1 status    # lista lo que se va a subir (revisa que no falte nada)
npx @google/clasp@3.4.1 push      # sube todo (acepta el cambio de appsscript.json si pregunta)
```

> **Cuidado:** `push` **reemplaza todo el proyecto remoto** con lo que hay en tu carpeta. Cualquier cambio hecho directo en el editor de Google se pierde. Úsalo solo en el proyecto de Pehn, desde la rama correcta y con el repo al día.

`push` solo actualiza el código en el editor. Para que la app web (sitio y CRM) use el código nuevo hay que sacar una **versión nueva de la implementación existente**, sin cambiar la URL:

```
npx @google/clasp@3.4.1 deployments    # lista las implementaciones: copia el ID de la app web (empieza con AKfycb…)
npx @google/clasp@3.4.1 deploy --deploymentId EL_ID -d "qué cambió"
```

Usa siempre `--deploymentId`. Sin él, clasp crea una implementación **nueva con otra URL** y el sitio seguiría usando la vieja. El `@HEAD` que sale en la lista es la versión de pruebas: no lo uses para el sitio.

Qué se sube: los `.gs`, los `.html` y `appsscript.json`. `README.md` y las pruebas no (ver `apps-script/.claspignore`). Los `.gs` quedan con su mismo nombre en el editor (Google quita la extensión).

**Alternativa manual:** pegar los archivos en el editor y *Implementar › Gestionar implementaciones › Editar › Nueva versión* (pasos en *Instalación*). Sirve para un cambio de una línea.

## Actualizar una instalación que ya existe

1. Pega todos los archivos otra vez (`Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Pagos.gs`) y publica una Nueva versión.
2. Agrega el servicio **Drive API** (Servicios › +).
3. Corre **Pehn › Configurar hojas**: agrega la columna *Correo cliente* y los ajustes nuevos (hora del resumen), pasa el viejo *Aviso de stock bajo* a *Resumen diario al negocio* y cambia el disparador de las 8 am por el resumen de las 8 pm, sin borrar nada. Google pedirá permisos otra vez (se agregó leer documentos, para el OCR).
4. En *Config* llena **Datos bancarios** (lo ve el cliente al pagar el anticipo) y **Sitio web** (dirección de la página).
5. **Implementar › Gestionar implementaciones › Editar › Nueva versión**.
6. **Pehn › Revisar que todo funcione.**

## Uso diario

- **CRM**: menú **Pehn › Abrir CRM (pestaña nueva)**. Guarda ese enlace en favoritos: lleva la clave de *Config › Clave del CRM*. Compártelo solo con tu equipo. **El correo diario ya no lleva el enlace del CRM** (los correos se reenvían): ábrelo siempre desde la hoja. Si el enlace se filtra, usa **Pehn › Cambiar clave del CRM**: genera una clave nueva y los enlaces viejos dejan de servir al instante (vuelve a guardar el favorito).
- Si el CRM no carga, en el editor corre la función **probarCRM** (Ejecutar) y mira el registro.
- **Estados**: Nuevo → Diseño enviado → Aprobado → **En producción** (descuenta) → Listo → Enviado → Entregado. Cancelado regresa stock.
- **Exportar:** en Pedidos y Clientes, botón *Exportar CSV* (abre en Excel). Sirve también para llevar los datos a otro sistema.
- **Respaldo:** **Pehn › Respaldar la hoja ahora** guarda una copia completa en Drive (carpeta *Respaldos*) y activa una copia automática cada lunes. Solo copia: no borra nada. De vez en cuando borra a mano las copias viejas para no llenar el Drive.
- **Avisos en Inicio:** entregas de los próximos 7 días o vencidas, y pedidos *Nuevo* sin atender hace más de 2 días.
- **Entrada de mercancía**: en el CRM, *Inventario › Entrada…*. También puedes editar el stock en la hoja: queda en *Movimientos*.
- **Pagos**: cuando un cliente sube su comprobante en *Rastrear pedido*, el sistema lee el monto. "Coincide" ya cuenta como pagado; lo demás se confirma o rechaza en *CRM › Pagos*. Confirma siempre en tu banco antes de producir.
- **Sitio web**: en *CRM › Sitio web* cambias colores, textos, fotos de portada e historia, preguntas frecuentes y WhatsApp. Se ve en la página en unos minutos.
- **Opciones nuevas**: cuando alguien pide algo que no tiene receta, aparece en *Recetas › Por mapear*. Asigna el SKU o déjalo vacío si no gasta inventario.

## Ajustar a tu inventario real

- Cambia los SKU, stock y mínimos de ejemplo en *Inventario*.
- En *Recetas*, la clave debe coincidir con lo que manda el sitio. Ejemplos:
  - `Figura · Cabello · Largo · *`: cabello largo de cualquier color.
  - `Figura · Cabello · Largo · Negro`: solo negro (si cada color es otra pieza).
  - `Cuadro con minifiguras · Marco Blanco · Tamaño 23×23 cm`: marco + tamaño.
- Una clave puede tener varias filas si gasta varias piezas.

## Seguridad

Detalle completo y pruebas en `docs/SEGURIDAD.md`.

- El sitio manda un **token**. Sin él, el pedido se rechaza.
- Hay un campo oculto contra bots y un límite de 5 pedidos cada 10 minutos por número de WhatsApp.
- Las fotos quedan **privadas** en tu Drive. La celda usa una copia incrustada; no se comparten.
- Los archivos (fotos y comprobantes) se aceptan solo si sus primeros bytes coinciden con el tipo (JPG, PNG, WEBP, PDF); el correo del cliente debe cumplir una regla estricta; el sitio solo recibe mensajes de error conocidos (el detalle queda en *Ejecuciones*).
- Drive, la lectura del comprobante y el correo se hacen **fuera** del candado de la hoja; si un pedido falla a medias, la carpeta temporal se manda a la papelera (si no se puede, queda una carpeta suelta en Drive: se puede borrar sin problema).
- El token vive en el sitio, así que es visible para quien lo busque. Sirve contra spam simple, no contra ataques dirigidos. Si llega basura, cambia el token en *Config* y en `datos.js`.

## Cloudflare Turnstile (opcional, contra bots)

Es un captcha gratis y casi invisible. Sin configurarlo todo funciona como siempre.

1. En Cloudflare: **Turnstile › Add widget**. Pon el dominio del sitio, modo *Managed*. Copia la **Site key** y la **Secret key**.
2. En `datos.js` pega la site key: `turnstileSiteKey: 'LA_SITE_KEY'`. (Cloudflare Pages ya permite el dominio en `_headers`.)
3. En Apps Script: **Configuración del proyecto › Propiedades del script › Agregar propiedad**: nombre `TURNSTILE_SECRET`, valor la Secret key.
4. **Implementar › Gestionar implementaciones › Nueva versión** (pega también el `appsscript.json` nuevo: agrega el permiso `script.external_request` para consultar a Cloudflare. Google pedirá autorizar una vez más: acéptalo corriendo cualquier función desde el editor, por ejemplo *probarCRM*).
5. Haz un pedido de prueba. Para apagarlo: borra la propiedad `TURNSTILE_SECRET` (el servidor deja de pedirlo) y vacía `turnstileSiteKey`.

Si ya hay site key en el sitio pero falta el secreto, el sitio pide la verificación pero el servidor no la revisa. Con secreto pero sin site key, **todos los pedidos se rechazan**: configura las dos cosas juntas.

## Límites de Google (cuenta gratis)

- 100 correos al día (ver *Correos*).
- 6 minutos por ejecución. Un pedido normal tarda 2–5 segundos.
- Si la foto no entra en la celda, queda un enlace "Ver imagen" al archivo en Drive.
