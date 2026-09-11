/* ===================================================
   QUÉ PARTE DE UN ARCHIVO VE UNA PERSONA

   Devuelve los trozos de texto que terminan en la pantalla, cada uno con el
   renglón donde está. Lo usan los chequeos que revisan cómo está escrito lo que
   se lee: `verificar_trato.mjs` y `verificar_vocabulario.mjs`.

   Qué cuenta como visible:
   - el texto entre etiquetas de un `.html`, sin los comentarios ni el `<style>`;
   - lo mismo en una pantalla del programa, que es guión con etiquetas adentro:
     ahí los comentarios son los del guión —ver `formatoDe()`—;
   - los atributos que se leen en pantalla (`placeholder`, `title`, `alt`,
     `aria-label`, `value`, `content`, `label`), menos el `value` de un casillero,
     un redondel, un campo escondido o una opción de lista, que es dato guardado
     y no texto —ver `sinValoresGuardados()`—;
   - las cadenas de texto de los bloques `<script>`, de los archivos de `js/` y
     del catálogo de `data/`, porque de ahí sale lo que la pantalla muestra.

   Qué no cuenta: los comentarios, en ningún idioma de los tres archivos. Un
   comentario explica de dónde salen las cosas y para eso necesita nombrarlas
   como se llamaban antes.

   Por qué existe aparte: estaba adentro de `verificar_trato.mjs`, y el segundo
   chequeo que necesitó lo mismo iba a copiarlo. Una lista repetida dos veces se
   arregla una vez y queda mal la otra («ningún patrón repetido sin punto único de verdad»).
=================================================== */

const ATRIBUTOS = 'placeholder|title|alt|aria-label|value|content|label';

/* Reemplaza por espacios en vez de borrar para que el número de renglón siga
   siendo el de verdad. */
export const enBlanco = (t) => t.replace(/[^\n]/g, ' ');

/* El `value` de un casillero, de un redondel, de un campo escondido o de una
   opción de lista **no se lee en la pantalla**: es el dato que viaja al
   servidor, y traducirlo rompe a quien lo compara del otro lado. El rótulo que
   sí se lee está al lado, adentro del `<label>` o del `<option>`, y ése se sigue
   mirando como siempre.
   Sale de acá el `value` de un botón —`<input type="submit" value="Enviar">`—,
   que es texto visible de verdad y tiene que seguir contando.
   Apareció el 26 de agosto de 2026 al convertir tres pantallas del portal a la
   vez: las tres tienen un sí/no de novedades cuyo valor el formulario de
   consulta compara con la cadena `'si'`. */
export function sinValoresGuardados(html) {
  return html.replace(/<(input|option)\b[^>]*>/gi, (etiqueta, nombre) => {
    if (/^input$/i.test(nombre)) {
      const tipo = (etiqueta.match(/(?<![-\w])type\s*=\s*"([^"]*)"|(?<![-\w])type\s*=\s*'([^']*)'/i) || [])
        .slice(1).filter(Boolean)[0] || 'text';
      if (!/^(radio|checkbox|hidden)$/i.test(tipo)) return etiqueta;
    }
    return etiqueta.replace(
      /((?<![-\w])value\s*=\s*")([^"]*)(")|((?<![-\w])value\s*=\s*')([^']*)(')/gi,
      (todo, a, v1, b, c, v2, d) => (a ? a + enBlanco(v1) + b : c + enBlanco(v2) + d)
    );
  });
}

/**
 * Deja fuera lo que está escrito en inglés y en portugués.
 *
 * Desde que el texto se traduce a los tres idiomas, los chequeos que miran
 * **cómo está escrito** el castellano —el trato de usted, el vocabulario— se
 * encuentran con frases de los otros dos y las juzgan con reglas que no son las
 * de ellas. Pasó apenas apareció el catálogo: «publicá-lo», que en portugués es
 * lo normal, se leía como un voseo; y «cuidador», que en portugués es la palabra
 * correcta, es justo la que el vocabulario prohíbe en castellano.
 *
 * Se reconoce por la clave, no por las palabras: en el catálogo cada frase trae
 * sus tres idiomas rotulados, así que se sabe con certeza cuál es cuál. Los
 * chequeos que valen para los tres idiomas —el escapado, los colores— no llaman
 * a esto y siguen viendo todo.
 */
export const soloCastellano = (crudo) => crudo.replace(
  /"(?:en|pt-BR)"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
  (todo, valor) => todo.slice(0, todo.length - valor.length - 1) + enBlanco(valor) + '"'
);

/**
 * Deja en blanco lo que **sí** puede tener texto escrito en una pantalla ya
 * convertida: lo que hay adentro de un elemento con `data-frase` —que es lo que
 * se ve mientras el catálogo viaja— y los atributos que nombra un
 * `data-frase-<atributo>`.
 *
 * Se reemplaza por espacios y no se borra, para que el número de renglón que
 * informa `texto_visible.mjs` siga siendo el de verdad.
 */
export function despejar(html) {
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

/* Una entidad de HTML es un signo, no una palabra: `&gt;` se lee «>» y `&nbsp;`
   no se lee. Se sacan porque el nombre de la entidad trae letras, y sin esto el
   «>» que separa las migas de `perfil.html` se informaba como texto escrito a
   mano —y ninguna traducción iba a cambiarlo—. */
export const sinEntidades = (html) => html.replace(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]{1,10});/gi, enBlanco);

/**
 * Devuelve pares `[renglón, texto]` del texto visible que guarda una migración.
 *
 * Una migración es código, pero además **carga texto que después se lee en la
 * pantalla**: las etiquetas de los vocabularios y el texto de las Guías de
 * cuidado entran en la base escritos en la siembra. Ese texto se escapaba de los
 * chequeos que miran cómo está escrito el castellano, porque `supabase/` estaba
 * en la lista de carpetas que no abrían: una guía podía tutear al Asistente y
 * nadie se enteraba hasta verla en el teléfono.
 *
 * Se reconoce por el rótulo del idioma y no por el lugar: se toma lo que está
 * bajo la clave `"es-AR"`, sea una frase o una lista de frases. Todo lo demás
 * del archivo —las sentencias, los nombres de tabla, los comentarios, y los
 * otros dos idiomas— queda afuera por construcción, que es más seguro que
 * intentar sacarlo después. Por eso esto no necesita `soloCastellano()`: no
 * borra los otros idiomas, nunca los mira.
 */
export function visibleDeMigracion(crudo) {
  const trozos = [];
  /* El valor puede ser una frase o una lista de frases: las señales de alarma y
     los pasos de la emergencia son listas. */
  const rotulado = /"es-AR"\s*:\s*("(?:[^"\\]|\\.)*"|\[[^\]]*\])/g;
  const frase = /"((?:[^"\\]|\\.)*)"/g;
  for (const encontrado of crudo.matchAll(rotulado)) {
    const desde = encontrado.index + encontrado[0].length - encontrado[1].length;
    frase.lastIndex = 0;
    for (const cada of encontrado[1].matchAll(frase)) {
      const texto = cada[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
      if (texto) trozos.push([crudo.slice(0, desde + cada.index).split('\n').length, texto]);
    }
  }
  return trozos;
}

/* ---- DE QUÉ MANERA SE LEE ESTE ARCHIVO ----
   Son tres formas y no dos, desde que una pantalla puede ser un archivo del
   programa en vez de una página suelta:

   - **`'html'`** — una página suelta: el texto entre etiquetas, y adentro de
     los bloques de guión, las cadenas de texto.
   - **`'jsx'`** — una pantalla del programa: **es guión con etiquetas
     adentro**, así que se lee como una página, pero sus comentarios son los
     del guión y no los de la página. Sin esa distinción cada comentario
     entraba como texto a la vista, y el primer día que hubo pantallas así dos
     comentarios que contaban de dónde venía un nombre viejo se informaron como
     si ese nombre estuviera en la pantalla.
   - **`'codigo'`** — todo lo demás: sólo las cadenas de texto.

   Se sigue aceptando el sí/no de antes —dos chequeos lo pasan escrito a mano,
   sobre archivos que siempre son páginas—, y vale por `'html'`. */
export const formatoDe = (nombre) =>
  nombre.toLowerCase().endsWith('.jsx') ? 'jsx'
    : nombre.toLowerCase().endsWith('.html') ? 'html' : 'codigo';

/** Devuelve pares `[renglón, texto]` de lo que ve una persona. */
export function visible(crudo, formato) {
  const trozos = [];
  const anotar = (inicio, texto) => {
    if (texto.trim()) trozos.push([crudo.slice(0, inicio).split('\n').length, texto.trim()]);
  };

  const comentariosDeGuion = (texto) => texto.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);

  if (!formato || formato === 'codigo') {
    const sinComentarios = comentariosDeGuion(crudo);
    for (const c of sinComentarios.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(c.index, c[1].slice(1, -1));
    }
    return trozos;
  }

  const limpio = (formato === 'jsx' ? comentariosDeGuion(crudo) : crudo)
    .replace(/<!--[\s\S]*?-->/g, enBlanco)
    .replace(/<style\b[\s\S]*?<\/style>/gi, enBlanco);

  for (const g of limpio.matchAll(/<script\b[\s\S]*?<\/script>/gi)) {
    const cuerpo = g[0].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
    for (const c of cuerpo.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(g.index + c.index, c[1].slice(1, -1));
    }
  }

  const sinGuion = sinValoresGuardados(limpio.replace(/<script\b[\s\S]*?<\/script>/gi, enBlanco));

  // `(?<![-\w])` y no `\b`: con `\b`, `alt` casa también adentro de
  // `data-frase-alt`, porque el guión es un carácter de corte. Lo que se
  // informaría entonces es la clave del catálogo en lugar del texto, y una
  // pantalla ya convertida quedaría marcada como si tuviera texto a mano.
  // `despejar()`, en verificar_frases.mjs, se cuida de lo mismo por el mismo
  // motivo.
  const atributo = new RegExp('(?<![-\\w])(' + ATRIBUTOS + ')\\s*=\\s*("[^"]*"|\'[^\']*\')', 'gi');
  for (const a of sinGuion.matchAll(atributo)) anotar(a.index, a[2].slice(1, -1));

  const resto = sinGuion.replace(/<[^>]*>/g, enBlanco);
  resto.split('\n').forEach((linea, i) => {
    if (linea.trim()) trozos.push([i + 1, linea.trim()]);
  });
  return trozos;
}
