# Análisis de Brechas y Chequeo Exhaustivo de Implementación
**Rol**: Programador Senior  
**Fecha de Auditoría**: Agosto de 2026  
**Última Revisión**: 19 de Agosto de 2026 — Brechas B y C resueltas  
**Ubicación**: [docs/chequeo_exhaustivo_plan.md](file:///f:/proyectos/Careonys-Marketplace/docs/chequeo_exhaustivo_plan.md)

> [!NOTE]
> **Estado post-corrección (19/08/2026)**: Las brechas del Módulo B (PWAs) y Módulo C (Base de Datos) fueron resueltas en la sesión de cierre:
> - ✅ **Service Workers v3**: Ambas PWAs ya solo cachean rutas internas. Se corrigió la omisión de `./js/auth.js` en la lista de precaché.
> - ✅ **Wizard de Postulación**: Ya vive inline en `pwa-asistente/index.html` (pantalla `#screen-registro`). Funciona 100% offline.
> - ✅ **Pantalla "Publicar" en PWA Familia**: Se reemplazó el link externo a `../formulario-integral.html` por la pantalla inline `#screen-publicar` con formulario completo y envío a `care_searches`.
> - ✅ **`CareonysAPI.crearBusqueda()`**: Alias agregado en `js/apiClient.js` y propagado a `pwa-familia/js/` y `pwa-asistente/js/`.
> - ✅ **Comentarios residuales de *Cuidarlos***: Confirmado que `perfil.html` y `formulario-integral.html` ya no contienen referencias a la marca anterior.
> - ✅ **Deploy Vercel**: `READY` — https://careonys-marketplace-nu.vercel.app

---

## 1. Resumen Ejecutivo de la Auditoría
Al revisar el repositorio en detalle, identificamos que el desarrollo se divide en **dos planos diferenciados**:
1. **La Demo Estática / Prototipo (Fase Actual)**: Implementada en HTML5, CSS3 y JavaScript vanilla, que interactúa con Supabase mediante REST a través de la capa cliente [js/apiClient.js](file:///f:/proyectos/Careonys-Marketplace/js/apiClient.js).
2. **El Plan Técnico de Producción v2.0 (Largo Plazo)**: Un monorepo en Turborepo con aplicaciones modernas en React/Vite, React Native/Expo y Tauri ([docs/CAREONYS_PRESDEMO_Plan_Tecnico.md](file:///f:/proyectos/Careonys-Marketplace/docs/CAREONYS_PRESDEMO_Plan_Tecnico.md)).

Esta auditoría se enfoca en la fase de prototipo actual y analiza la coherencia de lo desarrollado frente a los tres planes principales del proyecto:
*   [Plan de Renovación y Limpieza de Marca](file:///f:/proyectos/Careonys-Marketplace/docs/implementation_plan.md)
*   [Plan de PWAs Independientes](file:///f:/proyectos/Careonys-Marketplace/docs/implementation_plan_pwas.md)
*   [Plan de Migración a Supabase (Esquemas y API)](file:///f:/proyectos/Careonys-Marketplace/docs/plan_migracion_supabase.md)

---

## 2. Detalle del Chequeo Exhaustivo por Plan

### Módulo A: Plan de Renovación de la Raíz y Limpieza de Marca
> [!TIP]
> **Estado General**: **98% Completado**.
> La eliminación física de archivos viejos de *Cuidarlos* en la raíz fue ejecutada exitosamente, así como los redireccionamientos y renombres generales.

| Elemento / Cambio Planificado | Estado | Ubicación en el Código | Observaciones del Programador Senior |
| :--- | :--- | :--- | :--- |
| Renombrar `necesito-cuidador.html` $\rightarrow$ `solicitar-asistente.html` | **Completado** | Raíz (`/`) | Se ejecutó correctamente y se actualizaron los enlaces internos. |
| Renombrar `soy-cuidador.html` $\rightarrow$ `postulacion-asistente.html` | **Completado** | Raíz (`/`) | Se ejecutó correctamente y se actualizaron los enlaces internos. |
| Renombrar `acompanamiento.html` $\rightarrow$ `soporte-remoto.html` | **Completado** | Raíz (`/`) | Se ejecutó correctamente y se actualizaron los enlaces internos. |
| Rebranding total a **Careonys / PresDemo** (Títulos, logos, footers) | **Completado** | Raíz (`/`) | Las cabeceras, pie de página e insignias "Powered by Careonys" están bien integradas. |
| Reemplazar `info@cuidarlos.com` por `contacto@careonys.com` | **Completado** | Múltiples archivos | El correo de contacto de producción se encuentra homologado. |
| Eliminar la carpeta temporal `/presdemo` | **Completado** | Raíz (`/`) | Se aplicó la "Opción 1" de limpieza; la versión del tenant modelo es la raíz principal. |
| **Limpieza de comentarios en código (Residual)** | **Pendiente** | [perfil.html](file:///f:/proyectos/Careonys-Marketplace/perfil.html#L110), [formulario-integral.html](file:///f:/proyectos/Careonys-Marketplace/formulario-integral.html#L52) | Existen referencias de texto de desarrollo en comentarios HTML que mencionan la marca externa *Cuidarlos*. |

---

### Módulo B: Plan de PWAs Independientes (`docs/implementation_plan_pwas.md`)
> [!WARNING]
> **Estado General**: **70% Completado**.
> Aunque las estructuras iniciales de carpetas, service workers y dashboards específicos están creados, existen discrepancias graves que afectan la capacidad de instalación offline de las aplicaciones móviles.

*   **Brecha 1: Wizard de Postulación fuera del alcance PWA (Offline Inoperativo)**
    *   *Lo que decía el plan*: Reubicar el onboarding wizard de postulación de 5 pasos dentro de `pwa-asistente/index.html` para que el asistente pueda postularse de forma nativa desde la aplicación móvil.
    *   *Lo que se implementó*: La PWA del Asistente contiene un enlace en la pantalla de login que apunta a `../postulacion-asistente.html`. Al estar ubicado en el directorio raíz del proyecto (directorio padre), el archivo queda fuera de las capacidades offline de la PWA. El usuario no podrá ver ni completar el wizard sin conexión a Internet estable.
*   **Brecha 2: Ruptura de Cache del Service Worker por Ámbito (Scope Limit)**
    *   *Lo que decía el plan*: Lograr soporte offline utilizando service workers en cada carpeta.
    *   *Lo que se implementó*: Los service workers de [pwa-familia/service-worker.js](file:///f:/proyectos/Careonys-Marketplace/pwa-familia/service-worker.js) y [pwa-asistente/service-worker.js](file:///f:/proyectos/Careonys-Marketplace/pwa-asistente/service-worker.js) intentan cachear archivos compartidos del directorio padre (`../css/styles.css` y `../js/apiClient.js`).
    *   *El problema técnico*: Por diseño de seguridad del navegador, el ámbito de ejecución (*scope*) de un Service Worker está limitado al directorio donde reside. Un service worker en `/pwa-asistente/` **no puede interceptar peticiones de archivos ubicados en `/css/` o `/js/`** (directorio padre/hermano), por lo que las peticiones a estos archivos fallarán en modo offline, rompiendo la aplicación (quedará sin estilos y sin API).
    *   *Solución Senior*: Copiar o compilar físicamente los archivos compartidos dentro de subcarpetas locales `css/` y `js/` de cada PWA (tal como lo preveía el árbol del plan), o mover los service workers al directorio raíz con scopes diferenciados.

---

### Módulo C: Plan de Migración a Supabase (`docs/plan_migracion_supabase.md`)
> [!CAUTION]
> **Estado General**: **80% en Capa de Abstracción / 40% Alineado en Base de Datos**.
> La capa del cliente en [js/apiClient.js](file:///f:/proyectos/Careonys-Marketplace/js/apiClient.js) está muy bien lograda y es dinámica. Sin embargo, si un desarrollador configura la base de datos de producción usando únicamente el SQL de `docs/plan_migracion_supabase.md`, el sistema colapsará debido a incompatibilidades críticas de esquemas.

#### 1. Incompatibilidad de Columnas en Tabla `tenants`
*   *Lógica del Cliente*: `CareonysAPI.initTenant()` intenta obtener las columnas `slug`, `primary_color`, `accent_color` y `logo_url` para aplicar el branding dinámico al DOM.
*   *Esquema SQL del Plan*: La tabla `tenants` solo tiene definidos los campos `id`, `name`, `domain` y `created_at`. Faltan todas las columnas de branding dinámico y la columna `slug` para resolver el tenant en la query REST.

#### 2. Incompatibilidad de Columnas en Tabla `caregivers`
*   *Lógica del Cliente*: Al registrar postulaciones o cambiar estados, `apiClient.js` mapea campos como `cuit`, `address` (domicilio), `bank_info` (cbu), `reference_info` (referencias), `education_info`, `birthdate` (fechaNacimiento), `gender` (género), `nationality` (nacionalidad) y `hourly_rate` (valorHora).
*   *Esquema SQL del Plan*: Ninguna de estas columnas está declarada en la tabla `caregivers` del plan de base de datos actual. Toda postulación desde el wizard fallará con un error HTTP 400 (columna inexistente).

#### 3. Desalineación en Fichados GPS (`clock_ins`)
*   *Lógica del Cliente*: `CareonysAPI.registrarFichadoGPS()` envía los campos individuales `latitude` y `longitude` al servicio de Supabase:
    ```javascript
    const dbData = {
      caregiver_id: ...,
      latitude: fichadoData.lat,
      longitude: fichadoData.lng,
      event_type: ...
    };
    ```
*   *Esquema SQL del Plan*: Espera recibir un único campo de geolocalización tipo `point` llamado `gps_coords` (además de `search_id` que no es enviado por el cliente actual). Esto impedirá registrar los fichados de entrada y salida laboral.

#### 4. Discrepancia en Medicamentos de Bitácora (`logbook_entries`)
*   *Lógica del Cliente*: El formulario del asistente envía el campo `medications_administered` como un texto simple (`"Donepecilo 10mg"`).
*   *Esquema SQL del Plan*: Define `medications_administered` como tipo `jsonb`. Al intentar realizar el insert REST, PostgreSQL devolverá un error de sintaxis JSON porque una cadena simple no es un JSON binario válido.

---

## 3. Acciones Recomendadas para el Siguiente Paso
Para que el prototipo actual esté 100% listo para pruebas locales y producción real con Supabase:
1. **Corregir Ámbito PWA**: Crear subcarpetas `css/` y `js/` dentro de `pwa-asistente/` y `pwa-familia/`, copiar los recursos locales correspondientes y actualizar el archivo index.html para cargarlos de allí. Esto asegurará el caching del Service Worker.
2. **Migrar Wizard de Asistente**: Reubicar la lógica y el HTML del wizard de postulación de 5 pasos dentro de `pwa-asistente/index.html` bajo una pantalla interna de registro para que sea 100% offline.
3. **Actualizar Especificación SQL**: Enriquecer el archivo [docs/plan_migracion_supabase.md](file:///f:/proyectos/Careonys-Marketplace/docs/plan_migracion_supabase.md) con las columnas reales de base de datos que se usan en `js/apiClient.js` (añadir columnas a `tenants`, `caregivers`, y ajustar tipos en `clock_ins` y `logbook_entries`).
