/* ===================================================
   CÓMO SE ARMA LA WEB

   Las quince pantallas del sitio son de acá. Se arman en una sola página que
   cambia de vista sin recargar, y las direcciones públicas quedan exactamente
   como estaban.

   Dos cosas no son la elección por defecto de la herramienta, y por eso están
   escritas:

   **El resultado sale afuera del paquete.** Careonys publica sus tres partes
   por separado; acá se publica un solo sitio, así que los tres armados caen
   adentro de la misma carpeta de salida: la web en la raíz y cada programa para
   el teléfono en la suya. Quien orquesta los tres es `scripts/armar_todo.mjs`.

   **Acá no hay carpeta de archivos sueltos, a propósito.** Las imágenes, los
   catálogos que viajan al navegador y las hojas de estilo viven en la raíz
   porque las comparten los tres paquetes. Copiarlas al armar es trabajo del
   guion que orquesta, que es además el único lugar donde está escrito qué se
   publica y qué no. Mientras se desarrolla las sirve la pieza compartida.
=================================================== */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'node:path';
import { RAIZ, APODOS, UNA_SOLA_VEZ, carpetasCompartidas } from '../scripts/carpetas_compartidas.mjs';

export default defineConfig({
  plugins: [react(), carpetasCompartidas()],
  publicDir: false,
  resolve: { alias: APODOS, dedupe: UNA_SOLA_VEZ },
  build: {
    outDir: join(RAIZ, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5601,
    fs: { allow: [RAIZ] }
  }
});
