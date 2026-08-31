/* ===================================================
   QUIÉN PUEDE PONER EL SELLO DE LA PRESTADORA

       node scripts/probar_sello_de_la_prestadora.mjs

   Contra la base local, que es donde conviene correrla porque el alta no
   pide confirmar el correo y la cuenta ficticia se crea sola. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. `caregivers.verification_status` es el dictamen de la
   Prestadora sobre los papeles de una persona: dice que alguien miró el
   documento, los antecedentes y el título. `directorio` publica
   exactamente a quien lo tenga en `validado_prestadora` y además haya dado
   su consentimiento, y ese directorio se ve sin iniciar sesión. Así que esa
   columna es la única cosa que separa a un desconocido del sello.

   ESTA PRUEBA FALLABA A PROPÓSITO, Y HOY PASA. Era el pendiente 66: la
   política que le deja al Asistente ser dueño de su propio legajo no nombraba
   esa columna, así que se la escribía él. Se escribió antes que el arreglo,
   a propósito, para que el día que el arreglo existiera se supiera que
   funcionó por algo más que por mirarlo. Ese día fue el 31 de agosto de 2026,
   con la migración 0047. **Si vuelve a dar rojo, algo se rompió.**

   POR QUÉ PUEDE FALLAR. Las tres comprobaciones del sello podrían dar
   «bien» por un motivo tonto —que la cuenta no tenga sesión, que la
   Prestadora ficticia no exista, que la tabla esté cerrada para todos—, y
   entonces no probarían nada. Por eso hay dos comprobaciones más: que la
   persona sí pueda escribir lo suyo (su teléfono) y que no pueda mudar su
   legajo a la Prestadora ajena. Si esas dos no salen como se espera, la
   prueba avisa que no sirve y no que el producto esté sano.

   No deja nada atrás: borra la cuenta ficticia y su legajo al terminar, y
   comprueba que el directorio dejó de mostrarla.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Las direcciones y claves del entorno local. Son las mismas para todo el
// mundo y no son secretas, pero igual se leen de ahí y no se escriben acá.
const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url   = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
// Y la de administración, que hace falta sólo para borrar la cuenta ficticia al
// terminar. Sin ella la prueba mide igual, así que no se planta: avisa.
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base local ni su clave publicable.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');
console.log('Servidor: ' + new URL(url).hostname);
console.log('');

let fallos = 0;
let inservible = false;

function comprobar(titulo, condicion, detalle) {
  console.log((condicion ? '   bien  ' : '   MAL   ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) fallos++;
}

// Las dos de abajo no miden el producto: miden si esta prueba está en
// condiciones de medir algo. Se cuentan aparte a propósito.
function sostener(titulo, condicion, detalle) {
  console.log((condicion ? '   ok    ' : '   ROTA  ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) inservible = true;
}

async function rest(camino, opciones = {}, token = clave) {
  const res = await fetch(base + camino, {
    ...opciones,
    headers: {
      apikey: clave,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
  return { estado: res.status, cuerpo };
}

async function prestadora(slug) {
  const { cuerpo } = await rest('/rest/v1/rpc/prestadora_por_slug', {
    method: 'POST', body: JSON.stringify({ p_slug: slug })
  });
  return Array.isArray(cuerpo) && cuerpo.length === 1 ? cuerpo[0] : null;
}

// --- Las dos Prestadoras ficticias de la migración 0003 ---------------------
const P = await prestadora('presdemo');
const AJENA = await prestadora('cuidarnorte');
if (!P || !AJENA) {
  console.error('Hacen falta las dos Prestadoras ficticias de la migración 0003.');
  console.error('Con las migraciones aplicadas están; si no, la base está atrasada.');
  process.exit(1);
}

// --- Una cuenta de Asistente recién nacida ---------------------------------
const sello = Date.now();
const email = `prueba.sello.${sello}@ejemplo.invalid`;
const password = `Ficticia-${sello}-sello`;
const nombre = `Persona Ficticia Sello ${sello}`;

const alta = await fetch(base + '/auth/v1/signup', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email, password,
    data: { full_name: nombre, tenant_slug: P.slug, role: 'caregiver' }
  })
}).then((r) => r.json());

const token = alta.access_token;
const userId = alta.user?.id || alta.id;
if (!token) {
  console.error('La cuenta ficticia se creó pero no devolvió sesión.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  process.exit(1);
}

// --- 1. El alta no tendría que poder nacer sellada -------------------------
console.log('El sello de la Prestadora');

const r1 = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: nombre,
    user_id: userId,
    tenant_id: P.id,
    profession: 'cuidador_domiciliario',
    verification_status: 'validado_prestadora'
  })
}, token);

let legajo = Array.isArray(r1.cuerpo) ? r1.cuerpo[0] : null;

// Si el arreglo rechaza el alta entera en vez de ignorar la columna, hace
// falta un legajo igual para seguir probando. Se crea sin la columna.
if (!legajo) {
  const limpio = await rest('/rest/v1/caregivers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: nombre, user_id: userId, tenant_id: P.id,
      profession: 'cuidador_domiciliario'
    })
  }, token);
  legajo = Array.isArray(limpio.cuerpo) ? limpio.cuerpo[0] : null;
}

if (!legajo) {
  console.error('No se pudo crear el legajo ficticio: respuesta ' + r1.estado);
  console.error('Sin legajo no hay nada que probar.');
  process.exit(1);
}

comprobar('el legajo no nace sellado por más que el alta lo pida',
  legajo.verification_status !== 'validado_prestadora',
  'respuesta ' + r1.estado + ', quedó en ' + legajo.verification_status);

// --- 2. Ni ponerse el sello después ----------------------------------------
await rest('/rest/v1/caregivers?id=eq.' + legajo.id, {
  method: 'PATCH', body: JSON.stringify({ verification_status: 'pendiente' })
}, token);

const r2 = await rest('/rest/v1/caregivers?id=eq.' + legajo.id, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ verification_status: 'validado_prestadora' })
}, token);
const tras = Array.isArray(r2.cuerpo) ? r2.cuerpo[0] : null;

comprobar('no puede ponerse el sello sobre su propio legajo',
  !tras || tras.verification_status !== 'validado_prestadora',
  'respuesta ' + r2.estado + (tras ? ', quedó en ' + tras.verification_status : ''));

// --- 3. Y por lo tanto no sale publicado como validado ---------------------
// El consentimiento sí es suyo y está bien que lo ponga él: es la otra mitad
// de la condición del directorio, y sin ella la comprobación no distingue
// «no salió porque no tiene el sello» de «no salió porque no dio permiso».
await rest('/rest/v1/autorizaciones_asistente', {
  method: 'POST',
  body: JSON.stringify({ caregiver_id: legajo.id, tenant_id: P.id, perfil_publicado: true })
}, token);

const { cuerpo: dir } = await rest('/rest/v1/rpc/directorio_de', {
  method: 'POST', body: JSON.stringify({ p_slug: P.slug })
});   // sin token: es el directorio que se ve sin iniciar sesión
const aparece = Array.isArray(dir) && dir.some((x) => x.full_name === nombre);

comprobar('no aparece en el directorio público como legajo validado',
  !aparece,
  Array.isArray(dir) ? dir.length + ' legajos en el directorio' : JSON.stringify(dir));

// --- 4 y 5. Que esta prueba esté en condiciones de medir algo --------------
console.log('');
console.log('Y que la prueba pueda fallar');

const r4 = await rest('/rest/v1/caregivers?id=eq.' + legajo.id, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ phone: '+54 9 11 5555-0000' })
}, token);
const conTelefono = Array.isArray(r4.cuerpo) ? r4.cuerpo[0] : null;

sostener('la persona sí puede corregir lo suyo (el teléfono)',
  !!conTelefono && conTelefono.phone === '+54 9 11 5555-0000',
  'respuesta ' + r4.estado);

const r5 = await rest('/rest/v1/caregivers?id=eq.' + legajo.id, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ tenant_id: AJENA.id })
}, token);
const mudado = Array.isArray(r5.cuerpo) ? r5.cuerpo[0] : null;

sostener('y no puede mudar su legajo a la Prestadora ajena',
  !mudado || mudado.tenant_id !== AJENA.id,
  'respuesta ' + r5.estado);

// --- Limpieza ---------------------------------------------------------------
await rest('/rest/v1/autorizaciones_asistente?caregiver_id=eq.' + legajo.id,
  { method: 'DELETE' }, token);
await rest('/rest/v1/caregivers?id=eq.' + legajo.id, { method: 'DELETE' }, token);

const { cuerpo: despues } = await rest('/rest/v1/rpc/directorio_de', {
  method: 'POST', body: JSON.stringify({ p_slug: P.slug })
});
const quedo = Array.isArray(despues) ? despues.some((x) => x.full_name === nombre) : true;

/* Y la cuenta, que hasta el 31 de agosto de 2026 se quedaba. El legajo sí se
   borraba, así que del directorio no sobraba nada y la fuga no se veía desde
   acá: se veía contando `auth.users`, donde habían quedado diecinueve cuentas
   `prueba.sello.*`, una por cada vez que se corrió esto. Una cuenta ficticia
   sin dueño es basura con permisos, igual que en las pruebas hermanas. */
let cuentaBorrada = false;
if (claveServicio) {
  const r = await fetch(base + '/auth/v1/admin/users/' + userId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
  cuentaBorrada = r.ok;
}

console.log('');
console.log(quedo
  ? 'ATENCIÓN: el legajo ficticio quedó en el directorio. Hay que borrarlo a mano.'
  : 'Limpieza: el legajo ficticio ya no está en el directorio.');
console.log(cuentaBorrada
  ? 'Limpieza: la cuenta ficticia tampoco quedó.'
  : 'ATENCIÓN: la cuenta ficticia quedó en la base. Hay que borrarla a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna de las dos');
  console.log('comprobaciones de sostén salió al revés de lo esperado. Antes de');
  console.log('leer el resultado de arriba hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('El sello lo pone la Prestadora y nadie más.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Esta prueba pasa desde el 31 de agosto de 2026, cuando la migración 0047 cerró');
console.log('el pendiente 66. Si da rojo, un Asistente volvió a poder ponerse solo el sello');
console.log('que dice que la Prestadora lo revisó, y con eso entra al directorio público.');
process.exit(1);
