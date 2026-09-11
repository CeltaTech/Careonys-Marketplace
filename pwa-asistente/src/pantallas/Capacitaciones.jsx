/* ===================================================
   MIS CAPACITACIONES

   Los cursos que la Prestadora publicó, con cómo va cada evaluación. Lo que se
   rinda queda en el legajo, a la vista de la Prestadora.

   El molde de cada tarjeta era una etiqueta `<template>` y acá es la función de
   abajo: la misma estructura. El nombre y la descripción los escribió otra
   persona y entran como texto, nunca como marcado.

   **El singular y el plural son frases enteras**, no una frase con una letra
   pegada al final: en inglés «once» no sale de agregarle nada a «times». La
   clave se escribe adentro de cada llamada, para que el chequeo del catálogo la
   vea.

   El examen vive en una pantalla del sitio y no en la aplicación: el botón de
   rendir lleva ahí, y sale sólo si hay algo que rendir.
=================================================== */

import { useEffect, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Catalogo, Texto } from '#comun/frases/lector.js';

/* Cómo le fue a esta persona con la evaluación de un curso: qué se lee, de qué
   color y con qué icono. */
function capResultado(frase, evaluacion, intentos) {
  if (!evaluacion) {
    return {
      texto: frase('capacitacion.sin_evaluacion'),
      clase: 'pendiente',
      icono: 'fa-circle-info'
    };
  }
  const mios = intentos.filter((i) => i.evaluacion_id === evaluacion.id);
  const aprobado = mios.filter((i) => i.aprobado)[0];
  if (aprobado) {
    return {
      texto: frase('capacitacion.aprobada', {
        porcentaje: aprobado.porcentaje,
        fecha: Texto.fechaCorta(aprobado.rendido_el)
      }),
      clase: 'aprobado',
      icono: 'fa-circle-check'
    };
  }
  if (mios.length === 0) {
    return {
      texto: frase('capacitacion.sin_rendir'),
      clase: 'pendiente',
      icono: 'fa-circle-dot'
    };
  }

  const veces = mios.length === 1
    ? frase('capacitacion.rendida_una')
    : frase('capacitacion.rendida_varias', { veces: mios.length });

  const quedan = (evaluacion.intentos_maximos || 0) - mios.length;
  let restantes;
  if (quedan <= 0) restantes = frase('capacitacion.sin_intentos');
  else if (quedan === 1) restantes = frase('capacitacion.queda_un_intento');
  else restantes = frase('capacitacion.quedan_intentos', { quedan: quedan });

  return {
    texto: veces + ' ' + restantes,
    clase: 'pendiente',
    icono: 'fa-circle-exclamation'
  };
}

function Curso({ curso, evaluacion, intentos, frase }) {
  const resultado = capResultado(frase, evaluacion, intentos);
  const nombre = Catalogo.textoDe(curso.nombre_i18n);
  const descripcion = Catalogo.textoDe(curso.descripcion_i18n);

  /* Las horas y el certificado son de este renglón; el nivel y la modalidad son
     claves guardadas y su texto sale del catálogo. La etiqueta que no está en el
     vocabulario devuelve vacío, y entonces no se dibuja nada: es preferible que
     falte el dato a que la tarjeta muestre la clave en crudo. */
  const datos = [];
  if (curso.horas) datos.push(curso.horas + (curso.horas === 1 ? ' hora' : ' horas'));
  const nivel = Catalogo.etiquetaSiExiste('nivel_curso', curso.nivel);
  if (nivel) datos.push(nivel);
  const modalidad = Catalogo.etiquetaSiExiste('modalidad_curso', curso.modalidad);
  if (modalidad) datos.push(modalidad);
  if (curso.otorga_certificado) datos.push('Otorga certificado');

  const usados = evaluacion
    ? intentos.filter((i) => i.evaluacion_id === evaluacion.id).length
    : 0;
  const seRinde = evaluacion && resultado.clase !== 'aprobado' &&
    (evaluacion.intentos_maximos || 0) > usados;

  return (
    <div className="curso-tarjeta">
      <h3>{nombre}</h3>
      {descripcion ? <p>{descripcion}</p> : null}
      {datos.length === 0 ? null : (
        <div className="curso-datos">
          {datos.map((texto, cual) => <span className="curso-dato" key={cual}>{texto}</span>)}
        </div>
      )}
      <div className={'curso-resultado curso-resultado-' + resultado.clase}>
        <i className={'fas ' + resultado.icono}></i>
        <span>{resultado.texto}</span>
      </div>
      {seRinde ? (
        <a
          className="btn btn-primario"
          href={'../examen.html?evaluacion=' + encodeURIComponent(evaluacion.clave)}
        >{frase('capacitacion.rendir')}</a>
      ) : null}
    </div>
  );
}

export default function Capacitaciones({ activa, visita, base, navegar }) {
  const { frase } = useFrases();
  const [estado, setEstado] = useState('cargando');
  const [cursos, setCursos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [intentos, setIntentos] = useState([]);
  const [aviso, setAviso] = useState('');
  const [pedido, setPedido] = useState(0);

  useEffect(() => {
    if (visita === null || !base) return;
    let vigente = true;
    setEstado('cargando');
    (async () => {
      try {
        const [losCursos, lasEvaluaciones, losIntentos] = await Promise.all([
          base.ClienteDatos.getCursos(),
          base.ClienteDatos.getEvaluaciones(),
          base.ClienteDatos.getIntentosEvaluacion()
        ]);
        await Catalogo.cargar();
        if (!vigente) return;
        if (!losCursos || losCursos.length === 0) { setEstado('vacio'); return; }
        setCursos(losCursos);
        setEvaluaciones(lasEvaluaciones || []);
        setIntentos(losIntentos || []);
        setEstado('listo');
      } catch (err) {
        if (!vigente) return;
        setAviso(Texto.mensajeDeError(err, 'traer sus capacitaciones'));
        setEstado('error');
      }
    })();
    return () => { vigente = false; };
  }, [visita, base, pedido]);

  return (
    <div className={activa ? 'app-screen active' : 'app-screen'} id="screen-capacitaciones">
      <div className="wizard-header-bar">
        <button type="button" className="btn-volver-cabecera" id="cap-volver" onClick={() => navegar('dashboard')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>{frase('capacitacion.titulo')}</h2>
      </div>

      <div className="capacitaciones-cuerpo">
        <div className="pwa-estado" id="cap-cargando" hidden={estado !== 'cargando'}>
          {frase('capacitacion.cargando')}
        </div>

        <div className="pwa-estado" id="cap-error" hidden={estado !== 'error'}>
          <p id="cap-error-texto">{aviso}</p>
          <button
            type="button"
            className="btn btn-primario"
            id="cap-reintentar"
            onClick={() => setPedido((antes) => antes + 1)}
          >{frase('acceso.reintentar')}</button>
        </div>

        <div className="pwa-estado" id="cap-vacio" hidden={estado !== 'vacio'}>
          <p>{frase('capacitacion.vacio')}</p>
          <p className="pwa-estado-bajada">{frase('capacitacion.vacio_bajada')}</p>
        </div>

        <div id="cap-listo" hidden={estado !== 'listo'}>
          <p className="capacitaciones-bajada">{frase('capacitacion.aclaracion')}</p>
          <div id="cap-lista">
            {cursos.map((curso) => (
              <Curso
                key={curso.id}
                curso={curso}
                evaluacion={evaluaciones.filter((e) => e.curso_id === curso.id)[0] || null}
                intentos={intentos}
                frase={frase}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
