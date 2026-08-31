/* ===================================================
   LA TABLA DEL ESTADO REAL DEL README ESTÁ MEDIDA, NO ESCRITA A MANO

       node scripts/verificar_estado.mjs

   El README abre con una tabla de números bajo el título «Estado real», y
   arriba de ella dice, con todas las letras, «no se escribe a mano y no queda
   vieja». Esa frase fue falsa: el 31 de agosto de 2026 la tabla decía 31
   archivos de JavaScript cuando ya había 32, porque al cerrar el pendiente 94
   se agregó `pwa-asistente/js/zonas.js` y nadie volvió a correr el medidor.
   Nada lo miraba: `scripts/medir_estado.mjs` no lo corría ni el gancho de
   `commit` ni ningún chequeo.

   Este compara los renglones que el medidor saca de los archivos con los que
   están escritos en el README, y si no coinciden dice cuál cambió y con qué
   comando se arregla. **La fecha no entra en la comparación**: cambia todos
   los días y compararla pondría esto en rojo cada mañana sin que nadie hubiera
   tocado nada.

   Por qué se puede hacer acá y no se pudo con la prueba de aislamiento: estos
   números salen de leer archivos, así que se miden sin red y sin base
   levantada, que es lo único que hay cuando corre el gancho de `commit`.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const { renglonesTabla } = await import('./medir_estado.mjs');
const medidos = renglonesTabla.map(([a, b]) => `| ${a} | ${b} |`);

/* Sin esto, un medidor que dejara de medir daría cero renglones, el README
   tampoco tendría ninguno que comparar, y este chequeo escribiría su ✔ sin
   haber mirado nada. */
seRevisaron(medidos.length, 'ningún renglón medido del estado real');

const readme = readFileSync(join(raiz, 'README.md'), 'utf8').split(/\r?\n/);

/* La tabla es el bloque de renglones que empiezan con `|` que va después del
   «Medido el …». Se saltean los dos de encabezado, que el medidor tampoco
   produce. */
const arranque = readme.findIndex((r) => r.startsWith('Medido el '));
const problemas = [];

if (arranque === -1) {
  problemas.push(
    'No se encontró la tabla del estado real en README.md.\n' +
    'Tiene que empezar con un renglón «Medido el …» y seguir con la tabla.'
  );
} else {
  const escritos = [];
  for (let i = arranque; i < readme.length; i++) {
    const r = readme[i].trim();
    if (!r.startsWith('|')) { if (escritos.length) break; continue; }
    if (r === '| | |' || /^\|\s*-+\s*\|/.test(r)) continue;
    escritos.push(r);
  }

  if (escritos.length !== medidos.length) {
    problemas.push(
      `La tabla del README tiene ${escritos.length} renglones y la medición da ${medidos.length}.`
    );
  }
  const cuantos = Math.max(escritos.length, medidos.length);
  for (let i = 0; i < cuantos; i++) {
    if (escritos[i] === medidos[i]) continue;
    problemas.push(
      'Este renglón de la tabla no es el que sale de medir los archivos:\n' +
      '  README dice:  ' + (escritos[i] || '— no está —') + '\n' +
      '  y hoy es:     ' + (medidos[i] || '— sobra —')
    );
  }
}

if (problemas.length) {
  console.error(
    '\n' + problemas.join('\n\n') + '\n\n' +
    'Se pone al día con:  node scripts/medir_estado.mjs --escribir\n' +
    'No se corrige a mano: el README dice que esta tabla no se escribe a mano.\n'
  );
  process.exit(1);
}

console.log(
  `Estado real verificado: los ${medidos.length} renglones de la tabla del README ` +
  'son los que salen de medir los archivos.'
);
