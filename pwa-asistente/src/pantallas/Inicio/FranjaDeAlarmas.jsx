/* ===================================================
   LA FRANJA DE ALARMAS

   Arriba de todo lo demás del inicio, que es donde está el fichador. Sale de la
   misma función de la base que ve la Familia: la base resuelve quién ve qué y
   devuelve el nombre del otro lado del vínculo.

   Es informativa igual que el fichador: no hay «aprobar», no hay «justificar»,
   no hay total de horas y no dice que nadie haya hecho algo mal —la causa puede
   ser un teléfono sin batería, y el software no la adivina—. Dice que la marca
   quedó a medias, que es un hecho de la propia fichada, y ofrece lo único que se
   puede hacer con eso: preguntar.

   La Prestadora no la ve en ningún caso: la jornada de cada persona es de ella y
   de quien la contrató.

   La base devuelve la clase como clave y no como frase; el texto sale del
   catálogo. Una clase que esta pantalla no sabe nombrar no se dibuja muda: se
   deja afuera y el aviso queda en la consola.

   El molde de cada alarma era una etiqueta `<template>` y acá es la función de
   abajo: la misma estructura, con el nombre escrito como texto y nunca como
   marcado, porque lo escribió otra persona.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';

const FRASE_DE_LA_ALARMA = {
  jornada_abierta: 'alarmas.jornada_abierta',
  salida_sin_entrada: 'alarmas.salida_sin_entrada'
};

function Alarma({ fila, frase, irAMensajes }) {
  /* La fecha y la hora las escribe el mismo lector de siempre, en el idioma de
     la pantalla; acá no se arma ningún formato a mano. */
  const cuando = [Texto.fechaCorta(fila.ocurrio_el), Texto.horaCorta(fila.ocurrio_el)]
    .filter(Boolean).join(' · ');

  /* Los dos huecos van siempre, aunque una de las dos frases no los tenga: la
     que no los usa los ignora. */
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
          conversación no hay a dónde ir: se saca el botón en vez de dejar uno
          que no lleva a ningún lado. */}
      {fila.conversacion_id ? (
        <button
          type="button"
          className="btn btn-primario ancho-total"
          onClick={() => irAMensajes(fila.conversacion_id)}
        >{frase('alarmas.ir_a_la_conversacion')}</button>
      ) : null}
    </div>
  );
}

export default function FranjaDeAlarmas({ visita, base, irAMensajes }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [alarmas, setAlarmas] = useState([]);
  const [aviso, setAviso] = useState('');
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (visita === null || !base) return;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const filas = await base.ClienteDatos.misAlarmas();
        if (!vigente) return;
        const conocidas = (filas || []).filter((fila) => {
          if (FRASE_DE_LA_ALARMA[fila.clase]) return true;
          console.error('Alarma de una clase que esta pantalla no conoce:', fila.clase);
          return false;
        });
        setAlarmas(conocidas);
        setEstado(conocidas.length === 0 ? 'vacio' : 'listo');
      } catch (err) {
        if (!vigente) return;
        console.error('Alarmas del Asistente:', err);
        const cabecera = frase('alarmas.error');
        setAviso(cabecera + ' ' + Texto.mensajeDeError(err, cabecera));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
    /* `frase` se deja afuera a propósito: cambia de identidad con el idioma y
       volver a pedir las alarmas por un cambio de idioma no es lo que hacía la
       pantalla de antes. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visita, base, pedido]);

  return (
    <div className="p-16" id="alarmas-franja">
      <h2 className="m-0 texto-13 peso-700">{frase('alarmas.titulo')}</h2>
      <p className="texto-11 color-secundario m-0 mt-8 mb-12">{frase('alarmas.bajada')}</p>

      <div className="pwa-estado" id="ala-cargando" hidden={estado !== 'cargando'}>
        {frase('alarmas.cargando')}
      </div>

      <div className="pwa-estado" id="ala-error" hidden={estado !== 'error'}>
        <p id="ala-error-texto">{aviso}</p>
        <button
          type="button"
          className="btn btn-primario"
          id="ala-reintentar"
          onClick={() => setPedido((antes) => antes + 1)}
        >{frase('alarmas.reintentar')}</button>
      </div>

      <div className="pwa-estado" id="ala-vacio" hidden={estado !== 'vacio'}>
        <p>{frase('alarmas.vacio')}</p>
      </div>

      <div id="alarmas-lista" hidden={estado !== 'listo'}>
        {alarmas.map((fila, cual) => (
          <Alarma key={fila.id || cual} fila={fila} frase={frase} irAMensajes={irAMensajes} />
        ))}
      </div>
    </div>
  );
}
