/* ===================================================
   VERIFICA QUE NO SALGAN DATOS POR LA DIRECCIÓN NI POR EL REGISTRO

   Falla —con código de salida 1— si la barra de direcciones lleva un parámetro
   que nadie declaró, o si un registro de actividades imprime algo que no es un
   mensaje ni un error.

       node scripts/verificar_sensibles.mjs

   De dónde sale la regla. La de la empresa nombra cuatro salidas de una vez:
   «Nunca información sensible en registros, direcciones, parámetros ni mensajes
   públicos» (`celtatech\CLAUDE.md`, «Seguridad, privacidad y auditoría»). La
   compartida de estos dos productos dice qué es sensible acá: «remuneraciones,
   causales de cese, certificados médicos, antecedentes, información clínica»
   (`..\..\docs\REGLAS_PRODUCTOS_CAREONYS.md`, punto 4).

   De esas cuatro salidas, la de los **mensajes públicos** ya la mira
   `scripts/verificar_escapado.mjs`. Las otras dos no las miraba nadie, y son
   las dos que este chequeo cierra: **la dirección** y **el registro**.

   Por qué esas dos y no otras. Las dos guardan sin que nadie lo pida. Una
   dirección queda en el historial del navegador, en el título de la pestaña que
   alguien fotografía, en el «compartir» que la persona le manda a un tercero y
   en el registro de cualquier intermediario del camino; borrar el dato de la
   base no la borra de ahí. Y un registro de actividades es el lugar donde vive
   lo que se escribió para depurar y quedó: un `console.log(legajo)` de una
   tarde imprime el documento de identidad, los antecedentes y la remuneración
   de una persona en la consola de cualquiera que abra esa pantalla, y no se ve
   en la pantalla, así que nadie lo nota.

   Qué mira:
   1. **Todo parámetro de la barra de direcciones está declarado acá**, en
      `PARAMETROS_DE_LA_DIRECCION`, con el motivo escrito al lado. No juzga si
      un nombre suena sensible —eso lo decide quien lo escribe—: obliga a que
      alguien lo decida. Un parámetro nuevo se planta hasta que se lo declare,
      y declararlo es contestar la única pregunta que importa: ¿esto puede
      quedar escrito en el historial de un navegador ajeno?
   2. **Todo argumento de un registro es un mensaje o un error.** «Mensaje» es
      cualquier cosa que lleve un texto escrito adentro; «error» es lo que se
      atrapó en un `catch`. Un argumento que no es ninguna de las dos es un
      dato, y un dato de este producto es el legajo de una persona. Tampoco
      pasa un `JSON.stringify()` adentro de un registro: es la forma corta de
      imprimir una fila entera, y el texto de al lado la disfraza de mensaje.

   Qué NO mira, dicho de frente:
   - **Las direcciones que no son la barra**: la de una fuente de letra, la de
     la base de datos, la de un `mailto:`. Una dirección externa se reconoce
     por el `://` que lleva antes del parámetro, y el `mailto:` por su nombre.
     El `mailto:` del formulario de consulta lleva el nombre y el teléfono de
     quien escribe adentro del cuerpo, y está bien: **no es una navegación**,
     es el programa de correo de esa persona abriéndose con su propio texto
     adentro, y nunca sale a la red.
   - **Los parámetros que la biblioteca de datos le pone a su propio pedido**
     —`select`, `order`, `eq.`—. Ésos no son la barra de direcciones: viajan
     cifrados a la base y no quedan en el historial de nadie.
   - **Los guiones de `scripts/`**, que escriben en la terminal de quien
     programa y no en la consola de un navegador ajeno. Ahí un `console.log`
     con una fila adentro es la salida de la prueba, no una filtración.
   - **Si el valor que va adentro de un parámetro declarado es sensible.** Que
     `id` sea el identificador de un legajo y no un documento de identidad lo
     decide quien escribe la pantalla; acá se garantiza que la lista de qué
     puede viajar exista y esté escrita.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA, seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   éste: una dirección se arma y un registro se escribe donde vive una pantalla
   o su guion. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets', 'Nueva carpeta'];

/* ── 1. Lo que puede viajar en la barra de direcciones ──────────────────────
   Cada nombre, con por qué puede quedar escrito en el historial de un
   navegador ajeno. Un nombre que no está acá pone el chequeo en rojo, y eso es
   lo que hace este renglón: obliga a contestar la pregunta antes, no después. */
const PARAMETROS_DE_LA_DIRECCION = new Map([
  ['id', 'el identificador de un legajo, para abrir su perfil desde el directorio. ' +
    'Es un `uuid`: no dice el nombre de nadie, y sin sesión no abre nada que la ' +
    'RLS no deje abrir'],
  ['tenant', 'el nombre corto de la Prestadora cuya puerta pública se está mirando. ' +
    'Es la marca de un negocio, no el dato de una persona, y la puerta pública ' +
    'tiene que poder compartirse. **No decide ningún permiso**: eso lo prueba la ' +
    'octava regla de `scripts/verificar_esquema.mjs`, que se planta si alguna ' +
    'política saca la Organización de un valor que venga en el pedido'],
  ['t', 'la forma corta de lo mismo, para que la dirección de una Prestadora entre ' +
    'en un papel impreso o en un mensaje'],
  ['idioma', 'cuál de los tres se muestra. No dice nada de quien mira'],
  ['volver', 'a qué pantalla regresar después de entrar. Es una ruta del propio ' +
    'sitio'],
  ['evaluacion', 'la clave del examen que se va a rendir. Es una clave del catálogo, ' +
    'igual para todo el mundo'],
  ['error', 'lo escribe Supabase al devolver a quien vino de un correo de recuperación ' +
    'con el enlace vencido. No lo pone este producto: lo lee para poder explicar ' +
    'qué pasó en vez de mostrar una pantalla en blanco'],
  ['error_code', 'lo mismo, la forma que se puede comparar sin traducir']
]);

/* ── 2. Registros perdonados ────────────────────────────────────────────────
   La clave es el archivo **sin extensión ni carpeta**, así que alcanza a sus
   copias; los valores, los argumentos exactos. Un argumento nuevo en el mismo
   archivo se planta igual. */
/* La clase de la alarma se imprime en tres archivos y es el mismo caso en los
   tres: está escrita una vez acá y se registra abajo con los tres nombres. Era
   uno solo mientras cada programa del teléfono era un archivo entero; al pasar a
   pantallas, el mismo renglón quedó en la pantalla que dibuja las alarmas de
   cada programa, y las páginas sueltas siguen publicadas hasta que se las
   reemplace. */
const LA_CLASE_DE_LA_ALARMA = {
  valores: ['fila.clase'],
  motivo: 'es la clase de una alarma —`jornada_abierta` o `salida_sin_entrada`—, ' +
    'que es un valor fijo que escribe la propia `mis_alarmas()` ' +
    '(`supabase/migrations/0001_base_del_esquema.sql:1633` y `:1648`) y no ' +
    'un dato de ninguna persona. Se imprime cuando la base manda una clase que ' +
    'la pantalla todavía no sabe nombrar, y sin verla el aviso no sirve para ' +
    'agregarle la frase que le falta'
};

const REGISTROS_PERDONADOS = new Map([
  ['index', LA_CLASE_DE_LA_ALARMA],
  ['FranjaDeAlarmas', LA_CLASE_DE_LA_ALARMA],
  ['Asistencia', LA_CLASE_DE_LA_ALARMA],
  ['catalogo', {
    valores: ['escrito'],
    motivo: 'es el texto crudo del atributo `data-huecos` cuando no es un JSON ' +
      'válido. Lo escribe quien programa el marcado, no una persona que usa el ' +
      'producto, y sin verlo el aviso no sirve para arreglarlo'
  }]
]);

// ── Cómo se reconoce cada cosa ─────────────────────────────────────────────

const BARRA = 92; // el código de la barra invertida, para no escribirla suelta

/* Un parámetro escrito adentro de una dirección. Qué dirección es se decide
   mirando **la cadena de textos pegados** de la que ese parámetro forma parte:
   un `://` la manda a otro servidor y un `mailto:` al programa de correo de
   quien mira. Se mira la cadena y no el renglón por dos motivos que se dan los
   dos en este proyecto: el `mailto:` del formulario de consulta nombra el
   destino en un renglón y el asunto en el siguiente, y la dirección de la
   fuente de letra lleva `;` adentro —`wght@400;500;600`—, así que cortar por el
   `;` parte la dirección al medio y esconde el `://` del principio. */
const PARAMETRO_ESCRITO = /[?&]([A-Za-z_][\w-]*)=/g;
const NO_ES_LA_BARRA = /:\/\/|mailto:/;
const SE_PEGAN = /^[^'"`]*\+[^'"`]*$/; // lo que hay entre dos textos que se suman
const ESLABONES = 3; // cuántos textos hacia atrás se miran de una cadena

/* Un parámetro leído de la barra. Sólo cuenta como tal si sale de un
   `URLSearchParams`: `.get(` suelto es también cómo se le pide algo a un `Map`,
   y confundirlos avisaría de más. */
const DE_LA_BARRA_SUELTO = /new\s+URLSearchParams\s*\([^)]*\)\s*\.get\s*\(\s*['"]([A-Za-z_][\w-]*)['"]/g;
const NOMBRA_LA_BARRA = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+URLSearchParams/g;

const REGISTRO = /console\.(?:log|info|warn|debug|error)\s*\(/g;
/* Lo que se atrapa en un `catch`, con cualquiera de los nombres que este
   proyecto le pone, y su `.message`. */
const ES_ERROR = /^(?:e|[\w$]*(?:err|error)[\w$]*)(?:\.message)?$/i;
const TIENE_TEXTO = /['"`]/;
const IMPRIME_UNA_FILA = /JSON\.stringify\s*\(/;

/** El renglón donde cae una posición del texto. */
function renglonDe(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

/* Deja el comentario en blanco sin mover ningún renglón. Hace falta: la
   cabecera de `js/apiClient.js` explica el `?tenant=` en un comentario, y un
   chequeo que lee el comentario como código cuenta un parámetro que no existe. */
function sinComentarios(texto, esPantalla) {
  const tapar = (m) => m.replace(/[^\r\n]/g, ' ');
  let t = texto;
  if (esPantalla) t = t.replace(/<!--[\s\S]*?-->/g, tapar);
  t = t.replace(/\/\*[\s\S]*?\*\//g, tapar);
  return t.replace(/^([^\n'"`]*?)\/\/[^\n]*/gm,
    (m, antes) => antes + tapar(m.slice(antes.length)));
}

/* Los textos escritos de un archivo: `[inicio, fin, contenido]`. Sirven para
   dos cosas: son donde se escribe una dirección, y son lo único que se mira
   para decidir de quién es. */
function textosEscritos(texto) {
  const salida = [];
  let comilla = null, inicio = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      if (c === comilla && texto.charCodeAt(i - 1) !== BARRA) {
        salida.push([inicio, i, texto.slice(inicio + 1, i)]);
        comilla = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { comilla = c; inicio = i; }
  }
  return salida;
}

/** Los parámetros de la barra de un texto: `[renglón, nombre, cómo]`. */
function parametrosDeUnTexto(texto) {
  const salida = [];
  const escritos = textosEscritos(texto);
  for (const [n, [, , contenido]] of escritos.entries()) {
    if (!PARAMETRO_ESCRITO.test(contenido)) { PARAMETRO_ESCRITO.lastIndex = 0; continue; }
    PARAMETRO_ESCRITO.lastIndex = 0;

    /* La cadena: este texto y hasta tres anteriores, mientras entre uno y otro
       no haya más que una suma. `'mailto:' + direccion + '?subject='` es una
       sola dirección escrita en tres pedazos. */
    let cadena = contenido;
    for (let k = n; k > 0 && n - k < ESLABONES; k--) {
      const entre = texto.slice(escritos[k - 1][1] + 1, escritos[k][0]);
      if (!SE_PEGAN.test(entre)) break;
      cadena = escritos[k - 1][2] + cadena;
    }
    if (NO_ES_LA_BARRA.test(cadena)) continue;

    for (const m of contenido.matchAll(PARAMETRO_ESCRITO)) {
      salida.push([renglonDe(texto, escritos[n][0] + m.index), m[1],
        'se escribe en la dirección']);
    }
  }
  for (const m of texto.matchAll(DE_LA_BARRA_SUELTO)) {
    salida.push([renglonDe(texto, m.index), m[1], 'se lee de la dirección']);
  }
  for (const v of texto.matchAll(NOMBRA_LA_BARRA)) {
    const pide = new RegExp('\\b' + v[1] + '\\s*\\.get\\s*\\(\\s*[\'"]([A-Za-z_][\\w-]*)[\'"]', 'g');
    for (const m of texto.matchAll(pide)) {
      salida.push([renglonDe(texto, m.index), m[1], 'se lee de la dirección']);
    }
  }
  return salida.sort((a, b) => a[0] - b[0]);
}

/** Corta una lista de argumentos por las comas de primer nivel. */
function porComas(s) {
  const salida = [];
  let prof = 0, act = '', comilla = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comilla) {
      act += c;
      if (c === comilla && s.charCodeAt(i - 1) !== BARRA) comilla = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { comilla = c; act += c; continue; }
    if ('([{'.includes(c)) prof++;
    if (')]}'.includes(c)) prof--;
    if (c === ',' && prof === 0) { salida.push(act.trim()); act = ''; continue; }
    act += c;
  }
  if (act.trim()) salida.push(act.trim());
  return salida;
}

/** Lo que hay entre el paréntesis de `desde` y el que lo cierra, o `null`. */
function entreParentesis(texto, desde) {
  let prof = 0, comilla = null;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i];
    if (comilla) {
      if (c === comilla && texto.charCodeAt(i - 1) !== BARRA) comilla = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { comilla = c; continue; }
    if (c === '(') prof++;
    if (c === ')') { prof--; if (prof === 0) return texto.slice(desde + 1, i); }
  }
  return null;
}

/** Los registros de un texto: `[renglón, argumento]` de los que no son mensaje. */
function registrosDeUnTexto(texto, perdonados = []) {
  const salida = [];
  for (const m of texto.matchAll(REGISTRO)) {
    const dentro = entreParentesis(texto, m.index + m[0].length - 1);
    if (dentro === null) continue;
    const renglon = renglonDe(texto, m.index);
    if (IMPRIME_UNA_FILA.test(dentro)) {
      salida.push([renglon, 'JSON.stringify()',
        'imprime una fila entera, y el texto de al lado la disfraza de mensaje']);
      continue;
    }
    for (const arg of porComas(dentro)) {
      if (TIENE_TEXTO.test(arg) || ES_ERROR.test(arg)) continue;
      if (perdonados.includes(arg)) continue;
      salida.push([renglon, arg.replace(/\s+/g, ' '),
        'no es ni un mensaje ni un error, así que es un dato']);
    }
  }
  return salida;
}

/* ── Las pruebas de adentro ─────────────────────────────────────────────────
   Si el detector deja de distinguir estos casos, el chequeo no verifica nada y
   hay que enterarse acá, no el día que falle. `DECLARADOS_DE_PRUEBA` no es el
   catálogo de arriba a propósito: la prueba tiene que seguir dando lo mismo
   cuando ese catálogo cambie. */
const DECLARADOS_DE_PRUEBA = new Map([['id', 'un uuid']]);

const MAL = [
  ['un parámetro sin declarar escrito en un enlace',
   "const enlace = 'perfil.html?dni=' + encodeURIComponent(fila.documento);\n"],
  ['el mismo, leído de la barra',
   "const dni = new URLSearchParams(window.location.search).get('dni');\n"],
  ['el mismo, leído por una variable',
   "const partes = new URLSearchParams(window.location.search);\n" +
   "const dni = partes.get('dni');\n"],
  ['un registro con un dato suelto',
   'console.log(legajo);\n'],
  ['un registro con el dato disfrazado de mensaje',
   "console.error('Legajo:', legajo);\n"],
  ['un registro que imprime la fila entera',
   "console.warn('Legajo: ' + JSON.stringify(legajo));\n"]
];

const BIEN = [
  ['un parámetro declarado',
   "const enlace = 'perfil.html?id=' + encodeURIComponent(fila.id);\n"],
  ['el mismo, leído de la barra',
   "const id = new URLSearchParams(window.location.search).get('id');\n"],
  ['la dirección de una fuente de letra, que no es la barra',
   '<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap">\n'],
  ['un `mailto:`, que abre el programa de correo de quien mira',
   "enlace.href = 'mailto:' + direccion + '?subject=' + encodeURIComponent(asunto);\n"],
  ['un registro con su mensaje y su error',
   "console.error('Panel de la Prestadora, legajos:', err);\n"],
  ['un registro que arma el mensaje con un dato adentro',
   "console.error('Las franjas del aviso ' + aviso.id + ':', err);\n"],
  ['un registro con el error de la biblioteca',
   "console.error('Catálogo:', error.message);\n"],
  ['pedirle algo a un `Map`, que no es la barra de direcciones',
   "const frase = CATALOGO.get('consulta.asunto');\n"]
];

const juzgar = (t) => [
  ...parametrosDeUnTexto(t).filter(([, n]) => !DECLARADOS_DE_PRUEBA.has(n)),
  ...registrosDeUnTexto(t)
];
const noDetecta = MAL.filter(([, t]) => juzgar(t).length === 0);
const sePasa = BIEN.filter(([, t]) => juzgar(t).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

// ── Lo que hace el código ──────────────────────────────────────────────────

const fallas = [];
let parametros = 0;
let registros = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const archivo = relative(raiz, camino).split(sep).join('/');
  const base = archivo.slice(archivo.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
  const esPantalla = EXTENSIONES_DE_PANTALLA.some((e) => archivo.endsWith(e));
  const texto = sinComentarios(readFileSync(camino, 'utf8'), esPantalla);

  for (const [renglon, nombre, como] of parametrosDeUnTexto(texto)) {
    parametros++;
    if (PARAMETROS_DE_LA_DIRECCION.has(nombre)) continue;
    fallas.push(`${archivo}:${renglon}  el parámetro «${nombre}» ${como} y no está ` +
      'declarado en `PARAMETROS_DE_LA_DIRECCION`. Una dirección queda en el ' +
      'historial del navegador, en el «compartir» y en el registro de cualquier ' +
      'intermediario: lo que viaje ahí hay que decidirlo, no descubrirlo');
  }

  const perdonados = REGISTROS_PERDONADOS.get(base)?.valores || [];
  for (const m of texto.matchAll(REGISTRO)) { registros++; void m; }
  for (const [renglon, arg, motivo] of registrosDeUnTexto(texto, perdonados)) {
    fallas.push(`${archivo}:${renglon}  el registro imprime «${arg}», que ${motivo}. ` +
      'Un dato de este producto es el legajo de una persona, y la consola no se ' +
      've en la pantalla, así que nadie lo nota');
  }
}

seRevisaron(parametros, 'ningún parámetro de dirección en el código');
seRevisaron(registros, 'ningún registro de actividades en el código');

if (fallas.length > 0) {
  console.error('Hay datos saliendo por la dirección o por el registro:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(
    '\nLas dos guardan sin que nadie lo pida: la dirección queda en el historial\n' +
    'del navegador y el registro, en la consola de cualquiera que abra la pantalla.\n' +
    'Un parámetro nuevo se declara en `PARAMETROS_DE_LA_DIRECCION`, con el motivo\n' +
    'al lado; un registro lleva un mensaje y, si hubo, el error, y nada más.');
  process.exit(1);
}

console.log(
  `Datos sensibles verificados: ${parametros} parámetros de la barra de direcciones, ` +
  `todos entre los ${PARAMETROS_DE_LA_DIRECCION.size} declarados con su motivo, y ` +
  `${registros} registros de actividades que no imprimen más que su mensaje y su ` +
  `error (1 exento, con su motivo).`);
