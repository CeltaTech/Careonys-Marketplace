/* ===================================================
   VERIFICA QUE LA BASE ESTÉ DECLARADA EN UN SOLO LUGAR

   Falla —con código de salida 1— si la dirección de la base o su clave
   publicable aparecen escritas en algún archivo que no sea `js/apiClient.js` y
   sus dos copias registradas.

       node scripts/verificar_base.mjs

   Por qué existe. Hasta el 30 de agosto de 2026 las dos estaban escritas
   también en `js/auth.js`, con el mismo valor y sin que ninguna mandara sobre
   la otra. No era una copia: eran dos afirmaciones sueltas del mismo hecho, y
   quien cambiara una no tenía forma de enterarse de que había otra. Se descubrió
   haciendo que el servidor local apuntara a la base de esta máquina: cambiada
   una sola, las pantallas leían de una base y le pedían la sesión a la otra,
   donde esas cuentas no existen. Salía «el correo o la contraseña no coinciden»,
   que no dice ni de lejos lo que estaba pasando.

   Mira cuatro cosas, y las cuatro hacen falta:

   1. Que la dirección y la clave no estén escritas fuera del grupo de copias
      registrado. Prohibir alcanza para que no vuelva a haber dos, y no alcanza
      para nada más.
   2. Que `js/auth.js` siga sacándolas de `ClienteDatos`. Sin esto, borrar el
      cableado dejaría el chequeo pasando: cero apariciones fuera del original es
      exactamente lo que devuelve un producto que ya no se conecta a nada.
   3. Que toda pantalla que carga `js/auth.js` cargue antes `js/apiClient.js`.
      El orden importa de verdad —`auth.js` se planta si no está—, y un orden que
      hay que recordar se olvida.
   4. Que en ningún archivo del proyecto haya una clave con forma de secreta
      —`sb_secret_…`— ni un token con forma de JWT. Ésas no van al navegador
      nunca, ni siquiera en el archivo que sí puede tener la publicable. Esta
      cuarta no tiene exentos.

   Este archivo no escribe adentro ninguno de los valores que busca: los lee del
   proyecto, y los de la autoprueba los arma por pedazos. Así no hay que hacerle
   una excepción a sí mismo, que es la manera más silenciosa de romper un
   chequeo como éste.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { hayArchivos, seRevisaron } from './recorrido.mjs';
import { GRUPOS } from './verificar_copias.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const comoLoEscribeElProyecto = (ruta) => ruta.split(sep).join('/');

/* El único lugar donde la base puede estar escrita: el original de su grupo de
   copias y las copias que ese grupo declara. Sale de `verificar_copias.mjs`, no
   de una lista repetida acá: si mañana el original cambia de nombre o gana una
   copia, este chequeo se entera solo. */
const ORIGINAL = 'js/apiClient.js';
const GRUPO = GRUPOS.find((g) => g[0] === ORIGINAL);
if (!GRUPO) {
  console.error(
    'No hay grupo de copias para «' + ORIGINAL + '» en scripts/verificar_copias.mjs.\n' +
    'Sin esa lista este chequeo no sabe dónde se permite escribir la base, así que no verifica nada.');
  process.exit(1);
}
const DONDE_SE_PERMITE = new Set(GRUPO);

const EXTENSIONES = ['.html', '.js', '.mjs', '.css', '.json', '.webmanifest',
                     '.md', '.sql', '.py', '.toml', '.txt', '.yml', '.yaml'];

/* Con forma de secreta o de token: no van al navegador ni en broma, así que no
   hay archivo exento de esto, ni siquiera el original. */
const NUNCA_EN_NINGUN_LADO = [
  { que: 'una clave con forma de secreta', patron: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  { que: 'un token con forma de JWT', patron: /eyJ[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{16,}/ }
];

/* ---------- de dónde salen los valores que se buscan ---------- */

export function loQueDeclara(guion) {
  const direccion = guion.match(/supabaseUrl\s*:\s*['"`]([^'"`]+)['"`]/);
  const clave = guion.match(/supabaseKey\s*:\s*['"`]([^'"`]+)['"`]/);
  return { direccion: direccion && direccion[1], clave: clave && clave[1] };
}

/* La dirección se busca también sin el `https://` adelante: una mención suelta
   del servidor es la misma afirmación repetida, y se escribe igual de fácil. */
export function comoBuscarla(direccion) {
  const sinEsquema = direccion.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return [direccion, sinEsquema].filter((v, i, a) => a.indexOf(v) === i);
}

/* ---------- autoprueba ---------- */

/* Los valores de mentira se arman por pedazos a propósito: escritos enteros,
   este archivo sería el primero en tener adentro lo que prohíbe. */
const DE_MENTIRA = {
  direccion: 'https://' + 'ejemplodepruebasola' + '.supabase' + '.co',
  clave: 'sb_' + 'publishable_' + 'ejemplo_de_prueba_0000',
  secreta: 'sb_' + 'secret_' + 'ejemplo_de_prueba_0000',
  token: 'ey' + 'J' + 'abcdefghijklmnopqrstuvwxyz012345' + '.' + 'abcdefghijklmnopqrst'
};

function autoprueba() {
  const roto = [];
  const declarado = loQueDeclara(
    '  supabaseUrl: ' + "'" + DE_MENTIRA.direccion + "'" + ',\n' +
    '  supabaseKey: ' + "'" + DE_MENTIRA.clave + "'" + ',\n');
  if (declarado.direccion !== DE_MENTIRA.direccion) roto.push('no lee la dirección declarada');
  if (declarado.clave !== DE_MENTIRA.clave) roto.push('no lee la clave declarada');

  const buscar = comoBuscarla(DE_MENTIRA.direccion);
  if (buscar.length !== 2) roto.push('no busca la dirección también sin el esquema');
  if (!buscar.some((b) => ('const d = ' + '"' + 'ejemplodepruebasola' + '.supabase' + '.co' + '"').includes(b))) {
    roto.push('no encuentra la dirección escrita sin el «https://» adelante');
  }

  if (!NUNCA_EN_NINGUN_LADO[0].patron.test(DE_MENTIRA.secreta)) roto.push('no reconoce una clave secreta');
  if (NUNCA_EN_NINGUN_LADO[0].patron.test(DE_MENTIRA.clave)) roto.push('confunde la publicable con una secreta');
  if (!NUNCA_EN_NINGUN_LADO[1].patron.test(DE_MENTIRA.token)) roto.push('no reconoce un token');
  if (NUNCA_EN_NINGUN_LADO[1].patron.test('eyJota es un apellido')) roto.push('llama token a cualquier palabra');

  if (roto.length) {
    console.error('El detector está roto, así que no verifica nada:\n  - ' + roto.join('\n  - '));
    process.exit(1);
  }
}

/* ---------- el chequeo ---------- */

export function verificarBase() {
  autoprueba();
  const problemas = [];

  const original = readFileSync(join(raiz, ORIGINAL), 'utf8');
  const { direccion, clave } = loQueDeclara(original);
  if (!direccion || !clave) {
    console.error(
      ORIGINAL + ' ya no declara «supabaseUrl» y «supabaseKey» como se esperaba.\n' +
      'Este chequeo saca de ahí lo que tiene que buscar, así que sin eso no busca nada.');
    process.exit(1);
  }
  const AGUJAS = [
    ...comoBuscarla(direccion).map((texto) => ({ que: 'la dirección de la base', texto })),
    { que: 'la clave publicable', texto: clave }
  ];

  const archivos = hayArchivos(raiz, EXTENSIONES);
  let mirados = 0;

  for (const camino of archivos) {
    const ruta = comoLoEscribeElProyecto(relative(raiz, camino));
    const contenido = readFileSync(camino, 'utf8');
    mirados++;

    for (const { que, patron } of NUNCA_EN_NINGUN_LADO) {
      if (patron.test(contenido)) {
        problemas.push(
          ruta + ' tiene ' + que + ' escrita adentro.\n' +
          '  Eso no va al navegador ni al repositorio en ningún caso, ni siquiera en el archivo\n' +
          '  que sí puede tener la publicable. Se saca del archivo y se rota la clave.');
      }
    }

    if (DONDE_SE_PERMITE.has(ruta)) continue;
    /* La dirección se busca de dos maneras —con `https://` y sin él—, y las dos
       son el mismo hallazgo: se avisa una vez por archivo y por cosa. */
    const yaAvisado = new Set();
    for (const { que, texto } of AGUJAS) {
      if (contenido.includes(texto) && !yaAvisado.has(que)) {
        yaAvisado.add(que);
        problemas.push(
          ruta + ' tiene ' + que + ' escrita adentro, y el único lugar donde va es «' +
          ORIGINAL + '»\n' +
          '  —con sus copias registradas—. Dos veces escrita no es una copia de la otra: son dos\n' +
          '  afirmaciones sueltas del mismo hecho, y quien cambie una no se entera de que hay otra.\n' +
          '  Se saca de ahí y se lee de `ClienteDatos`, como hace `js/auth.js`.');
      }
    }
  }

  /* Que no esté escrita en ningún lado da lo mismo si además no la lee nadie. */
  const auth = readFileSync(join(raiz, 'js', 'auth.js'), 'utf8');
  let cableado = 0;
  for (const campo of ['supabaseUrl', 'supabaseKey']) {
    /* Se pide la asignación, no la mención: `!ClienteDatos.supabaseKey` aparece
       también en el aviso de arranque, y con eso solo el chequeo pasaría aunque
       el valor terminara saliendo de cualquier otro lado. */
    if (new RegExp('=\\s*ClienteDatos\\.' + campo + '\\b').test(auth)) cableado++;
    else problemas.push(
      'js/auth.js ya no saca «' + campo + '» de `ClienteDatos` con una asignación.\n' +
      '  Sin ese cableado, este chequeo pasa igual y el producto no se conecta a ninguna base:\n' +
      '  cero apariciones fuera del original es lo que devuelve tanto lo bueno como lo roto.');
  }

  /* Y el orden de los `<script>`, que `auth.js` necesita y nadie ve hasta que
     falla. Se mira sólo en las pantallas que cargan los dos. */
  let pantallas = 0;
  for (const camino of hayArchivos(raiz, ['.html'])) {
    const ruta = comoLoEscribeElProyecto(relative(raiz, camino));
    const html = readFileSync(camino, 'utf8');
    const dondeAuth = html.search(/<script[^>]+src="[^"]*\bauth\.js/);
    if (dondeAuth < 0) continue;
    const dondeCliente = html.search(/<script[^>]+src="[^"]*\bapiClient\.js/);
    pantallas++;
    if (dondeCliente < 0) {
      problemas.push(
        ruta + ' carga `auth.js` y no carga `apiClient.js`.\n' +
        '  De ahí sale la dirección de la base: la pantalla se planta al arrancar.');
    } else if (dondeCliente > dondeAuth) {
      problemas.push(
        ruta + ' carga `apiClient.js` DESPUÉS de `auth.js`, y tiene que ser antes.\n' +
        '  De ahí sale la dirección de la base: la pantalla se planta al arrancar.');
    }
  }
  seRevisaron(pantallas, 'una sola pantalla que cargue `js/auth.js`');

  return { problemas, mirados, pantallas, cableado, agujas: AGUJAS.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { problemas, mirados, pantallas, agujas } = verificarBase();
  if (problemas.length) {
    console.error('\n' + problemas.join('\n\n') + '\n');
    process.exit(1);
  }
  console.log(
    'Base verificada: ' + mirados + ' archivos sin la dirección ni la clave escritas a mano (' +
    agujas + ' formas de escribirlas), ' + pantallas +
    ' pantallas que cargan `js/apiClient.js` antes que `js/auth.js`, y ninguna clave secreta ' +
    'en ningún lado.');
}
