/* ===================================================
   QUÉ ES UNA CITA, Y CUÁLES NO SE CORRIGEN

   No es un chequeo: es lo que dos chequeos comparten.

   `verificar_referencias.mjs` pregunta si la cita apunta **a algo**;
   `verificar_deriva.mjs` pregunta si apunta **a lo que dice**. Son preguntas
   distintas y hacen falta las dos, pero la forma de una cita y la lista de
   documentos eximidos tienen que ser una sola: el día que se exima a uno, se
   exime acá y los dos chequeos lo respetan. Escrita dos veces, el segundo se
   entera tarde.

   Vive aparte y no adentro de uno de los dos porque un chequeo, al importarlo,
   correría entero.
=================================================== */

import { basename, relative, sep } from 'node:path';

import { archivos, esTexto, seRevisaron } from './recorrido.mjs';

/* Una cita: `ruta.ext:123`, `ruta.ext:123-140` o `ruta.ext:12:34`. El acento
   invertido de los dos lados es parte de la cita: sin él, `README.md:1` adentro
   de una frase corriente no es una referencia sino una casualidad. */
export const CITA = /`([A-Za-z0-9_./-]+\.(?:html|js|mjs|json|md|sql|css|toml|sh|yml))((?::\d+)+(?:-\d+)?)`/g;

/* La forma corta. Cuando una frase nombra dos renglones del mismo archivo
   escribe `pantalla.html:393` y `:407`: el segundo hereda el nombre del
   primero. Escrito así se lee mejor, y durante días no lo revisó nadie —ni
   este chequeo ni el de la deriva—, porque sin nombre de archivo no casaba
   con `CITA`. Eran 22 el 31 de agosto de 2026. */
const CITA_CORTA = /`((?::\d+)+(?:-\d+)?)`/g;

/** Todas las citas de un renglón, en orden, con la forma corta resuelta. */
export function citasDe(linea) {
  const enteras = [];
  for (const m of linea.matchAll(CITA)) {
    enteras.push({ entera: m[0], ruta: m[1], sufijo: m[2], columna: m.index, heredada: false });
  }
  const todas = [...enteras];
  for (const m of linea.matchAll(CITA_CORTA)) {
    /* De quién hereda: de la última cita entera que quedó a su izquierda. Si no
       hay ninguna, no es una cita, es otra cosa entre acentos graves. */
    let duena = null;
    for (const c of enteras) if (c.columna < m.index) duena = c;
    if (!duena) continue;
    todas.push({
      entera: m[0], ruta: duena.ruta, sufijo: m[1], columna: m.index, heredada: true
    });
  }
  return todas.sort((a, b) => a.columna - b.columna);
}

/* Renglones que no son una cita, son el rastro de una que se corrió: vacío,
   sólo signos de cierre, una etiqueta que cierra, o el fin de un comentario. */
export const SIN_CONTENIDO = /^(?:[)}\];,>{]*|<\/[A-Za-z][\w-]*>|-->|\*\/)$/;

/** Los renglones que nombra una cita, sin repetir. */
export function renglonesDe(sufijo) {
  return [...new Set(sufijo.match(/\d+/g).map(Number))];
}

/* Archivos que no viven en este repositorio y por eso no se pueden abrir. */
export const AJENOS = new Map([
  ['supabase/migrations/20260820190000_el_canal_del_asistente_se_elige_y_se_respeta.sql',
   'es una migración de Careonys, que tiene su propio repositorio y no se toca desde acá ' +
   '(regla de los productos Careonys: «Careonys no se toca desde el Marketplace»). ' +
   'La cita queda porque de ahí sale la frase que se transcribe']
]);

/* Documentos que hablan de otro repositorio. Sus citas a archivos que acá no
   existen no están rotas: apuntan a código que vive en otro lado y no se toca
   desde acá. **Lo que sí se les sigue comprobando son sus citas a este
   repositorio**, que son las que se despegan solas cuando alguien mueve un
   renglón. Eximir el documento entero convertiría el permiso en un agujero. */
export const DE_OTRO_REPOSITORIO = new Map([
  ['docs/APORTES_A_CAREONYS.md',
   'compara lo que hay acá con lo que hay en Careonys, que tiene su propio repositorio']
]);

/* Y por dónde empieza una ruta de afuera. Sin esto, el permiso de arriba
   perdonaba **cualquier** archivo que no estuviera, incluido uno de este
   repositorio que alguien acabara de borrar: al documento le alcanzaba con
   decir «hablo de otro repositorio» para que se le callara todo. Ahora se le
   calla sólo lo que empieza por una de estas carpetas, que son las de los
   repositorios hermanos. La barra final va a propósito: sin ella,
   `careonys_viejo/` entraría igual. */
export const PREFIJOS_DE_AFUERA = ['careonys/', 'celtatech/'];

/* ---- DÓNDE SE BUSCAN LAS CITAS ----

   En todo el proyecto, y no sólo en `docs/`. La regla de la empresa
   —«documentación verificable»— no nombra una carpeta: habla de toda afirmación
   sobre una decisión ya tomada. Y la mitad de lo que este proyecto explica de sí
   mismo no vive en `docs/`: vive en el encabezado de cada guion, de cada
   pantalla y de cada módulo, que es donde lo lee quien va a tocar esa pieza.
   Mirando sólo `docs/` quedaban noventa y cinco citas sin revisar, y treinta de
   ellas ya apuntaban a la nada, justamente adentro de los archivos que explican
   cómo funciona el producto: un encabezado señalaba el renglón 647 de la
   migración del esquema y ahí no había nada escrito.

   Se recorre desde la raíz, y por eso una carpeta nueva entra sola. Una lista de
   carpetas escrita acá sabría sólo de las que había el día que se la escribió.

   Y por eso acá tampoco hay lista de formas de archivo. Una cita se escribe en
   cualquier cosa que alguien lea: el comentario de un programa, el renglón de un
   documento, el motivo escrito adentro de un catálogo, la nota al lado de una
   línea de `.gitignore`. Se abre todo lo que no sea una imagen ni un archivo
   binario, que es la misma regla con la que el recorrido decide qué es texto.
   Escrita a mano eran seis formas, y dejaban afuera la puerta que da de alta y de
   baja a las personas, los catálogos y el `.gitignore` —dos citas de verdad que
   no miraba nadie—. */

/* Y lo único que queda afuera del recorrido, con su motivo escrito. */
export const NO_SE_RECORREN = new Map([
  ['migrations',
   'una migración aplicada no se edita jamás, se corrige con otra adelante: una cita ' +
   'suya que se corrió no se puede arreglar, y exigirla sería pedir lo que la regla ' +
   'de la base prohíbe']
]);

/** Todos los archivos del proyecto donde puede haber una cita, desde la raíz. */
export function documentosConCitas(raiz) {
  const encontrados = archivos(raiz, [''], [...NO_SE_RECORREN.keys()])
    .filter((camino) => esTexto(basename(camino)))
    .map((camino) => relative(raiz, camino).split(sep).join('/'));
  seRevisaron(encontrados.length, 'ni un archivo de texto donde pueda haber una cita');
  return encontrados;
}

/* Rutas inventadas. No nombran ningún archivo y no hay adónde apunten: existen
   para mostrar la forma de una cita, o para probar que el detector la reconoce.
   Un banco de pruebas sin ellas no probaría nada, y son las únicas citas del
   proyecto que tienen que quedar sin apuntar a nada.

   Se exime la ruta y no el archivo que la escribe: adentro del mismo guion, una
   cita a un archivo de verdad se sigue comprobando entera. */
export const INVENTADOS = new Map([
  ['x.js', 'el archivo de mentira contra el que se prueban los detectores de citas'],
  ['y.html', 'el mismo, para la etiqueta que cierra'],
  ['z.js', 'el que nunca existe, para probar que una cita a un archivo ausente falla'],
  ['afuera/x.js',
   'el de mentira de un repositorio hermano, para probar que el perdón de lo de ' +
   'afuera perdona sólo lo de afuera'],
  ['archivo.sql', 'el nombre genérico con que un mensaje de error muestra la forma de una cita'],
  ['archivo.mjs', 'el mismo, para un tramo de renglones'],
  ['pantalla.html',
   'el nombre genérico con que se explica la forma corta, la que hereda el archivo ' +
   'de la cita de al lado']
]);
