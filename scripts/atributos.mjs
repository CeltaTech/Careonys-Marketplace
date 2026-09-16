/* ===================================================
   CÓMO SE ESCRIBE EL VALOR DE UN ATRIBUTO

   Un mismo valor se escribe de varias maneras y todas dicen lo mismo: entre
   comillas dobles, entre comillas simples —las dos del marcado de siempre—,
   entre acentos graves cuando el valor está adentro del guión, y entre llaves,
   que es como lo escribe una pantalla de un programa. Lo usan los chequeos que
   preguntan si un valor está **escrito con todas las letras** o si sale de un
   dato: `verificar_opciones.mjs` y `verificar_deposito.mjs`.

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
  return String.raw`\b${atributo}\s*${separador}\s*(?:${suelto}|\{\s*(?:${adentro})\s*\}|\{)`;
}

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
