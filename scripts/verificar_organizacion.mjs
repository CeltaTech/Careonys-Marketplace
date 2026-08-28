/* ===================================================
   VERIFICA QUE NINGUNA PANTALLA NOMBRE A UNA PRESTADORA

       node scripts/verificar_organizacion.mjs

   Cada pantalla de este producto se muestra con el nombre y el logotipo de la
   Prestadora que se esté mirando, y cuál es se sabe recién al cargar: sale de la
   dirección —`?t=` o subdominio— y se busca en la base. Escribir el nombre de
   una Prestadora adentro de una pantalla la deja bien para esa sola: cualquier
   otra ve un cartel con el nombre de una empresa que no es la suya.

   Y no es una hipótesis. Medido el 26 de agosto de 2026, la Prestadora de
   ejemplo estaba escrita a mano **70 veces en dieciocho archivos**: en nueve
   títulos de pantalla, en dos descripciones para los buscadores, en cinco
   avisos de derechos reservados, en el texto que dice de quién es la
   responsabilidad de un aval, y en veinte rutas del archivo del logotipo. De
   todo eso, lo único que el guion de marca alcanzaba a corregir al cargar eran
   los nombres y los logotipos que colgaban de un encabezado o de un pie; el
   título de la pantalla, la descripción y los textos corridos no los tocaba
   nadie, así que se publicaban con el nombre de la Prestadora de ejemplo para
   todo el mundo.

   CÓMO SE ESCRIBE AHORA. La pantalla dice dónde va el nombre con el marcador
   `{{organizacion}}`, y `js/identidad.js` lo resuelve dos veces: primero con el
   nombre del producto —que es lo correcto mientras no se sepa qué Prestadora
   es— y después con el de la Prestadora, cuando llega. El logotipo se escribe
   una sola vez, el del producto, y el guion de marca lo cambia por el de la
   Prestadora que tenga uno propio.

   QUÉ MIRA ESTE CHEQUEO. Dos cosas, y las dos con su punto único de verdad:

     1. **Ningún nombre ni nombre corto de Prestadora aparece escrito** en el
        marcado, en los guiones ni en los estilos. La lista de Prestadoras no
        está escrita acá: sale de `supabase/migrations/`, que es donde se cargan
        las de ejemplo, y se leen tanto las altas como los cambios de nombre
        posteriores. Sin lo segundo, el nombre con el que hoy se ve una
        Prestadora renombrada sería el único que ninguna pantalla tendría
        prohibido escribir.
     2. **La única ruta de logotipo que se escribe es la que declara
        `js/identidad.js`.** Cualquier otra es el logotipo de alguien en
        particular puesto como respaldo de todos.

   QUÉ NO MIRA. Las migraciones, que son las que cargan esas filas y tienen que
   nombrarlas; los documentos de `docs/`, que cuentan lo que pasó; y esta misma
   carpeta. Tampoco mira si el marcador está donde tiene que estar: que una
   pantalla no nombre a nadie no prueba que nombre a la Prestadora correcta.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { hayArchivos } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRACIONES = join(raiz, 'supabase', 'migrations');
const IDENTIDAD = join(raiz, 'js', 'identidad.js');

/** Lo que declara `js/identidad.js`: la ruta del logotipo y el código del producto. */
function loQueDeclaraIdentidad() {
  const texto = readFileSync(IDENTIDAD, 'utf8');
  const ruta = texto.match(/logotipo:\s*'([^']+)'/);
  const codigo = texto.match(/codigo:\s*'([^']+)'/);
  if (!ruta || !codigo) {
    throw new Error('js/identidad.js dejó de declarar `logotipo` o `codigo`.');
  }
  return { logotipo: ruta[1], codigo: codigo[1] };
}

/** Las Prestadoras que las migraciones cargan con nombre escrito.
 *
 *  Se miran las altas y **también los cambios de nombre**. Una Prestadora
 *  renombrada por una migración posterior tiene dos nombres, y el segundo no
 *  está en ningún alta: si acá se leyeran sólo las altas, el nombre con el que
 *  hoy se la ve sería justamente el único que ninguna pantalla tendría prohibido
 *  escribir. */
function prestadorasDelSeed(codigoDelProducto) {
  const nombres = new Map(); // nombre → archivo de la migración que lo escribe
  const cortos = new Set();  // los nombres cortos, que son una Prestadora cada uno
  for (const archivo of readdirSync(MIGRACIONES).sort()) {
    if (!archivo.endsWith('.sql')) continue;
    const texto = readFileSync(join(MIGRACIONES, archivo), 'utf8');

    const desde = texto.toLowerCase().indexOf('into public.tenants');
    if (desde !== -1) {
      const bloque = texto.slice(desde, texto.indexOf(';', desde));
      for (const fila of bloque.matchAll(/\(\s*'([^']+)'\s*,\s*\n?\s*'([^']+)'/g)) {
        const [, slug, nombre] = fila;
        if (slug === codigoDelProducto) continue;
        cortos.add(slug);
        nombres.set(slug, archivo);
        nombres.set(nombre, archivo);
      }
    }

    for (const cambio of texto.matchAll(/update\s+public\.tenants([\s\S]*?);/gi)) {
      const nombre = cambio[1].match(/\bname\s*=\s*'([^']+)'/i);
      const slug = cambio[1].match(/\bslug\s*=\s*'([^']+)'/i);
      if (!nombre || !slug || slug[1] === codigoDelProducto) continue;
      cortos.add(slug[1]);
      nombres.set(slug[1], archivo);
      nombres.set(nombre[1], archivo);
    }
  }
  return { nombres, cuantas: cortos.size };
}

/** Los problemas, vacío si ninguna pantalla nombra a una Prestadora. */
export function verificarOrganizacion() {
  const { logotipo, codigo } = loQueDeclaraIdentidad();
  const { nombres: prestadoras, cuantas } = prestadorasDelSeed(codigo);
  if (cuantas === 0) {
    throw new Error('Ninguna migración carga una Prestadora con nombre: sin eso este chequeo no prueba nada.');
  }

  /* Se buscan de la más larga a la más corta para que «Cuidar Norte» no lo
     denuncie dos veces quien además tenga un nombre corto contenido adentro. */
  const buscadas = [...prestadoras.keys()].sort((a, b) => b.length - a.length);
  const nombrada = [];
  const logotipos = [];

  const mirados = hayArchivos(raiz, ['.html', '.js', '.css'], ['docs', 'supabase', 'scripts']);
  for (const camino of mirados) {
    const relativa = camino.slice(raiz.length + 1).split(sep).join('/');
    readFileSync(camino, 'utf8').split('\n').forEach((renglon, i) => {
      const numero = i + 1;
      const abajo = renglon.toLowerCase();

      for (const quien of buscadas) {
        if (abajo.includes(quien.toLowerCase())) {
          nombrada.push(`      ${relativa}:${numero}  nombra a «${quien}» (la carga ${prestadoras.get(quien)})`);
          break;
        }
      }

      for (const x of renglon.matchAll(/assets\/images\/[A-Za-z0-9_.-]*logo[A-Za-z0-9_.-]*/gi)) {
        if (x[0] !== logotipo) {
          logotipos.push(`      ${relativa}:${numero}  escribe «${x[0]}» y no «${logotipo}»`);
        }
      }
    });
  }

  const problemas = [];
  if (nombrada.length) {
    problemas.push(
      'Pantallas que nombran a una Prestadora en vez de decir dónde va el nombre:\n' +
      nombrada.join('\n') +
      '\n\n  El nombre de la Prestadora se escribe `{{organizacion}}`, y `js/identidad.js` lo\n' +
      '  resuelve al cargar: con el del producto mientras no se sepa cuál es, y con el de\n' +
      '  la Prestadora en cuanto llega.'
    );
  }
  if (logotipos.length) {
    problemas.push(
      'Rutas de logotipo que no son la que declara `js/identidad.js`:\n' +
      logotipos.join('\n') +
      '\n\n  El logotipo que se escribe es siempre el del producto. El de cada Prestadora lo\n' +
      '  pone `_applyBranding` al cargar, desde su columna `logo_url`.'
    );
  }

  return { problemas, prestadoras: cuantas, archivos: mirados.length, logotipo };
}

// Solo corre cuando se lo llama a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { problemas, prestadoras, archivos: cuantos, logotipo } = verificarOrganizacion();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log(
    `Organización verificada: ${cuantos} archivos sin nombrar a ninguna de las ` +
    `${prestadoras} Prestadoras del seed, y con «${logotipo}» como único logotipo escrito.`
  );
}
