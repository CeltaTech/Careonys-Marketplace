/* ===================================================
   VERIFICA QUE NINGUNA PANTALLA NOMBRE A UNA PRESTADORA

       node scripts/verificar_organizacion.mjs

   Cada pantalla de este producto se muestra con el nombre y el logotipo de la
   Prestadora que se esté mirando, y cuál es se sabe recién al cargar: sale de la
   dirección —`?t=` o subdominio— y se busca en la base. Escribir el nombre de
   una Prestadora adentro de una pantalla la deja bien para esa sola: cualquier
   otra ve un cartel con el nombre de una empresa que no es la suya.

   Y no es una hipótesis. Medido el 26 de agosto de 2026, la Prestadora de
   ejemplo estaba escrita a mano **70 veces en dieciocho archivos**: en nueve
   títulos de pantalla, en dos descripciones para los buscadores, en cinco
   avisos de derechos reservados, en el texto que dice de quién es la
   responsabilidad de un aval, y en veinte rutas del archivo del logotipo. De
   todo eso, lo único que el guion de marca alcanzaba a corregir al cargar eran
   los nombres y los logotipos que colgaban de un encabezado o de un pie; el
   título de la pantalla, la descripción y los textos corridos no los tocaba
   nadie, así que se publicaban con el nombre de la Prestadora de ejemplo para
   todo el mundo.

   CÓMO SE ESCRIBE AHORA. La pantalla dice dónde va el nombre con el marcador
   `{{organizacion}}`, y `js/identidad.js` lo resuelve dos veces: primero con el
   nombre del producto —que es lo correcto mientras no se sepa qué Prestadora
   es— y después con el de la Prestadora, cuando llega. El logotipo se escribe
   una sola vez, el del producto, y el guion de marca lo cambia por el de la
   Prestadora que tenga uno propio.

   QUÉ MIRA ESTE CHEQUEO. Dos cosas, y las dos con su punto único de verdad:

     1. **Ningún nombre ni nombre corto de Prestadora aparece escrito** en el
        marcado, en los guiones, en los estilos, en los catálogos que se le
        mandan al teléfono ni en la puerta que da de alta y de baja a la gente.
        Esa puerta es justamente donde más caro sale: ahí un «si la Prestadora
        es la de pruebas, permitir» no dejaría un cartel mal puesto, dejaría un
        permiso mal dado. La lista de Prestadoras no
        está escrita acá: sale de `supabase/migrations/`, que es donde se cargan
        las de ejemplo, y se leen tanto las altas como los cambios de nombre
        posteriores. Sin lo segundo, el nombre con el que hoy se ve una
        Prestadora renombrada sería el único que ninguna pantalla tendría
        prohibido escribir.
     2. **La única ruta de logotipo que se escribe es la que declara
        `js/identidad.js`.** Cualquier otra es el logotipo de alguien en
        particular puesto como respaldo de todos.

   QUÉ NO MIRA. Las migraciones, que son las que cargan esas filas y tienen que
   nombrarlas; los documentos de `docs/`, que cuentan lo que pasó; y esta misma
   carpeta. Tampoco los dibujos: el logotipo de una Prestadora lleva su nombre
   adentro porque eso es un logotipo, y prohibírselo sería prohibirle existir;
   dónde se escribe la ruta de un logotipo sí se mira, y es la segunda regla de
   acá arriba. Tampoco mira si el marcador está donde tiene que estar: que una
   pantalla no nombre a nadie no prueba que nombre a la Prestadora correcta.

   Y una advertencia que este chequeo se comió un tiempo: decía que no miraba
   «las migraciones» y lo que dejaba afuera era la carpeta entera que las
   contiene, con la puerta de alta y baja adentro. Un «si la Prestadora es la de
   pruebas» escrito ahí pasaba en verde, comprobado poniéndolo. Ahora lo que
   queda afuera son las migraciones y nada más.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRACIONES = join(raiz, 'supabase', 'migrations');
const IDENTIDAD = join(raiz, 'js', 'identidad.js');

/** Lo que declara `js/identidad.js`: la ruta del logotipo y el código del producto. */
function loQueDeclaraIdentidad() {
  const texto = readFileSync(IDENTIDAD, 'utf8');
  const ruta = texto.match(/logotipo:\s*'([^']+)'/);
  const codigo = texto.match(/codigo:\s*'([^']+)'/);
  if (!ruta || !codigo) {
    throw new Error('js/identidad.js dejó de declarar `logotipo` o `codigo`.');
  }
  return { logotipo: ruta[1], codigo: codigo[1] };
}

/** Las columnas de `public.tenants`, en el orden en que las declara la migración
 *  que crea la tabla.
 *
 *  Hacen falta porque el volcado de la siembra escribe `INSERT INTO
 *  public.tenants VALUES (...)` sin nombrar ninguna columna. Sin ese orden, el
 *  primer valor parece el nombre corto y en realidad es el `uuid`, que es
 *  justamente lo que este chequeo estuvo leyendo: contaba una Prestadora de las
 *  tres que carga la siembra, y las únicas dos palabras que le prohibía escribir
 *  a una pantalla eran un `uuid` y el nombre corto de la primera. */
function columnasDeTenants() {
  for (const archivo of readdirSync(MIGRACIONES).sort()) {
    if (!archivo.endsWith('.sql')) continue;
    const texto = readFileSync(join(MIGRACIONES, archivo), 'utf8');
    const desde = texto.search(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.tenants\s*\(/i);
    if (desde === -1) continue;

    const columnas = [];
    for (const renglon of texto.slice(texto.indexOf('(', desde) + 1).split('\n')) {
      if (renglon.startsWith(')')) break;
      const nombre = renglon.trim().match(/^([a-z_][a-z0-9_]*)\s+[a-z]/i);
      if (nombre && nombre[1].toLowerCase() !== 'constraint') columnas.push(nombre[1].toLowerCase());
    }
    if (columnas.includes('slug')) return columnas;
  }
  throw new Error(
    'Ninguna migración crea `public.tenants` con una columna `slug`, así que no se sabe\n' +
    'en qué orden vienen los valores de la siembra y este chequeo no probó nada.'
  );
}

/** Los valores de un `insert`, tupla por tupla, leídos desde `desde`.
 *
 *  Se lee a mano y no con una expresión regular porque adentro de un texto puede
 *  haber una coma, un paréntesis o un punto y coma —la descripción de una
 *  Prestadora los tiene—, y cortar por cualquiera de ellos deja afuera todo lo
 *  que venga después. Las dos comillas seguidas de adentro de un texto son una
 *  sola comilla, y los paréntesis de una llamada como `now()` no cierran la
 *  tupla. Se para en el primer signo que ya no es una tupla ni la coma que
 *  separa dos, que es donde empieza el resto de la sentencia. */
function tuplas(texto, desde) {
  const filas = [];
  let fila = null;
  let bruto = '';
  let entreComillas = false;
  let enTexto = false;
  let hondo = 0;

  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];

    if (enTexto) {
      if (c === "'" && texto[i + 1] === "'") { bruto += "'"; i++; continue; }
      if (c === "'") { enTexto = false; continue; }
      bruto += c;
      continue;
    }
    if (c === "'") { enTexto = true; entreComillas = true; continue; }

    if (fila === null) {
      if (c === '(') { fila = []; bruto = ''; entreComillas = false; hondo = 0; continue; }
      if (c === ',' || /\s/.test(c)) continue;
      break;
    }

    if (c === '(') { hondo++; bruto += c; continue; }
    if (c === ')' && hondo > 0) { hondo--; bruto += c; continue; }
    if (c === ')') {
      fila.push({ valor: bruto.trim(), entreComillas });
      filas.push(fila);
      fila = null;
      continue;
    }
    if (c === ',') {
      fila.push({ valor: bruto.trim(), entreComillas });
      bruto = '';
      entreComillas = false;
      continue;
    }
    bruto += c;
  }
  return filas;
}

/** Las Prestadoras que las migraciones cargan con nombre escrito.
 *
 *  Se miran las altas y **también los cambios de nombre**. Una Prestadora
 *  renombrada por una migración posterior tiene dos nombres, y el segundo no
 *  está en ningún alta: si acá se leyeran sólo las altas, el nombre con el que
 *  hoy se la ve sería justamente el único que ninguna pantalla tendría prohibido
 *  escribir.
 *
 *  Y se miran **todas las altas de cada archivo, no la primera**. La siembra
 *  escribe una sentencia por Prestadora, así que quedarse con la primera es
 *  quedarse con una sola. */
function prestadorasDelSeed(codigoDelProducto) {
  const nombres = new Map(); // nombre → archivo de la migración que lo escribe
  const cortos = new Set();  // los nombres cortos, que son una Prestadora cada uno
  const declaradas = columnasDeTenants();

  const anotar = (slug, nombre, archivo) => {
    if (!slug || slug === codigoDelProducto) return;
    cortos.add(slug);
    nombres.set(slug, archivo);
    if (nombre) nombres.set(nombre, archivo);
  };

  for (const archivo of readdirSync(MIGRACIONES).sort()) {
    if (!archivo.endsWith('.sql')) continue;
    const texto = readFileSync(join(MIGRACIONES, archivo), 'utf8');

    for (const alta of texto.matchAll(/insert\s+into\s+public\.tenants\s*(\([^)]*\))?\s*values/gi)) {
      const columnas = alta[1]
        ? alta[1].slice(1, -1).split(',').map((c) => c.trim().toLowerCase().replace(/"/g, ''))
        : declaradas;
      const dondeSlug = columnas.indexOf('slug');
      const dondeNombre = columnas.indexOf('name');
      if (dondeSlug === -1) continue;

      for (const fila of tuplas(texto, alta.index + alta[0].length)) {
        const slug = fila[dondeSlug];
        const nombre = fila[dondeNombre];
        /* El alta que vive adentro de una función carga variables, no palabras:
           ahí no hay ningún nombre que una pantalla pueda copiar. */
        if (!slug || !slug.entreComillas) continue;
        anotar(slug.valor, nombre && nombre.entreComillas ? nombre.valor : null, archivo);
      }
    }

    for (const cambio of texto.matchAll(/update\s+public\.tenants([\s\S]*?);/gi)) {
      const nombre = cambio[1].match(/\bname\s*=\s*'([^']+)'/i);
      const slug = cambio[1].match(/\bslug\s*=\s*'([^']+)'/i);
      if (!nombre || !slug) continue;
      anotar(slug[1], nombre[1], archivo);
    }
  }
  return { nombres, cuantas: cortos.size };
}

/** Los problemas, vacío si ninguna pantalla nombra a una Prestadora. */
export function verificarOrganizacion() {
  const { logotipo, codigo } = loQueDeclaraIdentidad();
  const { nombres: prestadoras, cuantas } = prestadorasDelSeed(codigo);
  if (cuantas === 0) {
    throw new Error('Ninguna migración carga una Prestadora con nombre: sin eso este chequeo no prueba nada.');
  }

  /* Se buscan de la más larga a la más corta para que «Cuidar Norte» no lo
     denuncie dos veces quien además tenga un nombre corto contenido adentro. */
  const buscadas = [...prestadoras.keys()].sort((a, b) => b.length - a.length);
  const nombrada = [];
  const logotipos = [];

  /* Las migraciones y nada más: la carpeta que las contiene trae además la
     puerta de alta y baja, que es código del producto y tiene que entrar. Y las
     extensiones no son sólo las de una pantalla: un catálogo que viaja al
     teléfono y la puerta, escrita en otro idioma, también pueden nombrar a
     alguien. */
  const mirados = hayArchivos(
    raiz,
    [...EXTENSIONES_DE_PANTALLA, '.js', '.css', '.json', '.ts'],
    ['docs', 'migrations', 'scripts']
  );
  for (const camino of mirados) {
    const relativa = camino.slice(raiz.length + 1).split(sep).join('/');
    readFileSync(camino, 'utf8').split('\n').forEach((renglon, i) => {
      const numero = i + 1;
      const abajo = renglon.toLowerCase();

      for (const quien of buscadas) {
        if (abajo.includes(quien.toLowerCase())) {
          nombrada.push(`      ${relativa}:${numero}  nombra a «${quien}» (la carga ${prestadoras.get(quien)})`);
          break;
        }
      }

      for (const x of renglon.matchAll(/assets\/images\/[A-Za-z0-9_.-]*logo[A-Za-z0-9_.-]*/gi)) {
        if (x[0] !== logotipo) {
          logotipos.push(`      ${relativa}:${numero}  escribe «${x[0]}» y no «${logotipo}»`);
        }
      }
    });
  }

  const problemas = [];
  if (nombrada.length) {
    problemas.push(
      'Pantallas que nombran a una Prestadora en vez de decir dónde va el nombre:\n' +
      nombrada.join('\n') +
      '\n\n  El nombre de la Prestadora se escribe `{{organizacion}}`, y `js/identidad.js` lo\n' +
      '  resuelve al cargar: con el del producto mientras no se sepa cuál es, y con el de\n' +
      '  la Prestadora en cuanto llega.'
    );
  }
  if (logotipos.length) {
    problemas.push(
      'Rutas de logotipo que no son la que declara `js/identidad.js`:\n' +
      logotipos.join('\n') +
      '\n\n  El logotipo que se escribe es siempre el del producto. El de cada Prestadora lo\n' +
      '  pone `_applyBranding` al cargar, desde su columna `logo_url`.'
    );
  }

  return { problemas, prestadoras: cuantas, archivos: mirados.length, logotipo };
}

// Solo corre cuando se lo llama a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { problemas, prestadoras, archivos: cuantos, logotipo } = verificarOrganizacion();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log(
    `Organización verificada: ${cuantos} archivos sin nombrar a ninguna de las ` +
    `${prestadoras} Prestadoras del seed, y con «${logotipo}» como único logotipo escrito.`
  );
}
