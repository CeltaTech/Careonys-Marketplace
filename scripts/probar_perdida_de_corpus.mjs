/* ===================================================
   PERDER EL CORPUS TIENE QUE PONER EN ROJO A QUIEN LO PERDIÓ

       node scripts/probar_perdida_de_corpus.mjs

   Un chequeo revisa un conjunto de archivos. Si ese conjunto se achica y el
   chequeo no se entera, sigue diciendo ✔ —y ese ✔ ya no significa que el
   proyecto esté bien, significa que miró menos—. Acá se le saca el corpus a
   toda la red y se mira quién avisa, de dos maneras distintas:

   · **Se lo achica.** Copia el proyecto entero a una carpeta temporal,
     **renombra todos los `.js` a `.ts`** y corre la red en la copia. Después
     compara, uno por uno, contra lo que cada chequeo dice acá. Es el pendiente
     91, y **hoy da rojo**.
   · **Se lo saca entero.** Copia sólo `scripts/` —ningún `.html`, ningún
     `.css`, ningún `.js`, ningún `.md`— y corre la red ahí. Es el pendiente
     69, cerrado el 28 de agosto de 2026, y **hoy da verde**: lo que se prueba
     es que siga dándolo.

   Las dos mitades usan la misma copia de mecanismo y la misma lista de exentos,
   que vive en `scripts/recorrido.mjs` pegada a la guarda de la que exime.

   EN LA PRIMERA MITAD, un chequeo puede quedar en tres lugares, y sólo el
   tercero es un problema:

   · **Se plantó** —salió con código distinto de 0—. Perfecto: notó que le
     faltaban archivos y lo dijo.
   · **Dijo exactamente lo mismo.** No mira los `.js`, así que renombrarlos no le
     saca nada. Tampoco es un problema.
   · **Dijo ✔ con otro número.** Ése es el agujero: revisó menos archivos, no se
     dio cuenta, y contó el corpus perdido como éxito.

   POR QUÉ EXISTE
   Es el pendiente 91, y hasta hoy era una medición hecha a mano: la fila de
   `docs/PENDIENTES.md` nombraba ocho chequeos y ocho pares de números
   —`escapado` de 49 archivos a 17, `estados` de 267 bloques a 56, `paleta` de 56
   a 24—, medidos el 31 de agosto de 2026 en una copia armada a mano. **Un número
   escrito a mano en la documentación envejece en silencio**, y esta sesión ya lo
   encontró cuatro veces; no tenía sentido dejar la novena medición del mismo día
   escrita de la misma manera. Ahora el experimento se corre solo.

   La guarda que ya existe —pendiente 69, cerrado el 28 de agosto de 2026— frena
   al chequeo que se queda con **cero** archivos. Lo que no frena es quedarse con
   **algunos**, y casi todos piden las pantallas y los `.js` juntos: perder unos
   les deja los otros, y el ✔ sale igual con un número más chico.

   Y LA SEGUNDA MITAD existe porque esa guarda también se comprueba **leyendo**,
   en `verificar_red.mjs`: ahí se mira que cada chequeo *nombre* a `hayArchivos`
   o a `seRevisaron`. Nombrarlas no es plantarse. Un chequeo puede llamarlas para
   un corpus y hacer su trabajo con otro, y la lectura no tiene cómo verlo: pasa
   con las dos palabras escritas y cero archivos revisados. Correrlo sin corpus sí
   lo ve. Se comprobó el 31 de agosto de 2026 escribiendo un chequeo así a
   propósito: `verificar_red.mjs` lo dejó pasar y esta prueba lo agarró.

   HOY DA ROJO, Y TIENE QUE DARLO
   No se arregla desde acá: la salida son tres políticas de exención distintas,
   escritas en el pendiente 91, y elegir una es decisión del Desarrollador. Lo que
   esta prueba aporta es que la elección tenga con qué comprobarse — y que el
   número de chequeos ciegos deje de vivir en una frase.

   QUÉ QUEDA AFUERA, Y POR QUÉ
   De las dos mitades:
   · `verificar_todo.mjs` no es un chequeo sino el que los corre.
   · `verificar_guias.mjs` sale a la red, así que su texto cambia según qué
     conteste el servidor y no según qué archivos vio. Compararlo daría rojo por
     un motivo que no es éste.
   · **El que ya sale en rojo en la copia sin tocar.** Ésos no se eligen a mano:
     la red corre en la copia **antes** de renombrar nada, y al que ahí ya esté
     rojo se lo informa como no medible en vez de acreditarlo. Hasta el 31 de
     agosto de 2026 se los contaba entre los que se plantaron, y eran tres cuyo
     rojo no hablaba del corpus: `deriva` y `sinconexion` le preguntan al
     historial de `git`, que la copia no tiene, y `referencias` sigue citas que
     salen del proyecto hacia `..\..\docs\`. **Un chequeo acreditado de más es
     un chequeo que nadie vuelve a mirar.**
   De la segunda, además, los de `ARMAN_SU_PROPIO_CORPUS` —hoy `verificar_cajas`,
   que se fabrica un árbol de mentira en la carpeta temporal—. Esa lista **no se
   escribe acá**: sale de `scripts/recorrido.mjs`, que es donde vive la guarda, y
   la comparte con `verificar_red.mjs`. Dos listas que dicen lo mismo se arreglan
   una vez y queda mal la otra.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Se planta si la copia no se armó, si no encontró chequeos que correr, o si
   ninguno de los que corrió mira los `.js` —las tres serían formas de dar ✔ sin
   haber probado nada—. Y se planta también si algún chequeo falla **acá**, en el
   proyecto sin tocar: comparar contra una base que ya está en rojo no dice nada.

   La segunda mitad se comprobó en los dos sentidos el 31 de agosto de 2026: da
   verde con la red de hoy —26 chequeos plantados de 27, y el único verde es el
   exento—, y dio rojo con un chequeo escrito a propósito para colarse.

   No entra en `verificar_todo.mjs` a propósito: copia el proyecto y corre la red
   entera varias veces, que es demasiado para el gancho de `commit`. Va en
   `scripts/probar_todo.mjs`, y es la única de ahí que no necesita la base
   levantada ni red.
=================================================== */

import { cpSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  archivos, nuncaSeAbre, seRevisaron, ARMAN_SU_PROPIO_CORPUS
} from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* `verificar_todo.mjs` no es un chequeo sino el que los corre. `verificar_guias`
   sale a la red y su texto depende de qué conteste el servidor, no de qué
   archivos vio: compararlo daría rojo por un motivo que no es éste. */
const AFUERA = new Map([
  ['verificar_todo.mjs', 'no es un chequeo sino el que los corre'],
  ['verificar_guias.mjs', 'sale a la red, así que su texto no depende de los archivos']
]);

const chequeos = readdirSync(join(raiz, 'scripts'))
  .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && !AFUERA.has(n))
  .sort();

seRevisaron(chequeos.length, 'ningún chequeo en `scripts/` con el que probar');

/* ── LA COPIA ─────────────────────────────────────────────────────────────
   Se arma con `archivos()` y no con un `cp -r`, para que el guardián de las
   cajas fuertes venga puesto: lo que no se abre acá tampoco se copia. */
const destino = mkdtempSync(join(tmpdir(), 'corpus-'));

let copiados = 0;
for (const camino of archivos(raiz, [''])) {
  const rel = relative(raiz, camino);
  const alla = join(destino, rel);
  mkdirSync(dirname(alla), { recursive: true });
  cpSync(camino, alla);
  copiados++;
}
seRevisaron(copiados, 'ningún archivo copiado a la carpeta de prueba');

/* ── CORRER LOS DOS LADOS ───────────────────────
   El camino de la raíz aparece en algunos mensajes, y es distinto de cada lado.
   Se reemplaza por una marca antes de comparar, para no contar como diferencia
   lo único que forzosamente cambia. */
const sinLaRaiz = (texto, cual) =>
  texto.split(cual).join('«raíz»').split(cual.split('\\').join('/')).join('«raíz»');

function correr(donde, chequeo) {
  const salida = spawnSync(process.execPath, [join(donde, 'scripts', chequeo)], {
    encoding: 'utf8',
    cwd: donde
  });
  return {
    codigo: salida.status,
    texto: sinLaRaiz((salida.stdout || '') + (salida.stderr || ''), donde).trim()
  };
}

/* ── EL CONTROL, ANTES DE TOCAR NADA ──────────────────
   La red corre en la copia **tal cual**, sin renombrar todavía un solo archivo.
   El que ya esté en rojo ahí no se puede medir: cuando después se le saque el
   corpus va a seguir en rojo, y contarlo entre los que se plantaron es
   acreditarlo por un motivo que no es el suyo. **Y un chequeo acreditado de más
   es un chequeo que nadie vuelve a mirar.** Pasa con tres, medido el 31 de
   agosto de 2026: `deriva` y `sinconexion` le preguntan al historial de `git`, y
   la copia no lo tiene —se arma con `archivos()`, que no abre `.git`—; y
   `referencias` sigue citas que salen del proyecto hacia `..\..\docs\`, que del
   otro lado de la copia no están. Ninguno de esos tres rojos habla del corpus.

   Es la misma disciplina que el rojo de entrada de más abajo, aplicada un paso
   después: aquel pregunta si el proyecto está sano, éste si la copia lo está.

   La comparación de después se hace **contra este texto**, no contra el de la
   raíz: de los dos lados es la misma carpeta, así que lo único que cambia entre
   una corrida y la otra es el renombre, que es justo lo que se quiere medir. */
const rotosDeEntrada = [];
const noSeMiden = [];
const enLaCopia = new Map();

for (const chequeo of chequeos) {
  if (correr(raiz, chequeo).codigo !== 0) {
    rotosDeEntrada.push(chequeo);
    continue;
  }
  const control = correr(destino, chequeo);
  if (control.codigo !== 0) {
    noSeMiden.push({ chequeo, motivo: (control.texto.split('\n')[0] || '').trim() });
    continue;
  }
  enLaCopia.set(chequeo, control.texto);
}

const corto = (n) => n.replace(/^verificar_/, '').replace(/\.mjs$/, '');

if (rotosDeEntrada.length) {
  rmSync(destino, { recursive: true, force: true });
  console.error(
    '\nEstos chequeos ya fallan en el proyecto sin tocar, así que no hay contra qué\n' +
    'comparar: ' + rotosDeEntrada.map(corto).join(', ') + '.\n' +
    'Se arreglan primero — `node scripts/verificar_todo.mjs` dice qué les pasa.\n'
  );
  process.exit(1);
}

seRevisaron(
  enLaCopia.size,
  'ningún chequeo que se pueda medir: todos fallan en la copia sin tocar'
);

/* ── EL RENOMBRE ──────────────────────────────────
   `.mjs` no termina en `.js`, así que los guiones de `scripts/` no se tocan:
   los que se van son los del producto, que es justo el corpus que se quiere
   hacer desaparecer. */
let renombrados = 0;
(function renombrar(carpeta) {
  for (const nombre of readdirSync(carpeta)) {
    if (nuncaSeAbre(nombre)) continue;
    const camino = join(carpeta, nombre);
    if (statSync(camino).isDirectory()) {
      renombrar(camino);
    } else if (nombre.endsWith('.js')) {
      renameSync(camino, camino.slice(0, -3) + '.ts');
      renombrados++;
    }
  }
})(destino);
seRevisaron(renombrados, 'ningún `.js` que renombrar en la copia');

const seLoNoto = [];
const noMiraJs = [];
const ciegos = [];

for (const [chequeo, antes] of enLaCopia) {
  const despues = correr(destino, chequeo);
  if (despues.codigo !== 0) seLoNoto.push(chequeo);
  else if (despues.texto === antes) noMiraJs.push(chequeo);
  else ciegos.push({ chequeo, antes, despues: despues.texto });
}

rmSync(destino, { recursive: true, force: true });

/* Si ninguno de los que corrieron mira los `.js`, el experimento no probó nada:
   sería un ✔ que sale de no haberle sacado nada a nadie. */
seRevisaron(
  seLoNoto.length + ciegos.length,
  'ningún chequeo que mire los `.js`, así que renombrarlos no le sacó nada a nadie'
);

/* ── LA OTRA MITAD: EL CORPUS QUE DESAPARECE DEL TODO ───────────────────
   Arriba se pregunta qué pasa cuando a un chequeo le sacan **la mitad** del
   corpus. Acá se pregunta lo otro: qué pasa cuando no le queda **nada**.

   Son dos preguntas distintas y tienen dos respuestas distintas. La de arriba
   es el pendiente 91 y hoy da rojo. Ésta es el pendiente 69, cerrado el 28 de
   agosto de 2026 poniendo `hayArchivos` y `seRevisaron` en la red entera, y hoy
   da verde —así que lo que se prueba acá es que **siga** dando verde—. Una
   guarda que nadie vuelve a correr se cae sola el día que alguien escribe un
   chequeo sin ella, y se cae en silencio.

   La copia lleva únicamente `scripts/`: ningún `.html`, ningún `.css`, ningún
   `.js`, ningún `.md`, ningún catálogo y ninguna migración. */
const soloGuiones = mkdtempSync(join(tmpdir(), 'sin-corpus-'));
let guionesCopiados = 0;
for (const camino of archivos(join(raiz, 'scripts'), [''])) {
  const alla = join(soloGuiones, relative(raiz, camino));
  mkdirSync(dirname(alla), { recursive: true });
  cpSync(camino, alla);
  guionesCopiados++;
}
seRevisaron(guionesCopiados, 'ningún guion copiado a la carpeta sin corpus');

const sinCorpusSePlanto = [];
const sinCorpusVerde = [];
for (const chequeo of enLaCopia.keys()) {
  (correr(soloGuiones, chequeo).codigo !== 0 ? sinCorpusSePlanto : sinCorpusVerde).push(chequeo);
}
rmSync(soloGuiones, { recursive: true, force: true });

/* Un ✔ sin un solo archivo que revisar es exactamente la falla que el pendiente
   69 vino a cerrar: no dice que todo esté bien, dice que no miró. */
const sinCorpusMal = sinCorpusVerde.filter((n) => !ARMAN_SU_PROPIO_CORPUS.has(n));

console.log(
  `\nSe renombraron ${renombrados} archivos \`.js\` en una copia de ${copiados} archivos ` +
  `y se corrieron ${enLaCopia.size} chequeos de los dos lados.\n`
);
console.log(`  ✔ Se plantaron, que es lo que corresponde: ${seLoNoto.length}`);
console.log(`  · No miran los \`.js\`, así que no perdieron nada: ${noMiraJs.length}`);
for (const [nombre, motivo] of AFUERA) console.log(`  · Afuera: ${corto(nombre)} — ${motivo}`);
for (const { chequeo, motivo } of noSeMiden) {
  console.log(`  · No se puede medir: ${corto(chequeo)} — ya sale en rojo en la copia sin tocar`);
  console.log(`      ${motivo}`);
}

console.log(
  `\nY sin corpus —una copia con los ${guionesCopiados} guiones y nada más— ` +
  `se plantaron ${sinCorpusSePlanto.length} de ${enLaCopia.size}.`
);
for (const [nombre, motivo] of ARMAN_SU_PROPIO_CORPUS) {
  console.log(`  · Afuera: ${corto(nombre)} — ${motivo}`);
}

if (sinCorpusMal.length) {
  console.log(
    `\n✘ ${sinCorpusMal.length} chequeos dijeron ✔ sin un solo archivo que revisar:\n  ` +
    sinCorpusMal.map(corto).join(', ') + '.\n\n' +
    'Eso es el pendiente 69 volviendo: un chequeo que mira cero cosas pasa siempre,\n' +
    'y no está diciendo que todo esté bien sino que no miró. Se cierra usando\n' +
    '`hayArchivos` en vez de `archivos`, o `seRevisaron` donde lo contado sale de\n' +
    'una lista escrita a mano —las dos están en `scripts/recorrido.mjs`—.\n'
  );
}

if (!ciegos.length) {
  console.log('\nY ninguno dio ✔ con menos archivos: la red nota cuando se le achica el corpus.\n');
  process.exit(sinCorpusMal.length ? 1 : 0);
}

console.log(`\n✘ ${ciegos.length} chequeos dijeron ✔ con menos archivos (pendiente 91):\n`);
for (const { chequeo, antes, despues } of ciegos) {
  console.log('  ' + corto(chequeo));
  console.log('    acá:      ' + antes.split('\n').pop());
  console.log('    sin .js:  ' + despues.split('\n').pop());
  console.log('');
}
console.log(
  'Cada uno de ésos revisó menos archivos, no se dio cuenta y lo contó como éxito.\n' +
  'La salida son las tres políticas de exención del pendiente 91, y elegir una es\n' +
  'decisión del Desarrollador. Esta prueba es con qué comprobar la que se elija.\n'
);
process.exit(1);
