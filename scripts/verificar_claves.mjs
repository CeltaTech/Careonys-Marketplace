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

   Qué mira: cada `insert into` de cada migración, en las tres formas en que
   estas migraciones siembran. La que nombra las columnas; la que no las nombra
   —el volcado—, donde el orden de los valores lo pone el `create table` de esa
   tabla; y la que junta una lista de valores contra otra tabla para sacar de
   ahí la Prestadora. Empareja las columnas con los valores y, si la columna
   está en la tabla de abajo, exige que el valor sea una clave del vocabulario
   que le corresponde. Entiende el texto suelto (`'enfermero'`) y el arreglo
   (`'["higiene"]'::jsonb`).

   La forma que no nombra las columnas es la que siembra casi todo, y era la
   que este chequeo no sabía leer: de las 525 siembras que había el día que se
   corrigió, 511 eran así y no se miraba ninguna. No avisaba nada porque el
   titular contaba migraciones abiertas, que eran todas las que hay.
   Por eso ahora dice cuántas siembras leyó, que es lo que se estaba haciendo.

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
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Qué vocabulario manda en cada columna. La clave es el nombre de la columna en
   la base; el valor, el del vocabulario en `data/catalogo-vocabularios.json`.
   Una columna que no está acá no se revisa. */
const COLUMNAS = {
  profession: 'tipo_asistente',
  profession_required: 'tipo_asistente',
  zone: 'zona',
  pathologies: 'patologia',
  pathologies_required: 'patologia',
  tasks: 'tarea_cuidado',
  tasks_required: 'tarea_cuidado',
  consultation_reason: 'motivo_consulta',
  preferred_gender: 'genero_preferido',
  frequency: 'frecuencia',
  gender: 'genero',
  modalidad: 'modalidad_curso',
  nivel: 'nivel_curso',
  dia: 'dia_semana',
  turno: 'turno',
  puesto: 'puesto_experiencia',
  // `tipo` y `estado` se nombran por tabla y no por columna sola: hay un
  // segundo `estado`, el de `oferta_comercial`
  // (`supabase/migrations/0001_base_del_esquema.sql:2760`), que ningún
  // vocabulario gobierna, porque «publicado»/«proximamente» son el ciclo de
  // vida del ítem, no una verificación. El día que otra tabla necesite
  // gobernar el suyo, se agrega acá con el mismo par tabla.columna.
  'verificaciones_asistente.tipo': 'verificacion',
  'verificaciones_asistente.estado': 'estado_verificacion'
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

/** Dónde cierra el paréntesis que abre en `abre`. Devuelve -1 si no cierra. */
function finDeParentesis(sql, abre) {
  let hondo = 0;
  let i = abre;
  while (i < sql.length) {
    if (sql[i] === "'") { i = finDeCadena(sql, i) + 1; continue; }
    if (sql[i] === '(') hondo++;
    else if (sql[i] === ')') { hondo--; if (hondo === 0) return i; }
    i++;
  }
  return -1;
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
  const arreglo = () => {
    try {
      const dato = JSON.parse(crudo);
      return Array.isArray(dato) ? dato.filter((x) => typeof x === 'string') : [];
    } catch { return []; }
  };
  if (resto.startsWith('::jsonb') || resto.startsWith('::json')) return arreglo();
  if (resto.length > 0) return [];            // ::uuid, ::date y demás no son catálogo
  /* Sin `::jsonb` a la vista. Un volcado no lo escribe, porque el `insert` ya
     nombra la columna y la columna ya dice de qué tipo es; el valor sigue
     siendo el mismo arreglo. Si el texto tiene forma de arreglo se lo lee como
     tal, y si no se lo lee como un valor suelto, que es lo de siempre. Sin esto
     una lista entera pasaría por una sola clave inventada y ninguna de las de
     adentro se miraría. */
  if (crudo.startsWith('[')) return arreglo();
  return [crudo];
}

/* De dónde sale el orden de las columnas, que es lo único que dice qué valor va
   en qué lugar cuando la siembra no las nombra. Se lee de `verificar_esquema.mjs`
   y no se vuelve a escribir acá: ahí está el punto único de verdad de cómo se
   leen las migraciones, y una segunda copia se despega de aquélla el primer día
   —una columna agregada, sacada o renombrada deja de contarse igual de los dos
   lados y el emparejamiento se corre entero sin avisar—. */
import { columnasDeclaradas } from './verificar_esquema.mjs';

/* La lista de columnas es opcional: sin ella la siembra es un volcado. */
const INSERT = /insert\s+into\s+(?:public\.)?"?(\w+)"?\s*(?:\(([^)]*)\)\s*)?values/gi;

/** Los bloques `(values (…), (…)) as f(col, col)`, con sus columnas.
 *
 *  Es la otra forma de sembrar que usan estas migraciones: en vez de escribir
 *  la fila entera se junta una lista de valores contra `caregivers` o contra
 *  `avisos`, y de ahí sale la Prestadora sin escribirla a mano. Sin
 *  esto, **todo lo que se siembre de esa forma no lo mira nadie**, que es
 *  justamente el agujero por el que se colaron ocho claves inventadas sin que
 *  sonara nada. */
function bloquesDeValores(sql) {
  const bloques = [];
  const VALUES = /\(\s*values(?![a-z_])/gi;
  let m;
  while ((m = VALUES.exec(sql)) !== null) {
    const abre = m.index;
    const cierra = finDeParentesis(sql, abre);
    if (cierra < 0) continue;
    /* El nombre y la lista de columnas van pegados al paréntesis que cierra.
       Sin lista de columnas no hay contra qué emparejar los valores. */
    const cola = sql.slice(cierra + 1).match(/^\s*(?:as\s+)?\w+\s*\(([^)]*)\)/i);
    if (!cola) continue;
    const arranque = abre + m[0].length;
    bloques.push({
      arranque,
      columnas: cola[1].split(',').map((c) => c.trim().replace(/"/g, '')),
      tuplas: tuplasDesde(sql.slice(arranque, cierra), 0)
    });
  }
  return bloques;
}

/** Los reparos de un texto SQL, y cuántas siembras se leyeron para encontrarlos.
 *  Cada reparo dice renglón, columna, valor y remedio. */
function revisarSql(sql, declaradas = columnasDeclaradas([sql])) {
  const limpio = sinComentarios(sql);
  const reparos = [];
  let siembras = 0;
  const renglon = (i) => limpio.slice(0, i).split('\n').length;

  /** Empareja cada tupla con su lista de columnas y anota lo que no es clave.
   *  Devuelve cuántas tuplas no se pudieron emparejar, que no es lo mismo que
   *  cuántas están bien: una tupla que no se empareja no se miró. */
  const revisarTuplas = (tabla, columnas, tuplas, arranque) => {
    const interesan = columnas
      .map((c, i) => [i, c, COLUMNAS[`${tabla}.${c}`] || COLUMNAS[c]])
      .filter(([, , vocabulario]) => vocabulario !== undefined);
    if (interesan.length === 0) return 0;

    let salteadas = 0;
    for (const tupla of tuplas) {
      const valores = partirAlRas(tupla);
      if (valores.length !== columnas.length) { salteadas++; continue; }
      for (const [i, columna, vocabulario] of interesan) {
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
    return salteadas;
  };

  INSERT.lastIndex = 0;
  let cabecera;
  while ((cabecera = INSERT.exec(limpio)) !== null) {
    const tabla = cabecera[1].toLowerCase();
    const arranque = cabecera.index + cabecera[0].length;
    /* Sin lista de columnas el orden lo pone la tabla. Si ninguna migración la
       declara no hay contra qué emparejar, y eso se dice en voz alta: callarse
       es justamente lo que hace que una siembra entera pase sin que la mire
       nadie. */
    const columnas = cabecera[2] !== undefined
      ? cabecera[2].split(',').map((c) => c.trim().replace(/"/g, ''))
      : (declaradas.has(tabla) ? [...declaradas.get(tabla)] : undefined);
    if (columnas === undefined) {
      reparos.push({
        renglon: renglon(cabecera.index),
        motivo: 'la siembra no nombra las columnas y ninguna migración declara la tabla',
        columna: tabla,
        remedio: 'nombrar las columnas en el `insert`'
      });
      continue;
    }
    siembras++;
    const salteadas = revisarTuplas(
      tabla, columnas, tuplasDesde(limpio, arranque), arranque
    );
    if (salteadas > 0) {
      reparos.push({
        renglon: renglon(cabecera.index),
        motivo: `${salteadas} filas escriben una cantidad de valores que no es la de `
          + `las ${columnas.length} columnas, así que no se sabe cuál va con cuál`,
        columna: tabla,
        remedio: 'nombrar las columnas en el `insert`'
      });
    }
  }

  /* Y la otra forma de sembrar, la que junta una lista de valores contra una
     tabla para sacar de ahí la Prestadora. Acá no hay una sola tabla destino
     inequívoca —es un `join`—, así que sólo se juzgan las columnas que la
     lista de arriba gobierna por nombre solo, nunca las que piden tabla. */
  for (const bloque of bloquesDeValores(limpio)) {
    siembras++;
    revisarTuplas(null, bloque.columnas, bloque.tuplas, bloque.arranque);
  }

  return { reparos, siembras };
}

/* ── Autoprueba: si el detector está roto, esto lo dice antes de revisar nada ── */

/* Un esquema mínimo para las pruebas del volcado. Va de a una columna por
   renglón, que es como se escribe una migración y como se lee de ella. */
const ESQUEMA_DE_PRUEBA = `create table public.caregivers (
  id uuid primary key,
  profession text,
  constraint sin_vacio check (profession <> '')
);
`;

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
   "insert into public.caregivers (tenant_id, profession) values ((select id from public.tenants where slug = 'x'), 'enfermero');"],
  ['la siembra que junta una lista de valores contra otra tabla',
   "insert into public.franjas_asistente (tenant_id, caregiver_id, dia, turno) select c.tenant_id, c.id, f.dia, f.turno from public.caregivers c join (values ('a'::uuid, 'lunes', 'manana'), ('b'::uuid, 'lunes', 'mediodia')) as f(caregiver_id, dia, turno) on f.caregiver_id = c.id;"],
  ['el puesto de una experiencia laboral, en la misma forma',
   "insert into public.experiencia_laboral_asistente (tenant_id, caregiver_id, puesto) select c.tenant_id, c.id, x.puesto from public.caregivers c join (values ('a'::uuid, 'enfermero')) as x(caregiver_id, puesto) on x.caregiver_id = c.id;"],
  ['el volcado que no nombra las columnas',
   ESQUEMA_DE_PRUEBA + "insert into public.caregivers values ('a', 'enfermero');"],
  ['el volcado de una tabla que ninguna migración declara',
   "insert into public.caregivers values ('a', 'gerontologo');"],
  ['el volcado que escribe más valores que columnas tiene la tabla',
   ESQUEMA_DE_PRUEBA + "insert into public.caregivers values ('a', 'gerontologo', 'de más');"]
];
const BUENOS = [
  ['todas las claves buenas',
   "insert into public.caregivers (id, profession, zone) values ('a', 'gerontologo', 'zona_norte');"],
  ['arreglo con claves buenas',
   `insert into public.caregivers (id, pathologies, tasks) values ('a', '["acv"]'::jsonb, '["higiene"]'::jsonb);`],
  ['columna sin vocabulario, no se juzga',
   "insert into public.avisos (id, schedule_type) values ('a', 'turno_manana');"],
  ['una comilla adentro del texto no corre las columnas',
   "insert into public.caregivers (full_name, profession) values ('O''Brien Ficticio', 'voluntario');"],
  ['un comentario que nombra una clave vieja',
   "-- antes decía 'enfermero'\ninsert into public.caregivers (id, profession) values ('a', 'auxiliar_enfermeria');"],
  ['una tabla que no siembra catálogo',
   "insert into public.tenants (slug, name) values ('presdemo', 'PresDemo');"],
  ['la lista de valores con todas las claves buenas',
   "insert into public.franjas_asistente (tenant_id, caregiver_id, dia, turno) select c.tenant_id, c.id, f.dia, f.turno from public.caregivers c join (values ('a'::uuid, 'lunes', 'manana'), ('b'::uuid, 'sabado', 'noche')) as f(caregiver_id, dia, turno) on f.caregiver_id = c.id;"],
  ['una lista de valores sin nombres de columna no se juzga a ciegas',
   "insert into public.caregivers (id, zone) select v.a, v.b from (values ('a', 'zona_este')) v;"],
  ['el volcado con todas las claves buenas',
   ESQUEMA_DE_PRUEBA + "insert into public.caregivers values ('a', 'gerontologo');"]
];

const noDetecta = MALOS.filter(([, s]) => revisarSql(s).reparos.length === 0).map(([n]) => n);
const sePasa = BUENOS.filter(([, s]) => revisarSql(s).reparos.length > 0).map(([n]) => n);
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
let siembras = 0;

const migraciones = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort();
seRevisaron(migraciones.length, 'una sola migración `.sql` para revisar');

const textos = migraciones.map((n) => readFileSync(join(carpeta, n), 'utf8'));
const declaradas = columnasDeclaradas(textos);
seRevisaron(declaradas.size, 'una sola tabla declarada en las migraciones');

for (const [i, nombre] of migraciones.entries()) {
  revisados++;
  const salida = revisarSql(textos[i], declaradas);
  siembras += salida.siembras;
  for (const r of salida.reparos) {
    fallas.push(`supabase/migrations/${nombre}:${r.renglon}  ${r.columna}: ${r.motivo}`
      + `\n      ${r.remedio}`);
  }
}

/* El número que faltaba. Mientras el titular contaba migraciones abiertas decía
   ocho de ocho y sonaba bien, con el volcado entero sin leer. */
seRevisaron(siembras, 'una sola siembra emparejada con sus columnas');

if (fallas.length > 0) {
  console.error('Valores sembrados que el catálogo no reconoce:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  const plural = fallas.length === 1 ? 'valor' : 'valores';
  console.error(`\n${fallas.length} ${plural}. Una clave que el catálogo no tiene se muestra cruda `
    + 'en la pantalla y ningún filtro la encuentra.');
  process.exit(1);
}

console.log(`Claves verificadas: ${siembras} siembras de ${revisados} migraciones, `
  + 'todas emparejadas con sus columnas y sin valores fuera del catálogo.');
