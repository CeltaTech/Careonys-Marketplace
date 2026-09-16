/* ===================================================
   LAS GUÍAS DE CUIDADO NO SE ABREN NI SE PUBLICAN SOLAS

       node scripts/verificar_guias.mjs

   Una Guía de cuidado es lo que el Asistente lee al entrar a un domicilio: qué
   es la patología, qué se ve en la casa, qué señales obligan a avisar y cómo
   actuar en una emergencia. Vive en `guias_cuidado` —que hoy nace en
   `supabase/migrations/0001_base_del_esquema.sql:2590`— y
   sale por `guias_de`, que es una puerta: exige el nombre corto de una
   Prestadora y devuelve el catálogo general más lo que agregó esa Prestadora,
   donde **lo suyo reemplaza a lo general**.

   Este chequeo cuida tres cosas distintas, y conviene no confundirlas:

     1. **Que la tabla siga cerrada.** Un texto sobre cómo cuidar a los
        Pacientes de una empresa no puede leerse desde otra, y nada de esto se
        alcanza sin sesión más que por la puerta.
     2. **Que nada se publique sin firma.** La base exige que una guía
        publicada diga quién la revisó y cuándo. Es una línea de
        responsabilidad, no una formalidad: lo que se muestra sin firma es una
        indicación que nadie respalda.
     3. **Que la guía general esté en los tres idiomas.** Lo que escribe el
        producto va en `es-AR`, `en` y `pt-BR`; lo que escribe una Prestadora va
        en el idioma de ella, y por eso se mide distinto.

   Mira dos clases de cosa, y son distintas a propósito:

     A. **Lo que se comprueba siempre**, con base o sin ella: que ninguna
        migración le haya abierto la tabla a `anon`, que las restricciones que
        exigen los tres idiomas y el revisor sigan escritas, y que la puerta
        conserve sus permisos. Falla sin conexión.

     B. **Lo que sólo se puede comprobar con la base delante**: que la puerta
        conteste, que la tabla **no** conteste, y que pidiendo con el nombre de
        una Prestadora no aparezca texto de otra.

        Se les pregunta a las dos, y prueban cosas distintas: la de esta
        máquina dice si la migración está bien escrita, y la de verdad dice si
        además está aplicada donde entran las pantallas. Cada una puede quedar
        en tres estados, y son tres cosas distintas que no se confunden: no
        contestó, contestó pero no tiene la migración, o contestó y se probó.
        **En los dos primeros casos esto no pasa: queda sin hacer**, y el
        último renglón lo dice con todas las letras, porque es el único que se
        ve cuando el chequeo pasa. Un chequeo que se saltea callado es peor que
        no tenerlo, porque además tranquiliza.

   **Qué no falla, y por qué.** Que falten guías no es un defecto: hoy no hay
   ninguna redactada y eso está anotado en `docs/PENDIENTES.md` como pendiente
   104, junto con la razón —ninguna se publica sin que un profesional la firme—.
   La cobertura se informa en números, no rompe la construcción. Hacer fallar el
   gancho por trabajo ya registrado convierte el gancho en ruido, y un gancho
   que molesta se apaga.

   **Y el aislamiento, si no se pudo probar, se dice.** Hacen falta dos
   Prestadoras con guía propia cargada. Mientras no las haya, ese punto no probó
   nada, y con cero guías cargadas cualquier comparación da «no se cruzó»
   exactamente igual que si estuviera bien.

   No muestra ninguna clave: usa la publicable, la misma que ya viaja al
   navegador, y de la dirección imprime solo el nombre del servidor.
=================================================== */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { archivos, seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const aRuta = (r) => join(raiz, r);
const IDIOMAS = ['es-AR', 'en', 'pt-BR'];
const PARTES = ['descripcion', 'que_esperar', 'senales_de_alarma', 'en_emergencia'];

const problemas = [];
let mirados = 0;

// ── A. Lo que se comprueba siempre: las migraciones ────────────────────────

const migraciones = archivos(aRuta('supabase/migrations'), ['.sql'])
  .sort()
  .map((camino) => ({ camino, nombre: camino.split(/[\\/]/).pop(), texto: readFileSync(camino, 'utf8') }));

seRevisaron(migraciones.length, 'una sola migración en supabase/migrations');

/* Los nombres cortos de las Prestadoras inventadas. **No se pueden pedir a la
   base**: no existe forma de listar Prestadoras sin sesión, y ésa es justamente
   la propiedad que se quiere conservar. Pero sí están escritos en la siembra,
   que este chequeo ya lee entera, así que salen de ahí en vez de escribirse a
   mano acá: la lista a mano conocía dos, y la siembra carga tres desde que se
   agregó la tercera, así que el aislamiento se probaba sobre dos tercios de las
   que existen y nada lo decía. Se toma el segundo valor de cada fila, que es el
   nombre corto. */
const NOMBRES_CORTOS = [...new Set(
  migraciones.flatMap((m) => sentenciasDe(m.texto, 'tenants').map((s) => textosDe(s)[1]))
)].filter(Boolean);
seRevisaron(NOMBRES_CORTOS.length, 'ninguna Prestadora de ejemplo escrita en la siembra');

const laQueCrea = migraciones.find((m) => /create table[^;]*guias_cuidado/is.test(m.texto));
if (!laQueCrea) {
  problemas.push('Ninguna migración crea `guias_cuidado`. O se borró, o cambió de nombre y este chequeo quedó viejo.');
} else {
  mirados++;

  /* Las cuatro garantías que la tabla trae escritas. Se buscan por lo que hacen
     y no por el número de migración, para que sigan valiendo si alguna vez se
     rehace la tabla en otro archivo. */
  const garantias = [
    [/i18n_lista_completa/, 'la restricción que exige las listas en los tres idiomas para lo general'],
    [/i18n_completo/, 'la restricción que exige el texto en los tres idiomas para lo general'],
    [/revisada_por[\s\S]{0,400}?revisada_el/, 'la restricción que obliga a decir quién revisó una guía publicada'],
    [/create unique index[^;]*guias_cuidado[^;]*tenant_id is null/is, 'el índice que impide dos guías generales para la misma opción']
  ];
  for (const [patron, que] of garantias) {
    mirados++;
    if (!patron.test(laQueCrea.texto)) {
      problemas.push(`En \`${laQueCrea.nombre}\` no aparece ${que}.`);
    }
  }
}

/* Nadie le abre la tabla a quien no inició sesión. Esto sí puede fallar por una
   migración posterior, que es exactamente lo que se quiere atrapar. */
for (const m of migraciones) {
  mirados++;
  const abre = /grant[^;]{0,200}\bon\b[^;]{0,120}guias_cuidado[^;]{0,200}\banon\b/is;
  if (abre.test(m.texto)) {
    problemas.push(`\`${m.nombre}\` le concede permiso sobre \`guias_cuidado\` a \`anon\`. ` +
      'La tabla no se toca sin sesión; sin sesión se pasa por `guias_de`.');
  }
  const afloja = /drop\s+constraint[^;]*(la_publicada_dice_quien_la_reviso|estan_en_los_idiomas)/is;
  if (afloja.test(m.texto)) {
    problemas.push(`\`${m.nombre}\` borra una de las restricciones de la guía. ` +
      'Si es a propósito hay que decirlo acá, porque son las que sostienen la firma y los tres idiomas.');
  }
}

/* La puerta: revocada a `public` y concedida a `anon`, como las otras tres. */
const laDeLaPuerta = migraciones.find((m) => /create (or replace )?function[^;]*guias_de/is.test(m.texto));
if (!laDeLaPuerta) {
  problemas.push('Ninguna migración crea la puerta `guias_de`.');
} else {
  mirados += 2;
  if (!/revoke[^;]*guias_de\s*\([^)]*\btext\b[^)]*\)[^;]*from[^;]*public/is.test(laDeLaPuerta.texto)) {
    problemas.push(`\`${laDeLaPuerta.nombre}\` no le revoca \`public\` a \`guias_de\`. ` +
      'Una función que saltea la protección por fila queda al alcance de cualquiera si no se revoca.');
  }
  /* `grant execute` y `grant all` conceden lo mismo sobre una función, y el
     argumento puede venir con su nombre delante del tipo —`p_slug text`—,
     que es como lo escribe un volcado. Las dos formas dicen lo mismo. */
  if (!/grant\s+(?:execute|all)\s+on\s+function[^;]*guias_de\s*\([^)]*\btext\b[^)]*\)[^;]*to[^;]*anon/is.test(laDeLaPuerta.texto)) {
    problemas.push(`\`${laDeLaPuerta.nombre}\` no le concede \`guias_de\` a \`anon\`, y las pantallas que la ` +
      'necesitan pueden estar mostrándose sin sesión.');
  }
}

/* Ninguna guía lleva un número de emergencia, de ningún país.

   La regla eran dos prohibiciones dichas juntas —ningún tratamiento y ningún
   número de emergencia— y una sola sobrevivió: la primera estaba además escrita
   en el comentario de la tabla, y la segunda vivía nada más que en el
   encabezado de la migración que cargó las diecinueve guías, así que se fue con
   el aplastamiento. Volvió al comentario de la tabla y al de la columna donde
   se escribe cómo actuar, y esto es lo que la hace algo más que una buena
   intención.

   El motivo: **el número cambia por país**, y escribirlo adentro de una guía lo
   convierte en dato del producto en vez de dato de la Prestadora, que es la que
   sabe dónde opera. Además una guía que dice «llame al 107» es incorrecta para
   quien la lee en otro lado, y no lo parece.

   Se mira el texto de las guías donde vive escrito —las migraciones que las
   cargan y la copia sin conexión que viaja al teléfono— por dos caminos
   distintos, porque uno solo deja pasar la mitad:

     1. Un verbo de llamar cerca de dos a cuatro cifras sueltas: «llame al 107»,
        «call 911», «ligue para o 192». Atrapa cualquier país, incluidos los que
        esta lista no conoce.
     2. Los números de emergencia más usados, sueltos, aunque no haya verbo
        cerca. Atrapa la lista pelada al final de un paso.

   Y no se juzga cualquier cifra: «espere 10 minutos» o «cada 2 horas» son
   contenido legítimo y por eso la primera forma exige el verbo y la segunda una
   lista cerrada. */
const LLAMAR = /(llam\w*|marc\w*|disc\w*|telefon\w*|comunic\w*|call\w*|dial\w*|phone|ligu\w*|liga\w*)\W{1,12}(?:al?|ao?|to|the|o|a)?\W{0,6}\b(\d{2,4})\b/giu;
const NUMEROS_DE_EMERGENCIA = ['911', '112', '107', '106', '105', '100', '128', '131', '132', '133',
  '135', '137', '192', '190', '193', '999', '998', '995', '000', '110', '119', '120', '122', '123'];
const SUELTO = new RegExp('(?<![\\d.,:/-])(' + NUMEROS_DE_EMERGENCIA.join('|') + ')(?![\\d.,:/%-])', 'g');

/* Un identificador no es texto de guía, y está lleno de cifras: el `135` de un
   `6c135de2-…` no es el número de bomberos de nadie. Se sacan antes de mirar,
   porque si no los tres primeros hallazgos son todos falsos —lo fueron—. */
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Dónde termina de verdad la sentencia que empieza en `desde`.
 *
 *  Antes esto era `[^;]*;`, y una guía está llena de punto y coma: el texto de
 *  una sola de ellas los tiene adentro de la prosa, y ahí se cortaba la lectura.
 *  Seis de las guías sembradas quedaban partidas, y cuatro de ellas perdían
 *  todo menos la primera parte. **La parte que se perdía siempre era la
 *  última**, que es `en_emergencia` —justo la que esta regla existe para
 *  vigilar, porque es la que podría terminar diciendo a qué número llamar—.
 *
 *  Un punto y coma sólo cierra la sentencia cuando está **afuera** de un texto
 *  entre comillas simples, y dos comillas seguidas adentro de un texto son una
 *  comilla escrita, no el final. Eso es todo lo que hay que saber de SQL para
 *  leer esto bien, y escrito así no depende de cómo esté redactada la prosa. */
export function finDeSentencia(texto, desde) {
  let i = desde;
  let enTexto = false;
  while (i < texto.length) {
    const letra = texto[i];
    if (enTexto) {
      if (letra === "'") {
        if (texto[i + 1] === "'") i++;
        else enTexto = false;
      }
    } else if (letra === "'") enTexto = true;
    else if (letra === ';') return i + 1;
    i++;
  }
  return texto.length;
}

/** Las sentencias que cargan filas en una tabla, enteras. */
export function sentenciasDe(texto, tabla) {
  const arranca = new RegExp(
    String.raw`insert\s+into\s+public\.` + tabla + String.raw`\b`, 'gi');
  const sentencias = [];
  for (const inicio of texto.matchAll(arranca)) {
    sentencias.push(texto.slice(inicio.index, finDeSentencia(texto, inicio.index)));
  }
  return sentencias;
}

/** Las sentencias que cargan guías, enteras. */
export const sentenciasDeGuia = (texto) => sentenciasDe(texto, 'guias_cuidado');

/** Los textos entre comillas simples de una sentencia, ya desescapados. */
export function textosDe(sentencia) {
  return [...sentencia.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].split("''").join("'"));
}

/** Los textos de guía que están escritos en el repositorio, con su origen.
 *  De la migración se toman sólo los textos por idioma —lo que va entre llaves—
 *  y no la fila entera, que además lleva identificadores y fechas. */
function textosDeGuia() {
  const fuentes = [];
  for (const m of migraciones) {
    for (const fila of sentenciasDeGuia(m.texto)) {
      const soloTexto = [...fila.matchAll(/'(\{[\s\S]*?\})'/g)].map((j) => j[1]).join('\n');
      fuentes.push({ donde: m.nombre, texto: soloTexto });
    }
  }
  for (const copia of ['data/catalogo-guias.json',
    'pwa-asistente/data/catalogo-guias.json', 'pwa-familia/data/catalogo-guias.json']) {
    try { fuentes.push({ donde: copia, texto: readFileSync(aRuta(copia), 'utf8') }); }
    catch { /* que falte una copia lo dice el chequeo de la copia sin conexión */ }
  }
  return fuentes;
}

/** Los números de emergencia que aparecen escritos en un texto de guía. */
export function numerosDeEmergenciaEn(crudo) {
  const texto = String(crudo).replace(UUID, ' ');
  const hallados = new Set();
  for (const m of texto.matchAll(LLAMAR)) hallados.add(m[0].replace(/\s+/g, ' ').trim());
  for (const m of texto.matchAll(SUELTO)) hallados.add(m[1]);
  return [...hallados];
}

/** El reclamo, escrito en un solo lugar porque lo usan los dos recorridos: el
 *  de lo que está escrito en el repositorio y el de lo que devuelve la base. */
function reclamoPorNumero(donde, hallados) {
  return `En \`${donde}\` una guía escribe un número de emergencia: ` +
    hallados.slice(0, 4).map((h) => `«${h}»`).join(', ') + '. ' +
    'Las guías dicen qué hacer, nunca a qué número llamar: el número cambia por país, ' +
    'así que es dato de la Prestadora y no del producto.';
}

/* ── Las pruebas del propio detector, antes de mirar nada ──────────────────
   Una prueba que no puede fallar no prueba nada. La segunda fila es el defecto
   que se arregló acá: una guía cuyo texto lleva un punto y coma adentro, que es
   como están escritas seis de las sembradas.

   El número esperado cuenta **hallazgos**, no números: «llame al 107» lo
   encuentran los dos caminos —el del verbo y el de la lista cerrada— y son dos
   hallazgos del mismo número. Se cuenta así a propósito, para que la prueba se
   plante también si se apaga uno solo de los dos caminos. */
const PRUEBAS = [
  ['una guía sin ningún número',
    "insert into public.guias_cuidado values ('{\"es-AR\": \"Acompañe y espere 10 minutos\"}');", 0],
  ['un número escondido después de un punto y coma de la prosa',
    "insert into public.guias_cuidado values ('{\"en\": \"Stay close; there may be checks\"}', '{\"es-AR\": \"Llame al 107\"}');", 2],
  ['una comilla escrita adentro del texto',
    "insert into public.guias_cuidado values ('{\"es-AR\": \"la Familia''s; llame al 911\"}');", 2],
  ['una lista pelada al final de un paso',
    "insert into public.guias_cuidado values ('{\"pt-BR\": \"Procure ajuda. 192\"}');", 1]
];
for (const [que, sql, esperados] of PRUEBAS) {
  const encontrados = sentenciasDeGuia(sql)
    .flatMap((s) => numerosDeEmergenciaEn([...s.matchAll(/'(\{[\s\S]*?\})'/g)].map((j) => j[1]).join('\n')));
  if (encontrados.length !== esperados) {
    console.error(
      `El detector de este chequeo está roto: con ${que} encontró ${encontrados.length} ` +
      `número(s) y tenía que encontrar ${esperados}. No se revisó nada.`
    );
    process.exit(1);
  }
}

for (const { donde, texto: crudo } of textosDeGuia()) {
  mirados++;
  const hallados = numerosDeEmergenciaEn(crudo);
  if (hallados.length) problemas.push(reclamoPorNumero(donde, hallados));
}

// ── B. Lo que sólo se comprueba con la base delante ────────────────────────

/* Se le pregunta a las dos bases, y no es lo mismo lo que prueba cada una: la
   de esta máquina dice si la migración está bien escrita, y la de verdad dice
   si además está aplicada donde entran las pantallas. Preguntarle sólo a una
   deja la mitad sin mirar, y las dos mitades fallan por motivos distintos. */

/** La de esta máquina, si el entorno local está levantado. */
function laLocal() {
  try {
    /* `shell: true` porque en Windows la orden es un `.cmd` y sin eso no se
       encuentra: da ENOENT y el chequeo creería que el entorno local está
       apagado cuando en realidad está andando. La orden es fija y no lleva
       nada de afuera, así que abrir el intérprete no agrega riesgo. */
    const env = execFileSync('supabase', ['status', '-o', 'env'],
      { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: true });
    const url = (env.match(/^API_URL="?([^"\s]+)/m) || [])[1];
    const clave = (env.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
    if (!url || !clave) return null;
    return { nombre: 'la base de esta máquina', url: url.replace(/\/$/, ''), clave };
  } catch { return null; }
}

/** La de verdad, la misma a la que entran las pantallas. Sale del código y no
 *  de una variable de entorno, justamente para que sea la misma. */
function laDeVerdad() {
  const fuente = readFileSync(aRuta('js/apiClient.js'), 'utf8');
  const url = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
  const clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
  if (!url || !clave) throw new Error('No se pudo leer la dirección de la base desde js/apiClient.js.');
  return { nombre: new URL(url).hostname, url: url.replace(/\/$/, ''), clave };
}

/**
 * Le hace a una base todas las preguntas que sólo se pueden hacer con ella
 * delante. Devuelve en qué quedó, y el llamador decide qué significa.
 *
 * Tres finales posibles, y son tres cosas distintas:
 *   `muda`     — no contestó. Nada quedó probado, y hay que decirlo.
 *   `sin_puerta` — contestó, pero `guias_de` no está ahí: esa base no tiene
 *                  aplicada la migración que la crea. No es un defecto del
 *                  código; es una base atrasada. Se nombra por lo que pasa y no
 *                  por el número de la migración: el número se murió una vez, con
 *                  el aplastamiento de las setenta y cuatro, y lo que pasa no.
 *   `probada`  — contestó, y lo que se probó está adentro de `problemas`.
 */
async function interrogar(base) {
  const encabezados = { apikey: base.clave, Authorization: 'Bearer ' + base.clave, 'Content-Type': 'application/json' };
  const rpc = async (nombre, cuerpo) => {
    const r = await fetch(base.url + '/rest/v1/rpc/' + nombre, {
      method: 'POST', headers: encabezados, body: JSON.stringify(cuerpo)
    });
    return { estado: r.status, ok: r.ok, datos: r.ok ? await r.json() : null };
  };
  const problemas = [];
  let mirados = 0;
  let sinAislamiento = null;
  let cobertura = null;

  // B1. La puerta contesta, y contesta un objeto agrupado.
  let general;
  try {
    general = await rpc('guias_de', { p_slug: null });
  } catch (e) {
    return { final: 'muda', porque: e.message, problemas, mirados };
  }
  if (general.estado === 404) return { final: 'sin_puerta', problemas, mirados };
  if (!general.ok) return { final: 'muda', porque: 'contestó ' + general.estado, problemas, mirados };

  mirados++;
  if (!general.datos || typeof general.datos !== 'object' || Array.isArray(general.datos)) {
    problemas.push(`En ${base.nombre}, \`guias_de\` no devolvió un objeto: la puerta agrupa por vocabulario y por opción.`);
  }

  // B2. La tabla, en cambio, no se toca sin sesión. Es la mitad que importa:
  //     si esto pasara, la puerta sobraría y cualquiera leería todo.
  mirados++;
  const directo = await fetch(base.url + '/rest/v1/guias_cuidado?select=id&limit=1', { headers: encabezados });
  if (directo.ok) {
    const filas = await directo.json();
    problemas.push(`En ${base.nombre}, \`guias_cuidado\` se lee sin sesión: contestó ${directo.status} con ` +
      `${Array.isArray(filas) ? filas.length : '?'} fila(s). La tabla no le concede nada a \`anon\`, ` +
      'así que si contesta es porque alguien se lo concedió.');
  }

  // B3. Cada guía general que sale de la puerta trae sus cuatro partes, y las
  //     trae en los tres idiomas, y ninguna de ellas escribe un número de
  //     emergencia. Lo que escribe una Prestadora se mide distinto —va en el
  //     idioma de ella— y acá no aparece: se pidió sin nombre corto.
  //
  //     Lo del número se mira acá y no sólo sobre el repositorio a propósito.
  //     Una guía puede haber entrado a la base por cualquier camino, y el texto
  //     que la gente lee es el que devuelve la puerta, no el que quedó escrito
  //     en una migración. Es el mismo detector de más arriba, una sola vez,
  //     para que las dos miradas no se vayan separando.
  const deLaPuerta = [];
  for (const [vocabulario, opciones] of Object.entries(general.datos || {})) {
    for (const [opcion, guia] of Object.entries(opciones || {})) deLaPuerta.push({ vocabulario, opcion, guia });
  }
  const vacio = (v) => v === undefined || v === null ||
    (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
  for (const { vocabulario, opcion, guia } of deLaPuerta) {
    mirados++;
    for (const parte of PARTES) {
      if (!(parte in guia)) { problemas.push(`La guía general de «${vocabulario}/${opcion}» no trae «${parte}».`); continue; }
      for (const idioma of IDIOMAS) {
        if (vacio(guia[parte] ? guia[parte][idioma] : undefined)) {
          problemas.push(`La guía general de «${vocabulario}/${opcion}» no tiene «${parte}» en ${idioma} (${base.nombre}).`);
        }
      }
    }
    const conNumero = numerosDeEmergenciaEn(JSON.stringify(guia));
    if (conNumero.length) {
      problemas.push(reclamoPorNumero(`${base.nombre} → ${vocabulario}/${opcion}`, conNumero));
    }
  }

  // B4. Aislamiento: pidiendo con el nombre de una Prestadora no aparece texto
  //     de otra. Hacen falta dos con guía propia; con menos no se probó nada, y
  //     eso se dice en voz alta en vez de pasar callado.
  //
  //     Y de paso se le mira el número de emergencia a cada guía propia. Antes
  //     se bajaban enteras y se usaban sólo para sacarles la huella y
  //     compararlas entre sí: el texto pasaba delante y nadie lo leía. Son las
  //     únicas guías que no están escritas en el repositorio, así que si no se
  //     miran acá no se miran en ningún lado.
  const propiasDe = {};
  for (const corto of NOMBRES_CORTOS) {
    const r = await rpc('guias_de', { p_slug: corto });
    if (!r.ok) { propiasDe[corto] = []; continue; }
    const suyas = [];
    for (const [vocabulario, opciones] of Object.entries(r.datos || {})) {
      for (const [opcion, guia] of Object.entries(opciones || {})) {
        if (guia && guia.propia) {
          const huella = JSON.stringify(guia);
          suyas.push({ clave: `${vocabulario}/${opcion}`, huella });
          mirados++;
          const conNumero = numerosDeEmergenciaEn(huella);
          if (conNumero.length) {
            problemas.push(reclamoPorNumero(`${base.nombre} → ${corto}/${vocabulario}/${opcion}`, conNumero));
          }
        }
      }
    }
    propiasDe[corto] = suyas;
  }
  const conPropias = Object.entries(propiasDe).filter(([, v]) => v.length > 0);
  if (conPropias.length < 2) {
    sinAislamiento = `hacen falta dos Prestadoras con guía propia cargada y hay ${conPropias.length}: ` +
      'con cero guías la comparación da «no se cruzó» igual que si estuviera bien';
  } else {
    for (const [corto, suyas] of conPropias) {
      const ajenas = conPropias.filter(([o]) => o !== corto).flatMap(([, v]) => v.map((p) => p.huella));
      for (const propia of suyas) {
        mirados++;
        if (ajenas.includes(propia.huella)) {
          problemas.push(`La guía «${propia.clave}» que ve «${corto}» es idéntica a la de otra Prestadora ` +
            `(${base.nombre}). O se filtró, o las dos cargaron el mismo texto; hay que mirarlo.`);
        }
      }
    }
  }

  // B5. Cobertura. Se informa y no falla: falta contenido, no anda nada mal.
  //     Está anotado como pendiente 104, y hacer fallar el gancho por trabajo
  //     ya registrado lo convierte en ruido, y un gancho que molesta se apaga.
  //
  //     Cuenta **publicadas**, porque la puerta no devuelve otra cosa, y se
  //     dice con esa palabra a propósito: las 19 guías generales están escritas y
  //     ninguna está publicada, así que un número en cero no significa que falte
  //     el texto. Lo que falta es la firma de
  //     quien las revisó, no el texto.
  const cat = await rpc('vocabularios_de', { p_slug: null });
  if (cat.ok) {
    const items = ((cat.datos || {}).patologia || {}).items || [];
    const conGuia = Object.keys((general.datos || {}).patologia || {});
    cobertura = { total: items.length, con: items.filter((i) => conGuia.includes(i.clave)).length };
  }

  return { final: 'probada', problemas, mirados, sinAislamiento, cobertura };
}

const bases = [laLocal(), laDeVerdad()].filter(Boolean);
const dichos = [];

for (const base of bases) {
  const r = await interrogar(base);
  problemas.push(...r.problemas);
  mirados += r.mirados;
  if (r.final === 'muda') {
    dichos.push(`SIN COMPROBAR contra ${base.nombre} (${r.porque}): la puerta, el cierre de la tabla y el aislamiento quedaron sin probar ahí`);
  } else if (r.final === 'sin_puerta') {
    dichos.push(`${base.nombre} contesta pero no tiene \`guias_de\`: esa base no tiene aplicada la migración que crea la puerta, así que ahí no se probó nada`);
  } else {
    let dicho = `${base.nombre}: la puerta contesta y la tabla no`;
    if (r.cobertura) dicho += `, ${r.cobertura.con} de ${r.cobertura.total} patologías con guía general publicada (pendiente 104)`;
    if (r.sinAislamiento) dicho += `; el aislamiento NO se probó ahí: ${r.sinAislamiento}. Las carga la siembra, así que o esa base no la tiene aplicada o alguien borró esas guías`;
    dichos.push(dicho);
  }
}

// ── El resultado ───────────────────────────────────────────────────────────

seRevisaron(mirados, 'nada que revisar sobre las Guías de cuidado');

if (problemas.length > 0) {
  console.error('\n' + problemas.join('\n') + '\n');
  process.exit(1);
}

/* El renglón final es el único que se ve cuando este chequeo pasa adentro de
   `verificar_todo.mjs`, así que lo que quedó sin probar va acá y no arriba. */
console.log(`Guías: ${mirados} comprobaciones; ` + dichos.join('; ') + '.');
