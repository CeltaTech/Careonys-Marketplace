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
   - que los dos `manifest.json` estén al día con la identidad.
=================================================== */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { IDENTIDAD } = require(join(raiz, 'js', 'identidad.js'));

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: la documentación nombra la marca a propósito y todo el tiempo. */
const AJENAS = ['docs'];
const EXTENSIONES = ['.html', '.js', '.css', '.json', '.webmanifest', '.txt'];
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
  if (extension === '.html') t = t.replace(/<!--[\s\S]*?-->/g, tapar);
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
  const limpio = sinComentarios(readFileSync(ruta, 'utf8'), extension);
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

// Las tres copias de js/identidad.js tienen que ser iguales byte a byte. Quien
// las compara es scripts/verificar_copias.mjs, que hace lo mismo con los otros
// cuatro archivos repetidos: la comparación vive en un solo lugar.
const { verificarCopias } = await import('./verificar_copias.mjs');
problemas.push(...verificarCopias('js/identidad.js').problemas);

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
