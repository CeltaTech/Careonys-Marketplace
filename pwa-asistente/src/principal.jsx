/* ===================================================
   POR ACÁ ARRANCA EL PROGRAMA DEL ASISTENTE

   Cuatro archivos de estilos, en el mismo orden en que los cargaba la página:
   primero las variables de diseño, después los estilos del teléfono, después
   las utilidades, que pisan a las dos anteriores, y al final los estilos
   propios de esta aplicación, que en la página suelta iban escritos adentro de
   la cabecera y por eso cerraban la fila. El orden no es decorativo: es el que
   decide qué regla gana cuando dos hablan de lo mismo.
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
