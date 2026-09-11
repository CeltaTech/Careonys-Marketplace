/* ===================================================
   LOS MENSAJES

   La conversación con la Familia. Acá no se escribe casi nada: el mecanismo
   entero —la lista, el hilo abierto, el envío, el refresco— vive en una pieza
   compartida que usan también la aplicación de la Familia y el sitio, y esta
   pantalla no hace más que darle una caja y decirle de qué lado está parada.

   **Se monta una sola vez.** Volver a montar sobre la misma caja duplicaría los
   escuchas y dejaría dos copias del hilo respondiendo al mismo mensaje; la
   segunda visita recarga, que es lo que corresponde. El aviso de qué hilo abrir
   llega desde afuera, porque a esta pantalla se entra tanto desde el menú como
   desde una alarma que apunta a una conversación concreta, y ese pedido se
   consume una sola vez: si quedara guardado, la próxima visita reabriría un hilo
   que nadie pidió.

   Si el montaje falla no se dibuja ningún cartel, y eso no es un olvido de este
   envase: es lo que hacía la pantalla de antes, que sólo dejaba el detalle en la
   consola.
=================================================== */

import { useEffect, useRef } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { conLasConversaciones } from '../piezas/modulos.js';

export default function Conversacion({ activa, visita, pedida, navegar }) {
  const { frase } = useFrases();
  const montada = useRef(false);

  useEffect(() => {
    if (visita === null) return;
    (async () => {
      try {
        const Conversaciones = await conLasConversaciones();
        if (!montada.current) {
          await Conversaciones.montar('conversacion-caja', { lado: 'asistente' });
          montada.current = true;
        } else {
          await Conversaciones.recargar();
        }
        if (pedida.current) {
          const cual = pedida.current;
          pedida.current = null;
          await Conversaciones.abrirPorId(cual);
        }
      } catch (err) {
        console.error('Montar la pantalla de Mensajes:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visita]);

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
