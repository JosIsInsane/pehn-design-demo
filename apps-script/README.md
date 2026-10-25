# Pedidos e inventario en Google Sheets

El sitio manda cada pedido a una hoja de Google con la foto del diseño. La hoja lleva el inventario sola.

## Qué hace

- **Recibe pedidos** del sitio: cliente, productos, opciones, total en lempiras y **foto del diseño** (dentro de la celda y en Drive). Si el cliente sube imágenes, también se guardan.
- **Confirma por correo** al cliente con la foto, y avisa al negocio de cada pedido nuevo.
- **Calcula las piezas** de cada pedido con la hoja *Recetas* (ej. 2 cuerpos, 1 cabello largo, 1 marco blanco 23×23).
- **Aparta y avisa**: al llegar un pedido revisa si alcanza el stock, contando los pedidos activos que ya apartaron piezas.
- **Descuenta stock** cuando el pedido pasa a *En producción*. Si se cancela, lo regresa. Todo queda en *Movimientos*.
- **Correo diario (8 am)** con lo que está bajo el mínimo y lo que no alcanza para pedidos activos.
- **Panel** con pedidos (con foto), cambio de estado, mensajes de WhatsApp listos por estado, inventario, recetas y resumen.

## Hojas

| Hoja | Para qué |
|---|---|
| Pedidos | Un renglón por pedido. Cambia el **Estado** aquí o en el panel. |
| Partidas | Un renglón por producto del pedido, con su foto y opciones. |
| Inventario | Tus piezas: stock, mínimo, costo. La columna *Estado* se calcula sola. |
| Recetas | Qué pieza gasta cada opción del sitio. `*` sirve de comodín. |
| Movimientos | Historial de cada entrada y salida de stock. |
| Config | Correo del negocio, admins, estado que descuenta, avisos, token. |

## Instalación (15 minutos)

1. Crea una hoja nueva en Google Sheets. Menú **Extensiones › Apps Script**.
2. Copia los archivos de esta carpeta en el editor, con el mismo nombre:
   `Config.gs`, `Setup.gs`, `Orders.gs`, `Inventory.gs`, `Admin.gs` y `Admin.html` (este como archivo HTML).
   En **Configuración del proyecto** activa *Mostrar el archivo de manifiesto* y pega `appsscript.json`.
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

> Si cambias el código de Apps Script, vuelve a **Implementar › Gestionar implementaciones › Editar › Nueva versión**. La URL no cambia.

## Uso diario

- **Panel**: menú **Pehn › Abrir panel**, o la URL de la app web, solo para los correos en *Config › Admins*.
- **Estados**: Nuevo → Diseño enviado → Aprobado → **En producción** (descuenta) → Listo → Enviado → Entregado. Cancelado regresa stock.
- **Entrada de mercancía**: en el panel, *Inventario › Entrada…*. También puedes editar el stock en la hoja: queda en *Movimientos*.
- **Opciones nuevas**: cuando alguien pide algo que no tiene receta, aparece en *Recetas › Por mapear*. Asigna el SKU o déjalo vacío si no gasta inventario.

## Ajustar a tu inventario real

- Cambia los SKU, stock y mínimos de ejemplo en *Inventario*.
- En *Recetas*, la clave debe coincidir con lo que manda el sitio. Ejemplos:
  - `Figura · Cabello · Largo · *`: cabello largo de cualquier color.
  - `Figura · Cabello · Largo · Negro`: solo negro (si cada color es otra pieza).
  - `Cuadro con minifiguras · Marco Blanco · Tamaño 23×23 cm`: marco + tamaño.
- Una clave puede tener varias filas si gasta varias piezas.

## Seguridad

- El sitio manda un **token**. Sin él, el pedido se rechaza.
- Hay un campo oculto contra bots y un límite de 5 pedidos cada 10 minutos por número de WhatsApp.
- Las fotos quedan **privadas** en tu Drive. La celda usa una copia incrustada; no se comparten.
- El token vive en el sitio, así que es visible para quien lo busque. Sirve contra spam simple, no contra ataques dirigidos. Si llega basura, cambia el token en *Config* y en `app.js`.

## Límites de Google (cuenta gratis)

- 100 correos al día.
- 6 minutos por ejecución. Un pedido normal tarda 2–5 segundos.
- Si la foto no entra en la celda, queda un enlace "Ver imagen" al archivo en Drive.
