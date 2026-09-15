/* ===================================================
   SALIR

   Cerrar la sesión es la misma decisión en los dos programas del teléfono: se
   pregunta antes, se apaga el botón mientras corre, y si no se pudo cerrar se
   dice. Eso último no es un detalle: quedarse callado deja a la persona mirando
   el menú, creyendo que salió cuando la sesión sigue abierta.

   **Lo que queda afuera a propósito.** A dónde va el programa después de salir
   y cómo se dibuja el aviso los decide cada uno.

   **El aviso viaja como clave del catálogo**, igual que al entrar, así que un
   cambio de idioma lo alcanza. Uno de los dos lo daba ya escrito.
=================================================== */

import { useCallback, useState } from 'react';
import { useFrases } from '#comun/frases/ProveedorDeFrases.jsx';
import { Texto } from '#comun/frases/lector.js';
import { conLaBase } from '#comun/datos/puerta.js';

/**
 * @returns saliendo Si hay una salida en curso. Para apagar el botón.
 * @returns salir    `salir()` devuelve `{ salio, aviso }`. Si se dijo que no,
 *                   vuelve con los dos vacíos y no pasó nada.
 */
export function useLaSalida() {
  const { frase } = useFrases();
  const [saliendo, setSaliendo] = useState(false);

  const salir = useCallback(async () => {
    if (!window.confirm(frase('comun.confirmar_salir'))) {
      return { salio: false, aviso: '' };
    }

    setSaliendo(true);
    try {
      const { Sesion } = await conLaBase();
      await Sesion.logout();
      return { salio: true, aviso: '' };
    } catch (err) {
      return { salio: false, aviso: Texto.claveDeError(err, 'Cierre de sesión:') };
    } finally {
      setSaliendo(false);
    }
  }, [frase]);

  return { saliendo, salir };
}
