/* ===================================================
   EL SELLO DEL PRODUCTO

   Qué es. El renglón chiquito que cierra una pantalla y dice de quién es la
   tecnología con la que está hecha. Es lo último que se lee, así que se lee en
   gris y en letra chica: está para quien lo busque, no para interrumpir.

   Estaba escrito nueve veces: en la entrada y en la pantalla principal de cada
   programa del teléfono, al pie del menú de los dos, y otras tres en la maqueta
   que el portal usa para mostrar cómo se ve el teléfono. Las nueve decían lo
   mismo con las mismas dos frases y la misma palabra resaltada, y seis de ellas
   repetían a mano, en el marcado, lo que las clases de siempre ya dicen:
   centrado, letra chica, color secundario.

   **El espacio alrededor lo pone quien lo usa**, y por eso viaja de afuera: al
   pie de una pantalla que empuja hacia abajo no se separa igual que al final de
   una lista, y al pie de un menú lleva además su línea de arriba. Eso es dónde
   se pone el sello, y no cómo es.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/**
 * @param className Clases de espaciado que agrega quien lo usa.
 * @param style     Espaciado que todavía no tiene clase propia.
 */
export function SelloDelProducto({ className = '', style }) {
  const { frase } = useFrases();
  return (
    <div className={('centrar-texto texto-10 color-secundario ' + className).trim()} style={style}>
      <span>{frase('pie.sello_producto')}</span>{' '}
      <strong className="color-marca-acento">{frase('comun.producto')}</strong>
    </div>
  );
}
