/* ===================================================
   EL MURO ENTRE UNA PRESTADORA Y OTRA, ATACADO A PROPÓSITO

       node scripts/probar_el_muro_entre_prestadoras.mjs

   `probar_aislamiento.mjs` mira el muro por el lado de las tablas: dos
   Prestadoras con datos cargados, y ninguna ve una fila de la otra. Esta
   prueba mira **la pieza nueva sobre la que hoy se apoya ese muro**, que es la
   Prestadora en la que la sesión está parada. Desde que una misma cuenta puede
   tener ficha en varias, esa pieza es la que decide qué datos ve la sesión: si
   se pudiera escribir desde afuera, se abrirían de golpe todas las tablas de
   la Prestadora vecina, y las políticas de cada tabla estarían bien y no
   servirían de nada.

   Así que acá no se comprueba que algo no se vea. Acá se **intenta romperlo**,
   por los cinco caminos que tiene un navegador contra una dirección web, y
   después de cada intento se vuelve a mirar si se abrió algo.

   ---- Lo que intenta, con la sesión parada en su Prestadora ----

    1. Lee su propio renglón de Prestadora parada, y lee uno solo. Es el
       control positivo: sin él, todo lo de abajo daría bien con la lectura
       rota.
    2. No ve el renglón de la otra cuenta, ni pidiéndolo por su identificador.
    3. No lo puede crear apuntando a la Prestadora vecina.
    4. No lo puede cambiar.
    5. No lo puede borrar, y después del intento el renglón sigue estando: un
       borrado que pasara dejaría la sesión sin Prestadora parada, que no es
       peor pero tampoco es nada.
    6. No se para en una Prestadora donde esa cuenta no tiene ficha, y después
       del intento sigue parada donde estaba.
    7. Y el rechazo es **el mismo** que el de una Prestadora que no existe: si
       fueran distintos, cualquiera con una sesión averiguaría desde afuera en
       qué Prestadoras está dada de alta otra persona probando nombres.

   ---- Y después de los cinco intentos ----

    8. Ni una ficha, ni un aviso, ni un legajo, ni una conversación de la
       Prestadora vecina. Al lado se mira que la cuenta de esa Prestadora sí
       vea lo suyo: si no, «cero» no distingue negado de vacío.
    9. El valor que viene en el pedido no abre nada: pedir los avisos filtrando
       por la Prestadora vecina sigue devolviendo cero.
   10. Ni un encabezado inventado que la nombre.
   11. Ni escribirle la Prestadora vecina al cuerpo: el aviso queda en la suya.
       Es la regla de la empresa escrita al revés —la política resuelve la
       Prestadora por la membresía verificada, nunca por un valor del pedido—,
       y probada por el único lado por el que se puede probar, que es
       intentándolo.
   12. Y la ficha que la pantalla pide al arrancar devuelve una sola, la de
       donde está parada.

   ---- Y el alta legítima en una segunda Prestadora no afloja nada ----

   Registrarse en otra Prestadora está permitido y es lo esperado. Lo que no
   puede pasar es que ese camino sea el agujero:

   13. Pedir el papel del personal al registrarse deja la ficha como Familia.
   14. Parada en la segunda, lo que publica queda en la segunda, y desde ahí
       ve lo suyo de la segunda y nada de la primera. El control positivo es
       un aviso **propio** y no el de la cuenta vecina, porque adentro de una
       misma Prestadora una Familia tampoco ve los avisos de otra Familia: ese
       cero no diría nada del muro.
   15. Vuelta a la primera, al revés. Una por vez, siempre.
   16. Y no es personal de ninguna de las dos.

   ---- Y las dos Prestadoras arrancan con datos cargados ----

   Del lado de la vecina hay un aviso, un legajo de Asistente y una conversación
   abierta entre los dos. Sin eso, «no ve ninguna fila» lo cumpliría igual una
   política que niega todo, y esta prueba daría verde sin haber mirado nada.
   Cada fila se comprueba desde la sesión que sí tiene derecho a verla, que no
   es siempre la misma: el legajo lo ve su dueño y no la Familia, porque el
   directorio pide consentimiento y papeles comprobados.

   Todo con datos inventados, contra la base de esta máquina. Borra la
   conversación, el legajo, los avisos y las cuentas que crea, y al final
   comprueba que la base quedó con el mismo total de cuentas que tenía al
   empezar.
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
let hechas = 0;

function comprobar(titulo, condicion, detalle) {
  console.log((condicion ? '   bien  ' : '   MAL   ') + titulo + (detalle ? '  — ' + detalle : ''));
  hechas++;
  if (!condicion) fallos++;
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
  const correo = `prueba.muro.${etiqueta}.${sello}@ejemplo.invalid`;
  const clavePersonal = `Ficticia-${sello}-muro`;
  const nombre = `Persona Ficticia Del Muro ${etiqueta} ${sello}`;

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
    process.exit(1);
  }
  return { token, cuentaId, correo, nombre };
}

async function publicarAviso(token, quien, extra = {}) {
  return await rest('/rest/v1/avisos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      patient_name: quien,
      zone: 'Barrio Ficticio',
      description: 'Aviso ficticio de una prueba automática.',
      profession_required: 'cuidador_domiciliario',
      ...extra
    })
  }, token);
}

/* Qué ve una sesión de una tabla, y con qué Prestadora vienen esas filas. Se
   pregunta por `tenant_id` a propósito: contar filas no alcanza, porque las
   propias son legítimas y las que importan son las ajenas. */
async function filasQueVe(token, tabla) {
  const { cuerpo } = await rest('/rest/v1/' + tabla + '?select=id,tenant_id', {}, token);
  return Array.isArray(cuerpo) ? cuerpo : [];
}

const dondeEstaParada = async (token) => {
  const { cuerpo } = await rest('/rest/v1/rpc/prestadora_actual', { method: 'POST' }, token);
  return typeof cuerpo === 'string' ? cuerpo : null;
};

const miPerfil = async (token) => {
  const { cuerpo } = await rest('/rest/v1/rpc/mi_perfil', { method: 'POST' }, token);
  return Array.isArray(cuerpo) ? cuerpo : [];
};

const pararse = (token, slug) => rest('/rest/v1/rpc/pararse_en_prestadora', {
  method: 'POST', body: JSON.stringify({ p_nombre_corto: slug })
}, token);

const motivoDe = (respuesta) => {
  const c = respuesta.cuerpo;
  return (c && typeof c === 'object' && (c.message || c.msg)) || String(c || '');
};

// --- Las dos Prestadoras ficticias de la siembra ----------------------------
const UNA = await prestadora('presdemo');
const OTRA = await prestadora('cuidarnorte');
if (!UNA || !OTRA) {
  console.error('Hacen falta las dos Prestadoras ficticias de la siembra.');
  console.error('Con una sola, no ver nada de la otra no probaría nada.');
  process.exit(1);
}

console.log('El muro entre una Prestadora y la otra, atacado a propósito');
console.log('');

const cuentasParaBorrar = [];
const avisosParaBorrar = [];
const legajosParaBorrar = [];
const conversacionesParaBorrar = [];
const cuentasAlEmpezar = await cuantasCuentas();

async function limpiar() {
  for (const id of conversacionesParaBorrar) {
    await conServicio('/rest/v1/conversaciones?id=eq.' + id, { method: 'DELETE' });
  }
  for (const id of legajosParaBorrar) {
    await conServicio('/rest/v1/caregivers?id=eq.' + id, { method: 'DELETE' });
  }
  for (const id of avisosParaBorrar) {
    await conServicio('/rest/v1/avisos?id=eq.' + id, { method: 'DELETE' });
  }
  for (const id of cuentasParaBorrar) {
    await conServicio('/auth/v1/admin/users/' + id, { method: 'DELETE' });
  }
}

// --- Las dos cuentas, una de cada lado del muro -----------------------------
const aca = await cuentaFicticia(UNA, 'familiar', 'aca');
cuentasParaBorrar.push(aca.cuentaId);
const alla = await cuentaFicticia(OTRA, 'familiar', 'alla');
cuentasParaBorrar.push(alla.cuentaId);

// Cada una publica un aviso en la suya. Son el control positivo de todo lo que
// viene después: sin datos cargados del otro lado, no ver nada no prueba nada.
const avisoAca = await publicarAviso(aca.token, 'Paciente Ficticio De Este Lado');
const filaAca = Array.isArray(avisoAca.cuerpo) ? avisoAca.cuerpo[0] : null;
if (filaAca) avisosParaBorrar.push(filaAca.id);
const avisoAlla = await publicarAviso(alla.token, 'Paciente Ficticio Del Otro Lado');
const filaAlla = Array.isArray(avisoAlla.cuerpo) ? avisoAlla.cuerpo[0] : null;
if (filaAlla) avisosParaBorrar.push(filaAlla.id);

/* Y del lado de la vecina hay además un Asistente con legajo y una conversación
   abierta con él. No es adorno: sin una fila cargada, «no ve ninguna» en esas
   dos tablas lo cumpliría igual una política que niega todo, y la comprobación
   daría verde sin haber mirado nada. */
const asistenteAlla = await cuentaFicticia(OTRA, 'caregiver', 'asis');
cuentasParaBorrar.push(asistenteAlla.cuentaId);
const legajo = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: asistenteAlla.nombre,
    user_id: asistenteAlla.cuentaId,
    tenant_id: OTRA.id,
    profession: 'cuidador_domiciliario',
    documents: { dni: 'documentos-cuidadores/ficticio-dni.pdf' }
  })
}, asistenteAlla.token);
const filaLegajo = Array.isArray(legajo.cuerpo) ? legajo.cuerpo[0] : null;
if (filaLegajo) legajosParaBorrar.push(filaLegajo.id);

const canal = await rest('/rest/v1/conversaciones', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    caregiver_id: filaLegajo ? filaLegajo.id : null,
    aviso_id: filaAlla ? filaAlla.id : null
  })
}, alla.token);
const filaCanal = Array.isArray(canal.cuerpo) ? canal.cuerpo[0] : null;
if (filaCanal) conversacionesParaBorrar.push(filaCanal.id);

console.log('Las dos Prestadoras tienen datos cargados');
comprobar('cada cuenta publicó un aviso en la suya',
  !!filaAca && !!filaAlla && filaAca.tenant_id === UNA.id && filaAlla.tenant_id === OTRA.id,
  'respuestas ' + avisoAca.estado + ',' + avisoAlla.estado);
comprobar('y la vecina tiene además un legajo y una conversación abierta',
  !!filaLegajo && !!filaCanal,
  'respuestas ' + legajo.estado + ',' + canal.estado);
/* Cada fila se mira desde la sesión que sí tiene derecho a verla, que no es
   siempre la misma: el legajo lo ve su dueño y no la Familia —el directorio
   pide consentimiento y papeles comprobados—, y la conversación la ven las dos
   partes. Preguntárselo a la sesión equivocada daría cero y haría creer que la
   fila no está. */
comprobar('la Familia de la vecina ve su aviso y su conversación',
  (await filasQueVe(alla.token, 'avisos')).some((f) => f.id === (filaAlla || {}).id) &&
  (await filasQueVe(alla.token, 'conversaciones')).some((f) => f.id === (filaCanal || {}).id));
comprobar('y el Asistente de la vecina ve su legajo y esa misma conversación',
  (await filasQueVe(asistenteAlla.token, 'caregivers')).some((f) => f.id === (filaLegajo || {}).id) &&
  (await filasQueVe(asistenteAlla.token, 'conversaciones')).some((f) => f.id === (filaCanal || {}).id),
  'así que «cero» del otro lado va a querer decir negado, no vacío');
console.log('');

// --- 1 a 5. La Prestadora parada, atacada por los cinco caminos -------------
console.log('La Prestadora en la que la sesión está parada');

const mios = await rest('/rest/v1/prestadora_de_la_sesion?select=usuario_id,tenant_id', {}, aca.token);
const filasMias = Array.isArray(mios.cuerpo) ? mios.cuerpo : [];
comprobar('lee la suya, y una sola',
  filasMias.length === 1 && filasMias[0].usuario_id === aca.cuentaId
    && filasMias[0].tenant_id === UNA.id,
  filasMias.length + ' renglón(es)');

const ajeno = await rest('/rest/v1/prestadora_de_la_sesion?select=usuario_id,tenant_id' +
  '&usuario_id=eq.' + alla.cuentaId, {}, aca.token);
comprobar('no ve la de la otra cuenta, ni pidiéndola por su identificador',
  Array.isArray(ajeno.cuerpo) && ajeno.cuerpo.length === 0,
  'respuesta ' + ajeno.estado);

const creada = await rest('/rest/v1/prestadora_de_la_sesion', {
  method: 'POST',
  body: JSON.stringify({ usuario_id: aca.cuentaId, tenant_id: OTRA.id })
}, aca.token);
comprobar('no la puede crear apuntando a la Prestadora vecina',
  creada.estado >= 400, 'respuesta ' + creada.estado);

const cambiada = await rest('/rest/v1/prestadora_de_la_sesion?usuario_id=eq.' + aca.cuentaId, {
  method: 'PATCH',
  body: JSON.stringify({ tenant_id: OTRA.id })
}, aca.token);
const trasCambiar = await dondeEstaParada(aca.token);
comprobar('no la puede cambiar, y sigue parada donde estaba',
  cambiada.estado >= 400 && trasCambiar === UNA.id,
  'respuesta ' + cambiada.estado);

const borrada = await rest('/rest/v1/prestadora_de_la_sesion?usuario_id=eq.' + aca.cuentaId, {
  method: 'DELETE'
}, aca.token);
const trasBorrar = await rest('/rest/v1/prestadora_de_la_sesion?select=tenant_id', {}, aca.token);
comprobar('no la puede borrar, y el renglón sigue estando',
  borrada.estado >= 400 && Array.isArray(trasBorrar.cuerpo) && trasBorrar.cuerpo.length === 1,
  'respuesta ' + borrada.estado);

const sinFicha = await pararse(aca.token, OTRA.slug);
const trasIntentar = await dondeEstaParada(aca.token);
comprobar('no se para en una Prestadora donde no tiene ficha, y queda donde estaba',
  sinFicha.estado >= 400 && trasIntentar === UNA.id,
  'respuesta ' + sinFicha.estado);

const inexistente = await pararse(aca.token, 'prestadora-que-no-existe-ficticia');
comprobar('y el rechazo es el mismo que el de una Prestadora que no existe',
  motivoDe(sinFicha) === motivoDe(inexistente) && motivoDe(sinFicha) !== '',
  'los dos dicen lo mismo');
console.log('');
// --- 8 a 12. Después de los cinco intentos, ¿se abrió algo? -----------------
console.log('Después de los cinco intentos, qué alcanza a ver de la vecina');

for (const tabla of ['profiles', 'avisos', 'caregivers', 'conversaciones']) {
  const filas = await filasQueVe(aca.token, tabla);
  const ajenas = filas.filter((f) => f.tenant_id === OTRA.id);
  comprobar('ni una fila de la vecina en «' + tabla + '»',
    ajenas.length === 0,
    filas.length + ' fila(s) a la vista, ' + ajenas.length + ' de la vecina');
}

const filtrado = await rest('/rest/v1/avisos?select=id,tenant_id&tenant_id=eq.' + OTRA.id, {}, aca.token);
comprobar('pedir los avisos filtrando por la vecina sigue devolviendo cero',
  Array.isArray(filtrado.cuerpo) && filtrado.cuerpo.length === 0,
  'respuesta ' + filtrado.estado);

const conEncabezado = await rest('/rest/v1/avisos?select=id,tenant_id', {
  headers: { 'X-Tenant-Id': OTRA.id, 'X-Tenant-Slug': OTRA.slug, 'X-Prestadora': OTRA.slug }
}, aca.token);
const colados = Array.isArray(conEncabezado.cuerpo)
  ? conEncabezado.cuerpo.filter((f) => f.tenant_id === OTRA.id) : [];
comprobar('ni nombrándola en un encabezado inventado',
  colados.length === 0, 'respuesta ' + conEncabezado.estado);

const escrito = await publicarAviso(aca.token, 'Paciente Ficticio Del Intento', { tenant_id: OTRA.id });
const filaEscrita = Array.isArray(escrito.cuerpo) ? escrito.cuerpo[0] : null;
if (filaEscrita) avisosParaBorrar.push(filaEscrita.id);
comprobar('y escribirle la vecina al cuerpo no manda el dato para allá',
  escrito.estado >= 400 || (!!filaEscrita && filaEscrita.tenant_id === UNA.id),
  'respuesta ' + escrito.estado +
    (filaEscrita ? ', quedó en ' + (filaEscrita.tenant_id === UNA.id ? 'la suya' : 'la vecina') : ''));

const fichas = await miPerfil(aca.token);
comprobar('la ficha que la pantalla pide al arrancar es una sola, la de donde está parada',
  fichas.length === 1 && fichas[0].tenant_id === UNA.id,
  fichas.length + ' ficha(s)');
console.log('');

// --- 13 a 16. El alta legítima en la segunda no afloja nada ----------------
console.log('El alta en una segunda Prestadora, que sí está permitida');

const altaAlla = await rest('/rest/v1/rpc/registrarse_en_prestadora', {
  method: 'POST',
  body: JSON.stringify({
    p_nombre_corto: OTRA.slug, p_papel: 'coordinador', p_nombre: aca.nombre
  })
}, aca.token);
comprobar('se da de alta en la segunda desde la sesión que ya tiene',
  altaAlla.estado < 400, 'respuesta ' + altaAlla.estado);

const fichasDe = await conServicio('/rest/v1/profiles?select=tenant_id,role&id=eq.' + aca.cuentaId);
const enLaOtra = Array.isArray(fichasDe) ? fichasDe.find((f) => f.tenant_id === OTRA.id) : null;
comprobar('y pedir el papel del personal no se lo da: queda como Familia',
  !!enLaOtra && enLaOtra.role === 'familiar',
  enLaOtra ? 'quedó como ' + enLaOtra.role : 'no quedó ficha');

/* El control positivo tiene que ser un aviso **propio**, y no el de la cuenta
   vecina: adentro de una misma Prestadora una Familia tampoco ve los avisos de
   otra Familia, así que ese cero no diría nada del muro. Publica uno estando
   parada en la segunda y mira que vea ése y ninguno de la primera. */
const avisoSegunda = await publicarAviso(aca.token, 'Paciente Ficticio De La Segunda');
const filaSegunda = Array.isArray(avisoSegunda.cuerpo) ? avisoSegunda.cuerpo[0] : null;
if (filaSegunda) avisosParaBorrar.push(filaSegunda.id);
const desdeAlla = await filasQueVe(aca.token, 'avisos');
comprobar('parada en la segunda, lo que publica queda en la segunda',
  !!filaSegunda && filaSegunda.tenant_id === OTRA.id,
  'respuesta ' + avisoSegunda.estado);
comprobar('y desde ahí ve el suyo de la segunda y ninguno de la primera',
  desdeAlla.some((f) => f.id === (filaSegunda || {}).id) &&
  !desdeAlla.some((f) => f.tenant_id === UNA.id),
  desdeAlla.length + ' aviso(s) a la vista');

await pararse(aca.token, UNA.slug);
const desdeAca = await filasQueVe(aca.token, 'avisos');
comprobar('y vuelta a la primera, al revés: una por vez, siempre',
  desdeAca.some((f) => f.id === (filaAca || {}).id) &&
  !desdeAca.some((f) => f.tenant_id === OTRA.id),
  desdeAca.length + ' aviso(s) a la vista');

const esPersonal = async (token) => {
  const { cuerpo } = await rest('/rest/v1/rpc/es_personal_de_prestadora', { method: 'POST' }, token);
  return cuerpo === true;
};
const personalAca = await esPersonal(aca.token);
await pararse(aca.token, OTRA.slug);
const personalAlla = await esPersonal(aca.token);
await pararse(aca.token, UNA.slug);
comprobar('y no es personal de ninguna de las dos',
  personalAca === false && personalAlla === false);
console.log('');

// --- Limpieza ---------------------------------------------------------------
await limpiar();
const cuentasAlTerminar = await cuantasCuentas();
comprobar('la base queda con la misma cantidad de cuentas que tenía al empezar',
  cuentasAlEmpezar >= 0 && cuentasAlTerminar === cuentasAlEmpezar,
  cuentasAlEmpezar + ' antes, ' + cuentasAlTerminar + ' después');

console.log('');
if (fallos > 0) {
  console.error('El muro tiene ' + fallos + ' agujero(s) de ' + hechas + ' comprobación(es).');
  process.exit(1);
}
console.log('Pasaron las ' + hechas + ' del muro. La Prestadora en la que la sesión está');
console.log('parada no se crea, no se cambia y no se borra desde afuera; no se para donde');
console.log('no hay ficha, y el rechazo no dice en cuáles está; y ningún valor del pedido');
console.log('—filtro, encabezado o cuerpo— mueve el límite ni un renglón.');
