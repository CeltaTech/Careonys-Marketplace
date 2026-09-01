/* ===================================================
   VERIFICA LOS CUATRO ESTADOS DE TODO LO QUE CARGA DATOS

       node scripts/verificar_estados.mjs

   «Todo componente que carga datos maneja cuatro estados: cargando, error,
   vacío, listo» es regla de la empresa, y hasta el 26 de agosto de 2026 no la
   comprobaba nadie. El único chequeo que la rozaba era `verificar_arranque.mjs`,
   que mira una sola cosa —que un arranque asincrónico tenga quien atrape el
   fallo— y lo dice en su propia cabecera. De cargando, vacío y listo no se
   ocupaba ninguno.

   QUÉ ES UN PUNTO DE CARGA. Un bloque asincrónico que **espera datos** y
   **escribe en la pantalla**. Las puertas por donde entran los datos de este
   proyecto están nombradas una por una en `PUERTAS_DE_DATOS`, y lo que cuenta
   como escribir en la pantalla, en `ESCRIBE`. Las dos listas se leen de un
   vistazo, que es la idea: un chequeo que adivina qué es una carga informa cosas
   que nadie puede arreglar.

   QUÉ LE PIDE A CADA PUNTO DE CARGA
   1. **Cargando.** Que haga algo en la pantalla *antes* de la primera espera:
      un cartel, o apagar el control que se acaba de tocar. Una pantalla que se
      queda igual que estaba mientras espera se ve igual que una que ya terminó
      y no trajo nada.
   2. **Error.** Que el `catch` escriba en la pantalla. Un `catch` que sólo deja
      el detalle en la consola no es el estado error: es el estado vacío contado
      como si fuera bueno.
   3. **Vacío**, y sólo a los que dibujan una lista. Que exista la rama de «no
      vino nada»: sin ella, cero filas y una falla se ven iguales. A un envío de
      formulario no se le pide, porque una operación que se manda no puede venir
      vacía y pedírselo sería un aviso que nadie puede arreglar.
   4. **Y que el texto de los tres salga del catálogo.** Un cartel escrito a mano
      no existe en `en` ni en `pt-BR`, así que la pantalla que se tradujo entera
      vuelve a hablar en castellano justo el día que algo falla.

   Y APARTE, EL CARGADOR SIN RED. Un bloque que espera datos y **no** escribe en
   la pantalla no tiene por qué manejar los cuatro estados: su trabajo es traer y
   que otro muestre. Pero entonces el fallo tiene que llegarle a ese otro, y se
   mira dónde **muere**. Quien espera es quien tiene que atrapar; quien devuelve
   la promesa sin esperarla le pasa el deber al que la espere; y quien la llama y
   la suelta —ni la espera, ni la devuelve, ni le pone un `.catch()` detrás— no
   se lo pasa a nadie. Se avisa en dos lugares: donde el que llama ya está
   mostrando algo, porque ahí la persona se queda con media pantalla y sin
   cartel; y donde no hay ningún bloque asincrónico alrededor, que es la promesa
   soltada al aire. Si el que llama tampoco muestra nada, el fallo sigue viaje y
   se juzga más arriba.

   QUÉ NO MIRA, DICHO DE FRENTE
   - **No mira si el cartel dice algo útil.** Comprueba que haya cartel y que su
     texto venga del catálogo, no que la frase esté bien elegida.
   - **No distingue una lista de datos vacía de una lista de elementos vacía.**
     `if (!contenedores.length) return;` le alcanza como rama de vacío aunque
     `contenedores` sean cajas de la pantalla y no filas de la base. Es la parte
     más floja de este chequeo y conviene saberlo.
   - **Toma por «cargando» cualquier escritura en la pantalla anterior a la
     primera espera.** Vaciar una tabla antes de pedirla también cuenta.
   - **Para saber quién atiende un fallo mira los nombres, no el camino.** Si un
     bloque nombra a otro que sí atiende el suyo, lo da por atendido, sin
     comprobar que sea *ese* llamado el que puede fallar.
   - **No mira los bloques que no esperan nada.** Sin `await` no hay demora que
     contar, y el estado cargando no tiene sentido.
   - **No entiende los envoltorios que no son asincrónicos.** Un llamado adentro
     de una función común, metida a su vez adentro de un bloque asincrónico, lo
     cuenta como si estuviera afuera.
   - **No mira el texto de las pantallas**, que es de `verificar_frases.mjs`.
     Acá sólo se juzga el texto que un guion escribe cuando algo falla, está
     vacío o todavía no llegó.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
import { soloCodigo, cuerpo, dentroDeTry, sinBloquesDeComentario } from './bloques.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Carpetas que este chequeo no mira: no son pantallas. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets', 'css', 'Nueva carpeta'];

/* Puntos de carga exentos, cada uno con su motivo escrito al lado. Una exención
   sin motivo es una excepción que nadie va a poder revisar después. */
const EXENTOS = new Map([]);

/* Y pantallas enteras que se van del proyecto, con la fecha y el motivo. No es
   lo mismo que la lista de arriba: ahí va un punto de carga que **no puede**
   manejar los cuatro estados; acá va una pantalla a la que **no vale la pena**
   arreglárselos porque tiene fecha de vencimiento escrita en un pendiente.
   Arreglarlos obliga a inventarle claves de catálogo en tres idiomas, y esas
   claves se borran junto con la pantalla.

   Se informa siempre cuáles son y por qué, abajo de todo. Una exención callada
   se lee como «acá está todo bien», que es justo lo contrario de lo que dice. */
const PANTALLAS_QUE_SE_VAN = new Map([
  ['mockup-app',
   'Es un modelo estético: una vez que sirvió de modelo, no vale nada. Lo dijo el '
   + 'Desarrollador el 26 de agosto de 2026, y el pendiente 6 ya tiene escrito que '
   + 'se borra —«Recién entonces se borran él y `mockup-app.html`»— apenas el chat, '
   + 'que es la capacidad que todavía vive sólo acá, esté reescrito en las PWAs. El '
   + 'alta de una Familia ya salió: la hace `registrar-familia.html` desde el 31 de '
   + 'agosto de 2026. Hasta entonces se lo deja como está: sus puntos de carga se arreglan en '
   + 'las pantallas que lo reemplacen, no acá.']
]);

/* La clave se escribe **sin la extensión**, y acá se le saca a lo que se
   compara. Con la extensión adentro —y así estuvo hasta el 31 de agosto de
   2026— la exención queda atada a que las pantallas sean `.html`: el día que
   dejen de serlo no encuentra la suya, la pantalla vuelve al corpus y este
   chequeo se pone rojo por un motivo que no es el suyo. Lo mira
   `scripts/verificar_red.mjs`, que se pone rojo si alguna clave de exención
   vuelve a traerla. */
const sinExtension = (nombre) => EXTENSIONES_DE_PANTALLA
  .reduce((n, e) => (n.endsWith(e) ? n.slice(0, -e.length) : n), nombre);

/* ── Qué es esperar datos, y qué es escribir en la pantalla ─────────────── */

/* Las puertas por donde entran los datos en este proyecto. Escritas una por una
   a propósito: adivinarlo por la forma del renglón da avisos que no se pueden
   arreglar, y una puerta nueva conviene que la agregue quien la abre. */
const PUERTAS_DE_DATOS = [
  /\bfetch\s*\(/,                       // un archivo del catálogo
  /\bClienteDatos\.\w/,                 // la base
  /\bSesion\.\w/,                       // la sesión, el perfil y lo que llega en vivo
  /\bCatalogo\.(cargar|cargarOferta)\b/, // las frases y la oferta
  /\bDisponibilidad\.\w/,
  /\bAutorizaciones\.\w/,
  /\bFichasLegajo\.\w/,
  /\bthis\.(cargar|cargarOferta)\s*\(/,  // los mismos módulos, vistos desde adentro
  /\b_traer\s*\(/,
  /\b_supabaseRequest\s*\(/
];

/* Escribir en la pantalla. Sólo lo que escribe de verdad: poner el resultado en
   una variable no es mostrarlo. Los ayudantes con nombre propio —`mostrar`, los
   dos `avisar`— son los que este proyecto usa para prender un estado y apagar
   los otros.

   `estado` con mayúscula detrás —`estadoTabla`, `estadoLista`, `estadoForm`— es
   una forma y no una lista de nombres: una pantalla con dos cargas que corren a
   la vez necesita un cartel por cada una, y con la lista escrita nombre por
   nombre el segundo cartel nacía sin que este chequeo lo reconociera. Pasó el
   30 de agosto de 2026 al escribir `guias-prestadora.html`, que tiene dos. */
const ESCRIBE = [
  /\.(textContent|innerHTML|innerText)\s*=[^=]/,
  /\.appendChild\s*\(/,
  /\.insertAdjacentHTML\s*\(/,
  /\.replaceChildren\s*\(/,
  /\.setAttribute\s*\(\s*['"]data-frase/,
  /\.style\.display\s*=/,
  /\b(mostrar|[a-z]{2,4}Mostrar|estado[A-Z]\w*|avisar|_avisar|_avisarEnOferta|migaPorClave)\s*\(/,
  /\balert\s*\(/
];

/* Decir «esperá» sin escribir texto: apagar el botón, prender la rueda. Cuenta
   como estado cargando igual que un cartel, y así un formulario que se porta
   bien no aparece acá pidiendo un cartel que ya no hace falta. Que el botón se
   apague de verdad lo verifica `verificar_botones.mjs`. */
const AVISA_QUE_ESPERA = [
  /\.disabled\s*=/,
  /\.classList\.(add|toggle)\s*\(/,
  /\baria-busy\b/
];

/* Recorrer una lista para dibujarla. Es lo que separa traer **una lista de
   cosas** —que puede venir vacía— de mandar una operación, que no puede: a un
   formulario de entrada pedirle el estado vacío no significa nada.

   Se mira **después de la primera espera y no antes**, porque el estado vacío
   es sobre los datos que volvieron. Lo que se recorre antes de pedir nada son
   los controles de la pantalla —las casillas marcadas, los campos del
   formulario—, y de eso no hay nada que decir. Sin esta distinción,
   `js/main.js:244` —que junta lo elegido en seis pasos y publica un aviso—
   figuraba como una grilla sin rama de «no vino nada». */
/* El salto de renglón, dicho por su número y no escrito: este mismo archivo lo
   leen los chequeos de texto visible, y una barra suelta confunde a más de uno.
   Es el mismo motivo por el que `bloques.mjs` arma así su expresión regular. */
const SALTO = String.fromCharCode(10);

/* Por el mismo motivo, los dos pedazos de expresión regular que se arman a mano
   para preguntar si una variable se devuelve: «return» y después, en el mismo
   renglón, esa palabra. */
const BARRA = String.fromCharCode(92);
const SEDEVUELVE = BARRA + 'breturn' + BARRA + 'b[^;]*' + BARRA + 'b';
const FINDEPALABRA = BARRA + 'b';

const RECORRE_UNA_LISTA = [
  /\.forEach\s*\(/,
  /\.map\s*\(/,
  /\bfor\s*\(\s*(const|let|var)\b/
];

/* La rama de «no vino nada». Se reconoce por la cuenta o por el nombre del
   estado; el `if (!fila)` suelto no entra porque cualquier guardia tiene esa
   forma y entonces esta comprobación no distinguiría nada. */
const HAY_VACIO = [
  /\.length\s*(===|==|!==|!=|>|>=|<)\s*0/,
  /!\s*[\w.$]+\.length\b/,
  /\bvac[ií]o\b/i
];

const abreBloque = (linea) => /\basync\b/.test(linea) && /\{\s*$/.test(linea);

/** El renglón sin su comentario, para no leer como código lo que es prosa. */
const sinComentario = (linea) => linea.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/, '');

const alguno = (lista, texto) => lista.some((r) => r.test(texto));

/* ── Qué texto ve una persona ───────────────────────────────────────────── */

/* Lo que se lee adentro de estos paréntesis no llega a la pantalla: un
   identificador, una clave del catálogo, el detalle que va a la consola. Se
   vacían antes de buscar frases escritas a mano. `Texto.claveDeError` y
   `Texto.mensajeDeError` están acá por su segundo argumento, que dice qué se
   estaba intentando y sale por la consola, nunca por la pantalla. */
const NO_SE_VE = new RegExp(
  '(console\\.\\w+|Texto\\.(clave|mensaje)DeError|Texto\\.escapar|new Error'
  + '|getElementById|querySelectorAll|querySelector|createElement'
  + '|getAttribute|setAttribute|classList\\.\\w+'
  + '|frase|items|traducir)'
  + "\\s*\\((?:[^()'\"]|'[^']*'|\"[^\"]*\"|`[^`]*`)*\\)", 'g');

function loQueSeVe(linea) {
  let antes = sinComentario(linea);
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const despues = antes.replace(NO_SE_VE, (t) => t.replace(/[^\s]/g, ' '));
    if (despues === antes) break;
    antes = despues;
  }
  return antes;
}

const CLAVE_DEL_CATALOGO = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;

/** ¿Este texto es una frase que una persona lee, y no un identificador? */
export function esFrase(crudo) {
  const pelado = crudo.trim();
  if (CLAVE_DEL_CATALOGO.test(pelado)) return false;
  // Una declaración de estilo no es texto: `font-size:12px;color:red;`.
  if (/^[a-z-]+\s*:/.test(pelado) && pelado.includes(';')) return false;
  if (/^(https?:|\/|\.\/|#|data:)/.test(pelado)) return false;
  /* Un nombre de algo no es una frase: `aviso-prestadora`, `data-frase`,
     `paso_de_cierre`, `btn-primario`. Se reconocen porque no tienen ni un
     espacio y están escritos con letras de máquina, sin acentos ni signos. */
  if (!/\s/.test(pelado) && /^[\w.#$-]+$/.test(pelado)) return false;
  const texto = pelado
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]{1,10});/gi, ' ')
    .replace(/\$\{[^}]*\}/g, ' ')
    .trim();
  if (!texto) return false;
  const palabras = texto.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/g) || [];
  return palabras.length >= 2 || /[áéíóúüñ¿¡]/i.test(texto);
}

/** Las frases escritas a mano que hay en un renglón que escribe en la pantalla. */
function frasesAMano(linea) {
  const visible = loQueSeVe(linea);
  const encontradas = [];
  for (const c of visible.matchAll(/(?<![\w$])("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g)) {
    const texto = c[1].slice(1, -1);
    if (esFrase(texto)) encontradas.push(texto);
  }
  return encontradas;
}

/* ── El recorte de un bloque ────────────────────────────────────────────── */

/**
 * Los renglones del bloque que arranca en `desde`, con los bloques asincrónicos
 * de adentro puestos en blanco. Así el envoltorio que abraza a toda una pantalla
 * no responde por lo que hacen las funciones que tiene adentro, que se juzgan
 * cada una por su cuenta.
 */
function propio(lineas, desde) {
  const bloque = cuerpo(lineas, desde).slice();
  for (let i = 1; i < bloque.length; i++) {
    if (!bloque[i] || !abreBloque(soloCodigo(bloque[i]))) continue;
    const adentro = cuerpo(bloque, i);
    for (let j = i; j < i + adentro.length && j < bloque.length; j++) bloque[j] = '';
  }
  return bloque;
}

/** El nombre del bloque, y el del objeto que lo tiene adentro si hay alguno. */
function comoSeLlama(lineas, desde) {
  const linea = lineas[desde];
  const conNombre = linea.match(/(?:async\s+function\s+|async\s+)([\w$]+)\s*\(/)
    || linea.match(/(?:const|let|var)\s+([\w$]+)\s*=\s*async\b/);
  const nombre = conNombre ? conNombre[1] : null;
  let objeto = null;
  for (let i = desde - 1; i >= 0 && !objeto; i--) {
    const dueno = lineas[i].match(/^\s*(?:const|let|var)\s+([A-Z][\w$]*)\s*=\s*\{\s*$/);
    if (dueno) objeto = dueno[1];
  }
  return { nombre, objeto };
}

/* ── El chequeo ─────────────────────────────────────────────────────────── */

/**
 * Los puntos de carga de un archivo, cada uno con lo que le falta.
 * Devuelve `[renglón, qué es, motivo]`, y aparte **todos** los bloques
 * asincrónicos con lo que se sabe de cada uno, porque para juzgar a un cargador
 * hay que mirar el proyecto entero y no un archivo solo.
 */
export function estadosDe(texto) {
  const lineas = texto.split('\n');
  const fallas = [];
  const bloques = [];
  let puntos = 0;

  for (let n = 0; n < lineas.length; n++) {
    if (!abreBloque(soloCodigo(lineas[n]))) continue;

    const bloque = propio(lineas, n);
    const codigo = bloque.map(sinComentario).join('\n');
    const { nombre, objeto } = comoSeLlama(lineas, n);
    const que = nombre ? '«' + nombre + '»' : 'el bloque que espera datos';

    /* Dónde está la primera espera, y qué `catch` tiene. */
    const primeraEspera = bloque.findIndex((l) => /\bawait\b/.test(sinComentario(l)));
    const atrapa = [];
    for (let i = 0; i < bloque.length; i++) {
      if (!/\bcatch\b/.test(soloCodigo(bloque[i]))) continue;
      /* El renglón del `catch` arranca con la llave que cierra el `try`, y esa
         llave le descuadra la cuenta a `cuerpo()`: hay que empezar en `catch`. */
      const desde = bloque.slice();
      desde[i] = desde[i].slice(desde[i].search(/\bcatch\b/));
      atrapa.push(cuerpo(desde, i).map(sinComentario).join('\n'));
    }
    const elCatchDice = atrapa.some((c) => alguno(ESCRIBE, c));
    const elCatchRelanza = atrapa.some((c) => /\bthrow\b/.test(c));

    /* Y una tercera forma de contar el fallo, que no es decirlo ni volver a
       lanzarlo: **anotarlo en una lista que la función devuelve**. Es lo que
       hace `js/fichas-legajo.js:285`, que sube varios archivos del legajo y no
       quiere frenar el alta entera porque uno no subió: junta los que fallaron
       y los devuelve, para que quien llama avise una sola vez y sin perder lo
       demás. El fallo le llega igual a quien muestra —que es todo lo que un
       cargador tiene que garantizar—, sólo que como dato y no como excepción.

       Se exige que sea la **misma** variable que se devuelve. Un `push` a
       cualquier lado no cuenta: una lista que después nadie mira es un fallo
       tragado con dos pasos más. */
    const elCatchAnota = atrapa.some((c) => {
      const anotadas = [...c.matchAll(/\b([A-Za-z_$][\w$]*)\s*\.push\s*\(/g)].map((m) => m[1]);
      return anotadas.some((v) => new RegExp(SEDEVUELVE + v + FINDEPALABRA).test(codigo));
    });

    const escribe = bloque.filter((l) => alguno(ESCRIBE, sinComentario(l)));
    const esperaDatos = /\bawait\b/.test(codigo) && alguno(PUERTAS_DE_DATOS, codigo);

    bloques.push({
      renglon: n + 1,
      fin: n + bloque.length,
      nombre,
      objeto,
      que,
      codigo,
      esperaDatos,
      muestra: escribe.length > 0,
      atrapaBien: elCatchDice || elCatchRelanza || elCatchAnota,
      motivo: atrapa.length
        ? 'atrapa el fallo y no lo cuenta ni lo vuelve a lanzar'
        : 'no atrapa el fallo'
    });

    /* Un bloque que trae y no muestra es un cargador: su deber no son los cuatro
       estados sino que el fallo le llegue a quien sí muestra, y eso se juzga
       afuera, mirando quién lo llama. */
    if (!esperaDatos || escribe.length === 0) continue;

    puntos++;
    if (EXENTOS.has(que + ':' + (n + 1))) continue;

    const falta = [];
    const antesDeEsperar = bloque.slice(0, primeraEspera);
    if (!antesDeEsperar.some((l) => alguno(ESCRIBE, sinComentario(l))
        || alguno(AVISA_QUE_ESPERA, sinComentario(l)))) {
      falta.push('no dice nada en la pantalla antes de esperar: falta el estado **cargando**');
    }
    if (!elCatchDice) {
      falta.push(atrapa.length
        ? 'el `catch` no escribe nada en la pantalla: falta el estado **error**'
        : 'no hay ningún `catch`: falta el estado **error**');
    }
    const despuesDeEsperar = bloque.slice(primeraEspera).map(sinComentario).join(SALTO);
    if (alguno(RECORRE_UNA_LISTA, despuesDeEsperar) && !alguno(HAY_VACIO, codigo)) {
      falta.push('dibuja una lista y no tiene la rama de «no vino nada»: falta el estado **vacío**');
    }
    for (const linea of escribe) {
      for (const frase of frasesAMano(linea)) {
        falta.push('escribe a mano «' + frase.slice(0, 70)
          + (frase.length > 70 ? '…' : '') + '», que no existe en `en` ni en `pt-BR`');
      }
    }

    if (falta.length) fallas.push([n + 1, que, falta]);
  }

  return { fallas, bloques, puntos };
}

/** ¿El código de un bloque nombra a este otro? */
export function llamaA(codigo, otro) {
  if (!otro.nombre) return false;
  if (!otro.patron) {
    otro.patron = otro.objeto
      ? new RegExp('\\b(?:' + otro.objeto + '|this)\\.' + otro.nombre + '\\s*\\(')
      : new RegExp('(?<![\\w$.])' + otro.nombre + '\\s*\\(');
  }
  return otro.patron.test(codigo);
}

/**
 * Los textos de estado escritos a mano en un objeto de mensajes: el
 * `const MENSAJES = { cargando: '…', error: '…' }` que dos módulos tienen.
 */
export function mensajesAMano(texto) {
  const fallas = [];
  texto.split('\n').forEach((linea, i) => {
    const m = sinComentario(linea).match(/^\s*(cargando|error|vac[ií]o|listo)\s*:\s*('[^']*'|"[^"]*")\s*,?\s*$/);
    if (!m) return;
    const frase = m[2].slice(1, -1);
    if (!esFrase(frase)) return;
    fallas.push([i + 1, 'el texto del estado «' + m[1] + '»',
      ['está escrito a mano —«' + frase.slice(0, 60) + (frase.length > 60 ? '…' : '')
       + '»— así que no existe en `en` ni en `pt-BR`']]);
  });
  return fallas;
}

/**
 * ¿Este renglón le pasa el deber de atrapar a otro? Quien espera atrapa; quien
 * devuelve la promesa sin esperarla se lo pasa al que la espere.
 */
export function pasaElDeber(linea) {
  const codigo = soloCodigo(linea);
  if (/\.catch\s*\(/.test(codigo)) return true;
  if (/\bawait\b/.test(codigo)) return false;
  return /\breturn\b/.test(codigo) || /=[^=]/.test(codigo) || /\.then\s*\(/.test(codigo);
}

/* ── Pruebas del detector ────────────────────────────────────────────────
   Un chequeo que no detecta nada pasa siempre, y eso no se nota. Antes de mirar
   el proyecto se mira a sí mismo. */

const COMPLETO = "async function traer() {\n  mostrar('cargando');\n  try {\n"
  + '    const filas = await ClienteDatos.getAspirantes();\n'
  + "    if (!filas.length) { mostrar('vacio'); return; }\n"
  + '    filas.forEach((f) => grilla.appendChild(dibujar(f)));\n'
  + "    mostrar('listo');\n"
  + '  } catch (err) {\n'
  + "    donde.setAttribute('data-frase', Texto.claveDeError(err, 'traer los legajos'));\n"
  + "    mostrar('error');\n  }\n}";

const MAL = [
  ['no dice nada mientras espera',
   COMPLETO.replace("  mostrar('cargando');\n", '')],
  ['el `catch` sólo deja el detalle en la consola',
   COMPLETO.replace("    donde.setAttribute('data-frase', Texto.claveDeError(err, 'traer los legajos'));\n"
     + "    mostrar('error');\n", "    console.error(err);\n")],
  ['no tiene rama de vacío',
   COMPLETO.replace("    if (!filas.length) { mostrar('vacio'); return; }\n", '')],
  ['escribe el cartel de error a mano',
   COMPLETO.replace("    donde.setAttribute('data-frase', Texto.claveDeError(err, 'traer los legajos'));",
     "    donde.textContent = 'No se pudieron traer los legajos.';")],
  ['escribe el cartel de vacío a mano, adentro de un molde',
   COMPLETO.replace("{ mostrar('vacio'); return; }",
     '{ lista.innerHTML = ' + String.fromCharCode(96) + '<p>Todavía no hay ninguno</p>'
     + String.fromCharCode(96) + '; return; }')]
];

const BIEN = [
  ['el punto de carga con los cuatro estados', COMPLETO],
  ['un bloque que no espera nada',
   'function dibujar(filas) {\n  filas.forEach((f) => grilla.appendChild(nodo(f)));\n}'],
  ['un bloque que espera algo que no son datos',
   'async function esperar() {\n  await new Promise((r) => setTimeout(r, 10));\n'
   + "  cartel.textContent = 'x';\n}"],
  ['un envío que apaga el botón y no trae ninguna lista',
   'async function enviar() {\n  boton.disabled = true;\n  try {\n'
   + '    await ClienteDatos.registrarAspirante(datos);\n'
   + "    cartel.setAttribute('data-frase', 'alta.listo');\n"
   + '  } catch (err) {\n'
   + "    cartel.setAttribute('data-frase', Texto.claveDeError(err, 'dar de alta'));\n"
   + '  }\n}'],
  ['un cargador, que trae y no muestra',
   'async function traer() {\n  const r = await fetch(ARCHIVO);\n  return r.json();\n}'],
  ['el envoltorio no responde por lo que hacen sus funciones adentro',
   '(async () => {\n' + COMPLETO.split('\n').map((l) => '  ' + l).join('\n')
   + '\n  traer();\n})();'],
  ['una llave adentro de una frase no descuadra la cuenta',
   COMPLETO.replace("    mostrar('listo');", "    const t = 'con { adentro';\n    mostrar('listo');")]
];

/* El cargador que anota el fallo en la lista que devuelve. Éste no se juzga por
   `fallas` —lo de un cargador se decide después, mirando quién lo llama— sino
   por si el detector reconoció que el fallo quedó contado. La prueba que
   importa es la de al lado: la misma función sin el `return` **tiene** que
   seguir avisando, porque ahí la lista no la mira nadie. */
const JUNTA_LOS_QUE_FALLARON = 'async function subir(archivos) {\n'
  + '  const fallados = [];\n'
  + '  for (const a of archivos) {\n'
  + '    try {\n      await Sesion.uploadFile(a);\n'
  + '    } catch (err) {\n      fallados.push({ nombre: a.name });\n    }\n  }\n'
  + '  return fallados;\n}';
const LA_TIRA_A_UN_TACHO = JUNTA_LOS_QUE_FALLARON.replace('  return fallados;\n', '');

const atrapaBienDe = (t) => estadosDe(t).bloques[0].atrapaBien;
const noDetectaA = atrapaBienDe(LA_TIRA_A_UN_TACHO) ? ['la lista que nadie devuelve'] : [];
const sePasaA = atrapaBienDe(JUNTA_LOS_QUE_FALLARON) ? [] : ['la lista que sí se devuelve'];

const noDetecta = MAL.filter(([, t]) => estadosDe(t).fallas.length === 0);
const sePasa = BIEN.filter(([, t]) => estadosDe(t).fallas.length > 0);

const MAL_MENSAJES = ["  const MENSAJES = {\n    cargando: 'Cargando la disponibilidad…'\n  };"];
const BIEN_MENSAJES = ["  const MENSAJES = {\n    cargando: 'comun.cargando'\n  };"];
const noDetectaM = MAL_MENSAJES.filter((t) => mensajesAMano(t).length === 0);
const sePasaM = BIEN_MENSAJES.filter((t) => mensajesAMano(t).length > 0);

const MAL_DEBER = ['ClienteDatos.initTenant();', 'await FichasLegajo.cargar();',
  'const cierre = await Autorizaciones.textosDelPaso();'];
const BIEN_DEBER = ['promesa = _traer().then((d) => d);', 'return this.cargar();',
  'Catalogo.cargar().catch((e) => avisar(e));'];
const noDetectaD = MAL_DEBER.filter((l) => pasaElDeber(l));
const sePasaD = BIEN_DEBER.filter((l) => !pasaElDeber(l));

if (noDetecta.length || sePasa.length || noDetectaM.length || sePasaM.length
    || noDetectaD.length || sePasaD.length
    || noDetectaA.length || sePasaA.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  for (const t of noDetectaM) console.error('  no detecta el mensaje a mano: ' + t.trim());
  for (const t of sePasaM) console.error('  avisa de más en los mensajes: ' + t.trim());
  for (const l of noDetectaD) console.error('  no detecta el llamado sin red: ' + l);
  for (const l of sePasaD) console.error('  avisa de más en el llamado: ' + l);
  for (const q of noDetectaA) console.error('  da por contado un fallo que no lo está: ' + q);
  for (const q of sePasaA) console.error('  no reconoce el fallo anotado en la lista: ' + q);
  process.exit(1);
}

/* ── El proyecto ────────────────────────────────────────────────────────── */

const revisados = [];
for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (PANTALLAS_QUE_SE_VAN.has(sinExtension(nombre))) continue;
  revisados.push({
    nombre,
    /* Sin los comentarios de bloque: la cabecera de un archivo suele traer un
       ejemplo de cómo se lo llama, y eso es documentación, no una llamada. */
    texto: sinBloquesDeComentario(readFileSync(camino, 'utf8'))
  });
}

const fallas = [];
let puntos = 0;
const bloques = [];

for (const { nombre, texto } of revisados) {
  const salida = estadosDe(texto);
  puntos += salida.puntos;
  for (const [renglon, que, motivos] of salida.fallas) fallas.push([nombre, renglon, que, motivos]);
  for (const [renglon, que, motivos] of mensajesAMano(texto)) fallas.push([nombre, renglon, que, motivos]);
  for (const bloque of salida.bloques) bloques.push({ ...bloque, archivo: nombre });
}

/* ── Los cargadores, que se juzgan mirando el proyecto entero ────────────
   Dos cosas se propagan de un bloque al que lo llama, y las dos hacen falta
   porque un módulo pone la puerta en un lado y la delegación en otro. Se repite
   la vuelta hasta que ninguna cambia, que es la manera de que dé lo mismo el
   orden en que estén escritos los archivos.

   - **Atender el fallo.** Quien llama a alguien que lo atiende, queda atendido.
     Es una aproximación y conviene decirlo: mira que el nombre aparezca en el
     cuerpo, no que sea *ese* llamado el que puede fallar.
   - **Traer datos.** Quien llama a alguien que trae datos, trae datos. Sin esto,
     el que sólo devuelve la promesa de otro no se ve como carga. */
const nombrados = bloques.filter((b) => b.nombre);
for (const propagar of ['atiende', 'trae']) {
  for (const b of bloques) b[propagar] = propagar === 'atiende' ? b.atrapaBien : b.esperaDatos;
  for (let vuelta = 0; vuelta < 12; vuelta++) {
    let cambio = false;
    for (const b of bloques) {
      if (b[propagar]) continue;
      if (!nombrados.some((c) => c !== b && c[propagar] && llamaA(b.codigo, c))) continue;
      b[propagar] = true;
      cambio = true;
    }
    if (!cambio) break;
  }
}

/** El bloque asincrónico más ajustado que contiene a este renglón, si hay uno. */
function quienLoAbraza(archivo, renglon) {
  let mejor = null;
  for (const b of bloques) {
    if (b.archivo !== archivo || renglon <= b.renglon || renglon > b.fin) continue;
    if (!mejor || b.renglon > mejor.renglon) mejor = b;
  }
  return mejor;
}

/* Quién llama a cada cargador, y si el fallo llega a alguna parte. Se avisa sólo
   donde el fallo **muere**: adentro de un bloque que ya está mostrando algo en
   la pantalla —así que la persona va a ver una pantalla a medias sin cartel—, o
   donde no hay ningún bloque asincrónico alrededor, que es la promesa que se
   suelta y nadie recoge. Si el que llama tampoco muestra nada, el fallo sigue
   viaje y se juzga más arriba. */
for (const cargador of bloques.filter((b) => b.trae && !b.muestra && !b.atiende)) {
  if (!cargador.nombre) continue;
  const sueltos = [];
  for (const { nombre, texto } of revisados) {
    const lineas = texto.split('\n');
    for (let i = 0; i < lineas.length; i++) {
      if (nombre === cargador.archivo && i + 1 === cargador.renglon) continue;
      if (!llamaA(soloCodigo(lineas[i]), cargador)) continue;
      if (pasaElDeber(lineas[i]) || dentroDeTry(lineas, i)) continue;
      const abraza = quienLoAbraza(nombre, i + 1);
      if (abraza && !abraza.muestra) continue;
      sueltos.push(nombre + ':' + (i + 1) + (abraza ? '' : ' (suelto)'));
    }
  }
  if (!sueltos.length) continue;
  fallas.push([cargador.archivo, cargador.renglon, cargador.que + ', que trae datos y no muestra nada',
    [cargador.motivo + ', y ahí muere: ' + sueltos.join(', ')]]);
}

fallas.sort((a, b) => (a[0] + ':' + String(a[1]).padStart(6, '0'))
  .localeCompare(b[0] + ':' + String(b[1]).padStart(6, '0')));

/* Las pantallas que no se miraron, dichas siempre y sin importar si el resto dio
   verde. Una exención que no se ve es un agujero, no una decisión. */
function decirLasQueSeVan() {
  if (PANTALLAS_QUE_SE_VAN.size === 0) return;
  const decir = fallas.length > 0 ? console.error : console.log;
  decir('\nPantallas que este chequeo no mira, porque se van del proyecto:');
  for (const [nombre, motivo] of PANTALLAS_QUE_SE_VAN) {
    decir('  - ' + nombre + '\n      ' + motivo.replace(/(.{1,72})(\s|$)/g, '$1\n      ').trim());
  }
}

if (fallas.length > 0) {
  console.error('Puntos de carga que no manejan los cuatro estados:\n');
  for (const [nombre, renglon, que, motivos] of fallas) {
    console.error('  - ' + nombre + ':' + renglon + '  ' + que);
    for (const motivo of motivos) console.error('      ' + motivo);
    console.error('');
  }
  console.error(
    `${fallas.length} avisos. «Todo componente que carga datos maneja cuatro estados:\n`
    + 'cargando, error, vacío, listo», y el texto de los tres primeros sale del catálogo\n'
    + 'como cualquier otro rótulo, porque un cartel escrito a mano no existe en `en` ni\n'
    + 'en `pt-BR`. El molde está en `directorio.html` y en `perfil.html`.\n'
    + 'Si un punto de carga no puede manejarlos por algún motivo, va a EXENTOS de este\n'
    + 'mismo archivo, con el motivo escrito al lado.');
  decirLasQueSeVan();
  process.exit(1);
}

/* Las exenciones van **antes** del renglón de resumen, y no después: quien
   junta los chequeos —`verificar_todo.mjs`— muestra el último renglón de cada
   uno, y con el orden al revés el resumen de éste era el final de una
   explicación de siete renglones sobre una pantalla que se borra. */
decirLasQueSeVan();
console.log(
  `\nEstados verificados: ${puntos} puntos de carga y ${bloques.length} bloques asincrónicos `
  + `en ${revisados.length} archivos, todos con sus cuatro estados y el texto del catálogo.`);
