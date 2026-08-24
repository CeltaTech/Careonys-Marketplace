/* ===================================================
   QUÉ CARPETAS ABRE UN CHEQUEO, Y CUÁLES NO ABRE NUNCA

   Lo usan todos los `scripts/verificar_*.mjs` que recorren el proyecto.

   Por qué existe: la lista estaba copiada en cuatro archivos, con cuatro
   contenidos parecidos pero distintos. El 24 de agosto de 2026 apareció
   `.claude/worktrees/`, que es una copia entera del proyecto que deja el CLI, y
   los cuatro chequeos entraron a revisarla: el de identidad avisó de dieciséis
   marcas escritas a mano que eran las mismas de siempre, vistas dos veces. Una
   lista repetida cuatro veces se arregla tres veces y queda mal la cuarta
   (regla 7 de `CLAUDE.md`).

   `NUNCA_SE_ABRE` es lo que no abre ningún chequeo, por dos razones distintas:
   - **Las cajas fuertes.** La regla de la bóveda está en `F:\proyectos\CLAUDE.md`
     y vale también para un guion que recorre carpetas: `No commit` y las de su
     especie no se listan ni se leen.
   - **Lo que no es código del proyecto.** Dependencias, estado del CLI, copias
     de trabajo y código apartado. Revisarlo da avisos que nadie puede arreglar,
     porque el archivo señalado no es el que se edita.

   Lo que cada chequeo no quiera mirar por su cuenta —un chequeo de pantallas no
   tiene nada que hacer en `docs/`— va en su propia lista, que se pasa aparte.
=================================================== */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const NUNCA_SE_ABRE = new Set([
  // Cajas fuertes: no se abren, no se listan, no se citan.
  'No commit', 'no_commit', 'NO HACER COMMIT', 'no pushear', 'ReferenciaNoHacerCommit',
  // Dependencias y estado de las herramientas.
  'node_modules', '.git', '.vercel', '.temp', '.branches',
  // Copias enteras del proyecto que deja el CLI de Claude Code.
  '.claude',
  // Código apartado a propósito: ya no se edita, así que avisar no sirve.
  'fuera de uso'
]);

/**
 * Los archivos con alguna de esas extensiones, colgando de `carpeta`.
 * `ademas` son los nombres de carpeta que este chequeo en particular no mira.
 */
export function archivos(carpeta, extensiones, ademas = [], encontrados = []) {
  if (!existsSync(carpeta)) return encontrados;
  const salteadas = ademas instanceof Set ? ademas : new Set(ademas);
  for (const nombre of readdirSync(carpeta)) {
    if (NUNCA_SE_ABRE.has(nombre) || salteadas.has(nombre)) continue;
    const camino = join(carpeta, nombre);
    if (statSync(camino).isDirectory()) {
      archivos(camino, extensiones, salteadas, encontrados);
    } else if (extensiones.some((e) => nombre.toLowerCase().endsWith(e))) {
      encontrados.push(camino);
    }
  }
  return encontrados;
}
