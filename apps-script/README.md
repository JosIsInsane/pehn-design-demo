# Pedidos e inventario en Google Sheets

El sitio manda cada pedido a una hoja de Google con la foto del diseño. La hoja lleva el inventario sola.

## Qué hace

- **Recibe pedidos** del sitio: cliente, productos, opciones, total en lempiras y **foto del diseño** (dentro de la celda y en Drive). Si el cliente sube imágenes, también se guardan.
- **Confirma por correo** al cliente con la foto, y avisa al negocio de cada pedido nuevo.
- **Calcula las piezas** de cada pedido con la hoja *Recetas* (ej. 2 cuerpos, 1 cabello largo, 1 marco blanco 23×23).
- **Aparta y avisa**: al llegar un pedido revisa si alcanza el stock, contando los pedidos activos que ya apartaron piezas.
- **Descuenta stock** cuando el pedido pasa a *En producción*. Si se cancela, lo regresa. Todo queda en *Movimientos*.
- **Correo diario (8 am)** con lo que está bajo el mínimo y lo que no alcanza para pedidos activos.
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
| Config | Correo del negocio, admins, estado que descuenta, avisos, token, clave del CRM. |

## Si el negocio ya tiene su propia hoja

**Instala esto en una hoja de cálculo nueva**, no dentro de la que ya usan. Así su información de antes no se mezcla con nada.

Aun así, el código se protege solo:
- Si encuentra una pestaña con el mismo nombre (Pedidos, Inventario, Clientes, Config…) pero con otros encabezados, **no la toca**. *Configurar hojas* se detiene sin cambiar nada y avisa cuáles chocan.
- Nunca borra hojas, filas ni archivos. Solo agrega filas en sus propias hojas.
- Los disparadores que instala son solo los suyos (`alEditar_`, `resumenStockDiario_`); no borra otros.
- Si su hoja ya tiene un proyecto de Apps Script con `onOpen`, `doGet` o `doPost`, pegar estos archivos ahí los reemplazaría. Otra razón para usar una hoja nueva.

## Instalación (15 minutos)

1. Crea una hoja nueva en Google Sheets. Menú **Extensiones › Apps Script**.
2. Copia los archivos de esta carpeta en el editor, con el mismo nombre:
   `Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Pagos.gs`, `Sitio.gs`, `Admin.gs` y `Admin.html` (este como archivo HTML).
   En **Configuración del proyecto** activa *Mostrar el archivo de manifiesto* y pega `appsscript.json`.
   En **Servicios (+)** agrega **Drive API** (para leer el monto de los comprobantes).
3. Guarda, recarga la hoja y usa el menú **Pehn › Configurar hojas**. Acepta los permisos.
   Se crean las hojas, inventario y recetas de ejemplo, la carpeta de Drive y los avisos diarios.
4. **Implementar › Nueva implementación › App web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Menú **Pehn › Ver URL y token para el sitio**. Pega los dos valores en `app.js`:
   ```js
   sheetsUrl: 'https://script.google.com/macros/s/…/exec',
   sheetsToken: '…',
   ```
6. Haz un pedido de prueba en el sitio. Debe aparecer en *Pedidos* con su foto.

> Si cambias el código de Apps Script, vuelve a **Implementar › Gestionar implementaciones › Editar (lápiz) › Versión: Nueva versión › Implementar**. La URL no cambia. Sin este paso el sitio y el CRM siguen usando el código viejo.

## Actualizar una instalación que ya existe

1. Pega todos los archivos otra vez (hay dos nuevos: `Pagos.gs` y `Sitio.gs`) y el `appsscript.json`.
2. Agrega el servicio **Drive API** (Servicios › +).
3. Corre **Pehn › Configurar hojas**: crea las hojas *Pagos* y *Sitio* y los ajustes nuevos sin borrar nada. Google pedirá permisos otra vez (se agregó leer documentos, para el OCR).
4. En *Config* llena **Datos bancarios** (lo ve el cliente al pagar el anticipo) y **Sitio web** (dirección de la página).
5. **Implementar › Gestionar implementaciones › Editar › Nueva versión**.
6. **Pehn › Revisar que todo funcione.**

## Uso diario

- **CRM**: menú **Pehn › Abrir CRM (pestaña nueva)**. Guarda ese enlace en favoritos: lleva la clave de *Config › Clave del CRM*. Compártelo solo con tu equipo; si se filtra, cambia la clave.
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
- El token vive en el sitio, así que es visible para quien lo busque. Sirve contra spam simple, no contra ataques dirigidos. Si llega basura, cambia el token en *Config* y en `app.js`.

## Límites de Google (cuenta gratis)

- 100 correos al día.
- 6 minutos por ejecución. Un pedido normal tarda 2–5 segundos.
- Si la foto no entra en la celda, queda un enlace "Ver imagen" al archivo en Drive.
