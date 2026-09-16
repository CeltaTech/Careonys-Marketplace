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
     5. Las dos puertas del catálogo que reciben el nombre del vocabulario,
        `Catalogo.items('X')` y `Catalogo.etiquetaSiExiste('X', …)`, y también
        quien se lo lleva a ellas. Una pantalla de un programa escribe
        `<SelectDelCatalogo clave="X">`, de ahí el nombre pasa a
        `useVocabulario` y recién ése llama a `items`: el nombre está escrito
        tres escalones antes de la puerta. Quiénes son esos portadores no está
        escrito acá —una lista a mano llega hasta donde llegaba el proyecto el
        día que se escribió—: se buscan en el código, y se sigue buscando hasta
        que no aparece ninguno nuevo.
     6. La lista que recorre `etiquetaDeTarea` en `js/catalogo.js`, que busca una
        tarea en tres vocabularios seguidos.

   QUÉ NO CUENTA, Y POR QUÉ. Que el nombre aparezca entre comillas no alcanza:
   `genero`, `zona`, `frecuencia` y `patologia` son además nombres de columna de
   la base y de control del formulario. `input[name="patologia"]` y
   `elegidas('tarea_cuidado')` **leen de vuelta** lo que el catálogo ya dibujó
   —van a parar al `data-catalogo` que ya está contado—, así que contarlos otra
   vez sería contar dos veces el mismo lugar. Y los ejemplos del encabezado de
   `js/catalogo.js` traen `data-catalogo="genero"` escrito adentro de un
   comentario: por eso la forma 1 se busca en las pantallas y no en los guiones.

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
import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA, esPantalla } from './recorrido.mjs';
import { GRUPOS } from './verificar_copias.mjs';
import { comoSeEscribe, valorDe } from './atributos.mjs';

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

/* --- Quién le lleva el nombre al catálogo ----------------------------------
   Las dos puertas del catálogo reciben el nombre del vocabulario, pero casi
   nadie se lo escribe a ellas: se lo escribe a quien se lo lleva, y ése puede
   recibirlo de otro. Una pantalla de un programa escribe
   `<SelectDelCatalogo clave="X">`, de ahí el nombre pasa a `useVocabulario` y
   recién ése llama a `items`: tres escalones, y el nombre está escrito en el
   primero. Por eso los portadores no están escritos acá —una lista a mano
   llega hasta donde llegaba el proyecto el día que se escribió—: se buscan en
   el código y se sigue buscando hasta que no aparece ninguno nuevo.

   Un portador recibe el nombre de una de dos maneras, y son las dos que hay:
   en el lugar del primer argumento, o con el nombre de una propiedad, cuando
   lo que recibe es un ramillete de propiedades. */
const PUERTAS = ['items', 'etiquetaSiExiste'];

const DECLARACION = /(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=)\s*\(/g;

/* Lo que hay entre el paréntesis que abre y el que le cierra. Se cuentan los
   paréntesis porque un parámetro puede traer el suyo adentro. */
function entreParentesis(texto, abre) {
  let nivel = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '(') nivel++;
    else if (texto[i] === ')' && --nivel === 0) return texto.slice(abre + 1, i);
  }
  return '';
}

/* El primer parámetro: hasta la primera coma que no esté adentro de nada. */
function primerParametro(lista) {
  let nivel = 0;
  for (let i = 0; i < lista.length; i++) {
    const c = lista[i];
    if (c === '{' || c === '[' || c === '(') nivel++;
    else if (c === '}' || c === ']' || c === ')') nivel--;
    else if (c === ',' && nivel === 0) return lista.slice(0, i).trim();
  }
  return lista.trim();
}

/**
 * Quiénes llevan el nombre de un vocabulario hasta el catálogo.
 * Devuelve `{ porArgumento, porPropiedad }`: los que lo reciben en el lugar
 * del primer argumento —las dos puertas incluidas— y los nombres de propiedad
 * con los que se lo escribe una pantalla de un programa.
 */
export function portadores(textos) {
  /* Se los guarda antes de empezar: se los recorre una vez por vuelta, y un
     recorrido que llegue abierto se gasta en la primera. */
  const todos = [...textos];
  const porArgumento = new Set(PUERTAS);
  const porPropiedad = new Set();

  /* Quién declara `local` como su primer parámetro, o adentro de él. */
  const quienLoRecibe = (texto, local) => {
    const suelto = new RegExp(String.raw`\b${local}\b`);
    DECLARACION.lastIndex = 0;
    let d;
    while ((d = DECLARACION.exec(texto)) !== null) {
      const primero = primerParametro(entreParentesis(texto, DECLARACION.lastIndex - 1));
      if (!suelto.test(primero)) continue;
      if (primero === local) {
        const nombre = d[1] || d[2];
        if (nombre) porArgumento.add(nombre);
      } else if (primero.startsWith('{')) {
        porPropiedad.add(local);
      }
    }
  };

  for (let antes = -1; porArgumento.size + porPropiedad.size !== antes;) {
    antes = porArgumento.size + porPropiedad.size;
    for (const texto of todos) {
      for (const quien of [...porArgumento]) {
        const entrega = new RegExp(String.raw`\b${quien}\(\s*([A-Za-z_$][\w$]*)\s*[,)]`, 'g');
        for (const m of texto.matchAll(entrega)) quienLoRecibe(texto, m[1]);
      }
    }
  }

  return { porArgumento, porPropiedad };
}

/* Una prueba que no puede fallar no prueba nada: el buscador de portadores se
   prueba contra los tres escalones antes de mirar el proyecto.

   El orden importa y es a propósito: la pantalla va primera, así que cuando se
   la mira todavía no se sabe que quien está abajo de ella lleva el nombre, y
   la propiedad recién aparece en la segunda vuelta. Puesta al revés, el
   buscador llegaría a todo en una sola vuelta y la prueba no estaría probando
   que haya segunda. */
const ESCALONES = [
  'export function SelectDelCatalogo({\n  id, clave, required, vacio = "comun.seleccionar",\n}) {\n'
  + '  const { estado, items } = useVocabulario(clave);\n}\n',
  'export function useVocabulario(clave, { desdeLaOferta = false } = {}) {\n'
  + '  return Catalogo.cargar().then(() => Catalogo.items(clave));\n}\n',
  'function avTexto(vocabulario, clave) {\n'
  + '  return Catalogo.etiquetaSiExiste(vocabulario, clave) || clave;\n}\n'
];
function probarElBuscador() {
  /* Se lo llama con un recorrido abierto y no con la lista: hace falta más de
     una vuelta para llegar a la propiedad, y el escalón del medio se pierde si
     la segunda vuelta no vuelve a ver los mismos textos. */
  const hallados = portadores(ESCALONES.values());
  const faltan = [
    ['useVocabulario', hallados.porArgumento.has('useVocabulario')],
    ['avTexto', hallados.porArgumento.has('avTexto')],
    ['la propiedad `clave`', hallados.porPropiedad.has('clave')]
  ].filter(([, hay]) => !hay);
  if (!faltan.length) return;
  console.error('El buscador de portadores está roto, así que no verifica nada:');
  for (const [q] of faltan) console.error('  no encuentra: ' + q);
  process.exit(1);
}

/** Devuelve `{ usos, sinUsar }`: dónde se usa cada vocabulario, calculado. */
export function calcularUsos() {
  const catalogo = JSON.parse(readFileSync(aRuta(CATALOGO), 'utf8'));
  const nombres = new Set(Object.keys(catalogo.vocabularios));
  seRevisaron(nombres.size, 'un solo vocabulario en el catálogo');

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
    for (const encontrado of texto.matchAll(/["']([a-z_][a-z0-9_]*)["']/g)) salida.push(encontrado[1]);
    return salida;
  };

  const textos = new Map();
  for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'],
    ['docs', 'supabase', 'scripts'])) {
    textos.set(camino.slice(raiz.length + 1).split(sep).join('/'), readFileSync(camino, 'utf8'));
  }

  const { porArgumento, porPropiedad } = portadores(textos.values());
  seRevisaron(porArgumento.size - PUERTAS.length + porPropiedad.size,
    'ni un portador del nombre de un vocabulario');

  /* Un nombre escrito con todas las letras como valor de una propiedad. Las
     maneras de envolverlo las sabe `scripts/atributos.mjs`, escritas una sola
     vez para todos los chequeos que preguntan lo mismo. */
  const escrita = new Map();
  for (const propiedad of porPropiedad) {
    escrita.set(propiedad, new RegExp(comoSeEscribe(propiedad), 'g'));
  }
  const llamada = new Map();
  for (const quien of porArgumento) {
    llamada.set(quien, new RegExp(String.raw`\b${quien}\(\s*["']([a-z_][a-z0-9_]*)["']`, 'g'));
  }

  // --- Formas 1, 2 y 5: en el marcado y en los guiones ---------------------
  for (const [relativa, texto] of textos) {
    const esMarcado = esPantalla(relativa);
    const esDeUnPrograma = relativa.endsWith(EXTENSIONES_DE_PANTALLA[1]);
    const renglones = texto.split('\n');

    renglones.forEach((renglon, i) => {
      const numero = i + 1;

      if (esMarcado) {
        for (const x of renglon.matchAll(/data-catalogo="([a-z_][a-z0-9_]*)"/g)) anotar(x[1], relativa, numero);
        for (const x of renglon.matchAll(/data-campo="[^"]*@([a-z_][a-z0-9_]*)"/g)) anotar(x[1], relativa, numero);
      }

      for (const quien of llamada.values()) {
        quien.lastIndex = 0;
        for (const x of renglon.matchAll(quien)) anotar(x[1], relativa, numero);
      }

      /* La propiedad se lee sólo en una pantalla de un programa, que es donde
         se escribe: en un guion, `data-clave="${campo.clave}"` lleva el mismo
         nombre y no nombra ningún vocabulario. */
      if (esDeUnPrograma) {
        for (const propiedad of escrita.values()) {
          propiedad.lastIndex = 0;
          for (const x of renglon.matchAll(propiedad)) {
            const valor = valorDe(x);
            if (valor) anotar(valor, relativa, numero);
          }
        }
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
    const x = renglon.match(/"(?:filas|columnas)"\s*:\s*"([a-z_][a-z0-9_]*)"/);
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
  probarElBuscador();
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
