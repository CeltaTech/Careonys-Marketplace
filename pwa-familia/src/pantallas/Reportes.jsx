/* ===================================================
   LOS REPORTES DE CUIDADO

   La línea de tiempo de lo que el Asistente fue anotando: la nota del día y,
   cuando las tomó, las mediciones. Se pide cada vez que se entra a la pantalla,
   igual que antes.

   Los cuatro estados están todos, con la misma forma que tenían: un cartel
   centrado mientras se pide, otro si no hay nada, y otro en rojo si falló. El
   error se guarda como clave del catálogo y no como texto ya escrito, así que
   cambiar de idioma con el aviso a la vista lo cambia también a él.

   Las tres etiquetas de la línea chica son las mismas que rotulan el formulario
   donde el Asistente cargó el dato, así que salen de las mismas claves: dos
   textos para una sola cosa se despegan el día que alguien corrige uno.

   La hora sale de `Texto.horaCorta`, que ya le da la forma del idioma de la
   pantalla; acá no se arma ningún formato a mano.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';
import BarraDeAbajo from './BarraDeAbajo.jsx';

const ESTILO_DEL_CARTEL = {
  textAlign: 'center', fontSize: '12px', color: 'var(--texto-secundario)', padding: '20px'
};

const ESTILO_DEL_CARTEL_ROTO = {
  textAlign: 'center', fontSize: '12px', color: 'var(--rojo-peligro-texto)', padding: '20px'
};

export default function Reportes({ activa, pedido, navegar }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [anotaciones, setAnotaciones] = useState([]);
  const [claveDelError, setClaveDelError] = useState('');

  useEffect(() => {
    if (!pedido) return undefined;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const { ClienteDatos } = await conLaBase();
        const traidas = await ClienteDatos.getReportes();
        if (!vigente) return;
        if (!traidas || traidas.length === 0) { setAnotaciones([]); setEstado('vacio'); return; }
        setAnotaciones(traidas);
        setEstado('listo');
      } catch (err) {
        if (!vigente) return;
        setClaveDelError(Texto.claveDeError(err, 'cargar los reportes'));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [pedido]);

  return (
    <div className={'app-screen pb-64' + (activa ? ' active' : '')} id="screen-reportes">
      <div className="app-header">
        <button className="btn-back" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{frase('familia.reportes_titulo')}</h1>
        <div className="ancho-24"></div>
      </div>

      <div className="timeline-log" id="timeline-log-list">
        {estado === 'cargando' ? <p style={ESTILO_DEL_CARTEL}>{frase('reporte.cargando')}</p> : null}
        {estado === 'vacio' ? <p style={ESTILO_DEL_CARTEL}>{frase('familia.reportes_vacio')}</p> : null}
        {estado === 'error' ? <p style={ESTILO_DEL_CARTEL_ROTO}>{frase(claveDelError)}</p> : null}
        {estado === 'listo'
          ? anotaciones.map((anotacion, cual) => (
            <Anotacion key={anotacion.id || cual} anotacion={anotacion} />
          ))
          : null}
      </div>

      <BarraDeAbajo actual="reportes" navegar={navegar} />
    </div>
  );
}

function Anotacion({ anotacion }) {
  const { frase } = useFrases();
  const icono = anotacion.blood_pressure ? 'fa-heartbeat' : 'fa-check';
  const cuando = anotacion.created_at ? Texto.horaCorta(anotacion.created_at) : frase('reporte.recien');
  const titulo = anotacion.blood_pressure ? frase('reporte.tipo_signos') : frase('reporte.tipo_nota');
  const sinDato = frase('reporte.sin_dato');

  return (
    <div className="log-item">
      <div className="log-dot">
        <i className={'fas ' + icono} style={{ fontSize: '8px', color: 'var(--marca-prestadora-acento)' }}></i>
      </div>
      <div className="log-content">
        <span className="time">{cuando}</span>
        <h5>{titulo}</h5>
        <p>{anotacion.daily_notes}</p>
        {anotacion.blood_pressure ? (
          <p className="mt-4 texto-11 color-azul-medio">
            {'🩺 ' + frase('reporte.presion') + ': ' + anotacion.blood_pressure
              + ' | ' + frase('reporte.glucemia') + ': ' + (anotacion.glycemia || sinDato)}
          </p>
        ) : null}
        {anotacion.medications_administered ? (
          <p style={{ marginTop: '2px', fontSize: '10px', color: 'var(--verde-exito-texto)' }}>
            {'💊 ' + frase('reporte.medicamentos') + ': ' + anotacion.medications_administered}
          </p>
        ) : null}
      </div>
    </div>
  );
}
