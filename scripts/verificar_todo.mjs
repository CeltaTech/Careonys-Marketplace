/* ===================================================
   CORRE TODOS LOS CHEQUEOS DE UNA VEZ

       node scripts/verificar_todo.mjs

   Falla —con código de salida 1— si falla cualquiera de ellos, y muestra la
   salida entera del que falló. Los que pasan ocupan un renglón cada uno.

   Por qué existe: los chequeos se corrían a mano, uno por uno, y ya son
   varios. Un chequeo que hay que acordarse de correr protege hasta que alguien
   se olvida, que es exactamente como el nombre viejo del producto llegó a 273
   apariciones. Esto es lo que engancha el gancho `pre-commit` de `.githooks/`,
   así que nada se sube sin haber pasado por todos.

   No lleva la lista escrita adentro: busca en esta misma carpeta todo archivo
   que se llame `verificar_*.mjs` —menos él mismo— y los corre en orden
   alfabético. El chequeo siguiente que alguien escriba entra solo, sin tocar
   este archivo ni el gancho.

   Acá no se escribe cuántos hay, a propósito: un renglón con la cuenta queda
   viejo el día que se suma uno. En `docs/PENDIENTES.md` decía cinco cuando ya
   eran seis, y este mismo encabezado decía seis cuando ya eran siete. La
   cuenta la da la corrida, que la saca de la carpeta.

   Qué no mira: nada por su cuenta. Todo lo que sabe lo saben los otros.
=================================================== */

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const aca = dirname(fileURLToPath(import.meta.url));
const yo = 'verificar_todo.mjs';

const chequeos = readdirSync(aca)
  .filter((n) => n.startsWith('verificar_') && n.endsWith('.mjs') && n !== yo)
  .sort();

if (chequeos.length === 0) {
  console.error('No se encontró ningún chequeo en scripts/, y debería haber varios.');
  process.exit(1);
}

const fallaron = [];

for (const chequeo of chequeos) {
  /* `encoding` para leer la salida como texto, y `shell` apagado a propósito:
     el nombre del archivo no pasa por ningún intérprete de línea de comandos. */
  const corrida = spawnSync(process.execPath, [join(aca, chequeo)], {
    encoding: 'utf8',
    shell: false
  });

  const nombre = chequeo.replace(/^verificar_/, '').replace(/\.mjs$/, '');

  if (corrida.status === 0) {
    /* Del que pasa alcanza con el último renglón, que es donde cada chequeo
       escribe cuánto revisó. Lo demás sería ruido en cada commit. */
    const salida = (corrida.stdout || '').trim().split('\n');
    console.log(`  ✔ ${nombre.padEnd(12)} ${salida[salida.length - 1] || ''}`);
  } else {
    fallaron.push(nombre);
    console.log(`  ✘ ${nombre}`);
    /* Del que falla se muestra todo: es lo único que hay que leer. */
    const detalle = ((corrida.stdout || '') + (corrida.stderr || '')).trimEnd();
    if (detalle) console.log(detalle.split('\n').map((l) => '      ' + l).join('\n'));
  }
}

if (fallaron.length > 0) {
  console.error(`\n${fallaron.length} de ${chequeos.length} chequeos fallaron: ${fallaron.join(', ')}.`);
  process.exit(1);
}

console.log(`\nLos ${chequeos.length} chequeos pasaron.`);
