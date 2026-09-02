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
   4. **El tope de tamaño y los tipos de archivo que el navegador rechaza dicen
      exactamente lo mismo que la migración.** La regla de la empresa dice «se
      valida en el servidor lo que entra, aunque exista un control equivalente
      más abajo. Un límite que sólo vive en el depósito de archivos actúa
      **después** de que el archivo ya ocupó la memoria»
      (`celtatech\CLAUDE.md`, «Seguridad, privacidad y auditoría»). Así que el
      navegador necesita su propia copia del tope, y una copia sin guarda se
      despega: el 31 de agosto de 2026 el tope de 10 MB vivía **sólo** en la
      migración, y subir una foto de 30 MB la mandaba entera antes de que el
      servidor la rechazara.

      La forma es la que bendice la regla de la empresa para cuando la
      plataforma obliga a duplicar: **original, copia y comprobación
      automática**. El original es la migración; la copia es `DEPOSITOS`, en el
      archivo que define `urlPublica()` y `urlFirmada()`; la comprobación es
      ésta, y rompe la construcción si difieren en un byte. Se compara el tope
      y la lista de tipos, sin importar el orden en que estén escritos.
   5. **Lo que cada campo de archivo deja elegir sale del depósito, y no está
      escrito en la pantalla.** El atributo `accept` no rechaza nada —se
      desactiva en el diálogo mismo—, pero escrito a mano se despega igual que
      cualquier copia sin guarda, y se despegó en las dos direcciones: un
      `.jpg,.png,.pdf` que dejaba afuera el `heic` con que fotografía un iPhone,
      así que la foto de la credencial no se podía ni elegir; y un `image/*` que
      ofrecía elegir un `gif` para rechazarlo después de subirlo entero. Es un
      catálogo escrito adentro de una pantalla, que es lo que la regla de los
      catálogos viene a evitar.

      Se mira que ninguna pantalla escriba la lista —un `accept` sólo vale si su
      valor entero sale de una interpolación—, que todo campo de archivo diga a
      dónde va —con un `data-deposito`, o siendo uno de los papeles que declara
      `LOS_CUATRO`, que se lo escribe—, y que la pantalla que tiene esos papeles
      cargue el guion que se los declara. Y lo que escribe la lista se ejerce, no
      se lee: se sacan `_loQueAcepta()` y `_escribirLoQueSeAcepta()` del archivo
      real y se los corre contra los tipos de la migración y contra una pantalla
      de mentira.

   Qué NO mira, dicho de frente:
   - Si el `accept` de un campo de archivo cumple algo. No cumple: es una
     sugerencia para el buscador de archivos y se desactiva ahí mismo. Quien
     rechaza es `_porQueNoSeSube()`, y eso lo ejerce la cuarta regla.
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

import { hayArchivos, EXTENSIONES_DE_PANTALLA, esPantalla, seRevisaron } from './recorrido.mjs';
import { depositosDeclarados, limitesDeclarados } from './verificar_esquema.mjs';

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

/* La copia del navegador: `const DEPOSITOS = { 'nombre': { limite, tipos } }`.
   Se lee cada entrada por separado, y el tope y los tipos por su nombre, para
   que agregar un campo tercero no cambie lo que se lee. */
const COPIA_DEL_NAVEGADOR = /\bconst\s+DEPOSITOS\s*=\s*\{([\s\S]*?)\n\};/;
const UNA_ENTRADA = /(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$-]*))\s*:\s*\{([^}]*)\}/g;

/* La decisión que toma el navegador antes de subir, para poder ejercerla. Se la
   saca del archivo real y se la corre con casos inventados: que la copia diga
   lo mismo que la migración no prueba que el rechazo funcione. */
const LA_DECISION = /function\s+_porQueNoSeSube\s*\([\s\S]*?\n\}/;

/* Lo que un campo de archivo deja elegir. Un `accept` sólo pasa si su valor
   entero sale de una interpolación: un tipo escrito adentro es la lista escrita
   a mano que esta regla persigue. */
const UN_ACCEPT = /\baccept\s*=\s*(['"])([\s\S]*?)\1/g;
const SOLO_INTERPOLADO = /^\$\{[^}]*\}$/;
const UN_CAMPO_DE_ARCHIVO = /<input\b[^>]*\btype\s*=\s*(['"]?)file\1[^>]*>/gi;
const DICE_SU_DEPOSITO = /\bdata-deposito\s*=/i;
const UN_ID = /\bid\s*=\s*(['"])([^'"]*)\1/i;

/* Los papeles del legajo y a qué depósito va cada uno: eso lo declara
   `LOS_CUATRO`, y de ahí sale el `data-deposito` de esos campos. Se lo busca por
   lo que declara y no por su ruta, como en la tercera regla, así que las copias
   del mismo archivo (pendiente 13) entran sin nombrarlas. */
const LOS_CUATRO = /\bLOS_CUATRO\s*:\s*\[([\s\S]*?)\n\s*\],/;
const UN_CAMPO_DECLARADO = /\bcampo\s*:\s*['"]([^'"]+)['"]/g;
const LO_DECLARA = /documentos-legajo\.js/;

/* Y las dos funciones que escriben la lista, para ejercerlas. */
const LO_QUE_ACEPTA = /function\s+_loQueAcepta\s*\([\s\S]*?\n\}/;
const LO_ESCRIBE = /function\s+_escribirLoQueSeAcepta\s*\([\s\S]*?\n\}/;

/* Cada caso: qué es, el depósito, el archivo de mentira, y qué clave del
   catálogo tiene que salir (`null` = se sube). Los tamaños son relativos a los
   topes reales, así que valen aunque la migración los cambie. */
function casosDeRechazo(topes) {
  const nombre = [...topes.keys()][0];
  const { limite, tipos } = topes.get(nombre);
  const bueno = tipos[0];
  return [
    ['un archivo del tamaño y el tipo permitidos', nombre,
     { size: limite - 1, type: bueno }, null],
    ['el mismo tipo escrito en mayúsculas', nombre,
     { size: 1, type: bueno.toUpperCase() }, null],
    ['justo en el tope, que todavía entra', nombre,
     { size: limite, type: bueno }, null],
    ['un depósito que nadie declaró', 'no-existe',
     { size: 1, type: bueno }, 'error.archivo_deposito'],
    ['un archivo más pesado que el tope', nombre,
     { size: limite + 1, type: bueno }, 'error.archivo_pesado'],
    ['un tipo de archivo que el depósito no acepta', nombre,
     { size: 1, type: 'application/x-msdownload' }, 'error.archivo_tipo'],
    ['un archivo sin tipo declarado', nombre,
     { size: 1, type: '' }, 'error.archivo_tipo'],
    /* El caso que la regla de la empresa nombra: `undefined > 10485760` da
       falso, así que sin preguntar por el tipo del dato pasaría de largo. */
    ['algo que no es un archivo, sin tamaño', nombre,
     { type: bueno }, 'error.archivo_tipo'],
    ['nada', nombre, null, 'error.archivo_tipo']
  ];
}

/** La copia declarada en un texto: `Map<nombre, { limite, tipos }>` o `null`. */
function copiaDelNavegador(texto) {
  const bloque = COPIA_DEL_NAVEGADOR.exec(texto);
  if (!bloque) return null;
  const copia = new Map();
  for (const m of bloque[1].matchAll(UNA_ENTRADA)) {
    const nombre = (m[1] || m[2] || m[3]).toLowerCase();
    const tope = /\blimite\s*:\s*(\d+)/.exec(m[4]);
    const tipos = /\btipos\s*:\s*\[([^\]]*)\]/.exec(m[4]);
    copia.set(nombre, {
      limite: tope ? Number(tope[1]) : null,
      tipos: tipos
        ? [...tipos[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((t) => (t[1] || t[2]).toLowerCase())
        : null
    });
  }
  return copia;
}

/** En qué difiere la copia del navegador de lo que declara la migración. */
function diferencias(copia, declarado) {
  const dichas = [];
  const iguales = (a, b) => a !== null && b !== null &&
    a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

  for (const [nombre] of copia) {
    if (!declarado.has(nombre)) {
      dichas.push(`la copia declara el depósito «${nombre}», que ninguna migración declara`);
    }
  }
  for (const [nombre, esperado] of declarado) {
    if (!copia.has(nombre)) {
      dichas.push(`la copia no declara el depósito «${nombre}», así que el navegador ` +
        'no le pone tope de tamaño ni de tipo y el archivo viaja entero antes del rechazo');
      continue;
    }
    const tiene = copia.get(nombre);
    if (tiene.limite !== esperado.limite) {
      dichas.push(`«${nombre}»: la copia dice que el tope es ${tiene.limite} y la ` +
        `migración dice ${esperado.limite}`);
    }
    if (!iguales(tiene.tipos, esperado.tipos)) {
      dichas.push(`«${nombre}»: la copia acepta [${tiene.tipos}] y la migración ` +
        `acepta [${esperado.tipos}]`);
    }
  }
  return dichas;
}

/** El renglón donde cae una posición del texto. */
function renglonDe(texto, indice) {
  return texto.slice(0, indice).split('\n').length;
}

/** Los nombres de depósito de un archivo: `[renglón, nombre, esPublico, dónde]`. */
function nombresDeUnArchivo(texto) {
  const salida = [];
  for (const [patron, publico, donde] of LUGARES) {
    for (const m of texto.matchAll(new RegExp(patron.source, patron.flags))) {
      /* Un depósito que llega por variable no se puede leer acá, y no hace
         falta: la pantalla no escribió ningún nombre. Vale para el
         `data-deposito` que arma `js/fichas-legajo.js`, y no para una dirección
         pública, donde el nombre sí tiene que estar a la vista. */
      if (!publico && SOLO_INTERPOLADO.test(m[1])) continue;
      salida.push([renglonDe(texto, m.index), m[1], publico, donde]);
    }
  }
  return salida.sort((a, b) => a[0] - b[0]);
}

/** Las fallas de la quinta regla en un texto: `[renglón, motivo]`. */
function fallasDelAccept(texto, papeles) {
  const fallas = [];
  for (const m of texto.matchAll(UN_ACCEPT)) {
    if (SOLO_INTERPOLADO.test(m[2].trim())) continue;
    fallas.push([renglonDe(texto, m.index),
      `un campo de archivo dice a mano qué se puede elegir («${m[2]}»). Eso lo ` +
      'declara la migración y lo escribe `_loQueAcepta()`: acá va el depósito, con ' +
      '`data-deposito`, y la lista la pone él']);
  }
  for (const m of texto.matchAll(UN_CAMPO_DE_ARCHIVO)) {
    if (DICE_SU_DEPOSITO.test(m[0])) continue;
    const id = UN_ID.exec(m[0]);
    if (id && papeles.has(id[2])) continue;
    fallas.push([renglonDe(texto, m.index),
      'un campo de archivo que no dice a qué depósito va, así que nadie le puede ' +
      'escribir qué se acepta y el diálogo se abre de par en par. Va un ' +
      '`data-deposito`, o el papel se declara en `LOS_CUATRO`, que se lo escribe']);
  }
  return fallas;
}

/* Un campo de archivo de mentira, con lo justo para que
   `_escribirLoQueSeAcepta()` lo pueda tocar. No hay pantalla en Node, y no hace
   falta una entera para preguntarle esto. */
function campoDeMentira(deposito, yaTiene) {
  const puestos = new Map([['data-deposito', deposito]]);
  if (yaTiene !== undefined) puestos.set('accept', yaTiene);
  return {
    getAttribute: (que) => (puestos.has(que) ? puestos.get(que) : null),
    setAttribute: (que, cuanto) => puestos.set(que, cuanto),
    removeAttribute: (que) => puestos.delete(que),
    ofrece: () => (puestos.has('accept') ? puestos.get('accept') : null)
  };
}

/** En qué falla lo que se ofrece elegir, contra lo que declara la migración. */
function loQueOfrece({ acepta, escribir }, declarado) {
  const dichas = [];
  const iguales = (a, b) => a.length === b.length &&
    [...a].sort().join('|') === [...b].sort().join('|');

  for (const [nombre, esperado] of declarado) {
    const ofrecido = acepta(nombre);
    if (!ofrecido || !iguales(ofrecido.split(','), esperado.tipos)) {
      dichas.push(`«${nombre}»: al elegir un archivo se ofrece [${ofrecido}] y la ` +
        `migración acepta [${esperado.tipos}]`);
    }
  }
  if (acepta('no-existe') !== '') {
    dichas.push('para un depósito que nadie declaró se ofrece algo en vez de nada, ' +
      'así que la pantalla inventa una lista sin saber a dónde va el archivo');
  }

  const nombre = [...declarado.keys()][0];
  const bueno = campoDeMentira(nombre);
  const perdido = campoDeMentira('no-existe', 'image/gif');
  const escritos = escribir({ querySelectorAll: () => [bueno, perdido] });
  if (bueno.ofrece() !== acepta(nombre)) {
    dichas.push('`_escribirLoQueSeAcepta()` no le escribió lo que se acepta a un ' +
      `campo que dice ir a «${nombre}»: le dejó ${JSON.stringify(bueno.ofrece())}`);
  }
  if (perdido.ofrece() !== null) {
    dichas.push('`_escribirLoQueSeAcepta()` le dejó un `accept` a un campo que ' +
      'nombra un depósito que nadie declaró, y ahí no hay nada que ofrecer');
  }
  if (escritos !== 1) {
    dichas.push(`\`_escribirLoQueSeAcepta()\` dice haber escrito ${escritos} campos ` +
      'de los dos que recibió, y era uno solo');
  }
  if (escribir(null) !== 0) {
    dichas.push('`_escribirLoQueSeAcepta()` sin pantalla no contesta que no ' +
      'escribió nada, y en una pantalla sin campos de archivo no hay nada que hacer');
  }
  return dichas;
}

/* Las pruebas de adentro: si el detector deja de distinguir estos casos, el
   chequeo no verifica nada y hay que enterarse acá, no el día que falle. */
const DECLARADOS_DE_PRUEBA = new Map([['publico', true], ['privado', false]]);

const MAL = [
  ['un `data-deposito` con un nombre que ninguna migración declara',
   '<input type="file" data-deposito="privadoo" />\n'],
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
  ['un `data-deposito` que la pantalla arma con una variable, sin escribir el nombre',
   'return `<input type="file" data-deposito="${deposito}" />`;\n'],
];

/* Y las de la quinta. Los papeles de prueba son de mentira a propósito: que el
   detector dependa de los cuatro de verdad lo haría pasar por casualidad. */
const PAPELES_DE_PRUEBA = new Set(['file-dni']);

const ACCEPT_MAL = [
  ['la lista de tipos escrita a mano en la pantalla',
   '<input type="file" id="file-dni" accept="image/*,.pdf" />'],
  ['la misma lista, escrita con extensiones',
   '<input type="file" id="file-dni" accept=".jpg,.jpeg,.png,.pdf" />'],
  ['un campo de archivo que no dice a qué depósito va',
   '<input type="file" id="otro-papel" />'],
];

const ACCEPT_BIEN = [
  ['un campo que nombra su depósito y deja que se lo escriban',
   '<input type="file" id="otro-papel" data-deposito="avatares" />'],
  ['uno de los papeles que declara `LOS_CUATRO`, sin `accept`',
   '<input type="file" id="file-dni" />'],
  ['un `accept` armado con lo que contesta el depósito',
   'return `<input type="file" data-deposito="${d}" accept="${Texto.escapar(acepta)}" />`;'],
  ['un campo que no es de archivo, que esta regla no mira',
   '<input type="text" id="apellido" maxlength="60" />'],
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

const rotoLaQuinta = [];
for (const [que, texto] of ACCEPT_MAL) {
  if (fallasDelAccept(texto, PAPELES_DE_PRUEBA).length === 0) {
    rotoLaQuinta.push('no detecta: ' + que);
  }
}
for (const [que, texto] of ACCEPT_BIEN) {
  if (fallasDelAccept(texto, PAPELES_DE_PRUEBA).length > 0) {
    rotoLaQuinta.push('avisa de más: ' + que);
  }
}
if (rotoLaQuinta.length) {
  console.error('La quinta regla está rota, así que no verifica nada:');
  for (const q of rotoLaQuinta) console.error('  ' + q);
  process.exit(1);
}

/* La cuarta regla se prueba a sí misma con la misma vara: una copia que dice lo
   mismo pasa, y cada forma de despegarse tiene que dar rojo. El orden de los
   tipos no cuenta como diferencia, y eso también se prueba: si contara, el
   chequeo daría rojo por escribir la lista al revés, que no es un defecto. */
const DECLARADO_DE_PRUEBA = new Map([
  ['privado', { limite: 100, tipos: ['image/png', 'application/pdf'] }],
  ['publico', { limite: 50, tipos: ['image/png'] }]
]);

const COPIA_QUE_ESTA_BIEN =
  "const DEPOSITOS = {\n" +
  "  privado: { limite: 100, tipos: ['application/pdf', 'image/png'] },\n" +
  "  publico: { limite: 50, tipos: ['image/png'] }\n" +
  '};';

const COPIAS_MAL = [
  ['un tope distinto del que declara la migración',
   COPIA_QUE_ESTA_BIEN.replace('limite: 100', 'limite: 200')],
  ['un tipo de archivo que la migración no acepta',
   COPIA_QUE_ESTA_BIEN.replace("'image/png' ]", "'image/png', 'image/gif' ]")
     .replace("tipos: ['application/pdf', 'image/png']",
       "tipos: ['application/pdf', 'image/png', 'image/gif']")],
  ['un tipo de archivo que la migración acepta y la copia olvidó',
   COPIA_QUE_ESTA_BIEN.replace("tipos: ['application/pdf', 'image/png']",
     "tipos: ['application/pdf']")],
  ['un depósito entero que la copia no nombra',
   "const DEPOSITOS = {\n  publico: { limite: 50, tipos: ['image/png'] }\n};"],
  ['un depósito que la copia inventa',
   COPIA_QUE_ESTA_BIEN.replace('};',
     "  , otro: { limite: 10, tipos: ['image/png'] }\n};")]
];

const rotoLaCuarta = [];
if (diferencias(copiaDelNavegador(COPIA_QUE_ESTA_BIEN) || new Map(),
  DECLARADO_DE_PRUEBA).length > 0) {
  rotoLaCuarta.push('avisa de más: una copia que dice lo mismo, con los tipos en otro orden');
}
if (copiaDelNavegador('const OTRA_COSA = { a: 1 };') !== null) {
  rotoLaCuarta.push('avisa de más: encuentra una copia donde no hay ninguna');
}
for (const [que, texto] of COPIAS_MAL) {
  const copia = copiaDelNavegador(texto);
  if (copia === null || diferencias(copia, DECLARADO_DE_PRUEBA).length === 0) {
    rotoLaCuarta.push('no detecta: ' + que);
  }
}
if (rotoLaCuarta.length) {
  console.error('La cuarta regla está rota, así que no verifica nada:');
  for (const q of rotoLaCuarta) console.error('  ' + q);
  process.exit(1);
}

// ── Lo declarado, de donde vive la lectura de las migraciones ──────────────

const carpeta = join(raiz, 'supabase', 'migrations');
const migraciones = readdirSync(carpeta).filter((n) => n.endsWith('.sql')).sort()
  .map((n) => readFileSync(join(carpeta, n), 'utf8'));
const declarados = depositosDeclarados(migraciones);
const limites = limitesDeclarados(migraciones);
seRevisaron(declarados.size, 'ningún depósito declarado en supabase/migrations');
seRevisaron(limites.size, 'ningún tope de tamaño declarado en supabase/migrations');

// ── Lo que hace el código ──────────────────────────────────────────────────

const pantallas = hayArchivos(raiz, [...EXTENSIONES_DE_PANTALLA, '.js'], AJENAS);

/* Los papeles del legajo, primero: la quinta regla los necesita para saber qué
   campo de archivo tiene quien le escriba el depósito sin decirlo en la
   pantalla. */
const papeles = new Set();
for (const camino of pantallas) {
  const declarados = LOS_CUATRO.exec(readFileSync(camino, 'utf8'));
  if (!declarados) continue;
  for (const m of declarados[1].matchAll(UN_CAMPO_DECLARADO)) papeles.add(m[1]);
}
seRevisaron(papeles.size, 'ningún papel del legajo declarado en `LOS_CUATRO`');

const fallas = [];
let nombrados = 0;
let llamadas = 0;
let copias = 0;
let campos = 0;

for (const camino of pantallas) {
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

  /* 4. Y ese mismo archivo es el que tiene la copia del tope y de los tipos.
     Se le exige a cada copia por separado, así que las tres de `js/auth.js`
     entran las tres: que una se despegue de las otras dos es exactamente el
     defecto que esto busca. */
  if (sabeLaDiferencia) {
    const copia = copiaDelNavegador(texto);
    if (!copia) {
      fallas.push(`${archivo}  define \`urlPublica()\` y \`urlFirmada()\` pero no ` +
        'declara `DEPOSITOS`, así que el navegador sube cualquier archivo de cualquier ' +
        'tamaño y el rechazo llega recién del servidor, con el archivo ya viajado');
    } else {
      copias++;
      for (const dicha of diferencias(copia, limites)) {
        fallas.push(`${archivo}  ${dicha}`);
      }

      /* Y la decisión se ejerce, no se lee. Se la saca junto con la copia que
         mira, y se la corre con casos armados a partir de los topes reales. */
      const cuerpo = LA_DECISION.exec(texto);
      const declara = COPIA_DEL_NAVEGADOR.exec(texto);
      if (!cuerpo) {
        fallas.push(`${archivo}  declara \`DEPOSITOS\` pero no define ` +
          '`_porQueNoSeSube()`, así que nadie mira el tope antes de subir');
      } else {
        let decidir;
        try {
          decidir = new Function(
            `const DEPOSITOS = {${declara[1]}\n};\n${cuerpo[0]}\nreturn _porQueNoSeSube;`)();
        } catch (e) {
          fallas.push(`${archivo}  \`_porQueNoSeSube()\` no se pudo ejercer: ${e.message}`);
        }
        for (const [que, dep, falso, espera] of decidir ? casosDeRechazo(limites) : []) {
          let dio;
          try { dio = decidir(dep, falso); } catch (e) { dio = 'se rompió: ' + e.message; }
          if (dio !== espera) {
            fallas.push(`${archivo}  con ${que} contestó ${JSON.stringify(dio)} y ` +
              `tenía que contestar ${JSON.stringify(espera)}`);
          }
        }
      }

      /* Y lo que se ofrece elegir también se ejerce: `_loQueAcepta()` tiene que
         contestar exactamente los tipos de la migración, y
         `_escribirLoQueSeAcepta()` tiene que ponérselos al campo que nombra un
         depósito declarado y sacárselos al que nombra cualquier cosa. */
      const ofrece = LO_QUE_ACEPTA.exec(texto);
      const escribe = LO_ESCRIBE.exec(texto);
      if (!ofrece || !escribe) {
        fallas.push(`${archivo}  declara \`DEPOSITOS\` pero no define ` +
          '`_loQueAcepta()` y `_escribirLoQueSeAcepta()`, así que cada pantalla ' +
          'vuelve a escribir a mano qué archivos se pueden elegir');
      } else {
        let armar;
        try {
          armar = new Function(
            `const DEPOSITOS = {${declara[1]}\n};\n${ofrece[0]}\n${escribe[0]}\n` +
            'return { acepta: _loQueAcepta, escribir: _escribirLoQueSeAcepta };')();
        } catch (e) {
          fallas.push(`${archivo}  lo que se ofrece elegir no se pudo ejercer: ${e.message}`);
        }
        for (const dicha of armar ? loQueOfrece(armar, limites) : []) {
          fallas.push(`${archivo}  ${dicha}`);
        }
      }
    }
  }

  /* 5. Ninguna pantalla escribe qué archivos se pueden elegir, y todo campo de
     archivo dice a qué depósito va, que es de donde sale esa lista. */
  campos += [...texto.matchAll(UN_CAMPO_DE_ARCHIVO)].length;
  for (const [renglon, motivo] of fallasDelAccept(texto, papeles)) {
    fallas.push(`${archivo}:${renglon}  ${motivo}`);
  }

  /* Y la pantalla que tiene esos papeles carga el guion que se los declara: sin
     él nadie les escribe el depósito, y el diálogo vuelve a abrirse de par en
     par sin que nada avise. */
  if (esPantalla(archivo) && !LO_DECLARA.test(texto)) {
    for (const m of texto.matchAll(UN_CAMPO_DE_ARCHIVO)) {
      const id = UN_ID.exec(m[0]);
      if (!id || !papeles.has(id[2]) || DICE_SU_DEPOSITO.test(m[0])) continue;
      fallas.push(`${archivo}:${renglonDe(texto, m.index)}  tiene el papel ` +
        `«${id[2]}» pero no carga \`js/documentos-legajo.js\`, que es quien le ` +
        'escribe a qué depósito va. Sin eso el campo queda sin decir nada');
    }
  }

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
seRevisaron(copias, 'ninguna copia de los topes en el código');
seRevisaron(campos, 'ningún campo de archivo en el código');

if (fallas.length > 0) {
  console.error('El depósito de archivos no se usa como está declarado:\n');
  for (const falla of fallas) console.error('  - ' + falla);
  console.error(
    '\nQuién es público y quién es privado lo dice la migración que los declara,\n' +
    'y no la memoria de quien escribe la pantalla. Lo privado se sirve con enlace\n' +
    'firmado y vencimiento; lo público, sólo lo que se ve sin cuenta.\n' +
    'Y al depósito le habla el archivo que define `urlPublica()` y `urlFirmada()`,\n' +
    'que es donde esa diferencia está escrita una sola vez. Ese mismo archivo lleva\n' +
    'la copia del tope de tamaño y de los tipos, porque un límite que sólo vive en\n' +
    'la migración actúa después de que el archivo ya viajó: la migración manda, y\n' +
    'la copia se corrige contra ella. Y lo que un campo de archivo deja elegir\n' +
    'sale de esa misma copia: la pantalla nombra el depósito con `data-deposito`\n' +
    'y la lista la escribe `_loQueAcepta()`, nunca un renglón a mano.');
  process.exit(1);
}

const publicos = [...declarados].filter(([, p]) => p).length;
console.log(
  `Depósito verificado: ${declarados.size} depósitos declarados (${publicos} público), ` +
  `${nombrados} nombres escritos en el código, todos declarados y ninguno privado ` +
  `servido por dirección pública, las ${llamadas} llamadas al depósito salen del ` +
  'archivo que define `urlPublica()` y `urlFirmada()`, las ' + copias +
  ' copias del tope de tamaño y de los tipos dicen lo mismo que la migración, y ' +
  `los ${campos} campos de archivo dicen a qué depósito van sin escribir a mano ` +
  'qué se puede elegir.');
