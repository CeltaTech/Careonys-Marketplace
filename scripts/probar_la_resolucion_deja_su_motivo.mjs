/* ===================================================
   RESOLVER UN LEGAJO DEJA ESCRITO EL PORQUÉ

       node scripts/probar_la_resolucion_deja_su_motivo.mjs

   Contra la base de esta máquina, que es donde conviene correrla porque el
   alta no pide confirmar el correo y las cuentas ficticias se crean solas. Si
   el entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. Lo que fue el pendiente 90, cerrado el 2 de septiembre de 2026 por
   la migración 0064. La pantalla de la Prestadora pedía el motivo por el que se
   otorga el aval o se rechaza un legajo, el cliente de datos lo mandaba, y ahí
   se terminaba: no había ninguna columna donde pudiera caer y se descartaba con
   un aviso en la consola. La decisión más crítica del producto —la que publica
   a una persona en el directorio, o la que le cierra la puerta— se guardaba
   **sin el porqué**, y la pantalla le hacía creer a quien lo escribió que había
   quedado.

   La condición de cierre estaba escrita y son dos mitades: que el motivo llegue
   a la base y se pueda leer junto con la resolución que lo explica, **y que no
   se pueda resolver un legajo sin dejarlo**. Acá se miden las dos.

   Y UNA TERCERA QUE NO ESTABA ESCRITA PERO DECIDIÓ EL DISEÑO. El motivo lo
   escribe el personal de la Prestadora **sobre** una persona, y esa persona no
   lo tiene que poder leer: por eso vive en su propia tabla y no en el legajo,
   donde una columna nueva viaja adentro de la fila que el Asistente sí ve. Si
   eso deja de ser cierto, el arreglo se dio vuelta.

   POR QUÉ PUEDE FALLAR. Un «bien» acá podría venir de que no se pueda resolver
   nunca, o de que la lectura no devuelva nada para nadie: contra una tabla que
   niega todo, «el Asistente no ve el motivo» sale en verde sin haber probado
   nada. Por eso las dos comprobaciones de sostén van **primero**: que la
   coordinadora sí resuelva, y que ella misma sí lea lo que escribió. Recién con
   esas dos en pie significan algo las demás.

   No deja nada atrás: los legajos ficticios y las cuatro cuentas se borran al
   final.
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
  console.error('no hay forma de tener una coordinadora, y sin coordinadora no hay quién');
  console.error('resuelva un legajo. Contra el servidor remoto esta prueba no corre.');
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

/* Las dos Prestadoras ficticias vienen de la siembra, y hacen falta las dos:
   el aislamiento se prueba con dos Organizaciones con datos, nunca con una. */
const P = await prestadora('presdemo');
const OTRA = await prestadora('cuidarnorte');
if (!P || !OTRA) {
  console.error('Hacen falta las Prestadoras ficticias `presdemo` y `cuidarnorte` de la siembra.');
  console.error('Con las migraciones aplicadas están; si no, la base está atrasada.');
  process.exit(1);
}

const sello = Date.now();

async function cuenta(etiqueta, tenantSlug, rol) {
  const email = 'prueba.resolucion.' + etiqueta + '.' + sello + '@ejemplo.invalid';
  const password = 'Ficticia-' + sello + '-' + etiqueta;
  const nombre = 'Persona Ficticia Resolución ' + etiqueta + ' ' + sello;

  const datos = { full_name: nombre, tenant_slug: tenantSlug };
  if (rol === 'caregiver') datos.role = 'caregiver';

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: datos })
  }).then((r) => r.json());

  const userId = alta.user ? alta.user.id : alta.id;
  if (!userId) return null;

  /* El rol viaja adentro del token, así que ascender y seguir usando el token
     de antes no sirve de nada: sigue diciendo lo que decía. Se pide uno nuevo
     después del ascenso. */
  let token = alta.access_token;
  // Desde que se recreó el contenedor de cuentas del entorno local (fue el
  // pendiente 123, cerrado), el alta local ya no confirma sola: hay que
  // confirmarla a propósito, con la llave de servicio, y recién ahí pedir la sesión.
  if (!token) {
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
  if (rol === 'coordinador') {
    const ascenso = await fetch(base + '/rest/v1/profiles?id=eq.' + userId, {
      method: 'PATCH',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'coordinador' })
    });
    if (ascenso.status >= 300) return null;
    const nueva = await fetch(base + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then((r) => r.json());
    token = nueva.access_token;
  }

  return token ? { etiqueta, nombre, token, userId } : null;
}

async function conLegajo(etiqueta) {
  const quien = await cuenta(etiqueta, P.slug, 'caregiver');
  if (!quien) return null;
  const { cuerpo } = await rest('/rest/v1/caregivers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: quien.nombre, user_id: quien.userId, tenant_id: P.id,
      profession: 'cuidador_domiciliario'
    })
  }, quien.token);
  const legajo = Array.isArray(cuerpo) ? cuerpo[0] : null;
  return legajo ? { ...quien, legajo } : null;
}

/* A: se resuelve con motivo. B: se intenta resolver sin motivo, y tiene que
   quedar como estaba. Uno por comprobación: un legajo compartido hace que el
   segundo lea lo que dejó el primero, y un rojo arrastrado se lee igual que un
   rojo propio. */
const A = await conLegajo('A');
const B = await conLegajo('B');
const gente = [A, B];

if (gente.some((q) => !q)) {
  console.error('No se pudieron crear las personas ficticias con su legajo.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  process.exit(1);
}

const coord = await cuenta('coord', P.slug, 'coordinador');
const coordOtra = await cuenta('coordotra', OTRA.slug, 'coordinador');

if (!coord || !coordOtra) {
  console.error('No se pudieron dejar listas las coordinadoras ficticias, así que no hay');
  console.error('quién resuelva ni con quién comparar el aislamiento.');
  process.exit(1);
}

const MOTIVO = 'Entrevista ficticia ' + sello + ': maneja bien el acompañamiento nocturno.';

async function resolver(legajoId, estado, motivo, token) {
  return await rest('/rest/v1/rpc/resolver_legajo', {
    method: 'POST',
    body: JSON.stringify({
      p_caregiver_id: legajoId, p_estado: estado, p_motivo: motivo
    })
  }, token);
}

async function leerResoluciones(legajoId, token) {
  const { estado, cuerpo } = await rest(
    '/rest/v1/resoluciones_legajo?caregiver_id=eq.' + legajoId +
    '&select=estado,motivo,resuelto_por,created_at&order=created_at.desc', {}, token);
  return { estado, filas: Array.isArray(cuerpo) ? cuerpo : [] };
}

async function estadoDelLegajo(quien) {
  const { cuerpo } = await rest(
    '/rest/v1/caregivers?id=eq.' + quien.legajo.id + '&select=verification_status',
    {}, quien.token);
  return Array.isArray(cuerpo) && cuerpo[0] ? cuerpo[0].verification_status : null;
}

// --- Sostén, y va primero porque todo lo de abajo cuelga de él -------------
console.log('Que la prueba pueda medir algo');

const r1 = await resolver(A.legajo.id, 'validado_prestadora', MOTIVO, coord.token);
const trasA = await estadoDelLegajo(A);

sostener('la coordinadora sí puede resolver el legajo',
  r1.estado < 300 && trasA === 'validado_prestadora',
  'respuesta ' + r1.estado + ', el legajo quedó en ' + trasA);

const leidoPorLaPrestadora = await leerResoluciones(A.legajo.id, coord.token);

sostener('y la tabla de resoluciones sí devuelve filas a quien las escribió',
  leidoPorLaPrestadora.filas.length === 1,
  'respuesta ' + leidoPorLaPrestadora.estado + ', ' +
  leidoPorLaPrestadora.filas.length + ' fila(s)');

// --- 1. El motivo llegó y se lee junto con la resolución -------------------
console.log('');
console.log('El motivo llega a la base y se puede volver a leer');

const fila = leidoPorLaPrestadora.filas[0] || {};

comprobar('el motivo que se escribió es el que se lee',
  fila.motivo === MOTIVO,
  fila.motivo ? 'dice: ' + fila.motivo.slice(0, 60) + '…' : 'no vino ningún motivo');

comprobar('y viene junto con la resolución que explica',
  fila.estado === 'validado_prestadora',
  'la resolución dice ' + fila.estado);

/* Quién firmó lo escribe la base con `auth.uid()`, no el pedido: el navegador
   nunca lo mandó. Si vuelve vacío, la firma se perdió; si vuelve otra cuenta,
   se puede atribuir la decisión a un tercero. */
comprobar('y la firma es de quien resolvió, y la puso la base',
  fila.resuelto_por === coord.userId,
  fila.resuelto_por ? 'firmó ' + fila.resuelto_por : 'no quedó firmada');

// --- 2. No se puede resolver sin dejar el motivo ---------------------------
console.log('');
console.log('No se puede resolver un legajo sin dejar el motivo');

const antesB = await estadoDelLegajo(B);
const r2 = await resolver(B.legajo.id, 'rechazado', '   ', coord.token);
const despuesB = await estadoDelLegajo(B);

comprobar('resolver con el motivo en blanco se rechaza',
  r2.estado >= 400,
  'respuesta ' + r2.estado);

/* Y las dos escrituras van juntas: si el legajo se hubiera movido igual, el
   agujero seguiría abierto con otra forma —un legajo resuelto sin porqué—. */
comprobar('y el legajo queda exactamente como estaba',
  despuesB === antesB,
  'antes ' + antesB + ', después ' + despuesB);

const trasElIntento = await leerResoluciones(B.legajo.id, coord.token);
comprobar('y no quedó ninguna resolución a medias',
  trasElIntento.filas.length === 0,
  trasElIntento.filas.length + ' fila(s)');

// --- 3. La persona juzgada no lee lo que se escribió sobre ella ------------
console.log('');
console.log('El motivo lo lee la Prestadora, no la persona del legajo');

const leidoPorElAsistente = await leerResoluciones(A.legajo.id, A.token);

comprobar('el Asistente no ve ninguna resolución sobre su propio legajo',
  leidoPorElAsistente.filas.length === 0,
  'respuesta ' + leidoPorElAsistente.estado + ', ' +
  leidoPorElAsistente.filas.length + ' fila(s)');

// --- 4. Y ninguna Prestadora ve las resoluciones de otra -------------------
console.log('');
console.log('Y ninguna Prestadora alcanza las resoluciones de otra');

const leidoPorLaOtra = await leerResoluciones(A.legajo.id, coordOtra.token);

comprobar('la coordinadora de otra Prestadora no ve la resolución',
  leidoPorLaOtra.filas.length === 0,
  'respuesta ' + leidoPorLaOtra.estado + ', ' + leidoPorLaOtra.filas.length + ' fila(s)');

const r3 = await resolver(B.legajo.id, 'rechazado', 'Motivo ficticio de otra Prestadora.',
  coordOtra.token);
const trasElIntruso = await estadoDelLegajo(B);

comprobar('ni puede resolver un legajo que no es suyo',
  r3.estado >= 400 && trasElIntruso === antesB,
  'respuesta ' + r3.estado + ', el legajo quedó en ' + trasElIntruso);

// --- Limpieza ---------------------------------------------------------------
/* Con la clave de administración: las resoluciones no tienen `delete` para
   nadie que inicie sesión —a propósito, una resolución no se borra—, así que
   la única forma de no dejar basura es borrar el legajo, que se las lleva por
   la cascada. */
for (const quien of gente) {
  await rest('/rest/v1/caregivers?id=eq.' + quien.legajo.id,
    { method: 'DELETE' }, claveServicio);
}

let sobran = 0;
for (const quien of gente) {
  const { cuerpo } = await rest(
    '/rest/v1/resoluciones_legajo?caregiver_id=eq.' + quien.legajo.id + '&select=id',
    {}, claveServicio);
  sobran += Array.isArray(cuerpo) ? cuerpo.length : 1;
  const { cuerpo: legajos } = await rest(
    '/rest/v1/caregivers?id=eq.' + quien.legajo.id + '&select=id', {}, claveServicio);
  sobran += Array.isArray(legajos) ? legajos.length : 1;
}

// Una cuenta ficticia ascendida a coordinador es basura con permisos: no se deja.
for (const quien of [...gente, coord, coordOtra]) {
  await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
}

console.log('');
console.log(sobran === 0
  ? 'Limpieza: los dos legajos ficticios, sus resoluciones y las cuatro cuentas se borraron.'
  : 'ATENCIÓN: quedaron ' + sobran + ' filas ficticias. Hay que borrarlas a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna comprobación de');
  console.log('sostén salió al revés de lo esperado, así que un «bien» de abajo podría');
  console.log('venir de que no se pueda resolver nada, y no de que el aislamiento');
  console.log('funcione. Antes de leer los resultados hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('Un legajo no se resuelve sin dejar escrito el porqué, y el porqué lo lee');
  console.log('la Prestadora que lo escribió y nadie más.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Esto pasa desde el 2 de septiembre de 2026, cuando la migración 0064 cerró');
console.log('el pendiente 90. Si da rojo, la decisión que publica a una persona en el');
console.log('directorio —o la que le cierra la puerta— volvió a guardarse sin el porqué,');
console.log('o el porqué quedó al alcance de alguien que no lo tiene que leer.');
process.exit(1);
