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

      Y las pantallas no piden la barra de direcciones de una sola manera: una
      página suelta se la arma, y una pantalla de un programa se la pide a las
      rutas. Las dos cuentan, porque la regla es sobre lo que termina escrito
      en el historial y no sobre cómo se lo pidió. Mirar una sola dejaría la
      regla vigilando la mitad del producto que ya no se escribe.
   2. **Todo lo que un registro imprime es un mensaje o un error.** «Mensaje»
      es el texto escrito ahí mismo; «error» es lo que se atrapó en un
      `catch`. Cualquier otra cosa es un dato, y un dato de este producto es el
      legajo de una persona: se planta hasta que alguien lo declare en
      `REGISTROS_PERDONADOS`, con el motivo escrito al lado.

      Y un dato no deja de ser un dato porque tenga un texto al lado. Son tres
      maneras de escribir lo mismo y se juzgan igual: suelto, `console.log(x)`;
      pegado con una suma, `console.log('Equis: ' + x)`; o metido adentro de un
      `${}`. Preguntar si el argumento «lleva un texto adentro» dejaba pasar
      las dos últimas, que son la misma filtración escrita cuatro caracteres
      más larga. Por el mismo motivo se miran las dos ramas de un `?:` y las
      dos de un `||`: se imprime la que toque. Y tampoco pasa un
      `JSON.stringify()`, que es la forma corta de imprimir una fila entera.

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
   éste, dicho entero y una por una, porque decirlo a medias ya se comió a dos
   chequeos hermanos: una dirección se arma y un registro del navegador se
   escribe donde vive una pantalla o su guion, y no en otro lado.

   - `docs` y `data`: texto y catálogos, que no arman direcciones ni escriben
     registros.
   - `assets`: dibujos e imágenes.
   - `scripts`: son herramientas de esta máquina; lo que imprimen lo lee quien
     las corre, no el navegador de nadie.
   - `supabase`: es el servidor. **Y ahí el detalle crudo del error va a
     propósito**: la regla de la empresa dice que el cliente recibe un mensaje
     entendible y el detalle queda en el registro del servidor. Meter esa
     carpeta adentro no taparía ningún agujero: pondría en rojo justamente lo
     que la regla manda escribir. La otra mitad de esa misma regla —que ese
     detalle se quede en el registro y no viaje adentro de la respuesta— la
     mira `scripts/verificar_escapado.mjs`, que sí abre esa carpeta. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets'];

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
/* La clase de la alarma se imprime en dos archivos y es el mismo caso en los
   dos: está escrita una vez acá y se registra abajo con los dos nombres. La
   franja de alarmas es una sola y la comparten los dos programas del teléfono;
   el otro nombre es el de las páginas sueltas, que siguen publicadas hasta que
   se las reemplace. */
const LA_CLASE_DE_LA_ALARMA = {
  valores: ['fila.clase'],
  motivo: 'es la clase de una alarma —`jornada_abierta` o `salida_sin_entrada`—, ' +
    'que es un valor fijo que escribe la propia `mis_alarmas()` ' +
    '(`supabase/migrations/0001_base_del_esquema.sql:1633` y `:1648`) y no ' +
    'un dato de ninguna persona. Se imprime cuando la base manda una clase que ' +
    'la pantalla todavía no sabe nombrar, y sin verla el aviso no sirve para ' +
    'agregarle la frase que le falta'
};

const EL_ATRIBUTO_CRUDO = {
  valores: ['escrito'],
  motivo: 'es el texto crudo del atributo `data-huecos` cuando no es un JSON ' +
    'válido. Lo escribe quien programa el marcado, no una persona que usa el ' +
    'producto, y sin verlo el aviso no sirve para arreglarlo'
};

/* Los tres motivos que siguen aparecen en varios archivos, así que se escriben
   una vez. Todos son valores que ya se imprimían pegados adentro del mensaje,
   donde la regla no los miraba; al mirarlos, hubo que decidirlos uno por uno. */
const NOMBRA_UNA_PIEZA = (valores) => ({
  valores,
  motivo: 'nombra una pieza del producto y no un dato de ninguna persona: una ' +
    'clave del catálogo, un vocabulario, el nombre de una tabla o de una ' +
    'columna, un `uuid` o el número de orden de un archivo. Sin verlo el aviso ' +
    'no sirve para arreglar aquello de lo que avisa'
});

const EL_MENSAJE_LO_TRAE_QUIEN_LLAMA = (valores) => ({
  valores,
  motivo: 'es el mensaje mismo, que en este caso no está escrito ahí sino que lo ' +
    'trae quien llama —qué se estaba intentando, o qué parte de la pantalla ' +
    'falló—. Es texto de quien programa, y una función que sirve a varias ' +
    'pantallas no puede tenerlo escrito adentro'
});

const NO_SALE_DE_NINGUNA_FILA = {
  valores: ['sinClave', 'new Error().stack'],
  motivo: 'no sale de ninguna fila de la base: uno es el sí o el no que elige ' +
    'cuál de los dos mensajes escritos se imprime, y la pila dice por qué ' +
    'funciones se llegó hasta acá, que es lo único que permite encontrar quién ' +
    'pidió la frase que falta'
};

/* Qué valores se le perdonan a cada archivo, por su nombre a secas. Un archivo
   puede tener más de un motivo, así que cada nombre lleva una lista. */
const REGISTROS_PERDONADOS = new Map([
  ['index', [LA_CLASE_DE_LA_ALARMA]],
  ['FranjaDeAlarmas', [LA_CLASE_DE_LA_ALARMA]],
  ['apiClient', [NOMBRA_UNA_PIEZA([
    'aviso.id', 'table', "perdidas.map((c) => '«' + c + '»').join(', ')"])]],
  ['catalogo', [
    EL_ATRIBUTO_CRUDO,
    NO_SALE_DE_NINGUNA_FILA,
    NOMBRA_UNA_PIEZA(['cual', 'clave', 'valor', 'vocabulario',
      "solo.filter((c) => !lista.some((i) => i.clave === c)).join(', ')"]),
    EL_MENSAJE_LO_TRAE_QUIEN_LLAMA(['quien'])
  ]],
  ['documentos-legajo', [NOMBRA_UNA_PIEZA(['doc.clave'])]],
  ['fichas-legajo', [NOMBRA_UNA_PIEZA(['clave', 'i'])]],
  ['texto', [EL_MENSAJE_LO_TRAE_QUIEN_LLAMA(['queSeIntentaba'])]],
  ['Inicio', [NOMBRA_UNA_PIEZA(["faltan.join(', ')"])]],
  ['SolicitarAsistente', [NOMBRA_UNA_PIEZA(['cual',
    "cuales.filter((c) => !lista.some((i) => i.clave === c)).join(', ')"])]]
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
/* Quién se guarda la barra de direcciones con un nombre. Son dos formas y son
   las dos que hay: una página suelta se la arma, y una pantalla de un programa
   se la pide a las rutas, que se la entregan adentro de una lista. Sabiendo
   una sola, los parámetros que leen las pantallas portadas no los cuenta
   nadie, y la regla —que un parámetro nuevo se plante hasta que alguien lo
   declare— deja de regir justo donde se escribe hoy. */
const NOMBRA_LA_BARRA = [
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+URLSearchParams/g,
  /(?:const|let|var)\s*\[\s*([A-Za-z_$][\w$]*)[^\]]*\]\s*=\s*useSearchParams\s*\(/g
];

const REGISTRO = /console\.(?:log|info|warn|debug|error)\s*\(/g;
/* Lo que se atrapa en un `catch`, con cualquiera de los nombres que este
   proyecto le pone, y su `.message`. */
const ES_ERROR = /^(?:e|[\w$]*(?:err|error)[\w$]*)(?:\.message)?$/i;
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
  for (const forma of NOMBRA_LA_BARRA) {
    for (const v of texto.matchAll(forma)) {
      const pide = new RegExp(String.raw`\b` + v[1] + String.raw`\s*\.get\s*\(\s*['"]([A-Za-z_][\w-]*)['"]`, 'g');
      for (const m of texto.matchAll(pide)) {
        salida.push([renglonDe(texto, m.index), m[1], 'se lee de la dirección']);
      }
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

/* Los valores que imprime un argumento, sin contar el texto escrito ahí mismo.
   Las tres maneras de imprimir un dato son la misma y tienen que juzgarse
   igual: suelto, pegado con una suma a un texto, o metido adentro de un
   `${}`. Se blanquea cada texto escrito —dejando el argumento del mismo
   largo, para poder recortar después el original y no una reconstrucción—, se
   sacan aparte las expresiones de adentro de los `${}`, y lo que queda se
   corta por lo que pega y por lo que elige. */
function valoresDeUnArgumento(arg) {
  const valores = [];
  const resto = arg.split('');
  const blanquear = (desde, hasta) => { for (let k = desde; k < hasta; k++) resto[k] = ' '; };
  let i = 0;
  while (i < arg.length) {
    const c = arg[i];
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < arg.length && !(arg[j] === c && arg.charCodeAt(j - 1) !== BARRA)) j++;
      blanquear(i, Math.min(j + 1, arg.length)); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1;
      while (j < arg.length) {
        if (arg[j] === '`' && arg.charCodeAt(j - 1) !== BARRA) break;
        if (arg[j] === '$' && arg[j + 1] === '{' && arg.charCodeAt(j - 1) !== BARRA) {
          let prof = 1, k = j + 2;
          while (k < arg.length && prof > 0) {
            if (arg[k] === '{') prof++; else if (arg[k] === '}') prof--;
            k++;
          }
          const dentro = arg.slice(j + 2, k - 1).trim();
          if (dentro) valores.push(dentro);
          j = k; continue;
        }
        j++;
      }
      blanquear(i, Math.min(j + 1, arg.length)); i = j + 1; continue;
    }
    i++;
  }
  for (const [desde, hasta] of pedazosDe(resto)) {
    if (!resto.slice(desde, hasta).join('').trim()) continue;
    const pedazo = arg.slice(desde, hasta).replace(/\s+/g, ' ').trim();
    if (pedazo.startsWith('(') && pedazo.endsWith(')')
      && resto.slice(desde, hasta).join('').trim().startsWith('(')) {
      valores.push(...valoresDeUnArgumento(pedazo.slice(1, -1)));
      continue;
    }
    valores.push(pedazo);
  }
  return [...new Set(valores)];
}

/* Por dónde se corta un argumento ya blanqueado: por lo que pega —una suma
   pega un valor a un texto— y por lo que elige —un `?:` o un `||` imprimen la
   rama que toque, así que las dos ramas son valores—. No cortan ni el `?.` ni
   el `??`, que no eligen entre dos cosas que se impriman. */
function pedazosDe(resto) {
  const pedazos = []; let prof = 0, desde = 0;
  for (let k = 0; k < resto.length; k++) {
    const c = resto[k];
    if ('([{'.includes(c)) prof++;
    if (')]}'.includes(c)) prof--;
    if (prof !== 0) continue;
    let largo = 0;
    if (c === '+' || c === ':') largo = 1;
    else if (c === '|' && resto[k + 1] === '|') largo = 2;
    else if (c === '?' && resto[k + 1] !== '.' && resto[k + 1] !== '?' && resto[k - 1] !== '?') largo = 1;
    if (!largo) continue;
    pedazos.push([desde, k]); desde = k + largo; k += largo - 1;
  }
  pedazos.push([desde, resto.length]);
  return pedazos;
}

/** Los registros de un texto: `[renglón, lo que imprime]` de los que no son mensaje. */
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
      if (ES_ERROR.test(arg) || perdonados.includes(arg)) continue;
      const sobran = valoresDeUnArgumento(arg)
        .filter((v) => !ES_ERROR.test(v) && !perdonados.includes(v));
      if (!sobran.length) continue;
      salida.push([renglon, sobran.join('», «'), sobran.length > 1
        ? 'no son ni mensajes ni errores, así que son datos'
        : 'no es ni un mensaje ni un error, así que es un dato']);
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
  ['el mismo, leído por una pantalla de un programa, que se la pide a las rutas',
   "const [parametros] = useSearchParams();\n" +
   "const dni = parametros.get('dni');\n"],
  ['un registro con un dato suelto',
   'console.log(legajo);\n'],
  ['un registro con el dato disfrazado de mensaje',
   "console.error('Legajo:', legajo);\n"],
  ['el mismo dato, pegado adentro del mensaje con una suma',
   "console.error('Legajo: ' + legajo);\n"],
  ['el mismo dato, metido adentro del mensaje con un `${}`',
   'console.error(`Legajo: ${persona.legajo}`);\n'],
  ['el mismo dato, adentro de una de las dos ramas de un `?:`',
   "console.error(hay ? 'Legajo: ' + legajo : 'Sin legajo');\n"],
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
  ['un registro con el error de la biblioteca',
   "console.error('Catálogo:', error.message);\n"],
  ['el mismo, con el error metido adentro del mensaje',
   'console.error(`Catálogo: ${error.message}`);\n'],
  ['un registro que sólo suma dos textos escritos',
   "console.error('Catálogo' + ': no está cargado.');\n"],
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

  const perdonados = (REGISTROS_PERDONADOS.get(base) || []).flatMap((c) => c.valores);
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

/* Cuántos registros quedan exentos y por cuántos motivos distintos. El
   número sale de la lista y no escrito a mano: escrito a mano se despega de
   ella sin que nadie lo note, y un cartel que miente es peor que no tenerlo. */
const conMotivo = [...REGISTROS_PERDONADOS.values()].flat();
const exentos = conMotivo.reduce((suma, cual) => suma + cual.valores.length, 0);
const motivos = new Set(conMotivo.map((cual) => cual.motivo)).size;

console.log(
  `Datos sensibles verificados: ${parametros} parámetros de la barra de direcciones, ` +
  `todos entre los ${PARAMETROS_DE_LA_DIRECCION.size} declarados con su motivo, y ` +
  `${registros} registros de actividades que no imprimen más que su mensaje y su ` +
  `error (${exentos} exentos, por ${motivos} motivos escritos).`);
