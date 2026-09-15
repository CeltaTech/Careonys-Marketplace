/* ===================================================
   LOS MENSAJES

   Un contenedor vacío y nada más. La lista, los cuatro estados, el hilo y el
   formulario los arma una pieza compartida, que es la misma que dibuja el chat
   del Asistente: es la misma pantalla vista desde cada lado, y por eso no se
   escribe dos veces.

   Cuándo se monta esa pieza y cuándo se recarga lo decide `useLaConversacion`,
   que es la misma decisión en las dos aplicaciones de teléfono. Lo propio de
   ésta es la caja y la cabecera.

   El hilo abierto se refresca solo cada pocos segundos. Al salir de la pantalla
   se para, y eso lo hace la navegación del programa, no este archivo: es ella la
   que sabe que se está yendo.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { useLaConversacion } from '#comun/datos/useLaConversacion.js';

export default function Conversacion({ activa, pedido, navegar, pedidaRef }) {
  const { frase } = useFrases();

  useLaConversacion('familia', pedido, pedidaRef);

  return (
    <div className={'app-screen' + (activa ? ' active' : '')} id="screen-conversacion">
      <div className="app-header">
        <button className="btn-back" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 id="conversacion-titulo">{frase('conversacion.titulo')}</h1>
        <div className="ancho-24"></div>
      </div>

      <div className="p-16">
        <p className="texto-12 color-secundario m-0 mb-12" id="conversacion-bajada">
          {frase('conversacion.bajada')}
        </p>
        <div id="conversacion-caja"></div>
      </div>
    </div>
  );
}
