/* ===================================================
   EL ALTA DEL ASISTENTE, LO QUE SUS DOS FORMULARIOS COMPARTEN

   La misma alta se puede hacer desde el portal o desde la aplicación del
   teléfono. Son dos pantallas distintas porque se ven distinto, pero los pasos
   grandes —las zonas, la grilla de disponibilidad, las preguntas que la
   acompañan y las autorizaciones del cierre— no los dibuja ninguna de las dos:
   los dibuja un módulo, al que hay que decirle en qué hueco va cada uno.

   El nombre de esos huecos es lo que tiene que decir la misma cosa en dos
   lugares a la vez: el formulario declara el hueco y la pantalla se lo nombra
   al módulo. Si uno de los dos cambia y el otro no, el paso deja de dibujarse y
   no avisa nada. Por eso se escribe una vez acá y lo leen los dos.
=================================================== */

/* En qué hueco va cada paso que se dibuja solo. Estos nombres viajan al
   marcado, así que se escriben como el marcado los escribe. */
export const HUECOS_DEL_ALTA = {
  zonas: 'zonas',
  grillaDeDisponibilidad: 'grilla-disponibilidad',
  preguntasDeDisponibilidad: 'preguntas-disponibilidad',
  autorizaciones: 'autorizaciones-container'
};

/* Deja el alta como recién abierta, para quien venga después. Las dos altas
   reutilizan el mismo formulario: cuando una termina bien, lo que quedó
   cargado es de la persona anterior.

   Vaciar el formulario no alcanza, y ahí es donde las dos pantallas se habían
   separado: el navegador vacía lo que él dibujó, y estos cuatro pasos no los
   dibujó él. Las zonas se quedaban con casillas apagadas y a medio tildar, las
   autorizaciones con lo que la persona anterior había contestado en vez de con
   lo que dice la declaración, y las fichas con los bloques que había agregado.
   Cada módulo sabe cómo se deja lo suyo en blanco, así que se le pide a él.

   Los módulos llegan de afuera porque cada programa los trae a su manera, y
   ninguno de los dos tiene por qué saberlo el otro. */
export function limpiarElAlta(formulario, piezas) {
  if (formulario) formulario.reset();
  piezas.Disponibilidad.limpiar(
    HUECOS_DEL_ALTA.grillaDeDisponibilidad, HUECOS_DEL_ALTA.preguntasDeDisponibilidad
  );
  piezas.Autorizaciones.limpiar(HUECOS_DEL_ALTA.autorizaciones);
  piezas.Zonas.limpiar(HUECOS_DEL_ALTA.zonas);
  piezas.FichasLegajo.montarSecciones();
}
