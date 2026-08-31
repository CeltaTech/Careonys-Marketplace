/* ===================================================
   TODAS LAS PRUEBAS QUE CORREN CONTRA LA BASE DE ESTA MÁQUINA

       node scripts/probar_todo.mjs

   `verificar_todo.mjs` junta los chequeos que leen archivos y corren sin red.
   Éste junta lo que no entra ahí: casi todo porque necesita una base levantada
   —registran cuentas ficticias, les hacen escribir y subir papeles, y preguntan
   quién ve qué— y una porque tarda demasiado para el gancho de `commit`.

   Existe por lo que pasó el 31 de agosto de 2026. La prueba de aislamiento
   sabía correr contra la base local desde que se escribió, y hacía cinco días
   que nadie la corría porque la lista de pendientes decía que estaba trabada
   —lo estaba sólo contra el servidor publicado—. Y la tabla del README, que se
   mide sola, había quedado vieja porque nadie corría al medidor. Las dos veces
   el problema fue el mismo: **una herramienta que hay que acordarse de correr
   es una herramienta que no corre.**

   **La que no necesita base ni red** es `probar_perdida_de_corpus.mjs`: copia el
   proyecto, le renombra los `.js` y corre la red entera del otro lado para ver
   quién se da cuenta de que le sacaron archivos. Correr la red dos veces sobre
   una copia del proyecto es demasiado para cada `commit`, así que vive acá.

   Antes hay que levantar la base:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   ── Lo que NO corre acá, y por qué ────────────────────────────────────────

   Dos pruebas quedan afuera a propósito, y se dice cuáles para que nadie
   cuente estas nueve y crea que están todas:

   · `probar_alta_y_baja.mjs` — va contra el servidor publicado, necesita la
     clave de firma de la caja fuerte, y su limpieza **borra datos publicados**.
     Correrla se consulta antes (pendiente 107).
   · `probar_consulta_publica.mjs` — va contra el servidor publicado y hoy
     reporta el estado conocido del pendiente 64.

   ── La que tiene que dar rojo ─────────────────────────────────────────────

   Tres salen en rojo a propósito y dicen adentro por qué. Acá se cuentan como
   esperadas y no tumban la corrida:

   · `probar_pisado_de_archivos.mjs` es el pendiente 89 —subir dos veces el mismo
     papel borra el primero, y el arreglo depende de una decisión que todavía no
     se tomó—.
   · `probar_perdida_de_corpus.mjs` es el pendiente 91 —nueve chequeos dan ✔ con
     menos archivos cuando se les saca la mitad del corpus, y la salida son tres
     políticas de exención entre las que hay que elegir—.
   · `probar_coherencia_de_la_siembra.mjs` son los pendientes 110 y 111 —siete
     columnas que la siembra no llena ni una vez, y cuatro tablas enteras sin
     una sola fila. De las columnas eran catorce: la 0048 cerró cinco y dos
     quedaron exentas. Una prueba puede traer más de un pendiente, y por eso
     la lista de abajo guarda una lista de números y no un número—.

   **Y el pendiente que la explica tiene que estar abierto.** Si no está, esto
   falla antes de correr ninguna prueba. Sin esa comprobación la lista perdona
   un rojo apuntando a un número que ya no existe, y el motivo se vuelve
   imposible de encontrar: le pasó a `probar_permisos_en_vivo.mjs`, anotada
   contra el pendiente 67 cuando ese pendiente se había cerrado el 26 de agosto
   de 2026, y su rojo venía en realidad de tres puertas nuevas abiertas a
   propósito y con motivo escrito.

   **Y si algún día la roja esperada pasa, esto falla igual**, porque entonces
   el pendiente está cerrado y hay que sacarlo de esta lista. Una prueba que
   perdona un rojo para siempre deja de mirar.
=================================================== */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const aca = dirname(fileURLToPath(import.meta.url));

/* En este orden: primero la de la siembra, que no crea ni una cuenta y mira los
   datos tal como los dejaron las migraciones —si arranca mal, lo de abajo mide
   sobre una base que ya estaba torcida—; después las chicas, que son rápidas y
   dicen enseguida si la base está sana; después la de aislamiento, que es la
   larga; y al final la del corpus, que no necesita base pero corre la red de
   chequeos dos veces. */
const PRUEBAS = [
  'probar_coherencia_de_la_siembra.mjs',
  'probar_el_rol_y_la_prestadora_del_perfil.mjs',
  'probar_de_quien_es_el_legajo.mjs',
  'probar_sello_de_la_prestadora.mjs',
  'probar_el_papel_nuevo_baja_el_sello.mjs',
  'probar_permisos_en_vivo.mjs',
  'probar_pisado_de_archivos.mjs',
  'probar_aislamiento.mjs',
  'probar_perdida_de_corpus.mjs'
];

/* Rojas a propósito, con el pendiente que lo explica al lado. Sacar de acá lo
   que se arregle: si una de éstas pasa, esta corrida falla y dice por qué. */
const ROJAS_ESPERADAS = new Map([
  ['probar_pisado_de_archivos.mjs', [89]],
  ['probar_perdida_de_corpus.mjs', [91]],
  ['probar_coherencia_de_la_siembra.mjs', [110, 111]]
]);

/* Una roja puede tener más de un motivo, así que cada una guarda su lista de
   pendientes. Se nombran todos: perdonar el rojo diciendo sólo uno esconde el
   otro, que es exactamente lo que esta lista viene a evitar. */
const nombrar = (numeros) => numeros.length === 1
  ? 'pendiente ' + numeros[0]
  : 'pendientes ' + numeros.slice(0, -1).join(', ') + ' y ' + numeros[numeros.length - 1];

/* Y el pendiente que explica cada roja tiene que existir. Sin esto la lista de
   arriba perdona un rojo para siempre apuntando a un número que ya no está en
   ninguna parte, y el motivo se vuelve imposible de encontrar. Pasó: la prueba
   de permisos quedó anotada contra el pendiente 67, que se había cerrado el 26
   de agosto de 2026, y su rojo —que venía de otra cosa, y de algo que estaba
   bien— se dio por bueno cinco días. */
const listaDePendientes = readFileSync(join(aca, '..', 'docs', 'PENDIENTES.md'), 'utf8');
const abiertos = new Set(
  [...listaDePendientes.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) => Number(m[1]))
);

if (abiertos.size === 0) {
  console.error('No se pudo leer ningún pendiente de docs/PENDIENTES.md.');
  console.error('Sin eso esta comprobación diría que está todo bien sin haber mirado nada.');
  process.exit(1);
}

const fantasmas = [...ROJAS_ESPERADAS]
  .map(([prueba, numeros]) => [prueba, numeros.filter((n) => !abiertos.has(n))])
  .filter(([, cerrados]) => cerrados.length > 0);
if (fantasmas.length > 0) {
  console.error(
    '\nHay rojas esperadas anotadas contra un pendiente que no está abierto:\n' +
    fantasmas.map(([p, n]) => '  ' + p + ' → ' + nombrar(n)).join('\n') + '\n\n' +
    'O el pendiente se cerró y la prueba tiene que pasar a contarse como las demás,\n' +
    'o el rojo viene de otra cosa y hace falta un pendiente que lo explique.\n'
  );
  process.exit(1);
}

const nombreCorto = (a) => a.replace(/^probar_/, '').replace(/\.mjs$/, '');

const fallaron = [];
const esperadas = [];
const sorpresas = [];

for (const prueba of PRUEBAS) {
  const corrida = spawnSync(process.execPath, [join(aca, prueba), '--local'], {
    encoding: 'utf8',
    shell: false
  });

  const nombre = nombreCorto(prueba);
  const salida = ((corrida.stdout || '') + (corrida.stderr || '')).trimEnd();
  const rojaEsperada = ROJAS_ESPERADAS.get(prueba);

  if (corrida.status === 0 && rojaEsperada) {
    /* Pasó una que tenía que fallar. No es una buena noticia silenciosa: es una
       lista desactualizada, y hay que tocarla. */
    sorpresas.push(nombre);
    console.log(`  ✘ ${nombre}  — pasó, y estaba anotada como roja esperada (${nombrar(rojaEsperada)})`);
    continue;
  }

  if (corrida.status === 0) {
    /* El resumen de cada prueba es el último párrafo, y de ahí alcanza con el
       primer renglón. Tomar el último a secas —como hace `verificar_todo.mjs`,
       donde cada chequeo resume en un renglón solo— dejaba a la de aislamiento
       mostrando la mitad de una frase. */
    const parrafo = (corrida.stdout || '').trimEnd().split(/\n\s*\n/).pop() || '';
    console.log(`  ✔ ${nombre}`);
    console.log('      ' + (parrafo.trim().split('\n')[0] || ''));
    continue;
  }

  if (rojaEsperada) {
    esperadas.push(nombre);
    console.log(`  · ${nombre}  — roja esperada: ${nombrar(rojaEsperada)}`);
    continue;
  }

  fallaron.push(nombre);
  console.log(`  ✘ ${nombre}`);
  if (salida) console.log(salida.split('\n').map((l) => '      ' + l).join('\n'));
}

console.log('');
console.log('Quedaron afuera a propósito, porque van contra el servidor publicado:');
console.log('  probar_alta_y_baja.mjs      necesita la clave de firma y borra datos publicados');
console.log('  probar_consulta_publica.mjs reporta el estado conocido del pendiente 64');

if (sorpresas.length > 0) {
  console.error(
    `\n${sorpresas.length} prueba(s) anotadas como rojas esperadas pasaron: ${sorpresas.join(', ')}.\n` +
    'Eso quiere decir que el pendiente que las explicaba está cerrado. Se saca de\n' +
    '`ROJAS_ESPERADAS` en este archivo y se cierra el pendiente en docs/PENDIENTES.md.\n'
  );
  process.exit(1);
}

if (fallaron.length > 0) {
  console.error(`\n${fallaron.length} de ${PRUEBAS.length} pruebas fallaron: ${fallaron.join(', ')}.`);
  process.exit(1);
}

console.log(
  `\nLas ${PRUEBAS.length - esperadas.length} pruebas que tenían que pasar pasaron` +
  (esperadas.length
    ? esperadas.length === 1
      ? ', y 1 dio el rojo que tenía que dar.'
      : `, y las ${esperadas.length} anotadas dieron el rojo que tenían que dar.`
    : '.')
);
