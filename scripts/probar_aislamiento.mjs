/* ===================================================
   LA PRUEBA DE AISLAMIENTO CON DOS PRESTADORAS

       node scripts/probar_aislamiento.mjs

   Contra la base local, que es donde conviene correrla porque no manda
   correos ni gasta cuota:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase db reset
       node scripts/probar_aislamiento.mjs --local

   Sin `--local` apunta al servidor que use la aplicación. Ojo con eso: el
   registro por correo del servidor remoto pide confirmar la casilla, así que
   ahí la prueba no llega a tener sesión.

   El CLAUDE.md §2 la pide con estas palabras: "una prueba que devuelve una
   lista vacía no distingue 'aislado' de 'todo bloqueado'". Así que esta no
   mira listas vacías: registra dos cuentas ficticias, una en cada Prestadora,
   les hace escribir su legajo, y recién entonces pregunta quién ve qué.

   Lo que comprueba, en orden:

     1. Registrarse crea la fila de `profiles`. Sin eso, `prestadora_actual()`
        devuelve nulo y con sesión no se ve nada.
     2. El rol que sale es el que la base decide, no el que pide quien se
        registra: se pide `coordinador` a propósito y tiene que salir otro.
     3. La Prestadora del perfil es la que se pidió, y existe.
     4. Nadie puede editarse el rol ni la Prestadora después.
     5. Sin legajo propio y sin ser personal, `caregivers` no devuelve nada.
     6. Cada cuenta puede crear su propio legajo.
     7. Y ve el suyo, uno solo.
     8. Sin legajo propio, no puede crear uno en la Prestadora ajena.
     9. No ve el legajo de la otra Prestadora.

   Y sobre los archivos (migración 0006), que son la otra mitad del legajo:

    10. Cada cuenta puede subir a su propia carpeta, en los dos depósitos.
    11. No puede subir a la carpeta de otra cuenta.
    12. No puede bajar el documento de la otra cuenta.
    13. Sin sesión no se baja nada del depósito privado.
    14. Sin sesión sí se ve la foto del público: si no, el directorio no tiene fotos.
    15. El personal de la Prestadora lee los documentos de su Prestadora.
    16. Y no los de la otra. (15 y 16 sólo con --local: hacen falta permisos de
        administración para ascender a alguien a coordinador, y la clave que los
        da existe únicamente en el entorno local.)

   Y sobre el directorio (migración 0007), que es lo único que se ve sin sesión:

    17. Un legajo validado, pero sin contestar el cierre del alta, no se muestra.
    18. Con la autorización en «no», tampoco.
    19. Con la autorización en «sí», recién ahí aparece.
    20. El directorio no devuelve ningún dato personal ni ningún camino del
        depósito privado. (17 a 20 también necesitan --local, por lo mismo:
        validar un legajo es trabajo del personal de la Prestadora.)

   Y sobre el examen (migración 0008), que es lo que acredita que alguien sabe
   cuidar:

    21. La respuesta correcta no se puede leer con sesión iniciada.
    22. Las opciones sí se leen, y llegan sin la respuesta adentro.
    23. Contestando mal, la base dice que no aprobó.
    24. Contestando bien, aprueba.
    25. Un intento aprobado no se puede escribir a mano.
    26. Cada quien ve sus intentos y ninguno de otra persona.
    27. Cuando se acaban los intentos, no deja rendir otra vez.

   Todo con datos inventados. No toca ni una fila que ya estuviera cargada, y
   borra lo que crea. No muestra ninguna clave: usa la publicable, que es la
   que ya viaja al navegador.
=================================================== */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let url, clave, claveServicio;

if (process.argv.includes('--local')) {
  // `supabase status -o env` imprime las direcciones y claves del entorno local.
  // Son las mismas para todo el mundo y no son secretas, pero igual se leen de
  // ahí y no se escriben acá: si cambian, la prueba sigue andando.
  const salida = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: raiz, encoding: 'utf8', shell: true
  });
  url   = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
  clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
  // La de servicio se usa para una sola cosa: ascender a coordinador a una
  // cuenta de prueba, que es la única forma de comprobar la política del
  // personal de la Prestadora. Nunca se imprime, y sólo existe acá: contra el
  // servidor remoto esas dos comprobaciones se saltean.
  claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];
} else {
  const fuente = readFileSync(join(raiz, 'js', 'apiClient.js'), 'utf8');
  url   = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
  clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
}

if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base ni su clave publicable.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');
console.log('Servidor: ' + new URL(url).hostname);
console.log('');

let fallos = 0;
function comprobar(titulo, condicion, detalle) {
  console.log((condicion ? '   bien  ' : '   MAL   ') + titulo + (detalle ? '  — ' + detalle : ''));
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

async function registrar(email, password, metadata) {
  const res = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: metadata })
  });
  return { estado: res.status, cuerpo: await res.json() };
}

async function entrar(email, password) {
  const res = await fetch(base + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { estado: res.status, cuerpo: await res.json() };
}

// --- Las dos Prestadoras ----------------------------------------------------
const { cuerpo: prestadoras } = await rest('/rest/v1/tenants?select=id,slug,name');
if (!Array.isArray(prestadoras) || prestadoras.length < 2) {
  console.error('Hacen falta al menos dos Prestadoras cargadas. Hay: ' +
    (Array.isArray(prestadoras) ? prestadoras.length : 0));
  process.exit(1);
}
const [A, B] = prestadoras;
console.log('Prestadora A: ' + A.slug + '   Prestadora B: ' + B.slug);
console.log('');

// --- Dos cuentas ficticias --------------------------------------------------
const sello = Date.now();
const cuentas = [];
for (const [etiqueta, prestadora] of [['A', A], ['B', B]]) {
  const email = `prueba.aislamiento.${etiqueta.toLowerCase()}.${sello}@ejemplo.invalid`;
  const password = `Ficticia-${sello}-${etiqueta}`;
  const alta = await registrar(email, password, {
    full_name: `Persona Ficticia ${etiqueta}`,
    tenant_slug: prestadora.slug,
    // A propósito: quien se registra pide el rol con acceso. Tiene que no dárselo.
    role: 'coordinador'
  });
  if (alta.estado >= 400) {
    console.error('No se pudo registrar la cuenta ficticia ' + etiqueta + ': ' +
      (alta.cuerpo.msg || alta.cuerpo.error_description || alta.estado));
    process.exit(1);
  }
  let token = alta.cuerpo.access_token;
  if (!token) {
    const sesion = await entrar(email, password);
    token = sesion.cuerpo.access_token;
  }
  if (!token) {
    console.error('La cuenta ' + etiqueta + ' se creó pero no devolvió sesión. ' +
      'Probablemente la base pide confirmar el correo.');
    process.exit(1);
  }
  cuentas.push({ etiqueta, email, token, prestadora, userId: alta.cuerpo.user?.id || alta.cuerpo.id });
}

// --- 1 a 4: el perfil -------------------------------------------------------
const otro = cuentas[0].prestadora.id === A.id ? B.id : A.id;

console.log('El perfil que crea el registro');
for (const c of cuentas) {
  const { cuerpo } = await rest('/rest/v1/profiles?select=id,tenant_id,role,full_name', {}, c.token);
  const perfil = Array.isArray(cuerpo) ? cuerpo[0] : null;
  comprobar(`${c.etiqueta}: existe la fila de profiles`, !!perfil);
  comprobar(`${c.etiqueta}: el rol pedido (coordinador) no se lo dieron`,
    perfil && perfil.role !== 'coordinador', perfil ? 'quedó ' + perfil.role : '');
  comprobar(`${c.etiqueta}: la Prestadora del perfil es la que pidió`,
    perfil && perfil.tenant_id === c.prestadora.id);
  c.perfil = perfil;
}

for (const c of cuentas) {
  const r = await rest('/rest/v1/profiles?id=eq.' + c.perfil.id, {
    method: 'PATCH', body: JSON.stringify({ role: 'coordinador' })
  }, c.token);
  const { cuerpo } = await rest('/rest/v1/profiles?select=role', {}, c.token);
  const rolAhora = Array.isArray(cuerpo) && cuerpo[0] ? cuerpo[0].role : null;
  comprobar(`${c.etiqueta}: no puede ascenderse a coordinador`,
    rolAhora !== 'coordinador', 'respuesta ' + r.estado + ', rol ' + rolAhora);
}

{
  const c = cuentas[0];
  await rest('/rest/v1/profiles?id=eq.' + c.perfil.id, {
    method: 'PATCH', body: JSON.stringify({ tenant_id: otro })
  }, c.token);
  const { cuerpo } = await rest('/rest/v1/profiles?select=tenant_id', {}, c.token);
  comprobar('A: no puede mudarse a la Prestadora ajena',
    Array.isArray(cuerpo) && cuerpo[0] && cuerpo[0].tenant_id === c.prestadora.id);
}

// --- 5: sin legajo y sin ser personal, no ve nada ---------------------------
console.log('');
console.log('Lo que ve quien todavía no cargó su legajo');
for (const c of cuentas) {
  const { cuerpo } = await rest('/rest/v1/caregivers?select=id,full_name', {}, c.token);
  comprobar(`${c.etiqueta}: caregivers no le devuelve nada`,
    Array.isArray(cuerpo) && cuerpo.length === 0,
    Array.isArray(cuerpo) ? cuerpo.length + ' filas' : JSON.stringify(cuerpo));
}

// El legajo ajeno se intenta ahora, sin legajo propio todavia: con uno ya
// cargado lo rechazaria el indice unico de `user_id` y no la politica, y la
// prueba pasaria sin haber probado nada.
{
  const c = cuentas[0];
  const r = await rest('/rest/v1/caregivers', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Legajo Intruso',
      user_id: c.userId,
      tenant_id: otro,
      profession: 'cuidador_domiciliario'
    })
  }, c.token);
  comprobar('A: no puede crear un legajo en la Prestadora ajena',
    r.estado >= 400, 'respuesta ' + r.estado);
}

// --- 6 a 9: cada quien con lo suyo ------------------------------------------
console.log('');
console.log('Cada cuenta crea su legajo');
for (const c of cuentas) {
  const r = await rest('/rest/v1/caregivers', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      full_name: 'Legajo Ficticio ' + c.etiqueta,
      user_id: c.userId,
      tenant_id: c.prestadora.id,
      profession: 'cuidador_domiciliario'
    })
  }, c.token);
  comprobar(`${c.etiqueta}: puede crear su propio legajo`,
    r.estado === 201 && Array.isArray(r.cuerpo) && r.cuerpo.length === 1,
    'respuesta ' + r.estado + (r.cuerpo && r.cuerpo.message ? ' — ' + r.cuerpo.message : ''));
  c.legajoId = Array.isArray(r.cuerpo) && r.cuerpo[0] ? r.cuerpo[0].id : null;
}

for (const c of cuentas) {
  const { cuerpo } = await rest('/rest/v1/caregivers?select=id,full_name,tenant_id', {}, c.token);
  comprobar(`${c.etiqueta}: ve exactamente un legajo, el suyo`,
    Array.isArray(cuerpo) && cuerpo.length === 1 && cuerpo[0].id === c.legajoId,
    Array.isArray(cuerpo) ? cuerpo.length + ' filas' : JSON.stringify(cuerpo));
}

console.log('');
console.log('El intento que tiene que fracasar');
{
  const c = cuentas[0];
  const ajeno = cuentas[1].legajoId;
  const { cuerpo } = await rest('/rest/v1/caregivers?select=id&id=eq.' + ajeno, {}, c.token);
  comprobar('A: no ve el legajo de B ni pidiéndolo por su identificador',
    Array.isArray(cuerpo) && cuerpo.length === 0,
    Array.isArray(cuerpo) ? cuerpo.length + ' filas' : JSON.stringify(cuerpo));
}

// --- 10 a 16: los archivos --------------------------------------------------
// Los papeles del legajo viven en dos depósitos (migración 0006), y el permiso
// sale de la primera carpeta del camino: tiene que ser la cuenta dueña. Acá se
// escribe primero y se pregunta después, igual que con las tablas.
console.log('');
console.log('Los archivos del legajo');

// Un PNG de un pixel. No hace falta que sea nada: lo que se prueba es quién
// puede escribirlo y quién leerlo, no qué tiene adentro.
const pngMinimo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

async function subir(bucket, camino, token) {
  const res = await fetch(base + '/storage/v1/object/' + bucket + '/' + camino, {
    method: 'POST',
    headers: { apikey: clave, Authorization: 'Bearer ' + token, 'Content-Type': 'image/png' },
    body: pngMinimo
  });
  return res.status;
}

async function bajar(bucket, camino, token) {
  const cabeceras = { apikey: clave };
  if (token) cabeceras.Authorization = 'Bearer ' + token;
  const res = await fetch(base + '/storage/v1/object/' + bucket + '/' + camino, { headers: cabeceras });
  return res.status;
}

for (const c of cuentas) {
  c.avatar = c.userId + '/foto_perfil.png';
  c.documento = c.userId + '/dni_frente.png';
  const foto = await subir('avatares', c.avatar, c.token);
  const doc  = await subir('documentos-cuidadores', c.documento, c.token);
  comprobar(`${c.etiqueta}: sube su foto y su documento a su propia carpeta`,
    foto === 200 && doc === 200, 'foto ' + foto + ', documento ' + doc);
}

{
  const [a, b] = cuentas;
  const enCarpetaAjena = await subir('avatares', b.userId + '/intruso.png', a.token);
  comprobar('A: no puede escribir en la carpeta de B',
    enCarpetaAjena >= 400, 'respuesta ' + enCarpetaAjena);

  const docAjeno = await bajar('documentos-cuidadores', b.documento, a.token);
  comprobar('A: no puede bajar el documento de B',
    docAjeno >= 400, 'respuesta ' + docAjeno);

  const sinSesion = await bajar('documentos-cuidadores', a.documento, null);
  comprobar('Sin sesión: el depósito de documentos no entrega nada',
    sinSesion >= 400, 'respuesta ' + sinSesion);

  const fotoPublica = await fetch(base + '/storage/v1/object/public/avatares/' + a.avatar);
  comprobar('Sin sesión: la foto del depósito público sí se ve',
    fotoPublica.status === 200, 'respuesta ' + fotoPublica.status);
}

// --- 15 y 16: el personal de la Prestadora ----------------------------------
// Ascender a alguien a coordinador es justo lo que la base no deja hacer desde
// una sesión común (comprobación 4). Hace falta la clave de administración, que
// esta prueba sólo tiene en el entorno local.
let coordinador = null;
if (claveServicio) {
  const email = `prueba.aislamiento.coord.${sello}@ejemplo.invalid`;
  const password = `Ficticia-${sello}-C`;
  const alta = await registrar(email, password, {
    full_name: 'Coordinadora Ficticia', tenant_slug: cuentas[0].prestadora.slug
  });
  const userId = alta.cuerpo.user?.id || alta.cuerpo.id;
  const ascenso = await fetch(base + '/rest/v1/profiles?id=eq.' + userId, {
    method: 'PATCH',
    headers: {
      apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
      'Content-Type': 'application/json', Prefer: 'return=representation'
    },
    body: JSON.stringify({ role: 'coordinador' })
  });
  if (ascenso.status < 300) {
    let token = alta.cuerpo.access_token;
    if (!token) token = (await entrar(email, password)).cuerpo.access_token;
    // El rol viaja adentro del token, así que después de ascender hay que pedir
    // uno nuevo: el de antes sigue diciendo lo que decía.
    coordinador = { email, password, userId, token };
  }
}

if (!coordinador) {
  console.log('   (salteadas) las dos de personal de la Prestadora: hacen falta permisos');
  console.log('               de administración, que sólo están en el entorno local.');
} else {
  const [a, b] = cuentas;
  const propio = await bajar('documentos-cuidadores', a.documento, coordinador.token);
  comprobar('El personal de la Prestadora A lee el documento de A',
    propio === 200, 'respuesta ' + propio);

  const ajeno = await bajar('documentos-cuidadores', b.documento, coordinador.token);
  comprobar('El personal de la Prestadora A no lee el documento de B',
    ajeno >= 400, 'respuesta ' + ajeno);
}

// --- 17 a 20: el directorio -------------------------------------------------
// El directorio es la única puerta que se abre sin sesión, así que acá se pregunta
// con la clave pública y nada más. Dos condiciones tienen que cumplirse a la vez
// para aparecer: que la Prestadora haya validado el legajo, y que la persona haya
// dicho que sí. Se prueban por separado, porque una sola de las dos no alcanza.
console.log('');
console.log('El directorio');

if (!coordinador) {
  console.log('   (salteadas) las cuatro del directorio: validar un legajo es trabajo del');
  console.log('               personal de la Prestadora, y esa cuenta sólo existe en local.');
} else {
  const a = cuentas[0];

  // Validar el legajo. Es lo que hoy alcanzaba para publicarlo, y ya no.
  await rest('/rest/v1/caregivers?id=eq.' + a.legajoId, {
    method: 'PATCH',
    body: JSON.stringify({ verification_status: 'validado_prestadora' })
  }, coordinador.token);

  const enDirectorio = async () => {
    const { cuerpo } = await rest('/rest/v1/directorio?select=id&id=eq.' + a.legajoId);
    return Array.isArray(cuerpo) && cuerpo.length === 1;
  };

  const sinContestar = await enDirectorio();
  comprobar('Validado pero sin contestar: el directorio no lo muestra',
    sinContestar === false, sinContestar ? 'aparece igual' : 'no aparece');

  const autorizar = async publicado => rest('/rest/v1/autorizaciones_asistente', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      caregiver_id: a.legajoId, tenant_id: a.prestadora.id,
      perfil_publicado: publicado, respondido_el: new Date().toISOString()
    })
  }, a.token);

  await autorizar(false);
  const dijoQueNo = await enDirectorio();
  comprobar('Contestó que no: el directorio tampoco lo muestra',
    dijoQueNo === false, dijoQueNo ? 'aparece igual' : 'no aparece');

  await autorizar(true);
  const dijoQueSi = await enDirectorio();
  comprobar('Contestó que sí: recién ahí aparece en el directorio',
    dijoQueSi === true, dijoQueSi ? 'aparece' : 'no aparece');

  const { cuerpo: fila } = await rest('/rest/v1/directorio?id=eq.' + a.legajoId);
  const columnas = Array.isArray(fila) && fila[0] ? Object.keys(fila[0]) : [];
  const prohibidas = ['dni', 'phone', 'email', 'address', 'bank_info', 'cuit',
                      'documents', 'birthdate', 'reference_info', 'education_info'];
  const filtradas = prohibidas.filter(k => columnas.includes(k));
  comprobar('El directorio no devuelve ningún dato personal',
    filtradas.length === 0,
    filtradas.length ? 'devuelve ' + filtradas.join(', ') : columnas.length + ' columnas, ninguna personal');
}

// --- 21 a 27: el examen -----------------------------------------------------
// Un examen sirve si es imposible aprobarlo sin saber la respuesta. Eso son
// tres cosas separadas, y acá se prueban las tres: que la respuesta correcta no
// salga de la base, que la corrección la haga la base, y que el resultado no se
// pueda escribir a mano.
//
// Las claves de las respuestas buenas —`fowler`, `trendelenburg`— están puestas
// acá a mano, sacadas de la migración 0008. No hay otra forma: si la prueba
// pudiera averiguarlas preguntándole a la base, el examen ya estaría roto.
console.log('');
console.log('El examen');

const asistente = cuentas[0];
const otroAsistente = cuentas[1];

const { cuerpo: evaluaciones } = await rest(
  '/rest/v1/evaluaciones?select=id,clave,porcentaje_para_aprobar' +
  '&clave=eq.gerontologico_primeros_auxilios', {}, asistente.token);
const evaluacion = Array.isArray(evaluaciones) ? evaluaciones[0] : null;

const { cuerpo: preguntas } = evaluacion
  ? await rest('/rest/v1/preguntas_evaluacion?select=id,clave&order=orden' +
               '&evaluacion_id=eq.' + evaluacion.id, {}, asistente.token)
  : { cuerpo: null };

if (!evaluacion || !Array.isArray(preguntas) || preguntas.length !== 2) {
  comprobar('La evaluación de muestra está cargada con sus dos preguntas', false,
    evaluacion ? 'preguntas: ' + (Array.isArray(preguntas) ? preguntas.length : 'ninguna')
               : 'no se encontró la evaluación');
} else {
  const cruda = await rest('/rest/v1/opciones_pregunta?select=*', {}, asistente.token);
  comprobar('La tabla con la respuesta correcta no se lee ni con sesión',
    cruda.estado >= 400, 'devolvió ' + cruda.estado);

  const { cuerpo: opciones } = await rest(
    '/rest/v1/opciones_para_responder?select=*', {}, asistente.token);
  const listaOpciones = Array.isArray(opciones) ? opciones : [];
  const seFiltro = listaOpciones.some(o => 'es_correcta' in o);
  comprobar('Las opciones llegan sin la respuesta correcta adentro',
    listaOpciones.length > 0 && !seFiltro,
    seFiltro ? 'la vista devuelve es_correcta'
             : listaOpciones.length + ' opciones, ninguna con la respuesta');

  // Arma el objeto que espera la función: identificador de pregunta →
  // identificador de la opción elegida.
  const respuestasCon = (primera, segunda) => {
    const elegida = (preguntaClave, opcionClave) => {
      const pregunta = preguntas.find(x => x.clave === preguntaClave);
      const opcion = listaOpciones.find(o => o.pregunta_id === pregunta.id && o.clave === opcionClave);
      return [pregunta.id, opcion ? opcion.id : null];
    };
    const [p1, o1] = elegida('posicion_alimentacion', primera);
    const [p2, o2] = elegida('baja_presion', segunda);
    const armado = {};
    armado[p1] = o1;
    armado[p2] = o2;
    return armado;
  };

  const rendir = async (respuestas, token) => rest('/rest/v1/rpc/rendir_evaluacion', {
    method: 'POST',
    body: JSON.stringify({ p_evaluacion: evaluacion.id, p_respuestas: respuestas })
  }, token);

  const mal = await rendir(respuestasCon('acostado', 'caminar'), asistente.token);
  comprobar('Contestando mal, la base dice que no aprobó',
    mal.cuerpo && mal.cuerpo.aprobado === false && mal.cuerpo.porcentaje === 0,
    mal.cuerpo && typeof mal.cuerpo.porcentaje === 'number'
      ? 'porcentaje ' + mal.cuerpo.porcentaje : 'estado ' + mal.estado);

  const bien = await rendir(respuestasCon('fowler', 'trendelenburg'), asistente.token);
  comprobar('Contestando bien, aprueba',
    bien.cuerpo && bien.cuerpo.aprobado === true && bien.cuerpo.porcentaje === 100,
    bien.cuerpo && typeof bien.cuerpo.porcentaje === 'number'
      ? 'porcentaje ' + bien.cuerpo.porcentaje : 'estado ' + bien.estado);

  const aMano = await rest('/rest/v1/intentos_evaluacion', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: asistente.prestadora.id, caregiver_id: asistente.legajoId,
      evaluacion_id: evaluacion.id, respuestas: {}, respuestas_correctas: 2,
      preguntas_totales: 2, porcentaje: 100, aprobado: true
    })
  }, asistente.token);
  comprobar('Un intento aprobado no se puede escribir a mano',
    aMano.estado >= 400, 'devolvió ' + aMano.estado);

  const { cuerpo: propios } = await rest('/rest/v1/intentos_evaluacion?select=id', {}, asistente.token);
  const { cuerpo: ajenos } = await rest('/rest/v1/intentos_evaluacion?select=id', {}, otroAsistente.token);
  const cuentaPropios = Array.isArray(propios) ? propios.length : -1;
  const cuentaAjenos = Array.isArray(ajenos) ? ajenos.length : -1;
  comprobar('Cada quien ve sus intentos y ninguno de otra persona',
    cuentaPropios === 2 && cuentaAjenos === 0,
    'el que rindió ve ' + cuentaPropios + ', el otro ve ' + cuentaAjenos);

  // El tope de la evaluación de muestra son tres. Van dos rendidos: se gasta el
  // tercero y el cuarto tiene que rebotar, aunque venga con todo bien.
  await rendir(respuestasCon('acostado', 'caminar'), asistente.token);
  const cuarto = await rendir(respuestasCon('fowler', 'trendelenburg'), asistente.token);
  comprobar('Gastados los tres intentos, no deja rendir otra vez',
    cuarto.estado >= 400, 'devolvió ' + cuarto.estado);
}

// --- Limpieza ---------------------------------------------------------------
console.log('');
for (const c of cuentas) {
  if (c.legajoId) {
    await rest('/rest/v1/caregivers?id=eq.' + c.legajoId, { method: 'DELETE' }, c.token);
  }
  for (const [bucket, camino] of [['avatares', c.avatar], ['documentos-cuidadores', c.documento],
                                  ['avatares', c.userId + '/intruso.png']]) {
    if (!camino) continue;
    await fetch(base + '/storage/v1/object/' + bucket + '/' + camino, {
      method: 'DELETE',
      headers: { apikey: clave, Authorization: 'Bearer ' + c.token }
    });
  }
}
const { cuerpo: quedan } = await rest('/rest/v1/directorio?select=id&full_name=like.Legajo Ficticio*');
console.log('Legajos de prueba borrados. Quedan visibles en el directorio: ' +
  (Array.isArray(quedan) ? quedan.length : '?'));
console.log('Las cuentas ficticias quedan en auth.users: se borran con el resto de los datos');
console.log('de personas antes de producción. Todas tienen el correo @ejemplo.invalid, que es');
console.log('un dominio que por norma no existe: no le llegó ni le puede llegar nada a nadie.');

console.log('');
if (fallos === 0) {
  console.log('Pasaron todas. El límite lo pone la sesión: vale para las tablas, para los');
  console.log('archivos y para el directorio, que además exige que la persona haya dicho que sí.');
  console.log('Y el examen lo corrige la base: la respuesta correcta nunca sale de ahí.');
} else {
  console.log(fallos + ' comprobación(es) fallaron. El aislamiento NO está.');
  process.exitCode = 1;
}
