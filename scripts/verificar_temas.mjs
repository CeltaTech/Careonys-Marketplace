/* ===================================================
   VERIFICA LAS DOS COSAS QUE ROMPEN EL MODO OSCURO

       node scripts/verificar_temas.mjs

   ---- 1. Que las dos maneras de encender la noche digan lo mismo ----

   El modo oscuro se enciende de dos maneras y por eso está escrito dos veces en
   `css/tokens.css`:

   - `:root[data-tema='oscuro']`, que es cuando la persona lo elige;
   - `@media (prefers-color-scheme: dark)`, que es cuando ya lo tiene elegido en
     su computadora y el sitio le hace caso sin que pida nada.

   Las dos listas tienen que decir exactamente lo mismo. Están repetidas porque
   CSS no deja poner una condición de pantalla adentro de un selector: no hay
   forma de escribir «este bloque vale para tal selector Y ADEMÁS para tal
   condición». Así que se copia, y una copia que nadie compara se separa sola —
   alguien aclara un gris en una y la otra se queda como estaba, y entonces la
   misma pantalla se ve de dos maneras según cómo se haya encendido la noche.

   También se exige el `:not([data-tema='claro'])` del @media. Sin esa guarda,
   quien tiene la computadora en oscuro no puede forzar la pantalla en claro ni
   pidiéndolo: el @media le ganaría a su elección.

   ---- 2. Que ningún token de letra pinte un fondo ----

   Un token que se llama `-texto` está hecho para pintar letras sobre el papel, y
   de noche se aclara a propósito: es lo que tiene que hacer una letra cuando el
   papel se pone negro. Usado como fondo de una pastilla con letra blanca encima
   hace exactamente lo contrario de lo que hace falta, y de día no se nota.

   El 25 de agosto de 2026 había nueve lugares así. Se veían bien hasta que se
   encendió el modo oscuro automático, y entonces aparecieron pastillas claras
   con letra blanca encima. Para eso están los colores macizos —`--relleno-*`—,
   que valen igual de día y de noche.

   Las excepciones legítimas están en `FORMAS`, con su motivo: hay cosas pintadas
   con un token de letra que **sí** tienen que cambiar de noche, porque no son un
   fondo con letra encima sino un dibujo del mismo color que la letra.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const COPIAS = [
  'css/tokens.css',
  'pwa-asistente/css/tokens.css',
  'pwa-familia/css/tokens.css'
];

const AJENAS = ['docs', 'supabase', 'assets', 'scripts'];

/* Pintadas con un token de letra a propósito: no son un fondo con letra encima,
   son un dibujo que acompaña a la letra y cambia de noche junto con ella. */
const FORMAS = [
  {
    archivo: 'css/styles.css',
    selector: '.hamburger span',
    motivo: 'las tres rayas del menú son un dibujo del mismo color que el texto, no una ' +
            'pastilla: cuando el papel se pone negro tienen que aclararse igual que la letra'
  }
];

const ELEGIDO = /:root\[data-tema='oscuro'\]\s*\{([\s\S]*?)\n\}/;
const AUTOMATICO = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*([^{]*?)\s*\{([\s\S]*?)\n\s*\}\s*\n\}/;
const DECLARACION = /([-\w]+)\s*:\s*([^;]+);/g;

/* Un token que pinta letras: `--texto-algo` o `--algo-texto`. */
const TOKEN_DE_LETRA = /var\(\s*--(?:texto-[\w-]+|[\w-]+-texto)\s*[,)]/;
const REGLA = /([^{}]+)\{([^{}]*)\}/g;
const BLOQUE_STYLE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const ATRIBUTO_STYLE = /style\s*=\s*"([^"]*)"|style\s*=\s*'([^']*)'/gi;

const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ');

/** Las declaraciones de un bloque, en orden, ya sin comentarios ni sangría. */
function declaraciones(cuerpo) {
  return [...sinComentarios(cuerpo).matchAll(DECLARACION)]
    .map(([, prop, valor]) => `${prop}: ${valor.trim().replace(/\s+/g, ' ')}`);
}

/** Regla 1: los dos modos oscuros de un archivo de tokens. */
export function problemasDeTema(css) {
  const elegido = css.match(ELEGIDO);
  const automatico = css.match(AUTOMATICO);
  if (!elegido) return ["no tiene el bloque :root[data-tema='oscuro']."];
  if (!automatico) return ['no tiene el bloque @media (prefers-color-scheme: dark).'];

  const problemas = [];
  if (!automatico[1].includes(":not([data-tema='claro'])")) {
    problemas.push(
      "al @media le falta la guarda :not([data-tema='claro']).\n" +
      '  Sin ella, quien tenga la computadora en oscuro no puede forzar la pantalla en claro.');
  }

  const unas = declaraciones(elegido[1]);
  const otras = declaraciones(automatico[2]);
  const soloElegido = unas.filter((d) => !otras.includes(d));
  const soloAutomatico = otras.filter((d) => !unas.includes(d));
  if (soloElegido.length || soloAutomatico.length) {
    const detalle = [];
    for (const d of soloElegido) detalle.push('  sólo cuando se elige a mano:  ' + d);
    for (const d of soloAutomatico) detalle.push('  sólo cuando lo pide la computadora:  ' + d);
    problemas.push('los dos modos oscuros dejaron de decir lo mismo:\n' + detalle.join('\n'));
  }
  return problemas;
}

/** Regla 2: los tokens de letra usados como fondo, con su selector y su renglón. */
export function fondosDeLetra(crudo, extension, nombre) {
  const hallados = [];
  const eximido = (selector) => FORMAS.some(
    (f) => f.archivo === nombre && f.selector === selector);

  const mirarCss = (css, base) => {
    for (const regla of sinComentarios(css).matchAll(REGLA)) {
      const selector = regla[1].trim().split('\n').pop().trim();
      if (eximido(selector)) continue;
      for (const [, prop, valor] of regla[2].matchAll(DECLARACION)) {
        if (!prop.startsWith('background') || !TOKEN_DE_LETRA.test(valor)) continue;
        const antes = css.slice(0, regla.index + regla[0].indexOf(prop));
        hallados.push([base + antes.split('\n').length - 1,
                       `${selector} { ${prop}: ${valor.trim()} }`]);
      }
    }
  };

  if (extension === '.css') mirarCss(crudo, 1);
  else {
    for (const bloque of crudo.matchAll(BLOQUE_STYLE)) {
      mirarCss(bloque[1], crudo.slice(0, bloque.index).split('\n').length);
    }
    for (const atributo of crudo.matchAll(ATRIBUTO_STYLE)) {
      const cuerpo = atributo[1] ?? atributo[2];
      for (const [, prop, valor] of (cuerpo + ';').matchAll(DECLARACION)) {
        if (!prop.startsWith('background') || !TOKEN_DE_LETRA.test(valor)) continue;
        hallados.push([crudo.slice(0, atributo.index).split('\n').length,
                       `style="… ${prop}: ${valor.trim()}"`]);
      }
    }
  }
  return hallados;
}

/* Una prueba que no puede fallar no prueba nada. */
const BIEN = `:root[data-tema='oscuro'] {
  color-scheme: dark;
  /* un comentario */
  --fondo-app: oklch(0.17 0.012 250);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-tema='claro']) {
    color-scheme: dark;
    --fondo-app: oklch(0.17 0.012 250);
  }
}`;
const MAL_TEMA = [
  ['un valor distinto', BIEN.replace('oklch(0.17 0.012 250);\n  }', 'oklch(0.19 0.012 250);\n  }')],
  ['un token que falta', BIEN.replace('    color-scheme: dark;\n', '')],
  ['sin la guarda', BIEN.replace(":root:not([data-tema='claro'])", ':root')],
  ['sin el @media', BIEN.slice(0, BIEN.indexOf('@media'))]
];
const MAL_FONDO = [
  ['.x { background: var(--tono-exito-texto); }', '.css'],
  ['.x { background-color: var(--texto-principal); }', '.css'],
  ['<style>.x { background: var(--azul-medio-texto); }</style>', '.html'],
  ['<div style="background:var(--tono-critico-texto)">Hola</div>', '.html']
];
const BIEN_FONDO = [
  ['.x { background: var(--relleno-exito); }', '.css'],
  ['.x { color: var(--tono-exito-texto); }', '.css'],
  ['.x { border-color: var(--texto-principal); }', '.css'],
  ['.hamburger span { background: var(--texto-principal); }', '.css'],
  ['<div style="color:var(--tono-critico-texto)">Hola</div>', '.html']
];

const noDetectaTema = MAL_TEMA.filter(([, css]) => problemasDeTema(css).length === 0);
const sePasaTema = problemasDeTema(BIEN);
const noDetectaFondo = MAL_FONDO.filter(([t, e]) => fondosDeLetra(t, e, 'x.css').length === 0);
const sePasaFondo = BIEN_FONDO.filter(([t, e]) => fondosDeLetra(t, e, 'css/styles.css').length > 0);
if (noDetectaTema.length || sePasaTema.length || noDetectaFondo.length || sePasaFondo.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetectaTema) console.error('  no detecta: ' + q);
  for (const p of sePasaTema) console.error('  avisa de más: ' + p);
  for (const [t] of noDetectaFondo) console.error('  no detecta: ' + t);
  for (const [t] of sePasaFondo) console.error('  avisa de más: ' + t);
  process.exit(1);
}

const fallas = [];
let comparados = 0;
let tokens = 0;

for (const rel of COPIAS) {
  const css = readFileSync(join(raiz, rel.split('/').join(sep)), 'utf8');
  const problemas = problemasDeTema(css);
  if (problemas.length) fallas.push(...problemas.map((p) => rel + ': ' + p));
  else {
    comparados++;
    tokens = declaraciones(css.match(ELEGIDO)[1]).length;
  }
}

seRevisaron(comparados + fallas.length, 'un solo archivo de tokens que comparar');

let revisados = 0;
for (const camino of hayArchivos(raiz, ['.html', '.css'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  revisados++;
  const extension = nombre.slice(nombre.lastIndexOf('.'));
  for (const [renglon, donde] of fondosDeLetra(readFileSync(camino, 'utf8'), extension, nombre)) {
    fallas.push(
      `${nombre}:${renglon}  un token de letra pintando un fondo:\n  ${donde}\n` +
      '  De noche ese token se aclara y la pastilla queda clara con letra clara.\n' +
      '  Va un color macizo: var(--relleno-azul), var(--relleno-exito), var(--relleno-critico)…');
  }
}

if (fallas.length > 0) {
  console.error('\n' + fallas.join('\n\n') + '\n');
  process.exit(1);
}

console.log(
  `Modo oscuro verificado: ${comparados} archivos donde las dos maneras de encenderlo dicen ` +
  `lo mismo (${tokens} declaraciones), y ${revisados} sin tokens de letra pintando fondos.`);
