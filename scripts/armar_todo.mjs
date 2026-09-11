/* ===================================================
   ARMA LOS TRES PAQUETES EN UN SOLO SITIO

       node scripts/armar_todo.mjs

   Careonys publica sus tres partes por separado. Acá se publica **un solo
   sitio**, y eso no es una preferencia: los dos programas para el teléfono
   están instalados en teléfonos de verdad, en dos direcciones fijas que cuelgan
   del mismo dominio que la web. Moverlos a otro lado dejaría afuera a todo el
   que ya los tiene instalados.

   Así que los tres se arman por separado, como en Careonys, y los tres caen
   adentro de la misma carpeta de salida: la web en la raíz, y cada programa del
   teléfono adentro de la carpeta con la que se instaló.

   **El orden no es casual.** La web se arma primero porque vacía la carpeta de
   salida entera; si se armara después borraría a los otros dos.

   **Y lo que no arma ninguno de los tres se copia acá.** Las imágenes, los
   catálogos y los tres documentos legales no pasan por la herramienta de
   armado: son archivos que el navegador pide por su dirección, tal cual, y esa
   dirección tiene que seguir siendo la misma. Este archivo es el único lugar
   donde está escrito qué se publica y qué no.

   **Los catálogos van dos veces a propósito.** Cada programa del teléfono
   guarda una copia para trabajar sin señal, y lo guardado sólo alcanza su
   propia carpeta: un catálogo que viviera únicamente en la raíz existiría
   mientras hay señal y desaparecería justo cuando no la hay. Es la misma razón
   por la que esas copias existen en el repositorio, y `verificar_copias.mjs` es
   quien vigila que no se separen.

   Al final se comprueba lo armado contra lo que cada programa del teléfono dice
   que guarda. Guardar es todo o nada: un solo archivo que falte tira abajo la
   copia sin conexión entera, y eso se descubre recién cuando alguien se queda
   sin señal.
=================================================== */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { RAIZ } from './carpetas_compartidas.mjs';
import { pedidosEscritos } from './lo_que_guarda_el_telefono.mjs';

const { Identidad } = createRequire(import.meta.url)(join(RAIZ, 'js', 'identidad.js'));

const SALIDA = join(RAIZ, 'dist');

/* Los tres paquetes, en el orden en que se arman. Cada uno sabe solo a dónde
   deja lo suyo; acá sólo se nombra cuál va primero y por qué. */
const PAQUETES = ['web', 'pwa-asistente', 'pwa-familia'];

/* Lo que el navegador pide por su dirección y no pasa por el armado. Cada
   renglón es de dónde sale y a dónde va, contado desde la raíz y desde la
   carpeta de salida. */
const COPIAS = [
  ['assets', 'assets'],
  ['data', 'data'],
  ['pwa-asistente/data', 'pwa-asistente/data'],
  ['pwa-familia/data', 'pwa-familia/data'],
  ['docs/terminos_y_condiciones_asistentes.md', 'docs/terminos_y_condiciones_asistentes.md'],
  ['docs/terminos_y_condiciones_familias.md', 'docs/terminos_y_condiciones_familias.md'],
  ['docs/politica_de_datos.md', 'docs/politica_de_datos.md']
];

/* Se llama al armador con el mismo Node que corre esto, y no al `npm` de la
   máquina: así no hay que saber si acá se llama `npm` o `npm.cmd`, y nada de lo
   que se pasa atraviesa un intérprete de línea de comandos. */
function armar(paquete) {
  const carpeta = join(RAIZ, paquete);
  const armador = join(carpeta, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(armador)) {
    console.error('Falta la herramienta de armado de `' + paquete + '`.');
    console.error('Se instalan las dependencias de los tres paquetes antes de armar.');
    process.exit(1);
  }
  console.log('\n── ' + paquete + ' ──');
  execFileSync(process.execPath, [armador, 'build'], {
    cwd: carpeta, stdio: 'inherit', shell: false
  });
}

/* Se copia entero lo que es una carpeta y tal cual lo que es un archivo. La
   carpeta de destino se crea si no está, porque el armado de la web vacía la
   salida antes de escribir la suya. */
function copiar(desde, hacia) {
  const origen = join(RAIZ, ...desde.split('/'));
  const destino = join(SALIDA, ...hacia.split('/'));
  if (!existsSync(origen)) {
    console.error('No está `' + desde + '`, que este armado publica.');
    process.exit(1);
  }
  mkdirSync(join(destino, '..'), { recursive: true });
  cpSync(origen, destino, { recursive: true });
}

/* ── LA MARCA, RESUELTA ANTES DE ENTREGAR ────────────────────────
   Los tres armazones nombran al producto con un marcador y no con su nombre,
   para que la marca viva en un solo lugar. En el navegador eso se resuelve solo
   al arrancar. Un buscador, en cambio, no ejecuta nada: lee lo que el servidor
   le entregó, y lo que le entregaría es el marcador crudo en el nombre de la
   pestaña y en la descripción —que es justo lo que el sitio dejó de hacer el día
   que se resolvieron las páginas sueltas—.

   Así que se resuelve acá, con el mismo `js/identidad.js` que usa el navegador,
   y no con el nombre copiado a mano: la marca sigue viviendo en un solo lugar.
   Lo que se resuelve después, cuando se sabe qué Prestadora es, sigue igual: eso
   lo hace el navegador y ningún buscador lo ve. */
function resolverLaMarca() {
  for (const armazon of [['index.html'], ['pwa-asistente', 'index.html'],
                         ['pwa-familia', 'index.html']]) {
    const camino = join(SALIDA, ...armazon);
    const texto = readFileSync(camino, 'utf8');
    const resuelto = Identidad.aplicar(texto);
    if (resuelto !== texto) writeFileSync(camino, resuelto, 'utf8');
  }
}

/* ── LO QUE TIENE QUE HABER QUEDADO ──────────────────────────────────────
   Cada programa del teléfono nombra con todas las letras lo que guarda para
   trabajar sin señal, y guardar es todo o nada. Así que lo armado se compara
   contra esa lista: lo que la herramienta armó ella sola está garantizado, y lo
   que se copió acá es justamente lo que puede faltar. */
function comprobar() {
  const faltan = [];

  for (const paquete of PAQUETES.slice(1)) {
    const fuente = join(RAIZ, paquete, 'src', 'service-worker.js');
    for (const pedido of pedidosEscritos(readFileSync(fuente, 'utf8'))) {
      const camino = join(SALIDA, paquete, ...pedido.split('/'));
      if (!existsSync(camino)) faltan.push(paquete + '/' + pedido);
    }
  }

  /* Y la web, que no guarda nada pero es la que abre el sitio. */
  for (const suelto of ['index.html', 'assets/images', 'data/catalogo-frases.json']) {
    if (!existsSync(join(SALIDA, ...suelto.split('/')))) faltan.push(suelto);
  }

  if (faltan.length > 0) {
    console.error('\nLo armado no tiene todo lo que el sitio va a pedir:');
    for (const falta of faltan) console.error('  - ' + falta);
    console.error('\nUn solo archivo que falte tira abajo la copia sin conexión entera,');
    console.error('y eso se descubre recién cuando alguien se queda sin señal.');
    process.exit(1);
  }
}

rmSync(SALIDA, { recursive: true, force: true });
for (const paquete of PAQUETES) armar(paquete);
for (const [desde, hacia] of COPIAS) copiar(desde, hacia);
resolverLaMarca();
comprobar();

console.log(
  '\nSitio armado: ' + PAQUETES.length + ' paquetes y ' + COPIAS.length +
  ' copias en una sola salida, con las direcciones de siempre.');
