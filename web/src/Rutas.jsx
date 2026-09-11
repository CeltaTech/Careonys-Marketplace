/* ===================================================
   QUÉ PANTALLA SE VE EN CADA DIRECCIÓN

   **Las direcciones son exactamente las que ya estaban publicadas.** Antes cada
   una era un archivo suelto y ahora son vistas de una sola página, pero quien
   tenga guardado un enlace llega al mismo lugar. Eso no es un detalle de
   comodidad: los dos programas para el teléfono se instalan en direcciones
   fijas, y hay enlaces repartidos por correos y por perfiles.

   **Y son dos marcos, no uno**, porque siempre fueron dos: siete pantallas
   llevan la barra de arriba y el pie, y las otras ocho no llevan ninguno de los
   dos —las de entrar, las de recuperar la clave y las de trabajar adentro—. Eso
   estaba repetido pantalla por pantalla; acá está dicho una vez, y en cuál de
   los dos grupos cae cada una se lee de un vistazo.

   Las que todavía no están portadas no se inventan ni se esconden: falta que se
   porten, y hasta entonces esta lista dice la verdad sobre qué hay.
=================================================== */

import { Routes, Route, Outlet } from 'react-router-dom';
import Navegacion from './armazon/Navegacion.jsx';
import Pie from './armazon/Pie.jsx';
import Acceso from './pantallas/Acceso.jsx';
import Acompanamiento from './pantallas/Acompanamiento.jsx';

function ConMarco() {
  return (
    <>
      <Navegacion />
      <Outlet />
      <Pie />
    </>
  );
}

export default function Rutas() {
  return (
    <Routes>
      <Route element={<ConMarco />}>
        <Route path="/soporte-remoto" element={<Acompanamiento />} />
      </Route>

      <Route path="/acceso" element={<Acceso />} />
    </Routes>
  );
}
