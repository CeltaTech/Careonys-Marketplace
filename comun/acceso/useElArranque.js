/* ===================================================
   EL ARRANQUE DE UN PROGRAMA DEL TELÉFONO

   Lo primero que pasa al abrirse cualquiera de los dos: se abre la puerta a la
   base, se resuelve de qué Prestadora es esta dirección, se refresca el nombre
   que va a la pantalla, y se trae la sesión que hubiera quedado abierta de la
   vez anterior. Si algo de eso falla, el fallo se clasifica y de acá sale la
   clave de la frase que lo dice. Termine bien o mal, al final se apaga el
   «cargando».

   Lo propio de cada programa entra en dos momentos, que son los dos que los dos
   usan: apenas se sabe la Prestadora, y con la sesión que hubiera. Corren
   adentro del mismo intento, así que si algo de eso falla se dice igual que el
   resto.

   El aviso viaja como clave del catálogo y no como frase ya escrita: quien la
   muestra la pasa por el catálogo en el momento de dibujarla, y así queda en el
   idioma que esté puesto entonces y no en el que estaba cuando falló.

   Nada de esto lleva una marca de «ya arrancó». Abrir la puerta y resolver la
   Prestadora se hacen una sola vez por su cuenta, allá abajo, y el segundo que
   pregunta recibe la misma respuesta ya resuelta. Una marca acá arriba, además
   de no hacer falta, se queda pegada: un arranque que falló no se reintenta
   nunca más, ni volviendo a abrir el programa.
=================================================== */

import { useEffect, useRef, useState } from 'react';
import { Identidad, Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

/* Lo que se ve mientras se averigua. Sale del catálogo como cualquier rótulo:
   un cartel escrito acá no existiría en los otros dos idiomas. */
const VERIFICANDO = 'acceso.verificando';

/**
 * @param donde   Con qué se nombra este programa al clasificar un fallo.
 * @param trabajo Lo propio de este programa, en sus dos momentos:
 *                `apenasSeSabeLaPrestadora(puerta)` y
 *                `conLaSesionQueHubiera(puerta, sesion)`, donde `sesion` vale
 *                `null` si no había ninguna abierta. Los dos pueden faltar.
 * @returns arrancando   Mientras la secuencia corre.
 * @returns aviso        Clave del catálogo: mientras se averigua dice que se
 *                      está averiguando, y después queda vacía o dice el fallo.
 * @returns organizacion El nombre de la Prestadora, ya refrescado.
 */
export function useElArranque(donde, trabajo) {
  const [arrancando, setArrancando] = useState(true);
  const [aviso, setAviso] = useState(VERIFICANDO);
  const [organizacion, setOrganizacion] = useState(Identidad.organizacion());

  /* El trabajo propio se arma de nuevo en cada dibujo del programa. Guardado
     acá, el arranque no depende de él y corre una sola vez. */
  const elTrabajo = useRef(trabajo);
  elTrabajo.current = trabajo;

  useEffect(() => {
    /* Si el programa se fue antes de que esto termine, lo que llegue tarde no
       escribe nada: escribirlo sería pintar una pantalla que ya no está. */
    let vigente = true;

    (async () => {
      setAviso(VERIFICANDO);
      try {
        const puerta = await conLaBase();
        await puerta.ClienteDatos.initTenant();
        if (!vigente) return;
        setOrganizacion(Identidad.organizacion());
        await elTrabajo.current.apenasSeSabeLaPrestadora?.(puerta);

        const sesion = await puerta.Sesion.getSession();
        if (!vigente) return;
        await elTrabajo.current.conLaSesionQueHubiera?.(puerta, sesion || null);
        if (vigente) setAviso('');
      } catch (err) {
        if (vigente) setAviso(Texto.claveDeError(err, donde));
      } finally {
        if (vigente) setArrancando(false);
      }
    })();

    return () => { vigente = false; };
  }, [donde]);

  return { arrancando, aviso, organizacion };
}
