/* ===================================================
   LA MISMA CUENTA, ADENTRO DE DOS PRESTADORAS

       node scripts/probar_la_misma_cuenta_en_dos_prestadoras.mjs

   Contra la base de esta máquina, que es donde conviene correrla porque el
   alta no pide confirmar el correo y la cuenta ficticia se crea sola. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. Lo ordenó el Desarrollador: una persona «debe poder registrarse
   con el correo que quiera, aunque sea siempre el mismo, en todas las
   prestadoras que quiera», y «lo que no se puede es registrar 2 personas
   diferentes con el mismo correo dentro de la misma prestadora». Esta prueba
   comprueba las dos mitades con una misma cuenta ficticia:

     · que puede quedar registrada en las dos Prestadoras ficticias a la vez;
     · que estando parada en una ve lo suyo de esa y **nada** de la otra, con
       datos cargados de los dos lados, que es la única forma de que no ver
       nada signifique algo;
     · que pararse en una Prestadora donde no tiene ficha no se puede, ni
       aunque se pida por su nombre;
     · que volver a registrarse con el mismo correo en la Prestadora donde ya
       está no crea una segunda persona;
     · y que el legajo del Asistente no se le cuela de una Prestadora a la
       otra.

   POR QUÉ PUEDE FALLAR SIN QUE SE NOTE. Comprobar que estando parada en una
   Prestadora no se ve nada de la otra daría «bien» por el motivo tonto de que
   no se ve nada de ningún lado —una política que niega todo devuelve lo mismo
   que una que aísla bien—. Por eso cada mirada tiene su par: en la misma
   corrida se comprueba que **sí** se ve lo propio. Si el par sale al revés de
   lo esperado, la prueba avisa que no está en condiciones de medir nada, y no
   que el producto esté sano.

   El aviso de la Familia es lo que se usa para mirar, porque su política lo
   deja ver a quien lo publicó y a nadie más de afuera de esa Prestadora, y
   porque la Prestadora del aviso no se manda en el pedido: la pone la base
   con la Prestadora del momento. Así, que el aviso caiga donde tiene que caer
   ya es media prueba.

   No deja nada atrás: borra los avisos, el legajo y las cuentas ficticias que
   crea, y comprueba al final que la base quedó con la misma cantidad de
   cuentas que tenía al empezar.
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

if (!url || !clave || !claveServicio) {
  console.error('No se pudo averiguar la dirección de la base de esta máquina ni sus claves.');
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

async function conServicio(camino, opciones = {}) {
  const res = await fetch(base + camino, {
    ...opciones,
    headers: {
      apikey: claveServicio,
      Authorization: 'Bearer ' + claveServicio,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });
  const texto = await res.text();
  try { return texto ? JSON.parse(texto) : null; } catch { return texto; }
}

async function prestadora(slug) {
  const { cuerpo } = await rest('/rest/v1/rpc/prestadora_por_slug', {
    method: 'POST', body: JSON.stringify({ p_slug: slug })
  });
  return Array.isArray(cuerpo) && cuerpo.length === 1 ? cuerpo[0] : null;
}

async function cuantasCuentas() {
  const r = await conServicio('/auth/v1/admin/users?per_page=1000');
  return Array.isArray(r?.users) ? r.users.length : -1;
}

/* Crea una cuenta ficticia entrando por el enlace de una Prestadora, que es
   como entra cualquiera, y devuelve su sesión. */
async function cuentaFicticia(P, papel, etiqueta) {
  const sello = Date.now() + '.' + Math.random().toString(36).slice(2);
  const correo = `prueba.dos.prestadoras.${etiqueta}.${sello}@ejemplo.invalid`;
  const clavePersonal = `Ficticia-${sello}-dos`;
  const nombre = `Persona Ficticia Dos Prestadoras ${etiqueta} ${sello}`;

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: correo, password: clavePersonal,
      data: { full_name: nombre, tenant_slug: P.slug, role: papel }
    })
  }).then((r) => r.json());

  let token = alta.access_token;
  const cuentaId = alta.user?.id || alta.id;
  if (!token && cuentaId) {
    await conServicio('/auth/v1/admin/users/' + cuentaId, {
      method: 'PUT', body: JSON.stringify({ email_confirm: true })
    });
    const sesion = await fetch(base + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: correo, password: clavePersonal })
    }).then((r) => r.json());
    token = sesion.access_token;
  }
  if (!token) {
    console.error('La cuenta ficticia se creó pero no devolvió sesión.');
    console.error('Contra el servidor publicado pasa: ahí el alta pide confirmar el correo.');
    process.exit(1);
  }
  return { token, cuentaId, correo, clavePersonal, nombre };
}

async function borrarCuenta(cuentaId) {
  if (!cuentaId) return false;
  const res = await fetch(base + '/auth/v1/admin/users/' + cuentaId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
  return res.ok;
}

/* En cuántas Prestadoras tiene ficha esa cuenta, mirado por afuera de la
   sesión para que no dependa de lo mismo que se está probando. */
async function fichasDe(cuentaId) {
  const filas = await conServicio('/rest/v1/profiles?select=tenant_id&id=eq.' + cuentaId);
  return Array.isArray(filas) ? filas.map((f) => f.tenant_id) : [];
}

async function pararse(token, slug) {
  return await rest('/rest/v1/rpc/pararse_en_prestadora', {
    method: 'POST', body: JSON.stringify({ p_nombre_corto: slug })
  }, token);
}

async function publicarAviso(token, quien) {
  return await rest('/rest/v1/avisos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      patient_name: quien,
      zone: 'Barrio Ficticio',
      description: 'Aviso ficticio de una prueba automática.',
      profession_required: 'cuidador_domiciliario'
    })
  }, token);
}

async function avisosQueVe(token) {
  const { cuerpo } = await rest('/rest/v1/avisos?select=id,patient_name,tenant_id', {}, token);
  return Array.isArray(cuerpo) ? cuerpo : [];
}

/* La ficha que la pantalla pide al arrancar. Es una sola función y devuelve
   una sola fila: la de la Prestadora donde la sesión está parada. Antes de la
   migración 0008 la pantalla pedía «la» ficha de la cuenta y, con dos, recibía
   dos y se caía. */
async function miPerfil(token) {
  const { cuerpo } = await rest('/rest/v1/rpc/mi_perfil', { method: 'POST' }, token);
  return Array.isArray(cuerpo) ? cuerpo : [];
}

// --- Las dos Prestadoras ficticias de la siembra ----------------------------
const UNA = await prestadora('presdemo');
const OTRA = await prestadora('cuidarnorte');
if (!UNA || !OTRA) {
  console.error('Hacen falta las dos Prestadoras ficticias de la siembra.');
  console.error('Con una sola, no ver nada de la otra no probaría nada.');
  process.exit(1);
}

console.log('La misma cuenta, adentro de dos Prestadoras');
console.log('');

const cuentasParaBorrar = [];
const avisosParaBorrar = [];
const cuentasAlEmpezar = await cuantasCuentas();

// --- 1. Entra por el enlace de una Prestadora y queda parada ahí -----------
const persona = await cuentaFicticia(UNA, 'familia', 'a');
cuentasParaBorrar.push(persona.cuentaId);

const avisoUna = await publicarAviso(persona.token, 'Paciente Ficticio De La Primera');
const filaUna = Array.isArray(avisoUna.cuerpo) ? avisoUna.cuerpo[0] : null;
if (filaUna) avisosParaBorrar.push(filaUna.id);

sostener('recién registrada, la Familia publica su aviso',
  !!filaUna, 'respuesta ' + avisoUna.estado);
comprobar('y el aviso cae en la Prestadora por cuyo enlace entró',
  !!filaUna && filaUna.tenant_id === UNA.id);

// --- 2. La misma cuenta se registra en la segunda Prestadora ---------------
const alta2 = await rest('/rest/v1/rpc/registrarse_en_prestadora', {
  method: 'POST',
  body: JSON.stringify({
    p_nombre_corto: OTRA.slug, p_papel: 'familiar', p_nombre: persona.nombre
  })
}, persona.token);

comprobar('el mismo correo se registra también en la segunda Prestadora',
  alta2.estado < 300 && alta2.cuerpo === OTRA.id,
  'respuesta ' + alta2.estado);

const fichas = await fichasDe(persona.cuentaId);
comprobar('y queda con una ficha en cada una, no con una sola',
  fichas.length === 2 && fichas.includes(UNA.id) && fichas.includes(OTRA.id),
  fichas.length + (fichas.length === 1 ? ' ficha' : ' fichas'));

// --- 3. Parada en la segunda, ve lo suyo de ahí y nada de la primera -------
const avisoOtra = await publicarAviso(persona.token, 'Paciente Ficticio De La Segunda');
const filaOtra = Array.isArray(avisoOtra.cuerpo) ? avisoOtra.cuerpo[0] : null;
if (filaOtra) avisosParaBorrar.push(filaOtra.id);

comprobar('registrarse en la segunda deja la sesión parada ahí',
  !!filaOtra && filaOtra.tenant_id === OTRA.id,
  'respuesta ' + avisoOtra.estado);

const desdeOtra = await avisosQueVe(persona.token);
sostener('parada en la segunda, ve el aviso que publicó ahí',
  desdeOtra.some((a) => a.id === (filaOtra || {}).id),
  desdeOtra.length + (desdeOtra.length === 1 ? ' aviso a la vista' : ' avisos a la vista'));
comprobar('y no ve el que publicó en la primera',
  !desdeOtra.some((a) => a.id === (filaUna || {}).id));

const perfilOtra = await miPerfil(persona.token);
comprobar('y la ficha que le entrega la base es una sola, la de la segunda',
  perfilOtra.length === 1 && perfilOtra[0].tenant_id === OTRA.id,
  perfilOtra.length + (perfilOtra.length === 1 ? ' ficha' : ' fichas'));

// --- 4. Vuelve a pararse en la primera y pasa lo simétrico -----------------
const vuelta = await pararse(persona.token, UNA.slug);
comprobar('vuelve a pararse en la primera',
  vuelta.estado < 300 && vuelta.cuerpo === UNA.id,
  'respuesta ' + vuelta.estado);

const desdeUna = await avisosQueVe(persona.token);
sostener('parada en la primera, ve el aviso que publicó ahí',
  desdeUna.some((a) => a.id === (filaUna || {}).id),
  desdeUna.length + (desdeUna.length === 1 ? ' aviso a la vista' : ' avisos a la vista'));
comprobar('y no ve el que publicó en la segunda',
  !desdeUna.some((a) => a.id === (filaOtra || {}).id));

const perfilUna = await miPerfil(persona.token);
comprobar('y la ficha que le entrega la base vuelve a ser una sola, la de la primera',
  perfilUna.length === 1 && perfilUna[0].tenant_id === UNA.id,
  perfilUna.length + (perfilUna.length === 1 ? ' ficha' : ' fichas'));

// --- 5. Donde no tiene ficha no se para, ni pidiéndolo por su nombre -------
const ajena = await cuentaFicticia(UNA, 'familiar', 'b');
cuentasParaBorrar.push(ajena.cuentaId);

const coladura = await pararse(ajena.token, OTRA.slug);
comprobar('quien no tiene ficha en una Prestadora no se puede parar en ella',
  coladura.estado >= 400,
  'respuesta ' + coladura.estado);

const avisoAjena = await publicarAviso(ajena.token, 'Paciente Ficticio Del Intento');
const filaAjena = Array.isArray(avisoAjena.cuerpo) ? avisoAjena.cuerpo[0] : null;
if (filaAjena) avisosParaBorrar.push(filaAjena.id);
comprobar('y después del intento sigue parada donde estaba',
  !!filaAjena && filaAjena.tenant_id === UNA.id,
  'respuesta ' + avisoAjena.estado);

// --- 6. El mismo correo no crea una segunda persona adentro de la misma ----
const repetida = await fetch(base + '/auth/v1/signup', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: persona.correo, password: persona.clavePersonal,
    data: { full_name: 'Otra Persona Ficticia Con El Mismo Correo', tenant_slug: UNA.slug, role: 'familiar' }
  })
}).then((r) => r.json());

const fichasDespues = await fichasDe(persona.cuentaId);
comprobar('registrarse otra vez con el mismo correo no crea una segunda persona',
  fichasDespues.filter((t) => t === UNA.id).length === 1,
  'fichas en la primera: ' + fichasDespues.filter((t) => t === UNA.id).length);
/* El servidor de cuentas contesta el segundo intento sin decir si ese correo
   ya estaba —eso es lo que impide averiguarlo desde una pantalla pública—, así
   que lo único que se puede mirar acá es que no haya quedado una cuenta nueva.
   La cuenta que devuelve es de mentira: no abre sesión y no está en la base. */
const cuentasTrasLaRepetida = await cuantasCuentas();
comprobar('y tampoco deja una cuenta de más',
  cuentasTrasLaRepetida === cuentasAlEmpezar + cuentasParaBorrar.length,
  cuentasTrasLaRepetida + ' cuentas, las mismas de antes del segundo intento');

// --- 7. El legajo del Asistente no se cuela de una Prestadora a la otra ----
const asistente = await cuentaFicticia(UNA, 'caregiver', 'c');
cuentasParaBorrar.push(asistente.cuentaId);

const legajo = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: asistente.nombre,
    user_id: asistente.cuentaId,
    tenant_id: UNA.id,
    profession: 'cuidador_domiciliario',
    documents: { dni: 'documentos-cuidadores/ficticio-dni.pdf' }
  })
}, asistente.token);
const filaLegajo = Array.isArray(legajo.cuerpo) ? legajo.cuerpo[0] : null;

async function legajoQueVe(token) {
  const { cuerpo } = await rest('/rest/v1/rpc/legajo_propio', { method: 'POST', body: '{}' }, token);
  return cuerpo;
}

sostener('el Asistente tiene legajo en la Prestadora por la que entró',
  !!filaLegajo && (await legajoQueVe(asistente.token)) === filaLegajo.id,
  'respuesta ' + legajo.estado);

await rest('/rest/v1/rpc/registrarse_en_prestadora', {
  method: 'POST',
  body: JSON.stringify({
    p_nombre_corto: OTRA.slug, p_papel: 'caregiver', p_nombre: asistente.nombre
  })
}, asistente.token);

comprobar('parado en la otra Prestadora, no se le entrega el legajo de la primera',
  (await legajoQueVe(asistente.token)) === null);

// --- Limpieza ---------------------------------------------------------------
console.log('');
if (filaLegajo) {
  await conServicio('/rest/v1/caregivers?id=eq.' + filaLegajo.id, { method: 'DELETE' });
}
for (const id of avisosParaBorrar) {
  await conServicio('/rest/v1/avisos?id=eq.' + id, { method: 'DELETE' });
}
for (const id of cuentasParaBorrar) await borrarCuenta(id);

const cuentasAlTerminar = await cuantasCuentas();
comprobar('la base queda con la misma cantidad de cuentas que tenía al empezar',
  cuentasAlEmpezar >= 0 && cuentasAlTerminar === cuentasAlEmpezar,
  cuentasAlEmpezar + ' antes, ' + cuentasAlTerminar + ' después');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna de las comprobaciones');
  console.log('de sostén salió al revés de lo esperado, así que no ver los datos de la otra');
  console.log('Prestadora podría ser simplemente que no se ve nada. Antes de leer el');
  console.log('resultado de arriba hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('Una persona con un solo correo queda registrada en las dos Prestadoras, y en');
  console.log('cada una ve lo suyo y nada de la otra.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
process.exit(1);
