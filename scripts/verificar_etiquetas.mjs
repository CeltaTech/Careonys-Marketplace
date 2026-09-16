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

   ── Qué mira, que son dos listas y no una ──────────────────────────────────

   Las de esta máquina y **las publicadas**, que son las que importan: una
   etiqueta local todavía se borra sin que nadie se entere, y una que ya viajó
   al repositorio de arriba no. Este chequeo preguntaba sólo por las de acá
   —`git tag --list` no sabe nada del remoto— mientras este mismo encabezado
   decía que no había ninguna «ni acá ni en GitHub»: eso se había mirado a mano
   una vez, y comprobarlo no lo comprobaba nadie. Ahora se pregunta por las dos.

   Si el repositorio de arriba no contesta, las publicadas **quedan sin mirar**,
   y el último renglón lo dice con todas las letras en vez de contar un cero que
   no midió nada.

   ── Una prueba que no puede fallar no prueba nada ─────────────────────────

   Hoy no hay ninguna etiqueta, ni acá ni en GitHub, así que recorrerlas no
   prueba nada. Lo que prueba es el banco de más abajo, y prueba dos cosas: el
   detector, que tiene que voltear a los nombres inventados y dejar pasar a las
   versiones; y **el lector del remoto**, contra una salida de mentira, porque
   ahí estuvo la ceguera y un detector perfecto sobre un corpus recortado no
   encuentra nada.

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

/* Lo que contesta `git ls-remote --tags`: un renglón por etiqueta, con el
   identificador, un tabulador y `refs/tags/` adelante del nombre. La anotada
   viene dos veces, la segunda con el apuntador pegado atrás, que es el objeto
   al que apunta y no otra etiqueta. */
const PREFIJO = 'refs/tags/';
const APUNTADOR = '^{}';
const sinElApuntador = (nombre) => (
  nombre.endsWith(APUNTADOR) ? nombre.slice(0, -APUNTADOR.length) : nombre);

export function etiquetasPublicadas(salida) {
  const nombres = salida.split('\n')
    .map((renglon) => (renglon.split('\t')[1] || '').trim())
    .filter((ref) => ref.startsWith(PREFIJO))
    .map((ref) => sinElApuntador(ref.slice(PREFIJO.length)))
    .filter(Boolean);
  return [...new Set(nombres)];
}

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

/* Y el lector del remoto, que es la otra mitad: sin él el corpus vuelve a ser
   sólo lo que hay en esta máquina, que es dónde estuvo la ceguera. */
const SALIDA_DE_MENTIRA = [
  'a1b2c3\trefs/tags/v1.0.0',
  'd4e5f6\trefs/tags/careonys-1.0',
  '090807\trefs/tags/careonys-1.0^{}',
  '112233\trefs/heads/main'
].join('\n');
const leidas = etiquetasPublicadas(SALIDA_DE_MENTIRA);
if (leidas.length !== 2) {
  fallas.push('El lector del remoto leyó ' + leidas.length + ' etiquetas y tenía que leer 2');
}
if (!leidas.includes('careonys-1.0')) {
  fallas.push('El lector del remoto perdió la etiqueta anotada, que viene dos veces');
}
if (leidas.includes('main')) fallas.push('El lector del remoto tomó una rama por etiqueta');
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

/* Y las publicadas, que son las que ya no se pueden borrar. Si el repositorio
   de arriba no contesta —sin conexión, o sin permiso— no se inventa un cero:
   queda sin mirar y el último renglón lo dice. */
let publicadas = null;
try {
  publicadas = etiquetasPublicadas(execFileSync(
    'git', ['ls-remote', '--tags', 'origin'],
    { cwd: raiz, encoding: 'utf8', shell: false }));
} catch {
  publicadas = null;
}

const todas = [...new Set([...etiquetas, ...(publicadas || [])])];
const conNombre = todas.filter(esNombre);
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

const loDeArriba = publicadas === null
  ? 'el repositorio de arriba no contestó, así que las publicadas quedaron sin mirar'
  : publicadas.length + ' publicadas';

console.log(
  'Etiquetas verificadas: ' + todas.length + ' (' + etiquetas.length +
  ' en esta máquina y ' + loDeArriba + '), ninguna con un nombre adentro (' +
  CASOS + ' nombres inventados y una salida de mentira del remoto comprueban ' +
  'que el detector y el lector anden).'
);
