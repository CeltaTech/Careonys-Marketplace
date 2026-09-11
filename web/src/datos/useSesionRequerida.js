/* ===================================================
   LA GUARDIA: SIN SESIÓN, A LA PANTALLA DE ACCESO

   La regla es la de siempre y no cambia: **quien no inició sesión no ve una
   pantalla que pide sesión, y se lo lleva de dónde venía para devolverlo ahí
   después de entrar.**

   Lo que cambia es cómo se lo lleva. El archivo de sesión hace eso saltando a
   otra dirección del navegador, que es lo único que podía hacer cuando cada
   pantalla era un archivo suelto —y sigue siendo lo correcto para los dos
   programas del teléfono, que son otros programas—. Acá adentro, en cambio, las
   pantallas son vistas de un mismo programa, así que el salto lo hace el
   enrutador: no se recarga nada, no se pierde lo que ya se trajo, y la vuelta
   se nombra con la dirección de la vista y no con un nombre de archivo.

   Los cuatro estados salen de acá para que ninguna pantalla los repita:
   **cargando** mientras se abre la puerta y se pregunta por la sesión,
   **error** si no se pudo llegar, **vacío** —que acá es «no hay sesión»— que no
   dibuja nada porque ya está yéndose, y **listo** con la sesión resuelta.
=================================================== */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { conLaBase } from './puerta.js';

export function useSesionRequerida() {
  const navegar = useNavigate();
  const donde = useLocation();
  const [estado, setEstado] = useState('cargando');
  const [base, setBase] = useState(null);
  const [sesion, setSesion] = useState(null);

  useEffect(() => {
    let vigente = true;

    (async () => {
      try {
        const abierta = await conLaBase();
        const laSesion = await abierta.Sesion.getSession();
        if (!vigente) return;

        if (!laSesion) {
          setEstado('sin_sesion');
          navegar('/acceso?volver=' + encodeURIComponent(donde.pathname.slice(1)),
            { replace: true });
          return;
        }

        /* El mismo permiso que antes le pasaba la guardia al acceso a datos. */
        abierta.ClienteDatos.setAuthToken(laSesion.access_token);
        setBase(abierta);
        setSesion(laSesion);
        setEstado('listo');
      } catch (err) {
        console.error('No se pudo comprobar la sesión:', err);
        if (vigente) setEstado('error');
      }
    })();

    return () => { vigente = false; };
    // Se comprueba al entrar a cada vista, que es cuando la pantalla cambia.
  }, [donde.pathname, navegar]);

  return { estado, base, sesion };
}
