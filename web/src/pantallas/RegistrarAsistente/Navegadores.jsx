/* ===================================================
   EL PANE DE UN PASO Y SUS DOS BOTONES

   Los siete pasos se dibujan siempre y se muestran de a uno, igual que antes:
   el que no toca queda escondido, no sacado. **Eso no es una comodidad, es lo
   que hace que el envío pueda revisar los siete** —el formulario se valida paso
   por paso al enviarse, y a un campo que no está en el documento no se lo puede
   mirar—.

   Los botones de Anterior y Siguiente Paso estaban escritos seis veces cada uno,
   siempre iguales salvo por el número al que llevan. Acá se escriben una vez.
=================================================== */

import { useFrases } from '../../frases/ProveedorDeFrases.jsx';

export function Pane({ numero, paso, children }) {
  const seVe = numero === paso;
  return (
    <div
      className={seVe ? 'wizard-step-pane' : 'wizard-step-pane oculto'}
      id={`step-pane-${numero}`}
      style={{ display: seVe ? 'block' : 'none' }}
    >
      {children}
    </div>
  );
}

/* La botonera del pie de cada paso. Con `anterior` en blanco —el paso 1— queda
   sólo el de seguir, pegado a la derecha, que es como estaba escrito. */
export function Navegadores({ anterior, siguiente, irAlPaso, seguir, children }) {
  const { frase } = useFrases();

  if (!anterior) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button type="button" className="btn btn-primario btn-next-step" data-next={siguiente}
          onClick={() => seguir(siguiente)}>
          <span>{frase('alta.siguiente_paso')}</span> <i className="fas fa-arrow-right ml-8"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="flex justificar-entre mt-24">
      <button
        type="button"
        className="btn btn-sobre-oscuro btn-prev-step borde-color-tarjeta color-secundario"
        data-prev={anterior}
        onClick={() => irAlPaso(anterior)}
      >
        <i className="fas fa-arrow-left mr-8"></i> <span>{frase('alta.anterior')}</span>
      </button>
      {children || (
        <button type="button" className="btn btn-primario btn-next-step" data-next={siguiente}
          onClick={() => seguir(siguiente)}>
          <span>{frase('alta.siguiente_paso')}</span> <i className="fas fa-arrow-right ml-8"></i>
        </button>
      )}
    </div>
  );
}
