/* ===================================================
   LA PUERTA A LO QUE DECIDE QUÉ CONTRASEÑA VALE

   El largo mínimo y qué está mal se deciden en un solo archivo, y de ahí
   salen los avisos que ven las tres pantallas que piden una contraseña. Ese
   archivo es el mismo de siempre y no se toca: lo leen también los dos
   programas del teléfono, que no tienen herramienta de armado.

   Lo que hace falta acá es **una sola puerta**. Estaba pedido a mano adentro de
   dos pantallas, con el mismo recuerdo escrito dos veces, y la tercera todavía
   no está portada: la copia iba camino a ser triple.

   **Diferida, por lo mismo que la puerta a la base.** Las pantallas que no
   piden contraseña no tienen por qué cargar esto.
=================================================== */

let pidiendose = null;

/** Entrega lo que decide qué contraseña vale —o lo que ya estaba pedido—. */
export function conLaRevisionDeClaves() {
  if (!pidiendose) {
    pidiendose = import('../../../js/clave.js').then(() => window.Clave);
  }
  return pidiendose;
}
