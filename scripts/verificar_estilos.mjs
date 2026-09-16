/* ===================================================
   VERIFICA QUE NO VUELVA A ESCRIBIRSE A MANO LO QUE YA TIENE CLASE

       node scripts/verificar_estilos.mjs

   Hasta el 26 de agosto de 2026 las pantallas de este producto llevaban 694
   atributos `style=` escritos a mano. La mayoría no eran decisiones distintas:
   eran la misma decisión copiada —`color:var(--texto-secundario)` aparecía 112
   veces—. El pendiente 8, cerrado el 26 de agosto de 2026, les puso nombre una
   vez en `css/utilidades.css` y las pantallas pasaron a usarlo.

   Esto vigila que no se deshaga solo. La regla es una sola: **si todo lo que
   dice un atributo `style=` ya tiene clase, ese atributo sobra**. No se prohíbe
   el atributo —las decisiones que aparecen una sola vez siguen escritas donde
   están, y así lo pidió el pendiente 8 al cerrarse—: se prohíbe volver a escribir a mano lo
   que la hoja de utilidades ya nombra.

   El guion no sabe de antemano qué clases hay: las lee de `css/utilidades.css`.
   Agregar una clase nueva alcanza para que empiece a vigilarla.

   Lo que hay adentro de un `<script>` o de un `.js` se cuenta aparte y no hace
   fallar: ahí el atributo lo arma una plantilla, y cambiarlo pide mirar el
   guion entero. Se informa para que se vea cuánto queda.

   **Y la regla no depende de cómo se escriba el atributo.** Una pantalla
   suelta lo escribe con comillas y una pantalla de un programa lo escribe
   como una lista de pares; es la misma decisión, cae en la misma regla y se
   cuenta junto con las otras. Si sólo se mirara la forma vieja, la mitad del
   producto habría quedado sin vigilancia el día que pasó a ser un programa.

   **Y tampoco de dónde esté escrita la lista.** Una pantalla de un programa
   puede escribirla ahí mismo, pegada al atributo, o subirla arriba de todo con
   un nombre y poner el nombre en el atributo, que es lo que se hace cuando la
   misma lista se usa en dos renglones. Es la misma decisión escrita de otra
   manera. Hasta el 16 de septiembre de 2026 acá se buscaba el texto `style={{`
   y nada más, así que la lista con nombre no la miraba nadie: dos de ellas
   estaban repitiendo a mano lo que la hoja de utilidades ya nombra, en una
   pantalla abierta y contada, y el renglón verde las contaba de menos.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Lo único que este chequeo decide por su cuenta es qué carpetas no le
   interesan: un dibujo no es una pantalla, y lo que cuelga de `supabase` es
   esquema, no marcado.

   Qué es una caja fuerte, qué carpeta no es del proyecto y qué archivo anuncia
   una clave lo decide `recorrido.mjs` y nadie más. Acá había una lista propia
   que creía saberlo, y dejaba abiertas siete puertas que el proyecto cierra:
   entre ellas `dist`, que es el producto armado —o sea, el mismo marcado
   contado dos veces— y las cajas fuertes escritas de cualquier otra forma que
   no fuera «no commit». */
const AJENAS = ['assets', 'supabase'];

/* Los que sobran y no se cambian todavía, con su motivo escrito al lado. La
   pantalla se nombra sin su extensión, que la sabe `recorrido.mjs`. Y no se
   exime la pantalla entera sino cada lista, por las clases que dirían lo mismo
   —no por el renglón, que se corre solo—: así una lista nueva ahí adentro sigue
   cayendo en la regla y no queda perdonada de arriba. */
const ESPERAN_LA_MAQUETA = new Map([
  ['pwa-familia/src/pantallas/Reportes', {
    clases: ['centrar-texto texto-12 color-secundario p-20',
      'centrar-texto texto-12 color-peligro p-20'],
    motivo: 'la maqueta de las dos aplicaciones de teléfono la trae el Desarrollador, y hasta '
      + 'que llegue no se toca ahí nada de cómo se ve: cambiarlo ahora es trabajo que la '
      + 'maqueta pisa'
  }]
]);

const sinExtension = (rel) => {
  for (const punta of EXTENSIONES_DE_PANTALLA) {
    if (rel.endsWith(punta)) return rel.slice(0, -punta.length);
  }
  return rel;
};

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
  seRevisaron(porDeclaracion.size, 'una sola clase de utilidad en `css/utilidades.css`');
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

/* ---- EL MISMO ATRIBUTO, ESCRITO COMO LO ESCRIBE UN PROGRAMA ----
   Una pantalla suelta dice `style="gap:12px"`: una cadena de texto, con el
   nombre de la propiedad tal como se escribe en una hoja. Una pantalla de un
   programa dice lo mismo `style={{ gap: 12 }}`: una lista de pares, con el
   nombre en una sola palabra y el número sin unidad, que quiere decir
   píxeles. Es la misma decisión y tiene que caer en la misma regla, porque si
   no la mitad de las pantallas del producto dejarían de estar vigiladas el
   día que pasaron a ser parte de un programa.

   Sólo cuenta la lista que está escrita entera con todas las letras. Si
   alguno de los valores sale de una cuenta o de una variable, la lista no se
   puede comparar con ninguna clase, y una clase no podría reemplazarla
   aunque existiera: eso no es repetir a mano, es decidir en el momento. */

/* Las propiedades que no llevan unidad: un número suelto ahí vale por sí
   mismo, y ponerle píxeles lo convertiría en otra cosa. */
const SIN_UNIDAD = new Set([
  'opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow',
  'flexShrink', 'order', 'columnCount', 'gridColumn', 'gridRow', 'gridArea',
  'tabSize', 'zoom', 'aspectRatio', 'animationIterationCount'
]);

const UN_NUMERO = /^-?[0-9]+(\.[0-9]+)?$/;

/** Dónde empieza y termina cada lista de estilos escrita como la escribe un
    programa. Se cuentan las llaves respetando lo que esté entre comillas, así
    una llave escrita adentro de un texto no corta la lista por la mitad. */
/* La lista puesta arriba con un nombre, que el atributo después nombra. El
   nombre se busca declarado en el mismo archivo: si viene de afuera —un
   parámetro, algo importado— acá no hay ninguna lista que leer, y eso no es
   repetir a mano. Se informa el renglón donde está escrita la lista y no el del
   atributo, porque es ahí donde se cambia. */
const LA_NOMBRA = /style=\{\s*([A-Za-z_$][\w$]*)\s*\}/g;

export function objetosDeEstilo(s) {
  const ABRE = 'style={{';
  const salida = [];
  let i = s.indexOf(ABRE);
  while (i >= 0) {
    let hondo = 1, comilla = null, j = i + ABRE.length;
    for (; j < s.length && hondo > 0; j++) {
      const c = s[j];
      if (comilla) { if (c === comilla) comilla = null; continue; }
      if (c === "'" || c === '"' || c === '`') comilla = c;
      else if (c === '{') hondo++;
      else if (c === '}') hondo--;
    }
    if (hondo > 0) break;
    salida.push([i, s.slice(i + ABRE.length, j - 1)]);
    i = s.indexOf(ABRE, j);
  }
  const yaEsta = new Set(salida.map(([donde]) => donde));
  for (const m of s.matchAll(LA_NOMBRA)) {
    const declarada = s.match(new RegExp(String.raw`\b(?:const|let|var)\s+${m[1]}\s*=\s*\{`));
    if (!declarada) continue;
    if (yaEsta.has(declarada.index)) continue;
    const arranque = declarada.index + declarada[0].length;
    let hondo = 1, comilla = null, j = arranque;
    for (; j < s.length && hondo > 0; j++) {
      const c = s[j];
      if (comilla) { if (c === comilla) comilla = null; continue; }
      if (c === "'" || c === '"' || c === '`') comilla = c;
      else if (c === '{') hondo++;
      else if (c === '}') hondo--;
    }
    if (hondo > 0) continue;
    yaEsta.add(declarada.index);
    salida.push([declarada.index, s.slice(arranque, j - 1), m[1]]);
  }
  return salida.sort((a, b) => a[0] - b[0]);
}

/** Los pares de la lista, cortando por las comas que están al aire: una coma
    adentro de un texto o de unos paréntesis pertenece al valor y no separa. */
export function pares(cuerpo) {
  const partes = [];
  let actual = '', hondo = 0, comilla = null;
  for (const c of cuerpo) {
    if (comilla) { actual += c; if (c === comilla) comilla = null; continue; }
    if (c === "'" || c === '"' || c === '`') { comilla = c; actual += c; continue; }
    if (c === '{' || c === '[' || c === '(') hondo++;
    if (c === '}' || c === ']' || c === ')') hondo--;
    if (c === ',' && hondo === 0) { partes.push(actual); actual = ''; continue; }
    actual += c;
  }
  if (actual.trim()) partes.push(actual);
  return partes;
}

/** La lista escrita como la escribiría una hoja, o `null` si alguno de los
    valores no está escrito con todas las letras. */
function declaracionesDeUnObjeto(cuerpo) {
  const salida = [];
  for (const parte of pares(cuerpo)) {
    const crudo = parte.trim();
    const corte = crudo.indexOf(':');
    if (corte < 0) return null;
    let clave = crudo.slice(0, corte).trim();
    const valor = crudo.slice(corte + 1).trim();
    const entrecomillado = /^'[^']*'$|^"[^"]*"$/.test(clave);
    if (entrecomillado) clave = clave.slice(1, -1);
    const enLaHoja = entrecomillado ? clave
      : clave.replace(/[A-Z]/g, (letra) => '-' + letra.toLowerCase());
    if (/^'[^']*'$|^"[^"]*"$/.test(valor)) {
      salida.push(enLaHoja.toLowerCase() + ':' + valor.slice(1, -1).trim());
    } else if (UN_NUMERO.test(valor)) {
      const unidad = Number(valor) === 0 || SIN_UNIDAD.has(clave) ? '' : 'px';
      salida.push(enLaHoja.toLowerCase() + ':' + valor + unidad);
    } else return null;
  }
  return salida.length > 0 ? salida : null;
}

const rangosDeGuion = (s) => [...s.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)]
  .map((m) => [m.index, m.index + m[0].length]);

export function verificarEstilos() {
  const porDeclaracion = clasesDeUtilidad();

  /* Una prueba que no puede fallar no prueba nada: antes de recorrer el
     proyecto, el lector de listas se prueba contra una que sobra entera, una
     que decide en el momento y una que dice algo que ninguna clase nombra. */
  const sobra = (fragmento) => {
    const [primero] = objetosDeEstilo(fragmento);
    const decls = primero && declaracionesDeUnObjeto(primero[1]);
    return Boolean(decls && decls.every((d) => porDeclaracion.has(d)));
  };
  const BANCO = [
    ["style={{ display: 'flex', alignItems: 'center' }}", true],
    ['style={{ gap: 12 }}', true],
    ['style={{ gap: separacion }}', false],
    ["style={{ padding: '40px 24px' }}", false],
    /* Y la misma lista subida arriba con un nombre. Mientras todo lo que se
       probaba acá venía pegado al atributo, el lector podía no conocer ninguna
       otra manera de escribirla y este banco seguía en verde. */
    ["const E = { display: 'flex', alignItems: 'center' };\n<p style={E}>x</p>", true],
    ['const E = { gap: separacion };\n<p style={E}>x</p>', false]
  ];
  const rotas = BANCO.filter(([fragmento, esperado]) => sobra(fragmento) !== esperado);
  if (rotas.length) {
    console.error('El lector de listas de estilo está roto, así que no verifica nada:');
    for (const [fragmento] of rotas) console.error('  - ' + fragmento);
    process.exit(1);
  }

  const problemas = [];
  let enMarcado = 0, enGuion = 0, sobranEnGuion = 0, esperan = 0;

  const rutas = hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS);
  for (const ruta of rutas) {
    const texto = readFileSync(ruta, 'utf8');
    const rel = relative(raiz, ruta).split(sep).join('/');
    const esGuion = rel.endsWith('.js');
    const guiones = esGuion ? [] : rangosDeGuion(texto);
    const renglonDe = (i) => texto.slice(0, i).split('\n').length;

    for (const [ini, cuerpo, nombre] of objetosDeEstilo(texto)) {
      enMarcado++;
      const decls = declaracionesDeUnObjeto(cuerpo);
      if (!decls || !decls.every((d) => porDeclaracion.has(d))) continue;
      const clases = decls.map((d) => porDeclaracion.get(d)).join(' ');
      const espera = ESPERAN_LA_MAQUETA.get(sinExtension(rel));
      if (espera && espera.clases.includes(clases)) { esperan++; continue; }
      const escrita = nombre
        ? 'la lista `' + nombre + '` = { ' + cuerpo.replace(/\s+/g, ' ').trim() + ' }'
        : 'style={{ ' + cuerpo.replace(/\s+/g, ' ').trim() + ' }}';
      problemas.push(rel + ':' + renglonDe(ini) + '\n'
        + '  dice   ' + escrita + '\n'
        + '  y ya es className="' + clases + '"');
    }

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
  return { problemas, enMarcado, enGuion, sobranEnGuion, esperan,
    clases: new Set(porDeclaracion.values()).size };
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
    + r.enMarcado + ' atributos `style=` del marcado repite a mano lo que alguna ya dice, '
    + 'la lista pegada al atributo y la que está subida arriba con un nombre. '
    + 'Quedan ' + r.enGuion + ' adentro de guiones, ' + r.sobranEnGuion + ' de ellos convertibles, '
    + 'y ' + r.esperan + ' que sobran esperan la maqueta de las aplicaciones de teléfono, '
    + 'con su motivo escrito.');
}
