/* ===================================================
   VERIFICA QUE EL JAVASCRIPT DE CADA PANTALLA SE PUEDA LEER

   Falla —con código de salida 1— si algún bloque `<script>` escrito adentro de
   una pantalla, o alguno de los archivos de `js/`, tiene un error de sintaxis.

       node scripts/verificar_guiones.mjs

   Por qué existe: el 24 de agosto de 2026 se encontró un `await` adentro de una
   función que no era `async`, en `pwa-asistente/index.html`. El navegador, ante
   un error de sintaxis, descarta el bloque entero y sigue como si nada: la
   pantalla se dibuja igual, y no funcionan ni el ingreso, ni el fichado, ni la
   bitácora. No hay mensaje, no hay pantalla en blanco, no hay nada que mirar.
   Una falla que no se ve es la que más tarda en encontrarse.

   Qué mira:
   - cada bloque `<script>` sin `src` de cada `.html` del proyecto;
   - cada archivo de `js/`, incluidas las copias de las dos aplicaciones.

   Qué no mira: si el código hace lo que debe. Sólo si se puede leer.
=================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* «No commit» y las de su especie no se abren: la regla de la bóveda está en
   `F:\proyectos\CLAUDE.md` y vale también para un guion que recorre carpetas. */
const IGNORADAS = new Set([
  'node_modules', '.git', '.vercel', 'docs', 'supabase', 'scripts',
  'No commit', 'no_commit', 'NO HACER COMMIT', 'no pushear', 'ReferenciaNoHacerCommit',
  'fuera de uso', '.temp', '.branches'
]);

function archivos(carpeta, extension, encontrados = []) {
  for (const nombre of readdirSync(carpeta)) {
    if (IGNORADAS.has(nombre)) continue;
    const camino = join(carpeta, nombre);
    if (statSync(camino).isDirectory()) archivos(camino, extension, encontrados);
    else if (nombre.endsWith(extension)) encontrados.push(camino);
  }
  return encontrados;
}

/** Devuelve el mensaje del error de sintaxis, o null si el código se puede leer. */
function revisar(codigo, nombre) {
  try {
    new vm.Script(codigo, { filename: nombre });
    return null;
  } catch (err) {
    return err.message;
  }
}

const fallas = [];
let revisados = 0;

for (const camino of archivos(raiz, '.html')) {
  const pantalla = relative(raiz, camino).split(sep).join('/');
  const crudo = readFileSync(camino, 'utf8');
  const bloques = crudo.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
  for (const bloque of bloques) {
    revisados++;
    const renglon = crudo.slice(0, bloque.index).split('\n').length;
    const error = revisar(bloque[1], pantalla);
    if (error) fallas.push(`${pantalla}, bloque que empieza en el renglón ${renglon}: ${error}`);
  }
}

for (const camino of archivos(join(raiz, 'js'), '.js').concat(
  archivos(join(raiz, 'pwa-asistente', 'js'), '.js'),
  archivos(join(raiz, 'pwa-familia', 'js'), '.js'))) {
  revisados++;
  const nombre = relative(raiz, camino).split(sep).join('/');
  const error = revisar(readFileSync(camino, 'utf8'), nombre);
  if (error) fallas.push(`${nombre}: ${error}`);
}

if (fallas.length > 0) {
  console.error('JavaScript que el navegador no puede leer:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(`\n${fallas.length} de ${revisados} bloques con error de sintaxis.`);
  process.exit(1);
}

console.log(`Guiones verificados: ${revisados} bloques de JavaScript sin errores de sintaxis.`);
