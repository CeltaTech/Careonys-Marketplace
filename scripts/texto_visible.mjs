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
   - **`'html'` también para un dibujo**, desde el 16 de septiembre de 2026. Un
     dibujo es marcado, no guión: lo que una persona lee ahí es el rótulo que
     le dicta al lector de pantalla y las letras dibujadas entre etiquetas.
     Leído como guión no se veía nada de eso, y encima el `//` de la dirección
     que todo dibujo lleva en su primer renglón tapaba el renglón entero como
     si fuera un comentario. Comprobado poniéndole voseo al rótulo de uno: los
     dos chequeos que leen el texto a la vista terminaban en verde.
   - **`'codigo'`** — todo lo demás: sólo las cadenas de texto.

   Se sigue aceptando el sí/no de antes —dos chequeos lo pasan escrito a mano,
   sobre archivos que siempre son páginas—, y vale por `'html'`. */
export const formatoDe = (nombre) =>
  nombre.toLowerCase().endsWith('.jsx') ? 'jsx'
    : /\.(html|svg)$/i.test(nombre) ? 'html' : 'codigo';

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

/* ── EL TEXTO A LA VISTA EN UNA PANTALLA DE UN PROGRAMA ────────────────────
   Una página suelta es marcado con bloques de guión adentro, así que para
   encontrar lo que una persona lee alcanza con tapar las etiquetas y quedarse
   con lo del medio. Una pantalla de un programa es al revés: código de punta a
   punta, con el marcado adentro del código. Lo que una persona lee ahí es lo
   que queda entre una etiqueta y la siguiente, y solamente eso; todo lo demás
   es código, y leerlo como si fuera texto haría gritar cada renglón del
   archivo.

   Tres cosas hubo que distinguir, y las tres costaron:

   1. **Lo que está entre llaves es código, no texto**, y las llaves abren en un
      hueco y cierran muchas etiquetas más adelante: así se escribe una
      condición. De modo que se cuentan de corrido, y no hueco por hueco.
   2. **Después de la última etiqueta vuelve a haber código.** Se lleva la
      cuenta de cuántos elementos quedan abiertos y sólo se junta texto
      mientras haya alguno; si no, la cola del archivo se leería como si fuera
      lo que dice la pantalla.
   3. **Un signo de menor no siempre abre una etiqueta.** `renglon < total` es
      una comparación. Se pide que lo que tenga delante no sea un dato. Una
      etiqueta de cierre, en cambio, entra siempre, porque lo que tiene delante
      es justamente el texto que se está buscando. */

/* Lo que tiene delante un signo de menor decide si abre una etiqueta o si
   compara dos cosas. Un dato delante quiere decir comparación; pero una
   palabra del lenguaje también termina en letra y no es ningún dato, y
   `return` es justamente la que tiene delante casi toda pantalla. */
const ANTES_ES_DATO = /[\w$)\]]$/;
const NO_ES_UN_DATO = /(?:^|[^\w$])(?:return|yield|await|default|case|else|do|typeof|in|of)$/;
const comparaYNoAbre = (s, i) => {
  const previo = s.slice(Math.max(0, i - 40), i).replace(/\s+$/, '');
  return ANTES_ES_DATO.test(previo) && !NO_ES_UN_DATO.test(previo);
};
const UNA_BARRA = String.fromCharCode(92);

/* Las notas de una pantalla de un programa. Se borran las de bloque y las de
   renglón, pero de estas últimas sólo las de los renglones que no traen
   ninguna comilla delante: una dirección web lleva dos barras adentro de un
   texto, y borrar desde ahí dejaría la comilla sin cerrar, y con ella medio
   archivo sin mirar. */
export const enCodigoDePrograma = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, enBlanco)
  .replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + enBlanco(m.slice(antes.length)));

/** Dónde termina la cadena que empieza en `i`. */
export function finDeCadena(s, i) {
  const cierre = s[i];
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === UNA_BARRA) { j += 2; continue; }
    if (s[j] === cierre) return j + 1;
    if (cierre !== '`' && s[j] === '\n') return j;
    j++;
  }
  return s.length;
}

/** Dónde termina la expresión regular que empieza en `i`, y el mismo `i` si
    ahí no empieza ninguna. Hace falta para no leer como comilla la que va
    escrita adentro de una: `/['"`]/` trae las tres, y la de acento grave abre
    un texto que se come el archivo entero hasta la próxima —pasó, y dejó sin
    mirar noventa y cuatro renglones de un chequeo—. Una barra detrás de un
    dato divide en vez de abrir, una expresión regular no cruza el fin de
    renglón, y los corchetes de una clase esconden la barra que la cerraría. */
export function finDeExpresionRegular(s, i) {
  if (s[i] !== '/' || s[i + 1] === '/' || s[i + 1] === '*') return i;
  if (comparaYNoAbre(s, i)) return i;
  let j = i + 1;
  let enUnaClase = false;
  while (j < s.length) {
    const c = s[j];
    if (c === '\n') return i;
    if (c === UNA_BARRA) { j += 2; continue; }
    if (c === '[') enUnaClase = true;
    else if (c === ']') enUnaClase = false;
    else if (c === '/' && !enUnaClase) return j + 1;
    j++;
  }
  return i;
}

/** Dónde sigue el código después de lo que empieza en `i`, y qué es lo que
    empieza ahí: `plantilla` la cadena de acento grave, `cadena` las otras dos,
    `expresion` una expresión regular, y nada cuando ahí no empieza ninguna de
    las tres.

    Es una sola pregunta —«¿esto se lee o se saltea entero?»— que tres
    recorridos se hacían cada uno por su lado: el que despeja las cadenas, el
    que lee lo que dice una pantalla y el que junta las plantillas de un
    módulo. Y la contestaban distinto: dos de los tres no reconocían la
    expresión regular, así que una comilla de acento grave escrita adentro de
    una abría un texto que se comía el archivo hasta la próxima, y lo que
    quedaba en el medio no lo miraba nadie. */
export function finDeLoQueNoSeLee(s, i) {
  const c = s[i];
  if (c === '/') {
    const fin = finDeExpresionRegular(s, i);
    return fin > i ? { fin, clase: 'expresion' } : { fin: i, clase: null };
  }
  if (c === '`') return { fin: finDeCadena(s, i), clase: 'plantilla' };
  if (c === "'" || c === '"') return { fin: finDeCadena(s, i), clase: 'cadena' };
  return { fin: i, clase: null };
}

/** Lo mismo al revés: lo que hay adentro de una cadena, en blanco. Contesta
    qué **hace** un guion y no qué **nombra**: una guarda escrita adentro de un
    texto de prueba está nombrada, no llamada, y quien pregunte por la de
    afuera se la va a creer. Las expresiones regulares pasan enteras, que para
    eso se las reconoce: son código y no texto. Se conservan los renglones,
    porque quien llama cuenta líneas. */
export function sinCadenas(codigo) {
  let fuera = '';
  let i = 0;
  while (i < codigo.length) {
    const { fin, clase } = finDeLoQueNoSeLee(codigo, i);
    if (clase === 'expresion') { fuera += codigo.slice(i, fin); i = fin; continue; }
    if (clase) { fuera += enBlanco(codigo.slice(i, fin)); i = fin; continue; }
    fuera += codigo[i];
    i++;
  }
  return fuera;
}

/** Dónde termina la etiqueta que empieza en `i`, y de qué clase es. Se cuentan
    las llaves de los atributos y se respeta lo que esté entre comillas, así un
    signo de mayor escrito adentro de un atributo no la corta por la mitad. */
function finDeEtiqueta(s, i) {
  let j = i + 1, comilla = null, hondo = 0;
  for (; j < s.length; j++) {
    const c = s[j];
    if (comilla) { if (c === comilla) comilla = null; continue; }
    if (c === "'" || c === '"' || c === '`') comilla = c;
    else if (c === '{') hondo++;
    else if (c === '}') hondo--;
    else if (c === '>' && hondo === 0) break;
  }
  return {
    sigue: Math.min(j + 1, s.length),
    cierra: s[i + 1] === '/',
    sola: s[j - 1] === '/'
  };
}

const hayEtiqueta = (s, i) => s[i] === '<'
  && (s[i + 1] === '>' || s[i + 1] === '/' || /[A-Za-z]/.test(s[i + 1] || ''));

/** Lo que una persona lee en una pantalla de un programa, con dónde empieza
    cada texto. */
export function textoDePrograma(s) {
  const salida = [];
  const abiertos = [];
  let i = 0, junto = '', inicio = 0;
  const guardar = () => {
    if (/[A-Za-z\u00C0-\u00FF]{2,}/.test(junto.replace(/&[a-z#0-9]+;/gi, ' '))) {
      salida.push([inicio, junto.trim().replace(/\s+/g, ' ')]);
    }
    junto = '';
  };

  while (i < s.length) {
    const tope = abiertos[abiertos.length - 1];
    const c = s[i];

    /* Afuera de todo elemento, y adentro de unas llaves, lo que hay es código:
       se saltean las cadenas enteras y sólo se mira si empieza una etiqueta. */
    if (!tope || tope.esCodigo) {
      const salteo = finDeLoQueNoSeLee(s, i);
      if (salteo.clase) { i = salteo.fin; continue; }
      if (tope) {
        if (c === '{') { tope.hondo++; i++; continue; }
        if (c === '}') { tope.hondo--; if (tope.hondo === 0) abiertos.pop(); i++; continue; }
      }
      if (hayEtiqueta(s, i) && s[i + 1] !== '/'
          && !comparaYNoAbre(s, i)) {
        const { sigue, sola } = finDeEtiqueta(s, i);
        if (!sola) abiertos.push({ esCodigo: false });
        i = sigue; continue;
      }
      i++; continue;
    }

    /* Adentro de un elemento, lo que hay es lo que se lee. */
    if (hayEtiqueta(s, i)) {
      guardar();
      const { sigue, cierra, sola } = finDeEtiqueta(s, i);
      if (cierra) abiertos.pop();
      else if (!sola) abiertos.push({ esCodigo: false });
      i = sigue; continue;
    }
    if (c === '{') { guardar(); abiertos.push({ esCodigo: true, hondo: 1 }); i++; continue; }
    if (!junto) inicio = i;
    junto += c;
    i++;
  }
  guardar();
  return salida;
}

/* ── QUE EL DESPEJE DE CADENAS NO SE COMA LO QUE NO ES SUYO ───────────────
   `sinCadenas` la usan dos chequeos para preguntarle a un guion qué **hace**, y
   la respuesta les llega ya masticada: si se blanquea de más, el que pregunta
   ve un archivo sin llamadas y se pone rojo por nada; si se blanquea de menos,
   una guarda nombrada adentro de un ejemplo pasa por llamada. Las dos veces el
   detector está bien y el que miente es el despeje. */
const DESPEJES = [
  ['blanquea lo que hay adentro de un texto',
   "const A = 'seRevisaron(';", false],
  ['deja la llamada de verdad',
   "seRevisaron(cuantos, 'nada');", true],
  ['no lee como comilla la que va adentro de una expresión regular',
   "const R = /[`]/;\nseRevisaron(cuantos, 'nada');", true],
  ['una comilla simple adentro de una expresión regular tampoco',
   "const R = /[']/;\nseRevisaron(cuantos, 'nada');", true],
  ['una barra detrás de un dato divide, no abre una expresión regular',
   "const mitad = total / 2;\nseRevisaron(mitad, 'nada');", true],
];
const despejados = [];
for (const [que, codigo, deberia] of DESPEJES) {
  if (sinCadenas(codigo).includes('seRevisaron(') !== deberia) {
    despejados.push(que);
  }
}
if (sinCadenas("const A = 'x';\nconst B = 1;").split('\n').length !== 2) {
  despejados.push('conserva los renglones');
}
if (despejados.length > 0) {
  console.error('El despeje de cadenas está roto, así que no verifica nada:');
  for (const roto of despejados) console.error('  - ' + roto);
  process.exit(1);
}

/* ── QUE EL LECTOR LEA LO QUE DICE QUE LEE ─────────────────────────────────
   Los cuatro chequeos que usan este archivo prueban su **detector** —que la
   palabra buscada se reconozca— y ninguno prueba su **lector**: que el texto
   llegue hasta el detector. Un lector que devuelve nada deja a los cuatro en
   verde sin haber mirado nada, que es exactamente lo que pasó con los dibujos.
   Se prueba acá y no en cada chequeo porque el lector es uno solo. */
const DEBERIA_LEERSE = [
  ['el rótulo de un dibujo', '<svg xmlns="http://www.w3.org/2000/svg" aria-label="Sin foto">',
    'sin foto'],
  ['las letras dibujadas de un dibujo', '<svg><text x="0">Cuidar Norte</text></svg>',
    'cuidar norte'],
  ['el texto de una página', '<p>Solicitar Asistente</p>', 'solicitar asistente'],
];
const NO_DEBERIA_LEERSE = [
  ['el comentario de una página', '<!-- Antes se llamaba cuidador -->', 'cuidador'],
];

const leidoDe = (marcado) => visible(marcado, formatoDe('dibujo.svg'))
  .map(([, texto]) => texto).join(' ').toLowerCase();
const rotos = [];
for (const [que, marcado, esperado] of DEBERIA_LEERSE) {
  if (!leidoDe(marcado).includes(esperado)) rotos.push('no lee ' + que);
}
for (const [que, marcado, prohibido] of NO_DEBERIA_LEERSE) {
  if (leidoDe(marcado).includes(prohibido)) rotos.push('lee de más ' + que);
}
if (rotos.length > 0) {
  console.error('El lector del texto a la vista está roto, así que no verifica nada:');
  for (const roto of rotos) console.error('  - ' + roto);
  process.exit(1);
}
