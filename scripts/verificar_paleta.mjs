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

   Dónde mira, que son las cinco puertas por las que entra un color:
   - los atributos `style=` del HTML;
   - los bloques `<style>` de adentro del HTML;
   - los archivos `.css`;
   - el JavaScript, que pinta con `elemento.style.background = '…'`. Ésa fue la
     cuarta puerta y se descubrió tarde: el primer barrido miró las otras tres y
     dejó trece colores en `registrar-asistente.html` que nadie veía porque no
     estaban en ninguna hoja de estilo;
   - y los guiones del proyecto, que es la quinta y se descubrió después todavía.
     Un guion también pinta: el que arma el manifiesto de los dos programas del
     teléfono escribe el color con el que el teléfono pinta la barra de estado y
     el fondo de la pantalla de arranque. Ese color estuvo escrito ahí a mano y
     se despegó del que el proyecto tenía decidido, y este chequeo no lo vio
     porque se saltaba la carpeta entera —sin decirlo acá arriba—.

   Qué no mira, y por qué:
   - **`css/tokens.css` y sus dos copias**: es el único lugar donde un color vive
     a propósito, porque es el lugar donde tiene nombre.
   - **Los comentarios**: explican de dónde salió cada token y para eso necesitan
     escribir el número.
   - **`docs/`, `supabase/` y `assets/`**: la documentación muestra colores como
     ejemplo, una migración aplicada no se edita jamás, y un `.svg` es un dibujo,
     no una pantalla.
   - **Los dos bancos de prueba**: el de acá y el del modo oscuro escriben colores
     a propósito, porque un detector que no se prueba contra lo que tiene que
     saltar no prueba nada. Están nombrados de a uno, con su motivo, y si alguno
     dejara de tener un color adentro este chequeo se planta: una exención que ya
     no exime nada sigue perdonando, y lo único que perdona es el aire.

   Y no hay ninguna pantalla con excepción. Hasta el 2 de septiembre de 2026
   había dos, el rojo de Google y el azul de Facebook, que vivían en los dos
   botones de entrar con esas cuentas de `mockup-app.html`. Esos botones no
   hacían nada y se sacaron —el pendiente 50, cerrado ese día—, así que la
   exención se fue con ellos: una exención que ya no exime nada no se apaga
   sola, sigue perdonando, y lo único que perdona es el aire. Por eso los dos
   bancos de prueba, que son lo único exento que queda, se plantan el día que se
   queden sin color adentro.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA, esPantalla } from './recorrido.mjs';
import { enBlanco } from './texto_visible.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   éste, dicho entero y una por una, porque antes sólo estaba escrito el motivo de
   la que se había ido y las tres que quedaban no decían nada. Acá se revisa lo
   que pinta una pantalla.

   - `docs`: es texto, y nombra colores con su número justamente para explicarlos
     —entre ellos el que se había despegado—. Meterlo adentro pondría en rojo el
     documento que cuenta lo que pasó.
   - `supabase`: es el servidor y no pinta ninguna pantalla. Y el color de marca
     de cada Prestadora vive ahí **a propósito**, como dato suyo que es: lo
     declaran y lo siembran las migraciones. Eso no es un color escrito a mano,
     es la identidad de cada una, que por definición no sale de la paleta del
     producto. Por lo mismo tampoco entra la extensión del servidor: el único
     archivo así del proyecto vive adentro de esta carpeta.
   - `assets`: un dibujo lleva sus colores escritos adentro, y también a
     propósito: abierto adentro de una imagen no alcanza las variables de la hoja
     de estilos, así que no tiene de dónde tomarlos.

   `scripts/` estuvo en esta lista y salió: un guion también pinta, y el que arma
   el manifiesto de los dos programas del teléfono tenía el color escrito a mano
   y despegado del decidido sin que acá se viera nada. */
const AJENAS = ['docs', 'supabase', 'assets'];

/* Los dos bancos de prueba, que escriben colores a propósito. Se nombran de a
   uno y con el motivo al lado, y más abajo se comprueba que cada uno siga
   teniendo alguno: la exención que se queda sin nada que eximir no avisa sola. */
const BANCOS = new Map([
  ['scripts/verificar_paleta.mjs',
   'el banco con el que este mismo chequeo se prueba antes de recorrer nada'],
  ['scripts/verificar_temas.mjs',
   'el banco con el que se prueba el chequeo del modo oscuro']
]);

/* El único lugar donde un color vive con su número, porque es donde tiene nombre. */
const TOKENS = new Set([
  'css/tokens.css',
  'pwa-asistente/css/tokens.css',
  'pwa-familia/css/tokens.css'
]);

/* Un guion se lee igual que el JavaScript de una pantalla: mismos comentarios y
   misma manera de escribir un color. La forma se pregunta acá y no se compara
   contra una letra suelta, que es lo que dejaba afuera a los `.mjs`. */
const GUIONES = ['.js', '.mjs'];
const esGuion = (extension) => GUIONES.includes(extension);

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|\boklch\([^)]*\)/g;

/** Los colores que sobran en un texto, cada uno con su número de renglón. */
function coloresQueSobran(crudo, extension) {
  const limpio = sinComentarios(crudo, extension);
  const hallados = [];
  for (const acierto of limpio.matchAll(COLOR)) {
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
  if (esPantalla(extension)) t = t.replace(/<!--[\s\S]*?-->/g, enBlanco);
  if (esPantalla(extension) || esGuion(extension) || extension === '.css') {
    t = t.replace(/\/\*[\s\S]*?\*\//g, enBlanco);
  }
  if (esPantalla(extension) || esGuion(extension)) {
    t = t.replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + enBlanco(m.slice(antes.length)));
  }
  return t;
}

/* Una prueba que no puede fallar no prueba nada: antes de recorrer el proyecto,
   el detector se prueba contra lo que tiene que saltar y contra lo que no. */
const SOBRAN = [
  ['<div style="background:#f8fafc">', EXTENSIONES_DE_PANTALLA[0]],
  ['  border: 1px solid #e2e8f0;', '.css'],
  ['aviso.style.color = \'#b71c1c\';', '.js'],
  ['  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);', '.css'],
  ['  color: hsl(210, 40%, 30%);', '.css'],
  ['  background: oklch(0.65 0.13 250);', '.css'],
  ["const tema = '#1E3A5F';", '.mjs']
];
const NO_SOBRAN = [
  ['<div style="background:var(--superficie)">', EXTENSIONES_DE_PANTALLA[0]],
  ['  border: 1px solid var(--borde-card);', '.css'],
  ['aviso.style.color = \'var(--tono-critico-texto)\';', '.js'],
  ['/* Antes era #f8fafc, escrito a mano en once lugares. */', '.css'],
  ['<!-- El fondo era #e2e8f0 y ahora sale del token. -->', EXTENSIONES_DE_PANTALLA[0]],
  ['// El aviso usaba #b71c1c cuando el color estaba a mano.', '.js'],
  ['  padding: 12px 16px;', '.css'],
  ['<a href="#formulario">Postularse</a>', EXTENSIONES_DE_PANTALLA[0]],
  ['<a href="#top">Volver arriba</a>', EXTENSIONES_DE_PANTALLA[0]],
  ["const tema = token('--fondo-app');", '.mjs'],
  ['// El manifiesto tenía #1E3A5F escrito a mano.', '.mjs']
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
const bancosSinColor = new Set(BANCOS.keys());
let revisados = 0;
let eximidos = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.css', ...GUIONES], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (TOKENS.has(nombre)) continue;
  if (BANCOS.has(nombre)) {
    eximidos++;
    const extension = nombre.slice(nombre.lastIndexOf('.'));
    if (coloresQueSobran(readFileSync(camino, 'utf8'), extension).length) bancosSinColor.delete(nombre);
    continue;
  }
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

/* Y que las dos exenciones sigan eximiendo algo. Si un banco se queda sin
   ningún color escrito, dejó de ser un banco y la exención perdona el aire. */
if (bancosSinColor.size) {
  console.error('Exenciones que ya no eximen nada:\n');
  for (const nombre of bancosSinColor) {
    console.error(`  - \`${nombre}\` está eximido —${BANCOS.get(nombre)}— y adentro no`);
    console.error('    tiene ni un color escrito. O volvió a tenerlos en otro lado, o la');
    console.error('    exención se saca.');
  }
  process.exit(1);
}

console.log(
  `Paleta verificada: ${revisados} archivos sin colores a mano ` +
  `(${eximidos} bancos de prueba exentos, cada uno con su motivo y con colores adentro).`);
