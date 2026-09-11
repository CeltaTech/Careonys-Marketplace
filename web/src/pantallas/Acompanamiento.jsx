/* ===================================================
   ACOMPAÑAMIENTO EN LÍNEA

   Pantalla pública, demostrativa: no consulta la base. Por eso no carga el
   cliente de datos ni el de sesión, igual que antes.

   Las ocho tarjetas de «qué incluye» están escritas acá y no en el catálogo de
   la base a propósito: son el contenido de una página de presentación, no una
   lista de opciones que alguien elija. Lo que sí sale del catálogo son las
   frases, las ocho y todas las demás.
=================================================== */

import { useFrases } from '../frases/ProveedorDeFrases.jsx';
import { usePestana } from '../armazon/usePestana.js';
import FormularioDeConsulta from '../formularios/FormularioDeConsulta.jsx';

const QUE_INCLUYE = [
  { icono: '💬', titulo: 'acompanamiento.mensajes_titulo', texto: 'acompanamiento.mensajes_texto' },
  { icono: '📹', titulo: 'acompanamiento.videollamadas_titulo', texto: 'acompanamiento.videollamadas_texto' },
  { icono: '🧠', titulo: 'acompanamiento.apoyo_psicologico_titulo', texto: 'acompanamiento.apoyo_psicologico_texto' },
  { icono: '📋', titulo: 'acompanamiento.plan_titulo', texto: 'acompanamiento.plan_texto' },
  { icono: '🩺', titulo: 'acompanamiento.orientacion_medica_titulo', texto: 'acompanamiento.orientacion_medica_texto' },
  { icono: '📚', titulo: 'acompanamiento.material_titulo', texto: 'acompanamiento.material_texto' },
  { icono: '👥', titulo: 'acompanamiento.grupos_titulo', texto: 'acompanamiento.grupos_texto' },
  { icono: '🚨', titulo: 'acompanamiento.urgencias_titulo', texto: 'acompanamiento.urgencias_texto' }
];

export default function Acompanamiento() {
  const { frase } = useFrases();

  usePestana('acompanamiento.titulo');

  return (
    <>
      <section className="inner-hero">
        <h1>{frase('acompanamiento.titulo')}</h1>
        <p>{frase('acompanamiento.bajada')}</p>
        <a href="#contacto" className="btn btn-atencion">{frase('acompanamiento.pedir_consulta')}</a>
      </section>

      <section className="feature-section">
        <div className="feature-layout">
          <div className="feature-text fade-in">
            <p className="eyebrow">{frase('acompanamiento.que_es_rotulo')}</p>
            <h2>{frase('acompanamiento.que_es_titulo')}</h2>
            <p>{frase('acompanamiento.que_es_texto')}</p>
            <p className="mt-12">{frase('acompanamiento.desde_donde')}</p>
          </div>
          <div className="feature-image fade-in">
            <img
              className="alto-400 cubrir redondeo-grande"
              src="/assets/images/acompanamiento_online.png"
              alt={frase('acompanamiento.titulo')}
            />
          </div>
        </div>
      </section>

      <section className="help-section fondo-superficie">
        <div className="container">
          <h2 className="fade-in">{frase('acompanamiento.que_incluye')}</h2>
          <div className="help-grid">
            {QUE_INCLUYE.map(({ icono, titulo, texto }) => (
              <div className="help-card fade-in" key={titulo}>
                <div className="icon" aria-hidden="true">{icono}</div>
                <h4>{frase(titulo)}</h4>
                <p>{frase(texto)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="cta-banner">
        {/* El botón se lee en mayúsculas por el estilo de `.cta-banner .btn`, no
            por cómo esté escrita la frase: en el catálogo va en su forma normal. */}
        <a href="#contacto" className="btn btn-atencion">{frase('acompanamiento.consultar_ahora')}</a>
      </div>

      <section className="contact-section" id="contacto">
        <div className="contact-layout">
          <div className="contact-image fade-in">
            <img src="/assets/images/mujer_consultando.png" alt={frase('pie.contacto')} />
          </div>
          <div className="contact-form fade-in">
            <h2>{frase('acompanamiento.consulta_titulo')}</h2>
            <p>{frase('acompanamiento.consulta_bajada')}</p>
            <FormularioDeConsulta />
          </div>
        </div>
      </section>
    </>
  );
}
