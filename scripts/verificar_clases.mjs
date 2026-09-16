/* ===================================================
   VERIFICA QUE EL MARCADO NO NOMBRE CLASES QUE NO EXISTEN

       node scripts/verificar_clases.mjs

   Nombrar una clase que nadie declara no rompe nada: por eso dura. El
   navegador la ignora en silencio, la pantalla se sigue viendo —normalmente
   porque algún otro selector la alcanza por descendencia— y el marcado queda
   diciendo que hay un estilo propio donde no lo hay. El día que alguien
   quiere cambiar ese estilo, lo busca en la hoja y no está.

   Se encontró el 30 de agosto de 2026 en `solicitar-asistente.html`: dos
   campos llevaban `class="form-control"`, que es el nombre que usa Bootstrap
   y que este proyecto no declara en ninguna parte. Se veían bien porque
   `.form-group input` los alcanzaba. Con ellos aparecieron una banda con
   `insurance-section`, otra con `care-manager-section` y un envoltorio con
   `inner-hero-content`, las tres igual de inexistentes.

   Qué cuenta como declarada:

   - **Cualquier hoja `.css` del proyecto**, y también los `<style>` escritos
     adentro de una pantalla, que es donde vive buena parte de este producto.
   - **Cualquier nombre que un guion mencione entre comillas**, porque una
     clase también sirve de agarradera para el programa —`querySelector`,
     `classList.add`— y ésas no se dibujan: no tienen por qué estar en
     ninguna hoja.

   Y la excepción que no se puede evitar: **Font Awesome viene de afuera**.
   Sus clases —`fas`, `far`, `fab` y todo lo que empiece con `fa-`— las
   declara una hoja que no está en este repositorio, así que se saltean por
   prefijo y no una por una. Es la única familia exenta, y está escrita acá
   para que agregar otra cueste discutirlo.

   Las dos formas de nombrar una clase, y por qué se leen distinto:

   - **En el marcado suelto**, `class="tarjeta destacada"`: lo que hay entre
     comillas son clases y nada más.
   - **En una portada**, `className={...}`: entre las llaves hay un programa.
     Ahí adentro hay texto entre comillas que no nombra ninguna clase —lo que
     se compara contra otra cosa, lo que entra como argumento de una llamada, y
     el pedazo que queda pegado a un hueco de plantilla o a un `+`, que sólo es
     media palabra—. Todo eso se descarta, o el chequeo se llenaría de nombres
     que nadie escribió nunca.

   Y la asimetría con los guiones es a propósito: allá vale cualquier texto
   entre comillas, porque un guion menciona la clase para agarrarla. Acá no
   puede valer, porque entonces cada `className="tarjeta"` se autorizaría a sí
   mismo y no quedaría nada que comprobar.

   Qué NO mira, dicho de frente:

   - No sigue la clase que llega desde afuera de la pantalla, pasada como dato
     por quien la dibuja.
   - No arma el nombre partido en pedazos: si el marcado escribe media palabra
     y le pega un hueco, se saltea entero en vez de inventar el resto.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const BARRA = String.fromCharCode(92);
const sinComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* Font Awesome, y nada más. */
const VIENE_DE_AFUERA = (clase) =>
  clase === 'fas' || clase === 'far' || clase === 'fab' || clase.startsWith('fa-');

/* Un nombre de clase de verdad. Lo que trae `{{` o `$` es una plantilla a
   medio armar y no un nombre. */
const ES_NOMBRE = (clase) => /^-?[_a-zA-Z][\w-]*$/.test(clase);

export function clasesQueDeclara(css) {
  const encontradas = new Set();
  for (const m of sinComentarios(css).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) encontradas.add(m[1]);
  return encontradas;
}

export function clasesQueNombra(html) {
  const encontradas = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const clase of m[1].split(/\s+/).filter(Boolean)) {
      if (ES_NOMBRE(clase) && !VIENE_DE_AFUERA(clase)) encontradas.add(clase);
    }
  }
  return encontradas;
}

/* Las agarraderas del programa. Se mira el contenido de cada texto escrito
   entre comillas —de las tres maneras que tiene JavaScript de escribirlo—: si
   el texto entero es un nombre de clase, cuenta; y cuenta además todo nombre
   precedido por un punto, porque un selector nombra varias de un saque
   (`'.logo-brand, .tenant-logo'`) y hay que verlas todas, no sólo la primera. */
export function clasesQueAgarraUnGuion(guion) {
  const encontradas = new Set();
  for (const texto of guion.matchAll(/['"`]([^'"`\n]*)['"`]/g)) {
    const contenido = texto[1];
    if (ES_NOMBRE(contenido)) encontradas.add(contenido);
    for (const m of contenido.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) encontradas.add(m[1]);
  }
  return encontradas;
}


/* ── Lo mismo, en una pantalla portada ───────────────────────────────────────
   Una pantalla portada no escribe `class="…"`: escribe `className`, y no
   siempre con un texto suelto adentro. Sin esto, este chequeo miraba cero
   clases teniendo 367 nombradas delante, y decía ✔.

   Adentro de las llaves hay texto que no es una clase, y confundirlo llena el
   chequeo de avisos falsos hasta que alguien lo apaga. No cuenta como clase:
   - lo que se compara —`activa === 'dashboard'` nombra una pantalla, no una
     clase—;
   - lo que entra en una llamada —`clase('publicar')`—, porque la clase será lo
     que salga de ahí y no lo que entró;
   - el pedazo que queda pegado a un hueco de plantilla o a un `+`:
     `'curso-resultado-' + resultado.clase` no nombra `curso-resultado-`, que es
     medio nombre.

   Y las agarraderas se buscan distinto que en un guion suelto. Allá vale
   cualquier texto entre comillas; acá no puede valer, porque entonces cada
   `className="tarjeta"` se autorizaría a sí mismo y no quedaría nada que
   comprobar. Se miran sólo las formas que de verdad van al documento:
   `querySelector`, `closest`, `matches`, `getElementsByClassName` y
   `classList`. */

const HUECO = String.fromCharCode(0);
const TEXTO = /'([^']*)'|"([^"]*)"|`([^`]*)`/g;
const elContenido = (m) => (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);

const COMPARA_ANTES = /(?:===|!==|==|!=)$/;
const COMPARA_DESPUES = /^(?:===|!==|==|!=)/;
const ES_ARGUMENTO = /[A-Za-z_$][\w$]*\s*\($/;

function clasesDeLaExpresion(expresion, encontradas) {
  for (const m of expresion.matchAll(TEXTO)) {
    const antes = expresion.slice(0, m.index).trimEnd();
    const despues = expresion.slice(m.index + m[0].length).trimStart();
    if (COMPARA_ANTES.test(antes) || COMPARA_DESPUES.test(despues)) continue;
    if (ES_ARGUMENTO.test(antes)) continue;
    let texto = elContenido(m).replace(/\$\{[^}]*\}/g, HUECO);
    if (/\+$/.test(antes)) texto = HUECO + texto;
    if (/^\+/.test(despues)) texto = texto + HUECO;
    for (const clase of texto.split(/\s+/).filter(Boolean)) {
      if (clase.includes(HUECO)) continue;
      if (ES_NOMBRE(clase) && !VIENE_DE_AFUERA(clase)) encontradas.add(clase);
    }
  }
}

/* Las llaves de un `className` no cierran en la primera que aparece: un texto de
   plantilla trae adentro sus propios huecos, y cada hueco abre y cierra los
   suyos. Hay que contarlas. Las comillas simples y dobles se saltean enteras,
   porque una llave adentro de un texto común no abre ni cierra nada; adentro de
   las comillas invertidas sí se cuentan, que es de donde salen los huecos. */
function entreLlaves(texto, desde) {
  let hondura = 0;
  for (let i = desde; i < texto.length; i += 1) {
    const letra = texto[i];
    if (letra === "'" || letra === '"') {
      const cierra = texto.indexOf(letra, i + 1);
      if (cierra === -1) return texto.slice(desde + 1, i);
      i = cierra;
    } else if (letra === '{') hondura += 1;
    else if (letra === '}') {
      hondura -= 1;
      if (hondura === 0) return texto.slice(desde + 1, i);
    }
  }
  return texto.slice(desde + 1);
}

export function clasesQueNombraUnaPantalla(jsx) {
  const encontradas = new Set();
  for (const m of jsx.matchAll(/className=(?:"([^"]*)"|'([^']*)'|\{)/g)) {
    const suelta = m[1] !== undefined ? m[1] : m[2];
    if (suelta === undefined) {
      clasesDeLaExpresion(entreLlaves(jsx, m.index + m[0].length - 1), encontradas);
      continue;
    }
    for (const clase of suelta.split(/\s+/).filter(Boolean)) {
      if (ES_NOMBRE(clase) && !VIENE_DE_AFUERA(clase)) encontradas.add(clase);
    }
  }
  return encontradas;
}

const AGARRA = /(?:querySelector(?:All)?|closest|matches|getElementsByClassName)\s*\(([^)]*)\)|classList\.(?:add|remove|toggle|contains)\s*\(([^)]*)\)/g;

export function clasesQueAgarraUnaPantalla(jsx) {
  const encontradas = new Set();
  for (const m of jsx.matchAll(AGARRA)) {
    const crudo = m[1] !== undefined ? m[1] : m[2];
    for (const x of crudo.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) encontradas.add(x[1]);
    for (const t of crudo.matchAll(TEXTO)) {
      for (const c of elContenido(t).split(/\s+/).filter(Boolean)) {
        if (ES_NOMBRE(c)) encontradas.add(c);
      }
    }
  }
  return encontradas;
}

/* ── El detector se prueba contra lo que tiene que ver y contra lo que no ── */
const PRUEBAS = [
  [clasesQueDeclara('.form-group input { width:100%; }'), 'form-group', true],
  [clasesQueDeclara('/* .comentada {} */ .real {}'), 'comentada', false],
  [clasesQueDeclara('/* .comentada {} */ .real {}'), 'real', true],
  [clasesQueNombra('<div class="tarjeta fas fa-user {{producto}}">'), 'tarjeta', true],
  [clasesQueNombra('<div class="tarjeta fas fa-user {{producto}}">'), 'fas', false],
  [clasesQueNombra('<div class="tarjeta fas fa-user {{producto}}">'), 'fa-user', false],
  [clasesQueAgarraUnGuion("document.querySelector('.wizard-step-pane')"), 'wizard-step-pane', true],
  [clasesQueAgarraUnGuion('elemento.classList.add("fade-in")'), 'fade-in', true],
  [clasesQueAgarraUnGuion("const s = '.logo-brand, .tenant-logo, .navbar-logo img';"), 'logo-brand', true],
  [clasesQueAgarraUnGuion("const s = '.logo-brand, .tenant-logo, .navbar-logo img';"), 'tenant-logo', true],
  [clasesQueAgarraUnGuion('// fade-in sin comillas no cuenta'), 'fade-in', false],
  [clasesQueNombraUnaPantalla('<div className="tarjeta fas fa-user">'), 'tarjeta', true],
  [clasesQueNombraUnaPantalla('<div className="tarjeta fas fa-user">'), 'fas', false],
  [clasesQueNombraUnaPantalla("<i className={'tab ' + (a === 'inicio' ? 'activa' : '')}>"), 'tab', true],
  [clasesQueNombraUnaPantalla("<i className={'tab ' + (a === 'inicio' ? 'activa' : '')}>"), 'activa', true],
  [clasesQueNombraUnaPantalla("<i className={'tab ' + (a === 'inicio' ? 'activa' : '')}>"), 'inicio', false],
  [clasesQueNombraUnaPantalla("<i className={clase('publicar')}>"), 'publicar', false],
  [clasesQueNombraUnaPantalla("<i className={'curso curso-' + r.clase}>"), 'curso', true],
  [clasesQueNombraUnaPantalla("<i className={'curso curso-' + r.clase}>"), 'curso-', false],
  [clasesQueNombraUnaPantalla('<i className={`fila fila-${n}`}>'), 'fila', true],
  [clasesQueNombraUnaPantalla('<i className={`fila fila-${n}`}>'), 'fila-', false],
  [clasesQueAgarraUnaPantalla("document.querySelector('.wizard-step-pane')"), 'wizard-step-pane', true],
  [clasesQueAgarraUnaPantalla("elemento.classList.add('fade-in')"), 'fade-in', true],
  [clasesQueAgarraUnaPantalla('<div className="tarjeta">'), 'tarjeta', false]
];
const rotas = PRUEBAS.filter(([conjunto, clase, esperado]) => conjunto.has(clase) !== esperado);
if (rotas.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [, clase, esperado] of rotas) {
    console.error(`  «${clase}» tendría que ${esperado ? 'aparecer y no aparece' : 'no aparecer y aparece'}.`);
  }
  process.exit(1);
}

/* ── El proyecto ────────────────────────────────────────────────────────── */
const hojas = hayArchivos(raiz, ['.css']);
const paginas = hayArchivos(raiz, EXTENSIONES_DE_PANTALLA);
const guiones = hayArchivos(raiz, ['.js']);

const declaradas = new Set();
for (const hoja of hojas) for (const c of clasesQueDeclara(readFileSync(hoja, 'utf8'))) declaradas.add(c);

const agarradas = new Set();
for (const guion of guiones) for (const c of clasesQueAgarraUnGuion(readFileSync(guion, 'utf8'))) agarradas.add(c);

const nombradas = new Map();
for (const pagina of paginas) {
  const html = readFileSync(pagina, 'utf8');
  for (const bloque of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const c of clasesQueDeclara(bloque[1])) declaradas.add(c);
  }
  for (const bloque of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const c of clasesQueAgarraUnGuion(bloque[1])) agarradas.add(c);
  }
  for (const c of clasesQueAgarraUnaPantalla(html)) agarradas.add(c);
  /* Las dos formas de nombrar no se pisan: `class="` no aparece nunca adentro
     de un `className="`, así que cada pantalla la lee la que le corresponde sin
     preguntarle de qué tipo es. */
  for (const clase of new Set([...clasesQueNombra(html), ...clasesQueNombraUnaPantalla(html)])) {
    if (!nombradas.has(clase)) nombradas.set(clase, new Set());
    nombradas.get(clase).add(relative(raiz, pagina).split(BARRA).join('/'));
  }
}

/* Y que no quede mirando cero: este chequeo pasó de `class="…"` a `className`
   sin enterarse, y estuvo diciendo ✔ sobre ninguna clase. */
seRevisaron(nombradas.size, 'ni una clase nombrada en el marcado');

const huerfanas = [...nombradas].filter(([c]) => !declaradas.has(c) && !agarradas.has(c));

if (huerfanas.length) {
  console.error('El marcado nombra clases que no declara ninguna hoja y que no agarra ningún guion:\n');
  for (const [clase, donde] of huerfanas.sort()) {
    console.error(`  .${clase}`);
    console.error(`      ${[...donde].sort().join(', ')}`);
  }
  console.error('\nO la clase se declara, o se saca del marcado. Dejarla nombrada hace creer que');
  console.error('hay un estilo propio donde no lo hay, y el día que haya que cambiarlo no está.');
  process.exit(1);
}

console.log(
  `Clases verificadas: ${nombradas.size} nombradas en ${paginas.length} pantallas, ` +
  `todas declaradas en alguna de las ${hojas.length} hojas o agarradas por algún guion ` +
  '(Font Awesome exenta, por venir de afuera).'
);
