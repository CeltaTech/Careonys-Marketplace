/* ===================================================
   LES PONE CLAVE A LAS CUENTAS FICTICIAS DE LA SIEMBRA

       CLAVE_PRUEBA_LOCAL=... node scripts/abrir_cuentas_ficticias.mjs

   Por qué existe. Las cuentas ficticias las dejan las migraciones, con todo lo
   que va colgado de ellas: perfil, Organización, legajo atado y avisos a
   nombre de su Familia. Lo único que no dejan es la clave, y no por olvido:
   las migraciones son las mismas de los dos lados, así que una clave escrita
   adentro de una migración abre esas cuentas también en la base publicada,
   para cualquiera que lea el repositorio.

   Entonces las cuentas nacen sin clave. Existen, sostienen todas las
   referencias, y no entran. Este guion es el que las abre, del único lado
   donde eso no es un agujero: la base de esta máquina.

   Qué no hace, y por qué:

   - **No inventa ninguna clave ni la escribe en ningún lado.** La toma de la
     variable de entorno `CLAVE_PRUEBA_LOCAL` y, si no está, se niega a
     correr. Una clave escrita adentro de un guion del repositorio es una
     clave en el repositorio, diga lo que diga el comentario de al lado.
   - **No corre contra ninguna base que no sea la de esta máquina.**
     Comprueba que la dirección sea local y, si no, se planta.
   - **No muestra ninguna clave**, ni la de servicio ni la que recibió.

   A quiénes alcanza. A las cuentas cuyo correo termina en el dominio de la
   siembra, y a ninguna otra. No es una lista escrita acá a mano a propósito:
   el día que una migración siembre una cuenta más, este guion la abre sola.
   Una cuenta de una persona de verdad no puede tener ese dominio, porque no
   existe.

   Y termina probando la entrada de cada una. Poner la clave y no comprobar
   que abre es justamente la prueba que no puede fallar: si la fila hermana de
   `auth.identities` faltara, la clave quedaría puesta igual y la entrada
   seguiría fallando.

   Es el único camino, y hasta el 2 de septiembre de 2026 no lo era. Había dos
   guiones más —uno dejaba dos coordinadoras, una por Prestadora, y el otro una
   Asistente con un legajo enganchado detrás—, y los dos quedaron haciendo a
   mano lo que la siembra hace sola, con correos inventados que ya ni coincidían
   con los de la siembra. Salieron del proyecto: fue el pendiente 147,
   cerrado el 2 de septiembre de 2026.
=================================================== */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* El dominio reservado con el que la siembra nombra a todas sus personas
   inventadas. `.invalid` no se puede registrar: está apartado para esto. */
const DOMINIO_DE_LA_SIEMBRA = '@ejemplo.invalid';

const clavePrueba = process.env.CLAVE_PRUEBA_LOCAL;
if (!clavePrueba || clavePrueba.length < 8) {
  console.error('Falta la variable de entorno CLAVE_PRUEBA_LOCAL (mínimo 8 caracteres).');
  console.error('Se elige en el momento y no se escribe en ningún archivo:');
  console.error('');
  console.error('    CLAVE_PRUEBA_LOCAL=<la que elija> node scripts/abrir_cuentas_ficticias.mjs');
  process.exit(1);
}

/* `supabase status -o env` imprime las direcciones y claves de esta máquina.
   Se leen de ahí y no se escriben acá. Ninguna se imprime. */
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
const anon = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
const servicio = (salida.match(/^SERVICE_ROLE_KEY="?([^"\s]+)/m) || [])[1];

if (!url || !anon || !servicio) {
  console.error('No se pudieron averiguar la dirección ni las claves del entorno de esta máquina.');
  process.exit(1);
}

/* El freno, antes de tocar nada. */
const anfitrion = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(anfitrion)) {
  console.error('Esto corre sólo contra la base de esta máquina, y la dirección es ' + anfitrion + '.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');

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

/* Las cuentas de la siembra, buscadas en la base y no escritas acá. */
const listado = await comoServicio('/auth/v1/admin/users?per_page=200');
if (listado.estado !== 200 || !listado.cuerpo || !Array.isArray(listado.cuerpo.users)) {
  console.error('No se pudo leer la lista de cuentas (estado ' + listado.estado + ').');
  process.exit(1);
}

const cuentas = listado.cuerpo.users
  .filter((u) => typeof u.email === 'string' && u.email.endsWith(DOMINIO_DE_LA_SIEMBRA))
  .sort((a, b) => a.email.localeCompare(b.email));

if (cuentas.length === 0) {
  console.error('No hay ninguna cuenta de la siembra en esta base.');
  console.error('Antes:  supabase migration up --local');
  process.exit(1);
}

/* Los perfiles, para poder decir de quién es cada cuenta sin adivinarlo. */
const perfiles = await comoServicio(
  '/rest/v1/profiles?select=id,full_name,role,tenants(slug)');
const porCuenta = new Map();
if (Array.isArray(perfiles.cuerpo)) {
  for (const p of perfiles.cuerpo) porCuenta.set(p.id, p);
}

let fallos = 0;
const abiertas = [];

for (const cuenta of cuentas) {
  const puesta = await comoServicio('/auth/v1/admin/users/' + cuenta.id, {
    method: 'PUT',
    body: JSON.stringify({ password: clavePrueba, email_confirm: true })
  });
  if (puesta.estado !== 200) {
    console.error('MAL   ' + cuenta.email + ': no se le pudo poner la clave (estado '
      + puesta.estado + ').');
    fallos++;
    continue;
  }

  /* Y se comprueba que con esa clave se entre de verdad. */
  const res = await fetch(base + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cuenta.email, password: clavePrueba })
  });
  const sesion = await res.json().catch(() => null);
  if (res.status !== 200 || !sesion || !sesion.access_token) {
    console.error('MAL   ' + cuenta.email + ': la clave quedó puesta pero la entrada falla.');
    console.error('      Suele ser la fila de `auth.identities` del proveedor `email`.');
    fallos++;
    continue;
  }

  const perfil = porCuenta.get(cuenta.id) || {};
  abiertas.push({
    correo: cuenta.email,
    nombre: perfil.full_name || '(sin nombre)',
    rol: perfil.role || '(sin perfil)',
    prestadora: (perfil.tenants && perfil.tenants.slug) || '(sin Organización)'
  });
}

console.log('');
console.log('Cuentas ficticias abiertas en ' + anfitrion + ':');
console.log('');
const ancho = (campo) => Math.max(...abiertas.map((c) => c[campo].length), 0);
const anchoCorreo = ancho('correo');
const anchoRol = ancho('rol');
for (const c of abiertas) {
  console.log('  ' + c.correo.padEnd(anchoCorreo)
    + '  ' + c.rol.padEnd(anchoRol)
    + '  ' + c.prestadora.padEnd(12)
    + '  ' + c.nombre);
}
console.log('');
console.log('La clave de las ' + abiertas.length + ' es la que se pasó por CLAVE_PRUEBA_LOCAL,');
console.log('y no queda escrita en ningún lado. Para mirar las pantallas contra esta base:');
console.log('');
console.log('    python scripts/servidor_local.py 5599 --base-local');

if (fallos) {
  console.error('');
  console.error(fallos + ' cuenta(s) quedaron sin abrir.');
  process.exit(1);
}
