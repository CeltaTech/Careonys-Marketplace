/* ===================================================
   CÓMO SE LLAMA QUIEN ENTRÓ

   El nombre que se ve en el menú de los dos programas del teléfono: el que la
   persona puso al darse de alta, o lo que esté antes de la arroba de su correo.
   En mayúsculas.

   Estaba escrito igual en los dos, y el día que se cambie de dónde sale el
   nombre —o que se deje de gritarlo en mayúsculas— hay un solo renglón que
   tocar.
=================================================== */

/** @param cuenta La cuenta tal como la devuelve la sesión. */
export function nombreDeQuienEntro(cuenta) {
  return (cuenta.user_metadata?.full_name || cuenta.email.split('@')[0]).toUpperCase();
}
