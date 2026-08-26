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
