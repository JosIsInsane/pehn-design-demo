/* Pehn Design — PÁGINA index.html: punto de entrada (lo carga con <script type="module">).
   Orden: lo común primero, luego lo propio de la página, y al final el movimiento (para que anime lo que se pintó). */
import { iniciarBase, iniciarFinal } from '../arranque.js';
import { iniciarInicio } from '../inicio.js';

iniciarBase();
iniciarInicio();
iniciarFinal();
