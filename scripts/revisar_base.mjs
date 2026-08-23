/* ===================================================
   QUÉ VE UN VISITANTE ANÓNIMO

   Se corre en el momento en que la base vuelve a responder, ANTES de cargar el
   primer dato de verdad:

       node scripts/revisar_base.mjs

   Qué contesta, en este orden:

     1. ¿La base responde?
     2. ¿Qué tablas y vistas puede enumerar alguien sin sesión? Eso lo publica
        PostgREST solo, y es la lista de lo que hay para atacar.
     3. De esas, ¿cuáles devuelven filas sin sesión? Una tabla que contesta con
        datos a quien no inició sesión está abierta, tenga o no políticas.
     4. De las que devuelven filas, ¿aparecen dos Prestadoras distintas? Eso es
        la prueba de aislamiento del CLAUDE.md §2. **Y es la única de las cuatro
        que puede dar un falso "todo bien"**: si hay una sola Prestadora cargada,
        ver una sola no prueba nada. El guion lo avisa cuando pasa.

   No escribe nada. No borra nada. Solo lee.

   No muestra ninguna clave: usa la publicable, que es la que ya está en el
   código porque está pensada para viajar al navegador, y de la dirección
   imprime solo el nombre del servidor.

   Se niega a correr contra cualquier base que no sea la de este proyecto: la de
   Careonys está en producción y no se toca desde acá (CLAUDE.md §1).
=================================================== */

import { readFileSync } from 'node:fs';
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
if (!raiz_res.ok) {
  console.error('La base responde pero rechaza la clave publicable (' + raiz_res.status + ').');
  process.exit(1);
}
console.log('1. La base responde.\n');

// --- 2. Qué puede enumerar un anónimo --------------------------------------
const spec = await raiz_res.json();
const expuestas = Object.keys(spec.definitions || spec.components?.schemas || {}).sort();
console.log('2. Tablas y vistas que un anónimo puede enumerar: ' + expuestas.length);
if (expuestas.length === 0) {
  console.log('   Ninguna. Es el mejor resultado posible de este punto.\n');
} else {
  console.log('   ' + expuestas.join(', ') + '\n');
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
  if (!res.ok) { negadas.push(tabla + ' (' + res.status + ')'); continue; }

  const rango = res.headers.get('content-range') || '';
  const total = rango.split('/')[1];
  const filas = await res.json();
  if (Array.isArray(filas) && filas.length > 0) abiertas.push({ tabla, total });
  else vacias.push(tabla);
}

console.log('3. De esas, sin sesión:');
console.log('   devuelven datos: ' + abiertas.length);
abiertas.forEach((a) => console.log('      ' + a.tabla + '  (' + (a.total || '?') + ' filas)'));
console.log('   contestan vacío: ' + vacias.length + (vacias.length ? '  ' + vacias.join(', ') : ''));
console.log('   rechazan:        ' + negadas.length + (negadas.length ? '  ' + negadas.join(', ') : ''));
console.log('');
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
  console.log('   que pide el CLAUDE.md §2. Con una sola, el resultado no distingue "aislado"');
  console.log('   de "siempre devuelve lo mismo".');
}
console.log('');
