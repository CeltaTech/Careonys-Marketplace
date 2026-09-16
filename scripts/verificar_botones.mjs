/* ===================================================
   VERIFICA QUE UN BOTÓN QUE OPERA SE APAGUE MIENTRAS OPERA

       node scripts/verificar_botones.mjs

   «Todo botón que dispara una operación se apaga mientras la operación corre»
   es regla de la empresa, y termina con «nunca dos envíos». Es fácil de escribir
   y fácil de olvidar: el 25 de agosto de 2026 había veintidós manejadores de
   este tipo y seis no apagaban nada. Uno de ellos otorgaba el aval de la
   Prestadora sobre el legajo de una persona, y dos clics eran dos escrituras.

   Qué mira en el marcado suelto, en cuatro formas:
   - el manejador escrito ahí mismo: `addEventListener('click', async () => {…})`;
   - el que delega en una función: `addEventListener('click', () => fichar('Entrada'))`;
   - el que va por su nombre a secas: `addEventListener('click', traerDirectorio)`;
   - el que sale del marcado: `onclick="aprobarAspirante();"`.

   Y antes de los cuatro hay una puerta, que es la que decide si el archivo se
   abre siquiera. Esa puerta conocía dos de las cuatro formas, así que cinco
   archivos con botones se descartaban enteros y no los miraba ningún detector.
   Adentro había uno de verdad: el renglón de cada conversación del chat, que
   pide el hilo al servidor y no se apagaba mientras lo traía. Ahora la puerta no
   nombra ninguna forma —le alcanza con que haya un manejador de pulsación— y se
   prueba aparte, contra las cuatro.

   Si adentro hay un `await` —o sea, si el manejador espera algo— tiene que haber
   también un `.disabled = …`, en su propio cuerpo o en el de alguna función que
   llame. Se acepta cualquier valor menos `false`: apagar con una variable
   —`boton.disabled = corriendo`— apaga igual.

   Por qué el `await` decide: un manejador que no espera nada termina antes de
   que la persona pueda tocar el botón de nuevo, así que apagarlo no protege de
   nada. El doble envío existe solamente mientras la operación está en el aire.

   Qué NO mira, dicho de frente:
   - En el marcado suelto no sabe si el botón que se apaga es el que se tocó:
     apagar el equivocado pasa igual. En la forma portada sí lo sabe cuando el
     apagado está en la misma etiqueta, que es el caso corriente.
   - No sigue las llamadas más allá de un nivel. Si el apagado vive dos
     funciones más adentro, este chequeo avisa de más, y entonces esa función va
     a `EXENTOS` con el motivo escrito.
   - No mira `onclick` que llame a algo definido en otro archivo.
   - De las cuatro formas sueltas, las tres que van por nombre necesitan que la
     función esté escrita en el mismo archivo: la que llega importada de otro no
     tiene cuerpo que leer acá, y se deja pasar.
   - No entra al hijo a comprobar que la bandera que recibe apague algo de
     verdad: le alcanza con que la pantalla se la pase con su mismo nombre.
   - No mira el botón tapado por el panel de «cargando» en lugar de apagado.
     Protege lo mismo y este chequeo no lo ve, así que ahí no avisa de más
     porque tampoco llega a mirar.

   El cuerpo de cada función se recorta contando llaves. Se probó recortando una
   cantidad fija de renglones y no sirve: el manejador de al lado le presta su
   apagado al que no lo tiene, y entonces el chequeo aprueba justo lo que
   tendría que encontrar.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
import { cuerpo } from './bloques.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carpetas que este chequeo no mira: no son pantallas. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets'];

/* Manejadores exentos, cada uno con su motivo escrito al lado. Una exención sin
   motivo es una excepción que nadie va a poder revisar después. */
const EXENTOS = new Map([
  // (vacío por ahora: los seis que había se arreglaron el 25 de agosto de 2026)
]);

const PALABRAS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'do', 'else',
  'try', 'typeof', 'await', 'new', 'delete', 'void', 'case', 'with'
]);

/* Cada función con nombre del archivo, y el texto de su cuerpo.

   La cuarta forma es la que da una función envuelta en una llamada, que es como
   las pantallas portadas declaran casi todos sus manejadores. Las tres primeras
   piden que la función arranque pegada al `=`, y ahí el nombre no quedaba
   registrado: el manejador se buscaba en esta tabla, salía vacío, y como un
   cuerpo vacío no tiene ningún `await`, se lo descartaba adentro del archivo sin
   mirarlo. Eran tres manejadores de verdad que este chequeo nunca abrió, y el
   renglón verde los contaba de menos. No se nombra acá ninguna de esas
   envolturas: alcanza con que lo primero que reciba la llamada sea una función,
   porque una llamada común recibe valores. */
function funciones(lineas) {
  const mapa = new Map();
  const FORMAS = [
    /(?:^|\W)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*)?\(/,
    /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{\s*$/,
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\s*\(\s*(?:async\s*)?(?:function\b|\()/
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
const POR_NOMBRE = /addEventListener\(\s*['"](?:click|submit)['"]\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;

/* La puerta que decide si un archivo se mira siquiera, y no nombra ninguna de
   las cuatro formas de arriba a propósito: le alcanza con que haya un manejador
   de pulsación, escrito como esté. Escrita con las formas, la puerta sabía dos
   de las cuatro —la que lleva `async` pegado y la que sale del marcado—, así que
   el archivo con un manejador pasado por su nombre se descartaba entero antes de
   que ningún detector lo abriera, y ensancharlos a ellos no cambiaba nada. */
const HAY_SUELTO = /addEventListener\(\s*['"](?:click|submit)['"]|onclick\s*=/;

/**
 * Los manejadores que esperan algo y no apagan ningún botón.
 * Devuelve `[renglón, qué es, motivo]` por cada uno.
 */
export function botonesSinApagar(texto) {
  const lineas = texto.split('\n');
  const mapa = funciones(lineas);
  const fallas = [];
  const yaVisto = new Set();
  let manejadores = 0;

  const revisar = (renglon, nombre, cuerpoTexto, funcion) => {
    if (yaVisto.has(nombre + ':' + renglon)) return;
    yaVisto.add(nombre + ':' + renglon);
    if (EXENTOS.has(nombre) || (funcion && EXENTOS.has(funcion))) return;
    if (!/\bawait\b/.test(cuerpoTexto)) return;
    manejadores++;
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
                                       ['(), al que el manejador delega', DELEGA],
                                       ['(), pasado por su nombre a secas', POR_NOMBRE]]) {
      for (const llamada of lineas[n].matchAll(patron)) {
        const nombre = llamada[1];
        if (!mapa.has(nombre)) continue;
        revisar(n + 1, nombre + expresion, mapa.get(nombre), nombre);
      }
    }
  }

  return { fallas, manejadores };
}

/* ── El mismo botón, escrito en JSX ──────────────────────────────────────────
   Todo lo de arriba mira el marcado de HTML y el guion suelto. Las pantallas
   portadas no escriben ninguna de esas tres formas: el manejador va como
   atributo —`onClick={enviar}`, `onSubmit={enviar}`— y el apagado no es una
   asignación sino un atributo más, `disabled={enviando}`, atado a una bandera
   que el manejador prende y baja. Sin esto, este chequeo miraba cero pantallas
   de las 49 que hoy tienen botones y decía ✔.

   Se acepta el apagado en cuatro formas, y cada una protege de verdad:
   - `disabled={…}` en la misma etiqueta que lleva el manejador. Es la más
     fuerte de todas, y más que lo que se puede decir del marcado suelto: acá sí
     consta que el que se apaga es el que se tocó.
   - el manejador prende una bandera que alguna etiqueta del archivo usa para
     apagar.
   - el manejador prende una bandera que el archivo le pasa a un hijo con su
     mismo nombre, `enviando={enviando}`: el botón está en el hijo y se apaga
     allá.
   - el manejador llama a una función que salió del mismo `const { … } =
     useLoQueSea()` del que salió una bandera que apaga. Ahí la bandera es de esa
     puerta y la prende ella, no la pantalla —`useElIngreso` es el caso vivo—,
     así que buscarle un `set…` acá adentro no la encontraría nunca.

   Y `disabled={false}` clavado no cuenta como apagado, porque no apaga nada. */

/** Las banderas con las que el marcado de este archivo apaga algo. */
function banderasQueApagan(texto) {
  const banderas = new Set();
  for (const m of texto.matchAll(/disabled=\{([^}]*)\}/g)) {
    for (const p of m[1].matchAll(/[A-Za-z_$][\w$]*/g)) banderas.add(p[0]);
  }
  return banderas;
}

/** Las que baja a un hijo con el mismo nombre: el botón vive allá. */
function banderasQueBajan(texto) {
  const banderas = new Set();
  for (const m of texto.matchAll(/\b([A-Za-z_$][\w$]*)=\{\s*\1\s*\}/g)) banderas.add(m[1]);
  return banderas;
}

/** Lo que salió del mismo destrozo que una bandera que apaga. */
function companerasDeBandera(texto, banderas) {
  const nombres = new Set();
  for (const m of texto.matchAll(/const\s*\{([^}]*)\}\s*=\s*use[A-Z][\w$]*\s*\(/g)) {
    const salieron = [...m[1].matchAll(/[A-Za-z_$][\w$]*/g)].map((p) => p[0]);
    if (salieron.some((n) => banderas.has(n))) for (const n of salieron) nombres.add(n);
  }
  return nombres;
}

/* La etiqueta entera que rodea al manejador: hacia atrás hasta el `<` que la
   abre y hacia adelante hasta el `>` que la cierra, contando las llaves para no
   cortarla en el `>` de una flecha escrita adentro de otro atributo. */
function etiquetaQueRodea(texto, donde) {
  let desde = donde;
  while (desde > 0 && texto[desde] !== '<') desde--;
  let hasta = donde, llaves = 0;
  while (hasta < texto.length) {
    const c = texto[hasta];
    if (c === '{') llaves++;
    else if (c === '}') llaves--;
    else if (c === '>' && llaves === 0 && texto[hasta - 1] !== '=') break;
    hasta++;
  }
  return texto.slice(desde, hasta + 1);
}

const APAGADO_QUIETO = /^\s*(?:false|!1)\s*$/;

function tieneApagadoPropio(etiqueta) {
  for (const m of etiqueta.matchAll(/disabled=\{([^}]*)\}/g)) {
    if (!APAGADO_QUIETO.test(m[1])) return true;
  }
  return /\sdisabled(?=[\s/>])/.test(etiqueta);
}

/** ¿Este cuerpo prende alguna bandera que apague, acá o un nivel más adentro? */
function prendeBandera(cuerpoTexto, banderas, companeras, mapa, nivel = 0) {
  if (APAGA.test(cuerpoTexto)) return true;
  for (const m of cuerpoTexto.matchAll(/\bset([A-Z][\w$]*)\s*\(/g)) {
    if (banderas.has(m[1][0].toLowerCase() + m[1].slice(1))) return true;
  }
  for (const ll of cuerpoTexto.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
    if (companeras.has(ll[1])) return true;
  }
  if (nivel > 0) return false;
  for (const ll of cuerpoTexto.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const nombre = ll[1];
    if (PALABRAS.has(nombre) || !mapa.has(nombre)) continue;
    if (prendeBandera(mapa.get(nombre), banderas, companeras, mapa, nivel + 1)) return true;
  }
  return false;
}

/* Las tres formas en que una pantalla portada engancha un manejador. La
   tercera se agregó después: el chequeo leía sólo las dos primeras y a la otra
   la descartaba adentro del archivo, que es la ceguera que no se nota —el
   archivo estaba, se abrió, y adentro no se reconoció nada—.

     onClick={async () => …}               espera ahí mismo
     onClick={guardar} / {() => borrar(…)}  llama a una función con nombre
     onClick={ya ? undefined : borrar}      elige con una condición */
const MANEJADOR_JSX =
  /on(?:Click|Submit)=\{\s*(?:async\s*\(|(?:\([^)]*\)\s*=>\s*)?([A-Za-z_$][\w$]*)\s*[(}]|[^{}]*\?[^{}]*:\s*([A-Za-z_$][\w$]*)\s*\})/g;

/**
 * Lo mismo que `botonesSinApagar`, para las pantallas portadas.
 * Devuelve `{ fallas, manejadores }`.
 */
export function botonesSinApagarJsx(texto) {
  const lineas = texto.split('\n');
  const mapa = funciones(lineas);
  const queApagan = banderasQueApagan(texto);
  const banderas = new Set([...queApagan, ...banderasQueBajan(texto)]);
  const companeras = companerasDeBandera(texto, queApagan);
  const fallas = [];
  const yaVisto = new Set();
  let manejadores = 0;

  for (const encontrado of texto.matchAll(MANEJADOR_JSX)) {
    const renglon = texto.slice(0, encontrado.index).split('\n').length;
    const nombre = encontrado[1] || encontrado[2];
    const cuerpoTexto = nombre ? (mapa.get(nombre) || '') : cuerpo(lineas, renglon - 1).join('\n');
    if (!/\bawait\b/.test(cuerpoTexto)) continue;
    const quien = nombre ? nombre + '()' : 'manejador escrito ahí mismo';
    if (yaVisto.has(quien + ':' + renglon)) continue;
    yaVisto.add(quien + ':' + renglon);
    if (EXENTOS.has(nombre)) continue;
    manejadores++;
    if (tieneApagadoPropio(etiquetaQueRodea(texto, encontrado.index))) continue;
    if (prendeBandera(cuerpoTexto, banderas, companeras, mapa)) continue;
    fallas.push([renglon, quien, 'espera una operación y no apaga ningún botón mientras corre']);
  }

  return { fallas, manejadores };
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
  ['un manejador pasado por su nombre a secas, que espera y no apaga nada',
   'async function refrescar() {\n  await traer();\n}\n'
   + "lista.addEventListener('click', refrescar);"],
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
  ['el mismo, pasado por su nombre, con su apagado adentro',
   'async function refrescar() {\n  boton.disabled = true;\n  await traer();\n}\n'
   + "lista.addEventListener('click', refrescar);"],
  ['una llave adentro de una frase no descuadra la cuenta',
   "boton.addEventListener('click', async () => {\n  boton.disabled = true;\n"
   + "  const t = 'un texto con { adentro';\n  await guardar(t);\n});"]
];

const noDetecta = MAL.filter(([, t]) => botonesSinApagar(t).fallas.length === 0);
const sePasa = BIEN.filter(([, t]) => botonesSinApagar(t).fallas.length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}


/* Y la puerta, que no prueba ninguna de las de arriba porque todas le hablan
   derecho al detector. La puerta es la que descartaba el archivo entero antes de
   que ningún detector lo abriera, así que si vuelve a saber menos formas que él,
   acá se planta. */
const PUERTA = [
  ['el que lleva `async` pegado', "b.addEventListener('click', async () => {});"],
  ['el que delega en una función', "b.addEventListener('submit', () => enviar());"],
  ['el pasado por su nombre a secas', "b.addEventListener('click', enviar);"],
  ['el que sale del marcado', '<button onclick="enviar();">x</button>']
];

const noEntran = PUERTA.filter(([, t]) => !HAY_SUELTO.test(t));
if (noEntran.length) {
  console.error('La puerta descarta archivos que el detector sí sabe mirar:');
  for (const [q] of noEntran) console.error('  no entra: ' + q);
  process.exit(1);
}


/* Y las mismas pruebas para la forma portada. */

const MAL_JSX = [
  ['el manejador elegido con una condición, que espera y no apaga nada',
   'async function borrar() {\n  await quitar();\n}\n'
   + '<button onClick={ya ? undefined : borrar}>x</button>'],
  ['un manejador escrito ahí mismo que espera y no apaga nada',
   '<button onClick={async () => {\n  await guardar();\n}}>x</button>'],
  ['un manejador con nombre que espera y no apaga nada',
   'async function enviar() {\n  await mandar();\n}\n<form onSubmit={enviar}>x</form>'],
  ['un apagado clavado en falso, que no apaga nada',
   'async function enviar() {\n  await mandar();\n}\n<button disabled={false} onClick={enviar}>x</button>'],
  /* Y el manejador declarado como los declaran casi todas las pantallas
     portadas: envuelto en una llamada. Mientras todo lo que se probaba acá
     empezaba con `async function`, el detector podía no reconocer ninguna otra
     manera de declarar una función y este banco seguía en verde. */
  ['un manejador envuelto en una llamada, que espera y no apaga nada',
   'const enviar = useCallback(async () => {\n  await mandar();\n}, []);\n'
   + '<form onSubmit={enviar}>x</form>']
];

const BIEN_JSX = [
  ['el mismo, con su apagado en la etiqueta',
   'async function borrar() {\n  await quitar();\n}\n'
   + '<button disabled={borrando} onClick={ya ? undefined : borrar}>x</button>'],
  ['el apagado en la misma etiqueta',
   'async function enviar() {\n  await mandar();\n}\n<button disabled={enviando} onClick={enviar}>x</button>'],
  ['el apagado en otro renglón de la misma etiqueta',
   'async function enviar() {\n  await mandar();\n}\n<button\n  className="btn"\n  disabled={enviando}\n  onClick={enviar}>x</button>'],
  ['una bandera que el marcado de más abajo usa para apagar',
   'async function enviar() {\n  setEnviando(true);\n  await mandar();\n}\n<form onSubmit={enviar}>x</form>\n<button disabled={enviando}>y</button>'],
  ['una bandera que baja a un hijo, que es donde está el botón',
   'async function enviar() {\n  setEnviando(true);\n  await mandar();\n}\n<form onSubmit={enviar}><Paso enviando={enviando} /></form>'],
  ['una puerta compartida que prende su propia bandera',
   'const { entrando, ingresar } = useElIngreso();\nasync function entrar() {\n  await ingresar(correo, clave);\n}\n<form onSubmit={entrar}>x</form>\n<button disabled={entrando}>y</button>'],
  ['un manejador que no espera nada',
   '<button onClick={() => abrir()}>x</button>'],
  ['el mismo envuelto en una llamada, con su bandera',
   'const enviar = useCallback(async () => {\n  setEnviando(true);\n  await mandar();\n}, []);\n'
   + '<form onSubmit={enviar}>x</form>\n<button disabled={enviando}>y</button>']
];

const noDetectaJsx = MAL_JSX.filter(([, t]) => botonesSinApagarJsx(t).fallas.length === 0);
const sePasaJsx = BIEN_JSX.filter(([, t]) => botonesSinApagarJsx(t).fallas.length > 0);
if (noDetectaJsx.length || sePasaJsx.length) {
  console.error('El detector de las pantallas portadas está roto, así que no verifica nada:');
  for (const [q] of noDetectaJsx) console.error('  no detecta: ' + q);
  for (const [q] of sePasaJsx) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const fallas = [];
let revisados = 0;
let manejadores = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');
  const sueltas = HAY_SUELTO.test(texto);
  const portadas = /on(?:Click|Submit)=\{/.test(texto);
  if (!sueltas && !portadas) continue;
  revisados++;
  if (sueltas) {
    const enSuelto = botonesSinApagar(texto);
    manejadores += enSuelto.manejadores;
    for (const [renglon, que, motivo] of enSuelto.fallas) {
      fallas.push(`${nombre}:${renglon}  ${que}\n  ${motivo}`);
    }
  }
  if (portadas) {
    const enJsx = botonesSinApagarJsx(texto);
    manejadores += enJsx.manejadores;
    for (const [renglon, que, motivo] of enJsx.fallas) {
      fallas.push(`${nombre}:${renglon}  ${que}\n  ${motivo}`);
    }
  }
}

/* Y que no quede mirando cero. Este chequeo pasó de las pantallas sueltas a las
   portadas sin enterarse: seguía buscando `addEventListener` y `onclick`, no
   encontraba ninguno, y decía ✔ sobre 49 pantallas con botones que nunca miró.
   `hayArchivos()` no alcanza para eso, porque archivos había: los descartaba
   todos después, uno por uno. */
seRevisaron(revisados, 'ni una pantalla con botones');

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
