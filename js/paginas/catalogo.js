/* Pehn Design — PÁGINA catalogo.html: punto de entrada (lo carga con <script type="module">).
   El personalizador NO se importa aquí: catalogo.js lo descarga al abrir un producto (personalizador-carga.js). */
import { iniciarBase, iniciarFinal } from '../arranque.js';
import { iniciarCatalogo } from '../catalogo.js';
import { iniciarCatalogoMovil } from '../catalogo-movil.js';

iniciarBase();
iniciarCatalogo();
iniciarCatalogoMovil();
iniciarFinal();
