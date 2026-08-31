/* ===================================================
   VERIFICA QUE UN BOTÓN QUE OPERA SE APAGUE MIENTRAS OPERA

       node scripts/verificar_botones.mjs

   La «todo botón que dispara una operación se apaga» pide que todo botón que dispara una operación se
   deshabilite mientras está en curso, «nunca doble envío». Es fácil de escribir
   y fácil de olvidar: el 25 de agosto de 2026 había veintidós manejadores de
   este tipo y seis no apagaban nada. Uno de ellos otorgaba el aval de la
   Prestadora sobre el legajo de una persona, y dos clics eran dos escrituras.

   Qué mira, en tres formas:
   - el manejador escrito ahí mismo: `addEventListener('click', async () => {…})`;
   - el que delega en una función: `addEventListener('click', () => fichar('Entrada'))`;
   - el que sale del marcado: `onclick="aprobarAspirante();"`.

   Si adentro hay un `await` —o sea, si el manejador espera algo— tiene que haber
   también un `.disabled = …`, en su propio cuerpo o en el de alguna función que
   llame. Se acepta cualquier valor menos `false`: apagar con una variable
   —`boton.disabled = corriendo`— apaga igual.

   Por qué el `await` decide: un manejador que no espera nada termina antes de
   que la persona pueda tocar el botón de nuevo, así que apagarlo no protege de
   nada. El doble envío existe solamente mientras la operación está en el aire.

   Qué NO mira, dicho de frente:
   - No sabe si el botón que se apaga es el que se tocó. Apagar el equivocado
     pasa igual, y hoy pasa: en `examen.html`, `abrir` prende o apaga el botón de
     entregar según los intentos que queden, y con eso el chequeo lo da por bueno.
     Ahí el botón que se tocó sí está protegido, pero por otra vía —la pantalla
     entera se cambia por la de «Cargando…»—, que este chequeo no mira.
   - No sigue las llamadas más allá de un nivel. Si el apagado vive dos
     funciones más adentro, este chequeo avisa de más, y entonces esa función va
     a `EXENTOS` con el motivo escrito.
   - No mira `onclick` que llame a algo definido en otro archivo.
   - No mira el manejador que recibe la función por su nombre a secas,
     `addEventListener('click', traerDirectorio)`. Se probó, y los tres que hay
     en el proyecto —los «Reintentar» de `directorio.html` y `perfil.html`, y los
     recomendados de `mockup-app.html`— tapan su botón con el panel de «cargando»
     en lugar de apagarlo, que protege lo mismo. Tres avisos falsos de tres es un
     chequeo que alguien apaga, y entonces no verifica nada.

   El cuerpo de cada función se recorta contando llaves. Se probó recortando una
   cantidad fija de renglones y no sirve: el manejador de al lado le presta su
   apagado al que no lo tiene, y entonces el chequeo aprueba justo lo que
   tendría que encontrar.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
import { cuerpo } from './bloques.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carpetas que este chequeo no mira: no son pantallas. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets', 'Nueva carpeta'];

/* Manejadores exentos, cada uno con su motivo escrito al lado. Una exención sin
   motivo es una excepción que nadie va a poder revisar después. */
const EXENTOS = new Map([
  // (vacío por ahora: los seis que había se arreglaron el 25 de agosto de 2026)
]);

const PALABRAS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'do', 'else',
  'try', 'typeof', 'await', 'new', 'delete', 'void', 'case', 'with'
]);

/* Cada función con nombre del archivo, y el texto de su cuerpo. */
function funciones(lineas) {
  const mapa = new Map();
  const FORMAS = [
    /(?:^|\W)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*)?\(/,
    /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{\s*$/
  ];
  for (let n = 0; n < lineas.length; n++) {
    for (const forma of FORMAS) {
      const encontrado = forma.exec(lineas[n]);
      if (encontrado && !PALABRAS.has(encontrado[1]) && !mapa.has(encontrado[1])) {
        mapa.set(encontrado[1], cuerpo(lineas, n).join('\n'));
      }
    }
  }
  return mapa;
}

/* Un apagado es cualquier asignación a `.disabled` que no sea `false`: hay
   funciones compartidas que apagan y prenden con la misma variable, y `= false`
   solo no protege de nada. */
const APAGA = /\.disabled\s*=\s*(?!false\b|!1\b)[^;\n]/;

/* ¿Este cuerpo apaga algo, acá o en una función que llama? */
function apaga(texto, mapa, nivel = 0) {
  if (APAGA.test(texto)) return true;
  if (nivel > 0) return false;
  for (const llamada of texto.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nombre = llamada[1];
    if (PALABRAS.has(nombre) || !mapa.has(nombre)) continue;
    if (apaga(mapa.get(nombre), mapa, nivel + 1)) return true;
  }
  return false;
}

const MANEJADOR = /addEventListener\(\s*['"](?:click|submit)['"]\s*,\s*async/;
const DESDE_MARCADO = /onclick\s*=\s*"\s*([A-Za-z_$][\w$]*)\s*\(/g;
const DELEGA = /addEventListener\(\s*['"](?:click|submit)['"]\s*,\s*\([^)]*\)\s*=>\s*([A-Za-z_$][\w$]*)\s*\(/g;

/**
 * Los manejadores que esperan algo y no apagan ningún botón.
 * Devuelve `[renglón, qué es, motivo]` por cada uno.
 */
export function botonesSinApagar(texto) {
  const lineas = texto.split('\n');
  const mapa = funciones(lineas);
  const fallas = [];
  const yaVisto = new Set();

  const revisar = (renglon, nombre, cuerpoTexto, funcion) => {
    if (yaVisto.has(nombre + ':' + renglon)) return;
    yaVisto.add(nombre + ':' + renglon);
    if (EXENTOS.has(nombre) || (funcion && EXENTOS.has(funcion))) return;
    if (!/\bawait\b/.test(cuerpoTexto)) return;
    if (apaga(cuerpoTexto, mapa)) return;
    fallas.push([renglon, nombre,
      'espera una operación y no apaga ningún botón mientras corre']);
  };

  for (let n = 0; n < lineas.length; n++) {
    if (!MANEJADOR.test(lineas[n])) continue;
    const nombre = (lineas[n].trim().match(/^[^.]*\.?[^.]*/) || [''])[0].trim();
    revisar(n + 1, nombre.slice(0, 60), cuerpo(lineas, n).join('\n'));
  }

  for (let n = 0; n < lineas.length; n++) {
    for (const [expresion, patron] of [['() desde el marcado', DESDE_MARCADO],
                                       ['(), al que el manejador delega', DELEGA]]) {
      for (const llamada of lineas[n].matchAll(patron)) {
        const nombre = llamada[1];
        if (!mapa.has(nombre)) continue;
        revisar(n + 1, nombre + expresion, mapa.get(nombre), nombre);
      }
    }
  }

  return fallas;
}

/* ── Pruebas del detector ────────────────────────────────────────────────────
   Un chequeo que no detecta nada pasa siempre, y eso no se nota. Antes de mirar
   el proyecto se mira a sí mismo. */

const MAL = [
  ['un manejador que espera y no apaga nada',
   "boton.addEventListener('click', async () => {\n  await guardar();\n});"],
  ['un envío de formulario que espera y no apaga nada',
   "form.addEventListener('submit', async (e) => {\n  e.preventDefault();\n  await mandar();\n});"],
  ['una función del marcado que espera y no apaga nada',
   'async function borrar() {\n  await ClienteDatos.borrar(id);\n}\n'
   + '<button onclick="borrar();">Borrar</button>'],
  ['una función a la que el manejador delega y que no apaga nada',
   'async function fichar(tipo) {\n  await ClienteDatos.fichar(tipo);\n}\n'
   + "boton.addEventListener('click', () => fichar('Entrada'));"],
  ['el apagado que está en el manejador de al lado, no en este',
   "a.addEventListener('click', async () => {\n  await guardar();\n});\n"
   + "b.addEventListener('click', async () => {\n  b.disabled = true;\n  await otra();\n});"]
];

const BIEN = [
  ['un manejador que apaga su botón',
   "boton.addEventListener('click', async () => {\n  boton.disabled = true;\n"
   + '  await guardar();\n  boton.disabled = false;\n});'],
  ['un manejador que no espera nada',
   "boton.addEventListener('click', async () => {\n  cerrar();\n});"],
  ['el apagado que vive en la función compartida que llama',
   'async function resolver() {\n  boton.disabled = true;\n  await guardar();\n}\n'
   + "boton.addEventListener('click', async () => {\n  await resolver();\n});"],
  ['una función del marcado que apaga',
   'async function borrar() {\n  boton.disabled = true;\n  await ClienteDatos.borrar(id);\n}\n'
   + '<button onclick="borrar();">Borrar</button>'],
  ['un manejador que no es async',
   "boton.addEventListener('click', () => {\n  abrirModal();\n});"],
  ['un apagado hecho con una variable, no con `true`',
   'function enCurso(corriendo) {\n  boton.disabled = corriendo;\n}\n'
   + 'async function fichar(tipo) {\n  enCurso(true);\n  await ClienteDatos.fichar(tipo);\n}\n'
   + "boton.addEventListener('click', () => fichar('Entrada'));"],
  ['una llave adentro de una frase no descuadra la cuenta',
   "boton.addEventListener('click', async () => {\n  boton.disabled = true;\n"
   + "  const t = 'un texto con { adentro';\n  await guardar(t);\n});"]
];

const noDetecta = MAL.filter(([, t]) => botonesSinApagar(t).length === 0);
const sePasa = BIEN.filter(([, t]) => botonesSinApagar(t).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const fallas = [];
let revisados = 0;
let manejadores = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');
  if (!MANEJADOR.test(texto) && !/onclick\s*=/.test(texto)) continue;
  revisados++;
  manejadores += (texto.match(new RegExp(MANEJADOR.source, 'g')) || []).length;
  for (const [renglon, que, motivo] of botonesSinApagar(texto)) {
    fallas.push(`${nombre}:${renglon}  ${que}\n  ${motivo}`);
  }
}

if (fallas.length > 0) {
  console.error('Botones que disparan una operación y no se apagan mientras corre:\n');
  for (const falla of fallas) console.error('  - ' + falla + '\n');
  const plural = fallas.length === 1 ? 'manejador' : 'manejadores';
  console.error(
    `${fallas.length} ${plural}. «todo botón que dispara una operación se apaga» de \`CLAUDE.md\`: nunca doble envío.\n` +
    'Se guarda el botón en una variable, se le pone `disabled = true` antes del primer\n' +
    '`await` y se lo devuelve en un `finally`, que corre también cuando algo falla.\n' +
    'Si el manejador no puede apagar nada por algún motivo, va a EXENTOS de este mismo\n' +
    'archivo, con el motivo escrito al lado.');
  process.exit(1);
}

console.log(
  `Botones verificados: ${manejadores} manejadores que esperan una operación en ` +
  `${revisados} pantallas, todos apagando su botón mientras corre.`);
