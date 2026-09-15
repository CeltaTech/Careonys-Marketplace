/* ===================================================
   LOS MENSAJES

   La conversación con la Familia. Acá no se escribe casi nada: el mecanismo
   entero —la lista, el hilo abierto, el envío, el refresco— vive en una pieza
   compartida que usan también la aplicación de la Familia y el sitio, y esta
   pantalla no hace más que darle una caja y decirle de qué lado está parada.

   Cuándo se monta esa pieza y cuándo se recarga lo decide `useLaConversacion`,
   que es la misma decisión en las dos aplicaciones de teléfono. Lo propio de
   ésta es la caja y la cabecera.

   El hilo abierto se refresca solo cada pocos segundos. Al salir de la pantalla
   se para, y eso lo hace la navegación del programa, no este archivo: es ella
   la que sabe que se está yendo.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { useLaConversacion } from '#comun/datos/useLaConversacion.js';

export default function Conversacion({ activa, visita, pedida, navegar }) {
  const { frase } = useFrases();

  useLaConversacion('asistente', visita, pedida);

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-conversacion">
      <div className="wizard-header-bar">
        <button type="button" className="btn-volver-cabecera" id="conv-volver" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>{frase('conversacion.titulo')}</h2>
      </div>

      <div className="capacitaciones-cuerpo">
        <p className="capacitaciones-bajada">{frase('conversacion.bajada')}</p>
        <div id="conversacion-caja"></div>
      </div>
    </div>
  );
}
