/* ===================================================
   TODAS LAS PRUEBAS QUE NO ENTRAN EN EL GANCHO DE `COMMIT`

       node scripts/probar_todo.mjs

   `verificar_todo.mjs` junta los chequeos que leen archivos y corren sin red.
   Éste junta lo que no entra ahí: casi todo porque necesita una base levantada
   —registran cuentas ficticias, les hacen escribir y subir papeles, y preguntan
   quién ve qué—, dos porque tardan demasiado para el gancho de `commit`, y una
   porque le pregunta al servidor publicado.

   Existe por lo que pasó el 31 de agosto de 2026. La prueba de aislamiento
   sabía correr contra la base local desde que se escribió, y hacía cinco días
   que nadie la corría porque la lista de pendientes decía que estaba trabada
   —lo estaba sólo contra el servidor publicado—. Y la tabla del README, que se
   mide sola, había quedado vieja porque nadie corría al medidor. Las dos veces
   el problema fue el mismo: **una herramienta que hay que acordarse de correr
   es una herramienta que no corre.**

   **Las dos que no necesitan base ni red** son las que se miran a sí mismas.
   `probar_perdida_de_corpus.mjs` copia el proyecto, le renombra los `.js` y
   corre la red entera del otro lado para ver quién se da cuenta de que le
   sacaron archivos. `probar_exenciones.mjs` le vacía a cada chequeo los
   permisos escritos a mano, uno por uno, y exige que el chequeo se ponga rojo:
   si sigue verde, esa exención ya no exime nada y lo único que hace es tapar
   el resto del archivo que nombra. Las dos corren la red de chequeos muchas
   veces, que es demasiado para cada `commit`, así que viven acá.

   **La que le pregunta al servidor publicado** es `barrer_aislamiento.mjs`, y
   no hace falta ninguna credencial para correrla: usa la clave publicable que
   cualquiera lee del navegador y no escribe nada. Pregunta por **todas** las
   tablas que salen de las migraciones, incluidas las que se creen mañana, así
   que es la única que se entera sola de una tabla nueva mal cerrada. Hasta el
   1 de septiembre de 2026 no la corría nadie —era el pendiente 126—, y la
   primera corrida encontró algo.

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

   Dos salen en rojo a propósito y dicen adentro por qué. Acá se cuentan como
   esperadas y no tumban la corrida:

   · `probar_perdida_de_corpus.mjs` es el pendiente 91 —nueve chequeos dan ✔ con
     menos archivos cuando se les saca la mitad del corpus, y la salida son tres
     políticas de exención entre las que hay que elegir—.
   · `probar_coherencia_de_la_siembra.mjs` son los pendientes 110 y 111 —siete
     columnas que la siembra no llena ni una vez, y cuatro tablas enteras sin
     una sola fila. De las columnas eran catorce: cinco se cerraron y dos
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
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const aca = dirname(fileURLToPath(import.meta.url));

/* En este orden: primero la de la siembra, que no crea ni una cuenta y mira los
   datos tal como los dejaron las migraciones —si arranca mal, lo de abajo mide
   sobre una base que ya estaba torcida—; después las chicas, que son rápidas y
   dicen enseguida si la base está sana; después la de aislamiento, que es la
   larga; y al final las dos que no necesitan base y corren la red de chequeos
   muchas veces.

   El barrido va primero de todo, y por un motivo distinto: no necesita la base
   de esta máquina ni ninguna cuenta, tarda unos segundos, y la pregunta que
   hace —¿el servidor publicado le muestra alguna tabla a quien no inició
   sesión?— no puede quedar esperando veinte minutos detrás de lo demás. */
const PRUEBAS = [
  'barrer_aislamiento.mjs',
  'probar_coherencia_de_la_siembra.mjs',
  'probar_el_rol_y_la_prestadora_del_perfil.mjs',
  'probar_de_quien_es_el_legajo.mjs',
  'probar_sello_de_la_prestadora.mjs',
  'probar_la_puerta_del_alta.mjs',
  'probar_la_tercera_puerta.mjs',
  'probar_el_papel_nuevo_baja_el_sello.mjs',
  'probar_la_resolucion_deja_su_motivo.mjs',
  'probar_permisos_en_vivo.mjs',
  'probar_pisado_de_archivos.mjs',
  'probar_la_misma_cuenta_en_dos_prestadoras.mjs',
  'probar_el_muro_entre_prestadoras.mjs',
  'probar_aislamiento.mjs',
  'probar_perdida_de_corpus.mjs',
  'probar_exenciones.mjs'
];

/* Las que no van contra la base de esta máquina, así que no llevan `--local`.
   El barrido saca la dirección del servidor publicado de `js/apiClient.js`, que
   es el mismo lugar del que la saca cada pantalla. */
const SIN_BASE_LOCAL = new Set(['barrer_aislamiento.mjs']);

/* Rojas a propósito, con el pendiente que lo explica al lado. Sacar de acá lo
   que se arregle: si una de éstas pasa, esta corrida falla y dice por qué. */
const ROJAS_ESPERADAS = new Map([
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

/* Las que quedan afuera de este lote, cada una con su motivo. Estaban escritas
   al final en dos `console.log`, o sea que eran texto y no una lista: nada podía
   compararlas contra la carpeta. */
const AFUERA_A_PROPOSITO = new Map([
  ['probar_alta_y_baja.mjs',
   'va contra el servidor publicado, necesita la clave de firma de la caja ' +
   'fuerte, y su limpieza borra datos publicados (pendiente 107)'],
  ['probar_consulta_publica.mjs',
   'va contra el servidor publicado y hoy reporta el estado conocido del ' +
   'pendiente 64']
]);

/* Y acá se cierra el agujero por el que se coló el barrido. Hasta el 1 de
   septiembre de 2026 esta lista estaba escrita a mano y nada la comparaba
   contra la carpeta: `barrer_aislamiento.mjs` existía, probábaba las tablas de
   todas las migraciones, y no la corría ningún camino —ni el gancho de
   `commit`, que se queda con lo que empieza por `verificar_`, ni esta lista—.
   Se descubrió leyendo, que es exactamente lo que una herramienta no tiene que
   depender de que alguien haga.

   Ahora una prueba nueva o no corre o hace fallar esto. No alcanza con mirar
   `probar_`: el guion que faltaba empezaba por otra cosa, y una regla que mira
   sólo el prefijo que ya se conoce no habría visto nada. */
const ARRANQUES_DE_PRUEBA = /^(probar_|barrer_)/;
const enLaCarpeta = readdirSync(aca)
  .filter((n) => n.endsWith('.mjs') && ARRANQUES_DE_PRUEBA.test(n) && n !== 'probar_todo.mjs');
const sinCamino = enLaCarpeta
  .filter((n) => !PRUEBAS.includes(n) && !AFUERA_A_PROPOSITO.has(n));
if (sinCamino.length > 0) {
  console.error(
    '\nHay prueba(s) que no las corre nadie y que nadie declaró afuera:\n' +
    sinCamino.map((n) => '  ' + n).join('\n') + '\n\n' +
    'O van en `PRUEBAS`, o van en `AFUERA_A_PROPOSITO` con el motivo escrito.\n' +
    'Una prueba que hay que acordarse de correr es una prueba que no corre.\n'
  );
  process.exit(1);
}

const nombreCorto = (a) => a.replace(/^probar_/, '').replace(/\.mjs$/, '');

/* Cuántas cuentas hay antes de correr nada, y cuántas quedan después. Cada
   prueba que registra cuentas ficticias tiene que llevárselas al terminar, y
   la de aislamiento ya se lo pregunta a sí misma. Esto lo pregunta del lote
   entero, que es distinto: agarra a la que ni siquiera sabe que está dejando
   basura.

   Existe por lo que apareció el 31 de agosto de 2026. `probar_sello_de_la_
   prestadora.mjs` borraba el legajo ficticio y lo decía por pantalla, así que
   pasaba por limpia; la cuenta se quedaba. Habían juntado diecinueve, una por
   corrida, y no se veían desde ninguna prueba: se vieron contando `auth.users`.
   Una cuenta ficticia sin dueño es basura con permisos.

   El total lo contesta el propio servidor en `x-total-count`. Contar sólo lo
   que cada prueba se acuerda de haber creado mediría otra cosa: lo que se creó
   por un camino que nadie anotó quedaría igual, y el mensaje diría que se
   limpió todo. */
function credenciales() {
  try {
    const salida = execFileSync('supabase', ['status', '-o', 'env'],
      { cwd: join(aca, '..'), encoding: 'utf8', shell: true });
    return {
      base: (salida.match(/^API_URL=\"?([^\"\s]+)/m) || [])[1],
      clave: (salida.match(/^SERVICE_ROLE_KEY=\"?([^\"\s]+)/m) || [])[1]
    };
  } catch { return {}; }
}
const { base: urlBase, clave: claveServicio } = credenciales();

async function cuantasCuentas() {
  if (!urlBase || !claveServicio) return null;
  try {
    const res = await fetch(urlBase.replace(/\/$/, '') + '/auth/v1/admin/users?page=1&per_page=1',
      { headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio } });
    const dicho = res.headers.get('x-total-count');
    return dicho === null ? null : Number(dicho);
  } catch { return null; }
}
const cuentasAlEmpezar = await cuantasCuentas();

const fallaron = [];
const esperadas = [];
const sorpresas = [];

for (const prueba of PRUEBAS) {
  const banderas = SIN_BASE_LOCAL.has(prueba) ? [] : ['--local'];
  const corrida = spawnSync(process.execPath, [join(aca, prueba), ...banderas], {
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

/* El balance del lote. No lo perdona ninguna roja esperada: una prueba puede
   dar el rojo que tiene anotado y llevarse igual lo que creó. */
const cuentasAlTerminar = await cuantasCuentas();
let cuentasDeMas = 0;
console.log('');
if (cuentasAlEmpezar === null || cuentasAlTerminar === null) {
  console.log('Las cuentas ficticias no se contaron: no se pudo leer la clave de');
  console.log('administración del entorno local. O sea que esta corrida no dice nada');
  console.log('sobre si alguna prueba dejó basura atrás.');
} else if (cuentasAlTerminar === cuentasAlEmpezar) {
  console.log('La base quedó con las ' + cuentasAlEmpezar + ' cuentas que tenía.');
} else {
  cuentasDeMas = cuentasAlTerminar - cuentasAlEmpezar;
  console.log('ATENCIÓN: la base pasó de ' + cuentasAlEmpezar + ' cuentas a ' +
    cuentasAlTerminar + '.');
}

console.log('');
console.log('Quedaron afuera a propósito:');
for (const [prueba, motivo] of AFUERA_A_PROPOSITO) {
  console.log('  ' + prueba);
  console.log('      ' + motivo);
}

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

if (cuentasDeMas !== 0) {
  console.error(
    `\nAlguna prueba dejó ${cuentasDeMas} cuenta(s) ficticia(s) en la base.\n` +
    'Se busca cuál por el prefijo del correo —cada prueba usa el suyo— y se le\n' +
    'agrega la limpieza, como ya la tienen las hermanas. Dejarlas es ensuciar la\n' +
    'base de a poco, y una cuenta ficticia sin dueño es basura con permisos.\n'
  );
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
