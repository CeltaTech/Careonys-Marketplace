/* ===================================================
   VERIFICA TRES PALABRAS DEL GLOSARIO EN EL TEXTO QUE SE VE

   Falla —con código de salida 1— si en el texto que ve una persona aparece
   «cuidador» usado como nombre de cualquiera que cuida, «búsqueda» usada
   como nombre de lo que una Familia publica, o «cuaderno» y «bitácora»
   usadas como nombre del reporte.

       node scripts/verificar_vocabulario.mjs

   Por qué existe: `docs/GLOSARIO.md` fija **Asistente** como el único término
   general y nombra expresamente «cuidador» entre lo que no se debe usar así. El
   25 de agosto de 2026 se sacó de las pantallas —eran ochenta y dos apariciones
   en diez archivos— y esa limpieza es una foto: la pantalla siguiente la escribe
   alguien que no leyó el glosario. Una regla que no se verifica sola no es una
   regla, que es lo mismo que hicieron el chequeo de trato y el de identidad.

   Dónde sí puede aparecer, y por qué:
   - **`cuidador domiciliario`**, con el sustantivo pegado: ahí no es el término
     general sino **el nombre de un tipo**, la clave `cuidador_domiciliario` del
     vocabulario `tipo_asistente`. Un enfermero universitario y un cuidador
     domiciliario son dos tipos de Asistente.
   - **`síndrome del cuidador`**: es el nombre de un cuadro clínico y nombra a un
     familiar agotado, no a nadie de la plataforma.
   - **Los nombres que no se leen**: `documentos-cuidadores` (el depósito),
     `hero_cuidadores.png` (una imagen), `btn-submit-cuidador` (un botón). Se
     reconocen por el guion o el guion bajo pegado, y cambiarlos rompe algo.
   Hubo una cuarta, y se fue el 31 de agosto de 2026: **`soporte-remoto.html`
   estaba exenta entera** porque ahí los que cuidan son familiares. Cuando esa
   pantalla se pasó a i18n el texto se llevó la palabra con él, la exención
   dejó de eximir nada —cero apariciones en la pantalla y ninguna en el
   catálogo de frases— y siguió salteando el archivo entero, con lo cual esa
   pantalla quedó afuera también de las otras dos palabras que este chequeo
   mira. Una exención que no exime nada no es inofensiva: apaga todo lo demás.
   Si la palabra vuelve por el motivo legítimo, la exención se escribe **por
   aparición**, nunca por archivo.

   **La segunda palabra: «búsqueda» no nombra lo que se publica.** El
   Desarrollador decidió el 25 de agosto de 2026 que lo que una Familia publica
   es un **Aviso** —queda guardado— y que **Búsqueda** es el acto de buscar, que
   no deja nada. Las pantallas decían «Publicar Búsqueda» en siete lugares y
   «Nueva Búsqueda» en dos, y la base decía `care_searches`. Todo eso se cambió
   ese mismo día.

   Buscar sigue siendo buscar, así que la palabra suelta no se prohíbe: «Filtro
   y Búsqueda en la Red de Asistentes» está bien dicho, y «la búsqueda libre
   ignora tildes» también. Lo que se busca son las formas donde la palabra
   nombra una cosa guardada, y ninguna de ellas tiene uso legítimo: publicar una
   búsqueda, una búsqueda publicada, una búsqueda nueva, y las búsquedas de una
   Familia. Un chequeo que avisa de más se termina apagando.

   Qué no mira: los comentarios del código y `docs/`. Un comentario explica de
   dónde salieron las cosas, y para eso necesita nombrarlas como se llamaban.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
import { visible, visibleDeMigracion, soloCastellano, formatoDe } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: el vocabulario se revisa en el texto que ve una persona.

   `supabase/` sí se mira, desde el 30 de agosto de 2026: una migración es código,
   pero además **carga texto que después se lee en la pantalla** —las etiquetas de
   los vocabularios, las Guías de cuidado—, y ese texto se escapaba de acá. De
   cada `.sql` se mira sólo lo rotulado `"es-AR"`, nunca las sentencias ni los
   comentarios: eso lo resuelve `visibleDeMigracion()`. */
const AJENAS = ['docs', 'scripts', 'assets'];

/* `\b` de JavaScript no entiende las vocales acentuadas, así que el borde de
   palabra se marca con propiedades Unicode, igual que en el chequeo de trato.
   El guion y el guion bajo quedan **afuera** del borde a propósito: son lo que
   distingue un nombre de código de una palabra escrita para leer. */
const PALABRA = /(?<![\p{L}\p{N}_-])(cuidador|cuidadora|cuidadores|cuidadoras)(?![\p{L}\p{N}_-])/giu;

/* Lo que sigue o precede a la palabra y la vuelve legítima. */
const ES_EL_TIPO = /^\s+domiciliari[oa]s?\b/iu;
const ES_EL_SINDROME = /\bs[ií]ndrome\s+del\s*$/iu;

/** Devuelve la primera aparición que sobra en la frase, o null. */
function apariciónQueSobra(frase) {
  PALABRA.lastIndex = 0;
  let acierto;
  while ((acierto = PALABRA.exec(frase)) !== null) {
    const antes = frase.slice(0, acierto.index);
    const despues = frase.slice(acierto.index + acierto[0].length);
    if (ES_EL_TIPO.test(despues)) continue;
    if (ES_EL_SINDROME.test(antes)) continue;
    return acierto[1];
  }
  return null;
}

/* Las formas en que «búsqueda» nombra lo que se publica. Ninguna se escribe
   queriendo decir el acto de buscar, y por eso se pueden prohibir sin avisar
   de más. */
const ES_UN_AVISO = [
  /\bpublicaci[oó]n\s+de\s+b[uú]squedas?\b/iu,
  /\bpublica\w*\s+(?:una?\s+|la\s+|su\s+)?b[uú]squedas?\b/iu,
  /\bb[uú]squedas?\s+public\w+\b/iu,
  /\bnuevas?\s+b[uú]squedas?\b/iu,
  /\bb[uú]squedas?\s+de\s+(?:familias?|la\s+familia)\b/iu
];

/** Devuelve el pedazo de frase donde «búsqueda» nombra un Aviso, o null. */
function búsquedaQueEsAviso(frase) {
  for (const patron of ES_UN_AVISO) {
    const acierto = frase.match(patron);
    if (acierto) return acierto[0];
  }
  return null;
}

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra frases que sobran y contra frases que no. */
// Lo que el Asistente anota de una jornada se llama **reporte** (decidido el 25
// de agosto de 2026, y es el nombre que ya usaba Careonys). Se lo llamó «cuaderno
// de cuidado» y «bitácora» hasta ese día, y ninguna de las dos tiene otro uso
// legítimo acá: cualquier aparición en texto visible es la palabra vieja
// volviendo. Por eso este detector no necesita excepciones, al revés que el de
// «cuidador».
const ES_LA_PALABRA_VIEJA = /(?<![\p{L}\p{N}_-])(cuadernos?|bit[aá]coras?)(?![\p{L}\p{N}_-])/giu;

function palabraVieja(frase) {
  ES_LA_PALABRA_VIEJA.lastIndex = 0;
  const acierto = ES_LA_PALABRA_VIEJA.exec(frase);
  return acierto ? acierto[0] : null;
}

const SOBRAN = [
  'Encuentre al cuidador que necesita',
  'Conectamos familias con cuidadores calificados',
  'Para Cuidadores',
  'Cuidadora: María Gómez',
  'Soy una persona que busca un cuidador calificado'
];
const NO_SOBRAN = [
  'Asistente / Cuidador domiciliario',
  'Cuidadora Domiciliaria, Voluntaria.',
  'Herramientas para prevenir el síndrome del cuidador',
  'documentos-cuidadores',
  'assets/images/hero_cuidadores.png',
  'btn-submit-cuidador',
  'form-registro-cuidador-completo',
  'apoyo_cuidador',
  'Encuentre al Asistente que necesita'
];

const SON_AVISOS = [
  'Publicar Búsqueda (Wizard)',
  'Publicación de Búsqueda y Formularios',
  'Publicar una Búsqueda de Cuidado',
  '¡Búsqueda publicada con éxito!',
  'Nueva Búsqueda',
  'Búsquedas de Familias'
];
const NO_SON_AVISOS = [
  'Filtro y Búsqueda en la Red de Asistentes',
  'La búsqueda libre ignora tildes',
  'herramientas que facilitan la búsqueda y gestión del cuidado',
  'Filtros de búsqueda',
  'Publicar un Aviso'
];

const SON_LA_VIEJA = ['Cuaderno de Cuidado', 'la bitácora del día', 'Bitácora'];
const NO_SON_LA_VIEJA = ['Reportes de cuidado', 'el reporte quedó guardado'];

const noDetecta = SOBRAN.filter((f) => !apariciónQueSobra(f))
  .concat(SON_LA_VIEJA.filter((f) => !palabraVieja(f)))
  .concat(SON_AVISOS.filter((f) => !búsquedaQueEsAviso(f)));
const sePasa = NO_SOBRAN.filter((f) => apariciónQueSobra(f))
  .concat(NO_SON_AVISOS.filter((f) => búsquedaQueEsAviso(f)))
  .concat(NO_SON_LA_VIEJA.filter((f) => palabraVieja(f)));
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  if (noDetecta.length) console.error('  no detecta: ' + noDetecta.join(' / '));
  if (sePasa.length) console.error('  avisa de más: ' + sePasa.join(' / '));
  process.exit(1);
}

const fallas = [];
const avisos = [];
const viejas = [];
let revisados = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js', '.json', '.sql'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (nombre.endsWith('manifest.json') || nombre.endsWith('sw.js')) continue;
  revisados++;
  const crudo = readFileSync(camino, 'utf8');
  const vistos = new Set();
  for (const [renglon, texto] of nombre.endsWith('.sql')
    ? visibleDeMigracion(crudo)
    : visible(soloCastellano(crudo), formatoDe(nombre))) {
    const sobra = apariciónQueSobra(texto);
    if (sobra && !vistos.has(renglon + sobra)) {
      vistos.add(renglon + sobra);
      fallas.push(`${nombre}:${renglon}  «${sobra}»  ${texto.slice(0, 90)}`);
    }
    const vieja = palabraVieja(texto);
    if (vieja && !vistos.has(renglon + vieja)) {
      vistos.add(renglon + vieja);
      viejas.push(`${nombre}:${renglon}  «${vieja}»  ${texto.slice(0, 90)}`);
    }
    const esAviso = búsquedaQueEsAviso(texto);
    if (esAviso && !vistos.has(renglon + esAviso)) {
      vistos.add(renglon + esAviso);
      avisos.push(`${nombre}:${renglon}  «${esAviso}»  ${texto.slice(0, 90)}`);
    }
  }
}

if (viejas.length > 0) {
  console.error('El reporte llamado con su nombre viejo:\n');
  for (const vieja of viejas) console.error('  - ' + vieja);
  const plural = viejas.length === 1 ? 'aparición' : 'apariciones';
  console.error(
    `\n${viejas.length} ${plural}. Lo que el Asistente anota de una jornada es un\n` +
    '**reporte** (docs/GLOSARIO.md), que es el nombre que ya usaba Careonys.\n' +
    '«Cuaderno» y «bitácora» se sacaron el 25 de agosto de 2026.');
  process.exit(1);
}

if (avisos.length > 0) {
  console.error('«Búsqueda» usada como nombre de lo que se publica:\n');
  for (const aviso of avisos) console.error('  - ' + aviso);
  const plural = avisos.length === 1 ? 'aparición' : 'apariciones';
  console.error(
    `\n${avisos.length} ${plural}. Lo que una Familia publica es un **Aviso**\n` +
    '(docs/GLOSARIO.md), y **Búsqueda** es el acto de buscar, que no deja nada\n' +
    'guardado. Buscar sigue diciéndose buscar: lo que no se puede es publicar\n' +
    'una búsqueda.');
  process.exit(1);
}

if (fallas.length > 0) {
  console.error('«Cuidador» usado como término general en el texto visible:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'aparición' : 'apariciones';
  console.error(
    `\n${fallas.length} ${plural}. El término general es **Asistente** (docs/GLOSARIO.md).\n` +
    'Si de verdad se está nombrando el tipo, la forma es «cuidador domiciliario».');
  process.exit(1);
}

console.log(
  `Vocabulario verificado: ${revisados} archivos sin «cuidador» como término ` +
  'general, sin «búsqueda» como nombre de lo que se publica y sin «cuaderno» ' +
  'ni «bitácora» como nombre del reporte.');
