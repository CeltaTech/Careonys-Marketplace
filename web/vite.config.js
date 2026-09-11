/* ===================================================
   CÓMO SE ARMA LA WEB

   Las quince pantallas del sitio son de acá. Se arman en una sola página que
   cambia de vista sin recargar, y las direcciones públicas quedan exactamente
   como estaban.

   Tres cosas no son la elección por defecto de la herramienta, y por eso están
   escritas:

   **El resultado sale afuera del paquete.** Careonys publica sus tres partes
   por separado; acá se publica un solo sitio, así que los tres armados caen
   adentro de la misma carpeta de salida: la web en la raíz y cada programa para
   el teléfono en la suya. Quien orquesta los tres es `scripts/armar_todo.mjs`.

   **Acá no hay carpeta de archivos sueltos, a propósito.** Las imágenes, los
   catálogos que viajan al navegador y los tres documentos legales viven en la
   raíz porque los comparten los tres paquetes. Copiarlos al armar es trabajo
   del guion que orquesta, que es además el único lugar donde está escrito qué
   se publica y qué no.

   **Y mientras se desarrolla, esas dos carpetas se sirven desde la raíz.** Sin
   esto, una imagen o un catálogo darían 404 en esta máquina y andarían bien
   publicados, que es la peor forma de que algo falle.
=================================================== */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const COMPARTIDAS = ['/assets/', '/data/', '/css/'];

const TIPOS = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function carpetasCompartidas() {
  return {
    name: 'carpetas-compartidas',
    configureServer(servidor) {
      servidor.middlewares.use((pedido, respuesta, seguir) => {
        const direccion = (pedido.url || '').split('?')[0];
        if (!COMPARTIDAS.some((c) => direccion.startsWith(c))) return seguir();
        const camino = normalize(join(raiz, decodeURIComponent(direccion)));
        // Nunca afuera de la raíz, aunque la dirección traiga `..`.
        if (!camino.startsWith(raiz)) return seguir();
        if (!existsSync(camino) || !statSync(camino).isFile()) return seguir();
        respuesta.setHeader('Content-Type', TIPOS[extname(camino).toLowerCase()] || 'application/octet-stream');
        createReadStream(camino).pipe(respuesta);
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), carpetasCompartidas()],
  publicDir: false,
  build: {
    outDir: join(raiz, 'dist'),
    emptyOutDir: true
  },
  server: {
    port: 5601,
    fs: { allow: [raiz] }
  }
});
