/* ===================================================
   PERDER LA MITAD DEL CORPUS TIENE QUE PONER EN ROJO A QUIEN LA PERDIÓ

       node scripts/probar_perdida_de_corpus.mjs

   Copia el proyecto entero a una carpeta temporal, **renombra todos los `.js` a
   `.ts`** y corre la red de chequeos en la copia. Después compara, uno por uno,
   contra lo que cada chequeo dice acá.

   Un chequeo puede quedar en tres lugares, y sólo el tercero es un problema:

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

   HOY DA ROJO, Y TIENE QUE DARLO
   No se arregla desde acá: la salida son tres políticas de exención distintas,
   escritas en el pendiente 91, y elegir una es decisión del Desarrollador. Lo que
   esta prueba aporta es que la elección tenga con qué comprobarse — y que el
   número de chequeos ciegos deje de vivir en una frase.

   QUÉ QUEDA AFUERA, Y POR QUÉ
   · `verificar_todo.mjs` no es un chequeo sino el que los corre.
   · `verificar_guias.mjs` sale a la red, así que su texto cambia según qué
     conteste el servidor y no según qué archivos vio. Compararlo daría rojo por
     un motivo que no es éste.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Se planta si la copia no se armó, si no encontró chequeos que correr, o si
   ninguno de los que corrió mira los `.js` —las tres serían formas de dar ✔ sin
   haber probado nada—. Y se planta también si algún chequeo falla **acá**, en el
   proyecto sin tocar: comparar contra una base que ya está en rojo no dice nada.

   No entra en `verificar_todo.mjs` a propósito: copia el proyecto y corre la red
   entera dos veces, que es demasiado para el gancho de `commit`. Va en
   `scripts/probar_todo.mjs`, y es la única de ahí que no necesita la base
   levantada ni red.
=================================================== */

import { cpSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { archivos, nuncaSeAbre, seRevisaron } from './recorrido.mjs';

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

/* ── EL RENOMBRE ──────────────────────────────────────────────────────────
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

/* ── CORRER LOS DOS LADOS ─────────────────────────────────────────────────
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

const seLoNoto = [];
const noMiraJs = [];
const ciegos = [];
const rotosDeEntrada = [];

for (const chequeo of chequeos) {
  const antes = correr(raiz, chequeo);
  if (antes.codigo !== 0) {
    rotosDeEntrada.push(chequeo);
    continue;
  }
  const despues = correr(destino, chequeo);

  if (despues.codigo !== 0) seLoNoto.push(chequeo);
  else if (despues.texto === antes.texto) noMiraJs.push(chequeo);
  else ciegos.push({ chequeo, antes: antes.texto, despues: despues.texto });
}

rmSync(destino, { recursive: true, force: true });

/* Si ninguno de los que corrieron mira los `.js`, el experimento no probó nada:
   sería un ✔ que sale de no haberle sacado nada a nadie. */
seRevisaron(
  seLoNoto.length + ciegos.length,
  'ningún chequeo que mire los `.js`, así que renombrarlos no le sacó nada a nadie'
);

const corto = (n) => n.replace(/^verificar_/, '').replace(/\.mjs$/, '');

if (rotosDeEntrada.length) {
  console.error(
    '\nEstos chequeos ya fallan en el proyecto sin tocar, así que no hay contra qué\n' +
    'comparar: ' + rotosDeEntrada.map(corto).join(', ') + '.\n' +
    'Se arreglan primero — `node scripts/verificar_todo.mjs` dice qué les pasa.\n'
  );
  process.exit(1);
}

console.log(
  `\nSe renombraron ${renombrados} archivos \`.js\` en una copia de ${copiados} archivos ` +
  `y se corrieron ${chequeos.length} chequeos de los dos lados.\n`
);
console.log(`  ✔ Se plantaron, que es lo que corresponde: ${seLoNoto.length}`);
console.log(`  · No miran los \`.js\`, así que no perdieron nada: ${noMiraJs.length}`);
for (const [nombre, motivo] of AFUERA) console.log(`  · Afuera: ${corto(nombre)} — ${motivo}`);

if (!ciegos.length) {
  console.log('\nNingún chequeo dio ✔ con menos archivos. La red nota cuando se le achica el corpus.\n');
  process.exit(0);
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
