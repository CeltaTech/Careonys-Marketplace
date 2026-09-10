/* ===================================================
   LO QUE SE LE DICE A QUIEN NO PUDO FICHAR SALE DE LA LISTA APROBADA

       node scripts/verificar_motivos.mjs

   Cuando la base rechaza una fichada, la pantalla del Asistente dice **por
   qué**. Lo ordenó el Desarrollador: «los mensajes seran sacados de entre una
   lista de posibles y aprobados, no podemos decir todo». Y coincide con la
   regla de la empresa: el texto crudo que devuelve la base nombra tablas,
   columnas y restricciones, y eso no se le muestra a nadie.

   Que eso sea así hoy se ve leyendo `js/cola-fichadas.js`. Este chequeo existe
   para que siga siendo así mañana, y **no lee: corre**. Carga la cola de
   verdad, le hace fallar el envío con un error crudo inventado, y mira qué
   sale.

   ---- Las tres cosas que mira ----

   **1. Nunca sale otra cosa que una de las frases aprobadas.** Sea cual sea el
   error, el motivo que la cola entrega es una clave del catálogo que empieza
   por `fichado.motivo_`. Si alguien mapeara un error al texto del servidor —o
   agregara un motivo que no está en el catálogo—, esto se pone rojo.

   **2. Ninguna palabra del error crudo llega a la pantalla.** Cada error
   inventado del banco trae anotado qué nombres técnicos lleva adentro —la
   tabla, la columna, la restricción—, y se comprueba que ninguno aparezca en
   la frase, en ninguno de los tres idiomas. Es el control negativo: si el día
   de mañana la pantalla mostrara el texto del servidor, esta comprobación es
   la que se planta.

   **3. Ninguna frase de motivo quedó sin usar.** Al revés que la anterior: se
   recorre el catálogo y se exige que cada `fichado.motivo_…` la produzca algún
   error del banco. Una frase que no puede salir nunca es una frase muerta que
   igual hay que traducir a tres idiomas.

   ---- Por qué el banco de errores es inventado ----

   Porque no entran datos de personas reales en ninguna prueba, y porque un
   error de verdad depende de que haya base delante. Los textos están escritos
   con la forma exacta que devuelven PostgREST y el navegador —que es lo que
   `Texto.claveDeError` sabe leer—, con nombres de tabla y de columna
   inventados a propósito para que se los pueda buscar después en la frase.

   ---- Lo que este chequeo no mira ----

   No mira la cola guardada en el teléfono: eso vive en `IndexedDB`, que no
   existe fuera del navegador. Se le hace fallar el paso anterior —averiguar de
   quién es la sesión—, que llega al mismo clasificador sin tocar el depósito.
=================================================== */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';
import { seRevisaron } from './recorrido.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const PREFIJO = 'fichado.motivo_';
const IDIOMAS = ['es-AR', 'en', 'pt-BR'];

/* ---- EL BANCO DE ERRORES INVENTADOS ----

   `crudo` es lo que contestaría el servidor. `tecnico` son los nombres que ese
   texto lleva adentro y que no pueden aparecer en ninguna pantalla. */
const BANCO = [
  {
    caso: 'la sesión venció',
    crudo: { message: 'new row violates row-level security policy for table "marcas_de_reloj"' },
    tecnico: ['marcas_de_reloj', 'row-level security']
  },
  {
    caso: 'la sesión ya no está',
    crudo: { message: 'Auth session missing!' },
    tecnico: ['Auth session missing']
  },
  {
    caso: 'la base rechazó el dato',
    crudo: { message: 'new row for relation "marcas_de_reloj" violates check constraint "marcas_hora_no_futura"' },
    tecnico: ['marcas_de_reloj', 'marcas_hora_no_futura', 'check constraint']
  },
  {
    caso: 'no existe adónde escribir',
    crudo: { message: 'relation "public.marcas_de_reloj_vieja" does not exist' },
    tecnico: ['marcas_de_reloj_vieja', 'public.']
  },
  {
    caso: 'algo que el clasificador reconoce y que acá no se puede decir',
    crudo: { message: 'Invalid login credentials' },
    tecnico: ['Invalid login credentials']
  },
  {
    caso: 'algo que no reconoce nadie',
    crudo: { message: 'ERROR: 57014 canceling statement due to statement timeout' },
    tecnico: ['57014', 'statement timeout']
  }
];

// ── La cola de verdad, cargada fuera del navegador ─────────────────────────

const { Texto } = require(join(raiz, 'js', 'texto.js'));

/* El error se le hace tirar a `legajoPropio`, que es lo primero que
   `sincronizar` intenta y pasa antes de tocar el depósito del teléfono. Lo que
   devuelve es la lista de motivos, que es justamente lo que se quiere ver. */
const FUENTE = readFileSync(join(raiz, 'js', 'cola-fichadas.js'), 'utf8');

/* En el navegador todo esto son globales **y** propiedades de `window`, y la
   cola las nombra de las dos formas. Fuera del navegador hay que ponerlas de
   las dos o la cola no encuentra ni al clasificador ni al cliente. */
function motivoDe(crudo) {
  const Sesion = {};
  const ClienteDatos = { legajoPropio: async () => { throw crudo; } };
  const ventana = { Texto, Sesion, ClienteDatos, addEventListener: () => {} };
  const contexto = createContext({
    window: ventana,
    Texto,
    Sesion,
    ClienteDatos,
    Identidad: { datos: { codigo: 'chequeo' } },
    navigator: { onLine: true },
    document: { addEventListener: () => {}, visibilityState: 'visible' },
    indexedDB: undefined
  });
  runInContext(FUENTE, contexto);
  return ventana.ColaFichadas.sincronizar();
}

/* El clasificador manda el detalle técnico a la consola a propósito, que es
   justo lo que este chequeo le pide de comer. Se lo tapa mientras corre el
   banco: la salida de un chequeo es lo que se lee en cada commit. */
async function sinRuido(hacer) {
  const antes = console.error;
  console.error = () => {};
  try { return await hacer(); } finally { console.error = antes; }
}

// ── Las frases aprobadas, sacadas del catálogo ─────────────────────────────

const catalogo = JSON.parse(readFileSync(join(raiz, 'data', 'catalogo-frases.json'), 'utf8'));
const frases = catalogo.frases || {};
const aprobadas = Object.keys(frases).filter((c) => c.startsWith(PREFIJO)).sort();

seRevisaron(aprobadas.length, `ninguna frase «${PREFIJO}…» en data/catalogo-frases.json`);
seRevisaron(BANCO.length, 'ningún error en el banco de errores inventados');

const problemas = [];
const salieron = new Set();

for (const { caso, crudo, tecnico } of BANCO) {
  const motivos = await sinRuido(() => motivoDe(crudo));

  if (motivos.length !== 1) {
    problemas.push(`«${caso}»: la cola devolvió ${motivos.length} motivos y tenía que devolver uno.`);
    continue;
  }
  const clave = motivos[0];
  salieron.add(clave);

  // 1. Es una de las aprobadas.
  if (!aprobadas.includes(clave)) {
    problemas.push(
      `«${caso}»: la cola contestó «${clave}», que no es ninguna de las frases aprobadas ` +
      `(${aprobadas.join(', ')}). Lo que se le muestra a quien no pudo fichar sale de esa lista y de ningún otro lado.`
    );
    continue;
  }

  // 2. Nada del texto crudo llega a la frase, en ninguno de los tres idiomas.
  for (const idioma of IDIOMAS) {
    const texto = (frases[clave] || {})[idioma];
    if (typeof texto !== 'string' || texto.trim() === '') {
      problemas.push(`A la frase «${clave}» le falta el idioma «${idioma}».`);
      continue;
    }
    for (const nombre of tecnico) {
      if (texto.toLowerCase().includes(nombre.toLowerCase())) {
        problemas.push(
          `«${caso}»: la frase «${clave}» en «${idioma}» nombra «${nombre}», que es texto crudo del servidor.`
        );
      }
    }
  }
}

// 3. Ninguna frase de motivo quedó sin poder salir.
for (const clave of aprobadas) {
  if (!salieron.has(clave)) {
    problemas.push(
      `La frase «${clave}» está en el catálogo y traducida a tres idiomas, y ningún error la produce. ` +
      'O falta el caso en el banco de errores, o la frase quedó muerta.'
    );
  }
}

if (problemas.length) {
  console.error('\n' + problemas.join('\n') +
    '\n\nLa lista cerrada de motivos vive en `js/cola-fichadas.js`, y las frases en ' +
    '`data/catalogo-frases.json`.\n');
  process.exit(1);
}

console.log(
  `Motivos del fichado verificados: ${BANCO.length} errores crudos, ` +
  `${aprobadas.length} frases aprobadas, ninguna palabra del servidor en pantalla.`
);
