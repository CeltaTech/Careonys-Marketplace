/* ¿Puede una visita sin sesión dejar su consulta?

   Es exactamente lo que hace `solicitar-asistente.html`: un POST a
   `avisos` con los datos de contacto y el motivo, sin haber iniciado
   sesión. Contra la base local, con datos inventados.

   Trae su comprobación de sostén: la misma fila, con una sesión, tiene que
   entrar. Sin eso, una tabla cerrada para todos daría el mismo rojo y la
   prueba no distinguiría nada. */

import { execFileSync } from 'node:child_process';

const salida = execFileSync('supabase', ['status', '-o', 'env'],
  { cwd: 'F:/proyectos/celtatech/productos/careonys-marketplace', encoding: 'utf8', shell: true });
const url = (salida.match(/^API_URL="?([^"\s]+)/m) || [])[1];
const clave = (salida.match(/^ANON_KEY="?([^"\s]+)/m) || [])[1];
if (!url || !clave) { console.error('El entorno local no está levantado.'); process.exit(1); }
const base = url.replace(/\/$/, '');

const fila = {
  patient_name: 'Consulta de prueba',
  consultation_reason: 'cursos',
  schedule_type: 'A coordinar',
  contact_info: { nombre: 'Persona Inventada', email: 'inventada@ejemplo.test', celular: '000' }
};

async function intentar(titulo, jwt) {
  const r = await fetch(base + '/rest/v1/avisos', {
    method: 'POST',
    headers: {
      apikey: clave,
      Authorization: 'Bearer ' + (jwt || clave),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(fila)
  });
  const cuerpo = await r.text();
  console.log(titulo + ': ' + r.status + ' — ' + cuerpo.slice(0, 180));
  return { estado: r.status, cuerpo };
}

const sinSesion = await intentar('Sin sesión (lo que hace la pantalla pública)', null);

// Sostén: con una cuenta recién inventada, la misma fila tiene que entrar.
const correo = 'consulta.' + process.pid + '@ejemplo.test';
const alta = await fetch(base + '/auth/v1/signup', {
  method: 'POST',
  headers: { apikey: clave, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: correo, password: 'clave-inventada-larga-1' })
});
const cuenta = await alta.json();
if (!cuenta.access_token) {
  console.log('Sostén: no se pudo crear la cuenta ficticia, así que la prueba no distingue nada.');
  console.log(JSON.stringify(cuenta).slice(0, 200));
} else {
  await intentar('Con sesión recién creada (el sostén)', cuenta.access_token);
}

console.log('');
console.log(sinSesion.estado === 201
  ? 'La consulta pública SÍ se guarda.'
  : 'La consulta pública NO se guarda: la pantalla dice que falló y tiene razón.');
