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

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
  // Copias enteras del proyecto que deja el CLI de Claude Code.
  '.claude',
  // Código apartado a propósito: ya no se edita, así que avisar no sirve.
  'fuera de uso'
]);

/** ¿Este nombre de carpeta se saltea? */
export const nuncaSeAbre = (nombre) =>
  CERRADAS.has(desnudo(nombre)) || NO_ES_DEL_PROYECTO.has(nombre);

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
export const EXTENSIONES_DE_PANTALLA = ['.html'];

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

/** `archivos()`, pero se planta si el recorrido no encontró ni uno. */
export function hayArchivos(carpeta, extensiones, ademas = []) {
  const encontrados = archivos(carpeta, extensiones, ademas);
  seRevisaron(
    encontrados.length,
    `un solo archivo ${extensiones.join(' ni ')} colgando de «${carpeta}»`
  );
  return encontrados;
}
