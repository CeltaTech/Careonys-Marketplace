/* ===================================================
   LA TARJETA DE ENTRADA

   Qué es. El recuadro centrado donde el portal pide los datos de entrar: la
   marca arriba, y debajo el cartel de que está preparando la pantalla o el de
   que el servidor no contesta, con su botón para volver a intentar.

   Estaba escrita cuatro veces, una en cada pantalla que se entra sin haber
   entrado todavía. Las cuatro dibujaban la marca igual, letra por letra, y el
   cartel de espera igual salvo la frase; tres repetían además el cartel de
   «no hay servidor» con el mismo botón. Un recuadro escrito cuatro veces se
   despega en cuanto una de las cuatro se retoca.

   **Qué frase se dice mientras espera lo elige cada pantalla**, porque no está
   preparando lo mismo la que va a pedir la contraseña que la que va a darle un
   alta a una Familia. Y **qué se hace al tocar «reintentar» también**: la
   pantalla que no tiene forma de fallar así no manda nada, y entonces el cartel
   no se dibuja.

   Lo que queda adentro de la tarjeta lo escribe cada pantalla, con sus propias
   condiciones: acá no se decide cuándo se ve.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Aviso } from '#comun/avisos/Aviso.jsx';

/**
 * @param estado       En qué anda la pantalla.
 * @param cargando     Clave de la frase que se dice mientras espera.
 * @param alReintentar Qué hacer cuando se toca el botón de volver a intentar.
 * @param children     Lo que dibuja la pantalla adentro de la tarjeta.
 */
export function TarjetaDeAcceso({ estado, cargando, alReintentar, children }) {
  const { frase } = useFrases();
  return (
    <main className="acceso-pantalla">
      <div className="acceso-tarjeta">

        <div className="acceso-marca">
          <img className="tenant-logo" src="/assets/images/logotipo.png" alt="" />
          <span className="tenant-name"></span>
        </div>

        {estado === 'cargando' && (
          <div className="acceso-cargando">
            <i className="fas fa-circle-notch fa-spin"></i>{' '}
            <span>{frase(cargando)}</span>
          </div>
        )}

        {estado === 'error' && alReintentar && (
          <div>
            <Aviso aviso="acceso.sin_servidor" />
            <button
              type="button"
              className="btn btn-secundario ancho-total"
              onClick={alReintentar}
            >
              {frase('acceso.reintentar')}
            </button>
          </div>
        )}

        {children}

      </div>
    </main>
  );
}
