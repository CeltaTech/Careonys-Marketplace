/* ===================================================
   LAS CAJAS FUERTES SIGUEN CERRADAS

   La regla que manda está en `F:\proyectos\CLAUDE.md` y no admite matices: una
   carpeta que anuncia que guarda claves no se abre, no se lista y no se cita,
   ni para verificar algo. Los chequeos de este proyecto recorren carpetas
   leyendo archivos, así que la regla también les habla a ellos, y quien la hace
   cumplir por todos es `nuncaSeAbre()` en `scripts/recorrido.mjs`.

   Este chequeo existe porque **antes esa función comparaba el nombre exacto**, y
   así alcanzaba justo para las cinco carpetas que existían el día que se escribió
   la lista. Una llamada `no-commit` o `NoCommit` —el mismo pedido, otra
   tipografía— se habría recorrido entera.

   El 31 de agosto de 2026 apareció que la regla estaba escrita **en dos lugares
   y con dos contenidos distintos**: `scripts/inventario_textos.mjs` cerraba
   además las carpetas `Exclusivo <cliente>` y los archivos que anuncian una
   clave en el nombre, y `scripts/recorrido.mjs` —que es el que usan los otros
   veintisiete chequeos— no. La regla de la bóveda nombra las dos cosas. Se
   juntaron en `recorrido.mjs`, y las dos se prueban acá.

   Y se prueban de las dos puntas, porque cerrar de más también es una falla:
   `nueva-clave.html` es la pantalla donde alguien cambia su contraseña, no un
   lugar donde haya una guardada, y tomarla por caja fuerte sacaría del recorrido
   a los siete archivos de código que hoy nombran la palabra «clave», sin que nadie
   se entere.

   CÓMO SE PRUEBA, Y POR QUÉ ASÍ
   No se mira el proyecto: se arma un árbol de mentira en la carpeta temporal del
   sistema, con un archivo adentro de cada nombre de caja fuerte y uno afuera, y
   se le pide a `archivos()` que lo recorra. Tiene que devolver **el de afuera y
   nada más**.

   Es a propósito que la prueba fabrique las carpetas en vez de buscarlas: acá no
   hay ninguna caja fuerte, así que un chequeo que sólo mirara este proyecto
   pasaría siempre y no probaría nada. El de afuera está por la misma razón al
   revés: sin él, una función que devolviera siempre la lista vacía también
   pasaría.
=================================================== */

import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, basename, dirname } from 'node:path';
import { archivos, nuncaSeAbre } from './recorrido.mjs';

const proyecto = join(dirname(fileURLToPath(import.meta.url)), '..');

// Las formas en que una misma caja fuerte puede aparecer escrita. Ninguna de
// éstas existe en el proyecto: son las que podrían aparecer mañana.
const CERRADAS = [
  'No commit', 'no_commit', 'no-commit', 'NoCommit', 'nocommit', 'NO COMMIT',
  'NO HACER COMMIT', 'no hacer commit', 'NoHacerCommit', 'no_hacer_commit',
  'no pushear', 'no_pushear', 'NoPushear',
  'no subir', 'NoSubir',
  'ReferenciaNoHacerCommit', 'referencia no hacer commit',
  'Exclusivo Sendler', 'exclusivo-sendler', 'ExclusivoSendler', 'Exclusivo',
  'contraseñas', 'credenciales', 'secretos'
];

// Archivos, no carpetas: el nombre anuncia que adentro hay una clave y ninguno
// es código del proyecto. Se preguntan sin disco, porque acá lo que importa es
// el nombre y no dónde esté.
const ARCHIVOS_CERRADOS = [
  'claves.txt', 'credenciales.env', 'passwords.csv', 'contraseñas.md',
  'secret.pem', 'CLAVES Y CONTRASEÑAS.txt'
];

// Y la otra punta: código del proyecto que nombra la palabra sin guardar nada.
// Si alguno de éstos se cerrara, el recorrido perdería archivos de verdad y este
// chequeo tiene que agarrarlo.
//
// **Van con su ruta, y se comprueba que la ruta exista.** `nuncaSeAbre()` contesta
// por el nombre y no por el disco, así que un nombre inventado pasa esta prueba
// igual que uno de verdad, y una lista de nombres inventados sería una prueba que
// no puede fallar. Ya pasó: hasta que las setenta y cuatro migraciones se
// aplastaron en tres, acá figuraba `0010_claves_de_catalogo_en_la_siembra.sql`,
// que dejó de existir sin que nada se pusiera rojo, y durante días este chequeo
// dijo que cuidaba un archivo que no estaba.
const CODIGO_QUE_SE_ABRE = [
  'nueva-clave.html',
  'recuperar-clave.html',
  'js/clave.js',
  'scripts/verificar_claves.mjs',
  'supabase/migrations/0002_siembra_ficticia.sql'
];

// Y las formas que todavía no existen en el proyecto pero podrían aparecer mañana.
// Van aparte justamente porque de éstas no se puede pedir que estén en el disco: si
// se mezclaran con las de arriba, la comprobación de existencia habría que aflojarla
// para todas, y volveríamos a no tener ninguna.
const CODIGO_QUE_SE_ABRIRIA = ['clave.jsx', 'claves.json'];

// Y las que sí se abren, para que la comparación no sea de una sola punta. Si
// alguna de éstas quedara afuera, el chequeo tendría que fallar igual: una regla
// que cierra de más deja de revisar código de verdad, y no avisa.
const ABIERTAS = ['js', 'docs', 'data', 'compilado', 'comisiones', 'pushear-ahora'];

const raiz = join(tmpdir(), 'careonys-prueba-cajas');
rmSync(raiz, { recursive: true, force: true });

const fallas = [];

try {
  mkdirSync(raiz, { recursive: true });
  writeFileSync(join(raiz, 'afuera.js'), '// este sí se tiene que ver\n');

  for (const nombre of [...CERRADAS, ...ABIERTAS]) {
    mkdirSync(join(raiz, nombre), { recursive: true });
    writeFileSync(join(raiz, nombre, 'adentro.js'), '// contenido de mentira\n');
  }

  const vistos = archivos(raiz, ['.js']).map((c) => basename(join(c, '..')));

  for (const nombre of CERRADAS) {
    if (vistos.includes(nombre)) {
      fallas.push('se abrió una caja fuerte escrita «' + nombre + '»');
    }
  }
  for (const nombre of ABIERTAS) {
    if (!vistos.includes(nombre)) {
      fallas.push('se saltearon los archivos de «' + nombre + '», que no es una caja fuerte');
    }
  }
  if (!archivos(raiz, ['.js']).some((c) => c.endsWith('afuera.js'))) {
    fallas.push('no se vio el archivo de la raíz: el recorrido no devolvió nada');
  }

  // La misma pregunta hecha directo, sin pasar por el disco, y ésta es la que
  // de verdad prueba las diecisiete formas. Windows no distingue mayúsculas en
  // los nombres de carpeta, así que `No commit` y `NO COMMIT` terminan siendo
  // **la misma carpeta**: la prueba de arriba no puede separarlas y da por
  // buenas varias que nunca miró. Acá no hay disco de por medio, así que sí.
  // Van además tres formas que ningún sistema de archivos deja crear.
  for (const nombre of [...CERRADAS, 'No Commit ', ' no_commit', 'NO-PUSHEAR']) {
    if (!nuncaSeAbre(nombre)) fallas.push('«' + nombre + '» no se reconoció como caja fuerte');
  }
  for (const nombre of ABIERTAS) {
    if (nuncaSeAbre(nombre)) fallas.push('«' + nombre + '» se tomó por caja fuerte y no lo es');
  }
  for (const nombre of ARCHIVOS_CERRADOS) {
    if (!nuncaSeAbre(nombre)) {
      fallas.push('«' + nombre + '» anuncia una clave en el nombre y se abrió igual');
    }
  }
  /* La ruta se comprueba antes que el nombre. Un renglón de esta lista que ya no
     apunta a ningún archivo no denuncia nada y no avisa de que dejó de denunciar:
     es la mitad del chequeo que se apaga sola. */
  for (const ruta of CODIGO_QUE_SE_ABRE) {
    if (!existsSync(join(proyecto, ruta))) {
      fallas.push('«' + ruta + '» ya no existe: este renglón dice cuidar un archivo ' +
        'que no está, y una prueba sobre un nombre inventado pasa siempre');
    }
    if (nuncaSeAbre(basename(ruta))) {
      fallas.push('«' + ruta + '» es código del proyecto y se lo tomó por caja fuerte');
    }
  }
  for (const nombre of CODIGO_QUE_SE_ABRIRIA) {
    if (nuncaSeAbre(nombre)) {
      fallas.push('«' + nombre + '» sería código del proyecto y se lo tomó por caja fuerte');
    }
  }
} finally {
  rmSync(raiz, { recursive: true, force: true });
}

if (fallas.length) {
  console.error('Cajas fuertes: el recorrido no las respeta.\n');
  for (const falla of fallas) console.error('  · ' + falla);
  console.error('\nSe arregla en `nuncaSeAbre()`, en `scripts/recorrido.mjs`.');
  process.exit(1);
}

console.log(
  'Cajas fuertes verificadas: ' + CERRADAS.length + ' formas de nombrar una carpeta y ' +
  ARCHIVOS_CERRADOS.length + ' de nombrar un archivo, todas cerradas; y ' +
  (ABIERTAS.length + CODIGO_QUE_SE_ABRE.length + CODIGO_QUE_SE_ABRIRIA.length) +
  ' nombres parecidos que sí se recorren (' + CODIGO_QUE_SE_ABRE.length +
  ' de ellos, archivos que están de verdad en el disco), ' +
  'para que la regla no cierre de más.'
);
