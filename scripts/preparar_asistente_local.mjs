/* ===================================================
   UNA ASISTENTE DE PRUEBA EN LA BASE DE ESTA MÁQUINA

       CLAVE_PRUEBA_LOCAL=... node scripts/preparar_asistente_local.mjs

   Por qué existe. La aplicación del Asistente —`pwa-asistente/index.html`—
   escribe dos cosas contra la base: la fichada con la posición y el reporte de
   cuidado. Las dos exigen sesión, y las dos apuntan al **legajo** de quien la
   tiene, que no es su **cuenta**: `caregivers.id` es lo primero y
   `caregivers.user_id` lo segundo. Sin una cuenta que tenga legajo detrás, esa
   pantalla no se puede mirar andando, y hasta el 31 de agosto de 2026 nadie la
   había mirado: mandaba el identificador de la cuenta donde va el del legajo,
   la base lo rechazaba siempre, y `clock_ins` no tenía una sola fila en toda su
   vida. Fue el pendiente 112, cerrado el 31 de agosto de 2026 apretando el
   botón con esta misma cuenta.

   Arreglar el código fue una cosa; **comprobar que la pantalla escribe** es
   otra, y para eso hace falta poder entrar. Esto deja la cuenta con la que se
   entra. Es la hermana de `scripts/preparar_coordinadores_locales.mjs`, que
   hizo lo mismo para las pantallas del panel.

   Se mira con el servidor de siempre apuntando a esta base:

       python scripts/servidor_local.py 5599 --base-local

   Qué hace, en orden:

   1. Deja la cuenta `asistente.presdemo@ejemplo.com`, confirmada, con el rol
      `caregiver` que el disparador de la migración 0005 le da a quien se
      registra pidiéndolo, y con PresDemo como Prestadora.
   2. **La engancha a un legajo ficticio que ya exista**, en vez de inventar
      uno nuevo. El legajo sale de la siembra, con su nombre, sus fichas y sus
      verificaciones, así que la pantalla se mira con un legajo como los de
      verdad y no con uno vacío hecho al paso.

   Qué no hace, y por qué:

   - **No inventa ninguna clave ni la escribe en ningún lado.** La toma de
     `CLAVE_PRUEBA_LOCAL` y, si no está, se niega a correr.
   - **No corre contra ninguna base que no sea la de esta máquina.** Comprueba
     que la dirección sea local y, si no, se planta. Crear cuentas ya
     confirmadas contra un servidor de verdad es exactamente lo que la
     confirmación por correo viene a impedir.
   - **No le saca el legajo a nadie.** Si el legajo que iba a tomar ya tiene
     otra cuenta detrás, busca el siguiente libre; si no queda ninguno, lo dice
     y no toca nada.
   - **No muestra ninguna clave.**

   Correrlo dos veces no duplica nada: si la cuenta ya existe le pone la clave
   nueva, y si ya tiene legajo se queda con el que tenía.

   Para deshacerlo: `node scripts/soltar_asistente_local.mjs`.
=================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const clavePrueba = process.env.CLAVE_PRUEBA_LOCAL;
if (!clavePrueba || clavePrueba.length < 8) {
  console.error('Falta la variable de entorno CLAVE_PRUEBA_LOCAL (mínimo 8 caracteres).');
  console.error('Se elige en el momento y no se escribe en ningún archivo:');
  console.error('');
  console.error('    CLAVE_PRUEBA_LOCAL=<la que elija> node scripts/preparar_asistente_local.mjs');
  process.exit(1);
}

let salida;
try {
  salida = execFileSync('supabase', ['status', '-o', 'env'], {
    cwd: raiz, encoding: 'utf8', shell: true
  });
} catch {
  console.error('El entorno de esta máquina no está levantado. Antes:');
  console.error('    supabase start -x edge-runtime -x vector -x supavisor -x logflare');
  process.exit(1);
}

const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const servicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !servicio) {
  console.error('No se pudieron averiguar la dirección ni las claves del entorno de esta máquina.');
  process.exit(1);
}

const anfitrion = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(anfitrion)) {
  console.error('Esto corre sólo contra la base de esta máquina, y la dirección es ' + anfitrion + '.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');

const CUENTA = {
  slug: 'presdemo',
  correo: 'asistente.presdemo@ejemplo.com',
  nombre: 'Asistente de PresDemo'
};

async function comoServicio(camino, opciones = {}) {
  const res = await fetch(base + camino, {
    ...opciones,
    headers: {
      apikey: servicio,
      Authorization: 'Bearer ' + servicio,
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    }
  });
  const texto = await res.text();
  let cuerpo = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = texto; }
  return { estado: res.status, cuerpo };
}

// --- 1. La Prestadora tiene que existir --------------------------------------
const prestadora = await comoServicio(
  '/rest/v1/tenants?select=id,name&slug=eq.' + CUENTA.slug + '&limit=1');
const laPrestadora = Array.isArray(prestadora.cuerpo) ? prestadora.cuerpo[0] : null;
if (!laPrestadora) {
  console.error('No existe la Prestadora «' + CUENTA.slug + '». ¿Falta la migración 0003?');
  process.exit(1);
}

// --- 2. La cuenta -------------------------------------------------------------
/* El alta pasa por el disparador de la 0005, que arma el perfil con la
   Prestadora de los metadatos y con el rol pedido, siempre que sea uno de los
   dos que puede pedirse. `caregiver` lo es; `coordinador` no, y por eso su
   hermana lo asciende aparte. */
let alta = await comoServicio('/auth/v1/admin/users', {
  method: 'POST',
  body: JSON.stringify({
    email: CUENTA.correo,
    password: clavePrueba,
    email_confirm: true,
    user_metadata: {
      full_name: CUENTA.nombre,
      tenant_slug: CUENTA.slug,
      role: 'caregiver'
    }
  })
});

let identificador = alta.cuerpo && alta.cuerpo.id;

if (!identificador) {
  const buscada = await comoServicio('/auth/v1/admin/users?page=1&per_page=1000');
  const usuarios = (buscada.cuerpo && buscada.cuerpo.users) || [];
  const encontrada = usuarios.find((u) => u.email === CUENTA.correo);
  if (!encontrada) {
    console.error('No se pudo crear ni encontrar ' + CUENTA.correo + '.');
    process.exit(1);
  }
  identificador = encontrada.id;
  const puesta = await comoServicio('/auth/v1/admin/users/' + identificador, {
    method: 'PUT',
    body: JSON.stringify({ password: clavePrueba, email_confirm: true })
  });
  if (puesta.estado >= 400) {
    console.error('No se pudo poner la clave de ' + CUENTA.correo + '.');
    process.exit(1);
  }
}

/* El perfil se asegura igual, aunque el disparador ya lo haya armado: si la
   cuenta venía de una corrida vieja pudo quedar con otra cosa, y lo que vale es
   el estado, no lo que se supone que hizo el alta. */
const perfil = await comoServicio('/rest/v1/profiles?id=eq.' + identificador, {
  method: 'PATCH',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    role: 'caregiver', tenant_id: laPrestadora.id, full_name: CUENTA.nombre
  })
});
const elPerfil = Array.isArray(perfil.cuerpo) ? perfil.cuerpo[0] : null;
if (!elPerfil || elPerfil.role !== 'caregiver' || elPerfil.tenant_id !== laPrestadora.id) {
  console.error('La cuenta quedó sin el rol o sin la Prestadora.');
  process.exit(1);
}

// --- 3. El legajo -------------------------------------------------------------
const legajos = await comoServicio(
  '/rest/v1/caregivers?select=id,full_name,user_id&tenant_id=eq.' +
  laPrestadora.id + '&order=full_name');
const todos = Array.isArray(legajos.cuerpo) ? legajos.cuerpo : [];

let elLegajo = todos.find((l) => l.user_id === identificador);

if (!elLegajo) {
  const libre = todos.find((l) => !l.user_id);
  if (!libre) {
    console.error('Todos los legajos de ' + laPrestadora.name + ' ya tienen cuenta detrás.');
    console.error('No se le saca el legajo a nadie: primero hay que soltar alguno.');
    process.exit(1);
  }
  const enganche = await comoServicio('/rest/v1/caregivers?id=eq.' + libre.id, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: identificador })
  });
  elLegajo = Array.isArray(enganche.cuerpo) ? enganche.cuerpo[0] : null;
  if (!elLegajo || elLegajo.user_id !== identificador) {
    console.error('No se pudo enganchar el legajo a la cuenta.');
    process.exit(1);
  }
}

console.log('bien  ' + CUENTA.correo);
console.log('bien  legajo «' + elLegajo.full_name + '» en ' + laPrestadora.name);
console.log('');
console.log('Lista en ' + anfitrion + '. La clave es la que se pasó por CLAVE_PRUEBA_LOCAL');
console.log('y no queda escrita en ningún lado. Para mirar la pantalla:');
console.log('');
console.log('    python scripts/servidor_local.py 5599 --base-local');
console.log('');
console.log('y entrar en /pwa-asistente/ con ese correo.');
