/* ===================================================
   VERIFICA QUE NINGUNA PANTALLA ESCRIBA A MANO UNA LISTA DE OPCIONES

   Falla —con código de salida 1— si una pantalla trae escrita adentro una
   opción de un desplegable con su valor puesto a mano.

       node scripts/verificar_opciones.mjs

   La regla de la empresa es de una línea: «Los catálogos salen de la base. Una
   lista de opciones nunca se escribe adentro de una pantalla»
   (`celtatech\CLAUDE.md`, «Las reglas de desarrollo»). Y la de este producto
   dice qué pasa cuando no se cumple: «Cada lista de opciones que hoy esté
   escrita adentro de un componente es una tabla que alguien no creó»
   (`CLAUDE.md:42`).

   Por qué importa más de lo que parece. Una opción escrita a mano no es sólo un
   texto sin traducir: es **un valor que se guarda en la base y que ningún
   vocabulario gobierna**. Ya pasó, y está anotado: `avisos.schedule_type`
   junta hoy cuatro formas de decir lo mismo porque cada pantalla escribió la
   suya (pendiente 31). `scripts/verificar_claves.mjs` no puede mirar una columna
   sin vocabulario, así que el día que entra la quinta forma no se entera nadie.
   Esto es lo que impide que entre la quinta.

   Qué mira:
   - cada `<option>` con `value` no vacío de cada pantalla, **fuera de los
     comentarios**. Un `<option>` nombrado adentro de un `<!-- … -->` para
     explicar algo no cuenta, y hay uno así en `cursos.html`.

   Qué NO mira, dicho de frente:
   - El `<option value="">Elija una opción…</option>` que abre un desplegable no
     es un catálogo, es el renglón vacío. Por eso la regla pide `value` con algo
     adentro.
   - Las opciones que un guion arma desde datos —`createElement('option')`— son
     justamente la forma correcta, y no se miran.
   - No sabe si el valor está en algún vocabulario. Para eso está
     `scripts/verificar_claves.mjs`, que mira las migraciones.

   Cómo se exime un caso: en `ESCRITAS_A_MANO`, con la pantalla como clave y
   **los valores exactos** que se perdonan, no la pantalla entera. Perdonar el
   archivo completo apagaría el chequeo sobre todo lo que ese archivo tenga
   después, que es la forma en que una exención deja de eximir y pasa a tapar.
   La clave va **sin extensión**, y el chequeo se la saca a lo que compara: el
   día que las pantallas dejen de ser `.html` la exención tiene que seguir
   encontrando la suya. Lo exige `scripts/verificar_red.mjs`, y se plantó
   apenas este chequeo nació escribiéndola.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   este: una opción se escribe donde vive una pantalla. */
const AJENAS = ['docs', 'supabase', 'scripts'];

/* Opciones escritas a mano que hoy se perdonan, con su motivo y su pendiente.
   La clave es la pantalla **sin extensión**; los valores, los `value` exactos.
   Una opción nueva en la misma pantalla se planta igual. */
/* Hoy no hay ninguna, y va escrita en un solo renglón a propósito: una lista
   vacía partida en varios renglónes la toma `probar_exenciones.mjs` por una
   exención viva, la vacía y exige que el chequeo se ponga rojo, cosa que una
   lista que ya está vacía no puede hacer. Hasta el 2 de septiembre de 2026 acá
   se perdonaban los tres horarios de turno de `solicitar-asistente.html`: esa
   ventana se fue junto con la promesa que sostenía, así que la exención dejó de
   eximir nada. */
const ESCRITAS_A_MANO = new Map([]);

const OPCION = /<option\b[^>]*\bvalue\s*=\s*"([^"]*)"[^>]*>/gi;

/** El texto sin los comentarios de HTML, que no son la pantalla. */
function sinComentarios(crudo) {
  return crudo.replace(/<!--[\s\S]*?-->/g, (t) => t.replace(/[^\n]/g, ' '));
}

/** Las opciones escritas a mano de una pantalla: `[renglón, valor]`. */
function opcionesDeUnaPantalla(crudo) {
  const limpio = sinComentarios(crudo);
  const salida = [];
  for (const m of limpio.matchAll(OPCION)) {
    if (m[1].trim() === '') continue;
    salida.push([limpio.slice(0, m.index).split('\n').length, m[1]]);
  }
  return salida;
}

/* Las pruebas de adentro: si el detector deja de distinguir estos casos, el
   chequeo no verifica nada y hay que enterarse acá, no el día que falle. */
const MAL = [
  ['una opción con su valor escrito a mano',
   '<select id="x">\n  <option value="turno_manana">Turno Mañana</option>\n</select>\n'],
  ['la misma, con el valor en el atributo de después',
   '<select id="x">\n  <option data-frase="x.y" value="14">14:30 hs</option>\n</select>\n'],
];

const BIEN = [
  ['el renglón vacío que abre un desplegable',
   '<select id="x">\n  <option value="">Elija una opción…</option>\n</select>\n'],
  ['una opción nombrada adentro de un comentario, para explicar algo',
   '<!-- Acá había un <option value="viejo">Viejo</option> que ya no está. -->\n<select id="x"></select>\n'],
  ['un desplegable que espera a que el catálogo lo llene',
   '<select id="x" data-oferta="cursos"></select>\n'],
];

const noDetecta = MAL.filter(([, t]) => opcionesDeUnaPantalla(t).length === 0);
const sePasa = BIEN.filter(([, t]) => opcionesDeUnaPantalla(t).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const fallas = [];
let revisadas = 0;
let exentas = 0;

for (const camino of hayArchivos(raiz, EXTENSIONES_DE_PANTALLA, AJENAS)) {
  const pantalla = relative(raiz, camino).split(sep).join('/');
  revisadas++;
  const sinExtension = pantalla.replace(/\.[^./]+$/, '');
  const perdonadas = ESCRITAS_A_MANO.get(sinExtension)?.valores ?? [];
  for (const [renglon, valor] of opcionesDeUnaPantalla(readFileSync(camino, 'utf8'))) {
    if (perdonadas.includes(valor)) { exentas++; continue; }
    fallas.push(`${pantalla}:${renglon}  la opción «${valor}» está escrita adentro de la ` +
      'pantalla; un catálogo sale de la base');
  }
}

if (fallas.length > 0) {
  console.error('Listas de opciones escritas adentro de una pantalla:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(
    '\nUna lista de opciones nunca se escribe adentro de una pantalla: sale de la\n' +
    'base. Una opción escrita a mano guarda un valor que ningún vocabulario\n' +
    'gobierna, y así es como `avisos.schedule_type` llegó a tener cuatro\n' +
    'formas de decir lo mismo (pendiente 31).\n' +
    'Si un caso no puede cumplirla, va a ESCRITAS_A_MANO de este mismo archivo,\n' +
    'con la pantalla, los valores exactos, el motivo y el pendiente que lo sigue.');
  process.exit(1);
}

console.log(
  `Opciones verificadas: ${revisadas} pantallas sin ninguna lista de opciones escrita ` +
  `a mano (${exentas} exentas, con su motivo y su pendiente).`);
