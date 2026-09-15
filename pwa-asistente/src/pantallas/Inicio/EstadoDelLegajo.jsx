/* ===================================================
   EL RENGLÓN QUE DICE CÓMO VA EL LEGAJO

   Los cuatro estados de un renglón solo. **Cargando**: mientras se pregunta lo
   dice, porque antes ese renglón se quedaba con lo que trajera la pantalla y no
   se distinguía de una respuesta ya llegada. **Vacío**: no hay legajo, y se
   dice. **Error**: no se pudo preguntar, y se dice cuál fue el problema en vez
   del «sin conexión» que se escribía pasara lo que pasara. Y los cuatro textos
   salen del catálogo.

   **El renglón guarda la clave de la frase y no la frase.** Así un cambio de
   idioma con el renglón ya escrito también lo alcanza.

   Se pregunta cuando aparece quien inició sesión —al arrancar con sesión
   guardada, o al entrar—, y no cada vez que se vuelve al inicio: es lo mismo que
   hacía la pantalla de antes.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';

export default function EstadoDelLegajo({ base, usuario, navegar }) {
  const { frase } = useFrases();
  const [clave, setClave] = useState('');

  useEffect(() => {
    if (!base || !usuario) return;
    let vigente = true;
    setClave('comun.cargando');
    (async () => {
      try {
        const aspirantes = await base.ClienteDatos.getAspirantes();
        if (!vigente) return;
        if (!aspirantes || aspirantes.length === 0) {
          setClave('asistente.legajo_sin_legajo');
          return;
        }
        /* El legajo de quien inició sesión, buscado por su correo. */
        const correo = usuario.id ? (await base.Sesion.getSession())?.user?.email : null;
        if (!vigente) return;
        const asp = (correo && aspirantes.find((a) => a.email === correo)) || aspirantes[0];
        setClave(asp.estado === 'validado_prestadora'
          ? 'asistente.legajo_validado'
          : 'asistente.legajo_tramitando');
      } catch (err) {
        if (!vigente) return;
        console.error('Estado del legajo del Asistente:', err);
        setClave(Texto.claveDeError(err, 'traer el estado del legajo'));
      }
    })();
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, usuario]);

  return (
    <div className="status-badge-container mt-16" id="status-container">
      <i className="fas fa-user-check color-info texto-20"></i>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <h5 className="m-0 texto-13 color-info peso-700">{frase('asistente.estado_legajo')}</h5>
        <p id="legajo-estado-txt" className="m-solo-arriba-2 texto-11 color-info">
          {frase(clave || 'asistente.cargando_estado')}
        </p>
      </div>
      <button
        type="button"
        onClick={() => navegar('registro')}
        style={{
          fontSize: '10px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '8px',
          background: 'var(--azul-medio)',
          color: 'var(--texto-sobre-color)',
          border: 'none',
          cursor: 'pointer'
        }}
      >{frase('asistente.completar')}</button>
    </div>
  );
}
