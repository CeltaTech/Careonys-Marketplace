/* ===================================================
   VERIFICA QUE LO QUE SE SIEMBRA SEA UNA CLAVE DEL CATÁLOGO

   Falla —con código de salida 1— si una migración de `supabase/migrations/`
   guarda, en una columna gobernada por un vocabulario, un valor que ese
   vocabulario no tiene.

       node scripts/verificar_claves.mjs

   Por qué existe: las columnas de catálogo son texto libre, así que la base
   acepta cualquier cosa sin chistar. Lo que no la acepta es la pantalla.
   `js/catalogo.js` traduce la clave guardada a su etiqueta y, cuando no la
   encuentra, muestra la clave cruda: la ficha dice «enfermero» en minúscula y
   con guión bajo en lugar de «Enfermero/a universitario/a». Y el filtro que
   ofrece el catálogo busca por la clave buena, así que esa fila no aparece
   nunca. El dato no está mal escrito: está invisible.

   La 0003 sembró ocho valores así —era el pendiente 27— y ninguno dio error en
   ningún momento. Sin un chequeo, la siembra siguiente vuelve a hacerlo.

   Qué mira: cada `insert into` de cada migración. Empareja la lista de columnas
   con la de valores y, si la columna está en la tabla de abajo, exige que el
   valor sea una clave del vocabulario que le corresponde. Entiende el texto
   suelto (`'enfermero'`) y el arreglo (`'["higiene"]'::jsonb`).

   Qué NO mira, y hay que leer con ojos:
   - **Las columnas que todavía no tienen dueño.** `schedule_type` guarda hoy
     cuatro formas distintas —`turno_manana`, `guardia_12`, `flexible`,
     `A coordinar`— porque ningún vocabulario la gobierna, y `nationality`
     tampoco tiene uno. Es el pendiente 31 y se decide, no se adivina.
   - **Lo que escriben las pantallas en vivo.** Acá sólo se leen migraciones.
     Las pantallas arman sus opciones desde el mismo catálogo, así que no
     pueden inventar una clave; el día que una escriba un valor a mano, este
     chequeo no la ve.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Qué vocabulario manda en cada columna. La clave es el nombre de la columna en
   la base; el valor, el del vocabulario en `data/catalogo-vocabularios.json`.
   Una columna que no está acá no se revisa. */
const COLUMNAS = {
  profession: 'tipo_asistente',
  zone: 'zona',
  pathologies: 'patologia',
  pathologies_required: 'patologia',
  tasks: 'tarea_cuidado',
  gender: 'genero',
  modalidad: 'modalidad_curso'
};

const catalogo = JSON.parse(
  readFileSync(join(raiz, 'data', 'catalogo-vocabularios.json'), 'utf8')
);
const vocabularios = catalogo.vocabularios || catalogo;

/** Las claves de un vocabulario. Vacío si el vocabulario no existe. */
function clavesDe(nombre) {
  const v = vocabularios[nombre];
  return new Set(((v && v.items) || []).map((i) => i.clave));
}

/* Un vocabulario nombrado arriba que no exista es un error del chequeo, no del
   código revisado: sin claves contra las que comparar, todo pasa. */
const sinVocabulario = Object.values(COLUMNAS).filter((v) => clavesDe(v).size === 0);
if (sinVocabulario.length) {
  console.error('El chequeo nombra vocabularios que el catálogo no tiene: '
    + sinVocabulario.join(', '));
  process.exit(1);
}

/** Reemplaza los comentarios `--` por espacios, sin tocar lo que va entre comillas. */
function sinComentarios(sql) {
  let fuera = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'") {
      const fin = finDeCadena(sql, i);
      fuera += sql.slice(i, fin + 1);
      i = fin + 1;
      continue;
    }
    if (c === '-' && sql[i + 1] === '-') {
      const salto = sql.indexOf('\n', i);
      const hasta = salto < 0 ? sql.length : salto;
      fuera += ' '.repeat(hasta - i);
      i = hasta;
      continue;
    }
    fuera += c;
    i++;
  }
  return fuera;
}

/** Dónde cierra la comilla simple que abre en `desde`. Dos seguidas no cierran. */
function finDeCadena(sql, desde) {
  let i = desde + 1;
  while (i < sql.length) {
    if (sql[i] === "'") {
      if (sql[i + 1] === "'") { i += 2; continue; }
      return i;
    }
    i++;
  }
  return sql.length - 1;
}

/** Corta por las comas que están al ras: las de adentro de un paréntesis no cuentan. */
function partirAlRas(texto) {
  const partes = [];
  let hondo = 0;
  let desde = 0;
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === "'") { i = finDeCadena(texto, i) + 1; continue; }
    if (c === '(') hondo++;
    else if (c === ')') hondo--;
    else if (c === ',' && hondo === 0) {
      partes.push(texto.slice(desde, i));
      desde = i + 1;
    }
    i++;
  }
  partes.push(texto.slice(desde));
  return partes.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Las tuplas `( ... )` que siguen a `values`, hasta el `;` que cierra. */
function tuplasDesde(sql, desde) {
  const tuplas = [];
  let i = desde;
  while (i < sql.length) {
    const c = sql[i];
    if (c === ';') break;
    if (c === "'") { i = finDeCadena(sql, i) + 1; continue; }
    if (c === '(') {
      let hondo = 0;
      const abre = i;
      while (i < sql.length) {
        if (sql[i] === "'") { i = finDeCadena(sql, i) + 1; continue; }
        if (sql[i] === '(') hondo++;
        else if (sql[i] === ')') {
          hondo--;
          if (hondo === 0) { tuplas.push(sql.slice(abre + 1, i)); i++; break; }
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return tuplas;
}

/** Los textos que hay en un valor: uno suelto, o los del arreglo si es jsonb. */
function textosDe(valor) {
  const v = valor.trim();
  if (!v.startsWith("'")) return [];          // null, un número, un (select ...)
  const fin = finDeCadena(v, 0);
  const crudo = v.slice(1, fin).replace(/''/g, "'");
  const resto = v.slice(fin + 1).trim().toLowerCase();
  if (resto.startsWith('::jsonb') || resto.startsWith('::json')) {
    try {
      const dato = JSON.parse(crudo);
      return Array.isArray(dato) ? dato.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  }
  if (resto.length > 0) return [];            // ::uuid, ::date y demás no son catálogo
  return [crudo];
}

const INSERT = /insert\s+into\s+(?:public\.)?"?(\w+)"?\s*\(([^)]*)\)\s*values/gi;

/** Los reparos de un texto SQL. Cada uno dice renglón, columna, valor y remedio. */
function revisarSql(sql) {
  const limpio = sinComentarios(sql);
  const reparos = [];
  const renglon = (i) => limpio.slice(0, i).split('\n').length;

  INSERT.lastIndex = 0;
  let cabecera;
  while ((cabecera = INSERT.exec(limpio)) !== null) {
    const columnas = cabecera[2].split(',').map((c) => c.trim().replace(/"/g, ''));
    const interesan = columnas
      .map((c, i) => [i, c])
      .filter(([, c]) => Object.prototype.hasOwnProperty.call(COLUMNAS, c));
    if (interesan.length === 0) continue;

    const arranque = cabecera.index + cabecera[0].length;
    for (const tupla of tuplasDesde(limpio, arranque)) {
      const valores = partirAlRas(tupla);
      if (valores.length !== columnas.length) continue;
      for (const [i, columna] of interesan) {
        const vocabulario = COLUMNAS[columna];
        const validas = clavesDe(vocabulario);
        for (const texto of textosDe(valores[i])) {
          if (validas.has(texto)) continue;
          reparos.push({
            renglon: renglon(limpio.indexOf(tupla, arranque)),
            motivo: `«${texto}» no es una clave de «${vocabulario}»`,
            columna,
            remedio: 'las claves están en data/catalogo-vocabularios.json'
          });
        }
      }
    }
  }
  return reparos;
}

/* ── Autoprueba: si el detector está roto, esto lo dice antes de revisar nada ── */

const MALOS = [
  ['una profesión que no existe',
   "insert into public.caregivers (id, profession) values ('a', 'enfermero');"],
  ['una patología inventada adentro del arreglo',
   `insert into public.caregivers (id, pathologies) values ('a', '["alzheimer", "gripe"]'::jsonb);`],
  ['la tarea con otro nombre',
   `insert into public.caregivers (id, tasks) values ('a', '["acompanamiento"]'::jsonb);`],
  ['la segunda fila es la mala',
   "insert into public.caregivers (id, zone) values ('a', 'caba'), ('b', 'zona_este');"],
  ['la columna vale aunque haya un subselect al lado',
   "insert into public.caregivers (tenant_id, profession) values ((select id from public.tenants where slug = 'x'), 'enfermero');"]
];
const BUENOS = [
  ['todas las claves buenas',
   "insert into public.caregivers (id, profession, zone) values ('a', 'gerontologo', 'zona_norte');"],
  ['arreglo con claves buenas',
   `insert into public.caregivers (id, pathologies, tasks) values ('a', '["acv"]'::jsonb, '["higiene"]'::jsonb);`],
  ['columna sin vocabulario, no se juzga',
   "insert into public.care_searches (id, schedule_type) values ('a', 'turno_manana');"],
  ['una comilla adentro del texto no corre las columnas',
   "insert into public.caregivers (full_name, profession) values ('O''Brien Ficticio', 'voluntario');"],
  ['un comentario que nombra una clave vieja',
   "-- antes decía 'enfermero'\ninsert into public.caregivers (id, profession) values ('a', 'auxiliar_enfermeria');"],
  ['una tabla que no siembra catálogo',
   "insert into public.tenants (slug, name) values ('presdemo', 'PresDemo');"]
];

const noDetecta = MALOS.filter(([, s]) => revisarSql(s).length === 0).map(([n]) => n);
const sePasa = BUENOS.filter(([, s]) => revisarSql(s).length > 0).map(([n]) => n);
if (noDetecta.length || sePasa.length) {
  console.error('La autoprueba del chequeo falló, así que el chequeo no vale:');
  if (noDetecta.length) console.error('  no detecta: ' + noDetecta.join(' / '));
  if (sePasa.length) console.error('  avisa de más: ' + sePasa.join(' / '));
  process.exit(1);
}

/* ── El recorrido ──────────────────────────────────────────────────────────── */

const carpeta = join(raiz, 'supabase', 'migrations');
const fallas = [];
let revisados = 0;

for (const nombre of readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort()) {
  revisados++;
  for (const r of revisarSql(readFileSync(join(carpeta, nombre), 'utf8'))) {
    fallas.push(`supabase/migrations/${nombre}:${r.renglon}  ${r.columna}: ${r.motivo}`
      + `\n      ${r.remedio}`);
  }
}

if (fallas.length > 0) {
  console.error('Valores sembrados que el catálogo no reconoce:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'valor' : 'valores';
  console.error(`\n${fallas.length} ${plural}. Una clave que el catálogo no tiene se muestra cruda `
    + 'en la pantalla y ningún filtro la encuentra.');
  process.exit(1);
}

console.log(`Claves verificadas: ${revisados} migraciones sin valores fuera del catálogo.`);
