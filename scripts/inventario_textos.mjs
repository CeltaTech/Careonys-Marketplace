/* ===================================================
   CUÁNTO TEXTO VISIBLE HAY, Y DÓNDE

       node scripts/inventario_textos.mjs
       node scripts/inventario_textos.mjs --detalle

   No es un chequeo y por eso no se llama `verificar_`: no falla nunca y no
   entra en `scripts/verificar_todo.mjs`. Es una medición, y existe porque el
   pendiente 9 —el multiidioma— es un cambio grande, y la regla de la empresa
   pide inventario antes que plan y plan antes que código. El inventario a mano
   queda viejo el día que alguien agrega una pantalla; éste se vuelve a correr.

   QUÉ CUENTA COMO TEXTO VISIBLE
   - El texto suelto entre etiquetas, salvo el de `<script>`, `<style>` y los
     comentarios.
   - Los atributos que la persona llega a leer: `placeholder`, `alt`, `title`,
     `aria-label`, `value` de un botón, y el `content` de `<meta name=…>`.
   - En los guiones, todo texto entre comillas que termina en pantalla:
     `textContent`, `innerHTML`, `alert`, y los que se arman con `+`.

   QUÉ NO CUENTA, Y POR QUÉ IMPORTA QUE NO CUENTE
   - **Lo que ya sale de un catálogo.** Las 133 opciones de
     `data/catalogo-vocabularios.json` y las fichas de los demás `data/*.json`
     no están escritas en ninguna pantalla: se traducen ahí y no acá. Que estén
     afuera de esta cuenta es el punto —muestra cuánto del trabajo ya se hizo
     sin proponérselo—.
   - **Las fechas.** `Texto.fechaCorta()` es el único lugar donde se le da forma
     a una fecha, así que el idioma le entra por ahí.
   - **Los nombres propios**, los números sueltos y los símbolos.

   - **Lo que ya está convertido.** El texto que queda adentro de un elemento con
     `data-frase` es el que se ve mientras el catálogo viaja, no trabajo por
     hacer, así que se despeja con la misma función que usa
     `scripts/verificar_frases.mjs`. Sin esto la cuenta no bajaba nunca: una
     pantalla convertida seguía contada entera, y el número dejaba de medir lo
     que falta.

   - **Lo que en un guion parece texto y es nombre.** Acá estaba el grueso del
     error: el 27 de agosto de 2026 la cuenta de «texto desde el guion» decía
     122 y de verdad eran 30. Lo que sobraba no era una cosa sino seis, y cada
     una se reconoce por algo que el proyecto ya escribió, nunca por adivinar si
     una cadena «parece» una frase:
       · la **clave** que se le pide al catálogo —`Catalogo.frase('…')`—, el
         nombre de un atributo en un `getAttribute` y el de un campo entre
         corchetes: los tres son nombres de ida, no texto de vuelta;
       · lo que está al lado de un `===`, que es un valor guardado y traducirlo
         rompe la comparación —el mismo criterio que `sinValoresGuardados()`
         aplica al `value` de un casillero en `texto_visible.mjs`—;
       · el segundo argumento de las funciones que clasifican un error, que sólo
         llega a la consola;
       · lo que se le escribe a un elemento que este mismo guion marca con
         `data-frase`, o a una hoja de estilo que él mismo se fabrica: en el
         primer caso el texto sale del catálogo y ya está contado allá, en el
         segundo es CSS;
       · el **atributo adentro de una plantilla de marcado**. `elemento.title = …`
         es una escritura y `title="Silenciar Micrófono">` es marcado; sin exigir
         el punto de adelante se confundían, y como un atributo no termina en
         punto y coma, la lectura seguía de largo y contaba como frases los
         renglones de código que venían atrás;
       · los **pedazos**: una plantilla cortada por la mitad, un hueco `${…}`
         contado sin mirar las llaves de adentro, un par de comillas mal
         emparejado en `a ? (x || '') : (y || '')`. Los tres dejaban restos como
         «<h4 style="font-size:14px» o «) : (y ||» adentro del inventario.
     Se comprobó al revés, que es lo que hace que la prueba pueda fallar: con un
     archivo de mentira que escribe cuatro frases de cuatro maneras distintas y
     dos cosas que no son texto, aparecen las cuatro y no aparecen las dos.

   LO QUE ESTA CUENTA NO PUEDE DECIR: si dos pantallas dicen la misma frase, acá
   figura dos veces. La cuenta de frases distintas está abajo, y es la que
   manda para calcular el trabajo: traducir es por frase, no por aparición.
=================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { despejar, sinValoresGuardados, visible } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const detalle = process.argv.includes('--detalle');

/* Carpetas que no son código propio. `pwa-*` sí entra: son pantallas. */
const AJENAS = new Set(['node_modules', '.git', 'assets', 'supabase', 'docs', 'data', '.githooks']);

/* LAS CAJAS FUERTES NO SE ABREN, Y ACÁ SE DECIDE HACIA AFUERA.
   `F:\proyectos\CLAUDE.md` prohíbe leer, listar y citar cualquier carpeta que
   anuncie que guarda material reservado, y cualquier carpeta `Exclusivo
   <cliente>`. Un recorrido de archivos las encuentra sin proponérselo, así que
   la prohibición tiene que estar escrita en el recorrido y no en la cabeza de
   quien lo corre: **ya pasó el 26 de agosto de 2026**, cuando la primera
   versión de este guion entró en una de ellas y contó las frases de un archivo
   que no tenía que abrir.

   Se decide por parecido y no por lista exacta, porque la lista exacta falla
   con la carpeta que alguien nombre distinto mañana. Si el nombre se parece a
   una caja fuerte, no se entra: **de más queda afuera una carpeta común, que se
   arregla agregándole una excepción; de menos se lee algo que no se podía**. */
const FUENTE = /\.(html|js|mjs|css|json|md|sql|ts|tsx|jsx|svg)$/i;

function esCajaFuerte(nombre) {
  const n = nombre.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();

  // Lo que anuncia en el nombre que no se sube ni se comparte.
  if (n.includes('no commit') || n.includes('no hacer commit') || n.includes('nohacercommit')
    || n.includes('no pushear') || n.includes('referencia') || n.startsWith('exclusivo ')) return true;

  // Y lo que anuncia que guarda claves. Pero **un archivo de código no es una
  // caja fuerte por llamarse `nueva-clave.html`**: esa es la pantalla donde
  // alguien cambia su contraseña, no un lugar donde haya ninguna guardada. La
  // primera versión de esto se las comió a las tres —`nueva-clave.html`,
  // `recuperar-clave.html` y `js/clave.js`— y el inventario salió corto sin
  // avisar. Así que la palabra sola frena sólo cuando el nombre no es código:
  // un `claves.txt`, un `credenciales.env`, una carpeta `contraseñas`.
  if (FUENTE.test(nombre)) return false;
  return /clave|contrase|secret|credencial|password/.test(n);
}

/* Los atributos que una persona llega a leer. `value` sólo en botones, porque
   en un campo de texto es un dato y no un rótulo. */
const ATRIBUTOS = ['placeholder', 'alt', 'title', 'aria-label'];

function archivos(dir, ext, acc = []) {
  for (const nombre of readdirSync(dir)) {
    if (AJENAS.has(nombre) || esCajaFuerte(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, ext, acc);
    else if (ext.some((e) => nombre.endsWith(e))) acc.push(ruta);
  }
  return acc;
}

/** Saca comentarios, `<script>` y `<style>`, que no son texto visible. */
function sinLoQueNoSeVe(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
}

/* Una frase cuenta si tiene al menos una letra y no es sólo un número, un
   símbolo o una sola letra suelta. `&nbsp;` y compañía no son texto. */
function esFrase(t) {
  const limpio = t.replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
  return /[A-Za-zÀ-ÿ]{2,}/.test(limpio) && limpio.length > 1;
}

function normalizar(t) {
  return t.replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

const hallazgos = [];
const agregar = (archivo, grupo, texto) => {
  const t = normalizar(texto);
  if (esFrase(t)) hallazgos.push({ archivo, grupo, texto: t });
};

// --- LAS PANTALLAS ---
for (const ruta of archivos(raiz, ['.html'])) {
  const rel = relative(raiz, ruta).replace(/\\/g, '/');
  const bruto = despejar(readFileSync(ruta, 'utf8'));
  const enPantalla = sinLoQueNoSeVe(bruto);

  // El texto entre etiquetas.
  for (const trozo of enPantalla.split(/<[^>]*>/)) agregar(rel, 'texto en pantalla', trozo);

  // Los atributos que se leen. Se buscan sobre el HTML entero menos comentarios,
  // porque un `alt` puede estar adentro de una plantilla de `<script>`.
  const conPlantillas = bruto.replace(/<!--[\s\S]*?-->/g, ' ');
  for (const attr of ATRIBUTOS) {
    // `(?<![-\\w])` y no el nombre pelado: sin eso `alt` casa también adentro de
    // `data-frase-alt`, y lo que se contaría es la clave del catálogo en lugar
    // del texto. Es el mismo cuidado que ya tienen `despejar()` y `visible()`.
    const exp = new RegExp('(?<![-\\w])' + attr + '\\s*=\\s*"([^"]*)"', 'gi');
    let m;
    while ((m = exp.exec(conPlantillas))) agregar(rel, 'atributo ' + attr, m[1]);
  }
  let m;
  const meta = /<meta[^>]+name\s*=\s*"(description|og:[^"]*)"[^>]+content\s*=\s*"([^"]*)"/gi;
  while ((m = meta.exec(bruto))) agregar(rel, 'meta ' + m[1], m[2]);
  const botones = /<(?:input|button)[^>]*\bvalue\s*=\s*"([^"]*)"/gi;
  // El mismo criterio que el chequeo de frases, y sale del mismo lugar: el
  // `value` de un redondel, un casillero, un campo escondido o una opción es
  // dato guardado, no rótulo. Acá había una segunda copia de la regla que no
  // miraba el `type`, y contaba como texto a traducir el `si`/`no` de los
  // formularios de novedades del portal.
  const conBotones = sinValoresGuardados(bruto);
  while ((m = botones.exec(conBotones))) agregar(rel, 'rótulo de botón', m[1]);
}

// --- LOS GUIONES ---
// Sólo el texto que termina en pantalla. Un texto entre comillas que es una
// clave, un selector o una dirección no es texto visible, y por eso se busca
// alrededor de lo que escribe en el documento en vez de todas las comillas.
//
// Buscar alrededor no alcanzaba, y se vio al mirar los 122 textos que este
// guion sacaba de los guiones: cuatro de cada diez no eran texto. Cuatro
// familias, y ninguna se descarta adivinando —cada una se reconoce por algo
// que el propio proyecto ya sabe—:
//
//  1. **Las claves del catálogo.** «error.generico», «fichado.registrando» y
//     otras treinta son lo que el código le pide al catálogo, no lo que la
//     persona lee. Se descartan comprobándolas contra
//     `data/catalogo-frases.json`, así que una clave inventada seguiría
//     contando.
//  2. **Lo que se le cuenta al registro y no a la persona.** El segundo
//     argumento de `Texto.claveDeError()` y `Texto.mensajeDeError()` —«guardar
//     el legajo», «cerrar la sesión»— sólo va a `console.error`
//     (`js/texto.js`), y traducirlo no cambia ninguna pantalla.
//  3. **Lo que el código ya marcó.** Un elemento que el guion arma y al que le
//     pone `data-frase` lleva su castellano como respaldo, igual que una
//     pantalla convertida. Es la misma regla que `despejar()` aplica al HTML.
//  4. **El marcado que viaja adentro de un `innerHTML`.** Ahí «video-modal-card»
//     o «fas fa-video» son clases, no frases. Un pedazo de HTML se mira con
//     `visible()`, que es la función que ya distingue el texto de los atributos
//     que se leen, en vez de juntar todo lo que esté entre comillas.
const CLAVES_DEL_CATALOGO = new Set(
  Object.keys(JSON.parse(readFileSync(join(raiz, 'data/catalogo-frases.json'), 'utf8')).frases)
);
/* El punto de adelante no es adorno: `elemento.title = ...` es una escritura de
   JavaScript, y `title="Silenciar Micrófono">` es un atributo adentro de una
   plantilla de marcado. Sin exigir el punto se confundían, y como un atributo no
   termina en punto y coma, el lector seguía leyendo y contaba como frases los
   renglones de código que venían después. Lo mismo con `placeholder`. */
const ESCRIBEN = new RegExp(
  '(?:([A-Za-z_$][\\w$]*)\\s*)?\\.\\s*(?:textContent|innerHTML|innerText|placeholder|title)\\s*=(?!=)\\s*'
  + '|(?<![.\\w$])alert\\s*\\(\\s*'
  + '|([A-Za-z_$][\\w$]*)\\s*\\.setAttribute\\(\\s*[\'"`](?:placeholder|title|alt|aria-label)[\'"`]\\s*,\\s*',
  'g'
);

/* Lee lo que se escribe, hasta el punto y coma que de verdad lo termina.
   Cortar en el primer `;` no alcanza: un `style="…;…"` adentro de un
   `innerHTML` trae varios, y cortar ahí parte el marcado al medio. Lo que
   quedaba entonces eran pedazos de atributo —«<h4 style="font-size:14px»—
   contados como frases a traducir. */
function leerValor(t, desde, tope = 900) {
  let i = desde;
  let comilla = null;
  // El tope no corta adentro de una cadena: una plantilla de marcado pasa
  // holgada los novecientos caracteres, y cortarla ahí devolvía a contar
  // pedazos de atributo. Lo que la termina es su propia comilla, y para eso
  // ya no hace falta adivinar dónde. El techo absoluto es por si nunca cierra.
  for (; i < t.length && (comilla ? i - desde < 20000 : i - desde < tope); i++) {
    const c = t[i];
    if (comilla) {
      if (c === '\\') i++;
      else if (c === comilla) comilla = null;
    } else if (c === "'" || c === '"' || c === '`') comilla = c;
    else if (c === ';') break;
  }
  return t.slice(desde, i);
}
/* Saca los huecos de una plantilla contando las llaves, no buscando la primera
   que cierre. Un hueco como `${a ? 'sí' : (b || 'no')}` tiene llaves adentro; con
   la forma corta quedaba a medias y el resto —«) : (b ||»— se contaba como una
   frase a traducir. Lo que el hueco calcula no es texto escrito acá: o sale de un
   dato, o sale de otra clave del catálogo, y en los dos casos ya está contado
   donde corresponde. */
function sinHuecos(t) {
  let salida = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '$' && t[i + 1] === '{') {
      let hondo = 1;
      i += 2;
      for (; i < t.length && hondo; i++) {
        if (t[i] === '{') hondo++;
        else if (t[i] === '}') hondo--;
      }
      i--;
      salida += ' ';
      continue;
    }
    salida += t[i];
  }
  return salida;
}

/* Devuelve lo que hay adentro de cada cadena, recorriendo el texto en vez de
   buscar pares de comillas sueltas. Con la forma corta, un `a ? (x || '') : (y || '')`
   emparejaba la comilla que cierra la primera cadena vacía con la que abre la
   segunda, y lo del medio —«) : (y ||»— entraba al inventario como una frase. */
function literales(t) {
  const salida = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c !== "'" && c !== '"' && c !== '`') continue;
    let j = i + 1;
    for (; j < t.length; j++) {
      if (t[j] === '\\') j++;
      else if (t[j] === c) break;
    }
    salida.push(t.slice(i + 1, j));
    i = j;
  }
  return salida;
}

/* Despeja lo que es nombre y no frase. Son tres formas, y las tres se reconocen
   por lo que el propio proyecto ya escribió alrededor:

   - **Lo que se le pide al catálogo.** `Catalogo.frase('catalogo.cargando')` no
     escribe esa cadena en la pantalla: la usa para ir a buscar el texto. La
     clave además puede vivir en la tabla de arranque de `js/catalogo.js` en vez
     del archivo de frases, así que compararla contra el archivo da un faltante
     que no existe. Mirar la forma de la llamada no tiene ese problema.
   - **Lo que se le pide a un elemento o a un dato.** El nombre de un atributo
     dentro de un `getAttribute` es marcado, y lo que va entre corchetes
     —`item['es-AR']`— es el nombre de un campo. Ninguno de los dos se lee.
   - **Lo que se compara.** Una cadena al lado de un `===` es un valor guardado
     —`'validado_prestadora'`, `'es-AR'`—, y traducirla rompe la comparación.
     Es el mismo criterio que `sinValoresGuardados()` aplica al `value` de un
     casillero en `texto_visible.mjs`. */
const sinNombres = (t) => t
  .replace(/((?:frase|etiquetaSiExiste|etiqueta|getAttribute|setAttribute)\s*\(\s*)(?:'[^']*'|"[^"]*"|`[^`]*`)/g, (todo, antes) => antes)
  .replace(/(\[\s*)(?:'[^']*'|"[^"]*"|`[^`]*`)(\s*\])/g, (todo, a, b) => a + b)
  .replace(/(?:'[^']*'|"[^"]*"|`[^`]*`)(\s*[!=]==?\s*)|(\s*[!=]==?\s*)(?:'[^']*'|"[^"]*"|`[^`]*`)/g,
    (todo, a, b) => a || b);

/* El segundo argumento de las dos que clasifican un error: se despeja dejando
   la coma, para no pegar el primero con lo que venga después. */
const sinLoQueSeIntentaba = (t) => t.replace(
  /((?:clave|mensaje)DeError\s*\(\s*[^,()]{0,80},\s*)(?:'[^']*'|"[^"]*"|`[^`]*`)/g,
  (todo, antes) => antes
);
for (const ruta of archivos(raiz, ['.js', '.html'])) {
  const rel = relative(raiz, ruta).replace(/\\/g, '/');
  const bruto = readFileSync(ruta, 'utf8');
  const guion = ruta.endsWith('.js')
    ? bruto.replace(/^\s*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    : (bruto.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n')
        .replace(/^\s*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

  // Los elementos que este mismo guion marca con `data-frase`.
  const marcados = new Set();
  for (const m of guion.matchAll(/([A-Za-z_$][\w$]*)\s*\.setAttribute\(\s*['"`]data-frase/g)) {
    marcados.add(m[1]);
  }

  /* Y las hojas de estilo que el guion se fabrica solo. Lo que se le escribe
     adentro a un `<style>` es CSS: nadie lo lee y nadie lo traduce. Se reconoce
     por dónde nació el elemento, igual que arriba, y no por lo que parezca el
     texto. */
  for (const m of guion.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*document\.createElement\(\s*['"`]style['"`]/g)) {
    marcados.add(m[1]);
  }

  const anotar = (texto) => {
    if (!CLAVES_DEL_CATALOGO.has(texto.trim())) agregar(rel, 'texto desde el guion', texto);
  };

  let m;
  while ((m = ESCRIBEN.exec(guion))) {
    const duenio = m[1] || m[2];
    if (duenio && marcados.has(duenio)) continue;
    // Los huecos de una plantilla no son texto: se despejan antes de mirar.
    const valor = sinNombres(sinHuecos(sinLoQueSeIntentaba(leerValor(guion, ESCRIBEN.lastIndex))));
    /* Se mira cadena por cadena, y el marcado se lee desde adentro de la suya.
       Mirando el valor entero, las comillas que envolvían al marcado quedaban
       pegadas al texto —«' Todavía no hay reportes de hoy. '»— y esa frase no
       coincidía con ninguna del catálogo aunque estuviera. */
    for (const c of literales(valor)) {
      if (/<[a-z][\w-]*[\s>]/i.test(c)) {
        for (const [, texto] of visible(c, true)) anotar(texto);
      } else if (c.trim().length >= 2) {
        anotar(c);
      }
    }
  }
}

// --- EL INFORME ---
const porArchivo = new Map();
const porGrupo = new Map();
const distintas = new Map();
for (const h of hallazgos) {
  porArchivo.set(h.archivo, (porArchivo.get(h.archivo) || 0) + 1);
  porGrupo.set(h.grupo, (porGrupo.get(h.grupo) || 0) + 1);
  distintas.set(h.texto, (distintas.get(h.texto) || 0) + 1);
}
const orden = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1]);
const palabras = (t) => t.split(/\s+/).length;
const largas = [...distintas.keys()].filter((t) => palabras(t) >= 12).length;

console.log('\nTEXTO VISIBLE, HOY\n');
console.log(`  ${hallazgos.length} apariciones en ${porArchivo.size} archivos.`);
console.log(`  ${distintas.size} frases distintas, que son las que hay que traducir.`);
console.log(`  ${hallazgos.length - distintas.size} apariciones son repeticiones de una frase que ya está en la lista.`);
console.log(`  ${largas} de esas frases pasan las 12 palabras: son párrafos, no rótulos.\n`);

console.log('  POR TIPO');
for (const [g, n] of orden(porGrupo)) console.log(`    ${String(n).padStart(5)}  ${g}`);

console.log('\n  POR ARCHIVO');
for (const [a, n] of orden(porArchivo)) console.log(`    ${String(n).padStart(5)}  ${a}`);

console.log('\n  LAS QUE MÁS SE REPITEN');
for (const [t, n] of orden(distintas).filter(([, n]) => n > 2).slice(0, 12)) {
  console.log(`    ${String(n).padStart(5)}×  «${t.slice(0, 70)}${t.length > 70 ? '…' : ''}»`);
}

if (detalle) {
  console.log('\n  TODAS, POR ARCHIVO');
  for (const [a] of orden(porArchivo)) {
    console.log(`\n  ── ${a}`);
    for (const h of hallazgos.filter((x) => x.archivo === a)) {
      console.log(`     [${h.grupo}] ${h.texto.slice(0, 100)}`);
    }
  }
}
console.log('');
