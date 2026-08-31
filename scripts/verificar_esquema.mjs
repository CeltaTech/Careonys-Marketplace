/* ===================================================
   VERIFICA LAS SIETE REGLAS QUE SE ESCRIBEN EN UNA MIGRACIÓN

       node scripts/verificar_esquema.mjs

   Mira `supabase/migrations/*.sql`. No consulta la base: mira lo que dice cada
   migración, que es lo único que se puede comprobar sin red y antes de un commit.
   Lo que corre hoy en el servidor es otra pregunta y se responde mirando el
   servidor (regla de la empresa «el estado real está por encima del documentado»).

   Las siete:

   1. **Toda tabla nueva enciende su RLS en la misma migración que la crea**
      (regla de la empresa «RLS estricta en toda tabla nueva»). Encenderla después, a mano desde el panel, deja una ventana
      abierta entre las dos cosas, y deja el repositorio diciendo algo que no es.
   2. **Toda función `SECURITY DEFINER` le revoca el permiso a `PUBLIC` y a `anon`
      en la misma migración** (la misma regla). Una función así del esquema `public` es además
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
   5. **Toda tabla tiene clave primaria `uuid`** (§5.10). Es la otra mitad de la
      «toda tabla nace con clave uuid y con la columna de su Organización», y es del mismo motivo: dos bases que se fusionan con claves
      correlativas chocan en el número 1, y hay que reasignarlas todas junto con
      cada referencia que las apunta. Con UUID no chocan. La clave se busca donde
      esté declarada —adentro del `create table` o en un `alter table … add
      constraint … primary key` posterior, que es como la declara la 0001—.
   6. **Toda siembra que recorre las Prestadoras que existen hoy deja además un
      disparador sobre `tenants`**, para las que vengan mañana. Un
      `insert … select … from public.tenants` sin acotar corre una sola vez, sobre
      las que había ese día, y toda Prestadora nacida después arranca sin eso. Ya
      pasó: la 0018 sembró de fábrica el puntaje, y `cuidarsur`, nacida en la 0035,
      tenía cero (pendiente 97, cerrado por la 0046). El disparador no tiene que
      estar en la misma migración que la siembra —el arreglo llega después, como
      llegó acá—, pero tiene que estar en alguna.
   7. **Toda política sobre `storage.objects` nombra la Organización en su
      condición** (regla de la empresa «los archivos se guardan privados por
      defecto… la ruta empieza por la Organización, y la política lo exige»).
      Es la única política que este chequeo lee, y por un motivo: en una tabla,
      si la política se equivoca, todavía queda la columna de Organización a la
      vista y el resto de las reglas la miran. En el depósito de archivos no hay
      columna que mirar —el camino es una cadena de texto—, así que **la
      condición es lo único que separa a una Prestadora de otra**. Cuando no la
      nombra, el aislamiento lo está sosteniendo alguna otra cosa, en algún otro
      archivo, y nadie lo dice. Por eso la exención pide dos cosas y no una: el
      motivo, y **qué lo sostiene en su lugar**.

   Las cuentas de cuántas tablas y cuántas funciones hay no se escriben acá: las
   dice el renglón verde al terminar, que sale de contar los archivos. Un número
   escrito a mano en un encabezado queda viejo el día que se agrega una
   migración, y nadie vuelve a leerlo. La regla de la moneda tiene hoy un
   incumplimiento, anotado abajo con su motivo y su pendiente: el chequeo no lo
   tapa, lo deja a la vista y evita que entre uno nuevo.

   Qué NO mira, dicho de frente:
   - No sabe si la migración se aplicó. Un archivo acá describe lo que se quiso
     aplicar, no lo que corre.
   - De las tablas no lee la política, sólo que la RLS esté encendida. Una
     política mal escrita con la RLS encendida pasa igual. Las del depósito de
     archivos sí se leen, y de ellas se mira una sola cosa: si nombran la
     Organización. Que la nombre no quiere decir que la use bien.
   - Un importe se reconoce por el nombre de la columna. Una que se llame de otra
     manera no se detecta; hoy la única del esquema es `caregivers.hourly_rate`.
   - De la clave primaria mira el tipo, no que sea una sola columna. Una clave
     compuesta de dos `uuid` pasaría, y hoy no hay ninguna.
   - De la siembra sigue **un solo salto** de llamadas: la función del disparador,
     y las funciones que ésa nombra. Una cadena de tres no la sigue, y hoy no hay
     ninguna. Tampoco sabe si el disparador siembra lo mismo que sembró la
     migración: sabe que escribe en esa tabla.
   - Una siembra acotada a una Prestadora por su nombre corto no es un barrido y
     no se mira. Es lo que hacen las migraciones de datos ficticios.
=================================================== */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'supabase', 'migrations');

/* Tablas que no llevan columna de Organización, con el motivo escrito al lado.
   Una exención sin motivo es una excepción que nadie va a poder revisar después. */
const SIN_ORGANIZACION = new Map([
  ['tenants',
   'es la Organización: su propio identificador es el que las demás tablas copian']
]);

/* Funciones SECURITY DEFINER que conservan a propósito el permiso del rol
   anónimo, con el motivo escrito. Es la excepción más cara del archivo y por eso
   se nombra una por una: cualquier otra función así es un descuido, y el chequeo
   la tiene que encontrar.

   **Y es la única lista.** `scripts/probar_permisos_en_vivo.mjs` la importa de
   acá en vez de tener la suya: tenía una copia con tres, y cuando las
   migraciones 0035, 0038 y 0041 abrieron tres puertas más —con su motivo
   escrito, acá— aquella prueba se puso en rojo y así se quedó. Una lista
   repetida se despega, y la que se despega es siempre la que nadie mira. */
export const AL_ALCANCE_ANONIMO = new Map([
  ['prestadora_por_slug',
   'la pantalla de ingreso tiene que saber qué nombre y qué colores mostrar antes de que ' +
   'exista ninguna sesión; devuelve una sola Prestadora, la que nombra el argumento, y ' +
   'sólo sus columnas de marca; migración 0021'],
  ['directorio_de',
   'el directorio se ve sin cuenta por decisión del 24 de agosto de 2026, así que la ' +
   'puerta se abre sin sesión o no hay directorio; no devuelve ni una columna que la ' +
   'vista `directorio` no publicara ya, y esa vista no tiene datos de contacto; ' +
   'migración 0021'],
  ['perfil_del_directorio',
   'la misma puerta, para una sola persona; migración 0021'],
  ['zonas_de',
   'quien completa el formulario de reclutamiento todavía no tiene cuenta y necesita ver ' +
   'la lista de zonas para tildar las suyas; exige el nombre corto, así que devuelve las de ' +
   'una sola Prestadora, y sólo el nombre y el orden de cada zona, que es lo mismo que ya ' +
   'muestra el formulario; migración 0035'],
  ['vocabularios_de',
   'las listas de opciones las piden pantallas que se ven sin cuenta —el directorio y el ' +
   'formulario de reclutamiento—, así que la puerta se abre sin sesión o esas pantallas ' +
   'quedan sin opciones; exige el nombre corto, devuelve el catálogo general del producto ' +
   'más lo que agregó esa sola Prestadora, y ninguna de las dos cosas es dato de una ' +
   'persona: son las opciones que la pantalla iba a mostrar igual; migración 0038'],
  ['guias_de',
   'la guía la lee el Asistente en el domicilio, donde la aplicación puede estar mostrando ' +
   'la pantalla antes de resolver la sesión, así que cuelga de la misma puerta que el ' +
   'catálogo del que depende; exige el nombre corto, devuelve la guía general del producto ' +
   'más la que escribió esa sola Prestadora, y sólo las publicadas; ninguna es dato de una ' +
   'persona: son textos sobre una patología, nunca sobre un Paciente; migración 0041']
]);

/* Políticas del depósito de archivos que no nombran la Organización, con el
   motivo **y con qué sostiene el aislamiento en su lugar**. Esa segunda mitad no
   es adorno: una política del depósito que no nombra la Organización siempre
   está apoyada en algo que está en otro archivo, y lo que no se escribe acá no
   se entera nadie el día que ese algo cambie. */
const SIN_ORGANIZACION_EN_EL_DEPOSITO = new Map([
  ['Documentos del legajo, los propios',
   'la condición compara la primera carpeta del camino contra `auth.uid()`, así que ' +
   'cada cuenta llega a la suya y a ninguna otra; no hay dos Organizaciones adentro de ' +
   'esa condición que separar. Lo que las separa está en otro lado: **una cuenta tiene ' +
   'un solo legajo**, por el índice único `idx_caregivers_user_unico` de la migración ' +
   '0005. La política que deja mirar al personal de la Prestadora llega a la carpeta ' +
   'por ese legajo, y si una misma cuenta llegara a tener legajo en dos Prestadoras, ' +
   'las dos verían la carpeta entera, con los papeles que la persona subió para la otra'],
  ['Avatar propio',
   'la misma condición y el mismo apoyo, sobre el depósito `avatares`, que además es ' +
   'público a propósito desde la 0006: la foto es lo que el directorio muestra sin ' +
   'cuenta, así que ahí no hay nada que aislar hacia afuera. Lo que la condición cuida ' +
   'es la escritura: que nadie deje una foto en la carpeta de otro']
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
const CLAVE_APARTE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?"?public"?\."?([a-z_]+)"?[^;]*add\s+constraint[^;]*primary\s+key\s*\(\s*"?([a-z_]+)"?/gi;
const AGREGA_ORGANIZACION =
  /alter\s+table\s+(?:if\s+exists\s+)?"?public"?\."?([a-z_]+)"?[^;]*add\s+column[^;]*\b(?:prestadora_id|tenant_id)\b/gi;
/* Para la sexta. Un `insert` que sale de recorrer `tenants`, el `create trigger`
   colgado de esa misma tabla, y el `rename to` que le cambia el nombre a una
   tabla en el medio —la 0022 renombró justo una de las dos que siembra la 0018,
   y sin esto la sexta regla buscaría un nombre que ya no existe—. */
const INSERTA = /insert\s+into\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi;
const POLITICA_DEPOSITO = /create\s+policy\s+"([^"]+)"\s+on\s+storage\.objects/gi;
const NOMBRA_ORGANIZACION = /prestadora_actual\s*\(\s*\)|\btenant_id\b|\bprestadora_id\b/i;
const ACOTADA = /\bwhere\b[^;]*\b(?:slug|id)\s*=/i;
const DISPARADOR =
  /create\s+(?:or\s+replace\s+)?trigger\s+"?[a-z_]+"?[^;]*\bon\s+(?:"?public"?\.)?"?tenants"?[^;]*\bexecute\s+(?:function|procedure)\s+(?:"?public"?\.)?"?([a-z_]+)"?/gi;
const RENOMBRA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+rename\s+to\s+"?([a-z_]+)"?/gi;
/* Para `columnasDeclaradas`: las tres cosas que le pasan a una columna despues
   de nacer. */
const AGREGA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?([a-z_]+)"?/gi;
const SACA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+drop\s+column\s+(?:if\s+exists\s+)?"?([a-z_]+)"?/gi;
const RENOMBRA_COLUMNA =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:"?public"?\.)?"?([a-z_]+)"?\s+rename\s+column\s+"?([a-z_]+)"?\s+to\s+"?([a-z_]+)"?/gi;

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

/** El tipo declarado de cada columna del cuerpo de un `create table`. */
function tiposDeColumna(cuerpo) {
  const salida = new Map();
  for (const linea of cuerpo.split('\n')) {
    const l = linea.trim().replace(/,$/, '');
    if (!l || NO_ES_COLUMNA.test(l)) continue;
    const partes = l.split(/\s+/);
    salida.set(partes[0].replace(/"/g, '').toLowerCase(),
      (partes[1] || '').replace(/"/g, '').replace(/\(.*/, '').toLowerCase());
  }
  return salida;
}

/**
 * La clave primaria de cada tabla: `tabla → [columna, tipo]`. Se busca en las
 * tres formas en que Postgres deja declararla, porque el esquema usa dos: al
 * lado de la columna (`id uuid primary key`), como restricción del cuerpo
 * (`primary key ("id")`) y en un `alter table` aparte, que es como salen las
 * siete tablas de la 0001.
 */
export function clavesPrimarias(textos) {
  const columna = new Map();
  const tipos = new Map();
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    for (const m of t.matchAll(TABLA)) {
      const tabla = m[1].toLowerCase();
      const cuerpo = entreParentesis(t, m.index);
      tipos.set(tabla, tiposDeColumna(cuerpo));
      for (const linea of cuerpo.split('\n')) {
        const l = linea.trim();
        if (!/primary\s+key/i.test(l)) continue;
        const conParentesis = l.match(/primary\s+key\s*\(\s*"?([a-z_]+)"?/i);
        const nombre = conParentesis ? conParentesis[1] : l.split(/\s+/)[0];
        columna.set(tabla, nombre.replace(/"/g, '').toLowerCase());
      }
    }
    for (const m of t.matchAll(CLAVE_APARTE)) {
      columna.set(m[1].toLowerCase(), m[2].toLowerCase());
    }
  }
  const salida = new Map();
  for (const [tabla, nombre] of columna) {
    salida.set(tabla, [nombre, (tipos.get(tabla) || new Map()).get(nombre) || '']);
  }
  return salida;
}

/**
 * Las columnas que hoy tiene cada tabla: `tabla → Set(columnas)`. Se sigue el
 * orden de las migraciones y se aplica lo que cada una hace, porque una columna
 * no es sólo lo que dice el `create table`: puede agregarse, renombrarse o
 * sacarse después, y la tabla entera puede cambiar de nombre en el medio.
 *
 * No la usa este chequeo: la usa la octava regla de `scripts/verificar_red.mjs`,
 * que se planta cuando una exención nombra una columna que ya no existe. Vive
 * acá porque acá está el punto único de verdad de cómo se leen las migraciones,
 * y una segunda copia de esta lectura se despega de ésta el primer día.
 *
 * **Se sacan los comentarios de renglones enteros antes de mirar**, y no es
 * cautela de más: la 0016 escribió `alter table public.avisos drop column
 * grid_schedule_7x3;` adentro de un comentario, justamente para explicar lo que
 * esa migración **no** hacía. Leído sin sacarlos, el esquema pierde una columna
 * que está.
 */
export function columnasDeclaradas(textos) {
  const columnas = new Map();
  const poner = (tabla, columna) => {
    if (!columnas.has(tabla)) columnas.set(tabla, new Set());
    columnas.get(tabla).add(columna);
  };
  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n').replace(/^[ \t]*--.*$/gm, '');
    for (const m of t.matchAll(TABLA)) {
      const tabla = m[1].toLowerCase();
      for (const nombre of tiposDeColumna(entreParentesis(t, m.index)).keys()) {
        poner(tabla, nombre);
      }
    }
    for (const m of t.matchAll(AGREGA_COLUMNA)) poner(m[1].toLowerCase(), m[2].toLowerCase());
    for (const m of t.matchAll(RENOMBRA_COLUMNA)) {
      const suyas = columnas.get(m[1].toLowerCase());
      if (!suyas) continue;
      suyas.delete(m[2].toLowerCase());
      suyas.add(m[3].toLowerCase());
    }
    for (const m of t.matchAll(SACA_COLUMNA)) {
      const suyas = columnas.get(m[1].toLowerCase());
      if (suyas) suyas.delete(m[2].toLowerCase());
    }
    for (const m of t.matchAll(RENOMBRA)) {
      const antes = m[1].toLowerCase();
      const despues = m[2].toLowerCase();
      if (!columnas.has(antes)) continue;
      columnas.set(despues, columnas.get(antes));
      columnas.delete(antes);
    }
  }
  return columnas;
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

/** El nombre que tiene hoy una tabla que en el camino se renombró. */
function nombreDeHoy(tabla, renombres) {
  let nombre = tabla;
  for (let vueltas = 0; vueltas < 10 && renombres.has(nombre); vueltas++) {
    nombre = renombres.get(nombre);
  }
  return nombre;
}

/**
 * Lo que ya se sigue solo: las tablas donde escribe algún disparador colgado de
 * `tenants`, y el nombre de hoy de cada tabla que en el camino se renombró. Lo
 * segundo hace falta de verdad: la 0022 le cambió el nombre justo a una de las
 * dos tablas que siembra la 0018, y sin esto la sexta regla buscaría un nombre
 * que ya no existe y avisaría de una tabla que sí está cubierta.
 *
 * Se sigue **un solo salto** de llamadas: la función que el disparador ejecuta,
 * y las que ésa nombra. Con eso alcanza para la 0046, donde el disparador no
 * siembra él mismo sino que llama a la que sabe cuál es la configuración de
 * fábrica —que es como tiene que ser, porque esa misma función la usa también el
 * arreglo de las Prestadoras que ya habían nacido sin ella—.
 */
export function siembraQueSeSigueSola(textos) {
  const nombreActual = new Map();
  const cuerpos = new Map();
  const deDisparador = new Set();

  for (const texto of textos) {
    const t = texto.replace(/\r\n/g, '\n');
    const bajo = t.toLowerCase();
    for (const m of t.matchAll(RENOMBRA)) {
      nombreActual.set(m[1].toLowerCase(), m[2].toLowerCase());
    }
    for (const m of t.matchAll(FUNCION)) {
      const fin = bajo.indexOf('$$;', m.index);
      cuerpos.set(m[1].toLowerCase(), bajo.slice(m.index, fin > 0 ? fin : bajo.length));
    }
    for (const m of t.matchAll(DISPARADOR)) deDisparador.add(m[1].toLowerCase());
  }

  const alcance = new Set(deDisparador);
  for (const nombre of deDisparador) {
    const cuerpo = cuerpos.get(nombre) || '';
    for (const otra of cuerpos.keys()) {
      if (otra !== nombre && new RegExp('\\b' + otra + '\\s*\\(').test(cuerpo)) alcance.add(otra);
    }
  }

  const cubiertas = new Set();
  for (const nombre of alcance) {
    for (const m of (cuerpos.get(nombre) || '').matchAll(INSERTA)) {
      cubiertas.add(nombreDeHoy(m[1].toLowerCase(), nombreActual));
    }
  }
  return { cubiertas, nombreActual };
}

/**
 * Lo que incumple una migración. Devuelve `[renglón, qué pasa]` por cada cosa.
 * `conColumna` son las tablas que reciben su columna de Organización en alguna
 * migración, `claves` las claves primarias de todas, y `sigue` lo que ya atiende
 * un disparador: ninguna de las tres cosas está obligada a estar en esta
 * migración. Sin esos datos se mira sólo este texto.
 */
export function fallasDeUnaMigracion(texto, conColumna, claves, sigue) {
  const t = texto.replace(/\r\n/g, '\n');
  const bajo = t.toLowerCase();
  const tienen = conColumna || conOrganizacion([t]);
  const primarias = claves || clavesPrimarias([t]);
  const siembra = sigue || siembraQueSeSigueSola([t]);
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

    /* 5. La clave primaria es un UUID, esté declarada donde esté. */
    const clave = primarias.get(tabla);
    if (!clave) {
      fallas.push([renglon,
        '`' + tabla + '` no declara clave primaria en ninguna migración']);
    } else if (clave[1] !== 'uuid') {
      fallas.push([renglon,
        '`' + tabla + '.' + clave[0] + '` es la clave primaria y no es `uuid`: es `' +
        (clave[1] || 'de un tipo que no se pudo leer') + '`']);
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
    const exenta = AL_ALCANCE_ANONIMO.has(funcion);
    const faltan = (exenta ? ['public'] : ['public', 'anon']).filter((quien) =>
      !new RegExp('\\b' + quien + '\\b').test(revocado));
    if (faltan.length > 0) {
      fallas.push([renglonDe(t, m.index),
        '`' + funcion + '()` es SECURITY DEFINER y no le revoca el permiso a ' +
        faltan.join(' ni a ')]);
    }
  }

  /* 6. La siembra que recorre las Prestadoras de hoy deja algo puesto para las
     de mañana. Los renglones comentados se tapan con espacios y no se borran:
     así el renglón que se informa sigue siendo el del archivo. */
  const sinComentarios = t.split('\n')
    .map((l) => (/^\s*--/.test(l) ? ' '.repeat(l.length) : l)).join('\n');
  for (const m of sinComentarios.matchAll(INSERTA)) {
    const corte = sinComentarios.indexOf(';', m.index);
    const sentencia = sinComentarios.slice(m.index, corte > 0 ? corte : sinComentarios.length);
    if (!/from\s+(?:"?public"?\.)?"?tenants"?\b/i.test(sentencia)) continue;
    if (ACOTADA.test(sentencia)) continue;
    const tabla = nombreDeHoy(m[1].toLowerCase(), siembra.nombreActual);
    if (siembra.cubiertas.has(tabla)) continue;
    fallas.push([renglonDe(t, m.index),
      '`' + tabla + '` se siembra recorriendo las Prestadoras que existen hoy, y ningún ' +
      'disparador sobre `tenants` la escribe: la que nazca mañana arranca sin eso']);
  }

  /* 7. La política del depósito de archivos nombra la Organización. */
  for (const m of sinComentarios.matchAll(POLITICA_DEPOSITO)) {
    const nombre = m[1];
    const corte = sinComentarios.indexOf(';', m.index);
    const cuerpo = sinComentarios.slice(m.index, corte > 0 ? corte : sinComentarios.length);
    if (NOMBRA_ORGANIZACION.test(cuerpo)) continue;
    if (SIN_ORGANIZACION_EN_EL_DEPOSITO.has(nombre)) continue;
    fallas.push([renglonDe(t, m.index),
      'la política «' + nombre + '» del depósito de archivos no nombra la ' +
      'Organización, y en el depósito no hay columna que la nombre por ella']);
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

/* Para la sexta. La siembra que recorre todas las Prestadoras, el disparador que
   la atiende de ahí en más, y el mismo disparador llamando a otra función, que es
   como está escrita la 0046. */
const BARRIDO = 'insert into public.visitas (tenant_id)\n' +
  'select id from public.tenants\non conflict do nothing;\n';
const SIEMBRA_DIRECTA =
  'create function public.al_nacer() returns trigger language plpgsql as $$\n' +
  'begin\n  insert into public.visitas (tenant_id) values (new.id);\n' +
  '  return null;\nend;\n$$;\n' +
  'create trigger al_nacer after insert on public.tenants\n' +
  '  for each row execute function public.al_nacer();\n';
const SIEMBRA_LLAMADA =
  'create function public.de_fabrica(p uuid) returns void language plpgsql as $$\n' +
  'begin\n  insert into public.visitas (tenant_id) values (p);\nend;\n$$;\n' +
  'create function public.al_nacer() returns trigger language plpgsql as $$\n' +
  'begin\n  perform public.de_fabrica(new.id);\n  return null;\nend;\n$$;\n' +
  'create trigger al_nacer after insert on public.tenants\n' +
  '  for each row execute function public.al_nacer();\n';

/* Una política del depósito, con y sin la Organización adentro. */
const DEPOSITO = (condicion) =>
  'create policy "Papeles de cualquiera" on storage.objects\n' +
  '  for select to authenticated\n  using (\n    ' + condicion + '\n  );\n';

const MAL = [
  ['una política del depósito que no nombra la Organización',
   DEPOSITO("bucket_id = 'papeles'")],
  ['una tabla que se crea sin encender su RLS',
   CREA],
  ['una tabla sin columna de Organización',
   'create table if not exists public.visitas (\n  id uuid primary key\n);\n' + RLS],
  ['un importe sin moneda',
   'create table if not exists public.visitas (\n  id uuid primary key,\n' +
   '  prestadora_id uuid not null,\n  precio_hora numeric not null\n);\n' + RLS],
  ['una clave primaria que no es uuid',
   'create table if not exists public.visitas (\n  id serial primary key,\n' +
   '  prestadora_id uuid not null\n);\n' + RLS],
  ['una tabla que no declara clave primaria en ningún lado',
   'create table if not exists public.visitas (\n  id uuid not null,\n' +
   '  prestadora_id uuid not null\n);\n' + RLS],
  ['una función SECURITY DEFINER que no revoca nada',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\n'],
  ['una función SECURITY DEFINER que sólo le revoca a PUBLIC',
   'create function public.mirar() returns boolean language sql security definer as $$\n' +
   '  select true;\n$$;\nrevoke all on function public.mirar() from public;\n'],
  ['una siembra que recorre las Prestadoras de hoy y no deja nada para las de mañana',
   BARRIDO],
  ['la misma siembra con un disparador colgado de otra tabla',
   BARRIDO + SIEMBRA_DIRECTA.replace('on public.tenants', 'on public.caregivers')],
  ['un disparador sobre `tenants` que escribe en otra tabla que la sembrada',
   BARRIDO + SIEMBRA_DIRECTA.replace('into public.visitas', 'into public.otras')]
];

const BIEN = [
  ['una política del depósito que sí la nombra',
   DEPOSITO("bucket_id = 'papeles' and tenant_id = public.prestadora_actual()")],
  ['la misma política nombrada adentro de un comentario, que no cuenta',
   '-- create policy "Papeles de cualquiera" on storage.objects using (true);\nselect 1;\n'],
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
  ['la clave primaria declarada en un `alter table` aparte, como en la 0001',
   'create table if not exists public.visitas (\n  "id" uuid not null,\n' +
   '  prestadora_id uuid not null\n);\n' +
   'alter table only public.visitas add constraint visitas_pkey primary key ("id");\n' +
   RLS],
  ['la clave primaria escrita como restricción del cuerpo',
   'create table if not exists public.visitas (\n  id uuid not null,\n' +
   '  prestadora_id uuid not null,\n  primary key (id)\n);\n' + RLS],
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
   '  cantidad numeric(10,2),\n  prestadora_id uuid not null\n);\n' + RLS],
  ['la siembra que además deja el disparador que la sigue',
   BARRIDO + SIEMBRA_DIRECTA],
  ['la misma, con el disparador llamando a otra función, como la 0046',
   BARRIDO + SIEMBRA_LLAMADA],
  ['la siembra acotada a una Prestadora, que no es un barrido',
   "insert into public.visitas (tenant_id)\nselect id from public.tenants where slug = 'presdemo';\n"],
  ['la siembra de una tabla que después se renombró',
   'insert into public.pesos (tenant_id)\nselect id from public.tenants;\n' +
   'alter table public.pesos rename to visitas;\n' + SIEMBRA_DIRECTA],
  ['un `insert` que nombra `tenants` adentro de un comentario',
   '-- insert into public.visitas select id from public.tenants;\n' +
   'select 1;\n']
];

/* De acá para abajo está la verificación. De acá para arriba está la regla que
   reconoce una tabla con datos de una Prestadora, que además le presta
   `scripts/barrer_aislamiento.mjs`. Por eso el cuerpo va adentro de esta
   pregunta: cuando alguien importa este archivo para usar la regla, la
   verificación no tiene que correr ni imprimir nada. Cuando se lo corre a él,
   corre entera. */
const ME_CORRIERON_A_MI = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (ME_CORRIERON_A_MI) {
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
  let siembras = 0;
  let politicas = 0;
  const migraciones = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort();
  seRevisaron(migraciones.length, 'una sola migración `.sql` para revisar');
  const textos = migraciones.map((n) => readFileSync(join(carpeta, n), 'utf8'));

  /* Primero se leen las quince juntas: una tabla puede recibir su columna de
     Organización en una migración posterior a la que la crea, y juzgando archivo
     por archivo se avisaría de tres que están bien. */
  const tienenColumna = conOrganizacion(textos);

  /* Lo mismo con la clave primaria: las siete tablas de la 0001 la declaran en un
     `alter table` que está más abajo en el mismo archivo, y otra migración podría
     declararla en otro. Se buscan todas antes de juzgar ninguna. */
  const primarias = clavesPrimarias(textos);

  /* Y lo mismo con el disparador: la siembra está en la 0018 y el disparador que
     la sigue, en la 0046. Juzgando archivo por archivo, la 0018 saldría en rojo
     para siempre por algo que ya está arreglado. */
  const sigue = siembraQueSeSigueSola(textos);

  for (const [i, nombre] of migraciones.entries()) {
    const texto = textos[i];
    tablas += [...texto.matchAll(TABLA)].length;
    for (const m of texto.matchAll(FUNCION)) {
      const fin = texto.toLowerCase().indexOf('$$;', m.index);
      if (/security\s+definer/i.test(
        texto.slice(m.index, fin > 0 ? fin : texto.length))) funciones++;
    }
    politicas += [...texto.matchAll(POLITICA_DEPOSITO)].length;
    for (const m of texto.matchAll(INSERTA)) {
      const corte = texto.indexOf(';', m.index);
      const sentencia = texto.slice(m.index, corte > 0 ? corte : texto.length);
      if (/from\s+(?:"?public"?\.)?"?tenants"?\b/i.test(sentencia) && !ACOTADA.test(sentencia)) {
        siembras++;
      }
    }
    for (const [renglon, motivo] of
      fallasDeUnaMigracion(texto, tienenColumna, primarias, sigue)) {
      fallas.push(`supabase/migrations/${nombre}:${renglon}  ${motivo}`);
    }
  }

  if (fallas.length > 0) {
    console.error('Migraciones que incumplen una regla del esquema:\n');
    for (const falla of fallas) console.error('  - ' + falla);
    console.error(
      `\n${fallas.length} ${fallas.length === 1 ? 'incumplimiento' : 'incumplimientos'}. ` +
      'Las siete reglas están en el encabezado de este archivo, con el porqué de cada\n' +
      'una. La RLS y la revocación van en la misma migración que crea la tabla o la\n' +
      'función, nunca en una posterior y nunca a mano desde el panel de Supabase; la\n' +
      'columna de Organización, la clave primaria y la moneda pueden llegar después,\n' +
      'pero tienen que llegar, y la clave tiene que ser `uuid`.\n' +
      'Y una siembra que recorre las Prestadoras de hoy deja un disparador sobre\n' +
      '`tenants`, en ésta o en otra migración, o la que nazca mañana arranca sin eso.\n' +
      'Y toda política del depósito de archivos nombra la Organización, porque ahí\n' +
      'no hay columna que la nombre por ella.\n' +
      'Si un caso no puede cumplirla, va a SIN_ORGANIZACION, a SIN_MONEDA, a\n' +
      'AL_ALCANCE_ANONIMO o a SIN_ORGANIZACION_EN_EL_DEPOSITO de este mismo\n' +
      'archivo, con el motivo escrito y el pendiente que lo sigue.');
    process.exit(1);
  }

  const conOrg = politicas - SIN_ORGANIZACION_EN_EL_DEPOSITO.size;
  console.log(
    `Esquema verificado: ${tablas} tablas con su RLS encendida donde se crean, su ` +
    `columna de Organización y clave primaria \`uuid\`, y ${funciones} funciones ` +
    `SECURITY DEFINER, ${AL_ALCANCE_ANONIMO.size} de ellas al alcance anónimo a ` +
    'propósito y las demás fuera de él ' +
    `(${SIN_ORGANIZACION.size} tabla y ${SIN_MONEDA.size} importe exentos, con su motivo). ` +
    `Las ${siembras} siembras que recorren las Prestadoras dejan además un disparador ` +
    'sobre `tenants`, así que la que nazca mañana nace igual que las de hoy. ' +
    `Y de las ${politicas} políticas del depósito de archivos, ${conOrg} ` +
    `${conOrg === 1 ? 'nombra' : 'nombran'} la Organización y ` +
    `${SIN_ORGANIZACION_EN_EL_DEPOSITO.size} están exentas con el motivo y con qué ` +
    'sostiene el aislamiento en su lugar.');
}
