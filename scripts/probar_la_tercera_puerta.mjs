/* ===================================================
   LA TERCERA PUERTA, DEL LADO DEL SERVIDOR

       node scripts/probar_la_tercera_puerta.mjs

   Contra la base local, que es donde conviene correrla porque el alta no pide
   confirmar el correo y las cuentas ficticias se crean solas. Si el entorno no
   está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. Que un mensaje con un teléfono, un correo o un domicilio **no
   entre en la base**, y que uno legítimo sí. Y lo prueba por el único camino
   que importa: le manda el mensaje a `mensajes` con una sesión de verdad
   y sin cargar ninguna pantalla, o sea haciendo exactamente lo que hace quien
   abre la consola del navegador para saltearse el aviso de `js/contacto.js`.

   POR QUÉ NO ALCANZA CON `verificar_contacto.mjs`. Esa prueba corre el
   reconocedor del navegador, que es un aviso y no un control: corre en la
   máquina de quien escribe. Ésta corre contra la base. Las dos usan las mismas
   dos listas de mensajes —`scripts/mensajes_de_contacto.mjs`—, así que el día
   que una regla cambie de un lado y no del otro, una de las dos se pone roja.

   POR QUÉ PUEDE FALLAR. Las trece que tienen que quedar bloqueadas podrían
   quedar bloqueadas por un motivo tonto —que la sesión no sirva, que la
   conversación no exista, que la tabla esté cerrada para todos—, y entonces no
   probarían nada. Por eso están las otras trece, que tienen que entrar, y por
   eso al final se cuenta cuántas quedaron guardadas: si no quedó ninguna, la
   prueba avisa que no sirve y no que el producto esté sano.

   Y mira una cosa más, que es de la regla de la empresa sobre los mensajes de
   error: que el rechazo diga una clave estable y **no devuelva el mensaje**.
   Un error que le repite a quien escribió lo que escribió es información
   sensible viajando de vuelta.

   No deja nada atrás: borra los mensajes, la conversación, el legajo y las dos
   cuentas ficticias al terminar.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { NO_PASAN, PASAN } from './mensajes_de_contacto.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Las direcciones y claves del entorno local. Son las mismas para todo el
// mundo y no son secretas, pero igual se leen de ahí y no se escriben acá.
const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url   = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base local ni su clave publicable.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}

/* Sin la llave de administración esta prueba crearía dos cuentas que después no
   puede borrar. Es el defecto que dejó tres cuentas en la base publicada y
   obligó a la migración 0058: crear lo que no se va a poder limpiar. No
   arranca. */
if (!claveServicio) {
  console.error('Sin la llave de administración esta prueba dejaría cuentas ficticias');
  console.error('que no puede borrar. No arranca.');
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

// Éstas no miden el producto: miden si la prueba está en condiciones de medir
// algo. Se cuentan aparte a propósito.
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
  return { estado: res.status, cuerpo, texto };
}

async function crearCuenta(rol, slug, nombre) {
  const sello = Date.now() + '-' + Math.floor(Math.random() * 100000);
  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `prueba.puerta.${sello}@ejemplo.invalid`,
      password: `Ficticia-${sello}-puerta`,
      data: { full_name: nombre, tenant_slug: slug, role: rol }
    })
  }).then((r) => r.json());
  return { token: alta.access_token, userId: alta.user?.id || alta.id, nombre };
}

const creadas = [];
async function limpiar() {
  for (const quien of creadas) {
    if (!quien || !quien.userId) continue;
    await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
      method: 'DELETE',
      headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
    });
  }
}

// --- La Prestadora ficticia de la migración 0003 ---------------------------
const { cuerpo: prestadoras } = await rest('/rest/v1/rpc/prestadora_por_slug', {
  method: 'POST', body: JSON.stringify({ p_slug: 'presdemo' })
});
const P = Array.isArray(prestadoras) && prestadoras.length === 1 ? prestadoras[0] : null;
if (!P) {
  console.error('Hace falta la Prestadora ficticia «presdemo» de la migración 0003.');
  process.exit(1);
}

// --- Las dos partes de una conversación ------------------------------------
const asistente = await crearCuenta('caregiver', P.slug, 'Persona Ficticia Puerta Asistente');
creadas.push(asistente);
const familia = await crearCuenta('familiar', P.slug, 'Persona Ficticia Puerta Familia');
creadas.push(familia);

if (!asistente.token || !familia.token) {
  console.error('Las cuentas ficticias se crearon pero alguna no devolvió sesión.');
  console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
  await limpiar();
  process.exit(1);
}

const { cuerpo: legajoCuerpo } = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: asistente.nombre,
    user_id: asistente.userId,
    tenant_id: P.id,
    profession: 'cuidador_domiciliario'
  })
}, asistente.token);
const legajo = Array.isArray(legajoCuerpo) ? legajoCuerpo[0] : null;

const conversacionCreada = legajo
  ? await rest('/rest/v1/conversaciones', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ caregiver_id: legajo.id, aviso_id: null })
    }, familia.token)
  : { estado: 0, cuerpo: null };
const conversacion = Array.isArray(conversacionCreada.cuerpo) ? conversacionCreada.cuerpo[0] : null;

console.log('La tercera puerta, del lado del servidor');

sostener('hay una conversación ficticia sobre la que probar',
  !!conversacion,
  conversacion ? '' : 'respuesta ' + conversacionCreada.estado + ' al abrirla');

if (!conversacion) {
  console.error('\nSin conversación no hay nada que probar.');
  await limpiar();
  process.exit(1);
}

async function mandar(texto) {
  return await rest('/rest/v1/mensajes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ conversacion_id: conversacion.id, contenido: texto })
  }, familia.token);
}

// --- 1. Los trece que no pueden entrar -------------------------------------
let bloqueados = 0;
let porLaReglaEsperada = 0;
let filtraronElTexto = 0;

for (const [texto, claveEsperada] of NO_PASAN) {
  const { estado, cuerpo, texto: crudo } = await mandar(texto);
  const mensaje = (cuerpo && cuerpo.message) || '';
  if (estado >= 400 && mensaje.startsWith('contacto_bloqueado:')) {
    bloqueados++;
    if (mensaje.slice('contacto_bloqueado:'.length) === claveEsperada) porLaReglaEsperada++;
    else console.log('        (lo reconoció ' + mensaje.slice('contacto_bloqueado:'.length)
      + ' y se esperaba ' + claveEsperada + ': ' + JSON.stringify(texto) + ')');
  } else {
    console.log('        (entró, y no tendría que entrar: ' + JSON.stringify(texto)
      + ' — respuesta ' + estado + ')');
  }
  /* El error no puede devolver lo que la persona escribió. Sólo se mira cuando
     hubo error: una respuesta buena trae el mensaje guardado porque se pidió
     `return=representation`, y contarla acá haría que este renglón se pusiera
     rojo por el mismo motivo que los dos de arriba en vez de por el suyo. */
  if (estado >= 400 && crudo && crudo.includes(texto)) filtraronElTexto++;
}

comprobar('los trece mensajes con datos de contacto no entran en la base',
  bloqueados === NO_PASAN.length,
  bloqueados + ' de ' + NO_PASAN.length);

comprobar('y cada uno lo frena la regla que le corresponde',
  porLaReglaEsperada === NO_PASAN.length,
  porLaReglaEsperada + ' de ' + NO_PASAN.length);

comprobar('el rechazo no le devuelve a nadie el mensaje que escribió',
  filtraronElTexto === 0,
  filtraronElTexto === 0 ? 'sólo la clave de la regla'
    : filtraronElTexto + ' respuestas traían el texto de vuelta');

// --- 2. Los trece que sí tienen que entrar ---------------------------------
let entraron = 0;
for (const texto of PASAN) {
  const { estado, cuerpo } = await mandar(texto);
  if (estado < 400 && Array.isArray(cuerpo) && cuerpo.length === 1) entraron++;
  else console.log('        (quedó bloqueado y tendría que pasar: ' + JSON.stringify(texto)
    + ' — respuesta ' + estado + ((cuerpo && cuerpo.message) ? ', ' + cuerpo.message : '') + ')');
}

comprobar('los trece mensajes legítimos entran',
  entraron === PASAN.length,
  entraron + ' de ' + PASAN.length);

// --- 3. Que la prueba haya podido medir algo -------------------------------
const { cuerpo: guardados } = await rest(
  '/rest/v1/mensajes?conversacion_id=eq.' + conversacion.id + '&select=id',
  {}, familia.token);

sostener('quedaron guardados los que tenían que quedar',
  Array.isArray(guardados) && guardados.length === PASAN.length,
  Array.isArray(guardados)
    ? guardados.length + ' mensajes en la conversación'
    : 'la base no devolvió la lista');

/* Y que la puerta esté puesta donde se cree que está. Sin esto, una base a la
   que le falte la migración 0063 pasaría las dos comprobaciones de arriba el
   día que alguien le saque las cinco reglas: sin reglas no se bloquea nada,
   pero tampoco se rompe nada. */
const { cuerpo: reglas } = await rest('/rest/v1/patrones_de_contacto?select=clave&activo=is.true');
sostener('la base tiene las reglas encendidas',
  Array.isArray(reglas) && reglas.length >= 5,
  Array.isArray(reglas) ? reglas.length + ' reglas' : 'la tabla no contestó');

// --- Limpieza --------------------------------------------------------------
/* Los mensajes y la conversación no se pueden borrar con la sesión: la
   migración 0054 no le dio `delete` a nadie sobre esas dos tablas, a propósito
   —un canal donde el mensaje se puede borrar después no sirve para lo que las
   dos partes lo usan—. Así que se van con la llave de administración, que es
   la misma con la que se borran las cuentas. */
async function borrarConLlave(camino) {
  await fetch(base + camino, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
}

await borrarConLlave('/rest/v1/mensajes?conversacion_id=eq.' + conversacion.id);
await borrarConLlave('/rest/v1/conversaciones?id=eq.' + conversacion.id);
if (legajo) await borrarConLlave('/rest/v1/caregivers?id=eq.' + legajo.id);
await limpiar();

const { cuerpo: quedaron } = await rest(
  '/rest/v1/conversaciones?id=eq.' + conversacion.id + '&select=id',
  { headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio } },
  claveServicio);
console.log('');
console.log(Array.isArray(quedaron) && quedaron.length === 0
  ? 'Limpieza: la conversación ficticia y sus mensajes ya no están.'
  : 'ATENCIÓN: quedó la conversación ficticia en la base. Hay que borrarla a mano.');

console.log('');
if (inservible) {
  console.error('Esta corrida no midió lo que dice medir. Lo de arriba no vale.');
  process.exit(1);
}
if (fallos > 0) {
  console.error(fallos + ' comprobación(es) en rojo: la tercera puerta no está cerrada del lado del servidor.');
  console.error('Las reglas viven en la tabla `patrones_de_contacto` (migración 0063).');
  process.exit(1);
}
console.log('La tercera puerta está cerrada: '
  + NO_PASAN.length + ' mensajes con datos de contacto no entraron y '
  + PASAN.length + ' legítimos sí, sin pasar por ninguna pantalla.');
