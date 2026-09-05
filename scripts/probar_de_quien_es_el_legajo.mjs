/* ===================================================
   DE QUIÉN ES UN LEGAJO, Y QUIÉN PUEDE CAMBIARLO

       node scripts/probar_de_quien_es_el_legajo.mjs

   Contra la base local, que es donde conviene correrla porque el alta no
   pide confirmar el correo y las cuentas ficticias se crean solas. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. `caregivers.user_id` dice de quién es el legajo: es lo que hace
   que una persona vea el suyo y ninguno más, y es también el nombre de la
   carpeta del depósito donde quedan sus papeles. La política del personal de
   la Prestadora es `for all` y su `with check` exige dos cosas —que la
   Prestadora sea la suya y que quien pide sea personal— y **no nombra esa
   columna**. Así que hasta el 31 de agosto de 2026 un coordinador podía
   ponerse a su nombre el legajo de otra persona: sus matrículas, sus estudios,
   sus papeles.

   Era el pendiente 74, de la misma familia que el 66, y lo cerró la migración
   0047 con un disparador: una política decide por fila, y acá lo que importa es
   qué columna se toca. **ESTA PRUEBA FALLABA A PROPÓSITO Y HOY PASA. Si vuelve
   a dar rojo, el dueño de un legajo volvió a poder cambiarse.**

   POR QUÉ PUEDE FALLAR. Los tres rechazos podrían dar «bien» por un motivo
   tonto —que la coordinadora no tenga sesión, que la tabla esté cerrada para
   todos, que el legajo no exista—, y entonces no probarían nada. Por eso hay
   dos comprobaciones de sostén: que la coordinadora sí pueda corregir un
   legajo de su Prestadora, y que no alcance el de la Prestadora ajena. Si
   esas dos no salen como se espera, la prueba avisa que no sirve, y no que
   el producto esté sano.

   HACE FALTA EL ENTORNO LOCAL. Ascender a alguien a coordinador es justo lo
   que la base no deja hacer desde una sesión común, y sin coordinadora no
   hay nada que probar acá. La clave de administración sale de
   `supabase status`, nunca se imprime, y contra el servidor remoto esta
   prueba no corre.

   No deja nada atrás: borra los cinco legajos ficticios al terminar y
   comprueba que se fueron.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base local ni su clave publicable.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}
if (!claveServicio) {
  console.error('Esta prueba necesita la clave de administración del entorno local: sin ella');
  console.error('no hay forma de tener una coordinadora, y sin coordinadora no hay nada que');
  console.error('probar acá. Contra el servidor remoto esta prueba no corre.');
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

const sello = Date.now();

// --- Las personas ficticias -------------------------------------------------
// Cada comprobación estrena su propio legajo, y no es una manía: la primera
// corrida usó uno solo para las tres y la segunda midió sobre un legajo que la
// primera ya había cambiado de dueño. Un rojo arrastrado se lee igual que un
// rojo propio.
//
// Y los destinos de los traspasos son cuentas **sin** legajo, por el mismo
// motivo: `user_id` tiene índice único —`idx_caregivers_user_unico`—, así que
// apuntar a alguien que ya tiene el suyo devuelve un conflicto y ese conflicto
// taparía el resultado. Rechazado por chocar contra un índice no es lo mismo
// que rechazado por no tener derecho.
async function cuenta(etiqueta, deQuien) {
  const email = 'prueba.legajo.' + etiqueta + '.' + sello + '@ejemplo.invalid';
  const password = 'Ficticia-' + sello + '-' + etiqueta;
  const nombre = 'Persona Ficticia ' + etiqueta + ' ' + sello;

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      data: { full_name: nombre, tenant_slug: deQuien.slug, role: 'caregiver' }
    })
  }).then((r) => r.json());

  let token = alta.access_token;
  const userId = alta.user ? alta.user.id : alta.id;
  // Desde que se recreó el contenedor de cuentas del entorno local (fue el
  // pendiente 123, cerrado), el alta local ya no confirma sola: hay que
  // confirmarla a propósito, con la llave de servicio, y recién ahí pedir la sesión.
  if (!token && userId) {
    await fetch(base + '/auth/v1/admin/users/' + userId, {
      method: 'PUT',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email_confirm: true })
    });
    const sesion = await fetch(base + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then((r) => r.json());
    token = sesion.access_token;
  }
  return token ? { etiqueta, nombre, token, userId, prestadora: deQuien } : null;
}

async function conLegajo(etiqueta, deQuien) {
  const quien = await cuenta(etiqueta, deQuien);
  if (!quien) return null;
  const { cuerpo } = await rest('/rest/v1/caregivers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: quien.nombre, user_id: quien.userId, tenant_id: deQuien.id,
      profession: 'cuidador_domiciliario',
      documents: { dni: 'frente-inventado-v1' }
    })
  }, quien.token);
  const legajo = Array.isArray(cuerpo) ? cuerpo[0] : null;
  return legajo ? { ...quien, legajo } : null;
}

const A = await conLegajo('A', P);        // comprobación 1
const B = await conLegajo('B', P);        // comprobación 2
const D = await conLegajo('D', P);        // comprobación 3
const E = await conLegajo('E', P);        // sostén 4
const C = await conLegajo('C', AJENA);    // sostén 5
const X = await cuenta('X', P);           // destino sin legajo de la 2
const Y = await cuenta('Y', P);           // destino sin legajo de la 3

const gente = [A, B, D, E, C];
if (gente.some((q) => !q) || !X || !Y) {
  console.error('No se pudieron crear las personas ficticias con su legajo.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  process.exit(1);
}

// --- Y una coordinadora de la misma Prestadora que A y B --------------------
// El ascenso es lo único que usa la clave de administración. El rol viaja
// adentro del token, así que después de ascender hay que pedir uno nuevo: el
// de antes sigue diciendo lo que decía.
const correoCoord = 'prueba.legajo.coord.' + sello + '@ejemplo.invalid';
const claveCoord = 'Ficticia-' + sello + '-coord';

const altaCoord = await fetch(base + '/auth/v1/signup', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: correoCoord, password: claveCoord,
    data: { full_name: 'Coordinadora Ficticia ' + sello, tenant_slug: P.slug }
  })
}).then((r) => r.json());

const coordId = altaCoord.user ? altaCoord.user.id : altaCoord.id;

// El re-inicio de sesión de abajo pide usuario y contraseña, y eso exige la
// cuenta confirmada desde que se recreó el contenedor de cuentas del entorno
// local (fue el pendiente 123, cerrado): el alta local ya no la confirma sola.
await fetch(base + '/auth/v1/admin/users/' + coordId, {
  method: 'PUT',
  headers: {
    apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email_confirm: true })
});

const ascenso = await fetch(base + '/rest/v1/profiles?id=eq.' + coordId, {
  method: 'PATCH',
  headers: {
    apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ role: 'coordinador' })
});

const nuevaSesion = await fetch(base + '/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: correoCoord, password: claveCoord })
}).then((r) => r.json());

const coord = ascenso.status < 300 && nuevaSesion.access_token
  ? { userId: coordId, token: nuevaSesion.access_token }
  : null;

if (!coord) {
  console.error('No se pudo preparar la coordinadora ficticia, así que no hay con qué probar.');
  process.exit(1);
}

// Se relee siempre con la sesión de la coordinadora, que es la única que ve
// todos los legajos de su Prestadora. Una respuesta que toca cero filas y una
// rechazada no se parecen en nada; lo que importa es cómo quedó la fila.
async function comoQuedo(legajoId) {
  const { cuerpo } = await rest(
    '/rest/v1/caregivers?id=eq.' + legajoId + '&select=user_id,phone', {}, coord.token);
  return Array.isArray(cuerpo) && cuerpo[0] ? cuerpo[0] : null;
}

// --- 1. El personal no puede ponerse a su nombre un legajo ajeno ------------
console.log('De quién es un legajo');

const r1 = await rest('/rest/v1/caregivers?id=eq.' + A.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ user_id: coord.userId })
}, coord.token);
const tras1 = await comoQuedo(A.legajo.id);

comprobar('el personal de la Prestadora no puede ponerse a su nombre un legajo ajeno',
  !!tras1 && tras1.user_id === A.userId,
  'respuesta ' + r1.estado +
  (tras1 && tras1.user_id !== A.userId ? ', quedó a nombre de la coordinadora' : ''));

// --- 2. Ni pasárselo a un tercero de la misma Prestadora --------------------
const r2 = await rest('/rest/v1/caregivers?id=eq.' + B.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ user_id: X.userId })
}, coord.token);
const tras2 = await comoQuedo(B.legajo.id);

comprobar('ni pasárselo a un tercero de la misma Prestadora',
  !!tras2 && tras2.user_id === B.userId,
  'respuesta ' + r2.estado +
  (tras2 && tras2.user_id !== B.userId ? ', quedó a nombre de otra cuenta' : ''));

// --- 3. Y la persona tampoco puede regalar el suyo -------------------------
const r3 = await rest('/rest/v1/caregivers?id=eq.' + D.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ user_id: Y.userId })
}, D.token);
const tras3 = await comoQuedo(D.legajo.id);

comprobar('y la persona tampoco puede regalar el suyo',
  !!tras3 && tras3.user_id === D.userId,
  'respuesta ' + r3.estado +
  (tras3 && tras3.user_id !== D.userId ? ', quedó a nombre de otra cuenta' : ''));

// --- 4 y 5. Que esta prueba esté en condiciones de medir algo --------------
console.log('');
console.log('Y que la prueba pueda fallar');

const r4 = await rest('/rest/v1/caregivers?id=eq.' + E.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ phone: '+54 9 11 5555-0074' })
}, coord.token);
const tras4 = await comoQuedo(E.legajo.id);

sostener('la coordinadora sí puede corregir un legajo de su Prestadora',
  !!tras4 && tras4.phone === '+54 9 11 5555-0074',
  'respuesta ' + r4.estado);

const r5 = await rest('/rest/v1/caregivers?id=eq.' + C.legajo.id, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ phone: '+54 9 11 5555-0075' })
}, coord.token);
const tocadas = Array.isArray(r5.cuerpo) ? r5.cuerpo.length : 0;

sostener('y no alcanza el legajo de la Prestadora ajena',
  r5.estado >= 400 || tocadas === 0,
  'respuesta ' + r5.estado + ', ' + tocadas + ' filas tocadas');

// --- Limpieza ---------------------------------------------------------------
// Con la clave de administración y no con la sesión de cada persona. Cuando el
// pendiente 74 estaba abierto, un legajo que cambiaba de dueño dejaba de verlo
// quien lo creó, así que su `DELETE` tocaba cero filas y lo dejaba cargado.
// Pasó en la primera corrida. Se cerró el 31 de agosto de 2026, y la limpieza
// sigue igual: la clave de administración no depende de quién sea el dueño.
for (const quien of gente) {
  await rest('/rest/v1/caregivers?id=eq.' + quien.legajo.id,
    { method: 'DELETE' }, claveServicio);
}

let sobran = 0;
for (const quien of gente) {
  const { cuerpo } = await rest(
    '/rest/v1/caregivers?id=eq.' + quien.legajo.id + '&select=id', {}, claveServicio);
  sobran += Array.isArray(cuerpo) ? cuerpo.length : 1;
}

// Y las cuentas, que en esta prueba sí se pueden borrar porque la clave de
// administración hace falta igual para la coordinadora. Una cuenta ficticia
// ascendida a coordinador es basura con permisos: no se deja.
for (const quien of [...gente, X, Y, { userId: coord.userId }]) {
  await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
}

console.log('');
console.log(sobran === 0
  ? 'Limpieza: los cinco legajos ficticios y las ocho cuentas se borraron.'
  : 'ATENCIÓN: quedaron ' + sobran + ' legajos ficticios. Hay que borrarlos a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna de las dos');
  console.log('comprobaciones de sostén salió al revés de lo esperado. Antes de');
  console.log('leer el resultado de arriba hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('El dueño de un legajo no se cambia después del alta.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Esta prueba pasa desde el 31 de agosto de 2026, cuando la migración 0047 cerró');
console.log('el pendiente 74. Si da rojo, un coordinador volvió a quedarse con el legajo');
console.log('entero de otra persona: sus matrículas, sus estudios, sus papeles.');
process.exit(1);
