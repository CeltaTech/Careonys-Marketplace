/* ===================================================
   CÓMO SE ESCRIBE EL VALOR DE UN ATRIBUTO

   Un mismo valor se escribe de varias maneras y todas dicen lo mismo: entre
   comillas dobles, entre comillas simples —las dos del marcado de siempre—,
   entre acentos graves cuando el valor está adentro del guión, y entre llaves,
   que es como lo escribe una pantalla de un programa. Lo usan los chequeos que
   preguntan si un valor está **escrito con todas las letras** o si sale de un
   dato. Hoy son cinco: el de las opciones, el del depósito, el de las clases,
   el de los usos de un vocabulario y el recorrido, que lee las direcciones del
   sitio.

   Y da igual cómo esté escrito el nombre. El mismo nombre se escribe en
   minúscula cuando es un atributo del marcado y en mayúscula cuando es la
   constante de un guion, y son la misma cosa dicha dos veces. Esto devolvía un
   texto y dejaba esa decisión en manos de quien llamara: de los cinco, uno
   solo le ponía la bandera que la contempla, y los otros cuatro no. El del
   depósito era el más llamativo, porque ahí al lado todas las expresiones
   escritas a mano sobre esa misma palabra sí la llevan. La consecuencia estaba
   a la vista: `DEPOSITO: 'documentos-cuidadores'` —el único lugar donde el
   legajo dice a qué depósito van sus papeles— no lo miraba nadie, y un nombre
   mal escrito ahí pasaba en verde con el archivo abierto delante. Ahora lo
   contesta este archivo una sola vez y no hay bandera que poner.

   Por qué existe aparte: cada uno resolvió lo suyo por su lado y cada uno
   terminó conociendo un juego distinto de formas. El del depósito conocía las
   comillas y no las llaves, así que una lista de tipos escrita a mano entre
   llaves —y un nombre de depósito que ninguna migración declara, escrito
   igual— pasaban en verde con el archivo abierto delante. Una lista de formas
   escrita dos veces se completa una vez y queda corta la otra («ningún patrón
   repetido sin punto único de verdad»), que es el mismo motivo por el que
   existen `recorrido.mjs` y `bloques.mjs`.

   Qué NO hace: no entiende JavaScript. Reconoce el valor que está escrito con
   todas las letras y dice que no hay ninguno cuando el valor sale de una
   expresión, que es justamente lo que estos chequeos quieren distinguir. Y no
   reconoce el valor sin comillas ningunas, que el marcado admite y que este
   proyecto no escribe.
=================================================== */

/* El acento grave se nombra por su número: escrito con todas las letras no
   entra adentro de un texto entre acentos graves, que es como se arma todo lo
   de acá abajo. */
const ACENTO = String.fromCharCode(96);
const ENTRE_COMILLAS = '"([^"]*)"' + "|'([^']*)'";
const ENTRE_ACENTOS = ACENTO + '([^' + ACENTO + ']*)' + ACENTO;

/**
 * La expresión regular, en texto, que reconoce un atributo con su valor —lo
 * escriba con todas las letras o lo saque de un dato—. El que llama le pone las
 * banderas que necesita.
 *
 * - `separador`: `=` para un atributo del marcado; `[:=]` cuando el mismo
 *   nombre puede venir como propiedad de un objeto.
 * - `acento`: si el valor suelto puede venir entre acentos graves. Vale para lo
 *   que se escribe adentro del guión y no para un atributo del marcado, donde
 *   un acento grave suelto es casi siempre un nombre citado en un comentario.
 *
 * Adentro de las llaves los acentos graves entran siempre: ahí es JavaScript.
 */
export function comoSeEscribe(atributo, { separador = '=', acento = false } = {}) {
  const suelto = acento ? ENTRE_COMILLAS + '|' + ENTRE_ACENTOS : ENTRE_COMILLAS;
  const adentro = ENTRE_COMILLAS + '|' + ENTRE_ACENTOS;
  return String.raw`\b${noImportaLaCaja(atributo)}\s*${separador}\s*(?:${suelto}|\{\s*(?:${adentro})\s*\}|\{)`;
}

/* El nombre, letra por letra, para que dé lo mismo en mayúscula o en minúscula.
   Va adentro del texto y no como bandera del que llama, porque una bandera se
   pone o se olvida una vez por chequeo y esto es una sola decisión: el nombre
   de un atributo del marcado no distingue mayúsculas de minúsculas, y el mismo
   nombre escrito como constante de un guion va entero en mayúscula. Lo que sí
   distingue es el valor, que es un dato y se compara como está escrito: por eso
   se toca el nombre y nada más. */
const noImportaLaCaja = (atributo) =>
  atributo.replace(/[A-Za-z]/g, (letra) => '[' + letra.toLowerCase() + letra.toUpperCase() + ']');

/**
 * El valor que una coincidencia dejó escrito con todas las letras, o `null` si
 * lo saca de un dato. La rama de la expresión que reconoce eso último no
 * captura nada a propósito, así que alcanza con buscar el primer grupo que sí
 * casó y no hay ningún número de grupo escrito acá.
 */
export function valorDe(m) {
  for (let i = 1; i < m.length; i++) if (m[i] !== undefined) return m[i];
  return null;
}
