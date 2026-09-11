/* ===================================================
   QUÉ CARPETAS ABRE UN CHEQUEO, Y CUÁLES NO ABRE NUNCA

   Lo usan todos los `scripts/verificar_*.mjs` que recorren el proyecto.

   Por qué existe: la lista estaba copiada en cuatro archivos, con cuatro
   contenidos parecidos pero distintos. El 24 de agosto de 2026 apareció
   `.claude/worktrees/`, que es una copia entera del proyecto que deja el CLI, y
   los cuatro chequeos entraron a revisarla: el de identidad avisó de dieciséis
   marcas escritas a mano que eran las mismas de siempre, vistas dos veces. Una
   lista repetida cuatro veces se arregla tres veces y queda mal la cuarta
   («ningún patrón repetido sin punto único de verdad»).

   `NUNCA_SE_ABRE` es lo que no abre ningún chequeo, por dos razones distintas:
   - **Las cajas fuertes.** La regla de la bóveda está en `F:\proyectos\CLAUDE.md`
     y vale también para un guion que recorre carpetas: `No commit` y las de su
     especie no se listan ni se leen. Se reconocen **por lo que dicen**, no por
     cómo están escritas: `no-commit`, `NoCommit` y `NO HACER COMMIT` son la
     misma puerta cerrada. Lo comprueba `scripts/verificar_cajas.mjs`.
   - **Lo que no es código del proyecto.** Dependencias, estado del CLI, copias
     de trabajo y código apartado. Revisarlo da avisos que nadie puede arreglar,
     porque el archivo señalado no es el que se edita.

   Lo que cada chequeo no quiera mirar por su cuenta —un chequeo de pantallas no
   tiene nada que hacer en `docs/`— va en su propia lista, que se pasa aparte.
=================================================== */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/* Las cajas fuertes se reconocen **por lo que dicen y no por cómo están
   escritas**. Antes se comparaba el nombre exacto, y eso alcanzaba justo para
   las cinco carpetas que existían el día que se escribió la lista: una llamada
   `no-commit`, `NoCommit` o `No Commit` —el mismo pedido, otra tipografía— se
   habría recorrido y leído. Una regla de seguridad que depende de acertar la
   mayúscula no es una regla, es una coincidencia. */
const CAJAS_FUERTES = [
  'no commit', 'no hacer commit', 'no pushear', 'no subir',
  'referencia no hacer commit'
];

/* Y las carpetas de un cliente, que la regla de la bóveda nombra aparte: una
   `Exclusivo Sendler` se abre únicamente cuando el trabajo es de ese cliente, y
   un chequeo que recorre el proyecto entero nunca lo es. No están en la lista de
   arriba porque no se comparan por igualdad sino por el arranque del nombre: lo
   que viene después es el nombre del cliente, y no se puede saber de antemano.

   Encontrado el 31 de agosto de 2026: esta mitad de la regla estaba escrita en
   `scripts/inventario_textos.mjs` y no acá, así que un solo guion la cumplía y
   los veintisiete restantes no. La otra mitad de ese mismo hallazgo es lo de
   abajo. */
const EXCLUSIVO_DE_UN_CLIENTE = /^exclusivo/;

/* Lo que anuncia en el nombre que adentro hay una clave. **Pero un archivo de
   código no es una caja fuerte por llamarse `nueva-clave.html`**: ésa es la
   pantalla donde alguien cambia su contraseña, no un lugar donde haya ninguna
   guardada. Hoy el proyecto tiene seis nombres así —las dos pantallas,
   `js/clave.js` y sus dos copias, `scripts/verificar_claves.mjs` y una
   migración—, y tomarlos por cajas fuertes sacaría del recorrido a seis
   archivos de código de verdad, que es la falla del otro lado: cerrar de más
   deja de revisar y tampoco avisa.

   Por eso la palabra sola frena únicamente cuando el nombre **no** es código:
   un `claves.txt`, un `credenciales.env`, una carpeta `contraseñas`. Y `.md` y
   `.txt` quedan a propósito afuera de la lista de código: un documento que se
   llama así no es una pantalla, es una nota con lo que guarda adentro. */
const ANUNCIA_UNA_CLAVE = /clave|contrase|secret|credencial|password/;
const ES_CODIGO = /\.(html|js|mjs|cjs|css|json|sql|ts|tsx|jsx|svg|webmanifest)$/i;

/* Deja el nombre en su forma más desnuda: separa las palabras pegadas en
   mayúscula —`NoHacerCommit`— y borra todo lo que no sea una letra. Así
   `no_commit`, `No commit`, `NO HACER COMMIT` y `ReferenciaNoHacerCommit`
   terminan siendo la misma cadena que la de la lista. */
const desnudo = (nombre) => nombre
  .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
  .toLowerCase()
  .replace(/[^a-záéíóúñ]/g, '');

const CERRADAS = new Set(CAJAS_FUERTES.map(desnudo));

/* Y lo demás, que no es secreto sino ruido, sí se nombra tal cual: son nombres
   que pone una herramienta y que la herramienta escribe siempre igual. */
const NO_ES_DEL_PROYECTO = new Set([
  // Dependencias y estado de las herramientas.
  'node_modules', '.git', '.vercel', '.temp', '.branches',
  // El inventario que el gestor de paquetes escribe solo con lo que bajó: no
  // lo escribió nadie de acá, no lo lee nadie de acá, y adentro tiene miles de
  // firmas que a un chequeo de texto le parecen palabras. Una de ellas hacía
  // que el control del trato de usted informara tres apariciones de «Ti».
  'package-lock.json',
  // Copias enteras del proyecto que deja el CLI de Claude Code.
  '.claude',
  // Lo que arma la herramienta a partir del código: no lo escribió nadie, no lo
  // lee nadie, y no entra al repositorio —ver `.gitignore`—. Mirarlo acá adentro
  // es mirar dos veces lo mismo, y mal: lo construido junta en un archivo solo
  // lo que estaba repartido en muchos, así que un chequeo que busca por archivo
  // ve una pantalla que no existe, la marca escrita a mano donde no se escribió
  // a mano, y la dirección de la base adentro de algo que no es su único lugar.
  'dist',
  // La cuarentena: lo que se sospecha inútil y todavía no se borra, apartado a
  // propósito. Ya no se edita, así que avisar no sirve. Vive en `/fuera de uso/`
  // —ver `.gitignore`—, y el nombre frena en cualquier nivel por si aparece otra.
  'fuera de uso'
]);

/** ¿Este nombre de carpeta o de archivo se saltea? */
export const nuncaSeAbre = (nombre) => {
  if (NO_ES_DEL_PROYECTO.has(nombre)) return true;
  const limpio = desnudo(nombre);
  if (CERRADAS.has(limpio) || EXCLUSIVO_DE_UN_CLIENTE.test(limpio)) return true;
  if (ES_CODIGO.test(nombre)) return false;
  return ANUNCIA_UNA_CLAVE.test(nombre.toLowerCase());
};

/* Se sigue exportando la lista para quien la quiera mostrar, pero **quien
   decide es `nuncaSeAbre`**: un `Set` sólo sabe comparar el nombre exacto, que
   es justamente lo que acá no alcanza. */
export const NUNCA_SE_ABRE = new Set([...CAJAS_FUERTES, ...NO_ES_DEL_PROYECTO]);

/* ── DE QUÉ SON LAS PANTALLAS ─────────────────────────────────────────────
   Estaba escrito `'.html'` a mano en cuarenta llamadas repartidas por
   diecinueve guiones —once en `verificar_paleta.mjs` sin ir más lejos—. Medido
   el 31 de agosto de 2026 en una copia del proyecto con las quince pantallas
   renombradas a `.jsx`: seis chequeos se plantan y avisan, **once siguen dando
   ✔ con un número más chico que nadie mira**. `botones` pasaba de 21
   manejadores en 11 pantallas a 1 en 1; `estilos` decía que ninguno de los
   **0** atributos `style=` estaba mal, y lo decía en verde.

   Con la extensión acá y en ningún otro lado, el día de la mudanza esa lista
   cambia una vez y los diecinueve guiones la siguen: en la misma copia, con
   este renglón puesto en `['.jsx']`, los once volvieron a sus números de
   siempre y quedaron tres en rojo, que son los tres que tienen que gritar
   —`estado`, `usos` y `estados` buscan por el nombre del archivo, y esos
   nombres están escritos en la documentación—. **No arregla todo**: cuatro
   chequeos
   buscan formas que en React no existen —el color adentro de `style="…"`, las
   plantillas que arman marcado, los manejadores escritos en el marcado y el
   atributo `data-frase`—, y ésos hay que reescribirlos igual. Lo que sí termina
   es la parte silenciosa. */
/* Y son dos clases, no una. Una **página suelta** es marcado con bloques de
   guión adentro; una **pantalla de un programa** es código de punta a punta,
   con el marcado adentro del código. Casi todos los chequeos las miran igual
   y les alcanza con la lista de abajo, pero unos pocos tienen que leerlas
   distinto, porque lo que buscan se escribe distinto en cada una. Esos piden
   estas dos, y así la extensión sigue viviendo en un solo lugar. */
export const PAGINA_SUELTA = '.html';
export const PANTALLA_DE_PROGRAMA = '.jsx';
export const esPaginaSuelta = (nombre) => nombre.toLowerCase().endsWith(PAGINA_SUELTA);
export const esDelPrograma = (nombre) => nombre.toLowerCase().endsWith(PANTALLA_DE_PROGRAMA);

export const EXTENSIONES_DE_PANTALLA = [PAGINA_SUELTA, PANTALLA_DE_PROGRAMA];

/* ── Y LO QUE TERMINA EN .html SIN SER UNA PANTALLA ───────────────────────
   El armazón de un paquete de React: unos pocos renglones sin nada dibujado
   adentro, que la herramienta de armado rellena con lo construido. No se
   publica, no tiene contenido y no lo abre nadie.

   Está acá y no adentro de cada chequeo porque son tres los que se lo cruzan,
   y los tres se equivocaban del mismo modo: uno le pedía un nombre visible y
   un capítulo en la foto del producto, otro lo sumaba a la cuenta de pantallas
   del README, y el tercero daba por rota su única dirección.

   **Son uno por paquete, y los paquetes son tres**: el del sitio y los dos de
   los programas del teléfono. Los dos del teléfono viven un escalón más
   adentro que el del sitio porque la página suelta que hoy está publicada ya
   ocupa el nombre de afuera, y dos páginas no pueden llamarse igual. */
export const ARMAZONES = [
  'web/index.html',
  'pwa-asistente/src/index.html',
  'pwa-familia/src/index.html'
];

/* ── Y QUÉ DIRECCIONES CONTESTA EL SITIO ──────────────────────────────────
   Mientras cada pantalla era un archivo suelto, preguntar si una dirección
   llegaba a algún lado era preguntarle al disco si ese archivo estaba. Ya no:
   las quince pantallas del sitio son vistas de un solo programa, y en el disco
   no hay un archivo con el nombre de ninguna. Al servidor se le pide
   «/directorio» y contesta la página única, que dibuja la vista que corresponde.

   Quién sabe cuáles son es la lista de direcciones del programa, y nadie más:
   una dirección que no figure ahí no existe en el sitio. Se lee de ahí en vez
   de copiarla acá para que agregar una pantalla siga siendo un solo renglón. */
export const LISTA_DE_DIRECCIONES = 'web/src/Rutas.jsx';

export function direccionesDelSitio(raiz) {
  const texto = readFileSync(join(raiz, ...LISTA_DE_DIRECCIONES.split('/')), 'utf8');
  const dichas = Array.from(texto.matchAll(/<Route\s[^>]*\bpath="([^"]+)"/g))
    .map((cual) => cual[1]);
  seRevisaron(dichas.length, `una sola dirección declarada en «${LISTA_DE_DIRECCIONES}»`);
  return new Set(dichas);
}

/** ¿Esa dirección —contada desde la raíz del sitio, sin barra adelante— es una
 *  de las vistas del programa? La raíz del sitio se dice con la cadena vacía. */
export const esUnaVista = (cuales, adentro) => cuales.has('/' + adentro);

/** ¿Este archivo es el armazón de un paquete, y no una pantalla? */
export const esArmazon = (camino) =>
  ARMAZONES.some((a) => camino.split(sep).join('/').toLowerCase().endsWith(a));

/** ¿Este archivo es una pantalla? Sirve tanto con el nombre como con la sola
 *  extensión, que es como lo preguntan algunos chequeos. */
export const esPantalla = (nombre) =>
  EXTENSIONES_DE_PANTALLA.some((e) => nombre.toLowerCase().endsWith(e));

/**
 * Los archivos con alguna de esas extensiones, colgando de `carpeta`.
 * `ademas` son los nombres de carpeta que este chequeo en particular no mira.
 */
export function archivos(carpeta, extensiones, ademas = [], encontrados = []) {
  if (!existsSync(carpeta)) return encontrados;
  const salteadas = ademas instanceof Set ? ademas : new Set(ademas);
  for (const nombre of readdirSync(carpeta)) {
    if (nuncaSeAbre(nombre) || salteadas.has(nombre)) continue;
    const camino = join(carpeta, nombre);
    if (statSync(camino).isDirectory()) {
      archivos(camino, extensiones, salteadas, encontrados);
    } else if (extensiones.some((e) => nombre.toLowerCase().endsWith(e))) {
      encontrados.push(camino);
    }
  }
  return encontrados;
}

/* ===================================================
   Y LA OTRA MITAD: QUE HAYA ENCONTRADO ALGO

   Un chequeo que revisó cero archivos no revisó nada, pero escribe el mismo ✔
   que el que los revisó todos, con un número más chico que nadie mira. Es la
   regla de la empresa —«una prueba que no puede fallar no prueba nada»— vista
   del lado del corpus y no del detector: casi todos los chequeos ya se prueban
   a sí mismos contra textos de mentira escritos adentro, y esa prueba pasa
   igual aunque el recorrido no les entregue un solo archivo.

   Medido el 28 de agosto de 2026 sobre una copia del proyecto entero donde se
   renombraron las dieciséis pantallas de `.html` a `.jsx`, que es exactamente
   lo que va a pasar el día de la migración: **diecisiete de los veinte
   chequeos siguieron diciendo ✔**. `estilos` llegó a informar «ninguno de los
   0 atributos `style=` del marcado» y contarlo como éxito.

   Por eso `hayArchivos` en vez de `archivos` en todo chequeo, y `seRevisaron`
   donde lo que se cuenta no sale de un recorrido sino de una lista escrita a
   mano o de un catálogo.
=================================================== */

/**
 * Devuelve `cuantos` si es mayor que cero, y si no corta el chequeo.
 * `que` es lo que se estaba por revisar, para que el mensaje diga qué faltó.
 */
export function seRevisaron(cuantos, que) {
  if (cuantos > 0) return cuantos;
  throw new Error(
    `No se encontró ${que}, así que este chequeo no probó nada.\n` +
    'Un chequeo que mira cero cosas pasa siempre: no está diciendo que todo ' +
    'esté bien, está diciendo que no miró.\n' +
    'Suele ser que algo se renombró, cambió de extensión o se mudó de carpeta, ' +
    'y hay que ponerlo al día acá.'
  );
}

/* Quién está exento de esa guarda, y por qué. Vive acá, pegado a la guarda,
   y no adentro del chequeo que la exige: la lista la usan dos —
   `verificar_red.mjs`, que comprueba **leyendo** que todo chequeo la nombre, y
   `probar_perdida_de_corpus.mjs`, que comprueba **corriendo** que todo chequeo
   se plante de verdad sin corpus—, y dos listas que dicen lo mismo se arreglan
   una vez y quedan mal la otra.

   `cajas` no recorre el proyecto: fabrica un árbol de mentira en la carpeta
   temporal y le pide a `archivos()` que lo recorra, así que su corpus lo arma él
   y no puede quedar vacío por un renombre. Y ya tiene su propia guarda:
   comprueba que el archivo que dejó afuera de toda caja fuerte aparezca, para
   que un recorrido que devolviera siempre la lista vacía no pase. */
export const ARMAN_SU_PROPIO_CORPUS = new Map([
  ['verificar_cajas.mjs', 'arma su propio árbol de prueba y ya comprueba que no venga vacío'],
  ['verificar_etiquetas.mjs', 'su corpus es el banco de nombres inventados con el que se prueba el detector, escrito adentro del guion, y ya se planta si queda vacío: las etiquetas de verdad son cero hoy y eso es un estado legítimo']
]);

/** `archivos()`, pero se planta si el recorrido no encontró ni uno. */
export function hayArchivos(carpeta, extensiones, ademas = []) {
  const encontrados = archivos(carpeta, extensiones, ademas);
  seRevisaron(
    encontrados.length,
    `un solo archivo ${extensiones.join(' ni ')} colgando de «${carpeta}»`
  );
  return encontrados;
}

/* ===================================================
   Y LEER EL DISCO COMO LO LEE EL SERVIDOR, NO COMO LO LEE WINDOWS

   Esta máquina es Windows y el sitio se sirve desde Linux. Windows contesta
   que sí cuando se le pide `js/Auth.js` y el archivo es `js/auth.js`; Linux
   contesta que no. Así que una dirección con la caja de letras cambiada
   **anda en todas las pantallas de acá y da 404 publicada**, y ninguna prueba
   corrida en esta máquina la puede ver: `existsSync` miente por diseño.

   Es la regla de la empresa «compatibilidad multiplataforma obligatoria» en el
   único lugar donde el sistema operativo la tapa solo.

   Encontrado el 31 de agosto de 2026, al escribir `verificar_rutas.mjs`:
   `verificar_sinconexion.mjs` comprobaba con `existsSync` los archivos que
   guarda cada service worker. Con `'./js/Auth.js'` puesto a mano en la lista de
   `pwa-familia`, los treinta y tres chequeos pasaron en verde —y `cache.addAll()`
   es todo o nada, así que la copia sin conexión de esa aplicación no se habría
   instalado entera—. El propio mensaje de ese chequeo dice «es todo o nada».
=================================================== */

/* El disco se lee una vez por carpeta: son cientos de direcciones y casi todas
   caen en el mismo puñado de carpetas. */
const listados = new Map();
const listar = (carpeta) => {
  if (!listados.has(carpeta)) {
    try {
      listados.set(carpeta, readdirSync(carpeta));
    } catch {
      listados.set(carpeta, null);
    }
  }
  return listados.get(carpeta);
};

/**
 * ¿Ese archivo está escrito **exactamente así**, tramo por tramo?
 * `camino` es absoluto y tiene que colgar de `raiz`.
 * Devuelve `true` si está tal cual; el nombre con el que sí está, si lo único
 * que cambia es la caja de las letras; y `false` si no está de ninguna forma.
 */
export function conLaMismaCaja(raiz, camino) {
  const relativo = relative(raiz, camino);
  if (relativo.startsWith('..')) return false;
  let actual = raiz;
  for (const tramo of relativo.split(sep)) {
    if (tramo === '') continue;
    const hay = listar(actual);
    if (!hay) return false;
    if (!hay.includes(tramo)) {
      const flojo = hay.find((n) => n.toLowerCase() === tramo.toLowerCase());
      return flojo || false;
    }
    actual = join(actual, tramo);
  }
  return true;
}

/** Lo mismo, en una sola respuesta, para quien no necesita el detalle. */
export const estaTalCual = (raiz, camino) => conLaMismaCaja(raiz, camino) === true;
