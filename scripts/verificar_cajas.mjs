/* ===================================================
   LAS CAJAS FUERTES SIGUEN CERRADAS

   La regla que manda está en `F:\proyectos\CLAUDE.md` y no admite matices: una
   carpeta que anuncia que guarda claves no se abre, no se lista y no se cita,
   ni para verificar algo. Los chequeos de este proyecto recorren carpetas
   leyendo archivos, así que la regla también les habla a ellos, y quien la hace
   cumplir por todos es `nuncaSeAbre()` en `scripts/recorrido.mjs`.

   Este chequeo existe porque **antes esa función comparaba el nombre exacto**, y
   así alcanzaba justo para las cinco carpetas que existían el día que se escribió
   la lista. Una llamada `no-commit` o `NoCommit` —el mismo pedido, otra
   tipografía— se habría recorrido entera.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   No se mira el proyecto: se arma un árbol de mentira en la carpeta temporal del
   sistema, con un archivo adentro de cada nombre de caja fuerte y uno afuera, y
   se le pide a `archivos()` que lo recorra. Tiene que devolver **el de afuera y
   nada más**.

   Es a propósito que la prueba fabrique las carpetas en vez de buscarlas: acá no
   hay ninguna caja fuerte, así que un chequeo que sólo mirara este proyecto
   pasaría siempre y no probaría nada. El de afuera está por la misma razón al
   revés: sin él, una función que devolviera siempre la lista vacía también
   pasaría.
=================================================== */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { archivos, nuncaSeAbre } from './recorrido.mjs';

// Las formas en que una misma caja fuerte puede aparecer escrita. Ninguna de
// éstas existe en el proyecto: son las que podrían aparecer mañana.
const CERRADAS = [
  'No commit', 'no_commit', 'no-commit', 'NoCommit', 'nocommit', 'NO COMMIT',
  'NO HACER COMMIT', 'no hacer commit', 'NoHacerCommit', 'no_hacer_commit',
  'no pushear', 'no_pushear', 'NoPushear',
  'no subir', 'NoSubir',
  'ReferenciaNoHacerCommit', 'referencia no hacer commit'
];

// Y las que sí se abren, para que la comparación no sea de una sola punta. Si
// alguna de éstas quedara afuera, el chequeo tendría que fallar igual: una regla
// que cierra de más deja de revisar código de verdad, y no avisa.
const ABIERTAS = ['js', 'docs', 'data', 'compilado', 'comisiones', 'pushear-ahora'];

const raiz = join(tmpdir(), 'careonys-prueba-cajas');
rmSync(raiz, { recursive: true, force: true });

const fallas = [];

try {
  mkdirSync(raiz, { recursive: true });
  writeFileSync(join(raiz, 'afuera.js'), '// este sí se tiene que ver\n');

  for (const nombre of [...CERRADAS, ...ABIERTAS]) {
    mkdirSync(join(raiz, nombre), { recursive: true });
    writeFileSync(join(raiz, nombre, 'adentro.js'), '// contenido de mentira\n');
  }

  const vistos = archivos(raiz, ['.js']).map((c) => basename(join(c, '..')));

  for (const nombre of CERRADAS) {
    if (vistos.includes(nombre)) {
      fallas.push('se abrió una caja fuerte escrita «' + nombre + '»');
    }
  }
  for (const nombre of ABIERTAS) {
    if (!vistos.includes(nombre)) {
      fallas.push('se saltearon los archivos de «' + nombre + '», que no es una caja fuerte');
    }
  }
  if (!archivos(raiz, ['.js']).some((c) => c.endsWith('afuera.js'))) {
    fallas.push('no se vio el archivo de la raíz: el recorrido no devolvió nada');
  }

  // La misma pregunta hecha directo, sin pasar por el disco, y ésta es la que
  // de verdad prueba las diecisiete formas. Windows no distingue mayúsculas en
  // los nombres de carpeta, así que `No commit` y `NO COMMIT` terminan siendo
  // **la misma carpeta**: la prueba de arriba no puede separarlas y da por
  // buenas varias que nunca miró. Acá no hay disco de por medio, así que sí.
  // Van además tres formas que ningún sistema de archivos deja crear.
  for (const nombre of [...CERRADAS, 'No Commit ', ' no_commit', 'NO-PUSHEAR']) {
    if (!nuncaSeAbre(nombre)) fallas.push('«' + nombre + '» no se reconoció como caja fuerte');
  }
  for (const nombre of ABIERTAS) {
    if (nuncaSeAbre(nombre)) fallas.push('«' + nombre + '» se tomó por caja fuerte y no lo es');
  }
} finally {
  rmSync(raiz, { recursive: true, force: true });
}

if (fallas.length) {
  console.error('Cajas fuertes: el recorrido no las respeta.\n');
  for (const falla of fallas) console.error('  · ' + falla);
  console.error('\nSe arregla en `nuncaSeAbre()`, en `scripts/recorrido.mjs`.');
  process.exit(1);
}

console.log(
  'Cajas fuertes verificadas: ' + CERRADAS.length + ' formas de nombrarlas, todas cerradas, ' +
  'y ' + ABIERTAS.length + ' carpetas parecidas que sí se recorren.'
);
