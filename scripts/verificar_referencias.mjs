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

   ---- Lo que este chequeo no ve, y quién lo ve ----

   Una cita que se corrió a otro renglón **con contenido** pasa igual: acá el
   guion no sabe de qué habla la frase. Atrapa el caso ruidoso —el código crece
   por arriba y la cita cae en el hueco entre dos funciones—, no todos.

   **Y ese resto no es chico.** El 31 de agosto de 2026 se midió: de 321 citas
   que se pudieron reconstruir, 81 apuntaban a otro renglón con este chequeo en
   verde. Una de cada cuatro. El verde de acá dice «apunta a algo» y se lee
   «apunta a lo que dice», que no es lo mismo.

   Lo que falta lo mira `scripts/verificar_deriva.mjs`, que no adivina de qué
   habla la frase: le pregunta al historial qué decía el renglón citado el día
   que se escribió la cita, y busca ese texto en el archivo de hoy. Se había
   probado antes adivinando —exigir que un identificador nombrado en la misma
   frase estuviera cerca del renglón citado— y daba tres avisos falsos de cada
   cinco, así que se descartó: un chequeo que avisa de más se termina apagando,
   y entonces no verifica nada.

   ---- Qué es una cita ----

   La forma de una cita y la lista de documentos eximidos viven en
   `scripts/citas.mjs`, porque las comparten los dos chequeos.

   ---- Qué documentos mira ----

   Los que describen el presente. Los que son **una foto fechada** están en
   `FOTOS` con su motivo: un plan escrito antes de tocar código cita el código de
   ese día a propósito, y corregirle los renglones sería falsear lo que decía.
=================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos } from './recorrido.mjs';
import {
  citasDe, SIN_CONTENIDO, renglonesDe,
  FOTOS, AJENOS, DE_OTRO_REPOSITORIO, AJENAS
} from './citas.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Los problemas de las citas de un documento, cada uno con su renglón. */
export function citasRotas(texto, leer, existe) {
  const problemas = [];
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    for (const { entera, ruta, sufijo } of citasDe(lineas[i])) {
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
  ['un tramo con el final corrido', 'Ver `x.js:2-4`.'],
  ['la forma corta, que hereda el archivo de la de al lado', 'Ver `x.js:1` y `:5`.']
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

for (const camino of hayArchivos(join(raiz, 'docs'), ['.md'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  if (FOTOS.has(nombre)) continue;
  revisados++;
  const texto = readFileSync(camino, 'utf8');
  for (const linea of texto.split(String.fromCharCode(10))) citas += citasDe(linea).length;
  // Al documento que habla de otro repositorio se le calla una sola cosa: que el
  // archivo no esté acá. Un renglón equivocado de un archivo que sí está le
  // sigue fallando igual.
  const deOtro = DE_OTRO_REPOSITORIO.has(nombre);
  for (const [renglon, cita, motivo] of citasRotas(texto, leer, existe)) {
    if (deOtro && /ese archivo no existe/.test(motivo)) continue;
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
    'propósito, va a FOTOS de `scripts/citas.mjs`, con el motivo escrito.');
  process.exit(1);
}

console.log(
  `Citas verificadas: ${citas} con renglón en ${revisados} documentos, todas apuntando a algo ` +
  `(${FOTOS.size} exentos por ser una foto fechada, ${DE_OTRO_REPOSITORIO.size} por hablar de otro repositorio).`);
