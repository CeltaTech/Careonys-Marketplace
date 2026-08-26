/* ===================================================
   VERIFICA QUE LAS CITAS DE LA DOCUMENTACIÓN APUNTEN DONDE DICEN

       node scripts/verificar_referencias.mjs

   La regla de la empresa «documentación verificable» pide que toda afirmación sobre
   una decisión ya tomada cite
   **archivo y renglón exacto**, «verificable en segundos». Una cita así vale
   exactamente mientras el renglón siga estando donde estaba: el archivo crece
   por arriba, la cita se queda quieta y termina señalando una llave de cierre.
   Entonces el que la sigue no encuentra nada, deja de confiar en las otras y la
   regla se convierte en adorno.

   El 25 de agosto de 2026 había 94 citas con renglón y 26 apuntaban a la nada:
   `js/main.js:199` era una llave sola, `formulario-integral.html:191` un
   `</div>`, `directorio.html:528` estaba fuera del archivo —tiene 330 renglones—
   y cuatro nombraban archivos que ya no existen con ese nombre.

   ---- Las tres cosas que se exigen ----

   1. Que el archivo citado exista.
   2. Que tenga ese renglón.
   3. Que en ese renglón haya algo. Una llave sola, una etiqueta que cierra, el
      fin de un comentario o un renglón en blanco no son una cita: son el rastro
      de una que se corrió.

   ---- Lo que este chequeo no puede ver ----

   Una cita que se corrió a otro renglón **con contenido** pasa igual: el guion
   no sabe de qué habla la frase. Atrapa el caso ruidoso, que es el más común
   —el código crece por arriba y la cita cae en el hueco entre dos funciones—,
   no todos. Se probó además exigir que un identificador nombrado en la misma
   frase estuviera cerca del renglón citado: sobre las citas de hoy daba tres
   avisos falsos de cada cinco, así que se descartó. Un chequeo que avisa de más
   se termina apagando, y entonces no verifica nada.

   ---- Qué documentos mira ----

   Los que describen el presente. Los que son **una foto fechada** están en
   `FOTOS` con su motivo: un plan escrito antes de tocar código cita el código de
   ese día a propósito, y corregirle los renglones sería falsear lo que decía.
=================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { archivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Documentos que son una foto de un día y no el estado de hoy. Sus citas
   apuntan al código de esa fecha: están bien como están. */
const FOTOS = new Map([
  ['docs/INVENTARIO.md',
   'lo dice en su renglón 7: es una foto del 22 de agosto de 2026, no el estado de hoy'],
  ['docs/PLAN_ACCESO.md',
   'es el inventario y el plan previos a tocar código del 24 de agosto de 2026, y sus citas ' +
   'muestran los cinco problemas que había ese día — todos arreglados desde entonces'],
  ['docs/PLAN_PRESTADORA.md',
   'es un plan a la espera de aprobación (pendiente 11): cita el código sobre el que se escribió']
]);

/* Archivos que no viven en este repositorio y por eso no se pueden abrir. */
const AJENOS = new Map([
  ['supabase/migrations/20260820190000_el_canal_del_asistente_se_elige_y_se_respeta.sql',
   'es una migración de Careonys, que tiene su propio repositorio y no se toca desde acá ' +
   '(regla de los productos Careonys: «Careonys no se toca desde el Marketplace»). ' +
   'La cita queda porque de ahí sale la frase que se transcribe']
]);

/* Carpetas de trabajo de quien desarrolla: no son documentación del proyecto. */
const AJENAS = ['Nueva carpeta'];

/* Una cita: `ruta.ext:123`, `ruta.ext:123-140` o `ruta.ext:12:34`. El acento
   invertido de los dos lados es parte de la cita: sin él, `README.md:1` adentro
   de una frase corriente no es una referencia sino una casualidad. */
const CITA = /`([A-Za-z0-9_./-]+\.(?:html|js|mjs|json|md|sql|css|toml|sh|yml))((?::\d+)+(?:-\d+)?)`/g;

/* Renglones que no son una cita, son el rastro de una que se corrió: vacío,
   sólo signos de cierre, una etiqueta que cierra, o el fin de un comentario. */
const SIN_CONTENIDO = /^(?:[)}\];,>{]*|<\/[A-Za-z][\w-]*>|-->|\*\/)$/;

/** Los renglones que nombra una cita, sin repetir. */
function renglonesDe(sufijo) {
  return [...new Set(sufijo.match(/\d+/g).map(Number))];
}

/** Los problemas de las citas de un documento, cada uno con su renglón. */
export function citasRotas(texto, leer, existe) {
  const problemas = [];
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    for (const cita of lineas[i].matchAll(CITA)) {
      const [entera, ruta, sufijo] = cita;
      if (AJENOS.has(ruta)) continue;
      if (!existe(ruta)) {
        problemas.push([i + 1, entera, 'ese archivo no existe.']);
        continue;
      }
      const contenido = leer(ruta).split('\n');
      for (const n of renglonesDe(sufijo)) {
        if (n > contenido.length) {
          problemas.push([i + 1, entera,
            `el archivo tiene ${contenido.length} renglones, así que el ${n} no existe.`]);
        } else if (SIN_CONTENIDO.test(contenido[n - 1].trim())) {
          const visto = contenido[n - 1].trim() || '(en blanco)';
          problemas.push([i + 1, entera,
            `en el renglón ${n} no hay nada que citar: ${visto}`]);
        }
      }
    }
  }
  return problemas;
}

/* Una prueba que no puede fallar no prueba nada. */
const FALSO = {
  'x.js': 'const a = 1;\nfunction f() {\n  return a;\n}\n',
  'y.html': '<div>\n  <p>Hola</p>\n</div>\n'
};
const leerFalso = (r) => FALSO[r];
const existeFalso = (r) => Object.prototype.hasOwnProperty.call(FALSO, r);

const MAL = [
  ['archivo que no existe', 'Ver `z.js:1`.'],
  ['renglón fuera del archivo', 'Ver `x.js:99`.'],
  ['renglón que es una llave sola', 'Ver `x.js:4`.'],
  ['renglón que es una etiqueta de cierre', 'Ver `y.html:3`.'],
  ['renglón en blanco', 'Ver `x.js:5`.'],
  ['un tramo con el final corrido', 'Ver `x.js:2-4`.']
];
const BIEN = [
  ['una cita que apunta a algo', 'Ver `x.js:3`.'],
  ['un tramo entero con contenido', 'Ver `x.js:2-3`.'],
  ['una ruta sin renglón no es una cita', 'Ver `x.js` y `z.js`.'],
  ['un archivo ajeno declarado', 'Ver `supabase/migrations/20260820190000_el_canal_del_asistente_se_elige_y_se_respeta.sql:11`.'],
  ['una ruta suelta, sin acentos invertidos', 'Ver x.js:99 en el texto corrido.']
];

const noDetecta = MAL.filter(([, t]) => citasRotas(t, leerFalso, existeFalso).length === 0);
const sePasa = BIEN.filter(([, t]) => citasRotas(t, leerFalso, existeFalso).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const leer = (ruta) => readFileSync(join(raiz, ruta.split('/').join(sep)), 'utf8');
const existe = (ruta) => existsSync(join(raiz, ruta.split('/').join(sep)));

const fallas = [];
let revisados = 0;
let citas = 0;

for (const camino of archivos(join(raiz, 'docs'), ['.md'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (FOTOS.has(nombre)) continue;
  revisados++;
  const texto = readFileSync(camino, 'utf8');
  citas += [...texto.matchAll(CITA)].length;
  for (const [renglon, cita, motivo] of citasRotas(texto, leer, existe)) {
    fallas.push(`${nombre}:${renglon}  ${cita}\n  ${motivo}`);
  }
}

if (fallas.length > 0) {
  console.error('Citas que ya no apuntan donde dicen:\n');
  for (const falla of fallas) console.error('  - ' + falla + '\n');
  const plural = fallas.length === 1 ? 'cita' : 'citas';
  console.error(
    `${fallas.length} ${plural}. Una cita con renglón vale mientras el renglón siga ahí:\n` +
    'se busca a qué apuntaba y se corrige el número, o se saca el número si ya no hace falta.\n' +
    'Si el documento es una foto de un día y sus citas apuntan al código de esa fecha a\n' +
    'propósito, va a FOTOS de este mismo archivo, con el motivo escrito.');
  process.exit(1);
}

console.log(
  `Citas verificadas: ${citas} con renglón en ${revisados} documentos, todas apuntando a algo ` +
  `(${FOTOS.size} documentos exentos por ser una foto fechada).`);
