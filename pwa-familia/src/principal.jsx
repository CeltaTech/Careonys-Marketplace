/* ===================================================
   POR ACÁ ARRANCA EL PROGRAMA DE LA FAMILIA

   Los tres primeros archivos de estilos son los mismos de siempre y los
   mismos que cargaba la página: primero las variables de diseño, después los
   estilos del teléfono, y al final las utilidades, que pisan a las dos
   anteriores. El cuarto guarda los estilos que la página llevaba escritos
   adentro, y por eso va último: ahí también iban antes.
=================================================== */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProveedorDeFrases } from '#comun/frases/ProveedorDeFrases.jsx';

import '../css/tokens.css';
import '../css/styles-pwa.css';
import '../css/utilidades.css';
import './estilos.css';

import Programa from './Programa.jsx';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <ProveedorDeFrases>
      <Programa />
    </ProveedorDeFrases>
  </StrictMode>
);
