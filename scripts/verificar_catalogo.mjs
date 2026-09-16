/* ===================================================
   EL ARCHIVO DEL CATÁLOGO NO SE DESPEGÓ DE LA BASE

       node scripts/verificar_catalogo.mjs

   Los vocabularios viven en tablas —`vocabularios` y `vocabulario_items`,
   `supabase/migrations/0001_base_del_esquema.sql:653` y `:598`— y
   `data/catalogo-vocabularios.json` es una copia generada, que existe sólo
   porque los dos programas para el teléfono la necesitan sin conexión. Una
   copia que nadie compara vuelve a ser una segunda verdad en cuanto alguien
   edita una de las dos, y entonces media aplicación muestra una lista y la
   otra mitad muestra otra.

   Mira dos cosas, y son distintas a propósito:

     1. **Lo que se puede comprobar siempre**, con base o sin ella: que el
        archivo tenga la forma que exige la base —clave no vacía,
        título en los tres idiomas, opciones sin repetir, cada opción con su
        clave y con sus tres idiomas— y que las tres copias digan lo mismo. Estas
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

/* ── LOS TRES IDIOMAS DE CADA OPCIÓN ─────────────────────────────────────────
   Al título del vocabulario se le exigían los tres idiomas y a cada opción sólo
   el castellano. Es al revés de como se lee: el título rotula la lista y las
   opciones son lo que la persona elige, así que la opción es la que más se lee.
   Una opción sin traducir tampoco se ve rota —cae al castellano, `js/catalogo.js:399`—
   y aparece en castellano adentro de una pantalla en inglés, callada.

   La base sí lo exige: la restricción `el_item_esta_en_los_tres_idiomas` de
   `vocabulario_items` (`supabase/migrations/0001_base_del_esquema.sql:611`) pide
   los tres, y deja una sola puerta —que la opción declare la traducción
   pendiente y escriba al lado por qué—. Esa puerta no viaja en lo que devuelve
   la puerta de la base, que manda la clave y los idiomas y nada más
   (`supabase/migrations/0001_base_del_esquema.sql:2106`), así que el archivo no
   puede leerla y acá se repite, angosta y con el motivo escrito.

   Y se da vuelta en lugar de apagarse, que es la diferencia entre eximir y
   dejar de mirar: el día que esa opción tenga sus tres idiomas, la exención
   pasó a decir algo falso y este chequeo la denuncia para que se saque. */
const TRADUCCION_PENDIENTE = new Map([
  ['modalidad_contratacion/guardia_12',
    'Guardia es palabra del glosario que comparten los dos productos y no est\u00e1 traducida en ' +
    'ning\u00fan archivo del proyecto; el glosario dice adem\u00e1s que una Guardia no es un turno, ' +
    'as\u00ed que reusar shift o turno pisar\u00eda una distinci\u00f3n hecha a prop\u00f3sito. ' +
    'Queda en castellano hasta que el Desarrollador decida c\u00f3mo se dice.']
]);

/** Lo que le falta a una opción para poder leerse en los tres idiomas. */
export function idiomasQueFaltan(nombre, item, pendientes) {
  const faltan = IDIOMAS.filter((i) => typeof item[i] !== 'string' || item[i].trim() === '');
  if (faltan.includes('es-AR')) return [`A la opci\u00f3n \u00ab${nombre}\u00bb le falta el castellano.`];
  const perdonada = pendientes.has(nombre);
  if (faltan.length && !perdonada) {
    return [`A la opci\u00f3n \u00ab${nombre}\u00bb le falta el idioma ${faltan.join(' y el ')}.`];
  }
  if (!faltan.length && perdonada) {
    return [`La opci\u00f3n \u00ab${nombre}\u00bb ya est\u00e1 en los tres idiomas: la exenci\u00f3n que la perdona pas\u00f3 a decir algo falso y hay que sacarla.`];
  }
  return [];
}

/* Una prueba que no puede fallar no prueba nada: antes de abrir el catálogo, el
   detector se prueba contra una opción completa, una a medias, una perdonada y
   una perdonada que ya no lo necesita. */
const DE_PRUEBA = new Map([['x/y', 'un motivo escrito, largo como se le exige a los de verdad']]);
const COMPLETA = { 'es-AR': 'a', en: 'b', 'pt-BR': 'c' };
const A_MEDIAS = { 'es-AR': 'a' };
const roto = [];
if (idiomasQueFaltan('x/z', COMPLETA, DE_PRUEBA).length !== 0) roto.push('se queja de una opci\u00f3n que est\u00e1 en los tres idiomas');
if (idiomasQueFaltan('x/z', A_MEDIAS, DE_PRUEBA).length !== 1) roto.push('deja pasar una opci\u00f3n sin ingl\u00e9s ni portugu\u00e9s');
if (idiomasQueFaltan('x/z', {}, DE_PRUEBA).length !== 1) roto.push('deja pasar una opci\u00f3n sin castellano');
if (idiomasQueFaltan('x/y', A_MEDIAS, DE_PRUEBA).length !== 0) roto.push('no respeta la exenci\u00f3n escrita');
if (idiomasQueFaltan('x/y', COMPLETA, DE_PRUEBA).length !== 1) roto.push('no denuncia la exenci\u00f3n que ya no hace falta');
if (roto.length) {
  console.error('El detector est\u00e1 roto, as\u00ed que no verifica nada:\n  - ' + roto.join('\n  - '));
  process.exit(1);
}

const todasLasOpciones = new Set();

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
    const nombre = clave + '/' + item.clave;
    todasLasOpciones.add(nombre);
    problemas.push(...idiomasQueFaltan(nombre, item, TRADUCCION_PENDIENTE));
  }
  if (vistas.size === 0) {
    problemas.push(`El vocabulario «${clave}» no tiene ninguna opción.`);
  }
}

/* Una exención que nombra algo que ya no está perdona a nadie y tapa para
   siempre: se la mira con la misma severidad que a lo que perdona. */
for (const [nombre, motivo] of TRADUCCION_PENDIENTE) {
  if (!todasLasOpciones.has(nombre)) {
    problemas.push(`La exención de traducción nombra «${nombre}», que no es ninguna opción del catálogo.`);
  }
  if (typeof motivo !== 'string' || motivo.trim().length < 40) {
    problemas.push(`La exención de «${nombre}» no explica por qué la opción queda sin traducir.`);
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

const perdonadas = TRADUCCION_PENDIENTE.size === 0 ? 'todas en los tres idiomas'
  : `todas en los tres idiomas salvo ${TRADUCCION_PENDIENTE.size} con su motivo escrito`;
const cuantos = `${Object.keys(vocabularios).length} vocabularios, ${mirados} opciones (${perdonadas})`;
if (deLaBase) {
  console.log(`Catálogo verificado: ${cuantos}, iguales a los de ${servidor}.`);
} else {
  console.log(`Catálogo: ${cuantos} con la forma correcta. SIN COMPROBAR contra ${servidor} (${motivo}).`);
}
