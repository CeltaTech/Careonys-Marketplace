# Propuesta de Normalización de Archivos HTML en la Raíz (`Careonys`)

## Diagnóstico
En las iteraciones anteriores, todo el trabajo de refactorización, re-branding y actualización de terminología (cambiando "Cuidador" por "Asistente") se aplicó **exclusivamente sobre la carpeta `presdemo/`**.

Como consecuencia, los archivos en la raíz del proyecto ([index.html](file:///f:/proyectos/Careonys-Marketplace/index.html), [necesito-cuidador.html](file:///f:/proyectos/Careonys-Marketplace/necesito-cuidador.html), [soy-cuidador.html](file:///f:/proyectos/Careonys-Marketplace/soy-cuidador.html), [acompanamiento.html](file:///f:/proyectos/Careonys-Marketplace/acompanamiento.html), etc.) conservan la nomenclatura vieja y las referencias a la marca externa *Cuidarlos*.

---

## Opciones para la Raíz del Proyecto

### Opción 1: Reemplazar la Raíz con la Versión de `presdemo/` (Recomendada)
- Mover los archivos de `presdemo/` a la raíz del proyecto para que la demo activa de **Careonys** sea la experiencia predeterminada al abrir el servidor o repositorio.
- Eliminar definitivamente los archivos antiguos de Cuidarlos.

### Opción 2: Mantener `presdemo/` y convertir la Raíz en la Landing Page de Careonys SaaS
- Modificar `index.html` de la raíz para que presente el software **Careonys** (la plataforma Multi-Tenant).
- Dar acceso desde allí a la demo interactiva (`/presdemo/index.html`).

### Opción 3: Normalizar Nombres y Eliminar Marca Cuidarlos en la Raíz
- Renombrar los archivos viejos en la raíz para alinearlos con la nueva convención:
  - `necesito-cuidador.html` $\rightarrow$ `solicitar-asistente.html`
  - `soy-cuidador.html` $\rightarrow$ `postulacion-asistente.html`
  - `acompanamiento.html` $\rightarrow$ `soporte-remoto.html`
- Remover todo texto o logo que haga referencia a Cuidarlos.
