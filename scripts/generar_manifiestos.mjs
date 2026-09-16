/* ===================================================
   GENERA LOS DOS manifest.json DE LAS PWA

   Por qué hace falta un script para esto: el navegador lee el manifiesto por su
   cuenta, como archivo, sin pasar por ninguna página. Ahí no hay JavaScript que
   resuelva un marcador, así que el nombre tiene que estar escrito de verdad
   adentro del archivo. La única forma de que no quede escrito a mano es
   escribirlo desde acá, tomándolo de `js/identidad.js`.

   Y lo mismo vale para los dos colores, por el mismo motivo y con un agregado:
   el sistema operativo lee el manifiesto antes de que exista ninguna hoja de
   estilo, así que ahí un color va con su número y es el único lugar del proyecto
   donde eso es legítimo. Pero un número escrito a mano es una segunda verdad, y
   ésta se despegó: decía `#1A365D` y `#fafafb` cuando los tokens de
   `css/tokens.css` ya valían otra cosa. Nadie se enteró porque
   `scripts/verificar_paleta.mjs` no abre `scripts/` —ahí adentro escribe colores
   a propósito, en su propio banco de pruebas—, así que estos dos vivían
   justamente en la única carpeta donde el control de la paleta no mira. Y
   `#1A365D` es, además, el mismo número que `css/tokens.css` nombra como ejemplo
   de «un color a mano disfrazado de variable».

   Se corre después de cambiar la identidad o la paleta:

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

/** Lo que vale un token en el modo claro, que es el que ve el teléfono: el
 *  manifiesto es uno solo y no cambia de noche. Se corta la hoja donde empieza
 *  el modo oscuro para no leer el segundo valor del mismo token, y se sacan los
 *  comentarios, que nombran tokens para explicarlos. */
function token(nombre) {
  const hoja = readFileSync(join(raiz, 'css', 'tokens.css'), 'utf8');
  const claro = hoja.split(':root[data-tema=')[0].replace(/\/\*[\s\S]*?\*\//g, '');
  const marca = '--' + nombre + ':';
  const desde = claro.indexOf(marca);
  if (desde < 0) throw new Error('No está el token ' + marca + ' en el modo claro de css/tokens.css.');
  return claro.slice(desde + marca.length, claro.indexOf(';', desde)).trim();
}

/** Un manifiesto sólo entiende un número, así que el token se convierte acá. Es
 *  la fórmula de CSS Color 4, la misma que aplica el navegador: de OKLCH a
 *  OKLab, de ahí a RGB lineal y de ahí a sRGB. Si algún día un token deja de
 *  estar escrito en OKLCH, esto se planta en vez de inventar un color. */
function enNumero(valor) {
  const partes = valor.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  if (!partes) throw new Error('El token no está escrito en OKLCH y no se puede convertir a un número: ' + valor);
  const [L, C, H] = partes.slice(1).map(Number);
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lineales = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ];
  return '#' + lineales.map((crudo) => {
    const acotado = Math.min(1, Math.max(0, crudo));
    const conGama = acotado <= 0.0031308 ? 12.92 * acotado : 1.055 * acotado ** (1 / 2.4) - 0.055;
    return Math.round(conGama * 255).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

// Lo propio de cada PWA. El nombre del producto no está acá: lo pone `armar`.
const APLICACIONES = [
  { carpeta: 'pwa-asistente', sufijo: 'Asistente' },
  { carpeta: 'pwa-familia', sufijo: 'Familia' }
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
    // El papel de la pantalla, detrás del logotipo, mientras el programa abre.
    background_color: enNumero(token('fondo-app')),
    /* Y el color de la marca. El manifiesto no puede seguir al de cada
       Prestadora —el teléfono lo lee una sola vez, al instalar, y todavía no hay
       sesión—, así que lleva el respaldo, que es el azul de Careonys. */
    theme_color: enNumero(token('marca-prestadora')),
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
