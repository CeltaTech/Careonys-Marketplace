/* ===================================================
   VERIFICA QUE LAS COPIAS SIGAN SIENDO COPIAS

       node scripts/verificar_copias.mjs
       node scripts/verificar_copias.mjs --arreglar

   Nueve archivos de este proyecto viven repetidos en dos o tres carpetas, y son
   de dos clases con dos motivos distintos.

   **Los catálogos de datos**, porque sin conexión cada programa del teléfono
   sólo alcanza lo que quedó guardado adentro de su propia carpeta. Un catálogo
   que viviera únicamente arriba existiría mientras hay señal y desaparecería
   justo el día que no la hay.

   **Las hojas de estilo**, porque cada programa se arma desde su carpeta y se
   lleva adentro las que nombra.

   Los que **dejaron** de estar repetidos son los guiones del navegador. Vivían
   copiados por el mismo motivo que los catálogos, y dejaron de estarlo cuando
   las pantallas pasaron a ser programas: ahora los tres paquetes nombran el
   mismo archivo de arriba y la herramienta de armado se lo lleva adentro, así
   que no hay copia que pueda despegarse.

   El riesgo de las que quedan es el de siempre: que alguien corrija una y no las
   otras. Entonces dos personas ven dos programas distintos y nadie se entera
   hasta que uno falla. Este guion compara byte a byte y falla si alguna se
   separó.

   Cuando hay que cambiar uno de estos archivos: se edita el de la raíz y se
   copian los otros. El original siempre es el de arriba, y con `--arreglar` la
   copia la hace este guion.

   `--arreglar` **no pisa una copia más nueva que su original**. Que la copia sea
   la más nueva significa que alguien editó la copia, y ahí el cambio bueno
   puede ser el de abajo: pisarlo lo borra sin que nadie se entere, que es
   justo el daño que este guion viene a evitar. Esos casos los sigue informando
   y los arregla una persona.
=================================================== */

import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Cada grupo: el primero es el original, los demás son sus copias.
export const GRUPOS = [
  // Los dos lados de la misma grilla de días por turnos: el Asistente dice
  // cuándo puede trabajar y la Familia dice cuándo se necesita el cuidado, así
  // que las dos aplicaciones llevan copia (pendiente 40).
  ['data/catalogo-disponibilidad.json', 'pwa-asistente/data/catalogo-disponibilidad.json',
   'pwa-familia/data/catalogo-disponibilidad.json'],
  // Las cuatro fichas del legajo las pregunta el alta del Asistente, y la
  // Familia no las ve nunca.
  ['data/catalogo-fichas.json', 'pwa-asistente/data/catalogo-fichas.json'],
  // Lo mismo con los permisos que el alta pide firmar.
  ['data/catalogo-autorizaciones.json', 'pwa-asistente/data/catalogo-autorizaciones.json'],
  ['data/catalogo-vocabularios.json', 'pwa-asistente/data/catalogo-vocabularios.json',
   'pwa-familia/data/catalogo-vocabularios.json'],
  ['data/catalogo-guias.json', 'pwa-asistente/data/catalogo-guias.json',
   'pwa-familia/data/catalogo-guias.json'],
  // El texto de las pantallas en los tres idiomas. Es la copia que más importa
  // que exista: sin el archivo adentro de su carpeta, sin conexión la
  // aplicación arranca con las cinco frases de emergencia y nada más.
  ['data/catalogo-frases.json', 'pwa-asistente/data/catalogo-frases.json',
   'pwa-familia/data/catalogo-frases.json'],
  ['css/tokens.css', 'pwa-asistente/css/tokens.css', 'pwa-familia/css/tokens.css'],
  // Las clases de utilidad: las tres carpetas escriben las mismas, y una copia
  // que se despegue esconde o muestra distinto en una sola de las tres.
  ['css/utilidades.css', 'pwa-asistente/css/utilidades.css', 'pwa-familia/css/utilidades.css'],
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
  /* Sin esto, un `soloGrupo` mal escrito descarta los diecisiete grupos y
     devuelve «0 problemas», que se lee igual que «está todo bien». */
  seRevisaron(
    comparadas + problemas.length,
    soloGrupo ? `el grupo «${soloGrupo}» en la lista de copias` : 'un solo grupo de copias'
  );
  return { problemas, comparadas };
}

/* Copia cada original encima de las copias que se separaron, salvo las que son
   más nuevas que su original. Devuelve qué copió y qué dejó sin tocar. */
export function arreglarCopias() {
  const copiadas = [];
  const salteadas = [];

  for (const [original, ...copias] of GRUPOS) {
    const rutaOriginal = join(raiz, original.split('/').join(sep));
    let contenido;
    try {
      contenido = readFileSync(rutaOriginal);
    } catch {
      salteadas.push('Falta el original ' + original + ': no hay de dónde copiar.');
      continue;
    }
    for (const copia of copias) {
      const rutaCopia = join(raiz, copia.split('/').join(sep));
      let otra = null;
      try {
        otra = readFileSync(rutaCopia);
      } catch { /* No existe todavía: se crea abajo. */ }
      if (otra && otra.equals(contenido)) continue;
      if (otra && statSync(rutaCopia).mtimeMs > statSync(rutaOriginal).mtimeMs) {
        salteadas.push(copia + ' es MÁS NUEVA que ' + original + ': no se pisa.'
          + ' Si el cambio bueno es el de la copia, va al original y de ahí baja.');
        continue;
      }
      copyFileSync(rutaOriginal, rutaCopia);
      copiadas.push(copia);
    }
  }
  return { copiadas, salteadas };
}

// Solo imprime cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.includes('--arreglar')) {
    const { copiadas, salteadas } = arreglarCopias();
    if (copiadas.length) console.log('Copiadas desde su original:\n  ' + copiadas.join('\n  '));
    else if (!salteadas.length) console.log('No había ninguna copia separada de su original.');
    if (salteadas.length) {
      console.error('\nSin tocar:\n  ' + salteadas.join('\n  ') + '\n');
      process.exit(1);
    }
  }
  const { problemas, comparadas } = verificarCopias();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log('Copias verificadas: ' + comparadas + ' iguales byte a byte a su original.');
}
