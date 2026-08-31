/* ===================================================
   VERIFICA QUE EL DEPÓSITO DE ARCHIVOS SE USE COMO ESTÁ DECLARADO

   Falla —con código de salida 1— si el código nombra un depósito de archivos
   que ninguna migración declara, si sirve por dirección pública uno declarado
   privado, o si le habla al depósito por afuera de las dos funciones que saben
   la diferencia.

       node scripts/verificar_deposito.mjs

   De dónde sale la regla. La de la empresa dice dos cosas en un renglón: «Los
   archivos se guardan privados por defecto y se sirven con dirección firmada y
   vencimiento, nunca con dirección pública» (`celtatech\CLAUDE.md`,
   «Seguridad, privacidad y auditoría»). Este producto tiene **dos** depósitos y
   uno de ellos es público a propósito —`avatares`, porque la foto del
   directorio se ve sin cuenta—, así que la regla acá no es «ninguno es
   público»: es que **cada uno se use como fue declarado**, y que quién es cuál
   salga de la migración y no de la memoria de quien escribe la pantalla.

   Lo que está en juego es de distinto tamaño en cada regla, y conviene decirlo:
   confundirse de depósito **en la dirección pública** publica un documento de
   identidad, que es el peor de los errores posibles de este producto;
   equivocarse el nombre no publica nada, pero **falla callado** —el depósito no
   existe, `urlFirmada()` devuelve `null` y la pantalla no muestra el archivo sin
   decir por qué—.

   Qué mira:
   1. **Todo nombre de depósito que aparece en el código está declarado en una
      migración.** No se adivina qué texto es un nombre de depósito: se miran
      los lugares donde va uno —el primer argumento de `uploadFile`,
      `urlPublica` y `urlFirmada`; un `deposito:` o `deposito =` con el nombre
      escrito; y el tramo de una dirección `/storage/v1/object/public/…/`—.
   2. **Ninguna dirección pública nombra un depósito declarado privado.** Los
      lugares públicos son dos: la dirección armada a mano y `urlPublica()`.
      Quién es privado sale de `depositosDeclarados()`, en
      `scripts/verificar_esquema.mjs`, que es donde vive la lectura de las
      migraciones.
   3. **`.storage.from(` sólo se llama desde el archivo que define las dos
      funciones**, `urlPublica` y `urlFirmada`. No hay ninguna ruta escrita acá:
      el archivo se busca por lo que define, así que las tres copias de
      `js/auth.js` (pendiente 13) pasan sin nombrarlas, y el día que se
      desdupliquen esto sigue valiendo. El motivo es que la diferencia entre
      «enlace que vence» y «dirección para siempre» viva en un solo lugar: una
      llamada suelta la vuelve a decidir, y ahí es donde se decide mal.

   Qué NO mira, dicho de frente:
   - Si el archivo que sube alguien va al depósito correcto. Eso es una decisión
     de la pantalla y sólo lo sabe quien la escribe.
   - Si la política del depósito aísla bien. Eso lo mira la séptima regla de
     `scripts/verificar_esquema.mjs`, y lo prueba corriendo
     `scripts/probar_aislamiento.mjs`.
   - El vencimiento de un enlace firmado. Que exista lo garantiza `urlFirmada()`;
     cuánto dura lo elige cada pantalla.
   - Las migraciones y los guiones de `scripts/` no entran en el corpus: ahí un
     nombre de depósito es o la declaración misma o una prueba que lo nombra a
     propósito.

   **No tiene lista de exenciones, y es a propósito.** Hoy no hay ningún caso
   que la necesite, así que la lista nacería vacía; y una lista vacía no la
   puede probar `scripts/probar_exenciones.mjs`, porque vaciar lo que ya está
   vacío no pone rojo a nadie. Sería una exención sin guarda, que es justo la
   enfermedad que este proyecto viene persiguiendo. El día que aparezca un caso
   se escribe la lista con ese caso adentro, con su motivo y su pendiente.
=================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

import { hayArchivos, EXTENSIONES_DE_PANTALLA, seRevisaron } from './recorrido.mjs';
import { depositosDeclarados } from './verificar_esquema.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Lo que no abre ningún chequeo está en `recorrido.mjs`. Esto es lo que no mira
   éste: un depósito se nombra donde vive una pantalla o su guion. */
const AJENAS = ['docs', 'supabase', 'scripts', 'data', 'assets', 'Nueva carpeta'];

/* Los lugares donde va un nombre de depósito, y si ese lugar es una dirección
   pública. Lo público es lo que se sirve sin sesión y sin vencimiento. */
const LUGARES = [
  [/\b(?:uploadFile|urlFirmada)\s*\(\s*['"`]([^'"`]+)['"`]/g, false,
   'el primer argumento'],
  [/\burlPublica\s*\(\s*['"`]([^'"`]+)['"`]/g, true,
   'el primer argumento'],
  [/\bdeposito\s*[:=]\s*['"`]([^'"`]+)['"`]/g, false,
   'un `deposito:` escrito'],
  [/\/storage\/v1\/object\/public\/([^/'"`$\s]+)\//g, true,
   'una dirección pública armada a mano'],
];

const HABLA_AL_DEPOSITO = /\.storage\s*\.\s*from\s*\(/g;
const DEFINE_PUBLICA = /\burlPublica\s*[(:]/;
const DEFINE_FIRMADA = /\basync\s+urlFirmada\s*\(|\burlFirmada\s*:\s*(?:async\s*)?\(/;

/** El renglón donde cae una posición del texto. */
function renglonDe(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

/** Los nombres de depósito de un archivo: `[renglón, nombre, esPublico, dónde]`. */
function nombresDeUnArchivo(texto) {
  const salida = [];
  for (const [patron, publico, donde] of LUGARES) {
    for (const m of texto.matchAll(new RegExp(patron.source, patron.flags))) {
      salida.push([renglonDe(texto, m.index), m[1], publico, donde]);
    }
  }
  return salida.sort((a, b) => a[0] - b[0]);
}

/* Las pruebas de adentro: si el detector deja de distinguir estos casos, el
   chequeo no verifica nada y hay que enterarse acá, no el día que falle. */
const DECLARADOS_DE_PRUEBA = new Map([['publico', true], ['privado', false]]);

const MAL = [
  ['un depósito que ninguna migración declara',
   "await Sesion.urlFirmada('privadoo', camino, 300);\n"],
  ['el mismo error escrito como `deposito:`',
   "{ campo: 'dni', deposito: 'privadoo' }\n"],
  ['un depósito privado servido por dirección pública armada a mano',
   'return base + `/storage/v1/object/public/privado/${camino}`;\n'],
  ['un depósito privado servido con `urlPublica()`',
   "return Sesion.urlPublica('privado', camino);\n"],
];

const BIEN = [
  ['el depósito privado con enlace firmado, que es como se sirve',
   "await Sesion.urlFirmada('privado', camino, 300);\n"],
  ['el depósito público por dirección fija, que para eso es público',
   'return base + `/storage/v1/object/public/publico/${camino}`;\n'],
  ['el mismo, con `urlPublica()`',
   "return Sesion.urlPublica('publico', camino);\n"],
  ['una subida que recibe el depósito por parámetro, sin escribirlo',
   'await Sesion.uploadFile(deposito, camino, archivo);\n'],
];

/** Las fallas de un texto contra un mapa de depósitos declarados. */
function fallasDeUnTexto(texto, declarados) {
  const fallas = [];
  for (const [renglon, nombre, publico, donde] of nombresDeUnArchivo(texto)) {
    if (!declarados.has(nombre)) {
      fallas.push([renglon, `el depósito «${nombre}», en ${donde}, no lo declara ` +
        'ninguna migración. Un nombre equivocado no rompe nada a la vista: el ' +
        'archivo simplemente no aparece']);
      continue;
    }
    if (publico && declarados.get(nombre) === false) {
      fallas.push([renglon, `el depósito «${nombre}» está declarado privado y acá se ` +
        'sirve por ' + donde + ', que no vence y no pide sesión. Un enlace eterno a un ' +
        'documento de identidad es el documento: va `urlFirmada()`']);
    }
  }
  return fallas;
}

const noDetecta = MAL.filter(([, t]) => fallasDeUnTexto(t, DECLARADOS_DE_PRUEBA).length === 0);
const sePasa = BIEN.filter(([, t]) => fallasDeUnTexto(t, DECLARADOS_DE_PRUEBA).length > 0);
if (noDetecta.length || sePasa.length) {
  console.error('El detector está roto, así que no verifica nada:');
  for (const [q] of noDetecta) console.error('  no detecta: ' + q);
  for (const [q] of sePasa) console.error('  avisa de más: ' + q);
  process.exit(1);
}

// ── Lo declarado, de donde vive la lectura de las migraciones ──────────────

const carpeta = join(raiz, 'supabase', 'migrations');
const declarados = depositosDeclarados(
  readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort()
    .map((n) => readFileSync(join(carpeta, n), 'utf8')));
seRevisaron(declarados.size, 'ningún depósito declarado en supabase/migrations');

// ── Lo que hace el código ──────────────────────────────────────────────────

const fallas = [];
let nombrados = 0;
let llamadas = 0;

for (const camino of hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS)) {
  const archivo = relative(raiz, camino).split(sep).join('/');
  const texto = readFileSync(camino, 'utf8');

  nombrados += nombresDeUnArchivo(texto).length;
  for (const [renglon, motivo] of fallasDeUnTexto(texto, declarados)) {
    fallas.push(`${archivo}:${renglon}  ${motivo}`);
  }

  /* 3. Al depósito le habla el archivo que sabe la diferencia entre un enlace
     que vence y una dirección para siempre, y nadie más. Se lo busca por lo que
     define y no por su ruta: hoy son tres copias del mismo archivo. */
  const sabeLaDiferencia = DEFINE_PUBLICA.test(texto) && DEFINE_FIRMADA.test(texto);
  for (const m of texto.matchAll(HABLA_AL_DEPOSITO)) {
    llamadas++;
    if (sabeLaDiferencia) continue;
    fallas.push(`${archivo}:${renglonDe(texto, m.index)}  le habla al depósito ` +
      'directamente, por afuera de `urlPublica()` y `urlFirmada()`. Ahí es donde ' +
      'vive la diferencia entre un enlace que vence y una dirección para siempre, ' +
      'y una llamada suelta la vuelve a decidir');
  }
}

seRevisaron(nombrados, 'ningún nombre de depósito en el código');
seRevisaron(llamadas, 'ninguna llamada al depósito en el código');

if (fallas.length > 0) {
  console.error('El depósito de archivos no se usa como está declarado:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(
    '\nQuién es público y quién es privado lo dice la migración que los declara,\n' +
    'y no la memoria de quien escribe la pantalla. Lo privado se sirve con enlace\n' +
    'firmado y vencimiento; lo público, sólo lo que se ve sin cuenta.\n' +
    'Y al depósito le habla el archivo que define `urlPublica()` y `urlFirmada()`,\n' +
    'que es donde esa diferencia está escrita una sola vez.');
  process.exit(1);
}

const publicos = [...declarados].filter(([, p]) => p).length;
console.log(
  `Depósito verificado: ${declarados.size} depósitos declarados (${publicos} público), ` +
  `${nombrados} nombres escritos en el código, todos declarados y ninguno privado ` +
  `servido por dirección pública, y las ${llamadas} llamadas al depósito salen del ` +
  'archivo que define `urlPublica()` y `urlFirmada()`.');
