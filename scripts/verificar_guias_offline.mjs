/* ===================================================
   EL ARCHIVO DE GUÍAS NO SE DESPEGÓ DE LA BASE

       node scripts/verificar_guias_offline.mjs

   Mismo trato que `verificar_catalogo.mjs`, para `data/catalogo-guias.json`
   (migración 0041, guion `generar_guias.mjs`).

   Mira dos cosas, y son distintas a propósito:

     1. **Lo que se puede comprobar siempre**, con base o sin ella: que el
        archivo tenga la forma que exige `guias_de` —cada guía con sus cuatro
        campos de texto en castellano— y que las copias digan lo mismo.

     2. **Lo que sólo se puede comprobar con la base delante**: que el
        contenido del archivo sea el que devuelve `guias_de(null)`. Si la base
        no contesta, esto queda sin hacer, y el último renglón lo dice.

   **Un catálogo vacío no es una falla acá.** A diferencia de los vocabularios,
   la migración 0042 cargó las guías generales sin publicar (pendiente 104), así
   que hoy `guias_de(null)` contesta `{}` legítimamente. Por eso este chequeo no
   exige que haya guías: exige que las que haya tengan la forma correcta, y usa
   la lista de copias —que nunca está vacía— para cumplir con la guarda de
   `seRevisaron()`.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { traerDeLaBase, leerElArchivo, armar, diferencias, ARCHIVO, COPIAS } from './generar_guias.mjs';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAMPOS = ['descripcion', 'que_esperar', 'senales_de_alarma', 'en_emergencia'];

const problemas = [];
let miradas = 0;

// ── 1. La forma del archivo ────────────────────────────────────────────────
const { datos } = leerElArchivo();
const guias = datos.guias || {};

for (const [vocabulario, opciones] of Object.entries(guias)) {
  for (const [opcion, guia] of Object.entries(opciones || {})) {
    miradas++;
    for (const campo of CAMPOS) {
      if (typeof guia[campo] !== 'string' || guia[campo].trim() === '') {
        problemas.push(`A la guía «${vocabulario}/${opcion}» le falta «${campo}».`);
      }
    }
    if (guia.propia) {
      problemas.push(`La guía «${vocabulario}/${opcion}» viene marcada «propia»: este archivo es sólo el catálogo general.`);
    }
  }
}

// ── 2. Las copias dicen lo mismo ───────────────────────────────────────────
const original = readFileSync(join(raiz, ARCHIVO), 'utf8');
for (const copia of COPIAS) {
  if (readFileSync(join(raiz, copia), 'utf8') !== original) {
    problemas.push(`${copia} se despegó de ${ARCHIVO}.`);
  }
}
seRevisaron(COPIAS.length, 'ninguna copia de ' + ARCHIVO + ' que comparar');

// ── 3. El archivo contra la base ───────────────────────────────────────────
const { guias: deLaBase, servidor, motivo } = await traerDeLaBase();
if (deLaBase) {
  problemas.push(...diferencias(armar(deLaBase), datos));
}

if (problemas.length) {
  console.error('\n' + problemas.join('\n') +
    '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
    '    node scripts/generar_guias.mjs --escribir\n');
  process.exit(1);
}

const cuantos = `${Object.keys(guias).length} vocabularios, ${miradas} guías`;
if (deLaBase) {
  console.log(`Guías verificadas: ${cuantos}, iguales a las de ${servidor}.`);
} else {
  console.log(`Guías: ${cuantos} con la forma correcta. SIN COMPROBAR contra ${servidor} (${motivo}).`);
}
