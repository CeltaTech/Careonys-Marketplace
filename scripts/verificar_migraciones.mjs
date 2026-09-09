/* ===================================================
   VERIFICA QUE UNA MIGRACIÓN, UNA VEZ ESCRITA, SE QUEDE QUIETA

       node scripts/verificar_migraciones.mjs
       node scripts/verificar_migraciones.mjs --detalle   muestra las de antes

   La regla es de la empresa y está escrita en `celtatech/CLAUDE.md`, en las tres
   primeras líneas numeradas de «La base de datos: sólo por migraciones»:

     1. Una migración aplicada no se edita jamás. Se corrige con otra adelante.
     2. Toda migración corre entera o no corre.
     3. El orden de los archivos es el orden de aplicación, y no se reordena.

   La primera y la tercera no las miraba nadie. Y no se pueden mirar leyendo los
   archivos de hoy: un archivo editado ayer se ve exactamente igual que uno que
   nunca se tocó. **La única fuente que lo sabe es el historial**, así que acá se
   le pregunta a git, igual que hace `scripts/verificar_deriva.mjs`.

   ---- Las cuatro maneras de mover una migración ----

   Son cuatro y las cuatro rompen lo mismo, que es que la base se pueda
   reconstruir corriendo los archivos en orden desde cero:

   - **Editarla** después del commit que la trajo. Quien ya la corrió tiene una
     base distinta de la que arma el archivo de hoy, y nada lo dice.
   - **Borrarla.** Lo mismo, y peor: la base de quien la corrió tiene algo que
     ningún archivo explica.
   - **Renumerarla.** Cambiarle los cuatro dígitos del principio la mueve de
     lugar en el orden de aplicación.
   - **Meter una nueva con un número que ya pasó.** Es la misma reordenación
     vista del otro lado: quien ya corrió hasta el número más alto que había
     nunca va a correr una anterior que apareció después.

   **El tope contra el que se mide un alta no cuenta los archivos que ese mismo
   commit está moviendo**, y sin eso el mismo hecho se cuenta dos veces. Es lo
   que le pasó a la primera medición, que dijo catorce donde hay doce: en dos
   commits el archivo que entraba traía el número del que ese mismo commit
   estaba borrando o renumerando —mismo número, no se mueve nada, y el hueco que
   le hace lugar ya está contado como baja o como renumeración—, así que el alta
   lo contaba de nuevo. Un hecho, un renglón. En cualquier otra forma el tope
   sigue apretando igual: si un commit borra la migración más alta y trae una
   con un número anterior, el tope baja al que quede y la nueva sigue dando
   rojo.

   Las cuatro se miran sobre los commits que tocan `supabase/migrations/`, y de
   cada uno se mira qué le hizo a qué archivo. **Y también sobre lo que todavía
   no es un commit**, que es la parte que importa: este chequeo corre en el gancho
   de antes de cada commit, y ahí el commit no existe. Mirando sólo el historial
   el aviso llegaría un commit tarde —con la migración movida y publicada—, así
   que lo que está cambiado contra `HEAD`, preparado o no, se juzga igual que un
   commit más, con la fecha de hoy. Un renombre que sólo cambia el
   texto de atrás del número no es una reordenación y no se juzga: cambiarle el
   nombre que va detrás —de `vidriera` a `directorio`, por ejemplo— no la mueve
   de lugar.

   ---- Dónde empieza a mirar, y por qué no es un perdón ----

   El 8 de septiembre de 2026 las setenta y cuatro migraciones se juntaron en
   tres archivos que arman exactamente la misma base. El 9, por orden del
   Desarrollador, esos tres y los seis que habían venido detrás se juntaron en
   dos, comprobados contra la base construida de las dos maneras: dos mil ciento
   cuarenta y seis renglones de estructura y treinta y seis de contenido, iguales
   uno por uno. Eso es, visto desde acá, siete bajas y dos ediciones de archivos
   que ya estaban en el historial: varias de las cuatro maneras a la vez.

   **Ese commit es el punto de partida, y todo lo anterior queda del otro lado.**
   No es un perdón, por un motivo que se muerde la cola: la única manera de
   poner en verde lo de antes sería editar las migraciones o reescribir el
   historial, y las dos cosas son justamente lo que esta regla prohíbe. Ya no se
   pueden arreglar, y quien lo intente rompe la regla otra vez.

   **Se lo reconoce por su forma, no por una fecha ni por un hash.** Por la
   fecha no, porque perdonaría todo lo que se haga ese mismo día. Por el hash
   tampoco, porque este chequeo corre en el gancho de antes de cada commit y ahí
   el commit todavía no tiene hash. La forma son tres cosas juntas, y ninguna
   sola alcanza: **deja la carpeta con exactamente los archivos del
   aplastamiento y ninguno más**, **escribe los dos** y **se lleva por delante
   alguna otra migración**. Un commit corriente no tiene ninguna de las tres:
   agrega una migración y deja la carpeta con una más.

   **Y se toma el último que tenga esa forma, no el primero.** Un aplastamiento
   no es un hecho único: ya hubo dos. Si mañana hay otro, el corte se corre solo
   hasta ahí y el anterior queda del otro lado, que es donde corresponde —lo de
   atrás ya no se puede arreglar, y lo de adelante sí—.

   Lo de antes se cuenta igual y se muestra con `--detalle`, para que el número
   no desaparezca. Del 24 y el 25 de agosto de 2026 son doce: diez ediciones, una
   baja y una renumeración. A ésos se les suman las bajas de los dos
   aplastamientos, que caen de este lado del corte por el mismo motivo, así que
   el número que se muestra es más grande que aquellos doce y no quiere decir
   que se haya roto nada nuevo.

   ---- Qué NO mira ----

   - **No sabe si la migración se aplicó de verdad.** Git no lo dice. Trata a
     toda migración que entró al historial como aplicada, que es la suposición
     segura: la base de esta máquina y la publicada se arman con estos archivos.
   - **No mira el contenido de la migración**, ni si el cambio fue grande o una
     coma. Una coma en una migración aplicada ya deja dos bases distintas.
   - **No mira la segunda regla** —que la migración corra entera o no corra—.
     Eso es de `scripts/verificar_esquema.mjs`, que lee los archivos.
   - **Del historial mira lo que git informa como cambio.** Un archivo que se
     borre y se vuelva a crear igual en el mismo commit no aparece.
   - Si no hay historial —una copia del proyecto sin `.git`— **el chequeo falla,
     no pasa**. Un chequeo que se pone verde cuando no puede mirar no verifica
     nada.
=================================================== */

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const detalle = process.argv.includes('--detalle');

const CARPETA = 'supabase/migrations';
const SEPARADOR = String.fromCharCode(1);   /* lo que %x01 deja entre commits */

/* El aplastamiento: el commit que dejó la base entera en estos dos archivos.
   Es el punto de partida, y lo de antes está en el historial y no se puede
   arreglar sin romper la misma regla que lo juzga. */
const EL_APLASTAMIENTO = ['0001_base_del_esquema.sql', '0002_siembra_ficticia.sql'];

/** ¿Este commit es un aplastamiento? Las tres cosas a la vez, y ninguna sola
    alcanza: deja la carpeta con exactamente los archivos de arriba y ninguno
    más, escribe los dos, y se lleva por delante alguna otra migración. */
function esElAplastamiento(commit, quedan) {
  if (quedan.length !== EL_APLASTAMIENTO.length) return false;
  if (!EL_APLASTAMIENTO.every((n) => quedan.includes(n))) return false;
  const escribe = (n) => commit.cambios.some(([estado, ruta]) =>
    (estado === 'A' || estado === 'M') && nombreDe(ruta) === n);
  if (!EL_APLASTAMIENTO.every(escribe)) return false;
  return commit.cambios.some(([estado, ruta]) =>
    estado === 'D' && !EL_APLASTAMIENTO.includes(nombreDe(ruta)));
}

/** El número de aplicación de una migración: los cuatro dígitos del principio. */
const numeroDe = (ruta) => (ruta.split('/').pop() || '').slice(0, 4);
const nombreDe = (ruta) => ruta.split('/').pop() || ruta;

function git(...argumentos) {
  return execFileSync('git', argumentos,
    { cwd: raiz, encoding: 'utf8', maxBuffer: 64e6 });
}

/* ---- El historial, en una sola pregunta -------------------------------- */

let crudo;
try {
  crudo = git('log', '--reverse', '--format=%x01%H %cs %s', '--name-status', '-M',
    '--', CARPETA);
} catch (err) {
  console.error('No se pudo leer el historial de `' + CARPETA + '`, así que este ' +
    'chequeo no puede mirar nada y no se pone verde por no poder: ' + err.message);
  process.exit(1);
}

const commits = [];
for (const bloque of crudo.split(SEPARADOR).slice(1)) {
  const renglones = bloque.split('\n');
  const [hash, fecha, ...titulo] = renglones[0].split(' ');
  commits.push({
    hash, fecha, titulo: titulo.join(' '),
    cambios: renglones.slice(1).filter((l) => /^[A-Z]/.test(l)).map((l) => l.split('\t'))
  });
}

/* Lo que está por entrar: cambiado contra `HEAD`, esté preparado o no, y
   también lo que todavía no conoce git. Se juzga como un commit más. */
function loQueEstaPorEntrar() {
  const cambios = [];
  const campos = git('status', '--porcelain', '-z', '--', CARPETA)
    .split(String.fromCharCode(0));
  for (let i = 0; i < campos.length; i++) {
    const renglon = campos[i];
    if (!renglon) continue;
    const estado = renglon.slice(0, 2);
    const ruta = renglon.slice(3);
    /* Un renombre preparado ocupa **dos** campos: primero el nombre nuevo y
       después el viejo. Hay que consumir el segundo acá mismo; si se lo deja
       para la vuelta siguiente, el nombre viejo se lee como si fuera otro
       cambio y su estado sale de las dos primeras letras del propio nombre. */
    if (estado.includes('R') || estado.includes('C')) {
      const viejo = campos[++i] || '';
      if (ruta.endsWith('.sql')) cambios.push(['R100', viejo, ruta]);
      continue;
    }
    if (!ruta.endsWith('.sql')) continue;
    if (estado.includes('D')) cambios.push(['D', ruta]);
    else if (estado === '??' || estado.includes('A')) cambios.push(['A', ruta]);
    else if (estado.includes('M')) cambios.push(['M', ruta]);
  }
  return cambios;
}

/** Las migraciones que había en el árbol antes de este commit. */
function antesDe(hash) {
  try {
    return git('ls-tree', '-r', '--name-only', hash + '^', '--', CARPETA)
      .split('\n').filter((l) => l.endsWith('.sql'));
  } catch {
    return [];   /* el primer commit del repositorio no tiene padre */
  }
}

const enHead = git('ls-tree', '-r', '--name-only', 'HEAD', '--', CARPETA)
  .split('\n').filter((l) => l.endsWith('.sql'));

/** Los nombres de las migraciones que quedaron después de este commit. Para lo
    que todavía no es un commit, lo que hay hoy en la carpeta. */
function quedanDespuesDe(commit) {
  if (commit.ahora) {
    return readdirSync(join(raiz, CARPETA)).filter((n) => n.endsWith('.sql'));
  }
  return git('ls-tree', '-r', '--name-only', commit.hash, '--', CARPETA)
    .split('\n').filter((l) => l.endsWith('.sql')).map(nombreDe);
}

/* ---- Las cuatro maneras ------------------------------------------------ */

const fallas = [];
const deAntes = [];

/* Un renombre se ve de dos formas según esté preparado o no, y las dos se
   juzgan: preparado con `git mv` git lo informa como renombre, con el nombre
   viejo y el nuevo; sin preparar no lo reconoce como tal y lo informa como una
   baja más un archivo que no conoce, que es lo mismo dicho de otra manera. */
const deVerdad = commits.length;   /* sin contar el commit de mentira de abajo */
const porEntrar = loQueEstaPorEntrar();
if (porEntrar.length) {
  commits.push({
    hash: 'HEAD', fecha: new Date().toISOString().slice(0, 10),
    titulo: 'sin cometer todavía', cambios: porEntrar, ahora: true
  });
}

/* Dónde está el aplastamiento en la fila. Se lo busca por su forma, que es lo
   único que existe tanto en el historial como en lo que todavía no es un
   commit. Y se toma **el último** que la tenga: si mañana se vuelve a aplastar,
   el corte se corre solo hasta ahí y el aplastamiento anterior queda del otro
   lado, que es donde corresponde. */
let dondeAplastó = -1;
for (const [orden, commit] of commits.entries()) {
  if (esElAplastamiento(commit, quedanDespuesDe(commit))) dondeAplastó = orden;
}

for (const [orden, commit] of commits.entries()) {
  const deAntesDelAplastamiento = dondeAplastó >= 0 && orden <= dondeAplastó;
  const tope = (commit.ahora ? enHead : antesDe(commit.hash))
    .filter((r) => !commit.cambios.some(([, a]) => a === r))
    .map(numeroDe).sort().pop() || '';

  for (const [estado, antes, despues] of commit.cambios) {
    let que = null;
    if (estado === 'M') {
      que = 'edita `' + nombreDe(antes) + '`, que ya estaba en el historial';
    } else if (estado === 'D') {
      que = 'borra `' + nombreDe(antes) + '`';
    } else if (estado[0] === 'R' && numeroDe(antes) !== numeroDe(despues)) {
      que = 'le cambia el número a `' + nombreDe(antes) + '`, que pasa a ser `' +
        nombreDe(despues) + '`';
    } else if (estado === 'A' && tope && numeroDe(antes) <= tope) {
      que = 'trae `' + nombreDe(antes) + '` con un número que el árbol ya había ' +
        'pasado: el tope era ' + tope;
    }
    if (!que) continue;

    const donde = commit.hash.slice(0, 7) + '  ' + commit.fecha;
    (deAntesDelAplastamiento ? deAntes : fallas)
      .push(donde + '  ' + que + ' — ' + commit.titulo);
  }
}

/* ---- El resultado ------------------------------------------------------ */

seRevisaron(enHead.length, 'migraciones');
seRevisaron(deVerdad, 'commits que tocan las migraciones');

if (fallas.length) {
  console.error('Migraciones movidas después de haber entrado al historial:\n');
  for (const f of fallas) console.error('  - ' + f);
  console.error('\n' + fallas.length + (fallas.length === 1
    ? ' incumplimiento.' : ' incumplimientos.') +
    ' Una migración que entró al historial no se edita, no se borra y no cambia\n' +
    'de número: quien ya la corrió tiene una base que ningún archivo de hoy\n' +
    'explica. Se corrige con otra adelante, que es la única forma que deja a la\n' +
    'base reconstruible corriendo los archivos en orden desde cero.\n' +
    'Y una migración nueva lleva siempre un número más alto que todos: meter una\n' +
    'con un número que ya pasó es la misma reordenación vista del otro lado.');
  process.exit(1);
}

if (detalle && deAntes.length) {
  console.log('De antes del aplastamiento, cuando las migraciones eran setenta y ' +
    'cuatro y la base todavía se rehacía desde cero:\n');
  for (const f of deAntes) console.log('  · ' + f);
  console.log('');
}

console.log('Migraciones verificadas: las ' + enHead.length + ' se quedaron ' +
  'quietas desde que entraron al historial, en los ' + deVerdad + ' commits ' +
  'que tocan `' + CARPETA + '/` y en lo que está por entrar — ninguna editada, '
  + 'borrada ni renumerada, y ninguna ' +
  'nueva con un número que el árbol ya había pasado (' + deAntes.length + ' de antes ' +
  'del aplastamiento, que ya no se pueden arreglar sin romper la misma ' +
  'regla: --detalle).');
process.exit(0);
