/* ===================================================
   MIDE QUÉ CONTESTA LA ENTRADA ANTE CADA CLASE DE DIRECCIÓN

       node scripts/medir_que_dice_la_entrada.mjs

   La regla de la empresa, en «Seguridad, privacidad y auditoría»: «En la
   entrada, el error no debe permitir distinguir "esa persona no existe" de
   "la clave está mal"». Este guion la mide en vez de suponerla.

   Prueba a entrar **con una contraseña equivocada** tres veces: con una
   dirección que no tiene cuenta, con una que tiene cuenta confirmada y con una
   que tiene cuenta sin confirmar. Si las tres respuestas son iguales, la regla
   se cumple. Si la tercera es distinta, entonces cualquiera que escriba una
   dirección se entera de que esa dirección tiene cuenta, que es exactamente lo
   que la regla prohíbe.

   Por qué hace falta medirlo y no leerlo. El servidor de cuentas puede revisar
   la confirmación **antes** o **después** de la contraseña, y de eso depende
   todo: si la revisa después, sólo se entera quien ya sabía la contraseña, y no
   hay filtración; si la revisa antes, alcanza con escribir cualquier cosa.
   Leyendo los archivos de este repositorio no se puede saber cuál de las dos
   hace, así que la única respuesta honesta es preguntárselo al servidor.

   **No escribe nada, salvo que se le pida.** Las tres pruebas son intentos de
   entrada fallidos y no cambian nada. Lo único que puede escribir es la cuenta sin
   confirmar que hace falta para medir la tercera clase, y sólo si se la pide con
   `--crear-la-que-falta`; **contra la base de esta máquina y ninguna otra**, porque
   antes de crearla mira que la dirección del servidor sea local y si no lo es se niega.
   La cuenta se llama como el residuo que barre `scripts/limpiar_cuentas_de_prueba.mjs`,
   así que se va con las demás el día que se barran.

   **No imprime ninguna clave ni ninguna dirección de correo**, ni siquiera
   tapada. Lee las claves del entorno local para poder llamar al servidor y no
   las muestra.

   Necesita la base de esta máquina levantada:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare

   Queda afuera de `verificar_todo.mjs` a propósito, igual que las pruebas:
   necesita la base, y el gancho de `commit` corre sin base y sin red.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Una contraseña que no es la de nadie. No se prueba ninguna verdadera: lo que
// se mide es qué contesta el servidor cuando la contraseña está mal.
const CLAVE_EQUIVOCADA = 'esta-no-es-la-contrasena-de-nadie-9f2b';
const SIN_CUENTA = 'no.tiene.cuenta.9f2b@ejemplo.invalid';

/* La cuenta sin confirmar que se crea cuando en la base no hay ninguna. El nombre
   sigue la convención de residuo de `limpiar_cuentas_de_prueba.mjs` —`prueba.`
   adelante y `@ejemplo.invalid` atrás—, para que se barra junto con las demás
   cuando llegue esa orden y no quede una cuenta huérfana que nadie sepa de dónde
   salió. Su contraseña no es la equivocada, porque si lo fuera la tercera prueba
   entraría en vez de fallar, y lo que se mide es qué contesta cuando falla. */
const SIN_CONFIRMAR = 'prueba.entrada.sin.confirmar@ejemplo.invalid';
const CLAVE_DE_ESA = 'clave-inventada-para-medir-la-entrada-4c7d';
const CREAR = process.argv.includes('--crear-la-que-falta');

function negarse(...renglones) {
  for (const r of renglones) console.error(r);
  process.exit(1);
}

/* Lee las direcciones y las claves del entorno local. El valor no sale de acá:
   se usa para llamar al servidor y nunca se imprime. */
function entornoLocal() {
  let salida;
  try {
    salida = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8', cwd: raiz, shell: true, stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch {
    negarse(
      'No se pudo leer el entorno de la base de esta máquina.',
      'Levantarla primero:',
      '',
      '    supabase start -x edge-runtime -x vector -x supavisor -x logflare'
    );
  }
  const mapa = new Map();
  for (const renglon of salida.split('\n')) {
    const corte = renglon.indexOf('=');
    if (corte === -1) continue;
    mapa.set(
      renglon.slice(0, corte).trim(),
      renglon.slice(corte + 1).trim().replace(/^"|"$/g, '')
    );
  }
  return mapa;
}

const env = entornoLocal();
const API = env.get('API_URL') || 'http://127.0.0.1:54321';
const ANON = env.get('ANON_KEY') || env.get('PUBLISHABLE_KEY');
const SERVICIO = env.get('SERVICE_ROLE_KEY') || env.get('SECRET_KEY');

if (!ANON || !SERVICIO) {
  negarse('El entorno local no trajo las dos claves que hacen falta para preguntar.');
}

/* Las cuentas que hay, para elegir una de cada clase. Se piden con la llave de
   servicio porque el listado no es público, y de cada una se usa sólo si tiene
   fecha de confirmación. Ninguna dirección se imprime. */
const listado = await fetch(`${API}/auth/v1/admin/users?per_page=1000`, {
  headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` }
}).then((r) => r.json()).catch(() => ({}));

const cuentas = Array.isArray(listado.users) ? listado.users : [];
if (!cuentas.length) {
  negarse(
    'La base de esta máquina no tiene ninguna cuenta, así que no hay nada que medir.',
    'Correr la siembra primero.'
  );
}

/* Una dirección del servidor de esta máquina y ninguna otra. Falla cerrado a
   propósito: ante una dirección que no entiende contesta que no, porque crear una
   cuenta contra un servidor publicado es justo lo que no tiene que poder pasar por
   descuido. */
function esDeEstaMaquina(direccion) {
  try {
    const nombre = new URL(direccion).hostname;
    return nombre === '127.0.0.1' || nombre === 'localhost' || nombre === '[::1]';
  } catch {
    return false;
  }
}

/* La tercera clase de dirección puede no estar en la base, y sin ella la medición
   queda a la mitad. Con `--crear-la-que-falta` se crea una. Se da de alta por la
   puerta común, con la llave pública, para que quede exactamente igual que la de
   cualquiera que se registra: si se creara con la llave de servicio nacería
   confirmada seguro.

   **Y aun así puede nacer confirmada**, que es lo que pasó el 31 de agosto de 2026:
   `supabase/config.toml` pide `enable_confirmations = true` y el servidor de esta
   máquina confirmó igual, porque el que está corriendo se levantó con otra
   configuración y `supabase start` la lee una sola vez, al arrancar. Cuando pasa,
   el guion lo dice y no lo esconde: dar por buena la tercera clase con una cuenta
   confirmada haría que las tres respuestas dieran iguales **por casualidad**, y esa
   es la peor manera de dar por buena una regla de seguridad. */
if (CREAR && !cuentas.some((u) => u.email && !u.email_confirmed_at)) {
  if (!esDeEstaMaquina(API)) {
    negarse(
      'Se pidió crear la cuenta que falta y el servidor no es el de esta máquina.',
      'No se crea ninguna cuenta contra un servidor publicado.'
    );
  }
  const alta = await fetch(`${API}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SIN_CONFIRMAR, password: CLAVE_DE_ESA })
  });
  if (!alta.ok) {
    negarse(
      'No se pudo crear la cuenta sin confirmar que falta para medir,',
      `y el servidor contestó ${alta.status}.`
    );
  }
  const otraVez = await fetch(`${API}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` }
  }).then((r) => r.json()).catch(() => ({}));
  cuentas.length = 0;
  cuentas.push(...(Array.isArray(otraVez.users) ? otraVez.users : []));
  console.log('Se creó una cuenta de prueba sin confirmar, que hacía falta para medir la');
  console.log('tercera clase. Queda entre el residuo que barre');
  console.log('`scripts/limpiar_cuentas_de_prueba.mjs`.');
  if (!cuentas.some((u) => u.email && !u.email_confirmed_at)) {
    console.log('');
    console.log('Pero nació **confirmada**, así que sigue faltando la tercera clase. El');
    console.log('servidor de esta máquina confirma solo, aunque `supabase/config.toml` pida');
    console.log('`enable_confirmations = true`: el que está corriendo se levantó con otra');
    console.log('configuración, y esa se lee una sola vez al arrancar. Para medir la tercera');
    console.log('clase hay que bajar y volver a levantar la base.');
  }
  console.log('');
}

const confirmadas = cuentas.filter((u) => u.email && u.email_confirmed_at);
const sinConfirmar = cuentas.filter((u) => u.email && !u.email_confirmed_at);

console.log(`Cuentas en la base de esta máquina: ${cuentas.length}`);
console.log(`  con el correo confirmado: ${confirmadas.length}`);
console.log(`  sin confirmar:            ${sinConfirmar.length}`);
console.log('');

async function intentarEntrar(correo) {
  const respuesta = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password: CLAVE_EQUIVOCADA })
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  const codigo = cuerpo.error_code || cuerpo.error || '';
  const mensaje = cuerpo.msg || cuerpo.error_description || cuerpo.message || '';
  return { estado: respuesta.status, codigo, mensaje, huella: `${respuesta.status} ${codigo} ${mensaje}` };
}

const casos = [
  { rotulo: 'una dirección sin cuenta', correo: SIN_CUENTA },
  {
    rotulo: 'una cuenta con el correo confirmado',
    correo: confirmadas.length ? confirmadas[0].email : null
  },
  {
    rotulo: 'una cuenta sin confirmar',
    correo: sinConfirmar.length ? sinConfirmar[0].email : null
  }
];

console.log('Con la contraseña equivocada, el servidor contesta:');
const huellas = [];
for (const caso of casos) {
  if (!caso.correo) {
    console.log(`  ${caso.rotulo.padEnd(38)} no hay ninguna en la base para medir`);
    continue;
  }
  const r = await intentarEntrar(caso.correo);
  console.log(`  ${caso.rotulo.padEnd(38)} ${r.estado} · ${r.codigo || '(sin código)'} · ${r.mensaje || '(sin mensaje)'}`);
  huellas.push({ rotulo: caso.rotulo, huella: r.huella });
}

console.log('');

if (huellas.length < 3) {
  console.log('No alcanzan las tres clases de dirección: la medición queda incompleta.');
  console.log('Falta al menos una cuenta de cada clase en la base de esta máquina.');
  process.exit(1);
}

const distintas = new Set(huellas.map((h) => h.huella));
if (distintas.size === 1) {
  console.log('Las tres respuestas son idénticas: desde la entrada no se puede averiguar');
  console.log('si una dirección tiene cuenta. La regla se cumple.');
  process.exit(0);
}

console.log('Las respuestas NO son todas iguales, así que la entrada deja averiguar');
console.log('si una dirección tiene cuenta, y la regla de la empresa lo prohíbe:');
console.log('«el error no debe permitir distinguir "esa persona no existe" de');
console.log('"la clave está mal"».');
console.log('');
console.log('Y el texto que ve la persona lo dice todavía más claro: la clave');
console.log('`error.correo_sin_confirmar` de `data/catalogo-frases.json` empieza por');
console.log('«La cuenta existe».');
process.exit(1);
