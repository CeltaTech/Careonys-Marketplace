/* ===================================================
   NINGUNA FILA APUNTA A UNA CUENTA QUE LAS MIGRACIONES NO CREAN

       node scripts/verificar_cuentas.mjs

   POR QUÉ EXISTE. El 8 de septiembre de 2026 las setenta y seis migraciones se
   juntaron en tres archivos, y el volcado con el que se hizo esa junta pidió
   solamente el esquema `public`. Las cuentas ficticias no viven en `public`:
   viven en `auth`. Así que se fueron, y **no lo notó nadie ni nada**. Ni las
   llaves foráneas, porque la siembra entra con `session_replication_role =
   replica` y eso las duerme; ni las pruebas, porque todas miran `public`. La
   base quedó con seis perfiles apuntando a seis cuentas que no existían, o sea
   sin una sola forma de entrar al producto, y siguió así hasta que alguien fue
   a contar filas a mano.

   QUÉ MIRA. Tres columnas apuntan a `auth.users`: `profiles.id`,
   `caregivers.user_id` y `avisos.familia_id`. Para cada identificador que
   las migraciones escriben en alguna de las tres se exige que ese mismo
   identificador aparezca en una migración que dé de alta cuentas. Es
   exactamente lo que se rompió: al desaparecer el archivo de las cuentas, esos
   seis `uuid` quedaron nombrados en un solo lado.

   Y las filas vienen escritas de dos maneras, que se leen distinto. La que
   nombra sus columnas —`INSERT INTO tabla (id, ...) VALUES (...)`— se lee sola.
   La que no las nombra, que es como escribe un volcado y como está escrita hoy
   la siembra entera, se apoya en el orden con el que la tabla fue creada, así
   que ese orden se saca del `CREATE TABLE` y se va juntando migración por
   migración. La fila que no nombra columnas y cuya tabla no crea ninguna
   migración anterior **no se saltea**: se informa. Saltear callado es
   exactamente cómo esto pasó a revisar cero filas mientras decía ✔.

   Y dos cosas más, que van con la anterior:

     * Que quien crea cuentas cree también su identidad del proveedor `email`.
       Sin esa fila hermana la entrada falla aunque la cuenta esté perfecta, y
       falla diciendo que las credenciales no coinciden, que no se parece en
       nada a lo que pasa.
     * Que ninguna migración escriba una clave. Las migraciones son las mismas
       de los dos lados: una clave acá abre esas cuentas también en la base
       publicada, para cualquiera que lea el repositorio. Las cuentas ficticias
       nacen sin clave y la clave la pone un guion local.

   QUÉ NO MIRA. La base. Esto se corre en el gancho de `commit`, donde no hay
   ninguna levantada, así que lee los archivos de `supabase/migrations/` y nada
   más. Que la base de esta máquina esté como dicen las migraciones lo mira
   `scripts/probar_coherencia_de_la_siembra.mjs`.

   Se mira a sí mismo antes de mirar las migraciones: un chequeo que no detecta
   nada pasa siempre, y eso no se nota.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARPETA = join(raiz, 'supabase', 'migrations');

/* Las columnas que apuntan a `auth.users`, con la tabla donde viven. Si mañana
   aparece una cuarta, entra acá: el resto del archivo no la nombra. */
const APUNTAN_A_UNA_CUENTA = [
  ['profiles', 'id'],
  ['caregivers', 'user_id'],
  ['avisos', 'familia_id'],
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DA_DE_ALTA_CUENTAS = /insert\s+into\s+auth\.users\b/i;
const DA_DE_ALTA_IDENTIDADES = /insert\s+into\s+auth\.identities\b/i;
/* Una clave escrita a mano tiene dos formas y las dos se buscan: el hash de
   `bcrypt`, que empieza con `$2a$`, `$2b$` o `$2y$`, y la llamada a `crypt()`,
   que lo fabrica desde un texto que entonces está escrito acá al lado. */
const UNA_CLAVE = /\$2[aby]\$\d{2}\$|\bcrypt\s*\(/i;

/* --- Partir una tupla de SQL en sus valores --------------------------------
   Carácter por carácter porque adentro de un texto puede haber comas,
   paréntesis y llaves, y cualquiera de las tres partiría mal la fila. La
   comilla simple se cierra sola: `''` adentro de un texto es una comilla y no
   el final. */
function partir(tupla) {
  const valores = [];
  let actual = '';
  let enTexto = false;
  for (let i = 0; i < tupla.length; i++) {
    const c = tupla[i];
    if (enTexto) {
      if (c === "'" && tupla[i + 1] === "'") { actual += "''"; i++; continue; }
      if (c === "'") { enTexto = false; actual += c; continue; }
      actual += c;
      continue;
    }
    if (c === "'") { enTexto = true; actual += c; continue; }
    if (c === ',') { valores.push(actual.trim()); actual = ''; continue; }
    actual += c;
  }
  valores.push(actual.trim());
  return valores;
}

function sinComillas(valor) {
  const limpio = valor.trim();
  if (limpio.startsWith("'") && limpio.endsWith("'")) return limpio.slice(1, -1);
  return limpio;
}

/* --- El orden con el que nació cada tabla ---------------------------------
   Un volcado no escribe la lista de columnas: escribe `INSERT INTO tabla
   VALUES (...)` y se apoya en el orden con el que la tabla fue creada. Así
   está escrita la siembra entera, así que sin esto no se lee ni una fila. El
   orden sale del `CREATE TABLE`, que es el mismo del que se sirvió el volcado
   para escribirlas, y se va juntando migración por migración en orden, para
   que cada `insert` se lea con el orden que la tabla tenía en ese momento. */
const EMPIEZAN_UNA_REGLA = /^(constraint|primary|unique|foreign|check|exclude|like)\b/i;

/* Partir por comas de las de afuera: adentro de un texto o de un paréntesis
   —`numeric(10,2)`, `timezone('utc'::text, now())`— la coma no separa nada. */
function partirEnLoAlto(cuerpo) {
  const partes = [];
  let actual = '';
  let enTexto = false;
  let hondura = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    if (enTexto) {
      if (c === "'" && cuerpo[i + 1] === "'") { actual += "''"; i++; continue; }
      if (c === "'") enTexto = false;
      actual += c;
      continue;
    }
    if (c === "'") { enTexto = true; actual += c; continue; }
    if (c === '(') hondura++;
    if (c === ')') hondura--;
    if (c === ',' && hondura === 0) { partes.push(actual); actual = ''; continue; }
    actual += c;
  }
  partes.push(actual);
  return partes;
}

function cierraElParentesis(texto, abre) {
  let hondura = 0;
  let enTexto = false;
  for (let i = abre; i < texto.length; i++) {
    const c = texto[i];
    if (enTexto) {
      if (c === "'" && texto[i + 1] === "'") { i++; continue; }
      if (c === "'") enTexto = false;
      continue;
    }
    if (c === "'") { enTexto = true; continue; }
    if (c === '(') hondura++;
    else if (c === ')') { hondura--; if (hondura === 0) return i; }
  }
  return -1;
}

export function ordenDeLasColumnas(sql) {
  const tablas = new Map();
  const CREA = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_]\w*)"?\s*\(/gi;
  for (const m of sql.matchAll(CREA)) {
    const abre = m.index + m[0].length - 1;
    const cierra = cierraElParentesis(sql, abre);
    if (cierra < 0) continue;
    const columnas = [];
    for (const parte of partirEnLoAlto(sql.slice(abre + 1, cierra))) {
      const limpia = parte.trim();
      if (!limpia || EMPIEZAN_UNA_REGLA.test(limpia)) continue;
      const nombre = limpia.match(/^"?([a-z_]\w*)"?/i);
      if (nombre) columnas.push(nombre[1].toLowerCase());
    }
    if (columnas.length) tablas.set(m[1].toLowerCase(), columnas);
  }
  return tablas;
}

/* El nombre de la tabla se mete en el medio, así que el patrón se arma. Los
   dos costados se escriben como patrones de verdad y no como texto, porque un
   texto con barras se copia mal de un lado a otro y llega roto sin avisar. */
const ANTES_DEL_NOMBRE = /insert\s+into\s+(?:public\.)?"?/.source;
const DESPUES_DEL_NOMBRE = /"?\s*(?:\(([^)]*)\))?\s*values\s*\(([\s\S]*?)\)\s*;/.source;

/* Los identificadores de cuenta que un texto escribe en las tres columnas.
   Devuelve pares [tabla.columna, uuid], para poder decir dónde estaba.

   `orden` trae las columnas de cada tabla, para poder leer el `insert` que no
   nombra ninguna. El que viene sin lista y sin orden conocido no se saltea en
   silencio: sale por `sinOrden`, porque saltear callado es exactamente cómo
   este chequeo pasó a mirar cero. */
export function cuentasNombradas(texto, orden = new Map(), sinOrden = []) {
  const nombrados = [];
  for (const [tabla, columna] of APUNTAN_A_UNA_CUENTA) {
    const patron = new RegExp(ANTES_DEL_NOMBRE + tabla + DESPUES_DEL_NOMBRE, 'gi');
    for (const fila of texto.matchAll(patron)) {
      let cols;
      if (fila[1] !== undefined) {
        cols = fila[1].split(',').map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());
      } else if (orden.has(tabla)) {
        cols = orden.get(tabla);
      } else {
        sinOrden.push(tabla);
        continue;
      }
      const donde = cols.indexOf(columna);
      if (donde < 0) continue;
      const valores = partir(fila[2]);
      if (valores.length !== cols.length) continue;
      const valor = sinComillas(valores[donde]);
      if (UUID.test(valor)) nombrados.push([tabla + '.' + columna, valor.toLowerCase()]);
    }
  }
  return nombrados;
}

/* Los identificadores que una migración que da de alta cuentas menciona. No se
   parsea el `insert`: los seis salen de una tabla temporaria y el `insert` los
   trae con un `select`, así que lo que se pide es que el `uuid` esté escrito en
   el mismo archivo que crea las cuentas. Es más flojo que parsear y es lo que
   hace falta: lo que se rompió fue que el archivo entero no estaba. */
export function cuentasCreadas(texto) {
  if (!DA_DE_ALTA_CUENTAS.test(texto)) return [];
  return [...texto.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)]
    .map((m) => m[0].toLowerCase())
    /* El `uuid` todo en ceros no es ninguna cuenta: es el `instance_id` que
       GoTrue escribe en cada fila. Dejarlo adentro no rompería nada, pero haría
       que la cuenta se contaran mal en el renglón final. */
    .filter((id) => id !== '00000000-0000-0000-0000-000000000000');
}

// ── Pruebas del detector ───────────────────────────────────────────────────
{
  const rotas = [];
  const perfil = (id) =>
    `INSERT INTO public.profiles (id, tenant_id, full_name, role) VALUES ('${id}', ` +
    `'f166d60e-96fe-4c50-888d-f34f41f78e46', 'Alguien Ficticio', 'familiar');`;
  const uno = 'ccccccc1-0000-4000-8000-000000000001';

  if (cuentasNombradas(perfil(uno)).length !== 1) rotas.push('no lee el identificador de un perfil');
  if (cuentasNombradas(perfil(uno))[0][1] !== uno) rotas.push('lee mal el identificador de un perfil');
  if (cuentasNombradas('select 1;').length !== 0) rotas.push('inventa identificadores donde no hay ninguno');
  if (cuentasCreadas(`insert into auth.users values ('${uno}');`).length !== 1) {
    rotas.push('no ve la cuenta que sí se crea');
  }
  if (cuentasCreadas(perfil(uno)).length !== 0) rotas.push('confunde un perfil con una cuenta');
  if (!UNA_CLAVE.test("update auth.users set encrypted_password = crypt('x', gen_salt('bf'));")) {
    rotas.push('no ve una clave fabricada con crypt()');
  }
  if (!UNA_CLAVE.test("'$2a$10$abcdefghijklmnopqrstuv'")) rotas.push('no ve un hash de bcrypt');
  if (UNA_CLAVE.test('null, now(), now()')) rotas.push('ve una clave donde no hay ninguna');

  /* La forma del volcado: sin lista de columnas, apoyada en el orden de la
     tabla. Es la que estuvo sin leerse, así que se prueba entera. */
  const creaPerfiles =
    'CREATE TABLE public.profiles (\n' +
    '    id uuid NOT NULL,\n' +
    '    tenant_id uuid,\n' +
    '    full_name text,\n' +
    '    role text DEFAULT \'familiar\'::text NOT NULL,\n' +
    '    created_at timestamp with time zone DEFAULT timezone(\'utc\'::text, now())\n' +
    ');';
  const columnas = ordenDeLasColumnas(creaPerfiles);
  const perfilVolcado = (id) =>
    `INSERT INTO public.profiles VALUES ('${id}', ` +
    `'f166d60e-96fe-4c50-888d-f34f41f78e46', 'Alguien Ficticio', 'familiar', NULL);`;

  if ((columnas.get('profiles') || []).join() !== 'id,tenant_id,full_name,role,created_at') {
    rotas.push('lee mal el orden con el que nació la tabla');
  }
  if (cuentasNombradas(perfilVolcado(uno), columnas).length !== 1) {
    rotas.push('no lee el perfil escrito como lo escribe un volcado');
  }
  if ((cuentasNombradas(perfilVolcado(uno), columnas)[0] || [])[1] !== uno) {
    rotas.push('lee mal el identificador del perfil escrito como lo escribe un volcado');
  }

  const sinSaber = [];
  if (cuentasNombradas(perfilVolcado(uno), new Map(), sinSaber).length !== 0) {
    rotas.push('adivina el lugar de la columna sin saber el orden de la tabla');
  }
  if (!sinSaber.includes('profiles')) rotas.push('se saltea callado la fila que no puede leer');


  if (rotas.length) {
    console.error('El chequeo está roto y por eso no encuentra nada:\n  ' + rotas.join('\n  '));
    process.exit(1);
  }
}

// ── Las migraciones ────────────────────────────────────────────────────────
const migraciones = readdirSync(CARPETA).filter((n) => n.endsWith('.sql')).sort();
seRevisaron(migraciones.length, 'ninguna migración que mirar');

const problemas = [];
const creadas = new Set();
const nombradas = [];      // [archivo, tabla.columna, uuid]
const orden = new Map();   // tabla -> columnas, en el orden con el que nació
let creanCuentas = 0;

for (const nombre of migraciones) {
  const texto = readFileSync(join(CARPETA, nombre), 'utf8');

  /* Primero el orden y después las filas, en el orden de las migraciones: una
     fila se lee con el orden que la tabla tenía cuando esa fila entró. */
  for (const [tabla, columnas] of ordenDeLasColumnas(texto)) orden.set(tabla, columnas);

  for (const id of cuentasCreadas(texto)) creadas.add(id);

  const sinOrden = [];
  for (const [donde, id] of cuentasNombradas(texto, orden, sinOrden)) {
    nombradas.push([nombre, donde, id]);
  }
  for (const tabla of new Set(sinOrden)) {
    problemas.push(
      `${nombre} escribe filas en \`${tabla}\` sin nombrar las columnas, y ninguna ` +
      'migración anterior crea esa tabla, así que no hay manera de saber qué valor va en ' +
      'cada lugar. Esas filas quedaron sin revisar, y eso se dice: saltearlas callado es ' +
      'exactamente cómo este chequeo llegó a mirar cero.'
    );
  }

  if (DA_DE_ALTA_CUENTAS.test(texto)) {
    creanCuentas++;
    if (!DA_DE_ALTA_IDENTIDADES.test(texto)) {
      problemas.push(
        `${nombre} da de alta cuentas en \`auth.users\` y no les escribe la fila hermana de ` +
        '`auth.identities`. Sin ella la entrada por correo y clave falla igual, y falla ' +
        'diciendo que las credenciales no coinciden: GoTrue busca la identidad del ' +
        'proveedor `email` antes de comparar nada.'
      );
    }
  }

  if (UNA_CLAVE.test(texto)) {
    problemas.push(
      `${nombre} escribe una clave. Las migraciones son las mismas de los dos lados, así ` +
      'que esa clave abre la cuenta también en la base publicada, para cualquiera que lea ' +
      'el repositorio. Las cuentas se crean sin clave y la clave la pone un guion local, ' +
      'que la toma del entorno y se niega a correr contra otra base que no sea la de esta ' +
      'máquina.'
    );
  }
}

/* Agrupadas por cuenta y no por fila: una cuenta que falta deja colgado su
   perfil, su legajo y sus avisos, y veinte párrafos iguales tapan el hallazgo
   en vez de mostrarlo. */
const huerfanas = new Map();   // uuid -> Set de «archivo, tabla.columna»
for (const [nombre, donde, id] of nombradas) {
  if (creadas.has(id)) continue;
  if (!huerfanas.has(id)) huerfanas.set(id, new Set());
  huerfanas.get(id).add(`${nombre} → ${donde}`);
}
for (const [id, lugares] of huerfanas) {
  problemas.push(
    `Ninguna migración crea la cuenta \`${id}\`, y hay ${lugares.size === 1 ? 'una fila' :
      lugares.size + ' clases de fila'} que apuntan a ella:\n  ` +
    [...lugares].sort().join('\n  ') +
    '\nEsas columnas apuntan a `auth.users`, así que las filas quedan colgadas de una ' +
    'cuenta que no existe. No se nota mirando: la siembra entra con las llaves foráneas ' +
    'dormidas, y un perfil huérfano no puede iniciar sesión ni hacer verdadera ninguna ' +
    'política.'
  );
}

if (problemas.length) {
  console.error('\n' + problemas.join('\n\n') + '\n');
  process.exit(1);
}

/* Y que no quede mirando cero. Estuvo diciendo ✔ sobre ninguna referencia: la
   siembra se reescribió como la escribe un volcado, sin nombrar las columnas, y
   acá sólo se sabía leer la otra forma. Migraciones había, y cuentas creadas
   también; lo que no se reconocía era la forma de adentro, y eso `hayArchivos`
   no lo puede ver. */
if (creanCuentas > 0) seRevisaron(nombradas.length, 'ni una fila que apunte a una cuenta');

const distintas = new Set(nombradas.map(([, , id]) => id)).size;
const cuantas = `${migraciones.length} migraciones, ${nombradas.length} referencias a ${distintas} cuentas`;
if (creanCuentas === 0 && nombradas.length === 0) {
  console.log(`Cuentas: ${cuantas}. Ninguna migración las nombra todavía.`);
} else {
  console.log(`Cuentas verificadas: ${cuantas}, todas creadas y sin ninguna clave escrita.`);
}
