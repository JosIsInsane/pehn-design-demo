# Plan: CRM con miles de pedidos y menos trabajo respondiendo mensajes

Borrador para decidir con Pehn Design. Lo de abajo no está construido todavía, salvo donde dice **(ya está)**.

## 1. Traer su hoja actual al sistema

Tienen miles de pedidos en su propia hoja. El plan es **no tocar su hoja**:

1. Hacemos una copia de su hoja y la revisamos: columnas, formatos de fecha, cómo escriben teléfonos y estados.
2. Escribimos un importador (Apps Script) que **lee** su hoja y llena nuestras hojas Pedidos y Clientes:
   - Une clientes por WhatsApp (mismo número = misma ficha, aunque escriban "+504", espacios o guiones).
   - Traduce sus estados a los nuestros (ej. "pagado" → Aprobado).
   - Pedidos con más de N meses y ya entregados van a una hoja **Archivo**, no a Pedidos.
3. Corremos el importador en una copia, revisamos números (cuántos pedidos, cuántos clientes, total vendido) contra lo que ellos saben, y solo entonces en la real.

**Necesitamos de ellos:** acceso de lectura a su hoja (o una copia) y 15 minutos para explicarnos cómo la usan.

## 2. Que el CRM siga rápido con miles de pedidos

Hoy el CRM carga todos los pedidos al abrir. Con unos cientos va bien; con miles se pone lento. Cambios:

| Cambio | Efecto |
|---|---|
| Cargar solo pedidos activos + los últimos 3 meses | Abre en 1–2 s aunque haya 10 000 pedidos |
| Buscador que busca en el servidor (también en el Archivo) | Encuentras un pedido de hace 2 años sin cargar todo |
| Archivo automático cada mes (entregados y cancelados con más de 6 meses) | La hoja Pedidos se mantiene ligera |
| Caché de 1 min para lecturas repetidas | Menos espera al moverse entre vistas |
| Fichas de cliente con total histórico precalculado | Ver "mejor cliente" o "cuántos repiten" sin recorrer miles de filas |

Límites de Google que hay que respetar: 10 millones de celdas por hoja de cálculo (miles de pedidos caben de sobra), 6 minutos por ejecución y 50 000 letras por celda. El archivo mensual nos mantiene lejos de todos.

## 3. Automatizar WhatsApp e Instagram

### Lo que ya ayuda hoy **(ya está)**
- La página arma la **cotización sola**: el cliente diseña y ve el precio. En vez de cotizar a mano, se manda el enlace del catálogo.
- **Rastrear pedido** contesta "¿cómo va mi pedido?" y recibe el comprobante del anticipo con lectura del monto.
- En el CRM, cada estado tiene su **mensaje de WhatsApp listo** (un clic abre WhatsApp con el texto).

### Siguiente paso: un asistente en WhatsApp e Instagram

Opciones, de más fácil a más trabajo:

| Opción | Qué hace | Costo aprox. | Notas |
|---|---|---|---|
| **A. WhatsApp Business (la app)**: respuestas rápidas, mensaje de bienvenida y catálogo | Respuestas con atajo ("/precios", "/pago") | Gratis | Se puede hoy. Sigue siendo manual, pero más rápido |
| **B. ManyChat (o similar: Wati, Respond.io)** conectado a WhatsApp **e** Instagram | Un solo bot para los dos canales: contesta precios, tiempos y formas de pago; manda el enlace para diseñar; pregunta el número de pedido y responde el estado usando nuestro sistema | Desde ~US$15–45 al mes + mensajes de WhatsApp que cobra Meta | **Recomendada.** Sin programar el bot desde cero; nosotros conectamos su paso "¿cómo va mi pedido?" a nuestro Apps Script |
| **C. API de WhatsApp de Meta directo** con nuestro Apps Script | Avisos automáticos cuando cambia el estado ("Tu diseño está listo, apruébalo aquí") | Solo lo que cobra Meta por mensaje | Más trabajo y verificación del negocio en Meta. Bueno para avisos; para conversación, mejor B |

**Flujo propuesto (B + avisos de C):**
1. Cliente escribe por WhatsApp o Instagram → el bot contesta al instante las preguntas frecuentes y manda el enlace del personalizador.
2. El cliente diseña y pide en la página → el pedido cae en el CRM con foto, precio y piezas.
3. Al cambiar el estado en el CRM → aviso automático por WhatsApp (diseño listo, en producción, listo para entregar).
4. El cliente sube su comprobante en Rastrear pedido → el sistema lee el monto y lo deja listo para confirmar.
5. Solo lo que el bot no entiende pasa a una persona.

**Lo que hace falta de ellos para la opción B/C:**
- Cuenta de **Meta Business** (Facebook) verificada a nombre del negocio.
- Decidir el número: la API de WhatsApp necesita un número que **no** esté usándose en la app de WhatsApp al mismo tiempo (se puede migrar el actual, con cuidado).
- Instagram como cuenta **profesional** conectada a una página de Facebook.
- Sus respuestas de siempre: precios, tiempos, formas de pago, envíos, preguntas más comunes.
- Presupuesto mensual para la plataforma y los mensajes.

## 4. Orden sugerido

1. Importar su hoja (sección 1) y ajustar el CRM a su forma de trabajar.
2. CRM rápido con archivo y búsqueda en servidor (sección 2).
3. Opción A ya mismo (gratis) mientras se decide B.
4. Bot en WhatsApp + Instagram (B) conectado a Rastrear pedido.
5. Avisos automáticos por cambio de estado (C).
