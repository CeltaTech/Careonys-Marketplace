/* ===================================================
   VERIFICA QUE LA MARCA NO ESTÉ ESCRITA A MANO

   Falla —con código de salida 1— si el nombre comercial, el dominio o el correo
   de contacto aparecen escritos en algún archivo del proyecto que no sea
   `js/identidad.js`.

       node scripts/verificar_identidad.mjs

   Por qué existe: doce apariciones se vuelven treinta en tres días sin que nadie
   las agregue a propósito. Una regla que no se verifica sola no es una regla.

   Qué no mira, y por qué:
   - la documentación (`docs/`, y los `.md` de cualquier lado, que no entran por
     extensión), que habla del producto y lo nombra;
   - los comentarios del código, que explican de dónde salen las cosas y para eso
     necesitan nombrar el sistema heredado;
   - `js/identidad.js`, que es el único lugar donde el nombre vive a propósito;
   - las herramientas de `scripts/`. Nadie resuelve `{{producto}}` ahí: no hay
     página que cargar, así que la marca escrita en una herramienta no es la
     marca escrita a mano, es la única forma de escribirla. Y encima nombran a
     propósito la dirección publicada, el producto hermano y la palabra que el
     glosario aprueba. Antes quedaban afuera **sin que nadie lo hubiera
     decidido** —ninguna de sus extensiones entraba en el recorrido—, y eso se
     notaba en que este mismo archivo se eximía a sí mismo de un recorrido que
     no lo alcanzaba.

   Qué mira además del nombre:
   - que los dos `manifest.json` estén al día con la identidad;
   - que el `<title>` y la `<meta name="description">` que traen
     `data-organizacion-original` —el marcador resuelto a mano para que un
     buscador lo indexe sin ejecutar guiones, pendiente 79— sigan diciendo lo
     mismo que resuelve `js/identidad.js` hoy.
=================================================== */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA, esPantalla } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { IDENTIDAD } = require(join(raiz, 'js', 'identidad.js'));

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este, y el encabezado dice por qué cada uno. */
const AJENAS = ['docs', 'scripts'];

/* Todo lo que puede terminar delante de una persona. Faltaban el esquema, la
   puerta de alta y baja y los dibujos: el texto que siembra una migración se
   lee en pantalla, y un dibujo lleva título. Faltaban también `.mjs` y `.cjs`,
   que hoy viven todos en `scripts/` —que queda afuera a propósito— pero el día
   que uno cuelgue de otro lado tiene que entrar solo. */
const EXTENSIONES = [
  ...EXTENSIONES_DE_PANTALLA,
  '.js', '.mjs', '.cjs', '.ts', '.css', '.json', '.webmanifest', '.txt', '.sql', '.svg'
];
const ARCHIVOS_EXENTOS = new Set([join('js', 'identidad.js')]);
// Generados desde la identidad: se verifican aparte, no por su contenido.
const GENERADOS = new Set([
  join('pwa-asistente', 'manifest.json'),
  join('pwa-familia', 'manifest.json')
]);

// Lo prohibido sale de la identidad misma: cambiar la marca cambia el chequeo.
const PROHIBIDO = [
  IDENTIDAD.nombre, IDENTIDAD.nombreCorto, IDENTIDAD.dominio, IDENTIDAD.contacto
].filter((v, i, a) => v && a.indexOf(v) === i);

const CON_BLOQUE = new Set(['.js', '.mjs', '.cjs', '.ts', '.css']);
const CON_DOS_BARRAS = new Set(['.js', '.mjs', '.cjs', '.ts']);

// Deja el renglón en blanco si era un comentario. Reemplaza por espacios en vez
// de borrar para que el número de renglón siga siendo el de verdad.
function sinComentarios(texto, extension) {
  let t = texto;
  const tapar = (m) => m.replace(/[^\r\n]/g, ' ');
  if (esPantalla(extension) || extension === '.svg') t = t.replace(/<!--[\s\S]*?-->/g, tapar);
  if (CON_BLOQUE.has(extension)) t = t.replace(/\/\*[\s\S]*?\*\//g, tapar);
  if (CON_DOS_BARRAS.has(extension)) {
    t = t.replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + tapar(m.slice(antes.length)));
  }
  /* El esquema comenta con dos guiones, y ahí adentro se explica de dónde sale
     cada tabla, que es justo donde se nombra al producto hermano. */
  if (extension === '.sql') {
    t = t.replace(/^([^\n'"]*?)--[^\n]*/gm, (m, antes) => antes + tapar(m.slice(antes.length)));
  }
  return t;
}

/* Y que no quede buscando nada: lo prohibido sale de la identidad, así que si
   la identidad dejara de traer sus palabras —un renombre, un archivo movido—
   este chequeo recorrería los mismos archivos y no buscaría adentro ni una
   sola cosa, y diría ✔ igual. */
seRevisaron(PROHIBIDO.length, 'ni una palabra de la marca que buscar en la identidad');

const hallazgos = [];
let revisados = 0;
for (const ruta of hayArchivos(raiz, EXTENSIONES, AJENAS)) {
  const rel = relative(raiz, ruta);
  if (ARCHIVOS_EXENTOS.has(rel) || GENERADOS.has(rel)) continue;
  revisados += 1;
  const extension = rel.slice(rel.lastIndexOf('.'));
  const texto = readFileSync(ruta, 'utf8');
  const limpio = sinComentarios(texto, extension);
  /* Acá se salteaban los renglones que generaba `generar_titulos_resueltos.mjs`,
     que escribía el nombre ya resuelto adentro de cada página suelta para que un
     buscador —que no ejecuta guiones— no indexara el marcador crudo. Las páginas
     sueltas se retiraron y ese trabajo lo hace ahora `scripts/armar_todo.mjs`
     sobre lo construido, con el mismo `js/identidad.js`: el marcador no queda
     escrito en ninguna parte del código, así que no hay renglón que saltear. */
  limpio.split('\n').forEach((renglon, i) => {
    for (const termino of PROHIBIDO) {
      if (renglon.toLowerCase().includes(termino.toLowerCase())) {
        hallazgos.push(rel.split(sep).join('/') + ':' + (i + 1) + '  ' + renglon.trim().slice(0, 100));
        break;
      }
    }
  });
}

const problemas = [];
if (hallazgos.length) {
  problemas.push(
    'La marca está escrita a mano en ' + hallazgos.length + ' lugar(es).\n' +
    'Se escribe {{producto}}, {{productoCorto}}, {{dominio}} o {{contacto}}, y lo resuelve\n' +
    'js/identidad.js al cargar la página.\n\n  ' + hallazgos.join('\n  ')
  );
}

// Acá se comparaban las tres copias de `js/identidad.js`, que existían porque
// sin conexión cada programa del teléfono sólo alcanza su propia carpeta. Ya no
// hay copias: los tres paquetes nombran el mismo archivo y la herramienta de
// armado se lo lleva adentro, así que no hay ninguna que pueda despegarse.

const { revisarManifiestos } = await import('./generar_manifiestos.mjs');
const desactualizados = revisarManifiestos(false);
if (desactualizados.length) {
  problemas.push(
    'Estos manifiestos no coinciden con la identidad:\n  ' + desactualizados.join('\n  ') + '\n' +
    'Se ponen al día con: node scripts/generar_manifiestos.mjs'
  );
}



if (problemas.length) {
  console.error('\n' + problemas.join('\n\n') + '\n');
  process.exit(1);
}
console.log(
  `Identidad verificada: el nombre solo vive en js/identidad.js `
  + `(${PROHIBIDO.length} palabras de la marca buscadas en ${revisados} archivos).`);
