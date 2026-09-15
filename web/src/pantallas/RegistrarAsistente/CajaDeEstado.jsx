/* ===================================================
   LA CAJA DE LOS CUATRO ESTADOS DEL ALTA

   Es el `altaMostrar` que la página tenía escrito adentro, tal cual: una sola
   decisión para las dos zonas que esperan datos —el armado del legajo al abrir
   la pantalla y el guardado al cerrarla—, que hacen exactamente lo mismo con
   distinta caja.

   El texto no se escribe acá: entra la clave y la frase sale del catálogo,
   porque un cartel escrito a mano no existe en `en` ni en `pt-BR`. Y sale por
   `Texto.frase`, que si el catálogo no llegó cae en `error.generico` antes que
   dejar la caja muda.

   **El color lo pone la caja de aviso del sitio.** Cada uno de los cuatro
   estados es uno de sus tonos: gris mientras se espera, rojo cuando algo no se
   pudo hacer, amarillo cuando falta algo y verde cuando salió bien. Lo propio
   de esta caja es lo que la de aviso no tiene: la rueda que gira, el traerse
   sola a la vista y el poder llevar un botón adentro.

   Con `cual` vacío la caja desaparece, que es el estado listo: lo que se ve
   entonces es el formulario, no un cartel diciendo que está listo.
=================================================== */

import { useEffect, useRef } from 'react';
import { Texto } from '#comun/frases/lector.js';

const TONO_DEL_ESTADO = {
  cargando: 'neutro',
  error: 'critico',
  vacio: 'atencion',
  listo: 'exito'
};

/* La caja de aviso deja lugar abajo porque casi siempre va arriba de lo que
   anuncia. Acá el hueco lo elige cada pantalla, así que se arranca sin ninguno
   y `clase` trae el que corresponda. */
const CAJA = 'flex alinear-centro gap-10 envolver m-0 ';

export default function CajaDeEstado({ id, cual, clave, huecos, clase = '', children }) {
  const caja = useRef(null);
  const tono = TONO_DEL_ESTADO[cual] || TONO_DEL_ESTADO.cargando;

  /* Lo que no se ve no avisa: con la caja fuera de la pantalla, un error queda
     dicho y nadie lo lee. Se trae a la vista sola, igual que antes. */
  useEffect(() => {
    if (cual !== 'error' && cual !== 'vacio') return;
    if (caja.current) caja.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [cual, clave]);

  return (
    <div
      ref={caja}
      id={id}
      className={'aviso ' + tono + ' ' + CAJA + clase + (cual ? '' : ' oculto')}
    >
      <i
        id={id + '-rueda'}
        className={cual === 'cargando' ? 'fas fa-circle-notch fa-spin' : 'fas fa-circle-notch fa-spin oculto'}
        aria-hidden="true"
      ></i>
      <span id={id + '-texto'}>{clave ? Texto.frase(clave, huecos) : ''}</span>
      {children}
    </div>
  );
}
