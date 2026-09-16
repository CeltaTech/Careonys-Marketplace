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

   **Y desde el 31 de agosto de 2026 son cuatro bloques, no uno.** El mismo día
   apareció que el reparto de estilos por pantalla, adentro de
   `docs/PENDIENTES.md`, decía 687 atributos `style=` cuando ya eran 247, y
   nombraba tres pantallas que hacía días no tenían ninguno. Estaba escrita a
   mano, con la fecha en que se midió y nada que avisara cuando esa fecha
   quedaba atrás. Hoy sale del mismo medidor, entre dos marcas, y se compara
   acá igual que la del README.

   La tercera apareció el mismo día, tirando del mismo hilo: la tabla del CSS
   tenía seis números equivocados, y el peor no era un
   renglonaje sino la columna de quién usa cada hoja —decía «las 10 páginas de
   la raíz» y «las 16 pantallas» cuando son 15 y 17—, que es justo la que nadie
   revisa cuando agrega una pantalla.

   Y el cuarto no es una tabla sino una frase: la que abre la lista de guiones
   del README, que decía «51 archivos `.mjs`» y «doce herramientas
   sueltas» con «Contado el 31 de agosto de 2026» al lado, el mismo día en que ya
   eran 52 y trece —`scripts/listar.mjs` se agregó unas horas después de contar—.
   **Una fecha avisa de que el número pudo cambiar, no de que cambió.**

   **Un número escrito a mano en la documentación envejece en silencio**, y con
   cuatro casos ya no es una sospecha: es lo que pasa siempre.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const {
  renglonesTabla, renglonesReparto, renglonesHojasTabla, renglonesFraseGuiones,
  tablaReparto, tablaHojas, parrafoGuiones,
  ABRE_REPARTO, CIERRA_REPARTO, ABRE_HOJAS, CIERRA_HOJAS,
  ABRE_GUIONES, CIERRA_GUIONES
} = await import('./medir_estado.mjs');
const medidos = renglonesTabla.map(([a, b]) => `| ${a} | ${b} |`);

/* Sin esto, un medidor que dejara de medir daría cero renglones, el README
   tampoco tendría ninguno que comparar, y este chequeo escribiría su ✔ sin
   haber mirado nada. */
seRevisaron(medidos.length, 'ningún renglón medido del estado real');
seRevisaron(renglonesReparto.length, 'ninguna pantalla con estilos pegados al HTML');
seRevisaron(renglonesHojasTabla.length, 'ninguna hoja de estilo');
seRevisaron(renglonesFraseGuiones.length, 'ninguna cuenta de los guiones');

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

/** Lo que un bloque entre marcas dice de verdad: todos sus renglones, sin los
 *  blancos que el medidor pone de cada lado. **Todos**, y no los que tienen
 *  cierta forma: la forma la elige quien escribe el chequeo, y el día que el
 *  medidor agrega un renglón de otra forma ese renglón deja de mirarse sin que
 *  nadie se entere. */
export function sinBlancosDeLosBordes(renglones) {
  const copia = [...renglones];
  while (copia.length && copia[0].trim() === '') copia.shift();
  while (copia.length && copia[copia.length - 1].trim() === '') copia.pop();
  return copia;
}

/* ── La prueba del recorte, antes de mirar nada ──────────────────────────
   Una prueba que no puede fallar no prueba nada. La segunda fila es el defecto
   que se arregló acá: la frase de prosa que cierra la tabla de las hojas, con
   sus tres números medidos, tiene que quedar adentro de lo que se compara. */
const PRUEBAS = [
  ['un bloque de puras filas', ['', '| `a.css` | 1 | x |', '| `b.css` | 2 | y |', ''], 2],
  ['un bloque que cierra con una frase de prosa',
    ['', '| Archivo | Renglones |', '|---|---:|', '| `a.css` | 1 |', '',
      'En disco hay 12 archivos y 5.625 renglones.', ''], 5],
  ['un bloque de un solo párrafo', ['', 'En `scripts/` hay 83 guiones.', ''], 1]
];
for (const [que, entrada, esperados] of PRUEBAS) {
  const salen = sinBlancosDeLosBordes(entrada).length;
  if (salen !== esperados) {
    console.error(
      `El recorte de este chequeo está roto: con ${que} deja ${salen} renglones ` +
      `para comparar y tenían que ser ${esperados}. No se revisó nada.`
    );
    process.exit(1);
  }
}

/* ── Y LO QUE VIVE EN EL MEDIO DE OTRO DOCUMENTO, ENTRE MARCAS ──────────
   Tres bloques y un solo procedimiento. Estaban escritos dos veces, y la copia
   arrastraba un error en el aviso de «faltan las marcas»: nombraba `ABRE` y
   `CIERRA`, que no existen acá, así que el día que faltaran de verdad este
   chequeo se hubiera caído con un error distinto del que tenía que dar. Es el
   camino que nadie prueba, porque sólo corre cuando algo ya está mal.

   Se busca entre las marcas y no por el título, porque el título es texto que
   alguien puede querer reescribir y las marcas dicen para qué están. Si faltan,
   es un problema y no un permiso para no mirar: sacarlas sería la forma más
   fácil de apagar este chequeo sin que se note.

   **Y se compara el bloque entero, no los renglones que empiezan de cierta
   manera.** Antes se quedaba con los que arrancaban con `| \``, es decir con
   las filas de una tabla, y todo lo demás que el medidor escribe adentro de
   las marcas pasaba sin que nadie lo leyera: la frase que cierra la tabla de
   las hojas —«En disco hay N archivos y M renglones, de los cuales K son
   copias byte a byte»— tiene tres números medidos, y los tres se podían
   cambiar a mano adentro de un bloque cuya marca dice, con todas las letras,
   que no se edita a mano. El chequeo seguía diciendo ✔ y su propio renglón
   verde seguía afirmando que esos números salen de medir los archivos. El
   encabezado de cada tabla corría la misma suerte. Ahora lo que se compara es
   lo mismo que el medidor escribe, tal cual, renglón por renglón. */
function compararEntreMarcas(camino, abre, cierra, contenido, comoSeLlama) {
  const donde = camino.join('/');
  const renglones = readFileSync(join(raiz, ...camino), 'utf8').split(/\r?\n/);

  const desde = renglones.indexOf(abre);
  const hasta = renglones.indexOf(cierra);
  if (desde === -1 || hasta === -1 || hasta < desde) {
    problemas.push(
      `No se encontraron las dos marcas que rodean ${comoSeLlama} en ${donde}.\n` +
      'Tienen que estar las dos, en este orden:\n' +
      '  ' + abre + '\n' +
      '  ' + cierra
    );
    return;
  }

  /* El medidor deja un renglón en blanco de cada lado, siempre; son suyos y
     no se comparan. Lo de adentro va tal cual. */
  const escritos = sinBlancosDeLosBordes(renglones.slice(desde + 1, hasta));
  const medidos = sinBlancosDeLosBordes(contenido.split('\n'));

  if (escritos.length !== medidos.length) {
    problemas.push(
      `${comoSeLlama} de ${donde} tiene ${escritos.length} renglones y la medición da ` +
      `${medidos.length}.`
    );
  }
  const cuantos = Math.max(escritos.length, medidos.length);
  for (let i = 0; i < cuantos; i++) {
    if (escritos[i] === medidos[i]) continue;
    problemas.push(
      `Este renglón de ${comoSeLlama} no es el que sale de medir los archivos:\n` +
      `  ${donde} dice:\n    ` + (escritos[i] || '— no está —') + '\n' +
      '  y hoy es:\n    ' + (medidos[i] || '— sobra —')
    );
  }
}

compararEntreMarcas(
  ['docs', 'PENDIENTES.md'], ABRE_REPARTO, CIERRA_REPARTO, tablaReparto,
  'el reparto de estilos por pantalla'
);

/* La de las hojas, encontrada el 31 de agosto de 2026 tirando del mismo hilo:
   tenía **seis números equivocados**. Decía que `css/styles.css` la usaban «las
   10 páginas de la raíz» cuando son 15, que `tokens.css` y `utilidades.css` las
   usaban «las 16 pantallas» cuando son 17, le daba 285 renglones a cada
   `styles-pwa.css` cuando tienen 287, y sumaba 4.638 donde el README —que sí
   sale de medir— decía 4.642. Tres documentos del mismo repositorio, tres
   números distintos para lo mismo.

   La columna que más envejeció fue la de quién usa cada hoja, y es la que nadie
   iba a revisar: se agrega una pantalla y la tabla no se entera. Ahora sale de
   leer los `<link href>` del marcado. */
compararEntreMarcas(
  ['README.md'], ABRE_HOJAS, CIERRA_HOJAS, tablaHojas,
  'la tabla de las hojas de estilo'
);

/* Y la frase que abre la lista de guiones, del mismo archivo. Envejeció en
   menos de un día: decía «51 archivos `.mjs`» y «doce herramientas sueltas»,
   con la fecha de ese mismo día escrita al lado, cuando ya eran 52 y trece. */
compararEntreMarcas(
  ['README.md'], ABRE_GUIONES, CIERRA_GUIONES, parrafoGuiones,
  'la cuenta de los guiones'
);

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
  `${renglonesHojasTabla.length} hojas de estilo del README, y la cuenta de ` +
  'los guiones que abre su lista, salen de medir los archivos.'
);
