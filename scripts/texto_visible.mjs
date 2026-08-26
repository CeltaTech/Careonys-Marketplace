/* ===================================================
   QUÉ PARTE DE UN ARCHIVO VE UNA PERSONA

   Devuelve los trozos de texto que terminan en la pantalla, cada uno con el
   renglón donde está. Lo usan los chequeos que revisan cómo está escrito lo que
   se lee: `verificar_trato.mjs` y `verificar_vocabulario.mjs`.

   Qué cuenta como visible:
   - el texto entre etiquetas de un `.html`, sin los comentarios ni el `<style>`;
   - los atributos que se leen en pantalla (`placeholder`, `title`, `alt`,
     `aria-label`, `value`, `content`, `label`);
   - las cadenas de texto de los bloques `<script>`, de los archivos de `js/` y
     del catálogo de `data/`, porque de ahí sale lo que la pantalla muestra.

   Qué no cuenta: los comentarios, en ningún idioma de los tres archivos. Un
   comentario explica de dónde salen las cosas y para eso necesita nombrarlas
   como se llamaban antes.

   Por qué existe aparte: estaba adentro de `verificar_trato.mjs`, y el segundo
   chequeo que necesitó lo mismo iba a copiarlo. Una lista repetida dos veces se
   arregla una vez y queda mal la otra («ningún patrón repetido sin punto único de verdad»).
=================================================== */

const ATRIBUTOS = 'placeholder|title|alt|aria-label|value|content|label';

/* Reemplaza por espacios en vez de borrar para que el número de renglón siga
   siendo el de verdad. */
export const enBlanco = (t) => t.replace(/[^\n]/g, ' ');

/**
 * Deja fuera lo que está escrito en inglés y en portugués.
 *
 * Desde que el texto se traduce a los tres idiomas, los chequeos que miran
 * **cómo está escrito** el castellano —el trato de usted, el vocabulario— se
 * encuentran con frases de los otros dos y las juzgan con reglas que no son las
 * de ellas. Pasó apenas apareció el catálogo: «publicá-lo», que en portugués es
 * lo normal, se leía como un voseo; y «cuidador», que en portugués es la palabra
 * correcta, es justo la que el vocabulario prohíbe en castellano.
 *
 * Se reconoce por la clave, no por las palabras: en el catálogo cada frase trae
 * sus tres idiomas rotulados, así que se sabe con certeza cuál es cuál. Los
 * chequeos que valen para los tres idiomas —el escapado, los colores— no llaman
 * a esto y siguen viendo todo.
 */
export const soloCastellano = (crudo) => crudo.replace(
  /"(?:en|pt-BR)"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
  (todo, valor) => todo.slice(0, todo.length - valor.length - 1) + enBlanco(valor) + '"'
);

/** Devuelve pares `[renglón, texto]` de lo que ve una persona. */
export function visible(crudo, esHtml) {
  const trozos = [];
  const anotar = (inicio, texto) => {
    if (texto.trim()) trozos.push([crudo.slice(0, inicio).split('\n').length, texto.trim()]);
  };

  if (!esHtml) {
    const sinComentarios = crudo.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
    for (const c of sinComentarios.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(c.index, c[1].slice(1, -1));
    }
    return trozos;
  }

  const limpio = crudo
    .replace(/<!--[\s\S]*?-->/g, enBlanco)
    .replace(/<style\b[\s\S]*?<\/style>/gi, enBlanco);

  for (const g of limpio.matchAll(/<script\b[\s\S]*?<\/script>/gi)) {
    const cuerpo = g[0].replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, enBlanco);
    for (const c of cuerpo.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
      anotar(g.index + c.index, c[1].slice(1, -1));
    }
  }

  const sinGuion = limpio.replace(/<script\b[\s\S]*?<\/script>/gi, enBlanco);

  const atributo = new RegExp('\\b(' + ATRIBUTOS + ')\\s*=\\s*("[^"]*"|\'[^\']*\')', 'gi');
  for (const a of sinGuion.matchAll(atributo)) anotar(a.index, a[2].slice(1, -1));

  const resto = sinGuion.replace(/<[^>]*>/g, enBlanco);
  resto.split('\n').forEach((linea, i) => {
    if (linea.trim()) trozos.push([i + 1, linea.trim()]);
  });
  return trozos;
}
