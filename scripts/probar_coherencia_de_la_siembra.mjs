/* ===================================================
   LA SIEMBRA FICTICIA, MIRADA COMO SI FUERA DE UN CLIENTE

       node scripts/probar_coherencia_de_la_siembra.mjs

   POR QUÉ EXISTE. Las tres Prestadoras ficticias son el banco de pruebas del
   producto: si algo no se puede hacer con ellas, no se puede hacer. Y una
   columna que la siembra no llena nunca no se nota mirando ninguna pantalla,
   porque la pantalla se dibuja igual: lo que no se ve es que **nada la está
   probando**. La consulta que la olvida y la consulta que la trae contestan lo
   mismo. Es el mismo argumento que escribió la migración 0027 para cargar
   comprobaciones en los legajos —«una consulta rota y una consulta correcta
   contra una tabla vacía contestan exactamente lo mismo»— aplicado a la
   siembra entera y no a una tabla.

   QUÉ MIRA
    1. Que ninguna fila pertenezca a una Prestadora que no existe.
    2. Que ninguna fila apunte a una fila de **otra** Prestadora. Es el
       aislamiento visto desde los datos y no desde la sesión: una política
       perfecta sobre datos ya mezclados no separa nada.
    3. Que ninguna columna quede sin llenarse ni una sola vez, salvo las que
       una migración no puede llenar, que están abajo con su motivo escrito.

   CONTRA QUÉ BASE. Contra la de esta máquina, que es la que sale de correr
   `supabase/migrations/` y nada más. La publicada no sirve para esto: ahí la
   siembra convive con lo que existe porque alguien usó el producto, y una
   columna llena por una persona de verdad taparía que la siembra no la llena.

   QUÉ PUEDE TAPAR IGUAL. Las filas que esta máquina tenga fuera de las
   migraciones —las cuentas que crean las otras pruebas, por ejemplo— también
   se cuentan. Eso sólo puede **tapar** un hueco, nunca inventarlo: lo que esta
   prueba encuentra es real, y lo que no encuentra se lee limpio recién después
   de un `supabase db reset --local`.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   Antes de mirar nada se planta si el volcado vino vacío, si no se entendió ni
   una fila, o si el separador de valores no distingue lleno de vacío: las tres
   serían formas de dar ✔ sin haber leído nada. La tercera es la que importa,
   porque un separador roto que devolviera todo nulo pondría en rojo a media
   base, y uno que no devolviera ningún nulo pondría todo en verde.

   No entra en `verificar_todo.mjs`: necesita la base levantada, y el gancho de
   `commit` corre sin base. Va en `scripts/probar_todo.mjs`.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* --- Lo que una migración no puede llenar, con su motivo -------------------
   No es una lista de perdones: es una lista de imposibles. Cualquier columna
   vacía que no esté acá es un hallazgo, y para dejar de serlo hay que llenarla
   en la siembra o escribir acá por qué no se puede. */
const LA_SIEMBRA_NO_PUEDE = new Map([
  ['estudios_asistente.archivo_url',
   'el archivo vive en el depósito, y una migración no sube archivos'],
  ['matriculas_asistente.archivo_url',
   'el archivo vive en el depósito, y una migración no sube archivos'],
  ['tenants.estado_fijado_en',
   'se escribe cuando el estado cambia, y las tres Prestadoras nacen activas'],
  ['experiencia_laboral_asistente.puesto_otro',
   'sólo se llena cuando el puesto elegido es «otro», que no es el caso de ninguno'],
  ['tenants.referencia_celtatech',
   'la 0025 lo dice: a las ficticias no las dio de alta CeltaTech y nunca van a tener una'],
  ['avisos.grid_schedule_7x3',
   'la 0016 la reemplazó por filas y ya no se escribe; queda para no perder lo viejo'],
]);

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

function enLista(nombres, tope = 8) {
  const orden = [...nombres].sort();
  if (orden.length <= tope) return orden.join(', ');
  return orden.slice(0, tope).join(', ') + ' y ' + (orden.length - tope) + ' más';
}

/* Contra la publicada no corre, y lo dice en vez de correr igual: ahí la
   siembra convive con lo que cargó gente usando el producto, y una columna
   llena por una persona de verdad taparía justo lo que esto viene a mirar. */
if (process.argv.includes('--linked')) {
  console.error('Esta prueba mide la siembra, así que sólo corre contra la base de esta máquina.');
  console.error('En la publicada una columna llena por alguien de verdad taparía el hueco.');
  process.exit(1);
}

// --- El volcado de datos ----------------------------------------------------
const carpeta = mkdtempSync(join(tmpdir(), 'siembra-'));
const destino = join(carpeta, 'datos.sql');
let volcado;
try {
  execFileSync(
    'npx',
    ['supabase', 'db', 'dump', '--local', '--data-only', '--schema', 'public', '-f', destino],
    { cwd: raiz, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  volcado = readFileSync(destino, 'utf8');
} catch (error) {
  const dicho = `${(error && error.stderr) || ''}${(error && error.stdout) || ''}`.trim();
  console.error('No se pudo traer los datos de la base de esta máquina.');
  console.error('Hace falta el entorno local levantado (`supabase start`).');
  if (dicho) console.error('\n' + dicho);
  process.exit(1);
} finally {
  rmSync(carpeta, { recursive: true, force: true });
}

/* --- Partir una tupla de SQL en sus valores --------------------------------
   Se recorre carácter por carácter porque adentro de un texto puede haber
   comas, paréntesis y llaves, y cualquiera de las tres partiría mal la fila si
   se partiera por separador. La comilla simple se cierra sola: `''` adentro de
   un texto es una comilla y no el final. */
function partir(tupla) {
  const valores = [];
  let actual = '';
  let enTexto = false;
  for (let i = 0; i < tupla.length; i++) {
    const c = tupla[i];
    if (enTexto) {
      if (c === "'" && tupla[i + 1] === "'") { actual += "''"; i++; continue; }
      if (c === "'") { enTexto = false; actual += c; continue; }
      actual += c;
      continue;
    }
    if (c === "'") { enTexto = true; actual += c; continue; }
    if (c === ',') { valores.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  valores.push(actual.trim());
  return valores;
}

/* Cada tupla de un `VALUES`, en bruto. Se busca el paréntesis que abre y el que
   cierra contando los de adentro, con la misma regla de la comilla. */
function tuplas(cuerpo) {
  const sacadas = [];
  let hondo = 0;
  let desde = -1;
  let enTexto = false;
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    if (enTexto) {
      if (c === "'" && cuerpo[i + 1] === "'") { i++; continue; }
      if (c === "'") enTexto = false;
      continue;
    }
    if (c === "'") { enTexto = true; continue; }
    if (c === '(') { if (hondo === 0) desde = i + 1; hondo++; continue; }
    if (c === ')') { hondo--; if (hondo === 0 && desde >= 0) sacadas.push(cuerpo.slice(desde, i)); }
  }
  return sacadas;
}

// --- Leer el volcado --------------------------------------------------------
const filas = new Map();      // tabla -> [ {columna: valor|null} ]
const columnas = new Map();   // tabla -> [nombres]
const bloque = /INSERT INTO "public"\."([^"]+)" \(([^)]*)\) VALUES([\s\S]*?);\r?\n/g;
let hallado;
while ((hallado = bloque.exec(volcado)) !== null) {
  const tabla = hallado[1];
  const cols = hallado[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  const registros = filas.get(tabla) || [];
  columnas.set(tabla, cols);
  for (const cruda of tuplas(hallado[3])) {
    const valores = partir(cruda);
    if (valores.length !== cols.length) continue;
    const fila = {};
    cols.forEach((c, i) => { fila[c] = valores[i] === 'NULL' ? null : valores[i]; });
    registros.push(fila);
  }
  filas.set(tabla, registros);
}

const totalFilas = [...filas.values()].reduce((n, r) => n + r.length, 0);
console.log('Base: la de esta máquina, ' + filas.size + ' tablas con datos y ' +
            totalFilas + ' filas leídas.');
console.log('');

// --- Que la prueba pueda fallar --------------------------------------------
console.log('Que la prueba pueda fallar');

seRevisaron(filas.size, 'el volcado no trajo una sola tabla con datos');
sostener('el volcado trae tablas y filas', filas.size > 0 && totalFilas > 0,
  filas.size + ' tablas, ' + totalFilas + ' filas');

/* El separador es el que decide todo lo de abajo. Uno que devolviera siempre
   nulo pondría media base en rojo; uno que no devolviera ninguno la pondría
   toda en verde. Así que se le exige que haya visto de las dos clases. */
let llenos = 0;
let vacios = 0;
for (const registros of filas.values()) {
  for (const fila of registros) {
    for (const v of Object.values(fila)) (v === null ? vacios++ : llenos++);
  }
}
sostener('y el separador distingue lleno de vacío', llenos > 0 && vacios > 0,
  llenos + ' valores con algo, ' + vacios + ' nulos');

sostener('y las tres Prestadoras ficticias están',
  (filas.get('tenants') || []).length === 3,
  (filas.get('tenants') || []).length + ' en `tenants`');

if (inservible) {
  console.log('');
  console.log('La prueba no está en condiciones de medir nada, así que no mide.');
  console.log('Lo de arriba se arregla antes de mirar ningún resultado de abajo.');
  process.exit(1);
}

// --- 1. Ninguna fila de una Prestadora que no existe ------------------------
console.log('');
console.log('Las Prestadoras');

const prestadoras = new Map(
  (filas.get('tenants') || []).map((t) => [t.id, (t.slug || '').replace(/'/g, '')])
);

const huerfanas = [];
for (const [tabla, registros] of filas) {
  if (!(columnas.get(tabla) || []).includes('tenant_id')) continue;
  const sueltas = registros.filter((f) => f.tenant_id !== null && !prestadoras.has(f.tenant_id));
  if (sueltas.length) huerfanas.push(tabla + ' (' + sueltas.length + ')');
}
comprobar('Ninguna fila pertenece a una Prestadora que no existe',
  huerfanas.length === 0, huerfanas.length ? enLista(huerfanas) : 'revisadas ' +
  [...filas.keys()].filter((t) => (columnas.get(t) || []).includes('tenant_id')).length + ' tablas');

// --- 2. Ninguna fila apunta a una fila de otra Prestadora -------------------
/* El índice se arma con todo lo leído: identificador -> Prestadora dueña. No
   hace falta la lista de claves foráneas, y es mejor así, porque una columna
   que apunta a otra tabla sin declararlo también se mira. */
const duenio = new Map();
for (const [tabla, registros] of filas) {
  if (!(columnas.get(tabla) || []).includes('tenant_id')) continue;
  for (const fila of registros) if (fila.id) duenio.set(fila.id, fila.tenant_id);
}

const cruces = [];
let apuntes = 0;
for (const [tabla, registros] of filas) {
  const cols = (columnas.get(tabla) || []).filter((c) => c.endsWith('_id') && c !== 'tenant_id' && c !== 'id');
  for (const fila of registros) {
    if (fila.tenant_id === null || fila.tenant_id === undefined) continue;
    for (const col of cols) {
      const valor = fila[col];
      if (!valor || !duenio.has(valor)) continue;
      apuntes++;
      const suyo = duenio.get(valor);
      if (suyo !== null && suyo !== fila.tenant_id) {
        cruces.push(tabla + '.' + col + ' → ' + (prestadoras.get(suyo) || '¿?'));
      }
    }
  }
}
comprobar('Ninguna fila apunta a una fila de otra Prestadora',
  cruces.length === 0,
  cruces.length ? enLista(cruces) : apuntes + ' referencias entre filas de las Prestadoras');

// --- 3. Ninguna columna queda sin llenarse nunca ----------------------------
console.log('');
console.log('Las columnas que la siembra no llena');

const nuncaLlenas = [];
let miradas = 0;
for (const [tabla, registros] of filas) {
  if (!registros.length) continue;
  for (const col of columnas.get(tabla) || []) {
    miradas++;
    if (registros.some((f) => f[col] !== null && f[col] !== undefined)) continue;
    if (LA_SIEMBRA_NO_PUEDE.has(tabla + '.' + col)) continue;
    nuncaLlenas.push(tabla + '.' + col);
  }
}

seRevisaron(miradas, 'no se miró una sola columna');
comprobar('Toda columna se llena alguna vez',
  nuncaLlenas.length === 0,
  nuncaLlenas.length
    ? nuncaLlenas.length + ' vacías en las ' + miradas + ' miradas'
    : miradas + ' columnas revisadas');

for (const [cual, motivo] of LA_SIEMBRA_NO_PUEDE) {
  console.log('   · Afuera: ' + cual + ' — ' + motivo);
}

if (nuncaLlenas.length) {
  console.log('');
  console.log('Vacías en toda la siembra:');
  for (const cual of nuncaLlenas.sort()) console.log('     ' + cual);
  console.log('');
  console.log('Ninguna pantalla lo muestra, porque la pantalla se dibuja igual. Lo que');
  console.log('no se ve es que nada las está probando: la consulta que las olvida y la');
  console.log('que las trae contestan lo mismo. Se cierra llenándolas en la siembra, o');
  console.log('escribiendo en `LA_SIEMBRA_NO_PUEDE` por qué una migración no puede.');
}

// --- El veredicto -----------------------------------------------------------
console.log('');
if (fallos === 0) {
  console.log('La siembra es coherente: ninguna fila cuelga de una Prestadora que no está,');
  console.log('ninguna apunta a los datos de otra, y toda columna se llena alguna vez.');
} else {
  console.log(fallos + ' de 3 comprobaciones fallaron.');
}
if (fallos > 0) process.exitCode = 1;
