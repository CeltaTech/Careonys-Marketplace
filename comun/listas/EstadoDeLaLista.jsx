/* ===================================================
   LO QUE SE DICE MIENTRAS LA LISTA NO ESTÁ

   Una pantalla que trae una lista tiene que decir tres cosas antes de poder
   mostrarla: que está buscando, que no pudo, y que no hay nada. Las tres
   estaban escritas cuatro veces, y las cuatro copias ya se habían separado:
   el botón de volver a intentar pedía su texto con cuatro nombres distintos
   para la misma palabra, y la línea de abajo del cartel de «no hay nada» la
   tenían dos y las otras dos no.

   Acá quedan las tres escritas una vez. **Qué dice cada una la elige la
   pantalla**, porque el motivo de estar vacía nunca es el mismo; **qué se hace
   al volver a intentar también**, porque una vuelve a pedir y otra rehace el
   pedido entero; y la que no tiene una línea de abajo simplemente no la manda.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

export function EstadoDeLaLista({
  estado, prefijo, cargando, error, encabezadoDelError,
  alReintentar, vacio, vacioBajada
}) {
  const { frase } = useFrases();
  return (
    <>
      {estado === 'cargando' ? (
        <div className="pwa-estado" id={prefijo + '-cargando'}>{frase(cargando)}</div>
      ) : null}

      {estado === 'error' ? (
        <div className="pwa-estado" id={prefijo + '-error'}>
          <p id={prefijo + '-error-texto'}>
            {encabezadoDelError ? frase(encabezadoDelError) + ' ' + frase(error) : frase(error)}
          </p>
          <button type="button" className="btn btn-primario" id={prefijo + '-reintentar'}
            onClick={alReintentar}>
            {frase('acceso.reintentar')}
          </button>
        </div>
      ) : null}

      {estado === 'vacio' ? (
        <div className="pwa-estado" id={prefijo + '-vacio'}>
          <p id={prefijo + '-vacio-texto'}>{frase(vacio)}</p>
          {vacioBajada ? (
            <p className="pwa-estado-bajada" id={prefijo + '-vacio-bajada'}>{frase(vacioBajada)}</p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
