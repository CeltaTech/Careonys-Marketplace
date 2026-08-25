/* ===================================================
   VERIFICA LAS CUATRO REGLAS QUE SE ESCRIBEN EN UNA MIGRACIÓN

       node scripts/verificar_esquema.mjs

   Mira `supabase/migrations/*.sql`. No consulta la base: mira lo que dice cada
   migración, que es lo único que se puede comprobar sin red y antes de un commit.
   Lo que corre hoy en el servidor es otra pregunta y se responde mirando el
   servidor (`CLAUDE.md` §7, «estado real por encima del documentado»).

   Las cuatro:

   1. **Toda tabla nueva enciende su RLS en la misma migración que la crea**
      (`CLAUDE.md` §4). Encenderla después, a mano desde el panel, deja una ventana
      abierta entre las dos cosas, y deja el repositorio diciendo algo que no es.
   2. **Toda función `SECURITY DEFINER` le revoca el permiso a `PUBLIC` y a `anon`
      en la misma migración** (§4). Una función así del esquema `public` es además
      una dirección web, porque PostgREST publica ese esquema: con permiso para
      `anon`, cualquiera con la clave pública la llama sin sesión. Revocarle a
      `PUBLIC` no alcanza: el de `anon` es una concesión aparte. No se mira
      `authenticated`, porque ahí los dos casos son legítimos: la que consumen las
      políticas lo conserva —sin él la aplicación no puede leer sus propias
      tablas— y la que dispara un `trigger` no lo necesita.
   3. **Toda tabla con datos propios de una Organización tiene `prestadora_id` o
      `tenant_id`** (§5.10), aunque hoy siempre valga lo mismo. Es lo que hace que
      la fusión con Careonys sea un update y no una migración. Acá, a diferencia de
      la RLS, no se exige que esté en la misma migración que crea la tabla: la
      regla pide la columna, no el momento, y tres tablas la reciben legítimamente
      en la 0002. Se busca en todas las migraciones juntas, en el cuerpo de la
      creación o en un `alter table … add column` posterior.
   4. **Todo importe se guarda con su moneda** (§5.11). Un número solo, leído un
      año después, no se sabe cuánto vale.

   Las tres primeras están limpias —22 tablas, 5 funciones— y este chequeo está
   para que sigan así. La cuarta tiene hoy un incumplimiento, anotado abajo con su
   motivo y su pendiente: el chequeo no lo tapa, lo deja a la vista y evita que
   entre uno nuevo.

   Qué NO mira, dicho de frente:
   - No sabe si la migración se aplicó. Un archivo acá describe lo que se quiso
     aplicar, no lo que corre.
   - No lee la política, sólo que la RLS esté encendida. Una política mal escrita
     con la RLS encendida pasa igual.
   - Un importe se reconoce por el nombre de la columna. Una que se llame de otra
     manera no se detecta; hoy la única del esquema es `caregivers.hourly_rate`.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'supabase', 'migrations');

/* Tablas que no llevan columna de Organización, con el motivo escrito al lado.
   Una exención sin motivo es una excepción que nadie va a poder revisar después. */
const SIN_ORGANIZACION = new Map([
  ['tenants',
   'es la Organización: su propio identificador es el que las demás tablas copian']
]);

/* Importes que hoy se guardan sin moneda, con su motivo y su pendiente. */
const SIN_MONEDA = new Map([
  ['caregivers.hourly_rate',
   'único importe del esquema; agregarle la moneda toca una columna ya escrita, ' +
   'así que lo decide el Desarrollador; pendiente 51']
]);

const TABLA = /create\s+table\s+(?:if\s+not\s+exists\s+)?"?public"?\."?([a-z_]+)"?\s*\(/gi;
const FUNCION = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_]+)\s*\(/gi;
const PLATA = /(price|precio|rate|tarifa|monto|importe|honorario|cobro|salario|remuneracion|pago|fee|amount)/i;
const NUMERO = /\b(numeric|decimal|money|integer|bigint|real|double\s+precision|smallint)\b/i;
const MONEDA = /(moneda|currency)/i;
const NO_ES_COLUMNA = /^(primary|unique|constraint|foreign|check|--)/i;
const AGREGA_ORGANIZACION =
  /alter\s+table\s+(?:if\s+exists\s+)?"?public"?\."?([a-z_]+)"?[^;]*add\s+column[^;]*\b(?:prestadora_id|tenant_id)\b/gi;

/** Las tablas que en algún lado reciben su columna de Organización. */
export function conOrganizacion(textos) {
  const salida = new Set();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    for (const m of t.matchAll(TABLA)) {
      if (/\b(prestadora_id|tenant_id)\b/i.test(entreParentesis(t, m.index))) {
        salida.add(m[1].toLowerCase());
      }
    }
    for (const m of t.matchAll(AGREGA_ORGANIZACION)) salida.add(m[1].toLowerCase());
  }
  return salida;
}

/* De la paréntesis que abre hasta la que cierra, contando. Una definición de
   columna trae paréntesis adentro —`numeric(10,2)`, `check (…)`— y cortando por
   la primera que cierra se pierde media tabla. */
function entreParentesis(texto, desde) {
  const i = texto.indexOf('(', desde);
  if (i < 0) return '';
  let hondo = 0;
  for (let j = i; j < texto.length; j++) {
    if (texto[j] === '(') hondo++;
    else if (texto[j] === ')') {
      hondo--;
      if (hondo === 0) return texto.slice(i + 1, j);
    }
  }
  return texto.slice(i);
}

const renglonDe = (texto, posicion) => texto.slice(0, posicion).split('\n').length;

/**
 * Lo que incumple una migración. Devuelve `[renglón, qué pasa]` por cada cosa.
 * `conColumna` son las tablas que reciben su columna de Organización en alguna
 * migración, no necesariamente en ésta; sin ese dato se mira sólo este texto.
 */
export function fallasDeUnaMigracion(texto, conColumna) {
  const t = texto.replace(/\r\n/g, '\n');
  const bajo = t.toLowerCase();
  const tienen = conColumna || conOrganizacion([t]);
  const fallas = [];

  for (const m of t.matchAll(TABLA)) {
    const tabla = m[1].toLowerCase();
    const renglon = renglonDe(t, m.index);
    const columnas = entreParentesis(t, m.index);

    /* 1. La RLS, en esta misma migración. */
    const rls = new RegExp('alter\\s+table[^;]*\\b' + tabla +
      '\\b[^;]*enable\\s+row\\s+level\\s+security');
    if (!rls.test(bajo)) {
      fallas.push([renglon, '`' + tabla + '` se crea acá y su RLS no se enciende acá']);
    }

    /* 3. La columna de la Organización, acá o en cualquier otra migración. */
    if (!tienen.has(tabla) && !SIN_ORGANIZACION.has(tabla)) {
      fallas.push([renglon,
        '`' + tabla + '` no tiene `prestadora_id` ni `tenant_id` en ninguna migración']);
    }

    /* 4. La moneda del importe. */
    const tieneMoneda = MONEDA.test(columnas);
    const primera = renglonDe(t, t.indexOf('(', m.index));
    columnas.split('\n').forEach((linea, i) => {
      const l = linea.trim().replace(/,$/, '');
      if (!l || NO_ES_COLUMNA.test(l)) return;
      const columna = l.split(/\s+/)[0].replace(/"/g, '');
      if (!PLATA.test(columna) || !NUMERO.test(l)) return;
      if (tieneMoneda || SIN_MONEDA.has(tabla + '.' + columna)) return;
      fallas.push([primera + i,
        '`' + tabla + '.' + columna + '` guarda un importe y la tabla no tiene moneda']);
    });
  }

  /* 2. La función que se saltea la RLS no queda al alcance de quien no inició sesión. */
  for (const m of t.matchAll(FUNCION)) {
    const funcion = m[1].toLowerCase();
    const fin = bajo.indexOf('$$;', m.index);
    const trozo = bajo.slice(m.index, fin > 0 ? fin : bajo.length);
    if (!/security\s+definer/.test(trozo)) continue;

    const revocado = [...bajo.matchAll(
      new RegExp('revoke[^;]*\\b' + funcion + '\\b[^;]*from([^;]*);', 'g'))]
      .map((r) => r[1]).join(' ');
    const faltan = ['public', 'anon'].filter((quien) =>
      !new RegExp('\\b' + quien + '\\b').test(revocado));
    if (faltan.length > 0) {
      fallas.push([renglonDe(t, m.index),
        '`' + funcion + '()` es SECURITY DEFINER y no le revoca el permiso a ' +
        faltan.join(' ni a ')]);
    }
  }

  return fallas.sort((a, b) => a[0] - b[0]);
}

/* ── Pruebas del detector ────────────────────────────────────────────────────
   Un chequeo que no detecta nada pasa siempre, y eso no se nota. Antes de mirar
   las migraciones se mira a sí mismo. */

const RLS = 'alter table public.visitas enable row level security;';
const CREA = 'create table if not exists public.visitas (\n' +
  '  id uuid primary key default gen_random_uuid(),\n' +
  '  prestadora_id uuid not null references public.tenants(id)\n);\n';

const MAL = [
  ['una tabla que se crea sin encender su RLS',
   CREA],
  ['una tabla sin columna de Organización',
   'create table if not exists public.visitas (\n  id uuid primary key\n);\n' + RLS],
  ['un importe sin moneda',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  precio_hora numeric not null\n);\n' + RLS],
  ['una función SECURITY DEFINER que no revoca nada',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\n'],
  ['una función SECURITY DEFINER que sólo le revoca a PUBLIC',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\nrevoke all on function public.mirar() from public;\n']
];

const BIEN = [
  ['una tabla con su RLS y su columna de Organización',
   CREA + RLS],
  ['un importe con su moneda al lado',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  precio_hora numeric not null,\n' +
   '  moneda text not null default \'ARS\'\n);\n' + RLS],
  ['la columna de la Organización que llega en un `alter table` posterior',
   'create table if not exists public.visitas (\n  id uuid primary key\n);\n' +
   'alter table public.visitas add column if not exists tenant_id uuid;\n' + RLS],
  ['una columna numérica que no es un importe',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  latitude double precision\n);\n' + RLS],
  ['una función SECURITY DEFINER que le revoca a los dos',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\nrevoke all on function public.mirar() from public, anon;\n'],
  ['una que además le revoca a la sesión iniciada, porque la dispara un trigger',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\n' +
   'revoke all on function public.mirar() from public, anon, authenticated;\n'],
  ['una función común que no revoca nada',
   'create function public.mirar() returns boolean language sql as $$\n' +
   '  select true;\n$$;\n'],
  ['`numeric(10,2)` no corta la tabla por la mitad',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  cantidad numeric(10,2),\n  prestadora_id uuid not null\n);\n' + RLS]
];

const noDetecta = MAL.filter(([, t]) => fallasDeUnaMigracion(t).length === 0);
const sePasa = BIEN.filter(([, t]) => fallasDeUnaMigracion(t).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

const fallas = [];
let tablas = 0;
let funciones = 0;
const migraciones = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort();
const textos = migraciones.map((n) => readFileSync(join(carpeta, n), 'utf8'));

/* Primero se leen las quince juntas: una tabla puede recibir su columna de
   Organización en una migración posterior a la que la crea, y juzgando archivo
   por archivo se avisaría de tres que están bien. */
const tienenColumna = conOrganizacion(textos);

for (const [i, nombre] of migraciones.entries()) {
  const texto = textos[i];
  tablas += [...texto.matchAll(TABLA)].length;
  for (const m of texto.matchAll(FUNCION)) {
    const fin = texto.toLowerCase().indexOf('$$;', m.index);
    if (/security\s+definer/i.test(
      texto.slice(m.index, fin > 0 ? fin : texto.length))) funciones++;
  }
  for (const [renglon, motivo] of fallasDeUnaMigracion(texto, tienenColumna)) {
    fallas.push(`supabase/migrations/${nombre}:${renglon}  ${motivo}`);
  }
}

if (fallas.length > 0) {
  console.error('Migraciones que incumplen una regla del esquema:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(
    `\n${fallas.length} ${fallas.length === 1 ? 'incumplimiento' : 'incumplimientos'}. ` +
    'Las cuatro reglas están en el encabezado de este archivo, con el porqué de cada\n' +
    'una. La RLS y la revocación van en la misma migración que crea la tabla o la\n' +
    'función, nunca en una posterior y nunca a mano desde el panel de Supabase; la\n' +
    'columna de Organización y la moneda pueden llegar después, pero tienen que llegar.\n' +
    'Si un caso no puede cumplirla, va a SIN_ORGANIZACION o a SIN_MONEDA de este mismo\n' +
    'archivo, con el motivo escrito y el pendiente que lo sigue.');
  process.exit(1);
}

console.log(
  `Esquema verificado: ${tablas} tablas con su RLS encendida donde se crean y con ` +
  `columna de Organización, y ${funciones} funciones SECURITY DEFINER fuera del ` +
  `alcance anónimo (${SIN_ORGANIZACION.size} tabla y ${SIN_MONEDA.size} importe ` +
  'exentos, con su motivo).');
