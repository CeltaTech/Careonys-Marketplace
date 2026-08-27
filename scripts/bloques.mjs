/* ===================================================
   CÓMO SE RECORTA UN BLOQUE DE CÓDIGO CONTANDO LLAVES

   Lo usan los chequeos que no miran renglones sueltos sino **bloques**: el
   cuerpo de una función, el de un `try`, el de un `catch`. Hoy son
   `verificar_arranque.mjs`, `verificar_botones.mjs` y `verificar_estados.mjs`.

   Por qué existe: los tres necesitan exactamente lo mismo —dejar el renglón sin
   sus textos para que una llave escrita adentro de una frase no descuadre la
   cuenta, y después contar llaves hasta que el bloque cierre— y hasta el 26 de
   agosto de 2026 estaba escrito dos veces, con dos contenidos parecidos pero
   distintos: la copia de `verificar_botones.mjs` no sacaba los textos escritos
   entre acentos graves, así que una llave adentro de un molde le corría la
   cuenta. Es el mismo motivo por el que existe `recorrido.mjs` («ningún patrón
   repetido sin punto único de verdad»).

   Qué NO hace: no entiende JavaScript. Cuenta llaves sobre el texto, que
   alcanza para lo que estos chequeos preguntan y no para más. Un texto de
   varios renglones escrito entre acentos graves con una llave suelta adentro le
   corre la cuenta, y no hay ninguno en el proyecto.
=================================================== */

/* `String.fromCharCode(92)` y no la barra escrita: este mismo archivo lo leen
   los chequeos de texto visible, y una barra suelta adentro de una expresión
   regular es justo lo que confunde a más de uno. */
const ESCAPE = new RegExp(String.fromCharCode(92, 92) + '.', 'g');

/**
 * Deja el renglón sin sus textos ni su comentario de línea, para que una llave
 * escrita adentro de una frase no descuadre la cuenta.
 *
 * **Sirve para contar, no para leer.** Lo que devuelve tiene los textos
 * vaciados, así que un chequeo que quiera mirar *qué dice* una frase tiene que
 * mirar el renglón original.
 */
export function soloCodigo(linea) {
  return linea
    .replace(ESCAPE, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``')
    .replace(/\/\/.*$/, '');
}

/** Los renglones del bloque que arranca en `desde`, contando llaves. */
export function cuerpo(lineas, desde) {
  let profundidad = 0;
  let abrio = false;
  const salida = [];
  for (let n = desde; n < lineas.length; n++) {
    salida.push(lineas[n]);
    for (const caracter of soloCodigo(lineas[n])) {
      if (caracter === '{') { profundidad++; abrio = true; }
      if (caracter === '}') profundidad--;
    }
    if (abrio && profundidad <= 0) break;
  }
  return salida;
}

/* ¿El renglón `n` está adentro de un `try` que todavía no cerró? Se cuenta
   hacia atrás: cada `}` que aparece antes es un bloque que ya se cerró y hay
   que saltear entero; la primera `{` que queda sin pareja es la del bloque que
   contiene a este renglón, y ahí se mira si abre un `try`. */
export function dentroDeTry(lineas, n) {
  let pendientes = 0;
  for (let i = n - 1; i >= 0; i--) {
    const limpio = soloCodigo(lineas[i]);
    const termina = limpio.trimEnd();
    for (const caracter of [...limpio].reverse()) {
      if (caracter === '}') pendientes++;
      else if (caracter === '{') {
        if (pendientes === 0) {
          if (/\btry\s*\{$/.test(termina)) return true;
        } else {
          pendientes--;
        }
      }
    }
  }
  return false;
}

/**
 * Deja el texto entero sin sus comentarios de bloque, **conservando los
 * renglones**: cada uno que se borra se repone vacío, así el número de renglón
 * que se informe después sigue siendo el del archivo.
 *
 * Por qué hace falta: la documentación de un archivo suele traer un ejemplo de
 * cómo se lo usa, y un chequeo que lee ese ejemplo como código avisa de un
 * defecto que no existe. Pasó con `js/autorizaciones.js`, cuya cabecera muestra
 * `await Autorizaciones.textosDelPaso();` para explicar cómo se llama: el
 * chequeo de estados lo contaba como una llamada de verdad sin red.
 *
 * Qué NO hace: no entiende JavaScript. Si algún día un texto guardara los dos
 * caracteres que abren un comentario adentro, se los llevaría puestos. Hoy no
 * hay ninguno en el proyecto.
 */
export function sinBloquesDeComentario(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, (trozo) => trozo.replace(/[^\n]/g, ' '));
}
