/* ===================================================
   MIDE QUÉ CONTESTA LA ENTRADA ANTE CADA CLASE DE DIRECCIÓN

       node scripts/medir_que_dice_la_entrada.mjs

   La regla de la empresa, en «Seguridad, privacidad y auditoría»: «En la
   entrada, el error no debe permitir distinguir "esa persona no existe" de
   "la clave está mal"». Este guion la mide en vez de suponerla.

   Prueba a entrar **con una contraseña equivocada** tres veces: con una
   dirección que no tiene cuenta, con una que tiene cuenta confirmada y con una
   que tiene cuenta sin confirmar. Y mira **las dos cosas que recibe la persona**:
   qué dice la respuesta y cuánto tarda en llegar. La regla se cumple sólo si las
   tres son iguales en las dos. Si alguna se distingue por cualquiera de las dos,
   entonces cualquiera que escriba una dirección se entera de que esa dirección
   tiene cuenta, que es exactamente lo que la regla prohíbe.

   **El reloj es una respuesta más, aunque no se lea.** El servidor de cuentas
   sólo revuelve la contraseña cuando la dirección existe, y revolverla cuesta;
   cuando no existe contesta enseguida. Así que puede decir la misma frase letra
   por letra y separar igual a las direcciones registradas de las demás, sin decir
   una palabra. Medir sólo el texto es una prueba que por ese lado no puede
   fallar, y por eso acá se miden los dos.

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
import { readFileSync } from 'node:fs';
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

/* Le saca la confirmación a una cuenta de esta máquina, escribiendo en la base por
   dentro del contenedor. Va por `docker exec` y no por la dirección de la base para no
   tener que pasar ninguna contraseña por ningún lado. El nombre del contenedor sale
   del `project_id` del archivo de configuración, que es de donde lo saca el CLI. */
function dejarlaSinConfirmar(correo) {
  const config = readFileSync(join(raiz, 'supabase', 'config.toml'), 'utf8');
  const proyecto = (config.match(/^project_id\s*=\s*"([^"]+)"/m) || [])[1];
  if (!proyecto) return false;
  try {
    execFileSync('docker', [
      'exec', `supabase_db_${proyecto}`,
      'psql', '-U', 'postgres', '-d', 'postgres', '-tAc',
      `update auth.users set email_confirmed_at = null where email = '${correo}';`
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

/* La tercera clase de dirección puede no estar en la base, y sin ella la medición
   queda a la mitad. Con `--crear-la-que-falta` se crea una. Se da de alta por la
   puerta común, con la llave pública, para que quede exactamente igual que la de
   cualquiera que se registra: si se creara con la llave de servicio nacería
   confirmada seguro.

   **Y nace confirmada**, aunque `supabase/config.toml:253` pida
   `enable_confirmations = true`. La causa quedó medida el 31 de agosto de 2026, y no
   es la que decía antes este comentario: el servidor de autenticación de esta
   máquina **se creó el 2026-08-24** y el archivo de configuración cambió el
   2026-08-25, y las variables de un contenedor quedan fijadas **cuando se lo crea**,
   no cuando se lo enciende. Por eso bajar y volver a levantar la base no alcanzó
   —eso lo enciende de nuevo, no lo crea de nuevo— y `/auth/v1/settings` del servidor
   de esta máquina sigue contestando `mailer_autoconfirm: true`.

   Recrearlo pondría de acuerdo a los dos, pero apagaría la confirmación automática
   para todas las demás pruebas, que hoy se apoyan en ella para entrar con las
   cuentas que crean. Ese trabajo es aparte y está anotado como pendiente 123; el 21,
   que se cerró el 24 de agosto de 2026, es el que dejó el archivo diciendo la verdad
   del servidor publicado.

   Así que el guion hace lo único que no le mueve el piso a nadie más: **le saca la
   confirmación a la cuenta que acaba de crear**, escribiendo en la base de esta
   máquina. No es un simulacro —el servidor decide qué contestar mirando esa misma
   columna—, la cuenta es inventada, y la barre después
   `scripts/limpiar_cuentas_de_prueba.mjs`. Si ni así queda sin confirmar, el guion lo
   dice y no lo esconde: dar por buena la tercera clase con una cuenta confirmada
   haría que las tres respuestas dieran iguales **por casualidad**, y esa es la peor
   manera de dar por buena una regla de seguridad. */
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
    console.log('Nació **confirmada**, porque el servidor de esta máquina confirma solo: se');
    console.log('creó antes que el renglón 253 de `supabase/config.toml` y las variables de un');
    console.log('contenedor quedan fijadas al crearlo. Se le saca la confirmación a esa');
    console.log('cuenta, escribiendo en la base de esta máquina.');
    if (!dejarlaSinConfirmar(SIN_CONFIRMAR)) {
      negarse(
        'No se pudo dejar sin confirmar la cuenta que se acaba de crear,',
        'así que la tercera clase sigue faltando y la medición queda a la mitad.'
      );
    }
    const tercera = await fetch(`${API}/auth/v1/admin/users?per_page=1000`, {
      headers: { apikey: SERVICIO, Authorization: `Bearer ${SERVICIO}` }
    }).then((r) => r.json()).catch(() => ({}));
    cuentas.length = 0;
    cuentas.push(...(Array.isArray(tercera.users) ? tercera.users : []));
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

/* ── La segunda respuesta: cuánto tarda ────────────────────────────────
   Hasta acá se comparó lo que dice. Falta lo que tarda, que es la otra mitad de lo
   que la persona recibe y no está escrito en ninguna pantalla.

   Se cronometra **intercalando** las tres clases —una de cada una, y otra vuelta—
   para que un tirón de la máquina caiga sobre las tres por igual y no se lo confunda
   con una diferencia del servidor. La primera vuelta se descarta, porque carga además
   con abrir la conexión.

   El veredicto no mira promedios: mira si los recorridos **se solapan**. Si el intento
   más lento de una clase sigue siendo más rápido que el más veloz de otra, entonces
   con un solo intento y un cronómetro alcanza para saber de cuál se trata, y no hace
   falta ninguna astucia estadística para aprovecharlo. */

const VUELTAS = 12;

async function cronometrarEntrada(correo) {
  const arranque = process.hrtime.bigint();
  const r = await intentarEntrar(correo);
  return { ms: Number(process.hrtime.bigint() - arranque) / 1e6, huella: r.huella };
}

const medidos = casos.filter((c) => c.correo);
const tiempos = new Map(medidos.map((c) => [c.rotulo, []]));

// Una vuelta de calentamiento, que no se cuenta.
for (const caso of medidos) await cronometrarEntrada(caso.correo);

/* Si a mitad de la medición el servidor empieza a contestar otra cosa —el tope de
   intentos seguidos, por ejemplo— los tiempos dejan de ser comparables, y peor:
   se emparejan solos y la prueba daría verde por la razón equivocada. Así que se
   mira que siga contestando lo mismo que contestó recién, y si no, se dice. */
const esperadas = new Map(huellas.map((h) => [h.rotulo, h.huella]));

for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
  for (const caso of medidos) {
    const r = await cronometrarEntrada(caso.correo);
    if (r.huella !== esperadas.get(caso.rotulo)) {
      negarse(
        'A mitad de la medición el servidor empezó a contestar otra cosa, así que los',
        'tiempos ya no son comparables y la medición no vale. Conviene esperar unos',
        'minutos —puede ser el tope de intentos seguidos— y volver a correrla.'
      );
    }
    tiempos.get(caso.rotulo).push(r.ms);
  }
}

const mediana = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

console.log(`Y cuánto tarda en contestar, en ${VUELTAS} vueltas intercaladas:`);
for (const caso of medidos) {
  const t = tiempos.get(caso.rotulo);
  console.log(
    `  ${caso.rotulo.padEnd(38)} ${mediana(t).toFixed(0).padStart(4)}ms de mediana, ` +
    `entre ${Math.min(...t).toFixed(0)} y ${Math.max(...t).toFixed(0)}`
  );
}
console.log('');

// Dos clases quedan separadas si sus recorridos no se tocan en ningún intento.
const separadas = [];
for (let i = 0; i < medidos.length; i++) {
  for (let k = i + 1; k < medidos.length; k++) {
    const a = tiempos.get(medidos[i].rotulo);
    const b = tiempos.get(medidos[k].rotulo);
    if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) {
      separadas.push([medidos[i].rotulo, medidos[k].rotulo]);
    }
  }
}

const textoDelata = new Set(huellas.map((h) => h.huella)).size > 1;
const relojDelata = separadas.length > 0;

if (!textoDelata && !relojDelata) {
  console.log('Las tres clases contestan lo mismo y tardan lo mismo: desde la entrada no');
  console.log('se puede averiguar si una dirección tiene cuenta. La regla se cumple.');
  process.exit(0);
}

if (textoDelata) {
  console.log('El TEXTO delata: las tres respuestas no son todas iguales, así que alcanza');
  console.log('con leerlas para saber si una dirección tiene cuenta.');
  console.log('');
}

if (relojDelata) {
  console.log('El RELOJ delata: hay clases cuyos tiempos no se solapan en ningún intento,');
  console.log('así que con un cronómetro alcanza para distinguirlas aunque digan lo mismo');
  console.log('letra por letra:');
  for (const [uno, otro] of separadas) console.log(`  · «${uno}» y «${otro}»`);
  console.log('');
}

console.log('Y la regla de la empresa lo prohíbe: «el error no debe permitir distinguir');
console.log('"esa persona no existe" de "la clave está mal"».');
process.exit(1);
