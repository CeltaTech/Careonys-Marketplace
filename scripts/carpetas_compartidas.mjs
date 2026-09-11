/* ===================================================
   LO QUE LOS TRES PAQUETES COMPARTEN

   Son tres paquetes —el sitio y los dos programas del teléfono— y cada uno se
   arma por su cuenta. Pero hay cosas que son una sola para los tres, y este
   archivo es el único lugar donde está escrito cuáles y dónde están, para que
   los tres armados lo pidan en vez de repetirlo.

   **Lo que se sirve: las imágenes, los catálogos y las hojas de estilo.** Viven
   en la raíz porque las comparten los tres. Publicado no hay problema: el guion
   que orquesta los tres armados las copia una vez y quedan en su dirección de
   siempre. Mientras se desarrolla, en cambio, cada paquete levanta su propio
   servidor y ése sólo ve su propia carpeta, así que sin esto darían «no
   encontrado» acá y andarían publicadas — que es la peor forma de fallar,
   porque se descubre tarde.

   **Lo que se importa: la carpeta común.** Las piezas que usan los tres —el
   lector de las frases, la puerta a la base, el campo de contraseña— viven
   afuera de los tres, en `comun/`, y no adentro de ninguno: guardadas adentro
   de un paquete tendrían dueño, y el dueño decidiría por los otros dos. Se
   nombran con un apodo, `#comun`, y no con una dirección relativa, porque
   entonces cada archivo la escribiría con tantos pasos hacia atrás como
   profundidad tenga, y mover un archivo de carpeta rompería las suyas.
=================================================== */

import { createReadStream, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Los apodos, iguales para los tres armados: la carpeta común y la de los
   archivos que ya usaba el navegador antes de que hubiera herramienta de
   armado, que siguen siendo los mismos y siguen viviendo en la raíz. */
export const APODOS = {
  '#comun': join(RAIZ, 'comun'),
  '#js': join(RAIZ, 'js')
};

/* Las bibliotecas que tienen que ser una sola copia por paquete. La carpeta
   común no tiene las suyas a propósito —no es un paquete, es código que los tres
   leen—, así que se resuelven desde el paquete que está armando. Y con React
   dos copias no son un desperdicio sino una falla: los componentes de una
   copia no ven el estado de la otra. */
export const UNA_SOLA_VEZ = ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'];

const COMPARTIDAS = ['/assets/', '/data/', '/css/'];

const TIPOS = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/* `base` es la dirección donde vive el paquete: la web está en la raíz y cada
   programa del teléfono adentro de su carpeta. Se saca del pedido antes de
   buscar el archivo, porque las tres carpetas están en la raíz para todos. */
export function carpetasCompartidas(base = '/') {
  return {
    name: 'carpetas-compartidas',
    configureServer(servidor) {
      servidor.middlewares.use((pedido, respuesta, seguir) => {
        let direccion = (pedido.url || '').split('?')[0];
        if (base !== '/' && direccion.startsWith(base)) {
          direccion = '/' + direccion.slice(base.length);
        }
        if (!COMPARTIDAS.some((c) => direccion.startsWith(c))) return seguir();
        const camino = normalize(join(RAIZ, decodeURIComponent(direccion)));
        // Nunca afuera de la raíz, aunque la dirección traiga `..`.
        if (!camino.startsWith(RAIZ)) return seguir();
        if (!existsSync(camino) || !statSync(camino).isFile()) return seguir();
        respuesta.setHeader('Content-Type', TIPOS[extname(camino).toLowerCase()] || 'application/octet-stream');
        createReadStream(camino).pipe(respuesta);
      });
    }
  };
}
