/* ===================================================
   COMPARA LA BASE PUBLICADA CONTRA LA QUE ARMAN LAS MIGRACIONES

       node scripts/comparar_bases.mjs

   POR QUÉ EXISTE. El 26 de agosto de 2026 se descubrió que la base publicada no
   era la que arman las migraciones: la Prestadora de ejemplo estaba ahí con otro
   nombre, otra descripción y un logotipo que ninguna migración escribe. Se
   habían puesto a mano contra la base. El desvío no lo denunció nada: se
   encontró de casualidad, mirando otra cosa. Este guion existe para que la
   próxima vez no haga falta la casualidad.

   CÓMO SE PRUEBA. Se vuelcan las dos bases del mismo modo, con la local
   reconstruida desde cero con todas las migraciones, y se comparan fila por fila
   y columna por columna. Mirar dos o tres columnas a ojo es exactamente lo que
   dejó pasar el desvío la primera vez.

   QUÉ SE IGNORA, Y POR QUÉ SE DICE. Cada base genera lo suyo, y eso no es un
   desvío: los `uuid` que no vienen escritos en la migración, y las fechas que
   toman su valor por omisión al construirse. Los identificadores se leen por su
   clave natural —el nombre corto de la Prestadora, la clave del curso, la de la
   evaluación—, así que dos filas iguales con distinto `uuid` se reconocen como
   iguales. Las fechas que difieren **se cuentan y se dicen**, nunca en silencio:
   una comparación que esconde lo que descarta es una prueba que no puede fallar.

   TRES RESULTADOS, Y SÓLO DOS SON ERROR.

     1. **La misma fila dice cosas distintas.** Es un desvío: alguien escribió
        contra la base. Rompe.
     2. **Una fila que las migraciones cargan y en la base publicada no está.**
        Alguien la borró a mano. Rompe.
     3. **Una fila que está publicada y ninguna migración carga.** Puede ser un
        desvío, o puede ser lo que existe porque alguien usó el producto: una
        cuenta creada al registrarse, un legajo cargado probando una pantalla.
        Eso no lo puede decidir un guion, así que se muestra entero y decide
        quien mira.

   QUÉ NECESITA. El CLI de Supabase enlazado al proyecto y la base local
   levantada (`supabase start`). No entra en los chequeos del `commit`, que
   corren sin red: éste se llama a mano.
=================================================== */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve, sep } from 'node:path';

/* Una fecha escrita por la base al construirse. No se compara por igualdad: si
   difiere se cuenta aparte y se dice cuántas. */
const FECHAS = /^'\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

/* Tablas cuyo identificador se puede leer por una clave que sí es estable. */
const NATURALES = {
  tenants: 'slug',
  cursos: 'clave',
  evaluaciones: 'clave',
  preguntas_evaluacion: 'clave',
  opciones_pregunta: 'clave',
};

/** Parte los `INSERT INTO ... VALUES` en `{ tabla: { columnas, filas } }`. */
function leerVolcado(texto) {
  const renglones = texto.split('\n');
  const tablas = {};
  for (let i = 0; i < renglones.length; i++) {
    const cabecera = renglones[i].match(/^INSERT INTO "public"\."([a-z_]+)" \((.*)\) VALUES$/);
    if (!cabecera) continue;
    const columnas = cabecera[2].split(', ').map(c => c.replace(/"/g, ''));
    const filas = [];
    while (++i < renglones.length && renglones[i].startsWith('\t(')) {
      filas.push(renglones[i].trim().replace(/[,;]$/, ''));
    }
    i--;
    tablas[cabecera[1]] = { columnas, filas };
  }
  return tablas;
}

/** Parte `(a, b, c)` respetando las comillas simples y el `''` de adentro. */
function partir(fila) {
  const s = fila.slice(1, -1);
  const campos = [];
  let actual = '';
  let enComilla = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (enComilla) {
      if (c === "'" && s[k + 1] === "'") { actual += "''"; k++; continue; }
      if (c === "'") enComilla = false;
      actual += c;
    } else if (c === "'") { enComilla = true; actual += c; }
    else if (c === ',') { campos.push(actual.trim()); actual = ''; }
    else actual += c;
  }
  campos.push(actual.trim());
  return campos;
}

/** El diccionario que cambia cada `uuid` generado por su clave natural. */
function porClaveNatural(tablas) {
  const mapa = new Map();
  for (const [tabla, clave] of Object.entries(NATURALES)) {
    const t = tablas[tabla];
    if (!t || !t.columnas.includes(clave)) continue;
    const i = t.columnas.indexOf('id');
    const n = t.columnas.indexOf(clave);
    for (const fila of t.filas) {
      const c = partir(fila);
      mapa.set(c[i].replace(/'/g, ''), `<${tabla}.${c[n].replace(/'/g, '')}>`);
    }
  }
  return mapa;
}

/** La fila leída por clave natural, sin su propio identificador. */
function normalizar(columnas, fila, mapa) {
  const valores = partir(fila);
  const salida = {};
  columnas.forEach((columna, i) => {
    if (columna === 'id') return;
    const crudo = valores[i].replace(/^'|'$/g, '');
    salida[columna] = mapa.get(crudo) ?? valores[i];
  });
  return salida;
}

/** Lo que decide si dos filas son la misma: todo su contenido menos las fechas. */
function huella(fila) {
  return Object.entries(fila)
    .filter(([, valor]) => !FECHAS.test(valor))
    .map(([columna, valor]) => `${columna}=${valor}`)
    .join('|');
}

function resumen(fila) {
  return Object.entries(fila).slice(0, 5).map(([c, v]) => `${c}=${v}`).join(', ');
}

/** Las diferencias entre los dos volcados, repartidas en sus tres clases. */
export function compararBases(textoMigraciones, textoEnVivo) {
  const A = leerVolcado(textoMigraciones);
  const B = leerVolcado(textoEnVivo);
  const mapaA = porClaveNatural(A);
  const mapaB = porClaveNatural(B);

  const distintas = [];   // la misma fila dice cosas distintas
  const faltan = [];      // las migraciones la cargan y no está publicada
  const sobran = [];      // está publicada y ninguna migración la carga
  let fechas = 0;

  for (const tabla of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const ta = A[tabla] ?? { columnas: B[tabla].columnas, filas: [] };
    const tb = B[tabla] ?? { columnas: A[tabla].columnas, filas: [] };
    if (ta.filas.length && tb.filas.length && ta.columnas.join() !== tb.columnas.join()) {
      distintas.push(`      ${tabla}: las columnas no son las mismas`);
      continue;
    }
    const filasA = ta.filas.map(f => normalizar(ta.columnas, f, mapaA));
    const librosB = tb.filas.map(f => ({ fila: normalizar(tb.columnas, f, mapaB), tomada: false }));

    /* Primero se emparejan las idénticas. Lo que queda suelto se intenta
       emparejar por clave natural, que es donde aparece el desvío de verdad: la
       misma fila, con otro contenido. */
    const sueltas = [];
    for (const fila of filasA) {
      const impresion = huella(fila);
      const par = librosB.find(x => !x.tomada && huella(x.fila) === impresion);
      if (!par) { sueltas.push(fila); continue; }
      par.tomada = true;
      for (const [columna, valor] of Object.entries(fila)) {
        if (FECHAS.test(valor) && par.fila[columna] !== valor) fechas++;
      }
    }

    const clave = NATURALES[tabla];
    for (const fila of sueltas) {
      const par = clave
        ? librosB.find(x => !x.tomada && x.fila[clave] === fila[clave])
        : undefined;
      if (!par) { faltan.push(`      ${tabla}: ${resumen(fila)}`); continue; }
      par.tomada = true;
      for (const columna of Object.keys(fila)) {
        if (fila[columna] === par.fila[columna]) continue;
        if (FECHAS.test(fila[columna])) { fechas++; continue; }
        distintas.push(
          `      ${tabla} [${fila[clave]}] · ${columna}\n` +
          `          migraciones: ${fila[columna]}\n` +
          `          publicada:   ${par.fila[columna]}`
        );
      }
    }
    for (const x of librosB) {
      if (!x.tomada) sobran.push(`      ${tabla}: ${resumen(x.fila)}`);
    }
  }
  return { distintas, faltan, sobran, fechas };
}

/** Vuelca las dos bases del mismo modo, con la local reconstruida desde cero. */
function volcar() {
  const carpeta = mkdtempSync(join(tmpdir(), 'bases-'));
  /* En Windows el CLI es un `.cmd`, y sin intérprete no se lo encuentra. Las
     rutas van entre comillas porque entonces sí las parte el intérprete. */
  const correr = (...args) => {
    try {
      return execFileSync('supabase', args.map(a => (a.includes(sep) ? `"${a}"` : a)), {
        encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const detalle = `${error.stderr || ''}${error.stdout || ''}`.trim();
      throw new Error(
        `Falló «supabase ${args.join(' ')}».\n` +
        'Este guion necesita el CLI de Supabase enlazado al proyecto y la base local\n' +
        'levantada (`supabase start`).\n' +
        (detalle ? `\n${detalle}\n` : '')
      );
    }
  };

  console.log('Reconstruyendo la base local desde cero con todas las migraciones…');
  correr('db', 'reset', '--local');
  const migraciones = join(carpeta, 'migraciones.sql');
  const enVivo = join(carpeta, 'en_vivo.sql');
  correr('db', 'dump', '--local', '--data-only', '--schema', 'public', '-f', migraciones);
  console.log('Volcando la base publicada…');
  correr('db', 'dump', '--linked', '--data-only', '--schema', 'public', '-f', enVivo);
  return [readFileSync(migraciones, 'utf8'), readFileSync(enVivo, 'utf8')];
}

// Solo corre cuando se lo llama a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [textoA, textoB] = volcar();
  const { distintas, faltan, sobran, fechas } = compararBases(textoA, textoB);

  if (sobran.length) {
    console.log(
      '\nFilas que están en la base publicada y ninguna migración carga. Puede ser un\n' +
      'desvío, o puede ser lo que existe porque alguien usó el producto:\n' +
      sobran.join('\n')
    );
  }
  if (fechas) {
    console.log(`\nFechas que no coinciden: ${fechas}. Cada base pone la suya al construirse.`);
  }

  const problemas = [];
  if (distintas.length) {
    problemas.push(
      'La misma fila dice cosas distintas en las dos bases. Alguien escribió contra la\n' +
      'base sin pasar por una migración:\n' + distintas.join('\n')
    );
  }
  if (faltan.length) {
    problemas.push(
      'Filas que las migraciones cargan y en la base publicada no están:\n' + faltan.join('\n')
    );
  }
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log('\nLas dos bases dicen lo mismo.');
}
