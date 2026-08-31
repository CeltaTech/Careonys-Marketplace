#!/usr/bin/env node
/* ===================================================
   LA PALABRA QUE EL GLOSARIO SACÓ, EN TODAS LAS SUPERFICIES DONDE VUELVE

   La regla del glosario de la empresa no habla sólo de lo que se ve en la
   pantalla. Dice, con todas las letras, a qué se aplica: «código, nombres de
   tablas y columnas, claves de idioma, texto visible, documentación y mensajes
   de commit». Son seis superficies, y hasta el 31 de agosto de 2026 había una
   sola vigilada: `verificar_vocabulario.mjs` mira **el texto que ve una
   persona**, y por eso deja afuera a propósito `docs/`, `scripts/` y los
   comentarios del código. Este chequeo es la otra mitad.

   Lo que lo hizo falta se midió antes de escribirlo. El 29 de agosto de 2026 el
   Desarrollador aprobó `i18n` y dejó prohibidas sus hermanas; dos días después
   la palabra vieja seguía escrita **28 veces en once archivos** —la lista de
   pendientes, el alcance, el catálogo, tres guiones de chequeo, el plan de las
   zonas y las tres copias de `js/catalogo.js`— y además le daba nombre a un
   documento entero. Ninguna estaba mal escrita a propósito: todas citaban la
   regla de la empresa con el nombre que la regla tenía antes. Una palabra que
   se decide y no se barre no se decidió: quedó escrita en un archivo que nadie
   vuelve a abrir.

   ── Las dos preguntas ──────────────────────────────────────────────────────

   1. **En los archivos vivos.** Ninguna palabra prohibida, en ningún archivo de
      texto del proyecto, la lea una persona o no.

   2. **En los mensajes de commit**, que es la superficie que la regla nombra y
      la única que **no se puede arreglar después**: un mensaje ya escrito es
      historia, y la historia no se reescribe. Cada palabra se exige desde el
      commit en que dejó de usarse, que está anotado al lado de la palabra.

   ── Y por eso corre en dos momentos ────────────────────────────────────────

   El gancho de `commit` corre **antes** de que el mensaje exista, así que desde
   ahí la segunda pregunta sólo alcanza lo que ya está escrito: un mensaje con la
   palabra vieja pasaría el gancho y se vería recién en el commit siguiente,
   cuando ya es permanente. Por eso hay un segundo gancho, `.githooks/commit-msg`,
   que llama a este mismo guion con `--mensaje <archivo>` y juzga **el mensaje que
   se está por escribir**, que es el único momento en que todavía se puede
   cambiar. Ahí no hay fronteras: un mensaje nuevo no tiene de qué eximirse.

   ── Qué NO mira ────────────────────────────────────────────────────────────

   **Las palabras que el glosario prohíbe sólo en un sentido.** «App», «sistema»
   y «plataforma» están prohibidas «cuando se habla de una unidad vendible», y
   «paquete» cuando nombra un Plan. Un chequeo que no sabe distinguir el sentido
   avisaría de más, y un chequeo que avisa de más se apaga. Acá entran nada más
   que las palabras que no dependen del contexto: no hay forma legítima de
   escribirlas.

   **`tenant`, que parece la primera candidata y no lo es.** «Organización» es la
   palabra del glosario, pero `tenants` y `tenant_id` son el nombre de una tabla
   y de una columna, y la regla «lo que se guarda para siempre se nombra por lo
   que hace, y no se renombra» los deja donde están. Medido: 300 apariciones,
   todas de esa forma. Prohibirla sería pedir una migración de datos.

   **`multi-tenant`, `SaaS` y `RLS`**, que el glosario nombra una por una como
   las que **sí** pasan la cuarta pregunta.

   ── Un detalle que lo separa de `verificar_vocabulario.mjs` ────────────────

   Allá el borde de palabra deja afuera el guion y el guion bajo, para no
   confundir un nombre de código con una palabra escrita para leer. Acá el borde
   **los incluye**, porque el glosario dice que la regla vale «igual para el
   texto y para los identificadores»: si no, `PLAN_MULTIIDIOMA.md` pasaría por
   ser un nombre de archivo, que es exactamente el caso que hubo.
=================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Todo archivo de texto del proyecto. No se filtra por carpeta: la regla vale
   en la documentación, en el código y en la configuración por igual. La de las
   pantallas no se escribe acá —sale de `recorrido.mjs`—, así que el día que
   dejen de ser `.html` este chequeo las sigue mirando. */
const EXTENSIONES = [
  ...EXTENSIONES_DE_PANTALLA,
  '.md', '.mjs', '.js', '.css', '.json', '.sql', '.toml',
  '.webmanifest', '.yml', '.yaml', '.txt'
];

/* ── Las palabras ─────────────────────────────────────────────────────────
   `formas` son todas las maneras de escribir la vieja; `aprobada` es la que va
   en su lugar; `desde` es el commit **después del cual** ningún mensaje la usa,
   o `null` si no la usó ninguno en toda la historia. */
const PROHIBIDAS = [
  {
    formas: 'multiidioma|multiidiomas|multilenguaje|multilenguajes|' +
            'internacionalizacion|internacionalización|i10n',
    aprobada: 'i18n',
    porque: 'aprobada por el Desarrollador el 2026-08-29, y vale igual para el ' +
            'texto y para los identificadores',
    /* Los seis mensajes que la usan son todos del 26 de agosto de 2026, tres
       días antes de que la palabra se decidiera. `ec0da18` es el último. */
    desde: 'ec0da18'
  },
  {
    formas: 'licenciataria|licenciatarias',
    aprobada: 'Cliente',
    porque: 'con quien hay contrato y a quién se le factura es un **Cliente** ' +
            '(CLAUDE.md de la empresa, glosario)',
    desde: null
  },
  {
    formas: 'xeitra',
    aprobada: 'CeltaTech',
    porque: 'es el nombre anterior de la empresa',
    desde: null
  },
  {
    formas: 'aurevia',
    aprobada: 'Careonys',
    porque: 'es el nombre anterior del producto',
    desde: null
  }
];

/* El borde de palabra se marca con propiedades Unicode y **no** deja afuera el
   guion ni el guion bajo: acá un identificador cuenta igual que una frase. */
const bordear = (formas) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(${formas})(?![\\p{L}\\p{N}])`, 'giu');

for (const p of PROHIBIDAS) p.patron = bordear(p.formas);

/** La primera palabra prohibida del texto, con su entrada, o null. */
function palabraQueSobra(texto) {
  for (const p of PROHIBIDAS) {
    p.patron.lastIndex = 0;
    const acierto = p.patron.exec(texto);
    if (acierto) return { entrada: p, escrita: acierto[0], desde: acierto.index };
  }
  return null;
}

/* ── Quién está exento, y por qué ──────────────────────────────────────────
   Cada entrada dice **qué archivo** y **por qué**, y más abajo se comprueba que
   la palabra siga estando ahí: una exención que ya no hace falta es una puerta
   abierta con la llave puesta, no un permiso vigente. */
const EXENTOS = new Map([
  ['supabase/migrations',
   'una migración aplicada no se edita jamás: se corrige con otra adelante, y ' +
   'un comentario no justifica una migración nueva'],
  ['docs/modelo_de_negocios_careonys.md',
   'documento de negocio heredado, escrito antes del glosario de la empresa'],
  ['docs/modelo_de_negocios_prestadora.md',
   'documento de negocio heredado, escrito antes del glosario de la empresa'],
  ['docs/Nueva carpeta/MAPA_DE_VOCABULARIO.md',
   'es el mapa de la palabra vieja a la nueva: ahí la palabra vieja **es** la ' +
   'columna izquierda, y sacarla dejaría el mapa sin de dónde partir'],
  ['supabase/config.toml',
   'nombra tres entornos de Supabase que existen en la máquina del ' +
   'Desarrollador; cómo se llama un entorno no lo decide este repositorio'],
  ['scripts/verificar_glosario.mjs',
   'es el archivo que declara cuáles son las palabras prohibidas, y no las ' +
   'puede declarar sin escribirlas']
]);

/** ¿Este archivo está exento? Devuelve el motivo, o null. */
function exento(rel) {
  for (const [clave, motivo] of EXENTOS) {
    if (rel === clave || rel.startsWith(clave + '/')) return motivo;
  }
  return null;
}

/* ── Una prueba que no puede fallar no prueba nada ─────────────────────────
   Antes de recorrer el proyecto, el detector se prueba contra textos que tienen
   que caer y contra textos que no. */
const SOBRAN = [
  'la regla de multiidioma rige el texto',
  '«Multiidioma desde el día uno»',
  'docs/PLAN_MULTIIDIOMA.md',
  'está trabado el multilenguaje',
  'la internacionalización de la pantalla',
  'la carpeta i10n',
  'empresas licenciatarias o franquicias',
  'antes se llamaba Xeitra',
  'el entorno aurevia'
];

const NO_SOBRAN = [
  '«i18n desde el día uno»',
  'docs/PLAN_I18N.md',
  'la arquitectura multi-tenant',
  'se vende como SaaS',
  'la RLS de la tabla',
  'tenant_id nulo es la oferta general',
  'multiidiomatico no es la palabra',
  'CeltaTech desarrolla Careonys'
];

for (const frase of SOBRAN) {
  if (!palabraQueSobra(frase)) {
    console.error(`El detector no vio la palabra vieja en «${frase}».`);
    process.exit(1);
  }
}

for (const frase of NO_SOBRAN) {
  const visto = palabraQueSobra(frase);
  if (visto) {
    console.error(
      `El detector se llevó puesta una frase legítima: «${frase}» ` +
      `(vio «${visto.escrita}»).`);
    process.exit(1);
  }
}

/* ── El otro momento: el mensaje que se está por escribir ─────────────────
   Llamado con `--mensaje <archivo>`, el guion no recorre nada: juzga ese solo
   texto y se va. Es lo que hace `.githooks/commit-msg`, y es el único momento en
   que un mensaje todavía se puede cambiar. Se saltean los renglones que empiezan
   con `#`, que git borra antes de guardar. */
const pedido = process.argv.indexOf('--mensaje');
if (pedido !== -1) {
  const archivo = process.argv[pedido + 1];
  if (!archivo) {
    console.error('`--mensaje` necesita el archivo con el mensaje del commit.');
    process.exit(1);
  }
  const mensaje = readFileSync(archivo, 'utf8')
    .split('\n')
    .filter((r) => !r.startsWith('#'))
    .join('\n');

  const visto = palabraQueSobra(mensaje);
  if (visto) {
    console.error(
      `El mensaje del commit usa «${visto.escrita}», que el glosario sacó.\n` +
      `La palabra es «${visto.entrada.aprobada}»: ${visto.entrada.porque}.\n\n` +
      'Un mensaje de commit no se puede arreglar después: una vez escrito es\n' +
      'historia, y la historia no se reescribe. Este es el único momento.');
    process.exit(1);
  }
  console.log(
    'Mensaje verificado: ninguna de las palabras que el glosario sacó.');
  process.exit(0);
}

/* ── 1. En los archivos vivos ──────────────────────────────────────────── */

const fallas = [];
const exencionesUsadas = new Set();
let revisados = 0;

for (const camino of hayArchivos(raiz, EXTENSIONES)) {
  const rel = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');
  const motivo = exento(rel);

  if (motivo) {
    /* La exención comprueba su propia afirmación: si la palabra ya no está,
       la exención sobra y hay que sacarla. */
    if (palabraQueSobra(texto)) {
      for (const [clave] of EXENTOS) {
        if (rel === clave || rel.startsWith(clave + '/')) exencionesUsadas.add(clave);
      }
    }
    continue;
  }

  revisados += 1;
  const renglones = texto.split('\n');
  for (let i = 0; i < renglones.length; i += 1) {
    const visto = palabraQueSobra(renglones[i]);
    if (!visto) continue;
    fallas.push(
      `${rel}:${i + 1}  «${visto.escrita}» → «${visto.entrada.aprobada}»\n` +
      `      ${renglones[i].trim().slice(0, 110)}`);
  }
}

/* ── 2. En los mensajes de commit ──────────────────────────────────────── */

function git(args) {
  return execFileSync('git', args, { cwd: raiz, encoding: 'utf8', shell: false });
}

const enLaHistoria = [];
let mensajes = 0;

try {
  git(['rev-parse', '--verify', 'HEAD']);

  /* La frontera de cada palabra se resuelve una sola vez, y el historial se lee
     una sola vez: si no, cada commit se contaría una vez por palabra y el número
     del verde diría el cuádruple de los commits que hay. */
  for (const p of PROHIBIDAS) {
    p.alcanza = p.desde
      ? new Set(git(['log', '--format=%h', `${p.desde}..HEAD`]).split('\n').filter(Boolean))
      : null;
  }

  /* Un registro por commit y un separador adentro: así un mensaje con renglones
     en blanco no parte el listado. */
  const crudo = git(['log', '--format=%h%x1f%ad%x1f%B%x1e', '--date=short', 'HEAD']);
  for (const bloque of crudo.split('\x1e')) {
    const limpio = bloque.trim();
    if (!limpio) continue;
    const [corto, fecha, mensaje] = limpio.split('\x1f');
    mensajes += 1;
    for (const p of PROHIBIDAS) {
      if (p.alcanza && !p.alcanza.has(corto)) continue;
      p.patron.lastIndex = 0;
      const acierto = p.patron.exec(mensaje);
      if (!acierto) continue;
      enLaHistoria.push(
        `${corto} (${fecha})  «${acierto[0]}» → «${p.aprobada}»\n` +
        `      ${mensaje.split('\n')[0].slice(0, 110)}`);
    }
  }
} catch (error) {
  console.error(
    'No se pudo leer el historial, así que la mitad de los mensajes de commit\n' +
    'no se revisó. Eso no es un verde.\n' + error.message);
  process.exit(1);
}

/* ── El veredicto ──────────────────────────────────────────────────────── */

const sinUsar = [...EXENTOS.keys()].filter((c) => !exencionesUsadas.has(c));
if (sinUsar.length > 0) {
  console.error('Exenciones que ya no hacen falta:\n');
  for (const clave of sinUsar) console.error(`  - ${clave}`);
  console.error(
    '\nLa palabra vieja ya no está ahí, así que el permiso está de más.\n' +
    'Una exención que sobra es una puerta abierta con la llave puesta: el día\n' +
    'que la palabra vuelva a ese archivo, nadie se va a enterar.');
  process.exit(1);
}

if (enLaHistoria.length > 0) {
  console.error('Un mensaje de commit usa una palabra que el glosario sacó:\n');
  for (const falla of enLaHistoria) console.error('  - ' + falla);
  console.error(
    '\nUn mensaje ya escrito es historia y no se reescribe, así que esto no se\n' +
    'arregla: se corre la frontera de la palabra en `PROHIBIDAS`, y sólo si el\n' +
    'commit es anterior al día en que la palabra se decidió.');
  process.exit(1);
}

if (fallas.length > 0) {
  console.error('Palabras que el glosario sacó, todavía escritas:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'aparición' : 'apariciones';
  console.error(
    `\n${fallas.length} ${plural}. El glosario de la empresa aplica a «código,\n` +
    'nombres de tablas y columnas, claves de idioma, texto visible,\n' +
    'documentación y mensajes de commit»: no hay superficie donde la palabra\n' +
    'vieja siga valiendo.');
  process.exit(1);
}

const cuantas = PROHIBIDAS.reduce((n, p) => n + p.formas.split('|').length, 0);
console.log(
  `Glosario verificado: ${revisados} archivos y ${mensajes} mensajes de commit ` +
  `sin ninguna de las ${cuantas} formas de escribir las ${PROHIBIDAS.length} ` +
  `palabras que el glosario sacó (${EXENTOS.size} exenciones, cada una con su ` +
  'motivo y comprobada acá mismo).');
