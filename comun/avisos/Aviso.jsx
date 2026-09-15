/* ===================================================
   LA CAJA DE AVISO

   Qué es. El renglón de color que una pantalla abre para decir una sola cosa:
   que algo salió mal, que algo salió bien, o que hay algo que conviene saber
   antes de seguir. Se abre solamente cuando hay algo que decir, así que con el
   aviso vacío no se dibuja nada y la pantalla no necesita preguntarlo antes.

   **Estaba escrita cuatro veces.** La misma caja aparecía en la entrada, en el
   panel de la Prestadora, en las guías de cuidado y en la evaluación, y cada
   copia sabía algo que las otras no: una buscaba la frase con sus huecos y
   caía en una frase general cuando no la encontraba, otra le contaba al que no
   ve la pantalla que había pasado algo, otra tenía los cinco tonos y no dos, y
   dos escribían las medidas de la caja sueltas en el marcado en vez de pedirle
   una clase a la hoja de estilos. Esta sabe las cuatro cosas.

   **Cinco tonos y qué significan.** Rojo cuando algo no se pudo hacer, verde
   cuando salió bien, amarillo cuando hay algo que saber antes de seguir, azul
   cuando es una explicación, y gris cuando es un estado sin color propio. De
   ahí sale también cómo se le cuenta a quien no ve la pantalla: lo rojo
   interrumpe la lectura y el resto espera a que termine la frase en curso.

   **El aviso guarda la clave de la frase, no la frase.** Así cambia con el
   idioma como cualquier otro rótulo, incluso si ya estaba abierto.

   **La caja la dibuja la hoja de estilos del sitio.** Los programas de teléfono
   todavía no la tienen, así que una pantalla de teléfono que quiera usarla
   necesita primero que su hoja declare la caja.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/**
 * @param aviso  La clave de la frase, o un aviso con `clave`, `huecos`,
 *               `detalle` y `tono`. Vacío no dibuja nada.
 * @param tono   `critico`, `exito`, `atencion`, `info` o `neutro`, cuando el
 *               aviso no lo trae escrito.
 */
export function Aviso({ aviso, tono = 'critico' }) {
  const { frase } = useFrases();
  if (!aviso) return null;

  const esTexto = typeof aviso === 'string';
  const clave = esTexto ? aviso : aviso.clave;
  if (!clave) return null;

  /* Una frase que no está en el catálogo dejaría la caja abierta y muda, que
     es peor que no abrirla: se dice lo general antes que nada. */
  const texto = frase(clave, esTexto ? undefined : aviso.huecos) || frase('error.generico');
  const color = (!esTexto && aviso.tono) || tono;
  const detalle = esTexto ? '' : aviso.detalle;

  return (
    <div className={'aviso ' + color} role={color === 'critico' ? 'alert' : 'status'}>
      <span>{texto}</span>
      {/* El motivo ya viene clasificado y traducido, así que se escribe tal
          cual y en un nodo aparte. */}
      {detalle ? <span>{' ' + detalle}</span> : null}
    </div>
  );
}
