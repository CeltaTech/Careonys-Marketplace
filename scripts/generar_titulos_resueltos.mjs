/* ===================================================
   RESUELVE {{organizacion}} EN EL <title> Y LA <meta description>
   QUE ENTREGA EL SERVIDOR

   Por qué hace falta: un buscador no ejecuta guiones, así que el marcador
   crudo en el `<title>` o en la `<meta name="description">` quedaba indexado
   tal cual — fue el pendiente 79, cerrado. `js/identidad.js` resuelve estos marcadores en el
   navegador, y eso sigue intacto para quien sí lo ejecuta —incluida la
   Prestadora, que se resuelve después—; esto es lo mismo, hecho una vez acá
   para lo que el servidor entrega antes de que ningún guion corra.

   El marcador con el que se escribió sigue viviendo en el atributo
   `data-organizacion-original`, así que este archivo no es una copia a mano
   de la marca: es una lectura de ese atributo, resuelta con
   `js/identidad.js`, igual que hace el navegador. Cambiar la marca es cambiar
   `js/identidad.js` y correr:

       node scripts/generar_titulos_resueltos.mjs

   `scripts/verificar_identidad.mjs` llama a `revisarTitulosResueltos(false)`
   para comprobar que nadie los dejó desactualizados, y a `lineasGeneradas`
   para no marcar como «escrita a mano» la marca que este archivo genera.
=================================================== */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Identidad } = require(join(raiz, 'js', 'identidad.js'));

const ATRIBUTO = 'data-organizacion-original';
const PATRON_TITULO = /<title\b([\s\S]*?)>([^<]*)<\/title>/gi;
const PATRON_META_DESC = /<meta\s+name="description"([\s\S]*?)\/?>/gi;

// El límite de palabra no alcanza: `content` es sufijo de `data-frase-content`,
// así que hace falta que lo de antes sea el arranque del atributo (un espacio
// o el principio de la cadena), no cualquier letra ni un guion.
function atributo(nombre, texto) {
  const m = texto.match(new RegExp('(?:^|\\s)' + nombre + '="([^"]*)"'));
  return m ? m[1] : null;
}

function renglon(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

/**
 * Recorre un texto de pantalla y devuelve, por cada `<title>` o
 * `<meta name="description">` que tenga `data-organizacion-original`, dónde
 * está, qué dice hoy y qué debería decir.
 */
function ocurrencias(texto) {
  const hallados = [];
  for (const patron of [PATRON_TITULO, PATRON_META_DESC]) {
    patron.lastIndex = 0;
    let m;
    while ((m = patron.exec(texto))) {
      const original = atributo(ATRIBUTO, m[1]);
      if (!original) continue;
      const esTitulo = patron === PATRON_TITULO;
      const actual = esTitulo ? m[2] : atributo('content', m[1]);
      if (actual === null) continue;
      hallados.push({
        esTitulo,
        matchDesde: m.index,
        matchHasta: m.index + m[0].length,
        renglonDesde: renglon(texto, m.index),
        renglonHasta: renglon(texto, m.index + m[0].length),
        original,
        actual,
        resuelto: Identidad.aplicar(original)
      });
    }
  }
  return hallados;
}

/** Las líneas (1-indexadas) que este generador controla en ese texto. */
export function lineasGeneradas(texto) {
  const lineas = new Set();
  for (const h of ocurrencias(texto)) {
    for (let i = h.renglonDesde; i <= h.renglonHasta; i++) lineas.add(i);
  }
  return lineas;
}

function conTextoResuelto(texto, hallazgo) {
  if (hallazgo.esTitulo) {
    const bloque = texto.slice(hallazgo.matchDesde, hallazgo.matchHasta);
    const reemplazado = bloque.replace(
      />([^<]*)<\/title>$/,
      '>' + hallazgo.resuelto + '</title>'
    );
    return texto.slice(0, hallazgo.matchDesde) + reemplazado + texto.slice(hallazgo.matchHasta);
  }
  const bloque = texto.slice(hallazgo.matchDesde, hallazgo.matchHasta);
  const reemplazado = bloque.replace(
    /content="[^"]*"/,
    'content="' + hallazgo.resuelto + '"'
  );
  return texto.slice(0, hallazgo.matchDesde) + reemplazado + texto.slice(hallazgo.matchHasta);
}

// Devuelve las pantallas cuyo título o descripción resueltos quedaron atrás
// de `js/identidad.js`. Con `escribir` en falso no toca nada: eso es lo que
// usa `verificar_identidad.mjs`.
export function revisarTitulosResueltos(escribir) {
  const desactualizados = [];
  for (const ruta of hayArchivos(raiz, EXTENSIONES_DE_PANTALLA, ['docs'])) {
    let texto = readFileSync(ruta, 'utf8');
    const rel = relative(raiz, ruta).split(sep).join('/');
    let cambiado = false;
    for (const h of ocurrencias(texto).sort((a, b) => b.matchDesde - a.matchDesde)) {
      if (h.actual === h.resuelto) continue;
      desactualizados.push(rel + ':' + h.renglonDesde + (h.esTitulo ? ' (title)' : ' (meta description)'));
      if (escribir) {
        texto = conTextoResuelto(texto, h);
        cambiado = true;
      }
    }
    if (cambiado) writeFileSync(ruta, texto, 'utf8');
  }
  return desactualizados;
}

// Solo escribe cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const cambiados = revisarTitulosResueltos(true);
  cambiados.forEach((c) => console.log('resuelto ' + c));
  console.log(cambiados.length === 0
    ? 'Los títulos y descripciones ya estaban resueltos.'
    : 'Títulos y descripciones generados: ' + cambiados.length);
}
