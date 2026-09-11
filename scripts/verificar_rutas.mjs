/* ===================================================
   VERIFICA QUE TODA DIRECCIÓN LOCAL LLEGUE A ALGÚN LADO EN EL SITIO PUBLICADO

       node scripts/verificar_rutas.mjs

   Una pantalla que pide `js/auth.js`, una hoja que pide una tipografía, un
   manifiesto que pide su ícono. Son cuatrocientas y pico, y de cada una hay que
   saber dos cosas que **acá siempre dan que sí y publicadas pueden dar que no**:

   1. **Que el archivo esté escrito con esas mismas letras.** Esta máquina es
      Windows y el sitio se sirve desde Linux. Windows contesta que sí cuando se
      le pide `js/Auth.js` y el archivo es `js/auth.js`; Linux contesta 404. Así
      que la caja de las letras es lo único de una dirección que **no se puede
      probar abriendo la pantalla en esta máquina**: anda siempre. Quien lee el
      disco por este chequeo es `conLaMismaCaja()`, en `scripts/recorrido.mjs`,
      que compara tramo por tramo contra el listado de cada carpeta.

   2. **Que el archivo se publique.** Desde el 31 de agosto de 2026 el sitio ya
      no sube el repositorio entero: `.vercelignore` deja afuera `docs/`,
      `scripts/`, `supabase/` y las cajas fuertes. Un archivo que está acá y no
      allá se lee igual de bien en el navegador de esta máquina y da 404 en el
      sitio. Hoy hay cinco pantallas que enlazan documentos de `docs/` —los dos
      textos legales—, y siguen andando porque alguien se acordó de escribir las
      dos líneas con `!` que los vuelven a incluir. Si el día de mañana se
      agrega un tercero y nadie se acuerda, esto avisa.

   Es la regla de la empresa «compatibilidad multiplataforma obligatoria» en el
   único lugar donde el sistema operativo la tapa solo, y la de «terminar la
   tarea incluye comprobar que la publicación salió bien» hecha antes del push.

   Lo que encontró al escribirse: `verificar_sinconexion.mjs` comprobaba con
   `existsSync` los archivos que guarda cada service worker. Con `'./js/Auth.js'`
   puesto a mano en la lista de `pwa-familia`, **los treinta y tres chequeos
   pasaron en verde** —y `cache.addAll()` es todo o nada, así que la copia sin
   conexión de esa aplicación no se habría instalado entera—. Su propio mensaje
   dice «es todo o nada». Ahora los dos leen el disco con la misma función.

   Qué NO mira:
   - Las direcciones que se arman al vuelo (`src="${…}"`): no se pueden juzgar
     leyendo, porque el nombre no está escrito en ningún lado. Se cuentan aparte
     y el número sale en el mensaje, para que no desaparezcan en silencio.
   - Las que salen del proyecto: `https:`, `//`, `data:`, `mailto:`, `#`.
   - Si el archivo al que apunta es **el que corresponde**. Sólo que esté.
   - La caja de las letras de la carpeta donde vive el proyecto: se compara
     desde la raíz para abajo, así que da igual dónde esté clonado.
   - Las reescrituras de `vercel.json`: hoy no hay ninguna, y `cleanUrls` sólo
     agrega un destino, nunca saca uno.
=================================================== */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import {
  hayArchivos, seRevisaron, conLaMismaCaja, esArmazon, EXTENSIONES_DE_PANTALLA, ARMAZONES
} from './recorrido.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* Los manifiestos de las dos aplicaciones de teléfono se nombran por el archivo
   entero y no por la extensión: `.json` a secas traería los catálogos de datos y
   la configuración de las herramientas, que no tienen direcciones adentro. */
const DE_DONDE_SALEN = [...EXTENSIONES_DE_PANTALLA, '.css', '.webmanifest', 'manifest.json'];

/* Dónde se escribe una dirección local. El marcado, la hoja de estilos y el
   manifiesto, que son las tres formas que este proyecto usa. */
const DIRECCIONES = [
  /* La mirada de atrás es lo que separa `src=` de `data-attr-src=`, que no es
     una dirección sino el nombre del campo del que sale el dato. */
  /(?<![-\w])(?:src|href)\s*=\s*"([^"]+)"/gi,
  /(?<![-\w])(?:src|href)\s*=\s*'([^']+)'/gi,
  /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
  /"src"\s*:\s*"([^"]+)"/gi,
];

const SALE_DEL_PROYECTO = /^(https?:|\/\/|data:|blob:|mailto:|tel:|javascript:|#)/i;
const SE_ARMA_AL_VUELO = (ref) => ref.includes('${') || ref.includes('{{');

/* ── QUÉ NO SE PUBLICA ────────────────────────────────────────────────────
   `.vercelignore` se lee como lo lee git: gana la última regla que coincide, y
   la que empieza con `!` vuelve a incluir. Se entienden cuatro formas, que son
   las que el archivo usa hoy. **Ante una forma desconocida se corta**: un
   comodín que este lector no sabe leer haría pasar por publicado algo que no lo
   está, que es justo el error que este chequeo viene a encontrar. */
export function leerLoQueNoSePublica(texto) {
  const reglas = [];
  for (const crudo of texto.split('\n')) {
    const renglon = crudo.trim();
    if (!renglon || renglon.startsWith('#')) continue;
    const niega = renglon.startsWith('!');
    const patron = (niega ? renglon.slice(1) : renglon).trim();
    if (/[?\[\]]/.test(patron) || patron.includes('**') || /\*[^/]|[^/]\*$/.test(patron)) {
      throw new Error(
        `\`.vercelignore\` tiene una forma que este lector no sabe leer: «${renglon}».\n` +
        'Se corta a propósito en vez de seguir: un comodín mal entendido daría por\n' +
        'publicado un archivo que no se publica, que es el error que este chequeo busca.\n' +
        'Se agrega la forma nueva en `leerLoQueNoSePublica()`, con su caso en el banco.');
    }
    reglas.push({ niega, patron });
  }
  return reglas;
}

/** ¿`camino` —relativo a la raíz, con barras— cae adentro de esa regla? */
function alcanza(patron, camino) {
  const tramos = camino.split('/');
  if (patron.endsWith('/*')) {
    const base = patron.slice(0, -2);
    return camino.startsWith(base + '/');
  }
  const base = patron.endsWith('/') ? patron.slice(0, -1) : patron;
  /* Sin barra adentro, el nombre vale a cualquier altura: `CLAUDE.md` deja
     afuera también a `algo/CLAUDE.md`, y `scripts/` a cualquier `scripts`. */
  if (!base.includes('/')) return tramos.includes(base);
  return camino === base || camino.startsWith(base + '/');
}

export function sePublica(reglas, camino) {
  let afuera = false;
  for (const { niega, patron } of reglas) {
    if (alcanza(patron, camino)) afuera = !niega;
  }
  return !afuera;
}

/* ── EL BANCO DE PRUEBAS ──────────────────────────────────────────────────
   Una prueba que no puede fallar no prueba nada, y acá hay dos cosas que
   probar: que el lector del disco distinga la caja de las letras —que es lo
   único que este chequeo sabe y el sistema operativo no— y que el lector de
   `.vercelignore` conteste lo que contestaría el servidor.

   El banco del disco se prueba contra **este mismo archivo**, así que no puede
   quedar viejo por un renombre: si este archivo no está, no hay chequeo. */
const yo = fileURLToPath(import.meta.url);
const conOtraCaja = join(dirname(yo), 'VERIFICAR_RUTAS.MJS');
const queNoEsta = join(dirname(yo), 'verificar_rutas_que_no_existe.mjs');
const delDisco = [
  ['el archivo tal cual está escrito', conLaMismaCaja(raiz, yo), true],
  ['el mismo con la caja cambiada', typeof conLaMismaCaja(raiz, conOtraCaja), 'string'],
  ['uno que no está de ninguna forma', conLaMismaCaja(raiz, queNoEsta), false],
];

const REGLAS_DE_PRUEBA = leerLoQueNoSePublica([
  '# un comentario', '', 'docs/*', '!docs/legal.md', 'scripts/', 'CLAUDE.md'
].join('\n'));
const delIgnorado = [
  ['un archivo cualquiera', sePublica(REGLAS_DE_PRUEBA, 'js/auth.js'), true],
  ['uno de una carpeta apartada', sePublica(REGLAS_DE_PRUEBA, 'docs/PENDIENTES.md'), false],
  ['el que se volvió a incluir con `!`', sePublica(REGLAS_DE_PRUEBA, 'docs/legal.md'), true],
  ['uno de una carpeta entera', sePublica(REGLAS_DE_PRUEBA, 'scripts/listar.mjs'), false],
  ['un nombre sin barra, en la raíz', sePublica(REGLAS_DE_PRUEBA, 'CLAUDE.md'), false],
  ['el mismo nombre más adentro', sePublica(REGLAS_DE_PRUEBA, 'pwa-familia/CLAUDE.md'), false],
];
let corta = false;
try {
  leerLoQueNoSePublica('*.md');
} catch {
  corta = true;
}
delIgnorado.push(['una forma desconocida corta la corrida', corta, true]);

const rotas = [...delDisco, ...delIgnorado].filter(([, dio, esperado]) => dio !== esperado);
if (rotas.length) {
  console.error('El lector está roto, así que este chequeo no verifica nada:');
  for (const [que, dio, esperado] of rotas) {
    console.error(`  - ${que}: dio ${JSON.stringify(dio)} y tenía que dar ${JSON.stringify(esperado)}`);
  }
  process.exit(1);
}

/* ── LA REVISIÓN ──────────────────────────────────────────────────────── */

const dondeEstaLoQueNoSePublica = join(raiz, '.vercelignore');
if (!existsSync(dondeEstaLoQueNoSePublica)) {
  console.error(
    'No está `.vercelignore`, así que el sitio vuelve a subir el repositorio entero\n' +
    '—la lista de pendientes, las migraciones y los guiones incluidos—, y este\n' +
    'chequeo no puede saber qué se publica y qué no.');
  process.exit(1);
}
const reglas = leerLoQueNoSePublica(readFileSync(dondeEstaLoQueNoSePublica, 'utf8'));
seRevisaron(reglas.length, 'una sola regla adentro de `.vercelignore`');

/* ---- UNA PANTALLA DEL PROGRAMA NO SE PUBLICA DONDE ESTÁ SU ARCHIVO ----
   Una dirección que empieza con un punto se cuenta desde donde está la página
   que la nombra, y mientras cada pantalla era una página suelta eso era lo
   mismo que la carpeta del archivo. Desde que una pantalla es un pedazo de un
   programa deja de serlo: la herramienta junta todos los pedazos en una sola
   página, y esa página se publica en la dirección del programa, no en la de la
   carpeta donde estaba escrito el pedazo.

   El programa de la Familia, por ejemplo, se instala en `/pwa-familia/`, así
   que un `../` escrito adentro de cualquiera de sus pedazos llega a la raíz del
   sitio. Contarlo desde la carpeta del archivo daba por rotas trece direcciones
   que están bien, y —peor— habría dado por buenas las que están mal.

   Dónde se publica cada uno sale de los armazones, que es donde ya está dicho
   cuáles son los paquetes: el del sitio se publica en la raíz, y los dos del
   teléfono en la carpeta que lleva su nombre. */
const PAQUETES = ARMAZONES.map((armazon) => {
  const carpeta = armazon.split('/')[0];
  return {
    fuente: armazon.slice(0, armazon.lastIndexOf('/')) + '/',
    base: carpeta === 'web' ? raiz : join(raiz, carpeta)
  };
});

const dondeSePublica = (camino, nombre, suCarpeta) => {
  /* El armazón no: él no es un pedazo que la herramienta junte, es la hoja
     donde los junta, y lo que nombra lo busca al lado suyo. */
  if (esArmazon(camino)) return suCarpeta;
  const paquete = PAQUETES.find((cual) => nombre.startsWith(cual.fuente));
  return paquete ? paquete.base : suCarpeta;
};

const fallas = [];
let miradas = 0;
let alVuelo = 0;

for (const camino of hayArchivos(raiz, DE_DONDE_SALEN)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');
  const suCarpeta = dirname(camino);
  const vistas = new Set();

  for (const patron of DIRECCIONES) {
    for (const encontrada of texto.matchAll(patron)) {
      const cruda = encontrada[1].trim();
      if (!cruda || SALE_DEL_PROYECTO.test(cruda)) continue;
      if (SE_ARMA_AL_VUELO(cruda)) { alVuelo++; continue; }
      const sinPregunta = cruda.split('?')[0].split('#')[0];
      if (!sinPregunta) continue;

      const renglon = texto.slice(0, encontrada.index).split('\n').length;
      if (vistas.has(renglon + '|' + sinPregunta)) continue;
      vistas.add(renglon + '|' + sinPregunta);
      miradas++;

      /* El punto de entrada de un armazón no es una dirección del sitio: la
         herramienta de armado se lo lleva adentro de lo construido, y lo que
         el servidor sirve es eso. Se comprueba igual que el archivo esté —un
         error de tipeo ahí rompe la construcción y no lo ve nadie hasta
         publicar— pero se lo busca adentro del paquete, que es donde vive, y
         no se le pregunta a `.vercelignore` si lo sube.

         Y «adentro del paquete» quiere decir **la carpeta donde está el propio
         armazón**, que es la que la herramienta toma por raíz. No es siempre el
         mismo escalón: el armazón del sitio está afuera y nombra `/src/...`, y
         los de los dos programas del teléfono están adentro de `src/` y nombran
         lo que tienen al lado. Exigir el escalón habría dado por rotas las dos
         direcciones que sí están. */
      const deLaHerramienta = esArmazon(camino) && sinPregunta.startsWith('/');

      const destino = deLaHerramienta
        ? resolve(suCarpeta, ...sinPregunta.slice(1).split('/'))
        : sinPregunta.startsWith('/')
          ? join(raiz, ...sinPregunta.slice(1).split('/'))
          : resolve(dondeSePublica(camino, nombre, suCarpeta), ...sinPregunta.split('/'));
      const como = conLaMismaCaja(raiz, destino);

      if (como === false) {
        fallas.push(
          `${nombre}:${renglon}  «${cruda}» no existe.\n` +
          '      La pantalla lo va a pedir igual, y el navegador va a recibir un 404.');
        continue;
      }
      if (como !== true) {
        fallas.push(
          `${nombre}:${renglon}  «${cruda}» está escrito con otra caja de letras: en el disco es «${como}».\n` +
          '      Acá anda, porque Windows no distingue mayúsculas. El sitio se sirve desde\n' +
          '      Linux, que sí: publicado da 404, y ninguna prueba de esta máquina lo ve.');
        continue;
      }
      if (deLaHerramienta) continue;

      const adentro = relative(raiz, destino).split(sep).join('/');
      if (!sePublica(reglas, adentro)) {
        fallas.push(
          `${nombre}:${renglon}  «${cruda}» existe acá pero \`.vercelignore\` no lo sube.\n` +
          '      Abre bien en esta máquina y da 404 en el sitio. Si tiene que publicarse,\n' +
          `      se agrega \`!${adentro}\` en \`.vercelignore\`, abajo de la regla que lo saca.`);
      }
    }
  }
}

seRevisaron(miradas, 'una sola dirección local escrita en una pantalla, una hoja o un manifiesto');

if (fallas.length > 0) {
  console.error('Direcciones locales que no llegan a ningún lado en el sitio publicado:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'dirección' : 'direcciones';
  console.error(
    `\n${fallas.length} ${plural}. Andan en esta máquina y dan 404 publicadas, que es ` +
    'la forma más cara\nde equivocarse: no las encuentra ninguna prueba corrida acá.');
  process.exit(1);
}

console.log(
  `Rutas verificadas: ${miradas} direcciones locales escritas en pantallas, hojas y ` +
  `manifiestos, todas apuntando a un archivo que está escrito con esas mismas letras y ` +
  `que el sitio publica (${alVuelo} ${alVuelo === 1 ? 'se arma' : 'se arman'} al vuelo, ` +
  'que no se puede juzgar leyendo).');
