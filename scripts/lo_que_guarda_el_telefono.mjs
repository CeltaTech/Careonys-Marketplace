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

import { enCodigoDePrograma, finDeLoQueNoSeLee } from './texto_visible.mjs';

/* Dónde arranca cada una de las dos cosas. Los renglones se buscan con una
   forma, pero lo que dicen se lee con el módulo que ya contesta qué es un texto
   en este lenguaje: acá estaban escritas dos de las tres maneras de escribirlo
   —faltaba la de acento grave—, y lo que se escribiera con ella no lo veía
   nadie. Un archivo de la lista escrito así salía de la lista en silencio, y el
   chequeo terminaba en verde diciendo un número más chico que el de verdad.
   Y no es sólo el chequeo: el armado usa este mismo lector para comprobar que
   lo publicado tenga todo lo que el teléfono va a pedir, y `cache.addAll()` es
   todo o nada, así que un archivo que se pierda acá deja al teléfono sin copia
   entera. */
const DECLARA_EL_NOMBRE = /const\s+CACHE_NAME\s*=\s*/;
const DECLARA_LA_LISTA = /const\s+ASSETS_TO_CACHE\s*=\s*\[/;

/** Los textos escritos entre `desde` y el final, de cualquiera de las tres
    maneras, sin confundir con una comilla la que va adentro de otro texto ni
    la que va adentro de una expresión regular. */
function textosDe(s) {
  const salida = [];
  let i = 0;
  while (i < s.length) {
    const { fin, clase } = finDeLoQueNoSeLee(s, i);
    if (clase === 'cadena' || clase === 'plantilla') {
      salida.push(s.slice(i + 1, fin - 1));
      i = fin;
      continue;
    }
    if (clase) { i = fin; continue; }
    i++;
  }
  return salida;
}

/** El texto que hay a partir de `desde`, si lo que empieza ahí es un texto. */
function primerTexto(s, desde) {
  let i = desde;
  while (i < s.length && /\s/.test(s[i])) i++;
  const { fin, clase } = finDeLoQueNoSeLee(s, i);
  return clase === 'cadena' || clase === 'plantilla' ? s.slice(i + 1, fin - 1) : null;
}

/** Dónde cierra el corchete que quedó abierto en `desde`. Se cuenta, y no se
    corta en el primer corchete que aparezca: uno escrito adentro de un texto
    no cierra nada. */
function finDeLaLista(s, desde) {
  let i = desde, hondo = 1;
  while (i < s.length) {
    const { fin, clase } = finDeLoQueNoSeLee(s, i);
    if (clase) { i = fin; continue; }
    if (s[i] === '[') hondo++;
    else if (s[i] === ']' && --hondo === 0) return i;
    i++;
  }
  return s.length;
}

/**
 * Devuelve el nombre con el que ese programa guarda y la lista de lo que
 * guarda. Si el archivo cambió de forma, el nombre viene vacío y la lista
 * también, que es lo que hace que quien llame se dé cuenta.
 */
export function leer(fuente) {
  const codigo = enCodigoDePrograma(fuente);
  const nombre = DECLARA_EL_NOMBRE.exec(codigo);
  const lista = DECLARA_LA_LISTA.exec(codigo);
  const arranca = lista ? lista.index + lista[0].length : 0;
  return {
    nombre: nombre ? primerTexto(codigo, nombre.index + nombre[0].length) : null,
    guardados: lista
      ? textosDe(codigo.slice(arranca, finDeLaLista(codigo, arranca)))
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

/* Y contra las tres maneras de escribir un texto, que es lo que el lector no
   sabía: escribía dos. Un archivo de la lista escrito con acento grave se caía
   de la lista sin que nadie lo dijera, y el chequeo terminaba en verde con un
   archivo menos del que el teléfono va a pedir de verdad. Comprobado sobre un
   `service-worker.js` real: con comilla común, el chequeo denuncia un archivo
   que no existe; escrito el mismo renglón con acento grave, no lo ve. */
const DE_TRES_MANERAS = `
  const CACHE_NAME = \`prueba-v4\`;
  const ASSETS_TO_CACHE = [
    './',
    "./index.html",
    \`./data/catalogo-frases.json\`
  ];
`;

/* Y con una nota adentro de la lista, que trae comillas y corchetes que no son
   de nadie. */
const CON_UNA_NOTA = `
  const CACHE_NAME = 'prueba-v5';
  const ASSETS_TO_CACHE = [
    // esto no es un archivo: 'de mentira' [ni esto]
    './index.html'
  ];
`;

const leido = leer(DE_MENTIRA);
const nada = leer(VACIO_DE_MENTIRA);
const tres = leer(DE_TRES_MANERAS);
const conNota = leer(CON_UNA_NOTA);
if (leido.nombre !== 'prueba-v3' || leido.guardados.length !== 3 ||
    nada.nombre !== null || nada.guardados.length !== 0 ||
    tres.nombre !== 'prueba-v4' || tres.guardados.length !== 3 ||
    conNota.nombre !== 'prueba-v5' || conNota.guardados.length !== 1) {
  console.error('El lector de `service-worker.js` está roto, así que no verifica nada:');
  console.error('  del archivo de mentira leyó: ' + JSON.stringify(leido));
  console.error('  del vacío leyó: ' + JSON.stringify(nada));
  console.error('  del escrito de las tres maneras leyó: ' + JSON.stringify(tres));
  console.error('  del que trae una nota adentro leyó: ' + JSON.stringify(conNota));
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
