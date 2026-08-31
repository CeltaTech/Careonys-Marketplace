/* ===================================================
   UN PAPEL NUEVO BAJA EL SELLO

       node scripts/probar_el_papel_nuevo_baja_el_sello.mjs

   Contra la base local, que es donde conviene correrla porque el alta no
   pide confirmar el correo y las cuentas ficticias se crean solas. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. El pendiente 75, y la opción A que eligió el Desarrollador: **el
   sello siempre habla de los papeles que están hoy.** Sin esto, una persona
   con el legajo ya sellado cambia `documents` y el sello queda diciendo que
   la Prestadora revisó unos papeles que ya no están. La Familia no tiene cómo
   notarlo: ve «validado» y nada más.

   Las otras dos opciones que había sobre la mesa —prohibir el cambio con el
   sello puesto, o permitirlo y anotarlo para que la Prestadora lo revise
   después— están escritas con sus contras en
   `docs/PLAN_SEGURIDAD_DE_COLUMNAS.md`, punto 5. La elegida es la A.

   Y EL PERSONAL ES LA EXCEPCIÓN, A PROPÓSITO. Cuando el papel lo cambia
   quien firma el sello, el sello no se mueve: está viendo lo que sube en el
   mismo acto. Bajárselo a sí misma obligaría a la Prestadora a sellar dos
   veces cada corrección, que es burocracia inventada por el sistema.

   POR QUÉ PUEDE FALLAR. Un «bien» acá podría venir de que el sello no se
   pueda poner nunca, o de que los papeles no se puedan cambiar nunca. Por eso
   las dos comprobaciones de sostén: que la coordinadora sí pueda sellar, y
   que cambiar un papel de un legajo **sin** sellar salga bien y no mueva
   nada. Si alguna sale al revés, la prueba avisa que no sirve, no que el
   producto esté sano.

   Lo que acá no se mide: que el legajo sellado aparezca en el directorio
   público y el que no, no. Eso ya lo mide
   `scripts/probar_sello_de_la_prestadora.mjs`, que es la del pendiente 66.

   No deja nada atrás: los tres legajos ficticios y las cuatro cuentas se
   borran al final.
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
  console.error('no hay forma de tener una coordinadora, y sin coordinadora no hay sello que');
  console.error('bajar. Contra el servidor remoto esta prueba no corre.');
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

// Las de abajo no miden el producto: miden si esta prueba está en condiciones
// de medir algo. Se cuentan aparte a propósito.
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

// --- La Prestadora ficticia de la migración 0003 ---------------------------
const P = await prestadora('presdemo');
if (!P) {
  console.error('Hace falta la Prestadora ficticia `presdemo` de la migración 0003.');
  console.error('Con las migraciones aplicadas está; si no, la base está atrasada.');
  process.exit(1);
}

const sello = Date.now();

// --- Tres personas ficticias, cada una con su legajo -----------------------
// Una por comprobación, y no por manía: la del 74 empezó midiendo las tres
// sobre un mismo legajo y la segunda leyó lo que había dejado la primera. Un
// rojo arrastrado se lee igual que un rojo propio.
async function cuenta(etiqueta) {
  const email = 'prueba.papeles.' + etiqueta + '.' + sello + '@ejemplo.invalid';
  const password = 'Ficticia-' + sello + '-' + etiqueta;
  const nombre = 'Persona Ficticia Papeles ' + etiqueta + ' ' + sello;

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      data: { full_name: nombre, tenant_slug: P.slug, role: 'caregiver' }
    })
  }).then((r) => r.json());

  const token = alta.access_token;
  const userId = alta.user ? alta.user.id : alta.id;
  return token ? { etiqueta, nombre, token, userId } : null;
}

async function conLegajo(etiqueta) {
  const quien = await cuenta(etiqueta);
  if (!quien) return null;
  const { cuerpo } = await rest('/rest/v1/caregivers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: quien.nombre, user_id: quien.userId, tenant_id: P.id,
      profession: 'cuidador_domiciliario',
      documents: { dni: 'frente-inventado-v1' }
    })
  }, quien.token);
  const legajo = Array.isArray(cuerpo) ? cuerpo[0] : null;
  return legajo ? { ...quien, legajo } : null;
}

const A = await conLegajo('A');   // sellado, cambia sus papeles ella misma
const B = await conLegajo('B');   // sellado, le cambia los papeles la coordinadora
const C = await conLegajo('C');   // sin sellar, cambia sus papeles: sostén

const gente = [A, B, C];
if (gente.some((q) => !q)) {
  console.error('No se pudieron crear las personas ficticias con su legajo.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  process.exit(1);
}

// --- Y una coordinadora de la misma Prestadora -----------------------------
// El ascenso es lo único que usa la clave de administración. El rol viaja
// adentro del token, así que después de ascender hay que pedir uno nuevo: el
// de antes sigue diciendo lo que decía.
const correoCoord = 'prueba.papeles.coord.' + sello + '@ejemplo.invalid';
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
  console.error('No se pudo dejar lista la coordinadora ficticia, así que no hay quién selle.');
  process.exit(1);
}

// El legajo se lee con la sesión de su dueña, que es quien lo ve siempre. Lo
// que importa no es qué contestó el pedido sino cómo quedó la fila.
async function comoQuedo(quien) {
  const { cuerpo } = await rest(
    '/rest/v1/caregivers?id=eq.' + quien.legajo.id + '&select=verification_status,documents',
    {}, quien.token);
  return Array.isArray(cuerpo) && cuerpo[0] ? cuerpo[0] : null;
}

async function sellar(quien) {
  return await rest('/rest/v1/caregivers?id=eq.' + quien.legajo.id, {
    method: 'PATCH', body: JSON.stringify({ verification_status: 'validado_prestadora' })
  }, coord.token);
}

// --- Sostén, y va primero porque las dos comprobaciones cuelgan de él ------
// Si la coordinadora no puede sellar, todo lo de abajo mide sobre legajos sin
// sello y da «bien» sin haber probado nada.
console.log('Que la prueba pueda medir algo');

await sellar(A);
await sellar(B);
const selloA = await comoQuedo(A);
const selloB = await comoQuedo(B);

sostener('la coordinadora sí puede poner el sello',
  !!selloA && selloA.verification_status === 'validado_prestadora' &&
  !!selloB && selloB.verification_status === 'validado_prestadora',
  selloA ? 'quedó en ' + selloA.verification_status : 'no se pudo leer el legajo');

console.log('');
console.log('Un papel nuevo baja el sello');

// --- 1. La persona cambia un papel de su legajo sellado --------------------
const r1 = await rest('/rest/v1/caregivers?id=eq.' + A.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ documents: { dni: 'frente-inventado-v2' } })
}, A.token);
const tras1 = await comoQuedo(A);

comprobar('cambiar un papel devuelve el legajo a «sin revisar»',
  !!tras1 && tras1.verification_status === 'en_revision',
  'respuesta ' + r1.estado + (tras1 ? ', quedó en ' + tras1.verification_status : ''));

// Y el cambio tiene que haber entrado igual: la opción A no prohíbe nada, baja
// el sello. Si el papel no se guardó, esto no es la opción A sino la B.
comprobar('y el papel nuevo sí queda guardado',
  !!tras1 && tras1.documents && tras1.documents.dni === 'frente-inventado-v2',
  tras1 && tras1.documents ? 'quedó ' + JSON.stringify(tras1.documents) : 'no se pudo leer');

// --- 2. Cuando el papel lo cambia quien firma, el sello no se mueve --------
const r2 = await rest('/rest/v1/caregivers?id=eq.' + B.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ documents: { dni: 'frente-inventado-v2' } })
}, coord.token);
const tras2 = await comoQuedo(B);

comprobar('pero si el papel lo cambia la Prestadora, el sello no se mueve',
  !!tras2 && tras2.verification_status === 'validado_prestadora',
  'respuesta ' + r2.estado + (tras2 ? ', quedó en ' + tras2.verification_status : ''));

// --- 3. Y el legajo sin sellar sigue funcionando como siempre --------------
console.log('');
console.log('Y que la prueba pueda fallar');

const r3 = await rest('/rest/v1/caregivers?id=eq.' + C.legajo.id, {
  method: 'PATCH', body: JSON.stringify({ documents: { dni: 'frente-inventado-v2' } })
}, C.token);
const tras3 = await comoQuedo(C);

sostener('cambiar un papel de un legajo sin sellar sale bien y no mueve nada',
  r3.estado < 300 && !!tras3 && tras3.verification_status === 'en_revision' &&
  tras3.documents && tras3.documents.dni === 'frente-inventado-v2',
  'respuesta ' + r3.estado + (tras3 ? ', quedó en ' + tras3.verification_status : ''));

// --- Limpieza ---------------------------------------------------------------
// Con la clave de administración: si algún día el disparador dejara un legajo
// en un estado que su dueña no ve, un `DELETE` con la sesión de ella tocaría
// cero filas y lo dejaría cargado sin decirlo.
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

// Una cuenta ficticia ascendida a coordinador es basura con permisos: no se
// deja.
for (const quien of [...gente, { userId: coord.userId }]) {
  await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
}

console.log('');
console.log(sobran === 0
  ? 'Limpieza: los tres legajos ficticios y las cuatro cuentas se borraron.'
  : 'ATENCIÓN: quedaron ' + sobran + ' legajos ficticios. Hay que borrarlos a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna comprobación de');
  console.log('sostén salió al revés de lo esperado, así que los resultados de arriba');
  console.log('podrían venir de un sello que no se puede poner o de un papel que no se');
  console.log('puede cambiar. Antes de leerlos hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('El sello habla siempre de los papeles que están hoy.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Es el pendiente 75: el legajo dice «validado» sobre papeles que la');
console.log('Prestadora no miró, y la Familia no tiene cómo notarlo.');
process.exit(1);
