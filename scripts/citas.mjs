/* ===================================================
   QUÉ ES UNA CITA, Y CUÁLES NO SE CORRIGEN

   No es un chequeo: es lo que dos chequeos comparten.

   `verificar_referencias.mjs` pregunta si la cita apunta **a algo**;
   `verificar_deriva.mjs` pregunta si apunta **a lo que dice**. Son preguntas
   distintas y hacen falta las dos, pero la forma de una cita y la lista de
   documentos eximidos tienen que ser una sola: el día que se agregue una foto
   fechada, se agrega acá y los dos chequeos la respetan. Escrita dos veces, el
   segundo se entera tarde.

   Vive aparte y no adentro de uno de los dos porque un chequeo, al importarlo,
   correría entero.
=================================================== */

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

/* Documentos que son una foto de un día y no el estado de hoy. Sus citas
   apuntan al código de esa fecha: están bien como están. */
export const FOTOS = new Map([
  ['docs/INVENTARIO.md',
   'lo dice en su renglón 7: es una foto del 22 de agosto de 2026, no el estado de hoy'],
  ['docs/PLAN_ACCESO.md',
   'es el inventario y el plan previos a tocar código del 24 de agosto de 2026, y sus citas ' +
   'muestran los cinco problemas que había ese día — todos arreglados desde entonces']
]);

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

/* Carpetas de trabajo de quien desarrolla: no son documentación del proyecto. */
export const AJENAS = ['Nueva carpeta'];
