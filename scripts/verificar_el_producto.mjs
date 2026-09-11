/* ===================================================
   LA FOTO DEL PRODUCTO SIGUE SIENDO LA DE HOY

       node scripts/verificar_el_producto.mjs

   `docs/CAREONYS MarketPlace EL PRODUCTO.md` es lo que CeltaTech usa para saber
   qué está vendiendo.
   Un documento así sirve mientras esté al día; el día que una pantalla nueva no
   figura ahí, el documento pasó de ayudar a mentir, y nadie se entera hasta que
   alguien vende algo que el producto no hace.

   Este chequeo existe para que no se pueda agregar ni sacar una pantalla sin
   pasar por el documento.

   ---- Las cuatro cosas que mira ----

   **1. Toda pantalla del producto está nombrada en el documento.** Cada pantalla
   tiene acá al lado el nombre con el que se la ve —«Directorio de Asistentes»,
   «Panel de la Prestadora»—, y ese nombre tiene que aparecer escrito en el
   documento. Una pantalla nueva pone esto rojo dos veces: primero porque no está
   en esta tabla, y después porque no está en el documento.

   **2. Ninguna pantalla de la tabla desapareció.** Al revés que la anterior. Si
   se retira una pantalla, el renglón de acá y el capítulo del documento se van
   con ella.

   **3. Las imágenes están y se usan todas.** Toda imagen que el documento cita
   existe en el disco, y toda imagen guardada está citada. Un enlace roto deja un
   hueco en la foto; una imagen huérfana es una pantalla que se sacó del
   documento y quedó dando vueltas.

   **4. El documento está escrito en castellano y no en nombres de archivo.** Lo
   ordenó el Desarrollador y vale especialmente acá, porque esto lo lee quien
   vende: «yo te voy a seguir hablando sin nombres de archivos ni etiquetas no
   codigos, no es mi campo y me cuesta mucho entender cuando te expresas
   apoyandote en eso». Entonces el texto no puede llevar adentro nombres de
   archivo, ni de tablas, ni de columnas. Las imágenes son la excepción obvia:
   sin nombre de archivo no hay imagen.

   ---- Lo que este chequeo no mira ----

   No mira si lo que el documento dice de cada pantalla es cierto: eso no lo
   puede leer un programa. Mira que ninguna pantalla quede afuera, que las
   imágenes cierren y que esté escrito para quien lo lee.
=================================================== */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { archivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCUMENTO = join('docs', 'CAREONYS MarketPlace EL PRODUCTO.md');
const IMAGENES = join('docs', 'pantallas');

/* ---- CÓMO SE LLAMA CADA PANTALLA PARA QUIEN LA MIRA ----

   A la izquierda, la pantalla tal como está guardada. A la derecha, el nombre
   con el que se la nombra delante de alguien. El documento habla de lo segundo
   y nunca de lo primero. */
const COMO_SE_LLAMA = new Map([
  ['index', 'Portada'],
  ['acceso', 'Acceso'],
  ['registrar-familia', 'Alta de Familia'],
  ['registrar-asistente', 'Alta de Asistente'],
  ['recuperar-clave', 'Recuperar la contraseña'],
  ['nueva-clave', 'Elegir una contraseña nueva'],
  ['directorio', 'Directorio de Asistentes'],
  ['perfil', 'Perfil público del Asistente'],
  ['solicitar-asistente', 'Solicitar un Asistente'],
  ['cursos', 'Cursos'],
  ['examen', 'Evaluaciones'],
  ['panel-prestadora', 'Panel de la Prestadora'],
  ['guias-prestadora', 'Guías de cuidado de la Prestadora'],
  ['soporte-remoto', 'Acompañamiento en línea'],
  ['mockup-app', 'Demostración en teléfono'],
  ['pwa-asistente/index', 'La aplicación del Asistente'],
  ['pwa-familia/index', 'La aplicación de la Familia']
]);

/* Lo que sí puede aparecer escrito con punto adentro, porque es lengua y no
   nombre de archivo: cifras con decimales y poco más. */
const NO_ES_UN_NOMBRE_DE_ARCHIVO = /^\d+([.,]\d+)*$/;

/* Las formas que delatan que se coló algo guardado en vez de algo hablado. */
const DELATORES = [
  { que: /\b[\w-]+\.(html|js|mjs|cjs|css|json|sql|md|sh|py|ts|yml|yaml)\b/gi,
    dice: 'un nombre de archivo' },
  { que: /\b(tenant_id|caregiver_id|familia_id|aviso_id|conversacion_id|user_id|created_at|updated_at|marcada_en|event_type)\b/gi,
    dice: 'un nombre de columna' },
  /* Sólo las que no pueden ser otra cosa. «Avisos», «mensajes», «reportes»,
     «postulaciones» y «conversaciones» son también nombres de tabla, y son
     antes que eso palabras del castellano: acá se escriben todo el tiempo y
     está bien que se escriban. */
  { que: /\b(caregivers|clock_ins|profiles|tenants)\b/g,
    dice: 'un nombre de tabla' },
  { que: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|RLS|SECURITY DEFINER|uuid|jsonb|localStorage|IndexedDB|PostgREST|Supabase|JWT|API)\b/g,
    dice: 'una palabra técnica' }
];

// ── El documento ───────────────────────────────────────────────────────────

if (!existsSync(join(raiz, DOCUMENTO))) {
  console.error(
    `\nFalta la foto del producto.\n\n` +
    'Es el documento que CeltaTech usa para saber qué está vendiendo: qué hace el producto,\n' +
    'para qué sirve, qué trae, qué no trae y con qué pantallas. Sin él, quien vende inventa.\n'
  );
  process.exit(1);
}
const texto = readFileSync(join(raiz, DOCUMENTO), 'utf8');

const problemas = [];

// ── 1 y 2. Toda pantalla nombrada, y ninguna de más ────────────────────────

const desdeLaRaiz = raiz.replace(/\\/g, '/') + '/';
const pantallas = archivos(raiz, EXTENSIONES_DE_PANTALLA)
  .map((camino) => camino.replace(/\\/g, '/').replace(/\.html$/i, ''))
  .map((camino) => (camino.startsWith(desdeLaRaiz) ? camino.slice(desdeLaRaiz.length) : camino))
  .filter((camino) => !camino.startsWith('docs/'))
  .sort();

seRevisaron(pantallas.length, 'ninguna pantalla del producto');
seRevisaron(COMO_SE_LLAMA.size, 'ningún nombre visible de pantalla en este chequeo');

for (const pantalla of pantallas) {
  const nombre = COMO_SE_LLAMA.get(pantalla);
  if (!nombre) {
    problemas.push(
      `Hay una pantalla que este chequeo no conoce: «${pantalla}».\n` +
      '  Antes de seguir hay que decidir cómo se la llama delante de alguien, escribir ese nombre\n' +
      '  en la tabla de este guion, y darle su capítulo en la foto del producto, con su imagen.'
    );
    continue;
  }
  if (!texto.includes(nombre)) {
    problemas.push(
      `La pantalla «${nombre}» no figura en la foto del producto.\n` +
      '  Existe en el producto y quien vende no se entera de que existe.'
    );
  }
}

for (const [pantalla, nombre] of COMO_SE_LLAMA) {
  if (!pantallas.includes(pantalla)) {
    problemas.push(
      `«${nombre}» ya no es una pantalla del producto, y este chequeo la sigue esperando.\n` +
      '  Si se retiró, se retira también su renglón acá y su capítulo en la foto del producto.'
    );
  }
}

// ── 3. Las imágenes cierran por los dos lados ──────────────────────────────

const guardadas = existsSync(join(raiz, IMAGENES))
  ? readdirSync(join(raiz, IMAGENES)).filter((n) => /\.png$/i.test(n)).sort()
  : [];

seRevisaron(guardadas.length, 'ninguna imagen de pantalla guardada');

const citadas = new Set(
  [...texto.matchAll(/!\[[^\]]*\]\(pantallas\/([^)]+)\)/g)].map((c) => c[1])
);

seRevisaron(citadas.size, 'ninguna imagen citada en la foto del producto');

for (const nombre of citadas) {
  if (!guardadas.includes(nombre)) {
    problemas.push(
      `La foto del producto muestra una imagen que no está guardada: «${nombre}».\n` +
      '  Quien abra el documento va a ver un hueco.'
    );
  }
}
for (const nombre of guardadas) {
  if (!citadas.has(nombre)) {
    problemas.push(
      `La imagen «${nombre}» está guardada y no la muestra nadie.\n` +
      '  O le falta su lugar en la foto del producto, o sobra y se borra.'
    );
  }
}

// ── 4. Escrito para quien lo lee ───────────────────────────────────────────

/* Se mira el texto sin las citas de imagen, que son las únicas que tienen que
   llevar un nombre de archivo adentro, y sin los bloques de código. */
const renglones = texto.split('\n');
const soloLengua = renglones
  .map((r, i) => ({ n: i + 1, t: r }))
  .filter(({ t }) => !/^!\[/.test(t.trim()))
  .map(({ n, t }) => ({ n, t: t.replace(/`[^`]*`/g, '') }));

for (const { n, t } of soloLengua) {
  for (const { que, dice } of DELATORES) {
    for (const hallazgo of t.match(que) || []) {
      if (NO_ES_UN_NOMBRE_DE_ARCHIVO.test(hallazgo)) continue;
      problemas.push(
        `Renglón ${n} de la foto del producto: dice «${hallazgo}», que es ${dice}.\n` +
        '  Esto lo lee quien vende el producto, no quien lo programa: va escrito en castellano.'
      );
    }
  }
}

// ── El veredicto ───────────────────────────────────────────────────────────

if (problemas.length) {
  console.error(
    '\n' + problemas.join('\n') +
    '\n\nLa foto del producto es lo que CeltaTech mira para saber qué está vendiendo, ' +
    'y se actualiza junto con el producto.\n'
  );
  process.exit(1);
}

console.log(
  `Foto del producto verificada: ${pantallas.length} pantallas nombradas, ` +
  `${guardadas.length} imágenes usadas, ninguna palabra de programador adentro.`
);
