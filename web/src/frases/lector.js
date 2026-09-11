/* ===================================================
   EL LECTOR DE FRASES, VISTO DESDE REACT

   Las 983 frases en tres idiomas, el archivo que las guarda y el programa que
   las lee **no cambian**: siguen siendo los mismos de siempre, y los mismos que
   usan los dos programas para el teléfono. Este archivo no es otro lector: es
   la puerta por la que una pantalla de React alcanza al único que hay.

   Por qué hace falta una puerta. El lector se escribió para páginas sueltas: se
   carga con una etiqueta, se deja disponible para todo el resto y recorre la
   pantalla reemplazando los textos marcados. Adentro de React nada de eso pasa
   —no hay etiquetas sueltas y la pantalla la dibuja otro—, así que lo único que
   se necesita de él es lo que sabe hacer bien: *dada una clave, devolver la
   frase en el idioma que corresponda*.

   **Traerlo así no hace una copia.** El archivo se ejecuta tal cual está, se
   deja donde siempre se deja, y de ahí se lo toma. Un punto único de verdad
   sigue siendo uno.
=================================================== */

import '../../../js/identidad.js';
import '../../../js/texto.js';
import '../../../js/catalogo.js';

/* El lector, tal cual quedó al ejecutarse. */
export const Catalogo = window.Catalogo;

/* La identidad del producto, que el lector consulta para resolver los
   marcadores de marca adentro de una frase. */
export const Identidad = window.Identidad;

export const IDIOMAS = Catalogo.idiomas;

/* Resuelve los marcadores de marca —{{producto}}, {{logotipo}}, {{contacto}},
   {{organizacion}}— adentro de un texto. Una frase del catálogo ya sale
   resuelta; esto es para lo poco que no viene del catálogo, como la dirección
   de una imagen o un enlace de correo. */
export const marca = (texto) => Identidad.aplicar(texto);

/* El redactor de mensajes de error, que traduce lo que devuelve la base a una
   frase del catálogo. La pantalla nunca muestra el texto crudo. */
export const Texto = window.Texto;
