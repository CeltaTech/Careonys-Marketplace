/* ¿Llegó al sitio publicado lo que se acaba de subir?

   Existe porque la comprobación que se venía haciendo no podía fallar: se le
   pedía la raíz a `careonys.com` y se leía el `200` como «publicado». Pero
   `careonys.com` no es este producto —es una página de obra de un solo archivo—
   y contesta ese mismo `200`, con la misma página, para cualquier dirección que
   se le pida, incluso una inventada. El sitio de este producto es
   `careonys-marketplace.vercel.app`.

   Así que acá la primera comprobación es el control negativo: si una dirección
   inventada **no** contesta 404, el servidor está sirviendo un comodín y
   ninguna de las otras comprobaciones significa nada. Recién con ese control en
   verde tiene sentido pedir los archivos de verdad.

   Y lo que se compara **no es el archivo de esta máquina, es el que git subió**.
   No es lo mismo y el 31 de agosto de 2026 este guión dio tres rojos falsos por
   eso: decía que las tres copias de `js/auth.js` «todavía no llegaron», con 305
   bytes de diferencia, y los 305 eran los 305 retornos de carro de un archivo
   de 305 renglones. En Windows el archivo de trabajo tiene `CRLF` y el objeto
   que git guarda —y que Vercel clona— tiene `LF`. Comparar contra el disco es
   comparar contra algo que nunca se publicó.

   Un rojo falso en la única herramienta que dice «la publicación salió bien» es
   peor que no tenerla: el día que se ponga roja de verdad ya nadie le va a
   creer. Y de paso corrige lo otro, que era más callado: comparar contra el
   disco también medía los cambios **sin commitear**, así que un archivo editado
   y no subido salía en rojo por no estar publicado, que es exactamente lo que
   tenía que pasar.

   Y ahora compara **el contenido entero**, no el tamaño. Dos archivos distintos
   del mismo tamaño pasaban de largo, y no es un caso raro: cambiar una palabra
   por otra de igual largo alcanza. Cuando difieren se dice en qué byte empiezan
   a diferir y nada más: de estos archivos no se imprime una sola letra, porque
   `js/auth.js` es justamente el que una vez llevó una clave a la pantalla.

   Uso:
     node scripts/comprobar_publicacion.mjs                    (los archivos del último commit)
     node scripts/comprobar_publicacion.mjs ruta/al/archivo …  (los que se nombren)
     SITIO_PUBLICADO=https://otro.ejemplo node scripts/comprobar_publicacion.mjs */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitio = (process.env.SITIO_PUBLICADO || 'https://careonys-marketplace.vercel.app')
  .replace(/\/$/, '');

// Qué tipo de contenido tiene que contestar cada extensión. Lo que no esté acá
// se comprueba igual, pero sólo por tamaño: no se inventa una expectativa.
const TIPOS = {
  '.js':   'javascript',
  '.mjs':  'javascript',
  '.json': 'json',
  '.css':  'css',
  '.html': 'text/html',
  '.svg':  'image/svg',
  '.png':  'image/png',
  '.webp': 'image/webp',
};

/* Lo que no se sirve: no vive en el sitio y pedirlo sería un rojo falso. Y
   `web/` está acá por lo mismo que `scripts/`, aunque el motivo sea otro: es
   materia prima de la herramienta de armado, no sitio. Lo que el servidor
   sirve es lo construido a partir de eso. */
const NO_SE_SIRVE = /^(docs|scripts|supabase|web|\.githooks|\.claude|\.agents)\/|^(CLAUDE|README)\.md$|^package(-lock)?\.json$|^\./;

/* Lo que git tiene guardado para esa ruta en el último commit, que es lo que el
   sitio clona. Devuelve nulo si la ruta no está en el commit —se la nombró a
   mano y nunca se subió—, y ahí se cae al disco avisando. */
function delUltimoCommit(ruta) {
  try {
    return execFileSync('git', ['cat-file', '-p', 'HEAD:' + ruta],
      { cwd: raiz, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/* En qué byte empiezan a diferir dos contenidos. Se informa la posición y nunca
   lo que hay en ella. */
function dondeDifieren(a, b) {
  const hasta = Math.min(a.length, b.length);
  for (let i = 0; i < hasta; i++) if (a[i] !== b[i]) return i;
  return hasta;
}

function archivosDelUltimoCommit() {
  const salida = execFileSync('git', ['show', '--name-only', '--pretty=format:', 'HEAD'],
    { cwd: raiz, encoding: 'utf8' });
  return salida.split('\n').map((l) => l.trim()).filter(Boolean);
}

const pedidos = process.argv.slice(2);
const candidatos = (pedidos.length ? pedidos : archivosDelUltimoCommit())
  .map((r) => r.split(sep).join('/'))
  .filter((r) => !NO_SE_SIRVE.test(r))
  .filter((r) => existsSync(join(raiz, r)));

let rojos = 0;
const decir = (bien, texto) => {
  if (!bien) rojos++;
  console.log(`  ${bien ? '✔' : '✘'} ${texto}`);
};

console.log(`\nSitio: ${sitio}\n`);

// ── El control que deja fallar a los demás ─────────────────────────────────
const inventada = `/no-existe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}.js`;
const control = await fetch(sitio + inventada, { redirect: 'manual' });
decir(control.status === 404,
  `Control: una dirección inventada contesta ${control.status} (tiene que ser 404). ` +
  (control.status === 404 ? '' : 'El servidor sirve un comodín: lo de abajo no prueba nada.'));

if (control.status !== 404) {
  console.log('\nSe corta acá a propósito.\n');
  process.exit(1);
}

// ── Lo que el sitio no tiene que servir ────────────────────────────────────
/* Hasta el 31 de agosto de 2026 el sitio subía el repositorio entero, así que
   cualquiera con la dirección leía `docs/PENDIENTES.md` —la lista enumerada de
   todo lo que este producto no resuelve, sección de seguridad incluida—, las
   migraciones con cada política de RLS escrita, y los guiones de comprobación.
   Lo cerró `.vercelignore`; esto es lo que avisa si alguna vez se vuelve a
   abrir. Los dos documentos legales quedan servidos a propósito: los enlazan
   las pantallas públicas, y que estén sin revisión profesional es el
   pendiente 49, no esto. Y el armazón de React entra en la misma lista por
   otro motivo: servido tal cual es una página en blanco con una dirección
   rota adentro, así que si aparece publicado es que algo se armó mal. */
const NO_SE_PUBLICA = [
  'CLAUDE.md',
  'docs/PENDIENTES.md',
  'docs/ALCANCE.md',
  'scripts/verificar_todo.mjs',
  'supabase/migrations/0001_base_del_esquema.sql',
  'web/src/principal.jsx',
];

/* Y antes de creerle al 404 hay que saber que el archivo existe acá. Un archivo
   borrado del repositorio contesta 404 aunque el sitio estuviera publicando
   todo, así que el renglón se pondría verde por ausencia y no por estar
   cerrado. Pasó el 8 de septiembre de 2026: la lista nombraba
   `0001_esquema_inicial.sql`, que había dejado de existir al aplastarse las 74
   migraciones en tres, y esa comprobación llevaba desde entonces sin poder
   fallar. Se avisa en rojo para que la lista se corrija, no para que se
   ignore. */
for (const ruta of NO_SE_PUBLICA) {
  if (!existsSync(join(raiz, ruta))) {
    decir(false, `Cerrado: ${ruta} no existe en el repositorio, así que su 404 ` +
      'no prueba nada — hay que nombrar acá un archivo que sí esté');
    continue;
  }
  const r = await fetch(`${sitio}/${ruta}`, { redirect: 'manual' });
  decir(r.status === 404, `Cerrado: ${ruta} contesta ${r.status}` +
    (r.status === 404 ? '' : ' y tendría que contestar 404 — está publicado'));
}

if (!candidatos.length) {
  console.log('  · El último commit no tocó ningún archivo que el sitio sirva.\n');
  process.exit(rojos ? 1 : 0);
}

// ── Y ahora sí, los archivos ───────────────────────────────────────────────
for (const ruta of candidatos) {
  const subido = delUltimoCommit(ruta);
  const local = subido || readFileSync(join(raiz, ruta));
  const r = await fetch(`${sitio}/${ruta}`, { redirect: 'follow' });
  const cuerpo = Buffer.from(await r.arrayBuffer());
  const tipo = (r.headers.get('content-type') || '').toLowerCase();
  const esperado = TIPOS[ruta.slice(ruta.lastIndexOf('.'))];

  const igual = cuerpo.equals(local);
  const tipoBien = !esperado || tipo.includes(esperado);

  decir(r.ok && igual && tipoBien,
    `${ruta}: ${r.status}, ${cuerpo.length} bytes` +
    (subido ? '' : ' (no está en el último commit: se compara contra el disco)') +
    (igual ? '' : ` (el commit tiene ${local.length} y difieren desde el byte ` +
      `${dondeDifieren(cuerpo, local)}: todavía no llegó)`) +
    (tipoBien ? '' : ` (contesta «${tipo}», se esperaba ${esperado})`));
}

console.log(rojos
  ? `\n${rojos} ${rojos === 1 ? 'comprobación falló' : 'comprobaciones fallaron'}.\n`
  : '\nTodo lo del último commit está publicado.\n');
process.exit(rojos ? 1 : 0);
