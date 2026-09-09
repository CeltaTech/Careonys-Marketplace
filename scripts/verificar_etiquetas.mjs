#!/usr/bin/env node
/* ===================================================
   LAS ETIQUETAS DE VERSIÓN NO LLEVAN NINGÚN NOMBRE ADENTRO

   Una etiqueta de git marca una versión y **queda para siempre**: no se
   renombra, porque el nombre viejo ya viajó a todas las copias del repositorio.
   Cae entonces bajo «lo que se guarda para siempre se nombra por lo que hace»,
   igual que una tabla o una columna.

   Lo ordenó el Desarrollador: *«en las etiquetas no tiene porque estar el
   nombre de ninguna modalidad ni nombre del producto ni nada, ya tenemos
   bastante experiencia negativa al respecto»*. La experiencia es literal: el
   nombre de la modalidad lo eligió la línea de comandos por su cuenta, se
   escribió como prefijo en más de cuatrocientos lugares y sacarlo costó una
   tarea entera, con reescritura del historial incluida. Una etiqueta con un
   nombre adentro hubiera sido el único lugar del que no se puede sacar.

   ── La regla ──────────────────────────────────────────────────────────────

   Una etiqueta dice **qué versión es**, así que no lleva letras: cifras, puntos
   y guiones, con una `v` adelante si se quiere. Cualquier otra cosa es un
   nombre —del producto, de la empresa, de la modalidad, de una entrega, de
   quien sea—, y ninguno de esos entra acá. Una palabra para distinguir un
   anticipo tampoco: eso también se numera.

   Se prohíbe la forma en vez de enumerar los nombres prohibidos, y es a
   propósito: una lista de nombres hay que ir a agrandarla el día que aparezca
   uno nuevo, y el nombre que hoy no existe —el de la modalidad— es justamente
   el que más caro salió.

   ── Una prueba que no puede fallar no prueba nada ─────────────────────────

   Hoy no hay ninguna etiqueta, ni acá ni en GitHub, así que recorrerlas no
   prueba nada. Lo que prueba es el banco de nombres inventados de más abajo:
   el detector tiene que voltear a los que llevan un nombre y dejar pasar a los
   que son sólo una versión.

       node scripts/verificar_etiquetas.mjs
=================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Sólo la versión: una `v` opcional, y después cifras separadas por puntos o
   por guiones. Nada de letras adentro. */
const SOLO_VERSION = /^v?[0-9]+([.-][0-9]+)*$/;

const esNombre = (etiqueta) => !SOLO_VERSION.test(etiqueta);

/* ── El banco de pruebas ───────────────────────────────────────────────── */
const LLEVAN_NOMBRE = [
  'careonys-1.0',
  'v1-marketplace',
  'celtatech-v2',
  'entrega-familia',
  'directorio-final',
  'v1.0.0-rc1',
  'estable'
];
const SON_VERSION = ['v1.0.0', '1.2', 'v2', '3-1', 'v10.4.27'];

/* El corpus de este chequeo es el banco, no las etiquetas: cero etiquetas es un
   estado legítimo —hoy no hay ninguna— y cero casos de prueba sería un chequeo
   que no miró nada. */
const CASOS = seRevisaron(
  LLEVAN_NOMBRE.length + SON_VERSION.length,
  'ni un nombre inventado con el que probar el detector'
);

const fallas = [];
for (const t of LLEVAN_NOMBRE) if (!esNombre(t)) fallas.push('«' + t + '» lleva un nombre y pasó');
for (const t of SON_VERSION) if (esNombre(t)) fallas.push('«' + t + '» es una versión y no pasó');
if (fallas.length) {
  console.error(
    '\nEl detector de este chequeo está roto, así que no prueba nada:\n  ' +
    fallas.join('\n  ') + '\n'
  );
  process.exit(1);
}

/* ── Las etiquetas de verdad ───────────────────────────────────────────── */
let etiquetas;
try {
  etiquetas = execFileSync('git', ['tag', '--list'], { cwd: raiz, encoding: 'utf8', shell: false })
    .split('\n').map((t) => t.trim()).filter(Boolean);
} catch {
  console.error(
    '\nNo se pudo preguntarle a git por las etiquetas, así que este chequeo no\n' +
    'miró nada. Sin historial no pasa: falla.\n'
  );
  process.exit(1);
}

const conNombre = etiquetas.filter(esNombre);
if (conNombre.length) {
  console.error(
    '\nEstas etiquetas llevan un nombre adentro:\n  ' + conNombre.join('\n  ') + '\n\n' +
    'Una etiqueta dice qué versión es: cifras, puntos y guiones, con una «v»\n' +
    'adelante si se quiere. El nombre del producto, el de la empresa y el de la\n' +
    'modalidad no entran, y una etiqueta no se renombra: una vez publicada, el\n' +
    'nombre viejo ya está en todas las copias del repositorio.\n'
  );
  process.exit(1);
}

console.log(
  'Etiquetas verificadas: ' + etiquetas.length + ', ninguna con un nombre adentro ' +
  '(' + CASOS + ' nombres inventados comprueban que el detector ande).'
);
