/* ===================================================
   EL ARCHIVO DEL CATÁLOGO NO SE DESPEGÓ DE LA BASE

       node scripts/verificar_catalogo.mjs

   Desde la migración 0038 los vocabularios viven en tablas y
   `data/catalogo-vocabularios.json` es una copia generada, que existe sólo
   porque los dos programas para el teléfono la necesitan sin conexión. Una
   copia que nadie compara vuelve a ser una segunda verdad en cuanto alguien
   edita una de las dos, y entonces media aplicación muestra una lista y la
   otra mitad muestra otra.

   Mira dos cosas, y son distintas a propósito:

     1. **Lo que se puede comprobar siempre**, con base o sin ella: que el
        archivo tenga la forma que exige la migración 0038 —clave no vacía,
        título en los tres idiomas, opciones sin repetir, cada opción con su
        clave y su castellano— y que las tres copias digan lo mismo. Estas
        comprobaciones fallan de verdad, y fallan sin conexión.

     2. **Lo que sólo se puede comprobar con la base delante**: que el contenido
        del archivo sea el que devuelve `vocabularios_de`. Si la base no
        contesta, esto **no pasa: queda sin hacer**, y el último renglón lo dice
        con todas las letras. Un chequeo que se saltea callado es peor que no
        tenerlo, porque además tranquiliza.

   Qué no mira: si las claves se usan en alguna pantalla. De eso se ocupa
   `verificar_usos.mjs`, que además es el dueño del campo `usado_en`.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { traerDeLaBase, leerElArchivo, armar, diferencias, ARCHIVO, COPIAS } from './generar_vocabularios.mjs';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDIOMAS = ['es-AR', 'en', 'pt-BR'];

const problemas = [];
let mirados = 0;

// ── 1. La forma del archivo ────────────────────────────────────────────────
const { datos } = leerElArchivo();
const vocabularios = datos.vocabularios || {};

if (Object.keys(vocabularios).length === 0) {
  problemas.push('El archivo no tiene ningún vocabulario.');
}

for (const [clave, definicion] of Object.entries(vocabularios)) {
  if (!/^[a-z][a-z0-9_]*$/.test(clave)) {
    problemas.push(`La clave «${clave}» no tiene la forma de una clave guardada (minúsculas, números y guion bajo).`);
  }
  for (const idioma of IDIOMAS) {
    const texto = (definicion.titulo || {})[idioma];
    if (typeof texto !== 'string' || texto.trim() === '') {
      problemas.push(`Al título de «${clave}» le falta el idioma ${idioma}.`);
    }
  }
  if (typeof definicion.cerrada !== 'boolean') {
    problemas.push(`«${clave}» no dice si es cerrada.`);
  }

  const vistas = new Set();
  for (const item of definicion.items || []) {
    mirados++;
    if (!item.clave || typeof item.clave !== 'string') {
      problemas.push(`Una opción de «${clave}» no tiene clave.`);
      continue;
    }
    if (vistas.has(item.clave)) {
      problemas.push(`La opción «${item.clave}» aparece dos veces en «${clave}».`);
    }
    vistas.add(item.clave);
    if (typeof item['es-AR'] !== 'string' || item['es-AR'].trim() === '') {
      problemas.push(`A la opción «${clave}/${item.clave}» le falta el castellano.`);
    }
  }
  if (vistas.size === 0) {
    problemas.push(`El vocabulario «${clave}» no tiene ninguna opción.`);
  }
}

// ── 2. Las tres copias dicen lo mismo ──────────────────────────────────────
const original = readFileSync(join(raiz, ARCHIVO), 'utf8');
for (const copia of COPIAS) {
  if (readFileSync(join(raiz, copia), 'utf8') !== original) {
    problemas.push(`${copia} se despegó de ${ARCHIVO}.`);
  }
}

// ── 3. El archivo contra la base ───────────────────────────────────────────
const { vocabularios: deLaBase, servidor, motivo } = await traerDeLaBase();
if (deLaBase) {
  problemas.push(...diferencias(armar(deLaBase, datos), datos));
}

// Lo que se cuenta sale de un catálogo, no de un recorrido de carpetas, así que
// el corpus vacío no se nota solo: un archivo sin vocabularios recorre cero
// veces el bucle de arriba, no junta ningún problema, y este chequeo escribiría
// su ✔ sin haber mirado una sola opción.
seRevisaron(Object.keys(vocabularios).length, 'ni un vocabulario en ' + ARCHIVO);
seRevisaron(mirados, 'ni una opción en ' + ARCHIVO);

if (problemas.length) {
  console.error('\n' + problemas.join('\n') +
    '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
    '    node scripts/generar_vocabularios.mjs --escribir\n');
  process.exit(1);
}

const cuantos = `${Object.keys(vocabularios).length} vocabularios, ${mirados} opciones`;
if (deLaBase) {
  console.log(`Catálogo verificado: ${cuantos}, iguales a los de ${servidor}.`);
} else {
  console.log(`Catálogo: ${cuantos} con la forma correcta. SIN COMPROBAR contra ${servidor} (${motivo}).`);
}
