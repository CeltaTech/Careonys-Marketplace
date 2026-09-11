/* ===================================================
   QUÉ PANTALLA SE VE EN CADA DIRECCIÓN

   **Las direcciones son exactamente las que ya estaban publicadas.** Antes cada
   una era un archivo suelto y ahora son vistas de una sola página, pero quien
   tenga guardado un enlace llega al mismo lugar. Eso no es un detalle de
   comodidad: los dos programas para el teléfono se instalan en direcciones
   fijas, y hay enlaces repartidos por correos y por perfiles.

   Las que todavía no están portadas no se inventan ni se esconden: falta que se
   porten, y hasta entonces esta lista dice la verdad sobre qué hay.
=================================================== */

import { Routes, Route } from 'react-router-dom';
import Navegacion from './armazon/Navegacion.jsx';
import Pie from './armazon/Pie.jsx';
import Acompanamiento from './pantallas/Acompanamiento.jsx';

export default function Rutas() {
  return (
    <>
      <Navegacion />
      <Routes>
        <Route path="/soporte-remoto" element={<Acompanamiento />} />
      </Routes>
      <Pie />
    </>
  );
}
