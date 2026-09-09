/* ===================================================
   LAS REGLAS DEL CHAT SE GENERAN DESDE LA BASE

       node scripts/generar_patrones_contacto.mjs             ← compara y avisa
       node scripts/generar_patrones_contacto.mjs --escribir  ← rehace el archivo

   Las reglas con las que se reconoce un dato de contacto viven en la tabla
   `patrones_de_contacto` (`supabase/migrations/0001_base_del_esquema.sql:2928`),
   porque ahí es donde las
   necesita la puerta de verdad: el disparador que revisa el mensaje **antes de
   guardarlo**, del lado del servidor, donde nadie lo puede saltear.

   `data/patrones-contacto.json` pasó a ser una copia, y no se puede borrar por
   el mismo motivo que el catálogo de vocabularios: el reconocedor del navegador
   —`js/contacto.js`— avisa antes de mandar, y tiene que poder avisar sin
   conexión. Así que el archivo se queda y deja de escribirse a mano.

   POR QUÉ ESTO EXISTE Y NO ALCANZABA CON DEJAR LAS DOS
   La condición de cierre del pendiente 62, ya cerrado, decía que el control del servidor use
   **las mismas reglas que la pantalla y no una segunda copia de ellas**. Dos
   listas separadas coinciden el primer día y ninguno de los dos lados avisa el
   día que dejan de coincidir. Peor todavía: la que se despega en silencio es la
   del navegador, que es la que la persona ve, así que el aviso diría una cosa y
   el servidor haría otra.

   QUÉ SE REHACE Y QUÉ SE CONSERVA
   Se rehace **`reglas` y nada más**. Todo lo demás del archivo se conserva tal
   cual está: las claves que empiezan con `_`, que son documentación para quien
   lo abra, y `aviso`, que es la frase que muestra el reconocedor del navegador
   antes de mandar. Ninguna de las dos es una regla, ninguna vive en la tabla, y
   ninguna se pierde al regenerar. Es el mismo trato que `generar_vocabularios`
   le da a `usado_en`.

   Y `orden` tampoco entra en el archivo: en la tabla es una columna porque la
   consulta necesita ordenar; acá el orden ya está dicho por el orden del
   arreglo. Guardar el número además del orden sería guardar lo mismo dos veces.

   No muestra ninguna clave: usa la publicable, la misma que ya viaja al
   navegador, y de la dirección imprime solo el nombre del servidor.
=================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const aRuta = (r) => join(raiz, r);

export const ARCHIVO = 'data/patrones-contacto.json';

/* Este archivo **no se triplica**, al revés que los dos catálogos: los dos
   programas para el teléfono no lo usan. El chat de las PWAs es
   `js/conversacion.js`, que no hace revisión previa y se apoya en la puerta del
   servidor. El único que lee el archivo es `js/contacto.js`. */
export const COPIAS = [];

/** La dirección y la clave salen del código, para pedirle a la misma base que
 *  usan las pantallas y no a otra. */
function laBase() {
  const fuente = readFileSync(aRuta('js/apiClient.js'), 'utf8');
  const url = (fuente.match(/supabaseUrl:\s*'([^']+)'/) || [])[1];
  const clave = (fuente.match(/supabaseKey:\s*'([^']+)'/) || [])[1];
  if (!url || !clave) throw new Error('No se pudo leer la dirección de la base desde js/apiClient.js.');
  return { url: url.replace(/\/$/, ''), clave, servidor: new URL(url).hostname };
}

/** Las reglas encendidas, en el orden en que las aplica el servidor.
 *  Devuelve `null` cuando la base no contesta: eso no es una diferencia, es una
 *  comprobación que no se pudo hacer, y son dos cosas distintas. */
export async function traerDeLaBase() {
  const { url, clave, servidor } = laBase();
  const direccion = url + '/rest/v1/patrones_de_contacto' +
    '?select=clave,patron,banderas,motivo&activo=is.true&order=orden.asc,clave.asc';
  let respuesta;
  try {
    respuesta = await fetch(direccion, {
      headers: { apikey: clave, Authorization: 'Bearer ' + clave }
    });
  } catch {
    return { reglas: null, servidor, motivo: 'la base no contestó' };
  }
  if (!respuesta.ok) {
    return { reglas: null, servidor, motivo: 'la base contestó ' + respuesta.status };
  }
  const datos = await respuesta.json();
  if (!Array.isArray(datos) || datos.length === 0) {
    /* Cero reglas nunca es un dato bueno. Si el archivo se rehiciera con esta
       respuesta, la puerta del navegador quedaría abierta de par en par y el
       guion habría dicho que todo salió bien. */
    return { reglas: null, servidor, motivo: 'la tabla devolvió vacío' };
  }
  return { reglas: datos, servidor, motivo: null };
}

/** El archivo tal como está hoy. */
export function leerElArchivo() {
  const texto = readFileSync(aRuta(ARCHIVO), 'utf8');
  return { texto, datos: JSON.parse(texto) };
}

/** Arma el contenido nuevo: las reglas de la base, con todo lo demás del
 *  archivo en el mismo lugar donde estaba. */
export function armar(deLaBase, delArchivo) {
  const salida = {};
  for (const [clave, valor] of Object.entries(delArchivo)) {
    salida[clave] = clave === 'reglas'
      ? deLaBase.map((r) => ({ clave: r.clave, patron: r.patron, banderas: r.banderas, motivo: r.motivo }))
      : valor;
  }
  if (!salida.reglas) {
    salida.reglas = deLaBase.map((r) => ({ clave: r.clave, patron: r.patron, banderas: r.banderas, motivo: r.motivo }));
  }
  return salida;
}

/** Dos objetos con las mismas claves en distinto orden son el mismo objeto, y
 *  `JSON.stringify` dice que no: PostgREST devuelve el `jsonb` del motivo con
 *  sus claves ordenadas a su manera y el archivo las tiene en el orden en que se
 *  escribieron. **El orden de las reglas sí se compara**: ahí el orden es dato,
 *  es el orden en que se aplican, y es el que decide cuál de dos reglas nombra
 *  el rechazo. */
function igual(a, b) {
  return JSON.stringify(ordenado(a)) === JSON.stringify(ordenado(b));
}

function ordenado(valor) {
  if (Array.isArray(valor)) return valor.map(ordenado);   // el orden del arreglo se conserva
  if (valor && typeof valor === 'object') {
    const salida = {};
    for (const clave of Object.keys(valor).sort()) salida[clave] = ordenado(valor[clave]);
    return salida;
  }
  return valor;
}

/** Compara regla por regla y dice cuál se despegó, no «el archivo cambió». */
export function diferencias(nuevo, viejo) {
  const problemas = [];
  const deLaBase = nuevo.reglas || [];
  const delArchivo = viejo.reglas || [];

  const clavesBase = deLaBase.map((r) => r.clave);
  const clavesArchivo = delArchivo.map((r) => r.clave);

  for (const c of clavesBase) {
    if (!clavesArchivo.includes(c)) problemas.push(`La regla «${c}» está en la base y no en el archivo.`);
  }
  for (const c of clavesArchivo) {
    if (!clavesBase.includes(c)) problemas.push(`La regla «${c}» está en el archivo y no en la base.`);
  }
  if (problemas.length === 0 && clavesBase.join('|') !== clavesArchivo.join('|')) {
    problemas.push(`Las reglas son las mismas pero en otro orden. En la base: ${clavesBase.join(', ')}.`);
  }
  if (problemas.length) return problemas;

  for (let k = 0; k < deLaBase.length; k++) {
    const n = deLaBase[k];
    const v = delArchivo[k];
    /* El patrón se compara al carácter, sin normalizar nada: una barra invertida
       de más o de menos es exactamente la clase de diferencia por la que existe
       este chequeo. */
    if (n.patron !== v.patron) {
      problemas.push(`La expresión de «${n.clave}» no coincide entre la base y el archivo.`);
    }
    if (n.banderas !== v.banderas) {
      problemas.push(`Las banderas de «${n.clave}» son «${n.banderas}» en la base y «${v.banderas}» en el archivo.`);
    }
    if (!igual(n.motivo, v.motivo)) {
      problemas.push(`El motivo de «${n.clave}» no coincide entre la base y el archivo.`);
    }
  }
  return problemas;
}

function escribir(nuevo, textoViejo) {
  const salto = textoViejo.includes('\r\n') ? '\r\n' : '\n';
  const texto = JSON.stringify(nuevo, null, 2).split('\n').join(salto) + salto;
  writeFileSync(aRuta(ARCHIVO), texto);
  console.log(`Reescrito ${ARCHIVO} desde la base: ${nuevo.reglas.length} reglas.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { reglas, servidor, motivo } = await traerDeLaBase();
  if (!reglas) {
    console.error(`No se pudieron leer las reglas de ${servidor}: ${motivo}.`);
    process.exit(1);
  }
  const { texto, datos } = leerElArchivo();
  const nuevo = armar(reglas, datos);

  if (process.argv.includes('--escribir')) {
    escribir(nuevo, texto);
    process.exit(0);
  }

  const problemas = diferencias(nuevo, datos);
  if (problemas.length) {
    console.error('\n' + problemas.join('\n') +
      '\n\nEl archivo es una copia de la base, no se edita a mano. Se rehace con:\n' +
      '    node scripts/generar_patrones_contacto.mjs --escribir\n');
    process.exit(1);
  }
  console.log(`El archivo coincide con ${servidor}: ${nuevo.reglas.length} reglas.`);
}
