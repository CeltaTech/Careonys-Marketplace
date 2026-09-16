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
   (`CLAUDE.md:121`).

   Por qué importa más de lo que parece. Una opción escrita a mano no es sólo un
   texto sin traducir: es **un valor que se guarda en la base y que ningún
   vocabulario gobierna**. Ya pasó, y está anotado: `avisos.schedule_type`
   junta hoy cuatro formas de decir lo mismo porque cada pantalla escribió la
   suya (pendiente 31). `scripts/verificar_claves.mjs` no puede mirar una columna
   sin vocabulario, así que el día que entra la quinta forma no se entera nadie.
   Esto es lo que impide que entre la quinta.

   Dónde mira: las pantallas y los guiones del navegador. Un guión también arma
   marcado —la ficha del legajo escribe ahí su `<select>` entero—, y hasta que se
   lo abrió una lista escrita a mano adentro de un guión no la miraba nadie.

   Qué mira:
   - cada `<option>` de cada pantalla, **fuera de los comentarios** —de los del
     marcado y de los de una pantalla de un programa—. Un `<option>` nombrado
     adentro de un comentario para explicar algo no cuenta, y hay dos así en
     `js/catalogo.js`.
   - el valor escrito con todas las letras, venga como venga: entre comillas
     dobles, entre comillas simples o entre llaves. Las tres son la misma
     decisión escrita de tres maneras, y una pantalla de un programa usa la
     última todo el tiempo.
   - y la opción que no lleva `value` ninguno y trae el texto escrito adentro.
     Ésa también es una lista escrita a mano: lo que se guarda, cuando no hay
     `value`, es ese mismo texto.

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
import { comoSeEscribe, valorDe } from './atributos.mjs';
import { enBlanco, enCodigoDePrograma } from './texto_visible.mjs';

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

/* Las maneras de escribir un valor con todas las letras. Una pantalla suelta
   usa comillas, una pantalla de un programa usa llaves, y las dos admiten
   comillas simples: es la misma decisión escrita de varias formas, y mirar una
   sola dejaba las otras sin nadie que las viera. Cuáles son vive en
   `scripts/atributos.mjs`, escritas una sola vez, porque el chequeo del
   depósito pregunta exactamente lo mismo sobre otro atributo. Que el nombre
   venga en mayúscula o en minúscula lo contesta ese mismo archivo: acá había
   una bandera puesta a mano, y los otros cuatro chequeos que preguntan lo mismo
   no la tenían. */
const VALOR_ESCRITO = new RegExp(comoSeEscribe('value'));
/* Y el valor que sale de un dato, que es justamente la forma correcta. */
const HAY_VALUE = /\bvalue\s*=/i;
/* La tercera manera de sacar el valor de un dato, y es la del guión: el marcado
   se arma adentro de un molde y el valor entra ahí. Entre comillas y todo, eso no
   es una opción escrita a mano —así arma la ficha del legajo su desplegable—. */
const DESDE_UN_MOLDE = /\$\{/;
const OPCION = /<option\b([^>]*)>([^<]*)/gi;
const HAY_PALABRA = /[A-Za-z\u00C0-\u00FF]{2,}/;

/** El texto sin los comentarios, que no son la pantalla: los del marcado y los
    de una pantalla de un programa. Se reemplazan por espacios y no se quitan,
    para que los renglones sigan siendo los mismos. */
function sinComentarios(crudo) {
  /* Los dos comentarios de un guión que explican cómo se arma el marcado, y que
     para eso nombran un `<option>`, los borra `texto_visible.mjs`, que es donde
     está escrito una sola vez cómo se borra un comentario de un guión sin
     llevarse por delante una dirección web. Acá estaba copiado. El de llaves
     —el de una pantalla de un programa— queda adentro del primero de los dos. */
  return enCodigoDePrograma(crudo.replace(/<!--[\s\S]*?-->/g, enBlanco));
}

/** Las opciones escritas a mano de una pantalla: `[renglón, valor]`. */
function opcionesDeUnaPantalla(crudo) {
  const limpio = sinComentarios(crudo);
  const salida = [];
  for (const m of limpio.matchAll(OPCION)) {
    const renglon = limpio.slice(0, m.index).split('\n').length;
    const escrito = VALOR_ESCRITO.exec(m[1]);
    const valor = escrito && valorDe(escrito);
    if (valor) {
      if (valor.trim() !== '' && !DESDE_UN_MOLDE.test(valor)) salida.push([renglon, valor]);
      continue;
    }
    /* Sin `value` con todas las letras quedan dos casos que no son lo mismo: el
       que lo saca de un dato, que es la forma correcta, y el que no lleva
       ninguno y guarda el texto que tiene adentro. */
    if (HAY_VALUE.test(m[1])) continue;
    /* Y el texto de adentro también puede salir de un dato: lo que se pide del
       catálogo va entre llaves, así que eso no es texto escrito a mano. */
    const texto = m[2].replace(/\{[^}]*\}/g, ' ').trim();
    if (HAY_PALABRA.test(texto)) salida.push([renglon, texto]);
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
  ['la misma, con el valor entre comillas simples',
   "<select id=\"x\">\n  <option value='turno_manana'>Turno Mañana</option>\n</select>\n"],
  ['la misma, con el valor entre llaves, como la escribe un programa',
   '<select id="x">\n  <option value={\'turno_manana\'}>Turno Mañana</option>\n</select>\n'],
  ['la que no lleva valor ninguno y guarda el texto que tiene adentro',
   '<select id="x">\n  <option>Turno Mañana</option>\n</select>\n'],
  ['una lista escrita a mano adentro de un guión, que también arma marcado',
   'const x = `<select id="x"><option value="turno_manana">Turno Mañana</option></select>`;\n'],
];

const BIEN = [
  ['el renglón vacío que abre un desplegable',
   '<select id="x">\n  <option value="">Elija una opción…</option>\n</select>\n'],
  ['una opción nombrada adentro de un comentario, para explicar algo',
   '<!-- Acá había un <option value="viejo">Viejo</option> que ya no está. -->\n<select id="x"></select>\n'],
  ['un desplegable que espera a que el catálogo lo llene',
   '<select id="x" data-oferta="cursos"></select>\n'],
  ['una opción nombrada adentro de un comentario de un programa',
   '{/* Acá había un <option value="viejo">Viejo</option> que ya no está. */}\n<select id="x"></select>\n'],
  ['el renglón vacío escrito como lo escribe un programa',
   "<select id=\"x\">\n  <option value={''}>{frase(vacio)}</option>\n</select>\n"],
  ['una opción que saca su valor de un dato',
   '<select id="x">\n  <option key={i.clave} value={i.clave}>{texto(i)}</option>\n</select>\n'],
  ['una opción sin valor cuyo texto sale del catálogo',
   '<select id="x">\n  <option>{texto(i)}</option>\n</select>\n'],
  ['una opción nombrada adentro del comentario de bloque de un guión',
   '/* Acá se dibujan sus <option>, uno por cada fila. */\nconst x = 1;\n'],
  ['una opción nombrada adentro del comentario de renglón de un guión',
   '// Acá se dibujan sus <option>, uno por cada fila.\nconst x = 1;\n'],
  ['una opción de un guión cuyo valor entra al molde desde un dato',
   'const x = `<option value="${escapar(o.clave)}">${o.texto}</option>`;\n'],
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

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const pantalla = relative(raiz, camino).split(sep).join('/');
  revisadas++;
  const sinExtension = pantalla.replace(/\.[^./]+$/, '');
  const perdonadas = ESCRITAS_A_MANO.get(sinExtension)?.valores ?? [];
  for (const [renglon, valor] of opcionesDeUnaPantalla(readFileSync(camino, 'utf8'))) {
    if (perdonadas.includes(valor)) { exentas++; continue; }
    fallas.push(`${pantalla}:${renglon}  la opción «${valor}» está escrita a mano acá; ` +
      'un catálogo sale de la base');
  }
}

if (fallas.length > 0) {
  console.error('Listas de opciones escritas a mano:\n');
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
  `Opciones verificadas: ${revisadas} pantallas y guiones sin ninguna lista de opciones escrita ` +
  `a mano (${exentas} exentas, con su motivo y su pendiente).`);
