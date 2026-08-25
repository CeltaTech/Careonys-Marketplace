/* ===================================================
   VERIFICA QUE LAS COPIAS SIGAN SIENDO COPIAS

       node scripts/verificar_copias.mjs

   Once archivos de este proyecto viven repetidos en dos o tres carpetas. No es
   descuido: el service worker de cada PWA solo alcanza su propia carpeta, así
   que sin conexión no puede leer nada de arriba. Hasta que la migración a React
   traiga imports de verdad —pendiente 13—, la copia es la única forma.

   El riesgo es que alguien corrija una y no las otras. Entonces dos personas ven
   dos programas distintos y nadie se entera hasta que uno falla. Este guion
   compara byte a byte y falla si alguna se separó.

   Cuando hay que cambiar uno de estos archivos: se edita el de la raíz y se
   copian los otros. El original siempre es el de arriba.
=================================================== */

import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Cada grupo: el primero es el original, los demás son sus copias.
const GRUPOS = [
  ['js/identidad.js', 'pwa-asistente/js/identidad.js', 'pwa-familia/js/identidad.js'],
  ['js/texto.js', 'pwa-asistente/js/texto.js', 'pwa-familia/js/texto.js'],
  ['js/clave.js', 'pwa-asistente/js/clave.js', 'pwa-familia/js/clave.js'],
  ['js/apiClient.js', 'pwa-asistente/js/apiClient.js', 'pwa-familia/js/apiClient.js'],
  ['js/auth.js', 'pwa-asistente/js/auth.js', 'pwa-familia/js/auth.js'],
  ['js/catalogo.js', 'pwa-asistente/js/catalogo.js', 'pwa-familia/js/catalogo.js'],
  // La aplicación de la Familia no pregunta la disponibilidad de nadie, así que
  // estos dos van a una sola copia y no a dos.
  ['js/disponibilidad.js', 'pwa-asistente/js/disponibilidad.js'],
  ['data/catalogo-disponibilidad.json', 'pwa-asistente/data/catalogo-disponibilidad.json'],
  // Lo mismo con las cuatro fichas del legajo y con el paso de cierre: los
  // pregunta el alta del Asistente y la Familia no los ve nunca.
  ['js/fichas-legajo.js', 'pwa-asistente/js/fichas-legajo.js'],
  ['data/catalogo-fichas.json', 'pwa-asistente/data/catalogo-fichas.json'],
  ['js/autorizaciones.js', 'pwa-asistente/js/autorizaciones.js'],
  ['data/catalogo-autorizaciones.json', 'pwa-asistente/data/catalogo-autorizaciones.json'],
  ['data/catalogo-vocabularios.json', 'pwa-asistente/data/catalogo-vocabularios.json',
   'pwa-familia/data/catalogo-vocabularios.json'],
  ['css/tokens.css', 'pwa-asistente/css/tokens.css', 'pwa-familia/css/tokens.css'],
  ['pwa-asistente/css/styles-pwa.css', 'pwa-familia/css/styles-pwa.css']
];

// Devuelve la lista de problemas, vacía si está todo bien. `soloGrupo` limita la
// revisión a un grupo, por su original: lo usa `verificar_identidad.mjs`.
export function verificarCopias(soloGrupo) {
  const problemas = [];
  let comparadas = 0;

  for (const [original, ...copias] of GRUPOS) {
    if (soloGrupo && original !== soloGrupo) continue;
    const rutaOriginal = join(raiz, original.split('/').join(sep));
    let contenido;
    try {
      contenido = readFileSync(rutaOriginal);
    } catch {
      problemas.push('Falta el original ' + original + '.');
      continue;
    }
    for (const copia of copias) {
      const rutaCopia = join(raiz, copia.split('/').join(sep));
      let otra;
      try {
        otra = readFileSync(rutaCopia);
      } catch {
        problemas.push('Falta la copia ' + copia + '.\n  Se restaura con: cp ' + original + ' ' + copia);
        continue;
      }
      comparadas++;
      if (!otra.equals(contenido)) {
        const cual = statSync(rutaCopia).mtimeMs > statSync(rutaOriginal).mtimeMs
          ? '  La copia es MÁS NUEVA que el original: puede que el cambio bueno esté en la copia.\n' +
            '  Mirar el cambio antes de pisarlo.'
          : '  El original es más nuevo. Si el cambio es el bueno: cp ' + original + ' ' + copia;
        problemas.push(copia + ' se separó de ' + original + '.\n' + cual);
      }
    }
  }
  return { problemas, comparadas };
}

// Solo imprime cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { problemas, comparadas } = verificarCopias();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log('Copias verificadas: ' + comparadas + ' iguales byte a byte a su original.');
}
