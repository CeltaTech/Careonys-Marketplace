/* ===================================================
   LA FRANJA DE ALARMAS

   Qué es. El renglón de arriba que avisa que una marca quedó a medias: una
   jornada que sigue abierta, o una salida sin su entrada. La mira el Asistente
   en su inicio y la Familia en la pantalla de asistencia, y es la misma franja
   para los dos: sale de la misma función de la base, que resuelve quién ve qué
   y devuelve el nombre del otro lado del vínculo. La Prestadora no la ve en
   ningún caso: la jornada de cada persona es de ella y de quien la contrató.

   Es informativa: no hay «aprobar», no hay «justificar», no hay total de horas
   y no dice que nadie haya hecho algo mal —la causa puede ser un teléfono sin
   batería, y el software no la adivina—. Dice que la marca quedó a medias, que
   es un hecho de la propia fichada, y ofrece lo único que se puede hacer con
   eso: preguntar.

   **Estaba escrita dos veces**, una en cada programa de teléfono, con la misma
   caja y las mismas dos frases, y cada copia sabía algo que la otra no. Ésta
   sabe las dos cosas: abre sola la puerta a la base, así que la pantalla que la
   pone no tiene que pasársela; y guarda la clave del error y no el texto ya
   armado, así que el aviso cambia con el idioma como cualquier otro rótulo.

   Y la falla se registra una sola vez: quien clasifica el error ya la escribe
   en la consola, así que escribirla antes la dejaba dos veces.

   La base devuelve la clase como clave y no como frase; el texto sale del
   catálogo. Una clase que esta franja no sabe nombrar no se dibuja muda: se
   deja afuera y el aviso queda en la consola.

   Lo único que cada pantalla decide es el borde de la franja: una está arriba
   de todo y la otra adentro de un cuerpo que ya trae el suyo.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

/* La clave que devuelve la base y la frase que se lee van emparejadas acá,
   enteras y no armadas con un `+`: el catálogo se revisa leyendo el archivo, y
   una clave construida a pedazos no la ve nadie desde afuera —ni para comprobar
   que está en los tres idiomas, ni para avisar que sobra—. */
const FRASE_DE_LA_ALARMA = {
  jornada_abierta: 'alarmas.jornada_abierta',
  salida_sin_entrada: 'alarmas.salida_sin_entrada'
};

function TarjetaDeAlarma({ fila, irAMensajes }) {
  const { frase } = useFrases();

  /* La fecha y la hora las escribe el lector de siempre, en el idioma de la
     pantalla; acá no se arma ningún formato a mano. */
  const cuando = Texto.fechaYHora(fila.ocurrio_el);

  /* Los dos huecos van siempre, aunque una de las dos frases no los tenga: la
     que no los usa los ignora, y así el emparejamiento queda en un solo
     llamado. */
  const clave = FRASE_DE_LA_ALARMA[fila.clase];
  const motivo = clave ? frase(clave, { horas: fila.horas, tope: fila.tope_horas }) : '';

  return (
    <div className="fondo-superficie borde-tarjeta redondeo-16 p-16 mb-12">
      <div className="flex alinear-centro gap-12">
        <div className="flex-1">
          {/* El nombre de la otra parte puede no venir. No se rompe nada y no se
              inventa ninguno: el renglón queda vacío. */}
          <h5 className="m-0 texto-13 peso-700">{fila.otra_parte || ''}</h5>
          <p className="m-0 texto-11 color-secundario">{cuando}</p>
        </div>
      </div>
      <p className="texto-12 m-0 mt-8 mb-8">{motivo}</p>
      {/* Preguntar es abrir la conversación de ese vínculo, y nada más. Sin
          conversación no hay a dónde ir: no va el botón, en vez de dejar uno
          que no lleva a ningún lado. */}
      {fila.conversacion_id ? (
        <button type="button" className="btn btn-primario ancho-total"
          onClick={() => irAMensajes(fila.conversacion_id)}>
          {frase('alarmas.ir_a_la_conversacion')}
        </button>
      ) : null}
    </div>
  );
}

/**
 * @param visita      Cuántas veces se entró a la pantalla. Vacío mientras no es
 *                    la de ahora, y así la franja no pide nada de fondo.
 * @param irAMensajes Qué hacer cuando se quiere preguntar por una alarma.
 * @param borde       Las clases del borde de la franja, que pone la pantalla.
 */
export function FranjaDeAlarmas({ visita, irAMensajes, borde = '' }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [alarmas, setAlarmas] = useState([]);
  const [claveDelError, setClaveDelError] = useState('');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!visita) return undefined;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const filas = await ClienteDatos.misAlarmas();
        if (!vigente) return;
        const conocidas = (filas || []).filter((fila) => {
          if (FRASE_DE_LA_ALARMA[fila.clase]) return true;
          console.error('Alarma de una clase que esta franja no conoce:', fila.clase);
          return false;
        });
        setAlarmas(conocidas);
        setEstado(conocidas.length === 0 ? 'vacio' : 'listo');
      } catch (err) {
        if (!vigente) return;
        setClaveDelError(Texto.claveDeError(err, 'Alarmas:'));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [visita, intento]);

  return (
    <div id="alarmas-franja" className={borde}>
      <h2 className="m-0 texto-13 peso-700" id="alarmas-titulo">{frase('alarmas.titulo')}</h2>
      <p className="texto-11 color-secundario m-0 mt-8 mb-12" id="alarmas-bajada">
        {frase('alarmas.bajada')}
      </p>

      {estado === 'cargando' ? (
        <div className="pwa-estado" id="ala-cargando">{frase('alarmas.cargando')}</div>
      ) : null}

      {estado === 'error' ? (
        <div className="pwa-estado" id="ala-error">
          <p id="ala-error-texto">{frase('alarmas.error') + ' ' + frase(claveDelError)}</p>
          <button type="button" className="btn btn-primario" id="ala-reintentar"
            onClick={() => setIntento((cuantos) => cuantos + 1)}>
            {frase('alarmas.reintentar')}
          </button>
        </div>
      ) : null}

      {estado === 'vacio' ? (
        <div className="pwa-estado" id="ala-vacio">
          <p id="ala-vacio-texto">{frase('alarmas.vacio')}</p>
        </div>
      ) : null}

      {estado === 'listo' ? (
        <div id="alarmas-lista">
          {alarmas.map((fila, cual) => (
            <TarjetaDeAlarma key={fila.id || cual} fila={fila} irAMensajes={irAMensajes} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
