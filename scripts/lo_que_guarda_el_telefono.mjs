/* ===================================================
   QUÉ GUARDA CADA PROGRAMA DEL TELÉFONO PARA TRABAJAR SIN SEÑAL

   Los dos programas del teléfono declaran en su `service-worker.js` dos cosas:
   el nombre con el que guardan —que es lo único que hace caducar la copia— y la
   lista de lo que guardan. Dos archivos distintos necesitan leer esas dos
   cosas, en dos momentos distintos: el chequeo, para avisar que la lista nombra
   algo que no existe o que el nombre quedó atrás; y el armado, para comprobar
   que lo publicado tiene de verdad todo lo que el teléfono va a pedir.

   Leerlas dos veces sería tener dos lectores de lo mismo, y el día que el
   `service-worker.js` cambie de forma uno de los dos se quedaría mirando el
   vacío y diciendo que está todo bien. Así que se lee acá, una sola vez.

   Se lee el texto y no se importa el archivo: un `service-worker.js` habla de
   `self` y de `caches`, que en la línea de comandos no existen.
=================================================== */

/**
 * Devuelve el nombre con el que ese programa guarda y la lista de lo que
 * guarda. Si el archivo cambió de forma, el nombre viene vacío y la lista
 * también, que es lo que hace que quien llame se dé cuenta.
 */
export function leer(fuente) {
  const nombre = /const\s+CACHE_NAME\s*=\s*['"]([^'"]+)['"]/.exec(fuente);
  const lista = /const\s+ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\]/.exec(fuente);
  return {
    nombre: nombre ? nombre[1] : null,
    guardados: lista
      ? Array.from(lista[1].matchAll(/['"]([^'"]+)['"]/g)).map((a) => a[1])
      : []
  };
}

/* Una prueba que no puede fallar no prueba nada: el lector se prueba contra un
   archivo de mentira que sí tiene las dos listas y contra uno que no las tiene.
   Sin esto, un `service-worker.js` que cambiara de forma dejaría a los dos que
   llaman mirando cero archivos guardados y diciendo ✔ igual.

   Se prueba al importarlo, y no cuando alguien se acuerde: el lector no sirve
   de nada roto, y los dos que lo usan lo usan para decidir. */
const DE_MENTIRA = `
  const CACHE_NAME = 'prueba-v3';
  const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './data/catalogo-frases.json'
  ];
`;
const VACIO_DE_MENTIRA = 'self.addEventListener("fetch", () => {});';
const leido = leer(DE_MENTIRA);
const nada = leer(VACIO_DE_MENTIRA);
if (leido.nombre !== 'prueba-v3' || leido.guardados.length !== 3 ||
    nada.nombre !== null || nada.guardados.length !== 0) {
  console.error('El lector de `service-worker.js` está roto, así que no verifica nada:');
  console.error('  del archivo de mentira leyó: ' + JSON.stringify(leido));
  console.error('  del vacío leyó: ' + JSON.stringify(nada));
  process.exit(1);
}

/**
 * Lo que el programa nombra con todas las letras, ya sin el `./` de adelante y
 * con la carpeta escrita como `index.html`, que es lo que el servidor contesta
 * cuando le piden la carpeta. Queda afuera lo que agrega la herramienta de
 * armado, que no se puede comprobar contra el disco porque todavía no existe.
 */
export function pedidosEscritos(fuente) {
  return leer(fuente).guardados.map((pedido) => pedido.replace(/^\.\//, '') || 'index.html');
}
