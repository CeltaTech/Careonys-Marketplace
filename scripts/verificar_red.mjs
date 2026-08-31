/* ===================================================
   NINGÚN CHEQUEO PUEDE MIRAR CERO COSAS Y DECIR ✔

   Es la regla de la empresa —«una prueba que no puede fallar no prueba nada»—
   aplicada a la propia red de chequeos, y del lado que faltaba. Casi todos se
   prueban a sí mismos contra textos de mentira escritos adentro del archivo:
   eso comprueba **el detector**. Ninguno comprobaba **el corpus**, así que un
   recorrido que no encontrara nada dejaba pasar el chequeo entero con su ✔
   puesto y un número más chico que nadie mira.

   POR QUÉ APARECIÓ
   Medido el 28 de agosto de 2026 sobre una copia entera del proyecto donde se
   renombraron las dieciséis pantallas de `.html` a `.jsx` —que es exactamente
   lo que pasa el día de la migración a Vite—: **diecisiete de los veinte
   chequeos siguieron diciendo ✔**. `estilos` informó «ninguno de los 0
   atributos `style=` del marcado» y lo contó como éxito. Está en el pendiente
   69 de `docs/PENDIENTES.md`.

   QUÉ EXIGE, QUE SON TRES COSAS
   1. Que todo chequeo llame por lo menos una vez a `seRevisaron()` o a
      `hayArchivos()`, las dos de `scripts/recorrido.mjs`, que son las que se
      plantan cuando la cuenta da cero. La llamada se busca **con los
      comentarios quitados**: si no, a un chequeo le alcanzaría con nombrarlas
      en su encabezado para pasar, y eso es justo lo que este archivo viene a
      impedir.
   2. Que ninguno escriba a mano la extensión de las pantallas, que se pide a
      `EXTENSIONES_DE_PANTALLA` del mismo archivo. Perder **parte** del corpus
      no dispara la guarda de arriba, y es la forma silenciosa de lo mismo.
   3. Que la tabla `| Chequeo | Qué impide que vuelva |` del README nombre a
      todos los que existen y a ninguno que no. Se agregó el 31 de agosto de
      2026, cuando se encontró que la tabla llevaba **cuatro chequeos de
      atraso** —`base`, `clases`, `estado` y `pendientes` existían y no
      figuraban en ninguna parte—. Un chequeo que nadie sabe que está ahí es
      una regla que el próximo que discuta el tema va a dar por no sostenida; y
      al revés, una fila sin archivo detrás es una regla que se cree sostenida
      y no lo está. Queda afuera `verificar_todo.mjs`, que no es un chequeo
      sino el que los corre.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Cinco veces, porque las cinco pueden fallar:
   1. Contra la función de verdad: `seRevisaron(0, …)` tiene que cortar y
      `seRevisaron(3, …)` tiene que devolver 3. Sin esto, la guarda podría estar
      vacía por dentro y todos los chequeos «cumplirían» igual.
   2. Contra `hayArchivos()` pidiendo una extensión que no existe, que es la
      forma real en que esto se rompe: nadie borra los archivos, les cambian el
      nombre.
   3. Contra un chequeo de mentira escrito acá mismo que **no** llama a
      ninguna de las dos, y que tiene que ser señalado. Y contra otro que sí la
      llama pero sólo adentro de un comentario, que tampoco vale.
   4. Contra tres chequeos de mentira para la extensión: uno que la escribe,
      uno que sólo la nombra en un comentario y uno que la pide como
      corresponde. Los tres tienen que salir como salen.
   5. Contra una tabla del README de mentira, para que el lector de la tabla no
      confunda una fila con un nombre citado al pasar en un párrafo.
=================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  seRevisaron, hayArchivos, ARMAN_SU_PROPIO_CORPUS, EXTENSIONES_DE_PANTALLA
} from './recorrido.mjs';

const aca = dirname(fileURLToPath(import.meta.url));

/* Quien corre a los demás no revisa nada por su cuenta, y este archivo tampoco
   se revisa a sí mismo. */
const NO_SON_CHEQUEOS = new Set(['verificar_todo.mjs', 'verificar_red.mjs']);

/* La única excepción, con su motivo escrito, sale de `scripts/recorrido.mjs`:
   está pegada a la guarda de la que exime, y la comparte con
   `probar_perdida_de_corpus.mjs`, que comprueba lo mismo corriendo los chequeos
   en vez de leerlos. */

const GUARDAS = ['seRevisaron(', 'hayArchivos('];

const enBlanco = (t) => t.replace(/[^\n]/g, ' ');

/** El mismo despeje que usan los demás chequeos, acotado a `.mjs`. */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, enBlanco)
    .replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + enBlanco(m.slice(antes.length)));
}

/** ¿Este texto de chequeo se planta si no encuentra nada? */
export function tieneGuarda(texto) {
  const limpio = sinComentarios(texto);
  return GUARDAS.some((g) => limpio.includes(g));
}

/* ── LA EXTENSIÓN DE LAS PANTALLAS, ESCRITA A MANO ────────────────────────
   La otra forma de que un chequeo pase sin mirar nada, y es la que se ve
   menos: no se queda sin corpus, se queda con menos. Medido el 31 de agosto de
   2026 sobre una copia con las quince pantallas renombradas a `.jsx`, con la
   extensión todavía escrita a mano en cada llamada: seis chequeos se plantaron
   y **once siguieron dando ✔ con un número más chico**. `botones` pasó de 21
   manejadores en 11 pantallas a 1 en 1; `estilos` dijo que ninguno de los
   **cero** atributos `style=` repetía nada, y lo dijo en verde.

   Con la misma copia y `EXTENSIONES_DE_PANTALLA` puesto en `['.jsx']`, un
   renglón, los once volvieron a sus números de siempre. Por eso se pide acá:
   la extensión sale de `scripts/recorrido.mjs` y de ningún otro lado.

   No se miran los comentarios, que hablan de esto todo el tiempo. */
const A_MANO = /['"`]\.html['"`]/;

/** ¿Este texto escribe a mano la extensión de las pantallas? */
export function escribeLaExtension(texto) {
  return A_MANO.test(sinComentarios(texto));
}
/* ── LA EXTENSIÓN METIDA ADENTRO DE UNA EXENCIÓN ──────────────────
   La misma atadura, escondida donde no se la busca. Una exención se escribe
   `['mockup-app.html', 'motivo']`, y esa clave se compara contra el nombre del
   archivo: el día que las pantallas dejen de ser `.html` la clave no encuentra
   a la suya, la pantalla vuelve al corpus y el chequeo se pone rojo por un
   motivo que no es el suyo. Con la regla de arriba no alcanza —mira la
   extensión sola, `'.html'`, y acá viene pegada a un nombre—, y así pasó
   inadvertida hasta el 31 de agosto de 2026 en `verificar_estados.mjs`.

   La clave de una exención que nombra una pantalla se escribe **sin
   extensión**, y el chequeo se la saca a lo que compara. */
const CLAVE = /^[ \t]*\[\s*'([^']+)'/gm;

/** Las claves de exención de este texto que traen la extensión de las pantallas. */
export function clavesConLaExtension(texto) {
  const traidoras = [];
  const MAPA = /new Map\(\[\r?\n([\s\S]*?)^\]\);/gm;
  for (const mapa of sinComentarios(texto).matchAll(MAPA)) {
    for (const clave of mapa[1].matchAll(CLAVE)) {
      if (EXTENSIONES_DE_PANTALLA.some((e) => clave[1].endsWith(e))) traidoras.push(clave[1]);
    }
  }
  return traidoras;
}

/* ── Y QUE EL README LOS NOMBRE A TODOS ───────────────────────────────────
   La tercera forma de que la red mienta, y la más barata de arreglar. El
   README trae una tabla —«Chequeo | Qué impide que vuelva»— que es lo único
   que dice para qué está cada uno. `verificar_todo.mjs` no tiene la lista
   escrita, así que un chequeo nuevo entra solo y funciona desde el primer día;
   la tabla, en cambio, se escribe a mano, y el 31 de agosto de 2026 le
   faltaban cuatro: `verificar_base`, `verificar_clases`, `verificar_estado` y
   `verificar_pendientes`. Cuatro reglas sostenidas por un guion que nadie
   sabía que existía.

   No es un detalle de documentación: la tabla es donde se mira antes de
   escribir un chequeo nuevo, y lo que no figura ahí se vuelve a escribir. */
function enLaTablaDelReadme(texto) {
  return new Set(
    Array.from(texto.matchAll(/^\| `(verificar_[a-z_]+)` \|/gm)).map((a) => a[1])
  );
}


/* ── 1 y 2. Que la guarda de verdad se plante ───────────────────────────── */

const fallas = [];

try {
  seRevisaron(0, 'esto es una prueba y tiene que cortar');
  fallas.push('`seRevisaron(0, …)` dejó pasar: la guarda está vacía por dentro.');
} catch { /* Se esperaba: es lo que tiene que hacer. */ }

try {
  if (seRevisaron(3, 'esto tiene que pasar') !== 3) {
    fallas.push('`seRevisaron(3, …)` no devolvió 3.');
  }
} catch {
  fallas.push('`seRevisaron(3, …)` cortó, y con tres cosas para revisar no tenía que cortar.');
}

try {
  hayArchivos(join(aca, '..'), ['.extension-que-no-existe']);
  fallas.push('`hayArchivos()` dejó pasar una extensión que no encuentra nada.');
} catch { /* Se esperaba. */ }

/* ── 3. Que reconozca a un chequeo sin guarda ───────────────────────────── */

const SIN_GUARDA = `
import { archivos } from './recorrido.mjs';
for (const c of archivos(raiz, ['.html'])) revisar(c);
console.log('Algo verificado: todo bien.');
`;

const SOLO_EN_UN_COMENTARIO = `
// Este chequeo debería llamar a seRevisaron( alguna vez.
/* o a hayArchivos( , pero no lo hace. */
import { archivos } from './recorrido.mjs';
for (const c of archivos(raiz, ['.html'])) revisar(c);
`;

const CON_GUARDA = `
import { hayArchivos } from './recorrido.mjs';
for (const c of hayArchivos(raiz, ['.html'])) revisar(c);
`;

if (tieneGuarda(SIN_GUARDA)) fallas.push('Dio por bueno un chequeo sin ninguna guarda.');
if (tieneGuarda(SOLO_EN_UN_COMENTARIO)) {
  fallas.push('Dio por bueno un chequeo que sólo nombra la guarda en un comentario.');
}
if (!tieneGuarda(CON_GUARDA)) fallas.push('Marcó como falta un chequeo que sí tiene la guarda.');

/* ── 4. Que reconozca la extensión escrita a mano ───────────────────────── */

const CON_EXTENSION_A_MANO = `
import { hayArchivos } from './recorrido.mjs';
for (const c of hayArchivos(raiz, ['.html', '.js'])) revisar(c);
`;

const SOLO_EN_UN_COMENTARIO_2 = `
// Antes esto decía ['.html'] y ahora sale de recorrido.mjs.
import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
for (const c of hayArchivos(raiz, EXTENSIONES_DE_PANTALLA)) revisar(c);
`;

const COMO_CORRESPONDE = `
import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
for (const c of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'])) revisar(c);
`;

if (!escribeLaExtension(CON_EXTENSION_A_MANO)) {
  fallas.push('Dio por bueno un chequeo con la extensión de las pantallas escrita a mano.');
}
if (escribeLaExtension(SOLO_EN_UN_COMENTARIO_2)) {
  fallas.push('Se quejó de una extensión que estaba nombrada en un comentario.');
}
if (escribeLaExtension(COMO_CORRESPONDE)) {
  fallas.push('Se quejó de un chequeo que pide la extensión a `recorrido.mjs`.');
}

/* ── 5. Que reconozca la extensión metida adentro de una exención ─────── */

const CLAVE_ATADA = [
  'const PANTALLAS_QUE_SE_VAN = new Map([',
  "  ['mockup-app.html', 'se va del proyecto']",
  ']);'
].join('\n');

const CLAVE_SUELTA = [
  'const PANTALLAS_QUE_SE_VAN = new Map([',
  "  ['mockup-app', 'se va del proyecto']",
  ']);'
].join('\n');

const CLAVE_QUE_NO_ES_PANTALLA = [
  'const AJENOS = new Map([',
  "  ['docs/FOTO.md', 'es una foto fechada']",
  ']);'
].join('\n');

if (clavesConLaExtension(CLAVE_ATADA).length === 0) {
  fallas.push('Dio por buena una exención con la extensión adentro de la clave.');
}
if (clavesConLaExtension(CLAVE_SUELTA).length > 0) {
  fallas.push('Se quejó de una exención cuya clave no trae la extensión.');
}
if (clavesConLaExtension(CLAVE_QUE_NO_ES_PANTALLA).length > 0) {
  fallas.push('Se quejó de una clave que no nombra una pantalla.');
}

/* ── 6. Que note una tabla a la que le falta un chequeo ─────────────────── */

const TABLA_COMPLETA = [
  '| Chequeo | Qué impide que vuelva |',
  '|---|---|',
  '| `verificar_uno` | Que vuelva lo uno |',
  '| `verificar_dos` | Que vuelva lo otro |'
].join('\n');

const nombrados = enLaTablaDelReadme(TABLA_COMPLETA);
if (!nombrados.has('verificar_uno') || !nombrados.has('verificar_dos')) {
  fallas.push('No leyó los chequeos que la tabla del README sí nombra.');
}
if (nombrados.size !== 2) {
  fallas.push('Leyó de la tabla del README algo que no era un chequeo.');
}
if (enLaTablaDelReadme('Acá se nombra a `verificar_uno` en el medio de un renglón.').size !== 0) {
  fallas.push('Tomó por fila de la tabla a un chequeo nombrado en un párrafo.');
}

/* ── El recorrido de verdad ─────────────────────────────────────────────── */

const chequeos = readdirSync(aca)
  .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && !NO_SON_CHEQUEOS.has(n))
  .sort();

seRevisaron(chequeos.length, 'un solo chequeo en `scripts/` que revisar');

const sinGuarda = [];
const conExtensionAMano = [];
const conLaExtensionEnLaClave = [];
let revisados = 0;

for (const nombre of chequeos) {
  if (ARMAN_SU_PROPIO_CORPUS.has(nombre)) continue;
  revisados++;
  const texto = readFileSync(join(aca, nombre), 'utf8');
  if (!tieneGuarda(texto)) sinGuarda.push(nombre);
  /* `verificar_red.mjs` es el único que la escribe a propósito: sus pruebas de
     adentro son textos de chequeo de mentira, y tienen que traerla escrita a
     mano para que haya algo que reconocer. */
  if (nombre !== 'verificar_red.mjs' && escribeLaExtension(texto)) {
    conExtensionAMano.push(nombre);
  }
  /* Y lo mismo con la exención: acá adentro hay una escrita a propósito, en las
     pruebas de más arriba, por el mismo motivo. */
  if (nombre !== 'verificar_red.mjs') {
    for (const clave of clavesConLaExtension(texto)) {
      conLaExtensionEnLaClave.push([nombre, clave]);
    }
  }
}

seRevisaron(revisados, 'un solo chequeo que no esté exento');

/* Y la tabla del README contra la carpeta, en los dos sentidos: uno que no
   figura es una regla que nadie sabe que está sostenida, y uno que figura sin
   existir es una regla que se cree sostenida y no lo está. */
const enElReadme = enLaTablaDelReadme(readFileSync(join(aca, '..', 'README.md'), 'utf8'));
seRevisaron(enElReadme.size, 'ningún chequeo nombrado en la tabla del README');

/* Los dos lados se comparan contra la carpeta entera menos `verificar_todo.mjs`,
   que no es un chequeo sino el que los corre. Contra `chequeos` no serviría:
   esa lista deja afuera también a `verificar_red.mjs` —porque no se revisa a sí
   mismo— y entonces borrarle a él su fila del README no lo notaría nadie. */
const EL_CORREDOR = 'verificar_todo.mjs';
const enDisco = readdirSync(aca)
  .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && n !== EL_CORREDOR)
  .map((n) => n.replace('.mjs', ''))
  .sort();
seRevisaron(enDisco.length, 'ningún chequeo en `scripts/` con el que comparar la tabla');

const sinFila = enDisco.filter((n) => !enElReadme.has(n));
for (const nombre of sinFila) {
  fallas.push(
    `\`scripts/${nombre}.mjs\` existe y la tabla del README no lo nombra.\n` +
    '      Lo que no figura ahí es una regla que nadie sabe que está sostenida.'
  );
}

const enLaCarpeta = new Set(enDisco);
for (const nombre of [...enElReadme].filter((n) => !enLaCarpeta.has(n))) {
  fallas.push(
    `La tabla del README nombra a \`${nombre}\` y ese chequeo no existe.\n` +
    '      Una regla que se cree sostenida y no lo está.'
  );
}

for (const nombre of sinGuarda) {
  fallas.push(
    `\`scripts/${nombre}\` no llama a \`seRevisaron()\` ni a \`hayArchivos()\`.\n` +
    '      Si su recorrido deja de encontrar archivos, va a escribir su ✔ igual.'
  );
}

for (const nombre of conExtensionAMano) {
  fallas.push(
    `\`scripts/${nombre}\` escribe a mano la extensión de las pantallas.\n` +
    '      El día que dejen de ser `.html` va a seguir dando ✔ con menos archivos.'
  );
}

for (const [nombre, clave] of conLaExtensionEnLaClave) {
  fallas.push(
    `\`scripts/${nombre}\` tiene una exención con la extensión adentro de la clave: \`${clave}\`.\n` +
    '      El día que las pantallas dejen de ser `.html` esa exención no encuentra la\n' +
    '      suya, y el chequeo se pone rojo por un motivo que no es el suyo.'
  );
}

if (fallas.length > 0) {
  console.error('La red de chequeos puede pasar sin haber mirado nada:\n');
  for (const f of fallas) console.error('  · ' + f);
  console.error(
    '\nSe arregla usando `hayArchivos()` en vez de `archivos()`, o llamando a\n' +
    '`seRevisaron(cuantos, qué)` cuando lo que se cuenta sale de una lista o de un\n' +
    'catálogo. Las dos están en `scripts/recorrido.mjs`.\n' +
    'Si el chequeo de verdad no puede quedarse sin corpus, va a\n' +
    '`ARMAN_SU_PROPIO_CORPUS` de `scripts/recorrido.mjs`, con su motivo escrito\n' +
    'al lado.\n' +
    'Y la extensión de las pantallas se pide con `EXTENSIONES_DE_PANTALLA`, del\n' +
    'mismo archivo, en vez de escribirla. Cuando la clave de una exención nombra\n' +
    'una pantalla, se escribe sin extensión y el chequeo se la saca a lo que\n' +
    'compara.'
  );
  process.exit(1);
}

console.log(
  `Red verificada: ${revisados} chequeos que se plantan si no encuentran nada ` +
  `(${ARMAN_SU_PROPIO_CORPUS.size} exento, con su motivo), ninguno con la extensión de las ` +
  `pantallas escrita a mano ni metida adentro de la clave de una exención, y los ` +
  `${enElReadme.size} nombrados en la tabla del README.`
);
