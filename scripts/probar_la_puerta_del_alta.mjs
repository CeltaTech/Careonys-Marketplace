/* ===================================================
   LA PUERTA DEL ALTA

       node scripts/probar_la_puerta_del_alta.mjs

   Contra la base local, que es donde conviene correrla porque el alta no
   pide confirmar el correo y la cuenta ficticia se crea sola. Si el
   entorno no está levantado o está atrasado, primero:

       supabase start -x edge-runtime -x vector -x supavisor -x logflare
       supabase migration up --local

   QUÉ MIRA. El catálogo dice, desde el 24 de agosto de 2026, que el
   documento de identidad «frena el alta». Hasta la migración 0073 nada lo
   comprobaba: `registrar-asistente.html` y la aplicación del teléfono
   grababan el legajo aunque faltara. Esta prueba comprueba que ahora sí se
   frena, y que se frena por lo que tiene que frenarse —que el papel no
   llegó— y no por cualquier otra cosa: un legajo al que le falta un papel
   de otra puerta (los antecedentes penales, que frenan la `publicacion` y
   no el `alta`, desde la misma migración 0061) tiene que poder darse de
   alta igual.

   ESTA PRUEBA FALLABA A PROPÓSITO, Y HOY PASA. Fue el pendiente 143: la
   pregunta llevaba desde la migración 0061 sin contestar, porque cerrar la
   puerta esperando el juicio de la Prestadora era un candado que no se
   podía abrir —ver el comentario de esa migración—. El Desarrollador
   contestó el 4 de septiembre de 2026 que alcanza con que el software
   compruebe, solo, que el papel llegó, y la migración 0073 lo escribió.
   **Si vuelve a dar rojo, algo se rompió.**

   POR QUÉ PUEDE FALLAR. Que el alta rechace un legajo sin el documento de
   identidad podría dar «bien» por un motivo tonto —que la tabla esté
   cerrada para todo el mundo, o que la cuenta no tenga sesión— y no
   probaría nada. Por eso está la comprobación de al lado: que el mismo
   legajo, con el documento puesto, sí se pueda dar de alta, y que además
   se pueda corregir después (el teléfono). Si esas no salen como se
   espera, la prueba avisa que no sirve y no que el producto esté sano.

   Corre contra las dos Prestadoras ficticias de la migración 0003: la
   regla vive en el vocabulario global, no en el código, así que tiene que
   valer para las dos por igual.

   No deja nada atrás: borra los legajos y las cuentas ficticias que haya
   podido crear.
   =================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: raiz, encoding: 'utf8', shell: true });
const url   = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
const claveServicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !clave) {
  console.error('No se pudo averiguar la dirección de la base local ni su clave publicable.');
  console.error('Probablemente el entorno no esté levantado.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');
console.log('Servidor: ' + new URL(url).hostname);
console.log('');

let fallos = 0;
let inservible = false;

function comprobar(titulo, condicion, detalle) {
  console.log((condicion ? '   bien  ' : '   MAL   ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) fallos++;
}

function sostener(titulo, condicion, detalle) {
  console.log((condicion ? '   ok    ' : '   ROTA  ') + titulo + (detalle ? '  — ' + detalle : ''));
  if (!condicion) inservible = true;
}

async function rest(camino, opciones = {}, token = clave) {
  const res = await fetch(base + camino, {
    ...opciones,
    headers: {
      apikey: clave,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
  return { estado: res.status, cuerpo };
}

async function prestadora(slug) {
  const { cuerpo } = await rest('/rest/v1/rpc/prestadora_por_slug', {
    method: 'POST', body: JSON.stringify({ p_slug: slug })
  });
  return Array.isArray(cuerpo) && cuerpo.length === 1 ? cuerpo[0] : null;
}

async function cuentaFicticia(P, etiqueta) {
  const sello = Date.now() + '.' + Math.random().toString(36).slice(2);
  const email = `prueba.alta.${etiqueta}.${sello}@ejemplo.invalid`;
  const password = `Ficticia-${sello}-alta`;
  const nombre = `Persona Ficticia Alta ${etiqueta} ${sello}`;

  const alta = await fetch(base + '/auth/v1/signup', {
    method: 'POST',
    headers: { apikey: clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password,
      data: { full_name: nombre, tenant_slug: P.slug, role: 'caregiver' }
    })
  }).then((r) => r.json());

  let token = alta.access_token;
  const userId = alta.user?.id || alta.id;
  if (!token && claveServicio && userId) {
    await fetch(base + '/auth/v1/admin/users/' + userId, {
      method: 'PUT',
      headers: {
        apikey: claveServicio, Authorization: 'Bearer ' + claveServicio,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email_confirm: true })
    });
    const sesion = await fetch(base + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then((r) => r.json());
    token = sesion.access_token;
  }
  if (!token) {
    console.error('La cuenta ficticia se creó pero no devolvió sesión.');
    console.error('Contra el servidor remoto pasa: ahí el alta pide confirmar el correo.');
    process.exit(1);
  }
  return { token, userId, nombre };
}

async function borrarCuenta(userId) {
  if (!claveServicio || !userId) return false;
  const r = await fetch(base + '/auth/v1/admin/users/' + userId, {
    method: 'DELETE',
    headers: { apikey: claveServicio, Authorization: 'Bearer ' + claveServicio }
  });
  return r.ok;
}

// --- Las dos Prestadoras ficticias de la migración 0003 ---------------------
const P = await prestadora('presdemo');
const AJENA = await prestadora('cuidarnorte');
if (!P || !AJENA) {
  console.error('Hacen falta las dos Prestadoras ficticias de la migración 0003.');
  console.error('Con las migraciones aplicadas están; si no, la base está atrasada.');
  process.exit(1);
}

console.log('La puerta del alta');

const cuentasParaBorrar = [];

// --- 1. Sin el documento de identidad, el alta no se completa --------------
const c1 = await cuentaFicticia(P, 'sindni');
cuentasParaBorrar.push(c1.userId);

const r1 = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: c1.nombre,
    user_id: c1.userId,
    tenant_id: P.id,
    profession: 'cuidador_domiciliario',
    documents: {}
  })
}, c1.token);

const mensaje1 = typeof r1.cuerpo === 'object' && r1.cuerpo
  ? String(r1.cuerpo.message || '') : String(r1.cuerpo || '');

comprobar('el alta se rechaza si falta el documento de identidad',
  r1.estado >= 400 && !Array.isArray(r1.cuerpo),
  'respuesta ' + r1.estado);
comprobar('y el motivo que da es el esperado, no cualquier otro',
  mensaje1.includes('alta_sin_papel:dni'),
  'mensaje: ' + mensaje1.slice(0, 120));

// --- 2. Con el documento de identidad, sí — aunque falten los de otra puerta
const r2 = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: c1.nombre,
    user_id: c1.userId,
    tenant_id: P.id,
    profession: 'cuidador_domiciliario',
    // Sin antecedentes penales: esa puerta es la de publicación (migración
    // 0061), no la del alta, y no tendría que frenar acá.
    documents: { dni: 'documentos-cuidadores/ficticio-dni.pdf', penales: 'pendiente' }
  })
}, c1.token);

const legajo2 = Array.isArray(r2.cuerpo) ? r2.cuerpo[0] : null;

comprobar('con el documento de identidad puesto, el alta se completa',
  !!legajo2,
  'respuesta ' + r2.estado + (legajo2 ? '' : ', cuerpo: ' + JSON.stringify(r2.cuerpo).slice(0, 160)));

// --- 3. Y sigue siendo un legajo normal: se puede corregir después ---------
let telefonoOk = false;
if (legajo2) {
  const r3 = await rest('/rest/v1/caregivers?id=eq.' + legajo2.id, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ phone: '+54 9 11 5555-0001' })
  }, c1.token);
  const conTelefono = Array.isArray(r3.cuerpo) ? r3.cuerpo[0] : null;
  telefonoOk = !!conTelefono && conTelefono.phone === '+54 9 11 5555-0001';
}
sostener('el legajo que sí pasó la puerta se puede seguir editando',
  telefonoOk, legajo2 ? '' : 'no había legajo para probar esto');

// --- 4. La regla no es de una sola Prestadora: es del vocabulario global ---
const c4 = await cuentaFicticia(AJENA, 'ajena');
cuentasParaBorrar.push(c4.userId);

const r4 = await rest('/rest/v1/caregivers', {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    full_name: c4.nombre,
    user_id: c4.userId,
    tenant_id: AJENA.id,
    profession: 'cuidador_domiciliario',
    documents: {}
  })
}, c4.token);

const mensaje4 = typeof r4.cuerpo === 'object' && r4.cuerpo
  ? String(r4.cuerpo.message || '') : String(r4.cuerpo || '');

comprobar('la misma regla frena el alta en la otra Prestadora ficticia',
  r4.estado >= 400 && !Array.isArray(r4.cuerpo) && mensaje4.includes('alta_sin_papel:dni'),
  'respuesta ' + r4.estado);

// --- Limpieza ---------------------------------------------------------------
if (legajo2) {
  await rest('/rest/v1/caregivers?id=eq.' + legajo2.id, { method: 'DELETE' }, c1.token);
}

let cuentasBorradas = 0;
for (const id of cuentasParaBorrar) {
  if (await borrarCuenta(id)) cuentasBorradas++;
}

console.log('');
console.log(cuentasBorradas === cuentasParaBorrar.length
  ? 'Limpieza: las cuentas ficticias no quedaron.'
  : 'ATENCIÓN: quedó alguna cuenta ficticia en la base. Hay que borrarla a mano.');

// --- El resultado -----------------------------------------------------------
console.log('');
if (inservible) {
  console.log('La prueba no está en condiciones de medir nada: la comprobación de sostén');
  console.log('salió al revés de lo esperado. Antes de leer el resultado de arriba hay que');
  console.log('averiguar por qué.');
  process.exit(1);
}
if (fallos === 0) {
  console.log('El alta pide el documento de identidad, y sólo eso, en las dos Prestadoras.');
  process.exit(0);
}
console.log(fallos + (fallos === 1 ? ' comprobación' : ' comprobaciones') + ' en rojo.');
console.log('Esta prueba pasa desde el 4 de septiembre de 2026, cuando la migración 0073 cerró');
console.log('el pendiente 143. Si da rojo, un Aspirante volvió a poder terminar el alta sin');
console.log('subir el documento de identidad.');
process.exit(1);
