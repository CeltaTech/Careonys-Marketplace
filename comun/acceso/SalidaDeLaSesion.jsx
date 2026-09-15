/* ===================================================
   LA SALIDA, ADENTRO DEL MENÚ

   Qué es. El último renglón del menú de los dos programas del teléfono: una
   línea que lo separa de lo demás, y abajo el botón que cierra la sesión.
   Mientras la salida corre el botón queda apagado y dice que está saliendo, y
   por eso nadie la pide dos veces.

   Estaba escrito dos veces, uno en cada programa, y las dos copias eran
   iguales salvo en una cosa: cada una buscaba en el catálogo su propia frase
   para decir «Cerrando la sesión…». Dos frases para lo mismo se despegan, y ya
   se habían despegado en portugués.

   **Lo que hace el botón lo decide cada programa**, porque a dónde va después
   de salir no es lo mismo en los dos. Acá está el renglón; qué pasa al tocarlo
   llega de afuera.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/**
 * @param saliendo Si la salida está corriendo. Apaga el botón.
 * @param alSalir  Qué hacer cuando se toca.
 */
export function SalidaDeLaSesion({ saliendo, alSalir }) {
  const { frase } = useFrases();
  return (
    <>
      <div className="borde-arriba" style={{ margin: '8px 0' }}></div>
      <button
        type="button"
        className="drawer-menu-item color-peligro"
        id="btn-logout"
        disabled={saliendo}
        onClick={alSalir}
      >
        {saliendo ? frase('comun.cerrando_sesion') : (
          <>
            <i className="fas fa-sign-out-alt ancho-20 color-peligro"></i>{' '}
            <span>{frase('comun.cerrar_sesion')}</span>
          </>
        )}
      </button>
    </>
  );
}
