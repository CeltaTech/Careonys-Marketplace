/* ===================================================
   VERIFICA QUE NO VUELVA A ESCRIBIRSE A MANO LO QUE YA TIENE CLASE

       node scripts/verificar_estilos.mjs

   Hasta el 26 de agosto de 2026 las pantallas de este producto llevaban 694
   atributos `style=` escritos a mano. La mayoría no eran decisiones distintas:
   eran la misma decisión copiada —`color:var(--texto-secundario)` aparecía 112
   veces—. El pendiente 8 les puso nombre una vez en `css/utilidades.css` y las
   pantallas pasaron a usarlo.

   Esto vigila que no se deshaga solo. La regla es una sola: **si todo lo que
   dice un atributo `style=` ya tiene clase, ese atributo sobra**. No se prohíbe
   el atributo —las decisiones que aparecen una sola vez siguen escritas donde
   están, y así lo pide el pendiente 8—: se prohíbe volver a escribir a mano lo
   que la hoja de utilidades ya nombra.

   El guion no sabe de antemano qué clases hay: las lee de `css/utilidades.css`.
   Agregar una clase nueva alcanza para que empiece a vigilarla.

   Lo que hay adentro de un `<script>` o de un `.js` se cuenta aparte y no hace
   fallar: ahí el atributo lo arma una plantilla, y cambiarlo pide mirar el
   guion entero. Se informa para que se vea cuánto queda.
=================================================== */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALTAR = new Set(['node_modules', '.git', 'assets', 'supabase']);

function archivos(dir, salida = []) {
  for (const nombre of readdirSync(dir)) {
    // Las cajas fuertes no se abren, y se reconocen por el nombre.
    if (SALTAR.has(nombre) || /^no.?commit$/i.test(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (nombre.endsWith('.html') || nombre.endsWith('.js')) salida.push(ruta);
  }
  return salida;
}

/* `font-size : 11px ; color:red` → ['font-size:11px', 'color:red'] */
function declaraciones(valor) {
  return valor.split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':');
      if (i < 0) return d;
      return d.slice(0, i).trim().toLowerCase() + ':' + d.slice(i + 1).trim();
    });
}

/* Las clases de utilidad, leídas de la hoja: `.mb-12.mb-12 { margin-bottom:12px; }` */
function clasesDeUtilidad() {
  const hoja = readFileSync(join(raiz, 'css', 'utilidades.css'), 'utf8');
  const porDeclaracion = new Map();
  for (const m of hoja.matchAll(/^\.([a-zA-Z][\w-]*)(?:\.\1)+\s*\{\s*([^}]+?)\s*\}/gm)) {
    for (const d of declaraciones(m[2])) porDeclaracion.set(d, m[1]);
  }
  return porDeclaracion;
}

/* Recorre las etiquetas de verdad: entra en `<`, respeta las comillas y sale en
   el primer `>` que no esté adentro de una. Así ningún `>` escrito adentro de un
   atributo corta una etiqueta por la mitad. */
function etiquetas(s) {
  const salida = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '<' || !/[a-zA-Z]/.test(s[i + 1] || '')) continue;
    let j = i + 1, comilla = null;
    while (j < s.length) {
      const c = s[j];
      if (comilla) { if (c === comilla) comilla = null; }
      else if (c === '"' || c === "'") comilla = c;
      else if (c === '>') break;
      j++;
    }
    if (j >= s.length) break;
    salida.push([i, j + 1]);
    i = j;
  }
  return salida;
}

const rangosDeGuion = (s) => [...s.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)]
  .map((m) => [m.index, m.index + m[0].length]);

export function verificarEstilos() {
  const porDeclaracion = clasesDeUtilidad();
  const problemas = [];
  let enMarcado = 0, enGuion = 0, sobranEnGuion = 0;

  for (const ruta of archivos(raiz)) {
    const texto = readFileSync(ruta, 'utf8');
    const rel = relative(raiz, ruta).split(sep).join('/');
    const esGuion = rel.endsWith('.js');
    const guiones = esGuion ? [] : rangosDeGuion(texto);
    const renglonDe = (i) => texto.slice(0, i).split('\n').length;

    for (const [ini, fin] of etiquetas(texto)) {
      const etiqueta = texto.slice(ini, fin);
      const m = etiqueta.match(/\sstyle\s*=\s*"([^"]*)"/);
      if (!m) continue;
      const adentroDeGuion = esGuion || guiones.some((r) => ini >= r[0] && ini < r[1]);
      const decls = declaraciones(m[1]);
      const todasTienenClase = decls.length > 0 && decls.every((d) => porDeclaracion.has(d));

      if (adentroDeGuion) {
        enGuion++;
        if (todasTienenClase) sobranEnGuion++;
        continue;
      }
      enMarcado++;
      if (!todasTienenClase) continue;
      problemas.push(rel + ':' + renglonDe(ini) + '\n'
        + '  dice   style="' + m[1] + '"\n'
        + '  y ya es class="' + decls.map((d) => porDeclaracion.get(d)).join(' ') + '"');
    }
  }
  return { problemas, enMarcado, enGuion, sobranEnGuion, clases: new Set(porDeclaracion.values()).size };
}

// Solo imprime cuando se lo corre a mano, no cuando otro archivo lo importa.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const r = verificarEstilos();
  if (r.problemas.length) {
    console.error('\nAtributos `style=` que repiten a mano lo que ya tiene clase en '
      + 'css/utilidades.css:\n\n' + r.problemas.join('\n\n')
      + '\n\n' + r.problemas.length + ' atributos. Se cambian por su clase; si hacen falta '
      + 'varias, van juntas.\n');
    process.exit(1);
  }
  console.log('Estilos verificados: ' + r.clases + ' clases de utilidad, y ninguno de los '
    + r.enMarcado + ' atributos `style=` del marcado repite a mano lo que alguna ya dice. '
    + 'Quedan ' + r.enGuion + ' adentro de guiones, ' + r.sobranEnGuion + ' de ellos convertibles.');
}
