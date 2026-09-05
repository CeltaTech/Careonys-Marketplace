/* ===================================================
   EL ARCHIVO DE GUÍAS SE GENERA DESDE LA BASE

       node scripts/generar_guias.mjs             ← compara y avisa
       node scripts/generar_guias.mjs --escribir  ← rehace el archivo

   Mismo trato que `generar_vocabularios.mjs`, para las guías de cuidado de la
   migración 0041: la verdad es la base, `data/catalogo-guias.json` es una
   copia para que el teléfono del Asistente las tenga sin conexión.

   Qué trae y qué no
   -----------------
   Trae **la guía general y nada más** —`p_slug` en nulo—, por la misma razón
   que los vocabularios: el archivo viaja a todos los teléfonos, y la guía que
   escribió una Prestadora para su propia gente no se reparte a cualquiera.
   Sin conexión se ve la guía general; con conexión, la puerta reemplaza cada
   entrada por la propia si la Prestadora escribió una (pendiente 102).

   **Un catálogo vacío no es un error.** Es la diferencia con los vocabularios:
   la migración 0042 cargó las guías generales sin publicar, a la espera de que
   el Desarrollador revise cada una (pendiente 104). Hasta que eso cierre,
   `guias_de(null)` contesta `{}` legítimamente, y este guion tiene que
   escribir ese vacío tal cual, no tratarlo como una base que no contestó.

   No muestra ninguna clave: usa la publicable, la misma que ya viaja al
   navegador, y de la dirección imprime solo el nombre del servidor.
=================================================== */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { laBase, igual } from './generar_vocabularios.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const aRuta = (r) => join(raiz, r);

export const ARCHIVO = 'data/catalogo-guias.json';
export const COPIAS = [
  'pwa-asistente/data/catalogo-guias.json',
  'pwa-familia/data/catalogo-guias.json'
];

/** Las guías generales, tal como las devuelve la puerta.
 *  Devuelve `null` sólo cuando la base no contestó o contestó mal: un objeto
 *  vacío es una respuesta válida (pendiente 104 todavía no cerró) y se
 *  distingue de una base que no respondió. */
export async function traerDeLaBase() {
  const { url, clave, servidor } = laBase();
  let respuesta;
  try {
    respuesta = await fetch(url + '/rest/v1/rpc/guias_de', {
      method: 'POST',
      headers: { apikey: clave, Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: null })
    });
  } catch {
    return { guias: null, servidor, motivo: 'la base no contestó' };
  }
  if (!respuesta.ok) {
    return { guias: null, servidor, motivo: 'la base contestó ' + respuesta.status };
  }
  const datos = await respuesta.json();
  if (!datos || typeof datos !== 'object') {
    return { guias: null, servidor, motivo: 'la puerta devolvió algo que no es un objeto' };
  }
  return { guias: datos, servidor, motivo: null };
}

/** El archivo tal como está hoy. */
export function leerElArchivo() {
  const texto = readFileSync(aRuta(ARCHIVO), 'utf8');
  return { texto, datos: JSON.parse(texto) };
}

/** Arma el contenido nuevo: es lo que devuelve la base, sin nada que preservar
 *  del archivo viejo — a diferencia de los vocabularios, acá no hay un
 *  `usado_en` calculado aparte. */
export function armar(deLaBase) {
  return { guias: deLaBase };
}

/** Compara guía por guía. La estructura es `vocabulario -> opción -> campos`,
 *  sin arreglo con orden propio como los `items` de los vocabularios: el
 *  orden de las claves no es dato acá. */
export function diferencias(nuevo, viejo) {
  const problemas = [];
  const vocabulariosBase = Object.keys(nuevo.guias);
  const vocabulariosArchivo = Object.keys(viejo.guias || {});

  for (const v of vocabulariosBase) {
    if (!vocabulariosArchivo.includes(v)) problemas.push(`El vocabulario «${v}» tiene guías en la base y no en el archivo.`);
  }
  for (const v of vocabulariosArchivo) {
    if (!vocabulariosBase.includes(v)) problemas.push(`El vocabulario «${v}» tiene guías en el archivo y no en la base.`);
  }

  for (const v of vocabulariosBase.filter((v) => vocabulariosArchivo.includes(v))) {
    const opcionesBase = Object.keys(nuevo.guias[v] || {});
    const opcionesArchivo = Object.keys(viejo.guias[v] || {});
    for (const o of opcionesBase) {
      if (!opcionesArchivo.includes(o)) problemas.push(`La guía «${v}/${o}» está en la base y no en el archivo.`);
      else if (!igual(nuevo.guias[v][o], viejo.guias[v][o])) problemas.push(`La guía «${v}/${o}» no coincide entre la base y el archivo.`);
    }
    for (const o of opcionesArchivo) {
      if (!opcionesBase.includes(o)) problemas.push(`La guía «${v}/${o}» está en el archivo y no en la base.`);
    }
  }
  return problemas;
}

function escribir(nuevo, textoViejo) {
  const salto = textoViejo.includes('\r\n') ? '\r\n' : '\n';
  const texto = JSON.stringify(nuevo, null, 2).split('\n').join(salto) + salto;
  writeFileSync(aRuta(ARCHIVO), texto);
  for (const copia of COPIAS) copyFileSync(aRuta(ARCHIVO), aRuta(copia));
  console.log(`Reescrito ${ARCHIVO} desde la base y copiado a ${COPIAS.length} carpetas.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { guias, servidor, motivo } = await traerDeLaBase();
  if (!guias) {
    console.error(`No se pudo leer las guías de ${servidor}: ${motivo}.`);
    process.exit(1);
  }
  const { texto, datos } = leerElArchivo();
  const nuevo = armar(guias);

  if (process.argv.includes('--escribir')) {
    escribir(nuevo, texto);
    process.exit(0);
  }

  const problemas = diferencias(nuevo, datos);
  if (problemas.length) {
    console.error('\n' + problemas.join('\n') +
      '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
      '    node scripts/generar_guias.mjs --escribir\n');
    process.exit(1);
  }
  console.log(`El archivo coincide con ${servidor}: ${Object.keys(nuevo.guias).length} vocabularios con guías.`);
}
