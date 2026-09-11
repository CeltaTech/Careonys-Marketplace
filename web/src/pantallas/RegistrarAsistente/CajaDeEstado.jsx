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

   Con `cual` vacío la caja desaparece, que es el estado listo: lo que se ve
   entonces es el formulario, no un cartel diciendo que está listo.
=================================================== */

import { useEffect, useRef } from 'react';
import { Texto } from '#comun/frases/lector.js';

const COLOR_DEL_ESTADO = {
  cargando: ['var(--tono-neutro-fondo)', 'var(--texto-secundario)'],
  error: ['var(--tono-critico-fondo)', 'var(--tono-critico-texto)'],
  vacio: ['var(--tono-atencion-fondo)', 'var(--tono-atencion-texto)'],
  listo: ['var(--tono-exito-fondo)', 'var(--tono-exito-texto)']
};

export default function CajaDeEstado({ id, cual, clave, huecos, estilo, children }) {
  const caja = useRef(null);
  const color = COLOR_DEL_ESTADO[cual] || COLOR_DEL_ESTADO.cargando;

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
      style={{
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
        padding: '12px 14px',
        borderRadius: '12px',
        fontSize: '13px',
        ...estilo,
        background: color[0],
        color: color[1],
        display: cual ? 'flex' : 'none'
      }}
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
