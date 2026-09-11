/* ===================================================
   EL FICHADOR

   Marca la entrada y la salida de la jornada, con la ubicación del teléfono.

   **Para qué vínculo es la jornada.** Opcional a propósito: si se elige una
   Familia, esa Familia ve la marca; si no se elige ninguna, la ve el Asistente y
   nadie más. La Prestadora no la ve en ningún caso. Los tres estados que no son
   «listo» los dice el renglón de abajo del desplegable, y ninguno apaga los
   botones de marcar: no decir para quién es una respuesta válida. Lo único que
   se apaga mientras tanto es el desplegable, que sin lista no tiene nada para
   elegir. La lista se pide una sola vez, al entrar al inicio, y no en cada
   fichado: no cambia entre apretar entrada y apretar salida.

   **Los dos botones se apagan mientras un fichado está en el aire.** Esperar al
   GPS puede tardar varios segundos, en ese rato el botón no da ninguna señal de
   estar haciendo algo, y dos toques eran dos fichados en la misma hora. Un
   fichado repetido no se borra desde ninguna pantalla.

   **Primero al teléfono, después a la base.** Es lo que importa de toda la
   pantalla: una fichada que no se podía mandar se perdía entera. Ahora queda
   guardada antes de intentar nada, así que lo peor que puede pasar es que salga
   más tarde. El renglón del final dice cuántas siguen adentro del teléfono, y
   —si el sistema rechazó alguna— por qué, con un motivo de la lista cerrada de
   motivos aprobados y nunca con el texto que devolvió el servidor.

   **El desplegable y los campos no viven en el estado**, igual que antes: el
   valor se lee del documento en el momento en que se aprieta el botón, no
   cuando vuelve el GPS.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';

import { conLaCola } from '../../piezas/modulos.js';

/* Los tres estados que se cuentan con un renglón de texto. El cuarto —listo—
   apaga ese renglón y prende el desplegable, así que no lleva frase. Cada clave
   se escribe entera y no armada con un `+`: una clave hecha a pedazos no la ve
   nadie desde afuera, ni para comprobar que está en los tres idiomas ni para
   avisar que sobra. */
const FRASE_DEL_VINCULO = {
  cargando: 'fichado.vinculos_cargando',
  error: 'fichado.vinculos_error',
  vacio: 'fichado.sin_vinculos'
};

/* La clave que se guarda y la frase que se lee, emparejadas acá por lo mismo. */
const FRASE_DEL_FICHADO = { entrada: 'fichado.entrada', salida: 'fichado.salida' };

export default function Fichador({ visita, base, pendientes }) {
  const { frase } = useFrases();
  const [vinculos, setVinculos] = useState([]);
  const [estadoVinculos, setEstadoVinculos] = useState('cargando');
  const [aviso, setAviso] = useState('');
  const [corriendo, setCorriendo] = useState(false);
  const selector = useRef(null);

  /* Se pide una sola vez. Si falla se vuelve a intentar la próxima vez que se
     entre al inicio: este desplegable no tiene botón de reintento propio, y
     dejarlo pedido para siempre lo apagaría hasta que alguien recargue la
     aplicación. */
  const pedidos = useRef(false);

  useEffect(() => {
    if (visita === null || !base) return;
    if (pedidos.current) return;
    pedidos.current = true;
    let vigente = true;
    setEstadoVinculos('cargando');
    (async () => {
      try {
        const conversaciones = await base.ClienteDatos.misConversaciones();
        if (!vigente) return;
        if (!conversaciones || conversaciones.length === 0) { setEstadoVinculos('vacio'); return; }
        setVinculos(conversaciones);
        setEstadoVinculos('listo');
      } catch (err) {
        /* El detalle crudo a la consola. A la pantalla, el renglón del catálogo,
           que además aclara que la jornada se marca igual. */
        console.error('Vínculos para el fichado del Asistente:', err);
        if (!vigente) return;
        setEstadoVinculos('error');
        pedidos.current = false;
      }
    })();
    return () => { vigente = false; };
  }, [visita, base]);

  async function ficharGPS(tipo) {
    const nombreTipo = frase(FRASE_DEL_FICHADO[tipo]);
    const conversacionId = selector.current ? selector.current.value : '';
    setAviso(frase('fichado.buscando'));
    if (!navigator.geolocation) {
      window.alert(frase('fichado.sin_soporte'));
      setAviso(frase('fichado.sin_soporte_estado'));
      return;
    }
    setCorriendo(true);
    const ColaFichadas = await conLaCola();
    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      /* La hora del acto, tomada acá y no cuando la fichada llegue a la base:
         entre las dos puede haber horas si el teléfono está sin señal. */
      const marcadaEn = new Date();
      setAviso(frase('fichado.registrando', { tipo: nombreTipo }));
      try {
        /* El legajo, no la cuenta. Y si no hay legajo no se inventa ninguno: lo
           dice y se planta, en vez de mandar un identificador cualquiera para
           que lo rechace la base. */
        const caregiverId = await base.ClienteDatos.legajoPropio();
        if (!caregiverId) throw new Error(frase('fichado.sin_legajo'));

        const fichada = {
          id: ColaFichadas.nuevoId(),
          caregiverId, lat, lng,
          event_type: tipo,
          conversacionId,
          marcadaEn: marcadaEn.toISOString()
        };
        await ColaFichadas.guardar(fichada);

        const norte = lat.toFixed(5);
        const este = lng.toFixed(5);
        const hora = Texto.horaCorta(marcadaEn);
        try {
          await base.ClienteDatos.registrarFichadoGPS(fichada);
          await ColaFichadas.quitar(fichada.id);
          window.alert(frase('fichado.registrado', { tipo: nombreTipo, lat: norte, lng: este }));
          setAviso(frase('fichado.ultimo', { tipo: nombreTipo, hora }));
        } catch (errEnvio) {
          /* No salió ahora, y no se perdió. Los dos casos se dicen distinto
             porque son distintos: sin señal se manda solo y no hay nada que
             hacer; con la base contestando que no, la fichada igual quedó
             guardada, pero conviene que la persona sepa que algo pasó. */
          if (ColaFichadas.esFaltaDeSenal(errEnvio)) {
            window.alert(frase('fichado.sin_senal', { tipo: nombreTipo, hora }));
            setAviso(frase('fichado.sin_senal_estado', { tipo: nombreTipo, hora }));
          } else {
            window.alert(frase('fichado.guardada_igual', {
              tipo: nombreTipo, hora, detalle: Texto.mensajeDeError(errEnvio, 'registrar el fichado')
            }));
            setAviso(frase('fichado.sin_senal_estado', { tipo: nombreTipo, hora }));
          }
        }
      } catch (err) {
        window.alert(Texto.mensajeDeError(err, 'registrar el fichado'));
        setAviso(frase('fichado.error_estado'));
      } finally {
        setCorriendo(false);
      }
    }, (fallo) => {
      /* El teléfono deja de dar la ubicación por tres motivos distintos, y
         decirlos igual acusa a quien no hizo nada: sólo el primero es una
         decisión de la persona. Los otros dos le pasan al teléfono y no hay nada
         que reprocharle: no consigue ubicarse, o tarda tanto que se corta. Y el
         aviso nombra la marca que no quedó: «no se pudo fichar» a secas deja a
         la persona sin saber si perdió la entrada o la salida. */
      const loNego = fallo && fallo.code === fallo.PERMISSION_DENIED;
      window.alert(frase(loNego ? 'fichado.permiso_denegado' : 'fichado.sin_ubicacion',
        { tipo: nombreTipo }));
      setAviso(frase(loNego ? 'fichado.permiso_denegado_estado' : 'fichado.sin_ubicacion_estado'));
      setCorriendo(false);
    });
  }

  /* Qué dice el renglón de las que todavía no salieron del teléfono. En los tres
     casos dice cuántas quedan guardadas, porque lo que la persona necesita saber
     antes que nada es que lo que hizo no se perdió. */
  function textoPendientes() {
    const { cuantas, motivo, trabada } = pendientes;
    if (!cuantas) return '';
    if (!motivo) {
      return cuantas === 1
        ? frase('fichado.pendiente_una')
        : frase('fichado.pendientes_varias', { cuantas });
    }
    /* Por el lector de textos y no por el catálogo: si la clave no se resuelve,
       cae en el motivo genérico en vez de dejar el renglón a medio escribir. */
    const porque = Texto.frase(motivo);
    const clave = trabada
      ? (cuantas === 1 ? 'fichado.rechazado_trabado_una' : 'fichado.rechazado_trabado_varias')
      : (cuantas === 1 ? 'fichado.rechazado_una' : 'fichado.rechazado_varias');
    return frase(clave, { cuantas, motivo: porque });
  }

  const claveDelVinculo = FRASE_DEL_VINCULO[estadoVinculos];

  return (
    <div className="gps-widget">
      <i className="fas fa-map-marked-alt"></i>
      <h4 className="m-0 texto-15 color-titulo peso-800">{frase('asistente.fichador')}</h4>
      <p id="gps-status" className="m-solo-arriba-4 texto-12 color-secundario">
        {aviso || frase('asistente.fichador_bajada')}
      </p>
      <div className="form-group-pwa mt-16">
        <label htmlFor="gps-vinculo">{frase('fichado.para_quien')}</label>
        <select id="gps-vinculo" ref={selector} disabled={estadoVinculos !== 'listo'}>
          {/* La primera opción —marcar sin decir para quién— es parte de la
              pantalla y no de los datos: queda siempre, ya traducida, y es la
              que está elegida al entrar. El nombre de la otra parte sale de la
              fila y se escribe como texto, nunca como marcado. */}
          <option value="">{frase('fichado.sin_vinculo')}</option>
          {vinculos.map((conversacion) => (
            <option key={conversacion.id} value={conversacion.id}>
              {conversacion.otra_parte || ''}
            </option>
          ))}
        </select>
        <p className="m-solo-arriba-4 texto-11 color-secundario" id="gps-vinculo-estado" hidden={!claveDelVinculo}>
          {claveDelVinculo ? frase(claveDelVinculo) : ''}
        </p>
        <p className="m-solo-arriba-4 texto-11 color-secundario">{frase('fichado.aclaracion_vinculo')}</p>
      </div>
      <div className="gps-actions">
        <button
          type="button"
          className="btn-gps fondo-azul-medio"
          id="btn-gps-in"
          disabled={corriendo || !base}
          onClick={() => ficharGPS('entrada')}
        >{frase('asistente.marcar_entrada')}</button>
        <button
          type="button"
          className="btn-gps fondo-peligro"
          id="btn-gps-out"
          disabled={corriendo || !base}
          onClick={() => ficharGPS('salida')}
        >{frase('asistente.marcar_salida')}</button>
      </div>
      <p className="m-solo-arriba-4 texto-11 color-secundario" id="gps-pendientes" hidden={!pendientes.cuantas}>
        {textoPendientes()}
      </p>
    </div>
  );
}
