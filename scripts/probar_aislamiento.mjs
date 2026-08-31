/* ===================================================
   LA PRUEBA DE AISLAMIENTO CON DOS PRESTADORAS

       node scripts/probar_aislamiento.mjs

   Contra la base local, que es donde conviene correrla porque no manda
   correos ni gasta cuota:

       node scripts/probar_aislamiento.mjs --local

   Si el entorno local no está levantado, o si está atrasado respecto de
   `supabase/migrations/`, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   Sin `--local` apunta al servidor que use la aplicación. Ojo con eso: el
   registro por correo del servidor remoto pide confirmar la casilla, así que
   ahí la prueba no llega a tener sesión.

   Y antes de crear una sola cuenta ficticia comprueba que la base a la que
   apunta tenga aplicadas todas las migraciones de `supabase/migrations/`. Si
   falta alguna **se niega a correr**, nombra las que faltan y dice con qué
   comando se aplican. El aviso de los renglones de arriba quedó porque explica
   qué hacer; lo que ya no depende de que alguien lo lea es el freno.

   La regla de la empresa la pide con estas palabras: "una prueba que devuelve una
   lista vacía no distingue 'aislado' de 'todo bloqueado'". Así que esta no
   mira listas vacías: registra cuentas ficticias, les hace escribir su legajo
   y publicar sus avisos, y recién entonces pregunta quién ve qué.

   Son tres cuentas y no dos. A está en una Prestadora y B en la otra, que es
   lo que separa Prestadora de Prestadora. C está en la misma Prestadora que A:
   entre esas dos no hay `tenant_id` que valga, y son el único par que puede
   mostrar si la barrera entre Familias existe.

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
    20. Y el directorio de la OTRA Prestadora no lo muestra. Es la razón de ser
        de la migración 0021, y hasta el 26 de agosto de 2026 no lo probaba nada.
    21. El directorio no devuelve ningún dato personal ni ningún camino del
        depósito privado. (17 a 21 también necesitan --local, por lo mismo:
        validar un legajo es trabajo del personal de la Prestadora.)

   El directorio se pide siempre por la puerta de UNA Prestadora
   —`directorio_de(<nombre corto>)`, `perfil_del_directorio(<nombre corto>,
   <id>)`—, porque la migración 0021 le quitó el permiso a `directorio`
   para todo el mundo. Leerla derecho devuelve vacío siempre, y una prueba
   escrita así no puede fallar.

   Y sobre el examen (migración 0008), que es lo que acredita que alguien sabe
   cuidar:

    22. La respuesta correcta no se puede leer con sesión iniciada.
    23. Las opciones sí se leen, y llegan sin la respuesta adentro.
    24. Contestando mal, la base dice que no aprobó.
    25. Contestando bien, aprueba.
    26. Un intento aprobado no se puede escribir a mano.
    27. Cada quien ve sus intentos y ninguno de otra persona.
    28. Cuando se acaban los intentos, no deja rendir otra vez.

   Y sobre la barrera entre Familias de una misma Prestadora (migración 0020),
   que es la que faltaba entera:

    29. Cada Familia publica su aviso.
    30. Y el aviso sale a su nombre sin que ella lo haya mandado en el pedido.
    31. Mandarlo a nombre de otra no sirve: sale igual a nombre de quien escribe.
    32. Una Familia no ve el aviso de la otra, ni pidiéndolo por su identificador.
    33. Ni la otra el de ella.
    34. No puede modificarlo.
    35. Ni borrarlo: sigue estando cuando su dueña lo pide.
    36. No ve los horarios de ese aviso.
    37. Ni la conversación.
    38. No lee ningún reporte: ni presión, ni glucemia, ni medicación.
    39. La fichada sale a nombre del legajo de quien la marca.
    40. Y no sale poniendo el identificador de la **cuenta** donde va el del
        **legajo**, que es lo que mandaba el teléfono del Asistente hasta el 31
        de agosto de 2026 —por eso `clock_ins` no tenía una sola fila en toda la
        base, pendiente 112—.
    41. Y sin legajo propio y sin ser personal no se lee ninguna fichada.
    42. No lee cómo pondera su puntaje la Prestadora (migración 0018), aunque
        esas filas existan: las siembra la propia migración, así que ver cero
        ahí es la política y no una tabla vacía.
    43. Ni las puede cambiar.

   Y sobre las zonas de cobertura, que son de cada Prestadora (migración 0035):

    44. Cada Prestadora ve sus zonas, y las dos ven un número que no es cero.
    45. Ninguna ve una sola zona de la otra.
    46. Nadie carga una zona en la Prestadora de otro.

   Los números de arriba son los puntos, no las comprobaciones: varias corren
   adentro de un bucle y salen más renglones que llamadas. Por eso, al final,
   la prueba **cuenta las que hizo y revisa los documentos que dicen cuántas
   son**. El 31 de agosto de 2026 había tres documentos con tres números
   distintos y ninguno era el bueno; ninguna comprobación de
   `verificar_todo.mjs` podía agarrarlo, porque el número no se puede contar
   leyendo el archivo. Un desajuste ahí **no** dice que el aislamiento falle:
   sale como nota al pie, después del veredicto, y se corrige el documento.

   Todo con datos inventados. No toca ni una fila que ya estuviera cargada, y
   borra lo que crea. No muestra ninguna clave: usa la publicable, que es la
   que ya viaja al navegador.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const contraLocal = process.argv.includes('--local');

// --- El guardián: la base tiene que estar en la versión que la prueba dice ---
// Va antes de todo lo demás, y sobre todo antes de crear ninguna cuenta
// ficticia. El motivo está medido: una migración que sólo cambia una vista o
// sólo siembra filas no rompe esta prueba, la deja probando la forma anterior y
// contestando que está todo bien. Así que acá no se avisa: se frena.
//
// `supabase migration list` devuelve tres columnas separadas por `|`: la
// versión del archivo, la versión que la base tiene aplicada, y la fecha. El
// renglón con la del medio vacía es una migración que existe como archivo y que
// esa base no corrió nunca.
//
// Falla cerrado, como pide la regla de la empresa: si la lista no se puede
// leer, o si se lee y no trae ni un renglón de versión, tampoco corre. Una
// comprobación que ante la duda deja pasar es la que no entendió el caso.
{
  const bandera = contraLocal ? '--local' : '--linked';

  const archivos = readdirSync(join(raiz, 'supabase', 'migrations'))
    .filter((n) => n.endsWith('.sql'))
    .sort();
  const versionDe = (nombre) => (nombre.match(/^(\d+)_/) || [])[1] || null;

  const negarse = (...renglones) => {
    console.error('La prueba de aislamiento no corre.');
    console.error('');
    for (const r of renglones) console.error(r);
    process.exit(1);
  };

  if (archivos.length === 0) {
    negarse('No se encontró ninguna migración en supabase/migrations/, y tiene que haber varias.');
  }

  let salidaLista = null;
  try {
    salidaLista = execFileSync('npx', ['supabase', 'migration', 'list', bandera], {
      cwd: raiz, encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    // Cuando el CLI sale con error igual conviene mirar lo que alcanzó a
    // escribir: a veces trae el motivo en limpio. Pero pase lo que pase, de acá
    // no se sigue.
    const dicho = String((error && error.stdout) || '').trim();
    negarse(
      'No se pudo leer qué migraciones tiene aplicadas la base:',
      '    npx supabase migration list ' + bandera,
      ...(dicho ? ['', dicho] : []),
      '',
      contraLocal
        ? 'Si el entorno local no está levantado, primero:'
        : 'Si el proyecto no está enlazado, primero:',
      contraLocal
        ? '    supabase start -x edge-runtime -x vector -x supavisor -x logflare'
        : '    supabase link'
    );
  }

  // Del listado sólo sirven los renglones cuya primera columna es una versión.
  // Con eso se van solos el encabezado, la fila de guiones y los avisos de
  // versión nueva del CLI, que no traen `|` ni número.
  const aplicadas = new Set();
  let renglonesDeVersion = 0;
  for (const renglon of String(salidaLista).split('\n')) {
    if (!renglon.includes('|')) continue;
    const columnas = renglon.split('|').map((c) => c.trim());
    if (columnas.length < 2) continue;
    const [enElArchivo, enLaBase] = columnas;
    if (!/^\d+$/.test(enElArchivo)) continue;
    renglonesDeVersion++;
    if (enLaBase !== '') {
      aplicadas.add(enElArchivo);
      aplicadas.add(enLaBase);
    }
  }

  if (renglonesDeVersion === 0) {
    negarse(
      'La lista de migraciones se leyó pero no trajo ninguna versión, así que no hay',
      'forma de saber en qué estado está la base. Antes que dar luz verde a ciegas,',
      'no corre.',
      '',
      '    npx supabase migration list ' + bandera
    );
  }

  const faltantes = archivos.filter((n) => {
    const version = versionDe(n);
    return !version || !aplicadas.has(version);
  });

  if (faltantes.length > 0) {
    negarse(
      'La base a la que apunta no tiene aplicadas todas las migraciones de',
      'supabase/migrations/. Le faltan ' + faltantes.length + ' de ' + archivos.length + ':',
      '',
      ...faltantes.map((n) => '    ' + n),
      '',
      'Con la base atrasada esta prueba puede pasar entera y estar probando la forma',
      'anterior del esquema, así que no arranca. Se aplican con:',
      '',
      '    supabase migration up ' + bandera
    );
  }

  console.log('Migraciones: las ' + archivos.length + ' de supabase/migrations/ están aplicadas.');
}

let url, clave, claveServicio;

if (contraLocal) {
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

/* Cuántas cuentas había antes de que esta prueba tocara nada. Al final se
   vuelve a preguntar, y tienen que ser las mismas. Contar sólo las que la
   prueba se acuerda de haber creado no prueba lo mismo: una cuenta creada por un
   camino que nadie anotó en una lista quedaría igual, y el mensaje diría que se
   limpió todo. El total lo contesta el propio servidor en `x-total-count`. */
async function cuantasCuentas() {
  if (!claveServicio) return null;
  const res = await fetch(base + '/auth/v1/admin/users?page=1&per_page=1', {
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
  const dicho = res.headers.get('x-total-count');
  return dicho === null ? null : Number(dicho);
}
const cuentasAlEmpezar = await cuantasCuentas();

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
// Se piden por su nombre corto, de a una. No se listan: la migracion 0021 quito
// la lista a proposito —no existe ninguna respuesta que devuelva mas de una
// Prestadora—, y una prueba no es motivo para reabrirla. Los dos nombres cortos
// los crea la migracion 0003 y no cambian.
const NOMBRES_CORTOS = ['presdemo', 'cuidarnorte'];
const prestadoras = [];
for (const slug of NOMBRES_CORTOS) {
  const { cuerpo } = await rest('/rest/v1/rpc/prestadora_por_slug', {
    method: 'POST',
    body: JSON.stringify({ p_slug: slug })
  });
  if (Array.isArray(cuerpo) && cuerpo.length === 1) prestadoras.push(cuerpo[0]);
}
if (prestadoras.length < 2) {
  console.error('Hacen falta las dos Prestadoras ficticias de la migracion 0003 (' +
    NOMBRES_CORTOS.join(', ') + '). Se resolvieron: ' + prestadoras.length);
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

// --- Una tercera cuenta, en la MISMA Prestadora que la primera --------------
// A y B están en Prestadoras distintas, así que entre ellas alcanza con el
// `tenant_id` para separarlas y no prueban nada de la barrera entre Familias.
// C está en la Prestadora de A: son dos Familias del mismo lado del muro, que
// es el único par que puede mostrar si esa barrera existe o no.
const familias = [];
for (const etiqueta of ['C']) {
  const email = `prueba.aislamiento.${etiqueta.toLowerCase()}.${sello}@ejemplo.invalid`;
  const password = `Ficticia-${sello}-${etiqueta}`;
  const alta = await registrar(email, password, {
    full_name: `Familia Ficticia ${etiqueta}`,
    tenant_slug: cuentas[0].prestadora.slug,
    role: 'coordinador'
  });
  let token = alta.estado < 400 ? alta.cuerpo.access_token : null;
  if (!token && alta.estado < 400) {
    const sesion = await entrar(email, password);
    token = sesion.cuerpo.access_token;
  }
  if (!token) {
    console.error('No se pudo crear la cuenta ficticia ' + etiqueta + ', que es la que');
    console.error('prueba la barrera entre Familias. Sin ella esa parte no se verifica.');
    process.exit(1);
  }
  familias.push({
    etiqueta, email, token,
    prestadora: cuentas[0].prestadora,
    userId: alta.cuerpo.user?.id || alta.cuerpo.id
  });
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

  // El directorio se pide por la puerta de UNA Prestadora, que desde la migracion
  // 0021 es la unica que existe: `directorio` no esta concedida a nadie, asi
  // que leerla directo devuelve vacio siempre y una prueba escrita asi no puede
  // fallar.
  const enDirectorioDe = async slug => {
    const { cuerpo } = await rest('/rest/v1/rpc/directorio_de', {
      method: 'POST',
      body: JSON.stringify({ p_slug: slug })
    });
    return Array.isArray(cuerpo) && cuerpo.some(f => f.id === a.legajoId);
  };
  const enDirectorio = () => enDirectorioDe(a.prestadora.slug);

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

  // Y la puerta del otro lado: el directorio de la Prestadora ajena no lo trae.
  // Es la razon de ser de la migracion 0021, y sin esta comprobacion las tres de
  // arriba pasarian igual con el directorio mezclando las dos empresas.
  const enElAjeno = await enDirectorioDe(B.slug);
  comprobar('Y el directorio de la otra Prestadora no lo muestra',
    enElAjeno === false, enElAjeno ? 'aparece en el ajeno' : 'no aparece en el ajeno');

  const { cuerpo: fila } = await rest('/rest/v1/rpc/perfil_del_directorio', {
    method: 'POST',
    body: JSON.stringify({ p_slug: a.prestadora.slug, p_id: a.legajoId })
  });
  const columnas = Array.isArray(fila) && fila[0] ? Object.keys(fila[0]) : [];
  const prohibidas = ['dni', 'phone', 'email', 'address', 'bank_info', 'cuit',
                      'documents', 'birthdate', 'reference_info', 'education_info'];
  const filtradas = prohibidas.filter(k => columnas.includes(k));
  /* El `columnas.length > 0` no sobra: si la función no devolviera ninguna
     fila, `columnas` quedaría vacía, ninguna prohibida estaría adentro y esto
     daría bien sin haber mirado nada. */
  comprobar('El directorio no devuelve ningún dato personal',
    columnas.length > 0 && filtradas.length === 0,
    filtradas.length ? 'devuelve ' + filtradas.join(', ')
      : columnas.length > 0 ? columnas.length + ' columnas, ninguna personal'
      : 'la función no devolvió ninguna fila, así que esto no probó nada');
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

// --- 29 a 43: la barrera entre Familias -------------------------------------
// Las cuentas A y B están en Prestadoras distintas, así que entre ellas alcanza
// con el `tenant_id` y no prueban nada nuevo. A y C están en la MISMA
// Prestadora: son el único par que puede mostrar si la barrera de la migración
// 0020 existe o si el muro tenía una sola pared.
console.log('');
console.log('Dos Familias de la misma Prestadora');
{
  const unaFamilia = cuentas[0];
  const otraFamilia = familias[0];

  for (const f of [unaFamilia, otraFamilia]) {
    const r = await rest('/rest/v1/avisos', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ patient_name: 'Paciente Ficticio ' + f.etiqueta })
    }, f.token);
    f.avisoId = Array.isArray(r.cuerpo) && r.cuerpo[0] ? r.cuerpo[0].id : null;
    const aNombreSuyo = Array.isArray(r.cuerpo) && r.cuerpo[0] &&
                        r.cuerpo[0].familia_id === f.userId;
    comprobar(`${f.etiqueta}: publica su aviso y sale a su nombre sin haberlo mandado`,
      r.estado === 201 && aNombreSuyo,
      'respuesta ' + r.estado + (aNombreSuyo ? '' : ', familia_id ajeno o vacío'));
  }

  // El pedido trae el identificador de otra persona a propósito. La columna
  // tiene valor por omisión, no lo toma del pedido: tiene que salir igual a
  // nombre de quien la escribe.
  const suplantar = await rest('/rest/v1/avisos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      patient_name: 'Paciente Ficticio suplantado',
      familia_id: otraFamilia.userId
    })
  }, unaFamilia.token);
  const filaSuplantada = Array.isArray(suplantar.cuerpo) ? suplantar.cuerpo[0] : null;
  if (filaSuplantada) unaFamilia.avisoSuplantado = filaSuplantada.id;
  comprobar('Un aviso no se puede publicar a nombre de otra Familia',
    !filaSuplantada || filaSuplantada.familia_id === unaFamilia.userId,
    filaSuplantada ? 'quedó a nombre de ' +
      (filaSuplantada.familia_id === unaFamilia.userId ? 'quien lo escribió' : 'la otra')
      : 'la base lo rechazó entero');

  for (const [f, ajena] of [[unaFamilia, otraFamilia], [otraFamilia, unaFamilia]]) {
    const { cuerpo } = await rest(
      '/rest/v1/avisos?select=id,familia_id&id=eq.' + ajena.avisoId, {}, f.token);
    comprobar(`${f.etiqueta}: no ve el aviso de ${ajena.etiqueta} ni pidiéndolo por su identificador`,
      Array.isArray(cuerpo) && cuerpo.length === 0,
      Array.isArray(cuerpo) ? cuerpo.length + ' filas' : JSON.stringify(cuerpo));
  }

  // Ver de más es feo; escribir sobre lo ajeno es peor. Se prueban las dos.
  const retoque = await rest('/rest/v1/avisos?id=eq.' + otraFamilia.avisoId, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ patient_name: 'Nombre cambiado por quien no debe' })
  }, unaFamilia.token);
  comprobar('Una Familia no puede modificar el aviso de la otra',
    Array.isArray(retoque.cuerpo) && retoque.cuerpo.length === 0,
    'tocó ' + (Array.isArray(retoque.cuerpo) ? retoque.cuerpo.length : '?') + ' filas');

  const borrado = await rest('/rest/v1/avisos?id=eq.' + otraFamilia.avisoId, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  }, unaFamilia.token);
  const { cuerpo: sigueAhi } = await rest(
    '/rest/v1/avisos?select=id&id=eq.' + otraFamilia.avisoId, {}, otraFamilia.token);
  comprobar('Ni borrarlo: sigue estando cuando su dueña lo pide',
    Array.isArray(borrado.cuerpo) && borrado.cuerpo.length === 0 &&
    Array.isArray(sigueAhi) && sigueAhi.length === 1,
    'borró ' + (Array.isArray(borrado.cuerpo) ? borrado.cuerpo.length : '?') + ' filas');

  // Los horarios y la conversación cuelgan del aviso y no deciden nada por su
  // cuenta: si el aviso no se ve, esto tampoco tiene que verse.
  /* El horario se escribe y se mira que haya quedado escrito, por lo mismo que
     el mensaje de abajo: el único horario de este aviso lo carga esta línea, así
     que si la carga fallara la lectura de al lado vería cero filas y daría bien
     con el aislamiento roto. */
  const franja = await rest('/rest/v1/franjas_aviso', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ aviso_id: otraFamilia.avisoId, dia: 'lunes', turno: 'manana' })
  }, otraFamilia.token);
  const franjaEscrita = Array.isArray(franja.cuerpo) && franja.cuerpo.length === 1;
  const { cuerpo: franjasAjenas } = await rest(
    '/rest/v1/franjas_aviso?select=id&aviso_id=eq.' + otraFamilia.avisoId,
    {}, unaFamilia.token);
  comprobar('Tampoco ve los horarios del aviso ajeno',
    franjaEscrita && Array.isArray(franjasAjenas) && franjasAjenas.length === 0,
    franjaEscrita
      ? (Array.isArray(franjasAjenas) ? franjasAjenas.length + ' filas'
                                      : JSON.stringify(franjasAjenas))
      : 'no se pudo escribir el horario de prueba (' + franja.estado +
        '), así que esto no probó nada');

  /* El `author_id` va escrito y el resultado se mira, y las dos cosas son la
     misma corrección. Hasta el 31 de agosto de 2026 esta carga salía sin
     `author_id` —la columna no tiene valor por omisión— y la política de la
     0020 la rechazaba, porque pide ser personal de la Prestadora o ser quien
     escribe. Así que **no había ningún mensaje**, y la comprobación de abajo
     veía cero filas y daba bien: pasaba igual con el aislamiento roto. Es lo
     mismo que el reporte de más abajo ya tenía resuelto, y por eso se copia
     su forma: si el mensaje no se pudo escribir, la comprobación lo dice en
     vez de contar un cero por un acierto. */
  const mensaje = await rest('/rest/v1/messages', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      content: 'Mensaje ficticio',
      aviso_id: otraFamilia.avisoId,
      author_id: otraFamilia.userId
    })
  }, otraFamilia.token);
  otraFamilia.mensajeId = Array.isArray(mensaje.cuerpo) && mensaje.cuerpo[0]
    ? mensaje.cuerpo[0].id : null;
  const { cuerpo: mensajesAjenos } = await rest(
    '/rest/v1/messages?select=id&aviso_id=eq.' + otraFamilia.avisoId, {}, unaFamilia.token);
  comprobar('Ni la conversación de ese aviso',
    otraFamilia.mensajeId && Array.isArray(mensajesAjenos) && mensajesAjenos.length === 0,
    otraFamilia.mensajeId
      ? (Array.isArray(mensajesAjenos) ? mensajesAjenos.length + ' filas'
                                       : JSON.stringify(mensajesAjenos))
      : 'no se pudo escribir el mensaje de prueba (' + mensaje.estado +
        '), así que esto no probó nada');

  // El reporte es lo más delicado que hay acá adentro: presión, glucemia y
  // medicación. Lo escribe el Asistente desde su legajo; ninguna otra cuenta de
  // la Prestadora que no sea su personal tiene por qué leerlo.
  const reporte = await rest('/rest/v1/reportes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      caregiver_id: unaFamilia.legajoId,
      blood_pressure: '120/80', glycemia: '95',
      daily_notes: 'Anotación ficticia de prueba'
    })
  }, unaFamilia.token);
  const reporteId = Array.isArray(reporte.cuerpo) && reporte.cuerpo[0] ? reporte.cuerpo[0].id : null;
  unaFamilia.reporteId = reporteId;
  const { cuerpo: reportesAjenos } = await rest('/rest/v1/reportes?select=id,blood_pressure',
    {}, otraFamilia.token);
  comprobar('Sin legajo propio y sin ser personal, no se lee ningún reporte',
    reporteId && Array.isArray(reportesAjenos) && reportesAjenos.length === 0,
    reporteId ? (Array.isArray(reportesAjenos) ? reportesAjenos.length + ' filas' : JSON.stringify(reportesAjenos))
              : 'no se pudo escribir el reporte de prueba, así que esto no probó nada');

  /* La fichada es la otra cosa que escribe el teléfono del Asistente, y su
     política —la de la 0002, rehecha por la 0020— no la había recorrido nunca
     nadie: `clock_ins` estaba sin una sola fila en toda la base (pendiente
     111). Se recorre igual que el reporte, y con la misma forma: se escribe
     primero y se pregunta después, con el control positivo puesto.

     No hace falta limpiarla aparte: `clock_ins_caregiver_id_fkey` borra en
     cascada, así que la fichada se va con el legajo. Es al revés del mensaje,
     que sobrevive al aviso porque el suyo borra con `set null`. */
  const fichada = await rest('/rest/v1/clock_ins', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      caregiver_id: unaFamilia.legajoId,
      event_type: 'entrada',
      latitude: -34.6037, longitude: -58.3816
    })
  }, unaFamilia.token);
  const fichadaEscrita = Array.isArray(fichada.cuerpo) && fichada.cuerpo.length === 1;
  comprobar('La fichada sale a nombre del legajo de quien la marca',
    fichadaEscrita, 'respuesta ' + fichada.estado);

  /* Y acá va el identificador de la **cuenta** donde va el del **legajo**, que
     no son el mismo dato: `legajo_propio()` devuelve `caregivers.id`, y la
     cuenta es `caregivers.user_id`. Tiene que ser rechazado. Se comprueba
     porque es justo la confusión que tenía escrita el teléfono —ver el
     pendiente 112—, y porque una prueba que sólo mira el camino bueno deja
     que el malo parezca igual de válido. */
  const fichadaConLaCuenta = await rest('/rest/v1/clock_ins', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      caregiver_id: unaFamilia.userId,
      event_type: 'entrada',
      latitude: -34.6037, longitude: -58.3816
    })
  }, unaFamilia.token);
  comprobar('Y no sale poniendo el identificador de la cuenta en vez del del legajo',
    fichadaConLaCuenta.estado >= 400, 'respuesta ' + fichadaConLaCuenta.estado);

  const { cuerpo: fichadasAjenas } = await rest(
    '/rest/v1/clock_ins?select=id,event_type', {}, otraFamilia.token);
  comprobar('Sin legajo propio y sin ser personal, no se lee ninguna fichada',
    fichadaEscrita && Array.isArray(fichadasAjenas) && fichadasAjenas.length === 0,
    fichadaEscrita
      ? (Array.isArray(fichadasAjenas) ? fichadasAjenas.length + ' filas'
                                       : JSON.stringify(fichadasAjenas))
      : 'no se pudo escribir la fichada de prueba, así que esto no probó nada');

  // Y cómo pondera la Prestadora su puntaje (migraciones 0018 y 0022) es de su personal.
  // Las filas existen —las siembra la propia migración—, así que ver cero acá
  // es la política y no una tabla vacía.
  const { cuerpo: ponderacionesVisibles } = await rest(
    '/rest/v1/ponderacion_comprobacion?select=id,comprobacion,ponderacion', {}, otraFamilia.token);
  comprobar('Las ponderaciones del puntaje no se leen desde una sesión que no es del personal',
    Array.isArray(ponderacionesVisibles) && ponderacionesVisibles.length === 0,
    Array.isArray(ponderacionesVisibles) ? ponderacionesVisibles.length + ' filas'
                                         : JSON.stringify(ponderacionesVisibles));

  const retoquePonderacion = await rest('/rest/v1/ponderacion_comprobacion?comprobacion=eq.domicilio', {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ ponderacion: 99 })
  }, otraFamilia.token);
  comprobar('Ni se cambian',
    Array.isArray(retoquePonderacion.cuerpo) && retoquePonderacion.cuerpo.length === 0,
    'tocó ' + (Array.isArray(retoquePonderacion.cuerpo) ? retoquePonderacion.cuerpo.length : '?') + ' filas');
}

// --- Las zonas de cobertura son de cada Prestadora (migración 0035) ---------
// Las dos Prestadoras tienen listas distintas cargadas por la propia migración,
// y por eso esta prueba puede fallar: cada una tiene que ver un número que no
// es cero y que no es el de la otra. Ver cero no probaría nada.
{
  const zonasPorCuenta = [];
  for (const c of cuentas) {
    const { cuerpo } = await rest(
      '/rest/v1/zonas_cobertura?select=id,nombre,tenant_id', {}, c.token);
    zonasPorCuenta.push(Array.isArray(cuerpo) ? cuerpo : []);
  }
  const [zonasA, zonasB] = zonasPorCuenta;

  comprobar('Cada Prestadora ve sus zonas de cobertura, y las dos ven algo',
    zonasA.length > 0 && zonasB.length > 0,
    'A: ' + zonasA.length + ' zonas   B: ' + zonasB.length + ' zonas');

  comprobar('Y ninguna ve una sola zona de la otra',
    zonasA.every((z) => z.tenant_id === cuentas[0].prestadora.id) &&
    zonasB.every((z) => z.tenant_id === cuentas[1].prestadora.id),
    'ajenas en A: ' + zonasA.filter((z) => z.tenant_id !== cuentas[0].prestadora.id).length +
    '   ajenas en B: ' + zonasB.filter((z) => z.tenant_id !== cuentas[1].prestadora.id).length);

  const zonaAjena = await rest('/rest/v1/zonas_cobertura', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      tenant_id: cuentas[1].prestadora.id,
      clave: 'prueba_ajena_' + sello,
      nombre: 'Zona metida en la Prestadora ajena'
    })
  }, cuentas[0].token);
  comprobar('Nadie carga una zona en la Prestadora de otro',
    zonaAjena.estado >= 400,
    'respondió ' + zonaAjena.estado);
}


// --- Los catálogos de dos escalones (migraciones 0008 y 0048) --------------
// `cursos`, `evaluaciones` y `preguntas_evaluacion` guardan dos cosas en la
// misma tabla: con `tenant_id` nulo, la oferta general de CeltaTech, que ven
// todas; con `tenant_id` cargado, lo que armó una Prestadora, que no ve
// ninguna otra. Hasta la 0048 la siembra cargaba sólo lo general, así que la
// mitad `tenant_id = prestadora_actual()` de esas políticas no tenía una sola
// fila que la ejercitara, y acá no se podía mirar: sin dato propio, la
// política correcta y la que se olvidó el escalón propio contestan lo mismo.
//
// Ahora PresDemo tiene su curso de RCP avanzada, con su evaluación y sus dos
// preguntas, y estas tres comprobaciones fallan por los dos lados: si la
// política perdiera la mitad propia, la dueña dejaría de ver lo suyo; si
// perdiera la condición de Prestadora, la otra lo vería.
//
// No se prueba acá que nadie escriba en estos catálogos: la 0008 le quita el
// permiso de escritura a `authenticated` sobre la tabla entera, así que un
// intento de carga cruzada daría error igual con el aislamiento roto. Sería
// una prueba que no puede fallar.
{
  const CATALOGOS = ['cursos', 'evaluaciones', 'preguntas_evaluacion'];
  const visto = new Map();   // tabla -> [filasDeA, filasDeB]
  for (const tabla of CATALOGOS) {
    const porCuenta = [];
    for (const c of cuentas) {
      const { cuerpo } = await rest(
        '/rest/v1/' + tabla + '?select=id,clave,tenant_id', {}, c.token);
      porCuenta.push(Array.isArray(cuerpo) ? cuerpo : []);
    }
    visto.set(tabla, porCuenta);
  }
  const general = (filas) => filas.filter((f) => f.tenant_id === null);
  const propias = (filas, duenia) => filas.filter((f) => f.tenant_id === duenia);
  const ajenas  = (filas, duenia) => filas.filter((f) => f.tenant_id !== null &&
                                                        f.tenant_id !== duenia);

  const sinOferta = CATALOGOS.filter((t) => {
    const [a, b] = visto.get(t);
    return general(a).length === 0 || general(a).length !== general(b).length;
  });
  comprobar('Las dos Prestadoras ven la misma oferta general de CeltaTech',
    sinOferta.length === 0,
    sinOferta.length ? 'no coincide en: ' + sinOferta.join(', ')
                     : CATALOGOS.map((t) => t + ': ' + general(visto.get(t)[0]).length).join('   '));

  // El `> 0` no sobra: sin una sola fila propia cargada, «ninguna ajena» es
  // verdad porque no hay ninguna, y la comprobación de abajo pasaría sola.
  const sinLoSuyo = CATALOGOS.filter((t) =>
    propias(visto.get(t)[0], cuentas[0].prestadora.id).length === 0);
  comprobar('La Prestadora ve el curso que armó ella, con su evaluación y sus preguntas',
    sinLoSuyo.length === 0,
    sinLoSuyo.length ? 'no ve lo propio en: ' + sinLoSuyo.join(', ')
                     : CATALOGOS.map((t) => t + ': ' +
                         propias(visto.get(t)[0], cuentas[0].prestadora.id).length).join('   '));

  const seCuelan = [];
  for (const t of CATALOGOS) {
    const [a, b] = visto.get(t);
    const cruce = ajenas(a, cuentas[0].prestadora.id).length +
                  ajenas(b, cuentas[1].prestadora.id).length;
    if (cruce > 0) seCuelan.push(t + ': ' + cruce);
  }
  comprobar('Y ninguna Prestadora ve una sola fila propia de la otra',
    seCuelan.length === 0,
    seCuelan.length ? seCuelan.join('   ') : 'ninguna ajena en los tres catálogos');
}

// --- Limpieza ---------------------------------------------------------------
console.log('');
/* Primero los mensajes: `messages.aviso_id` borra con `set null` y no en
   cascada, así que un mensaje sobrevive al aviso que lo llevaba y se quedaría
   en la base sin nada que lo nombre. */
for (const f of familias) {
  if (f.mensajeId) await rest('/rest/v1/messages?id=eq.' + f.mensajeId, { method: 'DELETE' }, f.token);
}
for (const f of [cuentas[0], familias[0]]) {
  for (const aviso of [f.avisoId, f.avisoSuplantado]) {
    if (aviso) await rest('/rest/v1/avisos?id=eq.' + aviso, { method: 'DELETE' }, f.token);
  }
}
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
const { cuerpo: quedan } = await rest('/rest/v1/rpc/directorio_de', {
  method: 'POST',
  body: JSON.stringify({ p_slug: NOMBRES_CORTOS[0] })
}).then(r => ({ cuerpo: Array.isArray(r.cuerpo)
  ? r.cuerpo.filter(f => String(f.full_name || '').startsWith('Legajo Ficticio'))
  : r.cuerpo }));
console.log('Legajos de prueba borrados. Quedan visibles en el directorio: ' +
  (Array.isArray(quedan) ? quedan.length : '?'));

/* Y las cuentas. Hasta el 31 de agosto de 2026 esta prueba las dejaba, con el
   argumento de que su correo `@ejemplo.invalid` es un dominio que por norma no
   existe y no le puede llegar nada a nadie. Es cierto y no alcanza, por dos
   motivos que se midieron ese día sobre la base de esta máquina:

   · Una de las cuatro se asciende a coordinador para poder probar las
     comprobaciones 15 y 16, y una cuenta ficticia con el rol de coordinador es
     basura con permisos: puede leer los papeles de la Prestadora entera. Había
     **diecisiete**, una por corrida, todas con rol `coordinador` sobre PresDemo.
   · Y ochenta y cuatro de las ochenta y seis cuentas de la base local eran
     residuo de pruebas. Una base así deja de servir para mirarla.

   Se borran sólo con `--local`, que es donde existe la clave de administración.
   Contra el servidor alojado no hay con qué borrarlas, y eso es el pendiente 45,
   que es también el motivo por el que esta prueba se corre siempre con `--local`. */
/* No se suma a `fallos`: eso diría que falló el aislamiento, y lo que falló es la
   limpieza. Se cuenta aparte y se ve en el código de salida. */
let quedoSucia = false;
const todasLasCuentas = [...cuentas, ...familias, ...(coordinador ? [coordinador] : [])];
if (contraLocal && claveServicio) {
  for (const quien of todasLasCuentas) {
    if (!quien.userId) continue;
    await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
      method: 'DELETE',
      headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
    });
  }
  /* Se cuenta lo que quedó, no lo que se pidió borrar: un `DELETE` que contesta
     bien y no borra nada daría el mismo mensaje de éxito. Y se cuenta **el total
     del servidor**, no la lista de arriba, para que una cuenta que la prueba creó
     y no anotó en ninguna lista también se note. */
  const cuentasAlTerminar = await cuantasCuentas();
  const sobran = cuentasAlEmpezar === null || cuentasAlTerminar === null
    ? -1
    : cuentasAlTerminar - cuentasAlEmpezar;
  console.log(sobran === 0
    ? 'Cuentas ficticias borradas: ' + todasLasCuentas.length +
      ', incluida la que se ascendió a coordinador. La base quedó con las ' +
      cuentasAlEmpezar + ' cuentas que tenía.'
    : 'ATENCIÓN: la base tenía ' + cuentasAlEmpezar + ' cuentas y ahora tiene ' +
      cuentasAlTerminar + '. Hay que borrar a mano las que sobran.');
  if (sobran !== 0) quedoSucia = true;
} else {
  console.log('Las cuentas ficticias quedan: borrarlas pide la clave de administración, y');
  console.log('contra el servidor alojado no la hay. Es el pendiente 45. Todas tienen el');
  console.log('correo @ejemplo.invalid, un dominio que por norma no existe, así que no le');
  console.log('llegó ni le puede llegar nada a nadie —pero una de ellas es coordinador—.');
}

// ── Los documentos que dicen cuántas comprobaciones son ─────────────────
// El 31 de agosto de 2026 tres documentos escribían tres números distintos
// —dieciséis, cuarenta y cuarenta y nueve— y ninguno era el de la prueba.
// Ninguna comprobación de `verificar_todo.mjs` puede agarrar eso, porque el
// número no se puede contar leyendo el archivo: hay 51 llamadas a
// `comprobar()` y salen 58 renglones, porque varias están adentro de un
// bucle. El único que sabe el número de verdad es el que acaba de correr,
// así que lo revisa él.
const CENTENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta',
                  'sesenta', 'setenta', 'ochenta', 'noventa'];
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
                  'ocho', 'nueve'];
const ESPECIALES = { 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
                     16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
                     20: 'veinte', 21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés',
                     24: 'veinticuatro', 25: 'veinticinco', 26: 'veintiséis',
                     27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve' };
function enLetras(n) {
  if (ESPECIALES[n]) return ESPECIALES[n];
  const d = Math.floor(n / 10), u = n % 10;
  return u === 0 ? CENTENAS[d] : CENTENAS[d] + ' y ' + UNIDADES[u];
}

const CLAMAN = [
  ['docs/INVENTARIO.md',    'Las {letras} comprobaciones de que una Prestadora'],
  ['docs/ALCANCE.md',       '**{letras} comprobaciones, contadas y pasadas'],
  ['docs/PLAN_AUDITORIA.md', 'ya viven las {n} comprobaciones'],
  ['docs/PENDIENTES.md',    'pasó sus {n} comprobaciones']
];

console.log('');
// El número se congela acá: los cuatro renglones que siguen también pasan por
// `comprobar()`, así que sin esto cada uno se compararía contra un total ya
// aumentado por el anterior y los cuatro dirían cosas distintas.
const cuantas = hechas;
const fallosDeAislamiento = fallos;
console.log('Los documentos que dicen cuántas comprobaciones son (' + cuantas + ')');
for (const [ruta, molde] of CLAMAN) {
  const esperado = molde.replace('{letras}', enLetras(cuantas)).replace('{n}', String(cuantas));
  let texto;
  try {
    texto = readFileSync(join(raiz, ...ruta.split('/')), 'utf8').replace(/\s+/g, ' ');
  } catch {
    comprobar(ruta + ': no se pudo leer', false, 'la prueba no puede revisar lo que no encuentra');
    continue;
  }
  comprobar(ruta + ' dice que son ' + cuantas, texto.includes(esperado),
    texto.includes(esperado) ? '' : 'busqué «' + esperado + '» y no está');
}

const fallosDeConteo = fallos - fallosDeAislamiento;

console.log('');
if (fallosDeAislamiento === 0) {
  console.log('Pasaron las ' + cuantas + ' de aislamiento. El límite lo pone la sesión: vale para las tablas,');
  console.log('para los archivos y para el directorio, que además exige que la persona haya');
  console.log('dicho que sí.');
  console.log('El examen lo corrige la base: la respuesta correcta nunca sale de ahí.');
  console.log('Y la separación no es sólo entre Prestadoras: dos Familias de la misma');
  console.log('Prestadora tampoco se ven los avisos, los horarios, los mensajes ni los reportes.');
} else {
  console.log(fallosDeAislamiento + ' comprobación(es) de aislamiento fallaron. El aislamiento NO está.');
}
if (fallosDeConteo > 0) {
  console.log('');
  console.log('Aparte de eso: el aislamiento se probó entero, pero ' + fallosDeConteo + ' documento(s)');
  console.log('dicen un número de comprobaciones que ya no es el que corre. Son ' + cuantas + '.');
  console.log('Se corrige el documento, no la prueba.');
}
if (fallos > 0 || quedoSucia) process.exitCode = 1;
