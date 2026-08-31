/* ===================================================
   MIDE EL ESTADO REAL DEL PROYECTO Y LO ESCRIBE EN EL README

       node scripts/medir_estado.mjs              muestra la tabla
       node scripts/medir_estado.mjs --escribir   la deja escrita en README.md

   El README abre con una tabla de números —cuántas pantallas, cuántos
   renglones, cuántas copias, cuántas migraciones— bajo el título «Estado
   real». Esos números se habían medido a mano una vez, con su fecha al lado,
   y de ahí en más envejecieron solos: el 30 de agosto de 2026 la tabla decía
   24 migraciones cuando había 42, y 13 chequeos cuando había 24. Peor: el
   renglón ya estaba equivocado **el mismo día que se midió**, porque contar a
   mano cuarenta archivos sale mal.

   Un número que se escribe a mano en la documentación es un número que va a
   quedar viejo. Así que se mide con un guion, y la tabla del README sale de
   correrlo. Volver a ponerla al día es un comando, no una tarde.

   Qué mide cada renglón está escrito abajo, al lado de cada medición, porque
   la pregunta que importa cuando un número sorprende no es cuánto da sino qué
   cuenta. Y las cajas fuertes no se abren: el recorrido es el mismo
   `scripts/recorrido.mjs` que usan los chequeos.

   Esto no es un chequeo: no se planta ni tiene opinión. Informa. Por eso no se
   llama `verificar_` y `scripts/verificar_todo.mjs` no lo levanta.
=================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { archivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const escribir = process.argv.includes('--escribir');

/* Este guion también se importa: `scripts/verificar_estado.mjs` le pide los
   renglones medidos para compararlos con los que están escritos en el README.
   Importarlo no tiene que imprimir nada ni escribir nada, así que todo lo que
   sale por pantalla queda detrás de esta pregunta. Medir es barato y no toca
   ningún archivo, así que la medición en sí corre igual en los dos casos. */
const corriendoSolo = Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

const leer = (camino) => readFileSync(camino, 'utf8');
const nombreDe = (camino) => relative(raiz, camino).split(sep).join('/');

/* Un renglón es una línea de texto, y la última no cuenta dos veces por
   terminar en salto. Se normalizan los finales de línea de Windows para que el
   mismo archivo no mida distinto según en qué máquina se clonó. */
function renglones(texto) {
  const s = texto.split('\r\n').join('\n');
  return s.split('\n').length - (s.endsWith('\n') ? 1 : 0);
}

const enEspanol = (n) => n.toLocaleString('es-AR');

/* ── LAS PANTALLAS ───────────────────────────────────────────────────────
   Cada archivo `.html` es una pantalla: no hay ruteo, así que la cuenta de
   archivos es la cuenta de pantallas. */
const pantallas = archivos(raiz, EXTENSIONES_DE_PANTALLA).sort();
seRevisaron(pantallas.length, 'una sola pantalla');
const renglonesPantallas = pantallas.reduce((t, c) => t + renglones(leer(c)), 0);

/* ── EL JAVASCRIPT PROPIO ────────────────────────────────────────────────
   Todo `.js` del proyecto: los de `js/`, los de las dos aplicaciones de
   teléfono y sus `service-worker.js`. Los guiones de `scripts/` son `.mjs` y
   no entran: son herramienta, no producto.

   Y aparte, cuánto de eso es copia: se agrupa por contenido y de cada grupo
   repetido se cuentan como copia todos menos el primero. Es la medida de
   `apiClient.js`, que está triplicado byte a byte. */
const guiones = archivos(raiz, ['.js']).sort();
seRevisaron(guiones.length, 'un solo archivo de JavaScript');
let renglonesGuiones = 0;
const porContenido = new Map();
for (const camino of guiones) {
  const fuente = leer(camino);
  renglonesGuiones += renglones(fuente);
  const huella = createHash('sha256').update(fuente).digest('hex');
  if (!porContenido.has(huella)) porContenido.set(huella, []);
  porContenido.get(huella).push(renglones(fuente));
}
let renglonesCopiados = 0;
for (const grupo of porContenido.values()) {
  if (grupo.length > 1) renglonesCopiados += grupo[0] * (grupo.length - 1);
}

/* ── EL JAVASCRIPT METIDO ADENTRO DEL HTML ───────────────────────────────
   Los `<script>` sin `src`, que son los que traen código escrito ahí mismo.
   Ese código no se puede leer con las herramientas de un archivo `.js`, y por
   eso se mide aparte: es la deuda, no el total. */
const bloque = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let bloques = 0;
let renglonesEnHtml = 0;
for (const camino of pantallas) {
  for (const encontrado of leer(camino).matchAll(bloque)) {
    bloques += 1;
    renglonesEnHtml += renglones(encontrado[1].replace(/^\n/, '').replace(/\n[ \t]*$/, ''));
  }
}

/* ── LAS HOJAS DE ESTILO Y SUS TOKENS ────────────────────────────────────
   Un token es una propiedad con nombre propio declarada en `css/tokens.css`.
   Se cuentan los nombres distintos, no las veces que aparecen: el mismo token
   se vuelve a declarar en el modo oscuro y sigue siendo uno. */
const hojas = archivos(raiz, ['.css']).sort();
seRevisaron(hojas.length, 'una sola hoja de estilo');
const renglonesHojas = hojas.reduce((t, c) => t + renglones(leer(c)), 0);
const dondeTokens = join(raiz, 'css', 'tokens.css');
const tokens = new Set(
  Array.from(leer(dondeTokens).matchAll(/(--[a-z0-9-]+)\s*:/gi)).map((a) => a[1]));

/* ── LO PEGADO AL HTML ───────────────────────────────────────────────────
   Cada `style="…"` es un atributo, y adentro puede haber varias
   declaraciones separadas por punto y coma. Se informan las dos cuentas
   porque son dos cosas distintas: los atributos dicen en cuántos lugares hay
   que entrar, las declaraciones dicen cuánto hay que mover. */
let atributosStyle = 0;
let declaraciones = 0;

/* Y la misma cuenta pantalla por pantalla, más los renglones de CSS que cada
   una lleva en un bloque `<style>`. Sirve para saber cuál va a costar más y en
   qué orden conviene portarla, y vive acá y no escrita a mano en
   `docs/PENDIENTES.md`, que es donde estuvo hasta el 31 de agosto de 2026
   diciendo 687 atributos cuando ya eran 247. */
const pegados = [];
for (const camino of pantallas) {
  const fuente = leer(camino);
  let deEsta = 0;
  let declaracionesDeEsta = 0;
  for (const encontrado of fuente.matchAll(/\sstyle="([^"]*)"/gi)) {
    deEsta += 1;
    declaracionesDeEsta += encontrado[1].split(';').filter((d) => d.trim()).length;
  }
  atributosStyle += deEsta;
  declaraciones += declaracionesDeEsta;

  let enBloque = 0;
  for (const encontrado of fuente.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    enBloque += renglones(encontrado[1].replace(/^\n/, '').replace(/\n[ \t]*$/, ''));
  }

  if (deEsta || enBloque) {
    pegados.push({
      archivo: nombreDe(camino),
      atributos: deEsta,
      declaraciones: declaracionesDeEsta,
      bloque: enBloque
    });
  }
}
pegados.sort((a, b) =>
  b.atributos - a.atributos || b.bloque - a.bloque || a.archivo.localeCompare(b.archivo));
seRevisaron(pegados.length, 'una sola pantalla con estilos pegados al HTML');

/* ── LA SESIÓN ───────────────────────────────────────────────────────────
   Una pantalla rescata la sesión al abrir si carga `js/auth.js`, que es el
   único lugar donde vive `Sesion`. */
const conSesion = pantallas.filter((c) => /js\/auth\.js/.test(leer(c)));

/* ── LO QUE SE PIDE AFUERA ───────────────────────────────────────────────
   Los servidores distintos a los que la página le pide algo. No hay
   `package.json` ni compilación: todo entra por dirección. */
const afuera = new Set();
for (const camino of [...pantallas, ...hojas]) {
  for (const encontrado of leer(camino).matchAll(/https:\/\/([a-z0-9.-]+)/gi)) {
    afuera.add(encontrado[1].toLowerCase());
  }
}

/* ── LA BASE ─────────────────────────────────────────────────────────────
   Las migraciones son archivos y se cuentan solas. Las tablas se cuentan por
   nombre distinto creado, sin el esquema adelante: la misma tabla nombrada
   `public.zonas_asistente` y `zonas_asistente` es una. */
const migraciones = archivos(join(raiz, 'supabase', 'migrations'), ['.sql']).sort();
seRevisaron(migraciones.length, 'una sola migración');
const tablas = new Set();
for (const camino of migraciones) {
  for (const encontrado of leer(camino)
    .matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_.]+)/gi)) {
    tablas.add(encontrado[1].toLowerCase().replace(/^public\./, ''));
  }
}

/* ── LOS CHEQUEOS ────────────────────────────────────────────────────────
   `verificar_todo.mjs` no es uno de ellos: es el que los corre. */
const chequeos = archivos(join(raiz, 'scripts'), ['.mjs'])
  .map(nombreDe)
  .filter((n) => /\/verificar_[a-z_]+\.mjs$/.test(n) && basename(n) !== 'verificar_todo.mjs');
seRevisaron(chequeos.length, 'un solo chequeo');

/* ── LA TABLA ────────────────────────────────────────────────────────────
   El renglón de los servidores de afuera dice de qué es cada uno, y eso no se
   puede medir: se escribe una vez y se comprueba que la cuenta no se haya
   movido. El día que aparezca un quinto, la frase avisa que quedó vieja. */
const DE_AFUERA = new Map([
  [4, 'dos de tipografías y dos de bibliotecas']
]);

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const hoy = new Date();
const fecha = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;

const renglonesTabla = [
  [`${enEspanol(pantallas.length)} pantallas HTML, ${enEspanol(renglonesPantallas)} renglones`,
   'sin ruteo: cada pantalla es un archivo'],
  [`${enEspanol(renglonesGuiones)} renglones de JavaScript propio, en ${enEspanol(guiones.length)} archivos`,
   `${enEspanol(renglonesCopiados)} de ellos son copias byte a byte de otro archivo (pendiente 13)`],
  [`${enEspanol(renglonesEnHtml)} renglones más metidos adentro del HTML`,
   `en ${enEspanol(bloques)} bloques \`<script>\``],
  [`${enEspanol(renglonesHojas)} renglones de hojas de estilo, en ${enEspanol(hojas.length)} archivos`,
   `${enEspanol(tokens.size)} tokens con nombre en \`css/tokens.css\`, sin framework`],
  [`${enEspanol(declaraciones)} declaraciones más, pegadas al HTML`,
   `en ${enEspanol(atributosStyle)} atributos \`style=\` (fue el pendiente 8, cerrado)`],
  ['Supabase Auth funcionando',
   `${enEspanol(conSesion.length)} de las ${enEspanol(pantallas.length)} pantallas rescatan la sesión al abrir`],
  [`${enEspanol(afuera.size)} servidores de afuera, sin \`package.json\` ni compilación`,
   DE_AFUERA.get(afuera.size) || `${[...afuera].sort().join(', ')} — hay que decir de qué es cada uno`],
  [`${enEspanol(tablas.size)} tablas y ${enEspanol(migraciones.length)} migraciones en el repositorio`,
   `${enEspanol(chequeos.length)} chequeos las miran antes de cada commit`]
];

const tabla =
  `Medido el ${fecha} sobre el árbol de trabajo con \`node scripts/medir_estado.mjs\`, ` +
  `que es de\ndonde sale esta tabla: no se escribe a mano y no queda vieja.\n\n` +
  '| | |\n|---|---|\n' +
  renglonesTabla.map(([a, b]) => `| ${a} | ${b} |`).join('\n') + '\n';

/* ── LA TABLA DEL REPARTO, PARA docs/PENDIENTES.md ───────────────────────
   La otra mitad de lo mismo: el total va al README y el detalle por pantalla
   va a la lista de pendientes, donde dice qué va a costar más portar. Se
   escribe entre dos marcas para que el medidor sepa qué reemplazar. */
const conBloque = pegados.filter((c) => c.bloque > 0);
const renglonesEnBloques = conBloque.reduce((t, c) => t + c.bloque, 0);

const renglonesReparto = pegados
  .filter((c) => c.atributos > 0)
  .map((c) => `| \`${c.archivo}\` | ${enEspanol(c.atributos)} | ${enEspanol(c.declaraciones)} |`);

const tablaReparto =
  '| Archivo | Atributos `style=` | Declaraciones |\n|---|---:|---:|\n' +
  renglonesReparto.join('\n') + '\n\n' +
  `Hay además ${enEspanol(renglonesEnBloques)} renglones de CSS en bloques \`<style>\` adentro del ` +
  'HTML:\n' +
  conBloque.map((c) => `${enEspanol(c.bloque)} en \`${c.archivo}\``).join(', ') + '.\n';

/* Los renglones medidos, para que `verificar_estado.mjs` los compare con los
   que están escritos en el README. La fecha no se exporta a propósito: cambia
   todos los días y compararla pondría el chequeo en rojo cada mañana. */
export { renglonesTabla, tabla, renglonesReparto, tablaReparto };

if (!corriendoSolo) {
  // Importado: ya midió, que es todo lo que le pedían.
} else if (!escribir) {
  console.log(tabla);
  console.log('Para dejarla escrita en README.md:  node scripts/medir_estado.mjs --escribir');
} else {

/* ── DEJARLA ESCRITA ─────────────────────────────────────────────────────
   Se reemplaza desde el renglón de la fecha hasta el final de la tabla. El
   README está guardado con finales de línea de Windows y se devuelve igual:
   cambiarlos entero convertiría una medición en un cambio de mil renglones. */
const dondeReadme = join(raiz, 'README.md');
const crudo = leer(dondeReadme);
const crlf = crudo.includes('\r\n');
const antes = crlf ? crudo.split('\r\n').join('\n') : crudo;

const viejo = /^Medido el [^\n]*\n(?:[^\n]*\n)*?\|[^\n]*\|\n(?:\|[^\n]*\|\n)+/m;
const encontrado = viejo.exec(antes);
if (!encontrado) {
  console.error('No se encontró la tabla del estado real en README.md, así que no se tocó nada.');
  console.error('Tiene que empezar con un renglón «Medido el …» y seguir con la tabla.');
  process.exit(1);
}

const despues = antes.slice(0, encontrado.index) + tabla +
  antes.slice(encontrado.index + encontrado[0].length);
/* Y acá no se sale aunque el README ya esté al día: falta la otra tabla, y un
   `process.exit(0)` en el medio la dejaría sin escribir cada vez que cambie
   sólo el detalle por pantalla. */
if (despues === antes) {
  console.log('La tabla del estado real ya estaba al día.');
} else {
  writeFileSync(dondeReadme, crlf ? despues.split('\n').join('\r\n') : despues);
  console.log('Tabla del estado real puesta al día en README.md:\n');
  console.log(tabla);
}

/* ── Y EL DETALLE POR PANTALLA, EN docs/PENDIENTES.md ──────────────────
   Entre dos marcas, porque acá la tabla está en el medio del archivo y no al
   final de una sección reconocible. Si las marcas no están, se avisa y se sale
   con error: un medidor que no encuentra dónde escribir y se calla deja la
   tabla vieja pareciendo recién medida. */
const dondePendientes = join(raiz, 'docs', 'PENDIENTES.md');
const crudoP = leer(dondePendientes);
const crlfP = crudoP.includes('\r\n');
const antesP = crlfP ? crudoP.split('\r\n').join('\n') : crudoP;

const ABRE = '<!-- reparto: lo escribe scripts/medir_estado.mjs, no se edita a mano -->';
const CIERRA = '<!-- fin del reparto -->';
const desdeP = antesP.indexOf(ABRE);
const hastaP = antesP.indexOf(CIERRA);
if (desdeP === -1 || hastaP === -1 || hastaP < desdeP) {
  console.error('No se encontraron las dos marcas del reparto en docs/PENDIENTES.md,');
  console.error('así que no se tocó. Tienen que estar, en este orden:');
  console.error('  ' + ABRE);
  console.error('  ' + CIERRA);
  process.exit(1);
}

const despuesP =
  antesP.slice(0, desdeP + ABRE.length) + '\n\n' + tablaReparto + '\n' + antesP.slice(hastaP);
if (despuesP === antesP) {
  console.log('La tabla del reparto ya estaba al día.');
} else {
  writeFileSync(dondePendientes, crlfP ? despuesP.split('\n').join('\r\n') : despuesP);
  console.log('Tabla del reparto puesta al día en docs/PENDIENTES.md.');
}
}
