/* ===================================================
   PRUEBA QUE CADA EXENCIÓN SIGA EXIMIENDO ALGO

       node scripts/probar_exenciones.mjs

   Una exención es un permiso escrito a mano: «este archivo, esta columna, esta
   pantalla no cumplen la regla, y acá está el motivo». Mientras el motivo vale,
   la exención es lo que deja al chequeo poder existir. Cuando el motivo deja de
   valer —el archivo cambió, la palabra se fue, la columna se llenó— la exención
   **no se apaga sola**: sigue ahí, sigue perdonando, y ahora perdona el aire.

   Eso sería inofensivo si perdonara sólo lo que nombra. No lo es, porque casi
   todas están escritas por archivo y el chequeo saltea el archivo entero. El 31
   de agosto de 2026 `scripts/verificar_vocabulario.mjs` eximía a
   `soporte-remoto.html` por una palabra que esa pantalla ya no tenía —se la
   llevó el paso a i18n— y con eso la dejaba afuera también de las otras dos
   palabras que ese chequeo mira. Una pantalla entera estaba fuera del chequeo
   sin que nada lo dijera, y ningún verde se puso rojo.

   **Cómo se prueba, sin creerle a nadie.** No se lee la exención para juzgar si
   sigue teniendo sentido: se la vacía y se corre el chequeo. Si el chequeo se
   pone rojo, la exención estaba conteniendo algo y está viva. Si el chequeo
   sigue verde con la exención vacía, esa exención ya no exime nada, y lo único
   que hace es tapar lo que quede adentro del archivo que nombra.

   Es la misma idea que `scripts/probar_perdida_de_corpus.mjs`, aplicada un
   escalón más abajo: aquél pregunta si el chequeo se da cuenta de que le
   sacaron los archivos; éste pregunta si se da cuenta de que le sacaron los
   permisos.

   **Arranca por el control negativo**, porque una prueba que no puede fallar no
   prueba nada: antes de mirar el proyecto arma dos chequeos de mentira en una
   carpeta aparte —uno con una exención que sí exime y otro con una que no— y
   exige encontrar exactamente el segundo. Si ese control no da lo que tiene que
   dar, se corta ahí y no informa nada del proyecto, porque nada de lo que
   dijera significaría algo.

   **Qué mira.** Toda exención escrita como `const NOMBRE = new Map([...])` con
   al menos una entrada, en los chequeos y en los módulos que los chequeos
   importan. El `Map` no es capricho: es la forma que este proyecto usa para
   guardar el permiso **con su motivo escrito al lado**, y una exención sin
   motivo no debería existir. Las declaradas vacías a propósito no se miran: no
   hay nada que vaciar.

   **Qué no mira, y por qué.**
   - Las exenciones de las **pruebas** —`probar_*.mjs`—: para correrlas hace
     falta la base de esta máquina, y una de ellas copia el proyecto y corre la
     red varias veces. Son cinco, contando la de acá mismo —que no se puede
     mirar a sí misma—. Lo que sí las alcanza son la séptima y la octava regla
     de `verificar_red.mjs`, que se plantan cuando una clave de exención nombra
     un archivo que ya no está o una columna que ninguna migración declara, que
     es la forma barata de la misma enfermedad y no necesita la base.
   - `verificar_todo.mjs`, que no es un chequeo sino el que los corre, y
     `verificar_guias.mjs`, que sale a la red: su color no depende de los
     archivos.
   - Las listas escritas como arreglo suelto. No llevan motivo, así que no son
     exenciones en el sentido de acá.

   **Toca los archivos del proyecto y los deja como estaban.** Vacía uno, corre,
   y lo restituye enseguida, también si algo explota. Al terminar comprueba que
   cada archivo haya quedado idéntico a como estaba y grita si alguno no lo
   está. Aun así conviene correrlo con el árbol limpio.

   Queda afuera del gancho de `commit` y adentro de `scripts/probar_todo.mjs`,
   por el mismo motivo que su hermana: corre la red de chequeos muchas veces.
=================================================== */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const aca = dirname(fileURLToPath(import.meta.url));

const NO_SON_CHEQUEOS = new Map([
  ['verificar_todo.mjs', 'no es un chequeo sino el que los corre'],
  ['verificar_guias.mjs', 'sale a la red, así que su color no depende de los archivos']
]);

/* ── EL MOTOR ─────────────────────────────────────────────────────────────
   Todo lo que sigue trabaja sobre una carpeta cualquiera, para que el control
   negativo pueda usar el mismo motor sobre chequeos de mentira. Si el motor de
   la prueba y el motor del control no son el mismo, el control no controla. */

function chequeosDe(carpeta) {
  return readdirSync(carpeta)
    .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && !NO_SON_CHEQUEOS.has(n))
    .sort();
}

/* Una declaración de exención, de `const NOMBRE = new Map([` hasta su `]);`
   pegado al margen. Pegado al margen a propósito: así se toman las de arriba de
   todo, que son las que declaran permisos, y no un `Map` armado adentro de una
   función. */
const DECLARACION = /^((?:export )?const ([A-Z][A-Z0-9_]*) = )new Map\(\[\r?\n([\s\S]*?)^\]\);/gm;

function exencionesDe(texto) {
  const halladas = [];
  DECLARACION.lastIndex = 0;
  let hallazgo;
  while ((hallazgo = DECLARACION.exec(texto)) !== null) {
    /* Una entrada empieza con un corchete en su propio renglón. Si no hay
       ninguna, la lista está declarada vacía y no hay nada que vaciar. */
    if (!/^[ \t]*\[/m.test(hallazgo[3])) continue;
    halladas.push({ nombre: hallazgo[2], entera: hallazgo[0], cabeza: hallazgo[1] });
  }
  return halladas;
}

function nombra(texto, nombre) {
  return new RegExp('(?<![A-Za-z0-9_])' + nombre + '(?![A-Za-z0-9_])').test(texto);
}

function corre(carpeta, chequeo) {
  const corrida = spawnSync(process.execPath, [join(carpeta, chequeo)], {
    encoding: 'utf8',
    shell: false
  });
  return corrida.status;
}

/* Devuelve un caso por cada exención: dónde está, qué chequeos la pueden ver, y
   si vaciarla puso alguno rojo. */
function auditar(carpeta) {
  const chequeos = chequeosDe(carpeta);
  if (chequeos.length === 0) return { chequeos, casos: [], sinBase: [] };

  const textos = new Map();
  const leer = (archivo) => {
    if (!textos.has(archivo)) textos.set(archivo, readFileSync(join(carpeta, archivo), 'utf8'));
    return textos.get(archivo);
  };

  /* Los chequeos, más los módulos de esta misma carpeta que importan. Una
     exención compartida vive en el módulo, no en el chequeo. */
  const dondeBuscar = new Set(chequeos);
  for (const chequeo of chequeos) {
    for (const traido of leer(chequeo).matchAll(/from '\.\/([A-Za-z0-9_]+\.mjs)'/g)) {
      if (existsSync(join(carpeta, traido[1]))) dondeBuscar.add(traido[1]);
    }
  }

  const casos = [];
  for (const archivo of [...dondeBuscar].sort()) {
    for (const exencion of exencionesDe(leer(archivo))) {
      /* Quién la puede ver: si está adentro de un chequeo, ese chequeo y nadie
         más —dos archivos distintos pueden tener dos `EXENTOS` que no tienen
         nada que ver—. Si está en un módulo compartido, todo chequeo que
         importe ese módulo y la nombre. */
      const suyos = chequeos.includes(archivo)
        ? [archivo]
        : chequeos.filter((c) => nombra(leer(c), exencion.nombre)
            && leer(c).includes("from './" + archivo + "'"));
      casos.push({ archivo, nombre: exencion.nombre, exencion, chequeos: suyos });
    }
  }

  /* El estado de partida. Un chequeo que ya está rojo antes de tocar nada no
     puede contestar la pregunta: su rojo no lo causó el vaciado. */
  const necesarios = [...new Set(casos.flatMap((c) => c.chequeos))].sort();
  const verdeDePartida = new Map();
  for (const chequeo of necesarios) verdeDePartida.set(chequeo, corre(carpeta, chequeo) === 0);

  const sinBase = necesarios.filter((c) => !verdeDePartida.get(c));

  for (const caso of casos) {
    const medibles = caso.chequeos.filter((c) => verdeDePartida.get(c));
    if (medibles.length === 0) { caso.medible = false; continue; }
    caso.medible = true;

    const original = leer(caso.archivo);
    const vaciado = original.replace(caso.exencion.entera, caso.exencion.cabeza + 'new Map([]);');
    const camino = join(carpeta, caso.archivo);

    let rojos = [];
    try {
      writeFileSync(camino, vaciado);
      rojos = medibles.filter((c) => corre(carpeta, c) !== 0);
    } finally {
      writeFileSync(camino, original);
    }
    caso.rojos = rojos;
    caso.viva = rojos.length > 0;
  }

  /* Y se comprueba que todo haya quedado como estaba, en vez de confiar en que
     el `finally` corrió. */
  for (const [archivo, texto] of textos) {
    if (readFileSync(join(carpeta, archivo), 'utf8') !== texto) {
      console.error('ATENCIÓN: ' + archivo + ' no quedó como estaba. Revisar antes de seguir.');
      process.exit(1);
    }
  }

  return { chequeos, casos, sinBase };
}

/* ── EL CONTROL NEGATIVO ──────────────────────────────────────────────────
   Dos chequeos de mentira: uno cuya exención sí contiene algo y otro cuya
   exención ya no contiene nada. La prueba tiene que encontrar el segundo y sólo
   el segundo. */

const VIVA = [
  '/* Chequeo de mentira: su exención sí perdona algo, así que vaciarla lo pone rojo. */',
  'const PERDONADOS = new Map([',
  "  ['el caso que todavía está', 'motivo escrito']",
  ']);',
  '',
  "process.exit(PERDONADOS.has('el caso que todavía está') ? 0 : 1);",
  ''
].join('\n');

const MUERTA = [
  '/* Chequeo de mentira: su exención ya no perdona nada, y vaciarla no cambia nada. */',
  'const RESTOS = new Map([',
  "  ['lo que se fue hace tiempo', 'motivo que dejó de valer']",
  ']);',
  '',
  'process.exit(0);',
  ''
].join('\n');

const cajon = mkdtempSync(join(tmpdir(), 'exenciones-'));
let control;
try {
  writeFileSync(join(cajon, 'verificar_falsa_viva.mjs'), VIVA);
  writeFileSync(join(cajon, 'verificar_falsa_muerta.mjs'), MUERTA);
  control = auditar(cajon);
} finally {
  rmSync(cajon, { recursive: true, force: true });
}

const encontradas = control.casos.filter((c) => c.medible && !c.viva).map((c) => c.archivo);
const esperado = ['verificar_falsa_muerta.mjs'];

if (control.casos.length !== 2 || encontradas.join(',') !== esperado.join(',')) {
  console.error('El control negativo no dio lo que tiene que dar, así que esta prueba no');
  console.error('está en condiciones de decir nada del proyecto.');
  console.error('  exenciones encontradas en el cajón: ' + control.casos.length + ' (tenían que ser 2)');
  console.error('  dadas por muertas: ' + (encontradas.join(', ') || 'ninguna')
    + ' (tenía que ser sólo verificar_falsa_muerta.mjs)');
  process.exit(1);
}

console.log('Control negativo: sobre dos chequeos de mentira encuentra la exención muerta');
console.log('y deja en paz la viva.');
console.log('');

/* ── EL PROYECTO ──────────────────────────────────────────────────────────── */

const { chequeos, casos, sinBase } = auditar(aca);

if (casos.length === 0) {
  console.error('No se encontró ninguna exención en los chequeos, y debería haber varias.');
  process.exit(1);
}

const muertas = [];

for (const caso of casos) {
  const donde = caso.archivo.replace(/\.mjs$/, '') + '.' + caso.nombre;
  if (!caso.medible) {
    console.log('  ?  ' + donde + ': no se puede medir, '
      + (caso.chequeos.length === 0
        ? 'ningún chequeo la nombra'
        : 'el chequeo que la usa ya estaba rojo'));
    continue;
  }
  if (caso.viva) {
    console.log('  ✔  ' + donde + ': vaciarla pone rojo a ' + caso.rojos.join(', '));
  } else {
    console.log('  ✘  ' + donde + ': vaciarla no cambia nada');
    muertas.push({ donde, chequeos: caso.chequeos });
  }
}

console.log('');

if (sinBase.length > 0) {
  console.log('Estos chequeos ya estaban rojos antes de tocar nada, así que lo suyo quedó');
  console.log('sin medir: ' + sinBase.join(', '));
  console.log('');
}

if (muertas.length > 0) {
  console.error('Hay ' + muertas.length + ' exención(es) que ya no eximen nada:');
  console.error('');
  for (const muerta of muertas) {
    console.error('  ' + muerta.donde + '  —  ' + muerta.chequeos.join(', ') + ' sigue verde sin ella');
  }
  console.error('');
  console.error('Una exención vacía no es inofensiva: casi todas están escritas por archivo,');
  console.error('así que el chequeo saltea ese archivo entero y con él todo lo demás que');
  console.error('miraría adentro. Se borra la exención, o se la escribe por aparición.');
  process.exit(1);
}

console.log('Exenciones probadas: ' + casos.length + ' en ' + chequeos.length
  + ' chequeos, y vaciar cada una pone rojo al chequeo que la usa.');
