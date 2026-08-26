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

   LO QUE ESTA CUENTA NO PUEDE DECIR: si dos pantallas dicen la misma frase, acá
   figura dos veces. La cuenta de frases distintas está abajo, y es la que
   manda para calcular el trabajo: traducir es por frase, no por aparición.
=================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { despejar } from './texto_visible.mjs';

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
  const visible = sinLoQueNoSeVe(bruto);

  // El texto entre etiquetas.
  for (const trozo of visible.split(/<[^>]*>/)) agregar(rel, 'texto en pantalla', trozo);

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
  while ((m = botones.exec(bruto))) agregar(rel, 'rótulo de botón', m[1]);
}

// --- LOS GUIONES ---
// Sólo el texto que termina en pantalla. Un texto entre comillas que es una
// clave, un selector o una dirección no es texto visible, y por eso se busca
// alrededor de lo que escribe en el documento en vez de todas las comillas.
const ESCRIBEN = /(?:textContent|innerHTML|innerText|placeholder|alert|title)\s*(?:=|\()\s*([^;]{0,400})/g;
for (const ruta of archivos(raiz, ['.js', '.html'])) {
  const rel = relative(raiz, ruta).replace(/\\/g, '/');
  const bruto = readFileSync(ruta, 'utf8');
  const guion = ruta.endsWith('.js')
    ? bruto.replace(/^\s*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
    : (bruto.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || []).join('\n')
        .replace(/^\s*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  let m;
  while ((m = ESCRIBEN.exec(guion))) {
    const cadenas = m[1].match(/'([^'\\]{2,})'|"([^"\\]{2,})"|`([^`$\\]{2,})`/g) || [];
    for (const c of cadenas) agregar(rel, 'texto desde el guion', c.slice(1, -1));
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
