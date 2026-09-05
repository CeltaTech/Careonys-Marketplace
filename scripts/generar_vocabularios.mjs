/* ===================================================
   EL ARCHIVO DEL CATÁLOGO SE GENERA DESDE LA BASE

       node scripts/generar_vocabularios.mjs             ← compara y avisa
       node scripts/generar_vocabularios.mjs --escribir  ← rehace el archivo

   Desde la migración 0038 los vocabularios viven en tablas. La verdad es la
   base; `data/catalogo-vocabularios.json` pasó a ser una copia.

   **Y no se puede borrar**, que es lo primero que uno intenta: los dos
   programas para el teléfono lo guardan para funcionar sin conexión —está
   nombrado en los dos `service-worker.js`—, y una pantalla que necesita elegir
   una patología sin señal no puede depender de que la base conteste. Así que el
   archivo se queda, pero deja de escribirse a mano.

   Es el mismo trato que le da Careonys a su código repetido: hay un original,
   las copias se generan, y una comprobación rompe la construcción si alguna se
   despegó.

   Qué trae y qué no
   -----------------
   Trae **el catálogo general y nada más** —`p_slug` en nulo—. Las opciones que
   agregó una Prestadora no entran, y eso no es un olvido: el archivo viaja a
   todos los teléfonos, así que meter ahí la lista de una Prestadora sería
   repartirle a cualquiera lo que cargó un cliente. El aislamiento no se sostiene
   en el archivo, se sostiene en la puerta: sin conexión se ven las opciones
   generales, con conexión se ven además las propias.

   `usado_en` no sale de la base y no se toca: lo calcula `verificar_usos.mjs`
   desde las pantallas, y este guion lo conserva tal cual lo encuentra. Es
   documentación del código, no dato del producto.

   No muestra ninguna clave: usa la publicable, la misma que ya viaja al
   navegador, y de la dirección imprime solo el nombre del servidor.
=================================================== */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const aRuta = (r) => join(raiz, r);

export const ARCHIVO = 'data/catalogo-vocabularios.json';
export const COPIAS = [
  'pwa-asistente/data/catalogo-vocabularios.json',
  'pwa-familia/data/catalogo-vocabularios.json'
];

/** La dirección y la clave salen del código, para pedirle a la misma base que
 *  usan las pantallas y no a otra. Se exporta: `generar_guias.mjs` la reusa en
 *  vez de leer `js/apiClient.js` por su cuenta. */
export function laBase() {
  const fuente = readFileSync(aRuta('js/apiClient.js'), 'utf8');
  const url = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
  const clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
  if (!url || !clave) throw new Error('No se pudo leer la dirección de la base desde js/apiClient.js.');
  return { url: url.replace(/\/$/, ''), clave, servidor: new URL(url).hostname };
}

/** Los vocabularios generales, tal como los devuelve la puerta.
 *  Devuelve `null` cuando la base no contesta: eso no es una diferencia, es una
 *  comprobación que no se pudo hacer, y son dos cosas distintas. */
export async function traerDeLaBase() {
  const { url, clave, servidor } = laBase();
  let respuesta;
  try {
    respuesta = await fetch(url + '/rest/v1/rpc/vocabularios_de', {
      method: 'POST',
      headers: { apikey: clave, Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_slug: null })
    });
  } catch {
    return { vocabularios: null, servidor, motivo: 'la base no contestó' };
  }
  if (!respuesta.ok) {
    return { vocabularios: null, servidor, motivo: 'la base contestó ' + respuesta.status };
  }
  const datos = await respuesta.json();
  if (!datos || typeof datos !== 'object' || Object.keys(datos).length === 0) {
    return { vocabularios: null, servidor, motivo: 'la puerta devolvió vacío' };
  }
  return { vocabularios: datos, servidor, motivo: null };
}

/** El archivo tal como está hoy. */
export function leerElArchivo() {
  const texto = readFileSync(aRuta(ARCHIVO), 'utf8');
  return { texto, datos: JSON.parse(texto) };
}

/** Arma el contenido nuevo: lo de la base, con el `usado_en` que ya estaba. */
export function armar(deLaBase, delArchivo) {
  const salida = {};
  for (const [clave, definicion] of Object.entries(deLaBase)) {
    const anterior = (delArchivo.vocabularios || {})[clave] || {};
    salida[clave] = {
      titulo: definicion.titulo,
      cerrada: definicion.cerrada,
      ...(anterior.usado_en ? { usado_en: anterior.usado_en } : {}),
      items: definicion.items
    };
  }
  return { vocabularios: salida };
}

/** Dos objetos con las mismas claves en distinto orden son el mismo objeto, y
 *  `JSON.stringify` dice que no: PostgREST devuelve el `jsonb` con sus claves
 *  ordenadas a su manera y el archivo las tiene en el orden en que se
 *  escribieron. Sin esto, todo el catálogo aparece distinto y ninguna diferencia
 *  de verdad se distingue del ruido. **El orden de los `items` sí se respeta**:
 *  ahí el orden es dato, es en el que la persona ve las opciones. */
export function igual(a, b) {
  return JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
}

export function ordenado(valor) {
  if (Array.isArray(valor)) return valor.map(ordenado);   // el orden del arreglo se conserva
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const clave of Object.keys(valor).sort()) salida[clave] = ordenado(valor[clave]);
    return salida;
  }
  return valor;
}

/** Compara el contenido, no el orden de las claves de cada objeto, que JSON no
 *  fija. El orden de los `items` sí importa y sí se compara: es el orden en que
 *  la persona ve las opciones en la pantalla. */
export function diferencias(nuevo, viejo) {
  const problemas = [];
  const enLaBase = Object.keys(nuevo.vocabularios);
  const enElArchivo = Object.keys(viejo.vocabularios || {});

  for (const c of enLaBase) {
    if (!enElArchivo.includes(c)) problemas.push(`El vocabulario «${c}» está en la base y no en el archivo.`);
  }
  for (const c of enElArchivo) {
    if (!enLaBase.includes(c)) problemas.push(`El vocabulario «${c}» está en el archivo y no en la base.`);
  }

  for (const c of enLaBase.filter((c) => enElArchivo.includes(c))) {
    const n = nuevo.vocabularios[c];
    const v = viejo.vocabularios[c];
    if (!igual(n.titulo, v.titulo)) {
      problemas.push(`El título de «${c}» no coincide entre la base y el archivo.`);
    }
    if (n.cerrada !== v.cerrada) {
      problemas.push(`«${c}» es ${n.cerrada ? 'cerrada' : 'abierta'} en la base y al revés en el archivo.`);
    }
    const clavesBase = (n.items || []).map((i) => i.clave);
    const clavesArchivo = (v.items || []).map((i) => i.clave);
    if (clavesBase.join('|') !== clavesArchivo.join('|')) {
      const faltan = clavesBase.filter((k) => !clavesArchivo.includes(k));
      const sobran = clavesArchivo.filter((k) => !clavesBase.includes(k));
      problemas.push(`Las opciones de «${c}» no coinciden.` +
        (faltan.length ? ` Están en la base y no en el archivo: ${faltan.join(', ')}.` : '') +
        (sobran.length ? ` Están en el archivo y no en la base: ${sobran.join(', ')}.` : '') +
        (!faltan.length && !sobran.length ? ' Son las mismas, en otro orden.' : ''));
      continue;
    }
    for (let k = 0; k < clavesBase.length; k++) {
      if (!igual(n.items[k], v.items[k])) {
        problemas.push(`La opción «${c}/${clavesBase[k]}» no coincide entre la base y el archivo.`);
      }
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
  const { vocabularios, servidor, motivo } = await traerDeLaBase();
  if (!vocabularios) {
    console.error(`No se pudo leer el catálogo de ${servidor}: ${motivo}.`);
    process.exit(1);
  }
  const { texto, datos } = leerElArchivo();
  const nuevo = armar(vocabularios, datos);

  if (process.argv.includes('--escribir')) {
    escribir(nuevo, texto);
    process.exit(0);
  }

  const problemas = diferencias(nuevo, datos);
  if (problemas.length) {
    console.error('\n' + problemas.join('\n') +
      '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
      '    node scripts/generar_vocabularios.mjs --escribir\n');
    process.exit(1);
  }
  console.log(`El archivo coincide con ${servidor}: ${Object.keys(nuevo.vocabularios).length} vocabularios.`);
}
