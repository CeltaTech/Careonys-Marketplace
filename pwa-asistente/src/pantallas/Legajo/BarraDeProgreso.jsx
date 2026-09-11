/* ===================================================
   LOS CINCO PASOS, Y EN CUÁL SE ESTÁ

   Un legajo es largo, y sin esta barra quien lo carga no sabe cuánto le falta.
   Los pasos ya andados quedan con el tilde, el de ahora con el número resaltado
   y el rótulo encendido, y los que vienen con su número apagado.

   Los rótulos salen del catálogo, uno por paso. No se arman con el número
   pegado a una palabra: el orden de las palabras cambia de un idioma a otro.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

const ROTULOS = [
  'legajo.paso1_rotulo',
  'legajo.paso2_rotulo',
  'legajo.paso3_rotulo',
  'legajo.paso4_rotulo',
  'legajo.paso5_rotulo'
];

export default function BarraDeProgreso({ paso }) {
  const { frase } = useFrases();

  return (
    <div className="wizard-progress-bar" id="wizard-progress">
      {ROTULOS.map((clave, indice) => {
        const cual = indice + 1;
        const hecho = cual < paso;
        const aca = cual === paso;
        return (
          <div className="wstep" key={clave}>
            <div
              className={'wstep-circle' + (hecho ? ' done' : '') + (aca ? ' active' : '')}
              id={'wc' + cual}
            >{hecho ? '✓' : cual}</div>
            <span className={'wstep-label' + (aca ? ' active' : '')}>{frase(clave)}</span>
          </div>
        );
      })}
    </div>
  );
}
