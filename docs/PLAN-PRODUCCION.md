# Plan a producción — Pehn Design

Anticipo recibido. Meta: sitio + CRM listos para operar 50–80 pedidos/día.

## Equipo
- **Opus (mente maestra):** plan, specs por fase, revisión de cada cambio, pruebas, merge a `main`.
- **Sonnet (build):** construye cada fase en su propia rama/worktree según spec. No hace push a `main`.
- **Haiku (investigación):** cuotas, precios, proveedores, leyes. Entrega datos con fuente.

Regla: nada llega a `main` sin `node pruebas/seguridad.test.js` y `node pruebas/sitio.test.js` en verde y revisión de Opus. Push a `main` = en vivo.

## Fases

| # | Fase | Qué sale | Depende de |
|---|---|---|---|
| 0 | Arranque | Apps Script pegado, Drive API, Configurar hojas, Nueva versión; WhatsApp y datos bancarios reales | Usuario |
| 1 | Catálogo real | `datos.js` con productos, precios y fotos reales; hoja Inventario + Recetas cargadas desde su inventario; fotos optimizadas (webp, <200 KB) | Inventario + fotos |
| 2 | Importar su hoja | Importador (copia → Pedidos/Clientes/Archivo), une clientes por WhatsApp, mapea estados; cuadre de totales antes de correr en la real | Copia de su hoja |
| 3 | CRM escala | Carga solo activos + 3 meses, búsqueda en servidor (incluye Archivo), archivo mensual automático, caché 1 min | Fase 2 |
| 4 | Equipo y roles | Hoja Equipo (nombre, clave, rol, activo), enlace por persona, permisos por acción en servidor, bitácora de quién hizo qué | Roles definidos |
| 5 | Finanzas | Vista Finanzas: ventas, cobrado vs. por cobrar, gastos/compras de inventario, margen por producto, cierre del mes | Fase 1 (costos) |
| 6 | Correos | Pico real: 48 pedidos/día. Hoy cada pedido gasta hasta 4 correos (confirmación + aviso al negocio + 2 avisos de comprobante) = 192 > 100/día de Gmail. Cambio: avisos al negocio pasan a un resumen diario (1 correo) y ya se ven en el CRM; al cliente solo la confirmación → ~49/día, gratis. Si el correo del cliente falla por cuota, el pedido no se pierde y el CRM lo marca "sin correo" | — |
| 7 | WhatsApp/IG | Opción A ya (respuestas rápidas, gratis). Luego ManyChat conectado a "¿cómo va mi pedido?" | Cuentas Meta |
| 8 | Salida | Dominio propio, prueba punta a punta con pedido real, respaldo diario de la hoja, guía de uso para el equipo | Todo lo anterior |

Orden de trabajo: 0 → 1 → 2 → 3 en paralelo con 4 → 5 → 6 → 8. La 7 corre aparte cuando Meta esté lista.
