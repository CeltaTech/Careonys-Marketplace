/* ===================================================
   LO QUE GUARDA EL PROGRAMA DEL ASISTENTE

   Cómo se guarda y qué se contesta desde lo guardado está escrito una sola vez
   y lo comparten los dos programas del teléfono. Acá queda lo que es de éste:
   con qué nombre guarda, y qué guarda.

   De dónde sale la lista: lo que armó la herramienta entra solo, con lo que
   realmente armó, así que no puede faltar nada. Lo que sigue escrito a mano es
   lo que la herramienta no puede saber: **los catálogos**, que viven afuera de
   este programa porque los comparten los tres paquetes.

   **Y el número de versión se sube a mano cuando cambian los catálogos.** Es lo
   que hace que los teléfonos que ya tienen el programa instalado tiren lo
   guardado y lo vuelvan a pedir. Mientras el número no cambie, el teléfono se
   queda con lo que tenía, que es justamente lo que se busca el resto del tiempo.
=================================================== */

import { copiaSinSenal } from '#comun/sinconexion/copiaSinSenal.js';

const CACHE_NAME = 'asistente-v90';

/* Lo que armó la herramienta, más lo que vive afuera de este programa. */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './data/catalogo-vocabularios.json',
  './data/catalogo-guias.json',
  './data/catalogo-disponibilidad.json',
  './data/catalogo-fichas.json',
  './data/catalogo-autorizaciones.json',
  './data/catalogo-frases.json',
  ...self.__WB_MANIFEST.map((entrada) => entrada.url)
];

copiaSinSenal(CACHE_NAME, ASSETS_TO_CACHE);
