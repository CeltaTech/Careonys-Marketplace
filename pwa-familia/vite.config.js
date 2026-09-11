/* ===================================================
   CÓMO SE ARMA EL PROGRAMA DE LA FAMILIA

   **La dirección no se puede mover.** Este programa está instalado en teléfonos
   de verdad, y lo que un teléfono tiene guardado es la dirección con la que se
   instaló. Por eso todo acá gira alrededor de una sola constante: se arma para
   vivir adentro de su carpeta, el resultado cae adentro de esa misma carpeta, y
   el archivo que trabaja sin conexión conserva su nombre exacto, porque el
   permiso que lo autoriza a cubrir toda la carpeta se le da por nombre en
   `vercel.json`. Cambiarle el nombre no rompería el armado: dejaría de cubrir
   la carpeta, que es peor, porque se descubre recién cuando alguien se queda
   sin señal.

   **Se arma desde `src` y no desde acá.** La página suelta de al lado sigue
   siendo la que está publicada hasta que el sitio nuevo la reemplace entero, y
   dos páginas no pueden llamarse igual en la misma carpeta. Cuando la vieja se
   retire, esto queda como está: el resultado ya sale al mismo lugar.

   **El manifiesto no se escribe acá.** Lo genera `generar_manifiestos.mjs` a
   partir de la identidad, que es el único lugar donde está el nombre del
   producto. Acá se lo lee y se lo entrega tal cual, para no tener el nombre
   escrito dos veces.
=================================================== */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RAIZ, APODOS, UNA_SOLA_VEZ, carpetasCompartidas } from '../scripts/carpetas_compartidas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const CARPETA = 'pwa-familia';
const BASE = '/' + CARPETA + '/';

export default defineConfig({
  root: join(AQUI, 'src'),
  base: BASE,
  publicDir: false,
  resolve: { alias: APODOS, dedupe: UNA_SOLA_VEZ },
  plugins: [
    react(),
    carpetasCompartidas(BASE),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'service-worker.js',
      registerType: 'autoUpdate',
      manifest: JSON.parse(readFileSync(join(AQUI, 'manifest.json'), 'utf8')),
      manifestFilename: 'manifest.json',
      injectManifest: { globPatterns: ['**/*.{js,css,html}'] }
    })
  ],
  build: {
    outDir: join(RAIZ, 'dist', CARPETA),
    emptyOutDir: true
  },
  server: {
    port: 5603,
    fs: { allow: [RAIZ] }
  }
});
