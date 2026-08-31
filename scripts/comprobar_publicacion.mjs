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

// Lo que no se sirve: no vive en el sitio y pedirlo sería un rojo falso.
const NO_SE_SIRVE = /^(docs|scripts|supabase|\.githooks|\.claude|\.agents)\//;

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

if (!candidatos.length) {
  console.log('  · El último commit no tocó ningún archivo que el sitio sirva.\n');
  process.exit(rojos ? 1 : 0);
}

// ── Y ahora sí, los archivos ───────────────────────────────────────────────
for (const ruta of candidatos) {
  const local = readFileSync(join(raiz, ruta));
  const r = await fetch(`${sitio}/${ruta}`, { redirect: 'follow' });
  const cuerpo = Buffer.from(await r.arrayBuffer());
  const tipo = (r.headers.get('content-type') || '').toLowerCase();
  const esperado = TIPOS[ruta.slice(ruta.lastIndexOf('.'))];

  const igual = cuerpo.length === local.length;
  const tipoBien = !esperado || tipo.includes(esperado);

  decir(r.ok && igual && tipoBien,
    `${ruta}: ${r.status}, ${cuerpo.length} bytes` +
    (igual ? '' : ` (acá tiene ${local.length}: todavía no llegó)`) +
    (tipoBien ? '' : ` (contesta «${tipo}», se esperaba ${esperado})`));
}

console.log(rojos
  ? `\n${rojos} ${rojos === 1 ? 'comprobación falló' : 'comprobaciones fallaron'}.\n`
  : '\nTodo lo del último commit está publicado.\n');
process.exit(rojos ? 1 : 0);
