/* ===================================================
   GENERA LOS DOS manifest.json DE LAS PWA

   Por qué hace falta un script para esto: el navegador lee el manifiesto por su
   cuenta, como archivo, sin pasar por ninguna página. Ahí no hay JavaScript que
   resuelva un marcador, así que el nombre tiene que estar escrito de verdad
   adentro del archivo. La única forma de que no quede escrito a mano es
   escribirlo desde acá, tomándolo de `js/identidad.js`.

   Se corre después de cambiar la identidad:

       node scripts/generar_manifiestos.mjs

   Los dos manifiestos quedan fuera del chequeo de `verificar_identidad.mjs`
   justamente porque son generados; lo que ese chequeo sí verifica es que estén
   al día.
=================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { IDENTIDAD } = require(join(raiz, 'js', 'identidad.js'));

// Lo propio de cada PWA. El nombre del producto no está acá: lo pone `armar`.
const APLICACIONES = [
  { carpeta: 'pwa-asistente', sufijo: 'Asistente', tema: '#1A365D' },
  { carpeta: 'pwa-familia', sufijo: 'Familia', tema: '#1A365D' }
];

function armar(app) {
  return {
    name: IDENTIDAD.nombre + ' ' + app.sufijo,
    short_name: IDENTIDAD.nombreCorto + app.sufijo,
    // El idioma por omisión del producto. Va escrito porque el navegador lee
    // el manifiesto como archivo, sin ejecutar nada, y si no lo encuentra lo
    // da por inglés. Es el mismo que usa `js/texto.js:66` cuando no hay
    // pantalla que pregunte: si cambia allá, cambia acá.
    lang: 'es-AR',
    start_url: 'index.html',
    display: 'standalone',
    background_color: '#fafafb',
    theme_color: app.tema,
    orientation: 'portrait',
    icons: [
      { src: '../' + IDENTIDAD.logotipo, sizes: '512x512', type: 'image/png' }
    ]
  };
}

// Devuelve los manifiestos que no coinciden con la identidad. Con `escribir`
// en falso no toca nada: eso es lo que usa `verificar_identidad.mjs`.
export function revisarManifiestos(escribir) {
  const desactualizados = [];
  for (const app of APLICACIONES) {
    const ruta = join(raiz, app.carpeta, 'manifest.json');
    const texto = JSON.stringify(armar(app), null, 2) + '\n';
    let anterior = '';
    try { anterior = readFileSync(ruta, 'utf8'); } catch { /* todavía no existe */ }
    if (anterior === texto) continue;
    desactualizados.push(app.carpeta + '/manifest.json');
    if (escribir) writeFileSync(ruta, texto, 'utf8');
  }
  return desactualizados;
}

// Solo escribe cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const cambiados = revisarManifiestos(true);
  cambiados.forEach((m) => console.log('escrito ' + m));
  console.log(cambiados.length === 0
    ? 'Los manifiestos ya estaban al día.'
    : 'Manifiestos generados: ' + cambiados.length);
}
