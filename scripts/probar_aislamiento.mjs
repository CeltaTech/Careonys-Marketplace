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

   Son seis cuentas y no dos. A está en una Prestadora y B en la otra, que es
   lo que separa Prestadora de Prestadora. C está en la misma Prestadora que A:
   entre esas dos no hay `tenant_id` que valga, y son el único par que puede
   mostrar si la barrera entre Familias existe. Las otras tres las pide la
   modalidad, donde hacen falta las dos partes de un contacto **y** alguien de al
   lado que no sea ninguna de las dos: D es un segundo Asistente en la
   Prestadora de A, E es otra Familia de esa misma Prestadora —la que tiene que
   ver cero—, y F es la Familia de la Prestadora B, para que la otra también
   tenga contacto cargado de verdad. Y con `--local` hay una séptima, la que se
   asciende a coordinador.

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
        base; fue el pendiente 112, cerrado ese mismo día—.
    41. Y sin legajo propio y sin ser personal no se lee ninguna fichada.
    42. No lee cómo pondera su puntaje la Prestadora (migración 0018), aunque
        esas filas existan: las siembra la propia migración, así que ver cero
        ahí es la política y no una tabla vacía.
    43. Ni las puede cambiar.

   Y sobre las zonas de cobertura, que son de cada Prestadora (migración 0035):

    44. Cada Prestadora ve sus zonas, y las dos ven un número que no es cero.
    45. Ninguna ve una sola zona de la otra.
    46. Nadie carga una zona en la Prestadora de otro.

   Y sobre la modalidad, que es donde la Familia y el Asistente se encuentran, y
   donde lo único que queda guardado es el contacto (migración 0054):

    47. El Asistente se postula a un aviso, y otro Asistente se postula al mismo.
    48. Nadie se postula con el legajo de otro.
    49. Una postulación no cruza Prestadoras.
    50. El Asistente ve la que hizo él y ninguna del otro; la Familia del aviso
        ve las dos.
    51. Y otra Familia de la misma Prestadora no ve ninguna.
    52. La Familia marca la postulación vista y descartada —no hay «aceptada»—,
        y no puede reescribir el mensaje del Asistente: eso lo frena el permiso
        por columna, que es cosa distinta de la política.
    53. La Familia abre la conversación, y nadie la abre a nombre de otra.
    54. Las dos partes la ven; otra Familia de la misma Prestadora no.
    55. Los mensajes los escriben las dos partes, no se escriben en la
        conversación ajena, y otra Familia no lee ninguno.
    56. El mensaje no se edita y no se borra: no hay permiso para esos verbos.
    57. El personal de la Prestadora no lee ninguna de las tres, y al lado se
        mira que las dos partes sí vean las suyas: si no, «cero» no distingue
        negado de vacío. (Sólo con --local, por lo mismo que 15 y 16.) Y
        tampoco lee las dos que cuelgan del aviso en vez de la modalidad —el
        reporte de cuidado y `messages`—, que hasta la migración 0067 sí leía:
        las dos preguntaban por el aviso con un `exists` que no repetía de
        quién era, y la RLS de `avisos` le devuelve a ese personal todos
        los avisos de su Organización. La fila del reporte se carga acá con el
        aviso puesto, porque en toda la base no había ni una: sin cargarla, la
        comprobación habría dado verde con la política abierta.
    58. Las dos Prestadoras tienen contacto cargado de verdad, cada una ve el
        suyo y ninguna ve una sola fila de la otra, ni pidiéndola por su
        identificador. Y el contacto de la segunda se abre por el **otro**
        camino del mercado —desde el directorio, sin aviso—, que es el que usa
        `perfil.html:573` y que hasta el 2 de septiembre de 2026 no probaba
        nada: las dos conversaciones colgaban de un aviso.

   Y sobre las cuatro funciones que le dan de comer a las pantallas de ese
   encuentro (migración 0055). Son `security definer`, así que se saltean la
   RLS a propósito: lo que las acota es lo que preguntan adentro y las columnas
   que eligen devolver. Por eso se prueban aparte de las tablas.

    59. `avisos_abiertos()` le muestra al Asistente el aviso de su Prestadora, y
        ninguno de la otra. Devuelve `ya_me_postule` en verdadero para el aviso
        al que se postuló. Una Familia —que no tiene legajo— recibe cero, que
        es fallar cerrado. Y **ninguna fila trae `contact_info`, `familia_id`
        ni el nombre del paciente**: eso no se mira con los ojos, se mira
        preguntándole a la fila qué columnas tiene.
    60. `franjas_de_aviso()` no devuelve la grilla de un aviso de la otra
        Prestadora, y sí la del propio: si no, «cero» no distingue negado de
        vacío.
    61. `postulaciones_de_mis_avisos()` le devuelve a la Familia del aviso las
        dos postulaciones que recibió, a otra Familia de la misma Prestadora
        ninguna, y ningún teléfono ni correo de nadie.
    62. `mis_conversaciones()` se la devuelve a las dos partes y a nadie más,
        con `soy_la_familia` de cada lado y sin un solo dato de contacto.
    63. **Sin sesión no se llama a ninguna de las cuatro.** Son direcciones web
        desde que existen, porque PostgREST publica el esquema `public`: la
        migración le revoca `anon`, y acá se comprueba que el revoque esté.

   Y sobre la fichada atada al vínculo (migración 0056), que es la mitad
   operativa: el software muestra lo que se marcó y no decide nada.

    64. El Asistente marca una fichada diciendo para qué vínculo es, y la
        Familia de ese vínculo la ve.
    65. Otra Familia de la misma Prestadora no la ve, y al lado se mira que la
        Familia del vínculo sí: si no, «cero» no distingue negado de vacío.
    66. Una fichada **sin** vínculo no la ve ninguna Familia, y el Asistente
        que la marcó sí. Es la que se podía marcar antes de la 0056, y no se
        le abre a nadie por haberla dejado sin marcar.
    67. El Asistente no puede colgar una fichada de una conversación ajena. Si
        pudiera, le haría aparecer a una Familia una jornada que no es de su
        Asistente, que es justo el aviso equivocado que esta mitad promete no
        dar. Lo rechaza la base, no la pantalla.
    68. El personal de la Prestadora no lee ninguna fichada, ni la atada ni la
        suelta, y al lado se mira que las dos partes sí vean la suya. (Sólo
        con --local, por lo mismo que 15 y 16.)

   Y sobre la alarma que sale de esas fichadas (migración 0057), que es lo
   único que el producto promete avisar y no decidir.

    69. Con cinco marcas cargadas a propósito —una jornada que cerró, una
        salida sin entrada delante, una entrada vieja que nunca cerró y una
        recién marcada— salen **exactamente dos** alarmas: la vieja abierta y
        la salida huérfana. Las otras tres no alarman, y cada una prueba una
        cosa distinta: que una jornada cerrada no molesta, y que el tope de
        horas gobierna de verdad —sin él, la entrada de recién también
        saldría—.
    70. El Asistente ve las mismas dos, que son de su propio vínculo.
    71. Otra Familia de la misma Prestadora no ve ninguna, y al lado se mira
        que la del vínculo sí: si no, «cero» no distingue negado de vacío.
    72. La alarma no trae ningún dato de contacto de nadie.
    73. El personal de la Prestadora no ve ninguna alarma, y al lado se mira
        que las dos partes sí. Mirar si una jornada quedó abierta es mirar los
        horarios que cumple una persona. (Sólo con --local.)
    74. El tope de horas lo escribe el personal de la Prestadora y no lo tocan
        ni la Familia ni el Asistente, que tampoco lo leen.
    75. Y sin sesión, `mis_alarmas()` no contesta.

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

/* La llave con la que se borran las cuentas al terminar. Contra la base de
   esta máquina sale de `supabase status`, que ya se leyó arriba; contra la
   publicada se le pide al CLI la del proyecto, que es lo que hace
   `probar_alta_y_baja.mjs` desde siempre. Se lee acá adentro y no se
   imprime nunca.

   Y si no aparece, **esta prueba no arranca**. Hasta el 1 de septiembre de
   2026 corría igual y avisaba al final que dejaba las cuentas: eso es
   pedirle a quien la corre que se acuerde de limpiar a mano lo que el guion
   ensució solo, y no se acordó nadie. Quedaron tres cuentas en la base
   publicada y hubo que sacarlas con una migración, la 0058. Crear lo que no
   se va a poder borrar es el defecto; avisarlo no lo arregla. */
let claveDeLimpieza = claveServicio;
if (!claveDeLimpieza) {
  try {
    const proyecto = new URL(base).hostname.split('.')[0];
    const salida = execFileSync('npx', ['supabase', 'projects', 'api-keys',
      '--project-ref', proyecto, '-o', 'env'],
      { cwd: raiz, encoding: 'utf8', shell: true });
    claveDeLimpieza = (salida.match(/^SUPABASE_SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];
  } catch { /* se contesta abajo */ }
}
if (!claveDeLimpieza) {
  console.error('Sin la llave de administración esta prueba crearía cuentas que');
  console.error('después no puede borrar, y las dejaría en la base. No arranca.');
  process.exit(1);
}

/* Borrar cuentas es una función y no un tramo pegado al final porque los dos
   cortes de más abajo —el alta que la base rechaza, y la que se crea y no
   devuelve sesión— salían con `process.exit` sin pasar por la limpieza. Ese
   es el camino exacto por el que quedaron las tres cuentas en la base
   publicada: las tres se llamaban «Persona Ficticia A» y ninguna «B», que es
   la firma de tres corridas cortadas en el mismo renglón. */
async function borrarCuentas(lista) {
  for (const quien of lista) {
    if (!quien || !quien.userId) continue;
    await fetch(base + '/auth/v1/admin/users/' + quien.userId, {
      method: 'DELETE',
      headers: { apikey: claveDeLimpieza, Authorization: 'Bearer ' + claveDeLimpieza }
    });
  }
}

/* Cuántas cuentas había antes de que esta prueba tocara nada. Al final se
   vuelve a preguntar, y tienen que ser las mismas. Contar sólo las que la
   prueba se acuerda de haber creado no prueba lo mismo: una cuenta creada por un
   camino que nadie anotó en una lista quedaría igual, y el mensaje diría que se
   limpió todo. El total lo contesta el propio servidor en `x-total-count`. */
async function cuantasCuentas() {
  if (!claveDeLimpieza) return null;
  const res = await fetch(base + '/auth/v1/admin/users?page=1&per_page=1', {
    headers: { apikey: claveDeLimpieza, Authorization: 'Bearer ' + claveDeLimpieza }
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
    await borrarCuentas(cuentas);
    process.exit(1);
  }
  let token = alta.cuerpo.access_token;
  const userIdCuenta = alta.cuerpo.user?.id || alta.cuerpo.id;
  // Desde que se recreó el contenedor de cuentas del entorno local (fue el
  // pendiente 123, cerrado), el alta local ya no confirma sola: hay que
  // confirmarla a propósito, con la llave de servicio, y recién ahí pedir la sesión.
  if (!token && claveServicio && userIdCuenta) {
    await fetch(base + '/auth/v1/admin/users/' + userIdCuenta, {
      method: 'PUT',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email_confirm: true })
    });
    const sesion = await entrar(email, password);
    token = sesion.cuerpo.access_token;
  } else if (!token) {
    const sesion = await entrar(email, password);
    token = sesion.cuerpo.access_token;
  }
  if (!token) {
    console.error('La cuenta ' + etiqueta + ' se creó pero no devolvió sesión. ' +
      'Probablemente la base pide confirmar el correo.');
    /* Ésta es la que quedó tres veces. Se creó recién y todavía no está en
       `cuentas`, así que hay que nombrarla aparte o se va sin borrar. */
    await borrarCuentas([...cuentas,
      { userId: alta.cuerpo.user?.id || alta.cuerpo.id }]);
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
  const userIdFamilia = alta.cuerpo.user?.id || alta.cuerpo.id;
  // Desde que se recreó el contenedor de cuentas del entorno local (fue el
  // pendiente 123, cerrado), el alta local ya no confirma sola: hay que
  // confirmarla a propósito, con la llave de servicio, y recién ahí pedir la sesión.
  if (!token && alta.estado < 400 && claveServicio && userIdFamilia) {
    await fetch(base + '/auth/v1/admin/users/' + userIdFamilia, {
      method: 'PUT',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email_confirm: true })
    });
    const sesion = await entrar(email, password);
    token = sesion.cuerpo.access_token;
  } else if (!token && alta.estado < 400) {
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
  // El re-inicio de sesión de abajo pide usuario y contraseña, y eso exige la
  // cuenta confirmada desde que se recreó el contenedor de cuentas del entorno
  // local (fue el pendiente 123, cerrado): el alta local ya no la confirma sola.
  await fetch(base + '/auth/v1/admin/users/' + userId, {
    method: 'PUT',
    headers: {
      apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email_confirm: true })
  });
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

// --- 17 a 22: el directorio -------------------------------------------------
// El directorio es la única puerta que se abre sin sesión, así que acá se pregunta
// con la clave pública y nada más. Tres condiciones tienen que cumplirse a la vez
// para aparecer: que la Prestadora haya validado el legajo, que la persona haya
// dicho que sí, y que estén comprobados los papeles que la puerta de publicación
// exige (migración 0061). Se prueban por separado, porque ninguna de las tres
// alcanza sola.
console.log('');
console.log('El directorio');

if (!coordinador) {
  console.log('   (salteadas) las seis del directorio: validar un legajo es trabajo del');
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

  // Tercera condición, la de la migración 0061: los papeles que la puerta
  // `publicacion` exige. Este legajo es de cuidador domiciliario, así que le
  // tocan dos —antecedentes penales y certificado de salud— y no tiene
  // ninguno. Las dos comprobaciones que siguen son las que hacen que esta
  // parte pueda fallar: sin ellas, una vista con la puerta rota y una sana
  // contestan lo mismo en cuanto la persona autoriza.
  const sinLosPapeles = await enDirectorio();
  comprobar('Contestó que sí, pero sin los papeles de la puerta: no aparece',
    sinLosPapeles === false, sinLosPapeles ? 'aparece igual' : 'no aparece');

  const marcarPuerta = (tipo) => rest(
    '/rest/v1/verificaciones_asistente?on_conflict=caregiver_id,tipo', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({
        caregiver_id: a.legajoId, tenant_id: a.prestadora.id,
        tipo, estado: 'verificado'
      })
    }, coordinador.token);

  // Uno solo no alcanza, y esto es lo que distingue «la puerta mira la lista
  // entera» de «la puerta se conforma con encontrar algo».
  await marcarPuerta('penales');
  const conUnoSolo = await enDirectorio();
  comprobar('Con un solo papel de la puerta tampoco aparece',
    conUnoSolo === false, conUnoSolo ? 'aparece igual' : 'no aparece');

  await marcarPuerta('salud');
  const dijoQueSi = await enDirectorio();
  comprobar('Con los dos papeles comprobados: recién ahí aparece en el directorio',
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

// --- Las verificaciones del legajo (migraciones 0004, 0026, 0059 y 0060) ----
// Es lo único que la Prestadora controla de un Asistente: quién entra. Hasta
// que existió la pantalla del panel, esta tabla sólo se llenaba con la siembra,
// así que en una Prestadora de verdad el directorio no mostraba ninguna
// comprobación.
//
// **Estas comprobaciones pueden fallar**, y ésa es la condición que pidió el
// pendiente 70, cerrado el 1 de septiembre de 2026: el legajo de A se creó hace
// un momento y arranca sin ninguna verificación cargada. Sobre un legajo ya
// sembrado, la pantalla rota y la sana contestan lo mismo, y una prueba escrita
// así no prueba nada. La primera
// comprobación de la lista es justamente la que fija ese punto de partida.
console.log('\nLas verificaciones del legajo');

if (!coordinador) {
  console.log('   (salteadas) las ocho de las verificaciones: marcarlas es trabajo del');
  console.log('               personal de la Prestadora, y esa cuenta sólo existe en local.');
} else {
  const a = cuentas[0];
  const b = cuentas[1];

  // El mismo pedido que hace la pantalla: alta o modificación en uno solo,
  // apoyado en la restricción de unicidad (legajo, tipo) de la migración 0004.
  const marcar = (legajoId, tenantId, tipo, estado, token, extra = {}) =>
    rest('/rest/v1/verificaciones_asistente?on_conflict=caregiver_id,tipo', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ caregiver_id: legajoId, tenant_id: tenantId, tipo, estado, ...extra })
    }, token);

  const comprobacionesDeA = async () => {
    const { cuerpo } = await rest('/rest/v1/rpc/perfil_del_directorio', {
      method: 'POST',
      body: JSON.stringify({ p_slug: a.prestadora.slug, p_id: a.legajoId })
    });
    return (Array.isArray(cuerpo) && cuerpo[0] && cuerpo[0].comprobaciones) || [];
  };

  const antes = await comprobacionesDeA();
  comprobar('El legajo arranca sin ninguna comprobación en su tarjeta',
    antes.length === 0, antes.length ? 'ya traía ' + antes.join(', ') : 'ninguna');

  // Se manda a propósito una huella inventada, que es lo que haría quien
  // quisiera dejarle a otro la firma de una comprobación que hizo él. La base
  // la tiene que pisar con `auth.uid()` y con la hora de ahora.
  const escrita = await marcar(a.legajoId, a.prestadora.id, 'domicilio', 'verificado',
    coordinador.token,
    { verificado_por: b.userId, verificado_el: '2000-01-01T00:00:00Z' });
  const fila = Array.isArray(escrita.cuerpo) ? escrita.cuerpo[0] : null;
  comprobar('El personal de la Prestadora puede marcar una verificación',
    escrita.estado < 300 && fila && fila.estado === 'verificado',
    'respuesta ' + escrita.estado);

  comprobar('La huella la escribe la base y no el pedido',
    !!fila && fila.verificado_por === coordinador.userId
      && !!fila.verificado_el && !String(fila.verificado_el).startsWith('2000'),
    fila ? 'quedó ' + fila.verificado_por : 'no devolvió fila');

  const despues = await comprobacionesDeA();
  comprobar('Lo marcado sale en su tarjeta del directorio',
    despues.includes('domicilio'), despues.length ? despues.join(', ') : 'ninguna');

  // El otro lado del muro: el mismo coordinador, sobre el legajo de la
  // Prestadora ajena. Y no alcanza con mirar la respuesta: se vuelve a
  // preguntar si quedó escrito algo, porque un rechazo silencioso y una
  // escritura que sí entró se ven parecidos desde afuera.
  const ajena = await marcar(b.legajoId, b.prestadora.id, 'domicilio', 'verificado',
    coordinador.token);
  const { cuerpo: quedoAlgo } = await rest(
    '/rest/v1/verificaciones_asistente?caregiver_id=eq.' + b.legajoId, {}, coordinador.token);
  comprobar('No puede marcar un legajo de la otra Prestadora',
    ajena.estado >= 400 && (!Array.isArray(quedoAlgo) || quedoAlgo.length === 0),
    'respuesta ' + ajena.estado);

  // Y quien no es personal tampoco se marca las propias, que sería firmarse uno
  // mismo los papeles que la Prestadora tiene que comprobar.
  const propia = await marcar(a.legajoId, a.prestadora.id, 'referencia', 'verificado', a.token);
  comprobar('El Asistente no se marca sus propias verificaciones',
    propia.estado >= 400, 'respuesta ' + propia.estado);

  // Volver a «sin presentar» borra la huella: la columna no puede seguir
  // diciendo que alguien lo comprobó el martes si ya no está comprobado.
  const vuelta = await marcar(a.legajoId, a.prestadora.id, 'domicilio', 'pendiente',
    coordinador.token);
  const filaVuelta = Array.isArray(vuelta.cuerpo) ? vuelta.cuerpo[0] : null;
  comprobar('Volver a «sin presentar» borra la huella',
    !!filaVuelta && filaVuelta.verificado_por === null && filaVuelta.verificado_el === null,
    filaVuelta ? 'quedó ' + filaVuelta.verificado_por : 'no devolvió fila');

  const alFinal = await comprobacionesDeA();
  comprobar('Y la tarjeta deja de mostrarla',
    !alFinal.includes('domicilio'), alFinal.length ? alFinal.join(', ') : 'ninguna');
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
     porque es justo la confusión que tenía escrita el teléfono —fue el
     pendiente 112, cerrado—, y porque una prueba que sólo mira el camino
     bueno deja
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

// --- 47 a 58: la modalidad, que es donde se encuentran (migración 0054) --------
// Las tres tablas nuevas guardan **el contacto y nada del trato**, y por eso su
// aislamiento no se parece a ninguno de los de arriba: no lo decide la
// Prestadora ni lo decide una Familia sola, lo deciden **las dos partes**. El
// personal de la Prestadora, que en todo el resto del esquema es quien más ve,
// acá no lee una sola fila.
//
// Hacen falta tres cuentas más, y cada una está por algo que las cuatro de
// arriba no pueden hacer:
//
//   D: un segundo Asistente en la Prestadora de A. Sin él no hay dos
//      postulaciones al mismo aviso, y «el Asistente ve la suya» no se
//      distingue de «ve todas».
//   E: otra Familia de la MISMA Prestadora, sin legajo y sin nada en el medio.
//      Es la que tiene que ver cero, y la única que puede mostrar que la
//      barrera entre Familias también vale acá.
//   F: la Familia de la Prestadora B, para que la otra Prestadora también
//      tenga contacto cargado de verdad. Sin ella, «no ve lo de la otra» sería
//      mirar una tabla vacía, que es justo lo que la regla de la empresa no
//      acepta como prueba.
const deLaModalidad = [];
for (const [etiqueta, prestadora] of [['D', cuentas[0].prestadora],
                                      ['E', cuentas[0].prestadora],
                                      ['F', cuentas[1].prestadora]]) {
  const email = `prueba.aislamiento.${etiqueta.toLowerCase()}.${sello}@ejemplo.invalid`;
  const password = `Ficticia-${sello}-${etiqueta}`;
  const alta = await registrar(email, password, {
    full_name: `Persona Ficticia ${etiqueta}`,
    tenant_slug: prestadora.slug
  });
  let token = alta.estado < 400 ? alta.cuerpo.access_token : null;
  const userIdModalidad = alta.cuerpo.user?.id || alta.cuerpo.id;
  // Desde que se recreó el contenedor de cuentas del entorno local (fue el
  // pendiente 123, cerrado), el alta local ya no confirma sola: hay que
  // confirmarla a propósito, con la llave de servicio, y recién ahí pedir la sesión.
  if (!token && alta.estado < 400 && claveServicio && userIdModalidad) {
    await fetch(base + '/auth/v1/admin/users/' + userIdModalidad, {
      method: 'PUT',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email_confirm: true })
    });
    token = (await entrar(email, password)).cuerpo.access_token;
  } else if (!token && alta.estado < 400) {
    token = (await entrar(email, password)).cuerpo.access_token;
  }
  if (!token) {
    console.error('No se pudo crear la cuenta ficticia ' + etiqueta + ', que es una de las tres');
    console.error('que hacen falta para probar la modalidad. Sin ella esa parte no se verifica.');
    process.exit(1);
  }
  deLaModalidad.push({
    etiqueta, email, token, prestadora,
    userId: alta.cuerpo.user?.id || alta.cuerpo.id
  });
}

console.log('');
console.log('La modalidad: la postulación, la conversación y los mensajes');
{
  const [segundoAsistente, familiaAjena, familiaDeLaOtra] = deLaModalidad;
  const familiaDelAviso = familias[0];   // C: publicó su aviso y no tiene legajo
  const asistenteUno    = cuentas[0];    // A: tiene legajo en la misma Prestadora
  const asistenteDeB    = cuentas[1];    // B: el legajo de la Prestadora ajena

  // El segundo Asistente carga su legajo, igual que lo cargaron A y B.
  {
    const r = await rest('/rest/v1/caregivers', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        full_name: 'Legajo Ficticio ' + segundoAsistente.etiqueta,
        user_id: segundoAsistente.userId,
        tenant_id: segundoAsistente.prestadora.id,
        profession: 'cuidador_domiciliario'
      })
    }, segundoAsistente.token);
    segundoAsistente.legajoId = Array.isArray(r.cuerpo) && r.cuerpo[0] ? r.cuerpo[0].id : null;
  }

  // Y las dos Familias nuevas publican el suyo. El de E no lo mira nadie: está
  // para que el intento a nombre ajeno tenga dónde apuntar sin chocar contra el
  // índice único, que rechazaría por el motivo equivocado.
  for (const f of [familiaAjena, familiaDeLaOtra]) {
    const r = await rest('/rest/v1/avisos', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ patient_name: 'Paciente Ficticio ' + f.etiqueta })
    }, f.token);
    f.avisoId = Array.isArray(r.cuerpo) && r.cuerpo[0] ? r.cuerpo[0].id : null;
  }

  const postular = (quien, aviso, extra = {}) => rest('/rest/v1/postulaciones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      aviso_id: aviso,
      caregiver_id: quien.legajoId,
      mensaje: 'Me ofrezco para el puesto. Persona Ficticia ' + quien.etiqueta,
      ...extra
    })
  }, quien.token);

  const filasDe = async (quien, tabla, columnas) => {
    const { cuerpo } = await rest('/rest/v1/' + tabla + '?select=' + columnas, {}, quien.token);
    return Array.isArray(cuerpo) ? cuerpo : [];
  };
  const postulacionesDe = (quien) =>
    filasDe(quien, 'postulaciones', 'id,aviso_id,caregiver_id,mensaje,tenant_id');
  const conversacionesDe = (quien) =>
    filasDe(quien, 'conversaciones', 'id,familia_id,caregiver_id,aviso_id,tenant_id');
  const mensajesDe = (quien) =>
    filasDe(quien, 'mensajes', 'id,conversacion_id,autor_id,contenido,tenant_id');

  // ── La postulación ────────────────────────────────────────────────────────
  // Los dos que siguen son el control positivo de todo lo demás: sin estas dos
  // filas escritas, cada «no ve nada» de más abajo sería un cero de tabla vacía.
  const suya = await postular(asistenteUno, familiaDelAviso.avisoId);
  asistenteUno.postulacionId =
    Array.isArray(suya.cuerpo) && suya.cuerpo[0] ? suya.cuerpo[0].id : null;
  comprobar('El Asistente se postula al aviso de la Familia',
    suya.estado === 201 && !!asistenteUno.postulacionId, 'respuesta ' + suya.estado);

  const delOtro = await postular(segundoAsistente, familiaDelAviso.avisoId);
  segundoAsistente.postulacionId =
    Array.isArray(delOtro.cuerpo) && delOtro.cuerpo[0] ? delOtro.cuerpo[0].id : null;
  comprobar('Y otro Asistente se postula al mismo aviso',
    delOtro.estado === 201 && !!segundoAsistente.postulacionId, 'respuesta ' + delOtro.estado);

  /* `caregiver_id` no tiene valor por omisión: sale del pedido, así que acá no
     alcanza con mirar a nombre de quién quedó, como en `avisos`. Tiene
     que ser rechazado. Y apunta al aviso de E a propósito: contra el de C, el
     índice `una_postulacion_por_aviso` lo rechazaría igual por duplicado, y la
     comprobación pasaría sin haber tocado la política. */
  const conElLegajoAjeno = await rest('/rest/v1/postulaciones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      aviso_id: familiaAjena.avisoId,
      caregiver_id: asistenteUno.legajoId,
      mensaje: 'Postulación escrita con el legajo de otro'
    })
  }, segundoAsistente.token);
  comprobar('Nadie se postula con el legajo de otro',
    conElLegajoAjeno.estado >= 400, 'respuesta ' + conElLegajoAjeno.estado);

  // Y el aviso de la otra Prestadora es inalcanzable: lo cierra la llave
  // compuesta (aviso_id, tenant_id) que agregó la propia 0054.
  const cruzada = await postular(asistenteUno, familiaDeLaOtra.avisoId);
  comprobar('Una postulación no cruza Prestadoras',
    cruzada.estado >= 400, 'respuesta ' + cruzada.estado);

  const veElAsistente = await postulacionesDe(asistenteUno);
  comprobar('El Asistente ve la postulación que hizo él y ninguna del otro Asistente',
    veElAsistente.length === 1 && veElAsistente[0].id === asistenteUno.postulacionId,
    veElAsistente.length + ' filas');

  const veLaFamilia = await postulacionesDe(familiaDelAviso);
  comprobar('La Familia del aviso ve las dos postulaciones que le hicieron',
    veLaFamilia.length === 2, veLaFamilia.length + ' filas');

  const veLaAjena = await postulacionesDe(familiaAjena);
  comprobar('Otra Familia de la misma Prestadora no ve ninguna postulación',
    veLaAjena.length === 0 && veLaFamilia.length === 2,
    veLaAjena.length + ' filas (la dueña del aviso ve ' + veLaFamilia.length + ')');

  // La Familia marca vista y descartada, que es todo lo que le dejaron tocar:
  // no hay «aceptada», porque aceptar sería guardar el trato.
  const ahora = new Date().toISOString();
  const marcar = await rest('/rest/v1/postulaciones?id=eq.' + asistenteUno.postulacionId, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ vista_el: ahora, descartada_el: ahora })
  }, familiaDelAviso.token);
  const marcada = Array.isArray(marcar.cuerpo) && marcar.cuerpo[0];
  comprobar('La Familia del aviso la marca vista y descartada',
    !!marcada && !!marcada.vista_el && !!marcada.descartada_el, 'respuesta ' + marcar.estado);

  /* Y el mensaje del Asistente no lo puede reescribir. Esto no lo decide la
     política —la fila es la misma que acaba de marcar— sino el permiso por
     columna de la 0054 §7, que es lo único que distingue «puede tocar la fila»
     de «puede tocar esta columna». Se mira el rechazo y además que el texto
     siga siendo el que escribió su autor: un rechazo que igual hubiera dejado
     la columna cambiada no probaría nada. */
  const reescribir = await rest('/rest/v1/postulaciones?id=eq.' + asistenteUno.postulacionId, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ mensaje: 'Mensaje reescrito por quien no lo escribió' })
  }, familiaDelAviso.token);
  const comoQuedo = (await postulacionesDe(asistenteUno))
    .find((p) => p.id === asistenteUno.postulacionId);
  comprobar('Y no puede reescribir el mensaje del Asistente',
    reescribir.estado >= 400 && !!comoQuedo &&
    comoQuedo.mensaje === 'Me ofrezco para el puesto. Persona Ficticia ' + asistenteUno.etiqueta,
    'respuesta ' + reescribir.estado);

  // ── La conversación ───────────────────────────────────────────────────────
  const abrir = (quien, legajo, aviso, extra = {}) => rest('/rest/v1/conversaciones', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ caregiver_id: legajo, aviso_id: aviso, ...extra })
  }, quien.token);

  const canal = await abrir(familiaDelAviso, asistenteUno.legajoId, familiaDelAviso.avisoId);
  const conversacionId = Array.isArray(canal.cuerpo) && canal.cuerpo[0] ? canal.cuerpo[0].id : null;
  familiaDelAviso.conversacionId = conversacionId;
  comprobar('La Familia abre la conversación con el Asistente',
    canal.estado === 201 && !!conversacionId, 'respuesta ' + canal.estado);

  /* `familia_id` sí tiene valor por omisión, pero si el pedido lo trae, el
     pedido gana: lo que lo frena es la política. Va con el legajo del segundo
     Asistente para no chocar contra `una_conversacion_por_par`, que rechazaría
     por duplicado y no por suplantación. */
  const aNombreDeOtra = await abrir(familiaAjena, segundoAsistente.legajoId, null,
    { familia_id: familiaDelAviso.userId });
  comprobar('Nadie contacta a nombre de otra Familia',
    aNombreDeOtra.estado >= 400, 'respuesta ' + aNombreDeOtra.estado);

  const canalDeLaFamilia   = await conversacionesDe(familiaDelAviso);
  const canalDelAsistente  = await conversacionesDe(asistenteUno);
  comprobar('Las dos partes ven la conversación',
    canalDeLaFamilia.length === 1 && canalDelAsistente.length === 1 &&
    canalDeLaFamilia[0].id === conversacionId && canalDelAsistente[0].id === conversacionId,
    'la Familia ve ' + canalDeLaFamilia.length + ', el Asistente ve ' + canalDelAsistente.length);

  const canalDeLaAjena = await conversacionesDe(familiaAjena);
  comprobar('Otra Familia de la misma Prestadora no ve la conversación',
    canalDeLaAjena.length === 0 && canalDeLaFamilia.length === 1,
    canalDeLaAjena.length + ' filas (las partes ven ' + canalDeLaFamilia.length + ')');

  // ── Los mensajes ──────────────────────────────────────────────────────────
  const escribir = (quien, conversacion, texto) => rest('/rest/v1/mensajes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ conversacion_id: conversacion, contenido: texto })
  }, quien.token);

  const dijoLaFamilia = await escribir(familiaDelAviso, conversacionId,
    'Buenas tardes. ¿Le interesa el puesto?');
  const dijoElAsistente = await escribir(asistenteUno, conversacionId,
    'Buenas tardes. Sí, me interesa.');
  const primerMensajeId = Array.isArray(dijoLaFamilia.cuerpo) && dijoLaFamilia.cuerpo[0]
    ? dijoLaFamilia.cuerpo[0].id : null;
  comprobar('Cada una de las dos partes escribe su mensaje',
    dijoLaFamilia.estado === 201 && dijoElAsistente.estado === 201 && !!primerMensajeId,
    'respuestas ' + dijoLaFamilia.estado + ' y ' + dijoElAsistente.estado);

  const enCanalAjeno = await escribir(segundoAsistente, conversacionId,
    'Mensaje metido en una conversación que no es mía');
  comprobar('Un mensaje no se escribe en una conversación ajena',
    enCanalAjeno.estado >= 400, 'respuesta ' + enCanalAjeno.estado);

  const leeLaFamilia  = await mensajesDe(familiaDelAviso);
  const leeElAsistente = await mensajesDe(asistenteUno);
  comprobar('Las dos partes leen los dos mensajes',
    leeLaFamilia.length === 2 && leeElAsistente.length === 2,
    'la Familia lee ' + leeLaFamilia.length + ', el Asistente lee ' + leeElAsistente.length);

  const leeLaAjena = await mensajesDe(familiaAjena);
  comprobar('Otra Familia de la misma Prestadora no lee ninguno',
    leeLaAjena.length === 0 && leeLaFamilia.length === 2,
    leeLaAjena.length + ' filas (las partes leen ' + leeLaFamilia.length + ')');

  // Un canal donde el mensaje se puede reescribir después no sirve para lo que
  // las dos partes lo usan. No hay política que lo permita ni permiso de tabla
  // que lo deje pasar, y se prueban los dos verbos.
  const editar = await rest('/rest/v1/mensajes?id=eq.' + primerMensajeId, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ contenido: 'Contenido cambiado después' })
  }, familiaDelAviso.token);
  comprobar('El mensaje no se edita, ni por quien lo escribió',
    editar.estado >= 400, 'respuesta ' + editar.estado);

  const borrarMensaje = await rest('/rest/v1/mensajes?id=eq.' + primerMensajeId, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  }, familiaDelAviso.token);
  const siguenLosDos = await mensajesDe(familiaDelAviso);
  comprobar('Ni se borra: los dos siguen estando',
    borrarMensaje.estado >= 400 && siguenLosDos.length === 2,
    'respuesta ' + borrarMensaje.estado + ', quedan ' + siguenLosDos.length);

  // ── El personal de la Prestadora no lee ninguna de las tres ───────────────
  // Es la decisión que explica la 0054: el contenido es de las dos partes, y
  // mirarlo es meterse en el trato. Con el control positivo al lado, porque si
  // no, «cero» no distingue negado de vacío.
  if (!coordinador) {
    console.log('   (salteadas) las tres del personal de la Prestadora: hacen falta permisos');
    console.log('               de administración, que sólo están en el entorno local.');
  } else {
    const TRES = [
      ['postulaciones',  postulacionesDe],
      ['conversaciones', conversacionesDe],
      ['mensajes',       mensajesDe]
    ];
    for (const [tabla, comoSeMira] of TRES) {
      const delPersonal  = await comoSeMira(coordinador);
      const deLaFamilia  = await comoSeMira(familiaDelAviso);
      const delAsistente = await comoSeMira(asistenteUno);
      comprobar('El personal de la Prestadora no lee ' + tabla + ', y las dos partes sí',
        delPersonal.length === 0 && deLaFamilia.length > 0 && delAsistente.length > 0,
        'personal ' + delPersonal.length + '   Familia ' + deLaFamilia.length +
        '   Asistente ' + delAsistente.length);
    }

    /* Y las dos que no estaban en esa lista, que son justo las que se abrieron
       calladas. `messages` y `reportes` no cuelgan de la modalidad sino del aviso, y
       las dos preguntaban por el aviso con un `exists` que no repetía de quién
       era. La RLS de `avisos` no alcanza para filtrarlo: a este mismo
       coordinador le devuelve **todos** los avisos de su Organización
       (`0020_la_barrera_tambien_va_entre_familias.sql:77-82`), así que el
       `exists` daba verdadero para cualquier fila y el personal leía el reporte
       de cuidado y la conversación enteros. Lo cerró la migración 0067, y esto
       es lo que faltaba para que se notara: las tres tablas de arriba están en
       la lista desde el principio y estas dos no estaban en ninguna.

       Las dos filas se escriben acá, con el aviso puesto, y por dos motivos.
       El primero es el de siempre: sin el control positivo al lado, «cero» no
       distingue negado de vacío. El segundo es más grave y es el que hacía
       invisible el agujero: `reportes` no tenía en toda la base **ni una fila
       con `aviso_id`** —nadie lo llena todavía, que es el pendiente 52—, así
       que cualquier comprobación escrita sin cargar una habría dado verde con
       la política abierta de par en par. */
    const reporteDelAviso = await rest('/rest/v1/reportes', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        caregiver_id: asistenteUno.legajoId,
        aviso_id: familiaDelAviso.avisoId,
        blood_pressure: '118/76', glycemia: '92',
        daily_notes: 'Anotación ficticia colgada del aviso'
      })
    }, asistenteUno.token);
    const reporteDelAvisoId = Array.isArray(reporteDelAviso.cuerpo) && reporteDelAviso.cuerpo[0]
      ? reporteDelAviso.cuerpo[0].id : null;
    const hayReporte = !!reporteDelAvisoId;
    /* Las dos filas se piden por su identificador y no por el aviso: sobre ese
       aviso hay filas que escribieron otros tramos de esta misma prueba, y
       entonces «2» no distinguiría la que se acaba de escribir de las demás. */
    const reporteLaFamilia = await rest(
      '/rest/v1/reportes?select=id&id=eq.' + reporteDelAvisoId, {}, familiaDelAviso.token);
    const reporteElPersonal = await rest(
      '/rest/v1/reportes?select=id&id=eq.' + reporteDelAvisoId, {}, coordinador.token);
    const rf = Array.isArray(reporteLaFamilia.cuerpo) ? reporteLaFamilia.cuerpo.length : -1;
    const rp = Array.isArray(reporteElPersonal.cuerpo) ? reporteElPersonal.cuerpo.length : -1;
    comprobar('El personal de la Prestadora no lee el reporte del aviso, y la Familia sí',
      hayReporte && rf === 1 && rp === 0,
      hayReporte ? ('Familia ' + rf + '   personal ' + rp)
                 : 'no se pudo escribir el reporte con aviso (' + reporteDelAviso.estado +
                   '), así que esto no probó nada');

    const mensajeDelAviso = await rest('/rest/v1/messages', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        content: 'Mensaje ficticio colgado del aviso',
        aviso_id: familiaDelAviso.avisoId,
        author_id: familiaDelAviso.userId
      })
    }, familiaDelAviso.token);
    familiaDelAviso.mensajeId = Array.isArray(mensajeDelAviso.cuerpo) && mensajeDelAviso.cuerpo[0]
      ? mensajeDelAviso.cuerpo[0].id : null;
    const mensajeLaFamilia = await rest(
      '/rest/v1/messages?select=id&id=eq.' + familiaDelAviso.mensajeId,
      {}, familiaDelAviso.token);
    const mensajeElPersonal = await rest(
      '/rest/v1/messages?select=id&id=eq.' + familiaDelAviso.mensajeId,
      {}, coordinador.token);
    const mf = Array.isArray(mensajeLaFamilia.cuerpo) ? mensajeLaFamilia.cuerpo.length : -1;
    const mp = Array.isArray(mensajeElPersonal.cuerpo) ? mensajeElPersonal.cuerpo.length : -1;
    comprobar('El personal de la Prestadora no lee los mensajes del aviso, y la Familia sí',
      !!familiaDelAviso.mensajeId && mf === 1 && mp === 0,
      familiaDelAviso.mensajeId ? ('Familia ' + mf + '   personal ' + mp)
        : 'no se pudo escribir el mensaje con aviso (' + mensajeDelAviso.estado +
          '), así que esto no probó nada');
  }

  // ── Y entre Prestadoras ───────────────────────────────────────────────────
  // La Prestadora B arma su propio contacto, con su Familia y su Asistente. Con
  // las dos cargadas, esto falla por los dos lados: si la política perdiera lo
  // propio, una dejaría de ver lo suyo; si perdiera la Prestadora, vería lo de
  // la otra.
  const postulacionEnB = await postular(asistenteDeB, familiaDeLaOtra.avisoId);

  /* Y este contacto se abre por el OTRO camino del mercado: sin aviso. Los dos
     caminos son dos —la Familia publica un aviso y los Asistentes se postulan,
     o la Familia mira el directorio, compara perfiles y contacta—, y hasta el 2
     de septiembre de 2026 esta prueba abría las dos conversaciones colgadas de
     un aviso, así que el camino del directorio no lo probaba nada. Es el que
     usa `perfil.html:573`, que llama a `abrirConversacion(idAsistente, null)`.
     Se comprueba que la fila entre y que quede **con el aviso en nulo**: si
     alguna vez la columna pasara a exigir valor, el contacto desde el
     directorio dejaría de poder abrirse y ninguna otra comprobación lo diría. */
  const canalEnB = await abrir(familiaDeLaOtra, asistenteDeB.legajoId, null);
  const canalEnBId = Array.isArray(canalEnB.cuerpo) && canalEnB.cuerpo[0]
    ? canalEnB.cuerpo[0].id : null;
  const asiQuedo = Array.isArray(canalEnB.cuerpo) && canalEnB.cuerpo[0]
    ? canalEnB.cuerpo[0] : null;
  comprobar('La Familia contacta desde el directorio, sin aviso, y el contacto queda',
    canalEnB.estado === 201 && !!canalEnBId && !!asiQuedo && asiQuedo.aviso_id === null,
    'respuesta ' + canalEnB.estado + ', aviso_id ' + (asiQuedo ? asiQuedo.aviso_id : '(sin fila)'));
  if (canalEnBId) {
    await escribir(familiaDeLaOtra, canalEnBId, 'Buenas tardes desde la otra Prestadora.');
    await escribir(asistenteDeB, canalEnBId, 'Buenas tardes. Quedo a disposición.');
  }
  const postulacionEnBId = Array.isArray(postulacionEnB.cuerpo) && postulacionEnB.cuerpo[0]
    ? postulacionEnB.cuerpo[0].id : null;

  const TABLAS = [
    ['postulaciones',  postulacionesDe],
    ['conversaciones', conversacionesDe],
    ['mensajes',       mensajesDe]
  ];
  const enCadaLado = new Map();
  for (const [tabla, comoSeMira] of TABLAS) {
    enCadaLado.set(tabla, [await comoSeMira(familiaDelAviso), await comoSeMira(familiaDeLaOtra)]);
  }

  const sinNada = TABLAS.filter(([t]) => {
    const [enA, enB] = enCadaLado.get(t);
    return enA.length === 0 || enB.length === 0;
  }).map(([t]) => t);
  comprobar('Las dos Prestadoras tienen contacto cargado, y cada una ve el suyo',
    sinNada.length === 0,
    sinNada.length ? 'no ve nada en: ' + sinNada.join(', ')
                   : TABLAS.map(([t]) => t.replace('el prefijo de la modalidad', '') + ': ' +
                       enCadaLado.get(t)[0].length + ' y ' +
                       enCadaLado.get(t)[1].length).join('   '));

  /* Dos formas de preguntar, porque no prueban lo mismo: la primera mira que en
     lo que cada una ve no haya una sola fila con la Prestadora de la otra; la
     segunda pide la fila ajena por su identificador, que es donde un listado
     filtrado y una política ausente dejan de contestar igual. */
  const cruces = [];
  for (const [tabla] of TABLAS) {
    const [enA, enB] = enCadaLado.get(tabla);
    const cuela = enA.filter((f) => f.tenant_id !== familiaDelAviso.prestadora.id).length +
                  enB.filter((f) => f.tenant_id !== familiaDeLaOtra.prestadora.id).length;
    if (cuela > 0) cruces.push(tabla + ': ' + cuela);
  }
  const porSuIdentificador = await Promise.all([
    postulacionEnBId
      ? filasDe(familiaDelAviso, 'postulaciones', 'id&id=eq.' + postulacionEnBId)
      : null,
    canalEnBId
      ? filasDe(familiaDelAviso, 'conversaciones', 'id&id=eq.' + canalEnBId)
      : null
  ]);
  const pedidasDeMas = porSuIdentificador.filter((f) => f === null || f.length > 0).length;
  comprobar('Y ninguna ve una sola fila de la otra, ni pidiéndola por su identificador',
    cruces.length === 0 && pedidasDeMas === 0,
    cruces.length ? cruces.join('   ')
      : pedidasDeMas ? pedidasDeMas + ' fila(s) ajena(s) alcanzables por identificador'
      : 'ninguna ajena en las tres tablas');

  // ── 59 a 63: las cuatro funciones de la migración 0055 ─────────────────
  /* Las cuatro son `security definer`: corren con los permisos de quien las
     escribió y **la RLS no las mira**. Lo único que las acota es lo que
     preguntan adentro —`legajo_propio()`, `auth.uid()`, `prestadora_actual()`—
     y las columnas que eligen devolver. Una tabla mal abierta la agarra
     cualquiera de las pruebas de arriba; una función así, ninguna. Por eso van
     aparte, y por eso acá se le pregunta a la fila **qué columnas tiene**, que
     es la parte que no se ve mirando cuántas filas volvieron. */
  const llamar = async (quien, funcion, argumentos) => {
    const { estado, cuerpo } = await rest('/rest/v1/rpc/' + funcion, {
      method: 'POST',
      body: JSON.stringify(argumentos || {})
    }, quien ? quien.token : clave);
    return { estado, filas: Array.isArray(cuerpo) ? cuerpo : [] };
  };
  /* Las columnas que no pueden salir por ninguna de las cuatro. `contact_info`
     y `familia_id` son el camino corto para saltearse a la Prestadora, y
     `patient_name` es dato personal repartido antes de que exista ningún
     trato. Se busca por nombre de columna y también por el valor cargado, que
     es lo que agarra a una función que la devuelve con otro nombre. */
  const PROHIBIDAS = ['contact_info', 'familia_id', 'patient_name', 'contacto', 'telefono', 'email'];
  const colar = (filas, valoresQueNoVan) => {
    const encontradas = [];
    for (const fila of filas) {
      for (const columna of Object.keys(fila || {})) {
        if (PROHIBIDAS.includes(columna)) encontradas.push('columna ' + columna);
      }
      for (const valor of valoresQueNoVan) {
        if (!valor) continue;
        for (const [columna, contenido] of Object.entries(fila || {})) {
          if (typeof contenido === 'string' && contenido.includes(valor)) {
            encontradas.push(columna + ' trae el dato de contacto');
          }
        }
      }
    }
    return [...new Set(encontradas)];
  };

  /* El aviso de C nace con el nombre del paciente y nada más, así que
     preguntarle a la respuesta si trae el contacto sería mirar una columna
     vacía: la comprobación daría verde con la función rota. Se le carga el
     contacto de verdad —inventado, como todo acá— y recién entonces se busca
     ese texto en cada fila que salga por las cuatro funciones. */
  const CONTACTO_DEL_AVISO = 'contacto.ficticio.' + sello + '@ejemplo.invalid';
  const NOMBRE_DEL_PACIENTE = 'Paciente Ficticio ' + familiaDelAviso.etiqueta;
  {
    const cargado = await rest('/rest/v1/avisos?id=eq.' + familiaDelAviso.avisoId, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        contact_info: { nombre: 'Familia Ficticia C', email: CONTACTO_DEL_AVISO,
                        celular: '+54 9 11 0000-0000' },
        zone: 'zona_ficticia',
        status: 'activa'
      })
    }, familiaDelAviso.token);
    comprobar('El aviso de prueba queda con contacto cargado, para que el control pueda fallar',
      cargado.estado === 200 && Array.isArray(cargado.cuerpo) &&
      JSON.stringify(cargado.cuerpo[0]?.contact_info || {}).includes(CONTACTO_DEL_AVISO),
      'respuesta ' + cargado.estado);
  }

  console.log('');
  console.log('Las cuatro funciones que le dan de comer a las pantallas del encuentro');

  // 59. Los avisos que el Asistente puede ver.
  {
    const delAsistente = await llamar(asistenteUno, 'avisos_abiertos');
    const idsVistos = delAsistente.filas.map((f) => f.id);
    comprobar('El Asistente ve el aviso de su Prestadora por avisos_abiertos()',
      delAsistente.estado === 200 && idsVistos.includes(familiaDelAviso.avisoId),
      'respuesta ' + delAsistente.estado + ', ' + delAsistente.filas.length + ' aviso(s)');

    comprobar('Y no ve ninguno de la otra Prestadora',
      !idsVistos.includes(familiaDeLaOtra.avisoId) && idsVistos.length > 0,
      idsVistos.length + ' visto(s), el ajeno ' +
        (idsVistos.includes(familiaDeLaOtra.avisoId) ? 'SE COLÓ' : 'no está'));

    const suyo = delAsistente.filas.filter((f) => f.id === familiaDelAviso.avisoId)[0];
    comprobar('La función le dice que ya se postuló a ese aviso',
      !!suyo && suyo.ya_me_postule === true,
      suyo ? 'ya_me_postule = ' + suyo.ya_me_postule : 'no llegó el aviso');

    const filtradas = colar(delAsistente.filas, [CONTACTO_DEL_AVISO, NOMBRE_DEL_PACIENTE]);
    comprobar('Y ninguna fila trae contacto, familia ni nombre del paciente',
      filtradas.length === 0 && delAsistente.filas.length > 0,
      filtradas.length ? filtradas.join('   ')
        : 'columnas: ' + Object.keys(delAsistente.filas[0] || {}).join(','));

    /* El control que hace que los tres de arriba signifiquen algo: la misma
       llamada, hecha por quien no tiene legajo, tiene que traer cero. Si
       trajera lo mismo, la función no está preguntando quién llama. */
    const deLaFamilia = await llamar(familiaDelAviso, 'avisos_abiertos');
    comprobar('Una Familia, que no tiene legajo, no recibe ningún aviso por ahí',
      deLaFamilia.filas.length === 0 && delAsistente.filas.length > 0,
      'la Familia ve ' + deLaFamilia.filas.length + ', el Asistente ve ' + delAsistente.filas.length);

    const delOtroLado = await llamar(asistenteDeB, 'avisos_abiertos');
    comprobar('El Asistente de la otra Prestadora ve el suyo y no el de ésta',
      delOtroLado.filas.some((f) => f.id === familiaDeLaOtra.avisoId) &&
      !delOtroLado.filas.some((f) => f.id === familiaDelAviso.avisoId),
      delOtroLado.filas.length + ' aviso(s) del otro lado');
  }

  // 60. La grilla de días y turnos.
  {
    await rest('/rest/v1/franjas_aviso', {
      method: 'POST',
      body: JSON.stringify({ aviso_id: familiaDelAviso.avisoId, dia: 'lunes', turno: 'manana' })
    }, familiaDelAviso.token);
    await rest('/rest/v1/franjas_aviso', {
      method: 'POST',
      body: JSON.stringify({ aviso_id: familiaDeLaOtra.avisoId, dia: 'martes', turno: 'tarde' })
    }, familiaDeLaOtra.token);

    const propia = await llamar(asistenteUno, 'franjas_de_aviso', { p_aviso: familiaDelAviso.avisoId });
    const ajena  = await llamar(asistenteUno, 'franjas_de_aviso', { p_aviso: familiaDeLaOtra.avisoId });
    comprobar('El Asistente ve la grilla del aviso de su Prestadora, y no la del ajeno',
      propia.filas.length > 0 && ajena.filas.length === 0,
      'propia ' + propia.filas.length + ', ajena ' + ajena.filas.length);
    comprobar('Y la grilla viaja en claves de vocabulario, no en etiquetas',
      propia.filas.every((f) => f.dia === f.dia.toLowerCase() && !f.dia.includes(' ')),
      propia.filas.map((f) => f.dia + '/' + f.turno).join(' '));
  }

  // 61. Las postulaciones que recibió la Familia.
  {
    const deLaFamilia = await llamar(familiaDelAviso, 'postulaciones_de_mis_avisos');
    comprobar('La Familia ve por la función las dos postulaciones de su aviso',
      deLaFamilia.estado === 200 && deLaFamilia.filas.length === 2,
      'respuesta ' + deLaFamilia.estado + ', ' + deLaFamilia.filas.length + ' fila(s)');

    const deLaAjena = await llamar(familiaAjena, 'postulaciones_de_mis_avisos');
    comprobar('Otra Familia de la misma Prestadora no ve ninguna',
      deLaAjena.filas.length === 0 && deLaFamilia.filas.length === 2,
      'la ajena ve ' + deLaAjena.filas.length + ', la dueña ve ' + deLaFamilia.filas.length);

    const filtradas = colar(deLaFamilia.filas, [CONTACTO_DEL_AVISO]);
    comprobar('Y del Asistente no sale ningún dato de contacto',
      filtradas.length === 0 && deLaFamilia.filas.length > 0,
      filtradas.length ? filtradas.join('   ')
        : 'columnas: ' + Object.keys(deLaFamilia.filas[0] || {}).join(','));

    const delAsistente = await llamar(asistenteUno, 'postulaciones_de_mis_avisos');
    comprobar('Y el Asistente no lee por ahí las postulaciones de nadie',
      delAsistente.filas.length === 0, delAsistente.filas.length + ' fila(s)');
  }

  // 62. Las conversaciones, la misma función de los dos lados.
  {
    const deLaFamilia   = await llamar(familiaDelAviso, 'mis_conversaciones');
    const delAsistente  = await llamar(asistenteUno, 'mis_conversaciones');
    comprobar('Las dos partes ven la conversación por mis_conversaciones()',
      deLaFamilia.filas.length === 1 && delAsistente.filas.length === 1 &&
      deLaFamilia.filas[0].id === conversacionId &&
      delAsistente.filas[0].id === conversacionId,
      'la Familia ve ' + deLaFamilia.filas.length + ', el Asistente ve ' + delAsistente.filas.length);

    comprobar('Y cada uno se reconoce de su lado',
      deLaFamilia.filas[0]?.soy_la_familia === true &&
      delAsistente.filas[0]?.soy_la_familia === false,
      'Familia ' + deLaFamilia.filas[0]?.soy_la_familia +
        ', Asistente ' + delAsistente.filas[0]?.soy_la_familia);

    const deLaAjena = await llamar(familiaAjena, 'mis_conversaciones');
    comprobar('Otra Familia de la misma Prestadora no ve ninguna conversación',
      deLaAjena.filas.length === 0 && deLaFamilia.filas.length === 1,
      'la ajena ve ' + deLaAjena.filas.length + ', las partes ven ' + deLaFamilia.filas.length);

    const filtradas = colar([...deLaFamilia.filas, ...delAsistente.filas], [CONTACTO_DEL_AVISO]);
    comprobar('Y la conversación no devuelve ningún dato de contacto de ninguno de los dos',
      filtradas.length === 0 && deLaFamilia.filas.length > 0,
      filtradas.length ? filtradas.join('   ')
        : 'columnas: ' + Object.keys(deLaFamilia.filas[0] || {}).join(','));
  }

  // 63. Sin sesión, ninguna de las cuatro contesta.
  {
    const CUATRO = [
      ['avisos_abiertos', {}],
      ['franjas_de_aviso', { p_aviso: familiaDelAviso.avisoId }],
      ['postulaciones_de_mis_avisos', {}],
      ['mis_conversaciones', {}]
    ];
    const abiertas = [];
    for (const [funcion, argumentos] of CUATRO) {
      const { estado } = await llamar(null, funcion, argumentos);
      if (estado < 400) abiertas.push(funcion + ' contestó ' + estado);
    }
    comprobar('Sin sesión no se llama a ninguna de las cuatro',
      abiertas.length === 0,
      abiertas.length ? abiertas.join('   ') : 'las cuatro niegan a anon');
  }

  // ── 64 a 68: la fichada atada al vínculo, migración 0056 ─────────────
  console.log('');
  console.log('La mitad operativa: la fichada que la Familia sí ve');
  {
    const fichar = async (quien, tipo, conversacionId) => {
      const fila = {
        caregiver_id: quien.legajoId,
        latitude: -34.6037,
        longitude: -58.3816,
        event_type: tipo
      };
      if (conversacionId) fila.conversacion_id = conversacionId;
      const { estado, cuerpo } = await rest('/rest/v1/clock_ins', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(fila)
      }, quien.token);
      return { estado, fila: Array.isArray(cuerpo) ? cuerpo[0] : null };
    };
    const fichadasDe = (quien) =>
      filasDe(quien, 'clock_ins', 'id,caregiver_id,conversacion_id,event_type,tenant_id');

    /* Las dos que siguen son el control positivo de todo el bloque: sin ellas
       cargadas, «la Familia ajena ve cero» lo daría igual una tabla vacía. */
    const atada = await fichar(asistenteUno, 'entrada', familiaDelAviso.conversacionId);
    comprobar('El Asistente marca una entrada diciendo para qué vínculo es',
      atada.estado === 201 && atada.fila &&
      atada.fila.conversacion_id === familiaDelAviso.conversacionId,
      'respuesta ' + atada.estado);

    const suelta = await fichar(asistenteUno, 'salida', null);
    comprobar('Y marca otra sin decir para quién, que es lo que se podía hacer antes',
      suelta.estado === 201 && suelta.fila && !suelta.fila.conversacion_id,
      'respuesta ' + suelta.estado);

    // 64. La Familia del vínculo ve la atada.
    {
      const deLaFamilia = await fichadasDe(familiaDelAviso);
      const ids = deLaFamilia.map((f) => f.id);
      comprobar('La Familia del vínculo ve la fichada que lleva su vínculo',
        ids.includes(atada.fila.id),
        've ' + deLaFamilia.length + ' fichada(s)');

      // 66. Y no ve la suelta, que quedó sin decir para quién.
      comprobar('Y no ve la que se marcó sin vínculo, aunque sea del mismo Asistente',
        !ids.includes(suelta.fila.id),
        'la suelta ' + (ids.includes(suelta.fila.id) ? 'se coló' : 'no aparece'));
    }

    // 65. Otra Familia de la misma Prestadora no ve ninguna de las dos.
    {
      const deLaAjena   = await fichadasDe(familiaAjena);
      const deLaFamilia = await fichadasDe(familiaDelAviso);
      comprobar('Otra Familia de la misma Prestadora no ve ninguna fichada, y la del vínculo sí',
        deLaAjena.length === 0 && deLaFamilia.length > 0,
        'la ajena ve ' + deLaAjena.length + ', la del vínculo ve ' + deLaFamilia.length);
    }

    // 66 (la otra mitad). El Asistente ve las dos suyas.
    {
      const delAsistente = await fichadasDe(asistenteUno);
      const ids = delAsistente.map((f) => f.id);
      comprobar('El Asistente ve las dos suyas, la atada y la suelta',
        ids.includes(atada.fila.id) && ids.includes(suelta.fila.id),
        've ' + delAsistente.length + ' fichada(s)');
    }

    // 67. Y no puede colgar una de una conversación ajena.
    {
      const ajena = await fichar(segundoAsistente, 'entrada', familiaDelAviso.conversacionId);
      comprobar('Un Asistente no cuelga su fichada de una conversación que no es suya',
        ajena.estado >= 400,
        'respuesta ' + ajena.estado);
    }

    // 68. El personal de la Prestadora no lee ninguna.
    if (!coordinador) {
      console.log('   (salteada) la del personal de la Prestadora: hacen falta permisos');
      console.log('              de administración, que sólo están en el entorno local.');
    } else {
      const delPersonal  = await fichadasDe(coordinador);
      const deLaFamilia  = await fichadasDe(familiaDelAviso);
      const delAsistente = await fichadasDe(asistenteUno);
      comprobar('El personal de la Prestadora no lee ninguna fichada, y las dos partes sí',
        delPersonal.length === 0 && deLaFamilia.length > 0 && delAsistente.length > 0,
        'personal ' + delPersonal.length + '   Familia ' + deLaFamilia.length +
        '   Asistente ' + delAsistente.length);
    }
  }

  // ── 69 a 75: la alarma que sale de esas fichadas, migración 0057 ──────
  console.log('');
  console.log('La alarma: avisa, y no decide');
  {
    /* Las cuatro marcas que siguen se cargan con la fecha puesta a mano, y es
       la única forma de que esta prueba pueda fallar: la alarma de la jornada
       abierta recién existe pasado el tope de horas, y una fichada marcada
       ahora nunca lo pasa. `created_at` tiene valor por omisión pero se puede
       escribir, y la política no mira esa columna.

       Quedan, en orden, sobre el mismo vínculo y con la de «ahora» que ya dejó
       el bloque anterior:

         -100h  entrada   cierra con la de -99h        no alarma
          -99h  salida    tiene su entrada delante     no alarma
          -72h  salida    no tiene ninguna delante     ALARMA
          -48h  entrada   nunca cerró, y pasó el tope  ALARMA
          ahora entrada   nunca cerró, pero no lo pasó  no alarma

       Son dos, y ni una más. Cada una de las tres que no alarman prueba algo
       distinto: la de -100h que una jornada cerrada no molesta, la de -99h que
       la salida con entrada delante tampoco, y la de «ahora» que el tope
       gobierna de verdad —sin él serían tres—. */
    const haceHoras = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
    const marcar = async (tipo, horas) => {
      const { estado } = await rest('/rest/v1/clock_ins', {
        method: 'POST',
        body: JSON.stringify({
          caregiver_id: asistenteUno.legajoId,
          latitude: -34.6037,
          longitude: -58.3816,
          event_type: tipo,
          conversacion_id: familiaDelAviso.conversacionId,
          created_at: haceHoras(horas)
        })
      }, asistenteUno.token);
      return estado;
    };
    const cargadas = [
      await marcar('entrada', 100),
      await marcar('salida',   99),
      await marcar('salida',   72),
      await marcar('entrada',  48)
    ];
    comprobar('Se cargan cuatro marcas fechadas a mano, para que la alarma pueda fallar',
      cargadas.every((e) => e === 201), 'respuestas ' + cargadas.join(','));

    const clases = (filas) => filas.map((f) => f.clase).sort().join(',');

    // 69. La Familia ve exactamente dos, y son las dos que tienen que ser.
    const deLaFamilia = await llamar(familiaDelAviso, 'mis_alarmas', {});
    comprobar('La Familia ve las dos alarmas, y ninguna de las otras tres marcas',
      deLaFamilia.estado === 200 &&
      clases(deLaFamilia.filas) === 'jornada_abierta,salida_sin_entrada',
      'respuesta ' + deLaFamilia.estado + ', ' + deLaFamilia.filas.length +
      ' alarma(s): ' + (clases(deLaFamilia.filas) || 'ninguna'));

    /* Y que la vieja sea la vieja, no la de recién: si la alarma saliera de la
       última entrada, la comprobación de arriba daría verde igual. */
    {
      const abierta = deLaFamilia.filas.find((f) => f.clase === 'jornada_abierta');
      comprobar('Y la jornada abierta que avisa es la vieja, no la que se marcó recién',
        !!abierta && abierta.horas >= 47 && abierta.horas <= 49,
        abierta ? 'lleva ' + abierta.horas + ' horas, tope ' + abierta.tope_horas
                : 'no vino ninguna');
    }

    // 70. El Asistente ve las mismas dos.
    {
      const delAsistente = await llamar(asistenteUno, 'mis_alarmas', {});
      comprobar('El Asistente ve las mismas dos, que son de su propio vínculo',
        delAsistente.estado === 200 &&
        clases(delAsistente.filas) === 'jornada_abierta,salida_sin_entrada',
        delAsistente.filas.length + ' alarma(s)');
    }

    // 71. Otra Familia de la misma Prestadora no ve ninguna.
    {
      const deLaAjena = await llamar(familiaAjena, 'mis_alarmas', {});
      comprobar('Otra Familia de la misma Prestadora no ve ninguna alarma, y la del vínculo sí',
        deLaAjena.filas.length === 0 && deLaFamilia.filas.length > 0,
        'la ajena ve ' + deLaAjena.filas.length + ', la del vínculo ve ' +
        deLaFamilia.filas.length);
    }

    // 72. Y no sale ningún dato de contacto por ahí.
    {
      const filtradas = colar(deLaFamilia.filas, [CONTACTO_DEL_AVISO]);
      comprobar('La alarma no trae ningún dato de contacto de nadie',
        filtradas.length === 0 && deLaFamilia.filas.length > 0,
        filtradas.length ? filtradas.join('   ')
          : 'columnas: ' + Object.keys(deLaFamilia.filas[0] || {}).join(','));
    }

    // 73. El personal de la Prestadora no ve ninguna.
    if (!coordinador) {
      console.log('   (salteada) la alarma vista por el personal de la Prestadora:');
      console.log('              hacen falta permisos que sólo están en el entorno local.');
    } else {
      const delPersonal = await llamar(coordinador, 'mis_alarmas', {});
      comprobar('El personal de la Prestadora no ve ninguna alarma, y la Familia sí',
        delPersonal.filas.length === 0 && deLaFamilia.filas.length > 0,
        'personal ' + delPersonal.filas.length + '   Familia ' + deLaFamilia.filas.length);
    }

    // 74. El tope es de la Prestadora, y de nadie más.
    {
      const topesDe = async (quien) => {
        const { estado, cuerpo } = await rest(
          '/rest/v1/alarmas_prestadora?select=id,tenant_id,horas_jornada_abierta',
          {}, quien.token);
        return { estado, filas: Array.isArray(cuerpo) ? cuerpo : [] };
      };
      const escribir = async (quien, horas) => {
        const { estado } = await rest(
          '/rest/v1/alarmas_prestadora?tenant_id=eq.' + familiaDelAviso.prestadora.id,
          { method: 'PATCH', body: JSON.stringify({ horas_jornada_abierta: horas }) },
          quien.token);
        return estado;
      };

      const deLaFamiliaTope   = await topesDe(familiaDelAviso);
      const delAsistenteTope  = await topesDe(asistenteUno);
      comprobar('Ni la Familia ni el Asistente leen el tope de horas',
        deLaFamiliaTope.filas.length === 0 && delAsistenteTope.filas.length === 0,
        'Familia ' + deLaFamiliaTope.filas.length +
        '   Asistente ' + delAsistenteTope.filas.length);

      if (!coordinador) {
        console.log('   (salteada) la escritura del tope por el personal de la Prestadora:');
        console.log('              hacen falta permisos que sólo están en el entorno local.');
      } else {
        /* Cuánto dice antes de que nadie lo toque. **No se exige el valor de
           fábrica**: esta misma prueba lo cambia dos renglones más abajo y la
           base de esta máquina no se rehace entre corridas, así que pedir
           dieciséis la ponía roja la segunda vez —y pasó—. Una prueba que
           depende de haber corrido recién después de un `reset` no es una
           prueba: es un recordatorio. Lo que se comprueba es lo que la regla
           dice, que la Prestadora lee **una** fila y que el número es un
           entero adentro del rango que acepta la columna. */
        const antes = await topesDe(coordinador);
        const valorInicial = antes.filas.length === 1
          ? antes.filas[0].horas_jornada_abierta : null;

        /* Un PATCH que no alcanza ninguna fila contesta 204 igual que uno que
           sí: no alcanza con mirar el número. Se pregunta después si el valor
           cambió, y esa pregunta la contesta quien sí lo puede leer. */
        await escribir(familiaDelAviso, 99);
        await escribir(asistenteUno, 98);
        const trasLosAjenos = await topesDe(coordinador);
        const quedoEn = trasLosAjenos.filas.length === 1
          ? trasLosAjenos.filas[0].horas_jornada_abierta : null;
        comprobar('El personal de la Prestadora lee su tope, y lo que escribieron los otros no llegó',
          antes.filas.length === 1 && Number.isInteger(valorInicial) &&
          valorInicial >= 1 && valorInicial <= 168 &&
          trasLosAjenos.filas.length === 1 && quedoEn === valorInicial,
          antes.filas.length !== 1 ? 'lee ' + antes.filas.length + ' fila(s)'
                                   : 'venía en ' + valorInicial + ', quedó en ' + quedoEn);

        /* Escribir el mismo número que ya tenía no probaría nada: la fila
           quedaría igual tanto si el PATCH entró como si lo negaron. */
        const otro = valorInicial === 24 ? 25 : 24;
        const cambio = await escribir(coordinador, otro);
        const despues = await topesDe(coordinador);
        comprobar('Y es el único que lo cambia',
          cambio < 400 && despues.filas.length === 1 &&
          despues.filas[0].horas_jornada_abierta === otro,
          'respuesta ' + cambio + ', quedó en ' +
          (despues.filas[0] ? despues.filas[0].horas_jornada_abierta : 'nada'));

        /* Y se deja como estaba. La Prestadora ficticia es el banco de pruebas
           de todo lo demás: una prueba que le cambia la configuración al pasar
           le deja el trabajo sucio a la que venga atrás. */
        if (Number.isInteger(valorInicial)) await escribir(coordinador, valorInicial);
      }
    }

    // 75. Sin sesión no contesta.
    {
      const { estado } = await llamar(null, 'mis_alarmas', {});
      comprobar('Sin sesión no se llama a mis_alarmas()',
        estado >= 400, 'respuesta ' + estado);
    }
  }
}

// --- Limpieza ---------------------------------------------------------------
console.log('');
/* Primero los mensajes: `messages.aviso_id` borra con `set null` y no en
   cascada, así que un mensaje sobrevive al aviso que lo llevaba y se quedaría
   en la base sin nada que lo nombre. */
for (const f of familias) {
  if (f.mensajeId) await rest('/rest/v1/messages?id=eq.' + f.mensajeId, { method: 'DELETE' }, f.token);
}
/* Después los avisos, y con ellos se van en cascada las postulaciones. Las
   conversaciones y los mensajes no: `conversaciones.aviso_id` borra con
   `set null`, así que el canal sobrevive al aviso y se va recién con el legajo
   —`la_conversacion_es_con_un_legajo_de_la_misma_prestadora` sí borra en
   cascada—, que es lo que se borra en el bucle de abajo. */
for (const f of [cuentas[0], familias[0], ...deLaModalidad]) {
  for (const aviso of [f.avisoId, f.avisoSuplantado]) {
    if (aviso) await rest('/rest/v1/avisos?id=eq.' + aviso, { method: 'DELETE' }, f.token);
  }
}
for (const c of [...cuentas, ...deLaModalidad]) {
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

   Desde el 1 de septiembre de 2026 se borran de los dos lados. La llave de
   administración del proyecto publicado se la pide al CLI el tramo de arriba,
   igual que hace `probar_alta_y_baja.mjs`, y sin ella la prueba ni arranca. */
/* No se suma a `fallos`: eso diría que falló el aislamiento, y lo que falló es la
   limpieza. Se cuenta aparte y se ve en el código de salida. */
let quedoSucia = false;
const todasLasCuentas = [...cuentas, ...familias, ...deLaModalidad,
                         ...(coordinador ? [coordinador] : [])];
{
  await borrarCuentas(todasLasCuentas);
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
}

// ── Los documentos que dicen cuántas comprobaciones son ─────────────────
// El 31 de agosto de 2026 tres documentos escribían tres números distintos
// —dieciséis, cuarenta y cuarenta y nueve— y ninguno era el de la prueba.
// Ninguna comprobación de `verificar_todo.mjs` puede agarrar eso, porque el
// número no se puede contar leyendo el archivo: hay 73 llamadas a
// `comprobar()` y salen 82 renglones, porque varias están adentro de un
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
const CIENTOS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos',
                'quinientos', 'seiscientos', 'setecientos', 'ochocientos',
                'novecientos'];
function enLetras(n) {
  // Las comprobaciones pasaron de noventa y nueve a cien el 1 de septiembre de
  // 2026, y hasta ese día esto contaba sólo hasta el noventa y nueve: devolvía
  // «undefined» y los cuatro documentos daban rojo sin estar desactualizados.
  if (n >= 100) {
    const c = Math.floor(n / 100), resto = n % 100;
    const cabeza = (c === 1 && resto === 0) ? 'cien' : CIENTOS[c];
    return resto === 0 ? cabeza : cabeza + ' ' + enLetras(resto);
  }
  if (ESPECIALES[n]) return ESPECIALES[n];
  const d = Math.floor(n / 10), u = n % 10;
  // Por debajo del diez no hay decena, y el «y» es de la decena: sin esta
  // rama, ciento ocho salía «ciento  y ocho». Antes no aparecía nunca, porque
  // las comprobaciones se contaban de veinte para arriba y el resto de la
  // centena recién existe desde que pasaron el cien.
  if (d === 0) return UNIDADES[u];
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
  console.log('dicho que sí y que tenga comprobados los papeles para entrar a una casa.');
  console.log('El examen lo corrige la base: la respuesta correcta nunca sale de ahí.');
  console.log('Y la separación no es sólo entre Prestadoras: dos Familias de la misma');
  console.log('Prestadora tampoco se ven los avisos, los horarios, los mensajes ni los reportes.');
  console.log('En la modalidad el límite lo ponen las dos partes: la postulación, la conversación');
  console.log('y los mensajes no los lee nadie más, ni el personal de la Prestadora.');
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
