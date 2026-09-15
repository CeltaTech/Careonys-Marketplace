/* ===================================================
   LA ASISTENCIA: LAS MARCAS DE ENTRADA Y DE SALIDA

   La mitad operativa que el producto promete acompañar, y nada más que eso. Acá
   la Familia ve las entradas y las salidas que marcó su Asistente, tal como
   quedaron marcadas.

   Es informativa de punta a punta: no hay «aprobar», no hay «rechazar» y no hay
   ninguna cuenta de horas. El software no conoce el trato entre las dos partes
   —no guarda ninguna condición ni ningún precio—, así que sumar jornadas sería
   inventar un número sobre algo que no sabe. Muestra lo que se marcó, y quien
   decide qué hacer con eso son las partes.

   Quién ve qué no lo decide esta pantalla: lo decide la RLS de las fichadas, que
   le da a la Familia las marcas de sus vínculos y a nadie más. El personal de la
   Prestadora tampoco las ve.

   **La marca trae el identificador del Asistente y no su nombre**, así que el
   nombre sale de las conversaciones —el vínculo es el único lugar donde consta
   que esas dos partes se encontraron— y las dos listas se cruzan acá. Se traen
   las dos de una sola vez: filtrar después es trabajo del navegador y no vuelve
   a molestar a la base.

   Arriba de todo va la franja de alarmas, que es lo único de esta pantalla que
   la Familia no tendría que buscar: la lista de marcas ya está más abajo, y
   darse cuenta sola de que una jornada quedó abierta desde anteayer es
   justamente el trabajo que el producto promete ahorrarle. Se pide por su lado,
   porque son dos consultas distintas y que una falle no tiene por qué dejar sin
   la otra a quien mira.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import { FranjaDeAlarmas } from '#comun/alarmas/FranjaDeAlarmas.jsx';

export default function Asistencia({ activa, pedido, navegar, irAMensajes }) {
  const { frase } = useFrases();

  return (
    <div className={'app-screen' + (activa ? ' active' : '')} id="screen-asistencia">
      <div className="app-header">
        <button className="btn-back" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 id="asistencia-titulo">{frase('asistencia.titulo')}</h1>
        <div className="ancho-24"></div>
      </div>

      <div className="p-16">
        <FranjaDeAlarmas visita={pedido} irAMensajes={irAMensajes} borde="mb-12" />
        <ListaDeMarcas pedido={pedido} />
      </div>
    </div>
  );
}

/* ── La lista de marcas ────────────────────────────────────────────────────── */
function ListaDeMarcas({ pedido }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [marcas, setMarcas] = useState([]);
  const [nombres, setNombres] = useState(new Map());
  const [vinculos, setVinculos] = useState([]);
  const [elegido, setElegido] = useState('');
  const [claveDelError, setClaveDelError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!pedido) return undefined;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const [conversaciones, fichadas] = await Promise.all([
          ClienteDatos.misConversaciones(),
          ClienteDatos.fichadasDelVinculo()
        ]);
        await Catalogo.cargar();
        if (!vigente) return;
        const porVinculo = new Map();
        (conversaciones || []).forEach((conversacion) => {
          porVinculo.set(conversacion.id, conversacion.otra_parte || '');
        });
        /* Una marca sin vínculo no tiene de quién ser acá: la RLS no se la da a
           ninguna Familia, y si igual llegara no se sabría a quién nombrarle. */
        const conVinculo = (fichadas || []).filter((marca) => marca.conversacion_id);
        setNombres(porVinculo);
        setVinculos(conversaciones || []);
        setElegido('');
        setMarcas(conVinculo);
        setEstado(conVinculo.length === 0 ? 'vacio' : 'listo');
      } catch (err) {
        if (!vigente) return;
        console.error('Asistencia de la Familia:', err);
        setClaveDelError(Texto.claveDeError(err, frase('asistencia.error')));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [pedido, intento]);

  /* Cambiar el filtro no es traer datos de nuevo: se dibuja lo que ya está en
     memoria con el vínculo que esté elegido. */
  const visibles = elegido
    ? marcas.filter((marca) => marca.conversacion_id === elegido)
    : marcas;
  const vacio = estado === 'vacio' || (estado === 'listo' && visibles.length === 0);

  return (
    <>
      <p className="texto-12 color-secundario m-0 mb-12" id="asistencia-bajada">
        {frase('asistencia.bajada')}
      </p>

      {/* El filtro se esconde mientras se busca y si algo falló; con la lista
          vacía se deja a la vista, porque el vacío puede ser del filtro elegido y
          sin él no habría cómo volver a todos los vínculos. */}
      {estado !== 'cargando' && estado !== 'error' ? (
        <select id="asi-filtro" value={elegido}
          onChange={(evento) => setElegido(evento.target.value)}
          className="ancho-total p-9-12 redondeo-10 borde-tarjeta-15 texto-13 caja-borde fondo-superficie-hundida mb-12">
          <option value="">{frase('asistencia.filtro_todas')}</option>
          {vinculos.map((conversacion) => (
            <option key={conversacion.id} value={conversacion.id}>
              {conversacion.otra_parte || ''}
            </option>
          ))}
        </select>
      ) : null}

      {estado === 'cargando' ? (
        <div className="pwa-estado" id="asi-cargando">{frase('asistencia.cargando')}</div>
      ) : null}

      {estado === 'error' ? (
        <div className="pwa-estado" id="asi-error">
          <p id="asi-error-texto">{frase('asistencia.error') + ' ' + frase(claveDelError)}</p>
          <button type="button" className="btn btn-primario" id="asi-reintentar"
            onClick={() => setIntento((cuantos) => cuantos + 1)}>
            {frase('asistencia.reintentar')}
          </button>
        </div>
      ) : null}

      {vacio ? (
        <div className="pwa-estado" id="asi-vacio">
          <p id="asi-vacio-texto">{frase('asistencia.vacio')}</p>
        </div>
      ) : null}

      {estado === 'listo' && visibles.length > 0 ? (
        <div id="asistencia-lista">
          {visibles.map((marca, cual) => (
            <TarjetaDeMarca key={marca.id || cual} marca={marca}
              nombre={nombres.get(marca.conversacion_id) || ''} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function TarjetaDeMarca({ marca, nombre }) {
  const { frase } = useFrases();

  /* La fecha y la hora las escribe `js/texto.js` en el idioma de la pantalla;
     acá no se arma ningún formato a mano.

     Y es la hora en que el Asistente marcó, no la hora en que la marca llegó a
     la base. Desde que una fichada puede quedar esperando en el teléfono sin
     señal, las dos dejaron de ser la misma, y mostrar la segunda le diría a la
     Familia que alguien entró a las seis de la tarde cuando en realidad entró a
     las ocho de la mañana. */
  const cuando = Texto.fechaYHora(marca.marcada_en);

  /* La ubicación es opcional: el Asistente puede haber marcado sin permiso de
     ubicación, y eso no es una falta. Se dice cuál de las dos cosas pasó. */
  const lat = marca.latitude;
  const lon = marca.longitude;
  const sinUbicacion = lat === null || lat === undefined || lon === null || lon === undefined;
  const mapa = sinUbicacion ? '' : 'https://www.openstreetmap.org/?mlat=' + encodeURIComponent(lat)
    + '&mlon=' + encodeURIComponent(lon)
    + '#map=17/' + encodeURIComponent(lat) + '/' + encodeURIComponent(lon);

  return (
    <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-12">
      <div className="flex alinear-centro gap-12">
        <div className="flex-1">
          {/* Sin nombre no se dibuja un renglón en blanco: no va el renglón. */}
          {nombre ? <h5 className="m-0 texto-13 peso-700">{nombre}</h5> : null}
          <p className="m-0 texto-11 color-secundario">{cuando}</p>
        </div>
        {/* Entrada o salida, con las frases que ya usa el fichador del Asistente. */}
        <span className="texto-11 peso-700 color-marca">
          {marca.event_type === 'salida' ? frase('fichado.salida') : frase('fichado.entrada')}
        </span>
      </div>
      <p className="texto-11 color-secundario m-0 mt-8">
        {sinUbicacion ? frase('asistencia.sin_ubicacion') : frase('asistencia.con_ubicacion')}
      </p>
      {sinUbicacion ? null : (
        <a className="texto-11 color-marca" href={mapa} target="_blank" rel="noopener noreferrer">
          {frase('asistencia.ver_mapa')}
        </a>
      )}
    </div>
  );
}
