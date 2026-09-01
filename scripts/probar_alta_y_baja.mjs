/* ===================================================
   LA PUERTA POR DONDE CELTATECH DA DE ALTA Y DE BAJA, PROBADA CONTRA EL SERVIDOR

       node scripts/probar_alta_y_baja.mjs

   Doce comprobaciones, y cada una puede fallar de verdad: se habla con la
   función de borde desplegada, firmando como firmaría CeltaTech. No hay
   simulacro en ningún lado.

   Qué se prueba, en tres grupos:

     * **Que la puerta esté cerrada.** Sin firma, con firma inventada, y con el
       cuerpo cambiado después de firmarlo. Las tres tienen que rebotar, y la
       tercera es la que importa: si la firma se hiciera sobre el mensaje ya
       interpretado en vez de sobre el texto crudo, esa pasaría.
     * **Que el alta no duplique.** Se da de alta la misma Prestadora dos veces
       y tiene que salir la misma, no dos.
     * **Que los avisos repetidos y atrasados no pisen nada.** Es el motivo por
       el que existe `estado_fijado_en`: los avisos de CeltaTech se reintentan
       (`../../docs/MODELO_COMERCIAL_CELTATECH.md` §6.2), así que llegan dos
       veces y llegan al revés.

   Al terminar borra la Prestadora que creó, con la llave de administración. Si
   la prueba se corta por la mitad, la que quedó tiene un nombre que se reconoce
   de lejos y volver a correr la prueba la reutiliza en vez de crear otra.

   No muestra ninguna clave. La de firma sale de la caja fuerte local y la de
   administración se la pide a la CLI; ninguna de las dos se imprime, ni entera
   ni a medias.
   =================================================== */

import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* La dirección sale del código, igual que en `probar_aislamiento.mjs`: se prueba
   contra el mismo servidor que usan las pantallas y no contra otro. */
const fuente = readFileSync(join(raiz, 'js', 'apiClient.js'), 'utf8');
const url = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
if (!url) {
  console.error('No se pudo averiguar la dirección de la base.');
  process.exit(1);
}
const servidor = url.replace(/\/$/, '');
const puerta = servidor.replace('.supabase.co', '.supabase.co') + '/functions/v1/alta-y-baja';

/* La clave de firma vive en la caja fuerte local y no en el repositorio. Se lee
   acá adentro y no se imprime. */
let secreto;
try {
  const env = readFileSync(join(raiz, 'No commit', 'firma-celtatech.env'), 'utf8');
  secreto = (env.match(/^CELTATECH_FIRMA=(.+)$/m) || [])[1]?.trim();
} catch { /* no está */ }
if (!secreto) {
  console.error('Falta la clave de firma. Tendría que estar en «No commit/firma-celtatech.env».');
  process.exit(1);
}

/* La de administración sirve para una sola cosa: borrar al final la Prestadora
   que creó la prueba.

   Hasta el 1 de septiembre de 2026, sin ella la prueba corría igual y avisaba
   al terminar que dejaba la fila. Eso es pedirle a quien la corre que se
   acuerde de limpiar a mano lo que el guion ensució solo, y no se acordó
   nadie: quedó «prestadora-de-prueba-de-la-puerta» en la base publicada con
   sus siete filas de configuración, y hubo que sacarla con una migración, la
   0058. Así que ahora **sin llave no arranca**. Avisar que se va a ensuciar no
   es lo mismo que no ensuciar. */
let claveServicio;
try {
  const ref = new URL(servidor).hostname.split('.')[0];
  const salida = execFileSync('npx', ['supabase', 'projects', 'api-keys',
    '--project-ref', ref, '-o', 'env'], { cwd: raiz, encoding: 'utf8', shell: true });
  claveServicio = (salida.match(/^SUPABASE_SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];
} catch { /* se contesta acá abajo */ }
if (!claveServicio) {
  console.error('Sin la llave de administración esta prueba crearía una Prestadora que');
  console.error('después no puede borrar, y la dejaría en la base. No arranca.');
  process.exit(1);
}

console.log('Servidor: ' + new URL(servidor).hostname);
console.log('Puerta:   /functions/v1/alta-y-baja\n');

const NOMBRE = 'Prestadora De Prueba De La Puerta';
const SLUG = 'prestadora-de-prueba-de-la-puerta';

let pasaron = 0, fallaron = 0;
function comprobar(n, que, condicion, detalle) {
  if (condicion) { pasaron++; console.log(`  ✔ ${String(n).padStart(2)}. ${que}`); }
  else { fallaron++; console.log(`  ✘ ${String(n).padStart(2)}. ${que}\n        ${detalle}`); }
}

function firmar(cuerpo) {
  return 'sha256=' + createHmac('sha256', secreto).update(cuerpo).digest('hex');
}

async function golpear(camino, cuerpo, { firma, metodo = 'POST' } = {}) {
  const texto = typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);
  const cabeceras = { 'Content-Type': 'application/json' };
  if (firma !== null) cabeceras['X-CeltaTech-Firma'] = firma ?? firmar(texto);
  const r = await fetch(puerta + camino, {
    method: metodo,
    headers: cabeceras,
    body: metodo === 'GET' ? undefined : texto,
  });
  let cuerpoRespuesta;
  try { cuerpoRespuesta = await r.json(); } catch { cuerpoRespuesta = null; }
  return { estado: r.status, cuerpo: cuerpoRespuesta };
}

const alta = { cliente: { razon_social: NOMBRE, pais: 'AR' }, suscripcion_id: 'no-importa' };

// ── 1 a 3: que la puerta esté cerrada ──────────────────────────────────────
console.log('Que la puerta esté cerrada');

let r = await golpear('/tenants', alta, { firma: null });
comprobar(1, 'Sin firma, no entra', r.estado === 401, `contestó ${r.estado}`);

r = await golpear('/tenants', alta, { firma: 'sha256=' + '0'.repeat(64) });
comprobar(2, 'Con una firma inventada, no entra', r.estado === 401, `contestó ${r.estado}`);

/* La que importa: se firma un cuerpo y se manda otro. Sólo rebota si la firma se
   hizo sobre el texto crudo. Si se hiciera sobre lo ya interpretado, dos cuerpos
   distintos podrían tener la misma firma y esto pasaría sin que nadie se entere. */
const original = JSON.stringify(alta);
const alterado = JSON.stringify({ ...alta, cliente: { razon_social: 'Otra Empresa' } });
r = await golpear('/tenants', alterado, { firma: firmar(original) });
comprobar(3, 'Cambiando el cuerpo después de firmarlo, no entra', r.estado === 401,
  `contestó ${r.estado}`);

// ── 4 y 5: el alta ─────────────────────────────────────────────────────────
console.log('\nEl alta');

r = await golpear('/tenants', alta);
const primera = r.cuerpo || {};
comprobar(4, 'Con firma buena, da de alta y devuelve el identificador',
  (r.estado === 201 || r.estado === 200) && typeof primera.tenant_ref === 'string',
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);
comprobar(5, 'El nombre corto sale del nombre', primera.slug === SLUG,
  `devolvió «${primera.slug}» y se esperaba «${SLUG}»`);

r = await golpear('/tenants', alta);
comprobar(6, 'Repetir el alta devuelve la misma, no crea una segunda',
  r.estado === 200 && r.cuerpo?.creada === false && r.cuerpo?.tenant_ref === primera.tenant_ref,
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

// ── 7 a 11: los avisos ─────────────────────────────────────────────────────
console.log('\nLos avisos, repetidos y al revés');

const ref = primera.tenant_ref;
const ahora = new Date();
const antes = new Date(ahora.getTime() - 60_000).toISOString();
const despues = new Date(ahora.getTime() + 60_000).toISOString();

function aviso(tipo, emitido_en) {
  return { id: crypto.randomUUID(), tipo, emitido_en, producto: 'careonys-marketplace',
           suscripcion_id: 'no-importa', tenant_ref: ref, payload: {} };
}

r = await golpear('/eventos', aviso('suscripcion.suspendida', ahora.toISOString()));
comprobar(7, 'Suspender, se aplica',
  r.estado === 200 && r.cuerpo?.aplicado === true && r.cuerpo?.estado === 'suspendido',
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

/* Mismo tipo, misma fecha, otro identificador: es exactamente lo que llega
   cuando CeltaTech reintenta porque se perdió la respuesta. */
r = await golpear('/eventos', aviso('suscripcion.suspendida', ahora.toISOString()));
comprobar(8, 'El mismo aviso repetido no vuelve a aplicarse',
  r.estado === 200 && r.cuerpo?.aplicado === false && r.cuerpo?.estado === 'suspendido',
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

/* Una cancelación vieja que llega tarde. Sin la fecha de emisión, esta dejaría
   cancelada a una Prestadora por algo que ya no era verdad. */
r = await golpear('/eventos', aviso('suscripcion.cancelada', antes));
comprobar(9, 'Un aviso atrasado no pisa al que ya se aplicó',
  r.estado === 200 && r.cuerpo?.aplicado === false && r.cuerpo?.estado === 'suspendido',
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

r = await golpear('/eventos', aviso('suscripcion.reactivada', despues));
comprobar(10, 'Uno posterior sí se aplica',
  r.estado === 200 && r.cuerpo?.aplicado === true && r.cuerpo?.estado === 'activo',
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

/* Lo comercial se recibe y no se hace. Con 200, para que CeltaTech no lo
   reintente para siempre. */
r = await golpear('/eventos', aviso('entitlements.actualizados', despues));
comprobar(11, 'Un aviso comercial se recibe y no hace nada',
  r.estado === 200 && r.cuerpo?.aplicado === false,
  `contestó ${r.estado}: ${JSON.stringify(r.cuerpo)}`);

// ── 12: lo que no existe ───────────────────────────────────────────────────
console.log('\nLo que la puerta no atiende');

r = await golpear('/cualquier-otra-cosa', aviso('suscripcion.activada', despues));
comprobar(12, 'Un camino que no existe contesta 404', r.estado === 404, `contestó ${r.estado}`);

// ── Limpieza ───────────────────────────────────────────────────────────────
/* Se borra en orden, y el orden importa: desde la migración 0046 toda
   Prestadora nace con seis filas de configuración de puntaje que apuntan a
   `tenants` sin cascada, así que borrar la Prestadora derecho choca contra la
   clave ajena y devuelve 409. No es un defecto del producto —la baja de
   CeltaTech no borra nada, marca `cancelado`— sino de esta limpieza, que sí
   borra porque no quiere dejar basura en la base publicada. */
if (claveServicio && ref) {
  const borrar = (tabla, filtro) => fetch(`${servidor}/rest/v1/${tabla}?${filtro}`, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio },
  });

  await borrar('ponderacion_comprobacion', `tenant_id=eq.${ref}`);
  await borrar('puntaje_prestadora', `tenant_id=eq.${ref}`);
  const borrado = await borrar('tenants', `id=eq.${ref}`);

  console.log(borrado.ok
    ? '\nLa Prestadora de prueba quedó borrada.'
    : `\nNo se pudo borrar la Prestadora de prueba (${borrado.status}). Quedó «${SLUG}».`);
} else {
  console.log(`\nSin llave de administración: quedó la Prestadora «${SLUG}».`);
}
