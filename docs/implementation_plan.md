# Plan de Renovación de la Raíz y Depuración Total de Marca (Careonys)

Este plan detalla la ejecución del renombrado físico de archivos en la raíz del proyecto y la eliminación absoluta de cualquier referencia, enlace, correo, logo o texto referente a la marca antigua (*Cuidarlos*) en todo el repositorio (tanto en la raíz como en `presdemo/`).

---

## User Review Required

> [!IMPORTANT]
> - Se renombrarán físicamente 3 archivos en la raíz del proyecto para alinearse con los nombres aprobados en `presdemo/`.
> - Se actualizarán todas las etiquetas `<title>`, `<meta>`, imágenes (`logo_cuidarlos.png` $\rightarrow$ `logo_careonys.png`), correos (`info@cuidarlos.com` $\rightarrow$ `contacto@careonys.com`) y textos de "Sobre Cuidarlos" por "Sobre Careonys" tanto en los archivos de la raíz como en `presdemo/`.

---

## Proposed Changes

### Archivos de la Raíz (`/`)

#### [MODIFY] [index.html](file:///f:/proyectos/Careonys-Marketplace/index.html)
- Actualizar títulos, textos, links a los nuevos nombres de archivos (`solicitar-asistente.html`, `postulacion-asistente.html`, `soporte-remoto.html`).
- Reemplazar menciones de Cuidarlos por Careonys y "Cuidador" por "Asistente".

#### [MODIFY] [directorio.html](file:///f:/proyectos/Careonys-Marketplace/directorio.html)
- Actualizar títulos, navegación, footer, emails y referencias a Cuidarlos.

#### [MODIFY] [perfil.html](file:///f:/proyectos/Careonys-Marketplace/perfil.html)
- Reemplazar dinámicamente títulos (`Perfil de Asistente — Careonys`), footer y referencias en scripts.

#### [MODIFY] [cursos.html](file:///f:/proyectos/Careonys-Marketplace/cursos.html)
- Actualizar encabezados, menús y footer con Careonys.

#### [NEW] [solicitar-asistente.html](file:///f:/proyectos/Careonys-Marketplace/solicitar-asistente.html)
- Renombrado desde `necesito-cuidador.html`. Actualización de contenidos a Careonys / Asistentes.

#### [NEW] [postulacion-asistente.html](file:///f:/proyectos/Careonys-Marketplace/postulacion-asistente.html)
- Renombrado desde `soy-cuidador.html`. Actualización de contenidos a Careonys / Asistentes.

#### [NEW] [soporte-remoto.html](file:///f:/proyectos/Careonys-Marketplace/soporte-remoto.html)
- Renombrado desde `acompanamiento.html`. Actualización de contenidos a Careonys / Asistentes.

#### [DELETE] [necesito-cuidador.html](file:///f:/proyectos/Careonys-Marketplace/necesito-cuidador.html)
#### [DELETE] [soy-cuidador.html](file:///f:/proyectos/Careonys-Marketplace/soy-cuidador.html)
#### [DELETE] [acompanamiento.html](file:///f:/proyectos/Careonys-Marketplace/acompanamiento.html)

---

### Depuración Residual en `presdemo/`

#### [MODIFY] [presdemo/index.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/index.html)
#### [MODIFY] [presdemo/directorio.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/directorio.html)
#### [MODIFY] [presdemo/perfil.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/perfil.html)
#### [MODIFY] [presdemo/cursos.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/cursos.html)
#### [MODIFY] [presdemo/solicitar-asistente.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/solicitar-asistente.html)
#### [MODIFY] [presdemo/postulacion-asistente.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/postulacion-asistente.html)
#### [MODIFY] [presdemo/soporte-remoto.html](file:///f:/proyectos/Careonys-Marketplace/presdemo/soporte-remoto.html)
- Reemplazar los correos `info@cuidarlos.com` por `contacto@careonys.com` y textos de pie de página "Sobre Cuidarlos" por "Sobre Careonys".

---

## Verification Plan

### Automated Tests / Grep Search
- Ejecutar un grep exhaustivo sensible y no sensible a mayúsculas sobre todo el directorio del proyecto para confirmar que la cadena `cuidarlos` retorne **0 coincidencias**.

### Manual Verification
- Comprobar que los menús de navegación (`nav`) y pie de página (`footer`) de las 7 páginas en la raíz y de las 7 páginas en `presdemo/` enlacen correctamente entre sí sin errores 404.
