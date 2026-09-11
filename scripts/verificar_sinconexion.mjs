/* ===================================================
   VERIFICA QUE LA COPIA SIN CONEXIÓN NO SIRVA TEXTO VIEJO

       node scripts/verificar_sinconexion.mjs

   Los dos programas para el teléfono guardan sus archivos adentro del navegador
   para poder abrirse sin señal. Esa copia la maneja `service-worker.js`, y lo
   único que la hace caducar es el nombre con que se guardó: `CACHE_NAME`.
   Mientras ese nombre no cambie, el teléfono que ya tiene el programa instalado
   contesta con lo que guardó y no sale a la red, aunque el servidor tenga otra
   cosa.

   Lo que salió mal el 30 de agosto de 2026, y por qué existe este chequeo: se
   convirtieron a los tres idiomas los textos de la aplicación del Asistente,
   las frases nuevas quedaron en las tres copias del catálogo, el servidor las
   entregaba, y la pantalla seguía en castellano. Contestaba `asistente-v18`.
   Peor que el error es la forma en que engaña: **la comprobación en el
   navegador no puede fallar sola**, porque mientras conteste la copia vieja
   cualquier prueba de una frase nueva da el resultado de antes y se lee como
   que el cambio no anduvo.

   Las dos reglas:

   1. **Ningún archivo guardado cambió después del último número.** Se busca el
      commit donde se puso el `CACHE_NAME` que hoy tiene el archivo, y se
      compara ese commit contra lo que hay ahora en la carpeta de trabajo. Si
      alguno de los archivos de `ASSETS_TO_CACHE` cambió desde entonces, el
      número quedó atrás y hay que subirlo.

      Si el número que hay hoy no está en ningún commit, es que se acaba de
      subir y todavía no se guardó: eso es justo lo que se pide, y pasa.

   2. **Todos los archivos guardados existen.** `cache.addAll()` es todo o
      nada: un solo archivo que conteste 404 tira abajo la instalación entera y
      el programa se queda sin copia sin conexión, sin decir nada.

   Qué no mira: si el contenido de la copia es correcto —eso lo miran los otros
   chequeos— ni si el `service-worker.js` está bien escrito más allá de sus dos
   listas. Y no puede mirar nada si el proyecto no está bajo control de
   versiones: ahí se planta, porque el número lo compara contra el historial.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { archivos, seRevisaron, estaTalCual } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── LEER LAS DOS LISTAS DEL ARCHIVO ──────────────────────────────────────
   Se lee el texto y no se importa el archivo: un `service-worker.js` habla de
   `self` y de `caches`, que en la línea de comandos no existen. */
function leer(fuente) {
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
   Sin esto, un `service-worker.js` que cambiara de forma dejaría el chequeo
   mirando cero archivos guardados y diciendo ✔ igual. */
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

/* ── EL HISTORIAL ────────────────────────────────────────────────────────
   `shell` apagado a propósito: ningún nombre de archivo pasa por un
   intérprete de línea de comandos. */
function git(...args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', shell: false }).trim();
}

try {
  git('rev-parse', '--git-dir');
} catch (err) {
  console.error('Este chequeo compara contra el historial, y acá no hay repositorio.');
  console.error('Sin historial no puede saber cuándo se puso el número de la copia,');
  console.error('así que no dice que esté bien: dice que no pudo mirar.');
  process.exit(1);
}

/* El commit donde se puso el número que el archivo tiene hoy. Se camina el
   historial de ese archivo del más nuevo al más viejo mientras el número siga
   siendo el mismo; el último que lo tenga es donde se puso.

   No se usa `git log -S`, que informa el commit donde la cuenta de apariciones
   cambió: ahí aparecen por igual el commit que puso el número nuevo y el que
   sacó el viejo, que suelen ser el mismo, y no distingue un número que se puso
   y se volvió a poner. */
function commitDelNumero(caminoGit, numero) {
  const commits = git('log', '--format=%H', '--', caminoGit).split('\n').filter(Boolean);
  let puesto = null;
  for (const commit of commits) {
    let fuente;
    try {
      fuente = git('show', `${commit}:${caminoGit}`);
    } catch (err) {
      break; // Antes de eso el archivo no existía o vivía en otro lado.
    }
    if (leer(fuente).nombre !== numero) break;
    puesto = commit;
  }
  return puesto;
}

/* ── EL RECORRIDO ────────────────────────────────────────────────────────
   Se buscan por nombre y no por una lista escrita acá: el día que aparezca un
   tercer programa para el teléfono, entra solo. */
const programas = archivos(raiz, ['.js'])
  .filter((camino) => basename(camino) === 'service-worker.js')
  .sort();
seRevisaron(programas.length, 'un solo `service-worker.js`');

const fallas = [];
let guardados = 0;

for (const camino of programas) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const carpeta = nombre.replace(/\/service-worker\.js$/, '');
  const { nombre: numero, guardados: lista } = leer(readFileSync(camino, 'utf8'));

  if (!numero) {
    fallas.push(`${nombre}  no declara ningún \`CACHE_NAME\`, así que nada hace caducar su copia.`);
    continue;
  }
  if (lista.length === 0) {
    fallas.push(`${nombre}  no declara ningún \`ASSETS_TO_CACHE\`, o cambió de forma.`);
    continue;
  }

  /* ---- DE DÓNDE SALE CADA ARCHIVO QUE EL PROGRAMA GUARDA ----
     Un programa de teléfono que vive adentro de `src/` no está nombrando
     archivos del disco: nombra **direcciones de lo que la herramienta va a
     armar**, y lo armado junta cosas que hoy están en tres lugares distintos.
     Lo suyo propio está al lado; el manifiesto lo escribe el generador un
     escalón afuera, junto a la página suelta que todavía se publica; y los
     catálogos viven en la raíz, porque los comparten los tres paquetes.

     Así que se busca en esos tres lugares, en ese orden, y el archivo tiene que
     aparecer en alguno. **Esa lista es además la orden de mudanza**: lo que se
     arma para publicar tiene que copiar desde esos mismos tres lugares, o el
     programa instalado va a pedir algo que el sitio no tiene, y `cache.addAll()`
     va a tirar abajo la copia entera sin decir nada.

     Un programa que no vive adentro de `src/` es de los de antes de la
     herramienta: todo lo suyo está en su carpeta y no hay nada que buscar. */
  const origenes = carpeta.endsWith('/src')
    ? [carpeta, carpeta.slice(0, -4), '']
    : [carpeta];

  /* `'./'` es la carpeta, que el servidor contesta con su `index.html`. */
  const pedidos = lista.map((pedido) =>
    pedido.replace(/^\.\//, '') || 'index.html');
  guardados += pedidos.length;

  /* No `existsSync`: en Windows contesta que sí a `js/Auth.js` cuando el
     archivo es `js/auth.js`, y el sitio se sirve desde Linux, que contesta 404.
     Comprobado el 31 de agosto de 2026 poniendo esa misma caja de letras a mano
     en la lista de `pwa-familia`: los treinta y tres chequeos pasaron en verde,
     y `cache.addAll()` es todo o nada, así que la copia sin conexión de esa
     aplicación no se habría instalado entera. El lector es el mismo que usa
     `verificar_rutas.mjs`, y vive en `scripts/recorrido.mjs`. */
  const caminos = [];
  const faltan = [];
  for (const pedido of pedidos) {
    const donde = origenes
      .map((origen) => (origen ? origen + '/' : '') + pedido)
      .find((camino) => estaTalCual(raiz, join(raiz, ...camino.split('/'))));
    if (donde) caminos.push(donde); else faltan.push(pedido);
  }
  if (faltan.length) {
    const cuantos = faltan.length === 1
      ? 'un archivo que no está con ese nombre exacto en ninguno de los lugares de donde sale'
      : `${faltan.length} archivos que no están con ese nombre exacto en ninguno de los lugares de donde salen`;
    fallas.push(
      `${nombre}  guarda ${cuantos}, y \`cache.addAll()\` es todo o nada:\n` +
      faltan.map((c) => `      - ${c}`).join('\n'));
  }

  const puesto = commitDelNumero(nombre, numero);
  if (!puesto) continue; // El número es nuevo y todavía no se guardó: es lo que se pide.

  const cambiados = git('diff', '--name-only', puesto, '--', ...caminos)
    .split('\n').filter(Boolean);
  if (cambiados.length) {
    fallas.push(
      `${nombre}  sigue en «${numero}», y desde que se puso cambiaron ${cambiados.length} de los archivos que guarda:\n` +
      cambiados.map((c) => `      - ${c}`).join('\n') +
      `\n      El teléfono que ya tiene el programa instalado va a seguir sirviendo lo viejo.` +
      `\n      Se sube el número de \`CACHE_NAME\` en el mismo commit que cambia el archivo.`);
  }
}

if (fallas.length > 0) {
  console.error('La copia sin conexión no está al día:\n');
  for (const falla of fallas) console.error('  - ' + falla + '\n');
  process.exit(1);
}

console.log(
  `Copia sin conexión verificada: ${programas.length} programas de teléfono guardan ` +
  `${guardados} archivos, todos existentes —con esa misma caja de letras, que es lo que ` +
  `distingue el servidor y esta máquina no— y ninguno cambiado después del número de copia.`);
