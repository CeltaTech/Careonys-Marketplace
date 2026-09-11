/* ===================================================
   VERIFICA QUE LOS GUIONES DEL NAVEGADOR SE PUEDAN LEER

   Falla —con código de salida 1— si alguno de los guiones de `js/` tiene un
   error de sintaxis.

       node scripts/verificar_guiones.mjs

   Por qué existe: el 24 de agosto de 2026 se encontró un `await` adentro de una
   función que no era `async`. El navegador, ante un error de sintaxis, descarta
   el guion entero y sigue como si nada: la pantalla se dibuja igual, y no
   funcionan ni el ingreso, ni el fichado, ni los reportes. No hay mensaje, no
   hay pantalla en blanco, no hay nada que mirar. Una falla que no se ve es la
   que más tarda en encontrarse.

   **Antes miraba también el código escrito adentro de cada pantalla, y ya no
   hace falta.** Mientras cada pantalla era un archivo suelto, ahí adentro había
   código que nadie leía hasta que lo abría un navegador. Ahora las pantallas
   son vistas de tres programas, y el código de los tres lo lee la herramienta
   de armado antes de publicar nada: un error de sintaxis rompe el armado, que
   es exactamente lo que este chequeo viene a conseguir.

   **Lo que sigue sin tener quien lo lea son estos guiones.** La herramienta de
   armado lee lo que alguna pantalla pide, y nada más; un guion de esta carpeta
   que hoy no pida nadie no lo abriría jamás. Por eso acá se leen todos, pida
   quien pida.

   Qué no mira: si el código hace lo que debe. Sólo si se puede leer.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import vm from 'node:vm';

import { hayArchivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: los guiones de las herramientas, que no los corre ningún navegador. */
const AJENAS = ['docs', 'supabase', 'scripts'];

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

for (const camino of hayArchivos(join(raiz, 'js'), ['.js'], AJENAS)) {
  revisados++;
  const nombre = relative(raiz, camino).split(sep).join('/');
  const error = revisar(readFileSync(camino, 'utf8'), nombre);
  if (error) fallas.push(`${nombre}: ${error}`);
}

if (fallas.length > 0) {
  console.error('JavaScript que el navegador no puede leer:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(`\n${fallas.length} de ${revisados} guiones con error de sintaxis.`);
  process.exit(1);
}

console.log(`Guiones verificados: ${revisados} guiones del navegador sin errores de sintaxis.`);
