/* ===================================================
   LO QUE SE LEE ANTES DEL FORMULARIO

   La parte de arriba del alta: por qué sumarse, cómo es el recorrido y los dos
   botones que bajan al formulario. Es texto y dibujo, sin ninguna decisión
   adentro, así que vive aparte del archivo que sí decide.

   Los dos enlaces siguen apuntando a `#registro`, que es el ancla del
   formulario y el destino de los ocho «Registrarme» del sitio: se muda con el
   formulario, nunca con el envoltorio.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { aLaImagen } from '../../armazon/direcciones.js';

const BENEFICIOS = [
  { icono: '💼', titulo: 'alta.beneficio_oportunidades', texto: 'alta.beneficio_oportunidades_texto' },
  { icono: '⭐', titulo: 'alta.beneficio_calificacion', texto: 'alta.beneficio_calificacion_texto' },
  { icono: '📱', titulo: 'alta.beneficio_aplicacion', texto: 'alta.beneficio_aplicacion_texto' },
  { icono: '🎓', titulo: 'alta.beneficio_capacitacion', texto: 'alta.beneficio_capacitacion_texto' },
  { icono: '🛡️', titulo: 'alta.beneficio_documentos', texto: 'alta.beneficio_documentos_texto' },
  { icono: '💰', titulo: 'alta.beneficio_condiciones', texto: 'alta.beneficio_condiciones_texto' },
  { icono: '🗓️', titulo: 'alta.beneficio_flexibilidad', texto: 'alta.beneficio_flexibilidad_texto' },
  { icono: '🤝', titulo: 'alta.beneficio_comunidad', texto: 'alta.beneficio_comunidad_texto' }
];

const PASOS_DEL_RECORRIDO = [
  { titulo: 'alta.paso_descargar', texto: 'alta.paso_descargar_texto' },
  { titulo: 'alta.paso_legajo', texto: 'alta.paso_legajo_texto' },
  { titulo: 'alta.paso_identidad', texto: 'alta.paso_identidad_texto' },
  { titulo: 'alta.paso_postularse', texto: 'alta.paso_postularse_texto' },
  { titulo: 'alta.paso_acordar', texto: 'alta.paso_acordar_texto' }
];

export default function Presentacion() {
  const { frase } = useFrases();

  return (
    <>
      <section className="inner-hero">
        <h1>{frase('nav.registrarme_asistente')}</h1>
        <p>{frase('alta.hero_bajada')}</p>
        <div className="flex gap-16 justificar-centro envolver">
          <a href="#registro" className="btn btn-atencion">{frase('alta.hero_registrarme')}</a>
          <a href="#beneficios" className="btn btn-sobre-oscuro">{frase('alta.hero_beneficios')}</a>
        </div>
      </section>

      <section className="help-section" id="beneficios">
        <div className="container">
          <h2 className="fade-in">{frase('alta.beneficios_titulo')}</h2>
          <div className="help-grid">
            {BENEFICIOS.map(({ icono, titulo, texto }) => (
              <div className="help-card fade-in" key={titulo}>
                <div className="icon">{icono}</div>
                <h4>{frase(titulo)}</h4>
                <p>{frase(texto)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="steps-section fondo-superficie">
        <div className="container">
          <h2 className="fade-in">{frase('alta.pasos_titulo')}</h2>
          <div className="steps-layout">
            <div className="steps-phone fade-in">
              <div className="fondo-azul-oscuro redondeo-40 p-14 ancho-maximo-280 m-centrado sombra-alta">
                <div style={{ background: 'var(--azul-medio)', borderRadius: '28px', overflow: 'hidden', padding: '20px', minHeight: '360px' }}>
                  <div className="color-sobre-color centrar-texto mb-14">
                    <img
                      src={aLaImagen('assets/images/perfil_marisa.png')}
                      style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--borde-sobre-color)' }}
                      alt=""
                    />
                  </div>
                  <div className="color-sobre-color centrar-texto peso-700 texto-14">{frase('alta.demo_nombre')}</div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '10px 0' }}>
                    <div className="fondo-velo-oscuro color-sobre-color p-6-12 redondeo-20 texto-11 peso-700">
                      {frase('alta.demo_nivel')}
                    </div>
                    <div style={{ background: 'var(--velo-oscuro-sobre-color)', color: 'var(--texto-sobre-color-tenue)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px' }}>
                      {frase('alta.demo_sin_calificar')}
                    </div>
                  </div>
                  <div style={{ background: 'var(--velo-modal)', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
                    <div style={{ color: 'var(--texto-sobre-color-tenue)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                      {frase('alta.demo_rotulo_tipo')}
                    </div>
                    <div className="color-sobre-color texto-13">{frase('alta.demo_tipo')}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="steps-list">
              {PASOS_DEL_RECORRIDO.map(({ titulo, texto }, cuantos) => (
                <div className="step-item fade-in" key={titulo}>
                  <div className="step-number">{cuantos + 1}</div>
                  <div className="step-content">
                    <h4>{frase(titulo)}</h4>
                    <p>{frase(texto)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="cta-banner">
        <a href="#registro" className="btn btn-atencion">{frase('alta.cta_registrarme')}</a>
      </div>
    </>
  );
}
