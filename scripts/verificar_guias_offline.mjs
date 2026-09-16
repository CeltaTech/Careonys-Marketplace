/* ===================================================
   EL ARCHIVO DE GUÍAS NO SE DESPEGÓ DE LA BASE

       node scripts/verificar_guias_offline.mjs

   Mismo trato que `verificar_catalogo.mjs`, para `data/catalogo-guias.json`
   (guion `generar_guias.mjs`).

   Mira dos cosas, y son distintas a propósito:

     1. **Lo que se puede comprobar siempre**, con base o sin ella: que el
        archivo tenga la forma que exige `guias_de` y que las copias digan lo
        mismo.

     2. **Lo que sólo se puede comprobar con la base delante**: que el
        contenido del archivo sea el que devuelve `guias_de(null)`. Si la base
        no contesta, esto queda sin hacer, y el último renglón lo dice.

   Qué forma tiene una guía
   ------------------------
   Las cuatro partes de una guía **no son texto suelto**. `descripcion` y
   `que_esperar` son texto en los tres idiomas. `senales_de_alarma` y
   `en_emergencia` son, además, **una lista por idioma**: señales que se leen
   de un vistazo, y pasos en el orden en que se hacen. Así las guarda la base
   —`las_senales_estan_en_los_idiomas`
   (`supabase/migrations/0001_base_del_esquema.sql:2619`) y
   `la_emergencia_esta_en_los_idiomas` (`:2613`)—, así las devuelve la
   puerta y así las lee la pantalla, que recorre la lista renglón por renglón
   (`pwa-asistente/src/pantallas/Guias.jsx:38`).

   Este chequeo pedía que las cuatro fueran una cadena. Ninguna lo es. Mientras
   no haya una sola guía publicada eso no se nota, porque el archivo está
   vacío; el día que se publique la primera, el chequeo habría llamado
   «faltante» a las cuatro partes de una guía entera y bien escrita, y habría
   mandado a rehacer el archivo con el mismo guion que acababa de escribirlo.
   Por eso la forma se declara ahora igual que en la base, y hay un banco de
   pruebas que se planta si el detector deja de reconocerla.

   **Un catálogo vacío no es una falla acá.** A diferencia de los vocabularios,
   la siembra carga las guías generales sin publicar (pendiente 104), así
   que hoy `guias_de(null)` contesta `{}` legítimamente. Por eso este chequeo no
   exige que haya guías: exige que las que haya tengan la forma correcta. Y el
   vacío no queda sin vigilar, porque cuando la base contesta se compara guía
   por guía contra ella; si el archivo se vaciara solo, la comparación lo dice.

   **Lo que declara `seRevisaron()` son los archivos que abrió**, contados a
   medida que los abre. Antes declaraba el largo de la lista de copias, que se
   escribe a mano en otro guion: un número que no sale de mirar nada acá, y que
   por eso no se entera de nada de lo que pase acá.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { traerDeLaBase, leerElArchivo, armar, diferencias, ARCHIVO, COPIAS } from './generar_guias.mjs';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const IDIOMAS = ['es-AR', 'en', 'pt-BR'];
const PARRAFOS = ['descripcion', 'que_esperar'];
const LISTAS = ['senales_de_alarma', 'en_emergencia'];

const esTexto = (v) => typeof v === 'string' && v.trim() !== '';
const esDiccionario = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Lo que le impide a una guía leerse en pantalla. Misma regla que los cuatro
 *  check de la tabla, escrita de este lado porque el archivo viaja al teléfono
 *  y allá no hay base que la haga cumplir. */
export function problemasDeForma(nombre, guia) {
  if (!esDiccionario(guia)) return [`La guía «${nombre}» no es un objeto con sus partes adentro.`];
  const problemas = [];

  for (const campo of PARRAFOS) {
    if (!esDiccionario(guia[campo])) {
      problemas.push(`A la guía «${nombre}» le falta «${campo}» en los tres idiomas.`);
      continue;
    }
    const faltan = IDIOMAS.filter((idioma) => !esTexto(guia[campo][idioma]));
    if (faltan.length) problemas.push(`A «${nombre}/${campo}» le falta el ${faltan.join(' y el ')}.`);
  }

  for (const campo of LISTAS) {
    if (!esDiccionario(guia[campo])) {
      problemas.push(`A la guía «${nombre}» le falta «${campo}» como lista por idioma.`);
      continue;
    }
    for (const idioma of IDIOMAS) {
      const lista = guia[campo][idioma];
      if (!Array.isArray(lista) || lista.length === 0) {
        problemas.push(`A «${nombre}/${campo}» le falta la lista en ${idioma}.`);
      } else if (!lista.every(esTexto)) {
        problemas.push(`La lista de «${nombre}/${campo}» en ${idioma} tiene un renglón vacío.`);
      }
    }
  }

  if (guia.propia) {
    problemas.push(`La guía «${nombre}» viene marcada «propia»: este archivo es sólo el catálogo general.`);
  }
  return problemas;
}

/* ── El banco de pruebas del propio detector, antes de mirar el archivo ─────
   Una prueba que no puede fallar no prueba nada: el defecto que se arregló acá
   fue justamente un detector que pedía una forma que el producto no escribe, y
   que por eso no se despertaba nunca. La segunda fila es ese defecto. */
const bien = () => ({
  descripcion: { 'es-AR': 'Qué es', en: 'What', 'pt-BR': 'O que' },
  que_esperar: { 'es-AR': 'Qué esperar', en: 'Expect', 'pt-BR': 'Esperar' },
  senales_de_alarma: { 'es-AR': ['Fiebre'], en: ['Fever'], 'pt-BR': ['Febre'] },
  en_emergencia: { 'es-AR': ['Avisar'], en: ['Warn'], 'pt-BR': ['Avisar'] },
  propia: false
});
const cambiada = (como) => { const g = bien(); como(g); return g; };

const PRUEBAS = [
  ['una guía bien escrita', bien(), 0],
  ['una guía con las cuatro partes como texto suelto',
    { descripcion: 'a', que_esperar: 'b', senales_de_alarma: 'c', en_emergencia: 'd' }, 4],
  ['una guía sin uno de los idiomas', cambiada((g) => { delete g.descripcion.en; }), 1],
  ['una lista vacía', cambiada((g) => { g.en_emergencia['pt-BR'] = []; }), 1],
  ['una lista con un renglón en blanco', cambiada((g) => { g.senales_de_alarma.en = ['  ']; }), 1],
  ['una lista escrita como párrafo', cambiada((g) => { g.senales_de_alarma = { 'es-AR': 'a', en: 'b', 'pt-BR': 'c' }; }), 3],
  ['una guía de una Prestadora metida en el catálogo general', cambiada((g) => { g.propia = true; }), 1],
  ['algo que no es una guía', 'no soy una guía', 1]
];

for (const [que, caso, esperados] of PRUEBAS) {
  const cuantos = problemasDeForma('prueba', caso).length;
  if (cuantos !== esperados) {
    console.error(
      `El detector de este chequeo está roto: con ${que} devolvió ${cuantos} ` +
      `problema(s) y tenía que devolver ${esperados}. No se revisó el archivo.`
    );
    process.exit(1);
  }
}

const problemas = [];
let miradas = 0;

// ── 1. La forma del archivo ────────────────────────────────────────────────
const { datos } = leerElArchivo();
const guias = datos.guias || {};

for (const [vocabulario, opciones] of Object.entries(guias)) {
  for (const [opcion, guia] of Object.entries(opciones || {})) {
    miradas++;
    problemas.push(...problemasDeForma(`${vocabulario}/${opcion}`, guia));
  }
}

// ── 2. Las copias dicen lo mismo ───────────────────────────────────────────
const original = readFileSync(join(raiz, ARCHIVO), 'utf8');
let abiertos = 1;
for (const copia of COPIAS) {
  abiertos++;
  if (readFileSync(join(raiz, copia), 'utf8') !== original) {
    problemas.push(`${copia} se despegó de ${ARCHIVO}.`);
  }
}
seRevisaron(abiertos, 'ningún archivo de guías que leer');

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

const cuantos = miradas === 0
  ? `${abiertos} archivos leídos, todavía sin ninguna guía publicada`
  : `${abiertos} archivos leídos, ${Object.keys(guias).length} vocabularios, ${miradas} guías con la forma correcta`;
if (deLaBase) {
  console.log(`Guías verificadas: ${cuantos}, iguales a las de ${servidor}.`);
} else {
  console.log(`Guías: ${cuantos}. SIN COMPROBAR contra ${servidor} (${motivo}).`);
}
