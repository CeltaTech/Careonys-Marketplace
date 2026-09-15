/* ===================================================
   MONTAR LA PANTALLA DE MENSAJES

   Las dos aplicaciones de teléfono tienen su pantalla de Mensajes, y las dos
   llegaron por separado a la misma decisión: se monta una sola vez, la segunda
   visita recarga, y el hilo que hay que abrir llega desde afuera y se consume
   al usarlo. Lo que se decide es idéntico; lo único propio de cada aplicación
   es cómo se ve, y eso se queda en cada pantalla.

   **Se monta una sola vez.** Volver a montar sobre la misma caja duplicaría los
   escuchas y dejaría dos copias del hilo respondiendo al mismo mensaje. La
   marca de si ya se montó vive afuera del componente, porque la pantalla se
   monta y se desmonta más de una vez y lo que hay adentro de la caja no lo
   dibuja React.

   **El pedido de abrir un hilo se consume una sola vez.** A esta pantalla se
   entra tanto desde el menú como desde una alarma que apunta a una
   conversación concreta; si el pedido quedara guardado, la próxima visita
   reabriría un hilo que nadie pidió.

   **Y si la pantalla se deja antes de que llegue la pieza, no se monta nada.**
   Montar sobre una caja que ya no está en la página deja el mecanismo colgado.

   Si el montaje falla no se dibuja ningún cartel, y eso no es un olvido: es lo
   que hacían las dos pantallas de antes, que sólo dejaban el detalle en la
   consola.
=================================================== */

import { useEffect } from 'react';
import { conLaBase } from './puerta.js';
import { conLasConversaciones } from './modulos.js';

/* Una marca por lado, no una sola: las dos aplicaciones no corren juntas, pero
   la pieza sí es la misma, y una marca compartida haría que la segunda creyera
   montado lo que montó la primera. */
const montadas = {};

/**
 * @param lado      De qué lado de la conversación está parada la pantalla.
 * @param visita    Cuántas veces se entró. Vacío mientras no es la de ahora.
 * @param pedidaRef Dónde queda anotado el hilo que hay que abrir al entrar.
 */
export function useLaConversacion(lado, visita, pedidaRef) {
  useEffect(() => {
    if (!visita) return undefined;
    let vigente = true;
    (async () => {
      try {
        await conLaBase();
        const Conversaciones = await conLasConversaciones();
        if (!vigente) return;
        if (!montadas[lado]) {
          await Conversaciones.montar('conversacion-caja', { lado });
          montadas[lado] = true;
        } else {
          await Conversaciones.recargar();
        }
        if (pedidaRef.current) {
          const pedida = pedidaRef.current;
          pedidaRef.current = null;
          await Conversaciones.abrirPorId(pedida);
        }
      } catch (err) {
        console.error('Montar la pantalla de Mensajes:', err);
      }
    })();
    return () => { vigente = false; };
  }, [lado, visita, pedidaRef]);
}
