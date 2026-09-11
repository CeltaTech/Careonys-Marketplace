/* ===================================================
   PASO 4 — CUÁNDO PUEDE TRABAJAR

   Las modalidades que acepta, si trabaja con retiro o sin retiro, el valor de
   la hora y la grilla de días y turnos.

   **Dos casillas vienen tildadas de entrada** —por horas, y con retiro—, que es
   lo que declara el catálogo como lo más común; quien trabaje de otra manera
   las cambia. Cuáles son no se decide acá.

   Los cuatro renglones de la grilla —el título, la bajada, la grilla en sí y la
   ayuda— los llena el módulo de disponibilidad, el mismo que usa el portal. El
   título dice que está cargando mientras los textos viajan, y si algo falla lo
   dice ahí mismo: antes no había ningún aviso y el paso se quedaba con tres
   renglones en blanco, que es exactamente lo que se ve cuando no hay franjas.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { CasillasDelCatalogo } from '../../piezas/DelCatalogo.jsx';

const POR_HORAS = ['horas'];
const CON_RETIRO = ['con_retiro'];

export default function PasoCuatro({ activo, irA, disponibilidad }) {
  const { frase } = useFrases();

  return (
    <div className={activo ? 'wpane active' : 'wpane'} id="wp4">
      <h3><i className="fas fa-calendar-alt"></i> <span>{frase('legajo.paso4_titulo')}</span></h3>

      <p className="texto-12 peso-700 color-principal mb-6">{frase('legajo.modalidades')}</p>
      <CasillasDelCatalogo
        className="wcheck-group mb-14"
        clave="modalidad_contratacion"
        nombre="modalidad_contratacion"
        clase="catalogo-casilla"
        marcados={POR_HORAS}
      />

      <p className="texto-12 peso-700 color-principal mb-6">{frase('legajo.retiro')}</p>
      <CasillasDelCatalogo
        className="wcheck-group mb-14"
        clave="retiro"
        nombre="retiro"
        clase="catalogo-casilla"
        marcados={CON_RETIRO}
      />

      <div className="wfield" style={{ maxWidth: '180px' }}>
        <label>{frase('legajo.valor_hora')}</label>
        <input type="number" id="w-valor-hora" placeholder={frase('legajo.valor_hora_ejemplo')} required />
      </div>

      <p id="disponibilidad-titulo" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--texto-principal)', margin: '12px 0 2px' }}>
        {disponibilidad.titulo}
      </p>
      <p id="disponibilidad-bajada" style={{ fontSize: '10px', color: 'var(--texto-secundario)', margin: '0 0 4px' }}>
        {disponibilidad.bajada}
      </p>
      <div id="grilla-disponibilidad"></div>
      <p id="disponibilidad-ayuda" style={{ fontSize: '10px', color: 'var(--texto-secundario)', margin: '6px 0 0' }}>
        {disponibilidad.ayuda}
      </p>
      <div id="preguntas-disponibilidad"></div>

      <div className="wnav">
        <button type="button" className="wbtn-prev" onClick={() => irA(3)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <button type="button" className="wbtn-next" onClick={() => irA(5)}>
          <span>{frase('legajo.siguiente')}</span> <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
