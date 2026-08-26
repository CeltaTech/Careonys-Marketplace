/* ===================================================
   VERIFICA QUE EL CATÁLOGO DIGA DÓNDE SE LO USA DE VERDAD

       node scripts/verificar_usos.mjs
       node scripts/verificar_usos.mjs --escribir

   Cada vocabulario de `data/catalogo-vocabularios.json` lleva una lista
   `usado_en` que dice en qué pantalla y en qué renglón se lo usa. Esa lista se
   mantenía a mano, y el marcado se mueve todos los días: medida el 26 de agosto
   de 2026 contra los archivos reales, **35 de las 36 citas apuntaban a un
   renglón donde ya no se nombraba el vocabulario**, y una apuntaba al renglón
   510 de un archivo de 486. Pasaron dieciséis chequeos sin que nadie las mirara
   porque `verificar_referencias.mjs` mira los documentos de `docs/` y no entra
   en `data/`.

   Este guion la calcula en vez de leerla. Con `--escribir` la reescribe en el
   original y vuelve a copiar el archivo a las dos aplicaciones —así
   `verificar_copias` sigue en verde—. Sin la opción, sólo compara y falla si el
   catálogo dice una cosa y el marcado hace otra.

   POR DÓNDE LLEGA UN VOCABULARIO A LA PANTALLA. Son seis formas, y todas se
   declaran; ninguna hay que adivinarla:

     1. `data-catalogo="X"` en el marcado. La pantalla no dibuja las opciones:
        las pide.
     2. `data-campo="algo@X"` en el marcado, que es lo mismo dicho desde la
        declaración de un campo.
     3. `"vocabulario": "X"` —o una lista de nombres— en
        `data/catalogo-fichas.json`, que es como las fichas del legajo declaran
        sus campos.
     4. `"filas": "X"` y `"columnas": "X"` en
        `data/catalogo-disponibilidad.json`, que es de donde la grilla saca los
        días y los turnos.
     5. `Catalogo.items('X')` y `Catalogo.etiquetaSiExiste('X', …)`, que son las
        dos puertas del catálogo que reciben el nombre del vocabulario.
     6. La lista que recorre `etiquetaDeTarea` en `js/catalogo.js`, que busca una
        tarea en tres vocabularios seguidos.

   QUÉ NO CUENTA, Y POR QUÉ. Que el nombre aparezca entre comillas no alcanza:
   `genero`, `zona`, `frecuencia` y `patologia` son además nombres de columna de
   la base y de control del formulario. `input[name="patologia"]` y
   `elegidas('tarea_cuidado')` **leen de vuelta** lo que el catálogo ya dibujó
   —van a parar al `data-catalogo` que ya está contado—, así que contarlos otra
   vez sería contar dos veces el mismo lugar. Y los ejemplos del encabezado de
   `js/catalogo.js` traen `data-catalogo="genero"` escrito adentro de un
   comentario: por eso la forma 1 se busca sólo en `.html`.

   LAS COPIAS NO SE CITAN. Once archivos viven repetidos en las dos
   aplicaciones y `verificar_copias.mjs` los mantiene iguales byte a byte. Un
   portador que aparece en una copia se le atribuye a su original, que es donde
   hay que ir a tocarlo. La lista de copias sale de ese mismo chequeo, no de
   una segunda lista acá.

   QUÉ NO MIRA. Si un vocabulario no lo usa nadie, lo dice y no falla: puede ser
   que falte la pantalla que lo iba a usar, o que sobre él, y eso es una
   decisión, no un defecto. Tampoco mira si las claves guardadas en la base
   siguen existiendo en el catálogo — eso es otro chequeo que todavía no está.
=================================================== */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { archivos } from './recorrido.mjs';
import { GRUPOS } from './verificar_copias.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOGO = 'data/catalogo-vocabularios.json';
const FICHAS = 'data/catalogo-fichas.json';
const DISPONIBILIDAD = 'data/catalogo-disponibilidad.json';

const aRuta = (relativa) => join(raiz, relativa.split('/').join(sep));

/* Cada copia apunta a su original. Sale de `verificar_copias.mjs` para que la
   lista de copias viva en un solo lugar. */
const originalDe = new Map();
for (const [original, ...copias] of GRUPOS) {
  for (const copia of copias) originalDe.set(copia, original);
}

/** Devuelve `{ usos, sinUsar }`: dónde se usa cada vocabulario, calculado. */
export function calcularUsos() {
  const catalogo = JSON.parse(readFileSync(aRuta(CATALOGO), 'utf8'));
  const nombres = new Set(Object.keys(catalogo.vocabularios));

  /* Nombre del vocabulario → conjunto de `archivo:renglón`. Conjunto y no lista
     porque dos formas distintas pueden caer en el mismo renglón. */
  const usos = new Map();
  for (const nombre of nombres) usos.set(nombre, new Set());

  const anotar = (nombre, relativa, renglon) => {
    if (!nombres.has(nombre)) return;
    const donde = originalDe.get(relativa) || relativa;
    /* Si el portador estaba en una copia, el renglón es el mismo: el chequeo de
       copias garantiza que los archivos son idénticos byte a byte. */
    usos.get(nombre).add(donde + ':' + renglon);
  };

  const enComillas = (texto) => {
    const salida = [];
    for (const encontrado of texto.matchAll(/["']([a-z_]+)["']/g)) salida.push(encontrado[1]);
    return salida;
  };

  // --- Formas 1, 2 y 5: en el marcado y en los guiones ---------------------
  const mirados = archivos(raiz, ['.html', '.js'], ['docs', 'supabase', 'scripts']);

  for (const camino of mirados) {
    const relativa = camino.slice(raiz.length + 1).split(sep).join('/');
    const esMarcado = relativa.toLowerCase().endsWith('.html');
    const renglones = readFileSync(camino, 'utf8').split('\n');

    renglones.forEach((renglon, i) => {
      const numero = i + 1;

      if (esMarcado) {
        for (const x of renglon.matchAll(/data-catalogo="([a-z_]+)"/g)) anotar(x[1], relativa, numero);
        for (const x of renglon.matchAll(/data-campo="[^"]*@([a-z_]+)"/g)) anotar(x[1], relativa, numero);
      }

      for (const x of renglon.matchAll(/\b(?:items|etiquetaSiExiste)\(\s*["']([a-z_]+)["']/g)) {
        anotar(x[1], relativa, numero);
      }

      // Forma 6: la lista que `etiquetaDeTarea` recorre, en `js/catalogo.js`.
      if (relativa.endsWith('js/catalogo.js') && /const donde = \[/.test(renglon)) {
        for (const nombre of enComillas(renglon)) anotar(nombre, relativa, numero);
      }
    });
  }

  // --- Forma 3: los campos de las fichas del legajo -------------------------
  readFileSync(aRuta(FICHAS), 'utf8').split('\n').forEach((renglon, i) => {
    if (!/"vocabulario"\s*:/.test(renglon)) return;
    for (const nombre of enComillas(renglon.slice(renglon.indexOf(':')))) {
      anotar(nombre, FICHAS, i + 1);
    }
  });

  // --- Forma 4: los ejes de la grilla de disponibilidad ---------------------
  readFileSync(aRuta(DISPONIBILIDAD), 'utf8').split('\n').forEach((renglon, i) => {
    const x = renglon.match(/"(?:filas|columnas)"\s*:\s*"([a-z_]+)"/);
    if (x) anotar(x[1], DISPONIBILIDAD, i + 1);
  });

  const ordenadas = new Map();
  const sinUsar = [];
  for (const [nombre, donde] of usos) {
    const lista = [...donde].sort();
    ordenadas.set(nombre, lista);
    if (lista.length === 0) sinUsar.push(nombre);
  }
  return { catalogo, usos: ordenadas, sinUsar };
}

/** Los problemas, vacío si el catálogo dice exactamente lo que hace el marcado. */
function comparar(catalogo, usos) {
  const problemas = [];
  let citas = 0;

  for (const [nombre, definicion] of Object.entries(catalogo.vocabularios)) {
    const dice = definicion.usado_en || [];
    const hay = usos.get(nombre) || [];
    citas += hay.length;

    const sobran = dice.filter((c) => !hay.includes(c));
    const faltan = hay.filter((c) => !dice.includes(c));
    if (sobran.length === 0 && faltan.length === 0) continue;

    const detalle = [`El vocabulario \`${nombre}\` no dice dónde se lo usa.`];
    if (sobran.length) {
      detalle.push('  Dice que se lo usa acá, y ahí no se lo nombra:');
      for (const c of sobran) detalle.push('      ' + c);
    }
    if (faltan.length) {
      detalle.push('  Se lo usa acá, y no lo dice:');
      for (const c of faltan) detalle.push('      ' + c);
    }
    problemas.push(detalle.join('\n'));
  }

  return { problemas, citas };
}

/** Reescribe `usado_en` en el original y vuelve a copiar el archivo. */
function escribir(usos) {
  const texto = readFileSync(aRuta(CATALOGO), 'utf8');
  const catalogo = JSON.parse(texto);
  for (const [nombre, definicion] of Object.entries(catalogo.vocabularios)) {
    definicion.usado_en = usos.get(nombre) || [];
  }
  const salto = texto.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(aRuta(CATALOGO), JSON.stringify(catalogo, null, 2).split('\n').join(salto) + salto);

  let copiadas = 0;
  for (const [original, ...copias] of GRUPOS) {
    if (original !== CATALOGO) continue;
    for (const copia of copias) {
      copyFileSync(aRuta(original), aRuta(copia));
      copiadas++;
    }
  }
  console.log(`Reescrito ${CATALOGO} y copiado a ${copiadas} carpetas.`);
}

// Solo corre cuando se lo llama a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { catalogo, usos, sinUsar } = calcularUsos();

  if (process.argv.includes('--escribir')) {
    escribir(usos);
    process.exit(0);
  }

  const { problemas, citas } = comparar(catalogo, usos);
  if (problemas.length) {
    console.error(
      '\n' + problemas.join('\n\n') +
      '\n\nLa lista `usado_en` se calcula, no se escribe a mano. Se rehace con:\n' +
      '    node scripts/verificar_usos.mjs --escribir\n'
    );
    process.exit(1);
  }

  const cola = sinUsar.length
    ? ` No los usa nadie, y eso está sin decidir: ${sinUsar.join(', ')}.`
    : '';
  console.log(
    `Usos verificados: ${citas} citas de ${Object.keys(catalogo.vocabularios).length} ` +
    `vocabularios, cada una en el renglón que dice.${cola}`
  );
}
