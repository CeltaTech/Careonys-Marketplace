/* ===================================================
   VERIFICA QUE LAS COPIAS SIGAN SIENDO COPIAS

       node scripts/verificar_copias.mjs
       node scripts/verificar_copias.mjs --arreglar

   Unos cuantos archivos de este proyecto viven repetidos en dos o tres carpetas,
   y son de dos clases con dos motivos distintos. Cuántos son lo dice el renglón
   de salida, que sale de contarlos: el número escrito acá a mano envejecería en
   silencio, y justamente de un renglón que se quedó viejo nace la mitad de abajo
   de este guion.

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

   Y no todas bajan de arriba: las hojas de estilo de los teléfonos están
   repetidas entre los dos programas y no existen en la raíz, así que a ésas se
   las compara contra su hermana. Son dos búsquedas distintas porque son dos
   formas distintas de estar repetido, y la que pregunta por el gemelo de arriba
   no puede ver a las que no lo tienen.

   Cuando hay que cambiar uno de estos archivos: se edita el de la raíz y se
   copian los otros. El original siempre es el de arriba, y con `--arreglar` la
   copia la hace este guion.

   `--arreglar` **no pisa una copia más nueva que su original**. Que la copia sea
   la más nueva significa que alguien editó la copia, y ahí el cambio bueno
   puede ser el de abajo: pisarlo lo borra sin que nadie se entere, que es
   justo el daño que este guion viene a evitar. Esos casos los sigue informando
   y los arregla una persona.
=================================================== */

import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { EXTENSIONES_DE_PANTALLA, hayArchivos, seRevisaron } from './recorrido.mjs';

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
  // La oferta de la portada. Sin conexión no hay base de la que traerla, así que
  // cada programa necesita la suya adentro. Es la que se separó y dio origen a
  // la búsqueda de más abajo.
  ['data/catalogo-oferta.json', 'pwa-asistente/data/catalogo-oferta.json',
   'pwa-familia/data/catalogo-oferta.json'],
  ['css/tokens.css', 'pwa-asistente/css/tokens.css', 'pwa-familia/css/tokens.css'],
  // Las clases de utilidad: las tres carpetas escriben las mismas, y una copia
  // que se despegue esconde o muestra distinto en una sola de las tres.
  ['css/utilidades.css', 'pwa-asistente/css/utilidades.css', 'pwa-familia/css/utilidades.css'],
  ['pwa-asistente/css/styles-pwa.css', 'pwa-familia/css/styles-pwa.css']
];

/* ---- Y LAS COPIAS QUE NADIE DECLARÓ ----
   La lista de arriba se escribe a mano, y una lista escrita a mano sólo sabe de
   lo que había el día que se la escribió. El día que alguien copia un archivo
   más adentro de un programa y no agrega el renglón, este guion no lo compara
   con nadie: la copia se separa del original y el chequeo sigue diciendo ✔, que
   es exactamente el daño que viene a evitar.

   No es hipotético. La oferta de la portada se corrigió arriba —los cursos
   dejaron de ser sólo para las Familias— y las dos copias de los teléfonos se
   quedaron con el texto viejo, sin que nadie se enterara, porque ese archivo no
   estaba en la lista.

   Así que no se confía en la lista: se sale a buscar. Un archivo que está
   adentro de un programa y también arriba, con el mismo nombre y en el mismo
   lugar, o es una copia declarada o es una excepción escrita con su motivo.
   Cualquier otra cosa planta el chequeo. */
const NO_SON_COPIAS = new Map([
  ['package.json', 'cada programa declara lo suyo: cómo se llama y de qué depende']
]);

const PROGRAMAS = ['pwa-asistente', 'pwa-familia', 'web'];
const EXTENSIONES = [...EXTENSIONES_DE_PANTALLA,
  '.json', '.css', '.js', '.webmanifest', '.svg', '.txt', '.md'];
const NO_SE_ARMAN = ['node_modules', 'dist'];

/** Los archivos que viven adentro de los tres programas, por su nombre desde la raíz. */
function archivosDeLosProgramas() {
  const salida = [];
  for (const programa of PROGRAMAS) {
    for (const camino of hayArchivos(join(raiz, programa), EXTENSIONES, NO_SE_ARMAN)) {
      salida.push(relative(raiz, camino).split(sep).join('/'));
    }
  }
  return salida;
}

/**
 * De los archivos de adentro de los programas, los que también están arriba y
 * nadie declaró ni como copia ni como excepción.
 *
 * `estaArriba` entra por separado para poder probar esto sin tocar el disco, y
 * `grupos` también: una prueba que se apoya en la lista de verdad deja de hablar
 * del buscador y pasa a hablar del proyecto, así que el día que alguien saca un
 * renglón de la lista la prueba se rompe y tapa lo que el buscador tenía que
 * decir.
 */
export function copiasSinDeclarar(deLosProgramas, estaArriba, grupos = GRUPOS) {
  const declaradas = new Set(grupos.flat());
  const sueltas = [];
  let coinciden = 0;
  let exentos = 0;
  for (const rel of deLosProgramas) {
    const arriba = rel.slice(rel.indexOf('/') + 1);
    if (!estaArriba(arriba)) continue;
    coinciden++;
    if (declaradas.has(rel)) continue;
    if (NO_SON_COPIAS.has(arriba)) { exentos++; continue; }
    sueltas.push([rel, arriba]);
  }
  return { sueltas, coinciden, exentos };
}

/**
 * Y las copias que no tienen ningún original arriba.
 *
 * Un archivo puede estar repetido adentro de dos programas y no existir arriba:
 * así están las dos hojas de estilo de los teléfonos, que son un grupo declarado
 * y no bajan de ningún original. El buscador de más arriba no las ve, porque
 * pregunta por el gemelo de arriba y no hay ninguno, así que ese grupo entero
 * podía desaparecer de la lista sin que nada avisara: nadie las compararía y
 * seguiría diciendo ✔.
 *
 * Acá el original es el hermano. Dos archivos en el mismo lugar adentro de dos
 * programas, iguales byte a byte, o están declarados en el mismo grupo o son
 * una excepción escrita. Iguales y sin declarar es una copia que nadie compara.
 *
 * Que dos sean iguales lo contesta `sonIguales`, que entra por separado para
 * poder probar esto sin tocar el disco, y `grupos` por el mismo motivo que en
 * el buscador de arriba.
 */
export function copiasEntreProgramas(deLosProgramas, sonIguales, grupos = GRUPOS) {
  const porLugar = new Map();
  for (const rel of deLosProgramas) {
    const lugar = rel.slice(rel.indexOf('/') + 1);
    if (!porLugar.has(lugar)) porLugar.set(lugar, []);
    porLugar.get(lugar).push(rel);
  }
  const sueltas = [];
  let pares = 0;
  for (const [lugar, enVariosProgramas] of porLugar) {
    for (let i = 0; i < enVariosProgramas.length; i++) {
      for (let j = i + 1; j < enVariosProgramas.length; j++) {
        const uno = enVariosProgramas[i];
        const otro = enVariosProgramas[j];
        pares++;
        if (!sonIguales(uno, otro)) continue;
        if (grupos.some((g) => g.includes(uno) && g.includes(otro))) continue;
        if (NO_SON_COPIAS.has(lugar)) continue;
        sueltas.push([uno, otro]);
      }
    }
  }
  return { sueltas, pares };
}

/* Una prueba que no puede fallar no prueba nada: antes de salir a buscar, el
   buscador se prueba contra las cuatro cosas que puede encontrarse. */
function probarElBuscador() {
  const arriba = new Set(['data/catalogo-frases.json', 'data/catalogo-inventado.json', 'package.json']);
  const { sueltas, coinciden, exentos } = copiasSinDeclarar([
    'pwa-asistente/data/catalogo-frases.json',
    'pwa-asistente/data/catalogo-inventado.json',
    'pwa-asistente/package.json',
    'pwa-asistente/src/pantallas/Inventada.jsx'
  ], (r) => arriba.has(r),
  [['data/catalogo-frases.json', 'pwa-asistente/data/catalogo-frases.json']]);
  const roto = [];
  if (sueltas.length !== 1 || sueltas[0][0] !== 'pwa-asistente/data/catalogo-inventado.json') {
    roto.push('no encuentra la copia que nadie declaró, o encuentra de más');
  }
  if (coinciden !== 3) roto.push('no cuenta bien los que también están arriba');
  if (exentos !== 1) roto.push('no reconoce la excepción escrita');
  if (roto.length) {
    console.error('El buscador de copias sin declarar está roto, así que no verifica nada:');
    for (const r of roto) console.error('  ' + r);
    process.exit(1);
  }
}
probarElBuscador();

/* Y el de los hermanos contra las suyas: la declarada, la que nadie declaró, la
   exenta y la que no es copia porque los dos archivos son distintos. */
function probarElBuscadorDeHermanos() {
  const iguales = new Set([
    'pwa-asistente/css/styles-pwa.css|pwa-familia/css/styles-pwa.css',
    'pwa-asistente/data/catalogo-inventado.json|pwa-familia/data/catalogo-inventado.json',
    'pwa-asistente/package.json|pwa-familia/package.json'
  ]);
  const { sueltas, pares } = copiasEntreProgramas([
    'pwa-asistente/css/styles-pwa.css', 'pwa-familia/css/styles-pwa.css',
    'pwa-asistente/data/catalogo-inventado.json', 'pwa-familia/data/catalogo-inventado.json',
    'pwa-asistente/package.json', 'pwa-familia/package.json',
    'pwa-asistente/src/Programa.jsx', 'pwa-familia/src/Programa.jsx',
    'web/src/Sola.jsx'
  ], (uno, otro) => iguales.has(uno + '|' + otro),
  [['pwa-asistente/css/styles-pwa.css', 'pwa-familia/css/styles-pwa.css']]);
  const roto = [];
  if (sueltas.length !== 1 || sueltas[0][0] !== 'pwa-asistente/data/catalogo-inventado.json') {
    roto.push('no encuentra la copia entre hermanos que nadie declaró, o encuentra de más');
  }
  if (pares !== 4) roto.push('no cuenta bien los pares que están en el mismo lugar');
  if (roto.length) {
    console.error('El buscador de copias entre programas está roto, así que no verifica nada:');
    for (const r of roto) console.error('  ' + r);
    process.exit(1);
  }
}
probarElBuscadorDeHermanos();

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
  /* Y las que nadie declaró. No corre cuando se pide un grupo suelto: ahí quien
     llama pregunta por ése y no por el estado de todo el proyecto. */
  let coinciden = 0;
  let exentos = 0;
  let pares = 0;
  if (!soloGrupo) {
    const deLosProgramas = archivosDeLosProgramas();
    const hallado = copiasSinDeclarar(
      deLosProgramas,
      (arriba) => existsSync(join(raiz, arriba.split('/').join(sep))));
    coinciden = hallado.coinciden;
    exentos = hallado.exentos;
    for (const [rel, arriba] of hallado.sueltas) {
      problemas.push(rel + ' es una copia de ' + arriba + ' que nadie declaró.\n'
        + '  Mientras no esté en `GRUPOS`, nadie las compara y se separan calladas.\n'
        + '  Si no es una copia, va a `NO_SON_COPIAS` con el motivo escrito.');
    }
    /* Y las que no tienen original arriba, que el buscador de recién no puede
       encontrar por más que las mire: ésas se comparan contra su hermano. */
    const deLosHermanos = copiasEntreProgramas(deLosProgramas, (uno, otro) =>
      readFileSync(join(raiz, uno.split('/').join(sep)))
        .equals(readFileSync(join(raiz, otro.split('/').join(sep)))));
    pares = deLosHermanos.pares;
    for (const [uno, otro] of deLosHermanos.sueltas) {
      problemas.push(uno + ' y ' + otro + ' son iguales byte a byte y nadie los declaró.\n'
        + '  Mientras no estén en el mismo grupo, nadie los compara y se separan callados.\n'
        + '  Si ser iguales es casualidad, va a `NO_SON_COPIAS` con el motivo escrito.');
    }
  }
  /* Sin esto, un `soloGrupo` mal escrito descarta todos los grupos y
     devuelve «0 problemas», que se lee igual que «está todo bien». */
  seRevisaron(
    comparadas + problemas.length,
    soloGrupo ? `el grupo «${soloGrupo}» en la lista de copias` : 'un solo grupo de copias'
  );
  return { problemas, comparadas, coinciden, exentos, pares };
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
  const { problemas, comparadas, coinciden, exentos, pares } = verificarCopias();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log('Copias verificadas: ' + comparadas + ' iguales byte a byte a su original, y'
    + ' ninguna sin declarar entre los ' + coinciden + ' archivos de los tres programas que'
    + ' también están arriba (' + exentos + ' exentos, con su motivo escrito). Y de los '
    + pares + ' pares que dos programas tienen en el mismo lugar, ninguno es una copia'
    + ' igual a su hermano que nadie haya declarado.');
}
