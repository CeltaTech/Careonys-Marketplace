/* ===================================================
   LAS GUÍAS DE CUIDADO NO SE ABREN NI SE PUBLICAN SOLAS

       node scripts/verificar_guias.mjs

   Una Guía de cuidado es lo que el Asistente lee al entrar a un domicilio: qué
   es la patología, qué se ve en la casa, qué señales obligan a avisar y cómo
   actuar en una emergencia. Vive en `guias_cuidado` desde la migración 0041 y
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

/* Los nombres cortos de las dos Prestadoras inventadas. Están escritos acá por
   el mismo motivo que en `probar_aislamiento.mjs:311`: desde la migración 0021
   no existe forma de pedir la lista de Prestadoras sin sesión, que es
   justamente la propiedad que se quiere conservar. Son datos de prueba, no
   configuración del producto. */
const NOMBRES_CORTOS = ['presdemo', 'cuidarnorte'];

const problemas = [];
let mirados = 0;

// ── A. Lo que se comprueba siempre: las migraciones ────────────────────────

const migraciones = archivos(aRuta('supabase/migrations'), ['.sql'])
  .sort()
  .map((camino) => ({ camino, nombre: camino.split(/[\\/]/).pop(), texto: readFileSync(camino, 'utf8') }));

seRevisaron(migraciones.length, 'una sola migración en supabase/migrations');

const laQueCrea = migraciones.find((m) => /create table[^;]*guias_cuidado/is.test(m.texto));
if (!laQueCrea) {
  problemas.push('Ninguna migración crea `guias_cuidado`. O se borró, o cambió de nombre y este chequeo quedó viejo.');
} else {
  mirados++;

  /* Las cuatro garantías que la 0041 dejó escritas. Se buscan por lo que hacen
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
  if (!/revoke[^;]*guias_de\s*\(\s*text\s*\)[^;]*from[^;]*public/is.test(laDeLaPuerta.texto)) {
    problemas.push(`\`${laDeLaPuerta.nombre}\` no le revoca \`public\` a \`guias_de\`. ` +
      'Una función que saltea la protección por fila queda al alcance de cualquiera si no se revoca.');
  }
  if (!/grant execute on function[^;]*guias_de\s*\(\s*text\s*\)[^;]*to[^;]*anon/is.test(laDeLaPuerta.texto)) {
    problemas.push(`\`${laDeLaPuerta.nombre}\` no le concede \`guias_de\` a \`anon\`, y las pantallas que la ` +
      'necesitan pueden estar mostrándose sin sesión.');
  }
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
 *   `sin_0041` — contestó, pero la puerta no está: la migración no llegó ahí.
 *                No es un defecto del código; es una base atrasada.
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
  if (general.estado === 404) return { final: 'sin_0041', problemas, mirados };
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
  //     trae en los tres idiomas. Lo que escribe una Prestadora se mide
  //     distinto —va en el idioma de ella— y acá no aparece: se pidió sin
  //     nombre corto.
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
  }

  // B4. Aislamiento: pidiendo con el nombre de una Prestadora no aparece texto
  //     de otra. Hacen falta dos con guía propia; con menos no se probó nada, y
  //     eso se dice en voz alta en vez de pasar callado.
  const propiasDe = {};
  for (const corto of NOMBRES_CORTOS) {
    const r = await rpc('guias_de', { p_slug: corto });
    if (!r.ok) { propiasDe[corto] = []; continue; }
    const suyas = [];
    for (const [vocabulario, opciones] of Object.entries(r.datos || {})) {
      for (const [opcion, guia] of Object.entries(opciones || {})) {
        if (guia && guia.propia) suyas.push({ clave: `${vocabulario}/${opcion}`, huella: JSON.stringify(guia) });
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
  } else if (r.final === 'sin_0041') {
    dichos.push(`${base.nombre} contesta pero no tiene \`guias_de\`: la migración 0041 todavía no está aplicada ahí, así que ahí no se probó nada`);
  } else {
    let dicho = `${base.nombre}: la puerta contesta y la tabla no`;
    if (r.cobertura) dicho += `, ${r.cobertura.con} de ${r.cobertura.total} patologías con guía general (pendiente 104)`;
    if (r.sinAislamiento) dicho += `; el aislamiento NO se probó ahí: ${r.sinAislamiento} (pendiente 103)`;
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
