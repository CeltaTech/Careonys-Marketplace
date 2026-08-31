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

   **No escribe nada**: no crea cuentas, no borra ninguna y no cambia ningún
   dato. Las tres pruebas son intentos de entrada fallidos.

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
