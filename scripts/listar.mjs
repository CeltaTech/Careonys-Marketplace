/* ===================================================
   LOS ARCHIVOS DEL PROYECTO, SIN LAS CAJAS FUERTES

   Para usar desde la línea de comandos en lugar de un `find` o un `grep -r`
   tecleados a mano.

   POR QUÉ EXISTE
   La regla de `F:\proyectos\CLAUDE.md` dice que las cajas fuertes no se abren,
   no se listan y no se citan. Los chequeos ya la cumplen, porque todos recorren
   con `scripts/recorrido.mjs` y ahí está el guardián. Lo que no la cumplía era
   **el comando escrito a mano**: un `grep -rn` o un `find` desde la raíz entra
   en todas las carpetas, y acordarse de las exclusiones en cada comando es
   justamente la clase de regla que se cumple casi siempre. Ya falló cuatro
   veces —el 26 y el 28 de agosto de 2026, y dos más el 31—, y las cuatro por lo
   mismo: la regla estaba en la cabeza de quien tecleaba y no en la herramienta.

   Así que la herramienta. El recorrido es el mismo que usan los veintiocho
   chequeos, con el mismo guardián probado en `scripts/verificar_cajas.mjs`.

   CÓMO SE USA
     node scripts/listar.mjs                     todos los archivos
     node scripts/listar.mjs .html .js           sólo esas extensiones
     node scripts/listar.mjs --buscar "patrón"   los renglones que dicen eso
     node scripts/listar.mjs --buscar "p" .sql   lo mismo, en un tipo de archivo

   `--buscar` recibe una expresión regular y responde `archivo:renglón: texto`,
   que es la forma en que este proyecto cita. Distingue mayúsculas salvo que se
   agregue `--sinmayusculas`. Sale con 1 cuando no encontró nada, para que sirva
   dentro de una condición.

   Y **es una expresión regular de JavaScript, no de grep**, que se parecen
   hasta que dejan de parecerse. En grep hay siete escapes que encienden algo
   —\| \( \) \{ \} \+ \?— y acá hacen lo contrario: apagan. Así que
   `a\|b` no busca «a o b», busca el texto «a|b», que no está en ningún lado, y
   la respuesta es «nada» sin que nada avise. Pasó el 31 de agosto de 2026 y la
   respuesta parecía una respuesta: **un buscador que no entiende el patrón no
   dice que no entiende, dice que no hay.** Desde ese día, cuando no encuentra
   nada y el patrón trae alguno de esos escapes, lo vuelve a buscar leyéndolo
   como lo leería grep y avisa si así sí aparece. No adivina: muestra.
=================================================== */

import { readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Las extensiones que no son texto: leerlas para buscar adentro no sirve y
   además llena la pantalla de basura. Se listan igual, sólo no se leen. */
const NO_ES_TEXTO = /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|eot|mp4|webm)$/i;

const argumentos = process.argv.slice(2);

let patron = null;
let sinMayusculas = false;
const extensiones = [];

for (let i = 0; i < argumentos.length; i++) {
  const arg = argumentos[i];
  if (arg === '--buscar') {
    patron = argumentos[++i];
    if (!patron) {
      console.error('Falta el patrón después de `--buscar`.');
      process.exit(2);
    }
  } else if (arg === '--sinmayusculas') {
    sinMayusculas = true;
  } else if (arg.startsWith('.')) {
    extensiones.push(arg.toLowerCase());
  } else {
    console.error('No se entiende «' + arg + '».');
    console.error('Se esperaban extensiones como `.html`, o `--buscar "patrón"`.');
    process.exit(2);
  }
}

/* Sin extensiones pedidas, todas: `archivos()` filtra por sufijo, y la cadena
   vacía es sufijo de cualquier nombre. */
const encontrados = archivos(raiz, extensiones.length ? extensiones : ['']);
const caminos = encontrados.map((c) => relative(raiz, c).split('\\').join('/')).sort();

if (!patron) {
  for (const camino of caminos) console.log(camino);
  process.exit(0);
}

let expresion;
try {
  expresion = new RegExp(patron, sinMayusculas ? 'i' : '');
} catch (error) {
  console.error('El patrón no es una expresión regular válida: ' + error.message);
  process.exit(2);
}

/* La búsqueda va en una función porque puede hacerse dos veces: la del patrón
   que entró, y —sólo si ésa no encontró nada— la del mismo patrón leído como lo
   leería grep. La segunda no imprime renglones: los cuenta. */
function buscar(expresion, imprimir) {
  let cuantos = 0;
  for (const camino of caminos) {
    if (NO_ES_TEXTO.test(camino)) continue;
    let texto;
    try {
      texto = readFileSync(join(raiz, camino), 'utf8');
    } catch {
      continue; // Un archivo que no se puede leer como texto no se busca adentro.
    }
    const renglones = texto.split(/\r?\n/);
    for (let i = 0; i < renglones.length; i++) {
      if (!expresion.test(renglones[i])) continue;
      cuantos++;
      if (imprimir) console.log(camino + ':' + (i + 1) + ': ' + renglones[i].trim());
    }
  }
  return cuantos;
}

const coincidencias = buscar(expresion, true);

/* Y cuando no encontró nada, la pregunta que hay que hacerse antes de creerle:
   ¿entendió el patrón lo mismo que quien lo escribió? Los siete escapes de
   grep significan acá lo contrario de lo que significan allá, y el resultado
   de esa confusión no es un error sino un «nada», que se lee igual que un
   «no está».

   Así que se vuelve a buscar con esos escapes sacados —que es como lo habría
   leído grep— y se avisa **sólo si así aparece algo**. Es un control positivo:
   no se avisa por sospecha, se avisa habiendo encontrado los renglones que la
   primera lectura no vio. Y no molesta a quien buscaba de verdad un `|` suelto:
   a ése la segunda lectura tampoco le encuentra nada, y entonces no dice nada. */
const ESCAPES_DE_GREP = /\\[|(){}+?]/;
let comoGrep = null;
let cuantosComoGrep = 0;
if (!coincidencias && ESCAPES_DE_GREP.test(patron)) {
  comoGrep = patron.replace(/\\([|(){}+?])/g, '$1');
  try {
    cuantosComoGrep = buscar(new RegExp(comoGrep, sinMayusculas ? 'i' : ''), false);
  } catch {
    cuantosComoGrep = 0; // Si esa lectura tampoco compila, no hay nada que avisar.
  }
}

/* El resumen va por el canal de errores para que no se mezcle con lo que
   alguien quiera pasarle a otro comando. */
console.error(
  coincidencias
    ? '\n' + coincidencias + ' renglones en ' + caminos.length + ' archivos revisados.'
    : '\nNada. Se revisaron ' + caminos.length + ' archivos.'
);

if (cuantosComoGrep > 0) {
  console.error(
    '\nPero puede que esto no sea un «no está».\n' +
    'El patrón trae escapes que grep enciende y JavaScript apaga: acá `\\|` no\n' +
    'es «o», es el carácter «|». Leído como lo leería grep —' + comoGrep + '—\n' +
    'hay ' + cuantosComoGrep + ' renglones.\n' +
    'Conviene rehacer la búsqueda de a un patrón por llamada.\n'
  );
}
process.exit(coincidencias ? 0 : 1);
