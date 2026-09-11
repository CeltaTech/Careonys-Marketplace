/* ===================================================
   VERIFICA QUE LA MARCA NO ESTÉ ESCRITA A MANO

   Falla —con código de salida 1— si el nombre comercial, el dominio o el correo
   de contacto aparecen escritos en algún archivo del proyecto que no sea
   `js/identidad.js`.

       node scripts/verificar_identidad.mjs

   Por qué existe: doce apariciones se vuelven treinta en tres días sin que nadie
   las agregue a propósito. Una regla que no se verifica sola no es una regla.

   Qué no mira:
   - la documentación (`docs/`, `*.md`), que habla del producto y lo nombra;
   - los comentarios del código, que explican de dónde salen las cosas y para eso
     necesitan nombrar el sistema heredado;
   - `js/identidad.js` y sus dos copias, que son el único lugar donde el nombre
     vive a propósito.

   Qué mira además del nombre:
   - que las tres copias de `js/identidad.js` sean iguales byte a byte;
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

import { hayArchivos, EXTENSIONES_DE_PANTALLA, esPantalla } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { IDENTIDAD } = require(join(raiz, 'js', 'identidad.js'));

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: la documentación nombra la marca a propósito y todo el tiempo. */
const AJENAS = ['docs'];
const EXTENSIONES = [...EXTENSIONES_DE_PANTALLA, '.js', '.css', '.json', '.webmanifest', '.txt'];
const COPIAS_IDENTIDAD = [
  join('js', 'identidad.js'),
  join('pwa-asistente', 'js', 'identidad.js'),
  join('pwa-familia', 'js', 'identidad.js')
];
const ARCHIVOS_EXENTOS = new Set([
  ...COPIAS_IDENTIDAD,
  join('scripts', 'verificar_identidad.mjs')
]);
// Generados desde la identidad: se verifican aparte, no por su contenido.
const GENERADOS = new Set([
  join('pwa-asistente', 'manifest.json'),
  join('pwa-familia', 'manifest.json')
]);

// Lo prohibido sale de la identidad misma: cambiar la marca cambia el chequeo.
const PROHIBIDO = [
  IDENTIDAD.nombre, IDENTIDAD.nombreCorto, IDENTIDAD.dominio, IDENTIDAD.contacto
].filter((v, i, a) => v && a.indexOf(v) === i);

// Deja el renglón en blanco si era un comentario. Reemplaza por espacios en vez
// de borrar para que el número de renglón siga siendo el de verdad.
function sinComentarios(texto, extension) {
  let t = texto;
  const tapar = (m) => m.replace(/[^\r\n]/g, ' ');
  if (esPantalla(extension)) t = t.replace(/<!--[\s\S]*?-->/g, tapar);
  if (extension === '.js' || extension === '.mjs' || extension === '.css') {
    t = t.replace(/\/\*[\s\S]*?\*\//g, tapar);
  }
  if (extension === '.js' || extension === '.mjs') {
    t = t.replace(/^([^\n'"`]*?)\/\/[^\n]*/gm, (m, antes) => antes + tapar(m.slice(antes.length)));
  }
  return t;
}

const hallazgos = [];
for (const ruta of hayArchivos(raiz, EXTENSIONES, AJENAS)) {
  const rel = relative(raiz, ruta);
  if (ARCHIVOS_EXENTOS.has(rel) || GENERADOS.has(rel)) continue;
  if (rel.toLowerCase().endsWith('.md')) continue;
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
console.log('Identidad verificada: el nombre solo vive en js/identidad.js.');
