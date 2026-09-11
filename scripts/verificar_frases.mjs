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

   6. **Ninguna fecha, hora o importe lleva el idioma escrito adentro.** Una
      fecha con el idioma clavado muestra «08/12/2026» en inglés queriendo decir
      el 12 de agosto, y un precio en pesos se lee como si fueran dólares.
   7. **Ningún módulo se guarda el idioma, ni se lo pisa al catálogo.** El
      idioma se decide una sola vez por página, en `idiomaDelEntorno()` de
      `js/catalogo.js`, y esa regla ya está escrita ahí: «tenerlo en un solo
      lugar es lo que evita la pantalla mitad en un idioma y mitad en otro». Un
      módulo que guarda su propia copia la deja en castellano para siempre, y si
      además se la escribe al catálogo, arrastra a la pantalla entera con él.

   QUÉ NO MIRA, Y HAY QUE LEER CON OJOS
   - **Si la traducción es buena.** Esto comprueba que haya texto, no que diga lo
     que tiene que decir.
   - **El texto de las ilustraciones**, que está adentro del dibujo (pendiente 16).
   - **Los nombres comerciales**, que la regla de la empresa exceptúa: un plan se
     llama igual en los tres idiomas. Se declaran en `IGUALES_EN_TODOS`.

   UNA PÁGINA SUELTA ESTÁ CONVERTIDA CUANDO TIENE AL MENOS UN `data-frase`. No
   hay lista que mantener: la primera clave que alguien le pone a una pantalla
   la mete adentro de la regla 4, y de ahí no sale más.

   Y UNA PANTALLA DE UN PROGRAMA ESTÁ CONVERTIDA CUANDO PIDE FRASES. El
   mecanismo es otro y el portero también: en una página suelta la frase se
   marca en el elemento, y en una pantalla de un programa se la pide por su
   clave. Mientras se buscó el atributo en las dos por igual, ninguna pantalla
   del programa entró jamás en la regla 4 —no tienen ese atributo y no lo van a
   tener—, así que la mitad del producto podía escribir el texto a mano sin que
   nadie dijera nada.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import {
  hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA, esPaginaSuelta, esDelPrograma
} from './recorrido.mjs';
import { visible, enBlanco, despejar, sinEntidades } from './texto_visible.mjs';

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
  /* Los tres medios que citan al producto en la portada. El nombre de un
     diario no se traduce; el texto de la cita, sí, y está aparte. */
  'inicio.prensa_la_nacion',
  'inicio.prensa_el_cronista',
  'inicio.prensa_pymes',

  /* Nombre comercial de lo que se vende. La regla de la empresa deja los
     nombres de marca como estén, y éste ya estaba escrito en `cursos.html`
     antes de convertirla al i18n; no se inventó acá. Que sea en
     inglés y no esté aprobado es una pregunta abierta, anotada en
     `docs/PENDIENTES.md`. */
  'cursos.academia',

  /* Los dos marcadores de marca. No son texto: son el hueco donde
     `js/identidad.js` escribe el nombre de verdad del producto y de la
     Prestadora, que es el mismo en los tres idiomas. Existen como clave
     porque el nombre a veces va solo en su propio elemento —el sello del
     pie, el título de la pantalla de acceso—, y todo elemento visible de una
     pantalla convertida tiene que tener la suya. */
  'comun.producto',
  'comun.organizacion',
]);

// ── El catálogo ────────────────────────────────────────────────────────────
const crudoCatalogo = readFileSync(join(raiz, 'data', 'catalogo-frases.json'), 'utf8');
const { frases } = JSON.parse(crudoCatalogo);
/* Una clave que empieza con guión bajo es un separador para poder leer el
   archivo, no una frase. JSON no tiene comentarios y es la única forma. */
const claves = Object.keys(frases).filter((c) => c[0] !== '_');
seRevisaron(claves.length, 'una sola frase en `data/catalogo-frases.json`');

// ── Lo que se saca antes de buscar texto a mano ────────────────────────────

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
const enCodigoDePrograma = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, enBlanco)
  .replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + enBlanco(m.slice(antes.length)));

/** Dónde termina la cadena que empieza en `i`. */
function finDeCadena(s, i) {
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
function textoDePrograma(s) {
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
      if (c === "'" || c === '"' || c === '`') { i = finDeCadena(s, i); continue; }
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

/* Y lo que una pantalla de un programa pone a la vista sin que sea texto entre
   etiquetas: los atributos que se muestran y los tres carteles del navegador.
   Se mira sólo lo escrito con todas las letras, porque un atributo que recibe
   un dato no es texto a mano. El nombre tiene que empezar donde empieza el
   atributo, para que `subtitle` no pase por `title`. */
const ESCRIBE_A_LA_VISTA = /(?<![\w-])(?:textContent|innerHTML|innerText|placeholder|title|alt|aria-label|alert|confirm|prompt)\s*(?:=|\()\s*('[^'\n]{2,}'|"[^"\n]{2,}")/g;

/* Regla 6: `Intl` con el idioma escrito adentro.

   Una fecha, una hora y un importe son texto visible tanto como una etiqueta.
   Si la función que les da forma lleva el idioma escrito, la pantalla en inglés
   muestra «08/12/2026» queriendo decir el 12 de agosto, y un precio en pesos se
   lee como si fueran dólares. El idioma sale de `Catalogo`, igual que el resto.

   Se busca cualquier `Intl.LoQueSea(` seguido de una comilla, que es la forma de
   pasarle un idioma escrito a mano. Pasarle una variable no casa, que es
   justamente lo que se quiere. */
const IDIOMA_ESCRITO = /\bIntl\.[A-Za-z]+\s*\(\s*(?:\[\s*)?('[^'\n]*'|"[^"\n]*")/g;

/* Regla 7: el idioma guardado en un módulo, y el idioma pisado al catálogo.

   Son dos formas del mismo error y por eso van juntas. La primera es un módulo
   que arranca con `idioma: 'es-AR'` y no lo resuelve nunca: todo lo que dibuje
   sale en castellano aunque la página esté en inglés. La segunda es peor,
   porque no se queda adentro: `Catalogo.idioma = this.idioma` le escribe esa
   copia al punto único de verdad, y desde ese renglón en adelante **toda** la
   pantalla habla castellano. Pasó en `js/disponibilidad.js`, y el síntoma era
   una grilla en castellano en medio de un formulario en inglés.

   Lo que sí está bien es preguntarlo —un `get idioma()` que devuelve
   `window.Catalogo.idioma`—, que no lleva dos puntos y por eso no casa; y
   resolverlo, que es lo que hace `idioma: idiomaDelEntorno()` en
   `js/catalogo.js`, que tampoco casa porque no es ni un literal ni el valor de
   omisión. */
const IDIOMA_GUARDADO = /\bidioma\s*:\s*('[^'\n]*'|"[^"\n]*"|IDIOMA_POR_DEFECTO\b)/g;
const IDIOMA_PISADO = /\bCatalogo\.idioma\s*=(?!=)/g;

/* Una pantalla de un programa está convertida cuando pide frases. Las pide
   por su nombre corto adentro del programa, o por el nombre largo cuando el
   catálogo se usa desde afuera; las dos formas valen igual. */
const PIDE_FRASES = /(?:\bfrase|(?:Catalogo|Texto)\.frase)\s*\(/;

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
  // La clave también puede llegar escrita entre comillas dobles, y ése no es
  // el mismo caso: en una pantalla del programa una clave viaja como dato de un
  // componente —`vacio="legajo.elegir_tipo"`—, y quien la pide es el
  // componente, varios archivos más allá. Ahí no hay ningún `frase(` a la vista
  // y la clave parecería huérfana. Por eso valen las dos comillas, y la del
  // final tiene que ser la misma que la del principio.
  const ARCHIVOS = 'html|js|mjs|json|css|png|jpg|jpeg|svg|webp|ico|sql|md|txt';
  const forma = new RegExp(
    "(['\"])((?:" + prefijos.join('|') + ')\\.(?!(?:' + ARCHIVOS + ')\\1)[a-z0-9_]+)\\1', 'g');
  for (const m of crudo.matchAll(forma)) usadas.add(m[2]);
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

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (nombre.endsWith('sw.js')) continue;
  revisados++;
  /* Dos clases de pantalla, y no se leen igual. Una página suelta es marcado
     con bloques de guión adentro; una pantalla de un programa es código de
     punta a punta, con el marcado adentro del código. */
  const esHtml = esPaginaSuelta(nombre);
  const delPrograma = esDelPrograma(nombre);
  const crudo = readFileSync(camino, 'utf8');

  const sinNotas = delPrograma ? enCodigoDePrograma(crudo) : sinComentarios(crudo, esHtml);
  for (const clave of clavesUsadas(sinNotas, PREFIJOS)) usadasEnTodo.add(clave);

  // Regla 6. Vale para toda pantalla y todo guión, esté convertido o no: es el
  // idioma del dato, no el de la etiqueta, y no espera a la conversión.
  for (const m of sinNotas.matchAll(IDIOMA_ESCRITO)) {
    const renglon = sinNotas.slice(0, m.index).split('\n').length;
    fallas.push(`${nombre}:${renglon}  ${m[0].trim()}… tiene el idioma escrito adentro.\n`
      + '    Una fecha, una hora o un importe se escriben en el idioma de la pantalla,'
      + ' que sale de `Catalogo`, como el resto.');
  }

  // Regla 7. Igual que la 6: vale para todo archivo, convertido o no.
  for (const m of sinNotas.matchAll(IDIOMA_GUARDADO)) {
    const renglon = sinNotas.slice(0, m.index).split('\n').length;
    fallas.push(nombre + ':' + renglon + '  ' + m[0].trim()
      + ' se guarda el idioma en vez de preguntarlo.\n'
      + '    El idioma se decide una sola vez, en `idiomaDelEntorno()` de `js/catalogo.js`.'
      + ' Acá va un `get idioma()` que devuelva `window.Catalogo.idioma`.');
  }
  for (const m of sinNotas.matchAll(IDIOMA_PISADO)) {
    const renglon = sinNotas.slice(0, m.index).split('\n').length;
    fallas.push(nombre + ':' + renglon + '  le escribe el idioma al catálogo.\n'
      + '    Desde ese renglón en adelante la pantalla entera queda en el idioma que'
      + ' traiga este módulo. El catálogo lo resuelve solo; no hay que ayudarlo.');
  }

  // La regla 4 es de pantallas. Un `.js` con `data-frase` adentro es el propio
  // mecanismo —`js/catalogo.js`—, y pedirle que no tenga texto sería pedirle
  // que no tenga las frases de arranque, que es justo lo que hace falta.
  //
  // Y se pregunta sobre el texto **sin comentarios**. Nombrar el atributo
  // adentro de un comentario —«esta pantalla no está convertida, no tiene ni
  // un data-frase»— daba por convertida a la pantalla entera y prendía de
  // golpe los cien avisos de texto a mano que esa pantalla todavía tiene por
  // delante. Pasó dos veces el 26 de agosto de 2026, en dos archivos
  // distintos, escribiendo justamente el comentario que explicaba la regla.
  //
  // Y son dos porteros, no uno. El `data-frase` abre la regla 4a, que es del
  // HTML. La 4b, que es del guión, abre además cuando el guión ya pide frases,
  // aunque el HTML no esté convertido: son dos conversiones distintas y no
  // siempre van juntas —el HTML se convierte marcando elementos, el guión se
  // convierte pidiendo frases, y lo primero que se suele traducir de una
  // pantalla son sus avisos—. Con un solo portero, `pwa-familia/index.html`
  // —siete llamadas al catálogo adentro del guión y ningún `data-frase` en el
  // HTML— salía entera exenta, y tenía tres textos escritos a mano al lado de
  // los que sí salían del catálogo. Su gemela `pwa-asistente/index.html` sí
  // entraba, así que las dos pantallas del mismo botón se juzgaban con
  // distinta vara. Encontrado el 31 de agosto de 2026.
  /* Regla 4 en una pantalla de un programa, que tiene su propio portero porque
     tiene otro mecanismo: en una página suelta la frase se marca en el
     elemento, y en una pantalla de un programa se la pide por su clave. Una
     pantalla que pide frases está convertida, y desde ahí no puede quedar en
     ella ni un texto escrito con todas las letras.

     Mientras se buscó el atributo en las dos por igual, ninguna pantalla del
     programa entró jamás en esta regla: no tienen ese atributo y no lo van a
     tener. Media docena de pantallas pasaban enteras sin que nadie les mirara
     una sola palabra, justo el día que la mitad del producto pasó a estar
     escrita así. */
  if (delPrograma) {
    if (!PIDE_FRASES.test(sinNotas)) continue;
    convertidas++;

    for (const [desde, texto] of textoDePrograma(sinNotas)) {
      const renglon = sinNotas.slice(0, desde).split('\n').length;
      fallas.push(`${nombre}:${renglon}  texto escrito a mano: «${texto.slice(0, 70)}»`);
    }

    for (const m of sinNotas.matchAll(ESCRIBE_A_LA_VISTA)) {
      const texto = m[1].slice(1, -1);
      if (!/[A-Za-z\u00C0-\u00FF]{2,}/.test(texto)) continue;
      const renglon = sinNotas.slice(0, m.index).split('\n').length;
      fallas.push(`${nombre}:${renglon}  texto escrito a mano a la vista: «${texto.slice(0, 70)}»`);
    }
    continue;
  }

  if (!esHtml) continue;

  const guiones = (crudo.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
  const guionHablaCatalogo = /(?:Catalogo|Texto)\.frase\s*\(/.test(guiones);

  if (/\bdata-frase\b/.test(sinNotas)) {
    convertidas++;

    // Regla 4a: en el HTML no puede quedar texto que una persona lea y que no
    // salga del catálogo.
    const limpio = sinEntidades(sinMetas(sinGuiones(despejar(crudo))));
    for (const [renglon, texto] of visible(limpio, true)) {
      if (!/[A-Za-zÀ-ÿ]{2,}/.test(texto)) continue;
      fallas.push(`${nombre}:${renglon}  texto escrito a mano: «${texto.slice(0, 70)}»`);
    }
  } else if (!guionHablaCatalogo) {
    continue;
  }

  // Regla 4b: y en el guión de esa pantalla, tampoco. Se mira sólo lo que
  // escribe en el documento —no toda cadena entre comillas—, porque un
  // identificador o una dirección no es texto visible.
  const escribe = /(?:textContent|innerHTML|innerText|placeholder|alert|confirm|prompt)\s*(?:=|\()\s*('[^'\n]{2,}'|"[^"\n]{2,}")/g;
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
/* Y lo mismo con el lector de las pantallas del programa, que es el que más
   fácil se pasa de largo: si se queda corto no encuentra nada, y este chequeo
   da por buena una pantalla escrita entera a mano. Se lo prueba contra lo que
   tiene que ver y contra lo que no. */
const PROGRAMA_DEBE_VER = [
  'return <p>Texto suelto</p>;',
  'return <p>{frase(x)} y suelto</p>;',
  'return <>{a}<b>Suelto</b></>;',
  'return <p>{n < 3 ? uno : dos} al hilo</p>;'
];
const PROGRAMA_NO_DEBE_VER = [
  'return <p>{frase("acceso.correo")}</p>;',
  'const total = renglon < maximo ? uno : dos;',
  'function X() { return <p>{a}</p>; }\nexport default X;',
  'return <p>{estado === "listo" && <b>{frase(y)}</b>}</p>;',
  'return <img src="/assets/images/logotipo.png" alt="" />;'
];

/* Y con el reconocedor de claves, que decide si una frase del catálogo tiene
   quién la pida. Si se queda corto, una frase que se está usando aparece como
   huérfana y alguien la borra, así que se lo prueba en los dos sentidos. El
   último caso de los que tiene que ver es una clave inventada: se la reconoce
   igual, y por eso la regla que exige que exista puede denunciarla. */
const GRUPOS_DE_PRUEBA = ['acceso', 'legajo'];
const CLAVE_DEBE_VERSE = [
  ['<span data-frase="acceso.correo">Correo</span>', 'acceso.correo'],
  ["Texto.frase('acceso.correo')", 'acceso.correo'],
  ['<SelectDelCatalogo vacio="legajo.elegir_tipo" />', 'legajo.elegir_tipo'],
  ['<Campo claveDelVacio="acceso.inventada_a_proposito" />', 'acceso.inventada_a_proposito']
];
const CLAVE_NO_DEBE_VERSE = [
  '<a href="acceso.html">Entrar</a>',
  'import algo from "acceso.js";',
  '<p>acceso.correo</p>'
];

/* Y lo mismo con la regla 6: un detector que no casa con nada da siempre por
   buena una pantalla que sí tiene el idioma escrito adentro. */
const IDIOMA_DEBE_CASAR = [
  "new Intl.DateTimeFormat('es-AR', { day: '2-digit' })",
  'new Intl.NumberFormat("en", {})',
  "new Intl.DateTimeFormat(['pt-BR'], {})",
  "Intl.Collator('es')"
];
const IDIOMA_NO_DEBE_CASAR = [
  "new Intl.DateTimeFormat(idiomaDeForma(), { day: '2-digit' })",
  'new Intl.NumberFormat(Catalogo.idioma, {})',
  "const IDIOMA_DE_FORMA_POR_OMISION = 'es-AR';"
];

/* Y con la regla 7, que es la que más fácil se pasa de largo: la forma buena y
   la mala se parecen mucho, y la diferencia son dos caracteres. */
const GUARDADO_DEBE_CASAR = [
  "    idioma: 'es-AR',",
  '  idioma: "pt-BR",',
  '    idioma: IDIOMA_POR_DEFECTO,'
];
const GUARDADO_NO_DEBE_CASAR = [
  '    get idioma() { return window.Catalogo.idioma; },',
  '    idioma: idiomaDelEntorno(),',
  "const IDIOMA_POR_DEFECTO = 'es-AR';"
];
const PISADO_DEBE_CASAR = [
  '        Catalogo.idioma = this.idioma;',
  'window.Catalogo.idioma="en"'
];
const PISADO_NO_DEBE_CASAR = [
  '  if (Catalogo.idioma === IDIOMA_POR_DEFECTO) return;',
  '      return window.Catalogo.idioma || IDIOMA_POR_DEFECTO;'
];

const roto = [];
for (const [regla, forma, casan, noCasan] of [
  ['la regla 7 (idioma guardado)', IDIOMA_GUARDADO, GUARDADO_DEBE_CASAR, GUARDADO_NO_DEBE_CASAR],
  ['la regla 7 (idioma pisado)', IDIOMA_PISADO, PISADO_DEBE_CASAR, PISADO_NO_DEBE_CASAR]
]) {
  for (const linea of casan) {
    forma.lastIndex = 0;
    if (!forma.test(linea)) roto.push(regla + ' no ve: ' + linea);
  }
  for (const linea of noCasan) {
    forma.lastIndex = 0;
    if (forma.test(linea)) roto.push(regla + ' se queja de: ' + linea);
  }
}
for (const linea of IDIOMA_DEBE_CASAR) {
  IDIOMA_ESCRITO.lastIndex = 0;
  if (!IDIOMA_ESCRITO.test(linea)) roto.push('la regla 6 no ve: ' + linea);
}
for (const linea of IDIOMA_NO_DEBE_CASAR) {
  IDIOMA_ESCRITO.lastIndex = 0;
  if (IDIOMA_ESCRITO.test(linea)) roto.push('la regla 6 se queja de: ' + linea);
}
for (const [html, texto] of DEBE_QUEDAR) {
  if (despejar(html).indexOf(texto) === -1) roto.push('deja de ver: ' + texto);
}
for (const trozo of PROGRAMA_DEBE_VER) {
  if (textoDePrograma(trozo).length === 0) {
    roto.push('el lector del programa no ve: ' + trozo);
  }
}
for (const trozo of PROGRAMA_NO_DEBE_VER) {
  const visto = textoDePrograma(trozo);
  if (visto.length > 0) {
    roto.push('el lector del programa se queja de: ' + trozo
      + '  (vio «' + visto[0][1] + '»)');
  }
}
for (const [trozo, clave] of CLAVE_DEBE_VERSE) {
  if (!clavesUsadas(trozo, GRUPOS_DE_PRUEBA).has(clave)) {
    roto.push('el reconocedor de claves no ve: ' + trozo);
  }
}
for (const trozo of CLAVE_NO_DEBE_VERSE) {
  const vistas = [...clavesUsadas(trozo, GRUPOS_DE_PRUEBA)];
  if (vistas.length) {
    roto.push('el reconocedor de claves se queja de: ' + trozo
      + '  (vio «' + vistas[0] + '»)');
  }
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
