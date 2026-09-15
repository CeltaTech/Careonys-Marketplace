/* ===================================================
   ENTRAR CON CORREO Y CONTRASEÑA

   Las tres puertas del producto —la de la web y las de los dos programas del
   teléfono— hacen lo mismo para dejar entrar a alguien: miran que los dos
   campos tengan algo, abren la sesión, y si no se pudo, dicen de qué clase fue
   la falla. Eso estaba escrito tres veces, con tres combinaciones distintas, y
   acá está escrito una sola.

   **Lo que queda afuera a propósito.** De dónde salen los dos campos, cómo se
   muestra el aviso, a dónde va cada quien después de entrar y qué más hay que
   hacer al entrar son decisiones de cada pantalla, y son distintas de verdad:
   una manda a una vista de la misma web, otra a otro programa, y la del
   Asistente además vacía la cola de lo que quedó sin mandar.

   **El aviso viaja como clave del catálogo, no como frase ya escrita.** Así un
   cambio de idioma con el cartel en pantalla lo alcanza también a él. Una de
   las tres lo guardaba ya escrito y se quedaba en el idioma de aquel momento.

   **No entra dos veces.** El botón apagado no alcanza: entre el clic y el
   dibujo siguiente hay lugar para un segundo clic, y ahí salían dos pedidos de
   sesión. La marca de «en curso» se pone en el acto y no espera a ningún
   dibujo.

   **Al terminar, el botón se enciende, haya entrado o no.** Entrar no siempre
   es irse en el acto: la puerta de la web todavía tiene que averiguar a dónde
   va esa persona, y eso puede fallar. Dejarlo apagado ahí la clavaba contra
   una pantalla sin nada para apretar.
=================================================== */

import { useCallback, useRef, useState } from 'react';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

/**
 * @returns entrando  Si hay un ingreso en curso. Para apagar el botón.
 * @returns ingresar  `ingresar(correo, clave)` devuelve `{ entro, usuario,
 *                    aviso }`. `aviso` es una clave del catálogo, y está vacío
 *                    cuando no hay nada que decir.
 */
export function useElIngreso() {
  const [entrando, setEntrando] = useState(false);
  const enCurso = useRef(false);

  const ingresar = useCallback(async (correo, clave) => {
    if (enCurso.current) return { entro: false, usuario: null, aviso: '' };

    const elCorreo = String(correo || '').trim();
    if (!elCorreo || !clave) {
      return { entro: false, usuario: null, aviso: 'acceso.faltan_datos' };
    }

    enCurso.current = true;
    setEntrando(true);
    try {
      const { Sesion } = await conLaBase();
      const usuario = await Sesion.login(elCorreo, clave);
      return { entro: true, usuario, aviso: '' };
    } catch (err) {
      /* El detalle técnico lo registra `claveDeError` y no sale de la consola;
         a la pantalla va la frase que corresponde a esa clase de falla. */
      return { entro: false, usuario: null, aviso: Texto.claveDeError(err, 'Inicio de sesión:') };
    } finally {
      enCurso.current = false;
      setEntrando(false);
    }
  }, []);

  return { entrando, ingresar };
}
