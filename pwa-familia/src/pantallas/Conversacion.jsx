/* ===================================================
   LOS MENSAJES

   Un contenedor vacío y nada más. La lista, los cuatro estados, el hilo y el
   formulario los arma `js/conversacion.js`, que es el mismo archivo que dibuja
   el chat del Asistente: es la misma pantalla vista desde cada lado, y por eso
   no se escribe dos veces.

   Se monta una sola vez y después se recarga, porque montar de nuevo vaciaría
   el hilo que se está leyendo. La marca de si ya se montó vive afuera del
   componente: React puede montar y desmontar una pantalla más de una vez, y lo
   que hay adentro de la caja no lo dibuja él.

   El hilo abierto se refresca solo cada pocos segundos. Al salir de la pantalla
   se para, y eso lo hace la navegación del programa, no este archivo: es ella la
   que sabe que se está yendo.
=================================================== */

import { useEffect } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { conLaBase } from '#comun/datos/puerta.js';

let montada = false;

export default function Conversacion({ activa, pedido, navegar, pedidaRef }) {
  const { frase } = useFrases();

  useEffect(() => {
    if (!pedido) return undefined;
    let vigente = true;
    (async () => {
      try {
        await conLaBase();
        await import('#js/conversacion.js');
        if (!vigente) return;
        if (!montada) {
          await window.Conversaciones.montar('conversacion-caja', { lado: 'familia' });
          montada = true;
        } else {
          await window.Conversaciones.recargar();
        }
        if (pedidaRef.current) {
          const pedida = pedidaRef.current;
          pedidaRef.current = null;
          await window.Conversaciones.abrirPorId(pedida);
        }
      } catch (err) {
        console.error('Mensajes de la Familia:', err);
      }
    })();
    return () => { vigente = false; };
  }, [pedido, pedidaRef]);

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
