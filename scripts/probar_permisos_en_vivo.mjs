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

   HOY DA ROJO, Y ESTÁ BIEN QUE LO DÉ. Es el pendiente 67. Supabase deja
   puesto un `ALTER DEFAULT PRIVILEGES` que le concede todo a `anon` y a
   `authenticated` sobre cada tabla, secuencia y función nueva, así que la
   base va acumulando permisos que nadie escribió. La prueba se escribió
   antes que el arreglo para que el día que el arreglo exista se sepa que
   funcionó por algo más que por mirarlo.

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

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const local = process.argv.includes('--local');

// --- Lo que está abierto a propósito ---------------------------------------
// Las tres puertas del directorio que se ve sin iniciar sesión, decidido por
// el Desarrollador el 24 de agosto de 2026. Cualquier otra función al alcance
// de `anon` es un hallazgo.
const FUNCIONES_ABIERTAS = new Set([
  'directorio_de',
  'perfil_del_directorio',
  'prestadora_por_slug'
]);

// Ninguna tabla ni vista está abierta a `anon` a propósito: todo lo público
// del producto pasa por esas tres funciones. La lista está acá y vacía para
// que el día que se decida abrir una haya dónde escribirla, con su motivo.
const TABLAS_ABIERTAS = new Set([]);

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
sostener('y los permisos de las funciones, que las tres puertas del directorio están',
  [...FUNCIONES_ABIERTAS].every((f) => funcionesAnon.includes(f)),
  funcionesAnon.length + ' funciones al alcance anónimo');

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

comprobar('ninguna tabla ni vista le concede nada a `anon`',
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
comprobar('ninguna función al alcance de `anon` fuera de las tres del directorio',
  deMas.length === 0,
  deMas.length === 0 ? '' : lista(deMas));

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
console.log('Es el pendiente 67, y hasta que se arregle esta prueba tiene que dar rojo.');
console.log('Ojo con lo que significa: un permiso de más no abre nada mientras la política');
console.log('niegue. Lo que está mal no es que hoy entre alguien, es que la puerta quede');
console.log('lista para el día que se escriba una política más floja.');
process.exit(1);
