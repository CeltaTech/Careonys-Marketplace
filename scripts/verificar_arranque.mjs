/* ===================================================
   VERIFICA QUE EL ARRANQUE DE UNA PANTALLA DIGA CUANDO FALLA

       node scripts/verificar_arranque.mjs

   La «los cuatro estados» pide cuatro estados —cargando, error, vacío, listo—
   a todo componente que carga datos. Lo primero que carga datos en cualquier
   pantalla es su arranque, y es justo lo que nadie mira: el 25 de agosto de 2026
   había ocho arranques y **ninguno de los ocho** tenía quién atrapara un fallo.

   Qué mira, en tres formas, que son la misma cosa vista de tres maneras: una tarea
   que espera algo y que nadie aguarda, así que si falla no hay dónde caer.
   - `document.addEventListener('DOMContentLoaded', async () => {…})`;
   - el bloque suelto que corre solo al cargar el archivo: `(async () => {…})()`;
   - la tarea que se le entrega a una función que no espera respuesta, como el
     `getCurrentPosition(async (posicion) => {…})` que ficha por GPS.

   Si adentro hay un `await`, ese `await` tiene que estar adentro de un `try`. No
   alcanza con que el cuerpo tenga un `try` en alguna parte: se comprueba, para
   cada `await`, que haya un `try {` abierto por encima que todavía no cerró.

   Por qué importa más acá que en otro lado: el arranque es una sola cadena de
   pedidos, y en cuanto uno falla se caen todos los de abajo sin ejecutarse. Lo
   que queda en pantalla no es un error: es la pantalla vacía, que se parece a
   «todavía no hay nada cargado». En `panel-prestadora.html` eso significaba una
   Prestadora mirando una tabla sin legajos, sin manera de saber que en realidad
   no se habían podido traer.

   Qué NO mira, dicho de frente:
   - No mira si el `catch` hace algo útil. Un `catch` vacío pasa igual. Lo que
     impide es que el fallo se pierda sin que nadie lo escriba en ninguna parte.
   - No mira los arranques que no esperan nada: sin `await` no hay promesa
     rechazada que se pierda.
   - No sigue las llamadas. Si el arranque llama a una función que espera adentro,
     el `await` de esa función es problema de esa función, no de éste.
   - No mira los manejadores de `click` ni de `submit`: de esos se ocupa
     `verificar_botones.mjs`, que además les pide que se apaguen mientras operan.

   El cuerpo de cada arranque se recorta contando llaves, por el mismo motivo que
   en `verificar_botones.mjs`: con una cantidad fija de renglones, el bloque de al
   lado le presta su `try` al que no lo tiene.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { archivos } from './recorrido.mjs';
import { soloCodigo, cuerpo, dentroDeTry } from './bloques.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carpetas que este chequeo no mira: no son pantallas. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets', 'Nueva carpeta'];

/* Arranques exentos, cada uno con su motivo escrito al lado. Una exención sin
   motivo es una excepción que nadie va a poder revisar después. */
const EXENTOS = new Map([
  // (vacío por ahora: los ocho arranques que había se arreglaron el 25 de agosto
  //  de 2026, y las dos tareas del GPS ya tenían su `try` desde el día anterior)
]);

const AL_CARGAR = /addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*async/;
const SUELTO = /\(\s*async\s*(?:\([^)]*\)|function\s*\**\s*[\w$]*\s*\([^)]*\))\s*(?:=>)?\s*\{/;

/**
 * Los arranques que esperan algo sin que nadie atrape el fallo.
 * Devuelve `[renglón, qué es, motivo]` por cada uno.
 */
export function arranquesSinRed(texto) {
  const lineas = texto.split('\n');
  const fallas = [];

  for (let n = 0; n < lineas.length; n++) {
    const alCargar = AL_CARGAR.test(lineas[n]);
    if (!alCargar && !SUELTO.test(lineas[n])) continue;

    /* Un bloque suelto escrito al principio del renglón corre solo al cargar el
       archivo; el mismo bloque escrito después de una coma o un paréntesis es una
       tarea que se le entrega a otra función. El fallo se pierde igual en los dos
       casos, pero no se llaman igual y confundirlos deja un aviso ilegible. */
    const que = alCargar
      ? 'el arranque de la pantalla'
      : /^\s*\(/.test(lineas[n])
        ? 'el bloque que corre solo al cargar'
        : 'la tarea que espera y que nadie aguarda';
    if (EXENTOS.has(que + ':' + (n + 1))) continue;

    const bloque = cuerpo(lineas, n);
    for (let i = 0; i < bloque.length; i++) {
      if (!/\bawait\b/.test(soloCodigo(bloque[i]))) continue;
      if (dentroDeTry(bloque, i)) continue;
      fallas.push([n + 1, que,
        'espera algo en el renglón ' + (n + i + 1) + ' y nadie atrapa el fallo']);
      break;
    }
  }

  return fallas;
}

/* ── Pruebas del detector ────────────────────────────────────────────────────
   Un chequeo que no detecta nada pasa siempre, y eso no se nota. Antes de mirar
   el proyecto se mira a sí mismo. */

const MAL = [
  ['un arranque que espera y no atrapa nada',
   "document.addEventListener('DOMContentLoaded', async () => {\n  await traer();\n});"],
  ['un bloque suelto que espera y no atrapa nada',
   '(async () => {\n  const s = await Sesion.getSession();\n  usar(s);\n})();'],
  ['una tarea entregada a una función que no espera respuesta',
   'navigator.geolocation.getCurrentPosition(async (posicion) => {\n'
   + '  await ClienteDatos.fichar(tipo, posicion);\n});'],
  ['un `try` que cierra antes del `await`',
   "document.addEventListener('DOMContentLoaded', async () => {\n  try {\n    preparar();\n"
   + '  } catch (err) {\n    avisar(err);\n  }\n  await traer();\n});'],
  ['el `try` que está en el arranque de al lado, no en este',
   "document.addEventListener('DOMContentLoaded', async () => {\n  await traer();\n});\n"
   + "otro.addEventListener('DOMContentLoaded', async () => {\n  try {\n    await traer();\n"
   + '  } catch (err) {\n    avisar(err);\n  }\n});']
];

const BIEN = [
  ['un arranque con su `try`',
   "document.addEventListener('DOMContentLoaded', async () => {\n  try {\n    await traer();\n"
   + '  } catch (err) {\n    avisar(err);\n  }\n});'],
  ['un bloque suelto con su `try`',
   '(async () => {\n  try {\n    const s = await Sesion.getSession();\n    usar(s);\n'
   + '  } catch (err) {\n    console.error(err);\n  }\n})();'],
  ['un arranque que no espera nada',
   "document.addEventListener('DOMContentLoaded', async () => {\n  dibujar();\n});"],
  ['un arranque que no es async',
   "document.addEventListener('DOMContentLoaded', () => {\n  dibujar();\n});"],
  ['un `await` adentro de un `if` adentro del `try`',
   "document.addEventListener('DOMContentLoaded', async () => {\n  try {\n    if (hay) {\n"
   + '      await traer();\n    }\n  } catch (err) {\n    avisar(err);\n  }\n});'],
  ['una llave adentro de una frase no descuadra la cuenta',
   "document.addEventListener('DOMContentLoaded', async () => {\n  try {\n"
   + "    const t = 'un texto con { adentro';\n    await traer(t);\n"
   + '  } catch (err) {\n    avisar(err);\n  }\n});']
];

const noDetecta = MAL.filter(([, t]) => arranquesSinRed(t).length === 0);
const sePasa = BIEN.filter(([, t]) => arranquesSinRed(t).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const fallas = [];
let revisados = 0;
let arranques = 0;

for (const camino of archivos(raiz, ['.html', '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');
  const lineas = texto.split('\n');
  const cuantos = lineas.filter(
    (l) => AL_CARGAR.test(l) || SUELTO.test(l)).length;
  if (cuantos === 0) continue;
  revisados++;
  arranques += cuantos;
  for (const [renglon, que, motivo] of arranquesSinRed(texto)) {
    fallas.push(`${nombre}:${renglon}  ${que}\n  ${motivo}`);
  }
}

if (fallas.length > 0) {
  console.error('Arranques que esperan algo y no dicen nada si falla:\n');
  for (const falla of fallas) console.error('  - ' + falla + '\n');
  const plural = fallas.length === 1 ? 'arranque' : 'arranques';
  console.error(
    `${fallas.length} ${plural}. «los cuatro estados» de \`CLAUDE.md\`: cargando, error, vacío y listo.\n` +
    'El arranque entero va adentro de un `try`, el `catch` deja el detalle técnico en la\n' +
    'consola y muestra en pantalla la frase que corresponde. Sin eso, la primera línea que\n' +
    'falla se lleva puestas todas las de abajo y la pantalla queda igual que si no hubiera\n' +
    'nada que mostrar.\n' +
    'Si un arranque no puede avisar por algún motivo, va a EXENTOS de este mismo archivo,\n' +
    'con el motivo escrito al lado.');
  process.exit(1);
}

console.log(
  `Arranque verificado: ${arranques} bloques que esperan algo sin que nadie los aguarde, ` +
  `repartidos en ${revisados} archivos, todos con quien atrape el fallo.`);
