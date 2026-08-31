/* ===================================================
   EL ROL Y LA PRESTADORA NO SE LOS ESCRIBE UNO MISMO

       node scripts/probar_el_rol_y_la_prestadora_del_perfil.mjs

   Contra la base local, que es donde conviene correrla porque el alta no
   pide confirmar el correo y las cuentas ficticias se crean solas. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. `profiles` guarda dos columnas de las que cuelga todo lo demás:
   `role`, que es de donde sale `es_personal_de_prestadora()`, y `tenant_id`,
   que es lo que devuelve `prestadora_actual()`, la expresión sobre la que se
   apoyan las políticas de todas las tablas. Quien pueda escribirse esas dos
   se asciende y se muda de Organización, y con eso se lleva puesto el
   aislamiento entero.

   ESTA PRUEBA NO ARRANCA EN ROJO, Y ESO ESTÁ DICHO A PROPÓSITO. El pendiente
   82 no es un agujero abierto: es una trampa armada. Hoy los dos intentos se
   rechazan, pero no por la política —que dice «cada quien escribe su propia
   fila» y no nombra ninguna columna— sino por un permiso escrito seis
   renglones más abajo, `grant update (full_name) on public.profiles to
   authenticated`. Un solo `grant update on public.profiles to authenticated`
   en cualquier migración futura abre las dos puertas, y ya pasó una vez: la
   migración 0032 se lo llevó puesto sin querer y la 0033 lo repuso. El
   mensaje de error de Postgres, además, **sugiere literalmente el arreglo
   equivocado**: «Grant the required privileges … GRANT UPDATE ON
   public.profiles TO authenticated», que es la línea que abre el agujero.

   Por eso esta prueba vale como red permanente y no como alarma de hoy: es
   la que va a avisar el día que alguien vuelva a escribir ese `grant`.

   POR QUÉ PUEDE FALLAR. Los tres rechazos darían «bien» también sobre una
   tabla cerrada para todos, y entonces no probarían nada. Por eso la
   comprobación de sostén: que la persona sí pueda corregirse el propio
   nombre. Si eso sale al revés, la prueba avisa que no sirve y no que el
   producto esté sano.

   Y se comprobó que puede fallar de verdad, no en teoría: con
   `grant update on public.profiles to authenticated` puesto a mano en la
   base local, las tres comprobaciones se pusieron en rojo. El permiso se
   dejó como estaba.

   No deja nada atrás: las dos cuentas ficticias no crean ninguna fila fuera
   de su propio perfil, que se va con la cuenta.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
// La de administración sólo se usa para la limpieza del final, así que la
// prueba corre igual sin ella y en ese caso lo dice.
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

// La de abajo no mide el producto: mide si esta prueba está en condiciones de
// medir algo. Se cuenta aparte a propósito.
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

// --- Dos cuentas ficticias, una en cada Prestadora --------------------------
// La segunda existe para una sola comprobación: que no se le pueda escribir el
// perfil a otra persona. Sin ella, los rechazos de arriba no distinguirían
// «no puede tocar estas columnas» de «no puede tocar ninguna fila».
async function cuenta(etiqueta, deQuien) {
  const email = 'prueba.perfil.' + etiqueta + '.' + sello + '@ejemplo.invalid';
  const password = 'Ficticia-' + sello + '-' + etiqueta;
  const nombre = 'Persona Ficticia Perfil ' + etiqueta + ' ' + sello;

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      // Se pide `coordinador` a propósito: el disparador de alta tiene que
      // ignorarlo y poner otro. Es la puerta de al lado de la que mide esta
      // prueba, y sale gratis comprobarla acá.
      data: { full_name: nombre, tenant_slug: deQuien.slug, role: 'coordinador' }
    })
  }).then((r) => r.json());

  const token = alta.access_token;
  const userId = alta.user ? alta.user.id : alta.id;
  return token ? { etiqueta, nombre, token, userId, prestadora: deQuien } : null;
}

const A = await cuenta('A', P);
const B = await cuenta('B', AJENA);
if (!A || !B) {
  console.error('Las cuentas ficticias se crearon pero no devolvieron sesión.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  process.exit(1);
}

// El perfil se lee siempre con la sesión de su dueña, que es la única que lo
// ve. Un pedido rechazado y uno que toca cero filas no se parecen; lo que
// importa es cómo quedó la fila.
async function perfilDe(quien) {
  const { cuerpo } = await rest(
    '/rest/v1/profiles?id=eq.' + quien.userId + '&select=full_name,role,tenant_id', {}, quien.token);
  return Array.isArray(cuerpo) && cuerpo[0] ? cuerpo[0] : null;
}

const antes = await perfilDe(A);
if (!antes) {
  console.error('No se pudo leer el perfil recién creado, así que no hay nada que probar.');
  process.exit(1);
}

// El rol pedido en el alta ya tiene que haber sido ignorado: la migración 0005
// lo dice —«el rol nunca sale de los metadatos sin filtrar»— y es la puerta de
// al lado de la que mide esta prueba.
console.log('El rol y la Prestadora del perfil');

comprobar('el rol pedido en el alta no se toma del pedido',
  antes.role !== 'coordinador', 'quedó en ' + antes.role);

// --- 1. No puede ascenderse a coordinador ----------------------------------
const r1 = await rest('/rest/v1/profiles?id=eq.' + A.userId, {
  method: 'PATCH', body: JSON.stringify({ role: 'coordinador' })
}, A.token);
const tras1 = await perfilDe(A);

comprobar('no puede ascenderse a coordinador',
  !!tras1 && tras1.role !== 'coordinador',
  'respuesta ' + r1.estado + (tras1 ? ', rol ' + tras1.role : ''));

// --- 2. Ni mudarse a la Prestadora ajena -----------------------------------
const r2 = await rest('/rest/v1/profiles?id=eq.' + A.userId, {
  method: 'PATCH', body: JSON.stringify({ tenant_id: AJENA.id })
}, A.token);
const tras2 = await perfilDe(A);

comprobar('ni mudarse a la Prestadora ajena',
  !!tras2 && tras2.tenant_id === P.id,
  'respuesta ' + r2.estado + (tras2 && tras2.tenant_id !== P.id ? ', quedó en la otra' : ''));

// --- 3. Ni escribirle el perfil a otra persona -----------------------------
const r3 = await rest('/rest/v1/profiles?id=eq.' + B.userId, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({ full_name: 'Nombre Puesto Por Otro' })
}, A.token);
const tras3 = await perfilDe(B);

comprobar('ni escribirle el perfil a otra persona',
  !!tras3 && tras3.full_name === B.nombre,
  'respuesta ' + r3.estado +
  (tras3 && tras3.full_name !== B.nombre ? ', le quedó el nombre puesto por otra cuenta' : ''));

// --- 4. Que esta prueba esté en condiciones de medir algo ------------------
console.log('');
console.log('Y que la prueba pueda fallar');

const corregido = A.nombre + ' (corregido)';
const r4 = await rest('/rest/v1/profiles?id=eq.' + A.userId, {
  method: 'PATCH', body: JSON.stringify({ full_name: corregido })
}, A.token);
const tras4 = await perfilDe(A);

sostener('la persona sí puede corregirse el propio nombre',
  !!tras4 && tras4.full_name === corregido,
  'respuesta ' + r4.estado);

// --- Limpieza ---------------------------------------------------------------
// Importa más de lo que parece: el día que este chequeo dé rojo, la cuenta
// ficticia va a quedar ascendida a coordinador y mudada a la otra Prestadora.
// Eso es basura con permisos, y justo en la corrida en la que uno está mirando
// otra cosa.
console.log('');
if (claveServicio) {
  for (const quien of [A, B]) {
    await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
      method: 'DELETE',
      headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
    });
  }
  console.log('Limpieza: las dos cuentas ficticias se borraron, con su perfil.');
} else {
  console.log('Las dos cuentas ficticias quedan en auth.users: sin la clave de administración');
  console.log('no hay forma de borrarlas. Las dos tienen correo @ejemplo.invalid, que es un');
  console.log('dominio que por norma no existe: no le llegó ni le puede llegar nada a nadie.');
}
console.log('');

if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: la comprobación de sostén');
  console.log('salió al revés de lo esperado, así que los rechazos de arriba podrían venir');
  console.log('de una tabla cerrada para todos. Antes de leer el resultado hay que ver por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('El rol y la Prestadora no se los escribe uno mismo.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Es el pendiente 82: alguien con sesión se asciende o se muda de Organización,');
console.log('y de `tenant_id` cuelgan las políticas de todas las tablas.');
process.exit(1);
