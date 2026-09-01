/* ===================================================
   EL BARRIDO: SE PREGUNTA POR TODAS LAS TABLAS, NO POR LAS QUE UNO SE ACUERDA

       node scripts/barrer_aislamiento.mjs

   Es la idea del guion de aislamiento de Careonys —`scripts/probar_aislamiento.mjs`
   de ese repositorio— traída acá. La diferencia con `probar_aislamiento.mjs` de
   este proyecto no es de fuerza sino de forma:

     * Aquel nombra cada caso a mano: treinta y nueve preguntas escritas una por
       una. Prueba hondo y prueba lo que se le escribió.
     * Este no nombra ninguna. Saca la lista de tablas de las migraciones y
       pregunta por **todas**, incluidas las que se creen mañana. Prueba flojo y
       prueba todo.

   Los dos hacen falta. Una tabla nueva con la RLS mal puesta no aparece en el
   primero hasta que alguien se acuerde de agregarle su caso; en este aparece
   sola el día que se crea.

   Qué comprueba, y por qué se puede correr contra el servidor de verdad:

     * **Sin sesión no se ve ni una fila de ninguna tabla con Prestadora.** Con
       la clave publicable, que es la que viaja adentro de cada pantalla y que
       cualquiera lee del navegador. No hace falta registrarse ni confirmar
       ninguna casilla, así que esto corre donde el otro guion no llega.
     * **Las excepciones se declaran acá abajo, con su motivo.** Una tabla que
       se lee sin sesión a propósito no hace fallar el barrido, pero tiene que
       estar escrita en esta lista: lo que se quiere evitar es la que se abrió
       sin que nadie lo decidiera.

   Lo que este barrido **no** puede hacer, y conviene no confundir: no compara
   una Prestadora contra la otra, porque para eso hacen falta dos sesiones y el
   registro del servidor remoto pide confirmar el correo. Esa mitad la prueba
   `probar_aislamiento.mjs` con `--local`.

   Devuelve 0 si no se escapó nada y 1 si se escapó algo.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { conOrganizacion } from './verificar_esquema.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Las tablas salen de las migraciones, no de una lista escrita a mano ----
// La función que las junta es la misma que usa `verificar_esquema.mjs`: una
// tabla con datos de una Prestadora se reconoce por su columna, y esa regla
// vive en un solo lado (§5.7).
const carpeta = join(raiz, 'supabase', 'migrations');
const archivos = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort();
const textos = archivos.map((n) => readFileSync(join(carpeta, n), 'utf8'));

// Una tabla que se renombró se pregunta por su nombre de hoy. Los renombres se
// leen de las propias migraciones para que esto no haya que mantenerlo.
const renombres = new Map();
for (const t of textos) {
  for (const m of t.replace(/\r\n/g, '\n').matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?"?public"?\."?([a-z_]+)"?\s+rename\s+to\s+"?([a-z_]+)"?/gi)) {
    renombres.set(m[1].toLowerCase(), m[2].toLowerCase());
  }
}
function nombreDeHoy(tabla) {
  let n = tabla;
  for (let i = 0; i < 10 && renombres.has(n); i++) n = renombres.get(n);
  return n;
}

// Las vistas se preguntan igual que las tablas, y por un motivo que costó ver:
// una vista publica lo que su consulta devuelve, y el permiso de la tabla de
// abajo no la frena. `directorio` es justamente eso.
const vistas = new Set();
for (const t of textos) {
  for (const m of t.replace(/\r\n/g, '\n').matchAll(
    /create\s+(?:or\s+replace\s+)?view\s+"?public"?\."?([a-z_]+)"?/gi)) {
    vistas.add(m[1].toLowerCase());
  }
}

// La tabla de Prestadoras no tiene columna de Prestadora: la fila **es** la
// Prestadora, así que la columna que aísla es su propio `id`. Careonys tropezó
// con lo mismo y lo dejó escrito en
// `20260822180000_el_superadmin_queda_encerrado_tambien_en_las_politicas_que_solo_lo_nombran_a_el.sql`.
// Sin este renglón el barrido se saltea justo la tabla que sí se lee sin sesión.
const SU_ID_ES_LA_PRESTADORA = ['tenants'];

const tablas = [...new Set([
  ...[...conOrganizacion(textos)].map(nombreDeHoy),
  ...SU_ID_ES_LA_PRESTADORA,
  ...vistas
])].sort();

// --- Lo que sí se lee sin sesión, a propósito y con motivo escrito ----------
// **Hoy está vacía, y eso es la noticia.** Tenía dos entradas hasta la migración
// 0021: `tenants`, que devolvía la lista de Prestadoras activas, y
// `directorio`, que devolvía los legajos publicados de todas mezclados.
// El Desarrollador cerró las dos el 25 de agosto de 2026 —no hay lista de
// Prestadoras para nadie, y cada Prestadora tiene su propio directorio—, así
// que ahora el rol anónimo no lee ninguna tabla ni vista de este esquema: entra
// por tres funciones y las tres le exigen nombrar una Prestadora.
//
// La lista se deja escrita igual. Si algún día vuelve a hacer falta abrir algo,
// el lugar donde se escribe el motivo ya existe, y el barrido sigue haciendo la
// única pregunta que importa: ¿esto se abrió porque alguien lo decidió?
//
// Y volvió a hacer falta. El 1 de septiembre de 2026, la primera vez que este
// barrido se corrió desde que quedó enganchado a `probar_todo.mjs`, encontró
// una vista abierta. Estaba abierta por decisión, no por descuido —que es
// justo la diferencia que este guion existe para marcar—, y lo único que
// faltaba era escribirlo acá.
const ABIERTAS_A_PROPOSITO = new Map([
  ['oferta_de_cursos',
   'la oferta general de cursos, que el Desarrollador decidió el 31 de agosto ' +
   'de 2026 que se vea sin iniciar sesión (migración 0051). La vista filtra ' +
   'adentro `tenant_id is null and publicado`, así que no muestra ninguna fila ' +
   'de ninguna Prestadora, y no lleva ni una columna con el contenido de un ' +
   'curso: sólo el nombre, la descripción y la ficha']
]);

// --- La dirección y la clave publicable, de donde ya están ------------------
const fuente = readFileSync(join(raiz, 'js', 'apiClient.js'), 'utf8');
const url   = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
const clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base ni su clave publicable.');
  process.exit(1);
}
const base = url.replace(/\/$/, '');

console.log('Servidor: ' + new URL(url).hostname);
console.log('Sin sesión, con la clave que cualquiera lee del navegador.');
console.log('');

// --- El barrido -------------------------------------------------------------
const escapes = [];
const abiertas = [];
let porPermiso = 0;
let vaciasOCerradas = 0;

for (const tabla of tablas) {
  const res = await fetch(`${base}/rest/v1/${tabla}?select=*&limit=1000`, {
    headers: { apikey: clave, Authorization: 'Bearer ' + clave }
  });
  let filas = null;
  try { filas = await res.json(); } catch { filas = null; }

  if (!res.ok || !Array.isArray(filas)) {
    // La base contesta «permiso denegado» antes de mirar ninguna fila. Es el
    // cierre más fuerte que hay: ni siquiera llega a evaluarse una política.
    porPermiso++;
    continue;
  }

  if (filas.length === 0) {
    // Cero filas sin sesión no distingue «la política cerró» de «la tabla está
    // vacía». Se cuenta aparte justamente por eso: no es una comprobación
    // superada, es una que este guion no puede hacer.
    vaciasOCerradas++;
    continue;
  }

  const motivo = ABIERTAS_A_PROPOSITO.get(tabla);
  if (motivo) abiertas.push([tabla, filas.length, motivo]);
  else escapes.push([tabla, filas.length]);
}

console.log(`${tablas.length} tablas y vistas guardan datos de una Prestadora.`);
console.log(`${porPermiso} ni siquiera dejan preguntar sin sesión: la base contesta permiso denegado.`);
console.log(`${vaciasOCerradas} contestan sin devolver nada, que puede ser la política o puede ser`);
console.log(`   que estén vacías: el barrido no las distingue y no las cuenta como aprobadas.`);
console.log(`${abiertas.length + escapes.length} devuelven filas a quien no inició sesión.`);
console.log('');

for (const [tabla, cuantas, motivo] of abiertas) {
  console.log(`   abierta a propósito  ${tabla}  — ${cuantas} fila(s)`);
  console.log(`                        ${motivo}`);
}

/* Y una excepción que ya no exime nada es una excepción que tapa. Si la tabla
   que está escrita acá arriba dejó de devolver filas —porque se cerró, porque
   se borró, o porque se renombró—, el renglón queda perdonando algo que no
   existe, y el próximo que caiga con ese nombre pasa sin que nadie mire. No hay
   ninguna prueba de afuera que lo pregunte —`probar_exenciones.mjs` sólo mira
   los `verificar_`—, así que se lo pregunta el barrido a sí mismo, en cada
   corrida. */
const nombradas = new Set(abiertas.map(([tabla]) => tabla));
const sobrantes = [...ABIERTAS_A_PROPOSITO.keys()].filter((tabla) => !nombradas.has(tabla));
if (sobrantes.length > 0) {
  console.log('');
  for (const tabla of sobrantes) {
    console.log('   SOBRA LA EXCEPCIÓN  ' + tabla + '  — ya no devuelve ninguna fila sin sesión');
  }
  console.log('');
  console.log('Una excepción que no exime nada sólo tapa: el día que otra cosa se llame');
  console.log('igual, se abre sin que nadie mire. Se saca de ABIERTAS_A_PROPOSITO.');
  process.exit(1);
}

if (escapes.length === 0) {
  console.log('');
  console.log('Ninguna tabla ni vista devolvió filas sin sesión fuera de las declaradas.');
  console.log('Ojo con lo que esto significa: dice que la puerta de adelante está cerrada,');
  console.log('no que adentro cada quien vea lo suyo. Eso lo prueba probar_aislamiento.mjs.');
  process.exit(0);
}

console.log('');
for (const [tabla, cuantas] of escapes) {
  console.log(`   SE ESCAPA  ${tabla}  — devolvió ${cuantas} fila(s) a quien no inició sesión`);
}
console.log('');
console.log(escapes.length + ' tabla(s) se leen sin sesión sin que nadie lo haya decidido.');
process.exit(1);
