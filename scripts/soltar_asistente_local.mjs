/* ===================================================
   DESHACER LA ASISTENTE DE PRUEBA DE ESTA MÁQUINA

       node scripts/soltar_asistente_local.mjs             dice qué haría
       node scripts/soltar_asistente_local.mjs --borrar    lo hace

   Deshace la cuenta `asistente.presdemo@ejemplo.com`, la que dejaba un guion
   local que ya no está: la siembra pasó a traer las seis cuentas
   ficticias con su legajo ya atado, y ese guion salió del proyecto el 2 de
   septiembre de 2026: fue el pendiente 147, cerrado. Esto borra lo que se
   escribió mirando la pantalla, le suelta el legajo a la cuenta ficticia y
   después borra la cuenta. En ese orden, porque la cuenta es lo que la clave
   foránea del legajo apunta.

   Queda para las máquinas donde esa cuenta todavía esté. Donde no esté, lo
   dice y no toca nada.

   **No borra el legajo.** El legajo es de la siembra y tiene que seguir ahí.
   Lo único que se agregó fue el enganche, y lo
   único que se saca es el enganche.

   **Sí borra la fichada y el reporte que se escribieron apretando el botón**,
   y ahí está la parte que costó entender. Parecían inofensivos —son datos
   ficticios colgados de un legajo ficticio— y no lo son: la comprobación de
   la siembra pregunta si cada tabla tiene alguna fila, y una fila escrita a
   mano se la contesta que sí. Pero **ninguna migración la repone**, así que
   la primera base armada desde cero vuelve a tener la tabla vacía. La
   comprobación sale verde hoy y roja mañana sin que nadie haya tocado nada,
   y un verde intermitente se lee como «anda» las veces que anda. Eso es
   justo lo que se arregló sembrando fichadas de verdad
   (`supabase/migrations/0002_siembra_ficticia.sql:219`); dejar además
   las escritas a mano volvería a tapar el hueco que
   quede.

   **Cómo distingue una de otra**, sin listas escritas a mano que se
   desactualicen: una fila que alguna migración nombra por su identificador
   es de la siembra y se queda; una que no la nombra ninguna la escribió una
   persona y se va.

   Como todo lo que borra en este proyecto, no toca nada sin `--borrar`, y
   corre sólo contra la base de esta máquina.
=================================================== */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const borrar = process.argv.includes('--borrar');
const CORREO = 'asistente.presdemo@ejemplo.com';

/* Lo que las migraciones nombran, leído entero una sola vez. Es texto: no
   hace falta entender el SQL para saber si un identificador está adentro. */
const carpeta = join(raiz, 'supabase', 'migrations');
const laSiembra = readdirSync(carpeta)
  .filter((n) => n.endsWith('.sql'))
  .map((n) => readFileSync(join(carpeta, n), 'utf8'))
  .join('\n');

let salida;
try {
  salida = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: raiz, encoding: 'utf8', shell: true
  });
} catch {
  console.error('El entorno de esta máquina no está levantado.');
  process.exit(1);
}

const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const servicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];
if (!url || !servicio) {
  console.error('No se pudieron averiguar la dirección ni las claves del entorno de esta máquina.');
  process.exit(1);
}

const anfitrion = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(anfitrion)) {
  console.error('Esto corre sólo contra la base de esta máquina, y la dirección es ' + anfitrion + '.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');

async function comoServicio(camino, opciones = {}) {
  const res = await fetch(base + camino, {
    ...opciones,
    headers: {
      apikey: servicio,
      Authorization: 'Bearer ' + servicio,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
  return { estado: res.status, cuerpo };
}

const buscada = await comoServicio('/auth/v1/admin/users?page=1&per_page=1000');
const usuarios = (buscada.cuerpo && buscada.cuerpo.users) || [];
const cuenta = usuarios.find((u) => u.email === CORREO);

if (!cuenta) {
  console.log('No hay ninguna cuenta ' + CORREO + ' en ' + anfitrion + '. No hay nada que soltar.');
  process.exit(0);
}

const legajos = await comoServicio(
  '/rest/v1/caregivers?select=id,full_name&user_id=eq.' + cuenta.id);
const enganchados = Array.isArray(legajos.cuerpo) ? legajos.cuerpo : [];

/* Lo escrito desde la pantalla, separado de lo sembrado. */
const TABLAS = [['fichadas', 'clock_ins'], ['reportes', 'reportes']];
const aMano = { fichadas: [], reportes: [] };
const sembradas = { fichadas: 0, reportes: 0 };

for (const legajo of enganchados) {
  for (const [clave, tabla] of TABLAS) {
    const filas = await comoServicio(
      '/rest/v1/' + tabla + '?select=id&caregiver_id=eq.' + legajo.id);
    for (const fila of (Array.isArray(filas.cuerpo) ? filas.cuerpo : [])) {
      if (laSiembra.includes(fila.id)) sembradas[clave]++;
      else aMano[clave].push({ tabla, id: fila.id });
    }
  }
}

console.log('Cuenta: ' + CORREO);
for (const legajo of enganchados) console.log('Legajo enganchado: ' + legajo.full_name);
for (const [clave] of TABLAS) {
  console.log('  ' + clave + ': ' + aMano[clave].length + ' escritas a mano (se van), ' +
    sembradas[clave] + ' de la siembra (se quedan)');
}

if (!borrar) {
  console.log('');
  console.log('No se tocó nada. Para hacerlo:');
  console.log('');
  console.log('    node scripts/soltar_asistente_local.mjs --borrar');
  process.exit(0);
}

for (const [clave] of TABLAS) {
  for (const fila of aMano[clave]) {
    const ida = await comoServicio('/rest/v1/' + fila.tabla + '?id=eq.' + fila.id,
      { method: 'DELETE' });
    if (ida.estado >= 400) {
      console.error('No se pudo borrar la fila ' + fila.id + ' de ' + fila.tabla + '.');
      process.exit(1);
    }
  }
}

for (const legajo of enganchados) {
  const suelto = await comoServicio('/rest/v1/caregivers?id=eq.' + legajo.id, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: null })
  });
  const fila = Array.isArray(suelto.cuerpo) ? suelto.cuerpo[0] : null;
  if (!fila || fila.user_id !== null) {
    console.error('No se pudo soltar el legajo «' + legajo.full_name + '». No se borra la cuenta.');
    process.exit(1);
  }
}

const ida = await comoServicio('/auth/v1/admin/users/' + cuenta.id, { method: 'DELETE' });
if (ida.estado >= 400) {
  console.error('El legajo quedó suelto, pero la cuenta no se pudo borrar.');
  process.exit(1);
}

/* Y se vuelve a preguntar, en vez de creerle al código de respuesta. */
const despues = await comoServicio('/auth/v1/admin/users?page=1&per_page=1000');
const quedan = ((despues.cuerpo && despues.cuerpo.users) || [])
  .filter((u) => u.email === CORREO).length;

console.log('');
console.log(quedan === 0
  ? 'Listo: lo escrito a mano se borró, el legajo quedó suelto y la cuenta ya no está.'
  : 'ATENCIÓN: la cuenta sigue estando.');
process.exit(quedan === 0 ? 0 : 1);
