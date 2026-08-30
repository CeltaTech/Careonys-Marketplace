/* ===================================================
   DOS COORDINADORAS DE PRUEBA EN LA BASE DE ESTA MÁQUINA

       CLAVE_PRUEBA_LOCAL=... node scripts/preparar_coordinadores_locales.mjs

   Por qué existe. Hay pantallas del panel que sólo se abren con rol
   `coordinador` —`panel-prestadora.html`, `guias-prestadora.html`—, y ese rol
   **no se puede pedir al registrarse**: el disparador de la migración 0005 lo
   filtra a propósito, porque un rol que saliera de los metadatos sería un rol
   autoasignado. Así que hasta acá esas pantallas no se podían mirar en el
   navegador con datos de verdad, y lo que se comprobaba era la política de la
   base y nunca la pantalla.

   Este guion deja dos cuentas, una en cada Prestadora ficticia, con ese rol
   puesto desde afuera —que es exactamente como se da en la vida real: lo da
   alguien que ya está adentro—. Con esas dos se puede sentar a mirar una
   pantalla del panel desde los dos lados y ver si el aislamiento se sostiene
   donde lo ve una persona, no sólo donde lo ve una consulta.

   Qué no hace, y por qué:

   - **No inventa ninguna clave ni la escribe en ningún lado.** La toma de la
     variable de entorno `CLAVE_PRUEBA_LOCAL` y, si no está, se niega a correr.
     Una clave escrita adentro de un guion del repositorio es una clave en el
     repositorio, diga lo que diga el comentario de al lado.
   - **No corre contra ninguna base que no sea la de esta máquina.** Comprueba
     que la dirección sea local y, si no lo es, se planta. Las cuentas que crea
     entran confirmadas y sin que nadie mande un correo, que es una comodidad
     razonable en una base que se rehace entera y un agujero en cualquier otra.
   - **No muestra ninguna clave**, ni la de servicio que usa para ascender a
     coordinador ni la que recibió por la variable de entorno.

   Correrlo dos veces no duplica nada: si la cuenta ya existe, le pone la clave
   nueva y se asegura del rol y de la Prestadora.
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
  console.error('    CLAVE_PRUEBA_LOCAL=<la que elija> node scripts/preparar_coordinadores_locales.mjs');
  process.exit(1);
}

/* `supabase status -o env` imprime las direcciones y claves del entorno de esta
   máquina. Se leen de ahí y no se escriben acá: si cambian, esto sigue
   andando. Ninguna se imprime. */
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

/* El freno que hace que esto no pueda correr donde no debe. Va antes de tocar
   nada: crear cuentas ya confirmadas contra un servidor de verdad es
   exactamente lo que la confirmación por correo viene a impedir. */
const anfitrion = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(anfitrion)) {
  console.error('Esto corre sólo contra la base de esta máquina, y la dirección es ' + anfitrion + '.');
  process.exit(1);
}

const base = url.replace(/\/$/, '');

/* Una por Prestadora ficticia. El correo es inventado y el dominio también:
   `ejemplo.com` está reservado justamente para esto. */
const CUENTAS = [
  { slug: 'presdemo', correo: 'coordinadora.presdemo@ejemplo.com', nombre: 'Coordinadora de PresDemo' },
  { slug: 'cuidarnorte', correo: 'coordinadora.cuidarnorte@ejemplo.com', nombre: 'Coordinadora de CuidarNorte' }
];

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

let fallos = 0;

for (const cuenta of CUENTAS) {
  const prestadora = await comoServicio(
    '/rest/v1/tenants?select=id,name&slug=eq.' + cuenta.slug + '&limit=1');
  const fila = Array.isArray(prestadora.cuerpo) ? prestadora.cuerpo[0] : null;
  if (!fila) {
    console.error('MAL   No existe la Prestadora «' + cuenta.slug + '». ¿Falta la migración 0003?');
    fallos++;
    continue;
  }

  /* El alta pasa por el disparador de la 0005, que arma el perfil con la
     Prestadora de los metadatos y con un rol sin acceso. El ascenso viene
     después y por separado, que es el orden que la migración quiso. */
  let alta = await comoServicio('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: cuenta.correo,
      password: clavePrueba,
      email_confirm: true,
      user_metadata: { full_name: cuenta.nombre, tenant_slug: cuenta.slug }
    })
  });

  let identificador = alta.cuerpo && alta.cuerpo.id;

  if (!identificador) {
    // Ya existía: se la busca y se le pone la clave de esta corrida.
    const buscada = await comoServicio(
      '/auth/v1/admin/users?page=1&per_page=200');
    const usuarios = (buscada.cuerpo && buscada.cuerpo.users) || [];
    const encontrada = usuarios.find((u) => u.email === cuenta.correo);
    if (!encontrada) {
      console.error('MAL   No se pudo crear ni encontrar ' + cuenta.correo + '.');
      fallos++;
      continue;
    }
    identificador = encontrada.id;
    const puesta = await comoServicio('/auth/v1/admin/users/' + identificador, {
      method: 'PUT',
      body: JSON.stringify({ password: clavePrueba, email_confirm: true })
    });
    if (puesta.estado >= 400) {
      console.error('MAL   No se pudo poner la clave de ' + cuenta.correo + '.');
      fallos++;
      continue;
    }
  }

  /* El ascenso. Se escribe con la clave de servicio a propósito: ninguna
     sesión puede cambiarse el rol a sí misma, y ésa es justamente la política
     que la 0005 puso y que no se toca para probar. */
  const ascenso = await comoServicio('/rest/v1/profiles?id=eq.' + identificador, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ role: 'coordinador', tenant_id: fila.id, full_name: cuenta.nombre })
  });

  const perfil = Array.isArray(ascenso.cuerpo) ? ascenso.cuerpo[0] : null;
  if (!perfil || perfil.role !== 'coordinador' || perfil.tenant_id !== fila.id) {
    console.error('MAL   ' + cuenta.correo + ' quedó sin el rol o sin la Prestadora.');
    fallos++;
    continue;
  }

  console.log('bien  ' + cuenta.correo + '  coordinadora de ' + fila.name);
}

console.log('');
if (fallos) {
  console.error(fallos + ' cuenta(s) sin preparar.');
  process.exit(1);
}
console.log('Dos coordinadoras listas en ' + anfitrion + ', una por Prestadora.');
console.log('La clave es la que se pasó por CLAVE_PRUEBA_LOCAL y no queda escrita en ningún lado.');
