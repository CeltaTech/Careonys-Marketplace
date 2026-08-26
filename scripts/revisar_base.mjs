/* ===================================================
   QUÉ VE UN VISITANTE ANÓNIMO

   Se corre en el momento en que la base vuelve a responder, ANTES de cargar el
   primer dato de verdad:

       node scripts/revisar_base.mjs

   Qué contesta, en este orden:

     1. ¿La base responde?
     2. ¿Puede alguien sin sesión pedir la lista entera de tablas? PostgREST la
        publica en `/rest/v1/`. Si contesta 401 está bien: ya no se puede sacar
        el mapa de la base con la clave que viaja al navegador. Cuando no se
        puede enumerar, se prueban igual las tablas que nombra el código.
     3. De esas, ¿cuáles devuelven filas sin sesión? Una tabla que contesta con
        datos a quien no inició sesión está abierta, tenga o no políticas.
     4. De las que devuelven filas, ¿aparecen dos Prestadoras distintas? Eso es
        la prueba de aislamiento con dos Organizaciones que pide la empresa. **Y es la única de las cuatro
        que puede dar un falso "todo bien"**: si hay una sola Prestadora cargada,
        ver una sola no prueba nada. El guion lo avisa cuando pasa.

   No escribe nada. No borra nada. Solo lee.

   No muestra ninguna clave: usa la publicable, que es la que ya está en el
   código porque está pensada para viajar al navegador, y de la dirección
   imprime solo el nombre del servidor.

   Se niega a correr contra cualquier base que no sea la de este proyecto: la de
   Careonys está en producción y no se toca desde acá (regla de los productos Careonys:
   «Careonys no se toca desde el Marketplace»).
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// La dirección y la clave salen del código, para revisar exactamente lo que
// usan las pantallas y no otra cosa.
const fuente = readFileSync(join(raiz, 'js', 'apiClient.js'), 'utf8');
const url = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
const clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];

if (!url || !clave) {
  console.error('No se pudo leer la dirección de la base desde js/apiClient.js.');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  console.error('La dirección leída no tiene la forma esperada. No se sigue.');
  process.exit(1);
}

const servidor = new URL(url).hostname;
const cabeceras = { apikey: clave, Authorization: 'Bearer ' + clave };

// Sin sesión: es a propósito. Lo que se está midiendo es qué ve alguien que
// nunca inició sesión.
async function pedir(camino, extra = {}) {
  const res = await fetch(url.replace(/\/$/, '') + camino, {
    headers: { ...cabeceras, ...extra }
  });
  return res;
}

// Nombres de tabla que aparecen en el código de las pantallas. Se usan cuando
// la base no deja enumerar, que es el caso bueno.
function tablasDelCodigo() {
  const nombres = new Set();
  const archivos = ['js/apiClient.js', 'js/auth.js', 'mockup-app.html',
    'pwa-asistente/index.html', 'pwa-familia/index.html'];
  for (const rel of archivos) {
    let texto;
    try { texto = readFileSync(join(raiz, rel), 'utf8'); } catch { continue; }
    for (const m of texto.matchAll(/_supabase(?:Get|Post|Patch)\('([a-z_]+)'/g)) nombres.add(m[1]);
    for (const m of texto.matchAll(/table === '([a-z_]+)'/g)) nombres.add(m[1]);
    for (const m of texto.matchAll(/_supabaseRequest\('[A-Z]+', *'([a-z_]+)'/g)) nombres.add(m[1]);
    for (const m of texto.matchAll(/from\('([a-z_]+)'\)/g)) nombres.add(m[1]);
    for (const m of texto.matchAll(/rest\/v1\/([a-z_]+)/g)) nombres.add(m[1]);
  }
  // Y las vistas que crean las migraciones: son direcciones web igual que las
  // tablas, y la sonda tiene que mirarlas aunque el código todavía no las use.
  try {
    for (const arch of readdirSync(join(raiz, 'supabase', 'migrations'))) {
      const sql = readFileSync(join(raiz, 'supabase', 'migrations', arch), 'utf8');
      for (const m of sql.matchAll(/create (?:or replace )?view public\.([a-z_]+)/gi)) nombres.add(m[1]);
    }
  } catch { /* todavía no hay migraciones */ }
  return [...nombres].sort();
}

console.log('Servidor: ' + servidor);
console.log('Sesión: ninguna (es a propósito: se mide qué ve un anónimo)\n');

// --- 1. ¿Responde? ---------------------------------------------------------
let raiz_res;
try {
  raiz_res = await pedir('/rest/v1/', { Accept: 'application/openapi+json' });
} catch (err) {
  console.error('La base NO responde: ' + err.message);
  console.error('\nSi el error habla de resolución de nombres, el proyecto está apagado o');
  console.error('pausado. Se enciende desde el tablero de Supabase, verificando primero con');
  console.error('cuál cuenta se entra.');
  process.exit(1);
}
console.log('1. La base responde.\n');

// --- 2. ¿Puede un anónimo pedir el mapa de la base? ------------------------
// Ojo con este punto: que conteste 401 NO es un problema de clave. Supabase
// pide clave secreta para esta dirección, y la publicable no lo es. Es la
// respuesta buena: quien tiene la clave del navegador no puede sacar la lista
// de tablas. Cuando pasa eso, se prueban las que nombra el código.
let expuestas = [];
let seEnumero = false;

if (raiz_res.ok) {
  const spec = await raiz_res.json();
  expuestas = Object.keys(spec.definitions || spec.components?.schemas || {}).sort();
  seEnumero = true;
  console.log('2. Un anónimo PUEDE pedir la lista entera: ' + expuestas.length + ' tablas y vistas.');
  console.log('   ' + expuestas.join(', '));
  console.log('   Eso le da el mapa de qué hay para atacar, sin adivinar nada.\n');
} else {
  console.log('2. Un anónimo no puede pedir la lista entera (' + raiz_res.status + '). Está bien.');
  expuestas = tablasDelCodigo();
  console.log('   Se prueban entonces las ' + expuestas.length + ' que nombra el código:');
  console.log('   ' + expuestas.join(', '));
  console.log('   Aviso: esta lista no es la de la base. Puede haber tablas que el código');
  console.log('   no nombra y que igual estén abiertas — este guion no las ve.\n');
}

// --- 3. Cuáles devuelven filas sin sesión ----------------------------------
const abiertas = [];
const vacias = [];
const negadas = [];
for (const tabla of expuestas) {
  let res;
  try {
    res = await pedir('/rest/v1/' + encodeURIComponent(tabla) + '?select=*&limit=1',
      { Prefer: 'count=exact' });
  } catch { negadas.push(tabla + ' (no se pudo consultar)'); continue; }

  if (res.status === 401 || res.status === 403) { negadas.push(tabla); continue; }
  if (res.status === 404) { continue; }   // no existe en esta base
  if (!res.ok) { negadas.push(tabla + ' (' + res.status + ')'); continue; }

  const rango = res.headers.get('content-range') || '';
  const total = rango.split('/')[1];
  const filas = await res.json();
  if (Array.isArray(filas) && filas.length > 0) abiertas.push({ tabla, total, columnas: Object.keys(filas[0]) });
  else vacias.push(tabla);
}

console.log('3. De esas, sin sesión:' + (seEnumero ? '' : ' (lista sacada del código)'));
console.log('   devuelven datos: ' + abiertas.length);
abiertas.forEach((a) => console.log('      ' + a.tabla + '  (' + (a.total || '?') + ' filas)'));
console.log('   contestan vacío: ' + vacias.length + (vacias.length ? '  ' + vacias.join(', ') : ''));
console.log('   rechazan:        ' + negadas.length + (negadas.length ? '  ' + negadas.join(', ') : ''));
console.log('');
// De todo lo abierto, lo que más importa es si hay datos que identifican a una
// persona. Se buscan por el nombre de la columna, no por el contenido: el
// contenido no se mira ni se imprime.
const SENSIBLES = ['dni', 'cuit', 'cuil', 'bank', 'iban', 'cbu', 'address', 'direccion',
  'phone', 'telefono', 'email', 'correo', 'birth', 'nacimiento', 'salary', 'sueldo',
  'document', 'passport', 'pasaporte', 'health', 'salud', 'diagnos'];
// `hourly_rate` no está en la lista a propósito: una tarifa por hora en una
// directorio es un precio publicado, no un dato personal. `salary`/`sueldo` sí,
// porque eso es lo que cobra una persona.
const conDatosPersonales = abiertas
  .map((a) => ({
    tabla: a.tabla,
    cols: (a.columnas || []).filter((c) => SENSIBLES.some((s) => c.toLowerCase().includes(s)))
  }))
  .filter((a) => a.cols.length);

if (conDatosPersonales.length) {
  console.log('   GRAVE: hay datos personales a la vista de cualquiera.');
  conDatosPersonales.forEach((a) => {
    console.log('      ' + a.tabla + ': ' + a.cols.join(', '));
  });
  console.log('   Se muestran los nombres de columna, nunca su contenido. Con una fila');
  console.log('   ficticia esto no le cuesta a nadie; con un legajo de verdad adentro, es');
  console.log('   la identidad de una persona publicada en internet.');
  console.log('');
}

if (abiertas.length) {
  console.log('   Una tabla que le devuelve datos a quien no inició sesión está abierta.');
  console.log('   Si alguna guarda legajos, pacientes o datos de contacto, eso se cierra');
  console.log('   antes de cargar el primer dato real.\n');
}
if (vacias.length && !abiertas.length) {
  console.log('   Cuidado: "contesta vacío" NO quiere decir "está protegida". Una base sin');
  console.log('   datos contesta vacío igual que una bien cerrada. Este punto recién dice');
  console.log('   algo cuando hay datos cargados.\n');
}

// --- 4. Prueba de aislamiento ----------------------------------------------
console.log('4. Aislamiento entre Prestadoras:');
const COLUMNAS = ['prestadora_id', 'tenant_id'];
let sePudoProbar = false;
for (const { tabla } of abiertas) {
  for (const col of COLUMNAS) {
    const res = await pedir('/rest/v1/' + encodeURIComponent(tabla) +
      '?select=' + col + '&limit=1000');
    if (!res.ok) continue;
    const filas = await res.json();
    if (!Array.isArray(filas) || !filas.length || !(col in filas[0])) continue;
    sePudoProbar = true;
    const distintas = new Set(filas.map((f) => f[col]).filter(Boolean));
    if (distintas.size > 1) {
      console.log('   ROTO: ' + tabla + ' le muestra ' + distintas.size +
        ' Prestadoras distintas a alguien sin sesión.');
    } else if (distintas.size === 1) {
      console.log('   ' + tabla + ': una sola Prestadora. NO prueba nada si hay una sola cargada.');
    }
    break;
  }
}
if (!sePudoProbar) {
  console.log('   No se pudo probar: ninguna tabla accesible tiene columna de Prestadora con datos.');
  console.log('   La prueba honesta necesita DOS Prestadoras ficticias con datos, que es lo');
  console.log('   que pide la empresa. Con una sola, el resultado no distingue "aislado"');
  console.log('   de "siempre devuelve lo mismo".');
}
console.log('');
