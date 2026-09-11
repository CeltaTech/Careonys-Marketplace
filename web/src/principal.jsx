/* ===================================================
   POR ACÁ ARRANCA LA WEB

   Los tres archivos de estilos son los mismos de siempre y viven en la raíz del
   repositorio, porque los comparten los tres paquetes. Se los nombra acá una
   sola vez, en el orden que tenían: primero las variables de diseño, después los
   estilos, y al final las utilidades, que pisan a las dos anteriores.
=================================================== */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '../../css/tokens.css';
import '../../css/styles.css';
import '../../css/utilidades.css';

import { ProveedorDeFrases } from './frases/ProveedorDeFrases.jsx';
import Rutas from './Rutas.jsx';

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorDeFrases>
        <Rutas />
      </ProveedorDeFrases>
    </BrowserRouter>
  </StrictMode>
);
