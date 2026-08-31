/* ===================================================
   LAS CUENTAS FICTICIAS QUE DEJARON LAS PRUEBAS

       node scripts/limpiar_cuentas_de_prueba.mjs             lista y no toca nada
       node scripts/limpiar_cuentas_de_prueba.mjs --borrar    borra

   Cada prueba que registra cuentas ficticias se las lleva al terminar, y desde
   el 31 de agosto de 2026 `probar_todo.mjs` cuenta `auth.users` antes y después
   del lote entero para que ninguna se olvide. Pero lo que ya quedó de antes no
   se va solo, y quedó bastante. Este guion las junta y, si se lo pide, las
   borra. **La cuenta no se escribe acá**: la dice el guion al correr, porque un
   número escrito en un comentario queda viejo el día que una prueba deja una más.

   ── Qué toca y qué no ─────────────────────────────────────────────────────

   Sólo entra una cuenta que cumpla las tres cosas a la vez:

   1. El correo empieza con `prueba.` y termina en `@ejemplo.invalid`. Ese
      dominio no existe por norma —RFC 2606—, así que no hay forma de que sea
      de una persona.
   2. No tiene ningún legajo colgando en `caregivers`. Las cuentas de las
      Prestadoras ficticias sí lo tienen, y por eso no entran.
   3. No es ninguna de las coordinadoras que prepara
      `preparar_coordinadores_locales.mjs`, que hacen falta para correr las
      pruebas y tienen otro correo.

   Las tres juntas, no cualquiera. Con la primera sola alcanzaría casi siempre,
   y «casi siempre» es justo lo que no se quiere de algo que borra.

   ── Contra qué base corre ─────────────────────────────────────────────────

   **Sólo contra la de esta máquina.** Las direcciones y la clave salen de
   `supabase status`, que sólo contesta del entorno local. El residuo del
   servidor publicado es otra cosa y está en el pendiente 45: ahí no se llega
   desde acá porque la clave de servicio vive en la caja fuerte, y se abre en
   Authentication → Users.
=================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const borrar = process.argv.includes('--borrar');

let salida;
try {
  salida = execFileSync('supabase', ['status', '-o', 'env'],
    { cwd: raiz, encoding: 'utf8', shell: true });
} catch {
  console.error('No se pudo hablar con el entorno local. Probablemente no esté levantado.');
  process.exit(1);
}

const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];
const claveAnonima = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !claveServicio || !claveAnonima) {
  console.error('No se pudo averiguar la dirección de la base local ni sus claves.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');
const cabeceras = { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio };
console.log('Servidor: ' + new URL(url).hostname);
console.log('');

/* Todas las cuentas. Se pide de a mil porque la base de desarrollo nunca va a
   tener más, y si algún día las tuviera este número quedaría corto en silencio
   —así que se avisa cuando la página vuelve llena—. */
const res = await fetch(base + '/auth/v1/admin/users?page=1&per_page=1000', { headers: cabeceras });
if (!res.ok) {
  console.error('El servidor no contestó la lista de cuentas: ' + res.status);
  process.exit(1);
}
const { users } = await res.json();
if (users.length >= 1000) {
  console.error('Vinieron mil cuentas o más, así que puede haber otra página sin mirar.');
  console.error('Antes de borrar nada hay que paginar esto.');
  process.exit(1);
}

/* Los legajos, para saber cuáles de esas cuentas tienen algo detrás. Se piden
   con la clave de servicio a propósito: con la anónima la RLS contestaría sólo
   una parte, y una cuenta con legajo escondido detrás de una política pasaría
   por vacía. Que es exactamente el error que convierte esto en un desastre. */
const resLegajos = await fetch(base + '/rest/v1/caregivers?select=user_id', { headers: cabeceras });
if (!resLegajos.ok) {
  console.error('El servidor no contestó los legajos: ' + resLegajos.status);
  console.error('Sin eso no se puede saber cuál cuenta tiene algo detrás, así que no se borra nada.');
  process.exit(1);
}
const conLegajo = new Set((await resLegajos.json()).map((f) => f.user_id));

const ficticia = (u) =>
  typeof u.email === 'string' &&
  u.email.startsWith('prueba.') &&
  u.email.endsWith('@ejemplo.invalid') &&
  !conLegajo.has(u.id);

const sobran = users.filter(ficticia);
const familias = new Map();
for (const u of sobran) {
  const familia = u.email.split('.').slice(0, 2).join('.');
  familias.set(familia, (familias.get(familia) || 0) + 1);
}

console.log('Cuentas en la base: ' + users.length);
console.log('De prueba y sin legajo detrás: ' + sobran.length);
if (sobran.length > 0) {
  console.log('');
  for (const [familia, cuantas] of [...familias].sort((a, b) => b[1] - a[1])) {
    console.log('   ' + String(cuantas).padStart(4) + '  ' + familia + '.*');
  }
}

if (sobran.length === 0) {
  console.log('');
  console.log('No hay nada que barrer.');
  process.exit(0);
}

if (!borrar) {
  console.log('');
  console.log('No se borró nada. Para borrarlas:');
  console.log('');
  console.log('    node scripts/limpiar_cuentas_de_prueba.mjs --borrar');
  process.exit(0);
}

console.log('');
let borradas = 0;
let fallidas = 0;
for (const u of sobran) {
  const r = await fetch(base + '/auth/v1/admin/users/' + u.id, {
    method: 'DELETE', headers: cabeceras
  });
  if (r.ok) borradas++; else fallidas++;
}

/* Y se vuelve a contar, en vez de creerle a la suma de los que dijeron que sí.
   Es la misma regla de siempre: lo que vale es el estado, no la intención. */
const despues = await fetch(base + '/auth/v1/admin/users?page=1&per_page=1000', { headers: cabeceras });
const quedan = despues.ok ? (await despues.json()).users.filter(ficticia).length : null;

console.log('Borradas: ' + borradas + (fallidas ? ', fallaron ' + fallidas : ''));
if (quedan === null) {
  console.log('No se pudo volver a contar, así que esto no comprobó nada.');
  process.exit(1);
}
console.log('Quedan de prueba y sin legajo: ' + quedan);
process.exit(quedan === 0 ? 0 : 1);
