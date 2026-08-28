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

   QUÉ EXIGE
   Que todo chequeo llame por lo menos una vez a `seRevisaron()` o a
   `hayArchivos()`, las dos de `scripts/recorrido.mjs`, que son las que se
   plantan cuando la cuenta da cero. La llamada se busca **con los comentarios
   quitados**: si no, a un chequeo le alcanzaría con nombrarlas en su encabezado
   para pasar, y eso es justo lo que este archivo viene a impedir.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Tres veces, porque las tres pueden fallar:
   1. Contra la función de verdad: `seRevisaron(0, …)` tiene que cortar y
      `seRevisaron(3, …)` tiene que devolver 3. Sin esto, la guarda podría estar
      vacía por dentro y todos los chequeos «cumplirían» igual.
   2. Contra `hayArchivos()` pidiendo una extensión que no existe, que es la
      forma real en que esto se rompe: nadie borra los archivos, les cambian el
      nombre.
   3. Contra un chequeo de mentira escrito acá mismo que **no** llama a
      ninguna de las dos, y que tiene que ser señalado. Y contra otro que sí la
      llama pero sólo adentro de un comentario, que tampoco vale.
=================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seRevisaron, hayArchivos } from './recorrido.mjs';

const aca = dirname(fileURLToPath(import.meta.url));

/* Quien corre a los demás no revisa nada por su cuenta, y este archivo tampoco
   se revisa a sí mismo. */
const NO_SON_CHEQUEOS = new Set(['verificar_todo.mjs', 'verificar_red.mjs']);

/* La única excepción, con su motivo escrito. `cajas` no recorre el proyecto:
   fabrica un árbol de mentira en la carpeta temporal y le pide a `archivos()`
   que lo recorra, así que su corpus lo arma él y no puede quedar vacío por un
   renombre. Y ya tiene su propia guarda: comprueba que el archivo que dejó
   afuera de toda caja fuerte aparezca, para que un recorrido que devolviera
   siempre la lista vacía no pase. */
const EXENTOS = new Map([
  ['verificar_cajas.mjs', 'arma su propio árbol de prueba y ya comprueba que no venga vacío']
]);

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

/* ── El recorrido de verdad ─────────────────────────────────────────────── */

const chequeos = readdirSync(aca)
  .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && !NO_SON_CHEQUEOS.has(n))
  .sort();

seRevisaron(chequeos.length, 'un solo chequeo en `scripts/` que revisar');

const sinGuarda = [];
let revisados = 0;

for (const nombre of chequeos) {
  if (EXENTOS.has(nombre)) continue;
  revisados++;
  if (!tieneGuarda(readFileSync(join(aca, nombre), 'utf8'))) sinGuarda.push(nombre);
}

seRevisaron(revisados, 'un solo chequeo que no esté exento');

for (const nombre of sinGuarda) {
  fallas.push(
    `\`scripts/${nombre}\` no llama a \`seRevisaron()\` ni a \`hayArchivos()\`.\n` +
    '      Si su recorrido deja de encontrar archivos, va a escribir su ✔ igual.'
  );
}

if (fallas.length > 0) {
  console.error('La red de chequeos puede pasar sin haber mirado nada:\n');
  for (const f of fallas) console.error('  · ' + f);
  console.error(
    '\nSe arregla usando `hayArchivos()` en vez de `archivos()`, o llamando a\n' +
    '`seRevisaron(cuantos, qué)` cuando lo que se cuenta sale de una lista o de un\n' +
    'catálogo. Las dos están en `scripts/recorrido.mjs`.\n' +
    'Si el chequeo de verdad no puede quedarse sin corpus, va a `EXENTOS` de este\n' +
    'archivo con el motivo escrito.'
  );
  process.exit(1);
}

console.log(
  `Red verificada: ${revisados} chequeos que se plantan si no encuentran nada ` +
  `(${EXENTOS.size} exento, con su motivo).`
);
