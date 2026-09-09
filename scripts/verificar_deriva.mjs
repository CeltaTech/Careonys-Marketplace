/* ===================================================
   VERIFICA QUE LAS CITAS APUNTEN A LO QUE DICEN, NO SÓLO A ALGO

       node scripts/verificar_deriva.mjs             dice cuáles se corrieron
       node scripts/verificar_deriva.mjs --arreglar  les corrige el número

   El hermano de `scripts/verificar_referencias.mjs`, que pregunta otra cosa.
   Aquél comprueba que el renglón citado exista y no esté vacío; o sea que la
   cita apunte **a algo**. Éste comprueba que apunte **a lo que dice**.

   No son la misma pregunta, y la diferencia se midió: el 31 de agosto de 2026,
   con el otro chequeo en verde sobre 332 citas, **81 de las 321 que se pudieron
   reconstruir apuntaban a otro renglón**. Una de cada cuatro. El código crece
   por arriba, la cita se queda quieta, cae sobre un renglón que tiene algo
   escrito —una etiqueta, una llamada, un comentario— y el otro chequeo la da por
   buena. Quien la sigue encuentra código, lee lo que no es, y no tiene manera de
   darse cuenta.

   ---- Cómo lo sabe sin adivinar ----

   Ya se probó dos veces adivinar desde la prosa —exigir que un identificador
   nombrado en la frase estuviera cerca del renglón citado— y las dos veces dio
   tres avisos falsos de cada cinco. Un chequeo que avisa de más se apaga solo.

   Así que acá no se adivina: se le pregunta al historial.

   1. `git blame` dice qué commit escribió el renglón **de la cita**.
   2. `git cat-file` trae el archivo citado **como era en ese commit**.
   3. El texto del renglón citado en esa versión es lo que la cita quiso señalar.
      No hay interpretación: es lo que tenía a la vista quien escribió la cita.
   4. Se busca ese mismo texto en el archivo de hoy.

   Y sólo se avisa del caso sin vuelta: el texto era único entonces, es único
   ahora, y está en otro renglón. Con eso el aviso no puede ser falso, y el
   número nuevo tampoco puede ser una suposición.

   ---- Qué se pone rojo, y qué sólo se cuenta ----

   **Rojo: la cita corrida.** Ahí el guion sabe las dos cosas —qué señalaba y
   dónde está hoy—, así que la arregla él y la cuenta como falla.

   **No rojo: la cita cuyo renglón de entonces ya no está en ninguna parte.**
   Ahí no sabe, y decir que está mal sería inventar. Son dos casos que se ven
   iguales desde acá: el renglón se editó en el lugar y la cita sigue siendo la
   buena —`const CACHE_NAME = 'asistente-v19'` pasó a decir `v28` y no se movió—,
   o el renglón se fue de verdad. Se cuentan y se leen con `--detalle`.

   Lo que hace que eso no sea un agujero: **la versión peligrosa de ese caso la
   agarra el otro chequeo**. Si el renglón se fue y la cita quedó señalando un
   hueco, `verificar_referencias.mjs` se pone rojo por renglón vacío. Lo que
   pasa acá sin rojo es lo que allá también pasa: un renglón con algo escrito.
   Cerrar ese último resto pide que la cita lleve una palabra ancla escrita a
   propósito, que es la decisión abierta del pendiente 88.

   Un rojo que nadie puede poner en verde se termina apagando, y con él se apaga
   el rojo de al lado, que sí servía.

   También se cuentan, sin rojo, los textos repetidos y las citas cuyo renglón
   todavía no se guardó en ningún commit.

   ---- A qué documentos mira ----

   A todos los de `docs/`, sin ninguna excepción. Hubo dos y las dos se cayeron
   el 8 de septiembre de 2026, al borrarse los documentos que las justificaban:
   las **fotos fechadas**, que ya no existen, y los **planes**, eximidos por
   citar el código del día en que se escribieron. De los planes que quedan
   ninguno es una foto: son propuestas todavía sin ejecutar, y sus citas apuntan
   al código de hoy, que es justo lo que esta comprobación cuida. Un plan que se
   ejecuta se borra, y lo que quede vigente se muda al documento que sí vive.

   ---- La prueba de que puede fallar ----

   Antes de mirar nada corre sus propios casos: un renglón que se corrió, uno que
   no se movió, uno que desapareció, uno repetido. Si el detector no los separa,
   se planta y no revisa. Y se planta también si no hay historial, o si terminó
   sin haber podido reconstruir una sola cita: un verde sobre cero citas no dice
   que estén bien, dice que no se miró.
=================================================== */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos } from './recorrido.mjs';
import { citasDe, renglonesDe, AJENOS, AJENAS } from './citas.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arreglar = process.argv.includes('--arreglar');
const detalle = process.argv.includes('--detalle');

/* ---- El detector, solo, sin git ni archivos ---------------------------- */

function contar(filas, texto) {
  let n = 0;
  for (const f of filas) if (f.trim() === texto) n++;
  return n;
}

/** Qué le pasó al renglón `n` entre las dos versiones de un archivo. */
export function aDondeFue(filasAntes, filasAhora, n) {
  const original = (filasAntes[n - 1] || '').trim();
  if (!original) return { estado: 'sin base' };
  if (contar(filasAntes, original) !== 1) return { estado: 'sin base' };
  if ((filasAhora[n - 1] || '').trim() === original) return { estado: 'igual' };
  const donde = [];
  for (let i = 0; i < filasAhora.length; i++) {
    if (filasAhora[i].trim() === original) donde.push(i + 1);
  }
  if (donde.length === 0) return { estado: 'perdida', texto: original };
  if (donde.length > 1) return { estado: 'ambigua', texto: original };
  return { estado: 'corrida', renglon: donde[0], texto: original };
}

/* Una prueba que no puede fallar no prueba nada. */
const ANTES = ['const a = 1;', 'function f() {', '  return a;', '}', '', '  return a;'];
const CASOS = [
  ['se corrió hacia abajo', ANTES, ['nuevo', 'const a = 1;', 'function f() {'], 1, 'corrida', 2],
  ['no se movió', ANTES, ANTES, 1, 'igual'],
  ['ya no está en ninguna parte', ANTES, ['otra cosa', 'y otra'], 1, 'perdida'],
  ['el texto está dos veces hoy', ANTES, ['x', 'const a = 1;', 'const a = 1;'], 1, 'ambigua'],
  ['el texto ya estaba dos veces entonces', ANTES, ANTES, 3, 'sin base'],
  ['el renglón citado estaba en blanco', ANTES, ANTES, 5, 'sin base']
];
for (const [nombre, antes, ahora, n, espera, renglon] of CASOS) {
  const r = aDondeFue(antes, ahora, n);
  if (r.estado !== espera || (renglon !== undefined && r.renglon !== renglon)) {
    console.error('El detector de deriva no separa sus propios casos: ' + nombre);
    console.error('  esperaba ' + espera + (renglon ? ' al ' + renglon : '') +
      ', dio ' + r.estado + (r.renglon ? ' al ' + r.renglon : ''));
    process.exit(1);
  }
}

/* ---- El historial ------------------------------------------------------ */

function git(argumentos, opciones = {}) {
  try {
    return execFileSync('git', argumentos, {
      cwd: raiz, maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'ignore'], ...opciones
    });
  } catch {
    return null;
  }
}

if (git(['rev-parse', '--git-dir'], { encoding: 'utf8' }) === null) {
  console.error('Sin historial no se puede saber qué decía el renglón citado. No se revisó nada.');
  process.exit(1);
}

const VACIO = '0000000000000000000000000000000000000000';

/* Lo que el historial conoce. Una cita puede nombrar un archivo que existe en
   el disco y no en este repositorio —`../../docs/...`, una carpeta hermana—, y
   pedírselo a git no da «no está»: da un error que se lleva puesta la consulta
   entera. Se preguntan sólo los que git tiene. */
const DEL_REPOSITORIO = new Set(
  (git(['ls-files'], { encoding: 'utf8' }) || '').split('\n').filter(Boolean)
);

/** Para cada renglón de un documento, el commit que lo escribió. */
function culpaDe(ruta) {
  const salida = git(['blame', '--line-porcelain', '--', ruta], { encoding: 'utf8' });
  if (salida === null) return null;
  const commits = [];
  for (const linea of salida.split('\n')) {
    const m = linea.match(/^([0-9a-f]{40}) \d+ (\d+)/);
    if (m) commits[Number(m[2])] = m[1];
  }
  return commits;
}

/** Muchos `commit:ruta` de una vez, que uno por uno tarda veinte veces más. */
function traerTodos(claves) {
  const contenidos = new Map();
  if (claves.length === 0) return contenidos;
  const cruda = git(['cat-file', '--batch'], { input: claves.join('\n') + '\n' });
  if (cruda === null) return contenidos;
  let i = 0;
  for (const clave of claves) {
    const corte = cruda.indexOf(10, i);
    if (corte < 0) break;
    const encabezado = cruda.toString('utf8', i, corte);
    i = corte + 1;
    const partes = encabezado.split(' ');
    if (partes.length < 3) { contenidos.set(clave, null); continue; }
    const largo = Number(partes[2]);
    contenidos.set(clave, cruda.toString('utf8', i, i + largo));
    i += largo + 1;
  }
  return contenidos;
}

/* ---- Los documentos ---------------------------------------------------- */

const documentos = hayArchivos(join(raiz, 'docs'), ['.md'], AJENAS)
  .map((a) => relative(raiz, a).split(sep).join('/'));

/* Primera vuelta: juntar todas las citas y qué versión hace falta de cada una. */
const citas = [];
const claves = new Set();

for (const doc of documentos) {
  const texto = readFileSync(join(raiz, doc), 'utf8');
  const commits = culpaDe(doc);
  if (!commits) continue;
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const commit = commits[i + 1];
    if (!commit || commit === VACIO) continue;
    for (const { entera, ruta, sufijo, columna, heredada } of citasDe(lineas[i])) {
      if (AJENOS.has(ruta)) continue;
      if (!DEL_REPOSITORIO.has(ruta) || !existsSync(join(raiz, ruta))) continue;
      const clave = commit + ':' + ruta;
      claves.add(clave);
      citas.push({
        doc, linea: i + 1, columna, entera, ruta, sufijo, clave, heredada,
        renglones: renglonesDe(sufijo)
      });
    }
  }
}

const versiones = traerTodos([...claves]);
const deHoy = new Map();
function hoy(ruta) {
  if (!deHoy.has(ruta)) deHoy.set(ruta, readFileSync(join(raiz, ruta), 'utf8').split('\n'));
  return deHoy.get(ruta);
}

/* Segunda vuelta: comparar. */
const cuenta = { miradas: 0, iguales: 0, corridas: 0, perdidas: 0, ambiguas: 0, sinBase: 0 };
const corridas = [];
const perdidas = [];

for (const cita of citas) {
  const viejo = versiones.get(cita.clave);
  if (viejo === null || viejo === undefined) { cuenta.sinBase += cita.renglones.length; continue; }
  const antes = viejo.split('\n');
  const ahora = hoy(cita.ruta);
  for (const n of cita.renglones) {
    const r = aDondeFue(antes, ahora, n);
    if (r.estado === 'sin base') { cuenta.sinBase++; continue; }
    cuenta.miradas++;
    if (r.estado === 'igual') cuenta.iguales++;
    else if (r.estado === 'ambigua') cuenta.ambiguas++;
    else if (r.estado === 'perdida') { cuenta.perdidas++; perdidas.push({ ...cita, n, ...r }); }
    else { cuenta.corridas++; corridas.push({ ...cita, n, ...r }); }
  }
}

/* Un verde sobre cero citas no dice que estén bien, dice que no se miró. */
if (cuenta.miradas === 0) {
  console.error('No se pudo reconstruir una sola cita. Eso no es un verde: es que no se revisó.');
  process.exit(1);
}

/* ---- Arreglar ---------------------------------------------------------- */

if (arreglar && corridas.length > 0) {
  const aMano = [];
  const porDocumento = new Map();
  for (const c of corridas) {
    if (!/^:\d+$/.test(c.sufijo)) { aMano.push(c); continue; }
    if (!porDocumento.has(c.doc)) porDocumento.set(c.doc, []);
    porDocumento.get(c.doc).push(c);
  }
  for (const [doc, cambios] of porDocumento) {
    const lineas = readFileSync(join(raiz, doc), 'utf8').split('\n');
    cambios.sort((a, b) => b.linea - a.linea || b.columna - a.columna);
    for (const c of cambios) {
      const linea = lineas[c.linea - 1];
      /* La forma corta se corrige corta: escribirle el archivo la alargaría
         sin motivo, y el archivo es el mismo que el de la cita de al lado. */
      const nueva = '`' + (c.heredada ? '' : c.ruta) + ':' + c.renglon + '`';
      lineas[c.linea - 1] =
        linea.slice(0, c.columna) + nueva + linea.slice(c.columna + c.entera.length);
    }
    writeFileSync(join(raiz, doc), lineas.join('\n'));
    console.log('  corregidas ' + cambios.length + ' en ' + doc);
  }
  console.log('');
  console.log('Se corrigieron ' + (corridas.length - aMano.length) + ' citas.');
  if (aMano.length > 0) {
    console.log('Quedan ' + aMano.length + ' que son tramos y se corrigen a mano:');
    for (const c of aMano) console.log('  - ' + c.doc + ':' + c.linea + '  ' + c.entera);
  }
  process.exit(0);
}

/* ---- Contar ------------------------------------------------------------ */

if (corridas.length > 0) {
  console.log('Citas que apuntan a otro renglón (el texto que citaban está en otro lado):');
  console.log('');
  for (const c of corridas) {
    console.log('  - ' + c.doc + ':' + c.linea + '  ' + c.entera + '  ->  :' + c.renglon);
    console.log('    dice: ' + c.texto.slice(0, 90));
  }
  console.log('');
  console.log(cuenta.corridas + ' corridas sobre ' + cuenta.miradas +
    ' renglones citados que se pudieron reconstruir. Se arreglan solas:');
  console.log('');
  console.log('    node scripts/verificar_deriva.mjs --arreglar');
  process.exit(1);
}

if (detalle && perdidas.length > 0) {
  console.log('Citas cuyo renglón de entonces ya no existe en ninguna parte:');
  console.log('');
  for (const c of perdidas) {
    console.log('  - ' + c.doc + ':' + c.linea + '  ' + c.entera);
    console.log('    decía: ' + c.texto.slice(0, 90));
  }
  console.log('');
}

console.log('Citas verificadas contra el historial: ' +
  (cuenta.miradas - cuenta.perdidas) + ' de ' + cuenta.miradas +
  ' renglones citados dicen lo que la cita fue a buscar' +
  (cuenta.perdidas > 0
    ? ', y ' + cuenta.perdidas + ' no se pudieron resolver, que no es lo mismo que mal' +
      (detalle ? '' : ' (--detalle)')
    : '') +
  ' en los ' + documentos.length + ' documentos de docs/, sin ninguno exento.');
process.exit(0);
