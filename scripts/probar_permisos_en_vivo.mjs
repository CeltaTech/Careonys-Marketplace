/* ===================================================
   LOS PERMISOS DE LA BASE, MEDIDOS EN LA BASE

       node scripts/probar_permisos_en_vivo.mjs

   Contra la base local:

       node scripts/probar_permisos_en_vivo.mjs --local

   POR QUÉ EXISTE. Los dieciséis chequeos que corren antes de cada
   `commit` leen los archivos de `supabase/migrations/`, y eso es
   historial de intención: dice qué se quiso, no qué quedó. Un permiso que
   la base tiene y que ninguna migración pidió les resulta invisible. Esta
   prueba mira la base y no los archivos: le pide el esquema real a la
   línea de comandos, que ya está enlazada y no pide contraseña.

   PARA QUÉ SE ESCRIBIÓ, Y CÓMO TERMINÓ. Nació en rojo a propósito: era el
   pendiente 67, y lo que estaba mal era que Supabase deja puesto un
   `ALTER DEFAULT PRIVILEGES` que le concede todo a `anon` y a
   `authenticated` sobre cada tabla, secuencia y función nueva, así que la
   base iba acumulando permisos que nadie escribió. Se escribió antes que el
   arreglo para que el día que el arreglo existiera se supiera que funcionó
   por algo más que por mirarlo. **El arreglo llegó el 26 de agosto de 2026**
   —migraciones 0032 y 0033— y esta prueba se puso en verde ese día.

   Y ENTONCES SE VOLVIÓ A PONER EN ROJO, SIN QUE NADA SE ROMPIERA. Tenía
   escrita adentro su propia lista de funciones abiertas sin sesión: las tres
   del directorio. Después las migraciones 0035, 0038 y 0041 abrieron tres
   puertas más —las zonas, los vocabularios y las guías—, cada una con su
   motivo escrito y comprobado, y esta prueba las vio como un hallazgo. Como
   el rojo ya era «esperado», nadie lo miró: quedó anotada contra un pendiente
   que hacía días estaba cerrado. **La lista ya no está acá**: se importa de
   `scripts/verificar_esquema.mjs`, que es donde vive con el motivo de cada
   una. Una lista repetida se despega, y la que se despega es siempre la que
   nadie mira.

   QUÉ MIRA, Y QUÉ NO. Mira permisos —quién puede tocar la tabla—, que es
   el primer paso de los dos que hace Postgres. El segundo, qué filas ve,
   lo miran las políticas, y de eso se ocupa `probar_aislamiento.mjs`. Los
   dos hacen falta: un permiso de más no abre nada mientras la política
   niegue, pero deja la puerta lista para el día que alguien escriba una
   política más floja. Por eso la última comprobación de acá es
   justamente esa: que ninguna política apunte a otro rol que
   `authenticated`.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { AL_ALCANCE_ANONIMO, VISTAS_AL_ALCANCE_ANONIMO } from './verificar_esquema.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const local = process.argv.includes('--local');

// --- Lo que está abierto a propósito ---------------------------------------
// No se escribe acá: se importa de `verificar_esquema.mjs`, que la tiene con
// el motivo de cada una y la migración que la abrió. Cualquier función al
// alcance de `anon` que no esté en esa lista es un hallazgo, y para dejar de
// serlo hay que escribirle el motivo allá.
const FUNCIONES_ABIERTAS = new Set(AL_ALCANCE_ANONIMO.keys());

// Y lo mismo con las vistas. Hasta el 31 de agosto de 2026 no había ninguna
// abierta: la lista vivía acá y vacía, esperando el día en que se decidiera
// abrir una. Ese día llegó —la oferta general de cursos— y la lista se fue al
// mismo lugar que la otra, con el motivo y con lo que la sostiene. Acá quedó
// sólo el uso, que es como tenía que haber estado desde el principio.
const TABLAS_ABIERTAS = new Set(VISTAS_AL_ALCANCE_ANONIMO.keys());

let fallos = 0;
let inservible = false;

function comprobar(titulo, condicion, detalle) {
  console.log((condicion ? '   bien  ' : '   MAL   ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) fallos++;
}

function sostener(titulo, condicion, detalle) {
  console.log((condicion ? '   ok    ' : '   ROTA  ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) inservible = true;
}

function lista(nombres, tope = 6) {
  if (nombres.length <= tope) return nombres.join(', ');
  return nombres.slice(0, tope).join(', ') + ' y ' + (nombres.length - tope) + ' más';
}

// --- El esquema real --------------------------------------------------------
let esquema;
try {
  esquema = execFileSync(
    'npx',
    ['supabase', 'db', 'dump', local ? '--local' : '--linked', '--schema', 'public'],
    { cwd: raiz, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 }
  );
} catch (e) {
  console.error('No se pudo traer el esquema de la base ' + (local ? 'local' : 'enlazada') + '.');
  console.error(local
    ? 'Probablemente el entorno local no esté levantado.'
    : 'La línea de comandos tiene que estar enlazada al proyecto.');
  process.exit(1);
}

const renglones = esquema.split('\n');
console.log('Base: ' + (local ? 'local' : 'la enlazada') + ', ' + renglones.length + ' renglones de esquema');
console.log('');

// --- Que la prueba esté en condiciones de medir algo -----------------------
// Un volcado vacío, o uno que llegara sin la parte de los permisos, dejaría
// todas las comprobaciones de abajo en verde sin haber mirado nada.
console.log('Que la prueba pueda fallar');

const tablas = renglones.filter((r) => r.startsWith('CREATE TABLE')).length;
const politicas = renglones.filter((r) => r.startsWith('CREATE POLICY')).length;
sostener('el volcado trae las tablas y sus políticas',
  tablas > 0 && politicas > 0, tablas + ' tablas, ' + politicas + ' políticas');

const funcionesAnon = renglones
  .filter((r) => /^GRANT .* ON FUNCTION .* TO "anon";$/.test(r))
  .map((r) => (r.match(/ON FUNCTION "public"\."([^"]+)"/) || [])[1])
  .filter(Boolean);
sostener('y los permisos de las funciones, que las puertas abiertas a propósito están',
  [...FUNCIONES_ABIERTAS].every((f) => funcionesAnon.includes(f)),
  funcionesAnon.length + ' funciones al alcance anónimo, y las ' +
  FUNCIONES_ABIERTAS.size + ' que tienen motivo escrito están todas');

// --- 1. El permiso por omisión ---------------------------------------------
console.log('');
console.log('Los permisos que la base se pone sola');

const porOmision = renglones.filter((r) =>
  r.startsWith('ALTER DEFAULT PRIVILEGES') && /TO "(anon|authenticated)";$/.test(r));
const pataDe = (r) => (r.match(/ON (TABLES|SEQUENCES|FUNCTIONS)/) || [])[1];

comprobar('ninguna tabla, secuencia ni función nueva nace con permiso para `anon` ni `authenticated`',
  porOmision.length === 0,
  porOmision.length === 0 ? '' : porOmision.length + ' líneas, sobre ' +
    lista([...new Set(porOmision.map(pataDe))]));

// --- 2. Las tablas y vistas al alcance anónimo -----------------------------
console.log('');
console.log('Quién puede tocar cada tabla');

const tablasAnon = [...new Set(renglones
  .filter((r) => /^GRANT .* ON TABLE .* TO "anon";$/.test(r))
  .map((r) => (r.match(/ON TABLE "public"\."([^"]+)"/) || [])[1])
  .filter(Boolean))].filter((t) => !TABLAS_ABIERTAS.has(t));

comprobar('ninguna tabla ni vista le concede nada a `anon`, salvo la que está abierta a propósito',
  tablasAnon.length === 0,
  tablasAnon.length === 0 ? '' : tablasAnon.length + ': ' + lista(tablasAnon));

const todoAAutenticados = [...new Set(renglones
  .filter((r) => /^GRANT ALL ON TABLE .* TO "authenticated";$/.test(r))
  .map((r) => (r.match(/ON TABLE "public"\."([^"]+)"/) || [])[1])
  .filter(Boolean))];

comprobar('ninguna tabla le concede *todo* a `authenticated` (mínimo privilegio)',
  todoAAutenticados.length === 0,
  todoAAutenticados.length === 0 ? '' : todoAAutenticados.length + ': ' + lista(todoAAutenticados));

// --- 3. Las funciones al alcance anónimo -----------------------------------
console.log('');
console.log('Qué se puede llamar sin iniciar sesión');

const deMas = funcionesAnon.filter((f) => !FUNCIONES_ABIERTAS.has(f));
comprobar('ninguna función al alcance de `anon` fuera de las que tienen motivo escrito',
  deMas.length === 0,
  deMas.length === 0
    ? 'las ' + FUNCIONES_ABIERTAS.size + ' de `verificar_esquema.mjs`, y ninguna más'
    : lista(deMas) + ' — si están bien, el motivo se escribe en AL_ALCANCE_ANONIMO ' +
      'de `scripts/verificar_esquema.mjs`');

// --- 4. Lo que hoy contiene todo lo de arriba ------------------------------
console.log('');
console.log('Y la segunda cerradura, que es la que hoy aguanta');

const politicasFlojas = renglones
  .filter((r) => r.startsWith('CREATE POLICY'))
  .filter((r) => !/ TO "authenticated"/.test(r))
  .map((r) => (r.match(/^CREATE POLICY "([^"]+)"/) || [])[1]);

comprobar('todas las políticas piden sesión: ninguna apunta a otro rol que `authenticated`',
  politicasFlojas.length === 0,
  politicasFlojas.length === 0 ? politicas + ' políticas' : lista(politicasFlojas));

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: el volcado llegó incompleto.');
  console.log('Antes de leer el resultado de arriba hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('Los permisos de la base son los que alguien escribió, y ninguno más.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Esta prueba pasa desde el 26 de agosto de 2026: si da rojo, algo cambió.');
console.log('Un permiso que sobra puede estar bien, pero entonces el motivo se escribe en');
console.log('AL_ALCANCE_ANONIMO de `scripts/verificar_esquema.mjs`, no acá.');
console.log('Ojo con lo que significa: un permiso de más no abre nada mientras la política');
console.log('niegue. Lo que está mal no es que hoy entre alguien, es que la puerta quede');
console.log('lista para el día que se escriba una política más floja.');
process.exit(1);
