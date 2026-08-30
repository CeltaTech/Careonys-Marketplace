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
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { hayArchivos } from './recorrido.mjs';

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
  [clasesQueAgarraUnGuion('// fade-in sin comillas no cuenta'), 'fade-in', false]
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
const paginas = hayArchivos(raiz, ['.html']);
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
  for (const clase of clasesQueNombra(html)) {
    if (!nombradas.has(clase)) nombradas.set(clase, new Set());
    nombradas.get(clase).add(relative(raiz, pagina).split(BARRA).join('/'));
  }
}

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
