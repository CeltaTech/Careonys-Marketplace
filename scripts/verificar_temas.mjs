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

   Dónde mira, que son las cuatro puertas por las que se pinta un fondo: la hoja
   de estilo; el bloque `<style>` de adentro de una pantalla; el atributo
   `style=`, lo escriba el marcado o lo escriba una pantalla portada entre
   llaves; y el guión, que pinta sin escribir marcado —`elemento.style.cssText`
   y `elemento.style.background`—. La del guión fue la última y se descubrió
   tarde: hasta entonces el JavaScript no se abría, y adentro hay marcado escrito
   con todas las letras —una ficha del legajo se arma así— que no miraba nadie.
   Es la misma cuarta puerta que el chequeo de la paleta ya había descubierto
   tarde por su lado.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, seRevisaron, EXTENSIONES_DE_PANTALLA } from './recorrido.mjs';
import { objetosDeEstilo, pares } from './verificar_estilos.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const COPIAS = [
  'css/tokens.css',
  'pwa-asistente/css/tokens.css',
  'pwa-familia/css/tokens.css'
];

/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   éste, dicho por su nombre porque antes no decía nada: `docs`, que es texto;
   `supabase`, que es el servidor y no pinta ninguna pantalla; y `assets`, donde
   un dibujo lleva sus colores escritos adentro a propósito, porque abierto
   dentro de una imagen no alcanza las variables de la hoja de estilos.

   `scripts/` estuvo acá y salió el 16 de septiembre de 2026, junto con las dos
   extensiones que faltaban. Una herramienta también pinta: la que arma el
   manifiesto de los dos programas del teléfono elige colores, y por el mismo
   agujero se le había despegado el color de la barra de estado. Eran 83
   archivos que no abría nadie para esta regla. No había ninguno mal. */
const AJENAS = ['docs', 'supabase', 'assets'];

/* El único exento, y por lo mismo que en `verificar_paleta.mjs`: el banco con el
   que este chequeo se prueba a sí mismo escribe a propósito lo que busca. Más
   abajo se comprueba que siga teniendo alguno adentro, porque la exención que se
   queda sin nada que eximir no avisa sola. */
const BANCOS = new Map([
  ['scripts/verificar_temas.mjs',
   'el banco con el que este mismo chequeo se prueba antes de recorrer nada']
]);

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

/* Las dos maneras que tiene un guión de pintar sin escribir marcado: la hoja
   entera de un elemento y una propiedad suelta. */
const HOJA_DE_UN_ELEMENTO = /style\.cssText\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;
const PROPIEDAD_SUELTA = /style\.(background\w*)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;

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
    /* Y el mismo atributo escrito como lo escribe un programa. Hasta acá esto
       leía sólo `style="…"`, que es como lo escribe una pantalla suelta, y las
       pantallas portadas lo escriben `style={{ … }}`: se abrían, se recorrían
       enteras y adentro no se reconocía ningún estilo. El corte de llaves y de
       comas lo presta `verificar_estilos.mjs`, que ya tuvo que resolverlo para
       lo suyo; escribirlo de nuevo acá sería la misma decisión en dos lugares.

       Se mira par por par y no la lista entera: a diferencia de aquel chequeo,
       acá no hace falta que **todos** los valores estén escritos con todas las
       letras. Alcanza con que lo esté el que pinta el fondo. */
    for (const [donde, cuerpo] of objetosDeEstilo(crudo)) {
      for (const parte of pares(cuerpo)) {
        const corte = parte.indexOf(':');
        if (corte < 0) continue;
        const clave = parte.slice(0, corte).trim().replace(/^['"`]|['"`]$/g, '');
        const valor = parte.slice(corte + 1).trim();
        const enLaHoja = clave.replace(/[A-Z]/g, (letra) => '-' + letra.toLowerCase());
        if (!enLaHoja.startsWith('background') || !TOKEN_DE_LETRA.test(valor)) continue;
        hallados.push([crudo.slice(0, donde).split('\n').length,
                       `style={{ … ${clave}: ${valor} }}`]);
      }
    }
    /* Y lo que pinta un guión sin escribir marcado. Acá no se abría ningún `.js`:
       adentro hay marcado escrito con todas las letras —la ficha del legajo se
       arma así— y además estas dos formas, que no se parecen a un atributo. */
    for (const hoja of crudo.matchAll(HOJA_DE_UN_ELEMENTO)) {
      const cuerpo = hoja[1] ?? hoja[2] ?? hoja[3];
      for (const [, prop, valor] of (cuerpo + ';').matchAll(DECLARACION)) {
        if (!prop.startsWith('background') || !TOKEN_DE_LETRA.test(valor)) continue;
        hallados.push([crudo.slice(0, hoja.index).split('\n').length,
                       `style.cssText = '… ${prop}: ${valor.trim()}'`]);
      }
    }
    for (const suelta of crudo.matchAll(PROPIEDAD_SUELTA)) {
      const valor = suelta[2] ?? suelta[3] ?? suelta[4];
      if (!TOKEN_DE_LETRA.test(valor)) continue;
      hallados.push([crudo.slice(0, suelta.index).split('\n').length,
                     `style.${suelta[1]} = '${valor.trim()}'`]);
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
  ['<style>.x { background: var(--azul-medio-texto); }</style>', EXTENSIONES_DE_PANTALLA[0]],
  ['<div style="background:var(--tono-critico-texto)">Hola</div>', EXTENSIONES_DE_PANTALLA[0]],
  ["<div style={{ background: 'var(--tono-critico-texto)' }}>Hola</div>", EXTENSIONES_DE_PANTALLA[1]],
  ["<div style={{ backgroundColor: 'var(--texto-principal)' }}>Hola</div>", EXTENSIONES_DE_PANTALLA[1]],
  ["<div style={{ width: ancho, background: 'var(--texto-principal)' }}>Hola</div>",
   EXTENSIONES_DE_PANTALLA[1]],
  ["caja.style.cssText = 'padding:8px; background: var(--texto-principal);';", '.js'],
  ["caja.style.backgroundColor = 'var(--tono-critico-texto)';", '.js'],
  ['lista.innerHTML = `<p style="background:var(--texto-secundario)">Hola</p>`;', '.js']
];
const BIEN_FONDO = [
  ['.x { background: var(--relleno-exito); }', '.css'],
  ['.x { color: var(--tono-exito-texto); }', '.css'],
  ['.x { border-color: var(--texto-principal); }', '.css'],
  ['.hamburger span { background: var(--texto-principal); }', '.css'],
  ['<div style="color:var(--tono-critico-texto)">Hola</div>', EXTENSIONES_DE_PANTALLA[0]],
  ["<div style={{ color: 'var(--tono-critico-texto)' }}>Hola</div>", EXTENSIONES_DE_PANTALLA[1]],
  ["<div style={{ background: 'var(--relleno-exito)' }}>Hola</div>", EXTENSIONES_DE_PANTALLA[1]],
  ["<div style={{ borderColor: 'var(--texto-principal)' }}>Hola</div>", EXTENSIONES_DE_PANTALLA[1]],
  ["caja.style.cssText = 'padding:8px; color: var(--texto-principal);';", '.js'],
  ["caja.style.backgroundColor = 'var(--relleno-exito)';", '.js'],
  ['lista.innerHTML = `<p style="color:var(--texto-secundario)">Hola</p>`;', '.js']
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
let eximidos = 0;
const bancosSinFondo = new Set(BANCOS.keys());
for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.css', '.js', '.mjs', '.ts'], AJENAS)) {
  const nombre = relative(raiz, camino).split(sep).join('/');
  const extension = nombre.slice(nombre.lastIndexOf('.'));
  if (BANCOS.has(nombre)) {
    eximidos++;
    if (fondosDeLetra(readFileSync(camino, 'utf8'), extension, nombre).length) {
      bancosSinFondo.delete(nombre);
    }
    continue;
  }
  revisados++;
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

/* Y que la exención siga eximiendo algo. Si el banco se queda sin ningún fondo
   pintado con un token de letra, dejó de ser un banco y perdona el aire. */
if (bancosSinFondo.size) {
  console.error('Exenciones que ya no eximen nada:\n');
  for (const nombre of bancosSinFondo) {
    console.error(`  - \`${nombre}\` está eximido —${BANCOS.get(nombre)}— y adentro no`);
    console.error('    tiene ni un token de letra pintando un fondo. O la exención se saca.');
  }
  process.exit(1);
}

console.log(
  `Modo oscuro verificado: ${comparados} archivos donde las dos maneras de encenderlo dicen ` +
  `lo mismo (${tokens} declaraciones), y ${revisados} sin tokens de letra pintando fondos ` +
  `(${eximidos} banco de prueba exento, con su motivo y con fondos así adentro).`);
