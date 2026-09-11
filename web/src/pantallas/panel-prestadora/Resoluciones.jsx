/* ===================================================
   LAS RESOLUCIONES ANTERIORES DEL LEGAJO

   El motivo por el que se otorga el aval o se rechaza un legajo vive en su
   propia tabla y no en el legajo, y no es un detalle de implementación: lo
   escribe el personal de la Prestadora **sobre** una persona, y esa persona no
   lo tiene que poder leer. Una columna en el legajo viaja adentro de la fila
   que el Asistente sí puede ver.

   Es historial y no un campo: un legajo puede resolverse más de una vez, y cada
   resolución conserva su motivo, su fecha y quién firmó.

   **Los cuatro estados**: cargando y error en el cartel propio, «todavía no se
   resolvió ninguna vez» dicho aparte, y listo con la lista. El cartel es propio
   y no el de la tabla de arriba por lo de siempre: dos cargas que corren casi a
   la vez sobre un cartel único se borran entre ellas.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo } from '#comun/frases/lector.js';
import Cartel from './Cartel.jsx';

/* El estado en el que quedó el legajo se muestra con la misma frase que usa la
   tabla de arriba, para que la misma cosa no se llame de dos maneras en la
   misma pantalla. Un estado que todavía no tiene frase se dice como estado
   desconocido en vez de quedar en blanco: un renglón sin estado se lee como si
   la resolución no hubiera resuelto nada. */
const FRASE_DE_ESTADO = {
  en_revision: 'panel.estado_en_revision',
  validado_prestadora: 'panel.estado_validado',
  rechazado: 'panel.estado_rechazado'
};

export default function Resoluciones({ base, caregiverId, token }) {
  const { frase } = useFrases();

  const [cartel, setCartel] = useState({ tono: 'info', clave: 'panel.resoluciones_cargando' });
  const [filas, setFilas] = useState([]);

  useEffect(() => {
    let vigente = true;
    setFilas([]);
    setCartel({ tono: 'info', clave: 'panel.resoluciones_cargando' });

    (async () => {
      let traidas;
      try {
        traidas = await base.ClienteDatos.resolucionesDeLegajo(caregiverId);
      } catch (err) {
        console.error('Panel de la Prestadora, resoluciones del legajo:', err);
        if (vigente) setCartel({ tono: 'critico', clave: 'panel.resoluciones_error' });
        return;
      }
      if (!vigente) return;

      if (!traidas || !traidas.length) {
        setCartel({ tono: 'neutro', clave: 'panel.resoluciones_ninguna' });
        return;
      }

      setFilas(traidas);
      setCartel(null);
    })();

    return () => { vigente = false; };
  }, [base, caregiverId, token]);

  return (
    <div style={{
      background: 'var(--superficie-hundida)', padding: '16px', borderRadius: '12px',
      margin: '16px 0', border: '1px solid var(--borde-card)'
    }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--texto-titulo)' }}>
        {frase('panel.resoluciones_titulo')}
      </h4>
      <p className="texto-11 color-secundario m-0 mb-12">
        {frase('panel.resoluciones_bajada')}
      </p>

      <Cartel tono={cartel && cartel.tono} clave={cartel && cartel.clave}
        huecos={cartel && cartel.huecos} />

      <div>
        {filas.map((fila, cual) => (
          <div className="mb-12" key={fila.id || cual}>
            <div className="flex gap-12 texto-12 peso-700 alinear-centro justificar-entre">
              <span>
                {frase(FRASE_DE_ESTADO[fila.estado] || 'panel.resoluciones_estado_desconocido')}
              </span>
              <span className="texto-11 color-secundario peso-400">
                {new Date(fila.created_at).toLocaleString(Catalogo.idioma)}
              </span>
            </div>
            {/* El motivo lo escribió una persona: se dibuja como texto, que es
                lo que hacía `textContent`, y nunca como marcado. */}
            <p className="texto-12 m-0 mt-4">{fila.motivo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
