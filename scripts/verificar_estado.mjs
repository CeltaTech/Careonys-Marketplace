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

   **Y desde el 31 de agosto de 2026 son tres tablas, no una.** El mismo día
   apareció que el reparto de estilos por pantalla, adentro de
   `docs/PENDIENTES.md`, decía 687 atributos `style=` cuando ya eran 247, y
   nombraba tres pantallas que hacía días no tenían ninguno. Estaba escrita a
   mano, con la fecha en que se midió y nada que avisara cuando esa fecha
   quedaba atrás. Hoy sale del mismo medidor, entre dos marcas, y se compara
   acá igual que la del README.

   La tercera apareció el mismo día, tirando del mismo hilo: la tabla del CSS
   de `docs/INVENTARIO.md` tenía seis números equivocados, y el peor no era un
   renglonaje sino la columna de quién usa cada hoja —decía «las 10 páginas de
   la raíz» y «las 16 pantallas» cuando son 15 y 17—, que es justo la que nadie
   revisa cuando agrega una pantalla. **Un número escrito a mano en la
   documentación envejece en silencio**, y con tres tablas ya no es una
   sospecha: es lo que pasa siempre.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const {
  renglonesTabla, renglonesReparto, renglonesHojasTabla,
  ABRE_REPARTO, CIERRA_REPARTO, ABRE_HOJAS, CIERRA_HOJAS
} = await import('./medir_estado.mjs');
const medidos = renglonesTabla.map(([a, b]) => `| ${a} | ${b} |`);

/* Sin esto, un medidor que dejara de medir daría cero renglones, el README
   tampoco tendría ninguno que comparar, y este chequeo escribiría su ✔ sin
   haber mirado nada. */
seRevisaron(medidos.length, 'ningún renglón medido del estado real');
seRevisaron(renglonesReparto.length, 'ninguna pantalla con estilos pegados al HTML');
seRevisaron(renglonesHojasTabla.length, 'ninguna hoja de estilo');

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

/* ── LA OTRA TABLA: EL REPARTO, EN docs/PENDIENTES.md ──────────────────────
   Se busca entre las dos marcas y no por el título, porque el título es texto
   que alguien puede querer reescribir y las marcas dicen para qué están. Si
   faltan, es un problema y no un permiso para no mirar: sacarlas sería la
   forma más fácil de apagar este chequeo sin que se note. */
const pendientes = readFileSync(join(raiz, 'docs', 'PENDIENTES.md'), 'utf8').split(/\r?\n/);

const abre = pendientes.indexOf(ABRE_REPARTO);
const cierra = pendientes.indexOf(CIERRA_REPARTO);
if (abre === -1 || cierra === -1 || cierra < abre) {
  problemas.push(
    'No se encontraron las dos marcas del reparto de estilos en docs/PENDIENTES.md.\n' +
    'Tienen que estar las dos, en este orden:\n' +
    '  ' + ABRE + '\n' +
    '  ' + CIERRA
  );
} else {
  const escritos = pendientes.slice(abre + 1, cierra)
    .map((r) => r.trim())
    .filter((r) => r.startsWith('| `'));

  if (escritos.length !== renglonesReparto.length) {
    problemas.push(
      `El reparto de docs/PENDIENTES.md tiene ${escritos.length} pantallas y la medición ` +
      `da ${renglonesReparto.length}.`
    );
  }
  const cuantas = Math.max(escritos.length, renglonesReparto.length);
  for (let i = 0; i < cuantas; i++) {
    if (escritos[i] === renglonesReparto[i]) continue;
    problemas.push(
      'Este renglón del reparto no es el que sale de medir los archivos:\n' +
      '  docs/PENDIENTES.md dice:  ' + (escritos[i] || '— no está —') + '\n' +
      '  y hoy es:                 ' + (renglonesReparto[i] || '— sobra —')
    );
  }
}


/* ── LA TERCERA TABLA: LAS HOJAS, EN docs/INVENTARIO.md ────────────────────
   Encontrada el 31 de agosto de 2026, tirando del mismo hilo. La tabla del CSS
   de `docs/INVENTARIO.md` tenía **seis números equivocados**: decía que
   `css/styles.css` la usaban «las 10 páginas de la raíz» cuando son 15, que
   `tokens.css` y `utilidades.css` las usaban «las 16 pantallas» cuando son 17,
   le daba 285 renglones a cada `styles-pwa.css` cuando tienen 287, y sumaba
   4.638 renglones en total donde el README —que sí sale de medir— decía 4.642.
   Tres documentos del mismo repositorio, tres números distintos para lo mismo.

   La columna que más envejeció fue la de quién usa cada hoja, y es la que
   nadie iba a revisar: se agrega una pantalla y la tabla no se entera. Ahora
   sale de leer los `<link href>` del marcado. */
const inventario = readFileSync(join(raiz, 'docs', 'INVENTARIO.md'), 'utf8').split(/\r?\n/);

const abreH = inventario.indexOf(ABRE_HOJAS);
const cierraH = inventario.indexOf(CIERRA_HOJAS);
if (abreH === -1 || cierraH === -1 || cierraH < abreH) {
  problemas.push(
    'No se encontraron las dos marcas de las hojas de estilo en docs/INVENTARIO.md.\n' +
    'Tienen que estar las dos, en este orden:\n' +
    '  ' + ABRE_HOJAS + '\n' +
    '  ' + CIERRA_HOJAS
  );
} else {
  const escritos = inventario.slice(abreH + 1, cierraH)
    .map((r) => r.trim())
    .filter((r) => r.startsWith('| `'));

  if (escritos.length !== renglonesHojasTabla.length) {
    problemas.push(
      `La tabla de hojas de docs/INVENTARIO.md tiene ${escritos.length} archivos y la medición ` +
      `da ${renglonesHojasTabla.length}.`
    );
  }
  const cuantas = Math.max(escritos.length, renglonesHojasTabla.length);
  for (let i = 0; i < cuantas; i++) {
    if (escritos[i] === renglonesHojasTabla[i]) continue;
    problemas.push(
      'Este renglón de la tabla de hojas no es el que sale de medir los archivos:\n' +
      '  docs/INVENTARIO.md dice:  ' + (escritos[i] || '— no está —') + '\n' +
      '  y hoy es:                 ' + (renglonesHojasTabla[i] || '— sobra —')
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
  `Estado real verificado: los ${medidos.length} renglones de la tabla del README, las ` +
  `${renglonesReparto.length} pantallas del reparto de docs/PENDIENTES.md y las ` +
  `${renglonesHojasTabla.length} hojas de estilo de docs/INVENTARIO.md salen de medir los archivos.`
);
