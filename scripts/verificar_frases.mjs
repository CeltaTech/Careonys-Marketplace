/* ===================================================
   VERIFICA QUE EL TEXTO VISIBLE ESTÉ EN LOS TRES IDIOMAS

       node scripts/verificar_frases.mjs

   La regla de la empresa pide `es-AR`, `en` y `pt-BR` **desde el primer día**, y
   dice por qué: cada pantalla nueva escrita en un solo idioma encarece el
   cambio. Una regla que no se verifica sola no es una regla, así que esto corre
   antes de cada `commit` junto con los demás chequeos.

   QUÉ MIRA, Y POR QUÉ CADA COSA
   1. **Toda clave que una pantalla nombra existe.** Si no, la pantalla muestra
      el texto que quedó escrito adentro y nadie se entera de que la traducción
      no llegó nunca.
   2. **Toda frase tiene los tres idiomas y ninguno vacío.** Una frase a medias
      no falla: se cae al castellano en silencio.
   3. **Ninguna frase quedó sin usar.** Es la señal de que una pantalla se
      reescribió y la frase quedó dando vueltas; el catálogo se llena de texto
      que nadie lee y deja de ser confiable.
   4. **Ninguna pantalla ya convertida volvió a tener texto escrito a mano.**
      Éste es el que sostiene a los otros tres: sin él, la pantalla que se toca
      mañana vuelve a nacer en un solo idioma y el chequeo no se entera, porque
      lo que no está en el catálogo tampoco se puede pedir que esté completo.
   5. **Ninguna de las cinco frases de arranque está además en el archivo.** Ésas
      viven en `js/catalogo.js` porque son las que hacen falta cuando el archivo
      no llegó; tenerlas en los dos lados significa corregir una sola y creer que
      se corrigieron las dos.

   QUÉ NO MIRA, Y HAY QUE LEER CON OJOS
   - **Si la traducción es buena.** Esto comprueba que haya texto, no que diga lo
     que tiene que decir.
   - **El texto de las ilustraciones**, que está adentro del dibujo (pendiente 16).
   - **Los nombres comerciales**, que la regla de la empresa exceptúa: un plan se
     llama igual en los tres idiomas. Se declaran en `IGUALES_EN_TODOS`.

   UNA PANTALLA ESTÁ CONVERTIDA CUANDO TIENE AL MENOS UN `data-frase`. No hay
   lista que mantener: la primera clave que alguien le pone a una pantalla la
   mete adentro de la regla 4, y de ahí no sale más.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { archivos } from './recorrido.mjs';
import { visible, enBlanco } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDIOMAS = ['es-AR', 'en', 'pt-BR'];

/* Un chequeo de pantallas no tiene nada que hacer acá. */
const AJENAS = ['docs', 'supabase', 'scripts', 'assets', 'css'];

/* Las frases que viven en `js/catalogo.js` porque son las que se muestran
   cuando el catálogo no llegó. La lista se lee de ahí y no se copia: copiada,
   quedaría vieja el día que alguien agregue una y este chequeo diría que está
   todo bien. */
function frasesDeArranque() {
  const fuente = readFileSync(join(raiz, 'js', 'catalogo.js'), 'utf8');
  const bloque = fuente.match(/const ARRANQUE = \{[\s\S]*?\n  \};/);
  if (!bloque) return null;
  return new Set((bloque[0].match(/^\s{4}'([^']+)':/gm) || [])
    .map((l) => l.replace(/^\s*'/, '').replace(/':$/, '')));
}

/* Lo que se escribe igual en los tres idiomas y no es un descuido: el nombre de
   un plan, el nombre de una red social, el nombre de un idioma en su propio
   idioma. El día que aparezca el selector de idioma van a entrar acá «Español»,
   «English» y «Português». */
const IGUALES_EN_TODOS = new Set([
  /* Marcas de terceros: se escriben como el tercero las escribe, en todo idioma. */
  'nav.facebook',
  'nav.instagram',
  'nav.linkedin',
  'nav.youtube',
]);

// ── El catálogo ────────────────────────────────────────────────────────────
const crudoCatalogo = readFileSync(join(raiz, 'data', 'catalogo-frases.json'), 'utf8');
const { frases } = JSON.parse(crudoCatalogo);
/* Una clave que empieza con guión bajo es un separador para poder leer el
   archivo, no una frase. JSON no tiene comentarios y es la única forma. */
const claves = Object.keys(frases).filter((c) => c[0] !== '_');

// ── Lo que se saca antes de buscar texto a mano ────────────────────────────

/**
 * Deja en blanco lo que **sí** puede tener texto escrito en una pantalla ya
 * convertida: lo que hay adentro de un elemento con `data-frase` —que es lo que
 * se ve mientras el catálogo viaja— y los atributos que nombra un
 * `data-frase-<atributo>`.
 *
 * Se reemplaza por espacios y no se borra, para que el número de renglón que
 * informa `texto_visible.mjs` siga siendo el de verdad.
 */
function despejar(html) {
  // El contenido de un elemento con `data-frase`. Sin anidar a propósito: un
  // elemento convertido lleva texto y nada más —lo que necesita un enlace
  // adentro se parte en dos claves—, así que si acá hubiera etiquetas, el que
  // está mal es el HTML.
  let salida = html.replace(
    /(<([a-z][\w-]*)\b[^>]*\bdata-frase\s*=\s*"[^"]*"[^>]*>)([^<]*)(<\/\2>)/gi,
    (todo, apertura, etiqueta, adentro, cierre) => apertura + enBlanco(adentro) + cierre
  );

  // Los atributos que el propio elemento declara traducidos.
  salida = salida.replace(/<[a-z][\w-]*\b[^>]*>/gi, (etiqueta) => {
    const traducidos = (etiqueta.match(/\bdata-frase-([a-z-]+)\s*=/gi) || [])
      .map((a) => a.replace(/^\s*data-frase-/i, '').replace(/\s*=$/, '').toLowerCase());
    if (!traducidos.length) return etiqueta;
    let limpia = etiqueta;
    for (const nombre of traducidos) {
      limpia = limpia.replace(
        // `(?<![-\w])` y no `\b`: sin eso `placeholder` casa también adentro de
        // `data-frase-placeholder`, y lo que se despeja es la clave en lugar
        // del texto. Lo encontró la autoprueba del final de este guion.
        new RegExp('(?<![-\\w])(' + nombre + '\\s*=\\s*")([^"]*)(")', 'i'),
        (t, a, valor, c) => a + enBlanco(valor) + c
      );
    }
    return limpia;
  });

  return salida;
}

const sinGuiones = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, enBlanco);

/* Un `<meta>` no lo lee una persona salvo el de la descripción, y el ancho de
   la pantalla o el `noindex` no se traducen a ningún idioma. */
const sinMetas = (html) => html.replace(/<meta\b[^>]*>/gi,
  (m) => (/name\s*=\s*"description"/i.test(m) ? m : enBlanco(m)));

/* Un comentario explica de dónde salen las cosas, y para eso escribe ejemplos.
   Si de ahí se sacaran claves, el ejemplo de `js/catalogo.js` se pediría como si
   fuera una frase de verdad. */
const enCodigo = (t) => t.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
const sinComentarios = (crudo, esHtml) => (esHtml
  // En el HTML se limpian los `<!-- -->` y, adentro de cada guion, los del
  // código. No se busca `//` en todo el archivo: eso borraría media dirección
  // web y con ella la clave que estuviera en el mismo renglón.
  ? crudo.replace(/<!--[\s\S]*?-->/g, enBlanco)
    .replace(/<script\b[\s\S]*?<\/script>/gi, enCodigo)
  : enCodigo(crudo));

// ── Qué claves usa cada archivo ────────────────────────────────────────────

function clavesUsadas(crudo, prefijos) {
  const usadas = new Set();
  // Escrita en la pantalla, que es la forma normal.
  for (const m of crudo.matchAll(/\bdata-frase(?:-[a-z-]+)?\s*=\s*"([^"]+)"/gi)) usadas.add(m[1]);
  // Pedida desde el código.
  for (const m of crudo.matchAll(/\b(?:Catalogo|Texto)\.frase\(\s*'([^']+)'/g)) usadas.add(m[1]);
  // Y puesta desde el código, que es lo que hace `js/clave.js` con el botón que
  // arma él. Ahí la clave no está pegada a ningún `data-frase=`: llega por
  // `setAttribute`, a veces adentro de una decisión —`seVe ? ésta : aquélla`—,
  // así que se la reconoce por su forma. Se aceptan sólo las que empiezan con
  // un grupo que ya existe en el catálogo, para no confundir con una clave
  // cualquier cadena con un punto en el medio, como el nombre de un archivo.
  // Y aun así queda una confusión posible, porque un nombre de archivo tiene la
  // misma forma: `'acceso.html'` es una dirección a la que se manda a alguien,
  // no una frase. Por eso lo que va después del punto no puede ser la
  // terminación de un archivo.
  const ARCHIVOS = 'html|js|mjs|json|css|png|jpg|jpeg|svg|webp|ico|sql|md|txt';
  const forma = new RegExp(
    "'((?:" + prefijos.join('|') + ')\\.(?!(?:' + ARCHIVOS + ")')[a-z0-9_]+)'", 'g');
  for (const m of crudo.matchAll(forma)) usadas.add(m[1]);
  return usadas;
}

// ── El recorrido ───────────────────────────────────────────────────────────

const arranque = frasesDeArranque();
if (!arranque) {
  console.error('No se encontró el bloque ARRANQUE en js/catalogo.js.');
  console.error('Sin él este chequeo no puede saber qué frases viven en el código, así que no verifica nada.');
  process.exit(1);
}

/* Los grupos de claves que ya existen. Sirven para reconocer una clave puesta
   desde el codigo, donde no hay ningun `data-frase=` que la senale. */
const PREFIJOS = [...new Set([...claves, ...arranque].map((c) => c.split('.')[0]))];

const fallas = [];
const usadasEnTodo = new Set();
let convertidas = 0;
let revisados = 0;

for (const camino of archivos(raiz, ['.html', '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (nombre.endsWith('sw.js')) continue;
  revisados++;
  const esHtml = nombre.endsWith('.html');
  const crudo = readFileSync(camino, 'utf8');

  for (const clave of clavesUsadas(sinComentarios(crudo, esHtml), PREFIJOS)) usadasEnTodo.add(clave);

  // La regla 4 es de pantallas. Un `.js` con `data-frase` adentro es el propio
  // mecanismo —`js/catalogo.js`—, y pedirle que no tenga texto sería pedirle
  // que no tenga las frases de arranque, que es justo lo que hace falta.
  if (!esHtml || !/\bdata-frase\b/.test(crudo)) continue;
  convertidas++;

  // Regla 4a: en el HTML no puede quedar texto que una persona lea y que no
  // salga del catálogo.
  const limpio = sinMetas(sinGuiones(despejar(crudo)));
  for (const [renglon, texto] of visible(limpio, true)) {
    if (!/[A-Za-zÀ-ÿ]{2,}/.test(texto)) continue;
    fallas.push(`${nombre}:${renglon}  texto escrito a mano: «${texto.slice(0, 70)}»`);
  }

  // Regla 4b: y en el guión de esa pantalla, tampoco. Se mira sólo lo que
  // escribe en el documento —no toda cadena entre comillas—, porque un
  // identificador o una dirección no es texto visible.
  const guiones = (crudo.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
  const escribe = /(?:textContent|innerHTML|innerText|placeholder|alert)\s*(?:=|\()\s*('[^'\n]{2,}'|"[^"\n]{2,}")/g;
  for (const m of guiones.matchAll(escribe)) {
    const texto = m[1].slice(1, -1);
    if (!/[A-Za-zÀ-ÿ]{2,}/.test(texto)) continue;
    const renglon = crudo.slice(0, crudo.indexOf(m[0])).split('\n').length;
    fallas.push(`${nombre}:${renglon}  texto escrito a mano en el guión: «${texto.slice(0, 70)}»`);
  }
}

// ── Las reglas del catálogo ────────────────────────────────────────────────

// Regla 5.
for (const clave of claves) {
  if (arranque.has(clave)) {
    fallas.push(`data/catalogo-frases.json  «${clave}» ya vive en js/catalogo.js (frase de arranque).\n`
      + '    Una frase con dos dueños se corrige en uno solo. Va en un lado o en el otro.');
  }
}

// Regla 2.
for (const clave of claves) {
  const frase = frases[clave];
  const faltan = IDIOMAS.filter((i) => !frase || typeof frase[i] !== 'string' || !frase[i].trim());
  if (faltan.length) {
    fallas.push(`data/catalogo-frases.json  «${clave}» no tiene ${faltan.join(' ni ')}.`);
    continue;
  }
  if (IGUALES_EN_TODOS.has(clave)) continue;
  const distintos = new Set(IDIOMAS.map((i) => frase[i]));
  if (distintos.size === 1) {
    fallas.push(`data/catalogo-frases.json  «${clave}» dice lo mismo en los tres idiomas.\n`
      + '    Si es a propósito —un nombre comercial—, va en IGUALES_EN_TODOS de este guion.');
  }
}

// Regla 1.
for (const clave of usadasEnTodo) {
  if (claves.indexOf(clave) === -1 && !arranque.has(clave)) {
    fallas.push(`Se pide la frase «${clave}» y no existe en data/catalogo-frases.json.`);
  }
}

// Regla 3.
for (const clave of claves) {
  if (!usadasEnTodo.has(clave)) {
    fallas.push(`data/catalogo-frases.json  «${clave}» no la pide ninguna pantalla.`);
  }
}

// ── Una prueba que no puede fallar no prueba nada ──────────────────────────
// El despeje es lo único de acá que puede equivocarse callado: si se pasa de
// largo, deja de ver el texto a mano y este chequeo pasa siempre. Así que se lo
// prueba en los dos sentidos antes de creerle.
const DEBE_QUEDAR = [
  ['<p>Texto suelto</p>', 'Texto suelto'],
  ['<span data-frase="x">Hola</span><b>Suelto</b>', 'Suelto'],
  ['<input placeholder="A mano" />', 'A mano'],
  ['<input data-frase-title="x" title="Traducido" placeholder="A mano" />', 'A mano']
];
const DEBE_IRSE = [
  ['<span data-frase="x">Hola</span>', 'Hola'],
  ['<title data-frase="x">Acceso</title>', 'Acceso'],
  ['<input data-frase-placeholder="x" placeholder="Escriba acá" />', 'Escriba acá'],
  ['<button class="b" data-frase="x" id="c">\n  Entrar\n</button>', 'Entrar']
];
const roto = [];
for (const [html, texto] of DEBE_QUEDAR) {
  if (despejar(html).indexOf(texto) === -1) roto.push('deja de ver: ' + texto);
}
for (const [html, texto] of DEBE_IRSE) {
  if (despejar(html).indexOf(texto) !== -1) roto.push('no despeja: ' + texto);
}
if (roto.length) {
  console.error('El despeje está roto, así que este chequeo no verifica nada:');
  for (const r of roto) console.error('  ' + r);
  process.exit(1);
}

// ── El informe ─────────────────────────────────────────────────────────────

if (fallas.length) {
  console.error('Texto visible que no está en los tres idiomas:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(`\n${fallas.length} ${fallas.length === 1 ? 'falla' : 'fallas'}.`
    + ' La regla pide es-AR, en y pt-BR desde el primer día.');
  process.exit(1);
}

console.log(`Frases verificadas: ${claves.length} en los tres idiomas, `
  + `${convertidas} de ${revisados} archivos ya convertidos.`);
