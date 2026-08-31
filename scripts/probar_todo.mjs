/* ===================================================
   TODAS LAS PRUEBAS QUE CORREN CONTRA LA BASE DE ESTA MÁQUINA

       node scripts/probar_todo.mjs

   `verificar_todo.mjs` junta los chequeos que leen archivos y corren sin red.
   Éste junta las pruebas que necesitan una base levantada: registran cuentas
   ficticias, les hacen escribir, y preguntan quién ve qué.

   Existe por lo que pasó el 31 de agosto de 2026. La prueba de aislamiento
   sabía correr contra la base local desde que se escribió, y hacía cinco días
   que nadie la corría porque la lista de pendientes decía que estaba trabada
   —lo estaba sólo contra el servidor publicado—. Y la tabla del README, que se
   mide sola, había quedado vieja porque nadie corría al medidor. Las dos veces
   el problema fue el mismo: **una herramienta que hay que acordarse de correr
   es una herramienta que no corre.**

   Antes hay que levantar la base:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   ── Lo que NO corre acá, y por qué ────────────────────────────────────────

   Dos pruebas quedan afuera a propósito, y se dice cuáles para que nadie
   cuente estas seis y crea que están todas:

   · `probar_alta_y_baja.mjs` — va contra el servidor publicado, necesita la
     clave de firma de la caja fuerte, y su limpieza **borra datos publicados**.
     Correrla se consulta antes (pendiente 107).
   · `probar_consulta_publica.mjs` — va contra el servidor publicado y hoy
     reporta el estado conocido del pendiente 64.

   ── La que tiene que dar rojo ─────────────────────────────────────────────

   `probar_permisos_en_vivo.mjs` sale en rojo a propósito: es el pendiente 67,
   y su propio texto dice que hasta que se arregle tiene que dar rojo. Acá se
   cuenta como esperada y no tumba la corrida. **Pero si algún día pasa, esto
   falla igual**, porque entonces el pendiente 67 está cerrado y hay que sacarlo
   de esta lista. Una prueba que perdona un rojo para siempre deja de mirar.
=================================================== */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const aca = dirname(fileURLToPath(import.meta.url));

/* Las seis que saben correr contra la base local. En este orden: primero las
   chicas, que son rápidas y dicen enseguida si la base está sana, y al final la
   de aislamiento, que es la larga. */
const PRUEBAS = [
  'probar_el_rol_y_la_prestadora_del_perfil.mjs',
  'probar_de_quien_es_el_legajo.mjs',
  'probar_sello_de_la_prestadora.mjs',
  'probar_el_papel_nuevo_baja_el_sello.mjs',
  'probar_permisos_en_vivo.mjs',
  'probar_aislamiento.mjs'
];

/* Rojas a propósito, con el pendiente que lo explica al lado. Sacar de acá lo
   que se arregle: si una de éstas pasa, esta corrida falla y dice por qué. */
const ROJAS_ESPERADAS = new Map([
  ['probar_permisos_en_vivo.mjs', 67]
]);

const nombreCorto = (a) => a.replace(/^probar_/, '').replace(/\.mjs$/, '');

const fallaron = [];
const esperadas = [];
const sorpresas = [];

for (const prueba of PRUEBAS) {
  const corrida = spawnSync(process.execPath, [join(aca, prueba), '--local'], {
    encoding: 'utf8',
    shell: false
  });

  const nombre = nombreCorto(prueba);
  const salida = ((corrida.stdout || '') + (corrida.stderr || '')).trimEnd();
  const rojaEsperada = ROJAS_ESPERADAS.get(prueba);

  if (corrida.status === 0 && rojaEsperada) {
    /* Pasó una que tenía que fallar. No es una buena noticia silenciosa: es una
       lista desactualizada, y hay que tocarla. */
    sorpresas.push(nombre);
    console.log(`  ✘ ${nombre}  — pasó, y estaba anotada como roja esperada (pendiente ${rojaEsperada})`);
    continue;
  }

  if (corrida.status === 0) {
    /* El resumen de cada prueba es el último párrafo, y de ahí alcanza con el
       primer renglón. Tomar el último a secas —como hace `verificar_todo.mjs`,
       donde cada chequeo resume en un renglón solo— dejaba a la de aislamiento
       mostrando la mitad de una frase. */
    const parrafo = (corrida.stdout || '').trimEnd().split(/\n\s*\n/).pop() || '';
    console.log(`  ✔ ${nombre}`);
    console.log('      ' + (parrafo.trim().split('\n')[0] || ''));
    continue;
  }

  if (rojaEsperada) {
    esperadas.push(nombre);
    console.log(`  · ${nombre}  — roja esperada, es el pendiente ${rojaEsperada}`);
    continue;
  }

  fallaron.push(nombre);
  console.log(`  ✘ ${nombre}`);
  if (salida) console.log(salida.split('\n').map((l) => '      ' + l).join('\n'));
}

console.log('');
console.log('Quedaron afuera a propósito, porque van contra el servidor publicado:');
console.log('  probar_alta_y_baja.mjs      necesita la clave de firma y borra datos publicados');
console.log('  probar_consulta_publica.mjs reporta el estado conocido del pendiente 64');

if (sorpresas.length > 0) {
  console.error(
    `\n${sorpresas.length} prueba(s) anotadas como rojas esperadas pasaron: ${sorpresas.join(', ')}.\n` +
    'Eso quiere decir que el pendiente que las explicaba está cerrado. Se saca de\n' +
    '`ROJAS_ESPERADAS` en este archivo y se cierra el pendiente en docs/PENDIENTES.md.\n'
  );
  process.exit(1);
}

if (fallaron.length > 0) {
  console.error(`\n${fallaron.length} de ${PRUEBAS.length} pruebas fallaron: ${fallaron.join(', ')}.`);
  process.exit(1);
}

console.log(
  `\nLas ${PRUEBAS.length - esperadas.length} pruebas que tenían que pasar pasaron` +
  (esperadas.length ? `, y ${esperadas.length} dio el rojo que tenía que dar.` : '.')
);
