/* ===================================================
   SUBIR DOS VECES EL MISMO PAPEL BORRA EL PRIMERO

       node scripts/probar_pisado_de_archivos.mjs

   Contra la base de esta máquina. Si no está levantada, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. El pendiente 89. `Sesion.uploadFile` sube con `upsert: true`
   (`js/auth.js:182`) y las dos puntas que la llaman arman el camino del
   archivo con datos que no cambian —la cuenta y el tipo de papel
   (`registrar-asistente.html:1012`), o la cuenta y la posición en la lista
   (`js/fichas-legajo.js:307`)—. Las dos cosas juntas hacen que subir de nuevo
   un papel **borre el anterior**, sin preguntar y sin dejar rastro.

   POR QUÉ IMPORTA MÁS DE LO QUE PARECE. El papel que se pisa puede ser el que
   la Prestadora miró para sellar el legajo. El sello queda apoyado en un
   archivo que ya no existe, y nadie se entera: no hay `DELETE` en ningún lado
   del proyecto, así que ningún rastro que busque borrados va a ver éste.

   ── Cuándo se pone en verde ───────────────────────────────────────────────

   El pendiente 89 tiene tres salidas y el Desarrollador todavía no eligió.
   Esta prueba está escrita para no depender de cuál se elija: mira **las dos
   causas por separado**, y con que se corte una alcanza.

   · La causa A, medida contra la base: con las opciones de hoy, ¿el archivo
     que ya estaba sobrevive a una segunda subida al mismo camino? Se pone en
     verde si se prohíbe pisar —la segunda subida vuelve rechazada— o si el
     archivo viejo se sigue pudiendo bajar.
   · La causa B, leída del código: ¿el camino que arma cada punta es siempre
     el mismo? Se pone en verde si el camino pasa a llevar algo que cambia
     —la fecha, un identificador— y entonces la segunda subida cae en otro
     lado y no pisa nada.

   La prueba entera pasa **si alguna de las dos está cortada**. Hoy no lo está
   ninguna, y por eso da rojo: es el pendiente 89 y tiene que dar rojo hasta
   que se arregle.

   ── Lo que acá no se mide ─────────────────────────────────────────────────

   La tercera salida —que el depósito guarde versiones— no se mide desde acá:
   la versión anterior no está en ningún camino que se pueda pedir, hay que
   preguntarle al depósito por su historia. Si se elige ésa, esta prueba hay
   que reescribirla, y va a seguir dando rojo hasta que se haga. Se dice acá
   para que el rojo no se lea como «no se arregló».

   No deja nada atrás: los archivos ficticios y la cuenta se borran al final.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !clave || !claveServicio) {
  console.error('No se pudo averiguar la dirección de la base local ni sus claves.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');
const deposito = 'documentos-cuidadores';
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

/* ── La causa B: el camino, leído del código ───────────────────────────────

   No se mide contra la base: se mide leyendo las tres puntas. Y si alguna
   deja de encontrarse, esto **no** se da por bueno: se declara la prueba
   inservible. Un chequeo que no encuentra lo que busca y sigue adelante
   escribe su «bien» sin haber mirado nada. */

const fuentes = {
  'js/auth.js':
    /async uploadFile\s*\([^)]*\)\s*\{[\s\S]{0,400}?upsert:\s*(true|false)/,
  'registrar-asistente.html':
    /await Sesion\.uploadFile\(\s*\n?\s*adj\.deposito,\s*`([^`]+)`/,
  'js/fichas-legajo.js':
    /await Sesion\.uploadFile\(\s*\n?\s*deposito,\s*`([^`]+)`/
};

const encontrado = {};
for (const [archivo, patron] of Object.entries(fuentes)) {
  const texto = readFileSync(join(raiz, archivo), 'utf8');
  const m = texto.match(patron);
  encontrado[archivo] = m ? m[1] : null;
}

console.log('La causa B: cómo se arma el camino del archivo');

sostener('las tres puntas se encontraron en el código',
  Object.values(encontrado).every((v) => v !== null),
  Object.entries(encontrado).filter(([, v]) => v === null).map(([a]) => a).join(', ') ||
  'auth.js, registrar-asistente.html y fichas-legajo.js');

/* Un camino deja de pisar cuando lleva adentro algo que cambia entre una
   subida y la siguiente. Se buscan las formas de decirlo que alguien podría
   usar; la lista se amplía si aparece otra. */
const CAMBIA = /Date\.now|randomUUID|crypto|uuid|fecha|timestamp|Math\.random|sello/i;

const caminos = {
  'registrar-asistente.html': encontrado['registrar-asistente.html'],
  'js/fichas-legajo.js': encontrado['js/fichas-legajo.js']
};

let algunCaminoCambia = false;
for (const [archivo, plantilla] of Object.entries(caminos)) {
  if (plantilla === null) continue;
  const cambia = CAMBIA.test(plantilla);
  if (cambia) algunCaminoCambia = true;
  console.log('     ' + archivo + ':  ' + plantilla + (cambia ? '   (cambia)' : '   (siempre el mismo)'));
}

const upsert = encontrado['js/auth.js'];

/* La causa B está cortada cuando **ninguna** punta arma siempre el mismo
   camino. Con que quede una sin arreglar, el papel se sigue pisando por ahí,
   y entonces esta causa no está cortada. */
const causaBCortada = algunCaminoCambia &&
  Object.values(caminos).every((p) => p === null || CAMBIA.test(p));

console.log('     → la causa B ' + (causaBCortada ? 'está cortada' : 'sigue abierta'));

/* ── La causa A: qué pasa de verdad contra la base ─────────────────────── */

console.log('');
console.log('La causa A: subir dos veces al mismo camino');
console.log('     js/auth.js sube con upsert: ' + upsert);

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

const { cuerpo: prestadoras } = await rest('/rest/v1/rpc/prestadora_por_slug', {
  method: 'POST', body: JSON.stringify({ p_slug: 'presdemo' })
});
const P = Array.isArray(prestadoras) && prestadoras.length === 1 ? prestadoras[0] : null;
if (!P) {
  console.error('Hace falta la Prestadora ficticia `presdemo` de la migración 0003.');
  process.exit(1);
}

const sello = Date.now();
const email = 'prueba.pisado.' + sello + '@ejemplo.invalid';
const password = 'Ficticia-' + sello + '-pisado';

const alta = await fetch(base + '/auth/v1/signup', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email, password,
    data: { full_name: 'Persona Ficticia Pisado ' + sello, tenant_slug: P.slug, role: 'caregiver' }
  })
}).then((r) => r.json());

const token = alta.access_token;
const uid = alta.user ? alta.user.id : alta.id;
if (!token || !uid) {
  console.error('No se pudo crear la cuenta ficticia. Contra el servidor remoto pasa:');
  console.error('ahí el alta pide confirmar el correo.');
  process.exit(1);
}

/* Los depósitos aceptan sólo imágenes y PDF (migración 0006), así que los
   papeles inventados se declaran PDF. Adentro llevan un texto distinto cada
   uno: es lo que después permite saber cuál de los dos quedó. */
const papel = (que) => new TextEncoder().encode('%PDF-1.4\n% ' + que + ' ' + sello + '\n');

async function subir(camino, contenido, pisar) {
  const res = await fetch(base + '/storage/v1/object/' + deposito + '/' + camino, {
    method: 'POST',
    headers: {
      apikey: clave,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/pdf',
      ...(pisar ? { 'x-upsert': 'true' } : {})
    },
    body: contenido
  });
  return { estado: res.status, texto: await res.text() };
}

async function bajar(camino) {
  const res = await fetch(base + '/storage/v1/object/' + deposito + '/' + camino, {
    headers: { apikey: clave, Authorization: 'Bearer ' + token }
  });
  return { estado: res.status, texto: res.ok ? await res.text() : null };
}

const pisa = upsert === 'true';

// --- 1. El mismo papel, dos veces ------------------------------------------
const caminoUno = uid + '/matricula.pdf';

const primera = await subir(caminoUno, papel('papel viejo'), pisa);
const traePrimera = await bajar(caminoUno);

sostener('el primer papel sube y se puede bajar',
  primera.estado < 300 && traePrimera.estado === 200 &&
  (traePrimera.texto || '').includes('papel viejo'),
  'subida ' + primera.estado + ', bajada ' + traePrimera.estado);

const segunda = await subir(caminoUno, papel('papel nuevo'), pisa);
const traeSegunda = await bajar(caminoUno);

const rechazada = segunda.estado >= 400;
const viejoSigue = (traeSegunda.texto || '').includes('papel viejo');

comprobar('el papel viejo no desaparece cuando se sube otro papel',
  causaBCortada || rechazada || viejoSigue,
  causaBCortada
    ? 'el camino ya no es siempre el mismo, así que la segunda subida cae en otro lado'
    : rechazada
      ? 'la segunda subida vino rechazada (' + segunda.estado + ')'
      : 'la segunda subida salió bien (' + segunda.estado + ') y ahora ahí hay «' +
        ((traeSegunda.texto || '').match(/% ([a-z ]+) \d+/) || [, '¿?'])[1] + '»');

// --- 2. Borrar una fila del medio corre los caminos -------------------------
// Sin volver a subir el mismo papel: alcanza con que la persona saque una
// matrícula de la lista y guarde. `fichas-legajo.js` numera por posición, así
// que lo que era la fila 1 pasa a escribirse en el camino de la fila 0.
console.log('');
console.log('Y sin subir dos veces el mismo papel: sacar una fila de la lista');

const camino0 = uid + '/matriculas_0.pdf';
const camino1 = uid + '/matriculas_1.pdf';

await subir(camino0, papel('matricula de enfermeria'), pisa);
await subir(camino1, papel('matricula de acompaniante'), pisa);

const antes0 = await bajar(camino0);
sostener('las dos matrículas suben y se distinguen',
  (antes0.texto || '').includes('matricula de enfermeria'),
  'en la posición 0 hay «' + ((antes0.texto || '').match(/% ([a-z ]+) \d+/) || [, '¿?'])[1] + '»');

// La persona borra la primera matrícula y guarda: la que era la 1 se guarda
// ahora en la posición 0.
const reguardado = await subir(camino0, papel('matricula de acompaniante'), pisa);
const despues0 = await bajar(camino0);

comprobar('sacar una fila de la lista no borra el papel de otra fila',
  causaBCortada || reguardado.estado >= 400 ||
  (despues0.texto || '').includes('matricula de enfermeria'),
  causaBCortada
    ? 'el camino ya no es siempre el mismo, así que el guardado cae en otro lado'
    : reguardado.estado >= 400
      ? 'el guardado vino rechazado (' + reguardado.estado + ')'
      : 'en la posición 0 quedó «' +
        ((despues0.texto || '').match(/% ([a-z ]+) \d+/) || [, '¿?'])[1] + '», y la de enfermería no está en ningún lado');

// El huérfano no es una comprobación aparte: es la otra mitad del mismo
// desorden, y se informa para que no haya que descubrirlo dos veces.
const quedo1 = await bajar(camino1);
if (quedo1.estado === 200) {
  console.log('     Además queda un archivo suelto en ' + camino1.split('/')[1] +
    ': ninguna fila lo nombra ya, y nada lo borra.');
}

// --- Limpieza ---------------------------------------------------------------
for (const camino of [caminoUno, camino0, camino1]) {
  await fetch(base + '/storage/v1/object/' + deposito + '/' + camino, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
}

const { cuerpo: sobrantes } = await (async () => {
  const res = await fetch(base + '/storage/v1/object/list/' + deposito, {
    method: 'POST',
    headers: {
      apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefix: uid, limit: 100 })
  });
  return { cuerpo: await res.json().catch(() => []) };
})();

await fetch(base + '/auth/v1/admin/users/' + uid, {
  method: 'DELETE',
  headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
});

const sobran = Array.isArray(sobrantes) ? sobrantes.length : 0;
console.log('');
console.log(sobran === 0
  ? 'Limpieza: los archivos ficticios y la cuenta se borraron.'
  : 'ATENCIÓN: quedaron ' + sobran + ' archivos ficticios en el depósito. Hay que borrarlos a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: alguna comprobación de');
  console.log('sostén salió al revés de lo esperado, así que un rojo de arriba podría');
  console.log('venir de que el archivo no subió, y no de que se haya pisado. Antes de');
  console.log('leer los resultados hay que averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('Un papel que ya estaba no lo borra otra subida.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Es el pendiente 89: el papel anterior desaparece sin aviso, y puede ser el');
console.log('que la Prestadora miró para sellar el legajo. Las tres salidas están');
console.log('escritas en docs/PENDIENTES.md y hay que elegir una.');
process.exit(1);
