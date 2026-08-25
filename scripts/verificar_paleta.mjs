/* ===================================================
   VERIFICA QUE NINGÚN COLOR ESTÉ ESCRITO A MANO

   Falla —con código de salida 1— si aparece un color escrito con su número
   (`#1e293b`, `rgb(…)`, `rgba(…)`, `hsl(…)`, `oklch(…)`) en cualquier archivo
   del proyecto que no sea `css/tokens.css`.

       node scripts/verificar_paleta.mjs

   Por qué existe: el 25 de agosto de 2026 había 405 colores escritos a mano
   repartidos en trece archivos, y 62 valores distintos para unas quince ideas.
   Cinco verdes apenas diferentes eran todos el mismo cuadro de «salió bien»,
   escritos cinco veces por cinco manos. Eso no es sólo desprolijo: un color
   escrito con su número **no cambia de noche**. El modo oscuro se enciende
   cambiando lo que valen los tokens, y el que no sale de un token se queda
   clavado — un cuadro blanco con letra blanca adentro de una pantalla negra.

   Por eso no alcanza con haberlos sacado una vez. Una regla que no se verifica
   sola no es una regla, que es lo mismo que hicieron el chequeo de trato, el de
   identidad y el de vocabulario.

   Dónde mira, que son las cuatro puertas por las que entra un color:
   - los atributos `style=` del HTML;
   - los bloques `<style>` de adentro del HTML;
   - los archivos `.css`;
   - el JavaScript, que pinta con `elemento.style.background = '…'`. Ésa fue la
     cuarta puerta y se descubrió tarde: el primer barrido miró las otras tres y
     dejó trece colores en `postulacion-asistente.html` que nadie veía porque no
     estaban en ninguna hoja de estilo.

   Qué no mira, y por qué:
   - **`css/tokens.css` y sus dos copias**: es el único lugar donde un color vive
     a propósito, porque es el lugar donde tiene nombre.
   - **Los comentarios**: explican de dónde salió cada token y para eso necesitan
     escribir el número.
   - **`docs/`, `supabase/` y `assets/`**: la documentación muestra colores como
     ejemplo, y un `.svg` es un dibujo, no una pantalla.

   Las dos excepciones escritas con nombre y motivo están en `AJENOS`.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { archivos } from './recorrido.mjs';
import { enBlanco } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: acá se revisa lo que pinta una pantalla. */
const AJENAS = ['docs', 'supabase', 'assets', 'scripts'];

/* El único lugar donde un color vive con su número, porque es donde tiene nombre. */
const TOKENS = new Set([
  'css/tokens.css',
  'pwa-asistente/css/tokens.css',
  'pwa-familia/css/tokens.css'
]);

/* Colores de otras empresas. No son parte de la paleta y no cambian de noche:
   el rojo de Google es el rojo de Google también sobre fondo negro, y escribirlo
   con un token nuestro sería decir que es nuestro. */
const AJENOS = new Map([
  ['#ea4335', 'es el rojo de la marca Google, en el botón de ingresar con Google'],
  ['#1877f2', 'es el azul de la marca Facebook, en el botón de ingresar con Facebook']
]);

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g;

/** Los colores que sobran en un texto, cada uno con su número de renglón. */
function coloresQueSobran(crudo, extension) {
  const limpio = sinComentarios(crudo, extension);
  const hallados = [];
  for (const acierto of limpio.matchAll(COLOR)) {
    const color = acierto[0].toLowerCase().replace(/\s+/g, '');
    if (AJENOS.has(color)) continue;
    const renglon = limpio.slice(0, acierto.index).split('\n').length;
    hallados.push([renglon, acierto[0]]);
  }
  return hallados;
}

/* Deja el renglón en blanco si era un comentario, con el mismo criterio que
   `verificar_identidad.mjs`: se tapa con espacios en vez de borrar para que el
   número de renglón siga siendo el de verdad. */
function sinComentarios(texto, extension) {
  let t = texto;
  if (extension === '.html') t = t.replace(/<!--[\s\S]*?-->/g, enBlanco);
  if (extension === '.html' || extension === '.js' || extension === '.css') {
    t = t.replace(/\/\*[\s\S]*?\*\//g, enBlanco);
  }
  if (extension === '.html' || extension === '.js') {
    t = t.replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + enBlanco(m.slice(antes.length)));
  }
  return t;
}

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra lo que tiene que saltar y contra lo que no. */
const SOBRAN = [
  ['<div style="background:#f8fafc">', '.html'],
  ['  border: 1px solid #e2e8f0;', '.css'],
  ['aviso.style.color = \'#b71c1c\';', '.js'],
  ['  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);', '.css'],
  ['  color: hsl(210, 40%, 30%);', '.css'],
  ['  background: oklch(0.65 0.13 250);', '.css']
];
const NO_SOBRAN = [
  ['<div style="background:var(--superficie)">', '.html'],
  ['  border: 1px solid var(--borde-card);', '.css'],
  ['aviso.style.color = \'var(--tono-critico-texto)\';', '.js'],
  ['/* Antes era #f8fafc, escrito a mano en once lugares. */', '.css'],
  ['<!-- El fondo era #e2e8f0 y ahora sale del token. -->', '.html'],
  ['// El aviso usaba #b71c1c cuando el color estaba a mano.', '.js'],
  ['<button style="background:#ea4335">Ingresar con Google</button>', '.html'],
  ['<button style="background:#1877f2">Ingresar con Facebook</button>', '.html'],
  ['  padding: 12px 16px;', '.css'],
  ['<a href="#formulario">Postularse</a>', '.html'],
  ['<a href="#top">Volver arriba</a>', '.html']
];

const noDetecta = SOBRAN.filter(([t, e]) => coloresQueSobran(t, e).length === 0);
const sePasa = NO_SOBRAN.filter(([t, e]) => coloresQueSobran(t, e).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  if (noDetecta.length) console.error('  no detecta: ' + noDetecta.map(([t]) => t).join(' / '));
  if (sePasa.length) console.error('  avisa de más: ' + sePasa.map(([t]) => t).join(' / '));
  process.exit(1);
}

const fallas = [];
let revisados = 0;

for (const camino of archivos(raiz, ['.html', '.css', '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (TOKENS.has(nombre)) continue;
  revisados++;
  const extension = nombre.slice(nombre.lastIndexOf('.'));
  for (const [renglon, color] of coloresQueSobran(readFileSync(camino, 'utf8'), extension)) {
    fallas.push(`${nombre}:${renglon}  ${color}`);
  }
}

if (fallas.length > 0) {
  console.error('Colores escritos a mano, fuera de la paleta:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'color' : 'colores';
  console.error(
    `\n${fallas.length} ${plural}. Los colores viven en css/tokens.css y se usan por su nombre:\n` +
    'var(--superficie), var(--texto-principal), var(--tono-critico-fondo)…\n' +
    'Un color escrito con su número no cambia cuando se enciende el modo oscuro.\n' +
    'Si de verdad hace falta uno que no está, se agrega a la sección 3 de\n' +
    'css/tokens.css —que es la propia del marketplace— y se copia a las otras dos.');
  process.exit(1);
}

console.log(
  `Paleta verificada: ${revisados} archivos sin colores a mano ` +
  `(${AJENOS.size} exentos por ser marcas de otras empresas).`);
