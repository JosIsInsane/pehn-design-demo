# Revisión del catálogo base

Origen: `pehn.xlsx`, hoja "Hoja 1", filas 3 a 234 (232 filas). Suma de precios: L 82,470 (Excel) = L 82,470 (CSV). SKUs únicos: 232.

## Conteo y rango de precios por categoría (lempiras)

| Categoría | Filas | Mín | Máx |
|---|---:|---:|---:|
| Abrigos | 22 | 700 | 700 |
| Accesorios | 27 | 30 | 120 |
| Adicional | 3 | 70 | 70 |
| Armable | 4 | 1010 | 1210 |
| Boxer | 8 | 420 | 420 |
| Caja Lego | 1 | 440 | 440 |
| Caja pequeña | 1 | 100 | 100 |
| Cajas | 1 | 120 | 120 |
| Camisa Lego | 1 | 30 | 30 |
| Camisas | 33 | 240 | 490 |
| Collar | 5 | 390 | 560 |
| Cumple | 1 | 720 | 720 |
| Dedicatoria | 1 | 30 | 30 |
| Dije | 1 | 50 | 50 |
| Dulces | 1 | 120 | 120 |
| Estadio | 2 | 620 | 620 |
| Flores | 4 | 135 | 135 |
| Fondo | 1 | 30 | 30 |
| Fotos | 1 | 30 | 30 |
| Funko | 2 | 490 | 490 |
| Gorrito | 1 | 90 | 90 |
| Hotwheels | 2 | 180 | 280 |
| Iniciales | 1 | 40 | 40 |
| Instax | 1 | 250 | 250 |
| Joyero | 2 | 150 | 150 |
| Lanyards | 1 | 0 | 0 |
| Lego | 3 | 90 | 380 |
| Llavero | 12 | 150 | 450 |
| Llavero Lego | 10 | 300 | 300 |
| Llavero base | 1 | 150 | 150 |
| Luces | 1 | 90 | 90 |
| Lámpara | 1 | 380 | 380 |
| Mameluco | 2 | 350 | 350 |
| Peluche | 12 | 225 | 590 |
| Photobooth | 1 | 690 | 690 |
| Pieza corazón Lego | 1 | 60 | 60 |
| Pieza llavero Lego | 1 | 150 | 150 |
| Pijamas | 13 | 650 | 680 |
| Placas | 1 | 380 | 380 |
| Pulsera | 3 | 355 | 560 |
| Relicario | 4 | 450 | 550 |
| Retratera | 6 | 190 | 420 |
| Retratera 3D | 3 | 500 | 570 |
| Stickers | 1 | 100 | 100 |
| Tarjeta | 1 | 290 | 290 |
| Taza | 10 | 170 | 170 |
| Termo | 4 | 400 | 420 |
| Tote bag | 1 | 300 | 300 |
| Vaso | 10 | 300 | 550 |
| Vitrina grande | 1 | 300 | 300 |
| Vitrina pequeña | 1 | 200 | 200 |

## Anomalías

**Precio 0:** fila 133 (LANYARDS).

**Precios que eran fórmula (se usó el valor calculado):** fila 154 `=450/2` = 225, fila 158 `=690/2` = 345.

**Erratas corregidas en `producto`** (también en la columna `notas` del CSV):
- fila 15: CROASSANT -> Croissant
- fila 138: RELCARIO -> Relicario
- fila 157: BATIGIRL -> Batgirl
- fila 173: SNOPPY -> Snoopy
- fila 174: SNOPPY -> Snoopy

**Abreviaturas expandidas** (no son erratas): fila 142 SUBL->sublimado, fila 174 PEQ->pequeño.

**Variantes del mismo producto con precio distinto** (misma categoría y `producto`):
- Retratera / Retratera mini: Blanco (fila 203) L420, Negro (fila 206) L190

**Categorías unidas:** C-ALGODON y C-PEPE -> Camisas; H-HOODIE y H-SUETER -> Abrigos; PIJAMAS.C y PIJAMAS.D -> Pijamas; PULSERA, PULSERA DO y PULSERA PLA -> Pulsera; PELUCHE y PELUCHE PINGUINO -> Peluche; RETRATER 3D -> Retratera 3D (errata). También se limpiaron espacios y se expandieron VITRINA PEQ/GRA y CAJA PEQ. La categoría original queda en `categoria_original`.

**Filas que no encajan en el patrón talla/color (producto = nombre completo, sin variante):**
- Fila 88 "MOTO - COLLAR + DIJE INICIAL": se dejó como "Moto - collar + dije inicial".
- Fila 143 "LLAVEROS LEGOS (2)": parece un paquete de 2; se dejó el "(2)".
- Fila 30 "CAMISA LEGO", 80 "CAJA LEGO", 151 "CUMPLEAÑOS LEGO": categoría y producto coinciden.
- Pijamas con diseño (Hello Kitty, Spiderkitty, Batikitty, Spiderman, cuadros rojos): el "rojo" de "cuadros rojos" es del diseño, no se tomó como color. En Spiderkitty sí se tomó Negro/Rojo/Rosa como color.
- Colores en femenino (BLANCA, NEGRA, DORADA, PLATEADA, ROJA) se normalizaron a masculino; "Rosa" y "Rosado" se dejaron como en el original.

## Preguntas para el dueño

- Lanyards (fila 133) tiene precio 0: ¿es gratis/obsequio o falta el precio?
- Gwen, Spiderman, Batman y Batgirl (llaveros) cuestan 225 y Rayo/Sally 345: dos son fórmulas (450/2, 690/2). ¿Es precio por unidad de un par o por mitad de set?
- Retratera mini negra cuesta 190 y la mini blanca 420; ¿es correcto o es errata?
- "Retratera" y "Retratera 3D" se dejaron como categorías separadas; ¿se unen?
- ¿Se unen también LLAVERO con LLAVERO LEGO, GORRITO con ACCESORIOS (gorrita, gorrito cumpleañero) y CAJAS con CAJA PEQ?
- Accesorios incluye "Taza" a L60 y la categoría Taza vale L170: ¿son productos distintos (accesorio para figura)?
- Las pijamas Grinch (680) y cuadros rojos (650) tienen tallas; las demás no. ¿Se venden en tallas?
- ¿Qué significan "RM" en Termo lata RM y "CAM" en Camisa Pepe (CAM)? Se dejaron tal cual.
- "Pieza llavero Lego" y "Llavero corazón Lego" (fila 152), ¿son productos o componentes?

## Menú real (piezas.xlsx, nov 2026): qué se aplicó y qué falta decidir

**Se aplicó (gana el precio del menú):** birrete y toga 60→80 · tarjeta de cumpleaños 290→350 · boxer 420→450 ·
mini photobooth 690→710 · pulsera de inicial 355→360 · llaveros relicario (óvalo y corazón) 450→550 ·
llaveros Gwen / Spiderman / Batman / Batgirl 225→300 (el par Spiderman-Gwen o Batman-Batgirl = 600) ·
llavero minifigura 150→295 (usaba la base de iniciales; el menú dice 590 el par) · figura con camisa "Con texto" +30
(torso con diseño) · el cuadro muestra las medidas del menú: pequeña 5×7 (680 con 2 personajes), mediana 8×8 (710).
Ya coincidían: muñeco 90, falda +30, camisa Lego +30, accesorios +60, mascotas +70, gorrito 90, luces 90, tote 300,
camiseta Pepe 490, hoodie y suéter 700, collares, pulsera de mirada, llavero Instax 250, Hot Wheel 280, caja Lego 620 (440 + 2 personajes).

**Falta que el dueño decida:**
1. Cajas con dedicatoria: el menú tiene Básica 150 / Premium 280 / Plus 380 (+ luces 90); la lista solo "Cajas" 120. ¿Se crean las tres?
2. Llavero de iniciales: base 150 + 40 por inicial. ¿Se agrega como producto personalizable?
3. Camiseta de fútbol en llaveros Lego (+90): no hay pieza en la lista. ¿Cuál es su código y precio?
4. Retratera "con diseño personalizado" 450 y "con nombre" 620 (incluye luces) vs. Retratera 420 en la lista.
5. Caja Lego como personalizable (2 personajes + fondo +30, Lego adicional, camisa, accesorio): hoy se vende sin figuras.
6. "LEGO ADICIONAL" (90) aparece en la lista nueva: se toma como la misma pieza que "Muñecos Lego".
7. Tote bag en manta o canva (mismo precio): ¿se agrega la opción de material?
