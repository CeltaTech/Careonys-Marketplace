/* ===================================================
   PASO 3 — CON QUÉ TIENE EXPERIENCIA

   Las patologías que ya atendió y las tareas que está autorizado a hacer, más
   la ficha de experiencia laboral.

   Las dos listas salen del catálogo. Escribirlas acá sería fijar en una
   pantalla algo que cada Prestadora define, y dejarían de coincidir con las que
   ve la Familia cuando busca.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { CasillasDelCatalogo } from '#comun/formularios/DelCatalogo.jsx';

export default function PasoTres({ activo, irA }) {
  const { frase } = useFrases();

  return (
    <div className={activo ? 'wpane active' : 'wpane'} id="wp3">
      <h3><i className="fas fa-clipboard-list"></i> <span>{frase('legajo.paso3_titulo')}</span></h3>

      <p className="texto-12 peso-700 color-principal mb-8">{frase('legajo.patologias')}</p>
      <CasillasDelCatalogo
        className="wcheck-group mb-16"
        clave="patologia"
        nombre="patologia"
        clase="catalogo-casilla"
      />

      <p className="texto-12 peso-700 color-principal mb-8">{frase('legajo.tareas')}</p>
      <CasillasDelCatalogo
        className="wcheck-group"
        clave="tarea_cuidado"
        nombre="tarea_cuidado"
        clase="catalogo-casilla"
      />

      <div id="ficha-experiencia_laboral" className="mt-16"></div>

      <div className="wnav">
        <button type="button" className="wbtn-prev" onClick={() => irA(2)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <button type="button" className="wbtn-next" onClick={() => irA(4)}>
          <span>{frase('legajo.siguiente')}</span> <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  );
}
