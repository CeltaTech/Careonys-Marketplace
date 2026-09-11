/* ===================================================
   LOS SIETE NODOS DE LA BARRA DE PROGRESO

   Estaban escritos siete veces seguidas, iguales salvo por el número y el
   rótulo, y los colores los repintaba `goToStep` a mano en cada salto. Acá se
   dibujan desde la lista y el color sale del número: el del paso en el que se
   está, el de los que ya pasaron, y el de los que faltan. Son exactamente los
   tres que usaba la página, con los mismos nombres de color.
=================================================== */

import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';

/* El rótulo de cada paso, en el orden en que se recorren. Las claves son las
   que la página ya usaba, y se dejan como están: `legajo.paso2_rotulo` rotula
   el quinto porque el legajo se movió de lugar y la clave se quedó donde
   estaba —lo que se guarda se nombra por lo que hace y no se renombra—. */
const LOS_SIETE = [
  'legajo.paso1_rotulo',
  'alta.rotulo_formacion',
  'legajo.paso3_rotulo',
  'legajo.paso4_rotulo',
  'legajo.paso2_rotulo',
  'alta.rotulo_documentos',
  'alta.rotulo_cierre'
];

function colorDelCirculo(numero, paso) {
  if (numero === paso) return { background: 'var(--azul-medio)', color: 'var(--texto-sobre-color)' };
  if (numero < paso) return { background: 'var(--azul-oscuro)', color: 'var(--texto-sobre-color)' };
  return { background: 'var(--tono-neutro-fondo)', color: 'var(--texto-secundario)' };
}

export default function BarraDePasos({ paso }) {
  const { frase } = useFrases();

  return (
    <div
      className="wizard-progress"
      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative' }}
    >
      {LOS_SIETE.map((rotulo, cuantos) => {
        const numero = cuantos + 1;
        return (
          <div
            key={rotulo}
            className={'wizard-step-node flex-1 centrar-texto z-2' + (numero <= paso ? ' active' : '')}
            data-step={numero}
          >
            <div
              className="wizard-step-circle ancho-36 alto-36 circulo fondo-neutro color-secundario flex alinear-centro justificar-centro m-centrado-abajo-8 peso-700 transicion"
              style={colorDelCirculo(numero, paso)}
            >
              {numero}
            </div>
            <span className="wizard-step-label texto-11 peso-700 color-secundario mayusculas">
              {frase(rotulo)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
